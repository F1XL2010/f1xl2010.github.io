/** TEST ticket form: fixed destination, queued roster-only updates. */
const F1XL_TICKET_FORM=Object.freeze({id:'19u_5yp4jDLlOPXSUwxCMwhQxWtR8msbE4LSjL9JKEJo',sheetId:483613087,key:'F1XL_TICKET_FORM_V1'});
function ticketFormState_(){return JSON.parse(PropertiesService.getScriptProperties().getProperty(F1XL_TICKET_FORM.key)||'{}');}
function ticketFormStore_(s){PropertiesService.getScriptProperties().setProperty(F1XL_TICKET_FORM.key,JSON.stringify(s));}
function ticketFormStatus_(season){const s=ticketFormState_();return {connected:!!s.season,season:s.season||'',matches:String(season)===s.season,pending:!!s.pending,updatedAt:s.updatedAt||'',count:s.count||0,error:s.error||''};}
function ticketFormQueue_(season,activate){
  // Called after coherent saves: no Form or spreadsheet reads on this path.
  try{const s=ticketFormState_();if(!s.season||!activate&&s.season!==String(season))return;
    s.season=String(season);s.pending=true;s.error='';s.requestedAt=new Date().toISOString();ticketFormStore_(s);
    if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='ticketPublicationWorker_'))ScriptApp.newTrigger('ticketPublicationWorker_').timeBased().everyMinutes(5).create();
  }catch(error){try{const s=ticketFormState_();if(s.season){s.pending=true;s.error='Automatic refresh needs attention. Use Update form driver list.';ticketFormStore_(s);}}catch(ignore){}console.warn('Ticket form update could not be queued. Use Update form driver list in Ticket season connections.');}
}
function ticketFormQueueWrites_(writes){
  try{const seasons=new Set();writes.forEach(w=>{if(!w.range.getSheet||w.range.getColumn&&w.range.getColumn()>2)return;const sheet=w.range.getSheet();if(sheet.getName()!=='Season Entrants')return;
    const book=sheet.getParent();if(!/^TEST\b/i.test(fapWorkbookLegacyName_(book.getName())))return;const start=book.getSheetByName('Start Here');if(start)seasons.add(start.getRange('B3').getDisplayValue());});seasons.forEach(s=>ticketFormQueue_(s,false));
  }catch(error){console.warn('Saved successfully; ticket form roster refresh needs checking.');}
}
function ticketFormRoster_(book){
  const sheet=book.getSheetByName('Season Entrants');if(!sheet)throw Error('Season Entrants is missing.');
  const rows=sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),2).getDisplayValues();
  if(rows[0][0]!=='Driver ID'||rows[0][1]!=='Driver')throw Error('Check the Season Entrants headings before updating the form.');
  const ids=new Set(),names=new Set(),list=[];
  rows.slice(1).forEach(r=>{const id=String(r[0]||'').trim(),name=String(r[1]||'').trim();if(!id&&!name)return;
    if(!id||!name||ids.has(id)||names.has(name.toLowerCase())||['admins','codemasters','codies'].includes(name.toLowerCase())||/[\r\n]/.test(name))throw Error('Resolve missing or duplicate Season Entrants identities before updating the form.');
    ids.add(id);names.add(name.toLowerCase());list.push(name);});
  if(!list.length)throw Error('There are no season entrants to put on the form yet.');
  return list.sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base'}));
}
function ticketFormItems_(form){
  const items=form.getItems(),find=title=>{const matches=items.filter(i=>i.getTitle().trim()===title);if(matches.length!==1)throw Error('Check the ticket form question: '+title);return matches[0];};
  const from=find('Who is the ticket from?').asListItem(),against=find('Who is the ticket against?').asListItem(),division=find('What Division?').asMultipleChoiceItem(),session=find('Which session did this happen in?').asMultipleChoiceItem();
  if(!session.isRequired()||JSON.stringify(session.getChoices().map(c=>c.getValue()))!==JSON.stringify(['Qualifying','Sprint qualifying','Sprint race','Feature race']))throw Error('Restore the required four incident sessions on the TEST ticket form.');
  return {from,against,division};
}
function ticketFormSync_(state,book,form){
  const names=ticketFormRoster_(book),items=ticketFormItems_(form),start=book.getSheetByName('Start Here'),divisions=Number(start.getRange('B5').getDisplayValue());
  if(!Number.isInteger(divisions)||divisions<1||divisions>8)throw Error('Check the season division count before updating the form.');
  const changes=[[items.from,['Admins'].concat(names)],[items.against,['Codemasters'].concat(names)],[items.division,Array.from({length:divisions},(_,i)=>String(i+1))]];
  changes.forEach(([item,values])=>{if(JSON.stringify(item.getChoices().map(c=>c.getValue()))!==JSON.stringify(values))item.setChoiceValues(values);});
  changes.forEach(([item,values])=>{if(JSON.stringify(item.getChoices().map(c=>c.getValue()))!==JSON.stringify(values))throw Error('Form update is not confirmed. Retry the roster refresh.');});
  if(JSON.stringify(names)!==JSON.stringify(ticketFormRoster_(book)))throw Error('Season Entrants changed during the form update. The queued refresh will retry.');
  const title=(F1XL_TICKET_SUBMISSION_SOURCE.profile==='combined'?'':'TEST · ')+'S'+state.season+' Tickets, Defences & Appeals';if(form.getTitle()!==title)form.setTitle(title);
  return Object.assign({},state,{pending:false,error:'',updatedAt:new Date().toISOString(),count:names.length});
}
function ticketFormRunPending_(force){
  const state=ticketFormState_();if(!state.season||!state.pending&&!force)return;
  try{
    const book=seasonPlanningBook_(state.season);if(F1XL_TICKET_SUBMISSION_SOURCE.profile!=='combined'&&!/^TEST\b/i.test(fapWorkbookLegacyName_(book.getName())))throw Error('Ticket form updates are restricted to TEST Masters.');
    const form=FormApp.openById(F1XL_TICKET_FORM.id);
    if((F1XL_TICKET_SUBMISSION_SOURCE.profile!=='combined'&&!/^TEST\b/i.test(form.getTitle()))||form.getDestinationId()!==F1XL_TICKET_SUBMISSION_SOURCE.spreadsheetId)throw Error('Check the ticket form and its configured response destination.');
    if(F1XL_TICKET_SUBMISSION_SOURCE.profile==='combined'&&!F1XL_TICKET_SUBMISSION_SOURCE.enhancedSheetId)throw Error('Connect the improved ticket Form response tab before refreshing its drivers.');
    const saved=ticketFormSync_(state,book,form);ticketFormStore_(saved);
  }catch(error){state.pending=true;state.error=String(error.message||error);ticketFormStore_(state);}
}
function updateTicketFormDrivers(input){fapAssertEntry_('updateTicketFormDrivers');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const season=String(input&&input.season||''),state=ticketFormState_();
    if(state.season&&state.season!==season)throw Error('The ticket form belongs to S'+state.season+'. It switches when the next season is launched.');
    const book=seasonPlanningBook_(season);if(F1XL_TICKET_SUBMISSION_SOURCE.profile!=='combined'&&!/^TEST\b/i.test(fapWorkbookLegacyName_(book.getName())))throw Error('Choose a TEST season.');
    ticketFormStore_(Object.assign({},state,{season,pending:true}));ticketFormQueue_(season,false);ticketFormRunPending_(true);
    const result=getTicketSeasonSetup({season});result.form=ticketFormStatus_(season);return result;
  }finally{lock.releaseLock();}
}
