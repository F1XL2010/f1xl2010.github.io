/** Permanent ticket workbook: season connections and round hand-off live in cells,
 * not Script Properties. Sources remain private and no triggers are installed. */
const F1XL_TICKET_SEASONS = Object.freeze({
  registry:'Ticket Seasons', rounds:'Ticket Rounds', guide:'Ticket Start Here', log:'Submission Log',
  headers:['Season','Master ID','Divisions','Rounds','Drivers tab','Licences tab','Calendar tab','Prepared at'],
  roundHeaders:['Season','Round','Track','Race date','Tickets / defence close (UK)','Stewards due (UK)','Appeal window hours','Released at','Published at','Appeals close (UK)','State','Race tab','Admin notes'],
  logHeaders:['Submission ID','Race tab','Case ID','Type','Processed at','Description','Evidence 1','Evidence 2','Evidence 3','Evidence 4','Original response JSON','State']
});
function ticketSeasonBook_() {
  const b=SpreadsheetApp.openById(F1XL_TICKET_PROCESSING_SOURCE.spreadsheetId);
  if(!/^TEST\b/i.test(fapWorkbookLegacyName_(b.getName())))throw new Error('Ticket setup is restricted to the TEST processing workbook.');
  return b;
}
function ticketSeasonMaster_(season) {
  season=seasonPlanningSeason_(season);const b=seasonPlanningBook_(season);
  if(!b||!/^TEST\b/i.test(fapWorkbookLegacyName_(b.getName())))throw new Error('Choose a connected TEST Season Master.');
  const s=b.getSheetByName('Start Here');
  if(!s||String(s.getRange('B3').getValue())!==String(season))throw new Error('Master season does not match.');
  const divisions=Number(s.getRange('B5').getValue()),rounds=Number(s.getRange('B4').getValue());
  if(!Number.isInteger(divisions)||divisions<1||divisions>F1XL_CAPACITY.divisions)throw new Error('Confirm the divisions before preparing ticket connections.');
  if(!Number.isInteger(rounds)||rounds<1||rounds>F1XL_CAPACITY.rounds)throw new Error('Check the Master round count.');
  ['Season Entrants','Summary','Calendar'].forEach(n=>{if(!b.getSheetByName(n))throw new Error('Master is missing '+n+'.');});
  return {season:String(season),book:b,divisions:divisions,rounds:rounds};
}
function ticketSheetRows_(sheet,width) {
  return sheet&&sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,width).getDisplayValues():[];
}
function ticketSeasonRecord_(book,season) {
  const matches=ticketSheetRows_(book.getSheetByName(F1XL_TICKET_SEASONS.registry),8).filter(r=>r[0]===String(season));
  if(matches.length>1)throw new Error('Duplicate season entries in Ticket Seasons; resolve them in the workbook.');
  return matches[0]||null;
}
function ticketColumn_(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function ticketCaseHistory_(book,sheet,row,action){
  const log=ticketSetupTable_(book,'Ticket History',['Recorded at','Action','Source tab','Source row','Original values JSON','Original formulas JSON']);
  const width=sheet.getName()==='Website Export'?32:Math.min(85,sheet.getMaxColumns()),range=sheet.getRange(row,1,1,width);
  log.getRange(log.getLastRow()+1,1,1,6).setValues([[new Date().toISOString(),action,sheet.getName(),row,JSON.stringify(range.getValues()[0]),JSON.stringify(range.getFormulas()[0])]]);
}
function ticketSeasonSources_(c) {
  return [
    {name:'S'+c.season+' Ticket Drivers',source:'Season Entrants',range:'A1:H501',rows:501,cols:8},
    {name:'S'+c.season+' Ticket Licences',source:'Summary',range:'A1:'+ticketColumn_(c.divisions*4-1)+'46',rows:46,cols:c.divisions*4-1},
    {name:'S'+c.season+' Ticket Calendar',source:'Calendar',range:'A1:E'+(c.rounds+1),rows:c.rounds+1,cols:5}
  ].map(s=>Object.assign(s,{formula:'=IMPORTRANGE("'+c.book.getId()+'","\''+s.source+'\'!'+s.range+'")'}));
}
function ticketSeasonCheck_(c,book,structureOnly) {
  const record=ticketSeasonRecord_(book,c.season),issues=[],sources=ticketSeasonSources_(c);
  if(!record)issues.push('Prepare this season’s ticket connections.');
  else if(record[1]!==c.book.getId()||Number(record[2])!==c.divisions||Number(record[3])!==c.rounds)issues.push('The Master or season size changed. Review Ticket Seasons before reconnecting.');
  sources.forEach(s=>{
    const tab=book.getSheetByName(s.name);s.url=tab?book.getUrl()+'#gid='+tab.getSheetId():'';
    if(!tab){issues.push('Missing '+s.name+'.');return;}
    if(tab.getRange('A1').getFormula()!==s.formula){issues.push(s.name+': connection formula differs from this Master.');return;}
    if(structureOnly===true)return;
    const values=tab.getRange(1,1,s.rows,s.cols).getDisplayValues();
    const expected=c.book.getSheetByName(s.source).getRange(1,1,s.rows,s.cols).getDisplayValues();
    if(values.some(r=>r.some(v=>/^#(REF!|N\/A|VALUE!|ERROR!|NAME\?|DIV\/0!|NUM!)/.test(v))))issues.push(s.name+': open A1 and allow access, or resolve the displayed source error.');
    else if(JSON.stringify(values)!==JSON.stringify(expected))issues.push(s.name+': waiting for imported values to match the Master.');
  });
  return {season:c.season,ready:issues.length===0,issues:issues,sources:sources.map(s=>({name:s.name,url:s.url})),url:book.getUrl(),masterUrl:c.book.getUrl(),prepared:!!record,
    revision:ticketProcessingRevision_([c.season,c.book.getId(),c.divisions,c.rounds,record,sources.map(s=>s.formula)])};
}
function getTicketSeasonSetup(input) { fapAssertEntry_('getTicketSeasonSetup');
  const c=ticketSeasonMaster_(input.season),b=ticketSeasonBook_(),status=ticketSeasonCheck_(c,b);
  status.rounds=ticketSheetRows_(b.getSheetByName(F1XL_TICKET_SEASONS.rounds),13).map((r,i)=>ticketRoundResponse_(r,i+2)).filter(r=>r.season===c.season);
  if(typeof ticketFormStatus_==='function')status.form=ticketFormStatus_(c.season);
  return status;
}
/** Navigation needs registered rounds and connection identities, not an audit
 * of every imported value. Explicit setup/Refresh and write gates stay full. */
function ticketSeasonNavigation_(season,book){
  const c=ticketSeasonMaster_(season),b=book||ticketSeasonBook_(),status=ticketSeasonCheck_(c,b,true);
  status.connectionsReady=status.ready;status.ready=false;status.navigationOnly=true;
  status.rounds=ticketSheetRows_(b.getSheetByName(F1XL_TICKET_SEASONS.rounds),13).map((r,i)=>ticketRoundResponse_(r,i+2)).filter(r=>r.season===c.season);
  return status;
}
// Opening Tickets is a frequent operational action. The exact connection check
// remains available in Season connections; this short cache avoids reopening
// every imported Master range whenever an admin merely checks the inbox.
function getTicketSeasonSetupCached_(input){
  const season=String(input&&input.season||'');
  const cache=CacheService.getScriptCache(),key='F1XL_TICKET_SEASON_SETUP_V1_'+season;
  if(input&&input.forceRefresh===true)cache.remove(key);
  const cached=cache.get(key);if(cached)return JSON.parse(cached);
  const response=getTicketSeasonSetup({season:season});
  cacheTicketProcessingResponse_(cache,key,response);
  return response;
}
function clearTicketSeasonSetupCache_(season){CacheService.getScriptCache().remove('F1XL_TICKET_SEASON_SETUP_V1_'+String(season||''));}
function ticketSetupTable_(book,name,headers) {
  let s=book.getSheetByName(name);
  if(s){if(JSON.stringify(s.getRange(1,1,1,headers.length).getDisplayValues()[0])!==JSON.stringify(headers))throw new Error(name+' has unexpected headers. Nothing in that tab was replaced.');return s;}
  s=book.insertSheet(name);s.getRange(1,1,1,headers.length).setValues([headers]).setBackground('#173d32').setFontColor('#ffffff').setFontWeight('bold');s.setFrozenRows(1);
  s.setColumnWidths(1,headers.length,155);return s;
}
function prepareTicketSeason(input) { fapAssertEntry_('prepareTicketSeason');
  return withTicketProcessingLock_(function(){
    const c=ticketSeasonMaster_(input.season),b=ticketSeasonBook_(),before=ticketSeasonCheck_(c,b);
    if(input.revision!==before.revision)throw new Error('Season setup changed. Refresh before preparing connections.');
    const record=ticketSeasonRecord_(b,c.season);
    if(record&&(record[1]!==c.book.getId()||Number(record[2])!==c.divisions||Number(record[3])!==c.rounds))throw new Error('This season is already registered with different settings. Review the existing connection; it has not been replaced.');
    // Check all destinations before creating anything; retries only fill missing setup.
    const sources=ticketSeasonSources_(c);
    sources.forEach(s=>{const t=b.getSheetByName(s.name);if(t&&t.getRange('A1').getFormula()!==s.formula)throw new Error(s.name+' already exists with different contents. It has not been overwritten.');});
    const registry=ticketSetupTable_(b,F1XL_TICKET_SEASONS.registry,F1XL_TICKET_SEASONS.headers);
    const rounds=ticketSetupTable_(b,F1XL_TICKET_SEASONS.rounds,F1XL_TICKET_SEASONS.roundHeaders);
    ticketSetupTable_(b,F1XL_TICKET_SEASONS.log,F1XL_TICKET_SEASONS.logHeaders);
    ticketSeasonGuide_(b);
    sources.forEach(s=>{if(b.getSheetByName(s.name))return;const t=b.insertSheet(s.name);if(t.getMaxColumns()<s.cols)t.insertColumnsAfter(t.getMaxColumns(),s.cols-t.getMaxColumns());t.getRange('A1').setFormula(s.formula).setNote('Live read-only import from this season’s Master. Click Allow access if requested. Do not type inside the imported table.');t.setFrozenRows(1);});
    const existing=ticketSheetRows_(rounds,13),calendar=c.book.getSheetByName('Calendar').getRange(2,1,c.rounds,5).getValues();
    calendar.forEach((r,i)=>{
      if(existing.some(x=>x[0]===c.season&&Number(x[1])===i+1))return;
      const date=ticketDateOnly_(r[2]);
      rounds.getRange(rounds.getLastRow()+1,1,1,13).setValues([[c.season,i+1,String(r[3]||''),date,'','','','','','',String(r[4]).toLowerCase()==='cancelled'?'Cancelled':'Collecting','','']]);
    });
    rounds.getRange(2,5,Math.max(1,rounds.getLastRow()-1),2).setNumberFormat('@');
    if(!record)registry.getRange(registry.getLastRow()+1,1,1,8).setValues([[c.season,c.book.getId(),c.divisions,c.rounds,sources[0].name,sources[1].name,sources[2].name,new Date().toISOString()]]);
    SpreadsheetApp.flush();clearTicketSeasonSetupCache_(c.season);clearTicketProcessingCaches_();return getTicketSeasonSetup({season:c.season});
  });
}
function ticketSeasonGuide_(book) {
  const rounds=book.getSheetByName(F1XL_TICKET_SEASONS.rounds);
  if(rounds){
    rounds.getRange('E1').setNote('Optional weekly reminder, YYYY-MM-DD HH:mm, Europe/London. Tickets and defence share it. This does not block processing.');
    rounds.getRange('F1').setNote('Optional weekly review reminder. This does not block reviews or outcomes.');
    rounds.getRange('G1').setNote('Optional hours after publication to suggest the appeal closing reminder when J is blank. Leave blank for no automatic reminder.');
    rounds.getRange('J1').setNote('Optional appeal submission reminder, editable at any time. Appeals review has no fixed deadline.');
    rounds.getRange('K1').setNote('Collecting, Released, Published or Cancelled. No release or deadline is required to process submissions or enter reviews.');
  }
  const existing=book.getSheetByName(F1XL_TICKET_SEASONS.guide);
  if(existing){
    // Migrate only our exact old instructions; retain manually edited guidance.
    const replacements=[
      ['2. Round deadlines','Ticket Rounds holds editable UK dates/times: YYYY-MM-DD HH:mm. Tickets and defence close Monday 21:00 by default. Enter a real steward deadline (normally Thursday PM). Appeals normally close publication +24 hours; appeals review has no fixed cutoff.','2. Weekly reminders','Choose the round when working on that week’s tickets. Ticket Rounds can hold optional UK reminders: YYYY-MM-DD HH:mm. Leave them blank or change them as needed. Dates never block intake, reviews or outcomes.'],
      ['5. Release','When tickets/defence close, finish checking cases, set a steward deadline, then mark the Ticket Rounds row Released and record the release time. Appeals reviewers use AW:BT in this same workbook. No external appeals copy is required.','5. Review hand-off','Admins decide when cases are ready for review. No deadline or Released status is required. Appeals reviewers use AW:BT in this same workbook. No external appeals copy is required.']
      ,['6. Reviews and final outcomes','Stewards enter penalty, seconds, at-fault driver and reasoning. Clearly record a recusal for own-team cases. Review all required judgements before finalising. Ticket Outcomes (new) is shared staging: save a copy before reusing it. Never treat a blank decision as No Further Action.','6. Reviews and final outcomes','Stewards enter penalty, seconds, at-fault driver and reasoning. Mark completion in BX:CB for stewards, CC:CG for appeals: Submitted when complete, Recused with a reason for own-team cases, otherwise Draft. FAP outcome switching keeps saved decisions per race; when switching manually in Sheets, first save a copy of Ticket Outcomes (new). Never treat a blank decision as No Further Action.']
    ];
    ticketSheetRows_(existing,2).forEach((r,i)=>{const match=replacements.find(m=>m[0]===r[0]&&m[1]===r[1]);if(match)existing.getRange(i+2,1,1,2).setValues([[match[2],match[3]]]);});
    return;
  }
  const s=ticketSetupTable_(book,F1XL_TICKET_SEASONS.guide,['Step','Working directly in Google Sheets']);
  const rows=[
    ['Purpose','This is the permanent '+(/^TEST\s*-/i.test(fapWorkbookLegacyName_(book.getName()))?'TEST ':'')+'ticket workbook. Keep it across seasons. The Season Master supplies roster, calendar and licence balances; ticket evidence and votes stay here.'],
    ['1. Season connections','Ticket Seasons records each Master. Each season has its own Drivers, Licences and Calendar import tabs. Open A1 and Allow access. Preparing next season must not repoint the current season.'],
    ['2. Weekly reminders','Choose the round when working on that week’s tickets. Ticket Rounds can hold optional UK reminders: YYYY-MM-DD HH:mm. Leave them blank or change them as needed. Dates never block intake, reviews or outcomes.'],
    ['3. Create a race manually','Copy Template. Name it Sxx Rn Track, then enter that exact name in Ticket Rounds column L. Keep one row per incident. Columns A:BT keep their original evidence and reviewer layout. Use unique permanent Case IDs in BU for new workflow cases; do not renumber those IDs after sorting.'],
    ['4. Process intake','Copy the original twelve response values to the response Archive before deleting a source row. Copy case details into B:K, defence into L:P, appeal into AQ:AU. Keep all original evidence, including a fourth appeal link in the description if needed. Submission Log records FAP imports and prevents duplicate imports.'],
    ['5. Review hand-off','Admins decide when cases are ready for review. No deadline or Released status is required. Appeals reviewers use AW:BT in this same workbook. No external appeals copy is required.'],
    ['6. Reviews and final outcomes','Stewards enter penalty, seconds, at-fault driver and reasoning. Mark completion in BX:CB for stewards, CC:CG for appeals: Submitted when complete, Recused with a reason for own-team cases, otherwise Draft. FAP outcome switching keeps saved decisions per race; when switching manually in Sheets, first save a copy of Ticket Outcomes (new). Never treat a blank decision as No Further Action.'],
    ['7. Website and appeals','Website Export is the website source, including admin decisions. Saving completed final decisions in the portal updates it. For manual work, copy approved final values here. Record an appeal against its original case and update that case’s final outcome; preserve the original judgement.'],
    ['8. Licence / results','Completing final decisions in the portal applies licence penalties and updates Website Export. Adjust affected finishing times/order in the division’s round sheet. For a Sheets-only workflow, enter final licence points/time in the Master’s Division tab and update the division’s round results.'],
    ['TP Hub','The separate Team Principal Hub shows team tickets and evidence. Stewards and appeals reviewers use their own restricted review area; head stewards use Tickets for oversight and final decisions.'],
    ['Legacy tabs','Existing old race tabs, reference imports and published rows are retained. New-season final-outcome formulas use that season’s licence source. Old reference imports are not proof of a new season being connected.']
  ];s.getRange(2,1,rows.length,2).setValues(rows).setWrap(true);s.setColumnWidth(1,190);s.setColumnWidth(2,850);
  sheetPresentationSafely_(function() { sheetPresentationTicketGuide_(s); });
}
function ticketDateOnly_(value) {
  if(value instanceof Date&&!isNaN(value.getTime()))return Utilities.formatDate(value,'Europe/London','yyyy-MM-dd');
  const s=String(value||'').trim(),m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);const date=m?m[3]+'-'+m[2]+'-'+m[1]:s;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw new Error('Race date is missing or invalid. Check the Master Calendar.');return date;
}
function ticketDefaultClose_(date) {
  const d=new Date(date+'T12:00:00Z'),days=(8-d.getUTCDay())%7||7;d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)+' 21:00';
}
function ticketUkInstant_(text) {
  if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(text)))throw new Error('Use YYYY-MM-DD HH:mm for UK deadlines.');
  const guess=Date.parse(text.replace(' ','T')+':00Z');if(!Number.isFinite(guess))throw new Error('Invalid deadline.');
  for(const offset of [0,60]){const date=new Date(guess-offset*60000);if(Utilities.formatDate(date,'Europe/London','yyyy-MM-dd HH:mm')===text)return date;}
  throw new Error('That UK date/time does not exist. Check the daylight-saving clock change.');
}
function ticketRoundResponse_(r,row){return {row:row,season:r[0],round:Number(r[1]),track:r[2],date:r[3],closes:r[4],stewardsDue:r[5],appealHours:r[6]===''?'':Number(r[6]),releasedAt:r[7],publishedAt:r[8],appealsClose:r[9],state:r[10],sheetName:r[11],notes:r[12],revision:ticketProcessingRevision_(r)};}
function ticketRoundForSheet_(book,name) {
  const rows=ticketSheetRows_(book.getSheetByName(F1XL_TICKET_SEASONS.rounds),13),matches=rows.map((r,i)=>ticketRoundResponse_(r,i+2)).filter(r=>r.sheetName===name);
  if(matches.length>1)throw new Error('Two Ticket Rounds entries refer to this race tab. Resolve the duplicate.');return matches[0]||null;
}
function saveTicketRound(input) { fapAssertEntry_('saveTicketRound');
  return withTicketProcessingLock_(function(){
    const b=ticketSeasonBook_(),s=b.getSheetByName(F1XL_TICKET_SEASONS.rounds),row=Number(input.row);
    if(!s||!Number.isInteger(row)||row<2||row>s.getLastRow())throw new Error('Choose an existing round.');
    const r=s.getRange(row,1,1,13).getDisplayValues()[0];
    if(ticketProcessingRevision_(r)!==input.revision)throw new Error('Round details changed. Refresh before saving.');
    if(input.closes)ticketUkInstant_(input.closes);
    if(input.stewardsDue)ticketUkInstant_(input.stewardsDue);
    const hours=input.appealHours==null||input.appealHours===''?'':Number(input.appealHours);
    if(hours!==''&&(!Number.isFinite(hours)||hours<=0||hours>168))throw new Error('Leave the appeal reminder window blank, or enter more than zero up to 168 hours.');
    if(input.appealsClose)ticketUkInstant_(input.appealsClose);
    r[4]=input.closes||'';r[5]=input.stewardsDue||'';r[6]=hours;r[9]=input.appealsClose||'';r[12]=String(input.notes||'');
    s.getRange(row,1,1,13).setValues([r]);ticketSeasonGuide_(b);clearTicketSeasonSetupCache_(r[0]);clearTicketProcessingCaches_(r[11]);return getTicketSeasonSetup({season:r[0]});
  });
}
function createTicketRoundWorkspace(input) { fapAssertEntry_('createTicketRoundWorkspace');
  return withTicketProcessingLock_(function(){
    const c=ticketSeasonMaster_(input.season),b=ticketSeasonBook_(),check=ticketSeasonCheck_(c,b);
    if(!check.ready)throw new Error(check.issues.join(' '));
    const s=b.getSheetByName(F1XL_TICKET_SEASONS.rounds),rows=ticketSheetRows_(s,13),index=rows.findIndex(r=>r[0]===c.season&&Number(r[1])===Number(input.round));
    if(index<0)throw new Error('Prepare the round first.');const r=rows[index];
    if(r[10]==='Cancelled')throw new Error('This round is cancelled.');
    const current=c.book.getSheetByName('Calendar').getRange(Number(input.round)+1,1,1,5).getValues()[0];
    if(String(current[4]).toLowerCase()==='cancelled')throw new Error('This round is cancelled in the Master.');
    ticketSeasonGuide_(b);
    if(r[11]){if(!b.getSheetByName(r[11]))throw new Error('The registered race tab is missing. Restore it before continuing.');return {sheetName:r[11],season:c.season};}
    const name=('S'+c.season+' R'+r[1]+' '+String(current[3]||'Race').replace(/[:\\/?*\[\]]/g,'-')).slice(0,100);
    // Do not overwrite a matching tab after an interrupted copy; let an admin inspect it.
    const template=b.getSheetByName('Template');if(!template)throw new Error('Template is missing.');
    if(b.getSheetByName(name))throw new Error(name+' already exists. Link it in Ticket Rounds after inspection.');
    const t=template.copyTo(b).setName(name).showSheet();
    if(t.getMaxColumns()<85)t.insertColumnsAfter(t.getMaxColumns(),85-t.getMaxColumns());
    t.getRange('BU1:BW1').setValues([['Case ID','Submission ID','Session']]).setBackground('#173d32').setFontColor('#ffffff');
    t.getRange('BU1').setNote('Permanent case identity. Sort whole rows including BU:CG; do not move evidence away from its case ID and reviewer states.');
    t.getRange(1,76,1,10).setValues([Array.from({length:10},(_,i)=>(i<5?'Steward ':'Appeals ')+(i%5+1)+' state')]);
    ticketReviewSheetHints_(t);
    t.getRange(2,76,49,10).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Draft','Submitted','Recused'],true).setAllowInvalid(false).build());
    sheetPresentationSafely_(function() { sheetPresentationTicketRound_(t); });
    r[2]=String(current[3]);r[3]=ticketDateOnly_(current[2]);r[11]=name;s.getRange(index+2,1,1,13).setValues([r]);clearTicketSeasonSetupCache_(c.season);clearTicketProcessingCaches_();return {sheetName:name,season:c.season};
  });
}
function ticketReviewReady_(sheet) {
  const round=ticketRoundForSheet_(sheet.getParent(),sheet.getName());if(!round)return;
  const rows=sheet.getRange(2,1,49,85).getDisplayValues().filter(r=>r[1]);
  if(!rows.length)throw new Error('There are no cases in this round.');
  rows.forEach((r,i)=>{
    const states=r.slice(75,80);if(states.some(s=>!['Submitted','Recused'].includes(s)))throw new Error('Ticket '+(r[0]||i+1)+': each steward must submit or record a recusal before final outcomes.');
    // Admin-issued decisions may have all five stewards recused; their final
    // outcome is still validated by the normal outcome/publication checks.
    const adminIssued=String(r[2]||'').trim().toLowerCase()==='admins';
    if(!states.includes('Submitted')&&!adminIssued)throw new Error('Ticket '+(r[0]||i+1)+': all stewards are recused. A submitted steward judgement is required for a non-admin ticket.');
    states.forEach((state,index)=>{const column=F1XL_STEWARD_REVIEW_COLUMNS[index]-1;if(!r[column+3]||(state==='Submitted'&&!r[column]))throw new Error('Ticket '+(r[0]||i+1)+': a completed review needs its decision/reasoning, and a recusal needs a reason.');});
  });
}
function ticketOutcomeFormulas_(context,raceSheet) {
  const s=context.outcomesSheet,round=ticketRoundForSheet_(context.spreadsheet,raceSheet.getName());
  // Saved rounds can retain an older dropdown. Refresh it from the same
  // penalty catalogue used by the points formula when reopening outcomes.
  const penaltySheet=context.licenceSheet||context.spreadsheet.getSheetByName(F1XL_TICKET_PROCESSING_SOURCE.licenceSheetName);
  const penaltyLabels=penaltySheet.getRange(1,5,Math.min(13,penaltySheet.getLastRow()),1).getDisplayValues().flat().filter(Boolean);
  s.getRange('S2:S50').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(penaltyLabels,true).setAllowInvalid(false).build());
  ticketAdditionalSheet_(context.spreadsheet,true);
  ticketReviewUsageGuide_(context.spreadsheet);
  const extra=function(driver,row,prior){if(prior&&row===2)return '0';const p="'Ticket Additional Penalties'!",identity=prior?'ISNUMBER(MATCH('+p+'B$2:B,$AA$2:AA'+(row-1)+',0))':p+'B$2:B=$AA'+row;return 'IFERROR(SUM(FILTER('+p+'E$2:E,'+p+'A$2:A="'+raceSheet.getName().replace(/"/g,'""')+'",'+p+'C$2:C='+driver+','+p+'G$2:G="Outcome",'+identity+')),0)';};
  let balance=function(name){return 'SUMIF(\'License Copy\'!A:A,'+name+',\'License Copy\'!B:B)';};
  if(round){
    const record=ticketSeasonRecord_(context.spreadsheet,round.season);if(!record)throw new Error('Ticket season connection is missing.');
    const snapshotName='Opening licences '+raceSheet.getSheetId();
    let snapshot=context.spreadsheet.getSheetByName(snapshotName);
    if(!snapshot){
      const check=ticketSeasonCheck_(ticketSeasonMaster_(round.season),context.spreadsheet);if(!check.ready)throw new Error(check.issues.join(' '));
      const original=context.spreadsheet.getSheetByName(record[5]),values=original.getRange(1,1,46,Number(record[2])*4-1).getValues();
      for(let d=0;d<Number(record[2]);d++)for(let row=2;row<46;row++)if(values[row][d*4]&&(values[row][d*4+1]===''||!Number.isFinite(Number(values[row][d*4+1]))))throw new Error('Connect and verify the Master licence totals before preparing outcomes.');
      snapshot=context.spreadsheet.insertSheet(snapshotName);if(snapshot.getMaxColumns()<values[0].length)snapshot.insertColumnsAfter(snapshot.getMaxColumns(),values[0].length-snapshot.getMaxColumns());
      snapshot.getRange(1,1,46,values[0].length).setValues(values);snapshot.getRange('A1').setNote('Opening licence balances for '+raceSheet.getName()+', captured '+new Date().toISOString()+'. Kept fixed so manual penalty application does not count twice. Review before using if earlier penalties were already applied.');
      snapshot.hideSheet();
    }
    if(!snapshot.getRange('A1').getDisplayValue())throw new Error('The opening licence snapshot is incomplete. Inspect it before preparing outcomes again.');
    const source="'"+snapshotName+"'!";
    balance=function(name){const sums=[];for(let d=0;d<Number(record[2]);d++)sums.push('SUMIF('+source+ticketColumn_(d*4+1)+'3:'+ticketColumn_(d*4+1)+'46,'+name+','+source+ticketColumn_(d*4+2)+'3:'+ticketColumn_(d*4+2)+'46)');return sums.join('+');};
  }
  const formulas=[];
  for(let row=2;row<=50;row++){
    const prior= row===2?'0':'SUMIF($Q$2:Q'+(row-1)+',C'+row+',$R$2:R'+(row-1)+')';
    const offenderPrior=row===2?'0':'SUMIF($Q$2:Q'+(row-1)+',E'+row+',$R$2:R'+(row-1)+')';
    formulas.push({row:row,number:'=IF(B'+row+'="","",\''+raceSheet.getName().replace(/'/g,"''")+'\'!A'+row+')',points:'=IF(S'+row+'="","",IF(COUNTIF(\'License Copy\'!E$1:E$13,S'+row+')=0,"CHECK PENALTY",IF(COUNTIFS(\'License Copy\'!E$1:E$13,S'+row+',\'License Copy\'!F$1:F$13,"<>")=0,"CHECK POINTS",VLOOKUP(S'+row+',\'License Copy\'!E$1:F$13,2,FALSE))))',
      own:'=IF(B'+row+'="","",SUM(IF(Q'+row+'=C'+row+',R'+row+',0),'+extra('C'+row,row,false)+'))',total:'=IF(B'+row+'="","",SUM(U'+row+','+balance('C'+row)+','+prior+','+extra('C'+row,row,true)+'))',
      other:'=IF(B'+row+'="","",SUM(IF(Q'+row+'=E'+row+',R'+row+',0),'+extra('E'+row,row,false)+'))',otherTotal:'=IF(B'+row+'="","",SUM(X'+row+','+balance('E'+row)+','+offenderPrior+','+extra('E'+row,row,true)+'))'});
  }
  [['A','number'],['R','points'],['U','own'],['V','total'],['X','other'],['Y','otherTotal']].forEach(pair=>s.getRange(pair[0]+'2:'+pair[0]+'50').setFormulas(formulas.map(f=>[f[pair[1]]])));
}
function ticketReviewUsageGuide_(book){
  ticketSeasonGuide_(book);
  const guide=book.getSheetByName(F1XL_TICKET_SEASONS.guide),current=ticketSheetRows_(guide,2);
  const notes=[
    ['Ticket numbering','Process cases in division order, numbering Division 1 first and continuing through the other divisions. The FAP assigns these numbers on processing and when opening Stewarding. If working only in Sheets, sort complete rows including BU:CG, then update A. Never alter permanent Case IDs in BU. Once outcomes are published, keep existing numbers and append late cases.'],
    ['Own-team recusals','Clear that reviewer’s penalty, time and at-fault fields. Write Own-team conflict and the team name in Comments, then set their state to Recused in BX:CB (or CC:CG for appeals). A later defence reopens decisions but retains recusals. The FAP Team conflicts window performs this for selected tickets.'],
    ['Multiple drivers','Separate at-fault driver names with semicolons in the reviewer block and explain any different recommended penalties in the reasoning. Keep the first final penalty in Ticket Outcomes (new). Put each additional recipient in Ticket Additional Penalties: race tab name, permanent case ID from BU, driver, licence penalty, numeric points matching License Copy, time penalty, and Stage Outcome. Do not duplicate the primary driver. This table remains editable without the FAP.'],
    ['Publishing additional penalties','FAP publication copies extra recipients to Stage Published and includes every extra penalty in the written evaluation in Website Export. The original A:AF fields remain compatible; AG retains the case ID. When publishing manually, preserve the Outcome rows, copy them as Published, copy the permanent ID to AG, and include all recipients and their individual points/time penalties in the published write-up. Appeals amend Published rows and the existing exported write-up; apply licence/results corrections manually.']
  ];
  notes.forEach(note=>{const index=current.findIndex(r=>r[0]===note[0]);if(index<0)guide.getRange(guide.getLastRow()+1,1,1,2).setValues([note]);else if(current[index][1]!==note[1])guide.getRange(index+2,1,1,2).setValues([note]);});
}
