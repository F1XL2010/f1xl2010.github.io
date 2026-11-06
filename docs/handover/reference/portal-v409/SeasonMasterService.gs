/**
 * Creates the new, spreadsheet-first Season Master beside the live system.
 *
 * The familiar Calendar, Drivers Licence and Overall calculation tabs are
 * copied from the current templates. New manual setup tabs sit in front of
 * them. Nothing created here is connected to the live website or Season 28.
 */
const F1XL_SEASON_MASTER = Object.freeze({
  propertyPrefix: 'F1XL_SEASON_MASTER_',
  calendarTemplateId: '1l8GCjs5nM3pSeuz5FVOrU9tC9HqnwQ7Ki5Q9t0DsdhA',
  licenceTemplateId: '1R4LyNiTEMEl9wu0lWFBwlUEk2LhUVKUFa_srktBGEYo',
  overallTemplateId: '1yD8rQCb4y_0wY7spyy5owxkn4gp1ogD7zjHx059FbkI',
  cacheKey: 'F1XL_SEASON_MASTER_LIST_V3',
  cacheSeconds: 120,
  lineupSafetySheetName: '_Line-up Safety',
  lineupSafetyHandler: 'seasonMasterLineupSafetyOnEdit',
  colours: { setup: '#1b5e20', licence: '#9c6500', overall: '#24527a', technical: '#666666' }
});

function getSeasonMasterPage(input) { fapAssertEntry_('getSeasonMasterPage');
  const offset = Number(input && input.offset || 0);
  if (!Number.isInteger(offset) || offset < 0) throw new Error('Invalid archive page. Refresh the archive.');
  return getSeasonMasters(input && input.force === true, { offset:offset });
}

function getSeasonMasters(forceRefresh, page) { fapAssertEntry_('getSeasonMasters');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_SEASON_MASTER.cacheKey);
  const cached = cache.get(F1XL_SEASON_MASTER.cacheKey);
  if (cached && !page) return JSON.parse(cached);
  const properties = PropertiesService.getScriptProperties().getProperties();
  const trashedDivisionIds = seasonMasterTrashedDivisionIds_();
  const keys = Object.keys(properties).filter(function(key) {
    return /^F1XL_SEASON_MASTER_\d+(?:_5)?$/.test(key);
  }).sort(function(a, b) {
    return Number(b.substring(F1XL_SEASON_MASTER.propertyPrefix.length).replace(/_/g, '.')) - Number(a.substring(F1XL_SEASON_MASTER.propertyPrefix.length).replace(/_/g, '.'));
  });
  const selectedKeys = page ? keys.slice(page.offset, page.offset + 3) : keys;
  const workbooks = selectedKeys.map(function(key) {
    const season = key.substring(F1XL_SEASON_MASTER.propertyPrefix.length).replace(/_/g, '.');
    try {
      const workbook = SpreadsheetApp.openById(properties[key]);
      const planning = seasonMasterIsPlanning_(workbook);
      const divisions = planning ? 0 : Number(workbook.getSheetByName('Start Here').getRange('B5').getValue()) || 1;
      const divisionWorkbooks = [];
      for (let division = 1; division <= divisions; division += 1) {
        const divisionId = properties[divisionTemplatePropertyKey_(season, division)] || '';
        if (!divisionId) {
          divisionWorkbooks.push({ division:division, configured:false, available:false, spreadsheetId:'', url:'', name:'' });
          continue;
        }
        if (trashedDivisionIds[divisionId]) {
          // A binned TEST Division is a recoverable request for a clean
          // replacement. Present the ordinary Create action; the creation
          // service removes the stale property only when that action runs.
          divisionWorkbooks.push({ division:division, configured:false, available:false, spreadsheetId:'', url:'', name:'' });
          continue;
        }
        divisionWorkbooks.push({
          division:division,
          configured:true,
          available:true,
          spreadsheetId:divisionId,
          url:'https://docs.google.com/spreadsheets/d/' + divisionId + '/edit',
          name:'Season ' + season + ' Division ' + division,
          connection:null
        });
      }
      const mode = String(workbook.getSheetByName('Start Here').getRange('I3').getDisplayValue() || 'Modern').trim() || 'Modern';
      const obsoleteHistoricalTabs = ['Historical Setup','Historical Summary','Historical Results','Historical Accolades','Historical Sources'].some(function(name) { return !!workbook.getSheetByName(name); });
      const protection = seasonProtectionStatus_(season);
      const careerExport = planning || protection.readOnly ? null : careerFormulaMasterExportStatus_(workbook, season);
      return { season: season, name: workbook.getName(), spreadsheetId: workbook.getId(), url: workbook.getUrl(), available: true, planning:planning, divisions:divisions, mode:mode, readOnly:protection.readOnly, readOnlyReason:protection.readOnlyReason, obsoleteHistoricalTabs:obsoleteHistoricalTabs, divisionWorkbooks:divisionWorkbooks, careerConnection:null, careerExport:careerExport };
    } catch (error) {
      return { season: season, name: 'Unavailable workbook', spreadsheetId: properties[key], url: '', available: false };
    }
  }).sort(function(a, b) { return Number(b.season) - Number(a.season); });
  const response = { ok: true, workbooks: workbooks, divisionTemplate:!page || page.offset === 0 ? getDivisionWorkbookTemplate() : null, message: workbooks.length ? 'Season Master workbooks loaded.' : 'No Season Master has been created yet.' };
  if (page) {
    response.total = keys.length;
    response.nextOffset = page.offset + selectedKeys.length < keys.length ? page.offset + selectedKeys.length : null;
  } else {
    // A full archive can exceed Google's per-cache-item limit. Caching must
    // never turn an otherwise successful read into a failed page load.
    try { cache.put(F1XL_SEASON_MASTER.cacheKey, JSON.stringify(response), F1XL_SEASON_MASTER.cacheSeconds); } catch (ignore) {}
  }
  return response;
}

/** Read the small relevant subset of Drive's bin once. Calling getFileById for
 * every historical Division makes the ordinary Season Master list too slow. */
function seasonMasterTrashedDivisionIds_() {
  const ids = {};
  const files = DriveApp.searchFiles("trashed = true and mimeType = 'application/vnd.google-apps.spreadsheet' and title contains 'TEST - F1XL Season'");
  while (files.hasNext()) {
    const file = files.next();
    if (/^(?:INCOMPLETE\s+-\s+)?TEST\s+-\s+F1XL\s+Season\s+\d+(?:\.5)?\s+Division\s+\d+\s+Data$/i.test(fapWorkbookLegacyName_(file.getName()))) ids[file.getId()] = true;
  }
  return ids;
}

/**
 * Creates the harmless one-cell tests used to tell an administrator whether
 * Google's mandatory IMPORTRANGE approval has been completed in both
 * directions. It cannot grant that permission; it only makes the required
 * manual click visible and easy to find.
 */
function checkSeasonMasterConnections(input) { fapAssertEntry_('checkSeasonMasterConnections');
  const season = String(input && input.season || '').trim();
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Choose a connected season first.');
  const properties = PropertiesService.getScriptProperties();
  const masterId = properties.getProperty(seasonMasterPropertyKey_(season));
  if (!masterId) throw new Error('Season ' + season + ' does not have a connected Season Master.');
  const master = SpreadsheetApp.openById(masterId);
  seasonMasterAssertTestWorkbook_(master);
  seasonMasterAssertReady_(master);
  const protection = seasonProtectionForWorkbook_(master);
  if (seasonProtectionStatus_(season).readOnly || protection.readOnly) {
    const response = getSeasonMasters(true);
    seasonMasterAttachConnectionStatus_(response, season, master, properties);
    response.message = 'Completed history: existing connections checked without changing any Sheet. Corrections remain available directly in Google Sheets.';
    return response;
  }
  const divisions = Number(master.getSheetByName('Start Here').getRange('B5').getValue()) || 1;
  for (let division = 1; division <= divisions; division += 1) {
    const divisionId = properties.getProperty(divisionTemplatePropertyKey_(season, division));
    if (divisionId && !DriveApp.getFileById(divisionId).isTrashed()) seasonMasterEnsureDivisionConnectionTest_(master, division, divisionId);
  }
  const career = seasonMasterRegisterCareerSafely_(season, master);
  SpreadsheetApp.flush();
  CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
  const response = getSeasonMasters(true);
  seasonMasterAttachConnectionStatus_(response, season, master, properties);
  response.message = career.ok
    ? 'Connection check complete. Follow any yellow instructions below, then refresh the check.'
    : 'Division connection check completed, but Career Stats needs attention: ' + career.message;
  return response;
}

function seasonMasterAttachConnectionStatus_(response, season, master, properties) {
  const item = (response.workbooks || []).find(function(workbook) { return String(workbook.season) === String(season); });
  if (!item) return response;
  (item.divisionWorkbooks || []).forEach(function(division) {
    if (!division.configured) return;
    const divisionId = properties.getProperty(divisionTemplatePropertyKey_(season, division.division));
    if (!divisionId) return;
    try {
      const workbook = SpreadsheetApp.openById(divisionId);
      division.name = workbook.getName();
      division.url = workbook.getUrl();
      division.available = true;
      division.connection = seasonMasterReadDivisionConnection_(master, workbook, division.division);
    } catch (error) {
      division.available = false;
      division.connection = { ready:false, tasks:[] };
    }
  });
  try {
    item.careerConnection = careerFormulaConnectionStatus_(openDriverDatabaseContext_(), season);
  } catch (error) {
    item.careerConnection = { configured:false, ready:false, tasks:[] };
  }
  return response;
}

function seasonMasterEnsureDivisionConnectionTest_(master, division, divisionId) {
  const start = master.getSheetByName('Start Here');
  if (!start) throw new Error('The Season Master is missing its Start Here tab.');
  if (!start.getRange('A21:F21').isPartOfMerge()) start.getRange('A21:F21').merge();
  if (!start.getRange('A22:F22').isPartOfMerge()) start.getRange('A22:F22').merge();
  start.getRange('A21').setValue('One-time Division connections').setFontWeight('bold').setFontColor('#ffffff').setBackground('#9c6500');
  start.getRange('A22').setValue('If a connection below shows #REF!, click that cell and press Allow access. The Admin Platform connection check will confirm when both directions are ready.').setWrap(true).setBackground('#fff2cc');
  const row = 22 + division;
  start.getRange(row, 1).setValue('Division ' + division + ' connection test').setFontWeight('bold');
  const cell = start.getRange(row, 2);
  const formula = '=IMPORTRANGE("' + divisionId + '","\'Start Here\'!B4")';
  if (cell.getFormula() !== formula) cell.setFormula(formula);
  cell.setNote('If this cell shows #REF!, click it and press Allow access once.');
}

function seasonMasterReadDivisionConnection_(master, divisionWorkbook, division) {
  const divisionStart = divisionWorkbook.getSheetByName('Start Here');
  const masterStart = master.getSheetByName('Start Here');
  const masterRow = 22 + division;
  const divisionValue = divisionStart ? String(divisionStart.getRange('B13').getDisplayValue() || '').trim() : '';
  const masterCell = masterStart ? masterStart.getRange(masterRow, 2) : null;
  const masterValue = masterCell ? String(masterCell.getDisplayValue() || '').trim() : '';
  const masterPrepared = !!(masterCell && masterCell.getFormula());
  const divisionConnected = /^season$/i.test(divisionValue);
  const masterConnected = masterPrepared && masterValue === String(division);
  const tasks = [];
  if (!divisionConnected && divisionStart) {
    tasks.push({
      direction:'Division ' + division + ' → Season Master',
      url:divisionWorkbook.getUrl() + '#gid=' + divisionStart.getSheetId() + '&range=B13',
      instruction:'Open Division ' + division + ', click cell B13 on Start Here, press Allow access, then close the Sheet.'
    });
  }
  if (!masterConnected && masterStart) {
    tasks.push({
      direction:'Season Master → Division ' + division,
      url:masterPrepared ? master.getUrl() + '#gid=' + masterStart.getSheetId() + '&range=B' + masterRow : '',
      instruction:masterPrepared
        ? 'Open the Season Master, click cell B' + masterRow + ' on Start Here, press Allow access, then close the Sheet.'
        : 'Press Check connections once to prepare the Season Master connection test for Division ' + division + '.'
    });
  }
  return {
    ready:divisionConnected && masterConnected,
    prepared:masterPrepared,
    divisionToMaster:divisionConnected,
    masterToDivision:masterConnected,
    tasks:tasks
  };
}

function createSeasonMasterWorkbook(input) { fapAssertEntry_('createSeasonMasterWorkbook');
  assertSeasonWritable_(input && input.season);
  const setup = seasonMasterNormaliseSetup_(input);
  const key = seasonMasterPropertyKey_(setup.season);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const existingId = properties.getProperty(key);
    if (existingId) {
      const existing = SpreadsheetApp.openById(existingId);
      seasonMasterAssertTestWorkbook_(existing);
      assertSeasonWorkbookWritable_(setup.season, existing);
      seasonMasterAssertReady_(existing);
      const start = existing.getSheetByName('Start Here');
      if (start && /^TEST\s*-/i.test(fapWorkbookLegacyName_(existing.getName()))) {
        seasonMasterEnsureModeMetadata_(start, setup);
        seasonMasterApplyScoringValidation_(existing, setup);
      }
      const teamsSheet = existing.getSheetByName('Teams & Principals');
      if (teamsSheet && /^TEST\s*-/i.test(fapWorkbookLegacyName_(existing.getName()))) seasonMasterApplyTeamSetupNotes_(teamsSheet, setup);
      if (/^TEST\s*-/i.test(fapWorkbookLegacyName_(existing.getName()))) seasonMasterEnsureEditableLineups_(existing);
      const career = seasonMasterRegisterCareerSafely_(setup.season, existing);
      CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
      return { ok: true, created: false, workbook: { season: setup.season, name: existing.getName(), spreadsheetId: existing.getId(), url: existing.getUrl(), available: true }, message: 'Season ' + setup.season + ' already has a connected Season Master. Its ' + setup.mode + ' setup information was refreshed and no duplicate was created.' + (career.ok ? ' Career Stats is registered.' : ' Career Stats warning: ' + career.message) };
    }

    // Open every source before creating anything. Permission errors therefore
    // cannot leave a stray, half-built workbook behind.
    const calendarSource = SpreadsheetApp.openById(F1XL_SEASON_MASTER.calendarTemplateId);
    const licenceSource = SpreadsheetApp.openById(F1XL_SEASON_MASTER.licenceTemplateId);
    const overallSource = SpreadsheetApp.openById(F1XL_SEASON_MASTER.overallTemplateId);
    const referenceId = properties.getProperty(F1XL_REFERENCE_DATA.propertyKey);
    if (!referenceId) throw new Error('Create or connect Permanent Reference Data before creating a Season Master.');
    const referenceSource = SpreadsheetApp.openById(referenceId);
    referenceValidateWorkbook_(referenceSource);
    seasonMasterValidateSources_(calendarSource, licenceSource, overallSource);

    const workbook = SpreadsheetApp.create(fapWorkbookNewName_('TEST - F1XL Season ' + setup.season + ' Master'));
    try {
      seasonMasterBuildWorkbook_(workbook, setup, calendarSource, licenceSource, overallSource, referenceSource);
      seasonMasterEnsureEditableLineups_(workbook);
      properties.setProperty(key, workbook.getId());
      const career = seasonMasterRegisterCareerSafely_(setup.season, workbook);
      CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
      return { ok: true, created: true, workbook: { season: setup.season, name: workbook.getName(), spreadsheetId: workbook.getId(), url: workbook.getUrl(), available: true }, message: 'Season ' + setup.season + ' test Master created. It is separate from the live website and Season 28.' + (career.ok ? ' Its Career Stats block was added automatically.' : ' Career Stats warning: ' + career.message) };
    } catch (error) {
      workbook.setName('INCOMPLETE - ' + workbook.getName());
      throw new Error('The Season Master could not be completed. A clearly labelled INCOMPLETE workbook was left in Drive for inspection. ' + error.message);
    }
  } finally {
    lock.releaseLock();
  }
}

function connectSeasonMasterWorkbook(input) { fapAssertEntry_('connectSeasonMasterWorkbook');
  assertSeasonWritable_(input && input.season);
  const setup = seasonMasterNormaliseSetup_(input);
  const spreadsheetId = String(input && input.spreadsheetId || '').trim();
  if (!spreadsheetId) throw new Error('Paste the Google Sheet ID before connecting it.');
  const workbook = SpreadsheetApp.openById(spreadsheetId);
  seasonMasterAssertTestWorkbook_(workbook);
  ['Start Here', 'Reference Snapshot', 'Calendar', 'Season Entrants', 'Teams & Principals', 'Division Line-ups', 'Summary', 'Outstanding Bans', 'Overall Standings'].forEach(function(name) {
    if (!workbook.getSheetByName(name)) throw new Error('This does not look like an F1XL Season Master. The ' + name + ' tab is missing.');
  });
  assertSeasonWorkbookWritable_(setup.season, workbook);
  seasonMasterAssertReady_(workbook);
  PropertiesService.getScriptProperties().setProperty(seasonMasterPropertyKey_(setup.season), workbook.getId());
  seasonMasterEnsureEditableLineups_(workbook);
  const career = seasonMasterRegisterCareerSafely_(setup.season, workbook);
  CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
  return { ok: true, created: false, workbook: { season: setup.season, name: workbook.getName(), spreadsheetId: workbook.getId(), url: workbook.getUrl(), available: true }, message: 'Existing Season ' + setup.season + ' Master connected.' + (career.ok ? ' Career Stats is registered.' : ' Career Stats warning: ' + career.message) };
}

function seasonMasterRegisterCareerSafely_(season, workbook) {
  if (seasonMasterIsPlanning_(workbook)) return { ok:false, message:'Preseason dates only; Career Stats registration follows later.' };
  try {
    const result = careerFormulaEnsureSeasonRegistered_(season, workbook);
    return { ok:true, message:result.message || 'Career Stats registered.' };
  } catch (error) {
    return { ok:false, message:String(error && error.message || error || 'Unknown Career Stats error') };
  }
}

/**
 * Kept under its original public name so existing deployed pages can call it.
 * The action now removes the obsolete line-up recovery trigger and refreshes
 * the fixed team/tier seat structure without changing entered driver names.
 */
function activateSeasonMasterLineupSafety(input) { fapAssertEntry_('activateSeasonMasterLineupSafety');
  assertSeasonWritable_(input && input.season);
  const season = String(input && input.season || '').trim();
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Choose a connected test season first.');
  const masterId = PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season));
  if (!masterId) throw new Error('Season ' + season + ' does not have a connected Season Master.');
  const workbook = SpreadsheetApp.openById(masterId);
  if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(workbook.getName()))) throw new Error('For safety, line-up structure can be refreshed only on a clearly labelled TEST Season Master.');
  assertSeasonWorkbookWritable_(season, workbook);
  return seasonMasterEnsureEditableLineups_(workbook);
}

/** Refreshes the technical reference snapshot and dropdown rules without
 * changing any season setup or entered results. Connected TEST Division
 * workbooks receive the same current lists in their hidden Data adapters. */
function refreshSeasonMasterReferenceData(input) { fapAssertEntry_('refreshSeasonMasterReferenceData');
  assertSeasonWritable_(input && input.season);
  const season = String(input && input.season || '').trim();
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Choose a connected test season first.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const masterId = properties.getProperty(seasonMasterPropertyKey_(season));
    const referenceId = properties.getProperty(F1XL_REFERENCE_DATA.propertyKey);
    if (!masterId) throw new Error('Season ' + season + ' does not have a connected Season Master.');
    if (!referenceId) throw new Error('Create or connect Permanent Reference Data first.');
    const workbook = SpreadsheetApp.openById(masterId);
    const referenceSource = SpreadsheetApp.openById(referenceId);
    seasonMasterAssertTestWorkbook_(workbook);
    referenceValidateWorkbook_(referenceSource);
    assertSeasonWorkbookWritable_(season, workbook);
    seasonMasterAssertReady_(workbook);
    const snapshot = workbook.getSheetByName('Reference Snapshot');
    if (!snapshot) throw new Error('This Season Master is missing its Reference Snapshot tab. Nothing was changed.');

    snapshot.getDataRange().clearContent().clearDataValidations();
    const lists = seasonMasterCreateReferenceSnapshot_(snapshot, referenceSource);
    const start = workbook.getSheetByName('Start Here');
    const rounds = Math.max(Number(start && start.getRange('B4').getValue()) || 1, 1);
    const divisions = Math.max(Number(start && start.getRange('B5').getValue()) || 1, 1);
    seasonMasterApplyReferenceValidations_(workbook, lists, rounds, divisions);
    seasonMasterApplyScoringValidation_(workbook, { scoringSystem:String(start && start.getRange('I6').getDisplayValue() || 'Standard') }, lists.scoring);

    let refreshedDivisions = 0;
    for (let division = 1; division <= divisions; division += 1) {
      const divisionId = properties.getProperty(divisionTemplatePropertyKey_(season, division));
      if (!divisionId) continue;
      const divisionWorkbook = SpreadsheetApp.openById(divisionId);
      divisionTemplateAssertTestWorkbook_(divisionWorkbook);
      assertSeasonWorkbookWritable_(season, divisionWorkbook);
      divisionTemplateEnsureEntrantImportCapacity_(divisionWorkbook, workbook.getId());
      const data = divisionWorkbook.getSheetByName('Data');
      if (!data) continue;
      divisionTemplateCopyReferenceSnapshot_(data, workbook);
      const setup = divisionTemplateReadMasterSetup_(workbook, season, division);
      setup.calendar.forEach(function(definition) {
        const roundSheet = divisionWorkbook.getSheetByName('R' + definition.round);
        if (roundSheet) divisionTemplateConfigureRoundReferenceValidations_(roundSheet, definition.sprint, definition.earlySprint);
      });
      refreshedDivisions += 1;
    }
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
    return {
      ok:true,
      message:'Season ' + season + ' reference dropdowns were refreshed from Permanent Reference Data.' + (refreshedDivisions ? ' ' + refreshedDivisions + ' connected Division workbook' + (refreshedDivisions === 1 ? ' was' : 's were') + ' refreshed too.' : '') + ' Existing selections and results were preserved.'
    };
  } finally {
    lock.releaseLock();
  }
}

function seasonMasterApplyReferenceValidations_(workbook, lists, rounds, divisions) {
  const calendar = workbook.getSheetByName('Calendar');
  const entrants = workbook.getSheetByName('Season Entrants');
  const teams = workbook.getSheetByName('Teams & Principals');
  const lineups = workbook.getSheetByName('Division Line-ups');
  if (!calendar || !entrants || !teams || !lineups) throw new Error('The Season Master is missing a setup tab. Nothing was changed.');
  seasonMasterEnsureEntrantCapacity_(entrants);
  const weekendTypes = lists.weekendTypes.getDisplayValues().flat().map(function(value) { return String(value || '').trim(); }).filter(Boolean);
  ['Standard','Legacy Sprint','Modern Sprint'].forEach(function(value) { if (weekendTypes.indexOf(value) < 0) weekendTypes.push(value); });
  calendar.getRange(2, 2, rounds, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(weekendTypes, true).setAllowInvalid(false).build());
  calendar.getRange(2, 4, rounds + 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.tracks, true).setAllowInvalid(false).build());
  entrants.getRange(2, 3, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.countries, true).setAllowInvalid(true).build());
  entrants.getRange(2, 5, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.teams, true).setAllowInvalid(true).build());
  entrants.getRange(2, 6, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.tiers, true).setAllowInvalid(false).build());
  entrants.getRange(2, 7, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.platforms, true).setAllowInvalid(false).build());
  entrants.getRange(2, 8, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.controllers, true).setAllowInvalid(false).build());
  teams.getRange(2, 1, F1XL_CAPACITY.teams, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.teams, true).setAllowInvalid(false).build());
  const entrantNames = entrants.getRange(2, 2, F1XL_CAPACITY.seasonEntrants, 1);
  const entrantRule = SpreadsheetApp.newDataValidation().requireValueInRange(entrantNames, true).setAllowInvalid(true).build();
  for (let division = 1; division <= divisions; division += 1) {
    const firstDriverRow = 6 + ((division - 1) * 30);
    lineups.getRange(firstDriverRow, 2, F1XL_CAPACITY.raceEntries, 1).setDataValidation(entrantRule);
    lineups.getRange(firstDriverRow, 8, F1XL_CAPACITY.raceEntries, 1).setDataValidation(entrantRule);
    lineups.getRange(firstDriverRow, 11, F1XL_CAPACITY.raceEntries, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.tiers, true).setAllowInvalid(false).build());
  }
}

function seasonMasterBuildWorkbook_(workbook, setup, calendarSource, licenceSource, overallSource, referenceSource) {
  const original = workbook.getSheets()[0];
  original.setName('Start Here');
  seasonMasterCreateStartHere_(original, setup);
  const referenceSnapshot = workbook.insertSheet('Reference Snapshot');
  const lists = seasonMasterCreateReferenceSnapshot_(referenceSnapshot, referenceSource);
  seasonMasterApplyScoringValidation_(workbook, setup, lists.scoring);
  const calendar = seasonMasterCopySheet_(calendarSource, 'Calendar', workbook, 'Calendar');
  seasonMasterPrepareCalendar_(calendar, setup, lists);
  seasonMasterCreateEntrants_(workbook.insertSheet('Season Entrants'), lists);
  seasonMasterCreateTeams_(workbook.insertSheet('Teams & Principals'), lists, setup);
  seasonMasterCreateLineups_(workbook.insertSheet('Division Line-ups'), setup.divisions, lists);

  ['Summary', 'Penalty Guide', 'Division 1', 'Division 2', 'Division 3', 'Division 4', 'Division 5', 'Outstanding Bans'].forEach(function(name) {
    seasonMasterCopySheet_(licenceSource, name, workbook, name);
  });
  seasonMasterBlankLicenceInputs_(workbook);
  seasonMasterExtendLicence_(workbook, setup.divisions);

  ['Overall Standings', 'Weekly Totals', 'Weekly Totals Data', 'Overall Standings Data', 'Data'].forEach(function(name) {
    seasonMasterCopySheet_(overallSource, name, workbook, name);
  });
  seasonMasterPrepareOverall_(workbook, setup.season, setup.divisions);
  seasonMasterApplyTabPresentation_(workbook, setup.divisions);
  referenceSnapshot.hideSheet();
  sheetPresentationSafely_(function() { sheetPresentationMaster_(workbook, setup); });
  workbook.setActiveSheet(original);
  SpreadsheetApp.flush();
}

function seasonMasterBlankLicenceInputs_(workbook) {
  for (let division = 1; division <= 5; division += 1) {
    const sheet = workbook.getSheetByName('Division ' + division);
    if (!sheet) continue;
    sheet.getRange('A1').clearContent();
    const columns = Math.min(sheet.getMaxColumns(), 110);
    sheet.getRange(1, 4, 2, Math.max(1, columns - 3)).clearContent();
    sheet.getRange(3, 1, Math.min(44, sheet.getMaxRows() - 2), columns).clearContent();
  }
}

function seasonMasterCreateStartHere_(sheet, setup) {
  sheet.clear();
  sheet.getRange('A1:F1').merge().setValue('F1XL Season ' + setup.season + ' Master').setFontSize(18).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_SEASON_MASTER.colours.setup);
  sheet.getRange('A3:B7').setValues([
    ['Season', setup.season], ['Planned rounds', setup.rounds], ['Current divisions', setup.divisions], ['Created', new Date()], ['Status', 'TEST — not connected to the public website']
  ]);
  sheet.getRange('A3:A7').setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange('B6').setNumberFormat('dd mmm yyyy HH:mm');
  sheet.getRange('A9:F9').merge().setValue('Where to work').setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_SEASON_MASTER.colours.setup);
  sheet.getRange('A10:F15').setValues([
    ['Calendar', 'Enter dates, weekend type and track once known.', '', '', '', ''],
    ['Season Entrants', 'One row per signed-up driver. This mirrors the familiar first columns of a division Data tab.', '', '', '', ''],
    ['Teams & Principals', 'Record the teams used this season and their Team Principals.', '', '', '', ''],
    ['Division Line-ups', 'Place drivers, teams, tiers and reserves into each division.', '', '', '', ''],
    ['Summary / Division tabs / Outstanding Bans', 'The familiar Drivers Licence workbook, now kept inside this season file.', '', '', '', ''],
    ['Overall tabs', 'The familiar combined-team standings calculations. Technical data tabs are retained for manual fallback.', '', '', '', '']
  ]);
  sheet.getRange('A10:A15').setFontWeight('bold');
  sheet.getRange('A10:F15').setWrap(true).setVerticalAlignment('top');
  sheet.getRange('A17:F19').setValues([
    ['Important', 'This test workbook does not replace, edit or feed Season 28.', '', '', '', ''],
    ['Manual fallback', 'All regular work remains readable and editable directly in Google Sheets if the Admin Platform is unavailable.', '', '', '', ''],
    ['Reference snapshot', 'This season received the latest permanent teams, tracks, car numbers and dropdown choices when it was created. Later permanent edits will not rewrite this season.', '', '', '', '']
  ]);
  sheet.getRange('A17:A19').setFontWeight('bold').setBackground('#fff2cc');
  sheet.getRange('A17:F19').setWrap(true);
  seasonMasterEnsureModeMetadata_(sheet, setup);
  sheet.setFrozenRows(1); sheet.setColumnWidth(1, 190); sheet.setColumnWidth(2, 560);
  [3,4,5,6].forEach(function(column) { sheet.setColumnWidth(column, 85); });
  sheet.setColumnWidth(8, 170); sheet.setColumnWidth(9, 240);
}

function seasonMasterEnsureModeMetadata_(sheet, setup) {
  const previousMode = String(sheet.getRange('I3').getDisplayValue() || '').trim();
  const previousHistoricalStatus = previousMode === 'Historical' ? sheet.getRange('I9:I14').getValues() : null;
  if (!sheet.getRange('H1:I1').isPartOfMerge()) sheet.getRange('H1:I1').merge();
  sheet.getRange('H1').setValue('Season setup').setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_SEASON_MASTER.colours.setup);
  sheet.getRange('H3:I6').setValues([
    ['Mode', setup.mode],
    ['Teams', setup.teams],
    ['Team Principals used', setup.teamPrincipals],
    ['Scoring system', setup.scoringSystem]
  ]);
  sheet.getRange('H3:H6').setFontWeight('bold').setBackground('#d9ead3');
  if (!sheet.getRange('H8:I8').isPartOfMerge()) sheet.getRange('H8:I8').merge();
  sheet.getRange('H8').setValue('Historical data status').setFontWeight('bold').setFontColor('#ffffff').setBackground(setup.mode === 'Historical' ? '#9c6500' : F1XL_SEASON_MASTER.colours.technical);
  sheet.getRange('H9:I14').setValues([
    ['Calendar', setup.mode === 'Historical' ? 'Unknown' : 'Not applicable'],
    ['Line-ups', setup.mode === 'Historical' ? 'Unknown' : 'Not applicable'],
    ['Results', setup.mode === 'Historical' ? 'Unknown' : 'Not applicable'],
    ['Career totals', setup.mode === 'Historical' ? 'Unknown' : 'Not applicable'],
    ['Accolades', setup.mode === 'Historical' ? 'Unknown' : 'Not applicable'],
    ['Notes', '']
  ]);
  if (setup.mode === 'Historical' && previousHistoricalStatus) sheet.getRange('I9:I14').setValues(previousHistoricalStatus);
  sheet.getRange('H9:H14').setFontWeight('bold').setBackground(setup.mode === 'Historical' ? '#fff2cc' : '#eeeeee');
  if (setup.mode === 'Historical') {
    const completenessRule = SpreadsheetApp.newDataValidation().requireValueInList(['Unknown','Limited','Partial','Complete'], true).setAllowInvalid(false).build();
    sheet.getRange('I9:I13').setDataValidation(completenessRule);
    if (!sheet.getRange('H16:I17').isPartOfMerge()) sheet.getRange('H16:I17').merge();
    sheet.getRange('H16').setValue('Historical mode permits blank and incomplete information. A blank means unknown; zero must mean a confirmed zero.').setWrap(true).setBackground('#fff2cc');
  } else {
    sheet.getRange('I9:I13').clearDataValidations();
    if (sheet.getRange('H16:I17').isPartOfMerge()) sheet.getRange('H16:I17').breakApart();
    sheet.getRange('H16:I17').clearContent().setBackground(null);
  }
  sheet.setColumnWidth(8, 170); sheet.setColumnWidth(9, 240);
}

function seasonMasterPrepareCalendar_(sheet, setup, lists) {
  const preparedRounds = setup.divisions === 0 ? F1XL_CAPACITY.rounds : setup.rounds;
  const rows = Math.max(sheet.getMaxRows(), preparedRounds + 3);
  if (rows > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, Math.min(sheet.getMaxColumns(), 4)).clearContent();
  const values = [];
  for (let round = 1; round <= setup.rounds; round += 1) values.push([round, '', '', '']);
  values.push(['All Star Race', '', '', '']);
  sheet.getRange(2, 1, values.length, 4).setValues(values);
  const weekendTypes = lists.weekendTypes.getDisplayValues().flat().map(function(value) { return String(value || '').trim(); }).filter(Boolean);
  ['Standard','Legacy Sprint','Modern Sprint'].forEach(function(value) { if (weekendTypes.indexOf(value) < 0) weekendTypes.push(value); });
  sheet.getRange(2, 2, preparedRounds, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(weekendTypes, true).setAllowInvalid(false).build());
  sheet.getRange(2, 4, preparedRounds + 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.tracks, true).setAllowInvalid(false).build());
  sheet.setFrozenRows(1);
}

function seasonMasterCreateEntrants_(sheet, lists) {
  seasonMasterSetHeader_(sheet, ['Driver ID', 'Driver', 'Nationality', 'Abbreviation', 'Team', 'Tier', 'Platform', 'Controller']);
  sheet.setColumnWidth(1, 115); sheet.setColumnWidth(2, 220); sheet.setColumnWidth(3, 150); sheet.setColumnWidth(4, 115); sheet.setColumnWidth(5, 180); sheet.setColumnWidth(6, 85); sheet.setColumnWidth(7, 120); sheet.setColumnWidth(8, 130);
  sheet.getRange('A2').setNote('Permanent Driver ID. This keeps the same person linked even if their gamertag changes.');
  sheet.getRange('B1').setNote('Season record: once a driver has been added, keep them on this list even if they later change team, reserve status or Division.');
  seasonMasterEnsureEntrantCapacity_(sheet);
  sheet.getRange(2, 3, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.countries, true).setAllowInvalid(true).build());
  sheet.getRange(2, 5, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.teams, true).setAllowInvalid(true).build());
  sheet.getRange(2, 6, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.tiers, true).setAllowInvalid(false).build());
  sheet.getRange(2, 7, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.platforms, true).setAllowInvalid(false).build());
  sheet.getRange(2, 8, F1XL_CAPACITY.seasonEntrants, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.controllers, true).setAllowInvalid(false).build());
  sheet.getRange(1, 1, sheet.getMaxRows(), 8).createFilter();
}

/** Extends both new and existing Season Entrants tabs without replacing any
 * entered value. Blank abbreviation cells receive the normal country lookup;
 * an existing formula or manually entered abbreviation is preserved. */
function seasonMasterEnsureEntrantCapacity_(sheet) {
  const lastRow = F1XL_CAPACITY.seasonEntrants + 1;
  if (sheet.getMaxRows() < lastRow) sheet.insertRowsAfter(sheet.getMaxRows(), lastRow - sheet.getMaxRows());
  const range = sheet.getRange(2, 4, F1XL_CAPACITY.seasonEntrants, 1);
  const values = range.getValues();
  const formulas = range.getFormulas();
  const output = values.map(function(row, index) {
    const sheetRow = index + 2;
    return [formulas[index][0] || (row[0] !== '' ? row[0] : '=IFERROR(VLOOKUP(C' + sheetRow + ',\'Reference Snapshot\'!$R:$U,3,FALSE),"")')];
  });
  range.setValues(output);
}

function seasonMasterCreateTeams_(sheet, lists, setup) {
  seasonMasterSetHeader_(sheet, ['Team', 'Full Team Name', 'Nationality', 'Hex Colour', 'Team Principal', 'Team Type', 'Tier 1 #', 'Tier 2 #']);
  sheet.setColumnWidth(1, 150); sheet.setColumnWidth(2, 260); sheet.setColumnWidth(3, 150); sheet.setColumnWidth(4, 110); sheet.setColumnWidth(5, 220); sheet.setColumnWidth(6, 135); sheet.setColumnWidth(7, 85); sheet.setColumnWidth(8, 85);
  sheet.getRange(2, 1, F1XL_CAPACITY.teams, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.teams, true).setAllowInvalid(false).build());
  sheet.getRange('F2:F100').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Full team', 'Free agent team'], true).setAllowInvalid(false).build());
  const formulas = [], numberFormulas = [];
  for (let row = 2; row < 2 + F1XL_CAPACITY.teams; row += 1) {
    formulas.push([
      '=IFERROR(VLOOKUP(A' + row + ',\'Reference Snapshot\'!$B:$H,2,FALSE),"")',
      '=IFERROR(VLOOKUP(A' + row + ',\'Reference Snapshot\'!$B:$H,3,FALSE),"")',
      '=IFERROR(VLOOKUP(A' + row + ',\'Reference Snapshot\'!$B:$H,4,FALSE),"")'
    ]);
    numberFormulas.push([
      '=IFERROR(INDEX(FILTER(\'Reference Snapshot\'!$BE:$BE,\'Reference Snapshot\'!$BC:$BC=A' + row + ',\'Reference Snapshot\'!$BD:$BD="Tier 1"),1),"")',
      '=IFERROR(INDEX(FILTER(\'Reference Snapshot\'!$BE:$BE,\'Reference Snapshot\'!$BC:$BC=A' + row + ',\'Reference Snapshot\'!$BD:$BD="Tier 2"),1),"")'
    ]);
  }
  sheet.getRange(2, 2, formulas.length, 3).setFormulas(formulas);
  sheet.getRange(2, 7, numberFormulas.length, 2).setFormulas(numberFormulas);
  seasonMasterApplyTeamSetupNotes_(sheet, setup);
}

function seasonMasterApplyTeamSetupNotes_(sheet, setup) {
  sheet.getRange('A1').setNote('This season is configured for ' + setup.teams + ' team' + (setup.teams === 1 ? '' : 's') + '. Extra prepared rows remain available if the historical record or a later decision requires them.');
  const principalRange = sheet.getRange(2, 5, F1XL_CAPACITY.teams, 1);
  if (setup.teamPrincipals === 'No') principalRange.setNote('Team Principals were marked as not used for this season; these cells may remain blank.');
  else if (setup.teamPrincipals === 'Unknown') principalRange.setNote('Whether Team Principals were used is currently unknown; names may remain blank.');
  else principalRange.clearNote();
}

function seasonMasterCreateLineups_(sheet, divisions, lists) {
  sheet.getRange('A1:K1').merge().setValue('Division Line-ups').setFontSize(16).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_SEASON_MASTER.colours.setup);
  sheet.getRange('A2:K2').merge().setValue('Each Division has two fixed seats for every confirmed team. Team, tier and driver number fill automatically; enter or move only the driver names. Removing a name here does not remove that person from Season Entrants or from completed race history.').setWrap(true).setBackground('#d9ead3');
  let row = 4;
  for (let division = 1; division <= divisions; division += 1) {
    sheet.getRange(row, 1, 1, 11).merge().setValue('Division ' + division).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_SEASON_MASTER.colours.setup);
    sheet.getRange(row + 1, 1, 1, 6).setValues([['Driver #', 'Driver', 'Platform', 'Controller', 'Team', 'Tier']]).setFontWeight('bold').setBackground('#d9ead3');
    sheet.getRange(row + 1, 8, 1, 4).setValues([['Reserve Driver', 'Platform', 'Controller', 'Tier']]).setFontWeight('bold').setBackground('#fff2cc');
    const firstDriverRow = row + 2, lastDriverRow = row + 1 + F1XL_CAPACITY.raceEntries;
    const entrants = sheet.getParent().getSheetByName('Season Entrants').getRange(2, 2, F1XL_CAPACITY.seasonEntrants, 1);
    sheet.getRange(firstDriverRow, 2, F1XL_CAPACITY.raceEntries, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(entrants, true).setAllowInvalid(true).build());
    sheet.getRange(firstDriverRow, 8, F1XL_CAPACITY.raceEntries, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(entrants, true).setAllowInvalid(true).build());
    sheet.getRange(firstDriverRow, 11, F1XL_CAPACITY.raceEntries, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(lists.tiers, true).setAllowInvalid(false).build());
    for (let line = firstDriverRow; line <= lastDriverRow; line += 1) {
      const seat = line - firstDriverRow;
      const teamRow = 2 + Math.floor(seat / 2);
      sheet.getRange(line, 1).setFormula('=IFERROR(INDEX(FILTER(\'Reference Snapshot\'!$BE:$BE,\'Reference Snapshot\'!$BC:$BC=E' + line + ',\'Reference Snapshot\'!$BD:$BD=F' + line + '),1),"")');
      sheet.getRange(line, 3).setFormula('=IFERROR(VLOOKUP(B' + line + ',\'Season Entrants\'!$B:$H,6,FALSE),"")');
      sheet.getRange(line, 4).setFormula('=IFERROR(VLOOKUP(B' + line + ',\'Season Entrants\'!$B:$H,7,FALSE),"")');
      sheet.getRange(line, 5).setFormula('=IFERROR(\'Teams & Principals\'!A' + teamRow + ',"")');
      sheet.getRange(line, 6).setFormula('=IF(E' + line + '="","","Tier ' + ((seat % 2) + 1) + '")');
      sheet.getRange(line, 9).setFormula('=IFERROR(VLOOKUP(H' + line + ',\'Season Entrants\'!$B:$H,6,FALSE),"")');
      sheet.getRange(line, 10).setFormula('=IFERROR(VLOOKUP(H' + line + ',\'Season Entrants\'!$B:$H,7,FALSE),"")');
    }
    row += 30;
  }
  [85,220,120,130,180,90,25,220,120,130,90].forEach(function(width, index) { sheet.setColumnWidth(index + 1, width); });
  sheet.setFrozenRows(2);
  sheetPresentationSafely_(function() { sheetPresentationLineups_(sheet, divisions); });
}

/**
 * Keeps Division Line-ups freely editable. The previous recovery trigger was
 * based on the wrong record: it restored whole blocks while administrators
 * were legitimately moving drivers. Season Entrants and recorded R-tab names
 * now provide persistence instead.
 */
function seasonMasterEnsureEditableLineups_(workbook) {
  seasonMasterAssertReady_(workbook);
  const lineups = workbook.getSheetByName('Division Line-ups');
  const start = workbook.getSheetByName('Start Here');
  if (!lineups || !start) throw new Error('This Season Master needs both Start Here and Division Line-ups before its seat structure can be refreshed.');
  const divisions = Math.max(1, Number(start.getRange('B5').getValue()) || 1);
  const workbookId = workbook.getId();
  ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === F1XL_SEASON_MASTER.lineupSafetyHandler && trigger.getTriggerSourceId() === workbookId;
  }).forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  const safety = workbook.getSheetByName(F1XL_SEASON_MASTER.lineupSafetySheetName);
  if (safety) workbook.deleteSheet(safety);
  seasonMasterRefreshLineupSeatFormulas_(workbook, divisions);
  lineups.getRange('A1').setNote('Editable current assignment screen. Preserve the permanent season record on Season Entrants; completed race tabs preserve historical team and driver appearances.');
  return {
    ok:true,
    activeTriggers:0,
    message:'Division line-ups refreshed for ' + divisions + ' division' + (divisions === 1 ? '' : 's') + '. The obsolete reset protection has been removed; entered driver names were preserved.'
  };
}

function seasonMasterRefreshLineupSeatFormulas_(workbook, divisions) {
  const lineups = workbook.getSheetByName('Division Line-ups');
  lineups.getRange('A2:K2').setValue('Each Division has two fixed seats for every confirmed team. Team, tier and driver number fill automatically; enter or move only the driver names. Removing a name here does not remove that person from Season Entrants or from completed race history.');
  for (let division = 1; division <= divisions; division += 1) {
    const blockStart = 4 + ((division - 1) * 30);
    const firstDriverRow = blockStart + 2;
    // Team and Tier used to be manual dropdowns. Clear those validation rules
    // before replacing them with formulas or Google rejects the formula write.
    lineups.getRange(firstDriverRow, 5, F1XL_CAPACITY.raceEntries, 2).clearDataValidations();
    for (let seat = 0; seat < F1XL_CAPACITY.raceEntries; seat += 1) {
      const row = firstDriverRow + seat;
      const teamRow = 2 + Math.floor(seat / 2);
      lineups.getRange(row, 1).setFormula('=IFERROR(INDEX(FILTER(\'Reference Snapshot\'!$BE:$BE,\'Reference Snapshot\'!$BC:$BC=E' + row + ',\'Reference Snapshot\'!$BD:$BD=F' + row + '),1),"")');
      lineups.getRange(row, 5).setFormula('=IFERROR(\'Teams & Principals\'!A' + teamRow + ',"")');
      lineups.getRange(row, 6).setFormula('=IF(E' + row + '="","","Tier ' + ((seat % 2) + 1) + '")');
    }
    lineups.getRange(blockStart + 27, 1, 1, 4).clearContent().clearDataValidations().setBackground(null);
  }
}

// Old installed triggers may call this once after the new deployment but
// before the refresh action removes them. It deliberately performs no write.
function seasonMasterLineupSafetyOnEdit(event) { fapAssertTrigger_(event, 'seasonMasterLineupSafetyOnEdit');
  return;
}

function seasonMasterCreateReferenceSnapshot_(sheet, referenceSource) {
  const blocks = [
    { key:'teams', column:1 }, { key:'tracks', column:10 }, { key:'countries', column:17 },
    { key:'tyres', column:23 }, { key:'weather', column:27 }, { key:'platforms', column:31 },
    { key:'controllers', column:35 }, { key:'tiers', column:39 }, { key:'weekendTypes', column:43 },
    { key:'scoring', column:48 }, { key:'carNumbers', column:54 }
  ];
  const data = {};
  blocks.forEach(function(block) {
    const definition = F1XL_REFERENCE_CATEGORIES[block.key];
    const source = referenceSource.getSheetByName(definition.sheet);
    const count = Math.max(source.getLastRow() - 1, 0);
    const rows = count ? source.getRange(2, 1, count, definition.headers.length).getDisplayValues().filter(function(row) { return row.some(function(value) { return value !== ''; }); }) : [];
    data[block.key] = rows;
    sheet.getRange(1, block.column, 1, definition.headers.length).setValues([definition.headers]).setFontWeight('bold').setBackground('#dddddd');
    if (rows.length) sheet.getRange(2, block.column, rows.length, definition.headers.length).setValues(rows);
  });

  const listDefinitions = [
    { key:'teams', column:60, value:1 }, { key:'tracks', column:61, value:1 }, { key:'countries', column:62, value:1 },
    { key:'tyres', column:63, value:1 }, { key:'weather', column:64, value:1 }, { key:'platforms', column:65, value:1 },
    { key:'controllers', column:66, value:1 }, { key:'tiers', column:67, value:1 }, { key:'weekendTypes', column:68, value:1 },
    { key:'scoring', column:69, value:1 }
  ];
  const ranges = {};
  listDefinitions.forEach(function(list) {
    const definition = F1XL_REFERENCE_CATEGORIES[list.key];
    const seen = {};
    const values = data[list.key].filter(function(row) { return typeof definition.available !== 'number' || row[definition.available] === 'Yes'; }).map(function(row) { return [row[list.value]]; }).filter(function(row) {
      const value = String(row[0] || '').trim();
      const key = value.toLowerCase();
      if (!value || seen[key]) return false;
      seen[key] = true;
      return true;
    });
    sheet.getRange(1, list.column).setValue(definition.sheet + ' Dropdown').setFontWeight('bold').setBackground('#d9ead3');
    if (values.length) sheet.getRange(2, list.column, values.length, 1).setValues(values);
    ranges[list.key] = sheet.getRange(2, list.column, Math.max(values.length, 1), 1);
  });
  sheet.getRange('A1').setNote('Technical copy of Permanent Reference Data. Refresh it from the FAP after changing permanent lists; do not edit this hidden tab directly.');
  sheet.setTabColor(F1XL_SEASON_MASTER.colours.technical);
  return {
    teams:ranges.teams, tracks:ranges.tracks, countries:ranges.countries, tyres:ranges.tyres,
    weather:ranges.weather, platforms:ranges.platforms, controllers:ranges.controllers,
    tiers:ranges.tiers, weekendTypes:ranges.weekendTypes, scoring:ranges.scoring
  };
}

function seasonMasterApplyScoringValidation_(workbook, setup, scoringRange) {
  const start = workbook.getSheetByName('Start Here');
  const snapshot = workbook.getSheetByName('Reference Snapshot');
  if (!start || !snapshot) return;
  let range = scoringRange;
  if (!range) {
    const names = snapshot.getRange(2, 48, Math.max(snapshot.getLastRow() - 1, 1), 6).getDisplayValues()
      .filter(function(row) { return row[1] && (!row[5] || row[5] === 'Yes'); })
      .map(function(row) { return String(row[1]).trim(); })
      .filter(function(value, index, values) { return value && values.indexOf(value) === index; });
    snapshot.getRange(1, 69, Math.max(snapshot.getMaxRows(), 2), 1).clearContent();
    snapshot.getRange(1, 69).setValue('Scoring Systems Dropdown').setFontWeight('bold').setBackground('#d9ead3');
    if (names.length) snapshot.getRange(2, 69, names.length, 1).setValues(names.map(function(name) { return [name]; }));
    range = snapshot.getRange(2, 69, Math.max(names.length, 1), 1);
  }
  start.getRange('I6').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(range, true).setAllowInvalid(true).build()
  );
  if (!String(start.getRange('I6').getDisplayValue() || '').trim()) start.getRange('I6').setValue(setup.scoringSystem || 'Standard');
  start.getRange('I6').setNote('Select a scoring system held in Permanent Reference Data. Historical seasons may use a different system; add it there once, then refresh this TEST Master.');
}

function seasonMasterExtendLicence_(workbook, divisions) {
  const summary = workbook.getSheetByName('Summary');
  for (let division = 6; division <= F1XL_CAPACITY.divisions; division += 1) {
    const source = workbook.getSheetByName('Division 5');
    const copy = source.copyTo(workbook).setName('Division ' + division);
    seasonMasterReplaceFormulaText_(copy, 'Division 5', 'Division ' + division);
    const sourceBlock = summary.getRange(1, 17, Math.max(summary.getLastRow(), 2), 4);
    const destinationColumn = 17 + ((division - 5) * 4);
    const neededColumns = destinationColumn + 3;
    if (summary.getMaxColumns() < neededColumns) summary.insertColumnsAfter(summary.getMaxColumns(), neededColumns - summary.getMaxColumns());
    sourceBlock.copyTo(summary.getRange(1, destinationColumn, sourceBlock.getNumRows(), 4));
    seasonMasterReplaceFormulaTextInRange_(summary.getRange(1, destinationColumn, sourceBlock.getNumRows(), 4), 'Division 5', 'Division ' + division);
    summary.getRange(1, destinationColumn).setValue('Division ' + division);
  }
  for (let division = 1; division <= F1XL_CAPACITY.divisions; division += 1) {
    const sheet = workbook.getSheetByName('Division ' + division);
    if (sheet && division > divisions) sheet.hideSheet();
    if (sheet && division <= divisions) sheet.showSheet();
  }
}

function seasonMasterPrepareOverall_(workbook, season, divisions) {
  const replacements = [
    ['1ttwqU3zDcLIG-PAjpqZKoObhVFr2GI6D8k1nhu1E5zs', 'PASTE_DIVISION_1_SHEET_ID_HERE'],
    ['1H56yFQIbHp3TeMYi9utU40QBL8P3HGUGDuN9S4UXaZQ', 'PASTE_DIVISION_2_SHEET_ID_HERE'],
    ['19A2QyuF3Qlj557D-uQUp0nt_pvzMA2NId1nSFwVZzVk', 'PASTE_DIVISION_3_SHEET_ID_HERE'],
    ['1EfE1MePPePr0CVMrDawMtXqv8DH5pJ1Pa7k6kV6aPbc', 'PASTE_DIVISION_4_SHEET_ID_HERE']
  ];
  ['Overall Standings', 'Weekly Totals', 'Weekly Totals Data', 'Overall Standings Data', 'Data'].forEach(function(name) {
    const sheet = workbook.getSheetByName(name);
    replacements.forEach(function(pair) { seasonMasterReplaceFormulaText_(sheet, pair[0], pair[1]); });
    seasonMasterReplaceFormulaText_(sheet, 'Season 28', 'Season ' + season);
    seasonMasterReplaceFormulaText_(sheet, 'S28', 'S' + season);
    seasonMasterReplaceValueText_(sheet, 'Season 28', 'Season ' + season);
    seasonMasterReplaceValueText_(sheet, 'S28', 'S' + season);
  });
  const overall = workbook.getSheetByName('Overall Standings');
  const weekly = workbook.getSheetByName('Weekly Totals');
  const overallData = workbook.getSheetByName('Overall Standings Data');
  const weeklyData = workbook.getSheetByName('Weekly Totals Data');
  const data = workbook.getSheetByName('Data');
  [overall, weekly, overallData, weeklyData, data].forEach(function(sheet) {
    if (sheet.getMaxRows() < 2 + F1XL_CAPACITY.teams) sheet.insertRowsAfter(sheet.getMaxRows(), 2 + F1XL_CAPACITY.teams - sheet.getMaxRows());
  });
  data.getRange(3, 8, F1XL_CAPACITY.teams, 2).clearContent();
  weekly.getRange(3, 1, F1XL_CAPACITY.teams, 1).clearContent();
  overall.getRange(3, 12, F1XL_CAPACITY.teams, 2).clearContent();
  const teamFormulas = [], weeklyFormulas = [], principalFormulas = [];
  for (let index = 0; index < F1XL_CAPACITY.teams; index += 1) {
    const sourceRow = index + 2;
    teamFormulas.push(["=IFERROR('Teams & Principals'!A" + sourceRow + ',"")', "=IFERROR('Teams & Principals'!B" + sourceRow + ',"")']);
    weeklyFormulas.push(["=IFERROR('Teams & Principals'!A" + sourceRow + ',"")']);
    principalFormulas.push(["=IFERROR('Teams & Principals'!E" + sourceRow + ',"")', "=IFERROR('Teams & Principals'!A" + sourceRow + ',"")']);
  }
  data.getRange(3, 8, F1XL_CAPACITY.teams, 2).setFormulas(teamFormulas);
  weekly.getRange(3, 1, F1XL_CAPACITY.teams, 1).setFormulas(weeklyFormulas);
  overall.getRange(3, 12, F1XL_CAPACITY.teams, 2).setFormulas(principalFormulas);
  seasonMasterRebuildOverallImports_(overallData, weeklyData, divisions);
  seasonMasterRebuildOverallOutputs_(overall, weekly, overallData, weeklyData);
}

function seasonMasterRebuildOverallImports_(overallData, weeklyData, divisions) {
  const overallColumns = F1XL_CAPACITY.divisions * 5;
  const weeklyBlockRows = F1XL_CAPACITY.teams + 2;
  const weeklyRows = F1XL_CAPACITY.divisions * weeklyBlockRows;
  if (overallData.getMaxColumns() < overallColumns) overallData.insertColumnsAfter(overallData.getMaxColumns(), overallColumns - overallData.getMaxColumns());
  if (weeklyData.getMaxColumns() < F1XL_CAPACITY.rounds + 1) weeklyData.insertColumnsAfter(weeklyData.getMaxColumns(), F1XL_CAPACITY.rounds + 1 - weeklyData.getMaxColumns());
  if (weeklyData.getMaxRows() < weeklyRows) weeklyData.insertRowsAfter(weeklyData.getMaxRows(), weeklyRows - weeklyData.getMaxRows());
  overallData.getRange(1, 1, Math.max(overallData.getMaxRows(), F1XL_CAPACITY.teams + 3), overallColumns).clearContent();
  weeklyData.getRange(1, 1, weeklyRows, F1XL_CAPACITY.rounds + 1).clearContent();
  for (let division = 1; division <= F1XL_CAPACITY.divisions; division += 1) {
    const placeholder = 'PASTE_DIVISION_' + division + '_SHEET_ID_HERE';
    const overallColumn = 1 + ((division - 1) * 5);
    overallData.getRange(1, overallColumn).setValue('Division ' + division);
    overallData.getRange(3, overallColumn).setFormula('=IFERROR(IMPORTRANGE("' + placeholder + '","\'Constructors Standings NoSort\'!A4:C16"),"")');
    const weeklyRow = 1 + ((division - 1) * weeklyBlockRows);
    weeklyData.getRange(weeklyRow, 1).setValue('Division ' + division);
    weeklyData.getRange(weeklyRow + 1, 1).setFormula('=IFERROR(IMPORTRANGE("' + placeholder + '","\'Team Stats Calc Sheet\'!A1:A13"),"")');
    const finalRoundColumn = divisionTemplateColumnLetter_(13 + F1XL_CAPACITY.rounds);
    weeklyData.getRange(weeklyRow + 1, 2).setFormula('=IFERROR(IMPORTRANGE("' + placeholder + '","\'Team Stats Calc Sheet\'!N1:' + finalRoundColumn + '13"),"")');
  }
}

function seasonMasterRebuildOverallOutputs_(overall, weekly, overallData, weeklyData) {
  const firstTeamRow = 3;
  const lastTeamRow = firstTeamRow + F1XL_CAPACITY.teams - 1;
  if (weekly.getMaxColumns() < F1XL_CAPACITY.rounds + 1) weekly.insertColumnsAfter(weekly.getMaxColumns(), F1XL_CAPACITY.rounds + 1 - weekly.getMaxColumns());
  overall.getRange(firstTeamRow, 4, F1XL_CAPACITY.teams, 7).clearContent();
  weekly.getRange(2, 2, 1, F1XL_CAPACITY.rounds).setValues([Array.from({ length:F1XL_CAPACITY.rounds }, function(_, index) { return index + 1; })]);
  weekly.getRange(firstTeamRow, 2, F1XL_CAPACITY.teams, F1XL_CAPACITY.rounds).clearContent();
  overallData.getRange(19, 1, F1XL_CAPACITY.teams + 1, 5).clearContent();
  overallData.getRange('A19:E19').setValues([['Pos','Team','Team (short)','Points','Points (sort)']]);
  const pointColumns = [];
  for (let division = 1; division <= F1XL_CAPACITY.divisions; division += 1) pointColumns.push(1 + ((division - 1) * 5));
  for (let index = 0; index < F1XL_CAPACITY.teams; index += 1) {
    const row = firstTeamRow + index;
    const dataRow = 20 + index;
    const standingsParts = pointColumns.map(function(column) {
      const teamColumn = divisionTemplateColumnLetter_(column + 1);
      const pointsColumn = divisionTemplateColumnLetter_(column + 2);
      return 'SUMIF(\'Overall Standings Data\'!$' + teamColumn + '$4:$' + teamColumn + '$16,$C' + dataRow + ',\'Overall Standings Data\'!$' + pointsColumn + '$4:$' + pointsColumn + '$16)';
    });
    overallData.getRange(dataRow, 1).setFormula('=IF(E' + dataRow + '<>"",RANK(E' + dataRow + ',$E$20:$E$' + (19 + F1XL_CAPACITY.teams) + ',0),"")');
    overallData.getRange(dataRow, 2).setFormula('=IFERROR(VLOOKUP(C' + dataRow + ',Data!$H$3:$I$' + lastTeamRow + ',2,FALSE),C' + dataRow + ')');
    overallData.getRange(dataRow, 3).setFormula('=Data!H' + row);
    overallData.getRange(dataRow, 4).setFormula('=IF(C' + dataRow + '="","",INT(E' + dataRow + '))');
    overallData.getRange(dataRow, 5).setFormula('=IF(C' + dataRow + '="","",' + standingsParts.join('+') + ')');
    overall.getRange(row, 10).setFormula('=IF(H' + row + '="","",H' + row + '-MAX($H$' + firstTeamRow + ':$H$' + lastTeamRow + '))');
    for (let round = 1; round <= F1XL_CAPACITY.rounds; round += 1) {
      const weeklyParts = [];
      for (let division = 1; division <= F1XL_CAPACITY.divisions; division += 1) {
        const blockStart = 2 + ((division - 1) * (F1XL_CAPACITY.teams + 2));
        const blockEnd = blockStart + F1XL_CAPACITY.teams;
        const pointsLetter = divisionTemplateColumnLetter_(round + 1);
        weeklyParts.push('SUMIF(\'Weekly Totals Data\'!$A$' + blockStart + ':$A$' + blockEnd + ',$A' + row + ',\'Weekly Totals Data\'!$' + pointsLetter + '$' + blockStart + ':$' + pointsLetter + '$' + blockEnd + ')');
      }
      weekly.getRange(row, round + 1).setFormula('=IF($A' + row + '="","",' + weeklyParts.join('+') + ')');
    }
  }
  overall.getRange(firstTeamRow, 4, F1XL_CAPACITY.teams, 5).clearContent();
  overall.getRange(firstTeamRow, 4).setFormula('=SORT(FILTER(\'Overall Standings Data\'!A20:E' + (19 + F1XL_CAPACITY.teams) + ',\'Overall Standings Data\'!C20:C' + (19 + F1XL_CAPACITY.teams) + '<>""),1,TRUE)');
}

function seasonMasterApplyTabPresentation_(workbook, divisions) {
  ['Start Here', 'Calendar', 'Season Entrants', 'Teams & Principals', 'Division Line-ups'].forEach(function(name) { workbook.getSheetByName(name).setTabColor(F1XL_SEASON_MASTER.colours.setup); });
  ['Summary', 'Penalty Guide', 'Outstanding Bans'].forEach(function(name) { workbook.getSheetByName(name).setTabColor(F1XL_SEASON_MASTER.colours.licence); });
  for (let division = 1; division <= F1XL_CAPACITY.divisions; division += 1) workbook.getSheetByName('Division ' + division).setTabColor(F1XL_SEASON_MASTER.colours.licence);
  ['Overall Standings', 'Weekly Totals'].forEach(function(name) { workbook.getSheetByName(name).setTabColor(F1XL_SEASON_MASTER.colours.overall); });
  ['Weekly Totals Data', 'Overall Standings Data', 'Data'].forEach(function(name) { workbook.getSheetByName(name).setTabColor(F1XL_SEASON_MASTER.colours.technical); });
}

function seasonMasterSetHeader_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_SEASON_MASTER.colours.setup);
  sheet.setFrozenRows(1);
}

function seasonMasterCopySheet_(sourceWorkbook, sourceName, targetWorkbook, targetName) {
  const source = sourceWorkbook.getSheetByName(sourceName);
  if (!source) throw new Error('The source template is missing the ' + sourceName + ' tab.');
  return source.copyTo(targetWorkbook).setName(targetName);
}

function seasonMasterReplaceFormulaText_(sheet, search, replacement) {
  sheet.getDataRange().createTextFinder(search).matchFormulaText(true).replaceAllWith(replacement);
}

function seasonMasterReplaceFormulaTextInRange_(range, search, replacement) {
  range.createTextFinder(search).matchFormulaText(true).replaceAllWith(replacement);
}

function seasonMasterReplaceValueText_(sheet, search, replacement) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const formulas = range.getFormulas();
  for (let row = 0; row < values.length; row += 1) {
    for (let column = 0; column < values[row].length; column += 1) {
      if (!formulas[row][column] && typeof values[row][column] === 'string' && values[row][column].indexOf(search) !== -1) {
        sheet.getRange(row + 1, column + 1).setValue(values[row][column].split(search).join(replacement));
      }
    }
  }
}

function seasonMasterValidateSources_(calendar, licence, overall) {
  if (!calendar.getSheetByName('Calendar')) throw new Error('Calendar template: Calendar tab not found.');
  ['Summary', 'Penalty Guide', 'Division 1', 'Division 2', 'Division 3', 'Division 4', 'Division 5', 'Outstanding Bans'].forEach(function(name) {
    if (!licence.getSheetByName(name)) throw new Error('Drivers Licence template: ' + name + ' tab not found.');
  });
  ['Overall Standings', 'Weekly Totals', 'Weekly Totals Data', 'Overall Standings Data', 'Data'].forEach(function(name) {
    if (!overall.getSheetByName(name)) throw new Error('Overall template: ' + name + ' tab not found.');
  });
}

function seasonMasterNormaliseSetup_(input) {
  const season = String(input && input.season || '').trim();
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Enter a valid season number, for example 29.');
  const rounds = Number(input && input.rounds || 0);
  const divisions = Number(input && input.divisions || 0);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > F1XL_CAPACITY.rounds) throw new Error('Rounds must be a whole number from 1 to ' + F1XL_CAPACITY.rounds + '.');
  if (!Number.isInteger(divisions) || divisions < 1 || divisions > F1XL_CAPACITY.divisions) throw new Error('Divisions must be a whole number from 1 to ' + F1XL_CAPACITY.divisions + '.');
  const modeText = String(input && input.mode || 'Modern').trim().toLowerCase();
  const mode = modeText === 'historical' ? 'Historical' : 'Modern';
  const teamsValue = input && input.teams;
  const teams = Number(teamsValue == null || teamsValue === '' ? Math.min(8, F1XL_CAPACITY.teams) : teamsValue);
  if (!Number.isInteger(teams) || teams < 1 || teams > F1XL_CAPACITY.teams) throw new Error('Teams must be a whole number from 1 to ' + F1XL_CAPACITY.teams + '.');
  const teamPrincipals = String(input && input.teamPrincipals || 'Unknown').trim();
  if (['Yes','No','Unknown'].indexOf(teamPrincipals) < 0) throw new Error('Team Principals must be Yes, No or Unknown.');
  const scoringSystem = String(input && input.scoringSystem || 'Standard').trim() || 'Standard';
  return { season: season, rounds: rounds, divisions: divisions, mode:mode, teams:teams, teamPrincipals:teamPrincipals, scoringSystem:scoringSystem };
}

function seasonMasterPropertyKey_(season) {
  return F1XL_SEASON_MASTER.propertyPrefix + String(season).replace(/\./g, '_');
}

function seasonMasterIsPlanning_(workbook) {
  const start = workbook.getSheetByName('Start Here');
  return !!start && String(start.getRange('I7').getDisplayValue()).trim() === 'Preseason';
}

function seasonMasterAssertReady_(workbook) {
  if (seasonMasterIsPlanning_(workbook)) throw new Error('This Season Master is in preseason. Use New Season for its dates; divisions and operational setup follow after placement.');
}

function seasonMasterAssertTestWorkbook_(workbook) {
  if (!workbook || !/^TEST\s*-/i.test(fapWorkbookLegacyName_(workbook.getName()))) {
    throw new Error('For safety, this action is restricted to a clearly labelled TEST Season Master. Nothing was changed.');
  }
}
