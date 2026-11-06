/**
 * Removes only the abandoned five-tab historical staging prototype from a
 * clearly labelled TEST Season Master. The normal season structure remains.
 */
const F1XL_OBSOLETE_HISTORICAL_TABS = Object.freeze([
  'Historical Setup',
  'Historical Summary',
  'Historical Results',
  'Historical Accolades',
  'Historical Sources'
]);

function removeObsoleteHistoricalWorkspace(input) { fapAssertEntry_('removeObsoleteHistoricalWorkspace');
  assertSeasonWritable_(input && input.season);
  const season = String(input && input.season || '').trim();
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Choose a connected TEST season first.');
  if (String(input && input.confirmation || '') !== 'REMOVE OBSOLETE HISTORICAL TABS') throw new Error('The required cleanup confirmation was not supplied.');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const masterId = PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season));
    if (!masterId) throw new Error('Season ' + season + ' has no connected Season Master.');
    const workbook = SpreadsheetApp.openById(masterId);
    if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(workbook.getName()))) throw new Error('For safety, obsolete-tab cleanup is allowed only in a clearly labelled TEST Season Master.');
    assertSeasonWorkbookWritable_(season, workbook);
    const tabs = F1XL_OBSOLETE_HISTORICAL_TABS.map(function(name) { return workbook.getSheetByName(name); }).filter(Boolean);
    if (!tabs.length) {
      const response = getSeasonMasters(true);
      response.message = 'Season ' + season + ' contains no obsolete historical staging tabs. Nothing was changed.';
      return response;
    }
    const backup = obsoleteHistoricalCreateBackup_(workbook, season);
    tabs.forEach(function(sheet) { workbook.deleteSheet(sheet); });
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove(F1XL_SEASON_MASTER.cacheKey);
    const response = getSeasonMasters(true);
    response.backupUrl = backup.url;
    response.message = tabs.length + ' obsolete historical staging tab' + (tabs.length === 1 ? '' : 's') + ' removed from Season ' + season + '. The normal Season Master remains and a verified backup is available.';
    return response;
  } finally {
    lock.releaseLock();
  }
}

function obsoleteHistoricalCreateBackup_(workbook, season) {
  SpreadsheetApp.flush();
  const sourceFile = DriveApp.getFileById(workbook.getId());
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyyMMdd-HHmmss');
  const parents = sourceFile.getParents();
  const name = 'BACKUP - ' + workbook.getName() + ' - before obsolete historical cleanup - ' + stamp;
  const copy = parents.hasNext() ? sourceFile.makeCopy(name, parents.next()) : sourceFile.makeCopy(name);
  const backup = SpreadsheetApp.openById(copy.getId());
  ['Start Here','Calendar','Season Entrants','Teams & Principals','Division Line-ups'].forEach(function(tabName) {
    const sourceSheet = workbook.getSheetByName(tabName), backupSheet = backup.getSheetByName(tabName);
    if (!sourceSheet || !backupSheet || obsoleteHistoricalFingerprint_(sourceSheet) !== obsoleteHistoricalFingerprint_(backupSheet)) throw new Error('The cleanup backup did not verify against ' + tabName + '. No tab was removed.');
  });
  PropertiesService.getScriptProperties().setProperty('F1XL_OBSOLETE_HISTORICAL_BACKUP_' + season.replace(/\./g, '_'), backup.getId());
  return { id:copy.getId(), url:backup.getUrl() };
}

function obsoleteHistoricalFingerprint_(sheet) {
  const range = sheet.getDataRange();
  const content = JSON.stringify({ values:range.getDisplayValues(), formulas:range.getFormulas() });
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, content, Utilities.Charset.UTF_8).map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}
