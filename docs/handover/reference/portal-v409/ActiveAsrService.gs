/** Season-linked TEST All Star Race. Template is copied, never written to.
 * Operational tables remain editable in Sheets; race/team points are formulas.
 * No public sharing, championship writes, or automatic invitation messages. */
const F1XL_ACTIVE_ASR={prefix:'F1XL_ACTIVE_ASR_',version:'1',tabs:{
  'ASR Setup':['Setting','Value'],
  'ASR Allocations':['Division','Places'],
  'ASR Top Ten':['Division','Position','Driver ID','Driver','Points'],
  'ASR Invitations':['Division','Position','Driver ID','Driver','Points','Response','Notes'],
  'ASR Pairings':['Pair','Team','Driver 1 ID','Driver 1','Division 1','Rank 1','Driver 2 ID','Driver 2','Division 2','Rank 2'],
  'ASR Qualifying':['Position','Driver','Team','Tyre','Time'],
  'ASR Race':['Position','Driver','Team','Stops','Time / gap / status','Points'],
  'ASR Team Results':['Team','Points','Position'],
  'ASR Announcements':['Setting','Value']
}};
function activeAsrKey_(season){return F1XL_ACTIVE_ASR.prefix+season;}
function activeAsrSeason_(season){
  if(!season){const current=getResultsEntryInitial(true).seasons[0];if(!current)throw new Error('Launch a TEST season first.');season=current.season;}
  return seasonPlanningSeason_(season);
}
/** Called inside the existing writer lock, before any ASR-changing writes.
 * A counter, not a busy flag: interrupted writes cannot leave a stuck reader flag. */
function activeAsrMarkChanged_(season){
  const props=PropertiesService.getScriptProperties(),key='F1XL_ASR_READ_VERSION_'+season,n=Number(props.getProperty(key)||'0');
  if(!Number.isSafeInteger(n)||n<0||n>=Number.MAX_SAFE_INTEGER)throw new Error('Check the ASR refresh version before saving.');
  props.setProperty(key,String(n+1));
}
/** Hold the shared lock only for property reads; never for spreadsheet reads.
 * A busy writer wins: the presentation retains its last checked data and retries. */
function activeAsrPresentationCheckpoint_(season){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1))throw new Error('A save is in progress. Results will update on the next check.');
  try{
    if(typeof driverRenamePending_==='function'&&driverRenamePending_(season))throw new Error('A gamertag change is in progress. Results will update when it finishes.');
    const props=PropertiesService.getScriptProperties();
    return JSON.stringify([props.getProperty('F1XL_ASR_READ_VERSION_'+season)||'0',props.getProperty(activeAsrKey_(season)),props.getProperty('F1XL_POSTSEASON_CLOSED_'+season.replace(/\./g,'_'))]);
  }finally{lock.releaseLock();}
}
function activeAsrContext_(season){
  season=activeAsrSeason_(season);const master=seasonPlanningBook_(season);
  if(!master||!testLaunchActive_(master)||!testLaunchRecord_(season).launchedAt)throw new Error('Open ASR from an active TEST season.');
  divisionTemplateAssertTestWorkbook_(master);assertSeasonWorkbookWritable_(season,master);
  const count=Number(master.getSheetByName('Start Here').getRange('B5').getValue());
  if(!Number.isInteger(count)||count<1||count>8)throw new Error('Check the active division count.');
  const record=JSON.parse(PropertiesService.getScriptProperties().getProperty(activeAsrKey_(season))||'{}');
  const book=record.id?SpreadsheetApp.openById(record.id):null;
  if(book&&(book.getId()===F1XL_ASR_SOURCE.spreadsheetId||fapWorkbookLegacyName_(book.getName())!=='TEST - F1XL Season '+season+' ASR'))throw new Error('The ASR workbook connection is not the expected TEST copy.');
  const teams=master.getSheetByName('Teams & Principals').getRange('A2:A13').getDisplayValues().flat().map(String).filter(Boolean);
  return {season:season,master:master,count:count,record:record,book:book,teams:Array.from(new Set(teams))};
}
function activeAsrRows_(book,name){
  const width=F1XL_ACTIVE_ASR.tabs[name].length,s=book.getSheetByName(name);
  if(!s||JSON.stringify(s.getRange(1,1,1,width).getDisplayValues()[0])!==JSON.stringify(F1XL_ACTIVE_ASR.tabs[name]))throw new Error('Check '+name+' headers in the ASR workbook.');
  return s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,width).getDisplayValues():[];
}
function activeAsrTable_(book,name,rows){
  const s=book.getSheetByName(name),width=F1XL_ACTIVE_ASR.tabs[name].length,height=Math.max(1,s.getLastRow()-1,rows.length);
  if(height+1>s.getMaxRows())s.insertRowsAfter(s.getMaxRows(),height+1-s.getMaxRows());
  return {range:s.getRange(2,1,height,width),values:rows.concat(Array.from({length:height-rows.length},()=>Array(width).fill(''))),text:true};
}
function activeAsrRead_(c){
  const data={season:c.season,masterUrl:c.master.getUrl(),teams:c.teams,divisions:c.count,exists:!!c.book,ready:!!c.record.ready,url:c.book?c.book.getUrl():'',message:''};
  if(!c.book||!c.record.ready)return data;
  const tables={};Object.keys(F1XL_ACTIVE_ASR.tabs).forEach(n=>tables[n]=activeAsrRows_(c.book,n));
  data.setup=Object.fromEntries(tables['ASR Setup']);data.allocations=tables['ASR Allocations'].filter(r=>r[0]);data.topTen=tables['ASR Top Ten'].filter(r=>r[3]);data.invitations=tables['ASR Invitations'].filter(r=>r[3]);data.pairs=tables['ASR Pairings'].filter(r=>r[1]);
  data.qualifying=tables['ASR Qualifying'].slice(0,22);data.race=tables['ASR Race'].slice(0,22);data.teamResults=tables['ASR Team Results'].filter(r=>r[0]).sort((a,b)=>Number(b[1])-Number(a[1]));data.announcements=Object.fromEntries(tables['ASR Announcements']);
  // Formula text and manual inputs participate; recalculation of outputs alone does not stale edits.
  const manual=Object.keys(F1XL_ACTIVE_ASR.tabs).filter(n=>!['ASR Team Results','ASR Qualifying','ASR Race'].includes(n)).map(n=>[n,tables[n]]);
  data.revision=licenceRevision_([manual,data.qualifying.map(r=>[r[1],r[3],r[4]]),data.race.map(r=>[r[1],r[3],r[4]]),c.book.getSheetByName('ASR Race').getRange('A2:F23').getFormulas(),c.book.getSheetByName('ASR Qualifying').getRange('A2:E23').getFormulas()]);
  data.pairsCurrent=activeAsrPairsCurrent_(data);data.next=activeAsrNext_(data);return data;
}
function getActiveAsr(input){ fapAssertEntry_('getActiveAsr');return activeAsrRead_(activeAsrContext_(input&&input.season));}
/** Read-only race-night feed. Bookend checkpoints reject overlapping saves,
 * while the five-tab read leaves the shared save lock available. */
function getActiveAsrPresentation(input){ fapAssertEntry_('getActiveAsrPresentation');
  const season=activeAsrSeason_(input&&input.season),before=activeAsrPresentationCheckpoint_(season);
  const c=activeAsrContext_(season);if(!c.record.ready)throw new Error('Create the ASR workbook first.');
  const setup=Object.fromEntries(activeAsrRows_(c.book,'ASR Setup'));
  const data=activeAsrPresentationData_(setup,
    activeAsrRows_(c.book,'ASR Pairings').filter(r=>r[1]),
    activeAsrRows_(c.book,'ASR Qualifying').slice(0,22),
    activeAsrRows_(c.book,'ASR Race').slice(0,22),
    activeAsrRows_(c.book,'ASR Team Results').filter(r=>r[0]));
  if(before!==activeAsrPresentationCheckpoint_(season))throw new Error('ASR changed during this check. Results will update on the next check.');
  data.season=c.season;data.revision=licenceRevision_(data);data.checkedAt=new Date().toISOString();return data;
}
function activeAsrPresentationData_(setup,pairs,qualifying,race,totals){
  const grid=Number(setup['Grid size']);if(![20,22].includes(grid))throw new Error('Check the ASR grid size.');
  const members=pairs.flatMap(r=>[{driver:r[3],team:r[1]},{driver:r[7],team:r[1]}]);
  if(pairs.length!==grid/2||new Set(pairs.map(r=>r[1])).size!==pairs.length||members.some(r=>!r.driver)||new Set(members.map(r=>r.driver)).size!==grid)throw new Error('Complete the ASR team line-up before opening race-night presentation.');
  const teams=pairs.map(r=>({team:r[1],drivers:[r[3],r[7]],points:0,position:0}));
  function session(rows,isRace){const seen=new Set();let empty=false;return rows.map((r,i)=>{
    if(!r[1]){empty=true;return null;}if(empty)throw new Error('Complete the gap in the saved result order before presenting.');
    const member=members.find(p=>p.driver===r[1]);if(!member||seen.has(r[1]))throw new Error('Check the saved ASR result drivers.');seen.add(r[1]);
    if(r.some(v=>/^#(?:REF!|VALUE!|ERROR!|N\/A|DIV\/0!|NUM!|NAME\?)/.test(String(v)))||r[2]!==member.team)throw new Error('ASR results are still calculating or need checking in the workbook.');
    const status=/^(DNF|DNS|DSQ)$/i.test(String(r[4]).trim())?String(r[4]).trim().toUpperCase():'';
    const row={position:isRace&&status?status:String(i+1),driver:r[1],team:member.team,time:r[4],detail:r[3]};
    if(isRace){const expected=r[4]&&!status?Math.max(0,grid-i):0;row.points=Number(r[5]);if(!Number.isFinite(row.points)||row.points!==expected)throw new Error('ASR points are still calculating or need checking in the workbook.');teams.find(t=>t.team===row.team).points+=row.points;}
    return row;
  }).filter(Boolean);}
  const q=session(qualifying,false),r=session(race,true);
  teams.forEach(t=>{const matches=totals.filter(v=>v[0]===t.team);if(matches.length!==1||!Number.isFinite(Number(matches[0][1]))||Number(matches[0][1])!==t.points)throw new Error('ASR team totals are still calculating or need checking in the workbook.');t.position=1+teams.filter(o=>o.points>t.points).length;});
  teams.sort((a,b)=>a.position-b.position||a.team.localeCompare(b.team));
  return {track:setup.Track||'',date:setup['Race date']||'',grid:grid,qualifying:q,race:r,teams:teams,
    qualifyingComplete:q.length===grid&&q.every(v=>v.time),raceComplete:r.length===grid&&r.every(v=>v.time)};
}
function activeAsrStandings_(c){
  const entrants=c.master.getSheetByName('Season Entrants').getRange(2,1,500,2).getDisplayValues(),rows=[];
  for(let d=1;d<=c.count;d++){
    const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,d));if(!id)throw new Error('Division '+d+' is not connected.');
    const b=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(b);
    const ranked=b.getSheetByName('Driver Results NoSort'),stats=b.getSheetByName('Driver Stats Calc Sheet');if(!ranked||!stats)throw new Error('Division '+d+' standings are missing.');
    const totals=stats.getRange('A3:H46').getDisplayValues();
    const drivers=ranked.getRange('A5:D48').getDisplayValues().filter(r=>r[2]).map(r=>{
      const matches=entrants.filter(e=>e[0]&&intakeName_(e[1])===intakeName_(r[2])),points=totals.filter(t=>intakeName_(t[0])===intakeName_(r[2]));
      if(matches.length!==1||points.length!==1||!Number.isFinite(Number(points[0][7]))||!Number.isFinite(Number(r[0]))||Number(r[0])<1)throw new Error('Check Division '+d+' standings/identity for '+r[2]+'.');
      return [String(d),String(r[0]),matches[0][0],matches[0][1],points[0][7]];
    }).sort((a,b)=>Number(a[1])-Number(b[1])||a[3].localeCompare(b[3]));
    rows.push(...drivers);
  }return rows;
}
function activeAsrTopTen_(rows){const counts={};return rows.filter(r=>{counts[r[0]]=(counts[r[0]]||0)+1;return counts[r[0]]<=10;});}
function createActiveAsr(input){ fapAssertEntry_('createActiveAsr');return withApplicationLock_(function(){
  const c=activeAsrContext_(input.season);if(c.record.ready)return activeAsrRead_(c);
  activeAsrMarkChanged_(c.season);
  const standings=activeAsrStandings_(c); // Validate every source before copying.
  if(!c.book){const file=DriveApp.getFileById(F1XL_ASR_SOURCE.spreadsheetId).makeCopy(fapWorkbookNewName_('TEST - F1XL Season '+c.season+' ASR'));c.record={id:file.getId(),ready:false};PropertiesService.getScriptProperties().setProperty(activeAsrKey_(c.season),JSON.stringify(c.record));c.book=SpreadsheetApp.openById(file.getId());}
  // An interrupted initialisation retains its copy; retry completes that same draft.
  const original=c.book.getSheets().filter(s=>!F1XL_ACTIVE_ASR.tabs[s.getName()]&&s.getName()!=='ASR Start Here');
  for(const name of Object.keys(F1XL_ACTIVE_ASR.tabs)){const s=c.book.getSheetByName(name)||c.book.insertSheet(name);s.getRange(1,1,1,F1XL_ACTIVE_ASR.tabs[name].length).setValues([F1XL_ACTIVE_ASR.tabs[name]]);s.setFrozenRows(1);s.getRange(1,1,1,F1XL_ACTIVE_ASR.tabs[name].length).setBackground('#153e32').setFontColor('#ffffff').setFontWeight('bold');s.setColumnWidths(1,F1XL_ACTIVE_ASR.tabs[name].length,150);}
  const guide=c.book.getSheetByName('ASR Start Here')||c.book.insertSheet('ASR Start Here');
  guide.getRange('A1:B9').setValues([['All Star Race','Season '+c.season],['1. ASR Setup / Allocations','Choose track, date, 20 or 22 seats, then division quotas totalling that grid.'],['2. ASR Top Ten','Standings snapshot. Refresh in FAP or paste current standings here. Source links are below.'],['3. ASR Invitations','Not invited / Invited / Confirmed / Declined. Ask the next driver in the same division. Retain declines.'],['4. ASR Pairings','Two confirmed drivers per team. Strongest/weakest pairing can be generated in FAP or entered here.'],['5. ASR Qualifying / Race','Enter drivers in finishing order and their times. DNF/DNS/DSQ get zero; blank rows earn zero.'],['6. ASR Team Results','Both drivers’ race points added. Tied totals remain tied for admin decision.'],['7. ASR Announcements','Private preparation only. Slideshow link and notes; no public publishing or deck generation yet.'],['Template reference tabs','Original example tabs retained hidden for reference; operational ASR tabs have no dependency on them.']]);guide.setColumnWidth(1,210);guide.setColumnWidth(2,700);guide.getRange('A1:B9').setWrap(true);
  for(let d=1;d<=c.count;d++)guide.getRange(10+d,1,1,2).setValues([['Division '+d+' standings','https://docs.google.com/spreadsheets/d/'+PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,d))+'/edit']]);
  const stamp=new Date().toISOString();intakeCommit_([
    activeAsrTable_(c.book,'ASR Setup',[['Season',c.season],['Track',''],['Race date',''],['Grid size','20'],['Format','Normal qualifying + 100% race'],['Standings refreshed',stamp]]),
    activeAsrTable_(c.book,'ASR Allocations',Array.from({length:c.count},(_,i)=>[String(i+1),'0'])),
    activeAsrTable_(c.book,'ASR Top Ten',activeAsrTopTen_(standings)),activeAsrTable_(c.book,'ASR Invitations',standings.map(r=>r.concat(['Not invited','']))),
    activeAsrTable_(c.book,'ASR Pairings',[]),activeAsrTable_(c.book,'ASR Announcements',[['Reveal date',''],['Slideshow URL',''],['Notes','']])]);
  activeAsrBuildResults_(c.book);
  const validation=SpreadsheetApp.newDataValidation().requireValueInList(['Not invited','Invited','Confirmed','Declined'],true).setAllowInvalid(false).build();c.book.getSheetByName('ASR Invitations').getRange('F2:F501').setDataValidation(validation);
  original.forEach(s=>s.hideSheet());c.book.setActiveSheet(guide);SpreadsheetApp.flush();c.record.ready=true;PropertiesService.getScriptProperties().setProperty(activeAsrKey_(c.season),JSON.stringify(c.record));
  const result=activeAsrRead_(c);result.message='ASR workbook created. Allocate the places manually, then review invitations.';return result;
});}
function activeAsrBuildResults_(book){
  for(const name of ['ASR Qualifying','ASR Race']){
    const s=book.getSheetByName(name),race=name==='ASR Race',rows=[];
    for(let row=2;row<=23;row++){
      const position='=IF(B'+row+'="","",'+(race?'IF(OR(UPPER(E'+row+')="DNF",UPPER(E'+row+')="DNS",UPPER(E'+row+')="DSQ"),UPPER(E'+row+'),ROW()-1)':'ROW()-1')+')';
      const team="=IF(B"+row+"=\"\",\"\",IFERROR(INDEX('ASR Pairings'!B$2:B$12,MATCH(B"+row+",'ASR Pairings'!D$2:D$12,0)),IFERROR(INDEX('ASR Pairings'!B$2:B$12,MATCH(B"+row+",'ASR Pairings'!H$2:H$12,0)),\"\")))";
      const r=[position,'',team,'',''];if(race)r.push("=IF(OR(B"+row+"=\"\",E"+row+"=\"\",NOT(ISNUMBER(A"+row+"))),0,MAX(0,VALUE('ASR Setup'!B5)-A"+row+"+1))");rows.push(r);
    }
    s.getRange(2,1,22,race?6:5).setNumberFormat('General').setValues(rows);
    s.getRange('B2:B23').setBackground('#e5f1e9');s.getRange('D2:E23').setBackground('#e5f1e9');s.setColumnWidth(2,220);s.setColumnWidth(5,210);
  }
  const rows=[];for(let r=2;r<=12;r++)rows.push(["=IF('ASR Pairings'!B"+r+"=\"\",\"\",'ASR Pairings'!B"+r+")","=IF(A"+r+"=\"\",\"\",SUMIF('ASR Race'!C$2:C$23,A"+r+",'ASR Race'!F$2:F$23))",'=IF(A'+r+'="","",RANK(B'+r+',B$2:B$12,0))']);
  book.getSheetByName('ASR Team Results').getRange(2,1,11,3).setNumberFormat('General').setValues(rows);
}
function activeAsrConfirmed_(data){return data.invitations.filter(r=>r[5]==='Confirmed').sort((a,b)=>Number(a[0])-Number(b[0])||Number(a[1])-Number(b[1])||a[3].localeCompare(b[3]));}
function activeAsrNext_(data){return data.allocations.map(a=>{
  const division=String(a[0]),pool=data.invitations.filter(r=>r[0]===division),occupied=pool.filter(r=>['Confirmed','Invited'].includes(r[5])).length;
  const next=pool.filter(r=>r[5]==='Not invited').sort((x,y)=>Number(x[1])-Number(y[1]))[0];
  return {division:division,places:Number(a[1]),confirmed:pool.filter(r=>r[5]==='Confirmed').length,invited:pool.filter(r=>r[5]==='Invited').length,next:occupied<Number(a[1])&&next?next[2]:'',missing:Math.max(0,Number(a[1])-occupied)};
});}
function activeAsrShuffleCars_(names){
  const cars=names.slice();for(let i=cars.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const car=cars[i];cars[i]=cars[j];cars[j]=car;}return cars;
}
function activeAsrPairRows_(data){
  const grid=Number(data.setup['Grid size']),confirmed=activeAsrConfirmed_(data);activeAsrValidateInvites_(data.invitations,data.allocations,grid);
  if(data.allocations.reduce((n,r)=>n+Number(r[1]),0)!==grid||confirmed.length!==grid)throw new Error('Allocate and confirm all '+grid+' places before generating teams.');
  if(data.teams.length<grid/2)throw new Error('The Season Master needs '+grid/2+' distinct team names.');
  if(new Set(confirmed.map(r=>intakeName_(r[3]))).size!==grid)throw new Error('Confirmed drivers must have distinct names for the results lookup.');
  const cars=activeAsrShuffleCars_(data.teams.slice(0,grid/2));
  const rows=[];for(let i=0;i<grid/2;i++){const first=confirmed[i],last=confirmed[grid-1-i];rows.push([String(i+1),cars[i],first[2],first[3],first[0],first[1],last[2],last[3],last[0],last[1]]);}return rows;
}
function activeAsrPairsCurrent_(data){
  const actual=data.pairs.flatMap(r=>[[r[4],r[5],r[2],r[3]],[r[8],r[9],r[6],r[7]]]).map(r=>r.join('|')).sort();
  const confirmed=activeAsrConfirmed_(data).map(r=>r.slice(0,4).join('|')).sort();
  return data.pairs.length===Number(data.setup['Grid size'])/2&&JSON.stringify(actual)===JSON.stringify(confirmed);
}
function activeAsrValidateInvites_(rows,allocations,grid){
  const seen=new Set(),confirmed=new Set();rows.forEach(r=>{
    if(r.length!==7||!allocations.some(a=>String(a[0])===String(r[0]))||!r[2]||!r[3]||!Number.isFinite(Number(r[1]))||Number(r[1])<1||!['Not invited','Invited','Confirmed','Declined'].includes(r[5]))throw new Error('Check every invitation’s division, rank, driver and response.');
    const key=r[0]+'|'+r[2];if(seen.has(key))throw new Error('Duplicate driver in a division invitation list.');seen.add(key);
    if(['Confirmed','Invited'].includes(r[5])){if(confirmed.has(r[2]))throw new Error(r[3]+' cannot occupy invitations in two divisions.');confirmed.add(r[2]);}
  });
  allocations.forEach(a=>{if(rows.filter(r=>String(r[0])===String(a[0])&&['Confirmed','Invited'].includes(r[5])).length>Number(a[1]))throw new Error('Division '+a[0]+' has more invitations/confirmations than allocated places.');});
  if(confirmed.size>grid)throw new Error('Too many invited/confirmed drivers for this grid.');
}
function activeAsrResultInputs_(rows,drivers,grid,race){
  if(!Array.isArray(rows)||rows.length!==22)throw new Error('Reopen the ASR results before saving.');const seen=new Set();let gap=false;
  return rows.map((r,i)=>{if(!Array.isArray(r)||r.length!==3)throw new Error('Invalid result row.');r=r.map(v=>String(v==null?'':v).trim());if(r.some(v=>v.length>100))throw new Error('A result entry is too long.');if(i>=grid&&r.some(Boolean))throw new Error('Results exceed the selected grid size.');
    if(!r[0]){gap=true;if(r.some(Boolean))throw new Error('Choose a driver for every entered result.');return r;}
    if(gap)throw new Error('Keep the result order together, without empty rows between drivers.');
    if(!drivers.includes(r[0])||seen.has(r[0]))throw new Error('Choose each paired driver at most once per session.');seen.add(r[0]);
    if(race&&r[1]&&!/^\d+$/.test(r[1]))throw new Error('Pit stops must be a whole number.');return r;});
}
function saveActiveAsr(input){ fapAssertEntry_('saveActiveAsr');return withApplicationLock_(function(){
  const c=activeAsrContext_(input.season),data=activeAsrRead_(c);if(!data.ready||input.revision!==data.revision)throw new Error('ASR changed since it was opened. Refresh before saving.');
  activeAsrMarkChanged_(c.season);
  const writes=[],hasResults=data.qualifying.concat(data.race).some(r=>r[1]);
  if(input.area==='setup'){
    const setup=input.setup||{},grid=Number(setup['Grid size']),alloc=input.allocations;
    if(![20,22].includes(grid)||!Array.isArray(alloc)||alloc.length!==c.count)throw new Error('Choose 20 or 22 places and an allocation for every division.');
    alloc.forEach((r,i)=>{if(String(r[0])!==String(i+1)||!Number.isInteger(Number(r[1]))||Number(r[1])<0||Number(r[1])>grid)throw new Error('Allocate between 0 and the grid size per division.');});
    if(alloc.reduce((n,r)=>n+Number(r[1]),0)>grid)throw new Error('Allocated places exceed the grid.');
    if(hasResults&&(grid!==Number(data.setup['Grid size'])||JSON.stringify(alloc)!==JSON.stringify(data.allocations)))throw new Error('Grid size and division allocations are locked once results have been entered.');
    if(setup['Race date'])seasonPlanningDate_(setup['Race date']);
    activeAsrValidateInvites_(data.invitations,alloc,grid);
    writes.push(activeAsrTable_(c.book,'ASR Setup',Object.entries(Object.assign({},data.setup,{'Track':String(setup.Track||'').trim(),'Race date':setup['Race date']||'','Grid size':String(grid)}))),activeAsrTable_(c.book,'ASR Allocations',alloc));
  }else if(input.area==='invitations'){
    if(hasResults)throw new Error('Invitation changes are locked once ASR results exist.');
    const rows=input.rows;if(!Array.isArray(rows)||rows.length!==data.invitations.length)throw new Error('Refresh the invitation list first.');
    rows.forEach((r,i)=>{if(!Array.isArray(r)||r.length!==7||JSON.stringify(r.slice(0,5))!==JSON.stringify(data.invitations[i].slice(0,5)))throw new Error('Driver identity and ranking cannot be changed here. Refresh the tracker instead.');if(String(r[6]).length>2000)throw new Error('Keep invitation notes under 2,000 characters.');});
    activeAsrValidateInvites_(rows,data.allocations,Number(data.setup['Grid size']));writes.push(activeAsrTable_(c.book,'ASR Invitations',rows));
  }else if(input.area==='tracker'){
    if(hasResults)throw new Error('The qualification snapshot is locked once ASR results exist.');
    const fresh=activeAsrStandings_(c),rows=data.invitations.map(r=>r.slice());
    fresh.forEach(r=>{const i=rows.findIndex(old=>old[0]===r[0]&&old[2]===r[2]);if(i<0)rows.push(r.concat(['Not invited','']));else rows[i]=r.concat(rows[i].slice(5));});
    // Keep contacted drivers even if they leave standings; other candidates follow the current standings.
    const retained=rows.filter(r=>r[5]!=='Not invited'||fresh.some(n=>n[0]===r[0]&&n[2]===r[2]));
    writes.push(activeAsrTable_(c.book,'ASR Top Ten',activeAsrTopTen_(fresh)),activeAsrTable_(c.book,'ASR Invitations',retained),activeAsrTable_(c.book,'ASR Setup',Object.entries(Object.assign({},data.setup,{'Standings refreshed':new Date().toISOString()}))));
  }else if(input.area==='generate'){
    if(hasResults)throw new Error('Teams are locked once results exist.');writes.push(activeAsrTable_(c.book,'ASR Pairings',activeAsrPairRows_(data)));
  }else if(input.area==='teams'||input.area==='randomise-cars'){
    if(hasResults||!data.pairsCurrent)throw new Error('Generate the current confirmed pairings before assigning teams; results lock the line-up.');
    const names=input.area==='randomise-cars'?activeAsrShuffleCars_(data.pairs.map(r=>r[1])):input.teams;if(!Array.isArray(names)||names.length!==data.pairs.length||new Set(names).size!==names.length||names.some(n=>!c.teams.includes(n)))throw new Error('Choose a different valid team for each pair.');
    writes.push(activeAsrTable_(c.book,'ASR Pairings',data.pairs.map((r,i)=>{const row=r.slice();row[1]=names[i];return row;})));
  }else if(input.area==='results'){
    if(!data.pairsCurrent)throw new Error('Review and generate the current confirmed teams first.');
    const drivers=data.pairs.flatMap(r=>[r[3],r[7]]),grid=Number(data.setup['Grid size']);
    for(const name of ['qualifying','race']){const rows=activeAsrResultInputs_(input[name],drivers,grid,name==='race'),s=c.book.getSheetByName(name==='race'?'ASR Race':'ASR Qualifying');writes.push({range:s.getRange('B2:B23'),values:rows.map(r=>[r[0]]),text:true},{range:s.getRange('D2:E23'),values:rows.map(r=>r.slice(1)),text:true});}
  }else if(input.area==='announcements'){
    const v=input.announcements||{},url=String(v['Slideshow URL']||'').trim();if(url&&!/^https:\/\/(docs\.google\.com\/presentation\/|[a-z0-9.-]+\.sharepoint\.com\/|1drv\.ms\/)/i.test(url))throw new Error('Use a Google Slides, SharePoint or OneDrive presentation link.');
    if(v['Reveal date'])seasonPlanningDate_(v['Reveal date']);
    if(String(v.Notes||'').length>5000)throw new Error('Keep announcement notes under 5,000 characters.');
    writes.push(activeAsrTable_(c.book,'ASR Announcements',[['Reveal date',String(v['Reveal date']||'')],['Slideshow URL',url],['Notes',String(v.Notes||'')]]));
  }else throw new Error('Choose an ASR action.');
  try{intakeCommit_(writes);}catch(error){SpreadsheetApp.flush();throw error;}
  SpreadsheetApp.flush();const result=activeAsrRead_(c);result.message=input.area==='tracker'?'Top ten refreshed; invitation responses retained. Review any changed pairings.':'ASR saved. Announcements remain private.';return result;
});}
