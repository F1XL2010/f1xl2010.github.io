/**
 * Adds the permanent, manually usable career record tabs to the connected
 * TEST Driver Registry. The existing historical workbook remains read-only.
 */
const F1XL_DRIVER_CAREER_TEMPLATES = Object.freeze({
  careerTab: 'Career Stats',
  accoladesTab: 'Accolades',
  backupProperty: 'F1XL_DRIVER_CAREER_TEMPLATE_BACKUP_ID',
  sourceProperty: 'F1XL_DRIVER_CAREER_TEMPLATE_BACKUP_SOURCE_ID',
  completedProperty: 'F1XL_DRIVER_CAREER_TEMPLATES_CREATED_AT',
  protectedTabs: ['Settings', 'Drivers', 'DriverAliases', 'DriverProfileMerges', 'AuditLog']
});

function getDriverCareerTemplateStatus() { fapAssertEntry_('getDriverCareerTemplateStatus');
  const context = openDriverDatabaseContext_();
  return buildDriverCareerTemplateStatus_(context.spreadsheet);
}

function createDriverCareerTemplates() { fapAssertEntry_('createDriverCareerTemplates');
  return withDriverDatabaseLock_(function() {
    const context = openDriverDatabaseContext_();
    const spreadsheet = context.spreadsheet;
    const existingCareer = spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.careerTab);
    const existingAccolades = spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.accoladesTab);

    if (existingCareer || existingAccolades) {
      if (existingCareer && existingAccolades) {
        validateDriverCareerTemplates_(spreadsheet);
        return buildDriverCareerTemplateStatus_(spreadsheet, 'The permanent career tabs already exist and passed their structure check. Nothing was replaced.');
      }
      throw new Error('Only one permanent career tab exists. Nothing was changed. Inspect the registry before trying again.');
    }

    const drivers = driverCareerTemplateDrivers_(context.directory);
    if (!drivers.length) throw new Error('The Driver Registry contains no usable Driver IDs. Nothing was created.');

    const backup = createAndVerifyDriverCareerBackup_(spreadsheet);
    let career = null;
    let accolades = null;
    try {
      career = spreadsheet.insertSheet(F1XL_DRIVER_CAREER_TEMPLATES.careerTab);
      accolades = spreadsheet.insertSheet(F1XL_DRIVER_CAREER_TEMPLATES.accoladesTab);
      buildCareerStatsTab_(career, drivers);
      buildAccoladesTab_(accolades, drivers);
      SpreadsheetApp.flush();
      validateDriverCareerTemplates_(spreadsheet);
      PropertiesService.getScriptProperties().setProperty(F1XL_DRIVER_CAREER_TEMPLATES.completedProperty, new Date().toISOString());
      driverDatabaseAudit_(context, 'CREATE_CAREER_RECORD_TABS', 'driver_registry', spreadsheet.getId(), 'Created Career Stats and Accolades for ' + drivers.length + ' stable Driver IDs after verified backup ' + backup.id + '. No historical source workbook was changed.');
      SpreadsheetApp.flush();
      return buildDriverCareerTemplateStatus_(spreadsheet, 'Career Stats and Accolades were created for ' + drivers.length + ' drivers. The historical source remains untouched.');
    } catch (error) {
      if (career && spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.careerTab)) spreadsheet.deleteSheet(career);
      if (accolades && spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.accoladesTab)) spreadsheet.deleteSheet(accolades);
      throw new Error('The permanent career tabs could not be completed. The verified backup is safe and no partial tabs were kept. ' + error.message);
    }
  });
}

function buildDriverCareerTemplateStatus_(spreadsheet, message) {
  const career = spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.careerTab);
  const accolades = spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.accoladesTab);
  const properties = PropertiesService.getScriptProperties();
  const backupId = properties.getProperty(F1XL_DRIVER_CAREER_TEMPLATES.backupProperty) || '';
  return {
    ok: true,
    created: !!(career && accolades),
    partial: !!career !== !!accolades,
    workbookUrl: spreadsheet.getUrl(),
    careerUrl: career ? spreadsheet.getUrl() + '#gid=' + career.getSheetId() : '',
    accoladesUrl: accolades ? spreadsheet.getUrl() + '#gid=' + accolades.getSheetId() : '',
    backupUrl: backupId ? 'https://docs.google.com/spreadsheets/d/' + backupId + '/edit' : '',
    message: message || (career && accolades ? 'Career Stats and Accolades are ready.' : 'Career Stats and Accolades have not been created yet.')
  };
}

function createAndVerifyDriverCareerBackup_(spreadsheet) {
  const properties = PropertiesService.getScriptProperties();
  const storedBackupId = properties.getProperty(F1XL_DRIVER_CAREER_TEMPLATES.backupProperty) || '';
  const storedSourceId = properties.getProperty(F1XL_DRIVER_CAREER_TEMPLATES.sourceProperty) || '';
  if (storedBackupId && storedSourceId === spreadsheet.getId()) {
    try {
      const storedBackup = SpreadsheetApp.openById(storedBackupId);
      verifyDriverCareerBackup_(spreadsheet, storedBackup);
      return { id: storedBackupId, url: storedBackup.getUrl() };
    } catch (error) {}
  }

  SpreadsheetApp.flush();
  const sourceFile = DriveApp.getFileById(spreadsheet.getId());
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyyMMdd-HHmmss');
  const backupName = 'BACKUP - ' + spreadsheet.getName() + ' - before Career Stats - ' + timestamp;
  const parents = sourceFile.getParents();
  const backupFile = parents.hasNext() ? sourceFile.makeCopy(backupName, parents.next()) : sourceFile.makeCopy(backupName);
  const backup = SpreadsheetApp.openById(backupFile.getId());
  verifyDriverCareerBackup_(spreadsheet, backup);
  properties.setProperties({
    [F1XL_DRIVER_CAREER_TEMPLATES.backupProperty]: backup.getId(),
    [F1XL_DRIVER_CAREER_TEMPLATES.sourceProperty]: spreadsheet.getId()
  });
  return { id: backup.getId(), url: backup.getUrl() };
}

function verifyDriverCareerBackup_(source, backup) {
  F1XL_DRIVER_CAREER_TEMPLATES.protectedTabs.forEach(function(name) {
    const sourceSheet = source.getSheetByName(name);
    const backupSheet = backup.getSheetByName(name);
    if (!sourceSheet || !backupSheet) throw new Error('The backup is missing the protected tab ' + name + '.');
    const sourceFingerprint = driverCareerSheetFingerprint_(sourceSheet);
    const backupFingerprint = driverCareerSheetFingerprint_(backupSheet);
    if (sourceFingerprint !== backupFingerprint) throw new Error('The backup check did not match the protected tab ' + name + '.');
  });
}

function driverCareerSheetFingerprint_(sheet) {
  const range = sheet.getDataRange();
  const content = JSON.stringify({
    rows: range.getNumRows(),
    columns: range.getNumColumns(),
    values: range.getDisplayValues(),
    formulas: range.getFormulas()
  });
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, content, Utilities.Charset.UTF_8).map(function(byte) {
    return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
  }).join('');
}

function driverCareerTemplateDrivers_(directory) {
  if (directory.getLastRow() < 2) return [];
  return directory.getRange(2, 1, directory.getLastRow() - 1, 11).getDisplayValues().map(function(row) {
    return { id: driverText_(row[0]), name: driverText_(row[1]), status: driverText_(row[3]), mergedInto: driverText_(row[10]) };
  }).filter(function(driver) {
    return driver.id && driver.name && !driver.mergedInto && !/^merged$/i.test(driver.status);
  }).sort(function(a, b) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

function buildCareerStatsTab_(sheet, drivers) {
  driverCareerEnsureRows_(sheet, drivers.length + 3);
  driverCareerEnsureColumns_(sheet, 15);
  sheet.setHiddenGridlines(false);
  sheet.getRange('A1:B1').merge().setValue('DRIVER').setNote('Stable Driver ID plus the current gamertag from the Drivers tab.');
  sheet.getRange('C1:H1').merge().setValue('CAREER TOTALS').setNote('These totals calculate automatically from every season block added from column J onwards.');
  sheet.getRange('J1:O1').merge().setValue('SEASON BLOCKS — ADD OLDEST TO NEWEST →').setNote('Each season uses five statistics columns plus one blank spacer. New seasons are added at the right-hand end.');
  sheet.getRange('A2:H2').setValues([['Driver ID','Current Gamertag','Seasons','Wins','Podiums','Poles','Sprint Wins','Races Started']]);
  sheet.getRange('J2:O2').setValues([['Season','', '', '', '', '']]);
  sheet.getRange('J3:O3').setValues([['Wins','Podiums','Poles','Sprint Wins','Races Started','']]);

  const startRow = 4;
  const ids = drivers.map(function(driver) { return [driver.id]; });
  sheet.getRange(startRow, 1, ids.length, 1).setValues(ids);
  const formulas = drivers.map(function(_, index) {
    const row = startRow + index;
    return [
      '=IFERROR(VLOOKUP($A' + row + ',\'Drivers\'!$A:$B,2,FALSE),"")',
      '=COUNTIFS($J$3:$3,"Races Started",$J' + row + ':$' + row + ',">0")',
      '=SUMIF($J$3:$3,"Wins",$J' + row + ':$' + row + ')',
      '=SUMIF($J$3:$3,"Podiums",$J' + row + ':$' + row + ')',
      '=SUMIF($J$3:$3,"Poles",$J' + row + ':$' + row + ')',
      '=SUMIF($J$3:$3,"Sprint Wins",$J' + row + ':$' + row + ')',
      '=SUMIF($J$3:$3,"Races Started",$J' + row + ':$' + row + ')'
    ];
  });
  sheet.getRange(startRow, 2, formulas.length, 7).setFormulas(formulas);
  styleDriverCareerSheet_(sheet, drivers.length + 3, 15);
  sheet.getRange('J3:O3').setBackground('#38761d').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(2);
  sheet.setColumnWidth(1, 145);
  sheet.setColumnWidth(2, 220);
  [3,4,5,6,7,8].forEach(function(column) { sheet.setColumnWidth(column, 95); });
  sheet.setColumnWidth(9, 24);
  [10,11,12,13,14].forEach(function(column) { sheet.setColumnWidth(column, 95); });
  sheet.setColumnWidth(15, 24);
  sheet.hideColumns(1);
  sheet.getRange(4, 3, drivers.length, 6).setNumberFormat('0');
}

function buildAccoladesTab_(sheet, drivers) {
  driverCareerEnsureRows_(sheet, drivers.length + 2);
  driverCareerEnsureColumns_(sheet, 14);
  sheet.setHiddenGridlines(false);
  sheet.getRange('A1:B1').merge().setValue('DRIVER').setNote('The current gamertag follows the stable Driver ID.');
  sheet.getRange('C1:D1').merge().setValue('TEAM PRINCIPAL').setNote('This replaces the old Team Owner heading while preserving its Champion and Runner-up records.');
  sheet.getRange('F1:G1').merge().setValue('DRIVER CHAMPIONSHIP');
  sheet.getRange('I1:J1').merge().setValue('DIVISION CONSTRUCTORS');
  sheet.getRange('L1:M1').merge().setValue('OVERALL CONSTRUCTORS');
  sheet.getRange('A2:N2').setValues([['Driver ID','Current Gamertag','Champion','Runner-up','','Champion','Runner-up','','Champion','Runner-up','','Champion','Runner-up','Historical notes']]);
  const startRow = 3;
  sheet.getRange(startRow, 1, drivers.length, 1).setValues(drivers.map(function(driver) { return [driver.id]; }));
  sheet.getRange(startRow, 2, drivers.length, 1).setFormulas(drivers.map(function(_, index) {
    const row = startRow + index;
    return ['=IFERROR(VLOOKUP($A' + row + ',\'Drivers\'!$A:$B,2,FALSE),"")'];
  }));
  styleDriverCareerSheet_(sheet, drivers.length + 2, 14);
  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(2);
  sheet.setColumnWidth(1, 145);
  sheet.setColumnWidth(2, 220);
  [3,4,6,7,9,10,12,13].forEach(function(column) { sheet.setColumnWidth(column, 190); });
  [5,8,11].forEach(function(column) { sheet.setColumnWidth(column, 24); });
  sheet.setColumnWidth(14, 280);
  sheet.hideColumns(1);
  sheet.getRange(3, 3, drivers.length, 12).setWrap(true).setVerticalAlignment('top');
}

function styleDriverCareerSheet_(sheet, rows, columns) {
  sheet.getRange(1, 1, 1, columns).setBackground('#1b5e20').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(2, 1, 1, columns).setBackground('#38761d').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(1, 1, rows, columns).setFontFamily('Arial').setFontSize(10);
  if (rows > 2) sheet.getRange(3, 1, rows - 2, columns).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREEN, false, false);
  sheet.setRowHeight(1, 30);
  sheet.setRowHeight(2, 28);
}

function validateDriverCareerTemplates_(spreadsheet) {
  const career = spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.careerTab);
  const accolades = spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.accoladesTab);
  if (!career || !accolades) throw new Error('Career Stats and Accolades were not both found.');
  const careerHeaders = career.getRange('A2:H2').getDisplayValues()[0].join('|');
  const accoladeHeaders = accolades.getRange('A2:N2').getDisplayValues()[0].join('|');
  if (careerHeaders !== 'Driver ID|Current Gamertag|Seasons|Wins|Podiums|Poles|Sprint Wins|Races Started') throw new Error('Career Stats headings do not match the permanent template.');
  if (accoladeHeaders !== 'Driver ID|Current Gamertag|Champion|Runner-up||Champion|Runner-up||Champion|Runner-up||Champion|Runner-up|Historical notes') throw new Error('Accolades headings do not match the permanent template.');
  if (career.getLastRow() < 4 || accolades.getLastRow() < 3) throw new Error('The permanent career tabs contain no Driver IDs.');
  const firstCareerFormulaResults = career.getRange('B4:H4').getDisplayValues()[0];
  const firstAccoladeName = accolades.getRange('B3').getDisplayValue();
  const formulaErrors = firstCareerFormulaResults.concat([firstAccoladeName]).filter(function(value) { return /^#/.test(driverText_(value)); });
  if (formulaErrors.length) throw new Error('A new career formula returned ' + formulaErrors[0] + ' during verification.');
}

function driverCareerEnsureRows_(sheet, required) {
  if (sheet.getMaxRows() < required) sheet.insertRowsAfter(sheet.getMaxRows(), required - sheet.getMaxRows());
}

function driverCareerEnsureColumns_(sheet, required) {
  if (sheet.getMaxColumns() < required) sheet.insertColumnsAfter(sheet.getMaxColumns(), required - sheet.getMaxColumns());
}
