/**
 * Permanent ticket-processing workbook.
 *
 * This service follows the current workbook rather than replacing it: race
 * tabs are copied from Template, steward/appeal reviews stay in their existing
 * column groups, final decisions stay in Ticket Outcomes (new), and published
 * values are appended to Website Export.
 */
const F1XL_TICKET_PROCESSING_SOURCE = Object.freeze({
  spreadsheetId: '1xW2UqxG2joO1gpsUZobMM2qkTFDPLsZZQ78TvsmnlbI',
  templateSheetName: 'Template',
  outcomesSheetName: 'Ticket Outcomes (new)',
  websiteSheetName: 'Website Export',
  licenceSheetName: 'License Copy',
  overviewCacheKey: 'F1XL_TICKET_PROCESSING_OVERVIEW_V4',
  exportCacheKey: 'F1XL_TICKET_PROCESSING_EXPORT_V3',
  raceCachePrefix: 'F1XL_TICKET_PROCESSING_RACE_V4_',
  cacheSeconds: 120,
  firstTicketRow: 2,
  finalTicketRow: 50,
  finalTicketColumn: 72,
  finalOutcomeRow: 50
});

const F1XL_STEWARD_REVIEW_COLUMNS = Object.freeze([18, 23, 28, 33, 38]);
const F1XL_APPEAL_REVIEW_COLUMNS = Object.freeze([49, 54, 59, 64, 69]);
const F1XL_REVIEW_PENALTIES = Object.freeze(['', 'None', 'NFA', 'warning', 'reprimand', 'quali ban', 'race ban', '3 race ban']);
const F1XL_REVIEW_TIME_PENALTIES = Object.freeze(['', 'None', '5 Sec', '10 Sec', '20 Sec']);

function getTicketProcessingOverview(forceRefresh) { fapAssertEntry_('getTicketProcessingOverview');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_TICKET_PROCESSING_SOURCE.overviewCacheKey);
  const cached = cache.get(F1XL_TICKET_PROCESSING_SOURCE.overviewCacheKey);
  if (cached) return JSON.parse(cached);
  const response = buildTicketProcessingOverview_(openTicketProcessingContext_());
  cacheTicketProcessingResponse_(cache, F1XL_TICKET_PROCESSING_SOURCE.overviewCacheKey, response);
  return response;
}

function getTicketRaceWorkspace(sheetName, forceRefresh) { fapAssertEntry_('getTicketRaceWorkspace');
  const context = openTicketProcessingContext_();
  const sheet = findTicketRaceSheet_(context, sheetName);
  const cache = CacheService.getScriptCache();
  const cacheKey = ticketRaceCacheKey_(sheet.getName());
  if (forceRefresh === true) cache.remove(cacheKey);
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const response = buildTicketRaceWorkspace_(sheet);
  cacheTicketProcessingResponse_(cache, cacheKey, response);
  return response;
}

function createTicketRaceWorkspace(input) { fapAssertEntry_('createTicketRaceWorkspace');
  return withTicketProcessingLock_(function() {
    const context = openTicketProcessingContext_();
    const season = Number(input && input.season);
    const track = ticketProcessingText_(input && input.track);
    if (!Number.isInteger(season) || season < 1 || season > 999) throw new Error('Enter a valid season number.');
    if (!track) throw new Error('Enter the track or location name.');
    if (/[:\\/?*\[\]]/.test(track)) throw new Error('The track name contains a character Google Sheets cannot use in a tab name.');
    const name = 'S' + season + ' ' + track;
    if (name.length > 100) throw new Error('The race-tab name is too long.');
    if (context.spreadsheet.getSheetByName(name)) throw new Error(name + ' already exists.');
    const created = context.templateSheet.copyTo(context.spreadsheet).setName(name).showSheet();
    context.spreadsheet.setActiveSheet(created);
    clearTicketProcessingCaches_();
    const response = buildTicketProcessingOverview_(context);
    response.createdSheetName = name;
    response.message = name + ' created from the current Template tab.';
    return response;
  });
}

function importTicketSubmissionToRace(input) { fapAssertEntry_('importTicketSubmissionToRace');
  return withTicketProcessingLock_(function() {
    const processing = openTicketProcessingContext_();
    const sheet = findTicketRaceSheet_(processing, input && input.sheetName);
    const registeredRound = ticketRoundForSheet_(processing.spreadsheet, sheet.getName());
    if (registeredRound) return ticketImportRegistered_(processing, sheet, input, registeredRound);
    const inbox = openTicketSubmissionContext_(input);
    const sourceRow = findTicketSubmissionRow_(inbox.sourceSheet, input);
    const sourceValues = ticketSubmissionRead_(inbox,sourceRow,true);
    const submission = buildTicketSubmissionRecord_(sourceValues, sourceRow);
    const mode = ticketProcessingText_(input && input.mode).toLowerCase();
    let targetRow = Number(input && input.targetRow);

    if (mode === 'ticket') {
      targetRow = firstEmptyTicketProcessingRow_(sheet);
      const base = [submission.division, submission.fromDriver, submission.fromTeam, submission.againstDriver, submission.againstTeam, submission.description]
        .concat(submission.evidence.slice(0, 4));
      while (base.length < 15) base.push('');
      sheet.getRange(targetRow, 2, 1, 15).setValues([base]);
      if(submission.session)sheet.getRange(targetRow,75).setValue(submission.session);
    } else if (mode === 'defence') {
      targetRow = normaliseTicketProcessingRow_(targetRow);
      const record = buildTicketRaceRecord_(sheet, targetRow);
      if (!record.division) throw new Error('Choose a populated ticket for this defence.');
      if ((record.defenceComments || record.defenceEvidence.some(Boolean)) && input.overwrite !== true) {
        throw new Error('That ticket already contains a defence. Confirm overwrite if this is intentional.');
      }
      const defence = [submission.description].concat(submission.evidence.slice(0, 4));
      while (defence.length < 5) defence.push('');
      sheet.getRange(targetRow, 12, 1, 5).setValues([defence]);
    } else if (mode === 'appeal') {
      targetRow = normaliseTicketProcessingRow_(targetRow);
      const record = buildTicketRaceRecord_(sheet, targetRow);
      if (!record.division) throw new Error('Choose a populated ticket for this appeal.');
      if ((record.appealed || record.appealDescription || record.appealEvidence.some(Boolean)) && input.overwrite !== true) {
        throw new Error('That ticket already contains an appeal. Confirm overwrite if this is intentional.');
      }
      let description = submission.description;
      if (submission.evidence.length > 3) description += (description ? '\n\n' : '') + 'Additional evidence: ' + submission.evidence.slice(3).join(' ');
      const appeal = ['Yes', description].concat(submission.evidence.slice(0, 3));
      while (appeal.length < 5) appeal.push('');
      sheet.getRange(targetRow, 43, 1, 5).setValues([appeal]);
    } else {
      throw new Error('Choose whether this submission is a ticket, defence or appeal.');
    }

    clearTicketProcessingCaches_(sheet.getName());
    const response = buildTicketRaceWorkspace_(sheet);
    response.message = submission.type + ' copied into ' + sheet.getName() + '. The original Form submission remains in the inbox until you archive or delete it.';
    response.importedRow = targetRow;
    return response;
  });
}

function saveTicketRaceRecord(input) { fapAssertEntry_('saveTicketRaceRecord');
  return withTicketProcessingLock_(function() {
    const context = openTicketProcessingContext_();
    const sheet = findTicketRaceSheet_(context, input && input.sheetName);
    const row = normaliseTicketProcessingRow_(input && input.sheetRow);
    const current = buildTicketRaceRecord_(sheet, row);
    if (ticketProcessingText_(input && input.revision) !== current.recordRevision) {
      throw new Error('This ticket changed after you opened it. Refresh before saving.');
    }
    const record = normaliseTicketRaceRecord_(input && input.record);
    if(ticketRoundForSheet_(context.spreadsheet,sheet.getName())&&ticketProcessingRevision_(record.base.concat(record.appeal))!==current.recordRevision){
      ticketCaseHistory_(context.spreadsheet,sheet,row,'Details before edit');
      sheet.getRange(row,76,1,10).setValues([Array(10).fill('Draft')]);
    }
    sheet.getRange(row, 2, 1, 15).setValues([record.base]);
    sheet.getRange(row, 43, 1, 5).setValues([record.appeal]);
    sheet.getRange(row, 75).setValue(record.session);
    ticketNumberByDivision_(context,sheet);
    clearTicketProcessingCaches_(sheet.getName());
    const response = buildTicketRaceWorkspace_(sheet);
    response.message = sheet.getName() + ' · ticket ' + (current.ticketNumber || row - 1) + ' saved.';
    return response;
  });
}

function addTicketRaceRecord(input) { fapAssertEntry_('addTicketRaceRecord');
  return withTicketProcessingLock_(function() {
    const context = openTicketProcessingContext_();
    const sheet = findTicketRaceSheet_(context, input && input.sheetName);
    let targetRow = 0;
    const divisions = sheet.getRange(F1XL_TICKET_PROCESSING_SOURCE.firstTicketRow, 2, F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow - 1, 1).getDisplayValues();
    for (let index = 0; index < divisions.length; index += 1) {
      if (!ticketProcessingText_(divisions[index][0])) { targetRow = index + F1XL_TICKET_PROCESSING_SOURCE.firstTicketRow; break; }
    }
    if (!targetRow) throw new Error('The race tab has no empty ticket rows remaining.');
    const record = normaliseTicketRaceRecord_(input && input.record);
    sheet.getRange(targetRow, 2, 1, 15).setValues([record.base]);
    sheet.getRange(targetRow, 43, 1, 5).setValues([record.appeal]);
    if(ticketRoundForSheet_(context.spreadsheet,sheet.getName())){
      sheet.getRange(targetRow,73,1,13).setValues([['CASE-'+Utilities.getUuid(),'','Race'].concat(Array(10).fill('Draft'))]);
      sheet.getRange(targetRow,1).clearContent();ticketNumberByDivision_(context,sheet);
    }
    clearTicketProcessingCaches_(sheet.getName());
    const response = buildTicketRaceWorkspace_(sheet);
    response.message = 'Ticket added to ' + sheet.getName() + '.';
    return response;
  });
}

function deleteTicketRaceRecord(input) { fapAssertEntry_('deleteTicketRaceRecord');
  return withTicketProcessingLock_(function() {
    const context = openTicketProcessingContext_();
    const sheet = findTicketRaceSheet_(context, input && input.sheetName);
    const row = normaliseTicketProcessingRow_(input && input.sheetRow);
    const current = buildTicketRaceRecord_(sheet, row);
    if (ticketProcessingText_(input && input.revision) !== current.fullRevision) {
      throw new Error('This ticket changed after you opened it. Refresh before deleting it.');
    }
    ticketCaseHistory_(context.spreadsheet,sheet,row,'Before deletion');
    sheet.getRange(row, 2, 1, sheet.getMaxColumns()>=85?84:F1XL_TICKET_PROCESSING_SOURCE.finalTicketColumn - 1).clearContent();
    ticketNumberByDivision_(context,sheet);
    clearTicketProcessingCaches_(sheet.getName());
    const response = buildTicketRaceWorkspace_(sheet);
    response.message = 'Ticket removed from ' + sheet.getName() + '.';
    return response;
  });
}

function saveTicketReview(input) { fapAssertEntry_('saveTicketReview');
  return saveTicketReviews({sheetName:input.sheetName,reviews:[input]});
}

// Validate the entire changed set before writing any review. Only touched slots are saved.
function saveTicketReviews(input) { fapAssertEntry_('saveTicketReviews');
  return withTicketProcessingLock_(function() {
    const context=openTicketProcessingContext_(),sheet=findTicketRaceSheet_(context,input&&input.sheetName);
    const reviews=input&&input.reviews,seen={};
    if(!Array.isArray(reviews)||!reviews.length||reviews.length>490)throw new Error('Choose changed reviews to save.');
    const reviewers=reviewerDefinitions_(sheet),round=ticketRoundForSheet_(context.spreadsheet,sheet.getName());
    const prepared=reviews.map(function(review){
      if(!['steward','appeal'].includes(review.reviewType||'steward'))throw new Error('Choose stewards or appeals reviews.');
      const key=[review.sheetRow,review.reviewType,review.reviewerIndex].join(':');
      if(seen[key])throw new Error('A reviewer appears twice in this save.');seen[key]=true;
      return ticketPrepareReview_(context,sheet,review,{reviewers,round});
    });
    const written=[];
    try{prepared.forEach(function(p){if(p.conflict)ticketCaseHistory_(context.spreadsheet,sheet,p.row,'Before own-team recusal');written.push(p);sheet.getRange(p.row,p.startColumn,1,4).setValues([p.values.map(ticketIntakeLiteral_)]);if(p.round)sheet.getRange(p.row,p.stateColumn).setValue(p.state);});}
    catch(error){
      let restored=true;written.reverse().forEach(function(p){try{sheet.getRange(p.row,p.startColumn,1,4).setValues([p.originalValues]);if(p.round)sheet.getRange(p.row,p.stateColumn).setValue(p.originalState);}catch(e){restored=false;}});
      clearTicketProcessingCaches_(sheet.getName());
      throw new Error(error.message+(restored?' No review changes retained.':' Some writes could not be restored; reopen this ticket before retrying.'));
    }
    // Review headers/notes are installed at round setup and reviewer-name edits.
    clearTicketProcessingCaches_(sheet.getName());
    const response=input.responseMode==='changed'
      ?{ok:true,partial:true,sheetName:sheet.getName(),tickets:Array.from(new Set(prepared.map(p=>p.row))).map(row=>buildTicketRaceRecord_(sheet,row)),refreshedAt:new Date().toISOString()}
      :buildTicketRaceWorkspace_(sheet);
    response.message='Reviews saved.';return response;
  });
}

function ticketPrepareReview_(context,sheet,input,loaded) {
    const row = normaliseTicketProcessingRow_(input && input.sheetRow);
    const record=buildTicketRaceRecord_(sheet,row);
    if(!record.division)throw new Error('This ticket no longer exists. Reopen the round.');
    if(input.caseId!=null&&input.caseId!==record.caseId||input.recordRevision!=null&&input.recordRevision!==record.recordRevision)throw new Error('This ticket or its evidence changed. Reopen it before saving.');
    const reviewType = input && input.reviewType === 'appeal' ? 'appeal' : 'steward';
    const starts = reviewType === 'appeal' ? F1XL_APPEAL_REVIEW_COLUMNS : F1XL_STEWARD_REVIEW_COLUMNS;
    const reviewerIndex = Number(input && input.reviewerIndex);
    if (!Number.isInteger(reviewerIndex) || !starts[reviewerIndex]) throw new Error('Choose a valid reviewer.');
    const startColumn = starts[reviewerIndex];
    if(input.reviewerName!=null&&input.reviewerName!==(loaded?loaded.reviewers:reviewerDefinitions_(sheet))[reviewType==='appeal'?'appeals':'stewards'][reviewerIndex].name)throw new Error('The reviewer names changed. Refresh before saving this judgement.');
    const round=loaded?loaded.round:ticketRoundForSheet_(context.spreadsheet,sheet.getName()),stateColumn=(reviewType==='appeal'?81:76)+reviewerIndex;
    if(round&&reviewType==='appeal'&&String(record.appealed).toLowerCase()!=='yes')throw new Error('No appeal has been attached to this case.');
    const currentVote=record[reviewType==='appeal'?'appealVotes':'stewardVotes'][reviewerIndex],currentState=currentVote.state;
    const currentValues=[currentVote.penalty,currentVote.timePenalty,currentVote.atFault,currentVote.comments];
    if(input.teamConflictTeam){
      const team=ticketProcessingText_(input.teamConflictTeam).toLowerCase();
      if(![record.submitterTeam,record.offenderTeam].some(t=>t.toLowerCase()===team))throw new Error('This ticket does not involve the selected team. Reopen Team conflicts.');
      if(currentState!=='Recused'&&currentValues.some(Boolean)&&input.replaceExisting!==true)throw new Error('This reviewer already has a judgement. Confirm replacing it with a recusal.');
    }
    if (ticketProcessingText_(input && input.revision) !== ticketProcessingRevision_(currentValues.concat(currentState))) {
      throw new Error('This review changed after you opened it. Refresh before saving.');
    }
    const review = input && input.review ? input.review : {};
    const penalty = ticketProcessingText_(review.penalty);
    const timePenalty = ticketProcessingText_(review.timePenalty);
    if (F1XL_REVIEW_PENALTIES.indexOf(penalty) < 0) throw new Error('Choose a valid licence penalty.');
    if (F1XL_REVIEW_TIME_PENALTIES.indexOf(timePenalty) < 0) throw new Error('Choose a valid time penalty.');
    const values = [penalty, timePenalty, ticketProcessingText_(review.atFault), ticketProcessingText_(review.comments)];
    const state=String(review.state||'Draft');
    if(round&&!['Draft','Submitted','Recused'].includes(state))throw new Error('Choose Draft, Submitted or Recused.');
    if(round&&state==='Submitted'&&(!penalty||!values[3]))throw new Error('A submitted review needs a decision and reasoning.');
    if(round&&state==='Recused'&&!values[3])throw new Error('Record why this reviewer is recused.');
    if(state==='Recused'&&(penalty||timePenalty||values[2]))throw new Error('A recused reviewer cannot assign a penalty or an at-fault driver. Clear those fields first.');
    const originalRange=sheet.getRange(row,startColumn,1,4),original=originalRange.getValues()[0],formulas=originalRange.getFormulas()[0];
    return {row:row,startColumn:startColumn,stateColumn:stateColumn,values:values,state:state,round:round,originalValues:original.map((v,i)=>formulas[i]||ticketIntakeLiteral_(v)),originalState:round?sheet.getRange(row,stateColumn).getValue():'',conflict:!!input.teamConflictTeam};
}

function prepareTicketOutcomes(sheetName) { fapAssertEntry_('prepareTicketOutcomes');
  return withTicketProcessingLock_(function() {
    const context = openTicketProcessingContext_();
    const raceSheet = findTicketRaceSheet_(context, sheetName);
    ticketNumberByDivision_(context,raceSheet);
    if(ticketOutcomeSourceRace_(context.outcomesSheet)===sheetName&&context.outcomesSheet.getRange('AB1').getValue()!=='FAP Preparing'){ticketRestoreOutcomeCaseLinks_(context,sheetName);ticketOutcomeDriverValidation_(context,sheetName);return buildTicketOutcomeWorkspace_(context,sheetName);}
    const saved=context.spreadsheet.getSheetByName('Saved outcomes '+raceSheet.getSheetId());
    const restore=saved?ticketSavedDecisions_(saved,raceSheet):null;
    const ticketCount = countTicketRows_(raceSheet);
    if (ticketCount > F1XL_TICKET_PROCESSING_SOURCE.finalOutcomeRow - 1) {
      throw new Error('The supported race capacity is 49 tickets. Extend the workflow before continuing.');
    }
    ticketReviewReady_(raceSheet);
    ticketRememberOutcomes_(context);
    const backup=context.outcomesSheet.copyTo(context.spreadsheet).setName('Outcomes backup '+Date.now());backup.hideSheet();
    context.outcomesSheet.getRange('AB1').setValue('FAP Preparing');
    ticketOutcomeFormulas_(context,raceSheet);
    const safeSheetName = raceSheet.getName().replace(/'/g, "''");
    const formula = "=ARRAYFORMULA('"+safeSheetName+"'!B2:P50)";
    context.outcomesSheet.getRange('B2:P50').clearContent();
    context.outcomesSheet.getRange('B2').setFormula(formula);
    context.outcomesSheet.getRange('Q2:Q50').clearContent();
    context.outcomesSheet.getRange('S2:T50').clearContent();
    context.outcomesSheet.getRange('W2:W50').clearContent();
    context.outcomesSheet.getRange('Z2:Z50').clearContent();
    context.outcomesSheet.getRange('AA1').setValue('FAP Case ID');
    const cases=buildTicketRaceWorkspace_(raceSheet).tickets;
    context.outcomesSheet.getRange('AA2:AA50').setValues(Array.from({length:49},(_,i)=>{const c=cases.find(t=>t.sheetRow===i+2);return [c?ticketOutcomeCaseKey_(c):''];}));
    ticketOutcomeDriverValidation_(context,sheetName,null,null,null,restore);
    if(restore)restore.forEach(item=>[17,19,20,23,26].forEach((col,i)=>context.outcomesSheet.getRange(item.row,col).setValue(ticketIntakeLiteral_(item.values[i]))));
    context.outcomesSheet.getRange('AB1').setValue('FAP Ready');
    SpreadsheetApp.flush();
    clearTicketProcessingCaches_();
    const response = buildTicketOutcomeWorkspace_(context, raceSheet.getName());
    response.message = (restore?'Saved outcomes resumed for ':'Outcomes ready for ') + raceSheet.getName() + '.';
    return response;
  });
}

function getTicketOutcomeWorkspace(forceRefresh) { fapAssertEntry_('getTicketOutcomeWorkspace');
  const context = openTicketProcessingContext_();
  return buildTicketOutcomeWorkspace_(context, ticketOutcomeSourceRace_(context.outcomesSheet));
}

function saveTicketOutcome(input) { fapAssertEntry_('saveTicketOutcome');
  return withTicketProcessingLock_(function() {
    const context=openTicketProcessingContext_(),race=input&&input.sourceRace,sheet=context.outcomesSheet;
    if(!race||sheet.getRange('AB1').getValue()==='FAP Preparing'||ticketOutcomeSourceRace_(sheet)!==race)throw new Error('Another round is open for outcome editing. Reopen this round’s outcomes before saving.');
    const items=input.outcomes===undefined?[input]:input.outcomes;
    if(!Array.isArray(items)||!items.length||items.length>49)throw new Error('Save between one and 49 outcomes together.');
    const seen=new Set(),additional=ticketAdditionalPenaltyRows_(context.spreadsheet),drivers=ticketOutcomeDriverNames_(context,race);
    const penalties=context.licenceSheet.getRange(1,5,Math.min(13,context.licenceSheet.getLastRow()),2).getDisplayValues();
    const values=ticketOutcomeCaseLinks_(context,race,sheet.getRange(2,1,49,27).getDisplayValues());
    // Validate the whole batch against one pre-write snapshot. Earlier rows can
    // change the calculated totals/revisions of later rows when Sheets recalculates.
    const prepared=items.map(item=>{
      const row=Number(item.sheetRow);
      if(!Number.isInteger(row)||row<2||row>F1XL_TICKET_PROCESSING_SOURCE.finalOutcomeRow||seen.has(row))throw new Error('Choose each valid outcome row only once.');
      seen.add(row);
      const current=buildTicketOutcomeRecord_(sheet,row,values[row-2],ticketAdditionalFor_(additional,race,values[row-2][26],'Outcome'));
      if(!current.division||ticketProcessingText_(item.revision)!==current.revision||(item.caseId&&item.caseId!==current.caseId))throw new Error('This outcome changed after you opened it. Refresh before saving.');
      const outcome=item.outcome||{},extras=ticketNormaliseAdditionalPenalties_(context,outcome.additionalPenalties==null?current.additionalPenalties:outcome.additionalPenalties,outcome.driverPunished,penalties);
      if(extras.length&&!current.caseId)throw new Error('This older case has no permanent ID. Multiple penalties require a registered round.');
      const allowed=drivers.concat([current.submitter,current.offender,current.driverPunished]),selected=ticketProcessingText_(outcome.driverPunished);
      if(selected&&!allowed.includes(selected))throw new Error('Choose a driver from this season or this ticket. Reopen the outcome if the roster has changed.');
      return {row,current,outcome,extras};
    });
    // Snapshot only editable columns. Calculated fields remain formulas and are
    // never frozen to values during a normal save or its rollback.
    const spans=[[17,1],[19,2],[23,1],[26,1],[27,1]],writes=[],savedValues=sheet.getRange(2,17,49,11).getValues(),savedFormulas=sheet.getRange(2,17,49,11).getFormulas();
    prepared.forEach(p=>{
      const time=(driver,value)=>{const extra=p.extras.find(e=>e.driver.toLowerCase()===driver.toLowerCase());return extra?extra.timePenalty:ticketProcessingText_(value);};
      const desired=[[ticketProcessingText_(p.outcome.driverPunished)],[p.outcome.penalty,p.outcome.evaluation].map(ticketProcessingText_),[time(p.current.submitter,p.outcome.submitterPenalty)],[time(p.current.offender,p.outcome.offenderPenalty)],[p.current.caseId]];
      spans.forEach(([col,width],i)=>{
        const before=savedValues[p.row-2].slice(col-17,col-17+width),formulas=savedFormulas[p.row-2].slice(col-17,col-17+width);
        if(desired[i].some((v,j)=>String(v)!==String(before[j])||formulas[j]))writes.push({row:p.row,col,width,before:[before],formulas:[formulas],after:[desired[i].map(ticketIntakeLiteral_)]});
      });
    });
    // Adjacent changed rows share a write, while gaps and all computed columns
    // stay untouched (including manual edits outside this batch).
    writes.sort((a,b)=>a.col-b.col||a.row-b.row);const blocks=[];
    writes.forEach(w=>{const last=blocks[blocks.length-1];if(last&&last.col===w.col&&last.row+last.after.length===w.row){last.before.push(...w.before);last.formulas.push(...w.formulas);last.after.push(...w.after);}else blocks.push({...w});});
    let nextAdditional=additional.slice();
    prepared.forEach(p=>{if(p.current.caseId&&JSON.stringify(p.extras)!==JSON.stringify(p.current.additionalPenalties))nextAdditional=nextAdditional.filter(r=>!(r[0]===race&&r[1]===p.current.caseId&&r[6]==='Outcome')).concat(p.extras.map(e=>[race,p.current.caseId,e.driver,e.penalty,e.points,e.timePenalty,'Outcome']));});
    const extrasChanged=JSON.stringify(nextAdditional)!==JSON.stringify(additional);
    if(extrasChanged){
      const log=context.spreadsheet.getSheetByName(F1XL_TICKET_SEASONS.log),history=prepared.filter(p=>p.current.additionalPenalties.length&&JSON.stringify(p.extras)!==JSON.stringify(p.current.additionalPenalties)).map(p=>['PENALTIES-'+Utilities.getUuid(),race,p.current.caseId,'Previous Outcome additional penalties',new Date().toISOString(),'','','','','',JSON.stringify(additional.filter(r=>r[0]===race&&r[1]===p.current.caseId&&r[6]==='Outcome')),'Preserved']);
      if(log&&history.length)log.getRange(log.getLastRow()+1,1,history.length,12).setValues(history);
    }
    try{
      prepared.forEach(p=>{if(writes.some(w=>w.row===p.row&&w.col===17))ticketOutcomeDriverValidation_(context,race,p.row,p.current,p.outcome.driverPunished,null,drivers);});
      blocks.forEach(w=>sheet.getRange(w.row,w.col,w.after.length,w.width).setValues(w.after));
      if(extrasChanged)ticketWriteAdditionalRows_(context.spreadsheet,additional,nextAdditional);
      SpreadsheetApp.flush();
    }catch(error){
      try{blocks.forEach(w=>sheet.getRange(w.row,w.col,w.before.length,w.width).setValues(w.before.map((r,i)=>r.map((v,j)=>w.formulas[i][j]||ticketIntakeLiteral_(v)))));if(extrasChanged)ticketWriteAdditionalRows_(context.spreadsheet,nextAdditional,additional);SpreadsheetApp.flush();}
      catch(e){throw new Error('Outcome save was interrupted. Reopen this round to check which changes were retained.');}
      throw error;
    }
    // Read all calculated totals after the write: an earlier outcome can affect later rows.
    // Reuse the extras already validated in this request; send only changed records.
    const response=buildTicketOutcomeWorkspace_(context,race,{drivers,penalties,additional:nextAdditional});
    if(input.responseMode==='changed'){
      const known=input.knownRevisions||{};
      response.partial=true;response.presentRows=response.tickets.map(t=>t.sheetRow);
      response.tickets=response.tickets.filter(t=>seen.has(t.sheetRow)||known[t.sheetRow]!==t.revision);
      delete response.drivers;delete response.penalties;
    }
    response.message=prepared.length===1?'Ticket '+(prepared[0].current.ticketNumber||prepared[0].row-1)+' outcome saved.':prepared.length+' outcomes saved.';
    return response;
  });
}

function ticketWriteAdditionalRows_(book,old,next){
  const size=Math.max(old.length,next.length);if(!size)return;
  const sheet=ticketAdditionalSheet_(book,true),rows=next.slice();
  while(rows.length<size)rows.push(Array(7).fill(''));
  if(sheet.getMaxRows()<size+1)sheet.insertRowsAfter(sheet.getMaxRows(),size+1-sheet.getMaxRows());
  sheet.getRange(2,1,size,7).setValues(rows.map(r=>r.map((v,i)=>i===4&&v!==''&&Number.isFinite(Number(v))?Number(v):ticketIntakeLiteral_(v))));
}

function publishTicketOutcomes(input) { fapAssertEntry_('publishTicketOutcomes');
  if(input&&input.applyPenalties===true)fapRequire_(fapCurrentPerson_(),'licences',2);
  return withTicketProcessingLock_(function() {return ticketPublishOutcomes_(input);});
}
function ticketPublishOutcomes_(input) {
    const context = openTicketProcessingContext_();
    const raceName = ticketProcessingText_(input && input.raceName);
    const sourceRace = ticketOutcomeSourceRace_(context.outcomesSheet);
    if(context.outcomesSheet.getRange('AB1').getValue()==='FAP Preparing')throw new Error('Reopen outcomes to finish the interrupted preparation before publishing.');
    if (!raceName || raceName !== sourceRace) throw new Error('Prepare and review Ticket Outcomes (new) for the selected race before publishing.');
    ticketReviewReady_(findTicketRaceSheet_(context,raceName));
    const existingRaceLabels = context.websiteSheet.getRange(2, 1, Math.max(1, context.websiteSheet.getLastRow() - 1), 1).getDisplayValues().flat().map(ticketProcessingText_);
    if (existingRaceLabels.indexOf(raceName) >= 0) throw new Error(raceName + ' already exists in Website Export. Use the appeals/update section instead of publishing it twice.');
    const idHeader=context.websiteSheet.getMaxColumns()>=33?context.websiteSheet.getRange('AG1').getDisplayValue():'';
    if(idHeader&&idHeader!=='FAP Case ID')throw new Error('Website Export column AG is already in use. Check it before adding permanent case IDs.');
    const display = context.outcomesSheet.getRange(2, 1, F1XL_TICKET_PROCESSING_SOURCE.finalOutcomeRow - 1, 26).getDisplayValues();
    const values = context.outcomesSheet.getRange(2, 1, F1XL_TICKET_PROCESSING_SOURCE.finalOutcomeRow - 1, 26).getValues();
    const rows = values.filter(function(row, index) { return ticketProcessingText_(display[index][1]) !== ''; });
    if (!rows.length) throw new Error('There are no populated outcomes to publish.');
    display.filter(r=>r[1]).forEach(r=>{if(!r[18]||!r[19]||r[17]===''||!Number.isFinite(Number(r[17])))throw new Error('Every case needs a final penalty, numeric points and written evaluation before publication.');if(Number(r[17])!==0&&!r[16])throw new Error('Choose the punished driver for every points penalty.');});
    const cases=buildTicketRaceWorkspace_(findTicketRaceSheet_(context,raceName)).tickets;
    const extrasByCase=ticketAdditionalPenaltyRows_(context.spreadsheet);
    const exportRows = rows.sort((a,b)=>Number(a[0])-Number(b[0])).map(function(row) {
      const match=cases.find(t=>String(t.ticketNumber)===String(row[0]));
      const extras=match?ticketAdditionalFor_(extrasByCase,raceName,match.caseId,'Outcome'):[];
      if(extras.length){const validated=ticketNormaliseAdditionalPenalties_(context,extras,row[16]);if(validated.some((p,i)=>Number(p.points)!==Number(extras[i].points)||extras[i].points===''))throw new Error('Additional penalty points do not match their labels. Open and save that outcome again.');ticketStoreAdditionalPenalties_(context.spreadsheet,raceName,match.caseId,'Published',extras);row=row.slice();row[19]=ticketAdditionalEvaluation_(row[19],extras);}
      // Older manually imported outcomes can have empty party formulas despite
      // a complete primary decision. Correct only the publication copy.
      row=ticketExportPartyPoints_(row);
      return [raceName].concat(row).concat(ticketAppealPublicFields_(['','','','',''],match)).concat([match?match.caseId:'']);
    });
    const startRow = Math.max(2, context.websiteSheet.getLastRow() + 1);
    if(context.websiteSheet.getMaxColumns()<33)context.websiteSheet.insertColumnsAfter(context.websiteSheet.getMaxColumns(),33-context.websiteSheet.getMaxColumns());
    context.websiteSheet.getRange('AG1').setValue('FAP Case ID');
    context.websiteSheet.getRange(startRow, 1, exportRows.length, 33).setValues(exportRows);
    if (input && input.hideRows === true) context.websiteSheet.hideRows(startRow, exportRows.length);
    const round=ticketRoundForSheet_(context.spreadsheet,raceName);
    if(round){const register=context.spreadsheet.getSheetByName(F1XL_TICKET_SEASONS.rounds),now=new Date();register.getRange(round.row,9).setValue(now.toISOString());if(!round.appealsClose&&Number(round.appealHours)>0)register.getRange(round.row,10).setValue(Utilities.formatDate(new Date(now.getTime()+round.appealHours*3600000),'Europe/London','yyyy-MM-dd HH:mm'));register.getRange(round.row,11).setValue('Published');}
    clearTicketProcessingCaches_();
    const response = buildWebsiteTicketExport_(context);
    response.message = exportRows.length + ' outcome' + (exportRows.length === 1 ? '' : 's') + ' published for ' + raceName + '.';
    if(typeof ticketPublicAfterSave_==='function')ticketPublicAfterSave_(context,raceName,response);
    if(input.applyPenalties===true)ticketFinishLicenceTransfer_(raceName,response);
    return response;
}

function ticketExportPartyPoints_(row){
  const out=row.slice(),primary=String(out[16]||'').trim().toLowerCase(),points=Number(out[17]);
  if(!primary||!Number.isFinite(points)||points<=0)return out;
  [[2,20,21],[4,23,24]].forEach(([name,added,total])=>{
    if(String(out[name]||'').trim().toLowerCase()!==primary)return;
    if(!String(out[added]||'').trim()||Number(out[added])<points){out[added]=points;if(!String(out[total]||'').trim()||Number(out[total])<points)out[total]='';}
  });
  return out;
}

function getWebsiteTicketExport(forceRefresh, decisionRow) { fapAssertEntry_('getWebsiteTicketExport');
  if(decisionRow)return ticketAppealContext_(openTicketProcessingContext_(),Number(decisionRow));
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_TICKET_PROCESSING_SOURCE.exportCacheKey);
  const cached = cache.get(F1XL_TICKET_PROCESSING_SOURCE.exportCacheKey);
  if (cached) return JSON.parse(cached);
  const response = buildWebsiteTicketExport_(openTicketProcessingContext_());
  cacheTicketProcessingResponse_(cache, F1XL_TICKET_PROCESSING_SOURCE.exportCacheKey, response);
  return response;
}

function cacheTicketProcessingResponse_(cache, key, response) {
  // Caching is optional: large historical exports must still reach the caller.
  const value = JSON.stringify(response);
  try {
    cache.put(key, value, F1XL_TICKET_PROCESSING_SOURCE.cacheSeconds);
  } catch (error) {
    // CacheService may reject an oversized value or exhaust its quota.
    // The freshly read workbook response remains authoritative and complete.
  }
}

function savePublishedTicketAppeal(input) { fapAssertEntry_('savePublishedTicketAppeal');
  return withTicketProcessingLock_(function(){return input&&input.decision?ticketSaveAppealDecision_(input):savePublishedTicketAppeal_(input);});
}
function savePublishedTicketAppeal_(input,sourceRecord) {
    const context = openTicketProcessingContext_();
    const row = Number(input && input.sheetRow);
    if (!Number.isInteger(row) || row < 2 || row > context.websiteSheet.getLastRow()) throw new Error('Choose a valid published ticket.');
    const currentValues = context.websiteSheet.getRange(row, 18, 1, 15).getDisplayValues()[0].map(ticketProcessingText_);
    const identity=context.websiteSheet.getRange(row,1,1,context.websiteSheet.getMaxColumns()>=33?33:32).getDisplayValues()[0],caseId=context.websiteSheet.getMaxColumns()>=33&&context.websiteSheet.getRange('AG1').getDisplayValue()==='FAP Case ID'?identity[32]||'':'',race=identity[0],priorExtras=ticketAdditionalFor_(ticketAdditionalPenaltyRows_(context.spreadsheet),race,caseId,'Published');
    if (ticketProcessingText_(input && input.revision) !== ticketAdditionalRevision_(currentValues,priorExtras)) {
      throw new Error('This published ticket changed after you opened it. Refresh before saving.');
    }
    const update = input && input.update ? input.update : {};
    const outcome = Array.isArray(update.outcome) && update.outcome.length === 10
      ? update.outcome.map(ticketProcessingText_)
      : currentValues.slice(0, 10);
    const appeal = Array.isArray(update.appeal) && update.appeal.length === 5
      ? update.appeal.map(ticketProcessingText_)
      : currentValues.slice(10, 15);
    if(caseId){
      const sources=sourceRecord&&sourceRecord.caseId===caseId?[sourceRecord]:buildTicketRaceWorkspace_(findTicketRaceSheet_(context,race),true).tickets.filter(t=>t.caseId===caseId);
      if(sources.length!==1)throw new Error('The original appeal cannot be matched uniquely. Reopen the case before saving.');
      appeal.splice(0,5,...ticketAppealPublicFields_(appeal,sources[0]));
    }
    const extras=ticketNormaliseAdditionalPenalties_(context,update.additionalPenalties==null?priorExtras:update.additionalPenalties,outcome[0]);
    if(extras.length&&!caseId)throw new Error('This published record has no permanent case ID; keep its original fields and amend its written decision.');
    (input.explicitRecipients?[]:[[identity[3],4,5,6],[identity[5],7,8,9]]).forEach(function(part){
      const name=String(part[0]).toLowerCase(),old=priorExtras.find(p=>p.driver.toLowerCase()===name),next=extras.find(p=>p.driver.toLowerCase()===name);if(!old&&!next)return;
      const delta=Number(next?next.points:0)-Number(old?old.points:0);
      [part[1],part[2]].forEach(i=>{if(outcome[i]===currentValues[i]&&outcome[i]!==''&&Number.isFinite(Number(outcome[i])))outcome[i]=String(Number(outcome[i])+delta);});
      if(next)outcome[part[3]]=next.timePenalty;else if(outcome[part[3]]===old.timePenalty)outcome[part[3]]='';
    });
    if(priorExtras.length||extras.length)outcome[3]=ticketAdditionalEvaluation_(outcome[3],extras);
    ticketCaseHistory_(context.spreadsheet,context.websiteSheet,row,'Published decision before amendment');
    try{ticketStoreAdditionalPenalties_(context.spreadsheet,race,caseId,'Published',extras);context.websiteSheet.getRange(row, 18, 1, 15).setValues([outcome.concat(appeal).map(ticketIntakeLiteral_)]);}
    catch(error){try{ticketStoreAdditionalPenalties_(context.spreadsheet,race,caseId,'Published',priorExtras);context.websiteSheet.getRange(row,18,1,15).setValues([currentValues.map(ticketIntakeLiteral_)]);}catch(e){throw new Error('Published amendment was interrupted. Reopen the case to check retained changes.');}throw error;}
    if (input && input.hideRow === true) context.websiteSheet.hideRows(row);
    clearTicketProcessingCaches_();
    const response = buildWebsiteTicketExport_(context);
    response.message = 'Published ticket and appeal information saved.';
    response.penaltyReviewRequired=[0,1,2,6,9].some(i=>outcome[i]!==currentValues[i])||JSON.stringify(extras)!==JSON.stringify(priorExtras);
    if(response.penaltyReviewRequired)response.message+=' Licence changes are not applied yet. Open Review licence changes to apply the correction, including any points or time to remove.';
    if(typeof ticketPublicAfterSave_==='function')ticketPublicAfterSave_(context,race,response);
    return response;
}

/** The decision editor reuses the published case, history and transfer ledger.
 * No separate appeal workbook, publication step or unguarded RPC is introduced. */
function ticketAppealCanApply_(){return typeof fapRequest_==='undefined'||!fapRequest_||fapPermission_(fapRequest_.person,'licences')>=2;}
function ticketAppealOriginal_(context,ticket,loadedHistory){
  const history=context.spreadsheet.getSheetByName('Ticket History');let legacy=null;
  if(history&&history.getLastRow()>1){
    const rows=loadedHistory||history.getRange(2,1,history.getLastRow()-1,5).getDisplayValues();
    for(const r of rows){
      if(r[2]!=='Website Export')continue;
      let saved;try{saved=JSON.parse(r[4]);}catch(e){continue;}
      if(r[1]==='Appeal original decision'&&saved&&saved.caseId===ticket.caseId&&saved.race===ticket.race)return Object.assign({},saved,{recorded:true});
      if(!legacy&&r[1]==='Published decision before amendment'&&Array.isArray(saved)&&saved[0]===ticket.race&&String(saved[1])===String(ticket.ticketNumber))legacy=saved;
    }
  }
  // Older history did not capture extra recipients; never invent their baseline.
  const useLegacy=legacy&&!ticket.additionalPenalties.length&&!String(legacy[20]||'').includes('Additional driver penalties:');
  return {caseId:ticket.caseId,race:ticket.race,outcome:useLegacy?legacy.slice(17,27).map(ticketProcessingText_):ticket.outcome.slice(),additionalPenalties:ticket.additionalPenalties.slice(),label:useLegacy?'Original recorded decision':ticket.appeal[4]?'Previously saved decision':'Original decision'};
}
function ticketGameParty_(name){return /^(codies|codemasters)$/i.test(String(name||'').trim());}
function ticketAppealContext_(context,row){
  const ticket=buildWebsiteTicketExport_(context,row).tickets.find(t=>t.sheetRow===row);
  if(!ticket||!ticket.caseId)throw new Error('Choose a published case with a permanent ticket ID.');
  const round=ticketRoundForSheet_(context.spreadsheet,ticket.race);if(!round)throw new Error('Choose a registered season round.');
  const drivers=context.spreadsheet.getSheetByName('S'+round.season+' Ticket Drivers');
  const names=drivers&&drivers.getLastRow()>1?drivers.getRange(2,1,Math.min(500,drivers.getLastRow()-1),2).getDisplayValues().filter(r=>r[0]&&r[1]).map(r=>r[1]):[];
  // The game can be named on a decision without becoming a Season Entrant.
  names.push('Codies','Codemasters');
  const ledger=ticketDeliveryRows_(context.spreadsheet).filter(r=>r[0]===round.season&&r[1]===ticket.race&&r[2]===ticket.caseId);
  if(ledger.length>1)throw new Error('This ticket has duplicate transfer records. Review Apply penalties.');
  const savedOriginal=ticketAppealOriginal_(context,ticket),original=typeof driverRenameAppealNames_==='function'?driverRenameAppealNames_(context,ticket,savedOriginal):savedOriginal;
  return {ticket:ticket,original:original,drivers:Array.from(new Set(names)),penalties:context.licenceSheet.getRange(1,5,Math.min(13,context.licenceSheet.getLastRow()),2).getDisplayValues().filter(r=>r[0]&&r[1]!==''&&Number.isFinite(Number(r[1]))).map(r=>({label:r[0],points:Number(r[1])})),applied:ledger[0]&&ledger[0][5]?JSON.parse(ledger[0][5]):[],transferPending:!!(ledger[0]&&ledger[0][7]),canApply:ticketAppealCanApply_()};
}
/** Submission text belongs to the source case; preserve manually entered public
 * fields when the source has none. Never overwrite the final appeal decision. */
function ticketAppealPublicFields_(appeal,source){
  const fields=appeal.slice();if(!source)return fields;
  const description=ticketProcessingText_(source.appealDescription);
  const evidence=(source.appealEvidence||[]).map(ticketProcessingText_).filter(Boolean).join('\n');
  if(description)fields[1]=description;
  if(evidence)fields[2]=evidence;
  if(description||evidence||/^yes$/i.test(source.appealed||''))fields[0]='Yes';
  return fields;
}
function ticketAppealUpdate_(detail,decision){
  const t=detail.ticket,mode=String(decision.mode||'');
  if(!['upheld','changed','overturned'].includes(mode))throw new Error('Choose Upheld, Changed or Overturned.');
  let outcome=t.outcome.slice(),extras=[];
  if(mode==='upheld'){outcome=detail.original.outcome.slice();extras=detail.original.additionalPenalties.slice();}
  if(mode==='overturned'){[1,4,5,6,7,8,9].forEach(i=>outcome[i]='0');outcome[2]='No Further Action';}
  if(mode==='changed'){
    const rows=decision.recipients;if(!Array.isArray(rows)||!rows.length||rows.length>31)throw new Error('Choose the drivers receiving the final penalties.');
    const seen=new Set();
    const recipients=rows.map(r=>{
      const driver=ticketProcessingText_(r.driver),key=driver.toLowerCase();
      if(!driver||seen.has(key))throw new Error('Choose each punished driver once.');seen.add(key);
      const game=ticketGameParty_(driver);
      if(!game&&detail.drivers.filter(n=>n.toLowerCase()===key).length!==1)throw new Error('Choose '+driver+' from the season drivers list.');
      const p=detail.penalties.find(p=>p.label===r.penalty);if(!p)throw new Error('Choose a licence penalty for '+driver+'.');
      const seconds=ticketTimeAdjustment_(r.seconds,'time adjustment for '+driver);
      if(game&&(Number(p.points)!==0||seconds||/ban|disqual|\bdsq\b/i.test(p.label)))throw new Error(driver+' refers to the game. Use No Further Action with no time penalty; select the actual driver for a licence penalty or ban.');
      return {driver:driver,penalty:p.label,points:String(p.points),timePenalty:String(seconds)};
    });
    const p=recipients[0],time=Number(p.timePenalty);outcome[0]=p.driver;outcome[1]=p.points;outcome[2]=p.penalty+(time?(time<0?' · Remove '+Math.abs(time):' + '+time)+' seconds':'');
    [4,5,6,7,8,9].forEach(i=>outcome[i]='0');extras=recipients.slice(1);
    // Primary non-participants use the existing additional-penalties storage so
    // their time still has an explicit driver, rather than a submitter/offender slot.
    if(![t.submitter,t.offender].some(n=>n.toLowerCase()===p.driver.toLowerCase())&&Number(p.timePenalty))throw new Error('For a driver other than the two ticket participants, use Add another driver to record their time penalty.');
    recipients.forEach(p=>{[[t.submitter,4],[t.offender,7]].forEach(([name,i])=>{if(name.toLowerCase()===p.driver.toLowerCase()){outcome[i]=p.points;outcome[i+1]=p.points;outcome[i+2]=p.timePenalty;}});});
  }
  const appeal=ticketAppealPublicFields_(t.appeal,detail.source);appeal[0]=decision.appealed===false?appeal[0]:'Yes';
  appeal[3]=ticketProcessingText_(decision.reason);appeal[4]=(mode==='upheld'?'Original decision upheld':mode==='overturned'?'Original decision overturned — no further action':outcome[2])+(extras.length?' · additional driver penalties recorded':'');
  return {outcome:outcome.map(ticketProcessingText_),appeal:appeal.map(ticketProcessingText_),additionalPenalties:extras};
}
function ticketSaveAppealDecision_(input){
  if(input.applyPenalties===true&&!ticketAppealCanApply_())throw new Error('Licence editing access is required to save and apply penalties.');
  const context=openTicketProcessingContext_(),detail=ticketAppealContext_(context,Number(input.sheetRow)),t=detail.ticket;
  if(input.caseId!==t.caseId||input.raceName!==t.race)throw new Error('This case moved. Reopen it before saving.');
  const sources=buildTicketRaceWorkspace_(findTicketRaceSheet_(context,t.race),true).tickets.filter(s=>s.caseId===t.caseId);
  if(sources.length!==1)throw new Error('Original ticket cannot be matched uniquely.');
  detail.source=sources[0];
  const update=ticketAppealUpdate_(detail,input.decision);
  update.additionalPenalties=ticketNormaliseAdditionalPenalties_(context,update.additionalPenalties,update.outcome[0]);
  if(t.additionalPenalties.length||update.additionalPenalties.length)update.outcome[3]=ticketAdditionalEvaluation_(update.outcome[3],update.additionalPenalties);
  const alreadySaved=ticketAdditionalRevision_(update.outcome.concat(update.appeal),update.additionalPenalties)===t.revision;
  if(input.revision!==t.revision&&!alreadySaved)throw new Error('This published decision changed. Close and reopen it to review the latest version.');
  if(input.applyPenalties===true){
    const c=ticketDeliveryContext_(t.race),source=sources;
    const ledger=ticketDeliveryRows_(context.spreadsheet),old=ledger.find(r=>r[0]===c.round.season&&r[1]===t.race&&r[2]===t.caseId);
    const desired=ticketDeliveryContributions_(Object.assign({},t,update),source[0],c.round,c.licence);
    const interrupted=ledger.find(r=>r[0]===c.round.season&&r[7]&&(r[1]!==t.race||r[2]!==t.caseId));
    if(interrupted)throw new Error('Finish the interrupted transfer for '+interrupted[1]+' · ticket #'+interrupted[3]+' in Apply penalties first.');
    if(old&&old[7]){if(JSON.parse(old[7]).decision!==licenceRevision_(desired))throw new Error('Finish this ticket’s interrupted transfer in Apply penalties before changing the decision.');}
    else ticketDeliveryPlan_(c.licence,t.caseId,desired,old&&old[5]?JSON.parse(old[5]):[]);
  }
  if(!alreadySaved&&!detail.original.recorded){
    const log=ticketSetupTable_(context.spreadsheet,'Ticket History',['Recorded at','Action','Source tab','Source row','Original values JSON','Original formulas JSON']);
    log.getRange(log.getLastRow()+1,1,1,6).setValues([[new Date().toISOString(),'Appeal original decision','Website Export',t.sheetRow,JSON.stringify(detail.original),'']]);
  }
  const response=alreadySaved?buildWebsiteTicketExport_(context):savePublishedTicketAppeal_({sheetRow:t.sheetRow,revision:t.revision,update:update,explicitRecipients:true},detail.source);
  response.message='Appeal decision saved. Licence changes still need applying.';response.penaltyReviewRequired=true;
  if(input.applyPenalties===true){
    try{
      const c=ticketDeliveryContext_(t.race),reads=ticketDeliveryReads_(c.ticket,c.licence),board=ticketDeliveryBoard_(c,reads,true),item=board.cases.find(p=>p.caseId===t.caseId);
      if(!item)throw new Error('The published ticket could not be found.');if(item.issue&&!item.pending)throw new Error(item.issue);
      // Reuse only this locked request's just-read validation board. The commit
      // still rereads physical destinations and retains its recovery journal.
      const transfers=applyTicketPenalties_({raceName:t.race,tickets:[{caseId:t.caseId,revision:item.revision}]},{c,reads,board}),result=transfers.cases.find(p=>p.caseId===t.caseId);
      response.transfer=transfers;response.penaltyReviewRequired=false;response.season=transfers.season;response.publicationPending=true;
      response.message='Appeal saved and licence updated.'+(result&&result.resultsNeeded&&!result.resultsChecked?' Review race finishing times and positions.':'')+(transfers.thresholdWarning?' '+transfers.thresholdWarning:'');
    }catch(e){response.transferError=e.message;response.message='Appeal saved; licence update not completed: '+e.message+' Retry Save & update licence, or open Apply penalties. No need to re-enter the decision.';}
  }
  response.decisionContext=ticketAppealContext_(context,t.sheetRow);return response;
}
function openTicketProcessingContext_() {
  const spreadsheet = SpreadsheetApp.openById(F1XL_TICKET_PROCESSING_SOURCE.spreadsheetId);
  if(!/^TEST\b/i.test(fapWorkbookLegacyName_(spreadsheet.getName())))throw new Error('This ticket workflow is restricted to the TEST processing workbook.');
  const templateSheet = spreadsheet.getSheetByName(F1XL_TICKET_PROCESSING_SOURCE.templateSheetName);
  const outcomesSheet = spreadsheet.getSheetByName(F1XL_TICKET_PROCESSING_SOURCE.outcomesSheetName);
  const websiteSheet = spreadsheet.getSheetByName(F1XL_TICKET_PROCESSING_SOURCE.websiteSheetName);
  const licenceSheet = spreadsheet.getSheetByName(F1XL_TICKET_PROCESSING_SOURCE.licenceSheetName);
  if (!templateSheet || !outcomesSheet || !websiteSheet || !licenceSheet) {
    throw new Error('The ticket-processing workbook is missing Template, Ticket Outcomes (new), Website Export or License Copy.');
  }
  return { spreadsheet:spreadsheet, templateSheet:templateSheet, outcomesSheet:outcomesSheet, websiteSheet:websiteSheet, licenceSheet:licenceSheet };
}

function buildTicketProcessingOverview_(context,navigationOnly) {
  const raceSheets = context.spreadsheet.getSheets().map(function(sheet, index) {
    return ticketIsRaceName_(sheet.getName())
      ? { name:sheet.getName(), hidden:sheet.isSheetHidden(), ticketCount:navigationOnly===true?null:countTicketRows_(sheet), sheetOrder:index }
      : null;
  }).filter(Boolean);
  const reviewers = reviewerDefinitions_(context.templateSheet);
  return {
    ok: true,
    sourceName: context.spreadsheet.getName(),
    refreshedAt: new Date().toISOString(),
    races: raceSheets,
    stewardReviewers: reviewers.stewards,
    appealReviewers: reviewers.appeals,
    currentOutcomeRace: ticketOutcomeSourceRace_(context.outcomesSheet),
    warnings: {
      outcomeCapacity: F1XL_TICKET_PROCESSING_SOURCE.finalOutcomeRow - 1,
      externalAppealsCopyConnected: true
    }
  };
}

function buildTicketRaceWorkspace_(sheet, recordsOnly) {
  const reviewers = recordsOnly ? null : reviewerDefinitions_(sheet);
  const tickets = [];
  const batch = sheet.getRange(2,1,F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow-1,sheet.getMaxColumns()>=85?85:F1XL_TICKET_PROCESSING_SOURCE.finalTicketColumn).getDisplayValues();
  for (let row = F1XL_TICKET_PROCESSING_SOURCE.firstTicketRow; row <= F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow; row += 1) {
    // Empty division slots never enter the workspace. Avoid building ten review
    // revisions and two case revisions for a record that would be discarded.
    if (!ticketProcessingText_(batch[row-2][1])) continue;
    const record = buildTicketRaceRecord_(sheet, row, batch[row-2]);
    if (record.division) tickets.push(record);
  }
  // Licence completion already has its freshly validated round. It needs all
  // case/review revisions, but no reviewer labels or duplicate round lookup.
  if (recordsOnly) return {tickets:tickets.sort((a,b)=>Number(a.division)-Number(b.division)||Number(a.ticketNumber)-Number(b.ticketNumber))};
  return {
    ok: true,
    sheetName: sheet.getName(),
    round: ticketRoundForSheet_(sheet.getParent(),sheet.getName()),
    refreshedAt: new Date().toISOString(),
    tickets: tickets.sort((a,b)=>Number(a.division)-Number(b.division)||Number(a.ticketNumber)-Number(b.ticketNumber)),
    stewardReviewers: reviewers.stewards,
    appealReviewers: reviewers.appeals,
    options: { penalties:F1XL_REVIEW_PENALTIES, timePenalties:F1XL_REVIEW_TIME_PENALTIES }
  };
}

function buildTicketRaceRecord_(sheet, row, loadedValues) {
  const values = (loadedValues || sheet.getRange(row, 1, 1, sheet.getMaxColumns()>=85?85:F1XL_TICKET_PROCESSING_SOURCE.finalTicketColumn).getDisplayValues()[0]).map(ticketProcessingText_);
  const base = values.slice(1, 16);
  const appeal = values.slice(42, 47);
  const stewardVotes = F1XL_STEWARD_REVIEW_COLUMNS.map(function(column,index) { return buildTicketReview_(values.slice(column - 1, column + 3),values[75+index]||''); });
  const appealVotes = F1XL_APPEAL_REVIEW_COLUMNS.map(function(column,index) { return buildTicketReview_(values.slice(column - 1, column + 3),values[80+index]||''); });
  return {
    sheetRow: row,
    caseId:values[72]||'',sourceSubmissionId:values[73]||'',session:values[74]||'',
    ticketNumber: values[0],
    division: base[0],
    submitter: base[1],
    submitterTeam: base[2],
    offender: base[3],
    offenderTeam: base[4],
    description: base[5],
    evidence: base.slice(6, 10),
    defenceComments: base[10],
    defenceEvidence: base.slice(11, 15),
    appealed: appeal[0],
    appealDescription: appeal[1],
    appealEvidence: appeal.slice(2, 5),
    stewardVotes: stewardVotes,
    appealVotes: appealVotes,
    recordRevision: ticketProcessingRevision_(base.concat(appeal)),
    fullRevision: ticketProcessingRevision_(values.slice(1))
  };
}

function buildTicketReview_(values,state) {
  const cleaned = values.map(ticketProcessingText_);
  return { penalty:cleaned[0], timePenalty:cleaned[1], atFault:cleaned[2], comments:cleaned[3], state:state||'', revision:ticketProcessingRevision_(cleaned.concat(state||'')) };
}

function reviewerDefinitions_(sheet) {
  const headers = sheet.getRange(1, 1, 1, F1XL_TICKET_PROCESSING_SOURCE.finalTicketColumn).getDisplayValues()[0];
  const names = function(columns, fallback) {
    return columns.map(function(column, index) {
      const raw = ticketProcessingText_(headers[column - 1]);
      const name = raw.replace(/\s*Penalty\s*$/i, '').trim();
      return { index:index, name:name || fallback + ' ' + (index + 1), startColumn:column };
    });
  };
  return { stewards:names(F1XL_STEWARD_REVIEW_COLUMNS, 'Steward'), appeals:names(F1XL_APPEAL_REVIEW_COLUMNS, 'Appeals reviewer') };
}

/** Recover only an erased outcome link whose complete incident/evidence fields
 * still match one original case. Admin submitters need no driver profile.
 * Reads remain read-only; opening/saving outcomes persists the recovered ID.
 * Never invent IDs, replace an existing link or resolve ambiguous cases. */
function ticketOutcomeCaseLinks_(context,sourceRace,values) {
  if(!values.some(r=>r[1]&&!r[26]))return values;
  const race=sourceRace&&context.spreadsheet.getSheetByName(sourceRace);
  if(!race||race.getMaxColumns()<73)return values;
  const originals=race.getRange(2,1,49,16).getDisplayValues(),ids=race.getRange(2,73,49,1).getDisplayValues().map(r=>ticketProcessingText_(r[0]));
  const counts={};ids.filter(Boolean).forEach(id=>counts[id]=(counts[id]||0)+1);
  const used=new Set(values.map(r=>ticketProcessingText_(r[26])).filter(Boolean));
  const key=r=>JSON.stringify(r.slice(0,16).map(ticketProcessingText_));
  const matches=values.map(r=>r[1]&&!r[26]?originals.map((o,i)=>({o,id:ids[i]})).filter(x=>x.o[1]&&x.id&&counts[x.id]===1&&key(x.o)===key(r)):[]);
  const proposed={};matches.forEach(m=>{if(m.length===1)proposed[m[0].id]=(proposed[m[0].id]||0)+1;});
  return values.map((r,i)=>matches[i].length===1&&!used.has(matches[i][0].id)&&proposed[matches[i][0].id]===1?r.slice(0,26).concat(matches[i][0].id):r);
}
function ticketRestoreOutcomeCaseLinks_(context,sourceRace) {
  const range=context.outcomesSheet.getRange(2,1,49,27),before=range.getDisplayValues(),after=ticketOutcomeCaseLinks_(context,sourceRace,before);
  after.forEach((r,i)=>{if(!before[i][26]&&r[26])context.outcomesSheet.getRange(i+2,27).setValue(r[26]);});
}
function buildTicketOutcomeWorkspace_(context, sourceRace, loaded) {
  const tickets = [];
  const additional=loaded&&loaded.additional||ticketAdditionalPenaltyRows_(context.spreadsheet);
  const batch=ticketOutcomeCaseLinks_(context,sourceRace,context.outcomesSheet.getRange(2,1,F1XL_TICKET_PROCESSING_SOURCE.finalOutcomeRow-1,27).getDisplayValues());
  for (let row = 2; row <= F1XL_TICKET_PROCESSING_SOURCE.finalOutcomeRow; row += 1) {
    const record = buildTicketOutcomeRecord_(context.outcomesSheet, row,batch[row-2],ticketAdditionalFor_(additional,sourceRace,batch[row-2][26],'Outcome'));
    if (record.division) tickets.push(record);
  }
  const penaltyRows = loaded?loaded.penalties:context.licenceSheet.getRange(1, 5, Math.min(13, context.licenceSheet.getLastRow()), 2).getDisplayValues();
  const penalties = penaltyRows.filter(function(row) { return ticketProcessingText_(row[0]) !== ''; }).map(function(row) { return { label:ticketProcessingText_(row[0]), points:ticketProcessingText_(row[1]) }; });
  const driverNames=loaded?loaded.drivers:ticketOutcomeDriverNames_(context,sourceRace);
  return {
    ok: true,
    sourceRace: sourceRace || '',
    refreshedAt: new Date().toISOString(),
    tickets: tickets,
    penalties: penalties,
    drivers: Array.from(new Set(driverNames)).sort()
  };
}

function ticketOutcomeDriverNames_(context,sourceRace){
  const race=sourceRace&&context.spreadsheet.getSheetByName(sourceRace),round=race&&ticketRoundForSheet_(context.spreadsheet,sourceRace),connection=round&&ticketSeasonRecord_(context.spreadsheet,round.season);
  const source=connection?context.spreadsheet.getSheetByName(connection[4]).getRange('B2:B501'):context.licenceSheet.getRange(1,1,Math.max(1,context.licenceSheet.getLastRow()),1);
  return Array.from(new Set(source.getDisplayValues().flat().map(ticketProcessingText_).filter(v=>v&&v!=='Driver'&&!/^Division\s+\d+$/i.test(v)&&!/^#(?:REF!|N\/A|ERROR!|VALUE!)/i.test(v)))).sort();
}
function ticketOutcomeDriverValidation_(context,sourceRace,row,current,selected,restored,loadedDrivers){
  const drivers=loadedDrivers||ticketOutcomeDriverNames_(context,sourceRace);
  const allowed=t=>Array.from(new Set(drivers.concat([t.submitter,t.offender,t.driverPunished]).map(ticketProcessingText_).filter(Boolean))).sort();
  const rule=names=>SpreadsheetApp.newDataValidation().requireValueInList(names.length?names:[''],true).setAllowInvalid(false).build();
  if(row){
    const names=allowed(current),value=ticketProcessingText_(selected);
    if(value&&!names.includes(value))throw new Error('Choose a driver from this season or this ticket. Reopen the outcome if the roster has changed.');
    context.outcomesSheet.getRange(row,17).setDataValidation(rule(names));return;
  }
  const rows=context.outcomesSheet.getRange('C2:Q50').getDisplayValues();
  context.outcomesSheet.getRange('Q2:Q50').setDataValidations(rows.map((r,i)=>{const saved=(restored||[]).find(t=>t.row===i+2);return [rule(allowed({submitter:r[0],offender:r[2],driverPunished:saved?saved.values[0]:r[14]}))];}));
}

function buildTicketOutcomeRecord_(sheet, row, loadedValues, loadedExtras) {
  const values = (loadedValues||sheet.getRange(row, 1, 1, 27).getDisplayValues()[0]).map(ticketProcessingText_);
  const extras=loadedExtras||ticketAdditionalFor_(ticketAdditionalPenaltyRows_(sheet.getParent()),ticketOutcomeSourceRace_(sheet),values[26],'Outcome');
  return {
    sheetRow: row, caseId:values[26]||'',
    ticketNumber: values[0], division:values[1], submitter:values[2], submitterTeam:values[3], offender:values[4], offenderTeam:values[5],
    description:values[6], evidence:values.slice(7, 11), defenceComments:values[11], defenceEvidence:values.slice(12, 16),
    driverPunished:values[16], points:values[17], penalty:values[18], evaluation:values[19],
    submitterOutcome:values[20], submitterPoints:values[21], submitterPenalty:values[22],
    offenderOutcome:values[23], offenderPoints:values[24], offenderPenalty:values[25],
    additionalPenalties:extras,revision:ticketAdditionalRevision_(values,extras)
  };
}

function buildWebsiteTicketExport_(context, onlyRow) {
  const lastRow = context.websiteSheet.getLastRow();
  const single=onlyRow!==undefined;
  if(single&&(!Number.isInteger(onlyRow)||onlyRow<2||onlyRow>lastRow))return {tickets:[]};
  const first=single?onlyRow:2,height=single?1:Math.max(0,lastRow-1);
  const hasCaseIds=context.websiteSheet.getMaxColumns()>=33&&context.websiteSheet.getRange('AG1').getDisplayValue()==='FAP Case ID';
  const values = height ? context.websiteSheet.getRange(first, 1, height, context.websiteSheet.getMaxColumns()>=33?33:32).getDisplayValues() : [];
  const additional=ticketAdditionalPenaltyRows_(context.spreadsheet);
  const tickets = values.map(function(row, index) {
    const cleaned = row.map(ticketProcessingText_);
    const extras=ticketAdditionalFor_(additional,cleaned[0],hasCaseIds?cleaned[32]:'','Published');
    return {
      sheetRow:index + first, race:cleaned[0], ticketNumber:cleaned[1], division:cleaned[2], submitter:cleaned[3], submitterTeam:cleaned[4], offender:cleaned[5], offenderTeam:cleaned[6],
      description:cleaned[7], evidence:cleaned.slice(8, 12), defenceComments:cleaned[12], defenceEvidence:cleaned.slice(13, 17),
      caseId:hasCaseIds?cleaned[32]||'':'',additionalPenalties:extras,outcome:cleaned.slice(17, 27), appeal:cleaned.slice(27, 32), revision:ticketAdditionalRevision_(cleaned.slice(17, 32),extras)
    };
  }).filter(function(ticket) { return ticket.race && ticket.ticketNumber; });
  // Appeal windows freshly read the selected row. Full export callers retain
  // their complete list, guide and race metadata with the same serializer.
  if(single)return {tickets:tickets};
  return { ok:true, refreshedAt:new Date().toISOString(), tickets:tickets,penalties:context.licenceSheet.getRange(1,5,Math.min(13,context.licenceSheet.getLastRow()),1).getDisplayValues().flat().filter(Boolean), races:Array.from(new Set(tickets.map(function(ticket) { return ticket.race; }))).reverse() };
}

function normaliseTicketRaceRecord_(record) {
  const value = record && typeof record === 'object' ? record : {};
  const base = [value.division, value.submitter, value.submitterTeam, value.offender, value.offenderTeam, value.description]
    .concat(Array.isArray(value.evidence) ? value.evidence.slice(0, 4) : [])
    .concat([value.defenceComments])
    .concat(Array.isArray(value.defenceEvidence) ? value.defenceEvidence.slice(0, 4) : []);
  while (base.length < 15) base.push('');
  const appealEvidence = Array.isArray(value.appealEvidence) ? value.appealEvidence.slice(0, 3) : [];
  const appeal = [value.appealed, value.appealDescription].concat(appealEvidence);
  while (appeal.length < 5) appeal.push('');
  const cleanedBase = base.map(ticketProcessingText_);
  if (!cleanedBase[0]) throw new Error('Division is required for a ticket.');
  if (!cleanedBase[1]) throw new Error('Submitter is required for a ticket.');
  const sessionNames = {race:'Race',featurerace:'Race',qualifying:'Qualifying',quali:'Qualifying',sprint:'Sprint',sprintrace:'Sprint',sprintqualifying:'Sprint qualifying',sprintquali:'Sprint qualifying'};
  const rawSession = ticketProcessingText_(value.session);
  const sessionKey = rawSession.toLowerCase().replace(/[^a-z]/g, '');
  if (rawSession && !sessionNames[sessionKey]) throw new Error('Session must be Race, Qualifying, Sprint or Sprint qualifying.');
  return { base:cleanedBase, appeal:appeal.map(ticketProcessingText_), session:sessionNames[sessionKey] || '' };
}

function normaliseTicketProcessingRow_(value) {
  const row = Number(value);
  if (!Number.isInteger(row) || row < F1XL_TICKET_PROCESSING_SOURCE.firstTicketRow || row > F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow) {
    throw new Error('Choose a valid ticket row.');
  }
  return row;
}

function findTicketRaceSheet_(context, sheetName) {
  const name = ticketProcessingText_(sheetName);
  if (!ticketIsRaceName_(name)) throw new Error('Choose a valid season race tab.');
  const sheet = context.spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error(name + ' could not be found.');
  return sheet;
}

function countTicketRows_(sheet) {
  return sheet.getRange(F1XL_TICKET_PROCESSING_SOURCE.firstTicketRow, 2, F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow - 1, 1)
    .getDisplayValues().filter(function(row) { return ticketProcessingText_(row[0]) !== ''; }).length;
}

function firstEmptyTicketProcessingRow_(sheet) {
  const divisions = sheet.getRange(F1XL_TICKET_PROCESSING_SOURCE.firstTicketRow, 2, F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow - 1, 1).getDisplayValues();
  for (let index = 0; index < divisions.length; index += 1) {
    if (!ticketProcessingText_(divisions[index][0])) return index + F1XL_TICKET_PROCESSING_SOURCE.firstTicketRow;
  }
  throw new Error('The race tab has no empty ticket rows remaining.');
}

function ticketOutcomeSourceRace_(sheet) {
  const formula = sheet.getRange('B2').getFormula();
  const direct=formula.match(/^=ARRAYFORMULA\('((?:[^']|'')+)'!B2:P(?:30|50)\)$/i);if(direct)return direct[1].replace(/''/g,"'");
  const match = formula.match(/"'?(S\d+\s+[^'"!]+)'?!B2:P(?:30|50)"/i);
  return match ? match[1].trim() : '';
}

function ticketRaceCacheKey_(sheetName) {
  return F1XL_TICKET_PROCESSING_SOURCE.raceCachePrefix + sheetName.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
}

function clearTicketProcessingCaches_(raceName) {
  const cache = CacheService.getScriptCache();
  cache.remove(F1XL_TICKET_PROCESSING_SOURCE.overviewCacheKey);
  cache.remove(F1XL_TICKET_PROCESSING_SOURCE.exportCacheKey);
  if (raceName) cache.remove(ticketRaceCacheKey_(raceName));
}

function withTicketProcessingLock_(work) {
  const lock = LockService.getScriptLock();
  const measure=typeof fapPerformancePhase_==='function'?fapPerformancePhase_:function(name,fn){return fn();};
  measure('lock.wait',()=>lock.waitLock(30000));
  try { return measure('lock.held',work); } finally { lock.releaseLock(); }
}

function ticketProcessingRevision_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value));
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function ticketProcessingText_(value) {
  return String(value == null ? '' : value).trim();
}

// Workbook maintenance stays behind the weekly page. These helpers never open live sources.
function ticketIsRaceName_(name){return /^S\d+\s+.+/i.test(name)&&!/^S\d+ Ticket (Drivers|Licences|Calendar)$/i.test(name);}
function ticketInitialPhase_(name,work){return typeof fapPerformancePhase_==='function'?fapPerformancePhase_(name,work):work();}
function getTicketProcessingInitial(input){ fapAssertEntry_('getTicketProcessingInitial');
  const force=!!(input&&input.forceRefresh),navigationOnly=input?.navigationOnly===true&&!force;
  const context=navigationOnly?ticketInitialPhase_('tickets.open.context',()=>openTicketProcessingContext_()):null;
  const overview=ticketInitialPhase_('tickets.open.overview',()=>navigationOnly?buildTicketProcessingOverview_(context,true):getTicketProcessingOverview(force));
  let season=String(input&&input.season||'');
  if(!season){const active=getResultsEntryInitial(false).seasons;season=active.length?String(active[0].season):'';}
  return {overview:overview,setup:season?ticketInitialPhase_('tickets.open.setup',()=>navigationOnly?ticketSeasonNavigation_(season,context.spreadsheet):getTicketSeasonSetupCached_({season:season,forceRefresh:force})):null,publicFeed:season&&typeof ticketPublicState_==='function'?ticketPublicState_(season):{},season:season};
}
function ticketOutcomeCaseKey_(t){return t.caseId||ticketProcessingRevision_([t.ticketNumber,t.division,t.submitter,t.submitterTeam,t.offender,t.offenderTeam]);}
function ticketRememberOutcomes_(context){
  const name=ticketOutcomeSourceRace_(context.outcomesSheet),race=context.spreadsheet.getSheetByName(name);
  if(!race||context.outcomesSheet.getRange('AB1').getValue()==='FAP Preparing')return;
  const snapshotName='Saved outcomes '+race.getSheetId();
  let snapshot=context.spreadsheet.getSheetByName(snapshotName);
  if(!snapshot){context.outcomesSheet.copyTo(context.spreadsheet).setName(snapshotName).hideSheet();return;}
  const range=context.outcomesSheet.getRange('A1:AA50'),values=range.getValues(),formulas=range.getFormulas();
  snapshot.getRange('A1:AA50').setValues(values.map((r,i)=>r.map((v,j)=>formulas[i][j]||ticketIntakeLiteral_(v))));
}
function ticketSavedDecisions_(snapshot,race){
  const cases=buildTicketRaceWorkspace_(race).tickets,rows=snapshot.getRange('A2:AA50').getDisplayValues(),seen={};
  return rows.filter(r=>[16,18,19,22,25].some(i=>r[i])).map(r=>{
    const key=r[26]||ticketProcessingRevision_([r[0],r[1],r[2],r[3],r[4],r[5]]);
    const matches=cases.filter(c=>(r[26]?ticketOutcomeCaseKey_(c):ticketProcessingRevision_([c.ticketNumber,c.division,c.submitter,c.submitterTeam,c.offender,c.offenderTeam]))===key);
    if(matches.length!==1||seen[key])throw new Error('Saved outcomes include a changed or missing case. Review '+snapshot.getName()+' before resuming; no saved decision has been replaced.');
    seen[key]=true;return {row:matches[0].sheetRow,values:[r[16],r[18],r[19],r[22],r[25]]};
  });
}
function getTicketRoundOutcomes(input){ fapAssertEntry_('getTicketRoundOutcomes');
  const c=openTicketProcessingContext_(),race=findTicketRaceSheet_(c,input.sheetName);
  if(ticketOutcomeSourceRace_(c.outcomesSheet)===race.getName()&&c.outcomesSheet.getRange('AB1').getValue()!=='FAP Preparing')return buildTicketOutcomeWorkspace_(c,race.getName());
  const saved=c.spreadsheet.getSheetByName('Saved outcomes '+race.getSheetId());
  return {sourceRace:race.getName(),needsOpen:true,saved:!!saved,tickets:[]};
}

function ticketReviewSheetHints_(sheet){
  const names=reviewerDefinitions_(sheet);
  const expected=names.stewards.map(r=>r.name+' · steward state').concat(names.appeals.map(r=>r.name+' · appeal state'));
  if(JSON.stringify(sheet.getRange(1,76,1,10).getDisplayValues()[0])===JSON.stringify(expected))return;
  [F1XL_STEWARD_REVIEW_COLUMNS,F1XL_APPEAL_REVIEW_COLUMNS].forEach((columns,group)=>columns.forEach((column,i)=>{
    const stateColumn=(group?81:76)+i,reviewer=(group?names.appeals:names.stewards)[i].name;
    sheet.getRange(1,stateColumn).setValue(reviewer+' · '+(group?'appeal':'steward')+' state').setNote('Draft = unfinished; Submitted = decision and reasoning complete; Recused = not voting, with reason in Comments. Editable here without the FAP.');
    sheet.getRange(1,column).setNote('After completing this review, set '+ticketColumn_(stateColumn)+' on the same row to Submitted. For an own-team conflict, explain it in Comments and select Recused. Drafts remain unfinished.');
  }));
}

function ticketReviewerSettings_(sheet) {
  const names=reviewerDefinitions_(sheet),isTemplate=sheet.getName()==='Template';
  const rows=isTemplate?[]:sheet.getRange(2,1,49,sheet.getMaxColumns()>=85?85:72).getDisplayValues();
  const groups=[F1XL_STEWARD_REVIEW_COLUMNS,F1XL_APPEAL_REVIEW_COLUMNS];
  const used=groups.map(function(columns,group){return columns.map(function(column,index){return rows.some(function(row){return row.slice(column-1,column+3).some(Boolean)||['Submitted','Recused'].includes(row[(group?80:75)+index]);});});});
  return {sheetName:sheet.getName(),stewards:names.stewards.map(r=>r.name),appeals:names.appeals.map(r=>r.name),used:used,revision:ticketProcessingRevision_([names,used])};
}
const F1XL_ADDITIONAL_PENALTIES='Ticket Additional Penalties';
const F1XL_ADDITIONAL_HEADERS=['Race','Case ID','Driver','Licence penalty','Points','Time penalty','Stage'];
function ticketAdditionalSheet_(book,create){
  let sheet=book.getSheetByName(F1XL_ADDITIONAL_PENALTIES);
  if(!sheet&&create){sheet=book.insertSheet(F1XL_ADDITIONAL_PENALTIES);sheet.getRange('A1:G1').setValues([F1XL_ADDITIONAL_HEADERS]);sheet.setFrozenRows(1);sheet.getRange('A1').setNote('Extra penalty recipients on the same incident. Keep the primary recipient in Ticket Outcomes (new). Use the race tab name and permanent Case ID from BU. Each extra driver has their own licence penalty, numeric points and time penalty. Stage Outcome is the working decision; Published is its publication snapshot. Update both the label and Points when editing here. Never duplicate a driver within one case/stage.');}
  if(sheet&&JSON.stringify(sheet.getRange('A1:G1').getDisplayValues()[0])!==JSON.stringify(F1XL_ADDITIONAL_HEADERS))throw new Error('Ticket Additional Penalties has unexpected headers. Check its seven columns before continuing.');
  return sheet;
}
function ticketAdditionalPenaltyRows_(book){const s=ticketAdditionalSheet_(book,false);return s&&s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,7).getDisplayValues().filter(r=>r.some(Boolean)):[];}
function ticketAdditionalFor_(rows,race,caseId,stage){return caseId?rows.filter(r=>r[0]===race&&r[1]===caseId&&r[6]===stage).map(r=>({driver:r[2],penalty:r[3],points:r[4],timePenalty:r[5]})):[];}
function ticketAdditionalRevision_(values,extras){return ticketProcessingRevision_(extras.length?values.concat([extras]):values);}
function ticketNormaliseAdditionalPenalties_(context,items,primary,loadedPenalties){
  if(!Array.isArray(items)||items.length>30)throw new Error('Use up to 30 additional penalty recipients.');
  if(!items.length)return [];
  const penalties=loadedPenalties||context.licenceSheet.getRange(1,5,Math.min(13,context.licenceSheet.getLastRow()),2).getDisplayValues();
  const seen=new Set([ticketProcessingText_(primary).toLowerCase()].filter(Boolean));
  return items.map(function(item){const driver=ticketProcessingText_(item.driver),penalty=ticketProcessingText_(item.penalty),time=ticketProcessingText_(item.timePenalty);
    if(!driver)throw new Error('Choose a driver for every additional penalty.');
    if(seen.has(driver.toLowerCase()))throw new Error(driver+' already has a penalty row on this ticket.');seen.add(driver.toLowerCase());
    const matches=penalties.filter(r=>r[0]===penalty);if(matches.length!==1||matches[0][1]===''||!Number.isFinite(Number(matches[0][1])))throw new Error('Choose a valid licence penalty for '+driver+'.');
    return {driver:driver,penalty:penalty,points:String(Number(matches[0][1])),timePenalty:time};
  });
}
function ticketStoreAdditionalPenalties_(book,race,caseId,stage,items){
  if(!caseId){if(items.length)throw new Error('A permanent case ID is required for additional penalties.');return;}
  const old=ticketAdditionalPenaltyRows_(book),keep=old.filter(r=>!(r[0]===race&&r[1]===caseId&&r[6]===stage)),added=items.map(p=>[race,caseId,p.driver,p.penalty,p.points,p.timePenalty,stage]);
  const next=keep.concat(added);if(JSON.stringify(next)===JSON.stringify(old))return;
  const s=ticketAdditionalSheet_(book,true),prior=old.filter(r=>r[0]===race&&r[1]===caseId&&r[6]===stage),log=book.getSheetByName(F1XL_TICKET_SEASONS.log);
  if(prior.length&&log)log.getRange(log.getLastRow()+1,1,1,12).setValues([['PENALTIES-'+Utilities.getUuid(),race,caseId,'Previous '+stage+' additional penalties',new Date().toISOString(),'','','','','',JSON.stringify(prior),'Preserved']]);
  const size=Math.max(old.length,next.length);if(size){while(next.length<size)next.push(Array(7).fill(''));if(s.getMaxRows()<size+1)s.insertRowsAfter(s.getMaxRows(),size+1-s.getMaxRows());s.getRange(2,1,size,7).setValues(next.map(r=>r.map((v,i)=>i===4&&v!==''&&Number.isFinite(Number(v))?Number(v):ticketIntakeLiteral_(v))));}
}
function ticketAdditionalEvaluation_(evaluation,extras){const marker='\n\nAdditional driver penalties:\n',base=String(evaluation||'').split(marker)[0];return base+(extras.length?marker+extras.map(p=>p.driver+': '+p.penalty+' ('+p.points+' licence points)'+(p.timePenalty?' · '+p.timePenalty:'')).join('\n'):'');}
function prepareTicketReviewRound(input){ fapAssertEntry_('prepareTicketReviewRound');
  return withTicketProcessingLock_(function(){const context=openTicketProcessingContext_(),sheet=findTicketRaceSheet_(context,input.sheetName);ticketNumberByDivision_(context,sheet);ticketReviewUsageGuide_(context.spreadsheet);clearTicketProcessingCaches_(sheet.getName());return buildTicketRaceWorkspace_(sheet);});
}
function ticketNumberByDivision_(context,sheet){
  const round=ticketRoundForSheet_(context.spreadsheet,sheet.getName());if(!round)return;
  const rows=sheet.getRange(2,1,49,2).getDisplayValues(),cases=rows.map((r,i)=>({row:i,number:r[0],division:r[1]})).filter(r=>r.division);
  const published=context.websiteSheet.getLastRow()>1&&context.websiteSheet.getRange(2,1,context.websiteSheet.getLastRow()-1,2).getDisplayValues().filter(r=>r[0]===sheet.getName())||[];
  const locked=!!round.publishedAt||published.length>0;
  let maximum=Math.max(0,...cases.map(r=>Number(r.number)||0),...published.map(r=>Number(r[1])||0));
  const numbers=rows.map(r=>[r[1]?r[0]:'']);
  cases.sort((a,b)=>Number(a.division)-Number(b.division)||a.row-b.row).forEach((r,i)=>{numbers[r.row]=[locked?(r.number||String(++maximum)):String(i+1)];});
  if(JSON.stringify(numbers)!==JSON.stringify(rows.map(r=>[r[0]])))sheet.getRange('A2:A50').setValues(numbers);
  sheet.getRange('A1').setNote('Ticket numbers follow division order until publication. After publication numbers stay fixed; late cases are appended. Case IDs in BU never change.');
}
function saveTicketConflicts(input){ fapAssertEntry_('saveTicketConflicts');
  const team=ticketProcessingText_(input.team);if(!team)throw new Error('Choose the steward’s team.');
  if(!Array.isArray(input.tickets)||!input.tickets.length)throw new Error('Select the affected tickets.');
  return saveTicketReviews({sheetName:input.sheetName,reviews:input.tickets.map(t=>({sheetRow:t.sheetRow,caseId:t.caseId,recordRevision:t.recordRevision,revision:t.revision,reviewerName:input.reviewerName,reviewerIndex:input.reviewerIndex,reviewType:input.reviewType==='appeal'?'appeal':'steward',teamConflictTeam:team,replaceExisting:input.replaceExisting===true,review:{penalty:'',timePenalty:'',atFault:'',comments:'Own-team conflict — '+team+'.',state:'Recused'}}))});
}
function getTicketReviewers(input) { fapAssertEntry_('getTicketReviewers');
  const context=openTicketProcessingContext_(),sheet=input&&input.sheetName?findTicketRaceSheet_(context,input.sheetName):context.templateSheet;
  return ticketReviewerSettings_(sheet);
}
function saveTicketReviewers(input) { fapAssertEntry_('saveTicketReviewers');
  return withTicketProcessingLock_(function(){
    const context=openTicketProcessingContext_(),sheet=input.sheetName?findTicketRaceSheet_(context,input.sheetName):context.templateSheet,current=ticketReviewerSettings_(sheet);
    if(input.revision!==current.revision)throw new Error('Reviewer names or judgements changed. Reopen Stewards before saving.');
    const groups=['stewards','appeals'],columns=[F1XL_STEWARD_REVIEW_COLUMNS,F1XL_APPEAL_REVIEW_COLUMNS];
    const desired=groups.map(function(key,group){
      const values=Array.isArray(input[key])?input[key].map(ticketProcessingText_):[];
      if(values.length!==5||values.some(v=>!v||v.length>80||/^[=+@-]/.test(v)))throw new Error('Enter five names for each team, using up to 80 characters per name.');
      if(new Set(values.map(v=>v.toLowerCase())).size!==5)throw new Error('Use distinct names within each review team.');
      values.forEach(function(value,index){if(current.used[group][index]&&value!==current[key][index])throw new Error(current[key][index]+' already has saved judgements in this round. Change the future-round template instead.');});
      return values;
    });
    const cells=columns.flat().map(col=>sheet.getRange(1,col)),before=cells.map(cell=>cell.getValue());
    try{desired.flat().forEach((name,i)=>cells[i].setValue(name+' Penalty'));if(sheet.getName()!=='Template'&&sheet.getMaxColumns()>=85)ticketReviewSheetHints_(sheet);}
    catch(error){before.forEach((value,i)=>cells[i].setValue(value));if(sheet.getName()!=='Template'&&sheet.getMaxColumns()>=85)ticketReviewSheetHints_(sheet);throw error;}
    clearTicketProcessingCaches_(sheet.getName());return ticketReviewerSettings_(sheet);
  });
}
