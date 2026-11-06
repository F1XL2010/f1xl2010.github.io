/**
 * Application response interface.
 *
 * The form response tab remains the source of truth. The only extra manual
 * field this portal adds is the clearly named time-trial-completed column.
 * Archive and reject actions are intentionally explicit and protected by a
 * lock so two administrators cannot move/delete the same response together.
 */
const F1XL_APPLICATION_SOURCE = intakeConnection_('applications',{
  spreadsheetId: '1jXJ6EJ-chX62asHrJn4qsM1fMMXQr6lmIKy4-f4iwSI',
  sheetId: 1030507345,
  cacheKey: 'F1XL_APPLICATION_RESPONSES_V2',
  cacheSeconds: 120,
  timeTrialHeader: 'Portal - Time Trial Completed',
  timeTrialBackground: '#d9ead3'
});

function getApplicationResponses(forceRefresh) { fapAssertEntry_('getApplicationResponses');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_APPLICATION_SOURCE.cacheKey);
  const cached = cache.get(F1XL_APPLICATION_SOURCE.cacheKey);
  if (cached) return JSON.parse(cached);

  const context = openApplicationContext_();
  const response = buildApplicationResponse_(context);
  cache.put(F1XL_APPLICATION_SOURCE.cacheKey, JSON.stringify(response), F1XL_APPLICATION_SOURCE.cacheSeconds);
  return response;
}

function updateApplicationTimeTrial(input) { fapAssertEntry_('updateApplicationTimeTrial');
  return withApplicationLock_(function() {
    const context = openApplicationContext_();
    const statusColumn = ensureTimeTrialColumn_(context.sourceSheet, context.headers);
    const row = findApplicationRow_(context.sourceSheet, input);
    const completed = input && input.completed === true;
    context.sourceSheet.getRange(row, statusColumn).setValue(completed ? 'Yes' : '');
    context.sourceSheet
      .getRange(row, 1, 1, context.sourceSheet.getLastColumn())
      .setBackground(completed ? F1XL_APPLICATION_SOURCE.timeTrialBackground : null);
    return refreshApplicationResponse_(context);
  });
}

function archiveApplication(input) { fapAssertEntry_('archiveApplication');
  return withApplicationLock_(function() {
    const context = openApplicationContext_();
    const archiveSheet = getArchiveSheet_(context.spreadsheet, context.sourceSheet);
    const statusColumn = ensureTimeTrialColumn_(context.sourceSheet, context.headers);
    ensureTimeTrialColumn_(archiveSheet, archiveSheet.getRange(1, 1, 1, Math.max(archiveSheet.getLastColumn(), 1)).getDisplayValues()[0]);
    ensureMatchingArchiveHeaders_(context.sourceSheet, archiveSheet, statusColumn);
    const row = findApplicationRow_(context.sourceSheet, input);
    const values = context.sourceSheet.getRange(row, 1, 1, statusColumn).getValues();
    archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, 1, statusColumn).setValues(values);
    context.sourceSheet.deleteRow(row);
    return refreshApplicationResponse_(context);
  });
}

/** Caller holds the application lock. Locate by full response, never stale row number. */
function applicationRowByKey_(context,sheet,key) {
  if(sheet.getLastRow()<2)return 0;
  const matches=[];
  sheet.getRange(2,1,sheet.getLastRow()-1,21).getValues().forEach(function(row,i){
    if(intakeHash_([context.spreadsheet.getId(),context.sourceSheet.getSheetId(),row])===key)matches.push(i+2);
  });
  if(matches.length>1)throw new Error('Identical responses need checking in '+sheet.getName()+'. Nothing was deleted.');
  return matches[0]||0;
}

/** Save-first archive with retry protection for an interrupted append/delete. */
function archiveApplicationByKey_(key) {
  const context=openApplicationContext_(),source=context.sourceSheet,archive=getArchiveSheet_(context.spreadsheet,source);
  const width=Math.max(21,source.getLastColumn());
  if(width>archive.getMaxColumns())archive.insertColumnsAfter(archive.getMaxColumns(),width-archive.getMaxColumns());
  ensureMatchingArchiveHeaders_(source,archive,width);
  let row=applicationRowByKey_(context,source,key);
  const archived=applicationRowByKey_(context,archive,key);
  if(!row){if(archived)return;throw new Error('The saved response could not be found in the inbox or Archive. Check the source before retrying.');}
  const values=source.getRange(row,1,1,width).getValues();
  if(archived){
    if(intakeHash_(archive.getRange(archived,1,1,width).getValues())!==intakeHash_(values))throw new Error('The existing archive copy differs from the active response. Check both before retrying.');
  }else{
    const target=intakeAppendRange_(archive,1,width);
    // Literal text stays text, including responses that start with a formula character.
    target.setValues(values.map(function(r){return r.map(function(v){return typeof v==='string'&&/^[=+@]/.test(v)?"'"+v:v;});}));
    SpreadsheetApp.flush();
    if(intakeHash_(target.getValues())!==intakeHash_(values))throw new Error('The archive copy could not be verified. The active response was retained.');
  }
  // A manual sheet edit can move rows even while the script lock is held.
  row=applicationRowByKey_(context,source,key);
  if(!row)return;
  if(intakeHash_(source.getRange(row,1,1,width).getValues())!==intakeHash_(values))throw new Error('The active response changed during archiving. It was retained for review.');
  CacheService.getScriptCache().remove(F1XL_APPLICATION_SOURCE.cacheKey);
  source.deleteRow(row);
}

function archiveAllApplications() { fapAssertEntry_('archiveAllApplications');
  return withApplicationLock_(function() {
    const context = openApplicationContext_();
    const archiveSheet = getArchiveSheet_(context.spreadsheet, context.sourceSheet);
    const statusColumn = ensureTimeTrialColumn_(context.sourceSheet, context.headers);
    ensureTimeTrialColumn_(archiveSheet, archiveSheet.getRange(1, 1, 1, Math.max(archiveSheet.getLastColumn(), 1)).getDisplayValues()[0]);
    ensureMatchingArchiveHeaders_(context.sourceSheet, archiveSheet, statusColumn);
    const values = context.sourceSheet.getRange(2, 1, Math.max(context.sourceSheet.getLastRow() - 1, 0), statusColumn).getValues();
    const rowsToArchive = values.map(function(row, index) { return { row: row, sourceRow: index + 2 }; }).filter(function(item) {
      return applicationText_(item.row[applicationColumns_(context.headers).gamertag]) !== '';
    });
    if (rowsToArchive.length) {
      archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, rowsToArchive.length, statusColumn).setValues(rowsToArchive.map(function(item) { return item.row; }));
      rowsToArchive.slice().reverse().forEach(function(item) { context.sourceSheet.deleteRow(item.sourceRow); });
    }
    const response = refreshApplicationResponse_(context);
    response.message = rowsToArchive.length + ' application' + (rowsToArchive.length === 1 ? '' : 's') + ' archived.';
    return response;
  });
}

function rejectApplication(input) { fapAssertEntry_('rejectApplication');
  return withApplicationLock_(function() {
    const context = openApplicationContext_();
    const row = findApplicationRow_(context.sourceSheet, input);
    context.sourceSheet.deleteRow(row);
    const response = refreshApplicationResponse_(context);
    response.message = 'Application deleted from the active response tab.';
    return response;
  });
}

function withApplicationLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

function openApplicationContext_() {
  const spreadsheet = SpreadsheetApp.openById(F1XL_APPLICATION_SOURCE.spreadsheetId);
  const sourceSheet = spreadsheet.getSheetById(F1XL_APPLICATION_SOURCE.sheetId);
  if (!sourceSheet) throw new Error('The configured application responses tab could not be found.');
  const headers = sourceSheet.getRange(1, 1, 1, Math.max(sourceSheet.getLastColumn(), 1)).getDisplayValues()[0];
  return { spreadsheet: spreadsheet, sourceSheet: sourceSheet, headers: headers };
}

function buildApplicationResponse_(context) {
  const values = context.sourceSheet.getDataRange().getDisplayValues();
  const timeTrialIndex = context.headers.indexOf(F1XL_APPLICATION_SOURCE.timeTrialHeader);
  const applications = values.slice(1).map(function(row, index) {
    return buildApplicationRecord_(row, index + 2, timeTrialIndex, context.headers);
  }).filter(function(application) {
    return application.gamertag !== '';
  }).reverse();
  return {
    ok: true,
    readOnly: false,
    sourceName: context.spreadsheet.getName(),
    tabName: context.sourceSheet.getName(),
    archiveTabName: findArchiveSheetName_(context.spreadsheet, context.sourceSheet),
    refreshedAt: new Date().toISOString(),
    applications: applications
  };
}

function applicationColumns_(headers) {
  const fields=['received','gamertag','realName','age','nationality','discordId','controller','platform','streamLink','newToF1XL','promotionDemotionAgreement','sundayStartCommitment','seasonCommitment','rulesAgreement','timeTrialAcknowledgement','discordJoined','previousGamertags','streamConsent','unusedLegacyResponse','nonCommitmentReason','additionalLegacyResponse'];
  if(!headers)return Object.fromEntries(fields.map((key,i)=>[key,i]));
  const patterns={received:/^timestamp$/,gamertag:/^what is your gamertag\/ ea play username\?$/,realName:/^and your real name\?$/,age:/^age\?/,nationality:/^nationality\?$/,discordId:/^discord id\?$/,controller:/^what controller do you use\?$/,platform:/^what platform are you on\?$/,streamLink:/^if you stream your races, please provide your link below$/,newToF1XL:/^are you new to f1xl\?$/,promotionDemotionAgreement:/^promotion\/demotion -/,sundayStartCommitment:/^can you commit to the 9pm/,seasonCommitment:/^will you commit yourself to a full season/,rulesAgreement:/^have you read the rules\?$/,timeTrialAcknowledgement:/^time trials -/,discordJoined:/^have you signed up to the f1xl discord channel\?/,previousGamertags:/^please let us know any previous gamertags/,streamConsent:/^do you consent for us to use your link publicly if needed\?$/,nonCommitmentReason:/^what is the reason you cannot commit/,additionalLegacyResponse:/^do you have/};
  const normal=headers.map(h=>String(h||'').trim().toLowerCase().replace(/\s+/g,' ')),columns={};
  fields.forEach(key=>{const found=patterns[key]?normal.map((h,i)=>patterns[key].test(h)?i:-1).filter(i=>i>=0):[];if(found.length>1)throw Error('Duplicate application question: '+key);columns[key]=found.length?found[0]:-1;});
  ['received','gamertag','discordId'].forEach(key=>{if(columns[key]<0)throw Error('Check the application response heading for '+key+'. Nothing was processed.');});
  if(columns.gamertag===1&&columns.discordJoined===15){columns.unusedLegacyResponse=18;columns.additionalLegacyResponse=20;}
  return columns;
}
function applicationFingerprint_(row,headers){const c=applicationColumns_(headers);return [c.received,c.gamertag,c.discordId].map(i=>applicationText_(row[i])).join('|');}
function buildApplicationRecord_(row, sourceRow, timeTrialIndex, headers) {
  if(headers){const columns=applicationColumns_(headers),record={id:'APP-'+sourceRow,sourceRow,fingerprint:applicationFingerprint_(row,headers),timeTrialCompleted:timeTrialIndex>=0&&applicationText_(row[timeTrialIndex]).toLowerCase()==='yes'};Object.keys(columns).forEach(key=>record[key]=columns[key]>=0?applicationText_(row[columns[key]]):'');return record;}
  const received = applicationText_(row[0]);
  const gamertag = applicationText_(row[1]);
  const discordId = applicationText_(row[5]);
  return {
    id: 'APP-' + sourceRow,
    sourceRow: sourceRow,
    fingerprint: [received, gamertag, discordId].join('|'),
    received: received,
    gamertag: gamertag,
    realName: applicationText_(row[2]),
    age: applicationText_(row[3]),
    nationality: applicationText_(row[4]),
    discordId: discordId,
    controller: applicationText_(row[6]),
    platform: applicationText_(row[7]),
    streamLink: applicationText_(row[8]),
    newToF1XL: applicationText_(row[9]),
    promotionDemotionAgreement: applicationText_(row[10]),
    sundayStartCommitment: applicationText_(row[11]),
    seasonCommitment: applicationText_(row[12]),
    rulesAgreement: applicationText_(row[13]),
    timeTrialAcknowledgement: applicationText_(row[14]),
    discordJoined: applicationText_(row[15]),
    previousGamertags: applicationText_(row[16]),
    streamConsent: applicationText_(row[17]),
    unusedLegacyResponse: applicationText_(row[18]),
    nonCommitmentReason: applicationText_(row[19]),
    additionalLegacyResponse: applicationText_(row[20]),
    timeTrialCompleted: timeTrialIndex >= 0 && applicationText_(row[timeTrialIndex]).toLowerCase() === 'yes'
  };
}

function ensureTimeTrialColumn_(sheet, headers) {
  const existing = headers.indexOf(F1XL_APPLICATION_SOURCE.timeTrialHeader);
  if (existing >= 0) return existing + 1;
  const column = headers.length + 1;
  sheet.getRange(1, column).setValue(F1XL_APPLICATION_SOURCE.timeTrialHeader);
  return column;
}

function getArchiveSheet_(spreadsheet, sourceSheet) {
  if(F1XL_APPLICATION_SOURCE.archiveSheetId){const archive=spreadsheet.getSheetById(F1XL_APPLICATION_SOURCE.archiveSheetId);if(!archive||archive.getName()!==F1XL_APPLICATION_SOURCE.archiveSheetName)throw Error('The configured driver application archive is missing.');return archive;}
  const candidates = spreadsheet.getSheets().filter(function(sheet) {
    return sheet.getSheetId() !== sourceSheet.getSheetId() && /archive/i.test(sheet.getName());
  });
  if (candidates.length !== 1) {
    throw new Error('Expected exactly one archive tab in the application workbook. Rename the archive tab to include “Archive”, then try again.');
  }
  return candidates[0];
}

function findArchiveSheetName_(spreadsheet, sourceSheet) {
  if(F1XL_APPLICATION_SOURCE.archiveSheetId){const archive=spreadsheet.getSheetById(F1XL_APPLICATION_SOURCE.archiveSheetId);return archive&&archive.getName()===F1XL_APPLICATION_SOURCE.archiveSheetName?archive.getName():'';}
  const matches = spreadsheet.getSheets().filter(function(sheet) {
    return sheet.getSheetId() !== sourceSheet.getSheetId() && /archive/i.test(sheet.getName());
  });
  return matches.length === 1 ? matches[0].getName() : '';
}

function ensureMatchingArchiveHeaders_(sourceSheet, archiveSheet, sourceColumnCount) {
  const sourceHeaders = sourceSheet.getRange(1, 1, 1, sourceColumnCount).getDisplayValues()[0];
  let archiveHeaders = archiveSheet.getRange(1, 1, 1, Math.max(archiveSheet.getLastColumn(), 1)).getDisplayValues()[0];
  // A previous archive may start with a response rather than headings. Insert
  // the missing header row; never replace that first applicant's details.
  const first=archiveSheet.getRange(1,1,1,Math.min(3,archiveSheet.getMaxColumns())).getValues()[0];
  const missingHeader=sourceHeaders[0]==='Timestamp'&&first[0] instanceof Date&&!isNaN(first[0].getTime())&&!!applicationText_(first[1]);
  // Repair only the verified blank Timestamp heading, never a response row.
  if(sourceHeaders[0]==='Timestamp'&&!applicationText_(archiveHeaders[0])&&sourceHeaders.slice(1).every((h,i)=>h===(archiveHeaders[i+1]||''))){archiveSheet.getRange('A1').setValue('Timestamp');archiveHeaders[0]='Timestamp';}
  if(missingHeader) {
    archiveSheet.insertRowBefore(1);
    try { archiveSheet.getRange(1,1,1,sourceColumnCount).setValues([sourceHeaders]); }
    catch(error) { archiveSheet.deleteRow(1);throw error; }
    archiveHeaders=archiveSheet.getRange(1,1,1,Math.max(archiveSheet.getLastColumn(),sourceColumnCount)).getDisplayValues()[0];
  } else if(!archiveSheet.getLastRow()) {
    archiveSheet.getRange(1,1,1,sourceColumnCount).setValues([sourceHeaders]);archiveHeaders=sourceHeaders;
  } else if(archiveHeaders.length<sourceHeaders.length&&archiveHeaders.every(function(header,i){return header===sourceHeaders[i];})) {
    // Only extend an exact matching prefix into unused columns.
    archiveSheet.getRange(1,archiveHeaders.length+1,1,sourceHeaders.length-archiveHeaders.length).setValues([sourceHeaders.slice(archiveHeaders.length)]);
    archiveHeaders=sourceHeaders;
  }
  if (archiveHeaders.length < sourceHeaders.length || sourceHeaders.some(function(header, index) { return header !== archiveHeaders[index]; })) {
    throw new Error('The archive tab headers no longer match the active form-response tab. No application was moved.');
  }
}

function findApplicationRow_(sheet, input) {
  const request = input && typeof input === 'object' ? input : {};
  const expectedRow = Number(request.sourceRow || 0);
  const fingerprint = applicationText_(request.fingerprint);
  const width = Math.max(sheet.getLastColumn(), 6),headers=sheet.getRange(1,1,1,width).getDisplayValues()[0];
  const matchesRequest = function(row) {
    return applicationFingerprint_(row,headers) === fingerprint;
  };
  if (expectedRow >= 2 && expectedRow <= sheet.getLastRow()) {
    const row = sheet.getRange(expectedRow, 1, 1, width).getDisplayValues()[0];
    if (matchesRequest(row)) return expectedRow;
  }
  const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), width).getDisplayValues();
  for (let index = 0; index < values.length; index++) {
    if (matchesRequest(values[index])) return index + 2;
  }
  throw new Error('That application has changed or is no longer on the active response tab. Refresh the list and try again.');
}

function refreshApplicationResponse_(context) {
  CacheService.getScriptCache().remove(F1XL_APPLICATION_SOURCE.cacheKey);
  const refreshedContext = {
    spreadsheet: context.spreadsheet,
    sourceSheet: context.sourceSheet,
    headers: context.sourceSheet.getRange(1, 1, 1, Math.max(context.sourceSheet.getLastColumn(), 1)).getDisplayValues()[0]
  };
  return buildApplicationResponse_(refreshedContext);
}

function applicationText_(value) {
  return String(value == null ? '' : value).trim();
}
