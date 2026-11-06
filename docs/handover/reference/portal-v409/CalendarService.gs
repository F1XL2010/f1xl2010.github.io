/**
 * Seasonal Calendar Master interface.
 *
 * The workbook is generated once per season and remains the source used by
 * other F1XL Sheets. The portal mirrors the existing Calendar tab, including
 * its final track column, and saves the editable fields in one deliberate batch.
 */
const F1XL_CALENDAR_SOURCE = Object.freeze({
  spreadsheetId: '1l8GCjs5nM3pSeuz5FVOrU9tC9HqnwQ7Ki5Q9t0DsdhA',
  sheetId: 0,
  cacheKey: 'F1XL_CALENDAR_MASTER_V1',
  cacheSeconds: 120,
  firstRow: 2,
  rowCount: 22
});

function getSeasonCalendar(forceRefresh) { fapAssertEntry_('getSeasonCalendar');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_CALENDAR_SOURCE.cacheKey);
  const cached = cache.get(F1XL_CALENDAR_SOURCE.cacheKey);
  if (cached) return JSON.parse(cached);

  const response = buildCalendarResponse_(openCalendarContext_());
  cache.put(F1XL_CALENDAR_SOURCE.cacheKey, JSON.stringify(response), F1XL_CALENDAR_SOURCE.cacheSeconds);
  return response;
}

function saveSeasonCalendar(input) { fapAssertEntry_('saveSeasonCalendar');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const context = openCalendarContext_();
    const current = buildCalendarResponse_(context);
    if (String(input && input.revision || '') !== current.revision) {
      throw new Error('The Calendar Sheet changed after you opened it. Refresh the calendar and apply your changes again.');
    }

    const rows = normaliseCalendarRows_(input && input.rows);
    const values = rows.map(function(row) {
      return [row.weekendType === 'Sprint' ? 'Sprint' : '', calendarDateValue_(row.date), row.track];
    });
    context.sheet.getRange(F1XL_CALENDAR_SOURCE.firstRow, 2, values.length, 3).setValues(values);

    CacheService.getScriptCache().remove(F1XL_CALENDAR_SOURCE.cacheKey);
    const response = buildCalendarResponse_(context);
    response.message = 'Calendar saved to the seasonal master Sheet.';
    return response;
  } finally {
    lock.releaseLock();
  }
}

function openCalendarContext_() {
  const spreadsheet = SpreadsheetApp.openById(F1XL_CALENDAR_SOURCE.spreadsheetId);
  const sheet = spreadsheet.getSheetById(F1XL_CALENDAR_SOURCE.sheetId);
  if (!sheet) throw new Error('The Calendar template is missing its Calendar tab.');
  if (String(sheet.getRange('A1').getDisplayValue()).trim() !== 'Round No.' || String(sheet.getRange('C1').getDisplayValue()).trim() !== 'Date') {
    throw new Error('The Calendar tab structure no longer matches the approved template.');
  }
  return { spreadsheet: spreadsheet, sheet: sheet };
}

function buildCalendarResponse_(context) {
  const range = context.sheet.getRange(F1XL_CALENDAR_SOURCE.firstRow, 1, F1XL_CALENDAR_SOURCE.rowCount, 4);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const timeZone = context.spreadsheet.getSpreadsheetTimeZone();
  const rows = values.map(function(row, index) {
    const date = row[2] instanceof Date
      ? Utilities.formatDate(row[2], timeZone, 'yyyy-MM-dd')
      : normaliseCalendarDateText_(displayValues[index][2]);
    return {
      round: String(displayValues[index][0] || '').trim(),
      weekendType: String(displayValues[index][1] || '').trim() === 'Sprint' ? 'Sprint' : 'Standard',
      date: date,
      track: String(displayValues[index][3] || '').trim()
    };
  });
  return {
    ok: true,
    sourceName: context.spreadsheet.getName(),
    tabName: context.sheet.getName(),
    refreshedAt: new Date().toISOString(),
    rows: rows,
    revision: calendarRevision_(rows)
  };
}

function normaliseCalendarRows_(rows) {
  if (!Array.isArray(rows) || rows.length !== F1XL_CALENDAR_SOURCE.rowCount) {
    throw new Error('The calendar structure changed while it was open. Refresh it and try again.');
  }
  return rows.map(function(row, index) {
    const weekendType = String(row && row.weekendType || '').trim();
    if (weekendType !== 'Standard' && weekendType !== 'Sprint') {
      throw new Error('Choose Standard or Sprint for calendar row ' + (index + 1) + '.');
    }
    if (index === F1XL_CALENDAR_SOURCE.rowCount - 1 && weekendType !== 'Standard') {
      throw new Error('The All Star Race does not use the Standard/Sprint field in this template.');
    }
    const date = String(row && row.date || '').trim();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Choose a valid date for calendar row ' + (index + 1) + '.');
    }
    return { weekendType: weekendType, date: date, track: String(row && row.track || '').trim() };
  });
}

function calendarDateValue_(value) {
  if (!value) return '';
  const parts = value.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) {
    throw new Error('One of the calendar dates is not valid.');
  }
  return date;
}

function normaliseCalendarDateText_(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return '';
  return match[3] + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0');
}

function calendarRevision_(rows) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(rows));
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}
