/** Explicit handover of confirmed draft rosters. Never launches or publishes a season. */
function preseasonPreparationKey_(season,division) { return 'F1XL_PREP_V1_'+season+'_'+division; }
function preseasonPreparationRecord_(season,division) {
  const text=PropertiesService.getScriptProperties().getProperty(preseasonPreparationKey_(season,division));
  return text?JSON.parse(text):{};
}
function preseasonPreparationStore_(season,division,value) {
  PropertiesService.getScriptProperties().setProperty(preseasonPreparationKey_(season,division),JSON.stringify(value));
}
function preseasonPreparationResumable_(r) {
  // Compatibility for the original release: this exact quota exception could
  // only occur at trigger installation, after build + compact licence completed.
  return !!r.workbookId&&!r.built&&(r.phase==='Workbook built'||/This script has too many triggers|All 20 Apps Script trigger slots/i.test(r.error||''));
}
function preseasonPreparationContext_(season) {
  const c=preseasonAllocationBase_(season);
  const draw=preseasonTrackDrawContext_(c.season);
  c.prepRaces=draw.races;
  c.prepTeams=seasonPlanningValues_(c.book.getSheetByName('Teams & Principals').getRange(2,1,12,8)).map(function(r){return [r[0],r[4],r[5]];});
  c.prepSettings=intakeHash_([c.placement.board.length,c.prepTeams,c.prepRaces,c.book.getSheetByName('Start Here').getRange('I6').getDisplayValue()]);
  c.prepIssues=[];
  if(!draw.savedAt||draw.races.some(function(r){return !r.track;}))c.prepIssues.push('Save a complete track draw first.');
  if(!c.book.getSheetByName('Division Line-ups')||!c.book.getSheetByName('Season Entrants'))c.prepIssues.push('The Master is missing its line-ups or entrants tab.');
  return c;
}
function preseasonPreparationRoster_(a) { return a.drivers.filter(function(d){return d.role!=='Available reserve';}); }
function preseasonPreparationSource_(c,a) {
  return intakeHash_([preseasonPreparationRoster_(a).map(function(d){const p=c.placement.drivers.find(function(p){return p.driverId===d.driverId;});return [d.driverId,d.gamertag,d.role,d.team,d.tier,p&&p.application.platform||'',p&&p.application.controller||''];}),c.prepSettings]);
}
function preseasonPreparationMasterHash_(c,division,ids) {
  const lines=c.book.getSheetByName('Division Line-ups'),entries=c.book.getSheetByName('Season Entrants');
  if(!lines||!entries)return '';
  return intakeHash_([seasonPlanningValues_(lines.getRange(4+(division-1)*30,1,26,11)),
    seasonPlanningValues_(entries.getRange(2,1,500,8)).filter(function(r){return ids.indexOf(String(r[0]))>=0;})]);
}
function preseasonPreparationStatus_(c,division,connections) {
  const a=preseasonAllocationResponse_(c,division),r=preseasonPreparationRecord_(c.season,division),roster=preseasonPreparationRoster_(a);
  const source=preseasonPreparationSource_(c,a),ids=roster.map(function(d){return d.driverId;});
  const issues=c.prepIssues.slice();
  if(a.state!=='Confirmed')issues.push('Finish and confirm this division’s allocations.');
  if(roster.length>40)issues.push('This division has '+roster.length+' drivers; the division workbook supports 40 including reserves. Its capacity needs extending before preparation.');
  if(roster.filter(function(d){return d.role==='Reserve';}).length>24)issues.push('The reserve area supports 24 names. Its capacity needs extending before preparation.');
  const masterHash=preseasonPreparationMasterHash_(c,division,r.ids||ids);
  const edited=!!r.masterHash&&masterHash!==r.masterHash;
  if(edited)issues.push('The prepared Master line-up or entrant details changed directly. Review them before copying another roster.');
  const registered=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,division));
  if(registered&&registered!==r.workbookId)issues.push('A division workbook already exists outside this preparation step. Review its connection before continuing.');
  const building=r.buildStarted&&Date.now()-r.buildStarted<10*60*1000&&!r.built;
  const resumable=preseasonPreparationResumable_(r);
  if(r.workbookId&&!r.built&&!building&&!resumable)issues.push('An unfinished workbook copy is retained. Open it for inspection; move it to the Drive bin to permit a clean retry.');
  const current=!!r.masterHash&&r.source===source&&!edited;
  if(r.masterHash){
    const calendar=seasonPlanningValues_(c.book.getSheetByName('Calendar').getRange(2,1,c.prepRaces.length,4));
    const expected=c.prepRaces.map(function(r){return [r.round,r.weekend,r.date,r.track];});
    const savedCalendar=PropertiesService.getScriptProperties().getProperty(preseasonPreparationKey_(c.season,'calendar'));
    if(intakeHash_(calendar)!==intakeHash_(expected)&&savedCalendar!==intakeHash_(calendar))issues.push('The Master calendar and saved track draw differ. Review the calendar before creating a workbook.');
  }
  c.placement.board.forEach(function(b){const other=preseasonPreparationRecord_(c.season,b.number);if(other.workbookId&&other.settings!==c.prepSettings)issues.push('Calendar, team or division settings changed after workbook creation. Review the existing workbooks first.');});
  let connection=null;
  if(connections&&r.built&&r.workbookId){try{connection=seasonMasterReadDivisionConnection_(c.book,SpreadsheetApp.openById(r.workbookId),division);}catch(e){issues.push('Cannot check the workbook: '+e.message);}}
  return {division:division,revision:intakeHash_([a.revision,source,masterHash,r,registered]),state:building?'Creating workbook':issues.length?'Needs attention':resumable?'Finish setup':r.built&&current?'Prepared':current?'Roster copied':r.masterHash?'Roster changed':'Ready to prepare',
    issues:issues,roster:roster.map(function(d){return {name:d.gamertag,team:d.team||'Reserve',tier:d.tier};}),count:roster.length,reserves:roster.filter(function(d){return d.role==='Reserve';}).length,
    canCopy:!building&&!issues.length&&!current&&!resumable,canCreate:!building&&current&&!issues.length&&!r.built&&!resumable,canRetry:!!r.workbookId&&!r.built&&!building&&!resumable,canResume:!building&&current&&!issues.length&&resumable,canConnect:!!r.built,
    workbookUrl:r.workbookId?'https://docs.google.com/spreadsheets/d/'+encodeURIComponent(r.workbookId)+'/edit':'',connection:connection,error:r.error||'',current:current};
}
function getPreseasonPreparation(input) { fapAssertEntry_('getPreseasonPreparation');
  const c=preseasonPreparationContext_(input.season);
  return {season:c.season,url:c.book.getUrl(),divisions:c.placement.board.slice().reverse().map(function(b){return preseasonPreparationStatus_(c,b.number,true);}),message:'Prepare each confirmed division independently. The season remains in preseason.'};
}
function preseasonPreparationCheck_(c,input) {
  const division=Number(input.division);
  if(!c.placement.board.some(function(b){return b.number===division;}))throw new Error('Choose a placement division.');
  const status=preseasonPreparationStatus_(c,division,false);
  intakeRequireRevision_(input,status);return status;
}
function copyPreseasonDivisionRoster(input) { fapAssertEntry_('copyPreseasonDivisionRoster');
  return withApplicationLock_(function(){
    const c=preseasonPreparationContext_(input.season),status=preseasonPreparationCheck_(c,input),division=status.division;
    if(!status.canCopy)throw new Error(status.issues.join(' ')||'This roster is already copied. Refresh to continue.');
    const a=preseasonAllocationResponse_(c,division),roster=preseasonPreparationRoster_(a),record=preseasonPreparationRecord_(c.season,division);
    // Structural changes cannot rebuild workbooks that may already contain results.
    c.placement.board.forEach(function(b){const r=preseasonPreparationRecord_(c.season,b.number);if(r.workbookId&&r.settings!==c.prepSettings)throw new Error('The calendar, teams or division count changed after workbook creation. Review the existing workbooks before preparing more divisions.');});
    const lines=c.book.getSheetByName('Division Line-ups'),entries=c.book.getSheetByName('Season Entrants'),start=4+(division-1)*30;
    if(JSON.stringify(entries.getRange('A1:H1').getDisplayValues()[0])!==JSON.stringify(['Driver ID','Driver','Nationality','Abbreviation','Team','Tier','Platform','Controller']))throw new Error('Season Entrants has an unrecognised layout. Restore its headers first.');
    if(!record.masterHash&&seasonPlanningValues_(lines.getRange(start,1,26,11)).some(function(r){return r.some(function(v){return v!=='';});}))throw new Error('This Master already contains a Division '+division+' line-up. Review it before replacing any information.');
    const existing=seasonPlanningValues_(entries.getRange(2,1,500,8)),seen=Object.create(null),names=Object.create(null);
    existing.forEach(function(r,i){if(!r[0]&&r[1])throw new Error('Season Entrants contains a name without a permanent Driver ID. Link it first.');if(r[0]){if(seen[r[0]]!==undefined||names[intakeName_(r[1])]!==undefined)throw new Error('Season Entrants contains duplicate identities or names. Resolve them first.');seen[r[0]]=i;names[intakeName_(r[1])]=String(r[0]);}});
    const writes=[],lineRows=Array.from({length:26},function(){return Array(11).fill('');});
    lineRows[0][0]='Division '+division;lineRows[1]=['Driver #','Driver','Platform','Controller','Team','Tier','','Reserve Driver','Platform','Controller','Tier'];
    const reserves=roster.filter(function(d){return d.role==='Reserve';});
    roster.forEach(function(d){
      if(names[intakeName_(d.gamertag)]!==undefined&&names[intakeName_(d.gamertag)]!==d.driverId)throw new Error('Two permanent profiles use '+d.gamertag+'. Resolve that name before preparation.');
      const p=c.placement.drivers.find(function(p){return p.driverId===d.driverId;}),app=p.application||{};
      let index=seen[d.driverId];if(index===undefined){index=existing.findIndex(function(r){return !r[0]&&!r[1]&&[2,4,5,6,7].every(function(j){return !r[j];});});if(index<0)throw new Error('Season Entrants is full (500 drivers).');}
      const row=existing[index].slice();
      if(row[0]&&row[1]!==d.gamertag)throw new Error(d.gamertag+' already has a different name in Season Entrants. Review the permanent identity before copying.');
      row[0]=d.driverId;row[1]=d.gamertag;
      const details=c.data.applications.rows.find(function(r){return r[1]===d.driverId;});let nationality='';if(details){try{nationality=JSON.parse(details[6]).nationality||'';}catch(ignore){}}
      row[2]=row[2]||nationality;row[4]=d.team||'Reserve';row[5]='Tier '+d.tier;row[6]=row[6]||app.platform||'';row[7]=row[7]||app.controller||'';
      // Preserve abbreviation formulas and manual fields; only known text columns are written.
      writes.push({range:entries.getRange(index+2,1,1,3),values:[row.slice(0,3)],text:true},{range:entries.getRange(index+2,5,1,4),values:[row.slice(4,8)],text:true});
      existing[index]=row;seen[d.driverId]=index;names[intakeName_(d.gamertag)]=d.driverId;
    });
    for(let i=0;i<24;i++){
      const row=start+2+i,teamRow=2+Math.floor(i/2),team=c.prepTeams[Math.floor(i/2)][0],tier=i%2+1;
      const driver=roster.find(function(d){return d.role!=='Reserve'&&d.team===team&&d.tier===tier;});
      const r=lineRows[i+2];r[0]='=IFERROR(INDEX(FILTER(\'Reference Snapshot\'!$BE:$BE,\'Reference Snapshot\'!$BC:$BC=E'+row+',\'Reference Snapshot\'!$BD:$BD=F'+row+'),1),"")';
      r[1]=driver?preseasonPreparationText_(driver.gamertag):'';
      r[2]='=IFERROR(VLOOKUP(B'+row+',\'Season Entrants\'!$B:$H,6,FALSE),"")';r[3]='=IFERROR(VLOOKUP(B'+row+',\'Season Entrants\'!$B:$H,7,FALSE),"")';
      r[4]='=IFERROR(\'Teams & Principals\'!A'+teamRow+',"")';r[5]='=IF(E'+row+'="","","Tier '+tier+'")';r[7]=reserves[i]?preseasonPreparationText_(reserves[i].gamertag):'';
      r[8]='=IFERROR(VLOOKUP(H'+row+',\'Season Entrants\'!$B:$H,6,FALSE),"")';r[9]='=IFERROR(VLOOKUP(H'+row+',\'Season Entrants\'!$B:$H,7,FALSE),"")';r[10]=reserves[i]?'Tier '+reserves[i].tier:'';
    }
    const calendar=c.book.getSheetByName('Calendar'),desired=c.prepRaces.map(function(r){return [r.round,r.weekend,r.date,r.track];});
    const savedCalendar=PropertiesService.getScriptProperties().getProperty(preseasonPreparationKey_(c.season,'calendar'));
    const oldCalendar=seasonPlanningValues_(calendar.getRange(2,1,desired.length,4));
    if(savedCalendar&&savedCalendar!==intakeHash_(oldCalendar))throw new Error('The Master calendar was edited after preparation. Review it before copying another roster.');
    if(!savedCalendar&&oldCalendar.some(function(r,i){return (r[1]&&r[1]!==desired[i][1])||(r[3]&&r[3]!==desired[i][3]);}))throw new Error('The Master calendar differs from the saved track draw. Review the two calendars first.');
    writes.push({range:lines.getRange(start,1,26,11),values:lineRows,formulas:true},{range:calendar.getRange(2,1,desired.length,4),values:desired,text:true},{range:c.book.getSheetByName('Start Here').getRange('B5'),values:[[c.placement.board.length]]});
    // Form-response labels can differ from reference dropdown labels. Retain the
    // dropdowns as suggestions without rejecting the original platform/controller.
    roster.forEach(function(d){const range=entries.getRange(seen[d.driverId]+2,7,1,2);range.setDataValidations(range.getDataValidations().map(function(row){return row.map(function(rule){return rule?rule.copy().setAllowInvalid(true).build():null;});}));});
    intakeCommit_(writes);
    // Persist ownership immediately after the reversible data handover, before formatting.
    record.source=preseasonPreparationSource_(c,a);record.settings=c.prepSettings;record.ids=roster.map(function(d){return d.driverId;});record.masterHash=preseasonPreparationMasterHash_(c,division,record.ids);record.error='';
    preseasonPreparationStore_(c.season,division,record);
    PropertiesService.getScriptProperties().setProperty(preseasonPreparationKey_(c.season,'calendar'),intakeHash_(seasonPlanningValues_(calendar.getRange(2,1,desired.length,4))));
    lines.getRange(start,1,2,11).setFontWeight('bold').setBackground('#d9ead3');
    CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
    const result=getPreseasonPreparation({season:c.season});result.message='Division '+division+' roster copied to the existing Master. Create its workbook next.';return result;
  });
}
function preseasonPreparationText_(text) { return /^[=+@]/.test(text)?"'"+text:text; }

function connectPreseasonDivisionWorkbook(input) { fapAssertEntry_('connectPreseasonDivisionWorkbook');
  return withApplicationLock_(function(){
    const c=preseasonPreparationContext_(input.season),status=preseasonPreparationCheck_(c,input),r=preseasonPreparationRecord_(c.season,status.division);
    if(!r.built||!r.workbookId)throw new Error('Create the division workbook first.');
    const book=SpreadsheetApp.openById(r.workbookId);divisionTemplateAssertTestWorkbook_(book);assertSeasonWorkbookWritable_(c.season,book);
    const key=divisionTemplatePropertyKey_(c.season,status.division),existing=PropertiesService.getScriptProperties().getProperty(key);
    if(existing&&existing!==r.workbookId)throw new Error('Another workbook is registered for this division. Review the connection first.');
    PropertiesService.getScriptProperties().setProperty(key,r.workbookId);divisionTemplateConnectOverall_(c.book,status.division,r.workbookId);
    if(r.error){r.error='';preseasonPreparationStore_(c.season,status.division,r);}
    return getPreseasonPreparation({season:c.season});
  });
}

function createPreseasonDivisionWorkbook(input) { fapAssertEntry_('createPreseasonDivisionWorkbook');
  // Reserve this division briefly. Do not hold the global draft lock during a long copy/build.
  const job=withApplicationLock_(function(){
    const c=preseasonPreparationContext_(input.season),status=preseasonPreparationCheck_(c,input),division=status.division;
    const record=preseasonPreparationRecord_(c.season,division);
    if(record.workbookId&&!record.built&&!(record.buildStarted&&Date.now()-record.buildStarted<600000)&&DriveApp.getFileById(record.workbookId).isTrashed()){record.workbookId='';record.buildStarted=0;record.phase='';record.error='';preseasonPreparationStore_(c.season,division,record);throw new Error('The unfinished copy is in the bin. Refresh, then create the workbook again.');}
    if(!status.canCreate)throw new Error(status.issues.join(' ')||'Copy the current roster first, or wait for the workbook being created.');
    const props=PropertiesService.getScriptProperties(),templateId=props.getProperty(F1XL_DIVISION_TEMPLATE.templatePropertyKey);
    if(!templateId)throw new Error('Create the clean Division Template first.');
    divisionTemplateCheckTriggerCapacity_('');
    record.buildStarted=Date.now();record.error='';preseasonPreparationStore_(c.season,division,record);
    return {season:c.season,division:division,masterId:c.book.getId(),templateId:templateId,record:record};
  });
  const r=job.record;
  try {
    const master=seasonPlanningBook_(job.season),setup=divisionTemplateReadMasterSetup_(master,job.season,job.division);
    const name='TEST - F1XL Season '+job.season+' Division '+job.division+' Data';
    const matches=DriveApp.getFilesByName(name),found=[];
    while(matches.hasNext()){const file=matches.next();if(!file.isTrashed())found.push(file);}
    if(found.length){if(found.length===1){r.workbookId=found[0].getId();preseasonPreparationStore_(job.season,job.division,r);}throw new Error('An unregistered copy with this division’s name already exists. Inspect it before requesting another copy.');}
    const file=DriveApp.getFileById(job.templateId).makeCopy(name);
    r.workbookId=file.getId();preseasonPreparationStore_(job.season,job.division,r);
    file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    const book=SpreadsheetApp.openById(r.workbookId);divisionTemplateAssertTestWorkbook_(book);assertSeasonWorkbookWritable_(job.season,book);
    divisionTemplateBuild_(book,master,setup);
    // Compact occupied names, so unused team seats do not consume reserve licence capacity.
    const first=6+(job.division-1)*30,last=first+23,source="{'Division Line-ups'!B"+first+':B'+last+";'Division Line-ups'!H"+first+':H'+last+'}';
    const licence=master.getSheetByName('Division '+job.division);
    licence.getRange(3,1,40,1).setFormulas(Array.from({length:40},function(_,i){return ['=IFERROR(INDEX(UNIQUE(FILTER('+source+','+source+'<>"")),'+(i+1)+'),"")'];}));licence.showSheet();
    r.phase='Workbook built';preseasonPreparationStore_(job.season,job.division,r);
    divisionTemplateEnsureRoundHistorySafety_(book);
    // The saved ID makes lost responses recoverable without rebuilding any result sheets.
    r.built=true;r.createdAt=new Date().toISOString();r.buildStarted=0;
    preseasonPreparationStore_(job.season,job.division,r);
    return withApplicationLock_(function(){
      const fresh=seasonPlanningBook_(job.season),key=divisionTemplatePropertyKey_(job.season,job.division),existing=PropertiesService.getScriptProperties().getProperty(key);
      if(existing&&existing!==r.workbookId)throw new Error('Another workbook was registered during preparation. Review the two copies before connecting.');
      PropertiesService.getScriptProperties().setProperty(key,r.workbookId);
      divisionTemplateConnectOverall_(fresh,job.division,r.workbookId);CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
      const result=getPreseasonPreparation({season:job.season});result.message='Division '+job.division+' workbook created. Open the connection links and press Allow access in Google Sheets.';return result;
    });
  } catch(error) {
    r.error=String(error.message||error).slice(0,1200);r.buildStarted=0;preseasonPreparationStore_(job.season,job.division,r);
    throw new Error('Division preparation stopped. '+r.error+' Refresh to see the retained workbook and current status.');
  }
}

/** Resume the final setup of a completed copy. No template build, roster,
 * licence or round values are written by this recovery path. */
function finishPreseasonDivisionWorkbook(input) { fapAssertEntry_('finishPreseasonDivisionWorkbook');
  return withApplicationLock_(function(){
    const c=preseasonPreparationContext_(input.season),status=preseasonPreparationCheck_(c,input),division=status.division;
    const r=preseasonPreparationRecord_(c.season,division);
    if(!status.canResume)throw new Error(status.issues.join(' ')||'Refresh to check whether this workbook can finish setup.');
    const file=DriveApp.getFileById(r.workbookId);
    if(file.isTrashed())throw new Error('Restore this division workbook from the Drive bin, then retry Finish existing workbook.');
    const book=SpreadsheetApp.openById(r.workbookId),setup=divisionTemplateReadMasterSetup_(c.book,c.season,division);
    divisionTemplateAssertTestWorkbook_(book);assertSeasonWorkbookWritable_(c.season,book);
    const start=book.getSheetByName('Start Here'),imports=book.getSheetByName('Season Master Import');
    if(!start||String(start.getRange('B3').getDisplayValue()).trim()!==c.season||Number(start.getRange('B4').getValue())!==division||Number(start.getRange('B5').getValue())!==setup.rounds||!imports||imports.getRange('A1').getFormula()!==divisionTemplateEntrantImportFormula_(c.book.getId()))throw new Error('The retained workbook does not match this season, division and Master. It was not rebuilt or connected.');
    ['Data','Race Calendar','Driver License','Driver Stats Calc Sheet','Driver Results NoSort','Team Stats Calc Sheet','Constructors Standings NoSort','Constructors Results NoSort','Grand Prix Overview'].concat(Array.from({length:setup.rounds},function(_,i){return 'R'+(i+1);})).forEach(function(name){if(!book.getSheetByName(name))throw new Error('The retained workbook is missing '+name+'. It was not rebuilt or connected.');});
    try {
      divisionTemplateEnsureRoundHistorySafety_(book);
      r.built=true;r.phase='Workbook built';r.buildStarted=0;r.createdAt=r.createdAt||new Date().toISOString();r.error='';
      preseasonPreparationStore_(c.season,division,r);
      PropertiesService.getScriptProperties().setProperty(divisionTemplatePropertyKey_(c.season,division),r.workbookId);
      divisionTemplateConnectOverall_(c.book,division,r.workbookId);CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
      const result=getPreseasonPreparation({season:c.season});result.message='Division '+division+' setup finished using its existing workbook. Check the Google Sheets connections next.';return result;
    } catch(error){r.error=String(error.message||error).slice(0,1200);preseasonPreparationStore_(c.season,division,r);throw new Error('The existing workbook has been kept. '+r.error);}
  });
}
