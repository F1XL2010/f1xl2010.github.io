/** Permanent TEST qualifying records. All writes are setup-only; result saves do not call this service. */
const F1XL_TRACK_RECORDS={registry:'1Cn6FdLGjzrFpjXPyrd0ZimC46ieXDrdkPgez1TlS3-M',summary:'Track Record Candidates',records:'Track Records',sources:'Record Sources',review:'Track Record Review'};
function trackRecordsBook_(){
  const b=SpreadsheetApp.openById(F1XL_TRACK_RECORDS.registry);
  if(fapWorkbookLegacyName_(b.getName())!=='TEST - F1XL Permanent Driver Registry')throw Error('The TEST track record registry does not match.');
  return b;
}
function trackRecordMilliseconds_(value){
  const m=String(value||'').trim().match(/^(\d{1,2})[:.]+([0-5]\d)(?:[.:]+(\d{1,3}))?$/);
  return m ? Number(m[1])*60000+Number(m[2])*1000+Number((m[3]||'').padEnd(3,'0')) : 0;
}
function trackRecordsRows_(){
  const s=trackRecordsBook_().getSheetByName(F1XL_TRACK_RECORDS.records);if(!s)throw Error('Track Records is not connected.');
  const rows=s.getRange(2,1,Math.max(1,s.getLastRow()-1),13).getDisplayValues(),seen={};
  return rows.filter(r=>r[0]&&r[1]&&r[2]&&!/^(?:-+|—|–|n\/a|0[:.]00[.:]0+)$/i.test(r[2])).map(function(r){
    const division=Number(r[0]),ms=trackRecordMilliseconds_(r[2]),key=division+'|'+r[1].trim().toLowerCase();
    if(!Number.isInteger(division)||division<1||division>8||seen[key])throw Error('Duplicate or invalid track-record division/circuit.');seen[key]=true;
    const review=r[9]!=='Accepted'||!ms;
    return {division:division,circuit:r[1],time:r[2],driver:r[3],team:r[4],date:r[5],season:r[6],session:r[7],review:review};
  });
}
function trackRecordsResponse_(){
  try{return ContentService.createTextOutput(JSON.stringify({ok:true,records:trackRecordsRows_(),refreshedAt:new Date().toISOString()})).setMimeType(ContentService.MimeType.JSON);}
  catch(e){console.error('TEST track records: '+e);return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Track records could not be loaded. Please retry.'})).setMimeType(ContentService.MimeType.JSON);}
}
/** Local formula summary; no external calls or result-save work. Each eligible session supplies its fastest classified valid lap. */
function trackRecordsSummaryFormula_(book,season,division,round,start,session){
  const end=start+23,r="'R"+round+"'!",calendarRow=round+1;
  // Keep invalid timing text visible as a warning; never use a race fastest-lap column.
  return '=LET(names,'+r+'D'+start+':D'+end+',teams,'+r+'E'+start+':E'+end+',times,'+r+'F'+start+':F'+end+',pos,'+r+'A'+start+':A'+end+',valid,ARRAYFORMULA(REGEXMATCH(TO_TEXT(times),"^[0-9]{1,2}:[0-5][0-9]\\.[0-9]{3}$")),ms,ARRAYFORMULA(IFERROR(VALUE(REGEXEXTRACT(TO_TEXT(times),"^[0-9]+"))*60000+VALUE(REGEXEXTRACT(TO_TEXT(times),":([0-9]{2})"))*1000+VALUE(RIGHT(TO_TEXT(times),3)),0)),eligible,ARRAYFORMULA((names<>"")*ISNUMBER(pos)*(pos>0)*valid*(ms>0)),best,IFERROR(MIN(FILTER(ms,eligible)),0),n,IFERROR(MATCH(best,FILTER(ms,eligible),0),1),ranked,IFERROR(FILTER({times,names,teams},eligible),{"","",""}),warnings,IF(SUM(ARRAYFORMULA((names<>"")*(times<>"")*(valid=FALSE)*(REGEXMATCH(TO_TEXT(times),"(?i)^(DNS|DNF|DSQ|DQ|DNQ|NO TIME|N/?A|[-—:.]+)$")=FALSE)))>0,"Check invalid times",IF(IFERROR(ROWS(FILTER(ms,eligible,ms=best)),0)>1,"Equal fastest laps — review","")),{'+JSON.stringify(String(season))+','+division+','+round+','+JSON.stringify(session)+',SWITCH(LOWER(\'Race Calendar\'!D'+calendarRow+'),"usa","United States","united states of america","United States","britain","Great Britain","silverstone","Great Britain","barcelona","Catalunya","monza","Italy","saudi arabia","Saudi",\'Race Calendar\'!D'+calendarRow+'),IF(best=0,"",INDEX(ranked,n,1)),IF(best=0,"",INDEX(ranked,n,2)),IF(best=0,"",INDEX(ranked,n,3)),IFERROR(TEXT(\'Race Calendar\'!C'+calendarRow+',"dd/mm/yyyy"),""),"'+book.getUrl()+'#gid='+book.getSheetByName('R'+round).getSheetId()+'&range=D'+start+':F'+end+'",best,warnings,"'+season+'|'+division+'|'+round+'|'+session+'"})';
}
function trackRecordsRegisterDivision_(book,season,division){
  const registry=trackRecordsBook_(),sources=registry.getSheetByName(F1XL_TRACK_RECORDS.sources);
  if(!sources)return; // Allows the source code to be deployed before the one-time migration.
  if(!/^TEST - F1XL Season /.test(fapWorkbookLegacyName_(book.getName())))throw Error('Only TEST divisions can register track-record sources.');
  const candidate=book.getSheetByName(F1XL_TRACK_RECORDS.summary)||book.insertSheet(F1XL_TRACK_RECORDS.summary);
  const header=['Season','Division','Round','Session','Circuit','Time','Driver','Team','Date','Source','Milliseconds','Checks','Candidate ID'];
  candidate.getRange(1,1,1,13).setValues([header]);candidate.setFrozenRows(1);
  const formulas=[];
  book.getSheets().filter(s=>/^R\d+$/.test(s.getName())).sort((a,b)=>Number(a.getName().slice(1))-Number(b.getName().slice(1))).forEach(function(s){
    const round=Number(s.getName().slice(1)),type=String(s.getRange('A7').getDisplayValue()),sprint=/sprint/i.test(type),early=/^(early|legacy)\s+sprint/i.test(type);
    if(sprint&&!early)formulas.push([trackRecordsSummaryFormula_(book,season,division,round,9,'Sprint qualifying')]);
    formulas.push([trackRecordsSummaryFormula_(book,season,division,round,sprint&&!early?66:9,'Qualifying')]);
  });
  if(formulas.length>64)throw Error('Track-record session capacity exceeded.');
  candidate.getRange(2,1,64,13).clearContent();if(formulas.length)candidate.getRange(2,1,formulas.length,1).setFormulas(formulas);
  candidate.getRange(1,1,1,13).setBackground('#193d2c').setFontColor('#ffffff').setFontWeight('bold');candidate.setColumnWidth(5,140);candidate.setColumnWidths(6,3,150);candidate.setColumnWidth(10,220);candidate.setColumnWidth(12,220);
  const existing=sources.getRange(2,1,Math.max(1,sources.getLastRow()-1),4).getValues();let index=existing.findIndex(r=>String(r[0])===String(season)&&Number(r[1])===Number(division));
  if(index<0){index=existing.findIndex(r=>!r[0]);if(index<0)index=existing.length;}
  const row=index+2,block=2+index*65;
  if(sources.getMaxRows()<block+64)sources.insertRowsAfter(sources.getMaxRows(),block+64-sources.getMaxRows());
  const enabled=existing[index]&&existing[index][0]?existing[index][3]===true:false;
  sources.getRange(row,1,1,4).setValues([[String(season),division,book.getUrl(),enabled]]);
  sources.getRange(row,4).insertCheckboxes().setValue(enabled);
  sources.getRange(block,7).setFormula('=IF($D'+row+',IMPORTRANGE($C'+row+',"\''+F1XL_TRACK_RECORDS.summary+'\'!A1:M65"),"")');
  sources.getRange(row,5).setFormula('=IF(NOT(D'+row+'),"Not included",IF(ISERROR(G'+block+'),"Open G'+block+' and Allow access / check source","Connected"))');
}
function trackRecordsRegisterSafely_(book,season,division){try{trackRecordsRegisterDivision_(book,season,division);}catch(e){console.error('Track-record registration failed S'+season+' D'+division+': '+e);}}
