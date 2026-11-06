/** Small, deliberate changes to an existing active TEST season. Never rebuilds divisions. */
const F1XL_ACTIVE_PLACEMENTS={name:'Active Driver Placements',headers:['Driver ID','Gamertag','Division','Tier','Role','Team','Placed at','Notes']};
function activeSeasonContext_(season){
  const c=intakeContext_(season);
  if(!c.active)throw new Error('Open an active season to make this change.');
  const start=c.book.getSheetByName('Start Here');c.count=Number(start.getRange('B5').getValue());c.rounds=Number(start.getRange('B4').getValue());
  if(!Number.isInteger(c.count)||c.count<1||c.count>F1XL_CAPACITY.divisions)throw new Error('Check the active division count in the Master.');
  if(!Number.isInteger(c.rounds)||c.rounds<1||c.rounds>F1XL_CAPACITY.rounds)throw new Error('Check the active round count in the Master.');
  return c;
}
function activeSeasonLines_(c){
  const sheet=c.book.getSheetByName('Division Line-ups');if(!sheet)throw new Error('Division Line-ups is missing.');
  return Array.from({length:c.count},function(_,i){const start=6+i*30;return {division:i+1,start:start,rows:sheet.getRange(start,1,24,11).getDisplayValues()};});
}
function activeSeasonPlacementContext_(season,movementOnly){
  const c=movementOnly?driverMovementContext_(season):activeSeasonContext_(season),tt=movementOnly?null:preseasonTTResponse_(preseasonTTContext_(season,c));
  c.lines=activeSeasonLines_(c);c.entries=c.book.getSheetByName('Season Entrants');
  if(!c.entries||JSON.stringify(c.entries.getRange('A1:H1').getDisplayValues()[0])!==JSON.stringify(['Driver ID','Driver','Nationality','Abbreviation','Team','Tier','Platform','Controller']))throw new Error('Season Entrants has an unrecognised layout.');
  c.entrantRows=c.entries.getRange(2,1,500,8).getDisplayValues();
  const ids={},names={};c.entrantRows.forEach(function(r){if(!r[0]&&!r[1])return;if(!r[0]||!r[1]||ids[r[0]]||names[intakeName_(r[1])])throw new Error('Resolve missing or duplicate identities in Season Entrants first.');ids[r[0]]=r;names[intakeName_(r[1])]=r;});
  c.trials=tt;if(!movementOnly)c.ledger=preseasonPlacementTable_(c.book,F1XL_ACTIVE_PLACEMENTS);
  c.licences=c.lines.map(function(d){const s=c.book.getSheetByName('Division '+d.division);if(!s)throw new Error('Division '+d.division+' licence tab is missing.');return {sheet:s,names:s.getRange(3,1,40,1).getDisplayValues()};});
  const assigned={};
  c.lines.forEach(function(d){d.rows.forEach(function(r){[[r[1],r[4],r[5]],[r[7],'Reserve',r[10]]].forEach(function(p){if(!p[0])return;const entrant=names[intakeName_(p[0])];if(!entrant)throw new Error(p[0]+' is in a line-up without a permanent Season Entrants identity.');if(!assigned[entrant[0]])assigned[entrant[0]]=[];assigned[entrant[0]].push({division:d.division,team:p[1],tier:p[2]});});});});
  if(!movementOnly)c.detailOptions=activeSeasonDetailOptions_(c);const teamSheet=c.book.getSheetByName('Teams & Principals');c.teamRows=teamSheet?teamSheet.getRange(2,1,F1XL_CAPACITY.teams,8).getDisplayValues():[];
  c.movements=typeof driverMovementTable_==='function'?driverMovementTable_(c.book):{rows:[]};c.assigned=assigned;
  c.movementRevision=intakeHash_([c.season,c.count,c.rounds,c.lines,c.entrantRows,c.teamRows,c.movements.rows,c.licences.map(function(l){return l.names;})]);
  if(!movementOnly)c.revision=intakeHash_([c.revision,tt.revision,c.lines,c.entrantRows,c.teamRows,c.detailOptions,c.ledger.rows,c.movements.rows,c.licences.map(function(l){return l.names;})]);return c;
}
function activeSeasonPlacementResponse_(c){
  const response={season:c.season,url:c.book.getUrl(),revision:c.revision,tracks:c.trials.tracks,
    divisions:c.lines.map(function(d){return {division:d.division,seats:d.rows.filter(function(r){return !r[1]&&r[4]&&/^Tier [12]$/.test(r[5]);}).map(function(r){return {team:r[4],tier:Number(r[5].slice(-1))};})};}),
    drivers:c.trials.entries.slice().sort(function(a,b){return (a.overall==null?Infinity:a.overall)-(b.overall==null?Infinity:b.overall)||a.gamertag.localeCompare(b.gamertag);}).map(function(t){const tracker=c.data.tracker.rows.find(function(r){return r[1]===t.driverId;});return Object.assign({},t,{commitment:tracker&&tracker[14]||'',assigned:c.assigned[t.driverId]||[]});}),message:''};
  const result=typeof driverMovementAugment_==='function'?driverMovementAugment_(c,response):response;
  result.detailOptions=c.detailOptions;
  result.drivers.forEach(function(d){const r=c.entrantRows.find(function(r){return r[0]===d.driverId;});d.details=r?{nationality:r[2],platform:r[6],controller:r[7]}:null;});
  result.principals=c.teamRows.filter(function(r){return r[0]&&r[5]==='Full team';}).map(function(r){return {team:r[0],principal:r[4]};});
  return result;
}
function getActiveSeasonPlacement(input){ fapAssertEntry_('getActiveSeasonPlacement');
  // Current rosters and movement history need no application or TT calculations.
  // Existing clients and allocation editors keep the complete revision/context.
  const phase=(name,work)=>typeof fapPerformancePhase_==='function'?fapPerformancePhase_(name,work):work();
  const load=()=>input.rosterOnly===true?phase('movement.load.roster',()=>driverMovementResponse_(input.season,true)):phase('movement.load.full',()=>activeSeasonPlacementResponse_(activeSeasonPlacementContext_(input.season)));
  return typeof fapPerformanceMeasure_==='function'?fapPerformanceMeasure_('movement.load',load):load();
}
function placeActiveSeasonDriver(input){ fapAssertEntry_('placeActiveSeasonDriver');
  return withApplicationLock_(function(){
    const c=activeSeasonPlacementContext_(input.season);intakeRequireRevision_(input,c);
    const driver=c.trials.entries.find(function(t){return t.driverId===input.driverId;});
    if(!driver)throw new Error('Link this driver through the applications and time trial queue before placement.');
    if(c.assigned[driver.driverId])throw new Error('This driver is already allocated. Existing roster transfers are a separate action.');
    const division=Number(input.division),tier=Number(input.tier),role=String(input.role||''),team=String(input.team||''),notes=String(input.notes||'').trim();
    const line=c.lines.find(function(d){return d.division===division;});
    if(!line||[1,2].indexOf(tier)<0||['Reserve','Team seat','Free agent'].indexOf(role)<0)throw new Error('Choose a division, tier and reserve or team seat.');
    if(notes.length>5000)throw new Error('Keep placement notes within 5,000 characters.');
    const tracker=c.data.tracker.rows.find(function(r){return r[1]===driver.driverId;});
    if(!tracker)throw new Error('Link this driver in the application tracker first.');
    if(tracker[14]==='No'&&role!=='Reserve')throw new Error('Part-time drivers must be assigned as reserves.');
    const occupied=line.rows.flatMap(function(r){return [r[1],r[7]].filter(Boolean);});
    // Division Data also retains drivers with saved results after they leave the line-up.
    const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,division));
    if(!id)throw new Error('This division workbook is not connected.');
    const book=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(book);assertSeasonWorkbookWritable_(c.season,book);
    const historical=book.getSheetByName('Data').getRange('A3:A46').getDisplayValues().flat().filter(Boolean);
    if(historical.some(function(n){return /^#/.test(n);}))throw new Error('Wait for the division driver list to finish loading before placement.');
    if(new Set(occupied.concat(historical,driver.gamertag).map(intakeName_)).size>40)throw new Error('This division’s existing workbook supports 40 drivers including reserves and former drivers. Capacity must be extended before adding another.');
    const slot=role==='Reserve'?line.rows.findIndex(function(r){return !r[7];}):line.rows.findIndex(function(r){return !r[1]&&r[4]===team&&r[5]==='Tier '+tier;});
    if(slot<0)throw new Error(role==='Reserve'?'The reserve area is full.':'That team/tier seat is occupied or unavailable. Refresh before choosing another.');
    if(role!=='Reserve'&&typeof driverMovementTeams_==='function'){const t=driverMovementTeams_(c.book).find(t=>t[0]===team);if(!t||(t[5]==='Free agent team'?'Free agent':'Team seat')!==role)throw new Error('Choose a matching team type.');}
    if(role!=='Reserve'&&typeof driverMovementCheckSeat_==='function'){const scan=driverMovementScan_(book,c.rounds);driverMovementCheckSeat_(c,{division:division,team:team,tier:'Tier '+tier,role:role},scan.last+1,driver.driverId);}
    if(role==='Reserve'&&team)throw new Error('Reserve placements do not have a team.');
    let index=c.entrantRows.findIndex(function(r){return r[0]===driver.driverId;});
    if(c.entrantRows.some(function(r){return r[0]!==driver.driverId&&intakeName_(r[1])===intakeName_(driver.gamertag);}))throw new Error('Another permanent profile has this gamertag. Resolve it first.');
    if(index>=0&&c.entrantRows[index][1]!==driver.gamertag)throw new Error('The saved season name differs from this application. Review the driver’s identity first.');
    if(index<0)index=c.entrantRows.findIndex(function(r){return [0,1,2,4,5,6,7].every(function(i){return !r[i];});});
    if(index<0)throw new Error('Season Entrants is full.');
    const licence=c.licences[division-1],names=licence.names.map(function(r){return r.slice();});
    if(names.some(function(r){return /^#/.test(r[0]);}))throw new Error('Wait for the licence names to finish loading before placement.');
    if(occupied.some(function(n){return !names.some(function(r){return intakeName_(r[0])===intakeName_(n);});}))throw new Error('The licence list is not in sync with the existing roster. Check it before adding a driver.');
    if(!names.some(function(r){return intakeName_(r[0])===intakeName_(driver.gamertag);})){const empty=names.findIndex(function(r){return !r[0];});if(empty<0)throw new Error('The existing licence list is full.');names[empty][0]=driver.gamertag;}
    let app={};const applications=c.data.applications.rows.filter(function(r){return r[1]===driver.driverId;});if(applications.length){try{app=JSON.parse(applications[applications.length-1][6]);}catch(e){throw new Error('Saved application details need checking.');}}
    const old=c.entrantRows[index],writes=[{range:c.entries.getRange(index+2,1,1,3),values:[[driver.driverId,driver.gamertag,old[2]||app.nationality||'']],text:true},
      {range:c.entries.getRange(index+2,5,1,4),values:[[role==='Reserve'?'Reserve':team,'Tier '+tier,old[6]||tracker[12]||app.platform||'',old[7]||tracker[13]||app.controller||'']],text:true},
      // Pin existing licence row identities before the live roster formula can reorder them.
      {range:licence.sheet.getRange(3,1,40,1),values:names,text:true}];
    const lines=c.book.getSheetByName('Division Line-ups'),row=line.start+slot;
    writes.push({range:lines.getRange(row,role==='Reserve'?8:2),values:[[driver.gamertag]],text:true});
    if(role==='Reserve')writes.push({range:lines.getRange(row,11),values:[['Tier '+tier]],text:true});
    if(typeof driverMovementRetain_==='function')driverMovementRetain_(book,driver.gamertag,role==='Reserve'?'Reserve':team,'Tier '+tier,writes);
    let ledger=c.ledger.sheet;if(!ledger)ledger=c.book.insertSheet(F1XL_ACTIVE_PLACEMENTS.name);
    const records=[F1XL_ACTIVE_PLACEMENTS.headers].concat(c.ledger.rows,[[driver.driverId,driver.gamertag,division,tier,role,team,new Date().toISOString(),notes]]);
    if(records.length>ledger.getMaxRows())ledger.insertRowsAfter(ledger.getMaxRows(),records.length-ledger.getMaxRows());
    writes.push({range:ledger.getRange(1,1,records.length,8),values:records,text:true});
    // Application answers can be more descriptive than the manual dropdown options.
    // Match preseason preparation: preserve those answers and retain dropdown suggestions.
    const detailRange=c.entries.getRange(index+2,7,1,2),detailRules=detailRange.getDataValidations();
    detailRange.setDataValidations(detailRules.map(function(row){return row.map(function(rule){return rule?rule.copy().setAllowInvalid(true).build():null;});}));
    try{intakeCommit_(writes);}catch(error){detailRange.setDataValidations(detailRules);throw error;}
    const cache=CacheService.getScriptCache();cache.remove(resultsEntryDivisionCacheKey_({season:c.season,division:division}));
    for(let r=1;r<=c.rounds;r++)cache.remove(resultsEntryRoundCacheKey_({season:c.season,division:division},'R'+r));
    const result=activeSeasonPlacementResponse_(activeSeasonPlacementContext_(c.season));result.message=driver.gamertag+' placed in Division '+division+', Tier '+tier+(role==='Reserve'?' reserves.':' · '+team+'.');return testLaunchAfterSave_(c.season,{roster:[division],licences:true},result);
  });
}

function activeSeasonDate_(value){
  if(value instanceof Date)return Utilities.formatDate(value,'Europe/London','yyyy-MM-dd');
  const s=String(value||'').trim(),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):s;
}
function activeSeasonCalendarContext_(season){
  const c=activeSeasonContext_(season);c.calendar=c.book.getSheetByName('Calendar');
  const header=c.calendar.getRange('E1').getDisplayValue(),status=c.calendar.getRange(2,5,c.rounds,1).getDisplayValues().flat();
  if(header&&header!=='Status'||status.some(function(s){return s&&s!=='Scheduled'&&s!=='Cancelled';}))throw new Error('Calendar column E contains other information. Review it before enabling calendar changes.');
  c.rows=c.calendar.getRange(2,1,c.rounds,4).getValues();
  c.races=c.rows.map(function(r,i){if(Number(r[0])!==i+1)throw new Error('Calendar round numbering needs checking.');return {round:i+1,format:String(r[1]),date:activeSeasonDate_(r[2]),track:String(r[3]),status:status[i]||'Scheduled',locked:false};});
  c.sources=[];c.divisionBooks=[];
  for(let d=1;d<=c.count;d++){
    const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(c.season,d));if(!id)throw new Error('Division '+d+' is not connected.');
    const b=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(b);assertSeasonWorkbookWritable_(c.season,b);c.divisionBooks.push(b);
    c.races.forEach(function(r){const sheet=b.getSheetByName('R'+r.round);if(!sheet)throw new Error('Division '+d+' is missing R'+r.round+'.');
      const values=resultsEntryRoundValues_(sheet),type=String(values[6]&&values[6][0]||''),sprint=/sprint/i.test(type),starts=/^(early|legacy)\s+sprint/i.test(type)?[9,37,94]:sprint?[9,37,66,94]:[9,37];
      const inputs=starts.map(function(start){return values.slice(start-1,start+23).map(function(row){return row.slice(1,7);});});
      // Any named driver or entered time is protected, including a partially entered round.
      const used=inputs.some(function(rows){return rows.some(function(row){return row[2]||row[4]||row[5];});});
      if(used)r.locked=true;c.sources.push([d,r.round,inputs,values[3]&&values[3][1]||'']);
    });
  }
  c.revision=intakeHash_([c.rows,status,c.sources,c.count]);return c;
}
function activeSeasonCalendarResponse_(c){return {season:c.season,url:c.book.getUrl(),revision:c.revision,rounds:c.races,message:''};}
function getActiveSeasonCalendar(input){ fapAssertEntry_('getActiveSeasonCalendar');return activeSeasonCalendarResponse_(activeSeasonCalendarContext_(input.season));}
function saveActiveSeasonCalendar(input){ fapAssertEntry_('saveActiveSeasonCalendar');return withApplicationLock_(function(){
  const c=activeSeasonCalendarContext_(input.season);intakeRequireRevision_(input,c);
  if(!Array.isArray(input.rounds)||input.rounds.length!==c.rounds)throw new Error('Keep the existing rounds. Use Cancelled to shorten the season.');
  const writes=[],dates=[],changedRounds=[],direct=testLaunchRecord_(c.season).sourceMode===F1XL_DIRECT_SOURCE_MODE;
  input.rounds.forEach(function(r,i){const old=c.races[i];if(Number(r.round)!==old.round)throw new Error('Keep the saved round numbers.');
    const date=String(r.date||'').trim(),track=String(r.track||'').trim(),status=String(r.status||'');seasonPlanningDate_(date);
    if(!track||track.length>100||/^[=+@-]/.test(track)||['Scheduled','Cancelled'].indexOf(status)<0)throw new Error('Enter a track and choose Scheduled or Cancelled for every round.');
    const changed=date!==old.date||track!==old.track||status!==old.status;
    if(changed&&old.locked)throw new Error('R'+old.round+' already has entries in a division. Historical corrections must be handled separately.');
    if(status==='Scheduled'){if(dates.length&&date<=dates[dates.length-1])throw new Error('Scheduled race dates must stay in round order, on different days.');dates.push(date);}
    if(changed){changedRounds.push(old.round);writes.push({range:c.calendar.getRange(i+2,3,1,3),values:[[date,track,status]],text:true});
      if(status!==old.status&&!direct)c.divisionBooks.forEach(function(b){writes.push({range:b.getSheetByName('R'+old.round).getRange('B4'),values:[[status==='Cancelled'?'Yes':'']],text:true});});
    }
  });
  if(!writes.length)throw new Error('There are no calendar changes to save.');
  const overrides={};input.rounds.forEach(function(r,i){if(i)overrides[i+1]=String(r.date).trim();});
  // The saved planning reader still consumes every calendar date, including cancellations.
  seasonPlanningNormalise_(Object.assign({},c.plan,{start:String(input.rounds[0].date).trim(),raceOverrides:overrides}));
  writes.push({range:c.calendar.getRange('E1'),values:[['Status']],text:true});intakeCommit_(writes);
  const cache=CacheService.getScriptCache();for(let d=1;d<=c.count;d++){cache.remove(resultsEntryDivisionCacheKey_({season:c.season,division:d}));for(let r=1;r<=c.rounds;r++)cache.remove(resultsEntryRoundCacheKey_({season:c.season,division:d},'R'+r));}
  const result=activeSeasonCalendarResponse_(activeSeasonCalendarContext_(c.season));result.message='Calendar saved. Existing round sheets and results are retained.';return testLaunchAfterSave_(c.season,{calendar:changedRounds},result);
});}

/** These fields are season inputs. Division imports remain formulas; saved races are untouched. */
function activeSeasonDetailOptions_(c){
  const s=c.book.getSheetByName('Reference Snapshot');
  const options={};[['nationality','R2:R500',2],['platform','BM2:BM100',6],['controller','BN2:BN100',7]].forEach(function(item){
    options[item[0]]=Array.from(new Set((s?s.getRange(item[1]).getDisplayValues().flat():[]).concat(c.entrantRows.map(function(r){return r[item[2]];})).filter(function(v){return v&&!/^#/.test(v);}))).sort();
  });return options;
}
function activeSeasonDetailText_(value){
  const text=String(value==null?'':value).trim();
  if(text.length>100||/[\x00-\x1f]/.test(text)||/^[=+@]/.test(text))throw new Error('Use a plain name or value, up to 100 characters.');
  return text;
}
function activeSeasonInputWrite_(range,values){
  if(range.getFormulas().some(function(r){return r.some(Boolean);}))throw new Error('The input contains a manual formula. Review it in the Master before replacing it. Nothing was changed.');
  return {range:range,values:values,text:true};
}
function activeSeasonClearDetailCaches_(c){
  const cache=CacheService.getScriptCache();
  for(let d=1;d<=c.count;d++){
    cache.remove(resultsEntryDivisionCacheKey_({season:c.season,division:d}));
    for(let r=1;r<=c.rounds;r++)cache.remove(resultsEntryRoundCacheKey_({season:c.season,division:d},'R'+r));
  }
}
function saveActiveSeasonDriverDetails(input){ fapAssertEntry_('saveActiveSeasonDriverDetails');return withApplicationLock_(function(){
  const c=activeSeasonPlacementContext_(input.season);intakeRequireRevision_(input,c);
  const index=c.entrantRows.findIndex(function(r){return r[0]===input.driverId;});
  if(index<0)throw new Error('Place this driver first to create their season entrant record.');
  const values={};['nationality','platform','controller'].forEach(function(key){
    const value=activeSeasonDetailText_(input[key]);
    if(value&&c.detailOptions[key].indexOf(value)<0)throw new Error('Choose '+key+' from this season’s reference list.');values[key]=value;
  });
  intakeCommit_([activeSeasonInputWrite_(c.entries.getRange(index+2,3),[[values.nationality]]),activeSeasonInputWrite_(c.entries.getRange(index+2,7,1,2),[[values.platform,values.controller]])]);
  activeSeasonClearDetailCaches_(c);
  const result=activeSeasonPlacementResponse_(activeSeasonPlacementContext_(c.season));
  result.message='Driver details saved to the Master.';return testLaunchAfterSave_(c.season,{roster:Array.from({length:c.count},(_,i)=>i+1)},result);
});}
function saveActiveSeasonPrincipals(input){ fapAssertEntry_('saveActiveSeasonPrincipals');return withApplicationLock_(function(){
  const c=activeSeasonPlacementContext_(input.season);intakeRequireRevision_(input,c);
  const sheet=c.book.getSheetByName('Teams & Principals');
  if(!sheet||sheet.getRange('A1').getDisplayValue()!=='Team'||sheet.getRange('E1:F1').getDisplayValues()[0].join('|')!=='Team Principal|Team Type')throw new Error('Teams & Principals has an unrecognised layout. Nothing was changed.');
  const full=c.teamRows.filter(function(r){return r[0]&&r[5]==='Full team';}),rows=input.principals;
  if(!full.length||!Array.isArray(rows)||rows.length!==full.length||new Set(full.map(function(r){return r[0];})).size!==full.length||new Set(rows.map(function(r){return r.team;})).size!==full.length)throw new Error('Refresh the current full-team list before saving.');
  const names=new Set(),writes=[];
  full.forEach(function(team){
    const row=rows.find(function(r){return r.team===team[0];});if(!row)throw new Error('The full-team list changed. Refresh before saving.');
    const name=activeSeasonDetailText_(row.principal),key=intakeName_(name);
    if(key&&names.has(key))throw new Error('A principal can represent only one full team. Check '+name+'.');if(key)names.add(key);
    if(name!==team[4])writes.push(activeSeasonInputWrite_(sheet.getRange(c.teamRows.indexOf(team)+2,5),[[name]]));
  });
  intakeCommit_(writes);activeSeasonClearDetailCaches_(c);
  const result=activeSeasonPlacementResponse_(activeSeasonPlacementContext_(c.season));
  result.message='Team principals saved to the Master. Driver seats are unchanged.';return testLaunchAfterSave_(c.season,{roster:Array.from({length:c.count},(_,i)=>i+1)},result);
});}
