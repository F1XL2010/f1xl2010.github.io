/**
 * Recoverable removal of an erroneous TEST season.
 *
 * This deliberately has a read-only preview and a separate exact-confirmation
 * action. It never accepts a non-TEST workbook and it never touches Permanent
 * Reference Data or the Driver Registry file itself.
 */
function getTestSeasonDiscardPreview(input) { fapAssertEntry_('getTestSeasonDiscardPreview');
  const season = seasonDiscardNormaliseSeason_(input && input.season);
  const properties = PropertiesService.getScriptProperties();
  const masterKey = seasonMasterPropertyKey_(season);
  const masterId = properties.getProperty(masterKey);
  if (!masterId) throw new Error('Season ' + season + ' does not have a connected TEST Season Master.');

  const master = SpreadsheetApp.openById(masterId);
  seasonMasterAssertTestWorkbook_(master);
  const files = [{ type:'Season Master', spreadsheetId:masterId, name:master.getName(), url:master.getUrl() }];
  const divisionProperties = [];
  for (let division = 1; division <= F1XL_CAPACITY.divisions; division += 1) {
    const propertyKey = divisionTemplatePropertyKey_(season, division);
    const spreadsheetId = properties.getProperty(propertyKey);
    if (!spreadsheetId) continue;
    const workbook = SpreadsheetApp.openById(spreadsheetId);
    divisionTemplateAssertTestWorkbook_(workbook);
    divisionProperties.push({ division:division, propertyKey:propertyKey, spreadsheetId:spreadsheetId });
    files.push({ type:'Division ' + division, spreadsheetId:spreadsheetId, name:workbook.getName(), url:workbook.getUrl() });
  }

  const registry = seasonDiscardRegistryState_(season);
  const website = seasonDiscardWebsiteState_(season);
  const warnings = [];
  if (divisionProperties.length) warnings.push(divisionProperties.length + ' connected Division workbook' + (divisionProperties.length === 1 ? '' : 's') + ' will be moved to the Drive bin.');
  if (registry.accoladeRecords) warnings.push(registry.accoladeRecords + ' TEST Accolade Record' + (registry.accoladeRecords === 1 ? '' : 's') + ' will be removed after a verified Driver Registry backup.');
  if (website.prepared) warnings.push('Season ' + season + ' is present in the TEST Website Config and that draft/test entry will be removed after a verified config backup.');

  return {
    ok:true,
    season:season,
    confirmationPhrase:'DISCARD SEASON ' + season,
    master:{ spreadsheetId:masterId, name:master.getName(), url:master.getUrl() },
    files:files,
    divisions:divisionProperties.length,
    careerBlock:registry.careerBlock,
    careerImport:registry.importCell || '',
    accoladeRecords:registry.accoladeRecords,
    websiteConfig:website.prepared,
    warnings:warnings,
    message:'Read-only discard preview complete. Nothing has been changed.'
  };
}

function discardTestSeason(input) { fapAssertEntry_('discardTestSeason');
  assertSeasonWritable_(input && input.season);
  const season = seasonDiscardNormaliseSeason_(input && input.season);
  const expected = 'DISCARD SEASON ' + season;
  if (String(input && input.confirmation || '') !== expected) throw new Error('The confirmation wording did not match. Nothing was changed.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Re-run the complete read-only inspection inside the lock so a stale UI
    // preview cannot target connections which have since changed.
    const preview = getTestSeasonDiscardPreview({ season:season });
    preview.files.forEach(function(file) { assertSeasonWorkbookWritable_(season, SpreadsheetApp.openById(file.spreadsheetId)); });
    const properties = PropertiesService.getScriptProperties();
    const registryState = seasonDiscardRegistryState_(season);
    const websiteState = seasonDiscardWebsiteState_(season);
    let registryBackup = null;
    let websiteBackup = null;

    if (registryState.careerBlock || registryState.importCell || registryState.accoladeRecords) {
      registryBackup = careerFormulaCreateVerifiedBackup_(registryState.context.spreadsheet, season);
      seasonDiscardRemoveRegistrySeason_(registryState, season);
    }
    if (websiteState.prepared) {
      websiteBackup = seasonDiscardCreateVerifiedCopy_(websiteState.workbook, 'before discarding TEST Season ' + season);
      seasonDiscardRemoveWebsiteSeason_(websiteState.workbook, season, preview.master.spreadsheetId);
    }

    // Move workbooks to the bin only after dependent records have been backed
    // up and detached. Drive's bin remains recoverable.
    preview.files.forEach(function(item) {
      const file = DriveApp.getFileById(item.spreadsheetId);
      const currentName = file.getName();
      if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(currentName))) throw new Error(item.type + ' is no longer clearly labelled TEST. Disposal stopped before that file was moved.');
      file.setName('DISCARDED - ' + currentName);
      file.setTrashed(true);
    });

    properties.deleteProperty(seasonMasterPropertyKey_(season));
    for (let division = 1; division <= F1XL_CAPACITY.divisions; division += 1) {
      properties.deleteProperty(divisionTemplatePropertyKey_(season, division));
    }
    CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
    if (typeof clearPreseasonHubCache_ === 'function') clearPreseasonHubCache_();
    if (typeof clearDriverDatabaseCache_ === 'function') clearDriverDatabaseCache_();
    CacheService.getScriptCache().remove('F1XL_TEST_WEBSITE_CONFIG_STATUS_V2');

    return {
      ok:true,
      season:season,
      removedFiles:preview.files.length,
      registryBackupUrl:registryBackup ? registryBackup.url : '',
      websiteBackupUrl:websiteBackup ? websiteBackup.url : '',
      message:'TEST Season ' + season + ' was discarded. ' + preview.files.length + ' workbook' + (preview.files.length === 1 ? ' was' : 's were') + ' moved to the recoverable Google Drive bin, its TEST connections were removed, and Season ' + season + ' can now be created again.'
    };
  } finally {
    lock.releaseLock();
  }
}

function seasonDiscardRegistryState_(season) {
  let context = null;
  try { context = openDriverDatabaseContext_(); } catch (error) {
    return { configured:false, context:null, careerBlock:0, importCell:'', accoladeRecords:0 };
  }
  if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(context.spreadsheet.getName()))) throw new Error('The connected Driver Registry is not clearly labelled TEST. Season disposal is blocked.');
  const career = context.spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.careerTab);
  const imports = context.spreadsheet.getSheetByName(F1XL_CAREER_FORMULAS.registryImportTab);
  const careerBlock = career ? careerFormulaFindSeasonBlock_(career, season) : 0;
  const importCell = imports ? careerFormulaImportCellForSeason_(imports, season) : '';
  if (!!careerBlock !== !!importCell) throw new Error('Season ' + season + ' has an incomplete Career Stats connection. Nothing can be discarded automatically until it is inspected.');
  const records = context.spreadsheet.getSheetByName(F1XL_ACCOLADES.recordsTab);
  let accoladeRecords = 0;
  if (records && records.getLastRow() >= 2) {
    accoladeRecords = records.getRange(2, 2, records.getLastRow() - 1, 1).getDisplayValues().filter(function(row) {
      return String(row[0] || '').trim() === String(season);
    }).length;
  }
  return { configured:true, context:context, career:career, imports:imports, careerBlock:careerBlock, importCell:importCell, records:records, accoladeRecords:accoladeRecords };
}

function seasonDiscardWebsiteState_(season) {
  const properties = PropertiesService.getScriptProperties();
  const id = properties.getProperty('F1XL_TEST_WEBSITE_CONFIG_ID_V2');
  if (!id) return { configured:false, prepared:false, workbook:null };
  const workbook = SpreadsheetApp.openById(id);
  if (!/^TEST\s*-\s*F1XL Website Config$/i.test(fapWorkbookLegacyName_(String(workbook.getName() || '').trim()))) {
    throw new Error('The connected Website Config is not clearly labelled TEST. Season disposal is blocked.');
  }
  const row = seasonDiscardFindWebsiteSeason_(workbook, season);
  const tab = workbook.getSheetByName(seasonDiscardWebsiteSheetName_(season));
  return { configured:true, prepared:!!row || !!tab, workbook:workbook, row:row, tab:tab };
}

function seasonDiscardRemoveRegistrySeason_(state, season) {
  if (!state.context) return;
  const career = state.career;
  const imports = state.imports;
  if (state.careerBlock) {
    career.getRange(2, state.careerBlock, 1, 5).breakApart();
    career.deleteColumns(state.careerBlock, F1XL_CAREER_FORMULAS.seasonBlockWidth);
  }
  if (state.importCell) {
    const importColumn = imports.getRange(state.importCell).getColumn();
    imports.getRange(1, importColumn, 1, 6).breakApart();
    imports.deleteColumns(importColumn, F1XL_CAREER_FORMULAS.registryImportWidth);
  }

  if (state.records && state.records.getLastRow() >= 2) {
    const width = F1XL_ACCOLADES.headers.length;
    const count = state.records.getLastRow() - 1;
    const values = state.records.getRange(2, 1, count, width).getValues();
    const remaining = values.filter(function(row) { return String(row[1] || '').trim() !== String(season); });
    state.records.getRange(2, 1, count, width).clearContent();
    if (remaining.length) state.records.getRange(2, 1, remaining.length, width).setValues(remaining);
    accoladeRefreshSummary_(state.context);
  }

  seasonDiscardRefreshCareerTotals_(career);
  driverDatabaseAudit_(state.context, 'DISCARD_TEST_SEASON', 'season', season, 'Removed the TEST Career Stats/import connection and TEST accolade records for discarded Season ' + season + '. A verified Registry backup was created first.');
  SpreadsheetApp.flush();
}

function seasonDiscardRefreshCareerTotals_(career) {
  if (!career) return;
  const lastDriverRow = Math.max(3, career.getLastRow());
  let lastBlock = 0;
  for (let column = F1XL_CAREER_FORMULAS.careerFirstBlockColumn; column <= career.getLastColumn(); column += F1XL_CAREER_FORMULAS.seasonBlockWidth) {
    if (/^season\s+/i.test(String(career.getRange(2, column).getDisplayValue() || '').trim())) lastBlock = column;
  }
  if (lastDriverRow < 4) return;
  if (lastBlock) {
    careerFormulaRefreshCareerTotals_(career, lastDriverRow, lastBlock + F1XL_CAREER_FORMULAS.metricHeaders.length - 1);
    return;
  }
  const rows = lastDriverRow - 3;
  career.getRange(4, 3, rows, 6).setValues(Array.from({ length:rows }, function() { return [0,0,0,0,0,0]; })).setNumberFormat('0');
}

function seasonDiscardRemoveWebsiteSeason_(workbook, season, masterId) {
  const main = workbook.getSheetByName('Main');
  const keyCell = main && seasonDiscardFindKeyCell_(main, 's' + String(season).replace('.', '_') + '_gid');
  if (keyCell) main.deleteRow(keyCell.getRow());
  const tab = workbook.getSheetByName(seasonDiscardWebsiteSheetName_(season));
  if (tab) workbook.deleteSheet(tab);
  if (main) {
    const currentMaster = seasonDiscardFindKeyCell_(main, 'drivers_licence_sheet_id');
    if (currentMaster && String(currentMaster.offset(0, 1).getDisplayValue() || '').trim() === String(masterId)) {
      ['drivers_licence_sheet_id','drivers_licence_summary_gid','drivers_licence_bans_gid','drivers_licence_penalty_guide_gid'].forEach(function(key) {
        const cell = seasonDiscardFindKeyCell_(main, key);
        if (cell) cell.offset(0, 1).clearContent();
      });
    }
  }
  SpreadsheetApp.flush();
}

function seasonDiscardFindWebsiteSeason_(workbook, season) {
  const main = workbook.getSheetByName('Main');
  const key = 's' + String(season).replace('.', '_') + '_gid';
  const cell = main && seasonDiscardFindKeyCell_(main, key);
  return cell ? { season:season, row:cell.getRow() } : null;
}

function seasonDiscardFindKeyCell_(sheet, key) {
  if (!sheet || !sheet.getLastRow()) return null;
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 1).getDisplayValues();
  const wanted = String(key || '').trim().toLowerCase();
  const index = values.findIndex(function(row) { return String(row[0] || '').trim().toLowerCase() === wanted; });
  return index < 0 ? null : sheet.getRange(index + 1, 1);
}

function seasonDiscardWebsiteSheetName_(season) {
  return 'S' + String(season).replace('.', '_');
}

function seasonDiscardCreateVerifiedCopy_(spreadsheet, reason) {
  SpreadsheetApp.flush();
  const source = DriveApp.getFileById(spreadsheet.getId());
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyyMMdd-HHmmss');
  const name = 'BACKUP - ' + spreadsheet.getName() + ' - ' + reason + ' - ' + timestamp;
  const parents = source.getParents();
  const copyFile = parents.hasNext() ? source.makeCopy(name, parents.next()) : source.makeCopy(name);
  const copy = SpreadsheetApp.openById(copyFile.getId());
  if (spreadsheet.getSheets().length !== copy.getSheets().length) throw new Error('The TEST Website Config backup did not preserve every tab. Nothing was discarded.');
  spreadsheet.getSheets().forEach(function(sheet) {
    const copied = copy.getSheetByName(sheet.getName());
    if (!copied || careerFormulaSheetFingerprint_(sheet) !== careerFormulaSheetFingerprint_(copied)) throw new Error('The TEST Website Config backup did not match ' + sheet.getName() + '. Nothing was discarded.');
  });
  return { id:copy.getId(), url:copy.getUrl() };
}

function seasonDiscardNormaliseSeason_(value) {
  const season = String(value || '').trim();
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Choose a connected season number first.');
  return season;
}
