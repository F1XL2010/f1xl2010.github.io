/** Discord step 3: settings, previews and explicit private-channel tests only.
 * No trigger, live-source hook or public sender is installed by this module.
 * Credentials stay in Script Properties. HTTP never runs under the Portal lock. */
const F1XL_DISCORD_CONTROL=Object.freeze({
  configKey:'F1XL_DISCORD_CONTROL_V1',tokenKey:'F1XL_DISCORD_BOT_TOKEN',logKey:'F1XL_DISCORD_PILOT_LOG_V1',
  applicationId:'1505912491606147202',mainGuildId:'388387739772518414',
  pilotGuildId:'1186298584203800687',pilotChannelId:'1329444470881648762',api:'https://discord.com/api/v10',
  routes:{
    applications:{label:'New applications',channel:'admin notifications',recipient:'Head of Allocations',cadence:'When a new application arrives'},
    tickets:{label:'New tickets ready for review',channel:'f1 stewards chat',recipient:'Stewards',cadence:'When cases become available, including partial batches'},
    appeals:{label:'New appeals ready for review',channel:'f1 appeals chat',recipient:'Appeals team',cadence:'When appealed cases become available'},
    principal_tickets:{label:'Tickets involving a team',channel:'tp-information',recipient:'Relevant TP tags · no ping',cadence:'When cases become available'},
    standings:{label:'Standings',channel:'S{season}-standings',recipient:'No ping',cadence:'Three times a week'},
    teams:{label:'Team lists',channel:'S{season}-teams',recipient:'No ping',cadence:'Daily'},
    calendar:{label:'Race calendar',channel:'S{season}-race-calendar',recipient:'No ping',cadence:'To be agreed'},
    movements:{label:'Draft, signings & driver movements',channel:'driver-changes',recipient:'No ping',cadence:'Draft: every five minutes while enabled; other updates to be agreed'}
  }
});
function discordControlActor_(edit){const p=fapCurrentPerson_();if(!p||p.status!=='Active')throw Error('Sign in to the Portal.');fapRequire_(p,'maintenance',edit?2:1);return p;}
function discordControlOwner_(){const p=discordControlActor_(true);if(!p.owner)throw Error('Only the F1XL owner can set the bot connection.');return p;}
function discordControlConfig_(){
  const saved=fapJson_(PropertiesService.getScriptProperties().getProperty(F1XL_DISCORD_CONTROL.configKey)||'{}',{})||{};
  return {revision:saved.revision||'',paused:saved.paused!==false,routes:saved.routes||{},updatedAt:saved.updatedAt||''};
}
function discordControlId_(v){const id=String(v||'').trim();if(!/^\d{17,20}$/.test(id)||id.length===20&&id>'18446744073709551615')throw Error('Use a Discord channel link or numeric Discord ID.');return id;}
function discordControlDestination_(value){
  const text=String(value||'').trim();if(!text)return '';
  const link=text.match(/^https:\/\/(?:www\.)?discord\.com\/channels\/(\d{17,20})\/(\d{17,20})\/?$/);
  if(link){if(link[1]!==F1XL_DISCORD_CONTROL.mainGuildId)throw Error('For a league destination, use a channel from the F1XL server.');return discordControlId_(link[2]);}
  return discordControlId_(text);
}
function discordControlPublic_(p){
  const c=discordControlConfig_(),props=PropertiesService.getScriptProperties();
  return {revision:c.revision,paused:c.paused,automaticSending:false,canEdit:fapPermission_(p,'maintenance')>=2,canSetToken:!!p.owner,
    hasToken:!!props.getProperty(F1XL_DISCORD_CONTROL.tokenKey),pilot:{guildId:F1XL_DISCORD_CONTROL.pilotGuildId,channelId:F1XL_DISCORD_CONTROL.pilotChannelId,url:'https://discord.com/channels/'+F1XL_DISCORD_CONTROL.pilotGuildId+'/'+F1XL_DISCORD_CONTROL.pilotChannelId},
    routes:Object.keys(F1XL_DISCORD_CONTROL.routes).map(key=>Object.assign({key:key,channelId:c.routes[key]?.channelId||'',days:c.routes[key]?.days||[],time:c.routes[key]?.time||''},F1XL_DISCORD_CONTROL.routes[key])),
    history:fapJson_(props.getProperty(F1XL_DISCORD_CONTROL.logKey)||'[]',[]).map(r=>({at:r.at,route:r.route,state:r.state,messageId:r.messageId||'',elapsedMs:r.elapsedMs||0})),updatedAt:c.updatedAt};
}
function getDiscordControls(){fapAssertEntry_('getDiscordControls');return discordControlPublic_(discordControlActor_(false));}
function saveDiscordControls(input){fapAssertEntry_('saveDiscordControls');const p=discordControlActor_(true);
  if(!input||input.automaticSending===true)throw Error('Automatic posting is not enabled in this private test.');
  const routes={};if(!Array.isArray(input.routes)||input.routes.length!==Object.keys(F1XL_DISCORD_CONTROL.routes).length)throw Error('Refresh the Discord settings before saving.');
  input.routes.forEach(r=>{if(!Object.prototype.hasOwnProperty.call(F1XL_DISCORD_CONTROL.routes,r.key)||routes[r.key])throw Error('Unknown or duplicate Discord update type.');
    const days=Array.from(new Set(r.days||[]));if(days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Choose valid weekdays.');const time=String(r.time||'');if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Choose a valid UK time.');
    routes[r.key]={channelId:discordControlDestination_(r.channelId),days:days.sort(),time:time};});
  fapLock_(()=>{const c=discordControlConfig_();if(c.revision!==String(input.revision||''))throw Error('Discord settings changed. Refresh before saving.');
    PropertiesService.getScriptProperties().setProperty(F1XL_DISCORD_CONTROL.configKey,JSON.stringify({revision:Utilities.getUuid(),paused:input.paused!==false,routes:routes,updatedAt:fapNow_()}));});
  return discordControlPublic_(p);
}
function discordControlHttp_(method,path,body,candidate){
  if(!(/^\/users\/@me$/.test(path)||/^\/channels\/\d{17,20}(?:\/messages)?$/.test(path)||/^\/guilds\/\d{17,20}\/(?:roles|members\/\d{17,20})$/.test(path)))throw Error('This Discord operation is not allowed.');
  const token=candidate||PropertiesService.getScriptProperties().getProperty(F1XL_DISCORD_CONTROL.tokenKey);if(!token)throw Error('The F1XL owner needs to connect the existing bot first.');
  const options={method:method.toLowerCase(),headers:{Authorization:'Bot '+token,'User-Agent':'DiscordBot (https://f1xl.co.uk, 1.0)'},contentType:'application/json',muteHttpExceptions:true,followRedirects:false};if(body)options.payload=JSON.stringify(body);
  let response;try{response=UrlFetchApp.fetch(F1XL_DISCORD_CONTROL.api+path,options);}catch(e){throw Error('Discord could not be reached. Check the test channel before trying again.');}
  const code=response.getResponseCode(),data=fapJson_(response.getContentText(),{});
  if(Number(data.code)===40333)throw Error('Discord blocked the Portal request (40333). The bot token is connected; this is not a channel-permission error. Leave permissions unchanged while the connection is checked.');
  if(code===429)throw Error('Discord is limiting requests. Try again in '+Math.max(1,Math.ceil(Number(data.retry_after)||30))+' seconds.');
  if(code===401)throw Error('Discord did not accept the bot connection. Ask the F1XL owner to check the saved token.');
  if(code===403||code===404){const target=/\/messages$/.test(path)?'post in the approved private test channel':/^\/channels\//.test(path)?'view the approved private test channel':/\/members\//.test(path)?'check its membership in the test server':'read the test server roles';throw Error('F1XLDataBot cannot '+target+' (Discord '+(Number(data.code)||code)+').');}
  if(code<200||code>=300)throw Error('Discord did not confirm this request (HTTP '+code+'). Check the test channel before trying again.');
  return data;
}
function setDiscordBotCredential(input){fapAssertEntry_('setDiscordBotCredential');const p=discordControlOwner_(),token=String(input?.token||'').trim();
  if(!token||token.length<20||token.length>256||/[\s\x00-\x1f]/.test(token)||/^Bot /i.test(token))throw Error('Enter the existing bot token only, without a Bot prefix.');
  const bot=discordControlHttp_('GET','/users/@me',null,token);if(String(bot.id)!==F1XL_DISCORD_CONTROL.applicationId||bot.bot!==true)throw Error('This token is not for the existing F1XLDataBot. Nothing was saved.');
  fapLock_(()=>PropertiesService.getScriptProperties().setProperty(F1XL_DISCORD_CONTROL.tokenKey,token));return discordControlPublic_(p);
}
function discordControlBits_(value){
  // Only bits 0–14 are needed here. Decimal modulo preserves them exactly,
  // even when Discord's complete mask exceeds Number's safe integer range.
  const text=String(value||'0');if(!/^\d{1,30}$/.test(text))throw Error('Discord returned an invalid permissions value.');
  let low=0;for(let i=0;i<text.length;i++)low=(low*10+Number(text[i]))%32768;return low;
}
function discordControlPermission_(roles,member,channel){
  const gid=F1XL_DISCORD_CONTROL.pilotGuildId,ids=member.roles||[];let mask=discordControlBits_(roles.find(r=>r.id===gid)?.permissions);
  roles.filter(r=>ids.includes(r.id)).forEach(r=>mask|=discordControlBits_(r.permissions));
  if(mask&8)return {view:true,send:true,embed:true};
  const everyone=(channel.permission_overwrites||[]).find(r=>r.id===gid);if(everyone)mask=(mask&~discordControlBits_(everyone.deny))|discordControlBits_(everyone.allow);
  let deny=0,allow=0;(channel.permission_overwrites||[]).filter(r=>Number(r.type)===0&&ids.includes(r.id)).forEach(r=>{deny|=discordControlBits_(r.deny);allow|=discordControlBits_(r.allow);});mask=(mask&~deny)|allow;
  const own=(channel.permission_overwrites||[]).find(r=>Number(r.type)===1&&r.id===F1XL_DISCORD_CONTROL.applicationId);if(own)mask=(mask&~discordControlBits_(own.deny))|discordControlBits_(own.allow);
  return {view:!!(mask&1024),send:!!(mask&2048),embed:!!(mask&16384)};
}
function discordControlBot_(){
  const bot=discordControlHttp_('GET','/users/@me');if(String(bot.id)!==F1XL_DISCORD_CONTROL.applicationId||bot.bot!==true)throw Error('The saved bot connection does not identify F1XLDataBot.');
  return bot;
}
function discordControlCheckPilot_(){
  const bot=discordControlBot_();
  const channel=discordControlHttp_('GET','/channels/'+F1XL_DISCORD_CONTROL.pilotChannelId);
  if(String(channel.guild_id)!==F1XL_DISCORD_CONTROL.pilotGuildId||String(channel.id)!==F1XL_DISCORD_CONTROL.pilotChannelId||![0,5].includes(channel.type))throw Error('The approved private test destination could not be verified.');
  const roles=discordControlHttp_('GET','/guilds/'+F1XL_DISCORD_CONTROL.pilotGuildId+'/roles'),member=discordControlHttp_('GET','/guilds/'+F1XL_DISCORD_CONTROL.pilotGuildId+'/members/'+F1XL_DISCORD_CONTROL.applicationId),permissions=discordControlPermission_(roles,member,channel);
  if(!permissions.view||!permissions.send||!permissions.embed)throw Error('In the private test channel, give F1XLDataBot View Channel, Send Messages and Embed Links. Administrator permission is not needed.');
  return {name:channel.name||'Private test channel',bot:bot.username||'F1XLDataBot',permissions:permissions};
}
function checkDiscordPilot(){fapAssertEntry_('checkDiscordPilot');discordControlActor_(true);return discordControlCheckPilot_();}
function discordControlDemo_(key){
  if(!Object.prototype.hasOwnProperty.call(F1XL_DISCORD_CONTROL.routes,key))throw Error('Choose an available Discord message type.');const route=F1XL_DISCORD_CONTROL.routes[key];
  const messages={applications:'A new driver application is ready to check.\nRecipient: Head of Allocations.',tickets:'Two new tickets are ready for the stewards to review.\nMore cases can be added before the deadline.',appeals:'A new appealed case is ready for the appeals team to review.',principal_tickets:'A ticket involving your team is available in the Team Principal Hub.\nThe relevant TP tag will be shown without a ping.',standings:'The latest division and overall standings are available on the website.',teams:'The latest team lists are available on the website.',calendar:'The latest race calendar is available on the website.',movements:'Example Driver has signed for Example Team.\nDraft announcements and driver movements will use this channel.'};
  return {content:'F1XL Admin Portal · PRIVATE TEST',embeds:[{title:route.label,description:messages[key]+'\n\nDemonstration only — no real season records have changed.',color:3066993,footer:{text:'No mentions · private test channel only'}}],allowed_mentions:{parse:[],users:[],roles:[],replied_user:false},flags:4096};
}
function previewDiscordPilot(input){fapAssertEntry_('previewDiscordPilot');const p=discordControlActor_(false),key=String(input?.route||''),payload=discordControlDemo_(key),requestId=Utilities.getUuid().replace(/-/g,'').slice(0,24),config=discordControlConfig_();
  CacheService.getScriptCache().put('discord:preview:'+requestId,JSON.stringify({actor:p.id,route:key,revision:config.revision}),600);
  return {requestId:requestId,route:key,title:payload.embeds[0].title,text:payload.embeds[0].description,channel:'Private test channel',paused:config.paused};
}
function discordControlPilotLog_(entry){
  const props=PropertiesService.getScriptProperties(),rows=fapJson_(props.getProperty(F1XL_DISCORD_CONTROL.logKey)||'[]',[]);rows.unshift(entry);props.setProperty(F1XL_DISCORD_CONTROL.logKey,JSON.stringify(rows.slice(0,12)));
}
function sendDiscordPilot(input){fapAssertEntry_('sendDiscordPilot');const p=discordControlActor_(true),id=String(input?.requestId||'');
  if(!/^[a-f0-9]{24}$/i.test(id))throw Error('Preview a test message before sending.');
  const preview=fapJson_(CacheService.getScriptCache().get('discord:preview:'+id),null);if(!preview||preview.actor!==p.id)throw Error('This preview expired. Open a fresh preview.');
  const claim=fapLock_(()=>{const c=discordControlConfig_();if(c.paused)throw Error('Private tests are paused. Allow private tests in the settings first.');if(c.revision!==preview.revision)throw Error('Settings changed. Preview the message again.');
    const rows=fapJson_(PropertiesService.getScriptProperties().getProperty(F1XL_DISCORD_CONTROL.logKey)||'[]',[]),old=rows.find(r=>r.id===id);
    if(old){if(old.state==='Sent')return old;throw Error('This test was already attempted. Check the channel before creating another preview.');}
    const row={id:id,at:fapNow_(),route:preview.route,state:'Sending'};discordControlPilotLog_(row);return row;});
  if(claim.state==='Sent')return {messageId:claim.messageId,alreadySent:true,elapsedMs:claim.elapsedMs};
  const start=Date.now();let delivered;
  try{
    // The channel-details GET is a separate diagnostic, not a prerequisite
    // for posting to the owner's fixed, approved private destination.
    // Discord enforces the bot's channel permissions on the POST itself.
    discordControlBot_();
    if(discordControlConfig_().paused)throw Error('Private tests were paused before sending.');
    const payload=discordControlDemo_(preview.route);payload.nonce=id;payload.enforce_nonce=true;
    delivered=discordControlHttp_('POST','/channels/'+F1XL_DISCORD_CONTROL.pilotChannelId+'/messages',payload);
    if(!delivered.id||String(delivered.channel_id)!==F1XL_DISCORD_CONTROL.pilotChannelId)throw Error('Discord did not return the expected private-channel message confirmation. Check the private test channel.');
  }catch(e){fapLock_(()=>{const props=PropertiesService.getScriptProperties(),rows=fapJson_(props.getProperty(F1XL_DISCORD_CONTROL.logKey)||'[]',[]);const row=rows.find(r=>r.id===id);if(row){row.state='Check channel';row.elapsedMs=Date.now()-start;}props.setProperty(F1XL_DISCORD_CONTROL.logKey,JSON.stringify(rows));});throw e;}
  const elapsed=Date.now()-start;
  // Delivery is already complete. A log write failure must never cause a resend.
  try{fapLock_(()=>{const props=PropertiesService.getScriptProperties(),rows=fapJson_(props.getProperty(F1XL_DISCORD_CONTROL.logKey)||'[]',[]),row=rows.find(r=>r.id===id);if(row){row.state='Sent';row.messageId=String(delivered.id);row.elapsedMs=elapsed;}props.setProperty(F1XL_DISCORD_CONTROL.logKey,JSON.stringify(rows));});}catch(e){return {messageId:String(delivered.id),elapsedMs:elapsed,logPending:true};}
  return {messageId:String(delivered.id),elapsedMs:elapsed};
}

