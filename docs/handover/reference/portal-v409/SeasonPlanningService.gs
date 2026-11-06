/** Preseason dates belong to the season's existing Master registry.
 * Calendar is the source of race dates. No separate planning workbook. */
const F1XL_SEASON_PLANNING = Object.freeze({
  sheetName: 'Preseason',
  marker: 'F1XL Preseason Plan v1',
  zone: 'Europe/London',
  hubCacheKey: 'F1XL_PRESEASON_HUBS_V1',
  navigationCacheKey: 'F1XL_PRESEASON_HUBS_NAV_V3',
  hubCacheSeconds: 600
});

function getSeasonPlanningInitial() { fapAssertEntry_('getSeasonPlanningInitial');
  const properties = PropertiesService.getScriptProperties().getProperties();
  const seasons = Object.keys(properties).filter(function(key) { return key.indexOf(F1XL_SEASON_MASTER.propertyPrefix)===0; }).map(function(key) { return key.substring(F1XL_SEASON_MASTER.propertyPrefix.length).replace(/_/g,'.'); }).filter(function(season) { return /^\d+(?:\.5)?$/.test(season) && !seasonProtectionStatus_(season).readOnly; });
  return { plans:seasons.sort(function(a,b) { return Number(b)-Number(a); }), maxRounds:F1XL_CAPACITY.rounds };
}

/** Discover started preseason and active TEST Masters. Read-only; never creates a season. */
function seasonNavigationPhase_(name,work){return typeof fapPerformancePhase_==='function'?fapPerformancePhase_(name,work):work();}
function getPreseasonHubs(input) { fapAssertEntry_('getPreseasonHubs');
  const person=typeof fapCurrentPerson_==='function'?fapCurrentPerson_():null;
  if(person&&!person.owner&&typeof fapPermission_==='function'&&!Object.keys(FAP_AREAS).some(function(key){return ['team_hub','team_preview','steward','appeal','navigation','people'].indexOf(key)<0&&fapPermission_(person,key);})){return {hubs:[],postseasonHubs:[],unavailable:[]};}
  const navigationOnly=input&&input.navigationOnly===true,key=navigationOnly?F1XL_SEASON_PLANNING.navigationCacheKey:F1XL_SEASON_PLANNING.hubCacheKey;
  const cache=CacheService.getScriptCache();if(input&&input.forceRefresh===true)cache.remove(key);
  const cached=cache.get(key);
  if(cached){try{
    const response=JSON.parse(cached);
    // A TEST season can be deliberately discarded between navigation loads.
    // Do not leave a removed season in the sidebar for the cache lifetime.
    const properties=PropertiesService.getScriptProperties();
    const stale=(response.hubs||[]).some(function(hub){
      const masterId=properties.getProperty(seasonMasterPropertyKey_(hub.season));
      if(!masterId||String(hub.url||'').indexOf('/d/'+masterId+'/')<0||seasonProtectionStatus_(hub.season).readOnly)return true;
      // A recoverably discarded TEST Master can briefly leave its property
      // behind. Drive is authoritative: never show a trashed workbook.
      try{return DriveApp.getFileById(masterId).isTrashed();}catch(error){return true;}
    });
    if(!stale)return response;
    cache.remove(key);
  }catch(error){cache.remove(key);}}
  const seasons=seasonNavigationPhase_('season.navigation.registry',()=>getSeasonPlanningInitial().plans), hubs=[], unavailable=[],reads={};
  seasons.forEach(function(season) {
    try {
      if(navigationOnly){
        const header=seasonPlanningNavigationHeader_(season,reads);
        if(header){
          if(header.stage!=='Preseason'&&header.stage!=='Active')return;
          if(!header.hasPreseason)throw new Error('Preseason tab missing');
          if(header.stage==='Active'){hubs.push({season:season,url:header.url,plan:null,active:true});return;}
          // Preseason still needs the complete live dates plan. Reopen/recheck
          // its stage below so a transition during discovery cannot be reused.
        }
      }
      // Discovery is deliberately read-only.  It must not reuse the editable
      // Season Master opener: a protection or write-guard failure should not
      // hide an otherwise usable active/preseason hub from the navigation.
      const book=seasonNavigationPhase_('season.navigation.master',()=>seasonPlanningOpenMasterReadOnly_(season));
      if (!book) return;
      const stage=seasonNavigationPhase_('season.navigation.stage',()=>seasonNavigationPhase_('season.navigation.stage.S'+season,()=>String(book.getSheetByName('Start Here').getRange('I7').getDisplayValue()).trim())),active=stage==='Active';
      if(stage!=='Preseason'&&!active)return;
      const sheet=book.getSheetByName(F1XL_SEASON_PLANNING.sheetName);
      if (!sheet) throw new Error('Preseason tab missing');
      const response=navigationOnly&&active?{url:book.getUrl(),plan:null}:seasonNavigationPhase_('season.navigation.plan',()=>seasonPlanningResponse_(book,sheet,season));
      hubs.push({season:season,url:response.url,plan:response.plan,active:active});
    } catch(error) { unavailable.push(season); }
  });
  const postseasonHubs=seasonNavigationPhase_('season.navigation.closed',()=>typeof postseasonDiscover_==='function'?postseasonDiscover_():[]);
  const response={hubs:hubs,postseasonHubs:postseasonHubs,unavailable:unavailable};
  // The navigation structure changes only when a season is created, launched
  // or closed. Caching avoids reopening each Master on every FAP reload.
  try{cache.put(key,JSON.stringify(response),F1XL_SEASON_PLANNING.hubCacheSeconds);}catch(error){}
  return response;
}
function clearPreseasonHubCache_(){const cache=CacheService.getScriptCache();cache.remove(F1XL_SEASON_PLANNING.hubCacheKey);cache.remove(F1XL_SEASON_PLANNING.hubCacheKey+'_NAV');cache.remove('F1XL_PRESEASON_HUBS_NAV_V2');cache.remove(F1XL_SEASON_PLANNING.navigationCacheKey);}

/** Read navigation metadata/cell values without SpreadsheetApp.openById's
 * expensive full workbook open. Google handles auth using the existing Sheets
 * scope. No data is written or retained beyond the existing short menu cache. */
function seasonPlanningNavigationHeader_(season,reads){
  if(reads.nativeOnly||typeof Sheets==='undefined')return null;
  const id=PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season));
  if(!id)return null;
  try{
    if(typeof DriveApp!=='undefined'){
      const file=seasonNavigationPhase_('season.navigation.file.S'+season,()=>DriveApp.getFileById(id));
      if(typeof file.isTrashed==='function'&&file.isTrashed())return {stage:'',hasPreseason:false,url:''};
    }
  }catch(error){reads.nativeOnly=true;seasonNavigationPhase_('season.navigation.apiFallback',()=>{});return null;}
  let metadata;
  try{
    metadata=seasonNavigationPhase_('season.navigation.metadata.S'+season,()=>Sheets.Spreadsheets.get(id,{fields:'spreadsheetId,properties(title),sheets(properties(title))',includeGridData:false}));
  }catch(error){reads.nativeOnly=true;seasonNavigationPhase_('season.navigation.apiFallback',()=>{});return null;}
  if(!metadata||metadata.spreadsheetId!==id||!metadata.properties||!Array.isArray(metadata.sheets))throw new Error('Season navigation metadata could not be verified.');
  seasonMasterAssertTestWorkbook_({getName:()=>metadata.properties.title});
  const tabs=metadata.sheets.map(s=>s.properties&&s.properties.title);
  if(!tabs.includes('Start Here'))throw new Error('Season Master is missing Start Here.');
  let result;
  try{
    result=seasonNavigationPhase_('season.navigation.raw.S'+season,()=>Sheets.Spreadsheets.get(id,{ranges:["'Start Here'!I7"],fields:'sheets(data(rowData(values(userEnteredValue))))'}));
  }catch(error){reads.nativeOnly=true;seasonNavigationPhase_('season.navigation.apiFallback',()=>{});return null;}
  const literal=seasonPlanningLiteralStage_(result);
  let stage=literal.value;
  // Displayed-value reads can wait for unrelated legacy workbook calculation.
  // Empty cells and literal text need no calculation. Formulas/numeric/boolean
  // custom formats retain the original displayed-value semantics.
  if(!literal.literal){
    try{result=seasonNavigationPhase_('season.navigation.cell.S'+season,()=>Sheets.Spreadsheets.Values.get(id,"'Start Here'!I7",{valueRenderOption:'FORMATTED_VALUE',fields:'values'}));}
    catch(error){reads.nativeOnly=true;seasonNavigationPhase_('season.navigation.apiFallback',()=>{});return null;}
    if(!result||result.values!==undefined&&(!Array.isArray(result.values)||result.values.length&&!Array.isArray(result.values[0])))throw new Error('Season navigation stage could not be verified.');
    stage=String(result.values&&result.values[0]&&result.values[0][0]||'').trim();
  }
  return {stage:stage,hasPreseason:tabs.includes(F1XL_SEASON_PLANNING.sheetName),url:'https://docs.google.com/spreadsheets/d/'+id+'/edit'};
}
function seasonPlanningLiteralStage_(result){
  const fail=()=>{throw new Error('Season navigation stage could not be verified.');};
  if(!result||result.sheets!==undefined&&!Array.isArray(result.sheets))fail();
  const entered=[];
  (result.sheets||[]).forEach(sheet=>{if(sheet.data!==undefined&&!Array.isArray(sheet.data))fail();(sheet.data||[]).forEach(grid=>{if(grid.rowData!==undefined&&!Array.isArray(grid.rowData))fail();(grid.rowData||[]).forEach(row=>{if(row.values!==undefined&&!Array.isArray(row.values))fail();(row.values||[]).forEach(cell=>{if(cell.userEnteredValue&&Object.keys(cell.userEnteredValue).length)entered.push(cell.userEnteredValue);});});});});
  if(entered.length>1)fail();
  if(!entered.length)return {literal:true,value:''};
  const value=entered[0];
  if(typeof value.stringValue==='string')return {literal:true,value:value.stringValue.trim()};
  if(['formulaValue','numberValue','boolValue'].some(k=>Object.prototype.hasOwnProperty.call(value,k)))return {literal:false};
  fail();
}

function seasonPlanningOpenMasterReadOnly_(season) {
  const id=PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season));
  if (!id) return null;
  const book=seasonNavigationPhase_('season.navigation.open.S'+season,()=>SpreadsheetApp.openById(id));
  seasonNavigationPhase_('season.navigation.label.S'+season,()=>seasonMasterAssertTestWorkbook_(book));
  return book;
}

function getSeasonPlan(season) { fapAssertEntry_('getSeasonPlan');
  season = seasonPlanningSeason_(season);
  const book = seasonPlanningBook_(season);
  if (!book) throw new Error('That Season Master is not available. Refresh the list.');
  const sheet = book.getSheetByName(F1XL_SEASON_PLANNING.sheetName);
  if (!sheet || !seasonMasterIsPlanning_(book)) return { existingMaster:true,season:season,url:book.getUrl(),message:'This Season Master already exists. Open it to continue its existing setup.' };
  return seasonPlanningResponse_(book, sheet, season);
}

function saveSeasonPlan(input) { fapAssertEntry_('saveSeasonPlan');
  const plan = seasonPlanningNormalise_(input);
  assertSeasonWritable_(plan.season);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let book = seasonPlanningBook_(plan.season);
    let sheet = book && book.getSheetByName(F1XL_SEASON_PLANNING.sheetName);
    if (book && (!sheet || !seasonMasterIsPlanning_(book))) throw new Error('This Season Master already exists. Select it from the Season Masters list and open it; no duplicate was created.');
    if (book && Number(book.getSheetByName('Start Here').getRange('B5').getValue())>0) throw new Error('Divisions are already configured. Continue in the Season Master rather than changing the preseason schedule.');
    const current = sheet ? seasonPlanningRead_(sheet, plan.season, book) : null;
    if (String(input.revision || '') !== (current ? current.revision : '')) throw new Error('This plan already exists or changed since you opened it. Reload the saved plan before saving.');
    let createdBook = false;
    if (!book) {
      book = seasonPlanningCreateMaster_(plan);
      createdBook = true;
      sheet = book.getSheetByName(F1XL_SEASON_PLANNING.sheetName);
    }
    const calendar = book.getSheetByName('Calendar'), start = book.getSheetByName('Start Here');
    const oldCalendar = seasonPlanningValues_(calendar.getRange(2,1,F1XL_CAPACITY.rounds+1,4));
    const oldPlan = sheet.getLastRow() ? seasonPlanningValues_(sheet.getRange(1,1,sheet.getLastRow(),5)) : [];
    const oldCount = start.getRange('B4').getValue();
    let calendarWritten=false, planWritten=false, countWritten=false;
    try {
      const calendarRows = seasonPlanningCalendarRows_(plan,oldCalendar);
      const rows = seasonPlanningRows_(plan);
      const height = Math.max(rows.length, sheet.getLastRow());
      while (rows.length < height) rows.push(['','','','','']);
      // A single value write replaces the complete plan and clears old tail rows.
      // No clear-before-write gap, and unrelated seasons have their own tabs.
      sheet.getRange(1,1,height,5).setNumberFormat('@');
      if (!current) {
        sheet.setFrozenRows(7);
        sheet.setColumnWidth(1,240); sheet.setColumnWidth(2,145);
        sheet.setColumnWidth(3,120); sheet.setColumnWidth(4,155); sheet.setColumnWidth(5,110);
        sheet.getRange('A1:E1').setBackground('#1b5e20').setFontColor('#ffffff').setFontWeight('bold');
        sheet.getRange('A7:E7').setBackground('#d9ead3').setFontWeight('bold');
      }
      sheet.getRange(1,1,height,5).setValues(rows);
      planWritten=true;
      calendar.getRange(2,1,calendarRows.length,4).setValues(calendarRows);
      calendarWritten=true;
      start.getRange('B4').setValue(plan.count);
      countWritten=true;
      SpreadsheetApp.flush();
      const response = seasonPlanningResponse_(book,sheet,plan.season);
      CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
      if (createdBook) PropertiesService.getScriptProperties().setProperty(seasonMasterPropertyKey_(plan.season), book.getId());
      clearPreseasonHubCache_();
      response.message = 'Season ' + plan.season + ' dates saved in its Season Master.';
      return response;
    } catch (error) {
      if (createdBook) book.setName('INCOMPLETE - ' + book.getName());
      else {
        try {
          if (calendarWritten) calendar.getRange(2,1,oldCalendar.length,4).setValues(oldCalendar);
          if (planWritten) {
            while(oldPlan.length<sheet.getLastRow()) oldPlan.push(['','','','','']);
            sheet.getRange(1,1,oldPlan.length,5).setValues(oldPlan);
          }
          if (countWritten) start.getRange('B4').setValue(oldCount);
        } catch (restoreError) { throw new Error('Save failed and could not be fully restored. Check Calendar and Preseason in the Master before reloading. ' + error.message); }
      }
      throw error;
    }
  } finally { lock.releaseLock(); }
}

function seasonPlanningBook_(season) {
  assertSeasonWritable_(season);
  const id = PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season));
  if (!id) return null;
  const book = SpreadsheetApp.openById(id);
  seasonMasterAssertTestWorkbook_(book);
  assertSeasonWorkbookWritable_(season,book);
  return book;
}

function seasonPlanningCreateMaster_(plan) {
  const properties=PropertiesService.getScriptProperties();
  const referenceId=properties.getProperty(F1XL_REFERENCE_DATA.propertyKey);
  if (!referenceId) throw new Error('Create or connect Permanent Reference Data before creating a Season Master.');
  const reference=SpreadsheetApp.openById(referenceId);
  const calendar=SpreadsheetApp.openById(F1XL_SEASON_MASTER.calendarTemplateId);
  const licence=SpreadsheetApp.openById(F1XL_SEASON_MASTER.licenceTemplateId);
  const overall=SpreadsheetApp.openById(F1XL_SEASON_MASTER.overallTemplateId);
  referenceValidateWorkbook_(reference);
  seasonMasterValidateSources_(calendar,licence,overall);
  const book=SpreadsheetApp.create(fapWorkbookNewName_('TEST - F1XL Season '+plan.season+' Master'));
  try {
    book.setSpreadsheetTimeZone(F1XL_SEASON_PLANNING.zone);
    // Zero is internal only: the ordinary completed-setup form still requires divisions.
    seasonMasterBuildWorkbook_(book,{season:plan.season,rounds:plan.count,divisions:0,mode:'Modern',teams:'',teamPrincipals:'Unknown',scoringSystem:'Standard'},calendar,licence,overall,reference);
    const start=book.getSheetByName('Start Here');
    start.getRange('B5').setValue('');
    start.getRange('H7:I7').setValues([['Setup stage','Preseason']]);
    start.getRange('B5').setNote('Decided at placement, after time trials. Leave blank for now.');
    book.getSheetByName('Teams & Principals').getRange('A1').setNote('Confirm the team count and principals later in preseason.');
    book.insertSheet(F1XL_SEASON_PLANNING.sheetName);
    return book;
  } catch(error) { book.setName('INCOMPLETE - '+book.getName()); throw error; }
}

function seasonPlanningValues_(range) {
  const values=range.getValues(), formulas=range.getFormulas();
  return values.map(function(row,r) { return row.map(function(value,c) { return formulas[r][c]||value; }); });
}

function seasonPlanningCalendarRows_(plan,oldRows) {
  const byRound={}, extras=[];
  oldRows.forEach(function(row) {
    if (!row.some(function(cell) { return cell!==''; })) return;
    const round=Number(row[0]);
    if (Number.isInteger(round)&&round>0) {
      if(byRound[round]) throw new Error('Calendar contains a duplicate round. Correct it in the Master first.');
      if(round>plan.count && (row[1]!==''||row[3]!=='')) throw new Error('A removed round has a weekend type or track. Resolve it in Calendar before reducing the round count.');
      byRound[round]=row;
    } else extras.push(row);
  });
  const rows=plan.races.map(function(date,i) { const old=byRound[i+1]||[]; return [i+1,old[1]||'',date,old[3]||'']; });
  extras.forEach(function(row) { rows.push(row); });
  if(rows.length>F1XL_CAPACITY.rounds+1) throw new Error('Calendar has extra rows that would be overwritten. Check it in the Master first.');
  while(rows.length<F1XL_CAPACITY.rounds+1)rows.push(['','','','']);
  return rows;
}

function seasonPlanningSeason_(value) {
  const season = String(value == null ? '' : value).trim();
  if (!/^\d{1,4}(?:\.5)?$/.test(season) || Number(season)<1) throw new Error('Enter a valid season number.');
  return String(Number(season));
}

function seasonPlanningDate_(value) {
  const date = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2000-01-01' || date > '2100-12-31') throw new Error('Enter valid dates between 2000 and 2100.');
  const parsed = new Date(date + 'T00:00:00Z');
  if (isNaN(parsed.getTime()) || parsed.toISOString().substring(0,10)!==date) throw new Error('A date is not valid.');
  return date;
}

function seasonPlanningShift_(date, days) {
  const parsed = new Date(date + 'T00:00:00Z');
  parsed.setUTCDate(parsed.getUTCDate()+days);
  return parsed.toISOString().substring(0,10);
}

function seasonPlanningNormalise_(input) {
  input = input || {};
  const season = seasonPlanningSeason_(input.season);
  const start = seasonPlanningDate_(input.start);
  const opens = seasonPlanningDate_(input.opens);
  const count = Number(input.count);
  if (!Number.isInteger(count) || count<1 || count>F1XL_CAPACITY.rounds) throw new Error('Choose between 1 and ' + F1XL_CAPACITY.rounds + ' rounds.');
  const day = new Date(start+'T00:00:00Z').getUTCDay();
  const draftDefault = seasonPlanningShift_(start,-((day-3+7)%7 || 7));
  const overrides = input.overrides || {};
  const draft = overrides.draft ? seasonPlanningDate_(overrides.draft) : draftDefault;
  const defaults = { draft:draftDefault, tt:seasonPlanningShift_(draft,-1), apps:seasonPlanningShift_(draft,-2), announce:seasonPlanningShift_(draft,-7) };
  const dates = {}, cleanOverrides = {}, times = {};
  ['announce','apps','tt','draft'].forEach(function(key) {
    dates[key] = overrides[key] ? seasonPlanningDate_(overrides[key]) : defaults[key];
    if (overrides[key]) cleanOverrides[key] = dates[key];
    const supplied = input.times && input.times[key];
    const time = supplied == null ? (key==='apps' ? '21:00' : '19:00') : String(supplied);
    if (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter valid UK times.');
    if ((key==='apps'||key==='tt') && !time) throw new Error('Application and time-trial closing times are required.');
    times[key] = time;
  });
  if (!(opens<=dates.apps && dates.apps<dates.tt && dates.tt<dates.draft && dates.draft<start && dates.announce<=dates.draft)) throw new Error('Check the order: applications open, applications close, time trials close, draft, then opening race. Announcements must be no later than the draft.');
  if (new Date(start+'T00:00:00Z')-new Date(opens+'T00:00:00Z')>366*86400000) throw new Error('Applications opening must be within a year of the opening race.');
  const raceOverrides = {}, races = [];
  for (let round=1;round<=count;round++) {
    const custom = round>1 && input.raceOverrides && input.raceOverrides[round];
    const date = seasonPlanningDate_(custom || seasonPlanningShift_(start,7*(round-1)));
    if (round>1 && date<=races[round-2]) throw new Error('Each race date must be later than the previous round.');
    if (custom) raceOverrides[round] = date;
    races.push(date);
  }
  const socials = [];
  let sunday = seasonPlanningShift_(opens,(7-new Date(opens+'T00:00:00Z').getUTCDay())%7);
  while (sunday<start) { socials.push(sunday); sunday=seasonPlanningShift_(sunday,7); }
  return { season:season,start:start,opens:opens,count:count,overrides:cleanOverrides,times:times,raceOverrides:raceOverrides,dates:dates,races:races,socials:socials };
}

function seasonPlanningRows_(plan) {
  const rows = [
    [F1XL_SEASON_PLANNING.marker,'','','',''],
    ['Season',plan.season,'','',''],
    ['Stage','Planning','','',''],
    ['Time zone',F1XL_SEASON_PLANNING.zone,'','',''],
    ['Last saved',new Date().toISOString(),'','',''],
    ['Editing guide','Race dates are in Calendar column C. Use YYYY-MM-DD / HH:mm here; set milestone Date rule to Custom to keep changes.','','',''],
    ['Event','Date','Time (UK)','Date rule','Round'],
    ['Applications open',plan.opens,'','Custom',''],
    ['Opening race','See Calendar, round 1','','','']
  ];
  const labels = { announce:'Tracks / principals announced',apps:'Applications close',tt:'Time trials close',draft:'Draft' };
  ['announce','apps','tt','draft'].forEach(function(key) { rows.push([labels[key],plan.dates[key],plan.times[key],plan.overrides[key]?'Custom':'Automatic','']); });
  plan.races.forEach(function(date,i) { rows.push(['Race','See Calendar','',plan.raceOverrides[i+1]?'Custom':'Automatic',String(i+1)]); });
  plan.socials.forEach(function(date) { rows.push(['Social race',date,'','Automatic','']); });
  return rows;
}

function seasonPlanningRead_(sheet,season,book) {
  const rows = sheet.getDataRange().getDisplayValues().map(function(row) { return row.slice(0,5); });
  if (!rows[0] || rows[0][0]!==F1XL_SEASON_PLANNING.marker || !rows[1] || rows[1][1]!==season) throw new Error('The saved plan layout or season does not match. Nothing was changed.');
  const lookup = function(label) { const matches=rows.slice(7).filter(function(row) { return row[0]===label; }); if(matches.length!==1) throw new Error('The plan needs exactly one '+label+' row.'); return matches[0]; };
  const raceRows=rows.slice(7).filter(function(row) { return row[0]==='Race'; });
  const calendar=seasonPlanningValues_(book.getSheetByName('Calendar').getRange(2,1,F1XL_CAPACITY.rounds+1,4));
  const races=calendar.filter(function(row) { return Number.isInteger(Number(row[0]))&&Number(row[0])>0; });
  if(races.length!==raceRows.length || Number(book.getSheetByName('Start Here').getRange('B4').getValue())!==races.length) throw new Error('Calendar rounds and the preseason round count differ. Check the Season Master before saving.');
  const dateText=function(value) { return value instanceof Date ? Utilities.formatDate(value,book.getSpreadsheetTimeZone(),'yyyy-MM-dd') : String(value||''); };
  const plan={season:season,start:dateText(races[0]&&races[0][2]),opens:lookup('Applications open')[1],count:raceRows.length,overrides:{},times:{},raceOverrides:{}};
  const labels={announce:'Tracks / principals announced',apps:'Applications close',tt:'Time trials close',draft:'Draft'};
  Object.keys(labels).forEach(function(key) { const row=lookup(labels[key]); plan.times[key]=row[2]; if(row[3]==='Custom')plan.overrides[key]=row[1]; });
  raceRows.forEach(function(row,i) {
    if(Number(row[4])!==i+1 || Number(races[i][0])!==i+1) throw new Error('Calendar races must be numbered in order.');
    const date=seasonPlanningDate_(dateText(races[i][2]));
    if(i>0 && (row[3]==='Custom'||date!==seasonPlanningShift_(plan.start,7*i)))plan.raceOverrides[i+1]=date;
  });
  const revision = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([rows,calendar,book.getSheetByName('Start Here').getRange('B4:B5').getValues()])));
  return {plan:seasonPlanningNormalise_(plan),revision:revision};
}

function seasonPlanningResponse_(book,sheet,season) {
  const response=seasonPlanningRead_(sheet,season,book);
  response.url=book.getUrl();
  return response;
}
