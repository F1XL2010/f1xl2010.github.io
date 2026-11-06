/**
 * Builds one clean reusable Division Template from the proven Season 28
 * workbook, then creates each season Division by copying that template.
 * The trusted source is never edited. Shared setup comes from the selected
 * Season Master through hidden compatibility adapters.
 */
const F1XL_DIVISION_TEMPLATE = Object.freeze({
  sourceSpreadsheetId: '1cUtBl-R9lbAeNf9Ctlo5AgKr0B7XXJ6OayCqCjw9280',
  templatePropertyKey: 'F1XL_DIVISION_TEMPLATE_ID_V1',
  templateName: 'F1XL Division Workbook Template',
  propertyPrefix: 'F1XL_DIVISION_WORKBOOK_',
  maxRounds: F1XL_CAPACITY.rounds,
  roundHistoryHandler: 'divisionTemplateRoundHistoryOnEdit',
  capacityMarkerRange: 'AZ1:BA4',
  colours: { setup: '#1b5e20', technical: '#666666' }
});

function getDivisionWorkbookTemplate() { fapAssertEntry_('getDivisionWorkbookTemplate');
  const id = PropertiesService.getScriptProperties().getProperty(F1XL_DIVISION_TEMPLATE.templatePropertyKey);
  if (!id) return { ok:true, configured:false, message:'The new Division Template has not been created yet.' };
  try {
    const workbook = SpreadsheetApp.openById(id);
    return { ok:true, configured:true, spreadsheetId:id, name:workbook.getName(), url:workbook.getUrl(), message:'Division Template connected.' };
  } catch (error) {
    return { ok:true, configured:false, spreadsheetId:id, message:'The connected Division Template is unavailable.' };
  }
}

function createDivisionWorkbookTemplate() { fapAssertEntry_('createDivisionWorkbookTemplate');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const existingId = properties.getProperty(F1XL_DIVISION_TEMPLATE.templatePropertyKey);
    if (existingId) {
      const existing = SpreadsheetApp.openById(existingId);
      return { ok:true, created:false, configured:true, spreadsheetId:existingId, name:existing.getName(), url:existing.getUrl(), message:'The Division Template already exists. No duplicate was created.' };
    }
    const source = DriveApp.getFileById(F1XL_DIVISION_TEMPLATE.sourceSpreadsheetId);
    const referenceId = properties.getProperty(F1XL_REFERENCE_DATA.propertyKey);
    if (!referenceId) throw new Error('Create or connect Permanent Reference Data before creating the Division Template.');
    const referenceFile = DriveApp.getFileById(referenceId);
    const parents = referenceFile.getParents();
    const copy = parents.hasNext() ? source.makeCopy(fapWorkbookNewName_(F1XL_DIVISION_TEMPLATE.templateName), parents.next()) : source.makeCopy(fapWorkbookNewName_(F1XL_DIVISION_TEMPLATE.templateName));
    const workbook = SpreadsheetApp.openById(copy.getId());
    try {
      divisionTemplateBuildBase_(workbook);
      properties.setProperty(F1XL_DIVISION_TEMPLATE.templatePropertyKey, workbook.getId());
      CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
      return { ok:true, created:true, configured:true, spreadsheetId:workbook.getId(), name:workbook.getName(), url:workbook.getUrl(), message:'The clean, reusable Division Template has been created. It contains no season entrants, results, calendar or licence entries.' };
    } catch (error) {
      workbook.setName('INCOMPLETE - ' + workbook.getName());
      throw new Error('The Division Template could not be completed. A clearly labelled INCOMPLETE copy was left in Drive for inspection. ' + error.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/** Upgrades the connected reusable template without recreating it. */
function repairDivisionWorkbookTemplate() { fapAssertEntry_('repairDivisionWorkbookTemplate');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const id = PropertiesService.getScriptProperties().getProperty(F1XL_DIVISION_TEMPLATE.templatePropertyKey);
    if (!id) throw new Error('Create the Division Template before repairing it.');
    const workbook = SpreadsheetApp.openById(id);
    assertSeasonWorkbookWritable_(null, workbook);
    if (workbook.getName() !== F1XL_DIVISION_TEMPLATE.templateName) throw new Error('The connected file is not the recognised reusable Division Template. Nothing was changed.');
    const standard = workbook.getSheetByName('_ROUND_STANDARD');
    const sprint = workbook.getSheetByName('_ROUND_SPRINT');
    if (!standard || !sprint) throw new Error('The reusable template is missing its Standard or Sprint round prototype. Nothing was changed.');
    divisionTemplateConfigureRoundDerivedInputs_(standard, false);
    divisionTemplateConfigureRoundDerivedInputs_(sprint, true);
    divisionTemplateConfigureHistoricalRoundNumbers_(standard, false);
    divisionTemplateConfigureHistoricalRoundNumbers_(sprint, true);
    divisionTemplateClearCalculationInputs_(workbook);
    divisionTemplateNeutraliseSeatColours_(workbook);
    SpreadsheetApp.flush();
    return { ok:true, configured:true, spreadsheetId:id, name:workbook.getName(), url:workbook.getUrl(), message:'The reusable Division Template round, driver-stat and constructor formulas were repaired. It remains empty of season data.' };
  } finally {
    lock.releaseLock();
  }
}

function createDivisionWorkbook(input) { fapAssertEntry_('createDivisionWorkbook');
  assertSeasonWritable_(input && input.season);
  const season = String(input && input.season || '').trim();
  const division = Number(input && input.division || 0);
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Choose a connected season first.');
  if (!Number.isInteger(division) || division < 1 || division > F1XL_CAPACITY.divisions) throw new Error('Choose a valid division.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const masterId = properties.getProperty(seasonMasterPropertyKey_(season));
    if (!masterId) throw new Error('Season ' + season + ' does not have a connected Season Master.');
    const master = SpreadsheetApp.openById(masterId);
    seasonMasterAssertTestWorkbook_(master);
    assertSeasonWorkbookWritable_(season, master);
    const key = divisionTemplatePropertyKey_(season, division);
    const existingId = properties.getProperty(key);
    if (existingId) {
      const existingFile = DriveApp.getFileById(existingId);
      if (existingFile.isTrashed()) {
        // Moving an unwanted TEST Division to the Google Drive bin is the
        // recoverable way to request a clean replacement. Do not require a
        // separate repair/reset button just to clear this stale connection.
        properties.deleteProperty(key);
      } else {
        const existing = SpreadsheetApp.openById(existingId);
        divisionTemplateAssertTestWorkbook_(existing);
        trackRecordsRegisterSafely_(existing,season,division);
        return { ok:true, created:false, workbook:divisionTemplateWorkbookSummary_(existing, season, division), message:'This Division workbook already exists. No duplicate was created.' };
      }
    }

    const setup = divisionTemplateReadMasterSetup_(master, season, division);
    const masterFile = DriveApp.getFileById(masterId);
    const parents = masterFile.getParents();
    const parent = parents.hasNext() ? parents.next() : null;
    const name = 'TEST - F1XL Season ' + season + ' Division ' + division + ' Data';
    const unregistered = divisionTemplateFindUnregisteredWorkbook_(parent, name, setup);
    if (unregistered) {
      assertSeasonWorkbookWritable_(season, unregistered);
      properties.setProperty(key, unregistered.getId());
      divisionTemplateConnectOverall_(master, division, unregistered.getId());
      trackRecordsRegisterSafely_(unregistered,season,division);
      CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
      return {
        ok:true,
        created:false,
        reconnected:true,
        workbook:divisionTemplateWorkbookSummary_(unregistered, season, division),
        message:'The completed Season ' + season + ' Division ' + division + ' workbook was found and reconnected. No duplicate was created.'
      };
    }
    const templateId = properties.getProperty(F1XL_DIVISION_TEMPLATE.templatePropertyKey);
    if (!templateId) throw new Error('Create the clean Division Template before creating season Division workbooks.');
    const sourceFile = DriveApp.getFileById(templateId);
    const copiedFile = parent ? sourceFile.makeCopy(fapWorkbookNewName_(name), parent) : sourceFile.makeCopy(fapWorkbookNewName_(name));
    const workbook = SpreadsheetApp.openById(copiedFile.getId());
    try {
      divisionTemplateBuild_(workbook, master, setup);
      // Historical workbooks use ordinary Sheet formulas for their derived
      // car numbers and teams, so they do not consume an installable on-edit
      // trigger. This also avoids exhausting the Apps Script trigger limit
      // while the archive is created.
      if (!/^historical$/i.test(setup.mode)) divisionTemplateEnsureRoundHistorySafety_(workbook);
      divisionTemplateMakeWebsiteReadable_(copiedFile);
      properties.setProperty(key, workbook.getId());
      divisionTemplateConnectOverall_(master, division, workbook.getId());
      trackRecordsRegisterSafely_(workbook,season,division);
      CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
      return {
        ok:true,
        created:true,
        workbook:divisionTemplateWorkbookSummary_(workbook, season, division),
        message:'Season ' + season + ' Division ' + division + ' test workbook created. Open Start Here and approve its Google Sheets connection. Enter historical information directly in the round and standings tabs, then use the normal Career Stats refresh when ready.'
      };
    } catch (error) {
      workbook.setName('INCOMPLETE - ' + workbook.getName());
      throw new Error('The Division workbook could not be completed. A clearly labelled INCOMPLETE copy was left in Drive for inspection. ' + error.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/** Recover a successfully built workbook whose long browser request ended
 * before the script property was saved. Only one exact, complete TEST match
 * beside the Season Master may be adopted; ambiguity is never guessed. */
function divisionTemplateFindUnregisteredWorkbook_(parent, name, setup) {
  const files = parent ? fapWorkbookFilesByName_(parent,name) : fapWorkbookFilesByName_(DriveApp,name);
  const matches = [];
  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed()) continue;
    try {
      const workbook = SpreadsheetApp.openById(file.getId());
      divisionTemplateAssertTestWorkbook_(workbook);
      const start = workbook.getSheetByName('Start Here');
      if (!start || String(start.getRange('B3').getDisplayValue() || '').trim() !== String(setup.season)) continue;
      if (Number(start.getRange('B4').getValue()) !== Number(setup.division)) continue;
      if (!workbook.getSheetByName('Data') || !workbook.getSheetByName('Race Calendar') || !workbook.getSheetByName('Driver License')) continue;
      let complete = true;
      for (let round = 1; round <= setup.rounds; round += 1) {
        if (!workbook.getSheetByName('R' + round)) { complete = false; break; }
      }
      if (complete) matches.push(workbook);
    } catch (error) {
      // An unrelated or partially generated exact-name file is not adopted.
    }
  }
  if (matches.length > 1) throw new Error('More than one completed unregistered ' + name + ' workbook exists beside the Season Master. Move the unwanted copies to the Drive bin before retrying. Nothing was connected or created.');
  return matches[0] || null;
}

/** Lightweight read-only confirmation used when the browser stops waiting for
 * a long Google Sheets build before its successful response arrives. */
function getDivisionWorkbookCreationStatus(input) { fapAssertEntry_('getDivisionWorkbookCreationStatus');
  const season = String(input && input.season || '').trim();
  const division = Number(input && input.division || 0);
  if (!/^\d+(?:\.5)?$/.test(season) || !Number.isInteger(division) || division < 1 || division > F1XL_CAPACITY.divisions) {
    return { ok:true, created:false, message:'The requested Division could not be identified.' };
  }
  const id = PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(season, division));
  if (!id) return { ok:true, created:false, message:'Google has not registered this Division workbook.' };
  try {
    const workbook = SpreadsheetApp.openById(id);
    divisionTemplateAssertTestWorkbook_(workbook);
    return {
      ok:true,
      created:true,
      workbook:divisionTemplateWorkbookSummary_(workbook, season, division),
      message:'Google completed and registered Season ' + season + ' Division ' + division + ', although the original browser response was lost.'
    };
  } catch (error) {
    return { ok:true, created:false, message:'A Division ID was registered, but its workbook is unavailable: ' + String(error && error.message || error) };
  }
}

/**
 * Restores recognised formula cells in an existing TEST Division workbook.
 * A disposable copy of the current reusable template is built for the chosen
 * season, then only its formula cells are copied to the live workbook. No live
 * tab is cleared, rebuilt, deleted or inserted. A checked backup is created
 * immediately before the first formula is written.
 */
function repairTestDivisionWorkbook(input) { fapAssertEntry_('repairTestDivisionWorkbook');
  assertSeasonWritable_(input && input.season);
  const season = String(input && input.season || '').trim();
  const division = Number(input && input.division || 0);
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Choose a connected test season first.');
  if (!Number.isInteger(division) || division < 1 || division > F1XL_CAPACITY.divisions) throw new Error('Choose a valid division.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const masterId = properties.getProperty(seasonMasterPropertyKey_(season));
    const workbookId = properties.getProperty(divisionTemplatePropertyKey_(season, division));
    if (!masterId || !workbookId) throw new Error('This test Season Master and Division workbook must both be connected first.');
    const master = SpreadsheetApp.openById(masterId);
    const workbook = SpreadsheetApp.openById(workbookId);
    seasonMasterAssertTestWorkbook_(master);
    divisionTemplateAssertTestWorkbook_(workbook);
    assertSeasonWorkbookWritable_(season, master);
    assertSeasonWorkbookWritable_(season, workbook);
    const setup = divisionTemplateReadMasterSetup_(master, season, division);
    let formulaSource = null;
    let backup = null;
    try {
      formulaSource = divisionTemplateCreateFormulaRepairSource_(master, setup);
      const plan = divisionTemplatePlanFormulaRepair_(formulaSource.workbook, workbook);
      if (!plan.formulaCount) throw new Error('The current Division Template produced no recognised formulas. Nothing was changed.');

      backup = divisionTemplateCreateRepairBackup_(workbook, season, division);
      divisionTemplateApplyFormulaRepair_(workbook, plan);
      if (!/^historical$/i.test(setup.mode)) divisionTemplateEnsureRoundHistorySafety_(workbook);
      SpreadsheetApp.flush();
      return {
        ok:true,
        workbook:divisionTemplateWorkbookSummary_(workbook, season, division),
        backupUrl:backup.url,
        formulaCount:plan.formulaCount,
        sheetCount:plan.sheetCount,
        message:'Division ' + division + ' restored ' + plan.formulaCount + ' recognised formulas across ' + plan.sheetCount + ' tabs from the current Division Template. No tab was cleared, rebuilt, deleted or added, and existing non-formula cells were not changed. A temporary backup was created first.'
      };
    } catch (error) {
      if (backup) {
        throw new Error('Formula repair did not finish. The pre-repair backup is available at ' + backup.url + '. ' + String(error && error.message || error));
      }
      throw error;
    } finally {
      divisionTemplateDiscardFormulaRepairSource_(formulaSource);
    }
  } finally {
    lock.releaseLock();
  }
}

/** Targeted repair: only the derived C:M team summary, never results or points. */
function repairTestDivisionTeamStatistics(input) { fapAssertEntry_('repairTestDivisionTeamStatistics');
  const season = String(input && input.season || '').trim();
  const division = Number(input && input.division || 0);
  if (!/^\d+(?:\.5)?$/.test(season) || !Number.isInteger(division) || division < 1 || division > F1XL_CAPACITY.divisions) throw new Error('Choose a valid test season and division.');
  assertSeasonWritable_(season);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let backup;
  try {
    const properties = PropertiesService.getScriptProperties();
    const masterId = properties.getProperty(seasonMasterPropertyKey_(season));
    const workbookId = properties.getProperty(divisionTemplatePropertyKey_(season, division));
    if (!masterId || !workbookId) throw new Error('Both test workbooks must be connected first.');
    const master = SpreadsheetApp.openById(masterId), workbook = SpreadsheetApp.openById(workbookId);
    seasonMasterAssertTestWorkbook_(master);
    divisionTemplateAssertTestWorkbook_(workbook);
    assertSeasonWorkbookWritable_(season, master);
    assertSeasonWorkbookWritable_(season, workbook);
    const setup = divisionTemplateReadMasterSetup_(master, season, division);
    if (/^historical$/i.test(setup.mode)) throw new Error('This targeted repair is for the modern test season, not historical archives.');
    const sheet = workbook.getSheetByName('Team Stats Calc Sheet');
    if (!sheet || !workbook.getSheetByName('Constructors Results NoSort')) throw new Error('The team calculation tabs are missing. Nothing was changed.');
    const headings = sheet.getRange(1, 1, 1, 13).getDisplayValues()[0];
    if (headings[0] !== 'Team' || headings[1] !== 'Total Points' || headings[3] !== 'Podiums' || headings[12] !== 'Avg Sprint Finish T2') throw new Error('The team-stat layout is not recognised. Nothing was changed.');
    setup.calendar.forEach(function(round) { if (!workbook.getSheetByName('R' + round.round)) throw new Error('Missing R' + round.round + '. Nothing was changed.'); });
    const formulas = divisionTemplateTeamSummaryFormulas_(setup.calendar);
    backup = divisionTemplateCreateRepairBackup_(workbook, season, division);
    const range = sheet.getRange(2, 3, F1XL_CAPACITY.teams, 11);
    range.setFormulas(formulas);
    SpreadsheetApp.flush();
    if (JSON.stringify(range.getFormulas()) !== JSON.stringify(formulas)) throw new Error('The saved formulas did not match the repair.');
    const errors = range.getDisplayValues().some(function(row) { return row.some(function(value) { return /^#(?:REF!|VALUE!|NAME\?|ERROR!|DIV\/0!|N\/A|NUM!)/.test(value); }); });
    if (errors) throw new Error('The repaired team summary contains a spreadsheet error. Check its source connections.');
    return { ok:true, division:division, backupUrl:backup.url, message:'D' + division + ' team statistics repaired and checked. Update the website to publish the corrected values.' };
  } catch (error) {
    throw new Error(String(error && error.message || error) + (backup ? ' Pre-repair backup: ' + backup.url : ''));
  } finally {
    lock.releaseLock();
  }
}

function divisionTemplateCreateFormulaRepairSource_(master, setup) {
  const templateId = PropertiesService.getScriptProperties().getProperty(F1XL_DIVISION_TEMPLATE.templatePropertyKey);
  if (!templateId) throw new Error('Create or connect the current Division Template before repairing formulas. Nothing was changed.');
  const templateFile = DriveApp.getFileById(templateId);
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyyMMdd-HHmmss');
  const sourceFile = templateFile.makeCopy(fapWorkbookNewName_('TEMP - Division formula repair source - S' + setup.season + ' D' + setup.division + ' - ' + timestamp));
  const source = { file:sourceFile, workbook:SpreadsheetApp.openById(sourceFile.getId()) };
  try {
    divisionTemplateBuild_(source.workbook, master, setup, { skipMasterLicence:true });
    SpreadsheetApp.flush();
    return source;
  } catch (error) {
    divisionTemplateDiscardFormulaRepairSource_(source);
    throw new Error('The current Division Template could not produce a safe formula source. The selected Division was not changed. ' + String(error && error.message || error));
  }
}

function divisionTemplateDiscardFormulaRepairSource_(source) {
  if (!source || !source.file) return;
  try { source.file.setTrashed(true); } catch (error) {}
}

function divisionTemplatePlanFormulaRepair_(source, target) {
  const plan = { ranges:[], formulaCount:0, sheetCount:0 };
  const missing = [];
  source.getSheets().forEach(function(sourceSheet) {
    const formulas = sourceSheet.getDataRange().getFormulas();
    const ranges = divisionTemplateFormulaRectangles_(formulas);
    if (!ranges.length) return;
    const targetSheet = target.getSheetByName(sourceSheet.getName());
    if (!targetSheet) {
      missing.push(sourceSheet.getName());
      return;
    }
    const requiredRows = ranges.reduce(function(maximum, range) { return Math.max(maximum, range.row + range.formulas.length - 1); }, 0);
    const requiredColumns = ranges.reduce(function(maximum, range) { return Math.max(maximum, range.column + range.formulas[0].length - 1); }, 0);
    if (targetSheet.getMaxRows() < requiredRows || targetSheet.getMaxColumns() < requiredColumns) {
      throw new Error(sourceSheet.getName() + ' is smaller than the current template formula layout. No formulas were changed; use a reviewed copy-based migration for this workbook.');
    }
    ranges.forEach(function(range) {
      range.sheetName = sourceSheet.getName();
      plan.ranges.push(range);
      plan.formulaCount += range.formulas.length * range.formulas[0].length;
    });
    plan.sheetCount += 1;
  });
  if (missing.length) {
    throw new Error('This Division is missing template tab' + (missing.length === 1 ? ' ' : 's ') + missing.join(', ') + '. No formulas were changed.');
  }
  return plan;
}

function divisionTemplateFormulaRectangles_(formulas) {
  const rectangles = [];
  const active = {};
  for (let row = 0; row < formulas.length; row += 1) {
    const runs = [];
    let start = -1;
    for (let column = 0; column <= formulas[row].length; column += 1) {
      const hasFormula = column < formulas[row].length && !!formulas[row][column];
      if (hasFormula && start < 0) start = column;
      if (!hasFormula && start >= 0) {
        runs.push({ start:start, end:column - 1, values:formulas[row].slice(start, column) });
        start = -1;
      }
    }
    const continuing = {};
    runs.forEach(function(run) {
      const key = run.start + ':' + run.end;
      if (active[key] && active[key].lastRow === row - 1) {
        active[key].formulas.push(run.values);
        active[key].lastRow = row;
      } else {
        const rectangle = { row:row + 1, column:run.start + 1, formulas:[run.values], lastRow:row };
        rectangles.push(rectangle);
        active[key] = rectangle;
      }
      continuing[key] = true;
    });
    Object.keys(active).forEach(function(key) { if (!continuing[key]) delete active[key]; });
  }
  rectangles.forEach(function(rectangle) { delete rectangle.lastRow; });
  return rectangles;
}

function divisionTemplateCreateRepairBackup_(workbook, season, division) {
  SpreadsheetApp.flush();
  const sourceFile = DriveApp.getFileById(workbook.getId());
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyyMMdd-HHmmss');
  const name = 'TEMP BACKUP - ' + workbook.getName() + ' - before formula repair - ' + timestamp;
  const parents = sourceFile.getParents();
  const backupFile = parents.hasNext() ? sourceFile.makeCopy(fapWorkbookNewName_(name), parents.next()) : sourceFile.makeCopy(fapWorkbookNewName_(name));
  const backup = SpreadsheetApp.openById(backupFile.getId());
  const sourceSheets = workbook.getSheets();
  const backupSheets = backup.getSheets();
  if (sourceSheets.length !== backupSheets.length) {
    throw new Error('The temporary backup has a different number of tabs, so no formulas were changed.');
  }
  sourceSheets.forEach(function(sourceSheet) {
    const backupSheet = backup.getSheetByName(sourceSheet.getName());
    if (!backupSheet || backupSheet.getMaxRows() !== sourceSheet.getMaxRows() || backupSheet.getMaxColumns() !== sourceSheet.getMaxColumns()) {
      throw new Error('The temporary backup did not preserve the structure of ' + sourceSheet.getName() + ', so no formulas were changed.');
    }
  });
  return { id:backupFile.getId(), url:backup.getUrl(), season:season, division:division };
}

function divisionTemplateApplyFormulaRepair_(workbook, plan) {
  plan.ranges.forEach(function(item) {
    workbook.getSheetByName(item.sheetName).getRange(item.row, item.column, item.formulas.length, item.formulas[0].length).setFormulas(item.formulas);
  });
}

function divisionTemplateRefreshCareerSafely_(master, season) {
  try {
    careerFormulaRefreshMasterExport_(master, season);
    return { ok:true, message:'Career Stats refreshed.' };
  } catch (error) {
    return { ok:false, message:String(error && error.message || error || 'Unknown Career Stats error') };
  }
}

function divisionTemplateAssertTestWorkbook_(workbook) {
  if (!workbook || !/^TEST\s*-/i.test(fapWorkbookLegacyName_(workbook.getName()))) {
    throw new Error('For safety, this action is restricted to a clearly labelled TEST Division workbook. Nothing was changed.');
  }
}

/**
 * Clears copied, pre-existing licence input values from a TEST Season Master
 * only. This is deliberately a separate, confirmed action: normal Division
 * creation never clears licence data by itself.
 */
function resetTestMasterLicenceTemplate(input) { fapAssertEntry_('resetTestMasterLicenceTemplate');
  assertSeasonWritable_(input && input.season);
  const season = String(input && input.season || '').trim();
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Choose a connected season first.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const masterId = PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season));
    if (!masterId) throw new Error('Season ' + season + ' does not have a connected Season Master.');
    const master = SpreadsheetApp.openById(masterId);
    seasonMasterAssertTestWorkbook_(master);
    const start = master.getSheetByName('Start Here');
    assertSeasonWorkbookWritable_(season, master);
    const status = start ? String(start.getRange('B7').getDisplayValue()).trim() : '';
    if (!/^TEST/i.test(status) && !/^TEST\s*-/i.test(fapWorkbookLegacyName_(master.getName()))) {
      throw new Error('For safety, this reset is available only for a TEST Season Master.');
    }
    const division = Number(input && input.division || 1);
    const setup = divisionTemplateReadMasterSetup_(master, season, division);
    divisionTemplatePrepareMasterLicence_(master, setup, true);
    SpreadsheetApp.flush();
    return {
      ok:true,
      message:'The copied template licence entries have been cleared from Division ' + division + ' in this TEST Season Master. Your entrants, teams, calendar and results were not changed. You can now create Division ' + division + '.'
    };
  } finally {
    lock.releaseLock();
  }
}

function divisionTemplateBuild_(workbook, master, setup, options) {
  options = options || {};
  divisionTemplateValidateSource_(workbook);
  if (!options.skipMasterLicence) divisionTemplatePrepareMasterLicence_(master, setup);
  const oldStart = workbook.getSheetByName('Template Guide');
  if (oldStart) workbook.deleteSheet(oldStart);
  const oldImports = workbook.getSheetByName('Season Master Import');
  if (oldImports) workbook.deleteSheet(oldImports);
  const start = workbook.insertSheet('Start Here', 0);
  const imports = workbook.insertSheet('Season Master Import', 1);
  divisionTemplateCreateStartHere_(start, setup);
  divisionTemplateCreateImports_(imports, setup);
  divisionTemplatePrepareCalendar_(workbook, setup);
  divisionTemplatePrepareLicence_(workbook, setup);
  // Round scoring is built from the scoring-system snapshot copied into Data.
  // Populate that adapter before creating the round tabs so a clean template
  // does not try to read an empty scoring table.
  divisionTemplatePrepareData_(workbook, master, setup);
  divisionTemplateNeutraliseSeatColours_(workbook);
  divisionTemplatePrepareRoundSheets_(workbook, setup);
  divisionTemplateRebuildCalculations_(workbook, setup);
  divisionTemplateRemoveRedundantResultTabs_(workbook);
  divisionTemplateReplaceDivisionLabels_(workbook, setup.division);
  divisionTemplateNormaliseKnownTeamNames_(workbook);
  workbook.getSheets().forEach(function(sheet) { sheet.setHiddenGridlines(false); });
  imports.setTabColor(F1XL_DIVISION_TEMPLATE.colours.technical).hideSheet();
  start.setTabColor(F1XL_DIVISION_TEMPLATE.colours.setup);
  const driverStats = workbook.getSheetByName('Driver Stats Calc Sheet');
  if (driverStats) driverStats.showSheet();
  sheetPresentationSafely_(function() { sheetPresentationDivisionGuide_(start, setup); });
  workbook.setActiveSheet(start);
  SpreadsheetApp.flush();
}

function divisionTemplateBuildBase_(workbook) {
  divisionTemplateValidateSource_(workbook);
  const standard = workbook.getSheetByName('R1').copyTo(workbook).setName('_ROUND_STANDARD');
  const sprint = workbook.getSheetByName('R3').copyTo(workbook).setName('_ROUND_SPRINT');
  divisionTemplateSanitiseRound_(standard, false);
  divisionTemplateSanitiseRound_(sprint, true);
  divisionTemplateConfigureRoundDerivedInputs_(standard, false);
  divisionTemplateConfigureRoundDerivedInputs_(sprint, true);
  divisionTemplateConfigureHistoricalRoundNumbers_(standard, false);
  divisionTemplateConfigureHistoricalRoundNumbers_(sprint, true);
  for (let round = 1; round <= F1XL_DIVISION_TEMPLATE.maxRounds; round += 1) {
    const sheet = workbook.getSheetByName('R' + round);
    if (sheet) workbook.deleteSheet(sheet);
  }
  const oldGuide = workbook.getSheetByName('Template Guide');
  if (oldGuide) workbook.deleteSheet(oldGuide);
  const guide = workbook.insertSheet('Template Guide', 0);
  guide.getRange('A1:F1').merge().setValue('F1XL Division Workbook Template').setFontSize(18).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_DIVISION_TEMPLATE.colours.setup);
  guide.getRange('A3:F7').setValues([
    ['Purpose','Permanent clean source used to generate one workbook for each division.','','','',''],
    ['Do not enter season data here','Entrants, teams, calendar, licence information and results belong in generated season workbooks.','','','',''],
    ['Adaptable rounds','Generated copies create exactly the number of rounds selected in the Season Master.','','','',''],
    ['Sprint weekends','Each round independently uses the Standard or Sprint prototype chosen by the Season Master calendar.','','','',''],
    ['Manual fallback','The visible result and calculation layouts remain familiar; shared data adapters are hidden because the Season Master owns those inputs.','','','','']
  ]).setWrap(true);
  guide.getRange('A3:A7').setFontWeight('bold').setBackground('#d9ead3');
  guide.setColumnWidth(1, 190); guide.setColumnWidth(2, 590); [3,4,5,6].forEach(function(column) { guide.setColumnWidth(column, 80); });

  const imports = workbook.getSheetByName('Season Master Import') || workbook.insertSheet('Season Master Import', 1);
  imports.clear(); imports.getRange('A1').setValue('Technical adapter populated only in generated Division workbooks. Do not edit.');
  divisionTemplateClearAdapterTabs_(workbook);
  divisionTemplateNeutraliseSeatColours_(workbook);
  const lineups = workbook.getSheetByName('Driver Lineups');
  if (lineups) workbook.deleteSheet(lineups);
  divisionTemplateClearCalculationInputs_(workbook);
  divisionTemplateRemoveRedundantResultTabs_(workbook);
  ['Data','Race Calendar','Driver License','Season Master Import','_ROUND_STANDARD','_ROUND_SPRINT'].forEach(function(name) {
    const sheet = workbook.getSheetByName(name);
    if (sheet) { sheet.setTabColor(F1XL_DIVISION_TEMPLATE.colours.technical); sheet.hideSheet(); }
  });
  workbook.getSheets().forEach(function(sheet) { sheet.setHiddenGridlines(false); });
  workbook.setActiveSheet(guide);
  SpreadsheetApp.flush();
}

/** Keep the seat lookup readable without inherited team-colour bands. */
function divisionTemplateNeutraliseSeatColours_(workbook) {
  const data = workbook.getSheetByName('Data');
  if (data) data.getRange(2, 9, F1XL_CAPACITY.raceEntries, 6).setBackground(null).setFontColor('#000000');
}

function divisionTemplateClearAdapterTabs_(workbook) {
  const data = workbook.getSheetByName('Data');
  ['A3:G46','I2:N25','P3:T26','J27:K40','V3:X22','V25:Y463','AB2:AC100','AD2:AF100'].forEach(function(a1) {
    data.getRange(a1).clearContent();
  });
  const calendar = workbook.getSheetByName('Race Calendar');
  calendar.getRange(2, 1, calendar.getMaxRows() - 1, Math.min(calendar.getMaxColumns(), 4)).clearContent();
  const licence = workbook.getSheetByName('Driver License');
  const licenceColumns = Math.min(licence.getMaxColumns(), 110);
  licence.getRange(1, 1, Math.min(licence.getMaxRows(), 46), licenceColumns).clearContent();
}

function divisionTemplateClearCalculationInputs_(workbook) {
  divisionTemplateRebuildCalculations_(workbook, { calendar:[], division:1 });
  ['Driver Stats Calc Sheet','Driver Results NoSort','Driver Stats','Team Stats Calc Sheet','Constructors Standings NoSort','Constructors Results NoSort','Grand Prix Overview','Constructors Standings'].forEach(function(name) {
    const sheet = workbook.getSheetByName(name);
    if (sheet) sheet.hideSheet();
  });
}

function divisionTemplateReadMasterSetup_(master, season, division) {
  ['Start Here','Calendar','Season Entrants','Teams & Principals','Division Line-ups','Reference Snapshot'].forEach(function(name) {
    if (!master.getSheetByName(name)) throw new Error('The Season Master is missing its ' + name + ' tab.');
  });
  const start = master.getSheetByName('Start Here');
  const masterSeason = String(start.getRange('B3').getDisplayValue()).trim();
  const rounds = Number(start.getRange('B4').getValue());
  const divisions = Number(start.getRange('B5').getValue());
  const scoringSystem = String(start.getRange('I6').getDisplayValue() || '').trim();
  const mode = String(start.getRange('I3').getDisplayValue() || 'Modern').trim() || 'Modern';
  if (masterSeason && masterSeason !== season) throw new Error('The connected workbook identifies itself as Season ' + masterSeason + ', not Season ' + season + '.');
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > F1XL_CAPACITY.rounds) {
    throw new Error('The current proven Division calculation layout supports 1–' + F1XL_DIVISION_TEMPLATE.maxRounds + ' rounds. This Master contains ' + rounds + '.');
  }
  if (division > divisions) throw new Error('The Season Master currently contains only ' + divisions + ' division' + (divisions === 1 ? '' : 's') + '.');
  const calendar = master.getSheetByName('Calendar').getRange(2, 1, rounds, 4).getDisplayValues().map(function(row, index) {
    const type = String(row[1] || 'Standard').trim();
    return { round:index + 1, type:type, sprint:/sprint/i.test(type), earlySprint:/^(?:early|legacy)\s+sprint/i.test(type), date:row[2], track:row[3] };
  });
  let licenceColumn = 4;
  const licenceSessions = {};
  calendar.forEach(function(round) {
    const sessions = [];
    if (round.earlySprint) {
      sessions.push({ id:'qualifying', label:'R' + round.round + ' Quali', pointsColumn:licenceColumn, timeColumn:licenceColumn + 1 }); licenceColumn += 2;
      sessions.push({ id:'sprintRace', label:'R' + round.round + ' Sprint Race', pointsColumn:licenceColumn, timeColumn:licenceColumn + 1 }); licenceColumn += 2;
    } else if (round.sprint) {
      sessions.push({ id:'sprintQualifying', label:'R' + round.round + ' Sprint Quali', pointsColumn:licenceColumn, timeColumn:licenceColumn + 1 }); licenceColumn += 2;
      sessions.push({ id:'sprintRace', label:'R' + round.round + ' Sprint Race', pointsColumn:licenceColumn, timeColumn:licenceColumn + 1 }); licenceColumn += 2;
    }
    if (!round.sprint) { sessions.push({ id:'qualifying', label:'R' + round.round + ' Quali', pointsColumn:licenceColumn, timeColumn:licenceColumn + 1 }); licenceColumn += 2; }
    if (round.sprint && !round.earlySprint) { sessions.push({ id:'qualifying', label:'R' + round.round + ' Quali', pointsColumn:licenceColumn, timeColumn:licenceColumn + 1 }); licenceColumn += 2; }
    sessions.push({ id:'race', label:'R' + round.round + (round.earlySprint ? ' Feature Race' : ' Race'), pointsColumn:licenceColumn, timeColumn:licenceColumn + 1 }); licenceColumn += 2;
    licenceSessions[round.round] = sessions;
  });
  return { season:season, division:division, rounds:rounds, divisions:divisions, mode:mode, scoringSystem:scoringSystem, calendar:calendar, licenceSessions:licenceSessions, lastLicenceColumn:licenceColumn - 1, masterId:master.getId(), masterUrl:master.getUrl(), masterName:master.getName() };
}

function divisionTemplatePrepareMasterLicence_(master, setup, allowTestReset) {
  const properties = PropertiesService.getScriptProperties();
  // V2 distinguishes the corrected three-session Legacy Sprint layout from
  // the earlier build which incorrectly allocated a Sprint Qualifying column.
  const propertyKey = 'F1XL_LICENCE_LAYOUT_V2_' + String(setup.season).replace(/\./g, '_') + '_D' + setup.division;
  const signature = setup.calendar.map(function(round) { return round.round + ':' + (round.earlySprint ? 'E' : round.sprint ? 'S' : 'N'); }).join('|');
  const existingSignature = properties.getProperty(propertyKey);
  if (existingSignature === signature && !allowTestReset) return;
  if (existingSignature && existingSignature !== signature) {
    throw new Error('The Season Master licence layout was already prepared for a different sprint schedule. It was not changed because existing licence data must be protected.');
  }
  const minimumColumns = Math.max(setup.lastLicenceColumn + 5, 110);
  for (let division = setup.division; division <= setup.division; division += 1) {
    const sheet = master.getSheetByName('Division ' + division);
    if (!sheet) throw new Error('The Season Master is missing its Division ' + division + ' licence tab.');
    if (sheet.getMaxColumns() < minimumColumns) sheet.insertColumnsAfter(sheet.getMaxColumns(), minimumColumns - sheet.getMaxColumns());
    const existingEntries = sheet.getRange(3, 4, 44, sheet.getMaxColumns() - 3).getDisplayValues().some(function(row) { return row.some(function(value) { return value !== ''; }); });
    if (existingEntries && !allowTestReset) {
      throw new Error('LICENCE_RESET_REQUIRED: Division ' + division + ' contains copied template licence entries. No existing data was changed.');
    }
    sheet.getRange(3, 1, 44, 3).clearContent();
    const lineupStart = 6 + ((division - 1) * 30);
    const driverFormulas = [];
    for (let index = 0; index < F1XL_CAPACITY.seasonDriversPerDivision; index += 1) {
      if (index < F1XL_CAPACITY.raceEntries) driverFormulas.push(["=IFERROR('Division Line-ups'!B" + (lineupStart + index) + ',"")']);
      else driverFormulas.push(["=IFERROR('Division Line-ups'!H" + (lineupStart + index - F1XL_CAPACITY.raceEntries) + ',"")']);
    }
    sheet.getRange(3, 1, driverFormulas.length, 1).setFormulas(driverFormulas);
    sheet.getRange('A2').setValue('Driver');
    sheet.getRange('B1').setValue('Seconds');
    sheet.getRange('B2:C2').setValues([['Points','Time (seconds)']]);
    sheet.getRange(1, 4, 2, sheet.getMaxColumns() - 3).clearContent();
    Object.keys(setup.licenceSessions).forEach(function(round) {
      setup.licenceSessions[round].forEach(function(session) {
        sheet.getRange(1, session.pointsColumn).setValue(session.label);
        sheet.getRange(2, session.pointsColumn, 1, 2).setValues([['Points','Time (seconds)']]);
      });
    });
    const additionalColumn = setup.lastLicenceColumn + 1;
    sheet.getRange(1, additionalColumn).setValue('Additional Penalties');
    sheet.getRange(2, additionalColumn, 1, 2).setValues([['Points','Time (seconds)']]);
    sheet.getRange(1, additionalColumn + 2).setValue('Seconds');
    sheet.getRange(2, additionalColumn + 2, 1, 2).setValues([['Points','Time (seconds)']]);
    sheet.getRange(3, 4, 44, sheet.getMaxColumns() - 3).clearContent();
  }
  licenceRestoreTotals_(master,setup);
  sheetPresentationSafely_(function() { sheetPresentationLicence_(master.getSheetByName('Division ' + setup.division), setup); });
  properties.setProperty(propertyKey, signature);
}

function divisionTemplateCreateStartHere_(sheet, setup) {
  sheet.getRange('A1:F1').merge().setValue('F1XL Season ' + setup.season + ' — Division ' + setup.division).setFontSize(18).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_DIVISION_TEMPLATE.colours.setup);
  sheet.getRange('A3:B8').setValues([
    ['Season', setup.season], ['Division', setup.division], ['Rounds', setup.rounds], ['Season Master', setup.masterName], ['Created', new Date()], ['Status', 'TEST — not connected to the public website']
  ]);
  sheet.getRange('A3:A8').setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange('B7').setNumberFormat('dd mmm yyyy HH:mm');
  sheet.getRange('A10:F10').merge().setValue('One-time Google Sheets connection').setFontWeight('bold').setFontColor('#ffffff').setBackground('#9c6500');
  sheet.getRange('A11:F11').merge().setValue('Click B13 below. If it shows #REF!, click Allow access. This connects this Division copy to its Season Master; it does not grant public access or alter Season 28.').setWrap(true).setBackground('#fff2cc');
  sheet.getRange('A13').setValue('Connection test').setFontWeight('bold');
  sheet.getRange('B13').setFormula('=IMPORTRANGE("' + setup.masterId + '","\'Start Here\'!A3:B3")');
  sheet.getRange('A15:F18').setValues([
    ['Where to work', '', '', '', '', ''],
    ['Season Master', 'Calendar, entrants, teams, line-ups and licence entries are maintained in the Season Master, not repeated here.', '', '', '', ''],
    ['R1, R2…', 'Enter qualifying and race information exactly as on the current Division sheets.', '', '', '', ''],
    ['Calculated tabs', 'The familiar standings, results and statistics tabs remain the calculation/output area. Hidden adapter tabs keep the proven formula pathways working.', '', '', '', '']
  ]);
  sheet.getRange('A15:F15').merge().setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_DIVISION_TEMPLATE.colours.setup);
  sheet.getRange('A16:A18').setFontWeight('bold');
  sheet.getRange('A16:F18').setWrap(true);
  sheet.setFrozenRows(1); sheet.setColumnWidth(1, 185); sheet.setColumnWidth(2, 570);
  [3,4,5,6].forEach(function(column) { sheet.setColumnWidth(column, 80); });
}

function divisionTemplateCreateImports_(sheet, setup) {
  // The line-up import spills through AC and the capacity marker lives at
  // AZ:BA. New Google Sheets start narrower than that, so widen this hidden
  // technical tab before writing either area.
  divisionTemplateEnsureSheetColumns_(sheet, 53);
  const id = setup.masterId;
  const blockStart = 4 + ((setup.division - 1) * 30);
  const blockEnd = blockStart + 25;
  const importReady = divisionTemplateRemoveLegacyEntrantSpillMarker_(sheet, id);
  const importCell = sheet.getRange('A1');
  if (!importReady) importCell.setFormula(divisionTemplateEntrantImportFormula_(id));
  importCell.setNote('Technical Season Entrants import. Formula-controlled; do not edit.');
  sheet.getRange('J1').setFormula('=IMPORTRANGE("' + id + '","\'Teams & Principals\'!A1:H' + (F1XL_CAPACITY.teams + 1) + '")');
  sheet.getRange('S1').setFormula('=IMPORTRANGE("' + id + '","\'Division Line-ups\'!A' + blockStart + ':K' + blockEnd + '")');
}

function divisionTemplateEnsureEntrantImportCapacity_(workbook, masterId) {
  const sheet = workbook.getSheetByName('Season Master Import');
  if (!sheet) return;
  const importReady = divisionTemplateRemoveLegacyEntrantSpillMarker_(sheet, masterId);
  const importCell = sheet.getRange('A1');
  if (!importReady) importCell.setFormula(divisionTemplateEntrantImportFormula_(masterId));
  importCell.setNote('Technical Season Entrants import. Formula-controlled; do not edit.');
}

/**
 * The old 200-entrant layout placed a label in A203, immediately below its
 * A1:H200 import. Once the import grew to A1:H501 that label blocked the array
 * expansion and left every stable Driver-ID export blank. Remove only that
 * exact legacy label; unexpected content is preserved and stops the repair.
 */
function divisionTemplateRemoveLegacyEntrantSpillMarker_(sheet, masterId) {
  const root = sheet.getRange('A1');
  const expectedFormula = divisionTemplateEntrantImportFormula_(masterId);
  const rootFormula = root.getFormula();
  const rootValue = String(root.getDisplayValue() || '').trim();
  // A successful array formula legitimately fills A203 with the 202nd entrant.
  // In that state A203 is imported output, not manual information to clear.
  if (rootFormula === expectedFormula && /^driver id$/i.test(rootValue)) return true;
  const cell = sheet.getRange('A203');
  const value = String(cell.getDisplayValue() || '').trim();
  const formula = cell.getFormula();
  if (!value && !formula) return false;
  if (!formula && value === 'Technical import ranges. Do not edit.') {
    cell.clearContent();
    return false;
  }
  throw new Error('Season Master Import A203 contains unexpected information, so the 500-driver import was not changed. Inspect that technical cell before retrying.');
}

function divisionTemplateEntrantImportFormula_(masterId) {
  return '=IMPORTRANGE("' + masterId + '","\'Season Entrants\'!A1:H' + (F1XL_CAPACITY.seasonEntrants + 1) + '")';
}

function divisionTemplatePrepareData_(workbook, master, setup) {
  const sheet = workbook.getSheetByName('Data');
  const seasonDriverLastRow = 2 + F1XL_CAPACITY.seasonDriversPerDivision;
  sheet.getRange('A3:G46').clearContent();
  // These rows are now formula-fed from the Season Master. Retaining the old
  // manual-entry dropdown rules can reject a valid imported value (for example
  // an updated controller label) while the generator is writing the formulas.
  sheet.getRange('A3:G46').clearDataValidations();
  sheet.getRange(2, 9, F1XL_CAPACITY.raceEntries, 6).clearContent().clearDataValidations();
  sheet.getRange(3, 16, F1XL_CAPACITY.raceEntries, 5).clearContent().clearDataValidations();
  sheet.getRange(29, 10, F1XL_CAPACITY.teams, 2).clearContent().clearDataValidations();

  const driverSources = ["'Season Master Import'!$T$3:$T$26", "'Season Master Import'!$Z$3:$Z$26"];
  setup.calendar.forEach(function(round) {
    const starts = round.earlySprint ? [9,37,94] : round.sprint ? [9,37,66,94] : [9,37];
    starts.forEach(function(start) {
      driverSources.push("'R" + round.round + "'!$D$" + start + ':$D$' + (start + F1XL_CAPACITY.raceEntries - 1));
    });
  });
  const allDrivers = '{' + driverSources.join(';') + '}';
  for (let row = 3; row <= seasonDriverLastRow; row += 1) {
    sheet.getRange(row, 1, 1, 7).setFormulas([[
      '=IFERROR(INDEX(UNIQUE(FILTER(' + allDrivers + ',' + allDrivers + '<>"")),ROWS($A$3:A' + row + ')),"")',
      '=IFERROR(VLOOKUP(A' + row + ',\'Season Master Import\'!$B:$C,2,FALSE),"")',
      '=IFERROR(VLOOKUP(B' + row + ',$V:$X,3,FALSE),"")',
      '=IFERROR(INDEX(\'Season Master Import\'!$W$3:$W$26,MATCH(A' + row + ',\'Season Master Import\'!$T$3:$T$26,0)),IFERROR(VLOOKUP(A' + row + ',\'Season Master Import\'!$B:$H,4,FALSE),IF(A' + row + '="","","Reserve")))',
      '=IFERROR(INDEX(\'Season Master Import\'!$X$3:$X$26,MATCH(A' + row + ',\'Season Master Import\'!$T$3:$T$26,0)),IFERROR(INDEX(\'Season Master Import\'!$AC$3:$AC$26,MATCH(A' + row + ',\'Season Master Import\'!$Z$3:$Z$26,0)),IFERROR(VLOOKUP(A' + row + ',\'Season Master Import\'!$B:$H,5,FALSE),"")))',
      '=IFERROR(VLOOKUP(A' + row + ',\'Season Master Import\'!$B:$H,6,FALSE),"")',
      '=IFERROR(VLOOKUP(A' + row + ',\'Season Master Import\'!$B:$H,7,FALSE),"")'
    ]]);
  }
  for (let row = 2; row < 2 + F1XL_CAPACITY.raceEntries; row += 1) {
    const imported = row + 1;
    sheet.getRange(row, 9, 1, 6).setFormulas([[
      '=IFERROR(\'Season Master Import\'!S' + imported + ',"")',
      '=IFERROR(\'Season Master Import\'!T' + imported + ',"")',
      '=IFERROR(VLOOKUP(J' + row + ',$A:$G,6,FALSE),"")',
      '=IFERROR(VLOOKUP(J' + row + ',$A:$G,7,FALSE),"")',
      '=IFERROR(\'Season Master Import\'!W' + imported + ',"")',
      '=IFERROR(\'Season Master Import\'!X' + imported + ',"")'
    ]]);
  }
  for (let row = 3; row < 3 + F1XL_CAPACITY.raceEntries; row += 1) {
    sheet.getRange(row, 16, 1, 4).setFormulas([[
      '=IFERROR(\'Season Master Import\'!Z' + row + ',"")',
      '=IFERROR(VLOOKUP(P' + row + ',$A:$G,6,FALSE),"")',
      '=IFERROR(VLOOKUP(P' + row + ',$A:$G,7,FALSE),"")',
      '=IFERROR(\'Season Master Import\'!AC' + row + ',"")'
    ]]);
  }
  for (let row = 29; row < 29 + F1XL_CAPACITY.teams; row += 1) {
    const imported = row - 27;
    sheet.getRange(row, 10, 1, 2).setFormulas([[
      '=IFERROR(\'Season Master Import\'!N' + imported + ',"")',
      '=IFERROR(\'Season Master Import\'!J' + imported + ',"")'
    ]]);
  }
  divisionTemplateCopyReferenceSnapshot_(sheet, master);
}

function divisionTemplateCopyReferenceSnapshot_(data, master) {
  const snapshot = master.getSheetByName('Reference Snapshot');
  data.getRange('V3:X22').clearContent();
  const teams = master.getSheetByName('Teams & Principals').getRange(2, 1, F1XL_CAPACITY.teams, 3).getDisplayValues().filter(function(row) { return row[0]; });
  if (teams.length) data.getRange(3, 22, teams.length, 3).setValues(teams);

  const categories = [
    { source:'BN2:BN100', target:'Y2:Y100' },
    { source:'BK2:BK100', target:'Z3:Z101' },
    { source:'BL2:BL100', target:'AA2:AA100' },
    { source:'BO2:BO100', target:'AB2:AB100' },
    { source:'BM2:BM100', target:'AC2:AC100' }
  ];
  categories.forEach(function(item) {
    const values = snapshot.getRange(item.source).getDisplayValues().filter(function(row) { return row[0]; });
    data.getRange(item.target).clearContent();
    if (values.length) data.getRange(item.target.split(':')[0]).offset(0, 0, values.length, 1).setValues(values);
  });

  data.getRange('V25:Y463').clearContent();
  const countries = snapshot.getRange('Q2:U500').getDisplayValues().filter(function(row) { return row[1]; }).map(function(row) { return [row[1],row[2],row[3],row[4]]; });
  if (countries.length) data.getRange(25, 22, countries.length, 4).setValues(countries);
  data.getRange('AD2:AF100').clearContent();
  const tracks = snapshot.getRange('J2:O200').getDisplayValues().filter(function(row) { return row[1] && row[5] === 'Yes'; }).map(function(row) {
    return [row[1],row[2],(row[3] + ' ' + row[4]).trim()];
  });
  if (tracks.length) data.getRange(2, 30, tracks.length, 3).setValues(tracks);

  if (data.getMaxColumns() < 38) data.insertColumnsAfter(data.getMaxColumns(), 38 - data.getMaxColumns());
  data.getRange('AG1:AL500').clearContent();
  const scoring = snapshot.getRange('AV1:BA500').getDisplayValues().filter(function(row, index) {
    return index === 0 || row.some(function(value) { return value !== ''; });
  });
  if (scoring.length) data.getRange(1, 33, scoring.length, 6).setValues(scoring);
  data.getRange('AG1').setNote('Technical copy of Permanent Reference Data scoring systems. Do not enter results here.');
}

function divisionTemplatePrepareCalendar_(workbook, setup) {
  const sheet = workbook.getSheetByName('Race Calendar');
  const imports = workbook.getSheetByName('Season Master Import');
  if (imports) imports.getRange('AE1:AH33').clearContent();
  const requiredRows = F1XL_CAPACITY.rounds + 2;
  if (sheet.getMaxRows() < requiredRows) sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  sheet.getRange(2, 1, F1XL_CAPACITY.rounds + 1, 4).clearContent().clearDataValidations();
  if (setup.rounds) {
    const roundValues = setup.calendar.map(function(round) {
      return [round.round, round.sprint ? round.type : ''];
    });
    sheet.getRange(2, 1, roundValues.length, 2).setValues(roundValues);
    const finalRow = setup.rounds + 1;
    // Race Calendar keeps its familiar local layout, but Date and Track now
    // come straight from the Season Master rather than via the mixed import tab.
    sheet.getRange('C2').setFormula('=IMPORTRANGE("' + setup.masterId + '","\'Calendar\'!C2:C' + finalRow + '")');
    sheet.getRange('D2').setFormula('=IMPORTRANGE("' + setup.masterId + '","\'Calendar\'!D2:D' + finalRow + '")');
  }
  sheet.getRange(setup.rounds + 2, 1).setValue('All Star Race');
}

function divisionTemplatePrepareLicence_(workbook, setup) {
  const sheet = workbook.getSheetByName('Driver License');
  const finalDataColumn = setup.lastLicenceColumn + 4;
  const requiredColumns = Math.max(110, finalDataColumn);
  if (sheet.getMaxColumns() < requiredColumns) sheet.insertColumnsAfter(sheet.getMaxColumns(), requiredColumns - sheet.getMaxColumns());
  sheet.getRange(1, 1, 46, requiredColumns).clearContent();
  sheet.getRange(1, 1, 1, finalDataColumn).breakApart();
  sheet.getRange('A2').setValue('Driver');
  sheet.getRange('B1:C1').merge().setValue('Seconds');
  sheet.getRange('B2:C2').setValues([['Points','Time (seconds)']]);
  Object.keys(setup.licenceSessions).forEach(function(round) {
    setup.licenceSessions[round].forEach(function(session) {
      sheet.getRange(1, session.pointsColumn, 1, 2).merge().setValue(session.label);
      sheet.getRange(2, session.pointsColumn, 1, 2).setValues([['Points','Time (seconds)']]);
    });
  });
  const additionalColumn = setup.lastLicenceColumn + 1;
  sheet.getRange(1, additionalColumn, 1, 2).merge().setValue('Additional Penalties');
  sheet.getRange(2, additionalColumn, 1, 2).setValues([['Points','Time (seconds)']]);
  sheet.getRange(1, additionalColumn + 2, 1, 2).merge().setValue('Seconds');
  sheet.getRange(2, additionalColumn + 2, 1, 2).setValues([['Points','Time (seconds)']]);

  const finalLetter = divisionTemplateColumnLetter_(finalDataColumn);
  sheet.getRange(3,1,44,finalDataColumn).clearContent().clearDataValidations();
  // Names and penalties must share the same source rows when the roster changes.
  sheet.getRange('A3').setFormula('=IMPORTRANGE("' + setup.masterId + '","\'Division ' + setup.division + '\'!A3:' + finalLetter + '46")');
}

function divisionTemplatePrepareRoundSheets_(workbook, setup) {
  const standardPrototype = workbook.getSheetByName('_ROUND_STANDARD') || workbook.getSheetByName('R1');
  const sprintPrototype = workbook.getSheetByName('_ROUND_SPRINT') || workbook.getSheetByName('R3');
  if (!standardPrototype || !sprintPrototype) throw new Error('The source is missing its standard or sprint round prototype.');
  const standardTemplate = standardPrototype.copyTo(workbook).setName('_BUILD_STANDARD');
  const sprintTemplate = sprintPrototype.copyTo(workbook).setName('_BUILD_SPRINT');
  for (let round = 1; round <= F1XL_CAPACITY.rounds; round += 1) {
    const definition = setup.calendar[round - 1];
    const current = workbook.getSheetByName('R' + round);
    if (!definition) {
      if (current) workbook.deleteSheet(current);
      continue;
    }
    if (current) workbook.deleteSheet(current);
    let sheet = null;
    divisionTemplateRetrySpreadsheetAccess_(function() {
      // A temporary Google Sheets service failure can be reported after the
      // copy itself has already succeeded. Reuse that named round on retry so
      // the generator never creates a duplicate or discards completed work.
      sheet = sheet || workbook.getSheetByName('R' + round);
      if (!sheet) sheet = workbook.insertSheet('R' + round, { template:definition.sprint ? sprintTemplate : standardTemplate });
      divisionTemplateSanitiseRound_(sheet, definition.sprint);
      divisionTemplateConfigureRoundConstructors_(sheet, definition.sprint, definition.earlySprint);
      divisionTemplateConfigureRoundLicence_(sheet, definition, setup);
      divisionTemplateConfigureRoundDerivedInputs_(sheet, definition.sprint, definition.earlySprint);
      if (/^historical$/i.test(setup.mode)) divisionTemplateConfigureHistoricalRoundNumbers_(sheet, definition.sprint);
      if (definition.earlySprint) divisionTemplateConfigureEarlySprint_(sheet);
      divisionTemplateConfigureRoundScoring_(sheet, definition, setup);
      sheet.getRange('B1').setValue(round);
      sheet.getRange('E1').setFormula("='Race Calendar'!D" + (round + 1));
      sheet.getRange('A7').setValue(definition.type);
      sheetPresentationSafely_(function() { sheetPresentationRound_(sheet, definition); });
      sheet.showSheet();
    });
  }
  workbook.deleteSheet(standardTemplate);
  workbook.deleteSheet(sprintTemplate);
  divisionTemplateConfigureScoringPrototypes_(workbook, setup);
  if (workbook.getSheetByName('_ROUND_STANDARD')) workbook.getSheetByName('_ROUND_STANDARD').hideSheet();
  if (workbook.getSheetByName('_ROUND_SPRINT')) workbook.getSheetByName('_ROUND_SPRINT').hideSheet();
}

/** Retry only Google's explicitly temporary Spreadsheet service failures.
 * Configuration operations are deliberately idempotent, so a retry resumes
 * the same named round instead of creating another workbook or round tab. */
function divisionTemplateRetrySpreadsheetAccess_(operation) {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return operation();
    } catch (error) {
      const message = String(error && error.message || error || '');
      const temporary = /Service Spreadsheets failed|internal error|temporar(?:y|ily)|try again/i.test(message);
      if (!temporary || attempt === attempts) throw error;
      Utilities.sleep(500 * attempt);
    }
  }
}

function divisionTemplateConfigureRoundLicence_(sheet, definition, setup) {
  if (!definition) return;
  const sessions = setup.licenceSessions[definition.round] || [];
  const byId = {};
  const lookupLastColumn = divisionTemplateColumnLetter_(setup.lastLicenceColumn + 4);
  sessions.forEach(function(session) { byId[session.id] = session; });
  const targets = definition.earlySprint
    ? [{ id:'qualifying', start:9, points:8, time:9 }, { id:'sprintRace', start:37, points:11, time:12 }, { id:'race', start:94, points:11, time:12 }]
    : definition.sprint
    ? [{ id:'sprintQualifying', start:9, points:8, time:9 }, { id:'sprintRace', start:37, points:11, time:12 }, { id:'qualifying', start:66, points:8, time:9 }, { id:'race', start:94, points:11, time:12 }]
    : [{ id:'qualifying', start:9, points:8, time:9 }, { id:'race', start:37, points:11, time:12 }];
  targets.forEach(function(target) {
    const session = byId[target.id];
    if (!session) return;
    const formulas = [];
    for (let row = target.start; row < target.start + F1XL_CAPACITY.raceEntries; row += 1) {
      formulas.push([
        '=IFERROR(VLOOKUP($D' + row + ',\'Driver License\'!$A:$' + lookupLastColumn + ',' + session.pointsColumn + ',FALSE),"")',
        '=IFERROR(VLOOKUP($D' + row + ',\'Driver License\'!$A:$' + lookupLastColumn + ',' + session.timeColumn + ',FALSE),"")'
      ]);
    }
    sheet.getRange(target.start, target.points, formulas.length, 2).setFormulas(formulas);
  });
}

function divisionTemplateConfigureRoundDerivedInputs_(sheet, isSprint, isEarlySprint) {
  const workbook = sheet.getParent();
  const data = workbook.getSheetByName('Data');
  if (!data) throw new Error('The Division workbook is missing its Data tab.');
  const starts = isSprint ? [9,37,66,94] : [9,37];
  starts.forEach(function(start) {
    divisionTemplateFillBlankFormulas_(
      sheet.getRange(start, 2, F1XL_CAPACITY.raceEntries, 1),
      function(row) { return '=IFERROR(VLOOKUP($D' + row + ',Data!$A:$C,3,FALSE),"")'; }
    );
  });

  divisionTemplateConfigureRoundReferenceValidations_(sheet, isSprint, isEarlySprint);
  // Sprint Qualifying / Qualifying is the only team-entry block. All later
  // sessions follow the driver back to that entry, matching the proven S28
  // round sheets. Only empty cells receive the formula: an old result may
  // contain a manually preserved team that must never be replaced.
  const derivedTeamStarts = isSprint ? [37,66,94] : [37];
  derivedTeamStarts.forEach(function(start) {
    const range = sheet.getRange(start, 5, F1XL_CAPACITY.raceEntries, 1);
    range.clearDataValidations();
    divisionTemplateFillBlankFormulas_(range, divisionTemplateRoundTeamFormula_);
  });
}

function divisionTemplateFillBlankFormulas_(range, formulaForRow) {
  const values = range.getValues();
  const formulas = range.getFormulas();
  for (let offset = 0; offset < range.getNumRows(); offset += 1) {
    const value = values[offset][0];
    const formula = formulas[offset][0];
    if ((value === '' || value === null) && !formula) {
      range.getCell(offset + 1, 1).setFormula(formulaForRow(range.getRow() + offset));
    }
  }
}

function divisionTemplateConfigureRoundReferenceValidations_(sheet, isSprint, isEarlySprint) {
  const data = sheet.getParent().getSheetByName('Data');
  if (!data) throw new Error('The Division workbook is missing its Data tab.');
  // The source prototype once validated driver cells against its deleted
  // Driver Lineups tab. Copying that rule produced a #REF! validation warning
  // even for a correctly listed driver. Replace every editable driver block
  // with the generated workbook's live driver list.
  const driverValidation = SpreadsheetApp.newDataValidation()
    .requireValueInRange(data.getRange(3, 1, F1XL_CAPACITY.seasonDriversPerDivision, 1), true)
    .setAllowInvalid(true)
    .build();
  const driverStarts = isEarlySprint ? [9,37,94] : isSprint ? [9,37,66,94] : [9,37];
  driverStarts.forEach(function(start) {
    sheet.getRange(start, 4, F1XL_CAPACITY.raceEntries, 1).setDataValidation(driverValidation);
  });
  const teamOptions = data.getRange(3, 22, F1XL_CAPACITY.teams, 1).getDisplayValues().flat().map(divisionTemplateHistoryText_).filter(Boolean);
  if (teamOptions.indexOf('Reserve') < 0) teamOptions.push('Reserve');
  const teamValidation = SpreadsheetApp.newDataValidation().requireValueInList(teamOptions, true).setAllowInvalid(false).build();
  sheet.getRange(9, 5, F1XL_CAPACITY.raceEntries, 1).setDataValidation(teamValidation);

  const tyreOptions = data.getRange('Z3:Z101').getDisplayValues().flat().map(divisionTemplateHistoryText_).filter(function(value, index, values) {
    return value && values.indexOf(value) === index;
  });
  if (!tyreOptions.length) return;
  const tyreValidation = SpreadsheetApp.newDataValidation().requireValueInList(tyreOptions, true).setAllowInvalid(true).build();
  const qualifyingStarts = isSprint && !isEarlySprint ? [9,66] : [9];
  qualifyingStarts.forEach(function(start) {
    sheet.getRange(start, 7, F1XL_CAPACITY.raceEntries, 1).setDataValidation(tyreValidation);
  });
}

function divisionTemplateRoundTeamFormula_(row) {
  return '=IFERROR(VLOOKUP(D' + row + ',$D$9:$G$32,2,FALSE),"")';
}

/** Historical workbooks cannot each consume an installable on-edit trigger.
 * Keep their car number responsive with ordinary Sheet formulas instead.
 * A number already entered manually is preserved. The formula first uses the
 * team shown in that specific result plus the driver's tier, then falls back
 * to the driver's normal line-up number when the old record lacks a team. */
function divisionTemplateConfigureHistoricalRoundNumbers_(sheet, isSprint) {
  const starts = isSprint ? [9,37,66,94] : [9,37];
  starts.forEach(function(start) {
    const range = sheet.getRange(start, 3, F1XL_CAPACITY.raceEntries, 1);
    const values = range.getValues();
    const formulas = range.getFormulas();
    // The copied source validates these cells as manual inputs. A formula that
    // currently evaluates to blank is rejected by that rule, so remove only
    // the obsolete car-number validation before preserving values/installing
    // historical formulas.
    range.clearDataValidations();
    const output = [];
    for (let index = 0; index < F1XL_CAPACITY.raceEntries; index += 1) {
      const row = start + index;
      output.push([divisionTemplateHistoricalRoundNumberOutput_(values[index][0], formulas[index][0], row)]);
    }
    range.setValues(output);
  });
}

function divisionTemplateHistoricalRoundNumberOutput_(value, formula, row) {
  if (formula && !divisionTemplateIsLegacyRoundNumberFormula_(formula)) return formula;
  if (!formula && value != null && String(value).trim() !== '') return value;
  const tier = 'IFERROR(VLOOKUP($D' + row + ',Data!$A:$E,5,FALSE),INDEX(Data!$N:$N,MATCH($D' + row + ',Data!$J:$J,0)))';
  const teamNumber = 'INDEX(\'Season Master Import\'!$P$2:$Q$' + (F1XL_CAPACITY.teams + 1) + ',MATCH($E' + row + ',\'Season Master Import\'!$J$2:$J$' + (F1XL_CAPACITY.teams + 1) + ',0),MATCH(' + tier + ',{"Tier 1","Tier 2"},0))';
  const normalNumber = 'INDEX(Data!$I:$I,MATCH($D' + row + ',Data!$J:$J,0))';
  return '=IF($D' + row + '="","",IFERROR(' + teamNumber + ',IFERROR(' + normalNumber + ',"")))';
}

/** Identifies the copied template formula which takes a race/sprint car number
 * from an earlier session block. Historical workbooks cannot rely on the edit
 * trigger which used to overwrite that formula, so only this known legacy
 * formula is safe to replace. Fixed/manual numbers and unrelated formulas are
 * deliberately preserved. */
function divisionTemplateIsLegacyRoundNumberFormula_(formula) {
  const normalised = String(formula || '').replace(/\s+/g, '').toLowerCase();
  return /index\(\$c\$\d+:\$d\$\d+,match\(\$d\d+,\$d\$\d+:\$d\$\d+,0\)/.test(normalised);
}

function divisionTemplateConfigureEarlySprint_(sheet) {
  sheet.getRange('A64').setValue('Technical Main Race Grid (from Sprint Race)').setNote('Legacy Sprint format: the Sprint Race finishing order set the Feature Race grid. This hidden compatibility block keeps the established calculations working.');
  const driverFormulas = [];
  for (let index = 0; index < F1XL_CAPACITY.raceEntries; index += 1) driverFormulas.push(['=IFERROR(D' + (37 + index) + ',"")']);
  sheet.getRange(66, 4, driverFormulas.length, 1).setFormulas(driverFormulas);
  sheet.getRange(66, 6, F1XL_CAPACITY.raceEntries, 4).clearContent().clearDataValidations();
  sheet.getRange(64, 1, 28, 12).clearDataValidations();
  sheet.getRange('D66').setNote('Automatically follows the Sprint Race order. There is no separate Main Qualifying session on a Legacy Sprint weekend.');
  sheet.getRange('A92').setValue('Feature Race');
  sheet.getRange('F1:H1').clearContent().clearDataValidations();
  sheet.hideRows(64, 28);
}

function divisionTemplateConfigureRoundScoring_(sheet, definition, setup) {
  if (!sheet || !definition) return;
  const scoringSystem = String(setup && setup.scoringSystem || '').trim();
  const scoring = setup && setup.scoringPoints
    ? setup.scoringPoints
    : divisionTemplateReadScoringPoints_(sheet.getParent(), scoringSystem);
  if (setup && !setup.scoringPoints) setup.scoringPoints = scoring;
  const races = definition.sprint
    ? [{ start:37, session:'Sprint Race' }, { start:94, session:'Race' }]
    : [{ start:37, session:'Race' }];
  races.forEach(function(race) {
    const formulas = [];
    for (let index = 0; index < F1XL_CAPACITY.raceEntries; index += 1) {
      const row = race.start + index;
      if (!scoringSystem) {
        formulas.push(['']);
        continue;
      }
      const points = Object.prototype.hasOwnProperty.call(scoring[race.session] || {}, index + 1)
        ? scoring[race.session][index + 1]
        : 0;
      formulas.push([
        // The scoring system is fixed when the season is prepared, just as in
        // the established workbooks. Embed that season's point value in H so
        // results remain readable and operational without a live lookup. The
        // existing I formula then adds only its hidden tie-break decimal.
        divisionTemplateRoundPointsFormula_(row, points, race.session, setup && setup.season)
      ]);
    }
    sheet.getRange(race.start, 8, formulas.length, 1).setFormulas(formulas);
  });
}

function divisionTemplateRoundPointsFormula_(row, points, session, season) {
  const base = 'IF(OR($G' + row + '="DNF",$G' + row + '="DSQ",$G' + row + '="DNS"),0,' + points + ')';
  const rule = F1XL_SCORING_RULES.fastestLapBonus;
  const seasonNumber = Number(season);
  const bonusApplies = session === rule.session && Number.isFinite(seasonNumber) &&
    seasonNumber >= rule.firstSeason && seasonNumber <= rule.lastSeason;
  if (!bonusApplies) return '=IF($D' + row + '="","",' + base + ')';
  const classifiedTopTen = 'AND(ISNUMBER($A' + row + '),$A' + row + '>=1,$A' + row + '<=' + rule.maximumPosition +
    ',NOT(OR($G' + row + '="DNF",$G' + row + '="DSQ",$G' + row + '="DNS")))';
  const fastestLap = 'OR($J' + row + '=TRUE,UPPER(TRIM($J' + row + '&""))="Y")';
  return '=IF($D' + row + '="","",' + base + '+IF(AND(' + classifiedTopTen + ',' + fastestLap + '),' + rule.points + ',0))';
}

function divisionTemplateReadScoringPoints_(workbook, scoringSystem) {
  const data = workbook && workbook.getSheetByName('Data');
  const system = String(scoringSystem || '').trim();
  if (!data || !system) return {};
  const rows = data.getRange(2, 34, Math.max(data.getLastRow() - 1, 1), 4).getDisplayValues();
  const scoring = {};
  rows.forEach(function(row) {
    if (String(row[0] || '').trim().toLowerCase() !== system.toLowerCase()) return;
    const session = String(row[1] || '').trim();
    const position = Number(row[2]);
    const points = Number(row[3]);
    if (!session || !Number.isInteger(position) || position < 1 || !Number.isFinite(points)) return;
    if (!scoring[session]) scoring[session] = {};
    scoring[session][position] = points;
  });
  if (!Object.keys(scoring).length) {
    throw new Error('Scoring system "' + system + '" has no points table in this Division workbook. Check the Season Master scoring system and run Repair formulas again.');
  }
  return scoring;
}

function divisionTemplateConfigureScoringPrototypes_(workbook, setup) {
  const standard = workbook.getSheetByName('_ROUND_STANDARD');
  const sprint = workbook.getSheetByName('_ROUND_SPRINT');
  if (standard) divisionTemplateConfigureRoundScoring_(standard, { sprint:false }, setup);
  if (sprint) divisionTemplateConfigureRoundScoring_(sprint, { sprint:true }, setup);
}

function divisionTemplateSanitiseRound_(sheet, isSprint) {
  ['B2','E2','B3','E3','B4'].forEach(function(a1) { sheet.getRange(a1).clearContent(); });
  if (isSprint) sheet.getRange('H1:H4').clearContent();
  const starts = isSprint ? [9,37,66,94] : [9,37];
  starts.forEach(function(start, index) {
    const qualifying = index % 2 === 0;
    divisionTemplateClearConstants_(sheet.getRange(start, 2, F1XL_CAPACITY.raceEntries, 6));
    if (!qualifying) divisionTemplateClearConstants_(sheet.getRange(start, 10, F1XL_CAPACITY.raceEntries, 1));
  });
}

function divisionTemplateConfigureRoundConstructors_(sheet, isSprint, isEarlySprint) {
  const start = isSprint ? 121 : 66;
  const sprintRaceStart = 37, mainRaceStart = isSprint ? 94 : 37, mainQualiStart = isEarlySprint ? 9 : isSprint ? 66 : 9;
  const formulas = [];
  for (let index = 0; index < F1XL_CAPACITY.teams; index += 1) {
    const row = start + index, dataRow = 3 + index;
    const mainPoints = 'SUMIF($E$' + mainRaceStart + ':$E$' + (mainRaceStart + F1XL_CAPACITY.raceEntries - 1) + ',$A' + row + ',$I$' + mainRaceStart + ':$I$' + (mainRaceStart + F1XL_CAPACITY.raceEntries - 1) + ')';
    const sprintPoints = isSprint ? '+SUMIF($E$' + sprintRaceStart + ':$E$' + (sprintRaceStart + F1XL_CAPACITY.raceEntries - 1) + ',$A' + row + ',$I$' + sprintRaceStart + ':$I$' + (sprintRaceStart + F1XL_CAPACITY.raceEntries - 1) + ')' : '';
    formulas.push([
      '=IFERROR(Data!V' + dataRow + ',"")',
      '=' + mainPoints + sprintPoints,
      '=IFERROR(AVERAGEIF($E$' + mainQualiStart + ':$E$' + (mainQualiStart + 23) + ',$A' + row + ',$A$' + mainQualiStart + ':$A$' + (mainQualiStart + 23) + '),0)'
    ]);
  }
  // One batch write replaces ninety separate Spreadsheet-service calls on a
  // 30-team round, greatly reducing the chance of a mid-build service failure.
  sheet.getRange(start, 1, formulas.length, 3).setFormulas(formulas);
}

function divisionTemplateClearConstants_(range) {
  const formulas = range.getFormulas();
  range.clearContent();
  range.setFormulas(formulas);
}

function divisionTemplateRebuildCalculations_(workbook, setup) {
  const rounds = setup.calendar;
  const sessions = [];
  rounds.forEach(function(round) {
    if (round.sprint) sessions.push({ round:round.round, label:'R' + round.round + '(s)', start:37, sprint:true });
    sessions.push({ round:round.round, label:'R' + round.round + (round.sprint ? '(R)' : ''), start:round.sprint ? 94 : 37, sprint:false });
  });
  const capacity = divisionTemplateEnsureDynamicCapacity_(workbook, rounds, sessions);
  divisionTemplateRebuildGrandPrixOverview_(workbook, rounds);
  divisionTemplateRebuildDriverResults_(workbook, sessions, setup, capacity);
  divisionTemplateRebuildDriverStatsInputs_(workbook, rounds, capacity);
  divisionTemplateRebuildDriverStatsSummary_(workbook, rounds, sessions, capacity);
  divisionTemplateRebuildVisibleDriverStats_(workbook, sessions, capacity);
  divisionTemplateRebuildConstructorResults_(workbook, sessions, setup, capacity);
  divisionTemplateRebuildTeamTotals_(workbook, rounds);
  divisionTemplateRebuildConstructorStandings_(workbook, rounds);
}

function divisionTemplateEnsureDynamicCapacity_(workbook, rounds, sessions) {
  const marker = divisionTemplateReadCapacityMarker_(workbook);
  const resultExtra = Math.max(0, sessions.length - 25);
  const resultDelta = resultExtra - marker.resultExtra;
  if (resultDelta < 0) throw new Error('The requested session layout is smaller than this generated workbook. Create a fresh TEST Division workbook so entered data is not shifted automatically.');
  if (resultDelta) {
    ['Driver Results NoSort'].forEach(function(name) {
      workbook.getSheetByName(name).insertColumnsBefore(30 + marker.resultExtra, resultDelta);
    });
    ['Constructors Results NoSort'].forEach(function(name) {
      workbook.getSheetByName(name).insertColumnsBefore(31 + marker.resultExtra, resultDelta);
    });
  }
  const constructorRequiredColumns = 36 + resultExtra;
  ['Constructors Results NoSort'].forEach(function(name) {
    const sheet = workbook.getSheetByName(name);
    if (sheet.getMaxColumns() < constructorRequiredColumns) sheet.insertColumnsAfter(sheet.getMaxColumns(), constructorRequiredColumns - sheet.getMaxColumns());
  });
  const driverNoSort = workbook.getSheetByName('Driver Results NoSort');
  const driverHelperStart = 39 + resultExtra;
  const driverHelperEnd = driverHelperStart + sessions.length - 1;
  if (sessions.length && driverNoSort.getMaxColumns() < driverHelperEnd) {
    driverNoSort.insertColumnsAfter(driverNoSort.getMaxColumns(), driverHelperEnd - driverNoSort.getMaxColumns());
  }

  const mainCapacity = F1XL_CAPACITY.rounds;
  const sprintCount = rounds.filter(function(round) { return round.sprint; }).length;
  const sprintCapacity = Math.max(4, sprintCount);
  const stats = workbook.getSheetByName('Driver Stats Calc Sheet');
  const mainExtra = 0;
  const sprintExtra = sprintCapacity - 4;
  const sprintDelta = sprintExtra - marker.sprintExtra;
  if (sprintDelta < 0) throw new Error('The requested sprint layout is smaller than this generated workbook. Create a fresh TEST Division workbook so entered data is not shifted automatically.');
  if (sprintDelta) {
    stats.insertColumnsBefore(48 + marker.sprintExtra, sprintDelta);
    const requiredColumns = 1 + (mainCapacity * 2) + (sprintCapacity * 2);
    if (stats.getMaxColumns() < requiredColumns) stats.insertColumnsAfter(stats.getMaxColumns(), requiredColumns - stats.getMaxColumns());
  }
  const overviewExtra = Math.max(0, rounds.length - 21);
  const overviewDelta = overviewExtra - marker.overviewExtra;
  if (overviewDelta < 0) throw new Error('The requested round layout is smaller than this generated workbook. Create a fresh TEST Division workbook so entered data is not shifted automatically.');
  if (overviewDelta) workbook.getSheetByName('Grand Prix Overview').insertRowsBefore(24 + marker.overviewExtra, overviewDelta);
  divisionTemplateWriteCapacityMarker_(workbook, resultExtra, sprintExtra, overviewExtra);
  return {
    resultExtra:resultExtra,
    driverPoleColumn:30 + resultExtra,
    driverFastestLapColumn:31 + resultExtra,
    driverPointsColumn:32 + resultExtra,
    driverRawPointsColumn:33 + resultExtra,
    driverGapColumn:34 + resultExtra,
    driverTotalColumn:38 + resultExtra,
    driverHelperStart:driverHelperStart,
    constructorPoleColumn:31 + resultExtra,
    constructorFastestLapColumn:32 + resultExtra,
    constructorPointsColumn:33 + resultExtra,
    constructorRawPointsColumn:34 + resultExtra,
    constructorGapColumn:35 + resultExtra,
    constructorTotalColumn:36 + resultExtra,
    mainCapacity:mainCapacity,
    sprintCapacity:sprintCapacity
  };
}

function divisionTemplateReadCapacityMarker_(workbook) {
  const sheet = workbook.getSheetByName('Season Master Import');
  if (!sheet) return { resultExtra:0, sprintExtra:0, overviewExtra:0 };
  if (sheet.getMaxColumns() < 53) return { resultExtra:0, sprintExtra:0, overviewExtra:0 };
  const values = sheet.getRange(F1XL_DIVISION_TEMPLATE.capacityMarkerRange).getValues();
  const result = { resultExtra:0, sprintExtra:0, overviewExtra:0 };
  values.forEach(function(row) {
    if (row[0] === 'Result extra columns') result.resultExtra = Number(row[1]) || 0;
    if (row[0] === 'Sprint extra columns') result.sprintExtra = Number(row[1]) || 0;
    if (row[0] === 'Overview extra rows') result.overviewExtra = Number(row[1]) || 0;
  });
  return result;
}

function divisionTemplateWriteCapacityMarker_(workbook, resultExtra, sprintExtra, overviewExtra) {
  const sheet = workbook.getSheetByName('Season Master Import');
  if (!sheet) return;
  divisionTemplateEnsureSheetColumns_(sheet, 53);
  sheet.getRange(F1XL_DIVISION_TEMPLATE.capacityMarkerRange).setValues([
    ['F1XL capacity layout', 2],
    ['Result extra columns', resultExtra],
    ['Sprint extra columns', sprintExtra],
    ['Overview extra rows', overviewExtra]
  ]);
}

function divisionTemplateEnsureSheetColumns_(sheet, requiredColumns) {
  if (sheet.getMaxColumns() < requiredColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), requiredColumns - sheet.getMaxColumns());
  }
}

function divisionTemplateRebuildGrandPrixOverview_(workbook, rounds) {
  const sheet = workbook.getSheetByName('Grand Prix Overview');
  sheet.getRange(3, 1, Math.max(21, rounds.length), 13).clearContent();
  rounds.forEach(function(round, index) {
    const row = index + 3, q = round.earlySprint ? 9 : round.sprint ? 66 : 9, race = round.sprint ? 94 : 37, rn = "'R" + round.round + "'!";
    const values = [round.round, "='Race Calendar'!E" + (round.round + 1), '', '', '', '', '=' + rn + '$D$' + q, '=' + rn + '$E$' + q, '=' + rn + '$F$' + q,
      '=IFERROR(INDEX(' + rn + '$D$' + race + ':$D$' + (race + 23) + ',MATCH("y",' + rn + '$J$' + race + ':$J$' + (race + 23) + ',0)),"")',
      '=IFERROR(INDEX(' + rn + '$E$' + race + ':$E$' + (race + 23) + ',MATCH("y",' + rn + '$J$' + race + ':$J$' + (race + 23) + ',0)),"")',
      '=' + rn + '$D$' + race, '=' + rn + '$E$' + race];
    if (round.sprint) {
      if (!round.earlySprint) { values[2] = '=' + rn + '$D$9'; values[3] = '=' + rn + '$E$9'; }
      values[4] = '=' + rn + '$D$37'; values[5] = '=' + rn + '$E$37';
    }
    sheet.getRange(row, 1, 1, 13).setValues([values]);
  });
}

function divisionTemplateRebuildDriverStatsInputs_(workbook, rounds, capacity) {
  const sheet = workbook.getSheetByName('Driver Stats Calc Sheet');
  const lastColumn = 1 + (capacity.mainCapacity * 2) + (capacity.sprintCapacity * 2);
  const inputHeaderRow = 50;
  const inputFirstRow = 51;
  const inputLastRow = inputFirstRow + F1XL_CAPACITY.seasonDriversPerDivision - 1;
  if (sheet.getMaxRows() < inputLastRow) sheet.insertRowsAfter(sheet.getMaxRows(), inputLastRow - sheet.getMaxRows());
  // Rows 3–46 contain the 44-driver summary.  The source workbook's old input
  // area began at row 41, which made the expanded summary overwrite the first
  // five input rows.  Keep the two calculation areas physically separate.
  sheet.getRange(41, 1, inputLastRow - 40, lastColumn).clearContent();
  const driverFormulas = [];
  for (let row = inputFirstRow; row <= inputLastRow; row += 1) driverFormulas.push(['=IFERROR(Data!A' + (row - 48) + ',"")']);
  sheet.getRange(inputFirstRow, 1, driverFormulas.length, 1).setFormulas(driverFormulas);
  sheet.getRange(inputHeaderRow, 1).setValue('Driver');
  const mainQuali = [], mainRace = [], sprintQuali = [], sprintRace = [];
  rounds.forEach(function(round) {
    mainQuali.push({ round:round.round, start:round.earlySprint ? 9 : round.sprint ? 66 : 9, label:'R' + round.round });
    mainRace.push({ round:round.round, start:round.sprint ? 94 : 37, label:'R' + round.round });
    if (round.sprint && !round.earlySprint) sprintQuali.push({ round:round.round, start:9, label:'R' + round.round });
    if (round.sprint) sprintRace.push({ round:round.round, start:37, label:'R' + round.round });
  });
  divisionTemplateFillDriverStatBlock_(sheet, 2, capacity.mainCapacity, mainQuali, inputHeaderRow, inputFirstRow, inputLastRow);
  divisionTemplateFillDriverStatBlock_(sheet, 2 + capacity.mainCapacity, capacity.mainCapacity, mainRace, inputHeaderRow, inputFirstRow, inputLastRow);
  divisionTemplateFillDriverStatBlock_(sheet, 2 + (capacity.mainCapacity * 2), capacity.sprintCapacity, sprintQuali, inputHeaderRow, inputFirstRow, inputLastRow);
  divisionTemplateFillDriverStatBlock_(sheet, 2 + (capacity.mainCapacity * 2) + capacity.sprintCapacity, capacity.sprintCapacity, sprintRace, inputHeaderRow, inputFirstRow, inputLastRow);
}

function divisionTemplateRebuildDriverStatsSummary_(workbook, rounds, sessions, capacity) {
  const sheet = workbook.getSheetByName('Driver Stats Calc Sheet');
  const overviewEnd = Math.max(3, rounds.length + 2);
  const mainGridStart = 2;
  const mainGridEnd = mainGridStart + capacity.mainCapacity - 1;
  const sprintGridStart = mainGridEnd + capacity.mainCapacity + 1;
  const sprintGridEnd = sprintGridStart + capacity.sprintCapacity - 1;
  const resultLastRow = 4 + F1XL_CAPACITY.seasonDriversPerDivision;
  const formulas = [];
  for (let row = 3; row < 3 + F1XL_CAPACITY.seasonDriversPerDivision; row += 1) {
    const inputRow = row + 48;
    const mainGrid = divisionTemplateColumnLetter_(mainGridStart) + inputRow + ':' + divisionTemplateColumnLetter_(mainGridEnd) + inputRow;
    const sprintGrid = divisionTemplateColumnLetter_(sprintGridStart) + inputRow + ':' + divisionTemplateColumnLetter_(sprintGridEnd) + inputRow;
    const resultMatch = 'MATCH(A' + row + ',\'Driver Results NoSort\'!$C$5:$C$' + resultLastRow + ',0)';
    // The result tables are the single reliable record of completed session
    // positions. Match each calculation row back to the driver name rather
    // than assuming Data and championship standings share the same row order.
    const mainResults = sessions.filter(function(session) { return !session.sprint; }).map(function(session) {
      const sessionIndex = sessions.indexOf(session);
      const letter = divisionTemplateColumnLetter_(5 + sessionIndex);
      return 'INDEX(\'Driver Results NoSort\'!$' + letter + '$5:$' + letter + '$' + resultLastRow + ',' + resultMatch + ')';
    });
    const sprintResults = sessions.filter(function(session) { return session.sprint; }).map(function(session) {
      const sessionIndex = sessions.indexOf(session);
      const letter = divisionTemplateColumnLetter_(5 + sessionIndex);
      return 'INDEX(\'Driver Results NoSort\'!$' + letter + '$5:$' + letter + '$' + resultLastRow + ',' + resultMatch + ')';
    });
    const mainWins = mainResults.map(function(reference) { return 'COUNTIF(' + reference + ',1)'; }).join('+') || '0';
    const mainPodiums = mainResults.map(function(reference) { return 'COUNTIFS(' + reference + ',"<4",' + reference + ',">0")'; }).join('+') || '0';
    const mainAverage = mainResults.length ? 'IFERROR(AVERAGE(' + mainResults.join(',') + '),"N/A")' : '"N/A"';
    const sprintWins = sprintResults.map(function(reference) { return 'COUNTIF(' + reference + ',1)'; }).join('+') || '0';
    const sprintAverage = sprintResults.length ? 'IFERROR(AVERAGE(' + sprintResults.join(',') + '),"N/A")' : '"N/A"';
    const wins = mainWins;
    const podiums = mainPodiums;
    const poles = 'COUNTIF(\'Grand Prix Overview\'!$G$3:$G$' + overviewEnd + ',A' + row + ')';
    // Career/overall statistics count feature races only. Sprint championship
    // points remain in Driver Results; their statistical totals stay separate.
    const calculatedFinished = mainResults.map(function(reference) { return 'COUNTIFS(' + reference + ',"<>DNS",' + reference + ',">0")'; }).join('+') || '0';
    const countMain = function(status) { return mainResults.map(function(reference) { return 'COUNTIF(' + reference + ',"' + status + '")'; }).join('+') || '0'; };
    const calculatedDnf = countMain('DNF');
    const calculatedDns = countMain('DNS');
    const calculatedDsq = countMain('DSQ');
    const featurePoints = sessions.filter(function(session) { return !session.sprint; }).map(function(session) {
      const last = session.start + F1XL_CAPACITY.raceEntries - 1;
      return 'SUMIF(\'R' + session.round + '\'!$D$' + session.start + ':$D$' + last + ',A' + row + ',\'R' + session.round + '\'!$H$' + session.start + ':$H$' + last + ')';
    }).join('+') || '0';
    const racesStarted = calculatedFinished + '+' + calculatedDnf + '+' + calculatedDsq;
    const racesFinished = calculatedFinished;
    const racesDns = calculatedDns;
    const racesDnf = calculatedDnf;
    const racesDsq = calculatedDsq;
    formulas.push([
      '=IFERROR(Data!A' + row + ',"")',
      '=IF(A' + row + '="","",IFERROR(VLOOKUP(A' + row + ',Data!$A:$D,4,FALSE),""))',
      '=IF(A' + row + '="","",IFERROR(VLOOKUP(A' + row + ',Data!$A:$E,5,FALSE),""))',
      '=IF(A' + row + '="","",' + wins + ')',
      '=IF(A' + row + '="","",' + podiums + ')',
      '=IF(A' + row + '="","",' + poles + ')',
      '=IF(A' + row + '="","",COUNTIF(\'Grand Prix Overview\'!$J$3:$J$' + overviewEnd + ',A' + row + '))',
      '=IF(A' + row + '="","",' + featurePoints + ')',
      '=IF(A' + row + '="","",IFERROR(H' + row + '/Q' + row + ',"N/A"))',
      '=IF(A' + row + '="","",' + mainAverage + ')',
      '=IF(A' + row + '="","",IFERROR(AVERAGE(' + mainGrid + '),"N/A"))',
      '=IF(A' + row + '="","",IFERROR(K' + row + '-J' + row + ',"N/A"))',
      '=IF(A' + row + '="","",' + sprintWins + ')',
      '=IF(A' + row + '="","",' + sprintAverage + ')',
      '=IF(A' + row + '="","",IFERROR(AVERAGE(' + sprintGrid + '),"N/A"))',
      '=IF(A' + row + '="","",IFERROR(O' + row + '-N' + row + ',"N/A"))',
      '=IF(A' + row + '="","",' + racesStarted + ')',
      '=IF(A' + row + '="","",' + racesFinished + ')',
      '=IF(A' + row + '="","",' + racesDnf + ')',
      '=IF(A' + row + '="","",' + racesDns + ')',
      '=IF(A' + row + '="","",IFERROR(R' + row + '/Q' + row + ',"N/A"))',
      '=IF(A' + row + '="","",' + racesDsq + ')'
    ]);
  }
  sheet.getRange(3, 1, F1XL_CAPACITY.seasonDriversPerDivision + 4, 22).clearContent();
  sheet.getRange(3, 1, formulas.length, 22).setFormulas(formulas);
}

function divisionTemplateRebuildVisibleDriverStats_(workbook, sessions, capacity) {
  const sheet = workbook.getSheetByName('Driver Stats');
  const headers = ['Driver','Total Wins','Total Podiums','Total Poles','Average Finish Pos.','Average Points','Average Grid Pos.','Average Gained Pos.','Pole to Win Conversion','', 'Sprint Wins','Average Sprint finish position','Average Sprint Start Position','Average Sprint Positions Gained','Sprint Pole to Win Conversion','', 'Races Started','Races Finished','Races DNS','Races DNF','Races DSQ','Reliability'];
  sheet.getRange('A1:V45').clearContent();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const sprintGridStart = 2 + (capacity.mainCapacity * 2);
  const sprintGridEnd = sprintGridStart + capacity.sprintCapacity - 1;
  const calcLastRow = 2 + F1XL_CAPACITY.seasonDriversPerDivision;
  const inputLastRow = 50 + F1XL_CAPACITY.seasonDriversPerDivision;
  const resultLastRow = 4 + F1XL_CAPACITY.seasonDriversPerDivision;
  const sprintGridRange = "'Driver Stats Calc Sheet'!$" + divisionTemplateColumnLetter_(sprintGridStart) + '$51:$' + divisionTemplateColumnLetter_(sprintGridEnd) + '$' + inputLastRow;
  for (let row = 2; row < 2 + F1XL_CAPACITY.seasonDriversPerDivision; row += 1) {
    const calcMatch = 'MATCH(A' + row + ',\'Driver Stats Calc Sheet\'!$A$3:$A$' + calcLastRow + ',0)';
    sheet.getRange(row, 1, 1, 22).setFormulas([[
      '=IFERROR(INDEX(SORT(FILTER({\'Driver Results NoSort\'!$A$5:$A$' + resultLastRow + ',\'Driver Results NoSort\'!$C$5:$C$' + resultLastRow + '},\'Driver Results NoSort\'!$C$5:$C$' + resultLastRow + '<>""),1,TRUE),' + (row - 1) + ',2),"")',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$D$3:$D$' + calcLastRow + ',' + calcMatch + '),0))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$E$3:$E$' + calcLastRow + ',' + calcMatch + '),0))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$F$3:$F$' + calcLastRow + ',' + calcMatch + '),0))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$J$3:$J$' + calcLastRow + ',' + calcMatch + '),"N/A"))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$I$3:$I$' + calcLastRow + ',' + calcMatch + '),"N/A"))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$K$3:$K$' + calcLastRow + ',' + calcMatch + '),"N/A"))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$L$3:$L$' + calcLastRow + ',' + calcMatch + '),"N/A"))',
      '=IF(A' + row + '="","",IFERROR(B' + row + '/D' + row + ',"N/A"))',
      '=""',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$M$3:$M$' + calcLastRow + ',' + calcMatch + '),0))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$N$3:$N$' + calcLastRow + ',' + calcMatch + '),"N/A"))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$O$3:$O$' + calcLastRow + ',' + calcMatch + '),"N/A"))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$P$3:$P$' + calcLastRow + ',' + calcMatch + '),"N/A"))',
      '=IF(A' + row + '="","",IFERROR(K' + row + '/COUNTIF(INDEX(' + sprintGridRange + ',' + calcMatch + ',0),1),"N/A"))',
      '=""',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$Q$3:$Q$' + calcLastRow + ',' + calcMatch + '),0))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$R$3:$R$' + calcLastRow + ',' + calcMatch + '),0))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$T$3:$T$' + calcLastRow + ',' + calcMatch + '),0))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$S$3:$S$' + calcLastRow + ',' + calcMatch + '),0))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$V$3:$V$' + calcLastRow + ',' + calcMatch + '),0))',
      '=IF(A' + row + '="","",IFERROR(INDEX(\'Driver Stats Calc Sheet\'!$U$3:$U$' + calcLastRow + ',' + calcMatch + '),"N/A"))'
    ]]);
  }
  careerFormulaPrepareDivisionExport_(workbook);
}

function divisionTemplateFillDriverStatBlock_(sheet, firstColumn, width, definitions, inputHeaderRow, inputFirstRow, inputLastRow) {
  for (let offset = 0; offset < width; offset += 1) {
    const column = firstColumn + offset, definition = definitions[offset];
    if (!definition) continue;
    sheet.getRange(inputHeaderRow, column).setValue(definition.label);
    const formulas = [];
    for (let row = inputFirstRow; row <= inputLastRow; row += 1) formulas.push(['=IFERROR(INDEX(\'R' + definition.round + '\'!$A$' + definition.start + ':$A$' + (definition.start + 23) + ',MATCH($A' + row + ',\'R' + definition.round + '\'!$D$' + definition.start + ':$D$' + (definition.start + 23) + ',0))," ")']);
    sheet.getRange(inputFirstRow, column, formulas.length, 1).setFormulas(formulas);
  }
}

function divisionTemplateRebuildDriverResults_(workbook, sessions, setup, capacity) {
  const sheet = workbook.getSheetByName('Driver Results NoSort');
  const driverRows = F1XL_CAPACITY.seasonDriversPerDivision;
  const sessionCapacity = Math.max(25, sessions.length);
  sheet.getRange(1, 5, driverRows + 4, sessionCapacity).clearContent();
  sheet.getRange(4, capacity.driverPoleColumn, driverRows + 1, capacity.driverGapColumn - capacity.driverPoleColumn + 1).clearContent();
  if (sessions.length) sheet.getRange(4, capacity.driverHelperStart, driverRows + 1, sessions.length).clearContent();
  sheet.getRange(4, 1, 1, 4).setValues([['Pos','Nat','Driver ','Team']]);
  sheet.getRange(4, capacity.driverPoleColumn, 1, 5).setValues([['Pole','F/L','Points','Raw Points','Gap']]);
  sessions.forEach(function(session, index) {
    const visibleColumn = 5 + index, helperColumn = capacity.driverHelperStart + index;
    sheet.getRange(1, visibleColumn).setFormula("='Race Calendar'!D" + (session.round + 1));
    sheet.getRange(4, visibleColumn).setValue(session.label);
    sheet.getRange(4, helperColumn).setValue(session.label);
    const visible = [], points = [];
    for (let row = 5; row < 5 + driverRows; row += 1) {
      visible.push(['=IFERROR(INDEX(\'R' + session.round + '\'!$A$' + session.start + ':$A$' + (session.start + 23) + ',MATCH($C' + row + ',\'R' + session.round + '\'!$D$' + session.start + ':$D$' + (session.start + 23) + ',0))," ")']);
      points.push(['=IFERROR(INDEX(\'R' + session.round + '\'!$H$' + session.start + ':$H$' + (session.start + 23) + ',MATCH($C' + row + ',\'R' + session.round + '\'!$D$' + session.start + ':$D$' + (session.start + 23) + ',0)),0)']);
    }
    sheet.getRange(5, visibleColumn, visible.length, 1).setFormulas(visible);
    sheet.getRange(5, helperColumn, points.length, 1).setFormulas(points);
  });
  const rawLetter = divisionTemplateColumnLetter_(capacity.driverRawPointsColumn);
  const pointsLetter = divisionTemplateColumnLetter_(capacity.driverPointsColumn);
  for (let row = 5; row < 5 + driverRows; row += 1) {
    const totalLetter = divisionTemplateColumnLetter_(capacity.driverTotalColumn);
    const firstHelper = divisionTemplateColumnLetter_(capacity.driverHelperStart);
    const lastHelper = divisionTemplateColumnLetter_(capacity.driverHelperStart + Math.max(0, sessions.length - 1));
    const dataRow = row - 2;
    const calculatedPosition = 'RANK(' + rawLetter + row + ',$' + rawLetter + '$5:$' + rawLetter + '$' + (4 + driverRows) + ',0)';
    sheet.getRange(row, 1, 1, 4).setFormulas([[
      '=IF(C' + row + '="","",' + calculatedPosition + ')',
      '=IF(C' + row + '="","",IFERROR(VLOOKUP(C' + row + ',Data!$A:$G,3,FALSE),""))',
      '=IFERROR(Data!A' + dataRow + ',"")',
      '=IF(C' + row + '="","",IFERROR(VLOOKUP(C' + row + ',Data!$A:$G,4,FALSE),""))'
    ]]);
    const poleFallback = 'COUNTIF(\'Grand Prix Overview\'!$G$3:$G$' + (F1XL_CAPACITY.rounds + 2) + ',C' + row + ')';
    sheet.getRange(row, capacity.driverPoleColumn).setFormula('=IF(C' + row + '="","",' + poleFallback + ')');
    sheet.getRange(row, capacity.driverFastestLapColumn).setFormula('=IF(C' + row + '="","",COUNTIF(\'Grand Prix Overview\'!$J$3:$J$' + (F1XL_CAPACITY.rounds + 2) + ',C' + row + '))');
    const calculatedTotal = sessions.length ? 'SUM(' + firstHelper + row + ':' + lastHelper + row + ')' : '0';
    sheet.getRange(row, capacity.driverTotalColumn).setFormula('=' + calculatedTotal);
    sheet.getRange(row, capacity.driverPointsColumn).setFormula('=IF(' + totalLetter + row + '=0,"",' + totalLetter + row + ')');
    sheet.getRange(row, capacity.driverRawPointsColumn).setFormula('=IF(C' + row + '="","",' + totalLetter + row + ')');
    sheet.getRange(row, capacity.driverGapColumn).setFormula('=IF(C' + row + '="","",MAX($' + rawLetter + '$5:$' + rawLetter + '$' + (4 + driverRows) + ')-' + rawLetter + row + ')');
  }
  sheet.getRange('A1').setValue('Division ' + setup.division);
}

function divisionTemplateRebuildConstructorResults_(workbook, sessions, setup, capacity) {
  const sheet = workbook.getSheetByName('Constructors Results NoSort');
  const driverRows = F1XL_CAPACITY.raceEntries;
  const sessionCapacity = Math.max(25, sessions.length);
  sheet.getRange(1, 6, 28, sessionCapacity).clearContent();
  sheet.getRange(4, 1, driverRows + 1, capacity.constructorGapColumn).clearContent();
  sheet.getRange(4, 1, 1, 5).setValues([['Pos','Team','','Team','#']]);
  sheet.getRange(4, capacity.constructorPoleColumn, 1, 5).setValues([['Pole','F/L','Points','Raw Points','Gap']]);
  sessions.forEach(function(session, index) {
    const column = 6 + index;
    sheet.getRange(1, column).setFormula("='Race Calendar'!D" + (session.round + 1));
    sheet.getRange(4, column).setValue(session.label);
    const formulas = [];
    for (let row = 5; row < 5 + driverRows; row += 1) formulas.push(['=IFERROR(INDEX(\'R' + session.round + '\'!$A$' + session.start + ':$A$' + (session.start + 23) + ',MATCH($E' + row + ',\'R' + session.round + '\'!$C$' + session.start + ':$C$' + (session.start + 23) + ',0))," ")']);
    sheet.getRange(5, column, formulas.length, 1).setFormulas(formulas);
  });
  const rawLetter = divisionTemplateColumnLetter_(capacity.constructorRawPointsColumn);
  const totalLetter = divisionTemplateColumnLetter_(capacity.constructorTotalColumn);
  for (let row = 5; row < 5 + driverRows; row += 1) {
    const teamIndex = Math.floor((row - 5) / 2) + 3;
    const seatIndex = ((row - 5) % 2) + 1;
    sheet.getRange(row, 1, 1, 5).setFormulas([[
      '=IF(D' + row + '="","",IFERROR(INDEX(\'Constructors Standings NoSort\'!$A$5:$A$16,MATCH(D' + row + ',\'Constructors Standings NoSort\'!$B$5:$B$16,0)),""))',
      '=D' + row,
      '=""',
      '=IFERROR(Data!V' + teamIndex + ',"")',
      '=IF(D' + row + '="","",IFERROR(INDEX(FILTER(Data!$I$2:$I$25,Data!$M$2:$M$25=D' + row + '),' + seatIndex + '),""))'
    ]]);
    const totalParts = sessions.map(function(session) {
      return 'IFERROR(INDEX(\'R' + session.round + '\'!$H$' + session.start + ':$H$' + (session.start + 23) + ',MATCH($E' + row + ',\'R' + session.round + '\'!$C$' + session.start + ':$C$' + (session.start + 23) + ',0)),0)';
    });
    sheet.getRange(row, capacity.constructorTotalColumn).setFormula('=' + (totalParts.length ? totalParts.join('+') : '0'));
    const driverName = 'IFERROR(INDEX(Data!$J$2:$J$25,MATCH(E' + row + ',Data!$I$2:$I$25,0)),"")';
    sheet.getRange(row, capacity.constructorPoleColumn).setFormula('=IF(E' + row + '="","",COUNTIF(\'Grand Prix Overview\'!$G$3:$G$' + (F1XL_CAPACITY.rounds + 2) + ',' + driverName + '))');
    sheet.getRange(row, capacity.constructorFastestLapColumn).setFormula('=IF(E' + row + '="","",COUNTIF(\'Grand Prix Overview\'!$J$3:$J$' + (F1XL_CAPACITY.rounds + 2) + ',' + driverName + '))');
    sheet.getRange(row, capacity.constructorPointsColumn).setFormula('=IF(' + totalLetter + row + '=0,"",' + totalLetter + row + ')');
    sheet.getRange(row, capacity.constructorRawPointsColumn).setFormula('=IF(D' + row + '="","",' + totalLetter + row + ')');
    sheet.getRange(row, capacity.constructorGapColumn).setFormula('=IF(D' + row + '="","",MAX(\'Constructors Standings NoSort\'!$C$5:$C$16)-SUMIF($D$5:$D$28,D' + row + ',$' + rawLetter + '$5:$' + rawLetter + '$28))');
  }
}

/**
 * The website sorts the no-sort result feeds itself, while the familiar
 * Driver Stats and Constructors Standings tabs remain available for people
 * reviewing the workbook. These two old sorted copies therefore add no data
 * or calculation value and can be removed from generated/test workbooks.
 */
function divisionTemplateRemoveRedundantResultTabs_(workbook) {
  // Called only while building new copies, never when repairing an existing season.
  ['Driver Results','Constructors Results','Historical Results Matrix'].forEach(function(name) {
    const sheet = workbook.getSheetByName(name);
    if (sheet) workbook.deleteSheet(sheet);
  });
}

function divisionTemplateRebuildTeamTotals_(workbook, rounds) {
  const sheet = workbook.getSheetByName('Team Stats Calc Sheet');
  const requiredColumns = 13 + F1XL_CAPACITY.rounds;
  if (sheet.getMaxColumns() < requiredColumns) sheet.insertColumnsAfter(sheet.getMaxColumns(), requiredColumns - sheet.getMaxColumns());
  sheet.getRange(1, 14, F1XL_CAPACITY.teams + 1, F1XL_CAPACITY.rounds).clearContent();
  rounds.forEach(function(round, index) {
    const column = 14 + index;
    sheet.getRange(1, column).setValue(round.round);
    const constructorStart = round.sprint ? 121 : 66;
    const constructorRows = [constructorStart, constructorStart + F1XL_CAPACITY.teams - 1];
    for (let row = 2; row < 2 + F1XL_CAPACITY.teams; row += 1) {
      let formula = '=INT(SUMIF(\'R' + round.round + '\'!$A$' + constructorRows[0] + ':$A$' + constructorRows[1] + ',$A' + row + ',\'R' + round.round + '\'!$B$' + constructorRows[0] + ':$B$' + constructorRows[1] + '))';
      sheet.getRange(row, column).setFormula(formula);
    }
  });
  for (let row = 2; row < 2 + F1XL_CAPACITY.teams; row += 1) {
    sheet.getRange(row, 1).setFormula('=IFERROR(Data!V' + (row + 1) + ',"")');
  }
  sheet.getRange(2, 3, F1XL_CAPACITY.teams, 11).setFormulas(divisionTemplateTeamSummaryFormulas_(rounds));
}

/** C:M, shared by generation and the targeted repair. Team achievements belong
 * to the saved race team; tier averages follow the fixed constructor seats. */
function divisionTemplateTeamSummaryFormulas_(rounds) {
  function range(round, col, start) { return "'R" + round.round + "'!$" + col + '$' + start + ':$' + col + '$' + (start + 23); }
  const completed = rounds.map(function(round) {
    const start = round.sprint ? 94 : 37, pos = range(round, 'A', start), names = range(round, 'D', start);
    return 'IF((COUNTIFS(' + names + ',"?*",' + pos + ',">=1",' + pos + ',"<=24")+COUNTIFS(' + names + ',"?*",' + pos + ',"DNF")+COUNTIFS(' + names + ',"?*",' + pos + ',"DSQ"))>0,1,0)';
  });
  const sprintRounds = rounds.filter(function(round) { return round.sprint; });
  return Array.from({length:F1XL_CAPACITY.teams}, function(_, index) {
    const row = index + 2, team = '$A' + row;
    const sum = function(parts) { return parts.length ? parts.join('+') : '0'; };
    function event(round, start, criteria) {
      return 'COUNTIFS(' + range(round, 'E', start) + ',' + team + ',' + range(round, 'D', start) + ',"?*",' + criteria.map(function(pair) { return range(round, pair[0], start) + ',' + pair[1]; }).join(',') + ')';
    }
    function main(criteria, qualifying) {
      return sum(rounds.map(function(round) {
        const start = qualifying ? (round.sprint && !round.earlySprint ? 66 : 9) : (round.sprint ? 94 : 37);
        return event(round, start, criteria);
      }));
    }
    function average(sessions, seat, sprint) {
      // Free agents can share a tier/number. Count every classified result,
      // not the first seat lookup, and weight by finishes rather than rounds.
      const number = "INDEX('Constructors Results NoSort'!$E$5:$E$" + (4 + F1XL_CAPACITY.teams * 2) + ',ROW(' + team + ')*2-' + (3 - seat) + ')';
      const totals = [], counts = [];
      sessions.forEach(function(round) {
        const start = sprint ? 37 : round.sprint ? 94 : 37;
        const pos = range(round, 'A', start);
        const criteria = range(round, 'E', start) + ',' + team + ',' + range(round, 'C', start) + ',' + number + ',' + range(round, 'D', start) + ',"?*",' + pos + ',">=1",' + pos + ',"<=24"';
        totals.push('SUMIFS(' + pos + ',' + criteria + ')');
        counts.push('COUNTIFS(' + criteria + ')');
      });
      return sessions.length ? 'IFERROR((' + sum(totals) + ')/(' + sum(counts) + '),"N/A")' : '"N/A"';
    }
    const expressions = [
      main([['A','1']]),
      main([['A','">=1"'],['A','"<=3"']]),
      main([['A','1']], true),
      main([['J','"y"']]),
      'IFERROR(INT(B' + row + ')/(' + sum(completed) + '),"N/A")',
      average(rounds, 0, false), average(rounds, 1, false),
      sum(sprintRounds.map(function(round) { return event(round, 37, [['A','1']]); })),
      sum(sprintRounds.map(function(round) { return 'SUMIF(' + range(round, 'E', 37) + ',' + team + ',' + range(round, 'H', 37) + ')'; })),
      average(sprintRounds, 0, true), average(sprintRounds, 1, true)
    ];
    return expressions.map(function(expression) { return '=IF(' + team + '="","",' + expression + ')'; });
  });
}

function divisionTemplateRebuildConstructorStandings_(workbook, rounds) {
  const sheet = workbook.getSheetByName('Constructors Standings NoSort');
  const lastConstructorRow = 4 + F1XL_CAPACITY.teams;
  sheet.getRange(5, 1, F1XL_CAPACITY.teams, 3).clearContent();
  sheet.getRange('A4:C4').setValues([['Pos','Team','Points']]);
  for (let row = 5; row <= lastConstructorRow; row += 1) {
    const parts = rounds.map(function(round) {
      // Preserve the established workbook chain: each R tab first totals its
      // constructor points from column I (including the hidden tie-break
      // decimals), then the season standings add those round constructor
      // totals. Reading driver column H directly loses both behaviours.
      const constructorStart = round.sprint ? 121 : 66;
      const constructorEnd = constructorStart + F1XL_CAPACITY.teams - 1;
      return 'SUMIF(\'R' + round.round + '\'!$A$' + constructorStart + ':$A$' + constructorEnd + ',B' + row + ',\'R' + round.round + '\'!$B$' + constructorStart + ':$B$' + constructorEnd + ')';
    });
    const calculatedPoints = parts.length ? parts.join('+') : '0';
    sheet.getRange(row, 1).setFormula('=IF(B' + row + '="","",RANK(C' + row + ',$C$5:$C$' + lastConstructorRow + ',0))');
    sheet.getRange(row, 2).setFormula('=IFERROR(Data!V' + (row - 2) + ',"")');
    sheet.getRange(row, 3).setFormula('=' + calculatedPoints);
  }
  const visible = workbook.getSheetByName('Constructors Standings');
  if (!visible) return;
  visible.getRange(6, 2, F1XL_CAPACITY.teams, 7).clearContent();
  visible.getRange('B5:E5').setValues([['Pos','Team','','Points']]);
  const visibleRows = 'FILTER({\'Constructors Standings NoSort\'!A5:A' + lastConstructorRow + ',\'Constructors Standings NoSort\'!B5:B' + lastConstructorRow + ',IF(\'Constructors Standings NoSort\'!B5:B' + lastConstructorRow + '<>"","",""),\'Constructors Standings NoSort\'!C5:C' + lastConstructorRow + '},\'Constructors Standings NoSort\'!B5:B' + lastConstructorRow + '<>"")';
  visible.getRange('B6').setFormula('=SORT(' + visibleRows + ',4,FALSE)');
}

function divisionTemplateReplaceDivisionLabels_(workbook, division) {
  ['Driver Results NoSort','Constructors Standings NoSort','Constructors Standings'].forEach(function(name) {
    const sheet = workbook.getSheetByName(name);
    if (!sheet) return;
    sheet.getDataRange().createTextFinder('Division 1').matchFormulaText(false).replaceAllWith('Division ' + division);
  });
}

function divisionTemplateNormaliseKnownTeamNames_(workbook) {
  workbook.getSheets().forEach(function(sheet) {
    sheet.getDataRange().createTextFinder('Mclaren').matchFormulaText(true).replaceAllWith('McLaren');
  });
  for (let round = 1; round <= F1XL_CAPACITY.rounds; round += 1) {
    const sheet = workbook.getSheetByName('R' + round);
    if (!sheet) continue;
    ['A66:A77','A121:A132'].forEach(function(a1) {
      const range = sheet.getRange(a1), values = range.getValues();
      let changed = false;
      values.forEach(function(row) { if (row[0] === 'Mclaren') { row[0] = 'McLaren'; changed = true; } });
      if (changed) range.setValues(values);
    });
  }
}

function divisionTemplateConnectOverall_(master, division, spreadsheetId) {
  const placeholder = 'PASTE_DIVISION_' + division + '_SHEET_ID_HERE';
  ['Overall Standings','Weekly Totals','Weekly Totals Data','Overall Standings Data','Data'].forEach(function(name) {
    const sheet = master.getSheetByName(name);
    if (sheet) sheet.getDataRange().createTextFinder(placeholder).matchFormulaText(true).replaceAllWith(spreadsheetId);
  });
  seasonMasterEnsureDivisionConnectionTest_(master, division, spreadsheetId);
}

function divisionTemplateValidateSource_(workbook) {
  ['Data','Race Calendar','Driver License','Driver Stats Calc Sheet','Driver Results NoSort','Team Stats Calc Sheet','Constructors Standings NoSort','Constructors Results NoSort','Grand Prix Overview'].forEach(function(name) {
    if (!workbook.getSheetByName(name)) throw new Error('The trusted Division source is missing its ' + name + ' tab.');
  });
  if (!(workbook.getSheetByName('_ROUND_STANDARD') || workbook.getSheetByName('R1'))) throw new Error('The trusted Division source is missing its standard-round layout.');
  if (!(workbook.getSheetByName('_ROUND_SPRINT') || workbook.getSheetByName('R3'))) throw new Error('The trusted Division source is missing its sprint-round layout.');
}

function divisionTemplatePropertyKey_(season, division) {
  return F1XL_DIVISION_TEMPLATE.propertyPrefix + String(season).replace(/\./g, '_') + '_' + division;
}

function divisionTemplateWorkbookSummary_(workbook, season, division) {
  return { season:season, division:division, name:workbook.getName(), spreadsheetId:workbook.getId(), url:workbook.getUrl(), available:true };
}

function divisionTemplateMakeWebsiteReadable_(file) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    throw new Error('The Division workbook was created, but it could not be made readable by the public website. Check the Google Drive sharing policy. ' + error.message);
  }
}

/**
 * Freezes the car number and team beside an entered result.  The live line-up
 * may change later, but a completed round must continue to describe the car
 * and team that the driver represented in that round.
 */
function divisionTemplateEnsureRoundHistorySafety_(workbook) {
  const workbookId = workbook.getId();
  const triggers = divisionTemplateCheckTriggerCapacity_(workbookId);
  const exists = triggers.some(function(trigger) {
    return trigger.getHandlerFunction() === F1XL_DIVISION_TEMPLATE.roundHistoryHandler && trigger.getTriggerSourceId() === workbookId && trigger.getTriggerSource()===ScriptApp.TriggerSource.SPREADSHEETS && trigger.getEventType()===ScriptApp.EventType.ON_EDIT;
  });
  if (!exists) ScriptApp.newTrigger(F1XL_DIVISION_TEMPLATE.roundHistoryHandler).forSpreadsheet(workbook).onEdit().create();
}

/** Retire only triggers whose F1XL handler is now a no-op, or whose TEST
 * source is verifiably binned/completed history. Keep unknown/inaccessible
 * sources and unrelated automations. Never remove an active-season handler. */
function divisionTemplateCheckTriggerCapacity_(targetId) {
  const seen=Object.create(null),history=F1XL_DIVISION_TEMPLATE.roundHistoryHandler;
  ScriptApp.getProjectTriggers().forEach(function(trigger){
    const handler=trigger.getHandlerFunction();
    let remove=handler===F1XL_SEASON_MASTER.lineupSafetyHandler;
    if(handler===history&&trigger.getTriggerSource()===ScriptApp.TriggerSource.SPREADSHEETS&&trigger.getEventType()===ScriptApp.EventType.ON_EDIT){
      const id=trigger.getTriggerSourceId();
      if(seen[id])remove=true;
      else {
        seen[id]=true;
        if(id!==targetId){
          try {
            const file=DriveApp.getFileById(id);
            if(/^TEST\s*-/i.test(fapWorkbookLegacyName_(file.getName()))) {
              remove=file.isTrashed();
              if(!remove)remove=seasonProtectionForWorkbook_(SpreadsheetApp.openById(id)).readOnly;
            }
          } catch(error) { /* Lack of access is not evidence that a trigger is obsolete. */ }
        }
      }
    }
    if(remove)ScriptApp.deleteTrigger(trigger);
  });
  const remaining=ScriptApp.getProjectTriggers();
  const exists=targetId&&remaining.some(function(t){return t.getHandlerFunction()===history&&t.getTriggerSourceId()===targetId&&t.getTriggerSource()===ScriptApp.TriggerSource.SPREADSHEETS&&t.getEventType()===ScriptApp.EventType.ON_EDIT;});
  if(!exists&&remaining.length>=20)throw new Error('All 20 Apps Script trigger slots are still in use. Obsolete F1XL triggers were checked; active and unrelated automations were kept. Review Project triggers before retrying. Keep any existing division workbook.');
  return remaining;
}

function divisionTemplateRoundHistoryOnEdit(event) { fapAssertTrigger_(event, 'divisionTemplateRoundHistoryOnEdit');
  if (!event || !event.range) return;
  const sheet = event.range.getSheet();
  if (!/^R\d+$/i.test(sheet.getName())) return;
  const firstColumn = event.range.getColumn(), lastColumn = event.range.getLastColumn();
  const touchesDriver = firstColumn <= 4 && lastColumn >= 4;
  const touchesTeam = firstColumn <= 5 && lastColumn >= 5;
  if (!touchesDriver && !touchesTeam) return;
  const roundType = String(sheet.getRange('A7').getDisplayValue() || '');
  const isSprint = /sprint/i.test(roundType);
  const isEarlySprint = /^(?:early|legacy)\s+sprint/i.test(roundType);
  const starts = isEarlySprint ? [9,37,94] : isSprint ? [9,37,66,94] : [9,37];
  const workbook = event.source;
  if (seasonProtectionForWorkbook_(workbook).readOnly) return;
  const data = workbook.getSheetByName('Data');
  const imports = workbook.getSheetByName('Season Master Import');
  if (!data || !imports) return;
  SpreadsheetApp.flush();
  const mainRows = data.getRange(2, 9, F1XL_CAPACITY.raceEntries, 6).getDisplayValues();
  const driverRows = data.getRange(3, 1, F1XL_CAPACITY.seasonDriversPerDivision, 5).getDisplayValues();
  const teamRows = imports.getRange(2, 10, F1XL_CAPACITY.teams, 8).getDisplayValues();
  const roundAssignments=typeof driverMovementAssignments_==='function'?driverMovementAssignments_(workbook):[];
  const mainByDriver = {}, tierByDriver = {}, numbersByTeamTier = {};
  mainRows.forEach(function(row) {
    const driver = divisionTemplateHistoryText_(row[1]);
    if (driver) mainByDriver[driver.toLowerCase()] = { number:row[0], team:row[4], tier:row[5] };
  });
  driverRows.forEach(function(row) {
    const driver = divisionTemplateHistoryText_(row[0]);
    if (driver) tierByDriver[driver.toLowerCase()] = divisionTemplateHistoryText_(row[4]);
  });
  teamRows.forEach(function(row) {
    const team = divisionTemplateHistoryText_(row[0]);
    if (!team) return;
    numbersByTeamTier[team.toLowerCase() + '|tier 1'] = row[6];
    numbersByTeamTier[team.toLowerCase() + '|tier 2'] = row[7];
  });
  const editedFirstRow = event.range.getRow(), editedLastRow = event.range.getLastRow();
  starts.forEach(function(start) {
    const end = start + F1XL_CAPACITY.raceEntries - 1;
    const from = Math.max(start, editedFirstRow), to = Math.min(end, editedLastRow);
    if (from > to) return;
    for (let row = from; row <= to; row += 1) {
      const driver = divisionTemplateHistoryText_(sheet.getRange(row, 4).getDisplayValue());
      if (!driver) continue;
      const historical=typeof driverMovementRoundAssignment_==='function'?driverMovementRoundAssignment_(workbook,driver,Number(sheet.getName().slice(1)),roundAssignments):null;
      if(historical&&historical.absent)continue;
      const known = historical&&!historical.absent?historical:mainByDriver[driver.toLowerCase()] || {};
      const teamCell = sheet.getRange(row, 5), numberCell = sheet.getRange(row, 3);
      let team = divisionTemplateHistoryText_(teamCell.getDisplayValue());
      if (touchesDriver && !(firstColumn <= 5 && lastColumn >= 5)) {
        team = divisionTemplateHistoryText_(team || known.team);
        if (team && team.toLowerCase() !== 'reserve') teamCell.setValue(team);
      }
      if ((touchesDriver && !(firstColumn <= 3 && lastColumn >= 3)) || touchesTeam) {
        const tier = divisionTemplateHistoryText_(known.tier || tierByDriver[driver.toLowerCase()]);
        const number = numbersByTeamTier[team.toLowerCase() + '|' + tier.toLowerCase()] || known.number;
        if (number !== '' && number != null) numberCell.setValue(number);
      }
    }
  });
}

function divisionTemplateHistoryText_(value) {
  return String(value == null ? '' : value).trim();
}

function divisionTemplateColumnLetter_(column) {
  let value = Number(column), result = '';
  while (value > 0) { const remainder = (value - 1) % 26; result = String.fromCharCode(65 + remainder) + result; value = Math.floor((value - 1) / 26); }
  return result;
}


/** Display-name compatibility for the reviewed TEST -> FAP file renames.
 * IDs, property keys, access checks and original-sheet exclusions stay intact. */
function fapWorkbookLegacyName_(name) {
  const value=String(name==null?'':name),incomplete=value.match(/^(INCOMPLETE\s*-\s*)(.*)$/i);
  if(incomplete)return incomplete[1]+fapWorkbookLegacyName_(incomplete[2]);
  const alias=fapWorkbookNameAliases_().find(pair=>pair[1]===value);if(alias)return alias[0];
  const match=value.match(/^FAP\s*-\s*(.+)$/i);if(!match)return value;
  return /^Ticket Write Up$/i.test(match[1])?'TEST '+match[1]:'TEST - F1XL '+match[1];
}
function fapWorkbookNewName_(name) {
  const value=String(name==null?'':name),incomplete=value.match(/^(INCOMPLETE\s*-\s*)(.*)$/i);
  if(incomplete)return incomplete[1]+fapWorkbookNewName_(incomplete[2]);
  const alias=fapWorkbookNameAliases_().find(pair=>pair[0]===value);if(alias)return alias[1];
  const normal=value.match(/^TEST\s*-\s*F1XL\s+(.+)$/i);if(normal)return 'FAP - '+normal[1];
  return /^TEST Ticket Write Up$/i.test(value)?'FAP - Ticket Write Up':value;
}
function fapWorkbookNameAliases_(){return [
  ['TEST TEMPLATE_Data Sheet ','FAP - Data Sheet Template'],
  ['TEST COPY Overall_S28','FAP - Overall_S28'],
  ['TEST - Applications Tracker Template','FAP - Applications Tracker Template']
];}
/** Search both accepted names before creating; never choose a different source ID. */
function fapWorkbookFilesByName_(container,name) {
  const oldName=fapWorkbookLegacyName_(name),newName=fapWorkbookNewName_(oldName);
  if(oldName===newName)return container.getFilesByName(name);
  const iterators=[container.getFilesByName(newName),container.getFilesByName(oldName)],seen=Object.create(null);
  let index=0,pending=null;
  function fill_(){while(!pending&&index<iterators.length){const items=iterators[index];if(!items.hasNext()){index++;continue;}const file=items.next(),id=file.getId();if(!seen[id]){seen[id]=true;pending=file;}}return !!pending;}
  return {hasNext:fill_,next:function(){if(!fill_())throw Error('No more matching workbooks.');const file=pending;pending=null;return file;}};
}
