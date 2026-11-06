/** Portal controls for the existing GitHub runners. No direct Discord requests.
 * Only public announcement data belongs on the isolated control branch.
 * The owner credential never leaves Script Properties or appears in a reply. */
const F1XL_DISCORD_GITHUB=Object.freeze({repo:'F1XL2010/f1xl2010.github.io',branch:'discord-control',workflow:'f1xl-portal-discord.yml',token:'F1XL_DISCORD_GITHUB_TOKEN',job:'F1XL_DISCORD_GITHUB_JOB',busy:'F1XL_DISCORD_GITHUB_BUSY',pilot:'1329444470881648762',config:'1tmTdmjPRXF23Ixj3p_-nxsfIqv76MUIUET7Qht2qfdg'});
function discordGithubActor_(kind){
  const p=fapCurrentPerson_();if(!p||p.status!=='Active')throw Error('Sign in to the Portal.');
  const has=(area,level)=>fapPermission_(p,area)>=level;
  if(kind==='owner'){if(!p.owner)throw Error('Only the F1XL owner can connect GitHub.');}
  else if(kind==='draft'){if(!has('draft',2)&&!has('maintenance',2))throw Error('Draft editing access is required.');}
  else if(kind==='boards'){if(!has('results',2)&&!has('maintenance',2))throw Error('Results editing access is required.');}
  else if(!has('draft',1)&&!has('results',1)&&!has('maintenance',1))throw Error('Discord updates are not included in your access.');
  return p;
}
function discordGithubRequest_(method,path,body,candidate){
  // All paths are built internally; no caller can choose a repository or URL.
  const token=candidate||PropertiesService.getScriptProperties().getProperty(F1XL_DISCORD_GITHUB.token);
  if(!token)throw Error('The F1XL owner needs to connect GitHub once before these controls can run.');
  let response;try{response=UrlFetchApp.fetch('https://api.github.com/repos/'+F1XL_DISCORD_GITHUB.repo+path,{method:method.toLowerCase(),headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'F1XL-Admin-Portal'},contentType:'application/json',payload:body?JSON.stringify(body):undefined,muteHttpExceptions:true,followRedirects:false});}catch(e){throw Error('GitHub did not confirm the request. Refresh the status before trying again.');}
  const status=response.getResponseCode(),text=response.getContentText(),data=text?fapJson_(text,{}):{};
  if(status===404)return {missing:true,status:status};
  if(status===409||status===422)return {conflict:true,status:status};
  if(status<200||status>=300)throw Error(status===401||status===403?'GitHub did not allow this operation. The owner should check the connection and its expiry.':'GitHub did not confirm the operation (HTTP '+status+'). Refresh before trying again.');
  return {data:data,status:status};
}
function discordGithubRead_(file){const r=discordGithubRequest_('GET','/contents/'+file+'?ref='+F1XL_DISCORD_GITHUB.branch);if(r.missing)return null;if(!r.data||r.data.type!=='file'||r.data.encoding!=='base64')throw Error('GitHub returned an unreadable control record.');return {sha:r.data.sha,value:JSON.parse(Utilities.newBlob(Utilities.base64Decode(r.data.content.replace(/\s/g,''))).getDataAsString())};}
function discordGithubWrite_(file,value,sha){const r=discordGithubRequest_('PUT','/contents/'+file,{message:'Discord control update',branch:F1XL_DISCORD_GITHUB.branch,content:Utilities.base64Encode(JSON.stringify(value)),sha:sha||undefined});if(r.missing||r.conflict)throw Error('Discord controls changed or the control branch is unavailable. Refresh before trying again.');return r;}
function discordGithubBranch_(){let r=discordGithubRequest_('GET','/git/ref/heads/'+F1XL_DISCORD_GITHUB.branch);if(!r.missing)return;const base=discordGithubRequest_('GET','/git/ref/heads/main');if(base.missing||!base.data?.object?.sha)throw Error('The repository main branch could not be checked.');r=discordGithubRequest_('POST','/git/refs',{ref:'refs/heads/'+F1XL_DISCORD_GITHUB.branch,sha:base.data.object.sha});if(r.conflict){const check=discordGithubRequest_('GET','/git/ref/heads/'+F1XL_DISCORD_GITHUB.branch);if(!check.missing)return;}if(r.missing||r.conflict)throw Error('The owner needs Contents read/write permission for this repository.');}
function discordGithubJob_(){return fapJson_(PropertiesService.getScriptProperties().getProperty(F1XL_DISCORD_GITHUB.job)||'null',null);}
function discordGithubSaveJob_(j){const small={};['id','kind','season','created','expires','command','revision'].forEach(k=>small[k]=j[k]);PropertiesService.getScriptProperties().setProperty(F1XL_DISCORD_GITHUB.job,JSON.stringify(small));}
function discordGithubBusy_(work){
  const claim=Utilities.getUuid();fapLock_(()=>{const props=PropertiesService.getScriptProperties(),old=fapJson_(props.getProperty(F1XL_DISCORD_GITHUB.busy)||'null',null);if(old&&Date.now()-old.at<180000)throw Error('Another Discord command is being checked. Please wait, then refresh.');props.setProperty(F1XL_DISCORD_GITHUB.busy,JSON.stringify({id:claim,at:Date.now()}));});
  try{return work();}finally{fapLock_(()=>{const props=PropertiesService.getScriptProperties(),old=fapJson_(props.getProperty(F1XL_DISCORD_GITHUB.busy)||'null',null);if(old?.id===claim)props.deleteProperty(F1XL_DISCORD_GITHUB.busy);});}
}
// Cache only non-secret display receipts, never credentials or command authority.
// Commands still compare the durable remote revision before writing anything.
function discordGithubSnapshot_(id,value){
  try{const cache=CacheService.getScriptCache(),key='discordGithubReceipt:'+id;
    if(arguments.length>1){const state=value?.state;cache.put(key,JSON.stringify({state:state?{id:state.id,runId:state.runId,phase:state.phase,at:state.at,commandRevision:state.commandRevision,delivered:state.delivered,history:(state.history||[]).slice(-30)}:null,run:value?.run||null}),600);return value;}
    return fapJson_(cache.get(key)||'null',null);
  }catch(e){return null;}
}
function discordGithubSafeStatus_(j,state,run){
  if(!j)return null;
  let label='Start requested',detail='Waiting for GitHub to start. Nothing has been announced yet.';
  const fresh=state&&Date.now()-Date.parse(state.at)<420000;
  if(state?.phase==='finished'){label='Finished';detail='The announcement job has stopped.';}
  else if(j.command==='stop'&&run?.status==='completed'){label='Finished';detail='The runner has stopped. Any unconfirmed deliveries remain in its history for checking.';}
  else if(state?.phase==='attention'||run?.conclusion&&run.conclusion!=='success'){label='Needs attention';detail='The job stopped without confirming completion. Check its delivery history before starting again.';}
  else if(run?.status==='completed'){label=state?.phase==='finished'?'Finished':'Needs attention';detail=label==='Finished'?'The job has finished.':'The runner ended without a final delivery confirmation.';}
  else if(state&&!fresh){label='Needs attention';detail='No recent heartbeat has arrived. Do not start another job until this one has stopped.';}
  else if(j.command==='stop'){label='Finishing';detail='Stop requested. Waiting for the runner to finish any message already in progress.';}
  else if(fresh&&j.command==='pause'&&state.phase==='paused'&&state.commandRevision===j.revision){label='Paused';detail='No new messages will be sent until you resume.';}
  else if(j.command==='pause'){label='Pausing';detail='Waiting for the runner to acknowledge the pause.';}
  else if(fresh&&(state.phase==='paused'||(['ready','running'].includes(state.phase)&&state.commandRevision!==j.revision))){label='Resuming';detail='Resume requested. Waiting for the runner to acknowledge it.';}
  else if(fresh&&state.phase==='ready'){label='Ready';detail=j.kind==='practice'?'The bot and private channel have been checked. Waiting for the next practice example.':j.kind==='draft'?'The bot and confirmed-pick source have been checked. Waiting for new confirmed picks.':'The bot and private channel have been checked. Preparing the update.';}
  else if(fresh&&state.phase==='running'){label='Running';detail='The runner is checking and sending confirmed updates.';}
  else if(run?.status==='in_progress'){detail='GitHub has started. Checking the bot, channel and source before showing Ready.';}
  else if(Date.now()-Date.parse(j.created)>900000){label='Needs attention';detail='GitHub has not confirmed a working job. Refresh before attempting another start.';}
  if(Date.parse(j.expires)<=Date.now()&&!['Finished','Needs attention'].includes(label)){label='Finished';detail='The announcement window has ended. A delayed runner will not send after this deadline.';}
  return {id:j.id,kind:j.kind,season:j.season,label:label,detail:detail,command:j.command,revision:j.revision,expires:j.expires,at:state?.at||'',delivered:Number(state?.delivered)||0,history:(state?.history||[]).slice(-30).map(r=>({at:String(r.at||''),label:String(r.label||'').slice(0,180),state:['Sent','Updated','Unchanged','Check channel','Rejected'].includes(r.state)?r.state:'Check channel',messageId:/^\d{17,20}$/.test(String(r.messageId||''))?String(r.messageId):''})),runUrl:/^\d+$/.test(String(state?.runId||run?.id||''))?'https://github.com/'+F1XL_DISCORD_GITHUB.repo+'/actions/runs/'+String(state?.runId||run.id):'',channelUrl:'https://discord.com/channels/1186298584203800687/'+F1XL_DISCORD_GITHUB.pilot};
}
function discordGithubReply_(p,j,state,run,warning){const connected=!!PropertiesService.getScriptProperties().getProperty(F1XL_DISCORD_GITHUB.token);
  return {connected:connected,owner:!!p.owner,canDraft:fapPermission_(p,'draft')>=2||fapPermission_(p,'maintenance')>=2,canBoards:fapPermission_(p,'results')>=2||fapPermission_(p,'maintenance')>=2,privateOnly:true,job:discordGithubSafeStatus_(j,state,run),warning:warning,existingSchedules:{standings:'Daily at 12:00 and 18:00 UTC',teams:'Monday and Friday at 09:00 UTC',calendar:'Checked with team lists; only changed content is updated'},pilotUrl:'https://discord.com/channels/1186298584203800687/'+F1XL_DISCORD_GITHUB.pilot};
}
function getDiscordGithubControls(){fapAssertEntry_('getDiscordGithubControls');const p=discordGithubActor_('read'),connected=!!PropertiesService.getScriptProperties().getProperty(F1XL_DISCORD_GITHUB.token),j=discordGithubJob_();let state=null,run=null,warning='';
  if(connected&&j){const cached=discordGithubSnapshot_(j.id);state=cached?.state||null;run=cached?.run||null;
    if(state?.phase!=='finished')try{state=discordGithubRead_('discord/state/'+j.id+'.json')?.value||null;
      // Fresh runner receipts already prove progress. Avoid listing all runs on every poll.
      if(!state||state.phase==='attention'||Date.now()-Date.parse(state.at)>=420000){const r=discordGithubRequest_('GET','/actions/workflows/'+F1XL_DISCORD_GITHUB.workflow+'/runs?event=workflow_dispatch&per_page=30');run=(r.data?.workflow_runs||[]).find(x=>x.display_title==='Portal Discord · '+j.id)||null;}else run=null;
      discordGithubSnapshot_(j.id,{state:state,run:run});
    }catch(e){warning=e.message;}
  }
  return discordGithubReply_(p,j,state,run,warning);
}
function connectDiscordGithub(input){fapAssertEntry_('connectDiscordGithub');discordGithubActor_('owner');const token=String(input?.token||'').trim();if(!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,240}$/.test(token))throw Error('Enter the GitHub access token, without a Bearer prefix.');
  const r=discordGithubRequest_('GET','',null,token);if(r.missing||r.data?.full_name?.toLowerCase()!==F1XL_DISCORD_GITHUB.repo.toLowerCase()||!r.data?.permissions?.push)throw Error('Use a token for the F1XL website repository with Actions and Contents read/write access.');
  PropertiesService.getScriptProperties().setProperty(F1XL_DISCORD_GITHUB.token,token);return getDiscordGithubControls();
}
function discordGithubPicks_(season){
  const book=seasonPlanningOpenMasterReadOnly_(season);if(!book)throw Error('This season has no TEST Master.');
  const sheet=book.getSheetByName('Draft Picks');if(!sheet)return [];
  if(sheet.getLastRow()>1000)throw Error('The draft source needs review.');
  const rows=sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),10).getDisplayValues(),expected=F1XL_PRESEASON_LIVE_DRAFT.headers;
  if(JSON.stringify(rows[0])!==JSON.stringify(expected))throw Error('The Draft Picks layout needs review.');
  const seen={};return rows.slice(1).filter(r=>r.some(v=>String(v).trim())).map(r=>{const key=String(r[0]),division=Number(r[1]),pick=Number(r[2]);if(!Number.isInteger(division)||division<1||division>8||!Number.isInteger(pick)||pick<1||pick>24||key!==division+'/'+pick||seen[key]||!r[3]||!isFinite(Date.parse(r[9])))throw Error('The confirmed draft contains an incomplete or duplicate pick.');seen[key]=true;return {id:key,division:division,pick:pick,team:String(r[3]).slice(0,100),one:{id:String(r[5]),name:String(r[6]).slice(0,100)},two:{id:String(r[7]),name:String(r[8]).slice(0,100)},at:String(r[9])};});
}
function startDiscordGithub(input){fapAssertEntry_('startDiscordGithub');const kind=String(input?.kind||'');if(!['draft','practice','standings','teams','calendar'].includes(kind))throw Error('Choose an update type.');discordGithubActor_(kind==='draft'||kind==='practice'?'draft':'boards');const season=seasonPlanningSeason_(input?.season);
  return discordGithubBusy_(()=>{
    const old=discordGithubJob_();if(old&&Date.parse(old.expires)>Date.now()){
      const status=getDiscordGithubControls();if(!['Finished'].includes(status.job?.label))throw Error('Finish the current Discord job before starting another. A delayed or failed job must be checked first.');
    }
    const workflow=discordGithubRequest_('GET','/actions/workflows/'+F1XL_DISCORD_GITHUB.workflow);if(workflow.missing||workflow.data?.state!=='active')throw Error('The new GitHub runner has not been published yet. The owner needs to finish setup.');
    const picks=kind==='draft'?discordGithubPicks_(season):[];
    discordGithubBranch_();
    const now=new Date(),id=Utilities.getUuid(),j={schema:1,id:id,kind:kind,season:season,created:now.toISOString(),expires:new Date(now.getTime()+((kind==='draft')?240:kind==='practice'?20:15)*60000).toISOString(),command:'run',revision:Utilities.getUuid(),privateOnly:true,channel:F1XL_DISCORD_GITHUB.pilot,config:F1XL_DISCORD_GITHUB.config,baseline:input?.includeExisting===true?[]:picks.map(x=>({id:x.id,one:x.one.id,two:x.two.id})),sourceUrl:kind==='draft'?ScriptApp.getService().getUrl()+'?view=discord-draft&session='+id:''};
    // The durable intent precedes dispatch. Lost dispatch replies must not create duplicate jobs.
    discordGithubSaveJob_(j);
    discordGithubWrite_('discord/control/'+id+'.json',j);
    const r=discordGithubRequest_('POST','/actions/workflows/'+F1XL_DISCORD_GITHUB.workflow+'/dispatches',{ref:'main',inputs:{job:id}});
    if(r.missing||r.conflict)throw Error('GitHub did not accept the start. Refresh the status; do not repeatedly press Start.');
    return discordGithubReply_(discordGithubActor_('read'),j,null,null,'');
  });
}
function commandDiscordGithub(input){fapAssertEntry_('commandDiscordGithub');const command=String(input?.command||'');if(!['pause','run','stop'].includes(command))throw Error('Choose Pause, Resume or Finish.');
  const current=discordGithubJob_();discordGithubActor_(current&&['draft','practice'].includes(current.kind)?'draft':'boards');
  return discordGithubBusy_(()=>{const j=discordGithubJob_();if(!j||j.id!==input?.id||j.revision!==input?.revision)throw Error('The Discord job changed. Refresh before trying again.');const remote=discordGithubRead_('discord/control/'+j.id+'.json');if(!remote||remote.value.revision!==j.revision)throw Error('Refresh the Discord job before sending another command.');if(j.command==='stop'&&command!=='stop')throw Error('This job is finishing. Start a new job after it has stopped.');const changed=Object.assign({},remote.value,{command:command,revision:Utilities.getUuid()});discordGithubWrite_('discord/control/'+j.id+'.json',changed,remote.sha);discordGithubSaveJob_(changed);const snapshot=discordGithubSnapshot_(j.id);return discordGithubReply_(discordGithubActor_('read'),changed,snapshot?.state||null,snapshot?.run||null,'');});
}
/** Deliberately limited public read: confirmed announcement names, no principal,
 * private placements, TT results, account details or applications. Unconfirmed
 * highlights are not read. The public ID is a job selector, not a credential. */
function discordGithubFeedResponse_(event){
  let body;try{const id=String(event?.parameter?.session||''),j=discordGithubJob_();if(!j||j.kind!=='draft'||j.id!==id||Date.parse(j.expires)<=Date.now()||j.command==='stop')throw Error('Unavailable');body={schema:1,session:j.id,season:j.season,picks:discordGithubPicks_(j.season)};}catch(e){body={error:'Confirmed draft source unavailable'};}
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
