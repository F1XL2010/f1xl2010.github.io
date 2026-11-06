/** Licence layout, non-destructive TEST repair and public snapshot checks. */
function licenceSessions_(setup) {
  const sessions=[];
  Object.keys(setup.licenceSessions).forEach(function(round){
    setup.licenceSessions[round].forEach(function(s){sessions.push({round:Number(round),label:s.label,pointsColumn:s.pointsColumn,secondsColumn:s.timeColumn});});
  });
  sessions.push({round:0,label:'Additional Penalties',pointsColumn:setup.lastLicenceColumn+1,secondsColumn:setup.lastLicenceColumn+2});
  return sessions;
}
function licenceLayoutKey_(book,division){return 'F1XL_LICENCE_CONNECTED_V1_'+book.getId()+'_D'+division;}
function licenceLayoutSignature_(setup){return licenceRevision_(licenceSessions_(setup));}
function licenceIsConnected_(book,setup){return PropertiesService.getScriptProperties().getProperty(licenceLayoutKey_(book,setup.division))===licenceLayoutSignature_(setup);}
function licenceTotals_(setup) {
  const sessions=licenceSessions_(setup),end=setup.lastLicenceColumn+3;
  const far=[],near=[];
  for(let row=3;row<=46;row++){
    far.push([0,1].map(function(offset){return '=IF($A'+row+'="","",SUM('+sessions.map(function(s){return divisionTemplateColumnLetter_(s.pointsColumn+offset)+row;}).join(',')+'))';}));
    near.push(['=IF($A'+row+'="","",'+divisionTemplateColumnLetter_(end)+row+')','=IF($A'+row+'="","",'+divisionTemplateColumnLetter_(end+1)+row+')']);
  }
  return {far:far,near:near,column:end};
}
function licenceRestoreTotals_(book,setup) {
  licenceEnsureGuide_(book);
  const sheet=book.getSheetByName('Division '+setup.division),totals=licenceTotals_(setup),summary=book.getSheetByName('Summary');
  sheet.getRange('A1').clearContent();
  sheet.getRange('B1').setValue('Totals');
  sheet.getRange(1,totals.column).setValue('Totals');
  sheet.getRange(3,totals.column,44,2).setFormulas(totals.far);
  sheet.getRange('B3:C46').setFormulas(totals.near);
  sheet.getRange('B3:B46').setNumberFormat('0.##');
  const column=1+(setup.division-1)*4;
  summary.getRange(3,column,44,3).clearContent();
  summary.getRange(3,column).setFormula("=SORT('Division "+setup.division+"'!A3:C46,2,FALSE)");
}

// Extend the existing manual guide once; retain the original rows, references
// and accumulated thresholds used by licence calculations.
function licenceEnsureGuide_(book){
  const sheet=book.getSheetByName('Penalty Guide');if(!sheet)return;
  const rows=sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),4).getDisplayValues(),text=rows.flat().join(' ').toLowerCase(),added=[];
  if(!text.includes('disqualified from race'))added.push(['DSQ','Disqualified from race',3,'pts']);
  if(!text.includes('carry-over time penalties'))added.push(['Carry-over time penalties','If the driver did not finish the penalised race, carry the time penalty once to the next race they participate in, sprint or feature. If they DNF that race too, the carried penalty expires.','','']);
  if(!text.includes('game time penalty removal'))added.push(['Game time penalty removal','An approved removal reduces the race result time. It does not add or remove licence points or count as added penalty seconds.','','']);
  if(added.length){
    // A note can occupy merged rows below the last non-empty anchor cell.
    // Append after that whole block; writes inside it silently disappear.
    const start=Math.max(sheet.getLastRow()+1,...sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),4).getMergedRanges().map(r=>r.getLastRow()+1));
    if(sheet.getMaxRows()<start+added.length-1)sheet.insertRowsAfter(sheet.getMaxRows(),start+added.length-1-sheet.getMaxRows());
    const range=sheet.getRange(start,1,added.length,4);range.setValues(added);range.setWrap(true);
  }
}
function licenceValidateLayout_(sheet,setup) {
  const sessions=licenceSessions_(setup),width=setup.lastLicenceColumn+4;
  if(sheet.getMaxColumns()<width)throw new Error(sheet.getName()+' is narrower than this season’s calendar. Check its layout before connecting.');
  const headers=sheet.getRange(1,1,2,width).getDisplayValues();
  sessions.forEach(function(s){if(headers[0][s.pointsColumn-1]!==s.label||headers[1][s.pointsColumn-1]!=='Points'||headers[1][s.secondsColumn-1]!=='Time (seconds)')throw new Error(sheet.getName()+' does not match '+s.label+'. No session columns were moved.');});
}
function licenceDriverNames_(book,names,loadedEntrants) {
  const entrants=loadedEntrants||book.getSheetByName('Season Entrants').getRange(2,1,500,2).getDisplayValues(),keys={};
  entrants.forEach(function(r){if(!r[1])return;const key=r[1].trim().toLowerCase();if(!r[0]||keys[key])throw new Error('Resolve missing or duplicate driver identities in Season Entrants.');keys[key]=r[0];});
  const used={};
  names.forEach(function(r){const name=String(r[0]||'').trim();if(!name)return;const key=name.toLowerCase();if(/^#/.test(name)||!keys[key])throw new Error('Check the permanent Season Entrants identity for '+name+' before editing licences.');if(used[key])throw new Error('Duplicate licence driver: '+name);used[key]=true;});
}
function licenceCheckTotals_(sheet,setup) {
  const rows=sheet.getRange(3,1,44,setup.lastLicenceColumn+4).getValues(),sessions=licenceSessions_(setup);
  rows.forEach(function(r){if(!r[0])return;
    [0,1].forEach(function(offset){let sum=0;sessions.forEach(function(s){const v=r[s.pointsColumn-1+offset];if(v==='')return;if(typeof v!=='number'||!Number.isFinite(v))throw new Error(sheet.getName()+' contains a non-numeric penalty for '+r[0]+'.');sum+=v;});
      if(typeof r[1+offset]!=='number'||Math.abs(r[1+offset]-sum)>0.000001)throw new Error(sheet.getName()+' totals have not recalculated correctly for '+r[0]+'. Check the licence formulas before publishing.');
    });
  });
}
function licenceBackup_(sheet,label) {
  const copy=sheet.copyTo(sheet.getParent()).setName('Licence backup '+label+' '+Date.now());
  copy.hideSheet();return copy.getName();
}
function connectActiveSeasonLicences(input) { fapAssertEntry_('connectActiveSeasonLicences');
  return withApplicationLock_(function(){
    const c=openLicenceContext_(input&&input.season),division=normaliseLicenceDivision_(input&&input.division);
    const sheet=findLicenceDivisionSheet_(c,division),setup=divisionTemplateReadMasterSetup_(c.spreadsheet,c.season,division);
    licenceValidateLayout_(sheet,setup);
    const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,division));
    if(!id)throw new Error('Division '+division+' is not connected to a workbook.');
    const target=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(target);assertSeasonWorkbookWritable_(c.season,target);
    const adapter=target.getSheetByName('Driver License');if(!adapter)throw new Error('The division Driver License tab is missing.');
    const width=setup.lastLicenceColumn+4,last=divisionTemplateColumnLetter_(width);
    const names=sheet.getRange('A3:A46').getDisplayValues(),inputs=sheet.getRange(3,4,44,setup.lastLicenceColumn-1).getValues();
    if(names.slice(40).some(function(r){return r[0];})||inputs.slice(40).some(function(r){return r.some(function(v){return v!=='';});}))throw new Error('Licence entries extend beyond the current 40-driver capacity. Extend capacity before connecting.');
    inputs.forEach(function(r,i){if(!names[i][0]&&r.some(function(v){return v!=='';}))throw new Error('A blank driver row contains penalties. Resolve its identity before connecting.');});
    const roster=target.getSheetByName('Data').getRange('A3:A46').getDisplayValues().flat().filter(Boolean);
    roster.forEach(function(name){if(names.some(function(r){return r[0].trim().toLowerCase()===name.trim().toLowerCase();}))return;const i=names.slice(0,40).findIndex(function(r){return !r[0];});if(i<0)throw new Error('The licence driver list is full.');names[i][0]=name;});
    licenceDriverNames_(c.spreadsheet,names);
    const marker=licenceLayoutKey_(c.spreadsheet,division);
    // Keep one original backup per successful migration; retries remain safe.
    const props=PropertiesService.getScriptProperties();
    if(!props.getProperty(marker+'_BACKUP')){
      const backups=[licenceBackup_(sheet,'Master D'+division),licenceBackup_(c.summarySheet,'Summary D'+division),licenceBackup_(adapter,'Import D'+division)];
      props.setProperty(marker+'_BACKUP',JSON.stringify(backups));
    }
    const oldNames=seasonPlanningValues_(sheet.getRange('A3:A46'));
    const adapterBefore=seasonPlanningValues_(adapter.getRange(3,1,44,width));
    // Imports spill. Store only their anchor formulas when restoring, not cached spill cells.
    const importAnchor=adapter.getRange('B3').getFormula(),wholeAnchor=adapter.getRange('A3').getFormula();
    try {
      sheet.getRange('A3:A46').setValues(names);
      licenceRestoreTotals_(c.spreadsheet,setup);
      adapter.getRange('A3').clearContent();adapter.getRange('B3').clearContent();SpreadsheetApp.flush();
      adapter.getRange(3,1,44,width).clearContent().clearDataValidations();
      adapter.getRange('A3').setFormula('=IMPORTRANGE("'+c.spreadsheet.getId()+'","\'Division '+division+'\'!A3:'+last+'46")');
      SpreadsheetApp.flush();
      props.setProperty(marker,licenceLayoutSignature_(setup));
    } catch(e) {
      let restored=true;
      try{sheet.getRange('A3:A46').setValues(oldNames);adapter.getRange('A3').clearContent();adapter.getRange('B3').clearContent();SpreadsheetApp.flush();adapter.getRange(3,1,44,width).clearContent();
        if(/IMPORTRANGE/i.test(wholeAnchor))adapter.getRange('A3').setFormula(wholeAnchor);
        else if(/IMPORTRANGE/i.test(importAnchor)){adapter.getRange('A3:A46').setValues(adapterBefore.map(function(r){return [r[0]];}));adapter.getRange('B3').setFormula(importAnchor);}
        else adapter.getRange(3,1,44,width).setValues(adapterBefore);
      }catch(restore){restored=false;}
      throw new Error('Licence connection stopped. '+(restored?'Original driver names and import restored; totals may already be repaired. Retry safely. ':'Inspect the retained licence backups before retrying. ')+e.message);
    }
    return {season:c.season,division:division,message:'Division '+division+' licences connected. Existing penalty entries retained.'};
  });
}
function licencePublishPayload_(book,season) {
  const count=Number(book.getSheetByName('Start Here').getRange('B5').getValue());
  const summary=Array.from({length:46},function(){return Array(count*4-1).fill('');});
  for(let d=1;d<=count;d++){
    const setup=divisionTemplateReadMasterSetup_(book,season,d);
    if(!licenceIsConnected_(book,setup))return [];
    const s=book.getSheetByName('Division '+d);licenceValidateLayout_(s,setup);
    licenceCheckTotals_(s,setup);
    // Display formatting must never round a 1.5-point warning to 2 points in
    // the public snapshot. Publish numeric cell values, not rounded labels.
    const data=s.getRange('A3:C46').getValues().map(r=>r.map(v=>String(v)));licenceDriverNames_(book,data.map(function(r){return [r[0]];}));
    if(data.some(function(r){return r[0]&&(!String(r[1]).trim()||!String(r[2]).trim()||!Number.isFinite(Number(r[1]))||!Number.isFinite(Number(r[2])));}))throw new Error('Division '+d+' licence totals are not ready. Refresh the licence screen before publishing.');
    const col=(d-1)*4;summary[0][col]='Division '+d;['Driver','Points','Seconds Added'].forEach(function(v,i){summary[1][col+i]=v;});
    data.filter(function(r){return r[0];}).sort(function(a,b){return Number(b[1])-Number(a[1]);}).forEach(function(r,i){r.forEach(function(v,j){summary[i+2][col+j]=v;});});
  }
  const bans=book.getSheetByName('Outstanding Bans');
  return [{name:'Summary',blocks:[{row:1,column:1,values:summary}]},testLaunchRead_(book,'Outstanding Bans',['A1:G'+Math.max(1,bans.getLastRow())]),testLaunchRead_(book,'Penalty Guide',['A1:D'+Math.max(1,book.getSheetByName('Penalty Guide').getLastRow())])];
}
