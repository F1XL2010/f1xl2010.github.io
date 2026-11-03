'use strict';
// Receives random batch IDs/counts only. No access to application answers.
const crypto=require('node:crypto');
const REPO='F1XL2010/f1xl2010.github.io',BRANCH='discord-control',BOT='1505912491606147202',GUILD='388387739772518414',PILOT_GUILD='1186298584203800687',PILOT='1329444470881648762',PORTAL='https://f1xl.co.uk/admincentre/';
const uuid=v=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v||''),snowflake=v=>/^\d{17,20}$/.test(v||''),hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function validateJob(j,id,now=Date.now()){
  if(!j||j.schema!==1||!uuid(id)||j.id!==id||j.kind!=='applications'||!['private','live'].includes(j.mode)||!Number.isInteger(j.count)||j.count<1||j.count>50||!snowflake(j.channel)||typeof j.revision!=='string')throw Error('Invalid application message job.');
  if(j.mode==='private'&&(j.channel!==PILOT||j.guild!==PILOT_GUILD||j.recipient!==''))throw Error('Private example destination mismatch.');
  if(j.mode==='live'&&(j.guild!==GUILD||!snowflake(j.recipient)))throw Error('Application recipient/destination mismatch.');
  const begin=Date.parse(j.created),end=Date.parse(j.expires);if(!Number.isFinite(begin)||!Number.isFinite(end)||end<=begin||end-begin>86400000||begin>now+60000)throw Error('Invalid application message window.');
  const allowed=['schema','id','kind','mode','count','created','expires','revision','channel','guild','recipient'];if(Object.keys(j).some(k=>!allowed.includes(k)))throw Error('Unexpected data in application message job.');return j;
}
function payload(j){const privateTest=j.mode==='private';return {content:privateTest?'PRIVATE EXAMPLE · New driver application':('<@'+j.recipient+'>'),embeds:[{title:privateTest?'Example application alert':'New driver application'+(j.count===1?'':'s'),description:(privateTest?'This is an example only. No application was submitted or changed.':j.count+' new driver application'+(j.count===1?' has':'s have')+' arrived. Review '+(j.count===1?'it':'them')+' in Applications & tracker.')+'\n\n[Open the Admin Portal]('+PORTAL+')',color:0x3DCC47}],allowed_mentions:{parse:[],users:privateTest?[]:[j.recipient],roles:[],replied_user:false},...(privateTest?{flags:4096}:{})};}
function canPost(roles,member,channel,guild){
  if(!Array.isArray(roles)||!Array.isArray(member?.roles))throw Error('Bot permissions could not be checked.');const bits=v=>{if(!/^\d{1,30}$/.test(String(v??'')))throw Error('Invalid Discord permission.');return BigInt(v);};
  let p=bits(roles.find(r=>r.id===guild)?.permissions||'0');for(const r of roles)if(member.roles.includes(r.id))p|=bits(r.permissions);if(p&8n)return true;
  const overwrites=channel.permission_overwrites||[],everyone=overwrites.find(r=>r.id===guild);if(everyone)p=p&~bits(everyone.deny)|bits(everyone.allow);let deny=0n,allow=0n;for(const r of overwrites)if(Number(r.type)===0&&member.roles.includes(r.id)){deny|=bits(r.deny);allow|=bits(r.allow);}p=p&~deny|allow;const own=overwrites.find(r=>Number(r.type)===1&&r.id===BOT);if(own)p=p&~bits(own.deny)|bits(own.allow);return(p&(1024n|2048n|16384n))===(1024n|2048n|16384n);
}
function createRunner({env=process.env,fetcher=fetch,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
  const id=env.PORTAL_JOB;if(!uuid(id)||!env.GITHUB_TOKEN||!env.DISCORD_TOKEN)throw Error('Application message connection is missing.');
  const file='discord/applications/state/'+id+'.json';let job,state;
  async function request(url,options){let r;try{r=await fetcher(url,{...options,signal:AbortSignal.timeout(20000)});}catch(e){throw Error('Request outcome was not confirmed.');}let data;try{data=JSON.parse(await r.text());}catch(e){data=null;}return {status:r.status,data};}
  async function github(method,path,body){return request('https://api.github.com/repos/'+REPO+path,{method,headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});}
  async function read(path,optional=false){const r=await github('GET','/contents/'+path+'?ref='+BRANCH);if(r.status===404&&optional)return null;if(r.status!==200||r.data?.encoding!=='base64')throw Error('Application control record unavailable.');return {sha:r.data.sha,value:JSON.parse(Buffer.from(r.data.content,'base64').toString())};}
  async function save(){state.at=new Date(now()).toISOString();for(let n=0;n<3;n++){const old=await read(file,true),r=await github('PUT','/contents/'+file,{message:'Record application alert delivery',branch:BRANCH,sha:old?.sha,content:Buffer.from(JSON.stringify(state)).toString('base64')});if(r.status===200||r.status===201)return;if(![409,422].includes(r.status))break;await sleep(500);}throw Error('Application delivery receipt was not confirmed.');}
  async function discord(method,path,body){for(let n=0;n<3;n++){const r=await request('https://discord.com/api/v10'+path,{method,headers:{Authorization:'Bot '+env.DISCORD_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(r.status>=200&&r.status<300)return r.data;if(r.status===429&&n<2&&Number(r.data?.retry_after)>0&&Number(r.data.retry_after)<=60){await sleep(Math.ceil(r.data.retry_after*1000)+200);continue;}const e=Error('Discord did not confirm the application message (HTTP '+r.status+').');e.rejected=[400,401,403,404,429].includes(r.status);throw e;}}
  async function permitted(){if(Date.parse(job.expires)<=now())return false;if(job.mode==='private')return true;const s=(await read('discord/application-settings.json')).value;return s.schema===1&&s.enabled===true&&s.route==='applications'&&s.revision===job.revision&&s.guild===job.guild&&s.channel===job.channel&&s.recipient===job.recipient;}
  async function run(){
    job=validateJob((await read('discord/applications/jobs/'+id+'.json')).value,id,now());
    const old=(await read(file,true))?.value,identity=hash(job);
    if(old){if(old.identity!==identity||old.count!==job.count)throw Error('Application message job changed.');if(old.phase==='sent')return old;if(old.delivery==='pending'||old.phase==='attention')throw Error('Earlier delivery is uncertain. Check Discord before retrying.');}
    state={schema:1,id,count:job.count,identity,runId:String(env.GITHUB_RUN_ID||'local-test'),phase:'checking',delivery:'not_attempted',at:'',messageId:''};
    try{
      if(!await permitted()){state.phase='cancelled';await save();return state;}
      const bot=await discord('GET','/users/@me');if(bot?.id!==BOT||bot.bot!==true)throw Error('Bot identity mismatch.');
      const channel=await discord('GET','/channels/'+job.channel);if(channel?.id!==job.channel||channel.guild_id!==job.guild||![0,5].includes(channel.type))throw Error('Application channel mismatch.');
      if(job.mode==='live'&&String(channel.name||'').toLowerCase().replace(/[-_ ]/g,'')!=='adminnotifications')throw Error('Use the admin notifications channel.');
      const [roles,member]=await Promise.all([discord('GET','/guilds/'+job.guild+'/roles'),discord('GET','/guilds/'+job.guild+'/members/'+BOT)]);if(!canPost(roles,member,channel,job.guild))throw Error('Bot needs View Channel, Send Messages and Embed Links.');
      if(job.mode==='live'){const recipient=await discord('GET','/guilds/'+job.guild+'/members/'+job.recipient);if(recipient?.user?.id!==job.recipient)throw Error('The Head of Allocations is not a confirmed member of this server.');}
      if(!await permitted()){state.phase='cancelled';await save();return state;}
      state.phase='sending';state.delivery='pending';await save();
      const message=await discord('POST','/channels/'+job.channel+'/messages',{...payload(job),nonce:hash(['application',id]).slice(0,24),enforce_nonce:true});
      if(!snowflake(message?.id)||message.channel_id!==job.channel)throw Error('Discord message confirmation mismatch.');
      state.phase='sent';state.delivery='sent';state.messageId=message.id;await save();return state;
    }catch(e){
      // A durable pending receipt is retained for ambiguous network/server
      // failures. No blind retry can post a duplicate after a lost response.
      if(state.delivery==='sent'){state.phase='sent';}
      else if(state.delivery==='pending'){state.phase=e.rejected?'rejected':'attention';if(e.rejected)state.delivery='not_sent';}
      else{state.phase='rejected';state.delivery='not_sent';}
      try{await save();}catch(ignore){}throw e;
    }
  }
  return {run};
}
module.exports={validateJob,payload,canPost,createRunner};
if(require.main===module)createRunner().run().then(s=>console.log(JSON.stringify({phase:s.phase,count:s.count,messageId:s.messageId||''}))).catch(e=>{console.error(e.message);process.exitCode=1;});
