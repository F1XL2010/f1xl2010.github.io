/**
 * Seasonal Applications Tracker interface.
 *
 * This deliberately mirrors the existing workbook. It does not redesign its
 * formulas or automatically import applications. Users edit a complete block
 * in the portal and press Save once, keeping routine interaction responsive.
 */
const F1XL_TRACKER_SOURCE = Object.freeze({
  spreadsheetId: '1uwM_6s-MDuIZAH-I16lfmoRARLeG-3mrlpkDhh4dM4w',
  mainSheetId: 0,
  cacheKey: 'F1XL_APPLICATION_TRACKER_V1',
  cacheSeconds: 120,
  returningFirstRow: 2,
  returningRowCount: 61,
  newDriverFirstRow: 2,
  newDriverRowCount: 84,
  gamertagFirstRow: 2,
  gamertagRowCount: 30
});

function getApplicationTracker(forceRefresh) { fapAssertEntry_('getApplicationTracker');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_TRACKER_SOURCE.cacheKey);
  const cached = cache.get(F1XL_TRACKER_SOURCE.cacheKey);
  if (cached) return JSON.parse(cached);

  const response = buildTrackerResponse_(openTrackerContext_());
  cache.put(F1XL_TRACKER_SOURCE.cacheKey, JSON.stringify(response), F1XL_TRACKER_SOURCE.cacheSeconds);
  return response;
}

function saveReturningTracker(input) { fapAssertEntry_('saveReturningTracker');
  return withTrackerLock_(function() {
    const context = openTrackerContext_();
    const division = Number(input && input.division);
    if (!Number.isInteger(division) || division < 1 || division > 4) throw new Error('Choose a valid division before saving.');
    const rows = normaliseTrackerRows_(input && input.rows, F1XL_TRACKER_SOURCE.returningRowCount, 5);
    const firstColumn = 1 + ((division - 1) * 6);
    context.mainSheet.getRange(F1XL_TRACKER_SOURCE.returningFirstRow, firstColumn, rows.length, 5).setValues(rows);
    return refreshTrackerResponse_(context, 'Division ' + division + ' tracker saved.');
  });
}

function saveNewDriverTracker(input) { fapAssertEntry_('saveNewDriverTracker');
  return withTrackerLock_(function() {
    const context = openTrackerContext_();
    const rows = normaliseTrackerRows_(input && input.rows, F1XL_TRACKER_SOURCE.newDriverRowCount, 8);
    context.newDriversSheet.getRange(F1XL_TRACKER_SOURCE.newDriverFirstRow, 1, rows.length, 8).setValues(rows);
    return refreshTrackerResponse_(context, 'New-driver tracker saved.');
  });
}

function saveGamertagChanges(input) { fapAssertEntry_('saveGamertagChanges');
  return withTrackerLock_(function() {
    const context = openTrackerContext_();
    const rows = normaliseTrackerRows_(input && input.rows, F1XL_TRACKER_SOURCE.gamertagRowCount, 2);
    context.gamertagSheet.getRange(F1XL_TRACKER_SOURCE.gamertagFirstRow, 1, rows.length, 2).setValues(rows);
    return refreshTrackerResponse_(context, 'Gamertag changes saved.');
  });
}

function openTrackerContext_() {
  const spreadsheet = SpreadsheetApp.openById(F1XL_TRACKER_SOURCE.spreadsheetId);
  const mainSheet = spreadsheet.getSheetById(F1XL_TRACKER_SOURCE.mainSheetId);
  const newDriversSheet = spreadsheet.getSheetByName('New Drivers');
  const gamertagSheet = spreadsheet.getSheetByName('Gamertag Changes');
  const statsSheet = spreadsheet.getSheetByName('App Stats');
  if (!mainSheet || !newDriversSheet || !gamertagSheet || !statsSheet) {
    throw new Error('The Applications Tracker template is missing one of its required tabs.');
  }
  return {
    spreadsheet: spreadsheet,
    mainSheet: mainSheet,
    newDriversSheet: newDriversSheet,
    gamertagSheet: gamertagSheet,
    statsSheet: statsSheet
  };
}

function buildTrackerResponse_(context) {
  const divisions = [1, 2, 3, 4].map(function(division) {
    const firstColumn = 1 + ((division - 1) * 6);
    const rows = context.mainSheet
      .getRange(F1XL_TRACKER_SOURCE.returningFirstRow, firstColumn, F1XL_TRACKER_SOURCE.returningRowCount, 5)
      .getDisplayValues();
    return { division: division, rows: rows };
  });

  const newDrivers = context.newDriversSheet
    .getRange(F1XL_TRACKER_SOURCE.newDriverFirstRow, 1, F1XL_TRACKER_SOURCE.newDriverRowCount, 8)
    .getDisplayValues();
  const gamertagChanges = context.gamertagSheet
    .getRange(F1XL_TRACKER_SOURCE.gamertagFirstRow, 1, F1XL_TRACKER_SOURCE.gamertagRowCount, 2)
    .getDisplayValues();
  const stats = context.statsSheet.getRange('A1:H17').getDisplayValues();

  return {
    ok: true,
    sourceName: context.spreadsheet.getName(),
    mainTabName: context.mainSheet.getName(),
    refreshedAt: new Date().toISOString(),
    divisions: divisions,
    newDrivers: newDrivers,
    gamertagChanges: gamertagChanges,
    stats: stats,
    options: {
      yesNoReserve: ['', 'Y', 'N', 'R'],
      yesNo: ['', 'Y', 'N'],
      consoles: ['', 'Xbox', 'PC', 'Playstation'],
      controllers: ['', 'Pad', 'Wheel']
    }
  };
}

function normaliseTrackerRows_(rows, expectedRows, expectedColumns) {
  if (!Array.isArray(rows) || rows.length !== expectedRows) throw new Error('The tracker changed while it was open. Refresh it and try again.');
  return rows.map(function(row) {
    if (!Array.isArray(row) || row.length !== expectedColumns) throw new Error('The tracker row structure is invalid. Refresh it and try again.');
    return row.map(function(value) { return String(value == null ? '' : value).trim(); });
  });
}

function withTrackerLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

function refreshTrackerResponse_(context, message) {
  CacheService.getScriptCache().remove(F1XL_TRACKER_SOURCE.cacheKey);
  const response = buildTrackerResponse_(context);
  response.message = message;
  return response;
}
