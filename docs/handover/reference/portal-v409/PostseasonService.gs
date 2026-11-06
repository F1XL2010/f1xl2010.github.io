/**
 * The small, deliberate bridge from an active TEST season to completed history.
 * Closing never changes the public current-season route: that remains a later,
 * explicit website archive step. It only freezes the FAP's operational writes.
 */
const F1XL_POSTSEASON = Object.freeze({
  propertyPrefix:'F1XL_POSTSEASON_CLOSED_',
  sheetName:'Post-season',
  marker:'F1XL Post-season v1'
});

function postseasonClosedPropertyKey_(season) {
  return F1XL_POSTSEASON.propertyPrefix + String(season).replace(/\./g,'_');
}

function postseasonClosedRecord_(season) {
  const raw=PropertiesService.getScriptProperties().getProperty(postseasonClosedPropertyKey_(season));
  try{return raw?JSON.parse(raw):null;}catch(error){return {invalid:true};}
}

/** Called by discovery only; it deliberately bypasses the FAP write guard. */
function postseasonOpenMaster_(season) {
  const id=PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season));
  if(!id)throw new Error('Season '+season+' does not have a connected Season Master.');
  const book=SpreadsheetApp.openById(id);seasonMasterAssertTestWorkbook_(book);
  return book;
}

function postseasonDiscover_() {
  const properties=PropertiesService.getScriptProperties().getProperties(),hubs=[];
  Object.keys(properties).filter(function(key){return key.indexOf(F1XL_SEASON_MASTER.propertyPrefix)===0;}).forEach(function(key){
    const season=key.substring(F1XL_SEASON_MASTER.propertyPrefix.length).replace(/_/g,'.'),record=postseasonClosedRecord_(season);
    if(!record||record.invalid)return;
    try { const book=postseasonOpenMaster_(season);hubs.push({season:season,url:book.getUrl(),closedAt:record.closedAt||'',snapshotUrl:record.snapshotUrl||''}); }catch(error){}
  });
  return hubs.sort(function(a,b){return Number(b.season)-Number(a.season);});
}

function postseasonContext_(value) {
  const season=String(value==null?'':value).trim();
  if(!/^\d+(?:\.5)?$/.test(season))throw new Error('Choose a connected season first.');
  const book=postseasonOpenMaster_(season),start=book.getSheetByName('Start Here'),calendar=book.getSheetByName('Calendar');
  if(!start||!calendar)throw new Error('The Season Master is missing Start Here or Calendar.');
  const stage=String(start.getRange('I7').getDisplayValue()).trim(),count=Number(start.getRange('B5').getValue()),rounds=Number(start.getRange('B4').getValue());
  if(['Active','Closed'].indexOf(stage)<0)throw new Error('Open End season only for an active or closed TEST season.');
  if(!Number.isInteger(count)||count<1||count>F1XL_CAPACITY.divisions||!Number.isInteger(rounds)||rounds<1||rounds>F1XL_CAPACITY.rounds)throw new Error('Check the season division or round count in the Master.');
  const properties=PropertiesService.getScriptProperties(),rows=calendar.getRange(2,1,rounds,Math.min(5,calendar.getMaxColumns())).getDisplayValues();
  const divisions=[];
  for(let d=1;d<=count;d++) {
    const id=properties.getProperty(divisionTemplatePropertyKey_(season,d));
    if(!id){divisions.push({division:d,issue:'Workbook not connected',rounds:[]});continue;}
    try {
      const workbook=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(workbook);
      divisions.push({division:d,issue:'',rounds:Array.from({length:rounds},function(_,i){const sheet=workbook.getSheetByName('R'+(i+1));return sheet?resultsEntrySheetProgress_(sheet):'Missing';})});
    } catch(error) { divisions.push({division:d,issue:error.message||String(error),rounds:[]}); }
  }
  const calendarRows=rows.map(function(row,index){return {round:index+1,date:row[2]||'',track:row[3]||'',status:row[4]==='Cancelled'?'Cancelled':'Scheduled'};});
  const record=postseasonClosedRecord_(season),launch=testLaunchRecord_(season);
  const revision=intakeHash_([stage,calendarRows,divisions.map(function(d){return [d.division,d.issue,d.rounds];}),launch.updatedAt||'',record||{}]);
  return {season:season,book:book,start:start,stage:stage,count:count,rounds:rounds,calendarRows:calendarRows,divisions:divisions,record:record,launch:launch,revision:revision};
}

function postseasonRoundSummary_(c) {
  return c.calendarRows.map(function(round){
    const progress=c.divisions.map(function(d){return d.issue?'Unavailable':d.rounds[round.round-1]||'Missing';});
    const final=round.status==='Cancelled'||progress.length===c.count&&progress.every(function(value){return value==='Complete';});
    return Object.assign({},round,{progress:progress,final:final});
  });
}

function postseasonCareerCheck_(season,closed) {
  if(closed)return {ok:true,closed:true,message:'Career Stats were verified before this season was closed.'};
  try{return verifyTestCareerSeasonFormulas({season:season});}catch(error){return {ok:false,message:error.message||String(error)};}
}

function postseasonWebsiteCheck_(season,launch,closedRecord) {
  try {
    const config=testLaunchConfig_(),main=config.getSheetByName('Main'),row=websiteConfigFindSeasonRow_(config,season);
    const active=websiteConfigFindKeyCell_(main,'active_test_season'),phase=websiteConfigFindKeyCell_(main,'test_season_phase'),completed=websiteConfigFindKeyCell_(main,'latest_completed_test_season');
    const activeSeason=active?String(active.offset(0,1).getDisplayValue()).trim():'',phaseValue=phase?String(phase.offset(0,1).getDisplayValue()).trim().toLowerCase():'',completedSeason=completed?String(completed.offset(0,1).getDisplayValue()).trim():'';
    const archived=!!closedRecord&&phaseValue==='postseason'&&completedSeason===String(season)&&!activeSeason;
    const ready=!!(row&&row.gid&&row.divisions&&(launch.sourceMode===F1XL_DIRECT_SOURCE_MODE||launch.exportId)&&launch.updatedAt&&(activeSeason===String(season)||archived));
    return {ok:ready,archived:archived,url:config.getUrl(),activeSeason:activeSeason,phase:phaseValue,completedSeason:completedSeason,message:archived?'Website Config now treats Season '+season+' as completed. Results, Teams, Weekly Totals and Cool Stats remain available.':ready?'Final working-sheet sources are registered. Closing will move current standings into Past Seasons and put the site into its between-seasons state.':'Website Config or the working-sheet connections need attention before closure.'};
  } catch(error) { return {ok:false,archived:false,message:error.message||String(error)}; }
}

function preparePostseasonCareerStats(input) { fapAssertEntry_('preparePostseasonCareerStats'); return prepareTestCareerSeasonFormulas(input); }

function postseasonAccoladeCheck_(season) {
  try { const preview=getSeasonAccoladesPreview({season:season});return {ok:!!preview.alreadyFinalised,alreadyFinalised:!!preview.alreadyFinalised,canFinalise:!!preview.canFinalise,blockers:preview.blockers||[],warnings:preview.warnings||[],revision:preview.revision,message:preview.alreadyFinalised?'Permanent accolades are finalised.':preview.message}; }
  catch(error){return {ok:false,message:error.message||String(error),blockers:[error.message||String(error)]};}
}

function postseasonResponse_(c) {
  const roundSummary=postseasonRoundSummary_(c),closed=c.stage==='Closed'||!!c.record,career=postseasonCareerCheck_(c.season,closed),accolades=postseasonAccoladeCheck_(c.season),website=postseasonWebsiteCheck_(c.season,c.launch,c.record);
  return {season:c.season,url:c.book.getUrl(),stage:closed?'Closed':'Active',revision:c.revision,rounds:roundSummary,
    resultsReady:roundSummary.every(function(round){return round.final;}),career:career,accolades:accolades,
    snapshot:{ready:!!((c.launch.sourceMode===F1XL_DIRECT_SOURCE_MODE||c.launch.exportId)&&c.launch.updatedAt),updatedAt:c.launch.updatedAt||'',url:(c.launch.publicWorkbookId||c.launch.exportId)?'https://docs.google.com/spreadsheets/d/'+(c.launch.publicWorkbookId||c.launch.exportId)+'/edit':'',website:F1XL_TEST_LAUNCH.website},websiteConfig:website,
    closure:c.record&& !c.record.invalid?c.record:null,
    message:closed?'Season '+c.season+' is closed in the FAP. Its working sheets and website sources are retained.':'Finish the checks below before closing this season.'};
}

function getPostseasonOverview(input) { fapAssertEntry_('getPostseasonOverview'); return postseasonResponse_(postseasonContext_(input&&input.season)); }

/**
 * Runs the same source checks used during season close-out but deliberately
 * stops before every write. This lets an unfinished TEST season prove its
 * connections and reveal close-out blockers without contaminating records.
 */
function getPostseasonClosureRehearsal(input) { fapAssertEntry_('getPostseasonClosureRehearsal');
  const c=postseasonContext_(input&&input.season);
  const rounds=postseasonRoundSummary_(c),issues=[];
  let statistics=null,accolades=null,website=null;
  try { statistics=getDriverSeasonStatisticsPreview(c.season,true); }
  catch(error) { issues.push('Career Stats preview: '+(error.message||String(error))); }
  try { accolades=getSeasonAccoladesPreview({season:c.season}); }
  catch(error) { issues.push('Accolades preview: '+(error.message||String(error))); }
  try { website=postseasonWebsiteCheck_(c.season,c.launch,c.record); }
  catch(error) { issues.push('Website Config preview: '+(error.message||String(error))); }
  if(rounds.some(function(round){return !round.final;}))issues.push('Results are not final yet. This is expected while the test season is still running.');
  if(statistics&&statistics.unmatched)issues.push(statistics.unmatched+' Career Stats entrant(s) do not resolve to a permanent driver profile.');
  if(accolades&&accolades.blockers&&accolades.blockers.length)issues.push.apply(issues,accolades.blockers);
  if(!website||!website.ok)issues.push((website&&website.message)||'Website Config is not ready for a post-season transition.');
  const changes=[
    ['Website Config: active_test_season',website&&website.activeSeason?'S'+website.activeSeason:'(empty)','(empty)'],
    ['Website Config: test_season_phase',website&&website.phase||'offseason','postseason'],
    ['Website Config: latest_completed_test_season',website&&website.completedSeason?'S'+website.completedSeason:'(empty)','S'+c.season],
    ['Website Config: S'+c.season+' status','Active / Ready','Past season'],
    ['Public site','Current standings and calendar visible','Between-seasons state; standings available in Past Seasons'],
    ['Public site retained','—','Results, Teams, Weekly Totals and Cool Stats for S'+c.season]
  ];
  return {
    ok:true,readOnly:true,season:c.season,stage:c.stage,
    results:{ready:rounds.every(function(round){return round.final;}),rounds:rounds},
    career:statistics?{ok:statistics.unmatched===0,matched:statistics.matched,unmatched:statistics.unmatched,message:statistics.message}:null,
    accolades:accolades?{ready:!!accolades.canFinalise,records:accolades.rows.length,blockers:accolades.blockers||[],warnings:accolades.warnings||[],message:accolades.message}:null,
    website:website?{ready:website.ok,message:website.message}:null,
    proposedChanges:changes,issues:postseasonUnique_(issues),
    message:'Closure rehearsal complete. No Google Sheet, permanent record, FAP setting or Website Config value was changed.'
  };
}

function postseasonUnique_(items) {
  return items.filter(function(item,index){return item&&items.indexOf(item)===index;});
}

function finalisePostseasonAccolades(input) { fapAssertEntry_('finalisePostseasonAccolades'); return finaliseSeasonAccolades(input); }

function postseasonArchiveWebsite_(c,closedAt) {
  const config=testLaunchConfig_(),main=config.getSheetByName('Main'),row=websiteConfigFindSeasonRow_(config,c.season);
  if(!row||!row.gid||!row.divisions)throw new Error('Season '+c.season+' is not fully registered in Website Config. Update the website first.');
  const seasonSheet=config.getSheetByName(websiteConfigSeasonSheetName_(c.season));if(!seasonSheet)throw new Error('Website Config is missing the Season '+c.season+' tab.');
  const keys=['active_test_season','test_season_phase','latest_completed_test_season','test_season_closed_at','signups_open'];
  const before={config:config,main:main,statusRow:0,status:'',seasonSheet:seasonSheet,seasonArchiveState:'',seasonClosedAt:''};
  before.values=keys.map(function(key){const cell=websiteConfigFindKeyCell_(main,key);return {key:key,value:cell?cell.offset(0,1).getValue():''};});
  const statusCell=websiteConfigFindKeyCell_(main,'s'+String(c.season).replace('.','_')+'_gid');if(statusCell){before.statusRow=statusCell.getRow();before.status=main.getRange(before.statusRow,6).getValue();}
  const archiveCell=websiteConfigFindKeyCell_(seasonSheet,'archive_state'),closedCell=websiteConfigFindKeyCell_(seasonSheet,'archive_closed_at');before.seasonArchiveState=archiveCell?archiveCell.offset(0,1).getValue():'';before.seasonClosedAt=closedCell?closedCell.offset(0,1).getValue():'';
  try {
    testLaunchSetConfig_(main,'active_test_season','');testLaunchSetConfig_(main,'test_season_phase','postseason');testLaunchSetConfig_(main,'latest_completed_test_season',c.season);testLaunchSetConfig_(main,'test_season_closed_at',closedAt);testLaunchSetConfig_(main,'signups_open','no');
    if(statusCell)main.getRange(statusCell.getRow(),6).setValue('Past season').setBackground('#d9e2f3');
    testLaunchSetConfig_(seasonSheet,'archive_state','past season');testLaunchSetConfig_(seasonSheet,'archive_closed_at',closedAt);websiteConfigClearCache_();
    return before;
  } catch(error) { postseasonRestoreWebsite_(before);throw error; }
}

function postseasonRestoreWebsite_(before) {
  if(!before)return;
  before.values.forEach(function(item){testLaunchSetConfig_(before.main,item.key,item.value);});
  if(before.statusRow)before.main.getRange(before.statusRow,6).setValue(before.status);
  testLaunchSetConfig_(before.seasonSheet,'archive_state',before.seasonArchiveState);testLaunchSetConfig_(before.seasonSheet,'archive_closed_at',before.seasonClosedAt);websiteConfigClearCache_();
}

function closeTestSeason(input) { fapAssertEntry_('closeTestSeason');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const c=postseasonContext_(input&&input.season);
    if(c.stage!=='Active')throw new Error('This season is already closed or is not active.');
    if(String(input&&input.revision||'')!==c.revision)throw new Error('The season changed while you were reviewing it. Refresh the close-out checks.');
    const rounds=postseasonRoundSummary_(c);if(rounds.some(function(round){return !round.final;}))throw new Error('Every scheduled round must be complete in every division, or marked Cancelled, before closing.');
    if(!(c.launch.sourceMode===F1XL_DIRECT_SOURCE_MODE||c.launch.exportId)||!c.launch.updatedAt)throw new Error('Check the final Website and its source connections before closing.');
    const career=postseasonCareerCheck_(c.season,false);if(!career.ok)throw new Error(career.message||'Career Stats need verification before closing.');
    const accolades=postseasonAccoladeCheck_(c.season);if(!accolades.alreadyFinalised)throw new Error('Finalise permanent accolades before closing this season.');
    const website=postseasonWebsiteCheck_(c.season,c.launch,null);if(!website.ok)throw new Error(website.message||'Website Config needs attention before closing.');
    if(input.ticketsChecked!==true||input.licencesChecked!==true||input.snapshotChecked!==true)throw new Error('Confirm that ticket/appeal outcomes, licence work and the final website have been checked.');
    const phrase='CLOSE SEASON '+c.season;if(String(input.confirmation||'').trim()!==phrase)throw new Error('Type '+phrase+' exactly. Nothing was changed.');
    const now=new Date().toISOString(),record={season:c.season,closedAt:now,snapshotUrl:'https://docs.google.com/spreadsheets/d/'+(c.launch.publicWorkbookId||c.launch.exportId)+'/edit',snapshotUpdatedAt:c.launch.updatedAt,masterUrl:c.book.getUrl()};
    let sheet=c.book.getSheetByName(F1XL_POSTSEASON.sheetName);if(!sheet)sheet=c.book.insertSheet(F1XL_POSTSEASON.sheetName);
    const rows=[[F1XL_POSTSEASON.marker,''],['Season',c.season],['Closed at',now],['Final website sources',record.snapshotUrl],['Sources connected at',c.launch.updatedAt],['Career Stats','Committed and verified before closure'],['Accolades','Finalised before closure'],['Tickets / appeals','Checked manually before closure'],['Licences / bans','Checked manually before closure'],['Website archive','Past-season standings enabled; current standings and calendar cleared'],['Website content retained','Results, Teams, Weekly Totals and Cool Stats']];
    if(sheet.getMaxRows()<rows.length)sheet.insertRowsAfter(sheet.getMaxRows(),rows.length-sheet.getMaxRows());
    if(sheet.getMaxColumns()<2)sheet.insertColumnsAfter(sheet.getMaxColumns(),2-sheet.getMaxColumns());
    let websiteUndo=null;
    try { websiteUndo=postseasonArchiveWebsite_(c,now);intakeCommit_([{range:sheet.getRange(1,1,rows.length,2),values:rows,text:true},{range:c.start.getRange('I7'),values:[['Closed']],text:true}]);PropertiesService.getScriptProperties().setProperty(postseasonClosedPropertyKey_(c.season),JSON.stringify(record)); }
    catch(error){postseasonRestoreWebsite_(websiteUndo);throw error;}
    CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);if(typeof clearPreseasonHubCache_==='function')clearPreseasonHubCache_();websiteConfigClearCache_();
    return Object.assign(postseasonResponse_(postseasonContext_(c.season)),{message:'Season '+c.season+' is closed in the FAP. The public website was not switched to another season.'});
  } finally {lock.releaseLock();}
}
