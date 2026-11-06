/**
 * Seasonal division workbook.
 *
 * The existing workbook remains the calculation engine. This service exposes
 * only its current manual inputs and reads calculated tabs without rewriting
 * their formulas or changing their hidden/visible state.
 */
const F1XL_DIVISION_DATA_SOURCE = Object.freeze({
  spreadsheetId: '1cUtBl-R9lbAeNf9Ctlo5AgKr0B7XXJ6OayCqCjw9280',
  dataSheetName: 'Data',
  calendarSheetName: 'Race Calendar',
  cacheSeconds: 120,
  overviewCacheKey: 'F1XL_DIVISION_DATA_OVERVIEW_V1',
  setupCacheKey: 'F1XL_DIVISION_DATA_SETUP_V1',
  roundCachePrefix: 'F1XL_DIVISION_DATA_ROUND_V1_',
  viewCachePrefix: 'F1XL_DIVISION_DATA_VIEW_V1_'
});

const F1XL_DIVISION_CALCULATED_VIEWS = Object.freeze({
  'Race Calendar': 'A1:F23',
  'Driver Stats Calc Sheet': 'A1:BS45',
  'Driver Results NoSort': 'A1:BN45',
  'Driver License': 'A1:DA46',
  'Driver Stats': 'A1:AD45',
  'Team Stats Calc Sheet': 'A1:AH13',
  'Constructors Standings NoSort': 'A1:Y20',
  'Driver Results': 'A1:AP45',
  'Constructors Results': 'A1:AJ30',
  'Constructors Results NoSort': 'A1:AH30',
  'Constructors Standings': 'A1:Z20',
  'Grand Prix Overview': 'A1:V25',
  'Driver Lineups': 'A1:R28'
});

function getDivisionDataInitial(forceRefresh) { fapAssertEntry_('getDivisionDataInitial');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) {
    cache.remove(F1XL_DIVISION_DATA_SOURCE.overviewCacheKey);
    cache.remove(F1XL_DIVISION_DATA_SOURCE.setupCacheKey);
  }
  const cachedOverview = cache.get(F1XL_DIVISION_DATA_SOURCE.overviewCacheKey);
  const cachedSetup = cache.get(F1XL_DIVISION_DATA_SOURCE.setupCacheKey);
  if (cachedOverview && cachedSetup) return { overview:JSON.parse(cachedOverview), setup:JSON.parse(cachedSetup) };
  const context = openDivisionDataContext_();
  const overview = buildDivisionDataOverview_(context);
  const setup = buildDivisionSetup_(context);
  cache.put(F1XL_DIVISION_DATA_SOURCE.overviewCacheKey, JSON.stringify(overview), F1XL_DIVISION_DATA_SOURCE.cacheSeconds);
  cache.put(F1XL_DIVISION_DATA_SOURCE.setupCacheKey, JSON.stringify(setup), F1XL_DIVISION_DATA_SOURCE.cacheSeconds);
  return { overview:overview, setup:setup };
}

function getDivisionDataOverview(forceRefresh) { fapAssertEntry_('getDivisionDataOverview');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_DIVISION_DATA_SOURCE.overviewCacheKey);
  const cached = cache.get(F1XL_DIVISION_DATA_SOURCE.overviewCacheKey);
  if (cached) return JSON.parse(cached);
  const response = buildDivisionDataOverview_(openDivisionDataContext_());
  cache.put(F1XL_DIVISION_DATA_SOURCE.overviewCacheKey, JSON.stringify(response), F1XL_DIVISION_DATA_SOURCE.cacheSeconds);
  return response;
}

function getDivisionSetup(forceRefresh) { fapAssertEntry_('getDivisionSetup');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_DIVISION_DATA_SOURCE.setupCacheKey);
  const cached = cache.get(F1XL_DIVISION_DATA_SOURCE.setupCacheKey);
  if (cached) return JSON.parse(cached);
  const response = buildDivisionSetup_(openDivisionDataContext_());
  cache.put(F1XL_DIVISION_DATA_SOURCE.setupCacheKey, JSON.stringify(response), F1XL_DIVISION_DATA_SOURCE.cacheSeconds);
  return response;
}

function saveDivisionSetup(input) { fapAssertEntry_('saveDivisionSetup');
  return withDivisionDataLock_(function() {
    const context = openDivisionDataContext_();
    assertSeasonWorkbookWritable_(null, context.spreadsheet);
    const current = buildDivisionSetup_(context);
    if (divisionDataText_(input && input.revision) !== current.revision) {
      throw new Error('The division setup changed after you opened it. Refresh before saving.');
    }
    const data = context.dataSheet;
    const drivers = normaliseDivisionRows_(input && input.drivers, 38, 6);
    const lineups = normaliseDivisionRows_(input && input.lineups, 22, 4);
    const reserves = normaliseDivisionRows_(input && input.reserves, 22, 1);
    const retired = normaliseDivisionRows_(input && input.retired, 22, 1);
    const principals = normaliseDivisionRows_(input && input.principals, 11, 2);

    setDivisionValuesPreservingUnchanged_(data.getRange(3, 1, 38, 2), drivers.map(function(row) { return row.slice(0, 2); }));
    setDivisionValuesPreservingUnchanged_(data.getRange(3, 4, 38, 4), drivers.map(function(row) { return row.slice(2, 6); }));
    setDivisionValuesPreservingUnchanged_(data.getRange(2, 9, 22, 2), lineups.map(function(row) { return row.slice(0, 2); }));
    setDivisionValuesPreservingUnchanged_(data.getRange(2, 13, 22, 2), lineups.map(function(row) { return row.slice(2, 4); }));
    setDivisionValuesPreservingUnchanged_(data.getRange(3, 16, 22, 1), reserves);
    setDivisionValuesPreservingUnchanged_(data.getRange(3, 20, 22, 1), retired);
    setDivisionValuesPreservingUnchanged_(data.getRange(27, 10, 11, 2), principals);
    SpreadsheetApp.flush();
    clearDivisionDataCaches_();
    const response = buildDivisionSetup_(context);
    response.message = 'Division setup saved to the existing Data tab.';
    return response;
  });
}

function getDivisionRound(sheetName, forceRefresh) { fapAssertEntry_('getDivisionRound');
  const context = openDivisionDataContext_();
  const sheet = findDivisionRoundSheet_(context, sheetName);
  const cache = CacheService.getScriptCache();
  const cacheKey = divisionRoundCacheKey_(sheet.getName());
  if (forceRefresh === true) cache.remove(cacheKey);
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const response = buildDivisionRound_(context, sheet);
  cache.put(cacheKey, JSON.stringify(response), F1XL_DIVISION_DATA_SOURCE.cacheSeconds);
  return response;
}

function saveDivisionRound(input) { fapAssertEntry_('saveDivisionRound');
  return withDivisionDataLock_(function() {
    const context = openDivisionDataContext_();
    return saveDivisionRoundToContext_(context, input);
  });
}

/** Canonicalise only unambiguous spelling/case matches; never guess an alias. */
function divisionResultsCanonicalInput_(current,input){
  const names=Array.from(new Set(current.options.drivers)),sessions=current.sessions.map(function(definition){
    const supplied=(input.sessions||[]).find(s=>s&&s.id===definition.id);
    if(!supplied)throw new Error('The '+definition.label+' rows are missing. Refresh and try again.');
    const index=definition.kind==='qualifying'?2:1,seen={};
    const rows=normaliseDivisionRows_(supplied.rows,24,definition.kind==='qualifying'?6:5);
    rows.forEach(function(row){
      const entered=divisionDataText_(row[index]);if(!entered)return;
      const matches=names.filter(n=>n.toLowerCase()===entered.toLowerCase());
      if(matches.length!==1)throw new Error(definition.label+': choose '+entered+' from this division’s driver list before saving. If this is an old gamertag, select their current season name. No results have been changed.');
      const name=matches[0];if(seen[name])throw new Error(name+' appears twice in '+definition.label+'. Remove the duplicate before saving.');
      seen[name]=true;row[index]=name;
    });return {id:definition.id,rows:rows};
  });return Object.assign({},input,{sessions:sessions});
}
/** Importers must run this against the saved grid, not alias-normalised sources. */
function divisionResultsSavedIssues_(rows,names){
  const issues=driverMovementHistoryIssues_(rows),type=String(rows[6]&&rows[6][0]||''),starts=/^(early|legacy)\s+sprint/i.test(type)?[9,37,94]:/sprint/i.test(type)?[9,37,66,94]:[9,37];
  starts.forEach(start=>rows.slice(start-1,start+23).forEach((r,i)=>{
    if(r[3]&&names.indexOf(r[3])<0)issues.push({driver:r[3],row:start+i,session:'driver name',reason:'name does not exactly match the saved division driver list'});
  }));return issues;
}
/** Saved assignments belong to a driver/session, never a finishing-position
 * cell. Build this before writing names, while the old ownership is intact. */
function divisionResultsAssignmentPlan_(current,input){
  const key=v=>divisionDataText_(v).toLowerCase(),primary=current.sessions.find(s=>s.kind==='qualifying');
  const suppliedPrimary=(input.sessions||[]).find(s=>primary&&s.id===primary.id),primaryByName=new Map();
  (suppliedPrimary&&suppliedPrimary.rows||[]).forEach(r=>{if(key(r[2]))primaryByName.set(key(r[2]),r);});
  const oldPrimary=new Map((primary&&primary.rows||[]).filter(r=>r.driver).map(r=>[key(r.driver),r]));
  return current.sessions.map(function(session){
    const old=new Map(session.rows.filter(r=>r.driver).map(r=>[key(r.driver),r]));
    const supplied=input.sessions.find(s=>s.id===session.id),isPrimary=primary&&session.id===primary.id;
    const rows=supplied.rows.map(function(r,index){
      const name=r[session.kind==='qualifying'?2:1],k=key(name),saved=old.get(k),entry=primaryByName.get(k),prior=oldPrimary.get(k);
      const changedTeam=entry&&prior&&key(entry[3])!==key(prior.team);
      const team=!k?'':isPrimary?divisionDataText_(r[3]):changedTeam?divisionDataText_(entry[3]):divisionDataText_(saved&&saved.team||entry&&entry[3]||prior&&prior.team);
      const snapshot=saved&&key(saved.team)===key(team)?saved:prior&&key(prior.team)===key(team)?prior:null;
      // null means the normal history resolver must calculate a new seat.
      // A reserve deliberately has no team seat, even if the old cell did.
      const number=!k||key(team)==='reserve'?'':snapshot&&divisionDataText_(snapshot.number)?divisionDataText_(snapshot.number):null;
      return {driver:name,team:team,number:number,nationality:divisionDataText_(r[0]),derived:!isPrimary};
    });return {id:session.id,startRow:session.startRow,rows:rows};
  });
}
function saveDivisionRoundToContext_(context, input) {
  const measure=typeof fapPerformancePhase_==='function'?fapPerformancePhase_:function(name,work){return work();};
  assertSeasonWorkbookWritable_(null, context.spreadsheet);
  const sheet = findDivisionRoundSheet_(context, input && input.sheetName);
  const current = measure('results.read',function(){return buildDivisionRound_(context, sheet);});
  if (divisionDataText_(input && input.revision) !== current.revision) {
    throw new Error('This round changed after you opened it. Refresh before saving.');
  }
  input=divisionResultsCanonicalInput_(current,input);
  const assignmentPlan=divisionResultsAssignmentPlan_(current,input);
  const savedAssignments=typeof driverMovementAssignments_==='function'?driverMovementAssignments_(context.spreadsheet):[];
  if(typeof driverMovementRoundAssignment_==='function')(input.sessions||[]).forEach(function(session){(session.rows||[]).forEach(function(row){const name=divisionDataText_(row[/qualifying/i.test(session.id)?2:1]);if(!name)return;const a=driverMovementRoundAssignment_(context.spreadsheet,name,current.round,savedAssignments);if(a&&a.absent)throw new Error(name+' is not assigned to this division for R'+current.round+'. Check Driver Movements.');});});
  // Preserve formulas as well as inputs if post-save history validation fails.
  const restoreRange=sheet.getRange(1,1,Math.min(117,sheet.getMaxRows()),12),restoreValues=seasonPlanningValues_(restoreRange);
  measure('results.inputWrites',function(){
  divisionTemplateConfigureRoundDerivedInputs_(sheet, current.isSprint, current.isLegacySprint);
  const metadata = input && input.metadata ? input.metadata : {};
  setDivisionValuesPreservingUnchanged_(sheet.getRange('B2'), [[divisionDataText_(metadata.qualiWeather)]]);
  setDivisionValuesPreservingUnchanged_(sheet.getRange('E2'), [[divisionDataText_(metadata.raceWeather)]]);
  setDivisionValuesPreservingUnchanged_(sheet.getRange('B3'), [[divisionDataText_(metadata.safetyCars)]]);
  setDivisionValuesPreservingUnchanged_(sheet.getRange('E3'), [[divisionDataText_(metadata.redFlags)]]);
  setDivisionValuesPreservingUnchanged_(sheet.getRange('B4'), [[divisionDataText_(metadata.cancelled)]]);
  if (current.isSprint) {
    setDivisionValuesPreservingUnchanged_(sheet.getRange('H1:H4'), [
      [current.isLegacySprint ? '' : divisionDataText_(metadata.sprintQualiWeather)],
      [divisionDataText_(metadata.sprintRaceWeather)],
      [divisionDataText_(metadata.sprintSafetyCars)],
      [divisionDataText_(metadata.sprintRedFlags)]
    ]);
  }

  const suppliedSessions = Array.isArray(input && input.sessions) ? input.sessions : [];
  current.sessions.forEach(function(definition) {
    const supplied = suppliedSessions.find(function(item) { return item && item.id === definition.id; });
    if (!supplied) throw new Error('The ' + definition.label + ' rows are missing. Refresh and try again.');
    const rows = normaliseDivisionRows_(supplied.rows, 24, definition.kind === 'qualifying' ? 6 : 5);
    if (definition.kind === 'qualifying') {
      if (current.isSprint && !current.isLegacySprint && definition.id === 'qualifying') {
        setDivisionValuesPreservingUnchanged_(sheet.getRange(definition.startRow, 4, 24, 1), rows.map(function(row) { return [row[2]]; }));
        setDivisionValuesPreservingUnchanged_(sheet.getRange(definition.startRow, 6, 24, 2), rows.map(function(row) { return [row[4], row[5]]; }));
      } else {
        setDivisionValuesPreservingUnchanged_(sheet.getRange(definition.startRow, 4, 24, 4), rows.map(function(row) { return row.slice(2, 6); }));
      }
    } else {
      setDivisionValuesPreservingUnchanged_(sheet.getRange(definition.startRow, 4, 24, 1), rows.map(function(row) { return [row[1]]; }));
      setDivisionValuesPreservingUnchanged_(sheet.getRange(definition.startRow, 6, 24, 2), rows.map(function(row) { return [row[2], row[3]]; }));
      setDivisionValuesPreservingUnchanged_(sheet.getRange(definition.startRow, 10, 24, 1), rows.map(function(row) { return [row[4]]; }));
    }
  });
  // Replace the old row's frozen identity cells together. Otherwise a reordered
  // driver inherits the previous occupant's team and the trigger gives them
  // that team's number. New entries still use the normal qualifying lookup.
  assignmentPlan.forEach(function(session){
    sheet.getRange(session.startRow,2,24,4).setValues(session.rows.map(function(r,i){
      const row=session.startRow+i;
      return [r.nationality||'=IFERROR(VLOOKUP($D'+row+',Data!$A:$C,3,FALSE),"")',r.number===null?'':r.number,r.driver,
        r.team||(r.derived?divisionTemplateRoundTeamFormula_(row):'')];
    }));
  });
  });
  measure('results.recalculate',function(){SpreadsheetApp.flush();});

  // Script-written cells do not fire the spreadsheet's on-edit trigger. Freeze
  // the displayed team beside every entered driver, then run the same car-
  // number snapshot logic deliberately. Later line-up changes must not rewrite
  // the team or number attached to this completed round.
  measure('results.freezeTeams',function(){current.sessions.forEach(function(definition) {
    const driverValues = sheet.getRange(definition.startRow, 4, 24, 1).getDisplayValues();
    const teamRange = sheet.getRange(definition.startRow, 5, 24, 1);
    const teamDisplay = teamRange.getDisplayValues();
    const teamValues = teamRange.getValues();
    const teamFormulas = teamRange.getFormulas();
    teamRange.setValues(teamDisplay.map(function(row, index) {
      if (divisionDataText_(driverValues[index][0]) && divisionDataText_(row[0])) return [divisionDataText_(row[0])];
      return [teamFormulas[index][0] || teamValues[index][0]];
    }));
  });});
  measure('results.recalculate',function(){SpreadsheetApp.flush();});
  measure('results.freezeNumbers',function(){current.sessions.forEach(function(definition) {
    divisionTemplateRoundHistoryOnEdit({
      source:context.spreadsheet,
      range:sheet.getRange(definition.startRow, 5, 24, 1)
    });
    const plan=assignmentPlan.find(s=>s.id===definition.id),range=sheet.getRange(definition.startRow,3,24,1),resolved=range.getValues();
    // The trigger may use a later roster tier. Retain known historical seats,
    // and clear reserve/empty seats instead of its current-lineup fallback.
    range.setValues(plan.rows.map((r,i)=>[r.number===null?resolved[i][0]:r.number]));
  });});
  measure('results.recalculate',function(){SpreadsheetApp.flush();});
  const savedGrid=resultsEntryRoundValues_(sheet);
  let ownershipIssue=null;
  assignmentPlan.forEach(function(session){session.rows.forEach(function(expected,i){
    if(!expected.driver||ownershipIssue)return;
    const actual=savedGrid[session.startRow-1+i]||[];
    if(divisionDataText_(actual[3])!==expected.driver||(expected.team&&divisionDataText_(actual[4])!==expected.team)||(expected.number!==null&&divisionDataText_(actual[2])!==expected.number)){
      ownershipIssue={session:session.id,driver:expected.driver,reason:'did not retain their historical team and seat while saving'};
    }
  });});
  const historyIssue=ownershipIssue||divisionResultsSavedIssues_(savedGrid,current.options.drivers)[0];
  if(historyIssue){
    restoreRange.setValues(restoreValues);SpreadsheetApp.flush();clearDivisionDataCaches_(sheet.getName());
    throw new Error(sheet.getName()+' '+historyIssue.session+': '+historyIssue.driver+' '+(historyIssue.reason||'did not resolve to a saved team and seat number')+'. The previous round data was restored. Check their selected name and historical team, then save again.');
  }
  clearDivisionDataCaches_(sheet.getName());
  const response = measure('results.response',function(){return buildDivisionRound_(context, sheet);});
  response.message = sheet.getName() + ' saved. Existing formulas have recalculated and the entered teams and car numbers have been preserved for history.';
  return response;
}

function getDivisionCalculatedView(sheetName, forceRefresh) { fapAssertEntry_('getDivisionCalculatedView');
  const name = divisionDataText_(sheetName);
  const configuredRange = F1XL_DIVISION_CALCULATED_VIEWS[name];
  if (!configuredRange) throw new Error('Choose a recognised division workbook view.');
  const cache = CacheService.getScriptCache();
  const key = F1XL_DIVISION_DATA_SOURCE.viewCachePrefix + name.replace(/[^A-Za-z0-9_-]/g, '_');
  if (forceRefresh === true) cache.remove(key);
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  const context = openDivisionDataContext_();
  const sheet = context.spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error(name + ' could not be found.');
  const response = buildDivisionCalculatedView_(sheet, configuredRange);
  cache.put(key, JSON.stringify(response), F1XL_DIVISION_DATA_SOURCE.cacheSeconds);
  return response;
}

function openDivisionDataContext_() {
  const spreadsheet = SpreadsheetApp.openById(F1XL_DIVISION_DATA_SOURCE.spreadsheetId);
  const dataSheet = spreadsheet.getSheetByName(F1XL_DIVISION_DATA_SOURCE.dataSheetName);
  const calendarSheet = spreadsheet.getSheetByName(F1XL_DIVISION_DATA_SOURCE.calendarSheetName);
  if (!dataSheet || !calendarSheet) throw new Error('The division workbook is missing its Data or Race Calendar tab.');
  return { spreadsheet:spreadsheet, dataSheet:dataSheet, calendarSheet:calendarSheet };
}

function buildDivisionDataOverview_(context) {
  const sheets = context.spreadsheet.getSheets();
  const rounds = sheets.map(function(sheet) {
    const match = sheet.getName().match(/^R(\d+)$/i);
    if (!match) return null;
    const roundType = divisionDataText_(sheet.getRange('A7').getDisplayValue());
    const isSprint = /sprint/i.test(roundType);
    const isLegacySprint = /^(?:early|legacy)\s+sprint/i.test(roundType);
    const raceStart = isSprint ? 94 : 37;
    const entrants = sheet.getRange(raceStart, 4, 24, 1).getDisplayValues().filter(function(row) { return divisionDataText_(row[0]); }).length;
    return {
      sheetName: sheet.getName(),
      round: Number(match[1]),
      circuit: divisionDataText_(sheet.getRange('E1').getDisplayValue()),
      format: isLegacySprint ? 'Legacy Sprint' : isSprint ? 'Modern Sprint' : 'Standard',
      entrants: entrants,
      hidden: sheet.isSheetHidden()
    };
  }).filter(Boolean).sort(function(a, b) { return a.round - b.round; });
  const labelSheet = context.spreadsheet.getSheetByName('Driver Results') || context.spreadsheet.getSheetByName('Driver Results NoSort');
  const startSheet = context.spreadsheet.getSheetByName('Start Here');
  const divisionLabel = labelSheet
    ? divisionDataText_(labelSheet.getRange('A1').getDisplayValue())
    : (startSheet ? 'Division ' + divisionDataText_(startSheet.getRange('B4').getDisplayValue()) : 'Division');
  return {
    ok:true,
    sourceName:context.spreadsheet.getName(),
    divisionLabel:divisionLabel,
    refreshedAt:new Date().toISOString(),
    rounds:rounds,
    calculatedViews:Object.keys(F1XL_DIVISION_CALCULATED_VIEWS).map(function(name) {
      const sheet = context.spreadsheet.getSheetByName(name);
      return { name:name, hidden:sheet ? sheet.isSheetHidden() : true, available:!!sheet };
    }),
    notes:{ calendarLinked:true, licenceLinked:true, likelyLegacyTabs:['Driver Lineups'] }
  };
}

function buildDivisionSetup_(context) {
  const sheet = context.dataSheet;
  const driverDisplay = sheet.getRange(3, 1, 38, 7).getDisplayValues();
  const lineupDisplay = sheet.getRange(2, 9, 22, 6).getDisplayValues();
  const reserveDisplay = sheet.getRange(3, 16, 22, 4).getDisplayValues();
  const retiredDisplay = sheet.getRange(3, 20, 22, 1).getDisplayValues();
  const principalDisplay = sheet.getRange(27, 10, 11, 2).getDisplayValues();
  const inputValues = {
    drivers:driverDisplay.map(function(row) { return [row[0], row[1], row[3], row[4], row[5], row[6]].map(divisionDataText_); }),
    lineups:lineupDisplay.map(function(row) { return [row[0], row[1], row[4], row[5]].map(divisionDataText_); }),
    reserves:reserveDisplay.map(function(row) { return [divisionDataText_(row[0])]; }),
    retired:retiredDisplay.map(function(row) { return [divisionDataText_(row[0])]; }),
    principals:principalDisplay.map(function(row) { return row.map(divisionDataText_); })
  };
  const column = function(range) { return sheet.getRange(range).getDisplayValues().flat().map(divisionDataText_).filter(Boolean); };
  return {
    ok:true,
    refreshedAt:new Date().toISOString(),
    drivers:inputValues.drivers,
    lineups:inputValues.lineups,
    reserves:inputValues.reserves,
    retired:inputValues.retired,
    principals:inputValues.principals,
    calculated:{
      driverAbbreviations:driverDisplay.map(function(row) { return divisionDataText_(row[2]); }),
      lineupPlatform:lineupDisplay.map(function(row) { return divisionDataText_(row[2]); }),
      lineupController:lineupDisplay.map(function(row) { return divisionDataText_(row[3]); }),
      reservePlatform:reserveDisplay.map(function(row) { return divisionDataText_(row[1]); }),
      reserveController:reserveDisplay.map(function(row) { return divisionDataText_(row[2]); }),
      reserveTier:reserveDisplay.map(function(row) { return divisionDataText_(row[3]); })
    },
    options:{
      teams:column('V3:V14'),
      tiers:column('AB2:AB3'),
      platforms:column('AC2:AC4'),
      controllers:column('Y2:Y3'),
      nationalities:column('V25:V263')
    },
    revision:divisionDataRevision_(inputValues)
  };
}

function buildDivisionRound_(context, sheet) {
  // Read the round once. Only the same metadata/session cells below are exposed.
  const roundDisplay=sheet.getRange(1,1,Math.min(117,sheet.getMaxRows()),12).getDisplayValues();
  const cell=function(row,col){return divisionDataText_(roundDisplay[row-1]&&roundDisplay[row-1][col-1]);};
  const roundType = cell(7,1);
  const isSprint = /sprint/i.test(roundType);
  const isLegacySprint = /^(?:early|legacy)\s+sprint/i.test(roundType);
  const definitions = isLegacySprint
    ? [
        {id:'qualifying',label:'Qualifying',kind:'qualifying',startRow:9},
        {id:'sprintRace',label:'Sprint Race',kind:'race',startRow:37},
        {id:'race',label:'Feature Race',kind:'race',startRow:94}
      ]
    : isSprint
    ? [
        {id:'sprintQualifying',label:'Sprint Qualifying',kind:'qualifying',startRow:9},
        {id:'sprintRace',label:'Sprint Race',kind:'race',startRow:37},
        {id:'qualifying',label:'Qualifying',kind:'qualifying',startRow:66},
        {id:'race',label:'Race',kind:'race',startRow:94}
      ]
    : [
        {id:'qualifying',label:'Qualifying',kind:'qualifying',startRow:9},
        {id:'race',label:'Race',kind:'race',startRow:37}
      ];
  const metadata = {
    qualiWeather:cell(2,2), raceWeather:cell(2,5), safetyCars:cell(3,2), redFlags:cell(3,5), cancelled:cell(4,2),
    sprintQualiWeather:isSprint&&!isLegacySprint?cell(1,8):'', sprintRaceWeather:isSprint?cell(2,8):'',
    sprintSafetyCars:isSprint?cell(3,8):'', sprintRedFlags:isSprint?cell(4,8):''
  };
  const data = context.dataSheet;
  const detailByDriver = {};
  const driverDisplay=data.getRange(3,1,F1XL_CAPACITY.seasonDriversPerDivision,7).getDisplayValues();
  const weatherTyres=data.getRange('Z2:AA101').getDisplayValues();
  driverDisplay.forEach(function(row) {
    const driver = divisionDataText_(row[0]);
    if (!driver) return;
    detailByDriver[driver.toLowerCase()] = {
      driver:driver,
      nationality:divisionDataText_(row[2]),
      team:divisionDataText_(row[3]),
      tier:divisionDataText_(row[4]),
      number:''
    };
  });
  data.getRange(2, 9, F1XL_CAPACITY.raceEntries, 6).getDisplayValues().forEach(function(row) {
    const driver = divisionDataText_(row[1]);
    if (!driver) return;
    const key = driver.toLowerCase();
    const detail = detailByDriver[key] || { driver:driver, nationality:'', team:'', tier:'', number:'' };
    detail.number = divisionDataText_(row[0]);
    detail.team = divisionDataText_(row[4]) || detail.team;
    detail.tier = divisionDataText_(row[5]) || detail.tier;
    detailByDriver[key] = detail;
  });
  const roundAssignments=typeof driverMovementAssignments_==='function'?driverMovementAssignments_(context.spreadsheet):[];
  if(typeof driverMovementRoundAssignment_==='function')Object.keys(detailByDriver).forEach(function(key){const a=driverMovementRoundAssignment_(context.spreadsheet,detailByDriver[key].driver,Number(sheet.getName().slice(1)),roundAssignments);if(a&&!a.absent)Object.assign(detailByDriver[key],a);});
  const sessions = definitions.map(function(definition) {
    const values = roundDisplay.slice(definition.startRow-1,definition.startRow+23);
    if(values.length!==24)throw new Error('The '+definition.label+' block is incomplete. Restore the round layout before saving.');
    const rows = values.map(function(row, index) {
      const driver = divisionDataText_(row[3]);
      const detail = detailByDriver[driver.toLowerCase()] || {};
      if (definition.kind === 'qualifying') {
        return {
          sheetRow:definition.startRow + index,
          position:divisionDataText_(row[0]), nationality:divisionDataText_(row[1]) || divisionDataText_(detail.nationality), number:divisionDataText_(row[2]) || divisionDataText_(detail.number), driver:driver, team:divisionDataText_(row[4]),
          time:divisionDataText_(row[5]), tyre:divisionDataText_(row[6]), licencePoints:divisionDataText_(row[7]), licencePenalty:divisionDataText_(row[8])
        };
      }
      return {
        sheetRow:definition.startRow + index,
        position:divisionDataText_(row[0]), nationality:divisionDataText_(row[1]) || divisionDataText_(detail.nationality), number:divisionDataText_(row[2]) || divisionDataText_(detail.number), driver:driver, team:divisionDataText_(row[4]) || divisionDataText_(detail.team),
        stops:divisionDataText_(row[5]), gap:divisionDataText_(row[6]), points:divisionDataText_(row[7]), fastestLap:divisionDataText_(row[9]), licencePoints:divisionDataText_(row[10]), licencePenalty:divisionDataText_(row[11])
      };
    });
    return { id:definition.id,label:definition.label,kind:definition.kind,startRow:definition.startRow,rows:rows };
  });
  const revisionInputs = {
    metadata:metadata,
    sessions:sessions.map(function(session) {
      return { id:session.id, rows:session.rows.map(function(row) {
        return session.kind === 'qualifying'
          ? [row.nationality,row.number,row.driver,row.team,row.time,row.tyre]
          : [row.nationality,row.driver,row.stops,row.gap,row.fastestLap,row.team,row.number];
      }) };
    })
  };
  return {
    ok:true,
    sheetName:sheet.getName(),
    round:Number(sheet.getName().replace(/^R/i, '')),
    circuit:cell(1,5),
    isSprint:isSprint,
    isLegacySprint:isLegacySprint,
    format:isLegacySprint ? 'Legacy Sprint' : isSprint ? 'Modern Sprint' : 'Standard',
    refreshedAt:new Date().toISOString(),
    metadata:metadata,
    sessions:sessions,
    options:{
      weather:weatherTyres.slice(0,99).map(function(r){return divisionDataText_(r[1]);}).filter(Boolean),
      tyres:weatherTyres.slice(1).map(function(r){return divisionDataText_(r[0]);}).filter(Boolean),
      drivers:driverDisplay.map(function(r){return r[0];}).concat(data.getRange('P3:P26').getDisplayValues().flat()).map(divisionDataText_).filter(Boolean).filter(function(name){const a=typeof driverMovementRoundAssignment_==='function'?driverMovementRoundAssignment_(context.spreadsheet,name,Number(sheet.getName().slice(1)),roundAssignments):null;return !a||!a.absent;}),
      teams:(function() {
        const teams = data.getRange(3, 22, F1XL_CAPACITY.teams, 1).getDisplayValues().flat().map(divisionDataText_).filter(Boolean);
        if (teams.indexOf('Reserve') < 0) teams.push('Reserve');
        return teams;
      })(),
      driverDetails:Object.keys(detailByDriver).map(function(key) { return detailByDriver[key]; })
    },
    revision:divisionDataRevision_(revisionInputs)
  };
}

function buildDivisionCalculatedView_(sheet, configuredRange) {
  let values = sheet.getRange(configuredRange).getDisplayValues().map(function(row) { return row.map(divisionDataText_); });
  let lastRow = values.length - 1;
  while (lastRow >= 0 && !values[lastRow].some(Boolean)) lastRow -= 1;
  values = values.slice(0, lastRow + 1);
  let lastColumn = 0;
  values.forEach(function(row) {
    for (let index = row.length - 1; index >= 0; index -= 1) {
      if (row[index]) { lastColumn = Math.max(lastColumn, index + 1); break; }
    }
  });
  values = values.map(function(row) { return row.slice(0, lastColumn); });
  return {
    ok:true,
    sheetName:sheet.getName(),
    hidden:sheet.isSheetHidden(),
    refreshedAt:new Date().toISOString(),
    columns:Array.from({length:lastColumn}, function(_, index) { return divisionColumnLetter_(index + 1); }),
    rows:values
  };
}

function findDivisionRoundSheet_(context, sheetName) {
  const name = divisionDataText_(sheetName);
  if (!/^R\d+$/i.test(name)) throw new Error('Choose a valid round tab.');
  const sheet = context.spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error(name + ' could not be found.');
  return sheet;
}

function normaliseDivisionRows_(rows, rowCount, columnCount) {
  const source = Array.isArray(rows) ? rows : [];
  if (source.length !== rowCount) throw new Error('The submitted row count no longer matches the Sheet. Refresh and try again.');
  return source.map(function(row) {
    const values = Array.isArray(row) ? row.slice(0, columnCount) : [];
    while (values.length < columnCount) values.push('');
    return values.map(divisionDataText_);
  });
}

/**
 * Rewrites a logical input block without turning unchanged formulas or numbers
 * into plain text. This matters in the future-round templates, where some
 * apparently blank cells are actually lookup formulas for reserve drivers.
 */
function setDivisionValuesPreservingUnchanged_(range, submittedValues) {
  const currentDisplay = range.getDisplayValues();
  const currentValues = range.getValues();
  const currentFormulas = range.getFormulas();
  const output = submittedValues.map(function(row, rowIndex) {
    return row.map(function(value, columnIndex) {
      if (divisionDataText_(value) === divisionDataText_(currentDisplay[rowIndex][columnIndex])) {
        return currentFormulas[rowIndex][columnIndex] || currentValues[rowIndex][columnIndex];
      }
      return divisionDataText_(value);
    });
  });
  range.setValues(output);
}

function divisionColumnLetter_(column) {
  let value = column;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function divisionRoundCacheKey_(sheetName) {
  return F1XL_DIVISION_DATA_SOURCE.roundCachePrefix + sheetName.replace(/[^A-Za-z0-9_-]/g, '_');
}

function clearDivisionDataCaches_(roundName) {
  const cache = CacheService.getScriptCache();
  cache.remove(F1XL_DIVISION_DATA_SOURCE.overviewCacheKey);
  cache.remove(F1XL_DIVISION_DATA_SOURCE.setupCacheKey);
  if (roundName) cache.remove(divisionRoundCacheKey_(roundName));
  Object.keys(F1XL_DIVISION_CALCULATED_VIEWS).forEach(function(name) {
    cache.remove(F1XL_DIVISION_DATA_SOURCE.viewCachePrefix + name.replace(/[^A-Za-z0-9_-]/g, '_'));
  });
}

function withDivisionDataLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return work(); } finally { lock.releaseLock(); }
}

function divisionDataRevision_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value));
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function divisionDataText_(value) {
  return String(value == null ? '' : value).trim();
}
