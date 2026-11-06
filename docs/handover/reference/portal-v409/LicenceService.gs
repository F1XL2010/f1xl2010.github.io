/**
 * Seasonal Drivers Licence interface.
 *
 * The active TEST Master owns licence data. Reads and writes use its actual
 * calendar; result order and bans remain under admin control.
 */
const F1XL_LICENCE_SOURCE = Object.freeze({firstDriverRow:3});
function getDriverLicenceOverview(input) { fapAssertEntry_('getDriverLicenceOverview');return buildLicenceOverview_(openLicenceContext_(input&&input.season));}
function getDriverLicenceDivision(input) { fapAssertEntry_('getDriverLicenceDivision');
  const c=openLicenceContext_(input&&input.season),division=normaliseLicenceDivision_(input&&input.division);
  return buildLicenceDivision_(findLicenceDivisionSheet_(c,division),division,c);
}

function saveDriverLicenceSession(input) { fapAssertEntry_('saveDriverLicenceSession');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const divisionNumber = normaliseLicenceDivision_(input && input.division);
    const context = openLicenceContext_(input && input.season);
    const sheet = findLicenceDivisionSheet_(context, divisionNumber);
    const current = buildLicenceDivision_(sheet, divisionNumber, context);
    const sessionIndex = Number(input && input.sessionIndex);
    if (!current.ready) throw new Error('Connect this division’s licences first.');
    if (!Number.isInteger(sessionIndex) || !current.sessions[sessionIndex]) {
      throw new Error('Choose a valid qualifying, sprint or race session.');
    }
    if (String(input && input.revision || '') !== current.sessionRevisions[sessionIndex]) {
      throw new Error('This licence session changed after you opened it. Refresh before saving so another administrator’s work is not overwritten.');
    }

    const rows = normaliseLicenceSessionRows_(input && input.rows, current.rows);
    const session = current.sessions[sessionIndex];
    sheet.getRange(F1XL_LICENCE_SOURCE.firstDriverRow, session.pointsColumn, rows.length, 2)
      .setValues(rows.map(function(row) { return [row.points, row.seconds]; }));
    SpreadsheetApp.flush();

    const response = buildLicenceDivision_(sheet, divisionNumber, context);
    response.message = 'Division ' + divisionNumber + ' · ' + session.label + ' saved. Adjust result order separately when needed.';
    return testLaunchAfterSave_(context.season,{licences:true},response);
  } finally {
    lock.releaseLock();
  }
}

function saveOutstandingLicenceBans(input) { fapAssertEntry_('saveOutstandingLicenceBans');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const context = openLicenceContext_(input && input.season);
    const current = buildLicenceBans_(context.bansSheet,context.season);
    if (String(input && input.revision || '') !== current.revision) {
      throw new Error('Outstanding Bans changed after you opened it. Refresh before saving so another administrator’s work is not overwritten.');
    }
    const rows = normaliseLicenceBans_(input && input.addBan
      ? current.rows.concat(licenceAdminBanRows_(context,input.addBan,current.rows)) : input && input.rows);
    if(rows.some(function(r){return Number(r[0])>context.setup.divisions;}))throw new Error('Choose an active division for every ban.');
    const oldRowCount = Math.max(0, context.bansSheet.getLastRow() - 1);
    const height=Math.max(oldRowCount,rows.length);
    if(height)intakeCommit_([{range:context.bansSheet.getRange(2,1,height,7),values:rows.concat(Array.from({length:height-rows.length},function(){return ['','','','','','',''];})),text:true}]);

    const response = buildLicenceOverview_(context);
    response.message = 'Outstanding Bans saved.';
    return testLaunchAfterSave_(context.season,{licences:true},response);
  } finally {
    lock.releaseLock();
  }
}

function openLicenceContext_(season) {
  if(!season){const current=getResultsEntryInitial(true).seasons[0];if(!current)throw new Error('Launch a TEST season before opening licences.');season=current.season;}
  season=seasonPlanningSeason_(season);
  const spreadsheet=seasonPlanningBook_(season);
  if(!spreadsheet||!testLaunchActive_(spreadsheet)||!testLaunchRecord_(season).launchedAt)throw new Error('Open licences from a launched active TEST season.');
  const summarySheet=spreadsheet.getSheetByName('Summary'),penaltyGuideSheet=spreadsheet.getSheetByName('Penalty Guide'),bansSheet=spreadsheet.getSheetByName('Outstanding Bans');
  if(!summarySheet||!penaltyGuideSheet||!bansSheet)throw new Error('The Master is missing Summary, Penalty Guide or Outstanding Bans.');
  const setup=divisionTemplateReadMasterSetup_(spreadsheet,season,1),divisionSheets=[];
  for(let d=1;d<=setup.divisions;d++){const sheet=spreadsheet.getSheetByName('Division '+d);if(!sheet)throw new Error('Missing licence Division '+d);divisionSheets.push({division:d,sheet:sheet});}
  return {season:season,spreadsheet:spreadsheet,summarySheet:summarySheet,penaltyGuideSheet:penaltyGuideSheet,bansSheet:bansSheet,divisionSheets:divisionSheets,setup:setup};
}

function buildLicenceOverview_(context) {
  const divisions = context.divisionSheets.map(function(item) {
    return { division:item.division, tabName:item.sheet.getName(), ready:licenceIsConnected_(context.spreadsheet,Object.assign({},context.setup,{division:item.division})) };
  });
  const summary = context.divisionSheets.map(function(item) {
    return buildLicenceSummaryDivision_(context.summarySheet, item.sheet, item.division);
  });
  const bans = buildLicenceBans_(context.bansSheet,context.season);
  const guideValues = context.penaltyGuideSheet
    .getRange(1, 1, Math.max(1, context.penaltyGuideSheet.getLastRow()), 4)
    .getDisplayValues();
  const penaltyGuide = guideValues.map(function(row, index) {
    return { sheetRow:index + 1, values:row };
  }).filter(function(row) {
    return row.sheetRow > 1 && row.values.some(function(value) { return String(value).trim() !== ''; });
  });
  return {
    ok: true,
    season:context.season,url:context.spreadsheet.getUrl(),
    needsConnection:divisions.some(function(d){return !d.ready;}),
    sourceName: context.spreadsheet.getName(),
    refreshedAt: new Date().toISOString(),
    divisions: divisions,
    summary: summary,
    bans: bans.rows,
    bansRevision: bans.revision,
    banDrivers: licenceCarryDrivers_(context),
    banRounds: context.setup.calendar.map(function(r){return {round:r.round,track:r.track};}),
    penaltyGuide: penaltyGuide
  };
}

function buildLicenceSummaryDivision_(summarySheet, divisionSheet, divisionNumber) {
  const rows=divisionSheet.getRange('A3:C46').getDisplayValues().filter(function(r){return r[0];});
  rows.sort(function(a,b){return licenceNumber_(b[1])-licenceNumber_(a[1]);});
  return {division:divisionNumber,rows:rows};
}

function buildLicenceDivision_(sheet, divisionNumber, context,loadedEntrants) {
  const setup=Object.assign({},context.setup,{division:divisionNumber});
  licenceValidateLayout_(sheet,setup);
  const sessions=licenceSessions_(setup),rowCount=44;
  const data=sheet.getRange(3,1,rowCount,setup.lastLicenceColumn+4).getDisplayValues();
  const ready=licenceIsConnected_(context.spreadsheet,setup);
  licenceDriverNames_(context.spreadsheet,data.map(function(r){return [r[0]];}),loadedEntrants);
  const rows = data.map(function(row, index) {
    return {
      sheetRow: F1XL_LICENCE_SOURCE.firstDriverRow + index,
      driver: String(row[0] || '').trim(),
      totalPoints: String(row[1] || '').trim(),
      totalSeconds: String(row[2] || '').trim(),
      sessions: sessions.map(function(session) {
        return [String(row[session.pointsColumn - 1] || '').trim(), String(row[session.secondsColumn - 1] || '').trim()];
      })
    };
  });
  const sessionRevisions = sessions.map(function(session, sessionIndex) {
    return licenceRevision_([context.spreadsheet.getId(),context.season,divisionNumber,session,rows.map(function(row) {
      return [row.sheetRow, row.driver, row.sessions[sessionIndex][0], row.sessions[sessionIndex][1]];
    })]);
  });
  return {
    ok: true,
    season:context.season,ready:ready,
    division: divisionNumber,
    tabName: sheet.getName(),
    refreshedAt: new Date().toISOString(),
    sessions: sessions,
    rows: rows,
    sessionRevisions: sessionRevisions
  };
}

function buildLicenceBans_(sheet,season) {
  const rowCount = Math.max(0, sheet.getLastRow() - 1);
  const rows = rowCount ? sheet.getRange(2, 1, rowCount, 7).getDisplayValues() : [];
  const populated = rows.filter(function(row) {
    return row.some(function(value) { return String(value).trim() !== ''; });
  });
  return { rows:populated, revision:licenceRevision_([season,sheet.getParent().getId(),populated]) };
}

function findLicenceDivisionSheet_(context, divisionNumber) {
  const match = context.divisionSheets.find(function(item) { return item.division === divisionNumber; });
  if (!match) throw new Error('Division ' + divisionNumber + ' is not an active visible licence tab.');
  return match.sheet;
}

function normaliseLicenceDivision_(value) {
  const division = Number(value);
  if (!Number.isInteger(division) || division < 1) throw new Error('Choose a valid division.');
  return division;
}

function normaliseLicenceSessionRows_(rows, currentRows) {
  if (!Array.isArray(rows) || rows.length !== currentRows.length) {
    throw new Error('The division driver list changed while it was open. Refresh and try again.');
  }
  return rows.map(function(row, index) {
    if (Number(row && row.sheetRow) !== currentRows[index].sheetRow) {
      throw new Error('The division driver order changed while it was open. Refresh and try again.');
    }
    const points = licenceCellNumber_(row && row.points, 'licence points', currentRows[index].driver || ('row ' + currentRows[index].sheetRow));
    const seconds = licenceCellNumber_(row && row.seconds, 'seconds', currentRows[index].driver || ('row ' + currentRows[index].sheetRow));
    if (!currentRows[index].driver && (points !== '' || seconds !== '')) {
      throw new Error('Licence values cannot be entered against a blank driver row.');
    }
    return { points:points, seconds:seconds };
  });
}

function licenceCellNumber_(value, label, driver) {
  const text = String(value == null ? '' : value).trim();
  if (text === '') return '';
  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error('Enter a valid number for ' + driver + ' · ' + label + '.');
  return number;
}

function normaliseLicenceBans_(rows) {
  if (!Array.isArray(rows) || rows.length > 200) throw new Error('The Outstanding Bans list is not valid.');
  return rows.map(function(row) {
    if (!Array.isArray(row) || row.length !== 7) throw new Error('An Outstanding Bans row has the wrong structure.');
    const cleaned=row.map(function(value) { return String(value == null ? '' : value).trim(); });
    if(cleaned.some(Boolean)&&(!/^[1-8]$/.test(cleaned[0])||!cleaned[1]||!cleaned[2]||!['','No','Yes'].includes(cleaned[4])))throw new Error('Each ban needs a division, driver, ban type and valid Served status.');
    return cleaned;
  }).filter(function(row) {
    return row.some(function(value) { return value !== ''; });
  });
}

// Admin decisions use the existing manually editable seven-column ledger.
// Multiple race bans get one row per round; a season ban stays active throughout.
function licenceAdminBanRows_(context,input,existing) {
  const division=normaliseLicenceDivision_(input.division);
  if(!context.divisionSheets.some(d=>d.division===division))throw Error('Choose an active division.');
  const matches=licenceCarryDrivers_(context).filter(d=>d.id===input.driverId);
  if(matches.length!==1)throw Error('Choose one driver from the season entrants.');
  const type=String(input.type||''),allowed=['Qualifying ban','Race ban','Season ban'];
  if(!allowed.includes(type))throw Error('Choose a qualifying, race or season ban.');
  const first=Number(input.first),last=type==='Season ban'?first:Number(input.last||input.first);
  const rounds=context.setup.calendar.map(r=>Number(r.round));
  if(!Number.isInteger(first)||!Number.isInteger(last)||last<first||!rounds.includes(first)||!rounds.includes(last))throw Error('Choose the first and last affected rounds.');
  const reason=String(input.reason||'').trim();
  if(!reason||reason.length>1000)throw Error('Enter a reason (up to 1,000 characters). This is shown on the website.');
  const incurred=Number(input.incurred);
  if(!rounds.includes(incurred)||incurred>first)throw Error('Choose the round when the ban was issued, no later than its start.');
  const driver=matches[0].name;
  const selected=rounds.filter(r=>r>=first&&r<=last);
  if(selected.length!==last-first+1)throw Error('The selected round range is not in the calendar.');
  const rows=selected.map(r=>[String(division),driver,type,type==='Season ban'?'From R'+r+' — rest of season':'R'+r,'No','R'+incurred,reason]);
  if(rows.some(row=>existing.some(old=>String(old[1]).toLowerCase()===driver.toLowerCase()&&old[2]===type&&old[3]===row[3]&&old[6]===reason)))throw Error('This ban is already recorded. Review the existing entry.');
  return rows;
}

function licenceNumber_(value) {
  const number = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function licenceRevision_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value));
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

// A service record, not a second licence charge. Seconds stay on the original
// decision; administrators adjust finishing times/order in Results entry.
const F1XL_CARRYOVER = Object.freeze({sheet:'Time Penalty Carryovers',headers:['Record ID','Driver ID','Driver','Original division','Original round','Original session','Seconds','Ticket / reference','Next race scope','Status','Used division','Used round','Used session','Admin note','Updated at','Result check','Source ticket']});
function licenceCarryTable_(c,create){
 let s=c.spreadsheet.getSheetByName(F1XL_CARRYOVER.sheet);if(!s&&create){s=c.spreadsheet.insertSheet(F1XL_CARRYOVER.sheet);s.getRange(1,1,1,17).setValues([F1XL_CARRYOVER.headers]);s.setFrozenRows(1);s.getRange('A1:P1').setFontWeight('bold').setBackground('#163329').setFontColor('#ffffff');s.setColumnWidths(1,16,140);s.setColumnWidth(3,190);s.setColumnWidth(8,210);s.setColumnWidth(14,260);s.getRange('A1').setNote('Manual fallback: one row per original time penalty. Status: Pending, Applied, Cleared or Cancelled. Enter original race / sprintRace, seconds, reference and scope any (next race, sprint or feature). Record the FIRST later race participated in under Used columns. DNS/absence does not count. A second DNF clears the penalty; it never rolls again. Adjust result times manually. Do not add these seconds to licence totals again. IDs and Result check are portal bookkeeping.');
 s.getRange('J2:J1000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Pending','Applied','Cleared','Cancelled'],true).setAllowInvalid(false).build());s.getRange('I2:I1000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['any'],true).setAllowInvalid(false).build());
 sheetPresentationSafely_(function() { sheetPresentationRegister_(s); });}
 if(s&&create){const h=s.getRange('Q1').getDisplayValue();if(h&&h!=='Source ticket')throw Error('Carry-over column Q is already in use. Review it before saving.');if(!h)s.getRange('Q1').setValue('Source ticket');}
 return s;
}
function licenceCarryRows_(c){const s=licenceCarryTable_(c,false);return !s||s.getLastRow()<2?[]:s.getRange(2,1,s.getLastRow()-1,17).getDisplayValues().map((v,i)=>({v,row:i+2})).filter(x=>x.v[2]).map(x=>{const v=x.v;return {id:v[0]||'row:'+x.row,driverId:v[1],driver:v[2],division:Number(v[3]),round:Number(v[4]),session:v[5],seconds:Number(v[6]),reference:v[7],scope:v[8],status:v[9],usedDivision:Number(v[10]),usedRound:Number(v[11]),usedSession:v[12],note:v[13],sourceTicket:v[16]||'',revision:licenceRevision_(v),sheetRow:x.row,values:v,originLabel:licenceCarryLabel_(c,Number(v[4]),v[5]),usedLabel:v[11]?licenceCarryLabel_(c,Number(v[11]),v[12]):''};});}
function licenceCarryLabel_(c,round,session){const r=c.setup.calendar.find(x=>x.round===round);return 'R'+round+' · '+(r?r.track:'')+' · '+(session==='sprintRace'?'Sprint':'Feature race');}
function licenceCarryDrivers_(c){const s=c.spreadsheet.getSheetByName('Season Entrants');return s.getRange(2,1,Math.max(1,s.getLastRow()-1),2).getDisplayValues().filter(r=>r[0]&&r[1]).map(r=>({id:r[0],name:r[1]}));}
function licenceCarryResponse_(c){return {season:c.season,rows:licenceCarryRows_(c).map(r=>{const {values,sheetRow,...publicRow}=r;return publicRow;}),drivers:licenceCarryDrivers_(c),divisions:c.divisionSheets.map(d=>d.division),sessions:c.setup.calendar.flatMap(r=>(r.sprint?['sprintRace','race']:['race']).map(id=>({round:r.round,id,label:licenceCarryLabel_(c,r.round,id)})))};}
function getLicenceCarryovers(input){fapAssertEntry_('getLicenceCarryovers');return licenceCarryResponse_(openLicenceContext_(input&&input.season));}
function licenceCarryTicket_(input){
 fapRequire_(fapCurrentPerson_(),'tickets',1);
 const c=ticketDeliveryContext_(input&&input.raceName),tickets=buildWebsiteTicketExport_(c.ticket).tickets.filter(t=>t.race===c.round.sheetName&&t.caseId===input.caseId);
 if(tickets.length!==1)throw Error('Save the final ticket decision first, then reopen its carry-over action.');
 const source=buildTicketRaceWorkspace_(findTicketRaceSheet_(c.ticket,c.round.sheetName)).tickets.filter(t=>t.caseId===input.caseId);
 if(source.length!==1)throw Error('The original ticket could not be matched uniquely.');
 const t=tickets[0],recipients=ticketDeliveryContributions_(t,source[0],c.round,c.licence).filter(p=>p.seconds>0&&['race','sprintRace'].includes(p.session));
 const p=recipients.find(p=>input.driverId?p.driverId===input.driverId:p.driver.toLowerCase()===String(input.driver||'').trim().toLowerCase());
 if(!p)throw Error('This driver no longer has a saved race time penalty on this ticket. Refresh its decision.');
 return {context:c.licence,source:{raceName:c.round.sheetName,caseId:t.caseId,driverId:p.driverId,revision:licenceRevision_([t.revision,source[0].recordRevision,p])},prefill:{driverId:p.driverId,division:p.division,round:p.round,session:p.session,seconds:p.seconds,scope:'any',reference:'S'+c.round.season+' · R'+c.round.round+' · Ticket #'+t.ticketNumber},sourceKey:JSON.stringify([c.round.sheetName,t.caseId])};
}
function getTicketLicenceCarryover(input){
 fapAssertEntry_('getTicketLicenceCarryover');const t=licenceCarryTicket_(input),data=licenceCarryResponse_(t.context);
 data.ticketSource=t.source;data.prefill=t.prefill;data.existing=data.rows.find(r=>r.status!=='Cancelled'&&r.driverId===t.prefill.driverId&&(r.sourceTicket===t.sourceKey||(r.round===t.prefill.round&&r.session===t.prefill.session&&r.reference===t.prefill.reference)))||null;
 return data;
}
// Restricted, display-only subset: never expose private notes to principals.
function licenceCarryPublicPending_(book){
 const s=book.getSheetByName(F1XL_CARRYOVER.sheet);if(!s||s.getLastRow()<2)return [];
 const entrants=book.getSheetByName('Season Entrants'),names={};
 if(entrants&&entrants.getLastRow()>1)entrants.getRange(2,1,entrants.getLastRow()-1,2).getDisplayValues().forEach(r=>{if(r[0])names[r[0]]=r[1];});
 return s.getRange(2,1,s.getLastRow()-1,16).getDisplayValues().filter(r=>r[9]==='Pending').map(r=>({driver:names[r[1]]||r[2],division:Number(r[3]),round:Number(r[4]),session:r[5],seconds:Number(r[6]),scope:r[8]}));
}
function getResultsCarryoverReminders(input){
 fapAssertEntry_('getResultsCarryoverReminders');const c=activeSeasonContext_(input&&input.season);
 const bans=input.division&&input.round?licenceRoundBans_(openLicenceContext_(c.season),input.division,input.round):[];
 return {season:c.season,rows:licenceCarryPublicPending_(c.book),bans:bans.map(b=>({row:b.row,driver:b.driver,type:b.type,status:b.status,served:b.served}))};
}
// The same seven-column ban ledger used by Licences & bans and manual Sheets.
// Absence is expected for a race ban; it is never used to automatically serve it.
function licenceBanRound_(value,calendar){
 const text=String(value||'').trim();if(!text)return 0;
 const m=text.match(/^(?:From\s+)?(?:R(?:ound)?\s*)?(\d+)\b/i);if(m)return Number(m[1]);
 const normal=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,''),matches=calendar.filter(r=>normal(r.track)===normal(text));
 return matches.length===1?matches[0].round:0;
}
function licenceBanKind_(value){
 const s=String(value||'').toLowerCase();if(/season/.test(s))return 'season';if(/quali/.test(s))return 'qualifying';if(/race/.test(s))return 'race';return '';
}
function licenceRoundBans_(c,division,round){
 division=normaliseLicenceDivision_(division);round=Number(round);
 if(!c.divisionSheets.some(d=>d.division===division)||!c.setup.calendar.some(r=>r.round===round))throw Error('Choose an active division and round.');
 const s=c.bansSheet,rows=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,7).getDisplayValues():[];
 return rows.map((v,i)=>{
   const due=licenceBanRound_(v[3],c.setup.calendar),incurred=licenceBanRound_(v[5],c.setup.calendar),served=/^yes$/i.test(v[4]),kind=licenceBanKind_(v[2]);
   const sessions=(c.setup.licenceSessions[round]||[]).filter(x=>kind==='qualifying'?/qualifying/i.test(x.id):kind==='race'?/race/i.test(x.id):false).filter(x=>!/sprint/i.test(v[2]+' '+v[3])||/sprint/i.test(x.id)).map(x=>({id:x.id,label:x.id==='race'?'Feature race':x.id==='sprintRace'?'Sprint race':x.id==='sprintQualifying'?'Sprint qualifying':'Qualifying'}));
   return {row:i+2,driver:v[1],division:Number(v[0]),type:v[2],scheduled:v[3],incurred:v[5],reason:v[6],due,served,kind,sessions,revision:licenceRevision_(v),status:served?'Served':kind==='season'?'Banned for the rest of the season':due===round?'Due this round':due?'Earlier round — check':'Round not set',eligible:(Number(v[0])===division||kind==='season')&&v[1]&&(served?due===round:due?due<=round:!incurred||incurred<round)};
 }).filter(b=>b.eligible).map(({eligible,...b})=>b);
}
function getResultsRoundPenalties(input){fapAssertEntry_('getResultsRoundPenalties');
 const c=openLicenceContext_(input.season);return Object.assign(licenceCarryResponse_(c),{bans:licenceRoundBans_(c,input.division,input.round)});
}
function saveResultsServedBans(input){fapAssertEntry_('saveResultsServedBans');return fapPerformanceLock_(()=>{
 const c=openLicenceContext_(input.season),division=normaliseLicenceDivision_(input.division),round=Number(input.round),bans=licenceRoundBans_(c,division,round),selected=input.bans;
 if(!Array.isArray(selected)||!selected.length||selected.length>200||new Set(selected.map(b=>b.row)).size!==selected.length)throw Error('Select each served ban once.');
 const definition=c.setup.calendar.find(r=>r.round===round),calendar=c.spreadsheet.getSheetByName('Calendar');
 if(calendar&&calendar.getRange('E1').getDisplayValue()==='Status'&&calendar.getRange(round+1,5).getDisplayValue()==='Cancelled')throw Error('A cancelled round cannot serve a ban.');
 const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,division));if(!id)throw Error('Connect this division’s results first.');
 const book=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(book);assertSeasonWorkbookWritable_(c.season,book);
 const sheet=book.getSheetByName('R'+round);if(!sheet)throw Error('The round results sheet is missing.');
 const results=sheet.getRange(1,1,117,7).getDisplayValues(),writes=[];
 selected.forEach(item=>{
   const b=bans.find(b=>b.row===Number(item.row));if(!b||b.served||b.revision!==item.revision)throw Error('A ban changed or was already served. Reopen this window before saving.');
   const session=b.sessions.find(s=>s.id===item.session);if(!session)throw Error('Choose the session served for '+b.driver+'.');
   const start=item.session==='sprintQualifying'?9:item.session==='sprintRace'?37:item.session==='qualifying'?(definition.sprint&&!definition.earlySprint?66:9):(definition.sprint?94:37);
   // Qualifying time is F; G is only the tyre. Race gaps are in G.
   const resultColumn=/qualifying/i.test(item.session)?5:6;
   const block=results.slice(start-1,start+23),participated=r=>r[3]&&String(r[resultColumn]||'').trim()&&!/^(DNS|DNQ|N\/A|—|-|0(?::0+)*(?:\.0+)?)$/i.test(String(r[resultColumn]||'').trim());
   if(!block.some(participated))throw Error('Save the '+session.label.toLowerCase()+' results for R'+round+' before marking bans served.');
   const target=block.filter(r=>String(r[3]).trim().toLowerCase()===b.driver.toLowerCase());
   if(target.some(participated))throw Error(b.driver+' has a saved result in '+session.label+'. Check it before confirming this ban was served.');
   const range=c.bansSheet.getRange(b.row,1,1,7),before=range.getDisplayValues()[0];
   if(range.getFormulas()[0].some(Boolean))throw Error('This ban contains formulas. Review it in Licences & bans.');
   const note='Served R'+round+' · '+session.label+(b.scheduled&&b.due!==round?' (previously listed: '+b.scheduled+')':'');
   const after=before.slice();after[3]='R'+round+' · '+session.label;after[4]='Yes';after[6]=[before[6],note].filter(Boolean).join(' · ');
   writes.push({range,values:[after],text:true});
 });
 // Queue the existing website updater, then commit one checked batch. No result
 // cells or licence points are touched, and the ticket markers remain intact.
 ticketPublicationQueue_(c.season,true);intakeCommit_(writes);
 return {bans:licenceRoundBans_(c,division,round),message:selected.length+' ban'+(selected.length===1?'':'s')+' marked served. Website indicators are updating.'};
});}
function licenceCarryNames_(c,r){const d=licenceCarryDrivers_(c).filter(d=>r.driverId?d.id===r.driverId:d.name.toLowerCase()===r.driver.toLowerCase());if(d.length!==1)throw Error('Match this carry-over to one Season Entrants record first.');return [r.driver,d[0].name].map(n=>n.toLowerCase());}
function licenceCarryResult_(book,definition,session,names){
 const s=book.getSheetByName('R'+definition.round);if(!s)return {incomplete:true};const start=session==='sprintRace'?37:definition.sprint?94:37;
 const all=s.getRange(start,1,24,7).getDisplayValues(),complete=all.some(r=>r[3]&&r[6])&&!all.some(r=>r[3]&&!r[6]);
 const rows=all.filter(r=>names.includes(String(r[3]).trim().toLowerCase()));if(rows.length>1)throw Error('Duplicate driver entries in R'+definition.round+'. Correct results first.');if(!rows.length)return complete?null:{incomplete:true};
 const row=rows[0],gap=String(row[6]).trim(),status=gap.toUpperCase();if(status==='DNS')return complete?null:{incomplete:true};
 return {round:definition.round,session,gap,dnf:status==='DNF',finished:/^(?:\+?\d[\d:.]*|\+?\d+laps?)$/i.test(gap.replace(/\s/g,'')),fingerprint:licenceRevision_(row)};
}
function licenceCarryBooks_(c){const p=PropertiesService.getScriptProperties();return c.divisionSheets.map(d=>{const id=p.getProperty(divisionTemplatePropertyKey_(c.season,d.division));if(!id)throw Error('Connect Division '+d.division+' results first.');const book=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(book);return {division:d.division,book};});}
function licenceCarryNext_(c,r){
 if(r.scope!=='any'||!Number.isFinite(r.seconds)||r.seconds<=0)throw Error('Check this carry-over’s seconds and next-race scope in the register.');
 const names=licenceCarryNames_(c,r),books=licenceCarryBooks_(c),calendar=c.setup.calendar.filter(x=>x.round>=r.round).sort((a,b)=>a.round-b.round),origin=calendar.find(x=>x.round===r.round),sourceBook=books.find(b=>b.division===r.division);
 if(!origin||!sourceBook||!['race','sprintRace'].includes(r.session)||(r.session==='sprintRace'&&!origin.sprint))throw Error('Check the original round, division and race session.');
 const source=licenceCarryResult_(sourceBook.book,origin,r.session,names);if(!source||!source.dnf)throw Error('The original saved race must show DNF. Review this carry-over if the result or appeal changed.');
 for(const round of calendar){for(const session of round.sprint?['sprintRace','race']:['race']){if(round.round===r.round&&(r.session==='race'||session==='sprintRace'))continue;if(r.scope==='same'&&session!==r.session)continue;
 const found=books.map(b=>{const v=licenceCarryResult_(b.book,round,session,names);return v?Object.assign({division:b.division},v):null;}).filter(Boolean);if(found.some(v=>v.incomplete))return {ready:false,message:'Waiting for complete '+licenceCarryLabel_(c,round.round,session)+' results across the divisions, so an earlier participation is not skipped.'};if(found.length>1)throw Error('Driver appears in multiple divisions for the next race. Review those results first.');
 if(found.length){const v=found[0];if(!v.dnf&&!v.finished)return {ready:false,message:'The next participation is '+licenceCarryLabel_(c,v.round,v.session)+', but its result is incomplete or needs review.'};return {ready:true,action:v.dnf?'Cleared':'Applied',result:v,message:'D'+v.division+' · '+licenceCarryLabel_(c,v.round,v.session)+(v.dnf?' — DNF again. Clear these '+r.seconds+' seconds; they cannot carry further.':' — finished. Apply the carried '+r.seconds+' seconds to this result once, adjust the order if needed, then confirm below.')};}
 }}return {ready:false,message:'Waiting for the next participation. Missed races and DNS do not use up the carry-over.'};
}
function licenceCarryFind_(c,input){const matches=licenceCarryRows_(c).filter(r=>r.id===input.id);if(matches.length!==1)throw Error('Carry-over not found or duplicated. Refresh the list.');if(matches[0].revision!==input.revision)throw Error('This carry-over changed. Refresh before saving.');return matches[0];}
function previewLicenceCarryover(input){fapAssertEntry_('previewLicenceCarryover');const c=openLicenceContext_(input.season),r=licenceCarryFind_(c,input);if(r.status!=='Pending')throw Error('This carry-over is already closed.');const p=licenceCarryNext_(c,r);p.revision=licenceRevision_([r.revision,p]);return p;}
function saveLicenceCarryover(input){fapAssertEntry_('saveLicenceCarryover');return fapPerformanceLock_(()=>{
 assertSeasonWritable_(input&&input.season);let ticket=null;if(input.ticketSource){ticket=licenceCarryTicket_(input.ticketSource);if(ticket.context.season!==String(input.season)||ticket.source.revision!==input.ticketSource.revision)throw Error('The ticket decision changed. Reopen Record carry-over from that ticket.');input=Object.assign({},input,ticket.prefill);}
 const c=ticket?ticket.context:openLicenceContext_(input&&input.season);divisionTemplateAssertTestWorkbook_(c.spreadsheet);let values,row;
 if(input.id){const r=licenceCarryFind_(c,input);if(r.status!=='Pending')throw Error('This carry-over is already closed and cannot roll again.');values=r.values.slice();row=r.sheetRow;
 if(input.action==='cancel'){values[9]='Cancelled';}else if(input.action==='resolve'){const p=licenceCarryNext_(c,r);if(!p.ready)throw Error(p.message);if(input.preview!==licenceRevision_([r.revision,p]))throw Error('The result changed. Check the next participation again.');values[9]=p.action;values[10]=p.result.division;values[11]=p.result.round;values[12]=p.result.session;values[15]=p.result.fingerprint;}else throw Error('Choose an action.');
 }else{const d=licenceCarryDrivers_(c).filter(d=>d.id===input.driverId);if(d.length!==1)throw Error('Choose one season driver.');const seconds=Number(input.seconds),round=Number(input.round),division=Number(input.division),reference=String(input.reference||'').trim(),note=String(input.note||'').trim();
 if(!Number.isFinite(seconds)||seconds<=0||!reference||reference.length>160||note.length>1000||input.scope!=='any')throw Error('Enter positive seconds, a ticket/reference and a valid next-race scope.');
 const r={driverId:d[0].id,driver:d[0].name,division,round,session:input.session,scope:input.scope};const names=licenceCarryNames_(c,r),definition=c.setup.calendar.find(x=>x.round===round),bookId=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,division));
 if(!definition||!bookId||!c.divisionSheets.some(d=>d.division===division)||!['race','sprintRace'].includes(r.session)||(r.session==='sprintRace'&&!definition.sprint))throw Error('Choose a valid original race.');const b=SpreadsheetApp.openById(bookId);divisionTemplateAssertTestWorkbook_(b);const result=licenceCarryResult_(b,definition,r.session,names);if(!result||!result.dnf)throw Error('The original saved race result must show DNF before recording a carry-over.');
 if(licenceCarryRows_(c).some(x=>x.status!=='Cancelled'&&x.driverId===r.driverId&&x.round===round&&x.session===r.session&&(x.reference.toLowerCase()===reference.toLowerCase()||(ticket&&x.sourceTicket===ticket.sourceKey))))throw Error('This ticket/driver already has a carry-over record.');
 values=[Utilities.getUuid(),r.driverId,r.driver,division,round,r.session,seconds,reference,r.scope,'Pending','','','',note,'','',ticket?ticket.sourceKey:''];}
 const s=licenceCarryTable_(c,true);values[14]=new Date().toISOString();if(!values[0])values[0]=Utilities.getUuid();s.getRange(row||Math.max(2,s.getLastRow()+1),1,1,17).setValues([values.map(ticketIntakeLiteral_)]);return licenceCarryResponse_(c);
});}

