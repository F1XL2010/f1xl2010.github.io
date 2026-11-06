/** Shared workbook presentation. No permissions, scoring, penalties or data migration.
 * Creators call these once; TT uses sheet metadata to avoid restyling on each save. */
const F1XL_SHEET_PRESENTATION = Object.freeze({version:'1',input:'#f0f7f1',calculated:'#edf0f2',excluded:'#fff4d6',metadata:'F1XL_TT_PRESENTATION'});
function sheetPresentationSafely_(work) {
  try { work(); } catch(error) { console.warn('Sheet presentation: '+error.message); }
}
function sheetPresentationWidths_(sheet,widths) { widths.forEach((width,i)=>sheet.setColumnWidth(i+1,width)); }
function sheetPresentationHeader_(sheet,row,columns) {
  sheet.getRange(row,1,1,columns).setWrap(true).setFontSize(10).setFontWeight('bold').setVerticalAlignment('middle');sheet.setRowHeight(row,44);
}
function sheetPresentationFilter_(sheet,columns) {
  const old=sheet.getFilter(),criteria={};
  if(old){const range=old.getRange();if(range.getRow()===1&&range.getColumn()===1&&range.getNumRows()===sheet.getMaxRows()&&range.getNumColumns()===columns)return;
    for(let c=range.getColumn();c<=range.getLastColumn();c++){const criterion=old.getColumnFilterCriteria(c);if(criterion)criteria[c]=criterion;}old.remove();}
  const filter=sheet.getRange(1,1,sheet.getMaxRows(),columns).createFilter();
  Object.keys(criteria).forEach(c=>{if(Number(c)<=columns)filter.setColumnFilterCriteria(Number(c),criteria[c]);});
}
function sheetPresentationTable_(sheet,widths,frozen) {
  if(!sheet)return;sheet.getRange(1,1,Math.max(2,sheet.getLastRow()),widths.length).setFontSize(10).setVerticalAlignment('middle');
  sheetPresentationWidths_(sheet,widths);sheetPresentationHeader_(sheet,1,widths.length);sheet.setFrozenRows(1);sheet.setFrozenColumns(frozen);sheetPresentationFilter_(sheet,widths.length);
}
function sheetPresentationLink_(sheet,cell,target,label) {
  if(target)sheet.getRange(cell).setFormula('=HYPERLINK("#gid='+target.getSheetId()+'","'+label.replace(/"/g,'""')+'")');
  else sheet.getRange(cell).setValue(label);
}
function sheetPresentationOrder_(book,names) {
  const active=book.getActiveSheet();let index=1;
  names.forEach(name=>{const sheet=book.getSheetByName(name);if(sheet&&!sheet.isSheetHidden()){book.setActiveSheet(sheet);book.moveActiveSheet(index++);}});if(active)book.setActiveSheet(active);
}
function sheetPresentationMasterIndex_(book) {
  const guide=book.getSheetByName('Start Here');if(!guide)return;
  const index=[['Calendar','Race dates, tracks and cancellations.'],['Division Line-ups','Current team seats and reserves. Enter weekly results in each division workbook.'],['Applications Tracker','Applications and responses. Use Time Trial Queue for bookings and TT Results for laps.'],['Teams & Principals','Team and principal setup. Driver Movements records confirmed changes.'],['Summary','Licence summary. Division tabs hold round points/time; Outstanding Bans and Time Penalty Carryovers record penalties to serve.'],['Overall Standings','Season standings and Weekly Totals. Calculated outputs: preserve formulas.']];
  index.forEach((row,i)=>{sheetPresentationLink_(guide,'A'+(i+10),book.getSheetByName(row[0]),row[0]==='Summary'?'Licence summary':row[0]);guide.getRange(i+10,2).setValue(row[1]);});
  guide.getRange('A10:B19').setWrap(true).setVerticalAlignment('middle').setFontSize(11);guide.setColumnWidth(2,620);guide.setRowHeights(10,10,48);
}
function sheetPresentationMaster_(book,setup) {
  const guide=book.getSheetByName('Start Here'),test=/^TEST\s*-/i.test(fapWorkbookLegacyName_(book.getName()));
  guide.getRange('B7').setValue(test?'TEST — season workbook; separate from LIVE':'Season workbook');
  sheetPresentationMasterIndex_(book);
  guide.getRange('A17:B19').setValues([['Environment',test?'This workbook belongs to the TEST environment. The LIVE season is separate.':'Use this workbook for the connected season.'],['Working in Sheets','Google Sheets saves edits automatically. Pale green indicates entry cells; grey indicates calculated fields. Preserve formulas and permanent IDs.'],['Website updates','Ticket decisions use the ticket workbook’s Website Export. Use the existing website update tools for manual results/licence changes until automatic manual-edit publishing has been verified.']]);
  if(typeof F1XL_TICKET_PROCESSING_SOURCE!=='undefined'&&F1XL_TICKET_PROCESSING_SOURCE.spreadsheetId){guide.getRange('A20').setFormula('=HYPERLINK("https://docs.google.com/spreadsheets/d/'+F1XL_TICKET_PROCESSING_SOURCE.spreadsheetId+'/edit","Ticket decisions")');guide.getRange('B20').setValue('Separate ticket workbook: reviews, outcomes, appeals and Website Export.').setWrap(true).setFontSize(11);guide.setRowHeight(20,42);}
  const count=Number(setup.divisions)||0;
  book.getSheets().filter(sheet=>/^Division \d+$/.test(sheet.getName())).forEach(sheet=>sheetPresentationLicence_(sheet));
  const summary=book.getSheetByName('Summary');if(summary){summary.getDataRange().setFontSize(10).setVerticalAlignment('middle');summary.setFrozenRows(2);summary.setRowHeights(1,Math.max(2,summary.getLastRow()),27);}
  sheetPresentationBans_(book.getSheetByName('Outstanding Bans'));
  ['Overall Standings Data','Weekly Totals Data'].forEach(name=>{const sheet=book.getSheetByName(name);if(sheet&&!sheet.isSheetHidden())sheet.hideSheet();});
  sheetPresentationMasterOrder_(book,count);
}
function sheetPresentationMasterOrder_(book,count) {
  sheetPresentationOrder_(book,['Start Here','Calendar','Division Line-ups','Season Entrants','Teams & Principals','Summary'].concat(Array.from({length:count},(_,i)=>'Division '+(i+1)),['Outstanding Bans','Time Penalty Carryovers','Driver Movements','Applications Tracker','Time Trial Queue','TT Results','Overall Standings','Weekly Totals']));
}
function sheetPresentationLineups_(sheet,divisions) {
  sheet.setColumnWidth(2,190);sheet.setColumnWidth(8,190);sheet.getDataRange().setFontSize(10);sheet.setFrozenRows(2);
  for(let d=0;d<divisions;d++){const first=6+d*30,last=first+F1XL_CAPACITY.raceEntries-1;sheet.getRangeList(['B'+first+':B'+last,'H'+first+':H'+last,'K'+first+':K'+last]).setBackground(F1XL_SHEET_PRESENTATION.input);}
}
function sheetPresentationLicence_(sheet,setup) {
  if(!sheet)return;const columns=Math.min(sheet.getMaxColumns(),setup?setup.lastLicenceColumn+4:110),rows=Math.max(46,sheet.getLastRow());
  sheet.getRange(1,1,rows,columns).setFontSize(10).setVerticalAlignment('middle');sheet.setFrozenRows(2);sheet.setFrozenColumns(3);
  sheetPresentationWidths_(sheet,[190,75,105]);sheet.setColumnWidths(4,columns-3,90);sheet.getRange(1,1,2,columns).setWrap(true).setFontWeight('bold');sheet.setRowHeights(1,2,38);sheet.setRowHeights(3,rows-2,27);
  if(setup)Object.keys(setup.licenceSessions).forEach((round,i)=>{const sessions=setup.licenceSessions[round];sessions.forEach(session=>sheet.getRange(3,session.pointsColumn,rows-2,2).setBackground(i%2?'#f8fbf8':'#edf6ef'));});
  else sheet.getRange(3,4,rows-2,columns-3).setBackground(F1XL_SHEET_PRESENTATION.input);
  sheet.getRange(3,2,rows-2,2).setBackground(F1XL_SHEET_PRESENTATION.calculated);sheet.getRange(3,2,rows-2,1).setNumberFormat('0');
  if(setup)sheet.getRange(3,setup.lastLicenceColumn+3,rows-2,2).setBackground(F1XL_SHEET_PRESENTATION.calculated);
}
function sheetPresentationBans_(sheet) {
  if(!sheet)return;sheetPresentationTable_(sheet,[85,190,155,190,95,165,340],2);sheet.getRange(2,7,sheet.getMaxRows()-1,1).setWrap(true);
  sheetPresentationRules_(sheet,[{formula:'=$E2="Yes"',range:'A2:G'+sheet.getMaxRows(),colour:'#eef5ed'},{formula:'=$E2="No"',range:'A2:G'+sheet.getMaxRows(),colour:'#fff3d6'}]);
}
function sheetPresentationRules_(sheet,definitions) {
  const formulas=definitions.map(d=>d.formula),rules=sheet.getConditionalFormatRules().filter(rule=>{const condition=rule.getBooleanCondition();return !condition||formulas.indexOf(String(condition.getCriteriaValues()[0]))<0;});
  definitions.forEach(d=>{let rule=SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(d.formula).setBackground(d.colour).setRanges([sheet.getRange(d.range)]);if(d.bold)rule=rule.setBold(true);rules.push(rule.build());});sheet.setConditionalFormatRules(rules);
}
function sheetPresentationIntake_(book,sheet,key) {
  if(key==='tracker'){sheetPresentationTable_(sheet,[110,110,180,180,110,95,140,95,110,260,100,85,100,110,110,145,125,175,140],4);sheet.getRangeList(['A2:B'+sheet.getMaxRows(),'I2:I'+sheet.getMaxRows()]).setFontColor('#6b7280');sheet.getRange('H1').setNote('Applied: an application has been processed into this season. Response in K is the separate returning-driver decision.');sheet.getRange('K1').setNote('Returning-driver response: Y = returning, N = not returning. Applied in H is a separate field.');}
  if(key==='trials'){sheetPresentationTable_(sheet,[110,180,115,120,115,260,110,170,150],2);sheet.getRangeList(['A2:A'+sheet.getMaxRows(),'C2:C'+sheet.getMaxRows()]).setFontColor('#6b7280');}
  if(key==='tracker'||key==='trials'){sheetPresentationMasterIndex_(book);sheetPresentationMasterOrder_(book,Number(book.getSheetByName('Start Here').getRange('B5').getValue())||0);}
}
function sheetPresentationTimeTrials_(sheet) {
  const height=sheet.getMaxRows(),stamp=F1XL_SHEET_PRESENTATION.version+':'+height,metadata=sheet.getDeveloperMetadata().filter(m=>m.getKey()===F1XL_SHEET_PRESENTATION.metadata);
  if(metadata.some(m=>m.getValue()===stamp))return;
  sheet.getRange(1,1,Math.max(4,sheet.getLastRow()),18).setFontSize(10);sheet.setFrozenRows(4);sheet.setFrozenColumns(2);sheet.setColumnWidth(1,190);sheet.setColumnWidth(2,190);sheet.setColumnWidths(3,16,88);sheetPresentationHeader_(sheet,4,18);
  // Only the generated instruction cells, never lap values or calculation formulas.
  const neighbors=sheet.getRange('B3:R3').getValues()[0];if(neighbors.some((value,i)=>value!==''&&i!==1))throw Error('TT instruction space is occupied.');
  sheet.getRange('A3').setValue('Lap entry');sheet.getRange('C3:R3').merge().setWrap(true);sheet.getRange('C3').setValue('Enter laps as SS.SSS. Lap 1 is excluded; laps 2–5 count. Set the booking to Complete in Time Trial Queue for completed rankings.');sheet.setRowHeight(3,46);
  sheet.getRangeList(['C5:G'+height,'I5:M'+height]).setBackground(F1XL_SHEET_PRESENTATION.input);sheet.getRangeList(['C5:C'+height,'I5:I'+height]).setBackground(F1XL_SHEET_PRESENTATION.excluded);sheet.getRangeList(['H5:H'+height,'N5:R'+height]).setBackground(F1XL_SHEET_PRESENTATION.calculated);
  sheet.getRange('C4').setNote('Lap 1 is excluded from the average.');sheet.getRange('I4').setNote('Lap 1 is excluded from the average.');sheet.getRangeList(['C5:O'+height,'Q5:R'+height]).setNumberFormat('0.000');
  sheetPresentationRules_(sheet,[{formula:'=AND(ISNUMBER(D5),D5=MIN($D5:$G5))',range:'D5:G'+height,colour:'#cfe7b7',bold:true},{formula:'=AND(ISNUMBER(J5),J5=MIN($J5:$M5))',range:'J5:M'+height,colour:'#cfe7b7',bold:true}]);
  metadata.forEach(m=>m.remove());sheet.addDeveloperMetadata(F1XL_SHEET_PRESENTATION.metadata,stamp);
}
function sheetPresentationRegister_(sheet) {
  if(sheet.getName()==='Driver Movements'){sheetPresentationTable_(sheet,[115,210,115,180,90,85,120,145,85,90,85,120,145,85,110,300,300,180],4);sheet.getRangeList(['A2:A'+sheet.getMaxRows(),'C2:C'+sheet.getMaxRows()]).setFontColor('#6b7280');}
  else if(sheet.getName()==='Driver Assignments')sheetPresentationTable_(sheet,[110,180,150,100,110,130,180,250],2);
  else if(sheet.getName()==='Time Penalty Carryovers'){sheetPresentationTable_(sheet,[110,110,180,95,85,145,90,185,170,125,100,85,145,280,165,180,190],3);sheet.getRange('A2:B'+sheet.getMaxRows()).setFontColor('#6b7280');}
}
function sheetPresentationRound_(sheet,definition) {
  const sprint=!!definition.sprint,early=!!definition.earlySprint;
  const blocks=sprint?[[8,9,'q'],[36,37,'s'],[65,66,'q'],[93,94,'r']]:[[8,9,'q'],[36,37,'r']];
  const links=sprint?(early?[[8,'Qualifying'],[36,'Sprint race'],[93,'Feature race']]:[[8,'Sprint qualifying'],[36,'Sprint race'],[65,'Qualifying'],[93,'Feature race']]):[[8,'Qualifying'],[36,'Feature race']];
  // A7 is a schema marker. Do not relabel it. Navigation belongs in J:L.
  const values=sheet.getRange('J1:M4').getValues(),formulas=sheet.getRange('J1:M4').getFormulas();
  values.forEach((row,i)=>row.forEach((value,j)=>{if(value!==''&&!/^=HYPERLINK\("#gid=\d+&range=A\d+",/.test(formulas[i][j]))throw Error('Round navigation space is occupied: '+sheet.getName());}));
  sheet.getRange('J1:M4').breakApart().clearContent();
  links.forEach((link,i)=>{sheet.getRange(i+1,10,1,3).merge().setFontSize(11).setBackground('#e7f0e8').setFontWeight('bold');sheet.getRange(i+1,10).setFormula('=HYPERLINK("#gid='+sheet.getSheetId()+'&range=A'+link[0]+'","'+link[1]+'")');});
  sheet.setFrozenRows(3);sheet.setFrozenColumns(4);sheet.setColumnWidth(4,190);sheet.setColumnWidth(5,135);
  blocks.forEach(block=>{if(early&&block[0]===65)return;const header=block[0],first=block[1],last=first+F1XL_CAPACITY.raceEntries-1,quali=block[2]==='q';
    sheetPresentationHeader_(sheet,header,quali?9:12);sheet.getRange(first,1,F1XL_CAPACITY.raceEntries,quali?9:12).setFontSize(11).setVerticalAlignment('middle');sheet.setRowHeights(first,F1XL_CAPACITY.raceEntries,26);
    const formulas=sheet.getRange(first,3,F1XL_CAPACITY.raceEntries,5).getFormulas();sheet.getRange(first,3,F1XL_CAPACITY.raceEntries,5).setBackgrounds(formulas.map(row=>row.map(f=>f?F1XL_SHEET_PRESENTATION.calculated:F1XL_SHEET_PRESENTATION.input)));
    sheet.getRange('H'+first+':I'+last).setBackground(F1XL_SHEET_PRESENTATION.calculated);
    if(!quali){sheet.getRange('H'+first+':H'+last).setNumberFormat('0');sheet.getRange('I'+first+':I'+last).setNumberFormat(';;;');sheet.getRange((block[2]==='s'?'J':'K')+first+':L'+last).setBackground(F1XL_SHEET_PRESENTATION.calculated);if(block[2]==='r'){sheet.getRange('J'+first+':J'+last).setBackground(F1XL_SHEET_PRESENTATION.excluded);sheet.getRange('J'+header).setNote('Fastest lap: enter Y for the eligible driver.');}}
  });
}
function sheetPresentationDivisionGuide_(sheet,setup) {
  sheet.getRange('B8').setValue(/^TEST\s*-/i.test(fapWorkbookLegacyName_(sheet.getParent().getName()))?'TEST — season workbook; separate from LIVE':'Season workbook');
  sheet.getRange('A11').setValue('Click B13 below and Allow access if Google asks. This connects this division to its Season Master.').setWrap(true);sheet.setRowHeight(11,42);
  sheet.getRange('A16').setFormula('=HYPERLINK("https://docs.google.com/spreadsheets/d/'+setup.masterId+'/edit","Season Master")');sheet.getRange('B16').setValue('Roster, calendar, licences, bans and driver movements.');sheetPresentationLink_(sheet,'A17',sheet.getParent().getSheetByName('R1'),'Weekly results');sheet.getRange('B17').setValue('Choose R1, R2… for the round. Use the session links at the top right. Green = entered values; grey = calculated fields.');sheet.getRange('B18').setValue('Calculated standings and statistics: preserve formulas. Google Sheets saves entries automatically.');sheet.getRange('A16:B18').setWrap(true).setFontSize(11);sheet.setColumnWidth(2,620);sheet.setRowHeights(16,3,48);
  sheetPresentationOrder_(sheet.getParent(),['Start Here'].concat(setup.calendar.map(round=>'R'+round.round),['Driver Stats','Constructors Standings','Data','Driver Assignments']));
}
function sheetPresentationTicketRound_(sheet) {
  const cols=Math.min(85,sheet.getMaxColumns()),rows=Math.max(50,sheet.getLastRow());sheet.getRange(1,1,rows,cols).setFontSize(11).setVerticalAlignment('middle');sheetPresentationHeader_(sheet,1,cols);sheet.setFrozenRows(1);sheet.setFrozenColumns(5);
  sheetPresentationWidths_(sheet,[70,80,130,90,130,80,300,170,170,170,170,300,170,170,170,170]);sheet.getRange('C:F').setWrap(true);
  [18,23,28,33,38,49,54,59,64,69].forEach(c=>{if(c+3<=cols){sheet.setColumnWidth(c,135);sheet.setColumnWidth(c+1,85);sheet.setColumnWidth(c+2,145);sheet.setColumnWidth(c+3,260);sheet.getRange(2,c+3,rows-1,1).setWrap(true);}});
  sheet.getRangeList(['G2:G'+rows,'L2:L'+rows,'AR2:AR'+rows]).setWrap(true);
  if(cols>=85){sheet.getRange('BW1').setNote('Race, Qualifying, Sprint or Sprint qualifying.');sheet.setColumnWidth(75,150);sheet.getRange('BX1:CB1').setNote('Steward completion in the same order as the review blocks: Submitted, Recused or Draft.');sheet.getRange('CC1:CG1').setNote('Appeal completion in the same order as the review blocks: Submitted, Recused or Draft.');}
  sheetPresentationFilter_(sheet,cols);
}
function sheetPresentationTicketGuide_(sheet) {
  sheet.getRange(1,1,sheet.getLastRow(),2).setWrap(true).setFontSize(11).setVerticalAlignment('middle');sheet.setColumnWidth(1,200);sheet.setColumnWidth(2,850);if(sheet.getLastRow()>1)sheet.setRowHeights(2,sheet.getLastRow()-1,65);
}
