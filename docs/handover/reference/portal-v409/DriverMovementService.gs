/** Active TEST roster changes. The Master log is authoritative; past results never move. */
const F1XL_MOVEMENTS={name:'Driver Movements',headers:['Movement ID','Recorded at','Driver ID','Driver','From division','From tier','From role','From team','From number','To division','To tier','To role','To team','To number','Effective round','Public reason','Admin notes','Recorded by']};
const F1XL_ASSIGNMENTS={name:'Driver Assignments',headers:['Driver ID','Driver','From round','Through round','Team','Tier','Seat number','Role']};
function driverMovementTable_(book){return preseasonPlacementTable_(book,F1XL_MOVEMENTS);}
function driverMovementTeams_(book){
  const s=book.getSheetByName('Teams & Principals');return s?s.getRange(2,1,F1XL_CAPACITY.teams,8).getDisplayValues():[];
}
/** Existing-driver moves need the roster, not the applications/TT intake. */
function driverMovementContext_(season){
  season=seasonPlanningSeason_(season);const book=seasonPlanningBook_(season),start=book&&book.getSheetByName('Start Here');
  if(!start||String(start.getRange('I7').getDisplayValue()).trim()!=='Active')throw new Error('Open an active season to make this change.');
  const c={season:season,book:book,active:true,count:Number(start.getRange('B5').getValue()),rounds:Number(start.getRange('B4').getValue())};
  if(!Number.isInteger(c.count)||c.count<1||c.count>F1XL_CAPACITY.divisions)throw new Error('Check the active division count in the Master.');
  if(!Number.isInteger(c.rounds)||c.rounds<1||c.rounds>F1XL_CAPACITY.rounds)throw new Error('Check the active round count in the Master.');
  return c;
}
function driverMovementMeasure_(name,work){return typeof fapPerformanceMeasure_==='function'?fapPerformanceMeasure_(name,work):work();}
function driverMovementPhase_(name,work){return typeof fapPerformancePhase_==='function'?fapPerformancePhase_(name,work):work();}
function driverMovementLock_(work){return typeof fapPerformanceLock_==='function'?fapPerformanceLock_(work):withApplicationLock_(work);}
function driverMovementPending_(season,count){
  const value=PropertiesService.getScriptProperties().getProperty('MOVEMENT_PUBLIC_PENDING_'+season);
  if(!value)return [];
  if(value!=='yes'){try{const rows=JSON.parse(value);if(Array.isArray(rows)&&rows.length&&rows.every(d=>Number.isInteger(d)&&d>=1&&d<=count))return rows;}catch(ignore){}}
  // Legacy (or unreadable) queue: refresh every division rather than lose a move.
  return Array.from({length:count},(_,i)=>i+1);
}
function driverMovementAssignment_(division,row,slot,reserve,teams){
  const team=reserve?'Reserve':row[4],t=teams.find(t=>t[0]===team);
  return {division:division,slot:slot,reserve:reserve,team:team,tier:reserve?row[10]:row[5],number:reserve?'':row[0],role:reserve?'Reserve':t&&t[5]==='Free agent team'?'Free agent':'Team seat'};
}
function driverMovementAugment_(c,response){
  const teams=c.teamRows||driverMovementTeams_(c.book),byName={};c.entrantRows.forEach(r=>{if(r[0])byName[intakeName_(r[1])]=r[0];});
  const assignments={};c.lines.forEach(d=>d.rows.forEach((r,i)=>{[false,true].forEach(reserve=>{const id=byName[intakeName_(r[reserve?7:1])];if(id)(assignments[id]||(assignments[id]=[])).push(driverMovementAssignment_(d.division,r,i,reserve,teams));});}));
  response.drivers.forEach(d=>d.assigned=assignments[d.driverId]||[]);
  c.entrantRows.forEach(r=>{if(r[0]&&!response.drivers.some(d=>d.driverId===r[0])){const tracker=c.data.tracker.rows.find(t=>t[1]===r[0]);response.drivers.push({driverId:r[0],gamertag:r[1],assigned:assignments[r[0]]||[],commitment:tracker&&tracker[14]||'',status:'No time trial recorded',complete:false,ready:false,overall:null,one:Array(5).fill(null),two:Array(5).fill(null)});}});
  response.divisions=c.lines.map(d=>({division:d.division,seats:d.rows.map((r,i)=>driverMovementAssignment_(d.division,r,i,false,teams)).filter((a,i)=>!d.rows[i][1]&&a.team&&/^Tier [12]$/.test(a.tier)).map(a=>Object.assign({},a,{tier:Number(a.tier.slice(-1))}))}));
  response.movements=(c.movements||driverMovementTable_(c.book)).rows;
  response.movementRevision=c.movementRevision;
  response.directSources=testLaunchRecord_(c.season).sourceMode===F1XL_DIRECT_SOURCE_MODE;response.movementPublicationPending=!response.directSources&&!!PropertiesService.getScriptProperties().getProperty('MOVEMENT_PUBLIC_PENDING_'+c.season);
  return response;
}
function driverMovementBook_(c,d){const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,d));if(!id)throw new Error('Division '+d+' is not connected.');const b=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(b);assertSeasonWorkbookWritable_(c.season,b);return b;}
/** Fresh roster reply for clients that retain their already loaded TT/application display. */
function driverMovementResponse_(season,includeIntakeLabels){
  const c=activeSeasonPlacementContext_(season,true);
  const drivers=c.entrantRows.filter(r=>r[0]).map(r=>({driverId:r[0],gamertag:r[1],details:{nationality:r[2],platform:r[6],controller:r[7]}}));
  if(includeIntakeLabels){
    // Keep commitment and booking/completion labels on a cold roster load.
    // No plan, TT lap calculations, placement ledger or detail-option rebuild.
    const tracker=intakeReadTable_(c.book,'tracker'),applications=intakeReadTable_(c.book,'applications'),queue=intakeReadTable_(c.book,'trials');
    const byId=new Map(),commitments=new Map();
    queue.rows.forEach(r=>{if(byId.has(r[0]))throw new Error('Duplicate driver in Time Trial Queue. Resolve it before editing trials.');byId.set(r[0],r);});
    tracker.rows.forEach(r=>{if(!commitments.has(r[1]))commitments.set(r[1],intakeTrackerDefaults_(r,applications.rows,tracker.legacy)[14]);});
    drivers.forEach(d=>{const t=byId.get(d.driverId);d.commitment=commitments.get(d.driverId)||'';d.status=t?t[3]:'No time trial recorded';});
  }
  return driverMovementAugment_(c,{season:c.season,url:c.book.getUrl(),rosterOnly:true,rosterMetadata:!!includeIntakeLabels,revision:null,drivers:drivers});
}
/** Inspect real stored values, never UI fallbacks to the current roster. */
function driverMovementHistoryIssues_(rows){
  const type=String(rows[6]&&rows[6][0]||''),legacy=/^(early|legacy)\s+sprint/i.test(type),sprint=/sprint/i.test(type),starts=legacy?[9,37,94]:sprint?[9,37,66,94]:[9,37];
  const labels=legacy?['Qualifying','Sprint','Race']:sprint?['Sprint qualifying','Sprint','Qualifying','Race']:['Qualifying','Race'];
  const issues=[];
  starts.forEach((start,block)=>rows.slice(start-1,start+23).forEach((r,i)=>{
    if(!r[3])return;
    if(!r[4]||/^#/.test(r[4])||r[2]===''&&r[4]!=='Reserve'||/^#/.test(r[2]))issues.push({driver:r[3],row:start+i,session:labels[block]});
  }));return issues;
}
/** One fresh displayed-history request per division. Keep stored values and
 * formulas on the native path below: those are the originals used for rollback
 * and historical seat/team pinning, not calculated display approximations. */
function driverMovementRoundDisplays_(book,sheets){
  const native=()=>sheets.map(s=>resultsEntryRoundValues_(s));
  if(typeof Sheets==='undefined'||!Sheets.Spreadsheets||!Sheets.Spreadsheets.Values||typeof Sheets.Spreadsheets.Values.batchGet!=='function')return native();
  try{
    const heights=sheets.map(s=>Math.min(117,s.getMaxRows())),ranges=sheets.map((s,i)=>"'"+s.getName().replace(/'/g,"''")+"'!A1:G"+heights[i]),result=Sheets.Spreadsheets.Values.batchGet(book.getId(),{ranges:ranges,majorDimension:'ROWS',valueRenderOption:'FORMATTED_VALUE',fields:'valueRanges(range,majorDimension,values)'});
    if(!result||!Array.isArray(result.valueRanges)||result.valueRanges.length!==sheets.length)throw new Error('Incomplete movement history response');
    return sheets.map((s,i)=>{
      const value=result.valueRanges[i],match=value&&typeof value.range==='string'&&value.range.match(/^(?:'((?:[^']|'')*)'|([^!]+))!A1:G(\d+)$/);
      if(!match||(match[1]===undefined?match[2]:match[1].replace(/''/g,"'"))!==s.getName()||Number(match[3])!==heights[i]||value.majorDimension&&value.majorDimension!=='ROWS'||value.values!==undefined&&!Array.isArray(value.values))throw new Error('Incomplete movement history range');
      const rows=value.values||[];
      if(rows.length>heights[i]||rows.some(r=>!Array.isArray(r)||r.length>7||r.some(v=>typeof v!=='string')))throw new Error('Unexpected movement history values');
      return Array.from({length:heights[i]},(_,row)=>Array.from({length:7},(_,col)=>rows[row]&&rows[row][col]!==undefined?rows[row][col]:''));
    });
  }catch(error){
    // Read-only fallback. Discard the entire batch; never mix incomplete API
    // data with native history or reuse a prior request's scan.
    driverMovementPhase_('movement.history.displayFallback',()=>{});return native();
  }
}
function driverMovementScan_(book,rounds){
  const snapshots=[],fingerprint=[];let last=0;
  const sheets=Array.from({length:rounds},(_,i)=>{const s=book.getSheetByName('R'+(i+1));if(!s)throw new Error('Missing R'+(i+1)+'.');return s;});
  const displays=driverMovementPhase_('movement.history.display',()=>driverMovementRoundDisplays_(book,sheets));
  for(let n=1;n<=rounds;n++){
    const s=sheets[n-1],rows=displays[n-1],type=String(rows[6]&&rows[6][0]||''),starts=/^(early|legacy)\s+sprint/i.test(type)?[9,37,94]:/sprint/i.test(type)?[9,37,66,94]:[9,37];
    const issue=driverMovementHistoryIssues_(rows)[0];
    if(issue)throw new Error('R'+n+' '+issue.session+': '+issue.driver+' has an unresolved saved team or seat number. Open Results entry for this division and round, select their name from the driver list and check their historical team before saving. This older result must be corrected to preserve team points when moving drivers. ('+book.getName()+', row '+issue.row+'.)');
    // Read stored values/formulas once per populated round, not once per session.
    // Keep the displayed scan fresh even for future/partial rounds edited manually.
    const populated=starts.filter(start=>rows.slice(start-1,start+23).some(r=>r[3]));
    const first=populated[0],stored=populated.length?driverMovementPhase_('movement.history.originals',()=>seasonPlanningValues_(s.getRange(first,3,populated[populated.length-1]+24-first,3))):null;
    fingerprint.push([n,rows]);starts.forEach(start=>{const block=rows.slice(start-1,start+23);block.forEach((r,i)=>{
      if(r[3]||r[5]||r[6])last=Math.max(last,n);
      if(!r[3])return;
    });if(block.some(r=>r[3])){const range=s.getRange(start,3,24,3),values=stored.slice(start-first,start-first+24).map(r=>r.slice());let changed=false;block.forEach((r,i)=>{if(r[3]){[0,2].forEach(j=>{const old=values[i][j],value=r[j+2];if(typeof old==='string'&&old[0]==='='||String(old)!==String(value))changed=true;values[i][j]=value;});}});if(changed)snapshots.push({range:range,values:values,formulas:true});}});
  }
  return {last:last,writes:snapshots,fingerprint:fingerprint};
}
function driverMovementPrepare_(input){
  // Older open clients can still use their full placement revision until refreshed.
  const focused=!!input.movementRevision,c=driverMovementPhase_('movement.roster',()=>activeSeasonPlacementContext_(input.season,focused));
  if(focused){if(input.movementRevision!==c.movementRevision)throw new Error('The roster changed since it was loaded. Refresh before moving this driver.');}else intakeRequireRevision_(input,c);
  const entrant=c.entrantRows.find(r=>r[0]===input.driverId),driver=entrant?{driverId:entrant[0],gamertag:entrant[1],assigned:[]}:null;
  if(driver)c.lines.forEach(d=>d.rows.forEach((r,i)=>{[false,true].forEach(reserve=>{if(intakeName_(r[reserve?7:1])===intakeName_(driver.gamertag))driver.assigned.push(driverMovementAssignment_(d.division,r,i,reserve,c.teamRows));});}));
  if(!driver||driver.assigned.length!==1)throw new Error('Choose a driver with exactly one current assignment. Resolve duplicate assignments first.');
  const from=driver.assigned[0],division=Number(input.division),tier=Number(input.tier),role=String(input.role||''),team=role==='Reserve'?'Reserve':String(input.team||''),line=c.lines.find(d=>d.division===division),teams=c.teamRows;
  if(!line||![1,2].includes(tier)||!['Reserve','Team seat','Free agent'].includes(role))throw new Error('Choose a division, tier and destination.');
  // Application commitment guides initial placement, not later admin signings.
  // Existing reserves can take a vacant seat without rewriting their application.
  const source=c.lines.find(d=>d.division===from.division),copy=line.rows.map(r=>r.slice());
  if(division===from.division)copy[from.slot][from.reserve?7:1]='';
  const slot=role==='Reserve'?copy.findIndex(r=>!r[7]):copy.findIndex(r=>!r[1]&&r[4]===team&&r[5]==='Tier '+tier);
  if(slot<0)throw new Error('That destination is occupied or unavailable.');
  const to=driverMovementAssignment_(division,copy[slot],slot,role==='Reserve',teams);to.tier='Tier '+tier;
  if(to.role!==role)throw new Error('Choose a team with the matching full-team or free-agent type.');
  if(role!=='Reserve'&&!String(to.number))throw new Error('The destination seat needs its number in Division Line-ups.');
  if(from.division===to.division&&from.team===to.team&&from.tier===to.tier&&from.role===to.role)throw new Error('The driver is already in that assignment.');
  const reason=String(input.reason||'').trim(),notes=String(input.notes||'').trim();if(!reason||reason.length>500||notes.length>5000)throw new Error('Add a public reason (up to 500 characters); private notes can contain up to 5,000.');
  const books={},scans={};driverMovementPhase_('movement.history',()=>[from.division,to.division].forEach(d=>{if(!books[d]){books[d]=driverMovementPhase_('movement.history.open',()=>driverMovementBook_(c,d));scans[d]=driverMovementPhase_('movement.history.scan',()=>driverMovementScan_(books[d],c.rounds));}}));
  const previous=c.movements.rows.filter(r=>r[2]===driver.driverId);
  Object.keys(books).forEach(d=>{const normal=rows=>JSON.stringify(rows.map(r=>r.map(String)));if(normal(driverMovementAssignments_(books[d]))!==normal(driverMovementIntervals_(c.movements.rows,Number(d))))throw new Error('Division '+d+' assignment history differs from the Master movement log. Reconcile those records before moving another driver.');});
  if(previous.length){const recorded=previous[previous.length-1],actual=[from.division,from.tier,from.role,from.team,from.number].map(String);if(JSON.stringify(actual)!==JSON.stringify(recorded.slice(9,14).map(String)))throw new Error('This driver’s current line-up differs from their last recorded move. Reconcile the line-up and movement log first.');}
  const last=Math.max(0,...Object.keys(scans).map(d=>scans[d].last),...previous.map(r=>Number(r[14])-1)),calendar=c.book.getSheetByName('Calendar'),statuses=calendar.getRange(2,5,c.rounds,1).getDisplayValues();
  const minimum=statuses.findIndex((r,i)=>i+1>last&&r[0]!=='Cancelled')+1;
  const effective=Number(input.effectiveRound||minimum);if(!minimum||!Number.isInteger(effective)||effective!==minimum)throw new Error('Moves take effect after all entered rounds in both divisions, at the next scheduled round'+(minimum?' (R'+minimum+').':'. No rounds remain.'));
  driverMovementCheckSeat_(c,to,effective,driver.driverId);
  if(previous.some(r=>Number(r[14])>effective))throw new Error('This driver has a later recorded move. Keep movement rounds in order.');
  const revision=intakeHash_([focused?c.movementRevision:c.revision,input.driverId,from,to,effective,reason,notes,Object.keys(scans).map(d=>scans[d].fingerprint),Object.keys(books).map(d=>books[d].getSheetByName('Data').getRange('A3:G42').getDisplayValues())]);
  return {c:c,driver:driver,from:from,to:to,source:source,line:line,books:books,scans:scans,effective:effective,reason:reason,notes:notes,revision:revision};
}
function driverMovementCheckSeat_(c,to,round,driverId){
  if(to.role==='Reserve')return;
  const intervals=driverMovementIntervals_((c.movements||driverMovementTable_(c.book)).rows,to.division);
  if(intervals.some(r=>r[0]!==driverId&&r[4]===to.team&&r[5]===to.tier&&Number(r[3])>=round))throw new Error('That seat still belongs to another driver for an unentered round. Enter the outstanding results first.');
}
function previewDriverMovement(input){ fapAssertEntry_('previewDriverMovement');return driverMovementMeasure_('movement.preview',()=>{const p=driverMovementPrepare_(input);return {revision:p.revision,effectiveRound:p.effective,from:p.from,to:p.to,driver:p.driver.gamertag,message:'Previous results and team points stay where earned. '+(p.from.division===p.to.division?'Driver points remain in this division.':'Driver points stay in each division; returning resumes the existing record.')};});}
function driverMovementWriteTable_(book,def,rows,writes){
  let sheet=preseasonPlacementTable_(book,def).sheet;const created=!sheet;if(!sheet)sheet=book.insertSheet(def.name);const values=[def.headers].concat(rows),height=Math.max(values.length,sheet.getLastRow());
  while(values.length<height)values.push(def.headers.map(()=>''));const grew=height>sheet.getMaxRows();if(grew)sheet.insertRowsAfter(sheet.getMaxRows(),height-sheet.getMaxRows());
  if(created||grew)sheetPresentationSafely_(function() { sheetPresentationRegister_(sheet); });
  writes.push({range:sheet.getRange(1,1,height,def.headers.length),values:values,text:true});return sheet;
}
/** Pin the lifetime name list; new arrivals append, transfers never remove old identities. */
function driverMovementRetain_(book,name,team,tier,writes){
  const s=book.getSheetByName('Data'),rows=s.getRange('A3:A42').getDisplayValues();if(rows.some(r=>/^#/.test(r[0])))throw new Error('Wait for the division driver list to finish loading.');
  let index=rows.findIndex(r=>intakeName_(r[0])===intakeName_(name));if(index<0){index=rows.findIndex(r=>!r[0]);if(index<0)throw new Error('This division’s lifetime 40-driver list is full.');rows[index]=[name];}
  writes.push({range:s.getRange('A3:A42'),values:rows,text:true});writes.push({range:s.getRange(index+3,4,1,2),values:[[team,tier]],text:true});
}
function driverMovementIntervals_(rows,division){
  const out=[],groups={};rows.forEach(r=>(groups[r[2]]||(groups[r[2]]=[])).push(r));
  Object.keys(groups).forEach(id=>{const events=groups[id],first=events[0];let a={division:Number(first[4]),tier:first[5],role:first[6],team:first[7],number:first[8]},start=1;
    function add(end){if(a.division===division&&start<=end)out.push([id,first[3],start,end,a.team,a.tier,a.number,a.role]);}
    events.forEach(r=>{add(Number(r[14])-1);start=Number(r[14]);a={division:Number(r[9]),tier:r[10],role:r[11],team:r[12],number:r[13]};});add(99);
  });return out;
}
function confirmDriverMovement(input){ fapAssertEntry_('confirmDriverMovement');return driverMovementMeasure_('movement.confirm',()=>driverMovementLock_(function(){
  const p=driverMovementPrepare_(input);if(input.previewRevision!==p.revision)throw new Error('The preview changed. Review the move again before confirming.');
  const c=p.c,writes=[],id='MOVE-'+Utilities.getUuid(),rows=c.movements.rows.concat([[id,new Date().toISOString(),p.driver.driverId,p.driver.gamertag,p.from.division,p.from.tier,p.from.role,p.from.team,p.from.number,p.to.division,p.to.tier,p.to.role,p.to.team,p.to.number,p.effective,p.reason,p.notes,driverDatabaseActor_()]]);
  Object.keys(p.books).forEach(d=>{writes.push(...p.scans[d].writes);const licence=c.licences[Number(d)-1],names=licence.names.map(r=>r.slice());
    if(names.some(r=>/^#/.test(r[0])))throw new Error('Wait for licence names to finish loading.');
    const roster=c.lines.find(l=>l.division===Number(d)).rows.flatMap(r=>[r[1],r[7]]).filter(Boolean);
    if(roster.some(name=>!names.some(r=>intakeName_(r[0])===intakeName_(name))))throw new Error('Division '+d+' licence names are not in sync with the current roster. Refresh its connection before moving drivers.');
    if(!names.some(r=>intakeName_(r[0])===intakeName_(p.driver.gamertag))){const i=names.findIndex(r=>!r[0]);if(i<0)throw new Error('The division licence is full.');names[i]=[p.driver.gamertag];}
    writes.push({range:licence.sheet.getRange('A3:A42'),values:names,text:true});
    const a=Number(d)===p.to.division?p.to:p.from;driverMovementRetain_(p.books[d],p.driver.gamertag,a.team,a.tier,writes);
    driverMovementWriteTable_(p.books[d],F1XL_ASSIGNMENTS,driverMovementIntervals_(rows,Number(d)),writes);
  });
  const lines=c.book.getSheetByName('Division Line-ups');writes.push({range:lines.getRange(p.source.start+p.from.slot,p.from.reserve?8:2),values:[['']],text:true});
  if(p.from.reserve)writes.push({range:lines.getRange(p.source.start+p.from.slot,11),values:[['']],text:true});
  writes.push({range:lines.getRange(p.line.start+p.to.slot,p.to.reserve?8:2),values:[[p.driver.gamertag]],text:true});if(p.to.reserve)writes.push({range:lines.getRange(p.line.start+p.to.slot,11),values:[[p.to.tier]],text:true});
  const i=c.entrantRows.findIndex(r=>r[0]===p.driver.driverId);writes.push({range:c.entries.getRange(i+2,5,1,2),values:[[p.to.team,p.to.tier]],text:true});
  const log=driverMovementWriteTable_(c.book,F1XL_MOVEMENTS,rows,writes);driverMovementPhase_('movement.commit',()=>intakeCommit_(writes));
  const pending=Array.from(new Set(driverMovementPending_(c.season,c.count).concat(Object.keys(p.books).map(Number)))).sort((a,b)=>a-b);
  if(testLaunchRecord_(c.season).sourceMode!==F1XL_DIRECT_SOURCE_MODE)PropertiesService.getScriptProperties().setProperty('MOVEMENT_PUBLIC_PENDING_'+c.season,JSON.stringify(pending));
  // These notes travel with the workbooks, including when FAP is unavailable.
  try{log.setFrozenRows(1);log.getRange('A1').setNote('Permanent movement history. Never delete former division results or licence rows. Numbers identify team seats, not drivers. Record the effective round, old/new division, tier, role, team and number. Public reason is published; Admin notes and Recorded by stay private. For direct-sheet moves: preserve past round C (number) and E (team) values; retain Data A3:A42 lifetime names; append arrivals there; keep licence names on their existing rows; update Division Line-ups and Season Entrants; maintain the affected division Driver Assignments intervals. FAP validates this ledger before further moves.');Object.keys(p.books).forEach(d=>p.books[d].getSheetByName('Driver Assignments').getRange('A1').setNote('Inclusive round ranges for driver assignments. Retain old intervals; use the team-seat number valid for the round. 99 means ongoing. Driver ID remains the same across divisions. Data A3:A42 is a lifetime list: append new drivers; never remove former drivers.'));}catch(ignore){/* The movement itself is already saved. */}
  driverMovementPhase_('movement.cache',()=>{const cache=CacheService.getScriptCache(),keys=[];Object.keys(p.books).forEach(d=>{keys.push(resultsEntryDivisionCacheKey_({season:c.season,division:d}));for(let r=1;r<=c.rounds;r++)keys.push(resultsEntryRoundCacheKey_({season:c.season,division:d},'R'+r));});if(typeof cache.removeAll==='function')cache.removeAll(keys);else keys.forEach(key=>cache.remove(key));});
  // Older open pages still receive the full response they expect. New pages defer
  // unrelated intake/TT reads until those views or detail editors are needed.
  const result=driverMovementPhase_('movement.response',()=>input.rosterReply===true?driverMovementResponse_(c.season):activeSeasonPlacementResponse_(activeSeasonPlacementContext_(c.season)));result.message='Movement saved from R'+p.effective+'. Previous results are retained.'+(result.directSources?' Website reads the working sheets automatically.':' Publishing movement history…');return result;
}));}
/** Only public fields leave the Master. No permanent IDs, actors or admin notes. */
function driverMovementPayload_(book){const rows=driverMovementTable_(book).rows;return {name:'Driver Movements',blocks:[{row:1,column:1,values:[['Date','Driver','From division','From tier','From role','From team','From number','To division','To tier','To role','To team','To number','Effective round','Reason']].concat(rows.map(r=>[r[1],r[3]].concat(r.slice(4,16))))}]};}
function driverMovementPublicConfig_(config,dest){const s=dest.getSheetByName('M Driver Movements');if(s){testLaunchSetConfig_(config.getSheetByName('Main'),'driver_movements_sheet',dest.getId());testLaunchSetConfig_(config.getSheetByName('Main'),'driver_movements_gid',s.getSheetId());}}
function publishDriverMovements(input){ fapAssertEntry_('publishDriverMovements');return driverMovementMeasure_('movement.publish',()=>driverMovementLock_(function(){
  const c=driverMovementContext_(input.season),record=testLaunchRecord_(c.season);if(record.sourceMode===F1XL_DIRECT_SOURCE_MODE)return {message:'Movement saved. The website reads the working sheets automatically.',publicationPending:false};if(!record.exportId||record.pendingId)throw new Error('Finish the website update before publishing movements. The move is already saved.');
  const config=testLaunchConfig_(),main=config.getSheetByName('Main'),active=websiteConfigFindKeyCell_(main,'active_test_season');if(!active||String(active.offset(0,1).getValue())!==c.season)throw new Error('The website is showing another season.');
  const dest=testLaunchExport_(record.exportId,c.season);testLaunchWritePayload_(dest,'M ',[driverMovementPayload_(c.book)]);driverMovementPublicConfig_(config,dest);websiteConfigClearCache_();
  const pending=driverMovementPending_(c.season,c.count),result=testLaunchAfterSave_(c.season,{roster:pending,licences:pending.length>0},{message:'Movement history published.'});
  if(!result.publicationPending)PropertiesService.getScriptProperties().deleteProperty('MOVEMENT_PUBLIC_PENDING_'+c.season);
  return result;
}));}
/** Local workbook history keeps old-round edits independent of the current seat. */
function driverMovementAssignments_(book){return preseasonPlacementTable_(book,F1XL_ASSIGNMENTS).rows;}
function driverMovementRoundAssignment_(book,name,round,savedRows){const rows=(savedRows||driverMovementAssignments_(book)).filter(r=>intakeName_(r[1])===intakeName_(name));if(!rows.length)return null;const r=rows.find(r=>round>=Number(r[2])&&round<=Number(r[3]));return r?{team:r[4],tier:r[5],number:r[6],role:r[7]}:{absent:true};}
