/**
 * Permanent ticket / defence / appeal Form-response inbox.
 *
 * The response tab remains the source of truth. Archive copies the original
 * twelve Form values to the existing Archive tab before removing the active
 * row. Delete removes only the selected active response.
 */
const F1XL_TICKET_SUBMISSION_SOURCE = intakeConnection_('tickets',{
  spreadsheetId: '1EEfjnUaHy4w1dY66yu4VnQ0Buh-jVtsjmfl6H7MnAQk',
  sheetId: 2140272460,
  archiveSheetName: 'Archive',
  enhancedSheetId: 483613087,
  columnCount: 12,
  cacheKey: 'F1XL_TICKET_SUBMISSIONS_V3',
  cacheSeconds: 120
});

function getTicketSubmissions(forceRefresh) { fapAssertEntry_('getTicketSubmissions');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_TICKET_SUBMISSION_SOURCE.cacheKey);
  const cached = cache.get(F1XL_TICKET_SUBMISSION_SOURCE.cacheKey);
  if (cached) return JSON.parse(cached);

  const response = buildTicketSubmissionResponse_(openTicketSubmissionContext_());
  cache.put(F1XL_TICKET_SUBMISSION_SOURCE.cacheKey, JSON.stringify(response), F1XL_TICKET_SUBMISSION_SOURCE.cacheSeconds);
  return response;
}

function archiveTicketSubmission(input) { fapAssertEntry_('archiveTicketSubmission');
  return withTicketSubmissionLock_(function() {
    const context = openTicketSubmissionContext_(input);
    validateTicketArchive_(context);
    const row = findTicketSubmissionRow_(context.sourceSheet, input);
    const values=ticketSubmissionRead_(context,row,false);
    ticketArchiveAppend_(context.archiveSheet,values,ticketProcessingRevision_(values.map(ticketSubmissionText_)));
    context.sourceSheet.deleteRow(row);
    const response = refreshTicketSubmissions_(context);
    response.message = 'Submission moved to the Archive tab.';
    return response;
  });
}

function deleteTicketSubmission(input) { fapAssertEntry_('deleteTicketSubmission');
  return withTicketSubmissionLock_(function() {
    const context = openTicketSubmissionContext_(input);
    const row = findTicketSubmissionRow_(context.sourceSheet, input);
    context.sourceSheet.deleteRow(row);
    const response = refreshTicketSubmissions_(context);
    response.message = 'Submission permanently deleted from the active Form responses.';
    return response;
  });
}

function ticketSubmissionAssertSource_(spreadsheet){
  if(F1XL_TICKET_SUBMISSION_SOURCE.profile==='combined'){
    if(spreadsheet.getId()!==F1XL_TICKET_SUBMISSION_SOURCE.spreadsheetId)throw Error('Unknown combined ticket response workbook.');
  }else if(!/^TEST\b/i.test(fapWorkbookLegacyName_(spreadsheet.getName())))throw Error('This ticket inbox is restricted to the TEST response workbook. The live inbox has not been changed.');
}
function ticketSubmissionWidth_(sheet){
  const headers=sheet.getRange(1,1,1,13).getDisplayValues()[0],width=String(headers[3]||'').trim()==='Which session did this happen in?'?13:12;
  ticketSubmissionCanonical_(Array(width).fill(''),headers.slice(0,width));return width;
}
function openTicketSubmissionContext_(input) {
  const spreadsheet = SpreadsheetApp.openById(F1XL_TICKET_SUBMISSION_SOURCE.spreadsheetId);
  ticketSubmissionAssertSource_(spreadsheet);
  const requested=Number(input&&input.sourceSheetId||F1XL_TICKET_SUBMISSION_SOURCE.sheetId);
  if(![F1XL_TICKET_SUBMISSION_SOURCE.sheetId,F1XL_TICKET_SUBMISSION_SOURCE.enhancedSheetId].filter(Boolean).includes(requested))throw Error('Unknown ticket response source. Refresh the inbox.');
  const sourceSheet = spreadsheet.getSheetById(requested);
  const archiveSheet = F1XL_TICKET_SUBMISSION_SOURCE.archiveSheetId?spreadsheet.getSheetById(F1XL_TICKET_SUBMISSION_SOURCE.archiveSheetId):spreadsheet.getSheetByName(F1XL_TICKET_SUBMISSION_SOURCE.archiveSheetName);
  if (!sourceSheet) throw new Error('The configured ticket Form-response tab could not be found.');
  if (!archiveSheet) throw new Error('The ticket workbook is missing its Archive tab.');
  if(archiveSheet.getName()!==F1XL_TICKET_SUBMISSION_SOURCE.archiveSheetName)throw Error('The configured ticket archive name changed. Check the connection.');
  const columnCount=ticketSubmissionWidth_(sourceSheet);
  if(requested===F1XL_TICKET_SUBMISSION_SOURCE.enhancedSheetId&&columnCount!==13)throw Error('The improved ticket Form response tab must contain the incident session question.');
  const headers = sourceSheet.getRange(1,1,1,columnCount).getDisplayValues()[0];
  ticketSubmissionCanonical_(Array(columnCount).fill(''),headers);
  return {spreadsheet,sourceSheet,archiveSheet,headers,columnCount};
}

function buildTicketSubmissionResponse_(context) {
  if(context.sourceSheet.getSheetId()===F1XL_TICKET_SUBMISSION_SOURCE.enhancedSheetId)context=openTicketSubmissionContext_();
  const sources=[context];
  if(context.sourceSheet.getSheetId()===F1XL_TICKET_SUBMISSION_SOURCE.sheetId){
    const id=F1XL_TICKET_SUBMISSION_SOURCE.enhancedSheetId,added=id&&context.spreadsheet.getSheetById(id);
    if(added&&added.getSheetId()===id)sources.push(openTicketSubmissionContext_({sourceSheetId:id}));
  }
  const submissions=sources.flatMap(c=>ticketSubmissionRows_(c));
  return {ok:true,sourceName:context.spreadsheet.getName(),tabName:sources.map(c=>c.sourceSheet.getName()).join(' + '),archiveTabName:context.archiveSheet.getName(),refreshedAt:new Date().toISOString(),submissions};
}
function ticketSubmissionRows_(context){
  const lastRow = context.sourceSheet.getLastRow();
  const rows = lastRow > 1
    ? context.sourceSheet.getRange(2, 1, lastRow - 1, context.columnCount||12).getDisplayValues()
    : [];
  const submissions = rows.map(function(row, index) {
    return buildTicketSubmissionRecord_(ticketSubmissionCanonical_(row,context.headers),index+2,context.sourceSheet.getSheetId());
  }).filter(function(submission) {
    return submission.received !== '' && (submission.type !== '' || submission.fromDriver !== '');
  }).reverse();
  return submissions;
}

function buildTicketSubmissionRecord_(row, sourceRow, sourceSheetId) {
  const received = ticketSubmissionText_(row[0]);
  const type = ticketSubmissionText_(row[1]);
  const fromDriver = ticketSubmissionText_(row[3]);
  const againstDriver = ticketSubmissionText_(row[5]);
  return {
    id:'TICKET-SUBMISSION-'+(sourceSheetId&&sourceSheetId!==F1XL_TICKET_SUBMISSION_SOURCE.sheetId?sourceSheetId+'-':'')+sourceRow,
    sourceSheetId:sourceSheetId||F1XL_TICKET_SUBMISSION_SOURCE.sheetId,
    session:ticketSubmissionSession_(row[12]),
    sourceRow: sourceRow,
    fingerprint: [received, type, fromDriver, againstDriver].join('|'),
    submissionRevision: ticketProcessingRevision_(row.slice(0,row[12]?13:12).map(ticketSubmissionText_)),
    received: received,
    type: type,
    division: ticketSubmissionText_(row[2]),
    fromDriver: fromDriver,
    fromTeam: ticketSubmissionText_(row[4]),
    againstDriver: againstDriver,
    againstTeam: ticketSubmissionText_(row[6]),
    description: ticketSubmissionText_(row[7]),
    evidence: [row[8], row[9], row[10], row[11]].map(ticketSubmissionText_).filter(function(value) { return value !== ''; })
  };
}

function findTicketSubmissionRow_(sheet, input) {
  const expectedRow = Number(input && input.sourceRow);
  const fingerprint = ticketSubmissionText_(input && input.fingerprint);
  if (!fingerprint) throw new Error('The submission identity is missing. Refresh and try again.');
  const lastRow = sheet.getLastRow();
  const width=ticketSubmissionWidth_(sheet),headers=sheet.getRange(1,1,1,width).getDisplayValues()[0];
  const matches = function(raw) {
    const row=ticketSubmissionCanonical_(raw,headers),record=buildTicketSubmissionRecord_(row,0);
    return record.fingerprint===fingerprint&&(!input.submissionRevision||record.submissionRevision===input.submissionRevision);
  };
  if (expectedRow >= 2 && expectedRow <= lastRow) {
    const expectedValues = sheet.getRange(expectedRow, 1, 1, width).getDisplayValues()[0];
    if (matches(expectedValues)) return expectedRow;
  }
  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues();
    const found=rows.map((row,index)=>matches(row)?index+2:0).filter(Boolean);
    if(found.length===1)return found[0];
    if(found.length>1)throw Error('Duplicate submissions need checking before processing.');
  }
  throw new Error('That submission moved, changed or was already processed. Refresh the inbox and try again.');
}

function validateTicketArchive_(context) {
  const archiveHeaders = context.archiveSheet
    .getRange(1, 1, 1, F1XL_TICKET_SUBMISSION_SOURCE.columnCount)
    .getDisplayValues()[0];
  if (ticketSubmissionText_(context.headers[0]) !== 'Timestamp' || ticketSubmissionText_(archiveHeaders[0]) !== 'Timestamp') {
    throw new Error('The ticket response or Archive tab no longer starts with Timestamp. Nothing was moved.');
  }
  if (ticketSubmissionText_(context.headers[1]).toLowerCase().indexOf('ticket') < 0 || ticketSubmissionText_(archiveHeaders[1]).toLowerCase().indexOf('ticket') < 0) {
    throw new Error('The ticket response and Archive columns no longer match the expected structure. Nothing was moved.');
  }
}

function withTicketSubmissionLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

function refreshTicketSubmissions_(context) {
  CacheService.getScriptCache().remove(F1XL_TICKET_SUBMISSION_SOURCE.cacheKey);
  return buildTicketSubmissionResponse_(context);
}

function ticketSubmissionText_(value) {
  return String(value == null ? '' : value).trim();
}

/** Form v2 is mapped explicitly to legacy fields + session, never by shifting
 * an existing inbox or guessing a session for historical submissions. */
function ticketSubmissionCanonical_(row,headers){
  const h=headers.map(v=>String(v||'').trim().replace(/\s+/g,' '));
  if(h.length===12){
    const valid=h[0]==='Timestamp'&&/ticket/i.test(h[1])&&h[2]==='What Division?'&&h[3]==='Who is the ticket from?'&&h[5]==='Who is the ticket against?'&&h[7]==='What happened?';
    if(!valid)throw Error('Ticket form response columns changed. Check the response headings before processing.');
    return row.slice(0,12);
  }
  if(h.length!==13||h[3]!=='Which session did this happen in?')throw Error('Ticket form response columns changed. Check the response headings before processing.');
  const expected=['Timestamp','Ticket/ Appeal','What Division?','Which session did this happen in?','Who is the ticket from?','Which team is the ticket from?','Who is the ticket against?','Which team is the ticket against?','What happened?','Provide evidence here (Please only post 1 link in here)','Additional Evidence (Please only post 1 link in here)','Additional Evidence (Please only post 1 link in here)','Additional Evidence (Please only post 1 link in here)'];
  if(JSON.stringify(h)!==JSON.stringify(expected))throw Error('Ticket form response columns changed. Check the response headings before processing.');
  if(row[0]&&!String(row[3]||'').trim())throw Error('The new form response is missing its required incident session. Check the original response.');
  return [0,1,2,4,5,6,7,8,9,10,11,12,3].map(i=>row[i]==null?'':row[i]);
}
function ticketSubmissionSession_(value){
  const v=String(value||'').trim().toLowerCase(),sessions={'feature race':'Race','race':'Race','qualifying':'Qualifying','sprint qualifying':'Sprint qualifying','sprint race':'Sprint','sprint':'Sprint'};
  if(!v)return '';if(!sessions[v])throw Error('Choose a recognised incident session.');return sessions[v];
}
function ticketSubmissionRead_(context,row,display){const range=context.sourceSheet.getRange(row,1,1,context.columnCount||12);return ticketSubmissionCanonical_((display?range.getDisplayValues():range.getValues())[0],context.headers);}
