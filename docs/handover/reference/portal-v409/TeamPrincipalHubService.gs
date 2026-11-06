/** Team Principal Hub. The server pins normal principals to their assigned team;
 * only owners and accounts with team-preview access can select another team. */
function teamPrincipalHubText_(value){return String(value==null?'':value).trim();}
function teamPrincipalHubKey_(value){return teamPrincipalHubText_(value).toLowerCase();}
function getTeamPrincipalHubInitial(){ fapAssertEntry_('getTeamPrincipalHubInitial');const person=fapCurrentPerson_(),active=getResultsEntryInitial(true).seasons.filter(s=>person&&(person.owner||fapPermission_(person,'team_preview')||person.teams[String(s.season)]));if(!active.length){const season=getResultsEntryInitial().seasons[0];throw new Error(season?'Your account has no team assigned for Season '+season.season+'. Ask F1XL to open People & permissions and assign your team for this season.':'No season is active yet. Your team hub will be available after season launch.');}return getTeamPrincipalHub({season:active[0].season});}
function fapPrincipalTeam_(season,requested){
  const p=fapCurrentPerson_();if(!p)throw new Error('Sign in first.');
  if(p.owner||fapPermission_(p,'team_preview'))return requested;
  const team=p.teams[String(season)];if(!team)throw new Error('Your account is not assigned a team for this season.');
  if(requested&&teamPrincipalHubKey_(requested)!==teamPrincipalHubKey_(team))throw new Error('You can only open your assigned team.');return team;
}
function teamPrincipalHubDriverDirectory_(){try{const rows=buildDriverDatabaseResponse_(openDriverDatabaseContext_().spreadsheet).drivers,byName={};rows.forEach(function(driver){byName[teamPrincipalHubKey_(driver.gamertag)]=driver;(driver.aliases||[]).forEach(function(alias){byName[teamPrincipalHubKey_(alias.alias)]=driver;});});return byName;}catch(error){return {};}}
function teamPrincipalHubContext_(season){
  season=seasonPlanningSeason_(season);const book=seasonPlanningBook_(season),start=book.getSheetByName('Start Here');
  if(!start||String(start.getRange('I7').getDisplayValue()).trim()!=='Active')throw new Error('Open an active season.');
  const count=Number(start.getRange('B5').getValue());if(!Number.isInteger(count)||count<1||count>F1XL_CAPACITY.divisions)throw new Error('Check the active division count in the Master.');
  return {season:season,book:book,count:count};
}
function teamPrincipalHubSetup_(season,requested,includeDirectory){
  const c=teamPrincipalHubContext_(season),lines=activeSeasonLines_(c),teamSheet=c.book.getSheetByName('Teams & Principals');
  if(!teamSheet)throw new Error('Teams & Principals is missing from the Season Master.');
  const teamRows=teamSheet.getRange(2,1,F1XL_CAPACITY.teams,8).getDisplayValues().filter(function(row){return row[0];}),teams=teamRows.filter(function(row){return row[5]==='Full team';}).map(function(row){return {team:teamPrincipalHubText_(row[0]),principal:teamPrincipalHubText_(row[4])};});
  if(!teams.length)throw new Error('No full teams are configured yet.');
  const selected=teams.filter(function(item){return teamPrincipalHubKey_(item.team)===teamPrincipalHubKey_(requested);})[0]||(!requested?teams[0]:null),teamType={};
  if(!selected)throw new Error('The assigned team is not configured in this season. Ask the F1XL owner to check the assignment.');
  teamRows.forEach(function(row){teamType[teamPrincipalHubKey_(row[0])]=teamPrincipalHubText_(row[5]);});
  const directory=includeDirectory?teamPrincipalHubDriverDirectory_():{},roster=[],market=[],allDrivers=[];
  lines.forEach(function(line){line.rows.forEach(function(row){const full=teamPrincipalHubText_(row[1]),fullTeam=teamPrincipalHubText_(row[4]),fullTier=teamPrincipalHubText_(row[5]),reserve=teamPrincipalHubText_(row[7]),reserveTier=teamPrincipalHubText_(row[10]);if(full){const item={name:full,division:line.division,tier:fullTier,team:fullTeam,role:teamType[teamPrincipalHubKey_(fullTeam)]==='Free agent team'?'Free agent':'Team driver'};if(includeDirectory)item.discord=(directory[teamPrincipalHubKey_(full)]||{}).discordId||'';allDrivers.push(item);if(teamPrincipalHubKey_(fullTeam)===teamPrincipalHubKey_(selected.team))roster.push(item);if(item.role==='Free agent')market.push(item);}if(reserve){const item={name:reserve,division:line.division,tier:reserveTier,team:'Reserve',role:'Reserve'};if(includeDirectory)item.discord=(directory[teamPrincipalHubKey_(reserve)]||{}).discordId||'';allDrivers.push(item);market.push(item);}});});
  return {c:c,lines:lines,teams:teams,selected:selected,roster:roster,market:market,allDrivers:allDrivers};
}
function teamPrincipalHubStandings_(c){
  const result=[];
  for(let division=1;division<=c.count;division++){
    const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,division));
    try{
      if(!id)throw new Error('Missing division connection.');
      const book=SpreadsheetApp.openById(id),drivers=book.getSheetByName('Driver Results NoSort'),teams=book.getSheetByName('Constructors Standings NoSort');
      if(!drivers||!teams)throw new Error('Missing standings.');
      const values=drivers.getRange(4,1,Math.min(F1XL_CAPACITY.seasonDriversPerDivision+1,drivers.getMaxRows()-3),Math.min(45,drivers.getMaxColumns())).getDisplayValues();
      const pointsIndex=values[0].map(teamPrincipalHubText_).findIndex(h=>/^points$/i.test(h));
      if(pointsIndex<0)throw new Error('Missing driver points heading.');
      const teamValues=teams.getRange(4,1,Math.min(20,teams.getMaxRows()-3),3).getDisplayValues().slice(1).filter(row=>teamPrincipalHubText_(row[1]));
      result.push({division:division,drivers:values.slice(1).filter(row=>teamPrincipalHubText_(row[2])).map(row=>({position:row[0],driver:row[2],team:row[3],points:pointsIndex>=0?row[pointsIndex]:'',hasResult:values[0].slice(0,pointsIndex).some((h,i)=>/^R\d/i.test(h)&&teamPrincipalHubText_(row[i])!=='')})),teams:teamValues.map(row=>({position:row[0],team:row[1],points:row[2]}))});
    }catch(error){result.push({division:division,drivers:[],teams:[],issue:'Standings connection is not ready.'});}
  }
  return result;
}
/** Current-team display only. Historic rows remain in the ledgers unchanged. */
function teamPrincipalHubLicenceSummary_(roster,records,banRows,carryRows,entrants,calendar){
  const names={},ids={};entrants.forEach(r=>{if(r[0]&&r[1]){names[teamPrincipalHubKey_(r[1])]=r[0];ids[r[0]]=r[1];}});
  const current=roster.map(d=>Object.assign({},d,{driverId:names[teamPrincipalHubKey_(d.name)]||''}));
  const match=(name,id)=>current.find(d=>id&&d.driverId?d.driverId===id:teamPrincipalHubKey_(d.name)===teamPrincipalHubKey_(name));
  const roundLabel=text=>{const round=licenceBanRound_(text,calendar),event=calendar.find(e=>Number(e.round)===round);return round?'R'+round+(event?' · '+event.track:''):teamPrincipalHubText_(text);};
  const bans=[],servedBans=[],reviews=[];
  banRows.forEach(r=>{
    const token=String(r[6]||'').match(/\bDRIVER-[A-Z0-9-]+\b/i),driver=match(r[1],token&&token[0]);if(!driver||!r[2])return;
    const status=teamPrincipalHubKey_(r[4]);if(/^(cancelled|cleared|reversed|withdrawn)$/.test(status))return;
    const kind=licenceBanKind_(r[2]),sprint=/sprint/i.test(r[2]+' '+r[3]);
    const type=kind==='qualifying'?(sprint?'Sprint qualifying ban':'Qualifying ban'):kind==='race'?(sprint?'Sprint race ban':'Race ban'):kind==='season'?'Season ban':r[2];
    const scheduled=roundLabel(r[3]),reason=String(r[6]||'').replace(/\[Ticket[^\]]*\]/gi,'').trim();
    const item={driver:driver.name,division:driver.division,originalDivision:Number(r[0]),type:type,kind:kind,scheduled:scheduled,incurred:roundLabel(r[5]),reason:reason,restriction:kind==='qualifying'?'Must sit out '+(sprint?'sprint qualifying':'qualifying'):kind==='race'?'Must sit out '+(sprint?'the sprint race':'the race'):kind==='season'?'Cannot race for the remainder of the season':'Ask an admin to confirm the restriction',status:/^(yes|served)$/.test(status)?'Served':'Outstanding'};
    (item.status==='Served'?servedBans:kind?bans:reviews).push(item);
  });
  const carryovers=carryRows.filter(r=>/^pending$/i.test(r[9])).map(r=>{
    const driver=match(ids[r[1]]||r[2],r[1]);return driver?{driver:driver.name,division:driver.division,originalDivision:Number(r[3]),round:Number(r[4]),session:r[5],seconds:Number(r[6]),reference:r[7],scope:r[8]}:null;
  }).filter(Boolean);
  const licences=current.map(d=>{
    const related=records.filter(r=>teamPrincipalHubKey_(r.driver)===teamPrincipalHubKey_(d.name)),matches=related.filter(r=>r.division===d.division),record=matches.length===1?matches[0]:null;
    const ready=!!record&&record.points!==''&&Number.isFinite(Number(record.points))&&Number(record.points)>=0;
    return {driver:d.name,division:d.division,tier:d.tier||'',points:ready?Number(record.points):null,seconds:record?record.seconds:null,ready:ready,previousDivisions:related.filter(r=>r.division!==d.division),servedBans:servedBans.filter(b=>b.driver===d.name)};
  });
  return {licences:licences,bans:bans,carryovers:carryovers,reviews:reviews};
}
function teamPrincipalHubLicenceData_(c,roster){
  const records=[];
  for(let division=1;division<=c.count;division++){
    const sheet=c.book.getSheetByName('Division '+division);if(!sheet)throw new Error('Division '+division+' licence connection is missing.');
    sheet.getRange('A3:C46').getDisplayValues().filter(r=>r[0]).forEach(r=>records.push({division:division,driver:r[0],points:r[1],seconds:r[2]}));
  }
  const bans=c.book.getSheetByName('Outstanding Bans'),entrants=c.book.getSheetByName('Season Entrants'),calendar=c.book.getSheetByName('Calendar'),carry=c.book.getSheetByName('Time Penalty Carryovers');
  if(!bans||!entrants||!calendar)throw new Error('The season licence records are not connected.');
  const entryRows=entrants.getLastRow()>1?entrants.getRange(2,1,entrants.getLastRow()-1,2).getDisplayValues():[];
  const banRows=bans.getLastRow()>1?bans.getRange(2,1,bans.getLastRow()-1,7).getDisplayValues():[];
  const carryRows=carry&&carry.getLastRow()>1?carry.getRange(2,1,carry.getLastRow()-1,13).getDisplayValues():[];
  const events=calendar.getRange(2,1,Math.min(F1XL_CAPACITY.rounds,calendar.getLastRow()-1),4).getDisplayValues().filter(r=>r[0]).map(r=>({round:Number(r[0]),track:r[3]}));
  return teamPrincipalHubLicenceSummary_(roster,records,banRows,carryRows,entryRows,events);
}
function getTeamPrincipalHubLicences(input){ fapAssertEntry_('getTeamPrincipalHubLicences');
  const requested=fapPrincipalTeam_(input&&input.season,input&&input.team),setup=teamPrincipalHubTicketRoster_(input&&input.season,requested);
  return Object.assign({ok:true,season:setup.season,team:setup.team,refreshedAt:new Date().toISOString()},teamPrincipalHubLicenceData_({book:setup.book,count:setup.count},setup.drivers));
}

function teamPrincipalHubTickets_(season,team,drivers){
  try{
    const context=openTicketProcessingContext_(),names={};drivers.forEach(d=>names[teamPrincipalHubKey_(d.name)]=true);
    const rounds=ticketSheetRows_(context.spreadsheet.getSheetByName(F1XL_TICKET_SEASONS.rounds),13).map(ticketRoundResponse_).filter(r=>String(r.season)===String(season)&&r.sheetName),tickets=[];
    // One bounded read per round. Do not construct the head steward workspace,
    // validate every connection, or include private judgements/admin notes.
    rounds.forEach(round=>{
      const sheet=context.spreadsheet.getSheetByName(round.sheetName);if(!sheet)return;
      sheet.getRange(2,1,F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow-1,75).getDisplayValues().forEach(v=>{
        if(!v[1]||!(names[teamPrincipalHubKey_(v[2])]||names[teamPrincipalHubKey_(v[4])]||teamPrincipalHubKey_(v[3])===teamPrincipalHubKey_(team)||teamPrincipalHubKey_(v[5])===teamPrincipalHubKey_(team)))return;
        tickets.push({round:round.round,track:round.track,state:round.state,caseId:v[72],ticketNumber:v[0],division:v[1],submitter:v[2],offender:v[4],description:v[6],evidence:v.slice(7,11),defenceComments:v[11],defenceEvidence:v.slice(12,16),appealed:v[42],appealDescription:v[43],appealEvidence:v.slice(44,47),session:v[74]});
      });
    });
    return {tickets:tickets.sort((a,b)=>b.round-a.round||Number(a.division)-Number(b.division)||Number(a.ticketNumber)-Number(b.ticketNumber)),issue:''};
  }catch(error){return {tickets:[],issue:'Weekly tickets could not be loaded. Refresh to retry.'};}
}
function teamPrincipalHubPendingTickets_(team,drivers){
  const names={};drivers.forEach(function(driver){names[teamPrincipalHubKey_(driver.name)]=true;});
  return getTicketSubmissions(true).submissions.filter(function(ticket){return names[teamPrincipalHubKey_(ticket.fromDriver)]||names[teamPrincipalHubKey_(ticket.againstDriver)]||teamPrincipalHubKey_(ticket.fromTeam)===teamPrincipalHubKey_(team)||teamPrincipalHubKey_(ticket.againstTeam)===teamPrincipalHubKey_(team);}).map(function(ticket){return {id:String(ticket.sourceSheetId||'')+'/'+ticket.submissionRevision,received:ticket.received,division:ticket.division,submitter:ticket.fromDriver,offender:ticket.againstDriver,description:ticket.description,evidence:ticket.evidence,type:ticket.type,session:ticket.session||''};});
}
/** A ticket-inbox refresh deliberately avoids standings, licences, calendar and
 * historical ticket workspaces. It still resolves the principal's team and
 * current roster server-side; browser-supplied driver names are never trusted. */
function teamPrincipalHubTicketRoster_(season,requested){
  season=seasonPlanningSeason_(season);
  const team=fapPrincipalTeam_(season,requested),book=seasonPlanningBook_(season),start=book.getSheetByName('Start Here');
  if(!start||String(start.getRange('I7').getDisplayValue()).trim()!=='Active')throw new Error('Open an active season to check the ticket inbox.');
  const count=Number(start.getRange('B5').getValue());
  if(!Number.isInteger(count)||count<1||count>F1XL_CAPACITY.divisions)throw new Error('Check the active division count in the Master.');
  const teams=book.getSheetByName('Teams & Principals'),lineups=book.getSheetByName('Division Line-ups');
  if(!teams||!lineups)throw new Error('The active Season Master is missing current team or line-up data.');
  const teamRows=teams.getRange(2,1,F1XL_CAPACITY.teams,8).getDisplayValues(),selected=teamRows.find(function(row){return row[5]==='Full team'&&teamPrincipalHubKey_(row[0])===teamPrincipalHubKey_(team);});
  if(!selected)throw new Error('The assigned team is not configured in this active season. Ask F1XL to check the team assignment.');
  const values=lineups.getRange(6,1,count*30,11).getDisplayValues(),drivers=[];
  for(let division=1;division<=count;division++)values.slice((division-1)*30,(division-1)*30+24).forEach(function(row){
    if(row[1]&&teamPrincipalHubKey_(row[4])===teamPrincipalHubKey_(selected[0]))drivers.push({name:teamPrincipalHubText_(row[1]),division:division,tier:teamPrincipalHubText_(row[5])});
  });
  return {season:season,team:teamPrincipalHubText_(selected[0]),drivers:drivers,book:book,count:count};
}
function getTeamPrincipalHubTicketInbox(input){ fapAssertEntry_('getTeamPrincipalHubTicketInbox');
  const requested=fapPrincipalTeam_(input&&input.season,input&&input.team),context=teamPrincipalHubTicketRoster_(input&&input.season,requested);
  const response={ok:true,season:context.season,team:context.team,pendingTickets:null,inboxIssue:'',refreshedAt:new Date().toISOString()};
  try{response.pendingTickets=teamPrincipalHubPendingTickets_(context.team,context.drivers);}catch(error){response.inboxIssue='New submissions could not be checked. Use Refresh submissions to retry.';}
  return response;
}
/** Processed ticket history is deliberately loaded only when the principal opens
 * Tickets & licence. Reading every historical ticket workspace on the overview
 * made an otherwise small team dashboard look as though it had stalled. */
function getTeamPrincipalHubWeeklyTickets(input){ fapAssertEntry_('getTeamPrincipalHubWeeklyTickets');
  const requested=fapPrincipalTeam_(input&&input.season,input&&input.team),season=seasonPlanningSeason_(input&&input.season),setup=teamPrincipalHubSetup_(season,requested,false),ticketData=teamPrincipalHubTickets_(season,setup.selected.team,setup.roster);
  return {ok:true,season:season,team:setup.selected.team,tickets:ticketData.tickets,issue:ticketData.issue,refreshedAt:new Date().toISOString()};
}
function getTeamPrincipalHubOverviewStats(input){ fapAssertEntry_('getTeamPrincipalHubOverviewStats');
  const requested=fapPrincipalTeam_(input&&input.season,input&&input.team),season=seasonPlanningSeason_(input&&input.season),setup=teamPrincipalHubSetup_(season,requested,false),standings=teamPrincipalHubStandings_(setup.c),teamStandings=teamPrincipalHubCurrentStandings_(setup,standings);
  return {ok:true,season:season,team:setup.selected.team,standings:teamStandings,refreshedAt:new Date().toISOString()};
}
function teamPrincipalHubCurrentStandings_(setup,standings){
  return standings.map(division=>({division:division.division,team:division.teams.find(row=>teamPrincipalHubKey_(row.team)===teamPrincipalHubKey_(setup.selected.team))||null,issue:division.issue||'',drivers:setup.roster.filter(driver=>driver.division===division.division).map(driver=>{
    const row=division.drivers.find(row=>teamPrincipalHubKey_(driver.name)===teamPrincipalHubKey_(row.driver));
    return {driver:driver.name,tier:driver.tier,position:row&&row.hasResult!==false?row.position:'',points:row?row.points:'',hasResult:!!row&&row.hasResult!==false};
  })}));
}
/** Reuse the existing per-session points and permanent assignment intervals.
 * Requested only for one opened division; never scans round tabs or identities
 * on the initial dashboard load. Public totals still come from constructors. */
function teamPrincipalHubContributions_(team,current,entrants,table,assignments,official){
  const key=teamPrincipalHubKey_,identities={},namesById={},grouped={};
  function identity(name,id){if(!name||!id)return;const k=key(name);if(identities[k]&&identities[k]!==id)throw new Error('A driver name has conflicting permanent identities. Ask an admin to check it.');identities[k]=id;}
  entrants.forEach(row=>{identity(row[1],row[0]);if(row[0])namesById[row[0]]=row[1];});
  assignments.forEach(row=>identity(row[1],row[0]));
  const currentIds=new Set(current.map(row=>identities[key(row.name)]).filter(Boolean)),currentNames=new Set(current.map(row=>key(row.name)));
  const header=table[0]||[],pointsIndex=header.findIndex(h=>/^points$/i.test(teamPrincipalHubText_(h)));
  if(pointsIndex<0)throw new Error('The division points headings need checking.');
  const sessions=header.map((label,col)=>({label,col,round:Number((String(label).match(/^R(\d+)(?:\((?:s|R)\))?$/)||[])[1])})).filter(s=>s.col>pointsIndex&&s.round);
  if(!sessions.length)throw new Error('The per-session points columns need checking.');
  table.slice(1).filter(row=>row[2]).forEach(row=>{
    const id=identities[key(row[2])]||'',intervals=assignments.filter(a=>id?a[0]===id:key(a[1])===key(row[2]));
    const ever=intervals.length?intervals.some(a=>key(a[4])===key(team)):key(row[3])===key(team);
    if(!ever)return;
    const groupKey=id||'name:'+key(row[2]);
    const entry=grouped[groupKey]||(grouped[groupKey]={driverId:id,driver:namesById[id]||row[2],points:0,current:id?currentIds.has(id):currentNames.has(key(row[2]))});
    sessions.forEach(session=>{
      const matches=intervals.filter(a=>session.round>=Number(a[2])&&session.round<=Number(a[3]));
      if(matches.length>1)throw new Error('Overlapping driver assignments need checking before showing this breakdown.');
      const assigned=matches[0]?matches[0][4]:intervals.length?'':row[3];
      if(key(assigned)!==key(team))return;
      const text=teamPrincipalHubText_(row[session.col]),points=text===''?0:Number(text.replace(/,/g,''));
      if(!Number.isFinite(points))throw new Error('A scored session could not be read. Refresh after the sheets finish calculating.');
      entry.points+=points;
    });
  });
  current.forEach(row=>{const id=identities[key(row.name)]||'',k=id||'name:'+key(row.name);if(!grouped[k])grouped[k]={driverId:id,driver:row.name,points:0,current:true};});
  const drivers=Object.values(grouped).sort((a,b)=>Number(b.current)-Number(a.current)||b.points-a.points||a.driver.localeCompare(b.driver));
  const total=drivers.reduce((n,d)=>n+d.points,0),raw=Number(String(official==null?'':official).replace(/,/g,'')),officialPoints=official==null||official===''||!Number.isFinite(raw)?null:Math.floor(raw+0.000001);
  const matched=officialPoints!==null&&Math.abs(total-officialPoints)<0.000001;
  return {drivers:drivers,total:total,officialPoints:officialPoints,matched:matched,issue:matched?'':'The breakdown does not yet match the official team total. Ask an admin to check team adjustments or driver assignments.'};
}
function getTeamPrincipalHubContributions(input){ fapAssertEntry_('getTeamPrincipalHubContributions');
  const requested=fapPrincipalTeam_(input&&input.season,input&&input.team),season=seasonPlanningSeason_(input&&input.season),setup=teamPrincipalHubSetup_(season,requested,false),division=Number(input&&input.division);
  if(!Number.isInteger(division)||division<1||division>setup.c.count)throw new Error('Choose a division in this season.');
  const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(season,division));if(!id)throw new Error('The division standings are not connected.');
  const book=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(book);
  const sheet=book.getSheetByName('Driver Results NoSort'),assignmentSheet=book.getSheetByName('Driver Assignments'),teamSheet=book.getSheetByName('Constructors Standings NoSort'),entrantSheet=setup.c.book.getSheetByName('Season Entrants');
  if(!sheet||!assignmentSheet||!teamSheet||!entrantSheet)throw new Error('The division scoring or assignment sheets are not ready.');
  const table=sheet.getRange(4,1,Math.min(F1XL_CAPACITY.seasonDriversPerDivision+1,sheet.getMaxRows()-3),Math.min(F1XL_CAPACITY.rounds*2+38,sheet.getMaxColumns())).getDisplayValues();
  const assignments=assignmentSheet.getLastRow()>1?assignmentSheet.getRange(2,1,assignmentSheet.getLastRow()-1,8).getDisplayValues():[];
  const entrants=entrantSheet.getLastRow()>1?entrantSheet.getRange(2,1,entrantSheet.getLastRow()-1,2).getDisplayValues():[];
  const official=teamSheet.getRange(5,1,Math.min(F1XL_CAPACITY.teams,teamSheet.getMaxRows()-4),3).getDisplayValues().find(row=>teamPrincipalHubKey_(row[1])===teamPrincipalHubKey_(setup.selected.team));
  return Object.assign({ok:true,season:season,team:setup.selected.team,division:division,refreshedAt:new Date().toISOString()},teamPrincipalHubContributions_(setup.selected.team,setup.roster.filter(d=>d.division===division),entrants,table,assignments,official&&official[2]));
}
function getTeamPrincipalHubMarket(input){ fapAssertEntry_('getTeamPrincipalHubMarket');
  const requested=fapPrincipalTeam_(input&&input.season,input&&input.team),season=seasonPlanningSeason_(input&&input.season),setup=teamPrincipalHubSetup_(season,requested,true);
  return {ok:true,season:season,team:setup.selected.team,market:teamPrincipalHubMarketDetails_(setup),refreshedAt:new Date().toISOString()};
}
function teamPrincipalHubMarketDetails_(setup){
  const entrants=ticketSheetRows_(setup.c.book.getSheetByName('Season Entrants'),2),tracker=ticketSheetRows_(setup.c.book.getSheetByName('Applications Tracker'),19);
  const overrides=ticketSheetRows_(setup.c.book.getSheetByName('Placement Drivers'),9);
  return setup.market.map(driver=>{
    const matches=entrants.filter(r=>teamPrincipalHubKey_(r[1])===teamPrincipalHubKey_(driver.name)),id=matches.length===1?matches[0][0]:'';
    const tracked=tracker.find(r=>id&&r[1]===id),placement=overrides.find(r=>id&&r[0]===id);
    const commitment=teamPrincipalHubKey_((placement&&placement[8])||(tracked&&tracked[14]));
    const availability=/^(yes\b|full[ -]?time\b|ft$)/.test(commitment)?'Full-time':/^(no\b|part[ -]?time\b|pt$)/.test(commitment)?'Part-time':'Not recorded';
    return Object.assign({},driver,{driverId:id,availability:availability});
  });
}
/** Read-only public season statistics; membership is checked server-side before
 * opening division workbooks. Private placement notes and trial times stay private. */
function getTeamPrincipalHubDriverStats(input){ fapAssertEntry_('getTeamPrincipalHubDriverStats');
  const requested=fapPrincipalTeam_(input&&input.season,input&&input.team),season=seasonPlanningSeason_(input&&input.season),setup=teamPrincipalHubSetup_(season,requested,false);
  const driver=teamPrincipalHubMarketDetails_(setup).find(d=>d.driverId&&d.driverId===String(input.driverId||'')&&d.division===Number(input.division));
  if(!driver)throw new Error('This driver is no longer in the market. Refresh the driver market.');
  return teamPrincipalHubDriverStats_(setup,driver);
}
function teamPrincipalHubDriverStats_(setup,driver){
  const season=setup.c.season,divisions=[],issues=[],props=PropertiesService.getScriptProperties();
  for(let division=1;division<=setup.c.count;division++){
    try{
      const id=props.getProperty(divisionTemplatePropertyKey_(season,division));if(!id)throw new Error('Missing division');
      const book=SpreadsheetApp.openById(id),stats=book.getSheetByName('Driver Stats'),standings=book.getSheetByName('Driver Results NoSort');
      if(!stats||!standings)throw new Error('Missing statistics');
      const count=Math.min(F1XL_CAPACITY.seasonDriversPerDivision,Math.max(0,stats.getLastRow()-1));
      const rows=count?stats.getRange(2,1,count,23).getDisplayValues():[];
      const row=rows.find(r=>r[22]?r[22]===driver.driverId:teamPrincipalHubKey_(r[0])===teamPrincipalHubKey_(driver.name));if(!row)continue;
      const table=standings.getRange(4,1,Math.min(F1XL_CAPACITY.seasonDriversPerDivision+1,standings.getMaxRows()-3),Math.min(45,standings.getMaxColumns())).getDisplayValues();
      const pointsCol=table[0].findIndex(h=>/^points$/i.test(teamPrincipalHubText_(h))),standing=table.slice(1).find(r=>teamPrincipalHubKey_(r[2])===teamPrincipalHubKey_(row[0]));
      divisions.push({division:division,position:standing&&standing[0]||'',points:standing&&pointsCol>=0?standing[pointsCol]:'',wins:row[1],podiums:row[2],poles:row[3],averageFinish:row[4],averagePoints:row[5],averageGrid:row[6],sprintWins:row[10],started:row[16],finished:row[17],dns:row[18],dnf:row[19],dsq:row[20],reliability:row[21]});
    }catch(error){issues.push('Division '+division+' statistics could not be loaded.');}
  }
  return {season:season,team:setup.selected.team,driver:driver,divisions:divisions,issues:issues,refreshedAt:new Date().toISOString()};
}
function teamPrincipalHubTicketInput_(season,team){
  const c=activeSeasonContext_(season),teamRows=c.book.getSheetByName('Teams & Principals').getRange(2,1,F1XL_CAPACITY.teams,8).getDisplayValues(),selected=teamRows.filter(function(row){return row[5]==='Full team'&&teamPrincipalHubKey_(row[0])===teamPrincipalHubKey_(team);})[0];
  if(!selected)throw new Error('Choose a current full team.');
  const drivers=[],allDrivers=[];activeSeasonLines_(c).forEach(function(line){line.rows.forEach(function(row){if(row[1]){const item={name:teamPrincipalHubText_(row[1]),team:teamPrincipalHubText_(row[4]),division:line.division,tier:teamPrincipalHubText_(row[5])};allDrivers.push(item);if(teamPrincipalHubKey_(item.team)===teamPrincipalHubKey_(selected[0]))drivers.push(item);}if(row[7])allDrivers.push({name:teamPrincipalHubText_(row[7]),team:'Reserve',division:line.division,tier:teamPrincipalHubText_(row[10])});});});
  return {context:c,team:teamPrincipalHubText_(selected[0]),drivers:drivers,allDrivers:allDrivers};
}
function submitTeamPrincipalHubTicket(input){ fapAssertEntry_('submitTeamPrincipalHubTicket');
  input=Object.assign({},input,{team:fapPrincipalTeam_(input&&input.season,input&&input.team)});
  return withTicketSubmissionLock_(function(){
    const season=seasonPlanningSeason_(input&&input.season),setup=teamPrincipalHubTicketInput_(season,input&&input.team),division=Number(input&&input.division),from=teamPrincipalHubText_(input&&input.fromDriver),against=teamPrincipalHubText_(input&&input.againstDriver),description=teamPrincipalHubText_(input&&input.description),evidence=[input&&input.evidence1,input&&input.evidence2,input&&input.evidence3,input&&input.evidence4].map(teamPrincipalHubText_);
    if(!Number.isInteger(division)||division<1||division>setup.context.count)throw new Error('Choose a valid division.');
    const submitter=setup.drivers.filter(function(driver){return driver.division===division&&teamPrincipalHubKey_(driver.name)===teamPrincipalHubKey_(from);})[0],offender=setup.allDrivers.filter(function(driver){return driver.division===division&&teamPrincipalHubKey_(driver.name)===teamPrincipalHubKey_(against);})[0];
    if(!submitter)throw new Error('Choose one of this team’s current drivers in the selected division.');
    if(!offender)throw new Error('Choose a driver in the selected division.');
    if(teamPrincipalHubKey_(submitter.name)===teamPrincipalHubKey_(offender.name))throw new Error('The submitting and reported drivers must be different.');
    if(description.length<8||description.length>5000)throw new Error('Enter a concise incident description between 8 and 5,000 characters.');
    if(evidence.some(function(value){return value.length>1000;}))throw new Error('Keep each evidence link within 1,000 characters.');
    const inbox=openTicketSubmissionContext_();inbox.sourceSheet.getRange(inbox.sourceSheet.getLastRow()+1,1,1,12).setValues([[new Date(),'Ticket',division,submitter.name,setup.team,offender.name,offender.team,description,evidence[0],evidence[1],evidence[2],evidence[3]]]);
    refreshTicketSubmissions_(inbox);return {ok:true,message:'Ticket submitted to the shared steward inbox. It will appear here on the next update.'};
  });
}
function getTeamPrincipalHub(input){ fapAssertEntry_('getTeamPrincipalHub');
  input=Object.assign({},input,{team:fapPrincipalTeam_(input&&input.season,input&&input.team)});
  const season=seasonPlanningSeason_(input&&input.season),setup=teamPrincipalHubSetup_(season,input&&input.team,false),c=setup.c;
  const calendar=activeSeasonCalendarContext_(season),upcoming=calendar.races.filter(function(round){return round.status==='Scheduled';}),nextRound=upcoming.filter(function(round){return !round.locked;})[0]||upcoming[0]||null;
  const person=fapCurrentPerson_(),preview=!!(person&&(person.owner||fapPermission_(person,'team_preview')));
  return {ok:true,season:season,adminPreview:preview,masterUrl:preview?c.book.getUrl():'',teams:preview?setup.teams:[setup.selected],selectedTeam:setup.selected,roster:setup.roster,market:[],allDrivers:setup.allDrivers.map(d=>({name:d.name,team:d.team,division:d.division,tier:d.tier,role:d.role})),licences:[],bans:[],standings:[],tickets:[],pendingTickets:[],ticketIssue:'',upcoming:upcoming,nextRound:nextRound,refreshedAt:new Date().toISOString()};
}

/** Permanent, season-independent reference content in the existing TEST config.
 * Never reads results/entrants and never changes a season record. */
const TPH_LIBRARY = Object.freeze({circuits:{sheet:'Circuit Guides',headers:['ID','Location','Circuit','Country','Layout file','Circuit overview','Driving focus','Team preparation','Source URL','Updated']},handbook:{sheet:'TP Handbook',headers:['ID','Title','Guide','Related area','Updated']}});
function teamPrincipalHubLibraryBook_(){
  const id=PropertiesService.getScriptProperties().getProperty(F1XL_WEBSITE_CONFIG.propertyKey);
  if(!id)throw new Error('Connect Website Config before opening the reference library.');
  const book=SpreadsheetApp.openById(id);websiteConfigAssertTestWorkbook_(book);return book;
}
function teamPrincipalHubLibraryRows_(book,kind){
  const definition=TPH_LIBRARY[kind],sheet=book.getSheetByName(definition.sheet);
  if(!sheet)throw new Error(definition.sheet+' is not connected yet. Ask an admin to finish the reference library setup.');
  const rows=sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),definition.headers.length).getDisplayValues();
  if(JSON.stringify(rows[0])!==JSON.stringify(definition.headers))throw new Error(definition.sheet+' headers need checking.');
  const ids={};return rows.slice(1).filter(r=>r[0]).map(r=>{if(ids[r[0]])throw new Error('Duplicate reference ID: '+r[0]);ids[r[0]]=true;return {id:r[0],fields:r.slice(1),revision:referenceRevision_(r)};});
}
function getTeamPrincipalHubLibrary(input){ fapAssertEntry_('getTeamPrincipalHubLibrary');
  fapPrincipalTeam_(input&&input.season,input&&input.team);
  const book=teamPrincipalHubLibraryBook_();
  return {circuits:teamPrincipalHubLibraryRows_(book,'circuits'),handbook:teamPrincipalHubLibraryRows_(book,'handbook'),canEdit:fapPermission_(fapCurrentPerson_(),'maintenance')>=2};
}
function saveTeamPrincipalHubLibraryEntry(input){ fapAssertEntry_('saveTeamPrincipalHubLibraryEntry');
  fapRequire_(fapCurrentPerson_(),'maintenance',2);
  const kind=String(input&&input.kind||''),definition=TPH_LIBRARY[kind];
  if(!definition)throw new Error('Choose a reference entry.');
  if(!Array.isArray(input.fields)||input.fields.length!==definition.headers.length-1)throw new Error('The reference fields are incomplete.');
  const fields=input.fields.map(v=>String(v==null?'':v).trim());
  if(!fields[0]||fields.some(v=>v.length>5000))throw new Error('Enter a title and keep each field within 5,000 characters.');
  if(kind==='circuits'&&fields[3]&&!/^[a-z0-9 _-]+\.(?:png|webp|svg)$/i.test(fields[3]))throw new Error('Use a circuit layout filename from the existing images/tracks folder.');
  if(kind==='circuits'&&fields[7]&&!/^https:\/\/[^\s]+$/i.test(fields[7]))throw new Error('Use an HTTPS source link.');
  if(kind==='handbook'&&fields[2]&&!/^(tickets|market|overview|rules|circuits)$/.test(fields[2]))throw new Error('Choose a supported related area.');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const book=teamPrincipalHubLibraryBook_(),entries=teamPrincipalHubLibraryRows_(book,kind),entry=entries.find(e=>e.id===String(input.id||''));
    if(!entry)throw new Error('This entry no longer exists. Refresh the library.');
    if(entry.revision!==String(input.revision||''))throw new Error('This entry changed after you opened it. Close the editor and refresh before saving.');
    const sheet=book.getSheetByName(definition.sheet),ids=sheet.getRange(2,1,sheet.getLastRow()-1,1).getDisplayValues(),row=ids.findIndex(r=>r[0]===entry.id)+2;
    fields[fields.length-1]=Utilities.formatDate(new Date(),'Europe/London','dd/MM/yyyy');
    // Keep text literal even when a manually authored note begins with '='.
    sheet.getRange(row,2,1,fields.length).setValues([fields.map(v=>v.startsWith('=')?"'"+v:v)]);SpreadsheetApp.flush();
    const saved=teamPrincipalHubLibraryRows_(book,kind).find(e=>e.id===entry.id);return {kind:kind,entry:saved};
  }finally{lock.releaseLock();}
}
