/** Registered rounds use repeat-safe imports. Original submissions stay in the
 * permanent workbook log and response Archive; race tabs remain editable Sheets. */
function ticketIntakeLiteral_(v){return typeof v==='string'&&v.charAt(0)==='='?"'"+v:v;}
function ticketIntakeAssertTest_(inbox){ticketSubmissionAssertSource_(inbox.spreadsheet);}
function ticketIntakeReceipt_(book,id){
  const s=book.getSheetByName(F1XL_TICKET_SEASONS.log),rows=ticketSheetRows_(s,12),found=rows.map((r,i)=>({row:i+2,values:r})).filter(x=>x.values[0]===id);
  if(found.length>1)throw new Error('Duplicate import receipts need checking in Submission Log.');return found[0]||null;
}
function ticketIntakeRows_(sheet){return sheet.getRange(2,1,F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow-1,75).getDisplayValues();}
function ticketArchiveHas_(sheet,id){
  if(sheet.getMaxColumns()>=19&&sheet.getRange('S1').getDisplayValue()==='FAP Submission ID'&&sheet.getLastRow()>1&&sheet.getRange(2,19,sheet.getLastRow()-1,1).getDisplayValues().some(r=>r[0]===id))return true;
  return ticketSheetRows_(sheet,12).some(r=>ticketProcessingRevision_(r.map(ticketSubmissionText_))===id);
}
function ticketArchiveAppend_(sheet,values,id){
  if(sheet.getMaxColumns()<19)sheet.insertColumnsAfter(sheet.getMaxColumns(),19-sheet.getMaxColumns());
  const header=sheet.getRange('S1').getDisplayValue();if(header&&header!=='FAP Submission ID')throw new Error('Archive column S is already in use. The case is retained; inspect that column before retrying.');
  sheet.getRange('S1').setValue('FAP Submission ID');
  if(values.length>12){const header=sheet.getRange('M1').getDisplayValue();if(header&&header!=='Incident session')throw Error('Archive column M is occupied. Check it before retrying.');sheet.getRange('M1').setValue('Incident session');}
  sheet.getRange(sheet.getLastRow()+1,1,1,19).setValues([values.map(ticketIntakeLiteral_).concat(Array(18-values.length).fill(''),id)]);
}
function ticketImportRegistered_(processing,sheet,input,round) {
  const id=String(input.submissionRevision||'');if(!id)throw new Error('Refresh the inbox before importing.');
  const mode=String(input.mode||'');if(!['ticket','defence','appeal'].includes(mode))throw new Error('Choose ticket, defence or appeal.');
  const log=processing.spreadsheet.getSheetByName(F1XL_TICKET_SEASONS.log),receipt=ticketIntakeReceipt_(processing.spreadsheet,id);
  if(!log)throw new Error('Prepare ticket season setup first.');
  if(receipt&&(receipt.values[1]!==sheet.getName()||receipt.values[3]!==mode))throw new Error('This submission already belongs to '+receipt.values[1]+' as '+receipt.values[3]+'. Open that case.');
  const inbox=openTicketSubmissionContext_(input);ticketIntakeAssertTest_(inbox);validateTicketArchive_(inbox);
  let sourceRow=null,sourceValues=null,display=null;
  try{sourceRow=findTicketSubmissionRow_(inbox.sourceSheet,input);display=ticketSubmissionRead_(inbox,sourceRow,true);
    if(ticketProcessingRevision_(display.map(ticketSubmissionText_))!==id)throw new Error('The submission changed. Refresh and review it again.');
    sourceValues=ticketSubmissionRead_(inbox,sourceRow,false);
  }catch(e){
    const archived=receipt&&['Copied','Archived'].includes(receipt.values[11])&&ticketArchiveHas_(inbox.archiveSheet,id);
    if(!archived)throw e;
    log.getRange(receipt.row,12).setValue('Archived');return ticketImportResponse_(sheet,'Already processed and archived.');
  }
  if(receipt&&receipt.values[11]==='Archived')return ticketImportResponse_(sheet,'Already processed and archived.');
  if(round.state==='Cancelled')throw new Error('This round is cancelled.');
  // Weekly dates are reminders only. Admins decide when to process material.
  const submission=buildTicketSubmissionRecord_(display,sourceRow),rows=ticketIntakeRows_(sheet);
  const season=ticketSeasonRecord_(processing.spreadsheet,round.season);
  if(!season||!Number.isInteger(Number(submission.division))||Number(submission.division)<1||Number(submission.division)>Number(season[2]))throw new Error('The submission division does not belong to this season. Check the original response.');
  let caseId=receipt&&receipt.values[2],targetRow=caseId?rows.findIndex(r=>r[72]===caseId)+2:0;
  if(caseId&&targetRow<2)targetRow=0;
  if(!receipt){
    if(mode==='ticket')targetRow=firstEmptyTicketProcessingRow_(sheet);
    else {targetRow=normaliseTicketProcessingRow_(input.targetRow);const current=buildTicketRaceRecord_(sheet,targetRow);
      if(!current.division)throw new Error('Choose an existing case.');
      if(Number(current.division)!==Number(submission.division))throw new Error('The submission and target ticket belong to different divisions.');
      if(submission.session&&current.session&&submission.session!==current.session)throw new Error('The submission and target ticket belong to different incident sessions. Choose the matching case.');
      if(input.targetRevision!==current.recordRevision)throw new Error('The target case changed. Refresh before attaching evidence.');
      const previous=mode==='defence'?[current.defenceComments].concat(current.defenceEvidence):[current.appealed,current.appealDescription].concat(current.appealEvidence);
      if(previous.some(Boolean)&&input.overwrite!==true)throw new Error('This case already contains '+mode+' material. Confirm replacement; the previous material will be preserved in the log.');
      // Preserve replaced material before modifying its visible compatibility fields.
      if(previous.some(Boolean))log.getRange(log.getLastRow()+1,1,1,12).setValues([['PRIOR-'+Utilities.getUuid(),sheet.getName(),rows[targetRow-2][72]||'row '+targetRow,'Previous '+mode,new Date().toISOString(),JSON.stringify(previous),'','','','',JSON.stringify(previous),'Preserved']]);
    }
    caseId=mode==='ticket'?'CASE-'+Utilities.getUuid():(rows[targetRow-2][72]||'CASE-'+Utilities.getUuid());
    sheet.getRange(targetRow,73).setValue(caseId);
    const original={sourceSheetId:inbox.sourceSheet.getSheetId(),sourceHeaders:inbox.headers,display:display,values:sourceValues,targetRow:targetRow,exceptionReason:String(input.exceptionReason||''),prior:mode==='ticket'?null:sheet.getRange(targetRow,mode==='defence'?12:43,1,5).getDisplayValues()[0]};
    const record=[id,sheet.getName(),caseId,mode,new Date().toISOString(),submission.description].concat([0,1,2,3].map(i=>submission.evidence[i]||'')).concat([JSON.stringify(original),'Pending']);
    log.getRange(log.getLastRow()+1,1,1,12).setValues([record.map(ticketIntakeLiteral_)]);
  }
  const saved=ticketIntakeReceipt_(processing.spreadsheet,id),original=JSON.parse(saved.values[10]);
  if(!targetRow)throw new Error('The saved case ID is missing from the race tab. Restore it before retrying.');
  if(saved.values[11]==='Pending'){
    if(mode==='ticket'){
      const current=sheet.getRange(targetRow,2,1,74).getDisplayValues()[0];
      if(current[0]&&current[72]!==id)throw new Error('The destination row changed. Resolve this pending import in the workbook.');
      const values=[submission.division,submission.fromDriver,submission.fromTeam,submission.againstDriver,submission.againstTeam,submission.description].concat([0,1,2,3].map(i=>submission.evidence[i]||''));
      while(values.length<71)values.push('');values.push(caseId,id,String(submission.session||input.session||'Race'));
      if(!['Race','Qualifying','Sprint','Sprint qualifying'].includes(values[73]))throw new Error('Choose a valid incident session.');
      sheet.getRange(targetRow,2,1,74).setValues([values.map(ticketIntakeLiteral_)]);
      sheet.getRange(targetRow,1).clearContent();
    }else{
      let values=mode==='defence'?[submission.description].concat([0,1,2,3].map(i=>submission.evidence[i]||'')):
        ['Yes',submission.description+(submission.evidence[3]?'\nAdditional evidence: '+submission.evidence[3]:'')].concat([0,1,2].map(i=>submission.evidence[i]||''));
      const start=mode==='defence'?12:43,current=sheet.getRange(targetRow,start,1,5).getDisplayValues()[0];
      if(JSON.stringify(current)!==JSON.stringify(original.prior)&&JSON.stringify(current)!==JSON.stringify(values))throw new Error('Attached evidence changed during processing. Review the pending submission before retrying.');
      sheet.getRange(targetRow,start,1,5).setValues([values.map(ticketIntakeLiteral_)]);
      // New material reopens the relevant reviews while preserving prior comments.
      const states=sheet.getRange(targetRow,mode==='appeal'?81:76,1,5);
      states.setValues([states.getDisplayValues()[0].map(state=>state==='Recused'?'Recused':'Draft')]);
    }
    log.getRange(saved.row,12).setValue('Copied');
  }
  // Compare complete original response, not its row position, before archiving.
  const archived=ticketArchiveHas_(inbox.archiveSheet,id);
  if(!archived)ticketArchiveAppend_(inbox.archiveSheet,sourceValues,id);
  inbox.sourceSheet.deleteRow(sourceRow);log.getRange(saved.row,12).setValue('Archived');
  CacheService.getScriptCache().remove(F1XL_TICKET_SUBMISSION_SOURCE.cacheKey);
  return ticketImportResponse_(sheet,'Processed into the case and archived. The original evidence remains in Submission Log and the response Archive.');
}
function ticketImportResponse_(sheet,message){ticketNumberByDivision_(openTicketProcessingContext_(),sheet);clearTicketProcessingCaches_(sheet.getName());const response=buildTicketRaceWorkspace_(sheet);response.message=message;return response;}
