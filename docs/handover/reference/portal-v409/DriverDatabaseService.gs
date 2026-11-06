/**
 * Permanent F1XL driver identity register.
 *
 * This service works only with the existing TEST permanent identity registry.
 * Drivers, DriverAliases, merge and audit tabs remain authoritative.
 */
const F1XL_DRIVER_DATABASE = Object.freeze({
  propertyKey: 'TEST_DRIVER_REGISTRY_SHEET_ID',
  workbookName: 'TEST - F1XL Permanent Driver Registry',
  tabs: { directory: 'Drivers', aliases: 'DriverAliases', merges: 'DriverProfileMerges', audit: 'AuditLog', settings: 'Settings' },
  cacheKey: 'F1XL_DRIVER_DATABASE_V1', cacheSeconds: 120
});

function getDriverDatabase(forceRefresh) { fapAssertEntry_('getDriverDatabase');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_DRIVER_DATABASE.cacheKey);
  const cached = cache.get(F1XL_DRIVER_DATABASE.cacheKey);
  if (cached) return JSON.parse(cached);
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(F1XL_DRIVER_DATABASE.propertyKey);
  if (!spreadsheetId) return { ok: true, configured: false, message: 'No Driver Database has been connected yet.' };
  const response = buildDriverDatabaseResponse_(SpreadsheetApp.openById(spreadsheetId));
  const serialised = JSON.stringify(response);
  if (serialised.length < 80000) cache.put(F1XL_DRIVER_DATABASE.cacheKey, serialised, F1XL_DRIVER_DATABASE.cacheSeconds);
  return response;
}

function createDriverDatabaseWorkbook() { fapAssertEntry_('createDriverDatabaseWorkbook');
  return withDriverDatabaseLock_(function() {
    const existingId = PropertiesService.getScriptProperties().getProperty(F1XL_DRIVER_DATABASE.propertyKey);
    if (existingId) return buildDriverDatabaseResponse_(SpreadsheetApp.openById(existingId));
    const recognised = [];
    const namedFiles = fapWorkbookFilesByName_(DriveApp,F1XL_DRIVER_DATABASE.workbookName);
    while (namedFiles.hasNext()) {
      const file = namedFiles.next();
      try {
        const candidate = SpreadsheetApp.openById(file.getId());
        validateDriverDatabaseWorkbook_(candidate);
        recognised.push(candidate);
      } catch (error) {}
    }
    if (recognised.length === 1) {
      PropertiesService.getScriptProperties().setProperty(F1XL_DRIVER_DATABASE.propertyKey, recognised[0].getId());
      clearDriverDatabaseCache_();
      const response = buildDriverDatabaseResponse_(recognised[0]);
      response.message = 'The existing TEST Permanent Driver Registry was found and reconnected. No duplicate was created.';
      return response;
    }
    if (recognised.length > 1) throw new Error('More than one recognised TEST Permanent Driver Registry was found. Paste the correct existing Sheet ID rather than creating another.');
    const spreadsheet = SpreadsheetApp.create(fapWorkbookNewName_(F1XL_DRIVER_DATABASE.workbookName));
    initialiseDriverDatabaseWorkbook_(spreadsheet);
    PropertiesService.getScriptProperties().setProperty(F1XL_DRIVER_DATABASE.propertyKey, spreadsheet.getId());
    clearDriverDatabaseCache_();
    return buildDriverDatabaseResponse_(spreadsheet);
  });
}

function connectDriverDatabaseWorkbook(spreadsheetId) { fapAssertEntry_('connectDriverDatabaseWorkbook');
  return withDriverDatabaseLock_(function() {
    const cleanId = String(spreadsheetId || '').trim();
    if (!cleanId) throw new Error('Paste the Google Sheet ID before connecting it.');
    const spreadsheet = SpreadsheetApp.openById(cleanId);
    validateDriverDatabaseWorkbook_(spreadsheet);
    PropertiesService.getScriptProperties().setProperty(F1XL_DRIVER_DATABASE.propertyKey, spreadsheet.getId());
    clearDriverDatabaseCache_();
    return buildDriverDatabaseResponse_(spreadsheet);
  });
}

function saveDriverProfile(input) { fapAssertEntry_('saveDriverProfile');
  return withDriverDatabaseLock_(function() {
    const context = openDriverDatabaseContext_();
    const payload = normaliseDriverPayload_(input);
    const rows = context.directory.getLastRow() > 1 ? context.directory.getRange(2, 1, context.directory.getLastRow() - 1, 2).getDisplayValues() : [];
    const existing = rows.map(function(row, index) { return { row: index + 2, id: driverText_(row[0]), gamertag: driverText_(row[1]) }; });
    const current = payload.driverId ? existing.filter(function(item) { return item.id === payload.driverId; })[0] : null;
    assertGamertagAvailable_(context, payload.gamertag, current ? current.id : '');
    driverDatabaseEnsureContactColumns_(context.directory);
    const actor = driverDatabaseActor_(), now = new Date();
    let savedId;
    if (current) {
      savedId = current.id;
      if (current.gamertag && driverDatabaseNormalisedName_(current.gamertag) !== driverDatabaseNormalisedName_(payload.gamertag)) addAliasIfMissing_(context, current.id, current.gamertag);
      context.directory.getRange(current.row, 2).setValue(payload.gamertag);
      context.directory.getRange(current.row, 3).setValue(driverDatabaseNormalisedName_(payload.gamertag));
      context.directory.getRange(current.row, 7, 1, 2).setValues([[now, actor]]);
      context.directory.getRange(current.row, 12, 1, 2).setValues([[payload.discordId, payload.streamLink]]);
      driverDatabaseAudit_(context, 'UPDATE_DRIVER', 'driver', savedId, 'Updated ' + payload.gamertag + ' in the TEST registry.');
    } else {
      savedId = nextDriverId_(existing.map(function(item) { return item.id; }));
      context.directory.appendRow([savedId, payload.gamertag, driverDatabaseNormalisedName_(payload.gamertag), 'Active', now, actor, now, actor, '', '', '', payload.discordId, payload.streamLink]);
      addAliasIfMissing_(context, savedId, payload.gamertag);
      driverDatabaseAudit_(context, 'CREATE_DRIVER', 'driver', savedId, 'Created ' + payload.gamertag + ' in the TEST registry.');
    }
    clearDriverDatabaseCache_();
    return getDriverDatabase(true);
  });
}

function addDriverAlias(input) { fapAssertEntry_('addDriverAlias');
  return withDriverDatabaseLock_(function() {
    const context = openDriverDatabaseContext_();
    const driverId = driverText_(input && input.driverId);
    const alias = driverText_(input && input.alias);
    if (!driverId || !alias) throw new Error('Choose a driver and enter a previous gamertag.');
    if (!findDriverRow_(context.directory, driverId)) throw new Error('That driver profile no longer exists. Refresh and try again.');
    assertGamertagAvailable_(context, alias, driverId);
    addAliasIfMissing_(context, driverId, alias);
    clearDriverDatabaseCache_();
    return getDriverDatabase(true);
  });
}

function removeDriverAlias(input) { fapAssertEntry_('removeDriverAlias');
  return withDriverDatabaseLock_(function() {
    const context = openDriverDatabaseContext_();
    const row = Number(input && input.sourceRow || 0);
    if (row < 2 || row > context.aliases.getLastRow()) throw new Error('That gamertag history entry no longer exists. Refresh and try again.');
    const values = context.aliases.getRange(row, 1, 1, 12).getDisplayValues()[0];
    context.aliases.getRange(row, 12).setValue('Inactive');
    driverDatabaseAudit_(context, 'ARCHIVE_DRIVER_ALIAS', 'driver_alias', driverText_(values[0]), 'Archived alias ' + driverText_(values[3]) + '; no identity record was deleted.');
    clearDriverDatabaseCache_();
    return getDriverDatabase(true);
  });
}

function withDriverDatabaseLock_(work) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { return work(); } finally { lock.releaseLock(); }
}

function openDriverDatabaseContext_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(F1XL_DRIVER_DATABASE.propertyKey);
  if (!spreadsheetId) throw new Error('Create or connect the Driver Database first.');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  validateDriverDatabaseWorkbook_(spreadsheet);
  return driverDatabaseContext_(spreadsheet);
}

function driverDatabaseContext_(spreadsheet) {
  return { spreadsheet: spreadsheet, directory: spreadsheet.getSheetByName(F1XL_DRIVER_DATABASE.tabs.directory), aliases: spreadsheet.getSheetByName(F1XL_DRIVER_DATABASE.tabs.aliases), merges:spreadsheet.getSheetByName(F1XL_DRIVER_DATABASE.tabs.merges), audit:spreadsheet.getSheetByName(F1XL_DRIVER_DATABASE.tabs.audit), settings:spreadsheet.getSheetByName(F1XL_DRIVER_DATABASE.tabs.settings) };
}

function buildDriverDatabaseResponse_(spreadsheet) {
  validateDriverDatabaseWorkbook_(spreadsheet);
  const context = driverDatabaseContext_(spreadsheet);
  const aliasesByDriver = {};
  const aliasRows = context.aliases.getLastRow() > 1 ? context.aliases.getRange(2, 1, context.aliases.getLastRow() - 1, 12).getDisplayValues() : [];
  aliasRows.forEach(function(row, index) {
    const alias = driverText_(row[3]), driverId = driverText_(row[1]);
    if (!alias || !driverId || /^inactive$/i.test(driverText_(row[11]))) return;
    if (!aliasesByDriver[driverId]) aliasesByDriver[driverId] = [];
    aliasesByDriver[driverId].push({ alias: alias, sourceRow: index + 2 });
  });
  const driverWidth = Math.min(13, context.directory.getMaxColumns());
  const drivers = context.directory.getLastRow() > 1 ? context.directory.getRange(2, 1, context.directory.getLastRow() - 1, driverWidth).getDisplayValues().map(function(row, index) {
    const id = driverText_(row[0]);
    return { sourceRow: index + 2, driverId: id, gamertag: driverText_(row[1]), status:driverText_(row[3]) || 'Active', mergedIntoDriverId:driverText_(row[10]), discordId: driverText_(row[11]), streamLink: driverText_(row[12]), aliases: aliasesByDriver[id] || [] };
  }).filter(function(driver) { return driver.driverId && driver.gamertag; }) : [];
  drivers.sort(function(a, b) { return a.gamertag.localeCompare(b.gamertag, undefined, { sensitivity: 'base' }); });
  return { ok: true, configured: true, workbookName: spreadsheet.getName(), workbookUrl: spreadsheet.getUrl(), drivers: drivers, counts: { drivers: drivers.length, aliases: aliasRows.filter(function(row) { return !/^inactive$/i.test(driverText_(row[11])); }).length, mergeRows:Math.max(context.merges.getLastRow() - 1, 0) }, message: 'Permanent Driver Registry loaded.' };
}

function initialiseDriverDatabaseWorkbook_(spreadsheet) {
  const settings = spreadsheet.getSheets()[0]; settings.setName(F1XL_DRIVER_DATABASE.tabs.settings);
  const directory = spreadsheet.insertSheet(F1XL_DRIVER_DATABASE.tabs.directory);
  const aliases = spreadsheet.insertSheet(F1XL_DRIVER_DATABASE.tabs.aliases);
  const merges = spreadsheet.insertSheet(F1XL_DRIVER_DATABASE.tabs.merges);
  const audit = spreadsheet.insertSheet(F1XL_DRIVER_DATABASE.tabs.audit);
  setDatabaseTab_(settings, ['key','value','notes'], [170,180,520]);
  settings.getRange('A2:C4').setValues([['environment','TEST','Writes are blocked unless this registry remains TEST-only.'],['schema_version','0.14.0-test','Permanent driver registry schema version.'],['registry_type','PERMANENT_DRIVER_IDENTITIES','Shared across seasons; not a season results workbook.']]);
  setDatabaseTab_(directory, ['driver_id','display_name','normalised_display_name','status','created_at','created_by','updated_at','updated_by','notes','status_reason','merged_into_driver_id','discord_id','streaming_link'], [150,220,220,100,160,220,160,220,220,220,180,200,340]);
  setDatabaseTab_(aliases, ['alias_id','driver_id','original_driver_id','alias','normalised_alias','valid_from','valid_to','verification_status','source_reference','created_at','created_by','status'], [150,150,170,220,220,110,110,150,220,160,220,100]);
  setDatabaseTab_(merges, ['merge_id','surviving_driver_id','archived_driver_id','reason','evidence_reference','merged_at','merged_by','status'], [150,170,170,260,220,160,220,100]);
  setDatabaseTab_(audit, ['timestamp','actor','action','record_type','record_id','summary'], [160,220,190,150,180,520]);
  driverDatabaseAudit_(driverDatabaseContext_(spreadsheet), 'CREATE_TEST_DRIVER_REGISTRY', 'driver_registry', spreadsheet.getId(), 'Created isolated permanent driver registry; no live files updated.');
}

function setDatabaseTab_(sheet, headers, widths) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#1b5e20').setFontColor('#ffffff');
  widths.forEach(function(width, index) { sheet.setColumnWidth(index + 1, width); }); sheet.setFrozenRows(1);
}

function validateDriverDatabaseWorkbook_(spreadsheet) {
  const missing = [F1XL_DRIVER_DATABASE.tabs.directory, F1XL_DRIVER_DATABASE.tabs.aliases, F1XL_DRIVER_DATABASE.tabs.merges, F1XL_DRIVER_DATABASE.tabs.audit, F1XL_DRIVER_DATABASE.tabs.settings].filter(function(name) { return !spreadsheet.getSheetByName(name); });
  if (missing.length) throw new Error('This Sheet is not the existing F1XL Permanent Driver Registry. Missing tab(s): ' + missing.join(', ') + '.');
  const settings = spreadsheet.getSheetByName(F1XL_DRIVER_DATABASE.tabs.settings);
  const values = settings.getLastRow() > 1 ? settings.getRange(2, 1, settings.getLastRow() - 1, 2).getDisplayValues() : [];
  const environment = values.filter(function(row) { return /^environment$/i.test(driverText_(row[0])); })[0];
  if (!environment || driverText_(environment[1]).toUpperCase() !== 'TEST') throw new Error('This registry is not explicitly marked TEST. It was not connected or changed.');
}

function normaliseDriverPayload_(input) {
  const payload = input && typeof input === 'object' ? input : {}, gamertag = driverText_(payload.gamertag);
  if (!gamertag) throw new Error('A current gamertag is required.');
  return { driverId: driverText_(payload.driverId), gamertag: gamertag, discordId: driverText_(payload.discordId), streamLink: driverText_(payload.streamLink) };
}

function findDriverRow_(sheet, driverId) {
  if (sheet.getLastRow() < 2) return 0;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let index = 0; index < ids.length; index++) if (driverText_(ids[index][0]) === driverId) return index + 2;
  return 0;
}

function assertGamertagAvailable_(context, gamertag, allowedDriverId) {
  const normalised = driverDatabaseNormalisedName_(gamertag);
  const drivers = context.directory.getLastRow() > 1 ? context.directory.getRange(2, 1, context.directory.getLastRow() - 1, 4).getDisplayValues() : [];
  drivers.forEach(function(row) { if (driverText_(row[2]) === normalised && driverText_(row[0]) !== allowedDriverId && !/^merged$/i.test(driverText_(row[3]))) throw new Error('That gamertag is already the current name of Driver ' + row[0] + '.'); });
  const aliases = context.aliases.getLastRow() > 1 ? context.aliases.getRange(2, 1, context.aliases.getLastRow() - 1, 12).getDisplayValues() : [];
  aliases.forEach(function(row) { if (driverText_(row[4]) === normalised && driverText_(row[1]) !== allowedDriverId && !/^inactive$/i.test(driverText_(row[11]))) throw new Error('That gamertag is already recorded against Driver ' + row[1] + '.'); });
}

function addAliasIfMissing_(context, driverId, alias) {
  const normalised = driverDatabaseNormalisedName_(alias);
  const aliases = context.aliases.getLastRow() > 1 ? context.aliases.getRange(2, 1, context.aliases.getLastRow() - 1, 12).getDisplayValues() : [];
  const exists = aliases.some(function(row) { return driverText_(row[4]) === normalised && driverText_(row[1]) === driverId && !/^inactive$/i.test(driverText_(row[11])); });
  if (!exists) {
    const aliasId = 'ALIAS-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
    context.aliases.appendRow([aliasId, driverId, driverId, alias, normalised, '', '', 'Confirmed', 'Admin Platform', new Date(), driverDatabaseActor_(), 'Active']);
    driverDatabaseAudit_(context, 'ADD_DRIVER_ALIAS', 'driver', driverId, 'Added alias ' + alias + '.');
  }
}

function nextDriverId_(ids) {
  let id;
  do { id = 'DRIVER-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase(); } while (ids.indexOf(id) >= 0);
  return id;
}

function clearDriverDatabaseCache_() { CacheService.getScriptCache().remove(F1XL_DRIVER_DATABASE.cacheKey); }
function driverText_(value) { return String(value == null ? '' : value).trim(); }

function driverDatabaseNormalisedName_(value) { return driverText_(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function driverDatabaseActor_() { const actor=fapCurrentPerson_();return actor?((actor.gamertag||actor.email)+' <'+actor.email+'>'):Session.getActiveUser().getEmail()||'Admin Platform'; }
function driverDatabaseEnsureContactColumns_(sheet) {
  if (sheet.getMaxColumns() < 13) sheet.insertColumnsAfter(sheet.getMaxColumns(), 13 - sheet.getMaxColumns());
  if (!driverText_(sheet.getRange('L1').getDisplayValue())) sheet.getRange('L1:M1').setValues([['discord_id','streaming_link']]).setFontWeight('bold').setBackground('#1b5e20').setFontColor('#ffffff');
}
function driverDatabaseAudit_(context, action, recordType, recordId, summary) {
  context.audit.appendRow([new Date(), driverDatabaseActor_(), action, recordType, recordId, summary]);
}
