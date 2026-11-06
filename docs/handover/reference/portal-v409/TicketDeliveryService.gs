/** Completed TEST tickets -> existing Website Export and reviewed licence transfers.
 * Workbook sharing is managed separately. The ledger is permanent and
 * readable in Sheets; its pending journal makes interrupted writes repeat-safe.
 */
const F1XL_TICKET_DELIVERY = Object.freeze({ledger:'Ticket Penalty Transfers',headers:['Season','Race','Case ID','Ticket','Applied decision','Applied penalties JSON','Results checked decision','Pending writes JSON','Updated','Last transfer preview JSON'],feedPrefix:'F1XL_TICKET_PUBLIC_V1_'});
function ticketDeliveryRows_(book) {
  const s=book.getSheetByName(F1XL_TICKET_DELIVERY.ledger);
  if(!s)return [];
  const rows=s.getRange(1,1,Math.max(1,s.getLastRow()),10).getDisplayValues();
  if(JSON.stringify(rows[0])!==JSON.stringify(F1XL_TICKET_DELIVERY.headers))throw new Error('Ticket Penalty Transfers headers changed. Restore them before transferring penalties.');
  return rows.slice(1);
}
function ticketDeliveryNumber_(value,label) {
  const s=String(value==null?'':value).trim();
  if(!s||/^(none|n\/?a|—|-)$/i.test(s))return 0;
  if(!/^\d+(?:\.\d+)?(?:\s*(?:s|sec|secs|seconds?))?$/i.test(s))throw new Error('Check '+label+': “'+s+'” is not a non-negative number.');
  return Number(s.match(/^\d+(?:\.\d+)?/)[0]);
}
function ticketDeliverySession_(value) {
  const key=String(value||'').toLowerCase().replace(/[^a-z]/g,'');
  const names={race:'race',featurerace:'race',qualifying:'qualifying',quali:'qualifying',sprint:'sprintRace',sprintrace:'sprintRace',sprintqualifying:'sprintQualifying',sprintquali:'sprintQualifying'};
  if(!names[key])throw new Error('Set the ticket session (Race, Qualifying, Sprint or Sprint qualifying) before applying penalties.');
  return names[key];
}
// A negative adjustment removes an in-game penalty from the result. It is
// recorded on the ticket, never subtracted from added licence penalties.
function ticketTimeAdjustment_(value,label) {
  const text=String(value==null?'':value).trim();
  return text.startsWith('-')?-ticketDeliveryNumber_(text.slice(1),label):ticketDeliveryNumber_(text.replace(/^\+/,''),label);
}
function ticketDeliveryIdentities_(context){
  if(!context.ticketIdentities){const sheet=context.spreadsheet.getSheetByName('Season Entrants');context.ticketIdentities=sheet.getRange(2,1,Math.max(1,sheet.getLastRow()-1),2).getDisplayValues();}return context.ticketIdentities;
}
function ticketDeliveryContributions_(ticket,source,round,context) {
  const division=Number(ticket.division),session=ticketDeliverySession_(source.session),sessions=context.setup.licenceSessions[round.round]||[];
  if(!sessions.some(s=>s.id===session))throw new Error('The ticket session is not part of this round’s format. Correct the session first.');
  const people={},key=name=>String(name||'').trim().toLowerCase();
  function person(name){const k=key(name);if(!k)throw new Error('A penalty is missing its driver.');return people[k]||(people[k]={driver:String(name).trim(),points:0,seconds:0,ban:'',resultAction:false,division:division,session:session,round:round.round});}
  const points=ticketDeliveryNumber_(ticket.outcome[1],'licence points'),label=String(ticket.outcome[2]||'');
  if(points||/ban|disqual|\bdsq\b/i.test(label)){
    const p=person(ticket.outcome[0]);p.points=points;p.ban=/ban/i.test(label)?label:'';p.resultAction=/disqual|\bdsq\b/i.test(label);
  }
  function setTime(p,adjustment){if(adjustment<0){p.removedSeconds=-adjustment;p.resultAction=true;}else p.seconds=adjustment;}
  [[ticket.submitter,6],[ticket.offender,9]].forEach(pair=>{const seconds=ticketTimeAdjustment_(ticket.outcome[pair[1]],'time adjustment for '+pair[0]);if(seconds)setTime(person(pair[0]),seconds);});
  (ticket.additionalPenalties||[]).forEach(extra=>{
    if(key(extra.driver)===key(ticket.outcome[0]))throw new Error('The main punished driver is also in the additional penalties. Correct the duplicate.');
    const p=person(extra.driver);p.points=ticketDeliveryNumber_(extra.points,'additional points');
    const seconds=ticketTimeAdjustment_(extra.timePenalty,'additional time adjustment');
    const current=p.removedSeconds?-p.removedSeconds:p.seconds;
    if(current&&current!==seconds)throw new Error('Two different time adjustments are recorded for '+p.driver+'. Correct the published outcome.');
    setTime(p,seconds);p.ban=/ban/i.test(extra.penalty)?extra.penalty:'';p.resultAction=p.resultAction||/disqual|\bdsq\b/i.test(extra.penalty);
  });
  const identities=ticketDeliveryIdentities_(context);
  return Object.keys(people).map(k=>people[k]).filter(p=>p.points||p.seconds||p.ban||p.resultAction).map(p=>{
    const match=identities.filter(r=>key(r[1])===key(p.driver)&&r[0]);
    if(match.length!==1){const error=new Error('Choose the season driver for '+p.driver+' below.');error.driver=p.driver;throw error;}
    p.driverId=match[0][0];p.driver=match[0][1];return p;
  }).sort((a,b)=>a.driverId.localeCompare(b.driverId));
}
function ticketDeliveryKey_(p){return [p.driverId,p.division,p.round,p.session].join('|');}
// Private, execution-local read reuse. Never cache write validation across requests.
// Licence input cells and the recovery journal still get fresh reads before writes.
function ticketDeliveryReads_(ticket,licence){return {ticket:ticket,licence:licence,boards:{},sources:{}};}
function ticketDeliveryLedger_(reads){return reads.ledger||(reads.ledger=ticketDeliveryRows_(reads.ticket.spreadsheet));}
function ticketDeliveryPublished_(reads){return reads.published||(reads.published=buildWebsiteTicketExport_(reads.ticket).tickets);}
function ticketDeliveryDivision_(context,division,reads){
  if(!reads)return buildLicenceDivision_(findLicenceDivisionSheet_(context,division),division,context);
  if(!reads.licenceNames)reads.licenceNames=ticketDeliveryPhase_('ticket.licence.identities',()=>context.spreadsheet.getSheetByName('Season Entrants').getRange(2,1,500,2).getDisplayValues());
  return reads.boards[division]||(reads.boards[division]=buildLicenceDivision_(findLicenceDivisionSheet_(context,division),division,context,reads.licenceNames));
}
function ticketDeliveryPhase_(name,work){return typeof fapPerformancePhase_==='function'?fapPerformancePhase_(name,work):work();}
function ticketDeliveryMeasure_(name,work){return typeof fapPerformanceMeasure_==='function'?fapPerformanceMeasure_(name,work):work();}
function ticketDeliveryBanSnapshot_(context){
  const sheet=context.bansSheet,lastRow=sheet.getLastRow();
  return {lastRow:lastRow,rows:lastRow>1?sheet.getRange(2,1,lastRow-1,7).getDisplayValues():[]};
}
/** Only a read-only board shares these snapshots. Commit/recovery plans still
 * read each physical destination immediately before the journal is written. */
function ticketDeliveryPreviewCells_(sheet,board,session,snapshots){
  const key=board.division+':'+session.pointsColumn;
  if(!snapshots.cells[key])snapshots.cells[key]=ticketDeliveryPhase_('ticket.preview.cells',()=>{
    const first=board.rows[0].sheetRow,last=board.rows[board.rows.length-1].sheetRow;
    const range=sheet.getRange(first,session.pointsColumn,last-first+1,2);
    return {first:first,values:range.getValues(),formulas:range.getFormulas()};
  });
  return snapshots.cells[key];
}
function ticketDeliveryPlan_(context,caseId,desired,previous,reads,snapshots) {
  const keys=Array.from(new Set(desired.concat(previous).map(ticketDeliveryKey_))),writes=[],preview=[];
  const entrants=ticketDeliveryIdentities_(context);
  const bans=snapshots?(snapshots.bans||(snapshots.bans=ticketDeliveryPhase_('ticket.preview.bans',()=>ticketDeliveryBanSnapshot_(context)))):ticketDeliveryBanSnapshot_(context);
  const banSheet=context.bansSheet,banRows=bans.rows;
  let nextBanRow=Math.max(2,bans.lastRow+1);
  keys.forEach(key=>{
    const old=previous.find(p=>ticketDeliveryKey_(p)===key),next=desired.find(p=>ticketDeliveryKey_(p)===key),p=next||old;
    const identity=entrants.filter(r=>r[0]===p.driverId);if(identity.length!==1)throw new Error('The permanent identity for '+p.driver+' changed. Check Season Entrants.');
    const sheet=findLicenceDivisionSheet_(context,p.division),board=ticketDeliveryDivision_(context,p.division,reads);
    if(!board.ready)throw new Error('Connect Division '+p.division+' licences in the active-season hub first.');
    const match=board.rows.filter(r=>r.driver.toLowerCase()===identity[0][1].toLowerCase());
    if(match.length!==1)throw new Error(identity[0][1]+' must have one licence row in Division '+p.division+'.');
    const session=(context.setup.licenceSessions[p.round]||[]).find(s=>s.id===p.session);
    if(!session)throw new Error('The calendar changed since this penalty was applied. Review the original session before transferring.');
    let before,formulas;
    if(snapshots){const cells=ticketDeliveryPreviewCells_(sheet,board,session,snapshots),index=match[0].sheetRow-cells.first;before=cells.values[index];formulas=cells.formulas[index];}
    else{const range=sheet.getRange(match[0].sheetRow,session.pointsColumn,1,2);before=range.getValues()[0];formulas=range.getFormulas()[0];}
    if(formulas.some(Boolean))throw new Error('A licence input cell contains a formula. Check '+p.driver+' before transferring.');
    const deltas=[(next?.points||0)-(old?.points||0),(next?.seconds||0)-(old?.seconds||0)];
    const after=before.map((v,i)=>{if(!Number.isFinite(Number(v)))throw new Error('A licence input is not numeric for '+p.driver+'.');const n=Math.round((Number(v)+deltas[i])*1000000)/1000000;if(deltas[i]<0&&n<0)throw new Error('The previously applied penalty for '+p.driver+' is no longer in the licence. Check the manual changes before reversing it.');return deltas[i]?n:v;});
    if(deltas.some(Boolean))writes.push({sheet:sheet.getName(),row:match[0].sheetRow,column:session.pointsColumn,before:[before],after:[after],driver:identity[0][1]});
    const marker='[Ticket '+caseId+' / '+p.driverId+']',banMatches=banRows.map((r,i)=>({values:r,row:i+2})).filter(x=>String(x.values[6]).includes(marker));
    if(banMatches.length>1)throw new Error('Duplicate linked bans for '+p.driver+'. Review Outstanding Bans.');
    const existing=banMatches[0],oldBan=old?.ban||'',newBan=next?.ban||'';
    if(oldBan!==newBan){
      if(oldBan&&!existing)throw new Error('The previously applied ban for '+p.driver+' was removed manually. Review Outstanding Bans before applying the appeal.');
      if(existing&&String(existing.values[4]).toLowerCase()==='yes')throw new Error(p.driver+' has already served this ban. Resolve that ban manually before changing this decision.');
      if(existing&&existing.values[2]!==oldBan)throw new Error('The linked ban for '+p.driver+' was edited manually. Review it first.');
      const row=existing?existing.row:nextBanRow++,empty=Array(7).fill('');
      const afterBan=newBan?[String(p.division),identity[0][1],newBan,existing?existing.values[3]:'','No','R'+p.round,marker]:empty;
      writes.push({sheet:banSheet.getName(),row:row,column:1,before:[existing?existing.values:empty],after:[afterBan]});
    }
    const entry={driver:identity[0][1],division:p.division,session:session.label,points:next?.points||0,seconds:next?.seconds||0,ban:newBan,pointsDelta:deltas[0],secondsDelta:deltas[1],currentPoints:before[0],currentSeconds:before[1],newPoints:after[0],newSeconds:after[1]};
    if(next?.removedSeconds||old?.removedSeconds){entry.removedSeconds=next?.removedSeconds||0;entry.previousRemovedSeconds=old?.removedSeconds||0;}
    preview.push(entry);
  });
  return {writes:writes,preview:preview};
}
function ticketDeliveryContext_(race) {
  const ticket=openTicketProcessingContext_(),round=ticketRoundForSheet_(ticket.spreadsheet,String(race||''));
  if(!round)throw new Error('Choose a registered season round first.');
  const licence=openLicenceContext_(round.season);
  divisionTemplateAssertTestWorkbook_(licence.spreadsheet);
  return {ticket:ticket,round:round,licence:licence};
}
function ticketDeliveryBoard_(c,reads,skipThresholds) {
  reads=reads||ticketDeliveryReads_(c.ticket,c.licence);
  const ledger=ticketDeliveryPhase_('ticket.board.ledger',()=>ticketDeliveryLedger_(reads)),source=ticketDeliveryPhase_('ticket.board.source',()=>reads.sources[c.round.sheetName]||(reads.sources[c.round.sheetName]=buildTicketRaceWorkspace_(findTicketRaceSheet_(c.ticket,c.round.sheetName),true)));
  const published=ticketDeliveryPhase_('ticket.board.export',()=>ticketDeliveryPublished_(reads).filter(t=>t.race===c.round.sheetName));
  const snapshots={cells:{}};
  const cases=ticketDeliveryPhase_('ticket.board.cases',()=>published.map(t=>{
    const row={caseId:t.caseId,ticketNumber:t.ticketNumber,division:Number(t.division),submitter:t.submitter,offender:t.offender,description:t.description,label:t.outcome[2],issue:'',preview:[],applied:false,resultsNeeded:false,resultsChecked:false};
    try{
      if(!t.caseId||published.filter(p=>p.caseId===t.caseId).length!==1)throw new Error('Missing or duplicate permanent case ID. Review the published record.');
      const matches=source.tickets.filter(s=>s.caseId===t.caseId);if(matches.length!==1)throw new Error('Original ticket cannot be matched uniquely.');
      const saved=ledger.filter(r=>r[0]===c.round.season&&r[1]===c.round.sheetName&&r[2]===t.caseId);if(saved.length>1)throw new Error('Duplicate penalty ledger records.');
      const old=saved[0]||[],previous=old[5]?JSON.parse(old[5]):[],desired=ticketDeliveryContributions_(t,matches[0],c.round,c.licence);
      const decision=licenceRevision_(desired),plan=old[7]?{preview:[],writes:[]}:ticketDeliveryPlan_(c.licence,t.caseId,desired,previous,reads,snapshots);
      row.desired=desired;row.decision=decision;row.preview=plan.preview;row.applied=old[4]===decision&&!old[7];row.pending=!!old[7];
      row.amendmentPending=!!old[4]&&!row.applied;
      row.resultsNeeded=old[6]==='Review required'||desired.concat(previous).some(p=>p.seconds||p.resultAction);row.resultsChecked=old[6]===decision&&row.applied;row.lastTransfer=old[9]?JSON.parse(old[9]):[];
      row.revision=licenceRevision_([t.revision,matches[0].recordRevision,desired,old,plan]);
      if(row.pending)row.issue='An interrupted transfer is retained. Select this ticket and apply to finish it safely, then refresh.';
    }catch(e){row.issue=e.message;row.unmatchedDriver=e.driver||'';}
    return row;
  }));
  const thresholds=skipThresholds?{cases:{},warning:''}:Object.assign({},ticketDeliveryPhase_('ticket.thresholds',()=>ticketThresholdIndicators_(c.ticket,c.licence,false,reads)));
  const banRows=ticketDeliveryPhase_('ticket.board.bans',()=>{
    const bans=snapshots.bans||ticketDeliveryBanSnapshot_(c.licence);
    return bans.rows.filter(row=>row.some(value=>String(value).trim()!==''));
  });
  cases.forEach(t=>{t.accumulated=(thresholds.cases[t.caseId]||[]).map(f=>Object.assign({},f,{recorded:ticketThresholdBanMatch_(banRows,f)}));});
  if(!thresholds.warning){
    const flags=Object.keys(thresholds.cases).flatMap(id=>thresholds.cases[id]);
    const review=banRows.filter(r=>{
      const match=String(r[6]).match(/^Accumulation of (\d+) points · R(\d+) ticket #\d+$/);
      return match&&Number(match[2])===c.round.round&&!flags.some(f=>f.driver.toLowerCase()===String(r[1]).toLowerCase()&&f.threshold===Number(match[1]));
    });
    if(review.length)thresholds.warning='Recorded bans need review after a points or decision change: '+review.map(r=>r[1]+' — '+r[6]).join('; ')+'. Check Outstanding bans in Licences; no ban has been removed automatically.';
  }
  const feed=ticketPublicState_(c.round.season),pending=ledger.filter(r=>r[0]===c.round.season&&r[7]);
  return {season:c.round.season,round:c.round.round,raceName:c.round.sheetName,cases:cases,thresholdWarning:thresholds.warning,website:F1XL_TEST_LAUNCH.website+'ticket-outcomes.html',feed:feed,message:pending.length?'Finish the interrupted transfer for '+pending[0][1]+' · ticket #'+pending[0][3]+' before applying other tickets.':''};
}
function getTicketPenaltyTransfers(input){ fapAssertEntry_('getTicketPenaltyTransfers');return ticketDeliveryMeasure_('tickets.penalties.load',()=>{
  const c=ticketDeliveryPhase_('ticket.context',()=>ticketDeliveryContext_(input.raceName));
  return ticketDeliveryPhase_('ticket.board',()=>ticketDeliveryBoard_(c));
});}
/** Human-readable reason is also the repeat guard, including bans already served.
 * Recognises the existing manually entered 'Accumulation of 9 points' convention. */
function ticketThresholdBanMatch_(rows,flag){
  const pattern=new RegExp('\\bAccumulation of '+Number(flag.threshold)+' points\\b','i');
  const matches=rows.filter(r=>String(r[1]).trim().toLowerCase()===String(flag.driver).trim().toLowerCase()&&pattern.test(String(r[6])));
  if(!matches.length)return null;
  const reviews=matches.filter(r=>/^admin review$/i.test(r[2]));
  const bans=matches.filter(r=>!/^admin review$/i.test(r[2]));
  const keys=bans.map(r=>[r[2].toLowerCase(),r[3].toLowerCase(),r[5]].join('|'));
  if(reviews.length>1||new Set(keys).size!==bans.length||bans.length>1&&(new Set(bans.map(r=>r[2].toLowerCase()+'|'+r[5])).size!==1||bans.some(r=>!r[3])))return {conflict:true,label:'Multiple recorded bans — review in Licences'};
  if(reviews.length===1){const r=reviews[0];return {label:/^yes$/i.test(r[4])?'Admin review completed':'Admin review pending',ban:r[2],race:r[3],served:r[4]};}
  if(matches.length>1){
    return {label:matches.every(r=>/^yes$/i.test(r[4]))?'Ban served':'Ban recorded',ban:matches[0][2],race:matches.map(r=>r[3]).join(', '),served:matches.every(r=>/^yes$/i.test(r[4]))?'Yes':'No'};
  }
  const r=matches[0];return {label:/^yes$/i.test(r[4])?'Ban served':'Ban recorded',ban:r[2],race:r[3],served:r[4]};
}
function ticketThresholdBanContext_(input){
  const c=ticketDeliveryContext_(input.raceName),board=ticketDeliveryBoard_(c),t=board.cases.find(t=>t.caseId===input.caseId);
  if(board.thresholdWarning)throw new Error(board.thresholdWarning);
  if(!t||t.issue||!t.applied)throw new Error('Apply the current ticket penalties, then refresh before recording its accumulated ban.');
  const flag=t.accumulated.find(f=>f.driver===input.driver&&f.threshold===Number(input.threshold));
  if(!flag)throw new Error('This threshold warning changed. Refresh and review the current decision.');
  const rows=buildLicenceBans_(c.licence.bansSheet,c.round.season);
  return {c:c,board:board,t:t,flag:flag,revision:licenceRevision_([t.revision,flag,rows.revision])};
}
function getTicketThresholdBan(input){ fapAssertEntry_('getTicketThresholdBan');
  const x=ticketThresholdBanContext_(input);
  return {raceName:x.c.round.sheetName,caseId:x.t.caseId,driver:x.flag.driver,threshold:x.flag.threshold,action:x.flag.action,discretion:x.flag.discretion,division:x.t.division,season:x.c.round.season,incurred:'R'+x.c.round.round,reason:'Accumulation of '+x.flag.threshold+' points · R'+x.c.round.round+' ticket #'+x.t.ticketNumber,recorded:x.flag.recorded,revision:x.revision};
}
function recordTicketThresholdBan(input){ fapAssertEntry_('recordTicketThresholdBan');return withTicketProcessingLock_(function(){
  const x=ticketThresholdBanContext_(input);
  if(x.flag.recorded?.conflict)throw new Error(x.flag.recorded.label);
  if(!x.flag.recorded){
    if(input.revision!==x.revision)throw new Error('The ticket or bans list changed. Reopen Record ban and review it again.');
    if(x.flag.discretion&&input.adminConfirmed!==true)throw new Error('Confirm the admin decision before recording a season ban.');
    const race=String(input.raceToServe||'').trim();
    if(race.length>100)throw new Error('Keep the race-to-serve description under 100 characters.');
    const reason='Accumulation of '+x.flag.threshold+' points · R'+x.c.round.round+' ticket #'+x.t.ticketNumber;
    const rows=normaliseLicenceBans_([[String(x.t.division),x.flag.driver,x.flag.action,race,'No','R'+x.c.round.round,reason]]);
    const sheet=x.c.licence.bansSheet,row=Math.max(2,sheet.getLastRow()+1);
    if(buildLicenceBans_(sheet,x.c.round.season).rows.length>=200)throw new Error('Review the Outstanding Bans list before adding more than 200 entries.');
    if(row>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),row-sheet.getMaxRows());
    intakeCommit_([{range:sheet.getRange(row,1,1,7),values:rows,text:true}]);
  }
  const result=ticketDeliveryBoard_(x.c);
  result.message=x.flag.recorded?'Ban already recorded; no duplicate added.':'Ban recorded in Outstanding Bans. Manage its race and Served status in Licences.';
  try{ticketPublicLicences_(x.c.licence);result.message+=' Test licence page updated.';}
  catch(e){result.message+=' Ban is saved; licence update pending: '+e.message+'. Use Update website to retry.';}
  return result;
});}
/** IMPORTRANGE can lag behind the Master. Do not show stale imported penalties
 * as ready for result adjustments; a fresh request is safe once Sheets catches up. */
function getTicketResultsRound(input){ fapAssertEntry_('getTicketResultsRound');
  const context=openLicenceContext_(String(input.season)),division=Number(input.division),board=buildLicenceDivision_(findLicenceDivisionSheet_(context,division),division,context);
  if(!board.ready)throw new Error('Connect this division’s licences first.');
  const response=getResultsEntryRound(input,true),round=Number(String(input.sheetName).replace(/^R/,''));
  response.sessions.forEach(session=>{
    const spec=(context.setup.licenceSessions[round]||[]).find(s=>s.id===session.id);if(!spec)return;
    const index=board.sessions.findIndex(s=>s.pointsColumn===spec.pointsColumn);
    session.rows.filter(row=>row.driver).forEach(row=>{
      const match=board.rows.find(r=>r.driver.toLowerCase()===row.driver.toLowerCase()),expected=match?match.sessions[index]:['',''];
      if(Number(licenceCellNumber_(row.licencePoints,'imported points',row.driver))!==Number(expected[0]||0)||Number(licenceCellNumber_(row.licencePenalty,'imported seconds',row.driver))!==Number(expected[1]||0))throw new Error('Division '+division+' is still waiting for its licence import for '+row.driver+'. Allow the sheet to recalculate, then open results again.');
    });
  });return response;
}
function getTicketDivisionResults(input){ fapAssertEntry_('getTicketDivisionResults');
  const c=ticketDeliveryContext_(input.raceName),division=normaliseLicenceDivision_(input.division),board=ticketDeliveryBoard_(c);
  const items=board.cases.filter(t=>t.division===division&&t.applied&&t.resultsNeeded&&!t.resultsChecked&&!t.issue);
  if(!items.length)throw new Error('No applied result adjustments are outstanding for this division. Refresh the penalty list.');
  const data=getTicketResultsRound({season:c.round.season,division:division,sheetName:'R'+c.round.round});
  data.ticketCompletion={raceName:c.round.sheetName,division:division,tickets:items.map(t=>({caseId:t.caseId,decision:t.decision,revision:t.revision})),items:items.map(t=>({ticketNumber:t.ticketNumber,label:t.label,penalties:t.lastTransfer||t.preview}))};
  data.ticketCompletion.unapplied=board.cases.filter(t=>t.division===division&&!t.applied).map(t=>t.ticketNumber);
  return data;
}
function confirmTicketDivisionResults(input){ fapAssertEntry_('confirmTicketDivisionResults');
  return withTicketProcessingLock_(function(){
    const c=ticketDeliveryContext_(input.raceName),division=normaliseLicenceDivision_(input.division),board=ticketDeliveryBoard_(c),chosen=input.tickets;
    if(!Array.isArray(chosen)||!chosen.length||chosen.length>50||new Set(chosen.map(t=>t.caseId)).size!==chosen.length)throw new Error('Reopen this division’s result adjustments before completing them.');
    if(resultsEntryPending_({season:c.round.season,division:division}).length)throw new Error('Finish the results’ website update before completing these tickets.');
    const result=getResultsEntryRound({season:c.round.season,division:division,sheetName:'R'+c.round.round},true);
    if(result.revision!==input.resultsRevision||result.readOnly)throw new Error('The results changed or are read-only. Reopen and check them before completing these tickets.');
    chosen.forEach(t=>{const current=board.cases.find(x=>x.caseId===t.caseId);if(!current||current.division!==division||current.decision!==t.decision||!current.applied||current.issue||(!current.resultsChecked&&current.revision!==t.revision))throw new Error('A selected ticket changed. Results have been saved; reopen this division to review the current adjustments.');});
    const sheet=c.ticket.spreadsheet.getSheetByName(F1XL_TICKET_DELIVERY.ledger),rows=ticketDeliveryRows_(c.ticket.spreadsheet);
    const values=rows.map(r=>[r[0]===c.round.season&&r[1]===c.round.sheetName&&chosen.some(t=>t.caseId===r[2])?r[4]:r[6]]);
    // One write marks only the cases reviewed in the opened window, never new arrivals.
    sheet.getRange(2,7,values.length,1).setValues(values);
    const response=ticketDeliveryBoard_(c);response.message=chosen.length+' ticket adjustment'+(chosen.length===1?'':'s')+' completed for Division '+division+'.';return response;
  });
}

/** Read the existing guide, including both the original four-column layout and
 * the side-by-side prototype. Offence-point rows are not accumulated thresholds. */
function ticketThresholdRules_(sheet){
  const rows=sheet.getRange(1,1,Math.min(100,sheet.getLastRow()),Math.min(8,sheet.getMaxColumns())).getDisplayValues(),rules=[];
  rows.forEach(row=>{
    const text=row.join(' '),action=/qual(?:i|ifying)?\s*ban/i.test(text)?'Qualifying ban':/season\s*ban/i.test(text)?'Season ban':/race\s*ban/i.test(text)?'Race ban':'';
    if(!action)return;
    // Known guide thresholds start above ordinary offence points (1.5–4.5).
    const numbers=row.map(v=>String(v).trim().match(/^(\d+(?:\.\d+)?)\s*(?:points?|pts)?$/i)).filter(Boolean).map(m=>Number(m[1])).filter(n=>n>=9);
    if(numbers.length===1)rules.push({points:numbers[0],action:action,discretion:action==='Season ban'||/discretion/i.test(text)});
    else if(!numbers.length){const inline=text.match(/(?:at\s+|^|\s)(\d+(?:\.\d+)?)\s*(?:points?|pts)\b/i);if(inline&&Number(inline[1])>=9)rules.push({points:Number(inline[1]),action:action,discretion:action==='Season ban'||/discretion/i.test(text)});}
  });
  const unique=[];rules.forEach(r=>{const old=unique.find(x=>x.points===r.points);if(old&&old.action!==r.action)throw new Error('The penalty guide has conflicting accumulated thresholds.');if(!old)unique.push(r);});
  if(!unique.length)throw new Error('The penalty guide’s accumulated thresholds could not be read. Check Penalty Guide in the Master.');
  return unique.sort((a,b)=>a.points-b.points);
}
function ticketThresholdIndicators_(ticket,licence,persist,reads){
  reads=reads||ticketDeliveryReads_(ticket,licence);
  if(reads.thresholds){if(persist)ticketThresholdPersist_(reads);return reads.thresholds;}
  const output={cases:{},warning:''};
  try{
    const rules=ticketDeliveryPhase_('ticket.threshold.rules',()=>ticketThresholdRules_(licence.penaltyGuideSheet)),ledger=ticketDeliveryLedger_(reads).filter(r=>r[0]===licence.season);
    if(ledger.some(r=>r[7]))throw new Error('Finish the interrupted penalty transfer before checking accumulated penalties.');
    const ids=ticketDeliveryIdentities_(licence),idsByName=new Map(),idsById=new Map();
    ids.forEach(r=>{if(!idsById.has(r[0]))idsById.set(r[0],r);if(r[0]){const key=r[1].toLowerCase();if(!idsByName.has(key))idsByName.set(key,[]);idsByName.get(key).push(r);}});
    const totals={},byRound={};
    // Read all divisions so a division move does not discard the earlier points.
    ticketDeliveryPhase_('ticket.threshold.licences',()=>licence.divisionSheets.forEach(d=>{const board=ticketDeliveryDivision_(licence,d.division,reads);if(!board.ready)throw new Error('Connect every division’s licences before checking accumulated penalties.');board.rows.filter(r=>r.driver).forEach(row=>{
      const identity=idsByName.get(row.driver.toLowerCase())||[];if(identity.length!==1)throw new Error('Match each licence driver to one permanent record before checking accumulated penalties.');
      const id=identity[0][0];totals[id]=totals[id]||0;byRound[id]=byRound[id]||{};
      row.sessions.forEach((s,i)=>{const n=Number(s[0]||0),round=board.sessions[i].round;if(!Number.isFinite(n))throw new Error('A licence input is not numeric. Check the Master before checking accumulated penalties.');byRound[id][round]=(byRound[id][round]||0)+n;});
    });}));
    // Imported completed rounds have a Published state, but no portal publication timestamp.
    const tables=ticketDeliveryPhase_('ticket.threshold.tables',()=>{
      const registry=ticket.spreadsheet.getSheetByName(F1XL_TICKET_SEASONS.rounds),baseline=ticket.spreadsheet.getSheetByName('Ticket Threshold Baselines'),blocks=[];
      const registryRows=registry?registry.getLastRow():0,baselineRows=baseline?Math.max(1,baseline.getLastRow()):0;
      if(registryRows>1)blocks.push({sheet:registry,row:2,column:1,height:registryRows-1,width:13});
      if(baseline)blocks.push({sheet:baseline,row:1,column:1,height:baselineRows,width:7});
      // Real S28 timing favours native reads for these larger tables. Combine
      // the baseline header/body into one fresh read, but do not route them
      // through the historical-session API batch or cache them after writes.
      const values=blocks.map(b=>b.sheet.getRange(b.row,b.column,b.height,b.width).getDisplayValues());let index=0;
      return {rounds:registryRows>1?values[index++]:[],baselines:baseline?values[index]:null};
    });
    const rounds=ticketDeliveryPhase_('ticket.threshold.rounds',()=>tables.rounds.map(r=>({season:r[0],round:Number(r[1]),publishedAt:r[8],state:r[10],sheetName:r[11]})).filter(r=>r.season===licence.season&&(r.publishedAt||r.state==='Published'||r.sheetName===reads.previewRace)).sort((a,b)=>a.round-b.round));
    const published=ticketDeliveryPublished_(reads),events=[],seen=new Set(),publishedByRace=new Map(),eventsByRound=new Map(),roundByNumber=new Map();
    published.forEach(t=>{if(!publishedByRace.has(t.race))publishedByRace.set(t.race,[]);publishedByRace.get(t.race).push(t);});
    ticketDeliveryPhase_('ticket.threshold.sources',()=>{
    ticketPublicSessionSources_(ticket,rounds.map(r=>r.sheetName),reads);
    rounds.forEach(round=>{if(!roundByNumber.has(round.round))roundByNumber.set(round.round,round);const source=ticketPublicSessionSource_(ticket,round.sheetName,reads),sourceById=new Map();source.forEach(s=>{if(!sourceById.has(s.caseId))sourceById.set(s.caseId,[]);sourceById.get(s.caseId).push(s);});(publishedByRace.get(round.sheetName)||[]).slice().sort((a,b)=>Number(a.ticketNumber)-Number(b.ticketNumber)).forEach(t=>{
      if(!t.caseId||seen.has(t.caseId))throw new Error('Check missing or duplicate permanent ticket IDs before checking accumulated penalties.');seen.add(t.caseId);
      const match=sourceById.get(t.caseId)||[];if(match.length!==1)throw new Error('An original published ticket cannot be matched.');
      const event={round:round.round,ticket:t,people:ticketDeliveryContributions_(t,match[0],round,licence)};events.push(event);if(!eventsByRound.has(round.round))eventsByRound.set(round.round,[]);eventsByRound.get(round.round).push(event);
    });});});
    ledger.forEach(r=>{if(!r[5])return;const contributions=JSON.parse(r[5]);if(contributions.some(p=>p.points)&&!seen.has(r[2]))throw new Error('An applied ticket is missing from the published records. Check it before checking accumulated penalties.');contributions.forEach(p=>{
      if(!byRound[p.driverId])throw new Error('An applied driver is missing from the licence.');byRound[p.driverId][p.round]=(byRound[p.driverId][p.round]||0)-p.points;
    });});
    const baselineName='Ticket Threshold Baselines',headers=['Season','Race','Round','Driver ID','Driver','Manual balance','Updated'];
    if(tables.baselines&&JSON.stringify(tables.baselines[0])!==JSON.stringify(headers))throw new Error('Check the Ticket Threshold Baselines headers.');
    const baselines=ticketDeliveryPhase_('ticket.threshold.baselines',()=>tables.baselines?tables.baselines.slice(1):[]),originalBaselines=baselines.map(r=>r.slice()),latest=Math.max(0,...rounds.map(r=>r.round)),publishedTotals={},baselineIndex=new Map(),baselineKey=(race,id)=>JSON.stringify([licence.season,race,id]);
    baselines.forEach((r,index)=>{const key=JSON.stringify([r[0],r[1],r[3]]);if(!baselineIndex.has(key))baselineIndex.set(key,{row:r,index:index});});
    Object.keys(totals).forEach(id=>{totals[id]=byRound[id][0]||0;publishedTotals[id]=0;});
    const roundNumbers=Array.from(new Set(events.map(e=>e.round).concat(...Object.values(byRound).map(r=>Object.keys(r).map(Number))))).filter(r=>r>0).sort((a,b)=>a-b);
    ticketDeliveryPhase_('ticket.threshold.calculate',()=>roundNumbers.forEach(round=>{
      Object.keys(totals).forEach(id=>{totals[id]+=byRound[id][round]||0;});
      const roundInfo=roundByNumber.get(round),manual={};
      if(!roundInfo)return;
      Object.keys(totals).forEach(id=>{
        const entry=baselineIndex.get(baselineKey(roundInfo.sheetName,id)),prior=entry&&entry.row;
        // Freeze previous rounds' undated manual adjustments. A later clean-race
        // deduction must not erase an earlier threshold crossing. Appeals remain
        // dynamic because published ticket points are calculated separately.
        manual[id]=prior&&round<latest?Number(prior[5]):totals[id];
        if(!Number.isFinite(manual[id]))throw new Error('An accumulated-points baseline is not numeric.');
        if(!prior||round===latest){
          const identity=idsById.get(id),value=[licence.season,roundInfo.sheetName,String(round),id,identity?identity[1]:id,String(manual[id]),new Date().toISOString()];
          if(prior){if(!ticketDeliverySame_([prior.slice(0,6)],[value.slice(0,6)])){baselines[entry.index]=value;entry.row=value;}}else{baselineIndex.set(baselineKey(roundInfo.sheetName,id),{row:value,index:baselines.length});baselines.push(value);}
        }
      });
      (eventsByRound.get(round)||[]).forEach(event=>{const flags=[];event.people.forEach(p=>{
        if(!Object.prototype.hasOwnProperty.call(totals,p.driverId))throw new Error('A published penalty driver is missing from the licence.');
        const before=(manual[p.driverId]||0)+(publishedTotals[p.driverId]||0),after=Math.round((before+p.points)*1000000)/1000000;publishedTotals[p.driverId]=(publishedTotals[p.driverId]||0)+p.points;
        rules.filter(r=>before<r.points&&after>=r.points).forEach(rule=>flags.push({driver:p.driver,before:before,after:after,threshold:rule.points,action:rule.action,discretion:rule.discretion}));
      });output.cases[event.ticket.caseId]=flags;});
    }));
    reads.baselines={name:baselineName,headers:headers,rows:baselines,before:originalBaselines};
  }catch(e){output.cases={};output.warning=e.message;}
  reads.thresholds=output;
  if(persist)ticketThresholdPersist_(reads);
  return output;
}
function ticketThresholdPersist_(reads){
  const b=reads.baselines;if(!b||reads.thresholds.warning||!b.rows.length||ticketDeliverySame_(b.rows,b.before))return;
  try{
    const sheet=ticketSetupTable_(reads.ticket.spreadsheet,b.name,b.headers);
    if(sheet.getMaxRows()<b.rows.length+1)sheet.insertRowsAfter(sheet.getMaxRows(),b.rows.length+1-sheet.getMaxRows());
    sheet.getRange(2,1,b.rows.length,7).setValues(b.rows.map(r=>r.map(ticketIntakeLiteral_)));b.before=b.rows.map(r=>r.slice());
  }catch(e){reads.thresholds.cases={};reads.thresholds.warning=e.message;}
}
function ticketThresholdText_(flags){return flags.map(f=>f.driver+': '+f.before+' → '+f.after+' points · '+f.action+' threshold reached ('+f.threshold+' points)'+(f.discretion?' — admin discretion':'' )).join('\n');}
function ticketDeliverySame_(a,b){return JSON.stringify(a.map(r=>r.map(String)))===JSON.stringify(b.map(r=>r.map(String)));}
function ticketDeliveryBatchAvailable_(){return typeof Sheets!=='undefined'&&Sheets.Spreadsheets&&typeof Sheets.Spreadsheets.get==='function';}
function ticketDeliveryA1_(w){
  function column(n){let text='';for(;n;n=Math.floor((n-1)/26))text=String.fromCharCode(65+(n-1)%26)+text;return text;}
  return "'"+w.sheet.replace(/'/g,"''")+"'!"+column(w.column)+w.row+':'+column(w.column+w.before[0].length-1)+(w.row+w.before.length-1);
}
/** One fresh API read contains raw values, formula flags and driver labels.
 * Sparse blank cells are padded; ranges are located by coordinates, never by
 * response order. These reads are not shared with the earlier preview. */
function ticketDeliveryBatchRead_(book,ranges){
  const result=Sheets.Spreadsheets.get(book.getId(),{ranges:ranges,fields:'sheets(properties(title),data(startRow,startColumn,rowData(values(effectiveValue,userEnteredValue,formattedValue))))'}),sheets={};
  if(!Array.isArray(result.sheets))throw new Error('Transfer validation returned no sheets. Retry the retained transfer.');
  result.sheets.forEach(s=>{
    if(!s.properties||!s.properties.title||!Array.isArray(s.data))throw new Error('Transfer validation returned incomplete sheet data. Retry the retained transfer.');
    const cells=sheets[s.properties.title]||(sheets[s.properties.title]={});
    s.data.forEach(g=>(g.rowData||[]).forEach((r,i)=>(r.values||[]).forEach((cell,j)=>{cells[(Number(g.startRow||0)+i+1)+':'+(Number(g.startColumn||0)+j+1)]=cell;})));
  });
  return function(w){
    const cells=sheets[w.sheet];if(!cells)throw new Error('A transfer destination was removed: '+w.sheet);
    const values=[],formulas=[],display=[];
    w.before.forEach((r,i)=>{values[i]=[];formulas[i]=[];display[i]=[];r.forEach((_,j)=>{
      const cell=cells[(w.row+i)+':'+(w.column+j)]||{},value=cell.effectiveValue||{};
      values[i][j]=value.numberValue!==undefined?value.numberValue:value.stringValue!==undefined?value.stringValue:value.boolValue!==undefined?value.boolValue:value.errorValue?(cell.formattedValue||'#ERROR!'):'';
      formulas[i][j]=cell.userEnteredValue?.formulaValue||'';display[i][j]=cell.formattedValue===undefined?String(values[i][j]):cell.formattedValue;
    });});
    return {values:values,formulas:formulas,display:display};
  };
}
function ticketDeliveryBatchWrite_(book,writes){
  // Keep writes in SpreadsheetApp so its read/write caches are invalidated
  // together. Flush once per group, not between every ticket or range.
  writes.forEach(w=>book.getSheetByName(w.sheet).getRange(w.row,w.column,w.after.length,w.after[0].length).setValues(w.after.map(r=>r.map(v=>typeof v==='string'?ticketIntakeLiteral_(v):v))));
  if(writes.length)SpreadsheetApp.flush();
}
function ticketDeliveryOverlaps_(a,b){return a.sheet===b.sheet&&a.row<b.row+b.before.length&&b.row<a.row+a.before.length&&a.column<b.column+b.before[0].length&&b.column<a.column+a.before[0].length;}
/** Only independent destinations share a commit. Each case keeps the same
 * durable journal and existing per-case recovery. Same-cell contributions and
 * competing new ban rows are planned again after the preceding group commits.
 * Never fall back or retry a write after an uncertain save response. */
function ticketDeliveryCommitBatches_(c,reads,board,selected,ledger){
  const rows=ticketDeliveryLedger_(reads);let cursor=0;
  while(cursor<selected.length){
    const group=[],writes=[],keys=new Set();let nextRow=Math.max(2,ledger.getLastRow()+1);
    while(cursor<selected.length){
      const id=selected[cursor].caseId,index=rows.findIndex(r=>r[0]===c.round.season&&r[1]===c.round.sheetName&&r[2]===id),old=index>=0?rows[index]:[],row=index>=0?index+2:nextRow;
      if(old[7]){
        if(group.length)break;
        rows[index]=ticketDeliveryResume_(c.licence,ledger,row,JSON.parse(old[7]));cursor++;continue;
      }
      const item=board.cases.find(p=>p.caseId===id);if(item.applied){cursor++;continue;}
      const affected=item.desired.concat(old[5]?JSON.parse(old[5]):[]).map(ticketDeliveryKey_);
      if(affected.some(key=>keys.has(key)))break;
      const plan=ticketDeliveryPhase_('ticket.commit.plan',()=>ticketDeliveryPlan_(c.licence,id,item.desired,old[5]?JSON.parse(old[5]):[],reads));
      if(plan.writes.some((w,i)=>plan.writes.slice(0,i).some(other=>ticketDeliveryOverlaps_(w,other))))throw new Error('A ticket has overlapping transfer destinations. Review the decision before applying.');
      if(plan.writes.some(w=>writes.some(other=>ticketDeliveryOverlaps_(w,other))))break;
      const journal={decision:item.decision,desired:item.desired,writes:plan.writes,resultsNeeded:item.resultsNeeded,preview:plan.preview};
      const pending=[c.round.season,c.round.sheetName,id,item.ticketNumber,old[4]||'',old[5]||'[]',old[6]||'',JSON.stringify(journal),new Date().toISOString(),old[9]||'[]'];
      group.push({row:row,journal:journal,pending:pending});writes.push(...plan.writes);affected.forEach(key=>keys.add(key));if(index<0)nextRow++;cursor++;
    }
    if(!group.length)continue;
    // Persist all journals before any licence write. A single-case group keeps
    // the existing recovery path and does not add API calls or extra flushes.
    const pending=group.map(g=>({sheet:ledger.getName(),row:g.row,column:1,before:[g.pending],after:[g.pending]}));
    ticketDeliveryPhase_('ticket.commit.journal',()=>ticketDeliveryBatchWrite_(c.ticket.spreadsheet,pending));
    if(group.length===1)group[0].saved=ticketDeliveryResume_(c.licence,ledger,group[0].row,group[0].journal);
    else ticketDeliveryResumeBatch_(c.licence,c.ticket.spreadsheet,ledger,group,writes);
    group.forEach(g=>{while(rows.length<g.row-1)rows.push(Array(10).fill(''));rows[g.row-2]=g.saved;});
  }
}
function ticketDeliveryResumeBatch_(context,ticketBook,ledger,group,writes){
  const names=writes.filter(w=>w.driver).map(w=>({sheet:w.sheet,row:w.row,column:1,before:[['']]}));
  const todo=ticketDeliveryPhase_('ticket.commit.guard',()=>{
    if(!writes.length)return [];
    const read=ticketDeliveryBatchRead_(context.spreadsheet,Array.from(new Set(writes.concat(names).map(ticketDeliveryA1_))));
    return writes.filter(w=>{
      if(w.driver&&read({sheet:w.sheet,row:w.row,column:1,before:[['']]}).display[0][0]!==w.driver)throw new Error('The licence driver row moved during transfer. Review the retained journal.');
      const now=read(w);if(now.formulas.some(r=>r.some(Boolean))||(!ticketDeliverySame_(now.values,w.before)&&!ticketDeliverySame_(now.values,w.after)))throw new Error('A transfer destination changed manually. Review '+w.sheet+' row '+w.row+' against Pending writes JSON; no conflicting value was replaced.');
      return !ticketDeliverySame_(now.values,w.after);
    });
  });
  ticketDeliveryPhase_('ticket.commit.write',()=>ticketDeliveryBatchWrite_(context.spreadsheet,todo));
  ticketDeliveryPhase_('ticket.commit.readback',()=>{
    if(!writes.length)return;
    const read=ticketDeliveryBatchRead_(context.spreadsheet,Array.from(new Set(writes.map(ticketDeliveryA1_))));
    writes.forEach(w=>{const now=read(w);if(now.formulas.some(r=>r.some(Boolean))||!ticketDeliverySame_(now.values,w.after))throw new Error('Transfer read-back did not match. Retry the retained transfer.');});
  });
  ticketDeliveryPhase_('ticket.commit.receipt',()=>{
    const pending=group.map(g=>({sheet:ledger.getName(),row:g.row,column:1,before:[g.pending]})),read=ticketDeliveryBatchRead_(ticketBook,pending.map(ticketDeliveryA1_));
    pending.forEach(w=>{const now=read(w);if(now.formulas.some(r=>r.some(Boolean))||!ticketDeliverySame_(now.values,w.before))throw new Error('A transfer journal changed manually. Review the retained transfer before continuing.');});
    const receipts=group.map(g=>{
      const values=g.pending.slice(),j=g.journal;values[4]=j.decision;values[5]=JSON.stringify(j.desired);values[6]=j.resultsNeeded?'Review required':'';values[7]='';values[8]=new Date().toISOString();values[9]=JSON.stringify(j.preview||[]);
      g.saved=values.map(v=>String(v==null?'':v));return {sheet:ledger.getName(),row:g.row,column:5,before:[g.pending.slice(4)],after:[values.slice(4)]};
    });
    ticketDeliveryBatchWrite_(ticketBook,receipts);
  });
}
function ticketDeliveryResume_(context,ledger,row,journal) {
  // Validate every destination before writing any. An unknown value is never overwritten.
  journal.writes.forEach(w=>{
    const s=context.spreadsheet.getSheetByName(w.sheet);if(!s)throw new Error('A transfer destination was removed: '+w.sheet);
    if(w.driver&&s.getRange(w.row,1).getDisplayValue()!==w.driver)throw new Error('The licence driver row moved during transfer. Review the retained journal.');
    const r=s.getRange(w.row,w.column,w.before.length,w.before[0].length),now=r.getValues();
    if(r.getFormulas().some(a=>a.some(Boolean))||(!ticketDeliverySame_(now,w.before)&&!ticketDeliverySame_(now,w.after)))throw new Error('A transfer destination changed manually. Review '+w.sheet+' row '+w.row+' against Pending writes JSON; no conflicting value was replaced.');
  });
  journal.writes.forEach(w=>{
    const range=context.spreadsheet.getSheetByName(w.sheet).getRange(w.row,w.column,w.after.length,w.after[0].length);
    if(!ticketDeliverySame_(range.getValues(),w.after))range.setValues(w.after.map(r=>r.map(v=>typeof v==='string'?ticketIntakeLiteral_(v):v)));
  });
  SpreadsheetApp.flush();
  journal.writes.forEach(w=>{if(!ticketDeliverySame_(context.spreadsheet.getSheetByName(w.sheet).getRange(w.row,w.column,w.after.length,w.after[0].length).getValues(),w.after))throw new Error('Transfer read-back did not match. Retry the retained transfer.');});
  const values=ledger.getRange(row,1,1,10).getValues()[0];values[4]=journal.decision;values[5]=JSON.stringify(journal.desired);values[6]=journal.resultsNeeded?'Review required':'';values[7]='';values[8]=new Date().toISOString();values[9]=JSON.stringify(journal.preview||[]);ledger.getRange(row,1,1,10).setValues([values]);
  return values.map(v=>String(v==null?'':v));
}
function applyTicketPenalties(input){ fapAssertEntry_('applyTicketPenalties');
  return ticketDeliveryMeasure_('tickets.penalties.apply',()=>withTicketProcessingLock_(()=>applyTicketPenalties_(input)));
}
function applyTicketPenalties_(input,loaded){
    const c=loaded?loaded.c:ticketDeliveryPhase_('ticket.context',()=>ticketDeliveryContext_(input.raceName)),reads=loaded?loaded.reads:ticketDeliveryReads_(c.ticket,c.licence),selected=input.tickets;
    if(!Array.isArray(selected)||!selected.length||selected.length>50)throw new Error('Select the published tickets to apply.');
    if(new Set(selected.map(t=>t.caseId)).size!==selected.length)throw new Error('Select each ticket only once.');
    const board=loaded?loaded.board:ticketDeliveryPhase_('ticket.validate',()=>ticketDeliveryBoard_(c,reads,true));
    const interrupted=ticketDeliveryLedger_(reads).filter(r=>r[0]===c.round.season&&r[7]);
    if(interrupted.length&&selected.some(t=>!interrupted.some(r=>r[1]===c.round.sheetName&&r[2]===t.caseId)))throw new Error('Finish the interrupted transfer for '+interrupted[0][1]+' · ticket #'+interrupted[0][3]+' first. Select only that ticket and apply to recover it.');
    selected.forEach(t=>{const p=board.cases.find(p=>p.caseId===t.caseId);if(!p||p.revision!==t.revision)throw new Error('The decision or licence changed. Refresh and review the new amounts before applying.');if(p.issue&&!p.pending)throw new Error(p.issue);});
    const ledger=ticketSetupTable_(c.ticket.spreadsheet,F1XL_TICKET_DELIVERY.ledger,F1XL_TICKET_DELIVERY.headers);
    // Persist the follow-up before committing. An interrupted transfer remains
    // queued, but the worker will not publish until its journal is recovered.
    ticketPublicationQueue_(c.round.season,true);
    ticketDeliveryPhase_('ticket.commit',()=>{
    if(ticketDeliveryBatchAvailable_()){ticketDeliveryCommitBatches_(c,reads,board,selected,ledger);return;}
    for(const selectedCase of selected){
      const rows=ticketDeliveryLedger_(reads),index=rows.findIndex(r=>r[0]===c.round.season&&r[1]===c.round.sheetName&&r[2]===selectedCase.caseId),old=index>=0?rows[index]:[],row=index>=0?index+2:Math.max(2,ledger.getLastRow()+1);
      if(old[7]){rows[index]=ticketDeliveryResume_(c.licence,ledger,row,JSON.parse(old[7]));continue;}
      const item=board.cases.find(p=>p.caseId===selectedCase.caseId);if(item.applied)continue;
      const plan=ticketDeliveryPlan_(c.licence,item.caseId,item.desired,old[5]?JSON.parse(old[5]):[],reads);
      const journal={decision:item.decision,desired:item.desired,writes:plan.writes,resultsNeeded:item.resultsNeeded,preview:plan.preview};
      ledger.getRange(row,1,1,10).setValues([[c.round.season,c.round.sheetName,item.caseId,item.ticketNumber,old[4]||'',old[5]||'[]',old[6]||'',JSON.stringify(journal),new Date().toISOString(),old[9]||'[]']]);
      SpreadsheetApp.flush();const saved=ticketDeliveryResume_(c.licence,ledger,row,journal);
      // Keep physical row indexes, including any manually left blank ledger rows.
      while(rows.length<row-1)rows.push(Array(10).fill(''));rows[row-2]=saved;
    }
    });
    // Fresh post-write licence/ledger state; immutable evidence/export can be reused.
    reads.boards={};delete reads.licenceNames;delete reads.ledger;delete reads.thresholds;delete reads.baselines;
    const result=ticketDeliveryPhase_('ticket.response',()=>ticketDeliveryBoard_(c,reads));result.message='Selected penalties applied. Result times and positions still require review.';
    result.feed=ticketPublicState_(c.round.season);result.publicationPending=true;result.licencePublicationPending=true;
    result.message+=' Saved to Sheets. Website indicators and licence summary are updating in the background.';
    return result;
}
function confirmTicketResultsAdjusted(input){ fapAssertEntry_('confirmTicketResultsAdjusted');
  return withTicketProcessingLock_(function(){
    const c=ticketDeliveryContext_(input.raceName),board=ticketDeliveryBoard_(c),item=board.cases.find(p=>p.caseId===input.caseId);
    if(!item||item.revision!==input.revision||!item.applied||item.issue)throw new Error('Refresh and apply the current penalty before confirming its result adjustment.');
    if(resultsEntryPending_({season:c.round.season,division:item.division}).length)throw new Error('Finish the saved results’ website update before marking this ticket adjusted.');
    const rows=ticketDeliveryRows_(c.ticket.spreadsheet),index=rows.findIndex(r=>r[0]===c.round.season&&r[1]===c.round.sheetName&&r[2]===item.caseId);
    c.ticket.spreadsheet.getSheetByName(F1XL_TICKET_DELIVERY.ledger).getRange(index+2,7).setValue(item.decision);
    return ticketDeliveryBoard_(c);
  });
}
function ticketPublicState_(season){const raw=PropertiesService.getScriptProperties().getProperty(F1XL_TICKET_DELIVERY.feedPrefix+season);return raw?JSON.parse(raw):{};}
function ticketPublicStore_(season,r){PropertiesService.getScriptProperties().setProperty(F1XL_TICKET_DELIVERY.feedPrefix+season,JSON.stringify(r));}
function ticketPublicSessionSource_(context,race,reads){
  reads.sessionSources=reads.sessionSources||{};
  if(reads.sources[race]?.tickets)return reads.sources[race].tickets;
  return reads.sessionSources[race]||(reads.sessionSources[race]=findTicketRaceSheet_(context,race).getRange(2,73,F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow-1,3).getDisplayValues().map(r=>({caseId:r[0],session:r[2]})));
}
/** Share historical session reads only inside this request, as before. Read
 * every registered source, including rounds with no published decisions. */
function ticketPublicSessionSources_(context,races,reads){
  reads.sessionSources=reads.sessionSources||{};
  const missing=Array.from(new Set(races)).filter(race=>!reads.sources[race]?.tickets&&!reads.sessionSources[race]);
  const blocks=missing.map(race=>({sheet:findTicketRaceSheet_(context,race),row:2,column:73,height:F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow-1,width:3}));
  const values=ticketDeliveryDisplayBlocks_(context.spreadsheet,blocks,reads);
  missing.forEach((race,i)=>{reads.sessionSources[race]=values[i].map(r=>({caseId:r[0],session:r[2]}));});
}
/** Bounded, fresh displayed-value reads. Formulas, custom number formats and
 * array-formula spill values retain getDisplayValues semantics. No raw-literal
 * shortcut, persistent cache or reuse of pre-write threshold tables. */
function ticketDeliveryDisplayBlocks_(book,blocks,reads){
  if(!blocks.length)return [];
  const native=()=>blocks.map(b=>b.sheet.getRange(b.row,b.column,b.height,b.width).getDisplayValues());
  if(reads.displayNativeOnly||!ticketDeliveryBatchAvailable_())return native();
  const range=b=>"'"+b.sheet.getName().replace(/'/g,"''")+"'!"+ticketColumn_(b.column)+b.row+':'+ticketColumn_(b.column+b.width-1)+(b.row+b.height-1),output=[];
  try{
    // Bound URL/range count for larger seasons without widening any cell read.
    for(let offset=0;offset<blocks.length;){
      const part=[];let length=0;
      while(offset<blocks.length&&part.length<40){const next=blocks[offset],size=encodeURIComponent(range(next)).length+10;if(part.length&&length+size>5000)break;part.push(next);length+=size;offset++;}
      const result=ticketDeliveryPhase_('ticket.display.read',()=>Sheets.Spreadsheets.get(book.getId(),{ranges:part.map(range),fields:'sheets(properties(title),data(startRow,startColumn,rowData(values(formattedValue))))'})),sheets={};
      if(!result||!Array.isArray(result.sheets))throw new Error('Incomplete ticket display response');
      result.sheets.forEach(s=>{
        if(!s.properties||typeof s.properties.title!=='string'||!Array.isArray(s.data))throw new Error('Incomplete ticket display sheet');
        const cells=sheets[s.properties.title]||(sheets[s.properties.title]={});
        s.data.forEach(g=>{if(g.rowData!==undefined&&!Array.isArray(g.rowData))throw new Error('Incomplete ticket display grid');(g.rowData||[]).forEach((r,i)=>{if(r.values!==undefined&&!Array.isArray(r.values))throw new Error('Incomplete ticket display row');(r.values||[]).forEach((cell,j)=>{if(cell.formattedValue!==undefined&&typeof cell.formattedValue!=='string')throw new Error('Incomplete ticket display cell');cells[(Number(g.startRow||0)+i+1)+':'+(Number(g.startColumn||0)+j+1)]=cell.formattedValue||'';});});});
      });
      part.forEach(b=>{const cells=sheets[b.sheet.getName()];if(!cells)throw new Error('Missing ticket display sheet');output.push(Array.from({length:b.height},(_,i)=>Array.from({length:b.width},(_,j)=>cells[(b.row+i)+':'+(b.column+j)]||'')));});
    }
    return output;
  }catch(error){
    // Read-only failure: discard the partial API reply and read every block
    // natively. Do not retry the service again during this request.
    reads.displayNativeOnly=true;ticketDeliveryPhase_('ticket.display.fallback',()=>{});return native();
  }
}
function ticketPublicSessionLabel_(value){
  const key=String(value||'').toLowerCase().replace(/[^a-z]/g,'');
  return ({race:'Race',featurerace:'Race',qualifying:'Qualifying',sprint:'Sprint',sprintrace:'Sprint',sprintqualifying:'Sprint qualifying'})[key]||'';
}
function ticketPublicRows_(context,season,reads){
  const registered=ticketSheetRows_(context.spreadsheet.getSheetByName(F1XL_TICKET_SEASONS.rounds),13).filter(r=>String(r[0])===String(season)&&(r[8]||r[10]==='Published')).map(r=>r[11]);
  const all=context.websiteSheet.getRange(1,1,Math.max(1,context.websiteSheet.getLastRow()),32).getDisplayValues();
  const rows=all.slice(1).filter(r=>registered.includes(r[0])&&r[1]);
  if(rows.some(r=>r.some(v=>/^#(?:REF!|VALUE!|ERROR!|N\/A|DIV\/0!|NAME\?)/.test(v))))throw new Error('Fix the spreadsheet error in a published outcome before updating the website.');
  rows.sort((a,b)=>registered.indexOf(a[0])-registered.indexOf(b[0])||Number(a[2])-Number(b[2])||Number(a[1])-Number(b[1]));
  reads=reads||ticketDeliveryReads_(context,openLicenceContext_(season));
  const indicators=ticketThresholdIndicators_(context,reads.licence,true,reads),cases=ticketDeliveryPublished_(reads);
  const priorIndicators=indicators.warning&&context.websiteSheet.getMaxColumns()>=34?context.websiteSheet.getRange(1,34,Math.max(1,context.websiteSheet.getLastRow()),1).getDisplayValues():[];
  return [all[0].concat(['Accumulated penalty indicators','Session'])].concat(rows.map(r=>{
    const match=cases.find(t=>t.race===r[0]&&String(t.ticketNumber)===String(r[1]));
    // An internal calculation failure is not a penalty. Preserve an existing
    // genuine indicator until it can be checked, but never export the placeholder.
    const existing=match?String(priorIndicators[match.sheetRow-1]?.[0]||''):'';
    const source=match&&match.caseId?ticketPublicSessionSource_(context,r[0],reads).filter(t=>t.caseId===match.caseId):[];
    const session=source.length===1?ticketPublicSessionLabel_(source[0].session):'';
    return r.concat([indicators.warning?(/awaiting admin review/i.test(existing)?'':existing):ticketThresholdText_(indicators.cases[match?.caseId]||[]),session]);
  }));
}
function ticketPublicSync_(season,reads){
  const context=reads?reads.ticket:openTicketProcessingContext_(),master=seasonPlanningBook_(season);divisionTemplateAssertTestWorkbook_(master);
  if(!testLaunchRecord_(season).launchedAt||!testLaunchActive_(master))throw new Error('Launch this TEST season before publishing its tickets.');
  const config=testLaunchConfig_(),main=config.getSheetByName('Main'),active=websiteConfigFindKeyCell_(main,'active_test_season');
  if(!active||String(active.offset(0,1).getValue())!==String(season))throw new Error('The Website is displaying a different season.');
  ticketWebsiteIndicators_(context,season,reads);
  const record=ticketWebsiteConnect_(main,season,context);
  websiteConfigClearCache_();return record;
}
// Website Export is the website source, including rows completed manually.
// Never create another workbook, change its sharing, or repoint to an old copy.
function ticketWebsiteConnect_(main,season,context){
  context=context||openTicketProcessingContext_();
  if(!/^TEST\b/i.test(fapWorkbookLegacyName_(context.spreadsheet.getName())))throw new Error('Use the TEST ticket-processing workbook for the Website.');
  const record={id:context.spreadsheet.getId(),gid:context.websiteSheet.getSheetId(),mode:'direct',updatedAt:new Date().toISOString(),pending:false,error:''};
  ticketPublicConfig_(main,{ticket_outcomes_sheet:record.id,ticket_outcomes_gid:record.gid,test_tickets_ready:'yes'});
  ticketPublicStore_(season,record);return record;
}
// Read config once; unchanged connection settings need no writes or recalculation.
function ticketPublicConfig_(sheet,updates){
  const rows=sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),2).getDisplayValues();
  Object.keys(updates).forEach(key=>{const row=rows.find(r=>String(r[0]).trim().toLowerCase()===key.toLowerCase());if(!row||String(row[1])!==String(updates[key]))testLaunchSetConfig_(sheet,key,updates[key]);});
}
function ticketWebsiteIndicators_(context,season,reads){
  const sheet=context.websiteSheet,header='Accumulated penalty indicators';
  const oldHeader=sheet.getMaxColumns()>=34?sheet.getRange('AH1').getDisplayValue():'';
  if(oldHeader&&oldHeader!==header)throw new Error('Website Export column AH is already in use. Check it before updating accumulated penalty indicators.');
  const sessionHeader=sheet.getMaxColumns()>=35?sheet.getRange('AI1').getDisplayValue():'';
  if(sessionHeader&&sessionHeader!=='Session')throw new Error('Website Export column AI is already in use. Check it before updating ticket sessions.');
  const rows=ticketPublicRows_(context,season,reads).slice(1),indicators={};
  rows.forEach(r=>{indicators[JSON.stringify([r[0],r[1]])]=r.slice(32,34);});
  if(sheet.getMaxColumns()<35)sheet.insertColumnsAfter(sheet.getMaxColumns(),35-sheet.getMaxColumns());
  if(oldHeader!==header)sheet.getRange('AH1').setValue(header);
  if(sessionHeader!=='Session')sheet.getRange('AI1').setValue('Session');
  const count=sheet.getLastRow()-1;if(count<1)return;
  const identities=sheet.getRange(2,1,count,2).getDisplayValues(),current=sheet.getRange(2,34,count,2).getDisplayValues();
  let start=-1,values=[];
  const flush=()=>{if(values.length)sheet.getRange(start+2,34,values.length,2).setValues(values);start=-1;values=[];};
  identities.forEach((r,i)=>{const key=JSON.stringify(r),next=indicators[key];
    // Manual exports with no matched saved session retain their own label.
    const desired=next?[next[0],next[1]||current[i][1]]:null;
    if(desired&&JSON.stringify(current[i])!==JSON.stringify(desired)){if(start<0)start=i;values.push(desired.map(ticketIntakeLiteral_));}else flush();});flush();
}
function ticketPublicAfterSave_(context,race,response){
  const round=ticketRoundForSheet_(context.spreadsheet,race);if(!round)return response;
  ticketPublicationQueue_(round.season,false);
  response.season=round.season;response.publicationPending=true;response.message+=' Saved in Website Export. Website indicators are updating in the background.';
  return response;
}
function ticketPublicLicencePayload_(dest,payload){
  payload.forEach(p=>{
    const name='M '+p.name,sheet=dest.getSheetByName(name);
    const height=Math.max(...p.blocks.map(b=>b.row+b.values.length-1)),width=Math.max(...p.blocks.map(b=>b.column+b.values[0].length-1));
    if(!sheet||sheet.getMaxRows()<height||sheet.getMaxColumns()<width){testLaunchWritePayload_(dest,'M ',[p]);return;}
    // Include the old occupied extent: an appealed/removed final ban must clear
    // its old public row, not survive beyond the shorter new payload.
    const rows=Math.max(height,sheet.getLastRow()),cols=Math.max(width,sheet.getLastColumn());
    const values=Array.from({length:rows},()=>Array(cols).fill(''));
    p.blocks.forEach(b=>b.values.forEach((row,i)=>row.forEach((v,j)=>values[b.row-1+i][b.column-1+j]=String(v))));
    testLaunchWriteChangedPayload_(dest,[{name:name,blocks:[{row:1,column:1,values:values}]}]);
  });
}
function ticketPublicLicences_(context){
  const record=testLaunchRecord_(context.season);if(record.sourceMode===F1XL_DIRECT_SOURCE_MODE)return; if(record.pendingId)throw new Error('Finish the full website refresh first.');
  const main=testLaunchConfig_().getSheetByName('Main'),active=websiteConfigFindKeyCell_(main,'active_test_season');
  if(!active||String(active.offset(0,1).getValue())!==context.season)throw new Error('The Website is displaying another season.');
  const payload=licencePublishPayload_(context.spreadsheet,context.season);if(payload.length!==3)throw new Error('Connect every division’s licences first.');
  const dest=testLaunchExport_(record.exportId,context.season);
  ticketPublicLicencePayload_(dest,payload);
  const settings={drivers_licence_sheet_id:dest.getId(),test_licences_ready:'yes'};
  [['summary','Summary'],['bans','Outstanding Bans'],['penalty_guide','Penalty Guide']].forEach(p=>settings['drivers_licence_'+p[0]+'_gid']=dest.getSheetByName('M '+p[1]).getSheetId());
  ticketPublicConfig_(main,settings);websiteConfigClearCache_();
}
function updateTicketTestWebsite(input){ fapAssertEntry_('updateTicketTestWebsite');return withTicketProcessingLock_(function(){const c=ticketDeliveryContext_(input.raceName);ticketPublicationQueue_(c.round.season,true);const update=ticketPublicationRun_(c.round.season),result=ticketDeliveryBoard_(c);result.message=update.message;result.publicationPending=update.pending;return result;});}

// One durable queue entry per season and one shared clock trigger for the
// project. These contain no outcomes: every retry reads authoritative Sheets.
const F1XL_TICKET_PUBLICATION_QUEUE='F1XL_TICKET_PUBLICATION_QUEUE_V1_';
function ticketPublicationQueue_(season,licences){
  season=String(season);const props=PropertiesService.getScriptProperties(),key=F1XL_TICKET_PUBLICATION_QUEUE+season,old=JSON.parse(props.getProperty(key)||'{}');
  props.setProperty(key,JSON.stringify({season,licences:!!(licences||old.licences),requestedAt:new Date().toISOString()}));
  const state=ticketPublicState_(season);state.pending=true;state.error='';
  try{
    if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='ticketPublicationWorker_'))ScriptApp.newTrigger('ticketPublicationWorker_').timeBased().everyMinutes(5).create();
  }catch(error){state.error='Automatic retry setup needs attention: '+error.message;}
  ticketPublicStore_(season,state);
}
function ticketPublicationRun_(season){
  const props=PropertiesService.getScriptProperties(),key=F1XL_TICKET_PUBLICATION_QUEUE+season,raw=props.getProperty(key);
  if(!raw)return {ok:true,season:String(season),pending:false,feed:ticketPublicState_(season),message:'No website update is waiting.'};
  const job=JSON.parse(raw);
  try{
    const ticket=openTicketProcessingContext_();
    if(ticketDeliveryRows_(ticket.spreadsheet).some(r=>String(r[0])===String(season)&&r[7]))throw new Error('Finish the interrupted penalty transfer before updating the website.');
    const licence=openLicenceContext_(season),reads=ticketDeliveryReads_(ticket,licence);
    ticketPublicSync_(season,reads);
    if(job.licences)ticketPublicLicences_(licence);
    props.deleteProperty(key);
    const state=ticketPublicState_(season);state.pending=false;state.error='';ticketPublicStore_(season,state);
    return {ok:true,season:String(season),pending:false,feed:state,message:job.licences?'Test ticket indicators and licence summary updated.':'Test ticket indicators updated.'};
  }catch(error){
    const state=ticketPublicState_(season);state.pending=true;state.error=error.message;ticketPublicStore_(season,state);
    return {ok:true,season:String(season),pending:true,feed:state,message:'Saved to Sheets. Website update pending: '+error.message};
  }
}
function processTicketWebsiteUpdates(input){ fapAssertEntry_('processTicketWebsiteUpdates');
  const season=String(input&&input.season||'');if(!/^\d+$/.test(season))throw new Error('Choose a valid season.');
  // Readers may finish already-authorised queued work, never enqueue a publish.
  const lock=LockService.getScriptLock();if(!lock.tryLock(1))return {ok:true,season,pending:true,busy:true};
  try{return ticketPublicationRun_(season);}finally{lock.releaseLock();}
}
function ticketPublicationWorker_(event){
  fapAssertHost_();
  if(!event||!event.triggerUid||!ScriptApp.getProjectTriggers().some(t=>String(t.getUniqueId())===String(event.triggerUid)&&t.getHandlerFunction()==='ticketPublicationWorker_'))throw new Error('A registered publication trigger is required.');
  const lock=LockService.getScriptLock();if(!lock.tryLock(1))return;
  try{
    if(typeof ticketFormRunPending_==='function')ticketFormRunPending_(false);
    const props=PropertiesService.getScriptProperties().getProperties();
    // Oldest request first; cap each execution to one season. Failed jobs retain
    // their data and move to the back so they cannot starve another season.
    const jobs=Object.keys(props).filter(k=>k.startsWith(F1XL_TICKET_PUBLICATION_QUEUE)).map(k=>JSON.parse(props[k])).sort((a,b)=>a.requestedAt.localeCompare(b.requestedAt));
    if(jobs.length){const job=jobs[0],result=ticketPublicationRun_(job.season);if(result.pending){job.requestedAt=new Date().toISOString();PropertiesService.getScriptProperties().setProperty(F1XL_TICKET_PUBLICATION_QUEUE+job.season,JSON.stringify(job));}}
  }finally{lock.releaseLock();}
}
/** Connect the existing Website Export before any completed outcomes. */
function connectTicketTestWebsite(input){ fapAssertEntry_('connectTicketTestWebsite');
  return withTicketProcessingLock_(function(){
    const c=ticketSeasonMaster_(input&&input.season),ticket=ticketSeasonBook_(),check=ticketSeasonCheck_(c,ticket);
    if(!check.ready)throw new Error('Finish Season connections before connecting the TEST ticket website. '+check.issues.join(' '));
    ticketPublicSync_(c.season);
    const feed=ticketPublicState_(c.season);
    return {season:c.season,website:F1XL_TEST_LAUNCH.website+'ticket-outcomes.html',feed:feed,message:'Website connected directly to Website Export. Completed outcomes and manual export edits appear when the website reloads.'};
  });
}

/** Called under the publication lock. Preserve publication if transfer needs attention. */
function ticketFinishLicenceTransfer_(raceName,response){
  try{
    const c=ticketDeliveryContext_(raceName),reads=ticketDeliveryReads_(c.ticket,c.licence);
    const board=ticketDeliveryBoard_(c,reads,true);
    const ready=board.cases.filter(t=>!t.issue&&!t.applied&&!t.pending);
    response.transfer=ready.length?applyTicketPenalties_({raceName:raceName,tickets:ready.map(t=>({caseId:t.caseId,revision:t.revision}))},{c,reads,board}):ticketDeliveryBoard_(c,reads);
    response.publicationPending=true;
    const remaining=response.transfer.cases.filter(t=>!t.applied||t.issue);
    response.message+=' '+(remaining.length?remaining.length+' ticket(s) need attention in Licences & results.':'Licence penalties are up to date.');
    if(response.transfer.cases.some(t=>t.resultsNeeded&&!t.resultsChecked))response.message+=' Adjust race results below.';
  }catch(error){response.transferError=error.message||String(error);response.message+=' Decisions are published; licence update needs attention: '+response.transferError;}
}

/** Final decisions use the same export, licence ledger and appeal deltas as the
 * manual/repair tools. Preview is read-only, including unpublished outcomes. */
function ticketCompletionState_(raceName,loaded){
  const c=loaded?loaded.c:ticketDeliveryPhase_('completion.context',()=>ticketDeliveryContext_(raceName)),reads=loaded?loaded.reads:ticketDeliveryReads_(c.ticket,c.licence);
  const published=ticketDeliveryPublished_(reads),isPublished=published.some(t=>t.race===raceName);
  let drafts=[];
  if(!isPublished){
    if(ticketOutcomeSourceRace_(c.ticket.outcomesSheet)!==raceName||c.ticket.outcomesSheet.getRange('AB1').getValue()==='FAP Preparing')throw new Error('Start final decisions for this round first.');
    drafts=buildTicketOutcomeWorkspace_(c.ticket,raceName).tickets;
    reads.previewRace=raceName;
    reads.published=published.concat(drafts.map(t=>Object.assign({},t,{race:raceName,outcome:[t.driverPunished,t.points,t.penalty,t.evaluation,t.submitterOutcome,t.submitterPoints,t.submitterPenalty,t.offenderOutcome,t.offenderPoints,t.offenderPenalty]})));
  }
  // A just-returned transfer board already has fresh post-write balances and
  // journal checks. Reuse it only inside this locked completion request.
  const board=loaded?.board||ticketDeliveryPhase_('completion.board',()=>ticketDeliveryBoard_(c,reads)),identities=ticketDeliveryIdentities_(c.licence);
  board.published=isPublished;
  board.drivers=identities.filter(r=>r[0]&&r[1]&&identities.filter(x=>x[0]===r[0]||x[1].toLowerCase()===r[1].toLowerCase()).length===1).map(r=>({id:r[0],name:r[1]})).sort((a,b)=>a.name.localeCompare(b.name));
  board.cases.forEach(t=>{const draft=drafts.find(d=>d.caseId===t.caseId);if(draft&&(!draft.penalty||!draft.evaluation||draft.points===''||!Number.isFinite(Number(draft.points))))t.issue=t.issue||'Choose a final penalty and write the decision before completing.';});
  // The preview totals are for the whole batch, not several independent changes
  // all pretending to be the last ticket affecting the same licence cell.
  const deltas={};board.cases.forEach(t=>(t.preview||[]).forEach(p=>{const k=JSON.stringify([p.driver,p.division,p.session]);deltas[k]=(deltas[k]||0)+p.pointsDelta;}));
  const seasonPoints={},seasonDeltas={};
  Object.values(reads.boards).forEach(b=>b.rows.forEach(r=>{const k=r.driver.toLowerCase();seasonPoints[k]=(seasonPoints[k]||0)+r.sessions.reduce((n,s)=>n+Number(s[0]||0),0);}));
  board.cases.forEach(t=>(t.preview||[]).forEach(p=>{const k=p.driver.toLowerCase();seasonDeltas[k]=(seasonDeltas[k]||0)+p.pointsDelta;}));
  board.cases.forEach(t=>(t.preview||[]).forEach(p=>{p.roundPoints=Number(p.currentPoints||0)+deltas[JSON.stringify([p.driver,p.division,p.session])];p.currentSeasonPoints=seasonPoints[p.driver.toLowerCase()]||0;p.seasonPoints=p.currentSeasonPoints+(seasonDeltas[p.driver.toLowerCase()]||0);}));
  // Ban status can change independently in Sheets. Refresh it even when the
  // delivery board came from the just-completed transfer.
  const sheet=c.licence.bansSheet,rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,7).getDisplayValues():[];
  const populatedBans=rows.filter(row=>row.some(value=>String(value).trim()!==''));
  board.cases.forEach(t=>(t.accumulated||[]).forEach(f=>{f.recorded=ticketThresholdBanMatch_(populatedBans,f);}));
  board.banActions=[];
  board.cases.forEach(t=>(t.accumulated||[]).forEach(f=>{
    if(f.recorded?.conflict){t.issue=t.issue||f.recorded.label;return;}
    if(!f.recorded)board.banActions.push({key:JSON.stringify(['add',t.caseId,f.driver,f.threshold]),kind:'add',caseId:t.caseId,driver:f.driver,division:t.division,action:f.action,threshold:f.threshold,discretion:f.discretion,round:c.round.round});
  }));
  const thresholds=reads.thresholds,flags=Object.values(thresholds?.cases||{}).flat();
  if(thresholds&&!thresholds.warning){
    const stale=rows.map((values,i)=>({values,row:i+2,match:String(values[6]).match(/^Accumulation of (\d+) points · R(\d+) ticket #\d+$/)})).filter(x=>x.match&&!flags.some(f=>f.driver.toLowerCase()===String(x.values[1]).toLowerCase()&&f.threshold===Number(x.match[1])));
    board.thresholdWarning=stale.some(x=>/^yes$/i.test(x.values[4]))?'An overturned accumulated ban has already been served. Review it in Licences before completing this round.':'';
    stale.filter(x=>!/^yes$/i.test(x.values[4])).forEach(x=>board.banActions.push({key:JSON.stringify(['remove',x.row,x.values]),kind:'remove',row:x.row,before:x.values,driver:x.values[1],action:x.values[2],threshold:Number(x.match[1]),round:Number(x.match[2])}));
  }
  const source=reads.sources[raceName];
  const banRevision=licenceRevision_([c.round.season,sheet.getParent().getId(),populatedBans]);
  board.completionRevision=licenceRevision_([board.cases,board.banActions,board.thresholdWarning,source.tickets.map(t=>[t.caseId,t.fullRevision,t.recordRevision]),drafts.map(t=>t.revision),banRevision]);
  return {c,reads,board};
}
function getTicketCompletionPreview(input){fapAssertEntry_('getTicketCompletionPreview');return ticketDeliveryMeasure_('tickets.completion.preview',()=>ticketCompletionState_(String(input.raceName||'')).board);}
function completeTicketRound(input){fapAssertEntry_('completeTicketRound');return ticketDeliveryMeasure_('tickets.completion.save',()=>withTicketProcessingLock_(function(){
  const state=ticketDeliveryPhase_('completion.preflight',()=>ticketCompletionState_(String(input.raceName||''))),{c,board}=state;
  if(input.revision!==board.completionRevision)throw new Error('Decisions or licences changed. Check the updated totals before completing the round.');
  if(!board.cases.length)throw new Error('There are no final decisions for this round.');
  const interrupted=board.cases.filter(t=>t.pending);
  if(interrupted.length){
    const recovered=ticketDeliveryPhase_('completion.recovery',()=>applyTicketPenalties_({raceName:c.round.sheetName,tickets:interrupted.map(t=>({caseId:t.caseId,revision:t.revision}))},{c,reads:state.reads,board}));
    const completion=ticketCompletionState_(c.round.sheetName,{c,reads:state.reads,board:recovered}).board;
    return Object.assign(buildWebsiteTicketExport_(c.ticket),{completion,transfer:completion,season:c.round.season,publicationPending:true,message:'Interrupted licence save recovered. Review the remaining changes below, then complete the round.'});
  }
  if(board.cases.some(t=>t.issue))throw new Error('Resolve the marked tickets before completing this round.');
  if(board.thresholdWarning)throw new Error(board.thresholdWarning);
  const confirmations=new Set(Array.isArray(input.confirmBans)?input.confirmBans:[]);
  if(board.banActions.some(a=>!confirmations.has(a.key)))throw new Error('Confirm each accumulated ban action shown below before completing.');
  let response,completedState;
  // Publication is committed only after the complete licence/identity preflight.
  // A failure after this point remains visible and retryable via the same button.
  response=ticketDeliveryPhase_('completion.export',()=>!board.published?ticketPublishOutcomes_({raceName:c.round.sheetName,hideRows:true,applyPenalties:false}):buildWebsiteTicketExport_(c.ticket));
  const reads=state.reads;
  // Reuse this request's evidence and export reads. Only licence balances and
  // the transfer journal are re-read after writes; no additional browser save.
  reads.published=response.tickets;delete reads.previewRace;
  try{
    const transferBoard=board.published?board:ticketDeliveryBoard_(c,reads,true);
    const ready=transferBoard.cases.filter(t=>!t.applied);
    response.transfer=ticketDeliveryPhase_('completion.transfer',()=>ready.length?applyTicketPenalties_({raceName:c.round.sheetName,tickets:ready.map(t=>({caseId:t.caseId,revision:t.revision}))},{c,reads,board:transferBoard}):transferBoard);
  }catch(e){response.transferError=e.message;reads.boards={};delete reads.licenceNames;delete reads.ledger;delete reads.thresholds;}
  if(!response.transferError&&response.transfer?.cases.every(t=>t.applied&&!t.issue)){
    try{
      const fresh=ticketDeliveryPhase_('completion.banCheck',()=>ticketCompletionState_(c.round.sheetName,{c,reads,board:response.transfer}));
      if(fresh.board.thresholdWarning)throw new Error(fresh.board.thresholdWarning);
      // A transfer must not change the logical threshold actions we reviewed.
      if(fresh.board.banActions.some(a=>!confirmations.has(a.key)))throw new Error('The accumulated bans changed. Review the updated actions below.');
      const changed=ticketDeliveryPhase_('completion.banWrite',()=>ticketCompletionBans_(fresh.c,fresh.board.banActions,input.banRaces||{},reads));
      // Without a ban write there is nothing further to read back. After any
      // write (or failure), rebuild so recorded/revoked bans are reflected.
      if(!changed)completedState=fresh;
    }catch(e){response.transferError=e.message;}
  }
  const final=ticketDeliveryPhase_('completion.response',()=>completedState||ticketCompletionState_(c.round.sheetName,{c,reads})).board;
  response.completion=final;response.transfer=final;response.season=c.round.season;response.publicationPending=true;
  ticketPublicationQueue_(c.round.season,true);
  const unresolved=final.cases.filter(t=>t.issue||!t.applied).length;
  response.message=response.transferError?'Decisions saved; completion needs attention: '+response.transferError:unresolved||final.banActions.length||final.thresholdWarning?'Decisions saved. Resolve the marked items below, then complete the round.':final.cases.some(t=>t.resultsNeeded&&!t.resultsChecked)?'Decisions, licences and bans saved. Only the race-result adjustments below remain.':'Round complete. Decisions, licences and bans are up to date.';
  return response;
}));}
function ticketCompletionBans_(c,actions,races,reads){
  if(!actions.length)return false;
  const sheet=c.licence.bansSheet;let next=Math.max(2,sheet.getLastRow()+1);
  const published=ticketDeliveryPublished_(reads||ticketDeliveryReads_(c.ticket,c.licence));
  if(buildLicenceBans_(sheet,c.round.season).rows.length+actions.filter(a=>a.kind==='add').length>200)throw new Error('Review the Outstanding Bans list before adding more than 200 entries.');
  const writes=actions.map(a=>{
    if(a.kind==='remove'){
      if(JSON.stringify(sheet.getRange(a.row,1,1,7).getDisplayValues()[0])!==JSON.stringify(a.before))throw new Error('A ban changed. Refresh the round before retrying.');
      ticketCaseHistory_(c.ticket.spreadsheet,sheet,a.row,'Accumulated ban removed after revised decisions');
      return {range:sheet.getRange(a.row,1,1,7),values:[Array(7).fill('')],text:true};
    }
    const race=String(races[a.key]||'').trim();if(race.length>100)throw new Error('Keep the race-to-serve description under 100 characters.');
    const t=published.find(t=>t.caseId===a.caseId);
    if(!t)throw new Error('The accumulated ban ticket could not be found.');
    const row=next++;if(row>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),row-sheet.getMaxRows());
    return {range:sheet.getRange(row,1,1,7),values:normaliseLicenceBans_([[String(a.division),a.driver,a.action,race,'No','R'+a.round,'Accumulation of '+a.threshold+' points · R'+a.round+' ticket #'+t.ticketNumber]]),text:true};
  });
  if(writes.length)intakeCommit_(writes);
  return writes.length>0;
}

/** Explicit, case-local name correction. Does not create a profile or alias and
 * never rewrites the archived original appeal decision or prior transfer ledger. */
function matchTicketPenaltyDriver(input){fapAssertEntry_('matchTicketPenaltyDriver');return withTicketProcessingLock_(function(){
  const {c,reads,board}=ticketCompletionState_(input.raceName);
  if(input.revision!==board.completionRevision)throw new Error('This round changed. Check it again before matching the driver.');
  const item=board.cases.find(t=>t.caseId===input.caseId),target=board.drivers.find(d=>d.id===input.driverId);
  if(!item?.unmatchedDriver||!target)throw new Error('Choose one of this season’s driver records for the marked ticket.');
  const old=item.unmatchedDriver,key=v=>String(v||'').trim().toLowerCase(),replace=v=>key(v)===key(old)?target.name:v;
  const source=reads.sources[c.round.sheetName].tickets.find(t=>t.caseId===item.caseId),sheet=findTicketRaceSheet_(c.ticket,c.round.sheetName),writes=[];
  const add=(s,row,col)=>{const range=s.getRange(row,col),value=range.getDisplayValue();if(key(value)===key(old))writes.push({range,values:[[target.name]],text:true});};
  ticketCaseHistory_(c.ticket.spreadsheet,sheet,source.sheetRow,'Driver name before explicit season match');
  add(sheet,source.sheetRow,3);add(sheet,source.sheetRow,5);
  const published=ticketDeliveryPublished_(reads).find(t=>t.caseId===item.caseId&&t.race===c.round.sheetName);
  if(published){ticketCaseHistory_(c.ticket.spreadsheet,c.ticket.websiteSheet,published.sheetRow,'Driver name before explicit season match');[4,6,18].forEach(col=>add(c.ticket.websiteSheet,published.sheetRow,col));}
  if(ticketOutcomeSourceRace_(c.ticket.outcomesSheet)===c.round.sheetName){
    const draft=buildTicketOutcomeWorkspace_(c.ticket,c.round.sheetName).tickets.find(t=>t.caseId===item.caseId);
    if(draft){ticketOutcomeDriverValidation_(c.ticket,c.round.sheetName,draft.sheetRow,draft,replace(draft.driverPunished));add(c.ticket.outcomesSheet,draft.sheetRow,17);}
  }
  // Extras are plain rows; preserve labels, points and history stages verbatim.
  const extras=c.ticket.spreadsheet.getSheetByName('Ticket Additional Penalties');
  if(extras&&extras.getLastRow()>1)extras.getRange(2,1,extras.getLastRow()-1,7).getDisplayValues().forEach((r,i)=>{if(r[0]===c.round.sheetName&&r[1]===item.caseId&&['Outcome','Published'].includes(r[6]))add(extras,i+2,3);});
  intakeCommit_(writes);clearTicketProcessingCaches_(c.round.sheetName);
  if(published)ticketPublicationQueue_(c.round.season,true);
  return ticketCompletionState_(c.round.sheetName).board;
});}
