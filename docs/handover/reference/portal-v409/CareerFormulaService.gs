/**
 * Formula-driven bridge from generated Division workbooks to the permanent
 * Driver Registry. The visible Career Stats grid stays familiar; these
 * technical outputs make the calculation use stable Driver IDs and sum every
 * Division in which a driver appeared.
 */
const F1XL_CAREER_FORMULAS = Object.freeze({
  divisionFirstRow: 2,
  divisionLastRow: 45,
  divisionFirstColumn: 23, // W
  divisionWidth: 6,
  masterTab: 'Career Stats Export',
  registryImportTab: 'Career Imports',
  seasonBlockWidth: 6,
  registryImportWidth: 7,
  registryFirstBlockColumn: 1,
  careerFirstBlockColumn: 10,
  registryImportRows: 1200,
  metricHeaders: ['Wins','Podiums','Poles','Sprint Wins','Races Started']
});

/**
 * Adds a hidden Driver-ID output beside the existing Driver Stats table.
 * The visible A:V table and all existing formulas remain unchanged.
 */
function careerFormulaPrepareDivisionExport_(workbook) {
  assertSeasonWorkbookWritable_(null, workbook);
  const stats = workbook.getSheetByName('Driver Stats');
  const imports = workbook.getSheetByName('Season Master Import');
  if (!stats || !imports) throw new Error('Career export requires Driver Stats and Season Master Import.');
  divisionTemplateEnsureSheetColumns_(stats, F1XL_CAREER_FORMULAS.divisionFirstColumn + F1XL_CAREER_FORMULAS.divisionWidth - 1);
  const firstColumn = F1XL_CAREER_FORMULAS.divisionFirstColumn;
  const rowCount = F1XL_CAREER_FORMULAS.divisionLastRow - F1XL_CAREER_FORMULAS.divisionFirstRow + 1;
  stats.getRange(1, firstColumn, rowCount + 1, F1XL_CAREER_FORMULAS.divisionWidth).clearContent();
  stats.getRange(1, firstColumn, 1, F1XL_CAREER_FORMULAS.divisionWidth)
    .setValues([['Driver ID'].concat(F1XL_CAREER_FORMULAS.metricHeaders)])
    .setNote('Technical career-stat output. Formula-controlled; do not edit.')
    .setFontWeight('bold');
  const formulas = [];
  for (let row = F1XL_CAREER_FORMULAS.divisionFirstRow; row <= F1XL_CAREER_FORMULAS.divisionLastRow; row += 1) {
    formulas.push(careerFormulaDivisionExportRow_(row));
  }
  stats.getRange(F1XL_CAREER_FORMULAS.divisionFirstRow, firstColumn, rowCount, F1XL_CAREER_FORMULAS.divisionWidth).setFormulas(formulas);
  stats.hideColumns(firstColumn, F1XL_CAREER_FORMULAS.divisionWidth);
}

/** Builds one compact, formula-controlled season table in the Season Master. */
function careerFormulaRefreshMasterExport_(master, season) {
  assertSeasonWorkbookWritable_(season, master);
  const properties = PropertiesService.getScriptProperties();
  const start = master.getSheetByName('Start Here');
  const confirmedDivisions = start ? Number(start.getRange('B5').getValue()) : 0;
  if (!Number.isInteger(confirmedDivisions) || confirmedDivisions < 1) return null;
  let sheet = master.getSheetByName(F1XL_CAREER_FORMULAS.masterTab);
  if (!sheet) sheet = master.insertSheet(F1XL_CAREER_FORMULAS.masterTab);
  sheet.clear();
  sheet.setHiddenGridlines(false);
  sheet.getRange('A1:F1').setValues([['Driver ID'].concat(F1XL_CAREER_FORMULAS.metricHeaders)])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground('#666666')
    .setNote('Technical season total used by the permanent Driver Registry. Do not edit.');

  const workbookIds = [];
  for (let division = 1; division <= confirmedDivisions; division += 1) {
    const id = properties.getProperty(divisionTemplatePropertyKey_(season, division));
    if (!id) continue;
    const workbook = SpreadsheetApp.openById(id);
    if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(workbook.getName()))) throw new Error('Career formula testing is restricted to TEST Division workbooks.');
    assertSeasonWorkbookWritable_(season, workbook);
    divisionTemplateEnsureEntrantImportCapacity_(workbook, master.getId());
    careerFormulaPrepareDivisionExport_(workbook);
    workbookIds.push(id);
  }
  if (workbookIds.length) {
    sheet.getRange('A2').setFormula(careerFormulaMasterQueryFormula_(workbookIds));
  } else {
    sheet.getRange('A2').setValue('No connected Division workbooks yet.');
  }
  [145,90,90,90,100,110].forEach(function(width, index) { sheet.setColumnWidth(index + 1, width); });
  sheet.setFrozenRows(1);
  sheet.setTabColor('#666666');
  sheet.hideSheet();
  return sheet;
}

/**
 * Reports whether the connected Season Master contains the exact technical
 * career export expected for its currently connected Division workbooks.
 */
function careerFormulaMasterExportStatus_(master, season) {
  const sheet = master.getSheetByName(F1XL_CAREER_FORMULAS.masterTab);
  const start = master.getSheetByName('Start Here');
  const confirmedDivisions = start ? Number(start.getRange('B5').getValue()) : 0;
  const expectedHeaders = ['Driver ID'].concat(F1XL_CAREER_FORMULAS.metricHeaders);
  if (!sheet || !Number.isInteger(confirmedDivisions) || confirmedDivisions < 1) {
    return { configured:!!sheet, ready:false, divisions:confirmedDivisions || 0, connectedDivisions:0 };
  }

  const properties = PropertiesService.getScriptProperties();
  const workbookIds = [];
  for (let division = 1; division <= confirmedDivisions; division += 1) {
    const id = properties.getProperty(divisionTemplatePropertyKey_(season, division));
    if (id) workbookIds.push(id);
  }
  const headers = sheet.getRange('A1:F1').getDisplayValues()[0];
  const headersReady = headers.every(function(value, index) {
    return String(value || '').trim() === expectedHeaders[index];
  });
  const outputReady = workbookIds.length
    ? sheet.getRange('A2').getFormula() === careerFormulaMasterQueryFormula_(workbookIds)
    : String(sheet.getRange('A2').getDisplayValue() || '').trim() === 'No connected Division workbooks yet.';
  const firstOutput = String(sheet.getRange('A2').getDisplayValue() || '').trim();
  return {
    configured:true,
    ready:headersReady && outputReady,
    populated:!!(workbookIds.length && firstOutput && !/^#/.test(firstOutput)),
    divisions:confirmedDivisions,
    connectedDivisions:workbookIds.length,
    url:master.getUrl() + '#gid=' + sheet.getSheetId()
  };
}

/** Explicit TEST-only FAP repair for a missing Master export and Registry link. */
function repairTestSeasonCareerStats(input) { fapAssertEntry_('repairTestSeasonCareerStats');
  assertSeasonWritable_(input && input.season);
  const season = seasonStatisticsPreviewSeason_(input && input.season);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const masterId = PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season));
    if (!masterId) throw new Error('Season ' + season + ' does not have a connected Season Master.');
    const master = SpreadsheetApp.openById(masterId);
    if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(master.getName()))) throw new Error('Career formula repair is restricted to a TEST Season Master.');
    const before = careerFormulaMasterExportStatus_(master, season);
    const result = careerFormulaEnsureSeasonRegistered_(season, master);
    SpreadsheetApp.flush();
    const after = careerFormulaMasterExportStatus_(master, season);
    if (!after.ready) throw new Error('The Season Master Career Stats export could not be verified after repair.');
    return {
      ok:true,
      season:season,
      rebuiltMasterExport:!before.ready,
      populated:after.populated,
      masterExportUrl:after.url,
      connection:result.connection,
      message:'Season ' + season + ' Career Stats formulas repaired and verified. The Season Master export ' + (after.populated ? 'is populated' : 'is installed and waiting for Google to recalculate') + ', and the permanent Registry formulas were refreshed in place.'
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Normal season lifecycle hook. It is safe to call repeatedly: an existing
 * season block is never overwritten and a new one is backed up before being
 * appended to the right of Career Stats.
 */
function careerFormulaEnsureSeasonRegistered_(season, master) {
  assertSeasonWorkbookWritable_(season, master);
  if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(master.getName()))) throw new Error('Career formula preparation is restricted to a TEST Season Master.');
  const context = openDriverDatabaseContext_();
  if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(context.spreadsheet.getName()))) throw new Error('Career formula preparation is restricted to the TEST Driver Registry.');
  validateDriverCareerTemplates_(context.spreadsheet);
  const career = context.spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.careerTab);
  const imports = context.spreadsheet.getSheetByName(F1XL_CAREER_FORMULAS.registryImportTab);
  const careerBlock = careerFormulaFindSeasonBlock_(career, season);
  const importCell = imports ? careerFormulaImportCellForSeason_(imports, season) : '';

  const masterExport = careerFormulaRefreshMasterExport_(master, season);
  if (!masterExport) throw new Error('The Season Master does not yet have a valid Division count.');
  const needsRepair = careerFormulaRegistryBlockNeedsRepair_(career, careerBlock, imports, importCell, master, season);
  if (careerBlock && importCell && !needsRepair) {
    const status = careerFormulaConnectionStatus_(context, season);
    if (status.ready && imports) imports.hideSheet();
    else if (imports) imports.showSheet();
    return { created:false, connection:status, message:'Season ' + season + ' already has its Career Stats block. Nothing was replaced.' };
  }

  const backup = careerFormulaCreateVerifiedBackup_(context.spreadsheet, season);
  const result = careerFormulaPrepareRegistryBlock_(context, season, master);
  result.imports.showSheet();
  SpreadsheetApp.flush();
  driverDatabaseAudit_(context, result.created ? 'REGISTER_CAREER_SEASON' : 'REPAIR_CAREER_SEASON', 'season', season, (result.created ? 'Added' : 'Repaired') + ' the formula-driven Career Stats block for TEST Season ' + season + ' after verified registry backup ' + backup.id + '.');
  return {
    created:result.created,
    repaired:result.repaired,
    backupUrl:backup.url,
    connection:careerFormulaConnectionStatus_(context, season),
    message:result.created
      ? 'Season ' + season + ' Career Stats block added. Google may require one Allow access click in Career Imports.'
      : 'Season ' + season + ' Career Stats import and lookup formulas were repaired. Google may require one Allow access click in Career Imports.'
  };
}

function careerFormulaConnectionStatus_(context, season) {
  const imports = context.spreadsheet.getSheetByName(F1XL_CAREER_FORMULAS.registryImportTab);
  const importCell = imports ? careerFormulaImportCellForSeason_(imports, season) : '';
  if (!imports || !importCell) return { configured:false, ready:false, tasks:[] };
  const cell = imports.getRange(importCell);
  const display = String(cell.getDisplayValue() || '').trim();
  const ready = /^driver id$/i.test(display);
  return {
    configured:true,
    ready:ready,
    tasks:ready ? [] : [{
      direction:'Driver Registry → Season Master',
      url:context.spreadsheet.getUrl() + '#gid=' + imports.getSheetId() + '&range=' + importCell,
      instruction:'Open the Driver Registry Career Imports tab, click cell ' + importCell + ', press Allow access, then close the Sheet.'
    }]
  };
}

/**
 * TEST-only action. It prepares the season aggregation and adds (or preserves)
 * one oldest-to-newest formula block in the existing permanent Career Stats.
 */
function prepareTestCareerSeasonFormulas(input) { fapAssertEntry_('prepareTestCareerSeasonFormulas');
  assertSeasonWritable_(input && input.season);
  const season = seasonStatisticsPreviewSeason_(input && input.season);
  const preview = getDriverSeasonStatisticsPreview(season, true);
  if (preview.unmatched) throw new Error('Resolve every unmatched season driver before preparing Career Stats formulas. Nothing was changed.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const masterId = properties.getProperty(seasonMasterPropertyKey_(season));
    const master = SpreadsheetApp.openById(masterId);
    assertSeasonWorkbookWritable_(season, master);
    if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(master.getName()))) throw new Error('Career formula testing is restricted to a TEST Season Master.');
    const registry = openDriverDatabaseContext_();
    if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(registry.spreadsheet.getName()))) throw new Error('Career formula testing is restricted to the TEST Driver Registry.');
    validateDriverCareerTemplates_(registry.spreadsheet);
    const backup = careerFormulaCreateVerifiedBackup_(registry.spreadsheet, season);
    const masterExport = careerFormulaRefreshMasterExport_(master, season);
    if (!masterExport) throw new Error('The Season Master does not yet have a confirmed Division count.');
    const result = careerFormulaPrepareRegistryBlock_(registry, season, master);
    SpreadsheetApp.flush();
    driverDatabaseAudit_(registry, 'PREPARE_CAREER_FORMULAS', 'season', season, 'Prepared stable-ID Career Stats formulas for TEST Season ' + season + ' after registry backup ' + backup.id + '.');
    return {
      ok:true,
      season:season,
      created:result.created,
      backupUrl:backup.url,
      careerUrl:registry.spreadsheet.getUrl() + '#gid=' + result.career.getSheetId(),
      importUrl:registry.spreadsheet.getUrl() + '#gid=' + result.imports.getSheetId() + '&range=' + result.importCell,
      masterExportUrl:master.getUrl() + '#gid=' + masterExport.getSheetId(),
      message:result.created
        ? 'Season ' + season + ' formula block prepared. Open the Career Imports connection and press Allow access if Google shows #REF!.'
        : 'Season ' + season + ' Career Stats import and lookup formulas were refreshed from the connected Season Master. Open Career Imports and press Allow access if Google shows #REF!.'
    };
  } finally {
    lock.releaseLock();
  }
}

function careerFormulaPrepareRegistryBlock_(context, season, master) {
  assertSeasonWorkbookWritable_(season, master);
  const registry = context.spreadsheet;
  const career = registry.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.careerTab);
  let imports = registry.getSheetByName(F1XL_CAREER_FORMULAS.registryImportTab);
  if (!imports) imports = registry.insertSheet(F1XL_CAREER_FORMULAS.registryImportTab);
  imports.setHiddenGridlines(false);
  imports.setTabColor('#666666');

  const existingCareerColumn = careerFormulaFindSeasonBlock_(career, season);
  const existingImportColumn = careerFormulaImportColumnForSeason_(imports, season);
  const importColumn = existingImportColumn || careerFormulaNextImportColumn_(imports);
  driverCareerEnsureColumns_(imports, importColumn + F1XL_CAREER_FORMULAS.registryImportWidth - 1);
  imports.getRange(1, importColumn, 1, F1XL_CAREER_FORMULAS.registryImportWidth).clearContent().breakApart();
  imports.getRange(1, importColumn, 1, 6).merge().setValue('Season ' + season).setFontWeight('bold').setBackground('#666666').setFontColor('#ffffff');
  imports.getRange(2, importColumn).setFormula(careerFormulaRegistryImportFormula_(master.getId()));
  const importStartLetter = divisionTemplateColumnLetter_(importColumn);
  const importEndLetter = divisionTemplateColumnLetter_(importColumn + 5);

  const careerColumn = existingCareerColumn || careerFormulaNextCareerColumn_(career);
  driverCareerEnsureColumns_(career, careerColumn + F1XL_CAREER_FORMULAS.seasonBlockWidth - 1);
  career.getRange(2, careerColumn, 2, F1XL_CAREER_FORMULAS.seasonBlockWidth).clearContent().breakApart();
  career.getRange(2, careerColumn, 1, 5).merge().setValue('Season ' + season).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1b5e20').setHorizontalAlignment('center');
  career.getRange(3, careerColumn, 1, 6).setValues([F1XL_CAREER_FORMULAS.metricHeaders.concat([''])]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#38761d').setHorizontalAlignment('center');

  const lastDriverRow = careerFormulaSyncRegistryDrivers_(context, career);
  const formulas = [];
  for (let row = 4; row <= lastDriverRow; row += 1) {
    formulas.push(F1XL_CAREER_FORMULAS.metricHeaders.map(function(_, metricIndex) {
      return careerFormulaRegistryLookupFormula_(row, importStartLetter, importEndLetter, metricIndex + 2);
    }).concat(['=""']));
  }
  if (formulas.length) career.getRange(4, careerColumn, formulas.length, F1XL_CAREER_FORMULAS.seasonBlockWidth).setFormulas(formulas);
  [95,95,95,100,110,24].forEach(function(width, index) { career.setColumnWidth(careerColumn + index, width); });
  careerFormulaRefreshCareerTotals_(career, lastDriverRow, careerFormulaLastMetricColumn_(career));
  return { created:!existingCareerColumn, repaired:!!(existingCareerColumn || existingImportColumn), career:career, imports:imports, importCell:importStartLetter + '2' };
}

function careerFormulaRegistryImportFormula_(masterId) {
  return '=IMPORTRANGE("' + masterId + '","\'' + F1XL_CAREER_FORMULAS.masterTab + '\'!A1:F1200")';
}

function careerFormulaRegistryBlockNeedsRepair_(career, careerBlock, imports, importCell, master, season) {
  if (!careerBlock || !imports || !importCell) return true;
  if (imports.getRange(importCell).getFormula() !== careerFormulaRegistryImportFormula_(master.getId())) return true;
  const headers = career.getRange(3, careerBlock, 1, F1XL_CAREER_FORMULAS.metricHeaders.length).getDisplayValues()[0];
  if (headers.some(function(header, index) { return String(header || '').trim() !== F1XL_CAREER_FORMULAS.metricHeaders[index]; })) return true;
  if (career.getLastRow() < 4) return false;
  const importColumn = careerFormulaImportColumnForSeason_(imports, season);
  if (!importColumn) return true;
  const start = divisionTemplateColumnLetter_(importColumn);
  const end = divisionTemplateColumnLetter_(importColumn + F1XL_CAREER_FORMULAS.metricHeaders.length);
  return career.getRange(4, careerBlock).getFormula() !== careerFormulaRegistryLookupFormula_(4, start, end, 2);
}

function careerFormulaDivisionExportRow_(row) {
  const lastEntrantRow = F1XL_CAPACITY.seasonEntrants + 1;
  return [
    '=IF(A' + row + '="","",IFERROR(INDEX(\'Season Master Import\'!$A$2:$A$' + lastEntrantRow + ',MATCH(A' + row + ',\'Season Master Import\'!$B$2:$B$' + lastEntrantRow + ',0)),""))',
    '=IF($W' + row + '="","",B' + row + ')',
    '=IF($W' + row + '="","",C' + row + ')',
    '=IF($W' + row + '="","",D' + row + ')',
    '=IF($W' + row + '="","",K' + row + ')',
    '=IF($W' + row + '="","",Q' + row + ')'
  ];
}

function careerFormulaMasterQueryFormula_(workbookIds) {
  const imports = workbookIds.map(function(id) {
    return 'IFERROR(IMPORTRANGE("' + id + '","\'Driver Stats\'!W2:AB45"),{"","","","","",""})';
  });
  const query = 'select Col1,sum(Col2),sum(Col3),sum(Col4),sum(Col5),sum(Col6) where Col1 is not null group by Col1 label sum(Col2) \'\',sum(Col3) \'\',sum(Col4) \'\',sum(Col5) \'\',sum(Col6) \'\'';
  return '=IFERROR(QUERY({' + imports.join(';') + '},"' + query + '",0),"")';
}

function careerFormulaRegistryLookupFormula_(row, importStartLetter, importEndLetter, lookupColumn) {
  return '=IF($A' + row + '="","",IFERROR(VLOOKUP($A' + row + ',\'' + F1XL_CAREER_FORMULAS.registryImportTab + '\'!$' + importStartLetter + '$3:$' + importEndLetter + '$' + (F1XL_CAREER_FORMULAS.registryImportRows + 2) + ',' + lookupColumn + ',FALSE),""))';
}

function careerFormulaSyncRegistryDrivers_(context, career) {
  const drivers = driverCareerTemplateDrivers_(context.directory);
  const existingLast = Math.max(3, career.getLastRow());
  const existing = existingLast >= 4 ? career.getRange(4, 1, existingLast - 3, 1).getDisplayValues().flat() : [];
  const existingMap = {};
  existing.forEach(function(id) { if (id) existingMap[id] = true; });
  const missing = drivers.filter(function(driver) { return !existingMap[driver.id]; });
  if (missing.length) {
    const firstRow = existingLast + 1;
    driverCareerEnsureRows_(career, firstRow + missing.length - 1);
    career.getRange(firstRow, 1, missing.length, 1).setValues(missing.map(function(driver) { return [driver.id]; }));
    career.getRange(firstRow, 2, missing.length, 1).setFormulas(missing.map(function(_, index) {
      const row = firstRow + index;
      return ['=IFERROR(VLOOKUP($A' + row + ',\'Drivers\'!$A:$B,2,FALSE),"")'];
    }));
  }
  return Math.max(3, career.getLastRow());
}

function careerFormulaRefreshCareerTotals_(career, lastDriverRow, lastMetricColumn) {
  const end = divisionTemplateColumnLetter_(lastMetricColumn);
  const formulas = [];
  for (let row = 4; row <= lastDriverRow; row += 1) {
    formulas.push([
      '=COUNTIFS($J$3:$' + end + '$3,"Races Started",$J' + row + ':$' + end + row + ',">0")',
      '=SUMIF($J$3:$' + end + '$3,"Wins",$J' + row + ':$' + end + row + ')',
      '=SUMIF($J$3:$' + end + '$3,"Podiums",$J' + row + ':$' + end + row + ')',
      '=SUMIF($J$3:$' + end + '$3,"Poles",$J' + row + ':$' + end + row + ')',
      '=SUMIF($J$3:$' + end + '$3,"Sprint Wins",$J' + row + ':$' + end + row + ')',
      '=SUMIF($J$3:$' + end + '$3,"Races Started",$J' + row + ':$' + end + row + ')'
    ]);
  }
  if (formulas.length) career.getRange(4, 3, formulas.length, 6).setFormulas(formulas).setNumberFormat('0');
}

function careerFormulaFindSeasonBlock_(career, season) {
  const lastColumn = career.getLastColumn();
  if (lastColumn < F1XL_CAREER_FORMULAS.careerFirstBlockColumn) return 0;
  const labels = career.getRange(2, F1XL_CAREER_FORMULAS.careerFirstBlockColumn, 1, lastColumn - F1XL_CAREER_FORMULAS.careerFirstBlockColumn + 1).getDisplayValues()[0];
  const wanted = 'season ' + season;
  for (let index = 0; index < labels.length; index += F1XL_CAREER_FORMULAS.seasonBlockWidth) {
    if (String(labels[index] || '').trim().toLowerCase() === wanted) return F1XL_CAREER_FORMULAS.careerFirstBlockColumn + index;
  }
  return 0;
}

function careerFormulaNextCareerColumn_(career) {
  const firstLabel = String(career.getRange(2, F1XL_CAREER_FORMULAS.careerFirstBlockColumn).getDisplayValue() || '').trim();
  if (!firstLabel || /^season$/i.test(firstLabel)) return F1XL_CAREER_FORMULAS.careerFirstBlockColumn;
  let column = F1XL_CAREER_FORMULAS.careerFirstBlockColumn;
  while (column <= career.getLastColumn() && String(career.getRange(2, column).getDisplayValue() || '').trim()) column += F1XL_CAREER_FORMULAS.seasonBlockWidth;
  return column;
}

function careerFormulaLastMetricColumn_(career) {
  let lastMetricColumn = F1XL_CAREER_FORMULAS.careerFirstBlockColumn + F1XL_CAREER_FORMULAS.metricHeaders.length - 1;
  for (let column = F1XL_CAREER_FORMULAS.careerFirstBlockColumn; column <= career.getLastColumn(); column += F1XL_CAREER_FORMULAS.seasonBlockWidth) {
    if (/^season\s+/i.test(String(career.getRange(2, column).getDisplayValue() || '').trim())) {
      lastMetricColumn = column + F1XL_CAREER_FORMULAS.metricHeaders.length - 1;
    }
  }
  return lastMetricColumn;
}

function careerFormulaCreateVerifiedBackup_(spreadsheet, season) {
  SpreadsheetApp.flush();
  const sourceFile = DriveApp.getFileById(spreadsheet.getId());
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyyMMdd-HHmmss');
  const name = 'BACKUP - ' + spreadsheet.getName() + ' - before Season ' + season + ' Career formulas - ' + timestamp;
  const parents = sourceFile.getParents();
  const backupFile = parents.hasNext() ? sourceFile.makeCopy(name, parents.next()) : sourceFile.makeCopy(name);
  const backup = SpreadsheetApp.openById(backupFile.getId());
  const sourceSheets = spreadsheet.getSheets();
  const backupSheets = backup.getSheets();
  if (sourceSheets.length !== backupSheets.length) throw new Error('The Registry backup has a different number of tabs from its source. Nothing further was changed.');
  sourceSheets.forEach(function(sourceSheet) {
    const backupSheet = backup.getSheetByName(sourceSheet.getName());
    if (!backupSheet || careerFormulaSheetFingerprint_(sourceSheet) !== careerFormulaSheetFingerprint_(backupSheet)) {
      throw new Error('The Registry backup did not match the source tab ' + sourceSheet.getName() + '. Nothing further was changed.');
    }
  });
  return { id:backup.getId(), url:backup.getUrl() };
}

function careerFormulaSheetFingerprint_(sheet) {
  // Career Imports contains IMPORTRANGE array results. Google may show those
  // spilled values differently in a freshly copied workbook until permission
  // and recalculation finish, even though the copied formula is identical.
  // Verify the physical shape, permanent headers and formula anchors instead
  // of treating volatile spill output as manually stored source data.
  if (sheet.getName() === F1XL_CAREER_FORMULAS.registryImportTab) {
    const columns = sheet.getMaxColumns();
    const content = JSON.stringify({
      rows:sheet.getMaxRows(),
      columns:columns,
      headers:sheet.getRange(1, 1, 1, columns).getValues(),
      formulaAnchors:sheet.getRange(2, 1, 1, columns).getFormulas()
    });
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, content, Utilities.Charset.UTF_8).map(function(byte) {
      return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
    }).join('');
  }
  const range = sheet.getDataRange();
  const values = range.getValues();
  const formulas = range.getFormulas();
  for (let row = 0; row < values.length; row += 1) {
    for (let column = 0; column < values[row].length; column += 1) {
      if (formulas[row][column]) values[row][column] = null;
    }
  }
  const content = JSON.stringify({
    rows:range.getNumRows(),
    columns:range.getNumColumns(),
    constants:values,
    formulas:formulas
  });
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, content, Utilities.Charset.UTF_8).map(function(byte) {
    return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
  }).join('');
}

function careerFormulaNextImportColumn_(imports) {
  let column = F1XL_CAREER_FORMULAS.registryFirstBlockColumn;
  while (column <= imports.getLastColumn() && String(imports.getRange(1, column).getDisplayValue() || '').trim()) column += F1XL_CAREER_FORMULAS.registryImportWidth;
  return column;
}

function careerFormulaImportCellForSeason_(imports, season) {
  const column = careerFormulaImportColumnForSeason_(imports, season);
  return column ? divisionTemplateColumnLetter_(column) + '2' : '';
}

function careerFormulaImportColumnForSeason_(imports, season) {
  const wanted = 'season ' + season;
  for (let column = 1; column <= imports.getLastColumn(); column += F1XL_CAREER_FORMULAS.registryImportWidth) {
    if (String(imports.getRange(1, column).getDisplayValue() || '').trim().toLowerCase() === wanted) return column;
  }
  return 0;
}

/** Read-only reconciliation after Google has approved the Registry import. */
function verifyTestCareerSeasonFormulas(input) { fapAssertEntry_('verifyTestCareerSeasonFormulas');
  const season = seasonStatisticsPreviewSeason_(input && input.season);
  const preview = getDriverSeasonStatisticsPreview(season, true);
  const registry = openDriverDatabaseContext_();
  const career = registry.spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.careerTab);
  const imports = registry.spreadsheet.getSheetByName(F1XL_CAREER_FORMULAS.registryImportTab);
  if (!career || !imports) throw new Error('Prepare the Career Stats formula block first.');
  const block = careerFormulaFindSeasonBlock_(career, season);
  if (!block) throw new Error('Career Stats does not contain a Season ' + season + ' block.');
  const importCell = careerFormulaImportCellForSeason_(imports, season);
  const importDisplay = importCell ? imports.getRange(importCell).getDisplayValue() : '';
  if (/^#REF!/i.test(importDisplay)) {
    return { ok:false, needsConnection:true, importUrl:registry.spreadsheet.getUrl() + '#gid=' + imports.getSheetId() + '&range=' + importCell, message:'Google still needs permission for the Registry to read this Season Master. Open the connection cell and press Allow access.' };
  }
  const lastRow = career.getLastRow();
  const ids = career.getRange(4, 1, Math.max(0, lastRow - 3), 1).getDisplayValues().flat();
  const values = career.getRange(4, block, Math.max(0, lastRow - 3), 5).getDisplayValues();
  const actual = {};
  ids.forEach(function(id, index) {
    if (!id) return;
    actual[id] = values[index].map(seasonStatisticsPreviewNumber_);
  });
  const mismatches = [];
  preview.rows.filter(function(row) { return row.matched; }).forEach(function(row) {
    const expected = [row.wins,row.podiums,row.poles,row.sprintWins,row.racesStarted];
    const found = actual[row.driverId] || null;
    if (!found || expected.some(function(value, index) { return Number(value) !== Number(found[index]); })) {
      mismatches.push({ driverId:row.driverId, gamertag:row.currentGamertag || row.sourceNames[0], expected:expected, actual:found });
    }
  });
  return {
    ok:mismatches.length === 0,
    needsConnection:false,
    season:season,
    matched:preview.matched,
    mismatches:mismatches,
    careerUrl:registry.spreadsheet.getUrl() + '#gid=' + career.getSheetId(),
    message:mismatches.length ? mismatches.length + ' Career Stats row(s) do not match the read-only Division calculation.' : 'Season ' + season + ' Career Stats formulas match every calculated Division total.'
  };
}
