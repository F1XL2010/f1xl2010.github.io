/** TEST launch. Direct seasons publish existing division sheets and small formula-fed
 * public views in Website Config. The operational Master remains private.
 * Legacy snapshot seasons retain their original reader during transition. */
const F1XL_TEST_LAUNCH = Object.freeze({prefix:'F1XL_TEST_LAUNCH_V1_',website:'https://f1xl.co.uk/',configId:'1tmTdmjPRXF23Ixj3p_-nxsfIqv76MUIUET7Qht2qfdg',exportName:'TEST - F1XL Public Season ',checkCachePrefix:'F1XL_TEST_LAUNCH_CHECK_V1_',checkCacheSeconds:90});
function testLaunchRecord_(season) { const raw=PropertiesService.getScriptProperties().getProperty(F1XL_TEST_LAUNCH.prefix+season);const r=raw?JSON.parse(raw):{};return testLaunchAdoptDirect_(season,r); }
function testLaunchStore_(season,r) { PropertiesService.getScriptProperties().setProperty(F1XL_TEST_LAUNCH.prefix+season,JSON.stringify(r)); }
function testLaunchCheckCacheKey_(season){return F1XL_TEST_LAUNCH.checkCachePrefix+String(season);}
function clearTestLaunchCheckCache_(season){CacheService.getScriptCache().remove(testLaunchCheckCacheKey_(season));}
function testLaunchActive_(book) { return String(book.getSheetByName('Start Here').getRange('I7').getDisplayValue()).trim()==='Active'; }
function testLaunchBook_(season) { const book=seasonPlanningBook_(season);if(!book||!book.getSheetByName('Preseason'))throw new Error('Choose a started season.');return book; }
function testLaunchCheck_(season) {
  season=seasonPlanningSeason_(season);const book=testLaunchBook_(season),active=testLaunchActive_(book),record=testLaunchRecord_(season),issues=[];
  const count=Number(book.getSheetByName('Start Here').getRange('B5').getValue());
  let divisions=[];
  if(active) {
    if(!record.launchedAt)issues.push('This season was marked Active outside Season launch. Its launch record needs checking.');
    for(let d=1;d<=count;d++) {
      const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(season,d));
      let connection=null;try { if(!id)throw new Error('Workbook missing');const b=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(b);connection=seasonMasterReadDivisionConnection_(book,b,d); }catch(e){issues.push('Division '+d+': '+e.message);}
      divisions.push({division:d,state:id?'Prepared':'Needs attention',connection:connection,workbookUrl:id?'https://docs.google.com/spreadsheets/d/'+id+'/edit':''});
    }
  } else {
    if(!seasonMasterIsPlanning_(book))throw new Error('This season is not in pre-season or active operation.');
    divisions=getPreseasonPreparation({season:season}).divisions;
    divisions.forEach(function(d){if(d.state!=='Prepared')issues.push('Division '+d.division+': '+(d.issues.join(' ')||d.state));});
  }
  if(!Number.isInteger(count)||count<1||count>F1XL_CAPACITY.divisions||divisions.length!==count)issues.push('Prepare all confirmed divisions before launch.');
  divisions.forEach(function(d){if(!d.connection||!d.connection.ready)issues.push('Division '+d.division+': approve and check both workbook connections.');});
  const rounds=Number(book.getSheetByName('Start Here').getRange('B4').getValue());
  if(!Number.isInteger(rounds)||rounds<1||rounds>F1XL_CAPACITY.rounds)issues.push('Check the season round count.');
  else if(book.getSheetByName('Calendar').getRange(2,1,rounds,4).getDisplayValues().some(function(r){return !r[2]||!r[3];}))issues.push('Every race needs a date and track in the Master Calendar.');
  let tickets;try{tickets=getTicketSeasonSetup({season:season});}catch(e){tickets={ready:false,issues:[e.message],revision:''};}
  if(!active&&!tickets.ready)issues.push('Ticket season setup: '+tickets.issues.join(' '));
  let config=null;try {config=testLaunchConfig_();}catch(e){issues.push(e.message);}
  const revision=intakeHash_([season,active,rounds,count,tickets.revision||'',divisions.map(function(d){return [d.division,d.revision||'',d.state,!!(d.connection&&d.connection.ready),d.workbookUrl];})]);
  return {season:season,book:book,config:config,tickets:tickets,active:active,rounds:rounds,count:count,divisions:divisions,issues:issues,revision:revision,record:record};
}
// An established active hub only needs navigation. It is never launch readiness.
function testLaunchNavigation_(season){
  return seasonNavigationPhase_('season.hub.navigation',()=>{
    const book=testLaunchBook_(season),start=book.getSheetByName('Start Here');
    const values=start.getRange('B4:I7').getValues(),active=String(values[3][7]).trim()==='Active';
    if(!active)return null;
    const r=testLaunchRecord_(season);
    if(!r.launchedAt||r.pendingId||r.pendingDirect||r.committing)return null;
    const count=Number(values[1][0]),rounds=Number(values[0][0]),issues=[],divisions=[];
    if(!Number.isInteger(count)||count<1||count>F1XL_CAPACITY.divisions||!Number.isInteger(rounds)||rounds<1||rounds>F1XL_CAPACITY.rounds)return null;
    const properties=PropertiesService.getScriptProperties().getProperties();
    for(let division=1;division<=count;division++){
      const id=properties[divisionTemplatePropertyKey_(season,division)];
      if(!id)issues.push('Division '+division+': workbook is not connected. Use Refresh hub to check setup.');
      divisions.push({division,state:id?'Connected':'Needs attention',connection:null,workbookUrl:id?'https://docs.google.com/spreadsheets/d/'+id+'/edit':''});
    }
    return {season,active:true,navigationOnly:true,readinessChecked:false,tickets:null,url:book.getUrl(),rounds,divisions,issues,revision:'',canLaunch:false,
      direct:r.sourceMode===F1XL_DIRECT_SOURCE_MODE,connectionUrl:r.connectionUrl||'',pending:false,updatesPending:testLaunchHasUpdates_(season),progress:0,total:count+2,
      launchedAt:r.launchedAt,updatedAt:r.updatedAt||'',website:F1XL_TEST_LAUNCH.website,warnings:[]};
  });
}
function getTestSeasonLaunch(input) { fapAssertEntry_('getTestSeasonLaunch');
  const season=seasonPlanningSeason_(input&&input.season);
  if(input&&input.navigationOnly===true&&input.forceRefresh!==true){const navigation=testLaunchNavigation_(season);if(navigation)return navigation;}
  const cache=CacheService.getScriptCache(),key=testLaunchCheckCacheKey_(season);
  // A light read may discover a changed stage or interrupted launch. Its full
  // fallback must not replace that fresh state with an older readiness cache.
  if(input&&(input.forceRefresh===true||input.navigationOnly===true))cache.remove(key);else{const cached=cache.get(key);if(cached){try{return JSON.parse(cached);}catch(error){cache.remove(key);}}}
  const c=seasonNavigationPhase_('season.hub.readiness',()=>testLaunchCheck_(season)),r=c.record;
  const response={season:c.season,active:c.active,tickets:c.tickets,url:c.book.getUrl(),rounds:c.rounds,divisions:c.divisions,issues:c.issues,revision:c.revision,canLaunch:!!r.committing||!c.issues.length,
    direct: r.sourceMode===F1XL_DIRECT_SOURCE_MODE,connectionUrl:r.connectionUrl||'',pending:!!(r.pendingId||r.pendingDirect),updatesPending:testLaunchHasUpdates_(c.season),progress:r.pendingId?(r.step||0):0,total:c.count+2,launchedAt:r.launchedAt||'',updatedAt:r.updatedAt||'',website:F1XL_TEST_LAUNCH.website,
    warnings:['Connect licences in the active hub before including them in a website update. Publish reviewed tickets from Tickets → Outcomes.','Operational saves update the website automatically. Rebuild website data is for recovery or changes made directly in Sheets.']};
  try{cache.put(key,JSON.stringify(response),F1XL_TEST_LAUNCH.checkCacheSeconds);}catch(error){}
  return response;
}
function beginTestSeasonLaunch(input) { fapAssertEntry_('beginTestSeasonLaunch');
  return websiteConfigWithLock_(function(){
    const season=seasonPlanningSeason_(input.season),pending=testLaunchRecord_(season);
    if(pending.pendingId&&pending.committing){testLaunchBook_(season);return {season:season,step:pending.step,total:pending.count+2,done:false};}
    const c=testLaunchCheck_(input.season);if(c.issues.length)throw new Error(c.issues.join(' '));
    if(input.revision!==c.revision)throw new Error('Season readiness changed. Refresh the launch check first.');
    const r=c.record;
    if((!c.active&&r.sourceMode!=='snapshot_v1')||r.sourceMode===F1XL_DIRECT_SOURCE_MODE)return testLaunchBeginDirect_(c);
    if(r.pendingId&&r.sourceRevision!==c.revision&&!(c.active&&r.committing&&r.exportId===r.pendingId))throw new Error('The season changed during preparation. Use Restart website preparation to rebuild the pending export.');
    if(!r.pendingId){const b=SpreadsheetApp.create(fapWorkbookNewName_(F1XL_TEST_LAUNCH.exportName+c.season));r.pendingId=b.getId();r.previousExportId=r.exportId||'';r.step=0;r.hashes=[];r.sourceRevision=c.revision;r.count=c.count;r.rounds=c.rounds;testLaunchStore_(c.season,r);}
    if(r.step===0){const b=testLaunchExport_(r.pendingId,c.season);
      DriveApp.getFileById(b.getId()).setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
      b.getSheets()[0].setName('Export info').getRange('A1:B2').setValues([['F1XL public TEST snapshot','Season '+c.season],['Purpose','Website display values only']]);
    }
    return {season:c.season,step:r.step,total:r.count+2,done:false};
  },'website.begin');
}
function restartTestSeasonLaunch(input) { fapAssertEntry_('restartTestSeasonLaunch');
  return websiteConfigWithLock_(function(){const season=seasonPlanningSeason_(input.season),book=testLaunchBook_(season),r=testLaunchRecord_(season);if(r.pendingDirect){delete r.pendingDirect;delete r.step;delete r.sourceRevision;testLaunchStore_(season,r);return {ok:true};}if(r.pendingId){const b=testLaunchExport_(r.pendingId,season);if(r.committing||b.getId()===r.exportId||b.getId()===book.getId())throw new Error('Publication is already being finalised. Continue website preparation instead.');DriveApp.getFileById(b.getId()).setTrashed(true);delete r.pendingId;delete r.step;delete r.hashes;delete r.sourceRevision;testLaunchStore_(season,r);}return {ok:true};});
}
function testLaunchExport_(id,season) { const b=SpreadsheetApp.openById(id);if(fapWorkbookLegacyName_(b.getName())!==F1XL_TEST_LAUNCH.exportName+season)throw new Error('The saved public export has an unexpected identity.');return b; }
function testLaunchRead_(book,name,ranges) {
  const sheet=book.getSheetByName(name);if(!sheet)throw new Error('Missing public source: '+name);
  const areas=ranges.map(function(a){const bounds=a.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);const col=function(s){return s.split('').reduce(function(n,c){return n*26+c.charCodeAt(0)-64;},0);};
    const row=Number(bounds[2]),column=col(bounds[1]),lastRow=Math.min(Number(bounds[4]),sheet.getMaxRows()),lastCol=Math.min(col(bounds[3]),sheet.getMaxColumns());
    return lastRow<row||lastCol<column?null:{a:a,row:row,column:column,lastRow:lastRow,lastCol:lastCol};
  }).filter(Boolean);
  if(!areas.length)return {name:name,blocks:[]};
  const top=Math.min.apply(null,areas.map(a=>a.row)),left=Math.min.apply(null,areas.map(a=>a.column)),bottom=Math.max.apply(null,areas.map(a=>a.lastRow)),right=Math.max.apply(null,areas.map(a=>a.lastCol));
  const display=sheet.getRange(top,left,bottom-top+1,right-left+1).getDisplayValues();
  // Slice back to the explicit public allowlist. Cells in the gaps never leave this reader.
  const blocks=areas.map(function(area){const row=area.row,column=area.column,a=area.a,values=display.slice(row-top,area.lastRow-top+1).map(r=>r.slice(column-left,area.lastCol-left+1));
    if(values.some(function(r){return r.some(function(v){return /^#(?:REF!|VALUE!|NAME\?|ERROR!)/.test(v);});}))throw new Error('Fix the spreadsheet error in '+name+' '+a+' before publishing.');
    return {row:row,column:column,values:values};
  }).filter(Boolean);return {name:name,blocks:blocks};
}
/** Later contained blocks are precision overrides (for example constructor
 * tie-break points). Fold them into the earlier block without widening its range. */
function testLaunchCompactBlocks_(blocks){
  const result=[];
  blocks.forEach(function(b){
    const previous=result.find(p=>b.row>=p.row&&b.column>=p.column&&b.row+b.values.length<=p.row+p.values.length&&b.column+b.values[0].length<=p.column+p.values[0].length);
    if(previous)b.values.forEach((row,i)=>row.forEach((value,j)=>{previous.values[b.row-previous.row+i][b.column-previous.column+j]=value;}));
    else result.push({row:b.row,column:b.column,values:b.values.map(row=>row.slice())});
  });return result;
}
function testLaunchPayload_(c,division) {
  const calendar=c.book.getSheetByName('Calendar'),hasStatus=calendar.getRange('E1').getDisplayValue()==='Status';
  const status=hasStatus?calendar.getRange(2,5,c.rounds,1).getDisplayValues():Array.from({length:c.rounds},function(){return [''];});
  if(status.some(function(r){return r[0]&&r[0]!=='Scheduled'&&r[0]!=='Cancelled';}))throw new Error('Check the public calendar statuses before publishing.');
  if(!division)return [testLaunchRead_(c.book,'Teams & Principals',['A1:F13']),testLaunchRead_(c.book,'Calendar',[hasStatus?'A1:E23':'A1:D23']),testLaunchRead_(c.book,'Overall Standings',['A1:M15']),testLaunchRead_(c.book,'Weekly Totals',['A1:W14'])].concat(typeof licencePublishPayload_==='function'?licencePublishPayload_(c.book,c.season):[]).concat(typeof driverMovementPayload_==='function'?[driverMovementPayload_(c.book)]:[]);
  const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,division));if(!id)throw new Error('Division workbook missing.');
  const b=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(b);
  const spec=[['Data',['A2:G46','I1:N25','J28:K40','P2:S26','T2:T26']],['Race Calendar',['A1:F24']],['Driver Results NoSort',['A1:BN46']],['Constructors Standings NoSort',['A1:AC20']],['Driver Stats Calc Sheet',['A1:BS46']],['Team Stats Calc Sheet',['A1:AI14']]];
  for(let r=1;r<=c.rounds;r++)spec.push(['R'+r,['A1:J4','A7:L32','A35:L60','A64:L89','A92:L117']]);
  return spec.map(function(s){const p=testLaunchRead_(b,s[0],s[1]);if(s[0]==='Race Calendar')p.blocks.push({row:1,column:7,values:[['Status']].concat(status)});testLaunchExactTeamPoints_(b,p);return p;});
}
function testLaunchExactTeamPoints_(book,payload){
  if(payload.name==='Constructors Standings NoSort')payload.blocks.push({row:5,column:3,values:book.getSheetByName(payload.name).getRange('C5:C16').getValues().map(row=>[String(row[0])])});
}
function testLaunchWritePayload_(dest,prefix,payload) {
  payload.forEach(function(p){let s=dest.getSheetByName(prefix+p.name);if(!s)s=dest.insertSheet(prefix+p.name);s.clear();
    const rows=Math.max.apply(null,p.blocks.map(function(b){return b.row+b.values.length-1;})),cols=Math.max.apply(null,p.blocks.map(function(b){return b.column+b.values[0].length-1;}));
    if(s.getMaxRows()<rows)s.insertRowsAfter(s.getMaxRows(),rows-s.getMaxRows());if(s.getMaxColumns()<cols)s.insertColumnsAfter(s.getMaxColumns(),cols-s.getMaxColumns());
    testLaunchCompactBlocks_(p.blocks).forEach(function(b){s.getRange(b.row,b.column,b.values.length,b.values[0].length).setNumberFormat('@').setValues(b.values.map(function(row){return row.map(function(v){return /^[=+@-]/.test(v)?"'"+v:v;});}));});
    if(s.getMaxRows()>rows)s.deleteRows(rows+1,s.getMaxRows()-rows);if(s.getMaxColumns()>cols)s.deleteColumns(cols+1,s.getMaxColumns()-cols);
  });
}
function testLaunchFacade_(exportBook,prefix) { return {getId:function(){return exportBook.getId();},getUrl:function(){return exportBook.getUrl();},getSheetByName:function(name){return exportBook.getSheetByName(prefix+name);}}; }
function advanceTestSeasonLaunch(input) { fapAssertEntry_('advanceTestSeasonLaunch');
  return websiteConfigWithLock_(function(){
    const season=seasonPlanningSeason_(input.season),book=testLaunchBook_(season),r=testLaunchRecord_(season);
    if(r.sourceMode===F1XL_DIRECT_SOURCE_MODE)return testLaunchAdvanceDirect_(season,r,input);
    if(!r.pendingId){if(r.launchedAt)return {done:true,season:season};throw new Error('Start the launch check first.');}
    if(Number(input.step)!==r.step)return {done:false,season:season,step:r.step,total:r.count+2};
    const dest=testLaunchExport_(r.pendingId,season),c={season:season,book:book,rounds:r.rounds};
    if(r.step<=r.count){
      const measure=typeof fapPerformancePhase_==='function'?fapPerformancePhase_:function(name,work){return work();};
      const payload=measure('snapshot.read',function(){return testLaunchPayload_(c,r.step);});
      measure('snapshot.write',function(){testLaunchWritePayload_(dest,r.step?'D'+r.step+' ':'M ',payload);});r.hashes[r.step]=intakeHash_(payload);r.step++;testLaunchStore_(season,r);return {done:false,season:season,step:r.step,total:r.count+2};}
    // Recheck readiness and every exported source before making the staged snapshot public.
    const config=testLaunchConfig_();
    if(!r.committing){
      const check=testLaunchCheck_(season);if(check.issues.length||check.count!==r.count||check.rounds!==r.rounds||check.revision!==r.sourceRevision)throw new Error('Season readiness changed. Restart website preparation after reviewing the season.');
      const allowed=['Export info'];
      for(let d=0;d<=r.count;d++){const payload=testLaunchPayload_(c,d);payload.forEach(function(p){allowed.push((d?'D'+d+' ':'M ')+p.name);});if(intakeHash_(payload)!==r.hashes[d])throw new Error('Public source data changed during preparation. Restart website preparation to include the latest values.');}
      if(dest.getSheets().some(function(s){return allowed.indexOf(s.getName())<0;}))throw new Error('The pending export contains an unexpected tab. Restart website preparation; no admin workbook was shared.');
    }
    const sources={season:season,rounds:r.rounds,master:testLaunchFacade_(dest,'M '),divisions:[]};for(let d=1;d<=r.count;d++)sources.divisions.push({division:d,workbook:testLaunchFacade_(dest,'D'+d+' ')});
    r.committing=true;testLaunchStore_(season,r);
    websiteConfigMakePublic_(DriveApp.getFileById(dest.getId()));
    websiteConfigWriteSeason_(config,sources,String(r.count),r.count);
    const main=config.getSheetByName('Main');
    if(typeof driverMovementPublicConfig_==='function')driverMovementPublicConfig_(config,dest);
    const licenceReady=!!(dest.getSheetByName('M Summary')&&dest.getSheetByName('M Outstanding Bans')&&dest.getSheetByName('M Penalty Guide'));
    testLaunchSetConfig_(main,'drivers_licence_sheet_id',licenceReady?dest.getId():'');
    [['summary','Summary'],['bans','Outstanding Bans'],['penalty_guide','Penalty Guide']].forEach(function(pair){testLaunchSetConfig_(main,'drivers_licence_'+pair[0]+'_gid',licenceReady?dest.getSheetByName('M '+pair[1]).getSheetId():'');});
    testLaunchSetConfig_(main,'active_test_season',season);testLaunchSetConfig_(main,'test_season_phase','active');testLaunchSetConfig_(main,'test_licences_ready',licenceReady?'yes':'no');testLaunchSetConfig_(main,'test_tickets_ready',typeof ticketPublicState_==='function'&&ticketPublicState_(season).updatedAt?'yes':'no');
    if(typeof ticketWebsiteConnect_==='function')ticketWebsiteConnect_(main,season);
    testLaunchSetConfig_(main,'test_snapshot_updated_at',new Date().toISOString());
    // Persist recovery information before marking Active. Repeating finalisation is safe.
    r.exportId=r.pendingId;r.launchedAt=r.launchedAt||new Date().toISOString();r.updatedAt=new Date().toISOString();testLaunchStore_(season,r);
    book.getSheetByName('Start Here').getRange('I7').setValue('Active');
    clearTestLaunchCheckCache_(season);
    if(typeof clearPreseasonHubCache_==='function')clearPreseasonHubCache_();
    delete r.pendingId;delete r.step;delete r.hashes;delete r.sourceRevision;delete r.committing;testLaunchStore_(season,r);PropertiesService.getScriptProperties().deleteProperty(testLaunchUpdatesKey_(season));websiteConfigClearCache_();
    if(r.previousExportId&&r.previousExportId!==r.exportId){try{const old=testLaunchExport_(r.previousExportId,season);DriveApp.getFileById(old.getId()).setTrashed(true);delete r.previousExportId;testLaunchStore_(season,r);}catch(ignore){/* The active snapshot is complete; retain the old export if cleanup is unavailable. */}}
    if(typeof ticketFormQueue_==='function')ticketFormQueue_(season,true);
    return {done:true,season:season,website:F1XL_TEST_LAUNCH.website};
  },'website.advance');
}
function testLaunchSetConfig_(sheet,key,value) { const cell=websiteConfigFindKeyCell_(sheet,key);if(cell)cell.offset(0,1).setValue(value);else sheet.getRange(sheet.getLastRow()+1,1,1,2).setValues([[key,value]]); }
// Called inside the existing write lock. Only unfinished public work is queued;
// a public failure must never turn a successful operational save into a failure.
function testLaunchUpdatesKey_(season){return 'F1XL_OPERATION_UPDATES_V1_'+season;}
function testLaunchUpdates_(season){return JSON.parse(PropertiesService.getScriptProperties().getProperty(testLaunchUpdatesKey_(season))||'{"calendar":[],"roster":[],"licences":false}');}
function testLaunchHasUpdates_(season){if(testLaunchRecord_(season).sourceMode===F1XL_DIRECT_SOURCE_MODE)return false;const p=testLaunchUpdates_(season);return !!(p.calendar.length||p.roster.length||p.licences);}
function testLaunchAfterSave_(season,change,response){
  if(testLaunchRecord_(season).sourceMode===F1XL_DIRECT_SOURCE_MODE){clearTestLaunchCheckCache_(season);response.directSources=true;response.publicationPending=false;return response;}
  try{
    const p=testLaunchUpdates_(season);
    ['calendar','roster'].forEach(k=>p[k]=Array.from(new Set(p[k].concat(change[k]||[]))).sort((a,b)=>a-b));p.licences=p.licences||!!change.licences;
    PropertiesService.getScriptProperties().setProperty(testLaunchUpdatesKey_(season),JSON.stringify(p));
    testLaunchPublishUpdates_(season);clearTestLaunchCheckCache_(season);response.publicationPending=false;response.message+=' Website updated.';
  }catch(error){response.publicationPending=true;response.message+=' Saved; website update pending: '+error.message+' Use Retry website update in the active-season hub.';}
  return response;
}
function retryTestSeasonUpdates(input){ fapAssertEntry_('retryTestSeasonUpdates');return websiteConfigWithLock_(function(){
  const season=seasonPlanningSeason_(input.season);assertSeasonWritable_(season);testLaunchPublishUpdates_(season);
  return {message:'Saved changes published to the website.',updatesPending:false};
});}
function testLaunchPublishUpdates_(season){
  if(testLaunchRecord_(season).sourceMode===F1XL_DIRECT_SOURCE_MODE)return;
  const p=testLaunchUpdates_(season);if(!testLaunchHasUpdates_(season))return;
  const book=testLaunchBook_(season),r=testLaunchRecord_(season),config=testLaunchConfig_(),main=config.getSheetByName('Main');
  divisionTemplateAssertTestWorkbook_(book);assertSeasonWritable_(season);
  if(!testLaunchActive_(book)||!r.launchedAt||!r.exportId)throw new Error('The season is not launched.');
  if(r.pendingId)throw new Error('Finish or restart the full website rebuild first.');
  const active=websiteConfigFindKeyCell_(main,'active_test_season'),settings=config.getSheetByName(websiteConfigSeasonSheetName_(season));
  if(!active||String(active.offset(0,1).getValue())!==String(season))throw new Error('The Website is showing another season.');
  const count=Number(book.getSheetByName('Start Here').getRange('B5').getValue()),rounds=Number(book.getSheetByName('Start Here').getRange('B4').getValue());
  if(count!==r.count||rounds!==r.rounds||p.roster.some(d=>!Number.isInteger(d)||d<1||d>count)||p.calendar.some(n=>!Number.isInteger(n)||n<1||n>rounds))throw new Error('Season structure changed. Rebuild website data.');
  const divisions=p.calendar.length?Array.from({length:count},(_,i)=>i+1):p.roster;
  ['season_master_sheet_id'].concat(divisions.map(d=>'d'+d+'_sheet_id')).forEach(key=>{
    const cell=settings&&websiteConfigFindKeyCell_(settings,key);if(!cell||String(cell.offset(0,1).getValue())!==r.exportId)throw new Error('The public source changed. Check the website configuration.');
  });
  const dest=testLaunchExport_(r.exportId,season),writes=[],sources=[];
  SpreadsheetApp.flush();
  if(p.roster.length)writes.push({name:'M Teams & Principals',blocks:testLaunchRead_(book,'Teams & Principals',['A1:F13']).blocks});
  if(p.calendar.length)writes.push({name:'M Calendar',blocks:testLaunchRead_(book,'Calendar',['A1:E23']).blocks});
  divisions.forEach(d=>{
    const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(season,d));if(!id)throw new Error('Division '+d+' is not connected.');
    const source=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(source);sources.push({division:d,source});
    if(p.roster.includes(d))writes.push({name:'D'+d+' Data',blocks:testLaunchRosterPayload_(book,source,d).blocks});
    if(p.calendar.length){
      writes.push({name:'D'+d+' Race Calendar',blocks:testLaunchCalendarPayload_(book,source,rounds).blocks});
    }
  });
  // Check every destination before any writes. Do not create public tabs or
  // broaden the export allowlist during an ordinary update.
  writes.forEach(w=>{const s=dest.getSheetByName(w.name);if(!s)throw new Error('Missing public tab '+w.name+'. Rebuild website data.');w.blocks.forEach(b=>{if(b.row+b.values.length-1>s.getMaxRows()||b.column+b.values[0].length-1>s.getMaxColumns())throw new Error('Public tab layout changed: '+w.name);});});
  // Standings/totals can depend on cancellation and current assignments. Read
  // local calculated outputs, never the delayed Master results imports.
  const changed={};sources.forEach(s=>{
    const payload=testLaunchResultsPayload_(s.source,p.calendar.map(n=>'R'+n));changed[s.division]=payload;
    writes.push(...payload.map(p=>({name:'D'+s.division+' '+p.name,blocks:p.blocks})));
  });
  // Round payloads include E1/B4. Apply the Master overlay LAST so a delayed
  // division import cannot overwrite the just-saved track/cancellation value.
  sources.forEach(s=>p.calendar.forEach(n=>writes.push({name:'D'+s.division+' R'+n,blocks:[
    {row:1,column:5,values:[[book.getSheetByName('Calendar').getRange(n+1,4).getDisplayValue()]]},
    {row:4,column:2,values:[[book.getSheetByName('Calendar').getRange(n+1,5).getDisplayValue()==='Cancelled'?'Yes':'']]}
  ]})));
  // One combined total uses all changed divisions, plus the unchanged public ones.
  if(sources.length)writes.push(...testLaunchResultsTotals_(dest,count,changed));
  testLaunchValidateResultsWrites_(dest,writes);
  testLaunchWriteChangedPayload_(dest,writes);
  SpreadsheetApp.flush();
  if(p.licences)ticketPublicLicences_({season,spreadsheet:book});
  const latest=testLaunchRecord_(season);latest.updatedAt=new Date().toISOString();testLaunchStore_(season,latest);testLaunchSetConfig_(main,'test_snapshot_updated_at',latest.updatedAt);websiteConfigClearCache_();
  PropertiesService.getScriptProperties().deleteProperty(testLaunchUpdatesKey_(season));
}
function testLaunchCalendarPayload_(master,source,rounds){
  const payload=testLaunchRead_(source,'Race Calendar',['A1:F24']),rows=payload.blocks[0].values;
  const calendar=master.getSheetByName('Calendar').getRange(2,1,rounds,5).getDisplayValues(),reference=source.getSheetByName('Data').getRange('AD2:AH100').getDisplayValues();
  calendar.forEach((r,i)=>{const ref=reference.find(t=>t[0]===r[3]);rows[i+1][2]=r[2];rows[i+1][3]=r[3];rows[i+1][4]=ref?ref[1]:'';rows[i+1][5]=ref?ref[2]:'';});
  payload.blocks.push({row:1,column:7,values:[['Status']].concat(calendar.map(r=>[r[4]||'Scheduled']))});return payload;
}
function testLaunchRosterPayload_(master,source,division){
  const payload=testLaunchRead_(source,'Data',['A2:G46','I1:N25','J28:K40','P2:S26','T2:T26']);
  const entrants=master.getSheetByName('Season Entrants').getRange('A2:H501').getDisplayValues(),lines=master.getSheetByName('Division Line-ups').getRange(6+(division-1)*30,1,24,11).getDisplayValues(),teams=master.getSheetByName('Teams & Principals').getRange('A2:H13').getDisplayValues();
  const entrant=name=>entrants.find(r=>r[1]===name)||Array(8).fill(''),data=payload.blocks[0].values,main=payload.blocks[1].values,principals=payload.blocks[2].values,reserves=payload.blocks[3].values;
  data.slice(1).forEach(row=>{if(!row[0])return;const r=entrant(row[0]);if(r[1]){row[1]=r[2];row[2]=r[3];row[5]=r[6];row[6]=r[7];}});
  lines.forEach((line,i)=>{const r=entrant(line[1]),reserve=entrant(line[7]);main[i+1]=[line[0],line[1],r[6],r[7],line[4],line[5]];reserves[i+1]=[line[7],reserve[6],reserve[7],line[10]];});
  teams.forEach((t,i)=>principals[i+1]=[t[4],t[0]]);return payload;
}
function testLaunchConfig_() { const book=websiteConfigOpen_();if(book.getId()!==F1XL_TEST_LAUNCH.configId)throw new Error('The Portal and website must use the same Website Config. Check the configured workbook before launching.');return book; }

/** Refresh the existing TEST snapshot, retaining its public tab IDs. Never copy a
 * private sheet or change sharing. All reads and destination checks precede writes. */
function testLaunchUpdateResults_(selection,rounds){
  if(testLaunchRecord_(selection.season).sourceMode===F1XL_DIRECT_SOURCE_MODE)return;
  const measure=typeof fapPerformancePhase_==='function'?fapPerformancePhase_:function(name,work){return work();};
  const season=selection.season,r=testLaunchRecord_(season),book=testLaunchBook_(season),config=testLaunchConfig_();
  if(!testLaunchActive_(book)||!r.launchedAt||!r.exportId)throw new Error('Launch this season before publishing results.');
  if(r.pendingId)throw new Error('A full website refresh is in progress. Finish or restart it in Active season, then retry this results update.');
  const main=config.getSheetByName('Main'),active=websiteConfigFindKeyCell_(main,'active_test_season');
  if(!active||String(active.offset(0,1).getValue())!==season)throw new Error('The Website is displaying a different season. Check Season launch.');
  const seasonConfig=config.getSheetByName(websiteConfigSeasonSheetName_(season));
  ['season_master_sheet_id','d'+selection.division+'_sheet_id'].forEach(function(key){const cell=seasonConfig&&websiteConfigFindKeyCell_(seasonConfig,key);if(!cell||String(cell.offset(0,1).getValue())!==r.exportId)throw new Error('The Website source changed. Use the full website update.');});
  if(!Number.isInteger(r.count)||selection.division>r.count||!Number.isInteger(r.rounds)||rounds.some(n=>!/^R\d+$/.test(n)||Number(n.slice(1))<1||Number(n.slice(1))>r.rounds))throw new Error('The division or round is not in the launched snapshot. Use the full website update.');
  const sourceId=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(season,selection.division));
  if(!sourceId)throw new Error('The division workbook is not connected.');
  const source=SpreadsheetApp.openById(sourceId);divisionTemplateAssertTestWorkbook_(source);
  const dest=testLaunchExport_(r.exportId,season),prefix='D'+selection.division+' ';
  measure('publication.recalculate',function(){SpreadsheetApp.flush();});
  const payload=measure('publication.read',function(){return testLaunchResultsPayload_(source,rounds);});
  const overall=measure('publication.totals',function(){return testLaunchResultsTotals_(dest,r.count,selection.division,payload);});
  const writes=payload.map(p=>({name:prefix+p.name,blocks:p.blocks})).concat(overall);
  testLaunchValidateResultsWrites_(dest,writes);
  testLaunchWriteChangedPayload_(dest,writes);
  measure('publication.recalculate',function(){SpreadsheetApp.flush();});
  r.updatedAt=new Date().toISOString();testLaunchSetConfig_(main,'test_snapshot_updated_at',r.updatedAt);testLaunchStore_(season,r);websiteConfigClearCache_();
}
function testLaunchResultsPayload_(source,rounds){
  const specs=[['Driver Results NoSort',['A1:BN46']],['Constructors Standings NoSort',['A1:AC20']],['Driver Stats Calc Sheet',['A1:BS46']],['Team Stats Calc Sheet',['A1:AI14']]];
  rounds.forEach(n=>specs.push([n,['A1:J4','A7:L32','A35:L60','A64:L89','A92:L117']]));
  const payload=specs.map(s=>testLaunchRead_(source,s[0],s[1]));
  // Preserve fractional tie-break points even when the display rounds them.
  payload.forEach(p=>testLaunchExactTeamPoints_(source,p));return payload;
}
function testLaunchValidateResultsWrites_(dest,writes){
  writes.forEach(function(p){const sheet=dest.getSheetByName(p.name);if(!sheet)throw new Error('Missing public tab '+p.name+'. Use the full website update.');p.blocks.forEach(function(b){
    if(b.row+b.values.length-1>sheet.getMaxRows()||b.column+b.values[0].length-1>sheet.getMaxColumns())throw new Error('The public tab size changed. Use the full website update.');
    if(b.values.some(row=>row.some(v=>/^#(?:REF!|VALUE!|NAME\?|ERROR!|N\/A|DIV\/0!|NUM!)/.test(String(v)))))throw new Error('Fix the spreadsheet error in '+p.name+' before publishing.');
  });});
}

/** Compare only already-public destination data. Keep the original disjoint
 * allowlisted ranges, stable GIDs, and literal-text writes; never rewrite gaps. */
function testLaunchWriteChangedPayload_(dest,writes){
  const measure=typeof fapPerformancePhase_==='function'?fapPerformancePhase_:function(name,work){return work();};
  const pending=[];
  measure('publication.compare',function(){writes.forEach(function(p){
    const sheet=dest.getSheetByName(p.name),blocks=testLaunchCompactBlocks_(p.blocks);
    const top=Math.min.apply(null,blocks.map(b=>b.row)),left=Math.min.apply(null,blocks.map(b=>b.column)),bottom=Math.max.apply(null,blocks.map(b=>b.row+b.values.length-1)),right=Math.max.apply(null,blocks.map(b=>b.column+b.values[0].length-1));
    const range=sheet.getRange(top,left,bottom-top+1,right-left+1),display=range.getDisplayValues(),formulas=range.getFormulas();
    blocks.forEach(function(b){
      if(b.values.every((row,i)=>row.every((v,j)=>!formulas[b.row-top+i][b.column-left+j]&&String(v)===String(display[b.row-top+i][b.column-left+j]))))return;
      pending.push({sheet:sheet,block:b});
    });
  });});
  measure('publication.write',function(){pending.forEach(function(p){const b=p.block;p.sheet.getRange(b.row,b.column,b.values.length,b.values[0].length).setNumberFormat('@').setValues(b.values.map(row=>row.map(v=>/^[=+@-]/.test(String(v))?"'"+v:String(v))));});});
}

/** Same SUMIF / RANK / INT rules as SeasonMasterRebuildOverallOutputs_, using the
 * published division snapshots so IMPORTRANGE refresh delays cannot publish stale totals. */
function testLaunchResultsTotals_(dest,count,changedDivision,payload){
  const changes=typeof changedDivision==='object'?changedDivision:{[changedDivision]:payload};
  function publicRows(name,a1){const sheet=dest.getSheetByName(name);if(!sheet)throw new Error('Missing public tab '+name+'. Use the full website update.');return sheet.getRange(a1).getDisplayValues();}
  function divisionRows(d,name,a1,startRow,endRow,startCol,endCol){
    if(!changes[d])return publicRows('D'+d+' '+name,a1);
    const p=changes[d].find(p=>p.name===name),rows=Array.from({length:endRow-startRow+1},()=>Array(endCol-startCol+1).fill(''));
    p.blocks.forEach(b=>b.values.forEach((row,i)=>row.forEach((value,j)=>{const y=b.row+i-startRow,x=b.column+j-startCol;if(y>=0&&y<rows.length&&x>=0&&x<rows[0].length)rows[y][x]=value;})));return rows;
  }
  const normal=v=>String(v||'').trim().toLowerCase();
  const teams=publicRows('M Teams & Principals','A2:B13').map(row=>({short:row[0],name:row[1],points:0,weekly:Array(22).fill(0)}));
  if(!teams.some(t=>t.short)||new Set(teams.filter(t=>t.short).map(t=>normal(t.short))).size!==teams.filter(t=>t.short).length)throw new Error('Check the published team list before refreshing results.');
  function number(v){const s=String(v==null?'':v).trim();if(!s)return 0;const n=Number(s.replace(/,/g,''));if(!Number.isFinite(n))throw new Error('A published team points value is invalid. Refresh the full website after fixing the source.');return n;}
  for(let d=1;d<=count;d++){
    const standings=divisionRows(d,'Constructors Standings NoSort','A5:C16',5,16,1,3),weekly=divisionRows(d,'Team Stats Calc Sheet','A2:AI13',2,13,1,35);
    teams.filter(t=>t.short).forEach(function(team){
      standings.filter(row=>normal(row[1])===normal(team.short)).forEach(row=>team.points+=number(row[2]));
      weekly.filter(row=>normal(row[0])===normal(team.short)).forEach(row=>team.weekly=team.weekly.map((n,i)=>n+number(row[13+i])));
    });
  }
  const ranked=teams.filter(t=>t.short).slice().sort((a,b)=>b.points-a.points),max=Math.max.apply(null,ranked.map(t=>t.points));
  const rows=ranked.map(t=>[1+ranked.filter(o=>o.points>t.points).length,t.name,t.short,Math.floor(t.points),t.points]),gaps=ranked.map(t=>[t.points-max]);
  while(rows.length<12){rows.push(['','','','','']);gaps.push(['']);}
  return [{name:'M Overall Standings',blocks:[{row:3,column:4,values:rows},{row:3,column:10,values:gaps}]},
    {name:'M Weekly Totals',blocks:[{row:3,column:1,values:teams.map(t=>[t.short].concat(t.short?t.weekly:Array(22).fill('')))}]}];
}

// Direct sources retain Sheets as the manual fallback. Shared public views are
// formulas in the existing config workbook, never copies written after saves.
const F1XL_DIRECT_SOURCE_MODE='direct_division_v1';
function testLaunchAdoptDirect_(season,r){
  if(r.sourceMode||!r.launchedAt||r.pendingId||Number(season)<28)return r;
  let config;try{config=SpreadsheetApp.openById(F1XL_TEST_LAUNCH.configId);}catch(unavailable){return r;}
  if(typeof config.getSheetByName!=='function'||typeof websiteConfigSeasonSheetName_!=='function')return r;
  const settings=config.getSheetByName(websiteConfigSeasonSheetName_(season));
  if(!settings)return r;
  const flag=websiteConfigFindKeyCell_(settings,'source_mode');
  if(!flag||flag.offset(0,1).getDisplayValue()!==F1XL_DIRECT_SOURCE_MODE)return r;
  // The previous exportId is retained for rollback, but no direct save writes it.
  r.sourceMode=F1XL_DIRECT_SOURCE_MODE;r.publicWorkbookId=config.getId();r.connectionUrl=config.getUrl();
  PropertiesService.getScriptProperties().setProperty(F1XL_TEST_LAUNCH.prefix+season,JSON.stringify(r));
  const props=PropertiesService.getScriptProperties();
  // Only redundant copy queues are retired. Ticket delivery/appeal recovery and
  // rename journals are authoritative and remain untouched.
  [testLaunchUpdatesKey_(season),'MOVEMENT_PUBLIC_PENDING_'+season].concat(Array.from({length:Number(r.count)||0},(_,i)=>'F1XL_RESULTS_PUBLICATION_V1_'+season+'_'+(i+1))).forEach(k=>props.deleteProperty(k));
  return r;
}
function testLaunchDirectViews_(book,season,count){
  const id=book.getId(),col=divisionTemplateColumnLetter_(count*4-1),movement=book.getSheetByName('Driver Movements');
  const importRange=(name,range)=>'=IMPORTRANGE("'+id+'","\''+name+'\'!'+range+'")';
  // QUERY otherwise drops text-entered rounds in a mostly numeric column.
  // This display-only view uses text for all public fields; source cells stay intact.
  const query='=QUERY(ARRAYFORMULA(TO_TEXT({IMPORTRANGE("'+id+'","\'Driver Movements\'!B:B"),IMPORTRANGE("'+id+'","\'Driver Movements\'!D:P")})),"select * where Col2 is not null label Col1 \'Date\',Col2 \'Driver\',Col14 \'Reason\'",1)';
  return [
    ['Teams & Principals',13,6,importRange('Teams & Principals','A1:F13')],
    ['Calendar',23,5,importRange('Calendar','A1:E23')],
    ['Summary',46,count*4-1,importRange('Summary','A1:'+col+'46')],
    ['Outstanding Bans',201,7,'=QUERY(IMPORTRANGE("'+id+'","\'Outstanding Bans\'!A:G"),"select * where Col2 is not null",1)'],
    ['Penalty Guide',Math.max(1,book.getSheetByName('Penalty Guide').getLastRow()),4,importRange('Penalty Guide','A1:D'+Math.max(1,book.getSheetByName('Penalty Guide').getLastRow()))],
    ['Driver Movements',Math.max(1000,movement?movement.getMaxRows():1000),14,query],
    ['Overall Standings',15,13,importRange('Overall Standings','A1:M15')],
    ['Weekly Totals',14,23,importRange('Weekly Totals','A1:W14')]
  ].map(s=>({base:s[0],name:'S'+season+' Public '+s[0],rows:s[1],cols:s[2],formula:s[3]}));
}
function testLaunchPrepareDirectViews_(book,season,count){
  const config=testLaunchConfig_();
  testLaunchDirectViews_(book,season,count).forEach(v=>{
    let s=config.getSheetByName(v.name);if(!s)s=config.insertSheet(v.name);
    if(s.getMaxRows()<v.rows)s.insertRowsAfter(s.getMaxRows(),v.rows-s.getMaxRows());
    if(s.getMaxColumns()<v.cols)s.insertColumnsAfter(s.getMaxColumns(),v.cols-s.getMaxColumns());
    const anchor=s.getRange('A1');
    if(anchor.getFormula()!==v.formula){if(!anchor.getFormula()&&anchor.getDisplayValue())throw Error('Check the existing public view '+v.name+' before reconnecting it.');anchor.setFormula(v.formula);}
    anchor.setNote('Automatic public racing view. Edit the Season Master or division working sheets. No portal publication is required. Private admin columns are excluded.');
    s.setFrozenRows(v.base==='Summary'?2:1);s.getRange(1,1,1,v.cols).setFontWeight('bold');
    if(v.base==='Summary')s.getRange(3,1,44,v.cols).setNumberFormat('0.#########');
  });
  return config;
}
function testLaunchPrepareDirectDivision_(book,source,rounds){
  const calendar=source.getSheetByName('Race Calendar'),old=calendar.getRange('G1').getDisplayValue();
  if(old&&old!=='Status')throw Error('Race Calendar column G is in use. Check it before connecting direct sources.');
  calendar.getRange('G1').setFormula('=LET(status,IMPORTRANGE("'+book.getId()+'","\'Calendar\'!E2:E'+(rounds+1)+'"),{"Status";ARRAYFORMULA(IF(status="","Scheduled",status))})');
  for(let n=1;n<=rounds;n++)source.getSheetByName('R'+n).getRange('B4').setFormula('=IF(\'Race Calendar\'!G'+(n+1)+'="Cancelled","Yes","")');
  // Hidden decimals encode constructor ties; keep sufficient CSV precision.
  source.getSheetByName('Constructors Standings NoSort').getRange('C5:C16').setNumberFormat('0.000000');
  source.getSheetByName('Driver License').getRange('B3:C46').setNumberFormat('0.#########');
}
function testLaunchDirectConfigure_(book,season){
  const config=testLaunchConfig_(),setup=book.getSheetByName('Start Here').getRange('B4:B5').getValues().flat(),rounds=Number(setup[0]),count=Number(setup[1]);
  const view=name=>config.getSheetByName('S'+season+' Public '+name),views=testLaunchDirectViews_(book,season,count);
  views.forEach(v=>{const s=view(v.base);if(!s||/^#/.test(s.getRange('A1').getDisplayValue()))throw Error('Open the public team view and Allow access in A1, then continue launch. '+config.getUrl());});
  const facade={getId:()=>config.getId(),getUrl:()=>config.getUrl(),getSheetByName:view};
  const sources={season,rounds,master:facade,divisions:[]};
  for(let d=1;d<=count;d++){const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(season,d));if(!id)throw Error('Connect Division '+d+' first.');const b=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(b);sources.divisions.push({division:d,workbook:b});}
  websiteConfigWriteSeason_(config,sources,String(count),count);
  const settings=config.getSheetByName(websiteConfigSeasonSheetName_(season)),main=config.getSheetByName('Main');
  testLaunchSetConfig_(settings,'source_mode',F1XL_DIRECT_SOURCE_MODE);
  testLaunchSetConfig_(settings,'direct_overall_gid',view('Overall Standings').getSheetId());
  testLaunchSetConfig_(settings,'direct_weekly_gid',view('Weekly Totals').getSheetId());
  websiteConfigUpdateCurrentLicence_(config,facade);
  testLaunchSetConfig_(main,'driver_movements_sheet',config.getId());testLaunchSetConfig_(main,'driver_movements_gid',view('Driver Movements').getSheetId());
  testLaunchSetConfig_(main,'active_test_season',season);testLaunchSetConfig_(main,'test_season_phase','active');
  testLaunchSetConfig_(main,'test_licences_ready','yes');
  if(typeof ticketWebsiteConnect_==='function')ticketWebsiteConnect_(main,season);
  websiteConfigClearCache_();return config;
}
function testLaunchBeginDirect_(c){
  const r=c.record;if(r.pendingId)throw Error('Finish the previous website preparation before switching sources.');
  r.sourceMode=F1XL_DIRECT_SOURCE_MODE;r.pendingDirect=true;r.step=0;r.count=c.count;r.rounds=c.rounds;r.sourceRevision=c.revision;r.publicWorkbookId=c.config.getId();
  r.connectionUrl=c.config.getUrl();testLaunchStore_(c.season,r);return {season:c.season,step:0,total:c.count+2,done:false};
}
function testLaunchAdvanceDirect_(season,r,input){
  if(!r.pendingDirect)return {done:true,season};
  if(Number(input.step)!==r.step)return {done:false,season,step:r.step,total:r.count+2};
  const book=testLaunchBook_(season);
  if(r.step===0){const config=testLaunchPrepareDirectViews_(book,season,r.count),team=config.getSheetByName('S'+season+' Public Teams & Principals');r.connectionUrl=config.getUrl()+'#gid='+team.getSheetId();}
  else if(r.step<=r.count){const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(season,r.step)),b=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(b);testLaunchPrepareDirectDivision_(book,b,r.rounds);divisionTemplateMakeWebsiteReadable_(DriveApp.getFileById(id));}
  else{
    const current=testLaunchCheck_(season);if(current.issues.length||current.revision!==r.sourceRevision)throw Error('Season readiness changed. Check the season before continuing.');
    testLaunchDirectConfigure_(book,season);r.launchedAt=r.launchedAt||new Date().toISOString();r.updatedAt=new Date().toISOString();delete r.pendingDirect;delete r.step;delete r.sourceRevision;
    testLaunchStore_(season,r);book.getSheetByName('Start Here').getRange('I7').setValue('Active');clearTestLaunchCheckCache_(season);if(typeof clearPreseasonHubCache_==='function')clearPreseasonHubCache_();if(typeof ticketFormQueue_==='function')ticketFormQueue_(season,true);return {done:true,season,website:F1XL_TEST_LAUNCH.website};
  }
  r.step++;testLaunchStore_(season,r);return {done:false,season,step:r.step,total:r.count+2};
}
