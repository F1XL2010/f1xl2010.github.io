/**
 * Permanent self-recorded time-trial Form-response inbox.
 *
 * The active Form tab is read dynamically so later question/track changes do
 * not hide submitted answers. Archive preserves the exact current schema in a
 * matching archive tab before the active response is removed.
 */
const F1XL_SELF_TIME_TRIAL_SOURCE = intakeConnection_('selfTT',{
  spreadsheetId: '1_lXOg0e6VovfKNL58q2KGPzwBlhMMi6kmwzdli9HNyM',
  sheetId: 823296253,
  cacheKey: 'F1XL_SELF_TIME_TRIAL_SUBMISSIONS_V1',
  cacheSeconds: 120
});

function getSelfTimeTrialSubmissions(input,legacyForceRefresh) { fapAssertEntry_('getSelfTimeTrialSubmissions');
  const request=selfTimeTrialRequest_(input,legacyForceRefresh),season=request.season;
  const cache=CacheService.getScriptCache();
  const cacheKey=F1XL_SELF_TIME_TRIAL_SOURCE.cacheKey+(season?'_'+season.replace(/\./g,'_'):''),forceRefresh=request.force;
  if (forceRefresh===true) cache.remove(cacheKey);
  const cached=cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const response=buildSelfTimeTrialSubmissionResponse_(openSelfTimeTrialSubmissionContext_(),season);
  const serialised=JSON.stringify(response);
  if (serialised.length<90000) cache.put(cacheKey,serialised,F1XL_SELF_TIME_TRIAL_SOURCE.cacheSeconds);
  return response;
}

function archiveSelfTimeTrialSubmission(input) { fapAssertEntry_('archiveSelfTimeTrialSubmission');
  return withSelfTimeTrialSubmissionLock_(function() {
    const context=openSelfTimeTrialSubmissionContext_();
    const row=findSelfTimeTrialSubmissionRow_(context.sourceSheet,input,context.headers.length);
    const archive=getOrCreateMatchingSelfTimeTrialArchive_(context);
    const values=context.sourceSheet.getRange(row,1,1,context.headers.length).getValues();
    archive.getRange(archive.getLastRow()+1,1,1,context.headers.length).setValues(values);
    context.sourceSheet.deleteRow(row);
    SpreadsheetApp.flush();
    const response=refreshSelfTimeTrialSubmissions_(context,input&&input.season);
    response.message='Self-recorded time trial moved to '+archive.getName()+'.';
    return response;
  });
}

function deleteSelfTimeTrialSubmission(input) { fapAssertEntry_('deleteSelfTimeTrialSubmission');
  return withSelfTimeTrialSubmissionLock_(function() {
    const context=openSelfTimeTrialSubmissionContext_();
    const row=findSelfTimeTrialSubmissionRow_(context.sourceSheet,input,context.headers.length);
    context.sourceSheet.deleteRow(row);
    SpreadsheetApp.flush();
    const response=refreshSelfTimeTrialSubmissions_(context,input&&input.season);
    response.message='Self-recorded time trial permanently deleted from the active Form responses.';
    return response;
  });
}

function openSelfTimeTrialSubmissionContext_() {
  const spreadsheet=SpreadsheetApp.openById(F1XL_SELF_TIME_TRIAL_SOURCE.spreadsheetId);
  const sourceSheet=spreadsheet.getSheetById(F1XL_SELF_TIME_TRIAL_SOURCE.sheetId);
  if (!sourceSheet) throw new Error('The configured self-recorded time-trial Form tab could not be found.');
  const width=Math.max(sourceSheet.getLastColumn(),1);
  const headers=sourceSheet.getRange(1,1,1,width).getDisplayValues()[0].map(selfTimeTrialText_);
  if (headers[0]!=='Timestamp') throw new Error('The self-recorded time-trial Form tab no longer starts with Timestamp.');
  return {spreadsheet:spreadsheet,sourceSheet:sourceSheet,headers:headers};
}

function buildSelfTimeTrialSubmissionResponse_(context,season) {
  const lastRow=context.sourceSheet.getLastRow();
  const rows=lastRow>1?context.sourceSheet.getRange(2,1,lastRow-1,context.headers.length).getDisplayValues():[];
  const submissions=rows.map(function(row,index){return buildSelfTimeTrialSubmissionRecord_(context.headers,row,index+2);}).filter(function(item){return item.received&&item.gamertag;}).reverse();
  const matches=season?selfTimeTrialSeasonMatches_(season):{};
  submissions.forEach(function(item){item.seasonMatch=matches[item.gamertagKey]||null;});
  const archives=context.spreadsheet.getSheets().filter(function(sheet){return F1XL_SELF_TIME_TRIAL_SOURCE.archiveSheetName?/^TTSubmissionArchive(?: \d+)?$/.test(sheet.getName()):/archive/i.test(sheet.getName());}).map(function(sheet){return {name:sheet.getName(),rows:Math.max(sheet.getLastRow()-1,0)};});
  return {
    ok:true,
    sourceName:context.spreadsheet.getName(),
    tabName:context.sourceSheet.getName(),
    refreshedAt:new Date().toISOString(),season:season||'',
    submissions:submissions,
    archives:archives,
    formatNote:'Review the submitted laps against this season’s two tracks before importing. Single overall times cannot replace the required laps 2–5.'
  };
}

function buildSelfTimeTrialSubmissionRecord_(headers,row,sourceRow) {
  const answers=headers.map(function(header,index){return {label:header,value:selfTimeTrialText_(row[index])};});
  const groups=[];
  headers.forEach(function(header,index){
    const match=header.replace(/\s+/g,' ').match(/^(.+?)(?:\s*-\s*|\s+)Lap\s*(\d+)$/i);
    if (!match) return;
    const label=selfTimeTrialText_(match[1]);
    let group=groups.find(function(item){return item.label===label;});
    if (!group) {group={label:label,laps:['','','','','']};groups.push(group);}
    const lap=Number(match[2]);
    if (lap>=1&&lap<=5) group.laps[lap-1]=selfTimeTrialText_(row[index]);
  });
  const received=selfTimeTrialText_(row[0]);
  const gamertag=selfTimeTrialText_(row[1]);
  return {
    id:'SELF-TT-'+sourceRow,
    sourceRow:sourceRow,
    fingerprint:[received,gamertag,selfTimeTrialText_(row[3])].join('|'),
    received:received,
    gamertag:gamertag,gamertagKey:selfTimeTrialNameKey_(gamertag),
    applicationCompleted:selfTimeTrialText_(row[2]),
    videoLinks:[row[3],row[4]].map(selfTimeTrialText_).filter(Boolean),
    lapGroups:groups,
    additionalAnswers:answers.filter(function(answer,index){return index>4&&!/Lap\s*\d+$/i.test(answer.label.replace(/\s+/g,' '));}),
    answers:answers
  };
}

function findSelfTimeTrialSubmissionRow_(sheet,input,width) {
  const expected=Number(input&&input.sourceRow||0);
  const fingerprint=selfTimeTrialText_(input&&input.fingerprint);
  if (!fingerprint) throw new Error('The submission identity is missing. Refresh and try again.');
  const matches=function(row){return [row[0],row[1],row[3]].map(selfTimeTrialText_).join('|')===fingerprint;};
  if (expected>=2&&expected<=sheet.getLastRow()) {
    const row=sheet.getRange(expected,1,1,width).getDisplayValues()[0];
    if (matches(row)) return expected;
  }
  if (sheet.getLastRow()>1) {
    const rows=sheet.getRange(2,1,sheet.getLastRow()-1,width).getDisplayValues();
    for (let index=0;index<rows.length;index+=1) if (matches(rows[index])) return index+2;
  }
  throw new Error('That self-recorded time trial moved, changed or was already processed. Refresh and try again.');
}

function getOrCreateMatchingSelfTimeTrialArchive_(context) {
  if(F1XL_SELF_TIME_TRIAL_SOURCE.archiveSheetName){
    const base=F1XL_SELF_TIME_TRIAL_SOURCE.archiveSheetName,candidates=context.spreadsheet.getSheets().filter(s=>/^TTSubmissionArchive(?: \d+)?$/.test(s.getName())&&s.getLastColumn()===context.headers.length);
    const existing=candidates.find(s=>JSON.stringify(s.getRange(1,1,1,context.headers.length).getDisplayValues()[0].map(selfTimeTrialText_))===JSON.stringify(context.headers));if(existing)return existing;
    let name=base,number=1;while(context.spreadsheet.getSheetByName(name))name=base+' '+(++number);
    const archive=context.spreadsheet.insertSheet(name);archive.getRange(1,1,1,context.headers.length).setValues([context.headers]).setFontWeight('bold');archive.setFrozenRows(1);return archive;
  }
  const candidates=context.spreadsheet.getSheets().filter(function(sheet){
    if (!/archive/i.test(sheet.getName())||sheet.getLastColumn()<context.headers.length) return false;
    const headers=sheet.getRange(1,1,1,context.headers.length).getDisplayValues()[0].map(selfTimeTrialText_);
    return context.headers.every(function(header,index){return header===headers[index];});
  });
  if (candidates.length) return candidates[0];
  let number=1;
  let name='Archive - Current Form';
  while (context.spreadsheet.getSheetByName(name)) {number+=1;name='Archive - Current Form '+number;}
  const sheet=context.spreadsheet.insertSheet(name);
  sheet.getRange(1,1,1,context.headers.length).setValues([context.headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  return sheet;
}

function refreshSelfTimeTrialSubmissions_(context,season) {
  const cache=CacheService.getScriptCache(),suffix=season?'_'+String(season).replace(/\./g,'_'):'';
  cache.remove(F1XL_SELF_TIME_TRIAL_SOURCE.cacheKey);cache.remove(F1XL_SELF_TIME_TRIAL_SOURCE.cacheKey+suffix);
  return buildSelfTimeTrialSubmissionResponse_({spreadsheet:context.spreadsheet,sourceSheet:context.sourceSheet,headers:context.sourceSheet.getRange(1,1,1,context.sourceSheet.getLastColumn()).getDisplayValues()[0].map(selfTimeTrialText_)},season);
}

function withSelfTimeTrialSubmissionLock_(work) {
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try{return work();}finally{lock.releaseLock();}
}

function selfTimeTrialText_(value){return String(value==null?'':value).trim();}

function selfTimeTrialReviewedSource_(input) {
  const source=openSelfTimeTrialSubmissionContext_();
  const row=findSelfTimeTrialSubmissionRow_(source.sourceSheet,input,source.headers.length);
  const values=source.sourceSheet.getRange(row,1,1,source.headers.length).getDisplayValues()[0];
  return {source:source,row:row,submission:buildSelfTimeTrialSubmissionRecord_(source.headers,values,row),revision:intakeHash_([source.headers,values])};
}

function previewSelfTimeTrialImport(input) { fapAssertEntry_('previewSelfTimeTrialImport');
  const read=selfTimeTrialReviewedSource_(input),context=preseasonTTContext_(input.season);
  return {season:context.season,revision:context.revision,sourceRevision:read.revision,submission:read.submission,tracks:context.tt.tracks,
    drivers:context.data.trials.rows.filter(function(r){return r[3]!=='Complete';}).map(function(r){
      const result=context.tt.rows.find(function(t){return t.driverId===r[0];});
      return {driverId:r[0],gamertag:r[1],hasResults:!!result&&result.one.concat(result.two).some(function(v){return v!=='';})};
    })};
}

/** Import only the reviewed lap values, using the normal season TT calculation.
 * The Form response stays intact until the reviewer archives it. */
function completeSelfTimeTrialImport(input) { fapAssertEntry_('completeSelfTimeTrialImport');
  return withApplicationLock_(function(){
    const read=selfTimeTrialReviewedSource_(input),context=preseasonTTContext_(input.season);
    if(read.revision!==input.sourceRevision)throw new Error('This submission changed. Reopen it and review the latest laps.');
    intakeRequireRevision_(input,context);
    if(input.reviewed!==true)throw new Error('Confirm the driver, tracks and lap times have been reviewed.');
    const driver=context.data.trials.rows.find(function(r){return r[0]===input.driverId;});
    if(!driver)throw new Error('Choose a driver with a processed application in this season.');
    if(driver[3]==='Complete')throw new Error('This driver’s trial is already complete. Review corrections in Placements.');
    const old=context.tt.rows.find(function(r){return r.driverId===input.driverId;});
    if(old&&old.one.concat(old.two).some(function(v){return v!=='';})&&input.replaceExisting!==true)throw new Error('This driver already has partial results. Confirm replacement after checking them.');
    const evidence=read.submission.videoLinks.join(' · ')||'No video links supplied';
    const reference='[Self TT '+read.submission.id+'] Reviewed submission from '+read.submission.gamertag+'; received '+read.submission.received+'. Evidence: '+evidence;
    savePreseasonTimeTrial_({season:context.season,revision:context.revision,driverId:driver[0],one:input.one,two:input.two,complete:true,date:driver[4],time:driver[6],admin:driver[7],notes:[driver[5],reference].filter(Boolean).join('\n')});
    const response=refreshSelfTimeTrialSubmissions_(read.source,context.season);
    response.message=driver[1]+' added to Completed trials. The original submission can now be archived.';
    return response;
  });
}

function selfTimeTrialRequest_(input,legacyForceRefresh) {
  if(typeof input==='object'&&input!==null)return {season:selfTimeTrialSeason_(input.season),force:input.force===true};
  return {season:'',force:input===true||legacyForceRefresh===true};
}

function selfTimeTrialSeason_(value) {
  const season=selfTimeTrialText_(value);if(!season)return '';
  if(!/^\d+(?:\.5)?$/.test(season))throw new Error('Choose a valid active or pre-season before linking self-recorded trials.');
  return season;
}

function selfTimeTrialNameKey_(value){return selfTimeTrialText_(value).toLowerCase().replace(/[^a-z0-9]/g,'');}

function selfTimeTrialSeasonMatches_(season) {
  const context=preseasonTTContext_(season),matches={};
  context.data.trials.rows.forEach(function(row){
    const key=selfTimeTrialNameKey_(row[1]);if(!key||matches[key])return;
    matches[key]={driverId:row[0],gamertag:row[1],status:row[3]||'Awaiting time trial',complete:row[3]==='Complete',referenceAttached:String(row[5]||'').indexOf('[Self TT')>=0};
  });
  return matches;
}

/** Attach the source reference only. Seasonal lap entry remains deliberate because
 * self-recorded Form tracks can differ from the two tracks selected for a season. */
function attachSelfTimeTrialReference(input) { fapAssertEntry_('attachSelfTimeTrialReference');
  return withApplicationLock_(function(){
    const season=selfTimeTrialSeason_(input&&input.season);if(!season)throw new Error('Choose the active or pre-season first.');
    const submissionContext=openSelfTimeTrialSubmissionContext_(),row=findSelfTimeTrialSubmissionRow_(submissionContext.sourceSheet,input,submissionContext.headers.length);
    const submission=buildSelfTimeTrialSubmissionRecord_(submissionContext.headers,submissionContext.sourceSheet.getRange(row,1,1,submissionContext.headers.length).getDisplayValues()[0],row);
    const context=preseasonTTContext_(season),queue=context.data.trials.rows.map(function(item){return item.slice();});
    const driver=queue.find(function(item){return selfTimeTrialNameKey_(item[1])===submission.gamertagKey;});
    if(!driver)throw new Error(submission.gamertag+' does not have a Time Trial Queue entry in S'+season+'. Process their application first.');
    const marker='[Self TT '+submission.id+']';
    if(String(driver[5]||'').indexOf(marker)<0){
      const sourceUrl=submissionContext.spreadsheet.getUrl()+'#gid='+submissionContext.sourceSheet.getSheetId()+'&range=A'+row;
      const evidence=submission.videoLinks.length?submission.videoLinks.join(' · '):'No video links supplied';
      const reference=marker+' Received '+submission.received+'. Evidence: '+evidence+'. Source: '+sourceUrl;
      driver[5]=[String(driver[5]||'').trim(),reference].filter(Boolean).join('\n');
      const writes=[];intakeTableWrite_(context,'trials',queue,writes);intakeCommit_(writes);
    }
    const response=refreshSelfTimeTrialSubmissions_(submissionContext,season);
    response.message='Self-recording reference attached to '+driver[1]+' in S'+season+'. Record the seasonal laps separately after review.';
    return response;
  });
}
