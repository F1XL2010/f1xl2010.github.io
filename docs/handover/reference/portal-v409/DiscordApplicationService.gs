/** New application -> Discord only. No applicant answers leave this project.
 * Existing inboxes stay authoritative. Background triggers never accept,
 * archive, reject or modify an application. Disabled until owner setup. */
const F1XL_APPLICATION_ALERTS=Object.freeze({settings:'F1XL_APPLICATION_DISCORD_SETTINGS_V1',queue:'F1XL_APPLICATION_DISCORD_QUEUE_V1',busy:'F1XL_APPLICATION_DISCORD_BUSY_V1',seen:'F1XL_APPLICATION_DISCORD_SEEN_',workflow:'f1xl-application-alerts.yml',remote:'discord/application-settings.json',guild:'388387739772518414',pilotGuild:'1186298584203800687',pilot:'1329444470881648762',submit:'discordApplicationSubmission_',tick:'discordApplicationTick_'});
function discordApplicationSettings_(){return fapJson_(PropertiesService.getScriptProperties().getProperty(F1XL_APPLICATION_ALERTS.settings)||'null',null)||{enabled:false,revision:'',channelId:'',started:'',sourceId:'',sheetId:0};}
function discordApplicationQueue_(){return fapJson_(PropertiesService.getScriptProperties().getProperty(F1XL_APPLICATION_ALERTS.queue)||'null',null)||{pending:[],batch:null,lastCheck:'',lastDelivery:'',issue:''};}
function discordApplicationStore_(q){const text=JSON.stringify(q);if(text.length>8000)throw Error('Application alert queue needs review; no applications were changed.');PropertiesService.getScriptProperties().setProperty(F1XL_APPLICATION_ALERTS.queue,text);}
function discordApplicationOwner_(){const p=fapCurrentPerson_();if(!p||!p.owner)throw Error('Only the F1XL owner can configure application messages.');return p;}
function discordApplicationRecipient_(){
  const heads=fapRows_().map(fapPerson_).filter(p=>p.status==='Active'&&p.roles.includes('allocations_lead'));
  if(heads.length!==1)throw Error('Assign one active Head of Allocations in Administration → Staff access first.');
  const p=heads[0],id=fapDiscordId_(p.discordUserId);if(!id)throw Error('Add the Head of Allocations’ numeric Discord user ID in Staff access first.');
  return {id,name:p.discord||p.gamertag};
}
function discordApplicationStatus_(){
  const s=discordApplicationSettings_(),q=discordApplicationQueue_();let recipient=null,setupIssue='';try{recipient=discordApplicationRecipient_();}catch(e){setupIssue=e.message;}
  return {enabled:s.enabled,revision:s.revision,channelId:s.channelId,channelUrl:s.channelId?'https://discord.com/channels/'+F1XL_APPLICATION_ALERTS.guild+'/'+s.channelId:'',recipient,setupIssue,pending:q.pending.length,inFlight:!!q.batch,lastCheck:q.lastCheck,lastDelivery:q.lastDelivery,issue:q.issue,privateTest:s.privateTest||null,sourceAvailable:s.sourceId===F1XL_APPLICATION_SOURCE.spreadsheetId&&s.sheetId===F1XL_APPLICATION_SOURCE.sheetId};
}
function getDiscordApplicationAlerts(){fapAssertEntry_('getDiscordApplicationAlerts');discordApplicationOwner_();
  if(discordApplicationQueue_().batch)discordApplicationClaim_(()=>{const q=discordApplicationQueue_();try{discordApplicationReconcile_(q);if(q.batch&&Date.now()-Date.parse(q.batch.created)>900000){q.issue=q.issue||'GitHub has not confirmed delivery yet. Check status before retrying.';discordApplicationStore_(q);}}catch(e){q.issue='Delivery status could not be checked. No new message was sent.';discordApplicationStore_(q);}});
  const out=discordApplicationStatus_(),s=discordApplicationSettings_();if(s.privateTest)try{const r=discordGithubRead_('discord/applications/state/'+s.privateTest.id+'.json')?.value;out.privateTest={...s.privateTest,phase:r?.phase||'requested',messageId:r?.messageId||''};}catch(e){out.privateTest={...s.privateTest,phase:'Status unavailable'};}return out;
}
function discordApplicationRemote_(s,recipient){return {schema:1,enabled:s.enabled,revision:s.revision,guild:F1XL_APPLICATION_ALERTS.guild,channel:s.channelId,recipient:recipient?.id||'',route:'applications'};}
function discordApplicationRows_(){
  const c=openApplicationContext_(),sheet=c.sourceSheet,last=sheet.getLastRow();if(last>5000)throw Error('Application inbox is larger than expected. Archive completed responses before enabling alerts.');
  const cols=applicationColumns_(c.headers),rows=last>1?sheet.getRange(2,1,last-1,Math.max(cols.received,cols.gamertag,cols.discordId)+1).getValues():[];
  return rows.filter(r=>String(r[cols.gamertag]||'').trim()).map(r=>{const received=intakeApplicationTime_(r[cols.received]);if(!received)return null;const identity=r[cols.received] instanceof Date?r[cols.received].toISOString():received;return {received,key:fapHash_([c.spreadsheet.getId(),sheet.getSheetId(),identity,String(r[cols.discordId]||r[cols.gamertag]).trim().toLowerCase()].join('|'))};}).filter(Boolean);
}
function discordApplicationClaim_(work){
  const props=PropertiesService.getScriptProperties(),claim=Utilities.getUuid();
  const acquired=fapLock_(()=>{const old=fapJson_(props.getProperty(F1XL_APPLICATION_ALERTS.busy)||'null',null);if(old&&Date.now()-old.at<180000)return false;props.setProperty(F1XL_APPLICATION_ALERTS.busy,JSON.stringify({id:claim,at:Date.now()}));return true;});
  if(!acquired)return {busy:true};
  try{return work();}finally{fapLock_(()=>{if(fapJson_(props.getProperty(F1XL_APPLICATION_ALERTS.busy)||'null',null)?.id===claim)props.deleteProperty(F1XL_APPLICATION_ALERTS.busy);});}
}
function discordApplicationInstall_(){
  const handlers=ScriptApp.getProjectTriggers();
  const matching=name=>handlers.filter(t=>t.getHandlerFunction()===name);
  const submits=matching(F1XL_APPLICATION_ALERTS.submit),ticks=matching(F1XL_APPLICATION_ALERTS.tick);
  if(submits.some(t=>t.getTriggerSourceId()!==F1XL_APPLICATION_SOURCE.spreadsheetId)||submits.length>1||ticks.length>1)throw Error('Review the existing application alert triggers before enabling.');
  if(!submits.length)ScriptApp.newTrigger(F1XL_APPLICATION_ALERTS.submit).forSpreadsheet(F1XL_APPLICATION_SOURCE.spreadsheetId).onFormSubmit().create();
  if(!ticks.length)ScriptApp.newTrigger(F1XL_APPLICATION_ALERTS.tick).timeBased().everyMinutes(15).create();
}
function saveDiscordApplicationAlerts(input){fapAssertEntry_('saveDiscordApplicationAlerts');discordApplicationOwner_();
  const result=discordApplicationClaim_(()=>{
    const current=discordApplicationSettings_();if(String(input?.revision||'')!==current.revision)throw Error('Application alert settings changed. Refresh before saving.');
    const enabled=input?.enabled===true,channelId=discordControlDestination_(input?.channelId||current.channelId);
    if(enabled&&!channelId)throw Error('Paste the admin notifications channel link first.');
    const recipient=enabled?discordApplicationRecipient_():null;
    const s={...current,enabled,channelId,revision:Utilities.getUuid()};
    if(enabled){
      const w=discordGithubRequest_('GET','/actions/workflows/'+F1XL_APPLICATION_ALERTS.workflow);if(w.missing||w.data?.state!=='active')throw Error('Publish the application-message runner before enabling.');
      if(!current.started){
        const rows=discordApplicationRows_(),props=PropertiesService.getScriptProperties();rows.forEach(r=>props.setProperty(F1XL_APPLICATION_ALERTS.seen+r.key,'baseline'));
        s.started=Utilities.formatDate(new Date(),'Europe/London','yyyy-MM-dd HH:mm');s.sourceId=F1XL_APPLICATION_SOURCE.spreadsheetId;s.sheetId=F1XL_APPLICATION_SOURCE.sheetId;
      }
      if(s.sourceId!==F1XL_APPLICATION_SOURCE.spreadsheetId||s.sheetId!==F1XL_APPLICATION_SOURCE.sheetId)throw Error('Application source changed. Review the alert baseline before enabling.');
      discordApplicationInstall_();
    }
    // Local pause takes effect first. If remote confirmation fails, the owner
    // sees an explicit warning; an already-running send is not claimed stopped.
    if(!enabled)PropertiesService.getScriptProperties().setProperty(F1XL_APPLICATION_ALERTS.settings,JSON.stringify(s));
    const old=discordGithubRead_(F1XL_APPLICATION_ALERTS.remote);discordGithubWrite_(F1XL_APPLICATION_ALERTS.remote,discordApplicationRemote_(s,recipient),old?.sha);
    PropertiesService.getScriptProperties().setProperty(F1XL_APPLICATION_ALERTS.settings,JSON.stringify(s));
    return discordApplicationStatus_();
  });if(result?.busy)throw Error('An application message check is finishing. Wait a moment and refresh.');return result;
}
function discordApplicationEnqueue_(items,s,q){
  const props=PropertiesService.getScriptProperties();
  for(const item of items){if(item.received<s.started||props.getProperty(F1XL_APPLICATION_ALERTS.seen+item.key)||q.pending.includes(item.key)||q.batch?.keys.includes(item.key))continue;
    if(q.pending.length>=100)throw Error('Application message queue is full. No applications were changed.');
    q.pending.push(item.key);discordApplicationStore_(q);props.setProperty(F1XL_APPLICATION_ALERTS.seen+item.key,'queued');
  }
}
function discordApplicationReconcile_(q){
  if(!q.batch)return;
  const r=discordGithubRead_('discord/applications/state/'+q.batch.id+'.json')?.value;if(!r)return;
  if(r.id!==q.batch.id||r.count!==q.batch.keys.length||r.schema!==1)throw Error('Application delivery receipt needs review.');
  if(r.phase==='sent'&&/^\d{17,20}$/.test(String(r.messageId||''))){q.lastDelivery=r.at;q.batch=null;q.issue='';discordApplicationStore_(q);}
  else if(['attention','rejected','cancelled'].includes(r.phase)){q.issue='Application message needs checking. Review the GitHub delivery record before retrying.';discordApplicationStore_(q);}
}
function discordApplicationDispatch_(q,s,recipient){
  if(q.batch||!q.pending.length)return;
  const keys=q.pending.slice(0,50),id=Utilities.getUuid(),job={schema:1,id,kind:'applications',mode:'live',count:keys.length,created:new Date().toISOString(),expires:new Date(Date.now()+86400000).toISOString(),revision:s.revision,channel:s.channelId,guild:F1XL_APPLICATION_ALERTS.guild,recipient:recipient.id};
  // Keep identity hashes private. GitHub gets a random batch ID and count only.
  q.batch={id,keys,created:job.created,job};q.pending=q.pending.slice(keys.length);q.issue='';discordApplicationStore_(q);
  discordGithubWrite_('discord/applications/jobs/'+id+'.json',job);
  const result=discordGithubRequest_('POST','/actions/workflows/'+F1XL_APPLICATION_ALERTS.workflow+'/dispatches',{ref:'main',inputs:{job:id}});
  if(result.missing||result.conflict)throw Error('GitHub did not confirm the application message start. Check delivery before retrying.');
}
function discordApplicationWork_(extra){
  return discordApplicationClaim_(()=>{const s=discordApplicationSettings_();if(!s.enabled)return;
    const q=discordApplicationQueue_();try{
      if(s.sourceId!==F1XL_APPLICATION_SOURCE.spreadsheetId||s.sheetId!==F1XL_APPLICATION_SOURCE.sheetId)throw Error('Application alert source changed; review setup.');
      discordApplicationReconcile_(q);discordApplicationEnqueue_(extra||discordApplicationRows_(),s,q);q.lastCheck=new Date().toISOString();discordApplicationStore_(q);
      const recipient=discordApplicationRecipient_();
      if(q.pending.length&&!q.batch){const remote=discordGithubRead_(F1XL_APPLICATION_ALERTS.remote),expected=discordApplicationRemote_(s,recipient);if(JSON.stringify(remote?.value)!==JSON.stringify(expected))discordGithubWrite_(F1XL_APPLICATION_ALERTS.remote,expected,remote?.sha);}
      discordApplicationDispatch_(q,s,recipient);
    }catch(e){q.issue=String(e.message||'Application message check failed.').slice(0,240);discordApplicationStore_(q);console.warn('Application Discord check needs owner review.');}
  });
}
function discordApplicationSubmission_(event){
  fapAssertTrigger_(event,F1XL_APPLICATION_ALERTS.submit);
  if(event.source.getId()!==F1XL_APPLICATION_SOURCE.spreadsheetId||event.range.getSheet().getSheetId()!==F1XL_APPLICATION_SOURCE.sheetId)return;
  // Inspect the inbox rather than trusting arbitrary event.values. No writes.
  return discordApplicationWork_();
}
function discordApplicationTick_(event){
  fapAssertHost_();if(!fapNativeOwner_()&&!ScriptApp.getProjectTriggers().some(t=>String(t.getUniqueId())===String(event?.triggerUid)&&t.getHandlerFunction()===F1XL_APPLICATION_ALERTS.tick))throw Error('An installed application-alert clock trigger is required.');
  return discordApplicationWork_();
}
function testDiscordApplicationAlert(){fapAssertEntry_('testDiscordApplicationAlert');discordApplicationOwner_();
  const w=discordGithubRequest_('GET','/actions/workflows/'+F1XL_APPLICATION_ALERTS.workflow);if(w.missing||w.data?.state!=='active')throw Error('Publish the application-message runner first.');
  const id=Utilities.getUuid(),job={schema:1,id,kind:'applications',mode:'private',count:1,created:new Date().toISOString(),expires:new Date(Date.now()+900000).toISOString(),revision:'private',channel:F1XL_APPLICATION_ALERTS.pilot,guild:F1XL_APPLICATION_ALERTS.pilotGuild,recipient:''};
  discordGithubWrite_('discord/applications/jobs/'+id+'.json',job);
  const r=discordGithubRequest_('POST','/actions/workflows/'+F1XL_APPLICATION_ALERTS.workflow+'/dispatches',{ref:'main',inputs:{job:id}});if(r.missing||r.conflict)throw Error('Private example start was not confirmed.');
  const s=discordApplicationSettings_();s.privateTest={id,requested:new Date().toISOString()};PropertiesService.getScriptProperties().setProperty(F1XL_APPLICATION_ALERTS.settings,JSON.stringify(s));
  return discordApplicationStatus_();
}
function retryDiscordApplicationAlert(){fapAssertEntry_('retryDiscordApplicationAlert');discordApplicationOwner_();
  const result=discordApplicationClaim_(()=>{const s=discordApplicationSettings_(),q=discordApplicationQueue_();if(!s.enabled)throw Error('Enable application messages before retrying.');if(!q.batch)throw Error('There is no outstanding message to retry.');
    const receipt=discordGithubRead_('discord/applications/state/'+q.batch.id+'.json')?.value;
    if(receipt?.phase==='sent'){discordApplicationReconcile_(q);return discordApplicationStatus_();}
    if(receipt?.delivery==='pending'||receipt?.phase==='attention')throw Error('Delivery is uncertain. Check the Discord channel before any further send; automatic retry is blocked.');
    if(receipt){if(!['cancelled','rejected'].includes(receipt.phase)||receipt.delivery!=='not_sent'&&receipt.phase!=='cancelled')throw Error('The runner is still checking this message. Refresh status first.');q.pending=q.batch.keys.concat(q.pending);q.batch=null;q.issue='';discordApplicationStore_(q);const recipient=discordApplicationRecipient_(),remote=discordGithubRead_(F1XL_APPLICATION_ALERTS.remote);discordGithubWrite_(F1XL_APPLICATION_ALERTS.remote,discordApplicationRemote_(s,recipient),remote?.sha);discordApplicationDispatch_(q,s,recipient);}
    else{const job=q.batch.job;if(!job||Date.parse(job.expires)<=Date.now())throw Error('This message window has expired. Review the retained batch before restarting.');const remote=discordGithubRead_('discord/applications/jobs/'+q.batch.id+'.json');if(remote&&JSON.stringify(remote.value)!==JSON.stringify(job))throw Error('The queued message changed. Review before retrying.');if(!remote)discordGithubWrite_('discord/applications/jobs/'+q.batch.id+'.json',job);const r=discordGithubRequest_('POST','/actions/workflows/'+F1XL_APPLICATION_ALERTS.workflow+'/dispatches',{ref:'main',inputs:{job:q.batch.id}});if(r.missing||r.conflict)throw Error('GitHub has not accepted the retry.');q.issue='';discordApplicationStore_(q);}
    return discordApplicationStatus_();
  });if(result?.busy)throw Error('A message check is finishing. Wait a moment and refresh.');return result;
}
