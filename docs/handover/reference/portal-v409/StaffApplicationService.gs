/**
 * Permanent staff-application response viewer.
 *
 * The Form uses branching sections, so each position has a different subset
 * of applicable response columns. This service returns only the questions
 * belonging to the position selected by that applicant.
 */
const F1XL_STAFF_APPLICATION_SOURCE = intakeConnection_('staff',{
  spreadsheetId: '1WSmufxq_UkciOtlAmQGmRYMO6S5kUfo2ozg2X6iasoc',
  sheetId: 240211154,
  cacheKey: 'F1XL_STAFF_APPLICATIONS_V2',
  cacheSeconds: 120
});

const F1XL_STAFF_ROLE_COLUMNS = Object.freeze({
  'Commentator': [3, 4],
  'Administrator / Moderator': [5, 6, 7, 8, 9],
  'Ticket Team': [10, 11, 12],
  'Team Principal': [13, 14, 15, 16, 17, 18, 19, 20],
  'Race Controller': [21, 22, 23],
  'Time Trial Team': [24]
});

function getStaffApplications(forceRefresh) { fapAssertEntry_('getStaffApplications');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_STAFF_APPLICATION_SOURCE.cacheKey);
  const cached = cache.get(F1XL_STAFF_APPLICATION_SOURCE.cacheKey);
  if (cached) return JSON.parse(cached);

  const spreadsheet = SpreadsheetApp.openById(F1XL_STAFF_APPLICATION_SOURCE.spreadsheetId);
  const sheet = spreadsheet.getSheetById(F1XL_STAFF_APPLICATION_SOURCE.sheetId);
  if (!sheet) throw new Error('The configured staff-application response tab could not be found.');
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.length ? values[0] : [];
  const applications = values.slice(1).map(function(row, index) {
    return buildStaffApplicationRecord_(row, headers, index + 2);
  }).filter(function(application) {
    return application.gamertag !== '';
  }).reverse();
  const reviews=staffApplicationReviews_(spreadsheet);
  applications.forEach(function(app){app.revision=staffApplicationRevision_(app);app.reviewed=reviews.rows.some(function(row){return row[0]===app.fingerprint&&row[1]===app.revision;});});

  const response = {
    ok: true,
    sourceName: spreadsheet.getName(),
    tabName: sheet.getName(),
    refreshedAt: new Date().toISOString(),
    roles: Object.keys(F1XL_STAFF_ROLE_COLUMNS),
    applications: applications
  };
  cache.put(F1XL_STAFF_APPLICATION_SOURCE.cacheKey, JSON.stringify(response), F1XL_STAFF_APPLICATION_SOURCE.cacheSeconds);
  return response;
}

function deleteStaffApplication(input) { fapAssertEntry_('deleteStaffApplication');
  return withStaffApplicationLock_(function() {
    const spreadsheet = SpreadsheetApp.openById(F1XL_STAFF_APPLICATION_SOURCE.spreadsheetId);
    const sheet = spreadsheet.getSheetById(F1XL_STAFF_APPLICATION_SOURCE.sheetId);
    if (!sheet) throw new Error('The configured staff-application response tab could not be found.');
    const row = findStaffApplicationRow_(sheet, input);
    const role = staffApplicationText_(sheet.getRange(row, 3).getDisplayValue());
    if (role === 'Team Principal') throw new Error('Team Principal applications cannot be deleted. Export them instead.');
    sheet.deleteRow(row);
    CacheService.getScriptCache().remove(F1XL_STAFF_APPLICATION_SOURCE.cacheKey);
    const response = getStaffApplications(true);
    response.message = 'Staff application deleted.';
    return response;
  });
}

function buildStaffApplicationRecord_(row, headers, sourceRow) {
  const role = staffApplicationText_(row[2]);
  const combined=headers[5]==='How strong is your internet connection?'&&String(headers[14]||'').startsWith('Why do you think you would be a good person for the ticket team');
  const columns=combined?{'Commentator':[3,4,5,6,7,8],'Administrator / Moderator':[9,10,11,12,13],'Ticket Team':[14,15,16],'Team Principal':[17,18,19,20,21,22,23,24],'Race Controller':[4,5,6],'Time Trial Team':[3]}:F1XL_STAFF_ROLE_COLUMNS;
  const applicableColumns = columns[role] || [];
  return {
    id: 'STAFF-' + sourceRow,
    sourceRow: sourceRow,
    fingerprint: [staffApplicationText_(row[0]), staffApplicationText_(row[1]), role].join('|'),
    received: staffApplicationText_(row[0]),
    gamertag: staffApplicationText_(row[1]),
    role: role,
    answers: applicableColumns.map(function(columnIndex) {
      return {
        question: staffApplicationText_(headers[columnIndex]),
        answer: staffApplicationText_(row[columnIndex])
      };
    }).filter(function(item) {
      return item.question !== '' && item.answer !== '';
    })
  };
}

function findStaffApplicationRow_(sheet, input) {
  const expectedRow = Number(input && input.sourceRow);
  const fingerprint = staffApplicationText_(input && input.fingerprint);
  if (!fingerprint) throw new Error('The staff application identity is missing. Refresh and try again.');
  const lastRow = sheet.getLastRow();
  if (expectedRow >= 2 && expectedRow <= lastRow) {
    const expectedValues = sheet.getRange(expectedRow, 1, 1, 3).getDisplayValues()[0];
    if ([expectedValues[0], expectedValues[1], expectedValues[2]].map(staffApplicationText_).join('|') === fingerprint) return expectedRow;
  }
  if (lastRow < 2) throw new Error('That staff application is no longer in the active response tab.');
  const rows = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
  for (let index = 0; index < rows.length; index += 1) {
    if (rows[index].map(staffApplicationText_).join('|') === fingerprint) return index + 2;
  }
  throw new Error('That staff application has moved or was already deleted. Refresh and try again.');
}

function withStaffApplicationLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

function staffApplicationText_(value) {
  return String(value == null ? '' : value).trim();
}

function staffApplicationRevision_(app){return intakeHash_([app.fingerprint,app.answers]);}
function staffApplicationReviews_(book){
  const headers=['Application identity','Reviewed response revision','Reviewed at'],sheet=book.getSheetByName('Staff Application Reviews');
  if(sheet&&sheet.getLastRow()&&JSON.stringify(sheet.getRange(1,1,1,3).getDisplayValues()[0])!==JSON.stringify(headers))throw new Error('Staff Application Reviews has an unrecognised layout.');
  return {sheet:sheet,headers:headers,rows:sheet&&sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,3).getDisplayValues():[]};
}
function markStaffApplicationReviewed(input) { fapAssertEntry_('markStaffApplicationReviewed');
  return withStaffApplicationLock_(function(){
    const book=SpreadsheetApp.openById(F1XL_STAFF_APPLICATION_SOURCE.spreadsheetId),sheet=book.getSheetById(F1XL_STAFF_APPLICATION_SOURCE.sheetId);
    const row=findStaffApplicationRow_(sheet,input),width=sheet.getLastColumn();
    const app=buildStaffApplicationRecord_(sheet.getRange(row,1,1,width).getDisplayValues()[0],sheet.getRange(1,1,1,width).getDisplayValues()[0],row);
    if(app.role==='Team Principal')throw new Error('Review this application in the season’s Team principals area.');
    if(staffApplicationRevision_(app)!==input.revision)throw new Error('This response changed. Refresh and review it again.');
    const reviews=staffApplicationReviews_(book),target=reviews.sheet||book.insertSheet('Staff Application Reviews');
    if(!target.getLastRow()){target.getRange(1,1,1,3).setValues([reviews.headers]).setFontWeight('bold');target.setFrozenRows(1);}
    const index=reviews.rows.findIndex(function(r){return r[0]===app.fingerprint;});
    intakeCommit_([{range:target.getRange(index<0?target.getLastRow()+1:index+2,1,1,3),values:[[app.fingerprint,input.revision,new Date().toISOString()]],text:true}]);
    const result=getStaffApplications(true);result.message='Application marked reviewed. The original response is retained.';return result;
  });
}

function getStaffApplicationAttention(input,force) { fapAssertEntry_('getStaffApplicationAttention');
  const seasons=Array.isArray(input)?input:[],response={available:false,count:0,principals:{}};
  let source;try{source=fapAttentionCached_('staff-source'+(F1XL_STAFF_APPLICATION_SOURCE.profile==='combined'?':combined':''),force,()=>{
    const book=SpreadsheetApp.openById(F1XL_STAFF_APPLICATION_SOURCE.spreadsheetId),sheet=book.getSheetById(F1XL_STAFF_APPLICATION_SOURCE.sheetId);
    if(!sheet)throw new Error('Staff application source is unavailable.');
    const values=sheet.getDataRange().getDisplayValues(),reviews=staffApplicationReviews_(book),reviewed=new Set(reviews.rows.map(r=>JSON.stringify([r[0],r[1]]))),principals=[];let count=0;
    values.slice(1).forEach((row,i)=>{const app=buildStaffApplicationRecord_(row,values[0]||[],i+2);if(!app.gamertag)return;
      if(app.role==='Team Principal'){const p=principalSelectionApplication_(app);principals.push({key:p.key,legacyKey:p.legacyKey,sourceRevision:p.sourceRevision});}
      else if(!reviewed.has(JSON.stringify([app.fingerprint,staffApplicationRevision_(app)])))count++;
    });return {count,principals};
  });}catch(error){return response;}
  response.available=true;response.count=source.count;
  seasons.slice(0,5).forEach(function(season){
    try{
      season=seasonPlanningSeason_(String(season));
      response.principals[season]=fapAttentionCached_('principals:'+season+':'+intakeHash_(source.principals),force,()=>{
        const book=seasonPlanningBook_(season);if(!book||!seasonMasterIsPlanning_(book))throw new Error('Choose a preseason Master.');
        const definition=F1XL_TP_SELECTION.applications,sheet=book.getSheetByName(definition.name);let rows=[];
        if(sheet&&sheet.getLastRow()){
          const range=sheet.getRange(1,1,sheet.getLastRow(),definition.headers.length),values=range.getDisplayValues();
          if(JSON.stringify(values[0])!==JSON.stringify(definition.headers)||range.getFormulas().some(r=>r.some(Boolean)))throw new Error('TP Applications needs checking.');
          rows=values.slice(1).filter(r=>r.some(Boolean));const ids=new Set();if(rows.some(r=>{if(!r[0]||ids.has(r[0]))return true;ids.add(r[0]);return false;}))throw new Error('Missing or duplicate TP application identity.');
        }
        const saved=principalSelectionSaved_({tables:{applications:{rows}}}),seen=new Set();let count=0;
        source.principals.forEach(app=>{if(seen.has(app.key))throw new Error('Duplicate staff application identity.');seen.add(app.key);if(app.legacyKey)seen.add(app.legacyKey);const prior=saved.find(s=>s.key===app.key||s.key===app.legacyKey);if(!prior||prior.decision==='Pending'||prior.sourceRevision!==app.sourceRevision)count++;});
        saved.forEach(app=>{if(!seen.has(app.key)&&app.decision==='Pending')count++;});
        return {available:true,count};
      });
    }catch(error){response.principals[season]={available:false,count:0};}
  });
  return response;
}
