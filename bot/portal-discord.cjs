'use strict';
// TEST runner: public-source updates go only to the agreed private channel.
// Existing LIVE schedules and the legacy draft job are intentionally untouched.
const crypto=require('node:crypto');
const REPO='F1XL2010/f1xl2010.github.io',BRANCH='discord-control',CHANNEL='1329444470881648762',GUILD='1186298584203800687',BOT='1505912491606147202';
const CONFIG='1tmTdmjPRXF23Ixj3p_-nxsfIqv76MUIUET7Qht2qfdg',PORTAL='https://script.google.com/macros/s/AKfycbxJ9JnIwY39k4k8ouva8CPpa6EvQXeKUD1mNGc3JgaNLfVyiATX68925cKaEZDywf36IQ/exec';
const wait=ms=>new Promise(r=>setTimeout(r,ms)),digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function parseCSV(text){
  if(/^\s*</.test(text))throw Error('Spreadsheet source returned a webpage.');
  const rows=[];let row=[],cell='',quote=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quote)throw Error('Spreadsheet source has an incomplete CSV value.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
function validateControl(c,id,now=Date.now()){
  if(!c||c.schema!==1||c.id!==id||!['draft','practice','standings','teams','calendar'].includes(c.kind)||!/^\d{1,4}(?:\.5)?$/.test(c.season)||!['run','pause','stop'].includes(c.command)||typeof c.revision!=='string'||c.privateOnly!==true||c.channel!==CHANNEL||c.config!==CONFIG)throw Error('Invalid or unsafe Portal control record.');
  const created=Date.parse(c.created),end=Date.parse(c.expires);if(!Number.isFinite(created)||!Number.isFinite(end)||end-created>240*60000||end<=created||created>now+60000)throw Error('Invalid announcement window.');
  if(c.kind==='draft'&&c.sourceUrl!==PORTAL+'?view=discord-draft&session='+id)throw Error('Unexpected confirmed-pick source.');
  return c;
}
function validatePicks(data,control){
  if(data?.schema!==1||data.session!==control.id||data.season!==control.season||!Array.isArray(data.picks)||data.picks.length>192)throw Error('Confirmed-pick source is unavailable or mismatched.');
  const seen=new Set();for(const p of data.picks){if(!Number.isInteger(p.division)||p.division<1||p.division>8||!Number.isInteger(p.pick)||p.pick<1||p.pick>24||p.id!==p.division+'/'+p.pick||seen.has(p.id)||!p.team||!Number.isFinite(Date.parse(p.at)))throw Error('Invalid confirmed pick.');seen.add(p.id);for(const d of [p.one,p.two])if(!d||typeof d.id!=='string'||typeof d.name!=='string'||!!d.id!==!!d.name||d.name.length>100)throw Error('Invalid confirmed driver.');}return data.picks;
}
function markdown(v){return String(v).replace(/([\\`*_~|>])/g,'\\$1').replace(/@/g,'＠').replace(/[\r\n]/g,' ');}
function canPost(roles,member,channel){
  if(!Array.isArray(roles)||!Array.isArray(member?.roles))throw Error('Discord permissions could not be checked.');
  const bits=v=>{if(!/^\d{1,30}$/.test(String(v??'')))throw Error('Invalid Discord permission value.');return BigInt(v);};
  let permissions=bits(roles.find(r=>r.id===GUILD)?.permissions||'0');for(const role of roles)if(member.roles.includes(role.id))permissions|=bits(role.permissions);
  if(permissions&8n)return true;
  const overwrites=channel.permission_overwrites||[],everyone=overwrites.find(r=>r.id===GUILD);if(everyone)permissions=permissions&~bits(everyone.deny)|bits(everyone.allow);
  let deny=0n,allow=0n;for(const r of overwrites)if(Number(r.type)===0&&member.roles.includes(r.id)){deny|=bits(r.deny);allow|=bits(r.allow);}permissions=permissions&~deny|allow;
  const own=overwrites.find(r=>r.id===BOT);if(own)permissions=permissions&~bits(own.deny)|bits(own.allow);
  return (permissions&(1024n|2048n|16384n))===(1024n|2048n|16384n);
}
function pickPayload(p,season,practice){return {content:(practice?'PRIVATE PRACTICE · ':'')+'F1XL S'+season+' · D'+p.division+' · Pick '+p.pick,embeds:[{title:markdown(p.team),description:'**Tier 1** · '+markdown(p.one.name||'Open seat')+'\n**Tier 2** · '+markdown(p.two.name||'Open seat'),color:0x3DCC47,footer:{text:'Confirmed draft pick · Private rehearsal'}}],allowed_mentions:{parse:[],users:[],roles:[],replied_user:false},flags:4096};}
function standings(rows,division,season){
  const head=rows.findIndex(r=>String(r[0]).toLowerCase()==='pos');if(head<0)throw Error('Standings headings could not be found.');
  const h=rows[head],points=h.findIndex(x=>/^(points|pts|total points)$/i.test(x)),raceCols=h.map((x,i)=>i>=4&&i<points&&/^R\d+(?:\([sR]\))?$/i.test(x)?i:-1).filter(i=>i>=0);
  if(points<0)throw Error('The standings Points column could not be found.');
  const drivers=rows.slice(head+1).filter(r=>r[2]&&/^\d+$/.test(r[0])).map(r=>{const pts=Number(String(r[points]||'0').replace(/,/g,''));if(!Number.isFinite(pts))throw Error('Invalid standings points.');const cb=Array(30).fill(0);for(const c of raceCols){const pos=parseInt(r[c],10);if(pos>=1&&pos<=30)cb[pos-1]++;}return {name:r[2],team:r[3],pts,cb};});
  if(!drivers.length)throw Error('The standings contain no ranked drivers.');drivers.sort((a,b)=>b.pts-a.pts||a.cb.reduce((result,n,i)=>result||b.cb[i]-n,0));
  // Every driver is included. Split cards to fit Discord's embed limits.
  const chunks=[];let lines=[];for(let i=0;i<drivers.length;i++){const d=drivers[i],line='`'+String(i+1).padStart(2)+'` '+markdown(d.name)+' — '+markdown(d.team)+' — **'+d.pts+'pts**';if(lines.join('\n').length+line.length>3500){chunks.push(lines);lines=[];}lines.push(line);}if(lines.length)chunks.push(lines);
  return chunks.map((lines,i)=>({key:'standings:'+division+':'+i,embed:{title:'Division '+division+' Standings'+(i?' · continued':''),description:lines.join('\n'),color:0x3DCC47,footer:{text:'F1XL Season '+season+' · Private rehearsal'}}}));
}
function teamsFromRows(rows,division){
  if(rows.length<3||rows[0].length<19)throw Error('The team source layout could not be checked.');
  const map=new Map(),add=(team,name,tier)=>{if(!team||!name)return;const key=team.toLowerCase();if(!map.has(key))map.set(key,{team,division,drivers:[]});map.get(key).drivers.push({name,tier});};
  for(let i=1;i<=22;i++)if(rows[i])add(rows[i][12],rows[i][9],rows[i][13]);
  for(let i=2;i<=23;i++)if(rows[i])add('Reserve',rows[i][15],rows[i][18]);
  if(!map.size)throw Error('No team roster was found.');return [...map.values()];
}
function teamCards(divisions,season){const map=new Map();for(const entries of divisions)for(const t of entries){const key=t.team.toLowerCase();if(!map.has(key))map.set(key,{team:t.team,entries:[]});map.get(key).entries.push(t);}return [...map].sort(([a],[b])=>a.localeCompare(b)).flatMap(([key,t])=>{const lines=t.entries.map(e=>'**Division '+e.division+'**\n'+e.drivers.map(d=>markdown(d.name)+(d.tier?' ('+markdown(d.tier)+')':'')).join('\n'));const chunks=[];let chunk='';for(const line of lines){if(chunk.length+line.length>3500){chunks.push(chunk);chunk='';}chunk+=(chunk?'\n\n':'')+line;}if(chunk)chunks.push(chunk);return chunks.map((description,i)=>({key:'teams:'+key+':'+i,embed:{title:t.team+(i?' · continued':''),description,color:0x3DCC47,footer:{text:'F1XL Season '+season+' · Private rehearsal'}}}));});}
function calendarCard(rows,season){const rounds=rows.slice(1).filter(r=>/^\d+$/.test(r[0])&&r[3]);if(!rounds.length)throw Error('No calendar rounds were found.');const date=v=>{const text=String(v||'TBC'),iso=text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);return iso?iso[3]+'/'+iso[2]+'/'+iso[1]:text;};const description=rounds.map(r=>'**R'+r[0]+'** '+markdown(r[3])+(/\bsprint\b/i.test(r[1])?' ⚡':'')+' — '+markdown(date(r[2]))).join('\n');if(description.length>4096)throw Error('The calendar is too long for one Discord card.');return [{key:'calendar',embed:{title:'Season '+season+' Calendar',description,color:0xE10600,footer:{text:'⚡ = Sprint weekend · Private rehearsal'}}}];}
function createRunner({env=process.env,fetcher=fetch,sleep=wait,now=()=>Date.now()}={}){
  const id=env.PORTAL_JOB;if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('Invalid Portal job reference.');
  if(!env.GITHUB_TOKEN||!env.DISCORD_TOKEN)throw Error('GitHub or Discord connection is missing.');
  const runId=String(env.GITHUB_RUN_ID||'local-test');let state,control,sequence=0;
  async function request(url,options={},kind='source'){
    const start=now();let response;try{response=await fetcher(url,{...options,signal:AbortSignal.timeout(20000)});}catch(e){throw Error(kind+' request was not confirmed.');}
    const text=await response.text();console.log(JSON.stringify({stage:kind,status:response.status,ms:now()-start}));
    let body;try{body=JSON.parse(text);}catch(e){body=text;}return {status:response.status,body};
  }
  async function github(method,path,body){const r=await request('https://api.github.com/repos/'+REPO+path,{method,headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined},'GitHub');return r;}
  async function read(file,optional=false){const r=await github('GET','/contents/'+file+'?ref='+BRANCH);if(r.status===404&&optional)return null;if(r.status!==200||r.body?.encoding!=='base64')throw Error('GitHub control/receipt read failed.');return {sha:r.body.sha,value:JSON.parse(Buffer.from(r.body.content,'base64').toString())};}
  async function write(file,value){for(let attempt=0;attempt<3;attempt++){const old=await read(file,true),r=await github('PUT','/contents/'+file,{message:'Record Discord delivery status',branch:BRANCH,sha:old?.sha,content:Buffer.from(JSON.stringify(value)).toString('base64')});if(r.status===200||r.status===201)return;if(r.status!==409&&r.status!==422)break;await sleep(500*(attempt+1));}throw Error('GitHub could not save the delivery receipt.');}
  async function save(){state.at=new Date(now()).toISOString();await write('discord/state/'+id+'.json',state);}
  async function fresh(){const c=validateControl((await read('discord/control/'+id+'.json')).value,id,now());control=c;return c;}
  async function discord(method,path,body){for(let n=0;n<3;n++){const r=await request('https://discord.com/api/v10'+path,{method,headers:{Authorization:'Bot '+env.DISCORD_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined},'Discord');if(r.status>=200&&r.status<300)return r.body;if(r.status===429&&n<2&&Number(r.body?.retry_after)>0&&Number(r.body.retry_after)<=60){await sleep(Math.ceil(r.body.retry_after*1000)+200);continue;}throw Error('Discord rejected the operation (HTTP '+r.status+').');}throw Error('Discord did not confirm delivery.');}
  async function permitted(){await fresh();return control.command==='run'&&Date.parse(control.expires)>now();}
  async function source(){const r=await request(control.sourceUrl,{},'Confirmed picks');if(r.status!==200)throw Error('Confirmed draft source did not load.');return validatePicks(r.body,control);}
  async function deliver(key,payload,label,ledger,persist){
    const hash=digest(payload);if(ledger[key]?.status==='pending')throw Error('An earlier delivery needs a channel check.');if(ledger[key]?.hash===hash)return false;
    if(!await permitted())return false;
    ledger[key]={status:'pending',hash};await persist();
    try{const msg=await discord('POST','/channels/'+CHANNEL+'/messages',{...payload,nonce:digest([id,key]).slice(0,24),enforce_nonce:true});if(!/^\d{17,20}$/.test(msg?.id||'')||msg.channel_id!==CHANNEL)throw Error('Unexpected Discord message confirmation.');ledger[key]={status:'sent',hash,messageId:msg.id};await persist();state.delivered++;state.history.push({at:new Date(now()).toISOString(),label,state:'Sent',messageId:msg.id});state.history=state.history.slice(-30);await save();return true;}catch(e){state.history.push({at:new Date(now()).toISOString(),label,state:'Check channel'});throw e;}
  }
  async function csv(sheet,gid){if(!/^[a-zA-Z0-9_-]{20,100}$/.test(sheet||'')||!/^\d+$/.test(String(gid)))throw Error('A spreadsheet connection is missing.');const r=await request('https://docs.google.com/spreadsheets/d/'+sheet+'/export?format=csv&gid='+gid,{},'Spreadsheet');if(r.status!==200||typeof r.body!=='string')throw Error('Spreadsheet source could not be read.');return parseCSV(r.body);}
  async function boardCards(){const root=Object.fromEntries((await csv(CONFIG,'0')).map(r=>[String(r[0]).toLowerCase(),r[1]])),gid=root['s'+control.season+'_gid'];if(!gid)throw Error('This exact season is not linked in TEST Website Config.');const config=Object.fromEntries((await csv(CONFIG,gid)).map(r=>[String(r[0]).toLowerCase(),r[1]])),divs=Number(config.divisions);if(!Number.isInteger(divs)||divs<1||divs>8)throw Error('The division count is invalid.');
    if(control.kind==='calendar')return calendarCard(await csv(config.d1_sheet_id,config.d1_calendar_gid),control.season);
    const rows=await Promise.all(Array.from({length:divs},(_,i)=>csv(config['d'+(i+1)+'_sheet_id'],config['d'+(i+1)+(control.kind==='teams'?'_team_info_gid':'_driver_results_gid')])));
    // Fetch and validate all divisions before editing any complete board.
    return control.kind==='teams'?teamCards(rows.map((r,i)=>teamsFromRows(r,i+1)),control.season):rows.flatMap((r,i)=>standings(r,i+1,control.season));
  }
  async function boards(){const cards=await boardCards(),stored=await read('discord/boards.json',true),ledger=stored?.value||{schema:1,items:{}};if(ledger.schema!==1||!ledger.items)throw Error('Invalid board receipt store.');const prefix=CHANNEL+':'+control.season+':';
    for(const card of cards){if(!await permitted())return;const key=prefix+card.key,previous=ledger.items[key],payload={embeds:[card.embed],allowed_mentions:{parse:[],users:[],roles:[],replied_user:false},flags:4096},hash=digest(payload);if(previous?.status==='pending')throw Error('A board delivery needs checking before another attempt.');
      if(previous?.messageId){const msg=await discord('GET','/channels/'+CHANNEL+'/messages/'+previous.messageId);if(msg.author?.id!==BOT)throw Error('The saved board is not owned by F1XLDataBot.');if(previous.hash===hash){state.history.push({at:new Date(now()).toISOString(),label:card.embed.title,state:'Unchanged',messageId:previous.messageId});continue;}
        if(!await permitted())return;const updated=await discord('PATCH','/channels/'+CHANNEL+'/messages/'+previous.messageId,{embeds:[card.embed],allowed_mentions:payload.allowed_mentions});if(updated?.id!==previous.messageId)throw Error('Board edit was not confirmed.');ledger.items[key]={status:'sent',hash,messageId:updated.id};await write('discord/boards.json',ledger);state.delivered++;state.history.push({at:new Date(now()).toISOString(),label:card.embed.title,state:'Updated',messageId:updated.id});await save();
      }else await deliver(key,payload,card.embed.title,ledger.items,()=>write('discord/boards.json',ledger));
    }
  }
  async function run(){
    await fresh();if(Date.parse(control.expires)<=now()||control.command==='stop')return;
    const existing=await read('discord/state/'+id+'.json',true);if(existing&&existing.value.runId!==runId)throw Error('This job already has a runner.');if(existing?.value.phase==='finished')return;
    state=existing?.value||{schema:1,runId,id,phase:'starting',at:'',delivered:0,history:[],ledger:{}};
    try{
      const bot=await discord('GET','/users/@me');if(bot?.id!==BOT||bot.bot!==true)throw Error('The secret is not for F1XLDataBot.');const channel=await discord('GET','/channels/'+CHANNEL);if(channel?.id!==CHANNEL||channel.guild_id!==GUILD||![0,5].includes(channel.type))throw Error('The private test channel could not be verified.');
      const [roles,member]=await Promise.all([discord('GET','/guilds/'+GUILD+'/roles'),discord('GET','/guilds/'+GUILD+'/members/'+BOT)]);if(!canPost(roles,member,channel))throw Error('F1XLDataBot needs View Channel, Send Messages and Embed Links in the private channel.');
      if(control.kind==='draft')await source();
      state.phase='ready';state.commandRevision=control.revision;await save();
      if(!['draft','practice'].includes(control.kind)){if(control.command==='run'){state.phase='running';await save();await boards();}state.phase='finished';await save();return;}
      const baseline=new Map((control.baseline||[]).map(p=>[p.id,p]));
      while(now()<Date.parse(control.expires)){
        await fresh();if(control.command==='stop')break;const changed=state.commandRevision!==control.revision;state.commandRevision=control.revision;
        if(control.command==='pause'){if(changed||state.phase!=='paused'||now()-Date.parse(state.at)>=300000){state.phase='paused';await save();}await sleep(15000);continue;}
        state.phase='running';await save();
        let picks;if(control.kind==='practice'){sequence++;picks=[{id:'1/'+sequence,division:1,pick:sequence,team:'Practice Team '+sequence,one:{id:'practice-a'+sequence,name:'Example Driver A'},two:{id:'practice-b'+sequence,name:'Example Driver B'},at:new Date(now()).toISOString()}];}else picks=await source();
        const currentIds=new Set(picks.map(p=>p.id));for(const [key,receipt] of Object.entries(state.ledger))if(receipt.status==='sent'&&!currentIds.has(key)&&control.kind==='draft')throw Error('A previously announced pick was undone. A correction needs review.');
        for(const p of picks){const base=baseline.get(p.id);if(base){if(base.one!==p.one.id||base.two!==p.two.id)throw Error('A pick from the starting baseline was corrected. Review before announcing.');continue;}
          // Permanent driver IDs decide whether this is a changed pick; aliases do not.
          const identity=digest([p.division,p.pick,p.team.toLowerCase(),p.one.id,p.two.id]),receipt=state.ledger[p.id];if(receipt?.identity===identity&&receipt.status==='sent')continue;if(receipt?.status==='sent')throw Error('An announced pick changed. A correction needs review.');
          await deliver(p.id,pickPayload(p,control.season,control.kind==='practice'),'D'+p.division+' pick '+p.pick+' · '+p.team,state.ledger,save);if(state.ledger[p.id]?.status==='sent'){state.ledger[p.id].identity=identity;await save();}
        }
        state.phase='ready';await save();
        // Controls are checked every 15 seconds; source reads only every five
        // minutes (practice: one minute), avoiding heavy spreadsheet polling.
        const until=now()+(control.kind==='practice'?60000:300000);
        while(now()<until&&now()<Date.parse(control.expires)){await sleep(15000);await fresh();state.commandRevision=control.revision;if(control.command!=='run')break;}
      }
      state.phase='finished';state.commandRevision=control.revision;await save();
    }catch(e){state.phase='attention';state.error='Delivery/source check failed. Review receipts and the private channel.';try{await save();}catch(ignore){}throw e;}
  }
  return {run,read,write};
}
module.exports={parseCSV,validateControl,validatePicks,pickPayload,canPost,standings,teamsFromRows,teamCards,calendarCard,createRunner};
if(require.main===module)createRunner().run().catch(e=>{console.error('Portal Discord stopped:',e.message);process.exitCode=1;});
