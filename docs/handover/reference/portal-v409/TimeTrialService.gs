/**
 * Seasonal time-trial entry and ranking workbook.
 *
 * The existing Sheet remains the calculation engine. Manual fields are read
 * from Data and the calculated order is read from Sorted Data. Formula cells
 * are never overwritten by this service.
 */
const F1XL_TIME_TRIAL_SOURCE = Object.freeze({
  spreadsheetId: '1CSw5Ha6M0BKg7gttTf2e5oVYAG8yie8KAPVvEeG7SoU',
  dataSheetName: 'Data',
  sortedSheetName: 'Sorted Data',
  firstRow: 3,
  lastRow: 313,
  cacheSeconds: 120,
  cacheKey: 'F1XL_TIME_TRIAL_WORKSPACE_V1'
});

function getTimeTrialWorkspace(forceRefresh) { fapAssertEntry_('getTimeTrialWorkspace');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_TIME_TRIAL_SOURCE.cacheKey);
  const cached = cache.get(F1XL_TIME_TRIAL_SOURCE.cacheKey);
  if (cached) return JSON.parse(cached);
  const response = buildTimeTrialWorkspace_(openTimeTrialContext_());
  putTimeTrialCache_(response);
  return response;
}

function saveTimeTrialTracks(input) { fapAssertEntry_('saveTimeTrialTracks');
  return withTimeTrialLock_(function() {
    const context = openTimeTrialContext_();
    const current = buildTimeTrialWorkspace_(context);
    requireTimeTrialRevision_(input, current);
    const trackOne = timeTrialText_(input && input.trackOne);
    const trackTwo = timeTrialText_(input && input.trackTwo);
    if (!trackOne || !trackTwo) throw new Error('Enter both time-trial tracks before saving.');

    context.data.getRange('C1').setValue(trackOne);
    context.data.getRange('I1').setValue(trackTwo);
    context.sorted.getRange('B1').setValue(trackOne);
    context.sorted.getRange('I1').setValue(trackTwo);
    SpreadsheetApp.flush();
    clearTimeTrialCache_();
    const response = buildTimeTrialWorkspace_(context);
    response.message = 'The two time-trial track headings were saved.';
    return response;
  });
}

function saveTimeTrialEntry(input) { fapAssertEntry_('saveTimeTrialEntry');
  return withTimeTrialLock_(function() {
    const context = openTimeTrialContext_();
    const current = buildTimeTrialWorkspace_(context);
    requireTimeTrialRevision_(input, current);
    const entry = normaliseTimeTrialEntry_(input && input.entry);
    if (!entry.driver) throw new Error('Enter the driver gamertag before saving.');

    let row = Number(entry.row || 0);
    if (row) {
      if (row < F1XL_TIME_TRIAL_SOURCE.firstRow || row > F1XL_TIME_TRIAL_SOURCE.lastRow) throw new Error('That time-trial row is outside the supported entry area.');
      const existing = timeTrialText_(context.data.getRange(row, 2).getDisplayValue());
      if (existing && existing !== entry.originalDriver) throw new Error('That driver row changed after it was opened. Refresh and try again.');
    } else {
      row = findAvailableTimeTrialRow_(context.data);
    }

    const firstTrack = entry.trackOne.map(timeTrialNumberOrBlank_);
    const secondTrack = entry.trackTwo.map(timeTrialNumberOrBlank_);
    context.data.getRange(row, 2, 1, 6).setValues([[entry.driver].concat(firstTrack)]); // B:G
    context.data.getRange(row, 9, 1, 5).setValues([secondTrack]); // I:M
    context.data.getRange(row, 16).setValue(timeTrialDateValue_(entry.bookedDate)); // P
    context.data.getRange(row, 17).setValue(entry.notes); // Q
    SpreadsheetApp.flush();
    clearTimeTrialCache_();
    const response = buildTimeTrialWorkspace_(context);
    response.message = entry.driver + ' was saved to the existing Data tab.';
    return response;
  });
}

function openTimeTrialContext_() {
  const spreadsheet = SpreadsheetApp.openById(F1XL_TIME_TRIAL_SOURCE.spreadsheetId);
  const data = spreadsheet.getSheetByName(F1XL_TIME_TRIAL_SOURCE.dataSheetName);
  const sorted = spreadsheet.getSheetByName(F1XL_TIME_TRIAL_SOURCE.sortedSheetName);
  if (!data || !sorted) throw new Error('The time-trial workbook is missing Data or Sorted Data.');
  return { spreadsheet:spreadsheet, data:data, sorted:sorted };
}

function buildTimeTrialWorkspace_(context) {
  const start = F1XL_TIME_TRIAL_SOURCE.firstRow;
  const count = F1XL_TIME_TRIAL_SOURCE.lastRow - start + 1;
  const dataDisplay = context.data.getRange(start, 2, count, 16).getDisplayValues(); // B:Q
  const dataRaw = context.data.getRange(start, 2, count, 16).getValues();
  const formulas = context.data.getRange(start, 8, count, 8).getFormulas(); // H:O
  const entries = [];
  let availableFormulaRows = 0;

  dataDisplay.forEach(function(row, index) {
    const sheetRow = start + index;
    const hasCalculationFormulas = !!formulas[index][0] && !!formulas[index][6] && !!formulas[index][7];
    if (hasCalculationFormulas && !timeTrialText_(row[0])) availableFormulaRows += 1;
    if (!timeTrialText_(row[0])) return;
    entries.push({
      row:sheetRow,
      driver:timeTrialText_(row[0]),
      originalDriver:timeTrialText_(row[0]),
      trackOne:normaliseTimeTrialLapDisplay_(dataRaw[index].slice(1, 6), row.slice(1, 6)),
      trackOneAverage:timeTrialText_(row[6]),
      trackTwo:normaliseTimeTrialLapDisplay_(dataRaw[index].slice(7, 12), row.slice(7, 12)),
      trackTwoAverage:timeTrialText_(row[12]),
      overallAverage:timeTrialText_(row[13]),
      bookedDate:normaliseTimeTrialDate_(dataRaw[index][14], row[14]),
      bookedDateDisplay:timeTrialText_(row[14]),
      notes:timeTrialText_(row[15]),
      formulaBacked:hasCalculationFormulas
    });
  });

  const sortedDisplay = context.sorted.getRange('A3:P332').getDisplayValues();
  const ranking = sortedDisplay.filter(function(row) { return timeTrialText_(row[1]); }).map(function(row) {
    return {
      rank:timeTrialText_(row[0]), driver:timeTrialText_(row[1]),
      trackOne:row.slice(2, 7).map(timeTrialText_), trackOneAverage:timeTrialText_(row[7]),
      trackTwo:row.slice(8, 13).map(timeTrialText_), trackTwoAverage:timeTrialText_(row[13]),
      overallAverage:timeTrialText_(row[14]), gap:timeTrialText_(row[15])
    };
  });

  const trackOne = timeTrialTrackLabel_(context.data.getRange('C1').getDisplayValue(), context.sorted.getRange('B1').getDisplayValue(), 'Track 1');
  const trackTwo = timeTrialTrackLabel_(context.data.getRange('I1').getDisplayValue(), context.sorted.getRange('I1').getDisplayValue(), 'Track 2');
  const response = {
    ok:true,
    sourceName:context.spreadsheet.getName(),
    refreshedAt:new Date().toISOString(),
    trackOne:trackOne,
    trackTwo:trackTwo,
    entries:entries,
    ranking:ranking,
    capacity:{ formulaBackedRowsAvailable:availableFormulaRows, supportedLastRow:F1XL_TIME_TRIAL_SOURCE.lastRow },
    calculationNote:'The existing Sheet formulas currently average laps 2–5 for each track; Lap 1 is displayed but excluded.',
    revision:''
  };
  response.revision = timeTrialRevision_({ trackOne:trackOne, trackTwo:trackTwo, entries:entries.map(timeTrialEntryRevision_) });
  return response;
}

function findAvailableTimeTrialRow_(sheet) {
  const start = F1XL_TIME_TRIAL_SOURCE.firstRow;
  const count = F1XL_TIME_TRIAL_SOURCE.lastRow - start + 1;
  const drivers = sheet.getRange(start, 2, count, 1).getDisplayValues();
  const averages = sheet.getRange(start, 8, count, 8).getFormulas();
  for (let index = 0; index < count; index += 1) {
    if (!timeTrialText_(drivers[index][0]) && averages[index][0] && averages[index][6] && averages[index][7]) return start + index;
  }
  throw new Error('No unused formula-backed time-trial row is available. Extend the existing Sheet formulas before adding another driver.');
}

function normaliseTimeTrialEntry_(entry) {
  const source = entry || {};
  const laps = function(value) {
    const rows = Array.isArray(value) ? value.slice(0, 5) : [];
    while (rows.length < 5) rows.push('');
    return rows;
  };
  return {
    row:Number(source.row || 0),
    originalDriver:timeTrialText_(source.originalDriver),
    driver:timeTrialText_(source.driver),
    trackOne:laps(source.trackOne),
    trackTwo:laps(source.trackTwo),
    bookedDate:timeTrialText_(source.bookedDate),
    notes:timeTrialText_(source.notes)
  };
}

function normaliseTimeTrialLapDisplay_(raw, display) {
  return raw.map(function(value, index) {
    if (value === '' || value == null) return '';
    return typeof value === 'number' ? String(value) : timeTrialText_(display[index]);
  });
}

function timeTrialNumberOrBlank_(value) {
  const text = timeTrialText_(value);
  if (!text) return '';
  const number = Number(text);
  if (!isFinite(number) || number <= 0) throw new Error('Lap times must be entered as seconds, for example 59.842.');
  return number;
}

function timeTrialDateValue_(value) {
  const text = timeTrialText_(value);
  if (!text) return '';
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}

function normaliseTimeTrialDate_(raw, display) {
  if (Object.prototype.toString.call(raw) === '[object Date]' && !isNaN(raw.getTime())) {
    return Utilities.formatDate(raw, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const text = timeTrialText_(raw);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function timeTrialTrackLabel_(dataValue, sortedValue, fallback) {
  const data = timeTrialText_(dataValue);
  const sorted = timeTrialText_(sortedValue);
  return data && !/^insert track$/i.test(data) ? data : (sorted || fallback);
}

function timeTrialEntryRevision_(entry) {
  return [entry.row, entry.driver, entry.trackOne, entry.trackOneAverage, entry.trackTwo, entry.trackTwoAverage, entry.overallAverage, entry.bookedDate, entry.notes];
}

function requireTimeTrialRevision_(input, current) {
  if (timeTrialText_(input && input.revision) !== current.revision) throw new Error('The time-trial workbook changed after you opened it. Refresh before saving.');
}

function timeTrialRevision_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value), Utilities.Charset.UTF_8);
  return bytes.map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function timeTrialText_(value) { return value == null ? '' : String(value).trim(); }

function clearTimeTrialCache_() { CacheService.getScriptCache().remove(F1XL_TIME_TRIAL_SOURCE.cacheKey); }

function putTimeTrialCache_(response) {
  const serialised = JSON.stringify(response);
  // Apps Script cache entries have a size limit. A full season can still be
  // returned normally; it simply skips caching if the safe margin is exceeded.
  if (serialised.length < 90000) CacheService.getScriptCache().put(F1XL_TIME_TRIAL_SOURCE.cacheKey, serialised, F1XL_TIME_TRIAL_SOURCE.cacheSeconds);
}

function withTimeTrialLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return callback(); } finally { lock.releaseLock(); }
}
