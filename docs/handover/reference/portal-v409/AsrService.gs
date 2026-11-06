/**
 * All Star Race workbook.
 *
 * ASR is a standalone season-closing event. It uses drivers selected from the
 * divisions but its results do not feed back into the championship season.
 */
const F1XL_ASR_SOURCE = Object.freeze({
  spreadsheetId: '1toVfb23jaEj6muh0Z6Pzywo8ZPmhnH54Bsddw2puxr4',
  cacheSeconds: 120,
  initialCacheKey: 'F1XL_ASR_INITIAL_V1',
  resultsCacheKey: 'F1XL_ASR_RESULTS_V1',
  viewCachePrefix: 'F1XL_ASR_VIEW_V1_'
});

const F1XL_ASR_VIEWS = Object.freeze({
  'Data': 'A1:U242',
  'Line Ups': 'A1:S29',
  'Starting Grid': 'A1:R43',
  'Position Tracker': 'A1:A1',
  'Sheet8': 'A1:BN23',
  'Table': 'A1:I29',
  'Constructors': 'A1:G14',
  'Qualifiers': 'A1:N25',
  'Sheet12': 'A1:E21',
  'Results': 'A1:H69',
  'Stream Links': 'A1:A21'
});

function getAsrInitial(forceRefresh) { fapAssertEntry_('getAsrInitial');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_ASR_SOURCE.initialCacheKey);
  const cached = cache.get(F1XL_ASR_SOURCE.initialCacheKey);
  if (cached) return JSON.parse(cached);
  const context = openAsrContext_();
  const response = { overview:buildAsrOverview_(context), setup:buildAsrSetup_(context) };
  putAsrCache_(F1XL_ASR_SOURCE.initialCacheKey, response);
  return response;
}

function saveAsrSetup(input) { fapAssertEntry_('saveAsrSetup');
  return withAsrLock_(function() {
    const context = openAsrContext_();
    const current = buildAsrSetup_(context);
    if (asrText_(input && input.revision) !== current.revision) {
      throw new Error('The ASR setup changed after you opened it. Refresh before saving.');
    }

    const event = input && input.event ? input.event : {};
    setAsrValuesPreservingUnchanged_(context.results.getRange('E1'), [[asrText_(event.track)]]);
    setAsrValuesPreservingUnchanged_(context.results.getRange('D4'), [[asrText_(event.qualifyingLabel)]]);
    setAsrValuesPreservingUnchanged_(context.results.getRange('D31'), [[asrText_(event.raceLabel)]]);
    setAsrValuesPreservingUnchanged_(context.lineups.getRange('H16'), [[asrText_(event.seasonLabel)]]);

    const roster = normaliseAsrRows_(input && input.roster, 20, 4);
    setAsrValuesPreservingUnchanged_(context.data.getRange('N3:O22'), roster.map(function(row) { return row.slice(0, 2); }));
    setAsrValuesPreservingUnchanged_(context.data.getRange('Q3:Q22'), roster.map(function(row) { return [row[2]]; }));
    setAsrValuesPreservingUnchanged_(context.data.getRange('S3:S22'), roster.map(function(row) { return [row[3]]; }));

    const suppliedDivisions = Array.isArray(input && input.divisions) ? input.divisions : [];
    current.divisions.forEach(function(division) {
      const supplied = suppliedDivisions.find(function(item) { return item && Number(item.number) === division.number; });
      if (!supplied) throw new Error(division.title + ' is missing from the submitted ASR setup.');
      const qualifyingRows = normaliseAsrSelectionRows_(supplied.qualifiers, 4);
      const reserveRows = normaliseAsrSelectionRows_(supplied.reserves, 4);
      setAsrValuesPreservingUnchanged_(context.qualifiers.getRange(division.qualifierStartRow, division.startColumn, 4, 4), qualifyingRows);
      setAsrValuesPreservingUnchanged_(context.qualifiers.getRange(division.reserveStartRow, division.startColumn, 4, 4), reserveRows);
    });

    SpreadsheetApp.flush();
    clearAsrCaches_();
    const response = buildAsrSetup_(context);
    response.message = 'ASR event details, qualifiers and line-up saved.';
    return response;
  });
}

function getAsrResults(forceRefresh) { fapAssertEntry_('getAsrResults');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_ASR_SOURCE.resultsCacheKey);
  const cached = cache.get(F1XL_ASR_SOURCE.resultsCacheKey);
  if (cached) return JSON.parse(cached);
  const response = buildAsrResults_(openAsrContext_());
  putAsrCache_(F1XL_ASR_SOURCE.resultsCacheKey, response);
  return response;
}

function saveAsrResults(input) { fapAssertEntry_('saveAsrResults');
  return withAsrLock_(function() {
    const context = openAsrContext_();
    const current = buildAsrResults_(context);
    if (asrText_(input && input.revision) !== current.revision) {
      throw new Error('The ASR results changed after you opened them. Refresh before saving.');
    }
    const qualifying = normaliseAsrRows_(input && input.qualifying, 20, 3);
    const race = normaliseAsrRows_(input && input.race, 20, 3);
    setAsrValuesPreservingUnchanged_(context.results.getRange('D6:D25'), qualifying.map(function(row) { return [row[0]]; }));
    setAsrValuesPreservingUnchanged_(context.results.getRange('F6:G25'), qualifying.map(function(row) { return row.slice(1, 3); }));
    setAsrValuesPreservingUnchanged_(context.results.getRange('D33:D52'), race.map(function(row) { return [row[0]]; }));
    setAsrValuesPreservingUnchanged_(context.results.getRange('F33:G52'), race.map(function(row) { return row.slice(1, 3); }));
    SpreadsheetApp.flush();
    clearAsrCaches_();
    const response = buildAsrResults_(context);
    response.message = 'ASR qualifying and race results saved.';
    return response;
  });
}

function getAsrWorkbookView(sheetName, forceRefresh) { fapAssertEntry_('getAsrWorkbookView');
  const name = asrText_(sheetName);
  const configuredRange = F1XL_ASR_VIEWS[name];
  if (!configuredRange) throw new Error('Choose a recognised ASR workbook tab.');
  const cache = CacheService.getScriptCache();
  const key = F1XL_ASR_SOURCE.viewCachePrefix + name.replace(/[^A-Za-z0-9_-]/g, '_');
  if (forceRefresh === true) cache.remove(key);
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  const context = openAsrContext_();
  const sheet = context.spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error(name + ' could not be found.');
  const response = buildAsrWorkbookView_(sheet, configuredRange);
  putAsrCache_(key, response);
  return response;
}

function openAsrContext_() {
  const spreadsheet = SpreadsheetApp.openById(F1XL_ASR_SOURCE.spreadsheetId);
  const data = spreadsheet.getSheetByName('Data');
  const lineups = spreadsheet.getSheetByName('Line Ups');
  const qualifiers = spreadsheet.getSheetByName('Qualifiers');
  const results = spreadsheet.getSheetByName('Results');
  if (!data || !lineups || !qualifiers || !results) throw new Error('The ASR workbook is missing Data, Line Ups, Qualifiers or Results.');
  return { spreadsheet:spreadsheet, data:data, lineups:lineups, qualifiers:qualifiers, results:results };
}

function buildAsrOverview_(context) {
  const trackerFormula = context.spreadsheet.getSheetByName('Sheet8').getRange('A2').getFormula();
  const trackerMatch = trackerFormula.match(/([A-Za-z0-9_-]{30,})/);
  return {
    ok:true,
    sourceName:context.spreadsheet.getName(),
    refreshedAt:new Date().toISOString(),
    seasonLabel:asrText_(context.lineups.getRange('H16').getDisplayValue()),
    track:asrText_(context.results.getRange('E1').getDisplayValue()),
    externalTrackerSheetId:trackerMatch ? trackerMatch[1] : '',
    views:Object.keys(F1XL_ASR_VIEWS).map(function(name) {
      const sheet = context.spreadsheet.getSheetByName(name);
      return { name:name, available:!!sheet, hidden:sheet ? sheet.isSheetHidden() : true };
    }),
    notes:{ standalone:true, affectsSeasonStandings:false, linkedByQualifiers:true }
  };
}

function buildAsrSetup_(context) {
  const rosterDisplay = context.data.getRange('N3:S22').getDisplayValues();
  const roster = rosterDisplay.map(function(row) { return [row[0], row[1], row[3], row[5]].map(asrText_); });
  const divisions = readAsrDivisions_(context.qualifiers);
  const event = {
    seasonLabel:asrText_(context.lineups.getRange('H16').getDisplayValue()),
    track:asrText_(context.results.getRange('E1').getDisplayValue()),
    qualifyingLabel:asrText_(context.results.getRange('D4').getDisplayValue()),
    raceLabel:asrText_(context.results.getRange('D31').getDisplayValue())
  };
  const column = function(range) { return context.data.getRange(range).getDisplayValues().flat().map(asrText_).filter(Boolean); };
  const response = {
    ok:true,
    refreshedAt:new Date().toISOString(),
    event:event,
    roster:roster,
    rosterCalculated:rosterDisplay.map(function(row) { return { flagCode:asrText_(row[2]), teamCode:asrText_(row[4]) }; }),
    divisions:divisions,
    options:{
      nationalities:column('B4:B242'),
      teams:column('I3:I14'),
      tyres:column('U2:U7')
    }
  };
  response.revision = asrRevision_({ event:event, roster:roster, divisions:divisions.map(asrDivisionRevision_) });
  return response;
}

function readAsrDivisions_(sheet) {
  const display = sheet.getDataRange().getDisplayValues();
  const raw = sheet.getDataRange().getValues();
  const divisions = [];
  display.forEach(function(row, rowIndex) {
    row.forEach(function(value, columnIndex) {
      const match = asrText_(value).match(/^Division\s+(\d+)$/i);
      if (!match) return;
      const qualifierStartRow = rowIndex + 3;
      const reserveStartRow = rowIndex + 9;
      divisions.push({
        number:Number(match[1]),
        title:asrText_(value),
        headerRow:rowIndex + 1,
        startColumn:columnIndex + 1,
        qualifierStartRow:qualifierStartRow,
        reserveStartRow:reserveStartRow,
        qualifiers:readAsrSelectionRows_(display, raw, qualifierStartRow, columnIndex + 1),
        reserves:readAsrSelectionRows_(display, raw, reserveStartRow, columnIndex + 1)
      });
    });
  });
  return divisions.sort(function(a, b) { return a.number - b.number; });
}

function readAsrSelectionRows_(display, raw, startRow, startColumn) {
  return Array.from({length:4}, function(_, offset) {
    const rowIndex = startRow - 1 + offset;
    const columnIndex = startColumn - 1;
    const getRaw = function(position) { return raw[rowIndex] && raw[rowIndex][columnIndex + position]; };
    const getDisplay = function(position) { return display[rowIndex] && display[rowIndex][columnIndex + position]; };
    return [
      asrText_(getDisplay(0)),
      getRaw(1) === true,
      getRaw(2) === true,
      asrText_(getDisplay(3))
    ];
  });
}

function asrDivisionRevision_(division) {
  return { number:division.number, qualifiers:division.qualifiers, reserves:division.reserves };
}

function buildAsrResults_(context) {
  const qualifyingDisplay = context.results.getRange('A6:H25').getDisplayValues();
  const raceDisplay = context.results.getRange('A33:H52').getDisplayValues();
  const qualifying = qualifyingDisplay.map(function(row) {
    return { position:asrText_(row[0]), nationality:asrText_(row[1]), number:asrText_(row[2]), driver:asrText_(row[3]), team:asrText_(row[4]), tyre:asrText_(row[5]), time:asrText_(row[6]) };
  });
  const race = raceDisplay.map(function(row) {
    return { position:asrText_(row[0]), nationality:asrText_(row[1]), number:asrText_(row[2]), driver:asrText_(row[3]), team:asrText_(row[4]), stops:asrText_(row[5]), gap:asrText_(row[6]), points:asrText_(row[7]) };
  });
  const manual = {
    qualifying:qualifying.map(function(row) { return [row.driver, row.tyre, row.time]; }),
    race:race.map(function(row) { return [row.driver, row.stops, row.gap]; })
  };
  return {
    ok:true,
    refreshedAt:new Date().toISOString(),
    qualifying:qualifying,
    race:race,
    options:{
      drivers:context.data.getRange('N3:N22').getDisplayValues().flat().map(asrText_).filter(Boolean),
      tyres:context.data.getRange('U2:U7').getDisplayValues().flat().map(asrText_).filter(Boolean)
    },
    revision:asrRevision_(manual)
  };
}

function buildAsrWorkbookView_(sheet, configuredRange) {
  let values = sheet.getRange(configuredRange).getDisplayValues().map(function(row) { return row.map(asrText_); });
  let lastRow = values.length - 1;
  while (lastRow >= 0 && !values[lastRow].some(Boolean)) lastRow -= 1;
  values = values.slice(0, lastRow + 1);
  let lastColumn = 0;
  values.forEach(function(row) {
    for (let index = row.length - 1; index >= 0; index -= 1) {
      if (row[index]) { lastColumn = Math.max(lastColumn, index + 1); break; }
    }
  });
  values = values.map(function(row) { return row.slice(0, lastColumn); });
  return {
    ok:true,
    sheetName:sheet.getName(),
    hidden:sheet.isSheetHidden(),
    refreshedAt:new Date().toISOString(),
    columns:Array.from({length:lastColumn}, function(_, index) { return asrColumnLetter_(index + 1); }),
    rows:values
  };
}

function normaliseAsrSelectionRows_(rows, rowCount) {
  const source = Array.isArray(rows) ? rows : [];
  if (source.length !== rowCount) throw new Error('The ASR qualifier row count has changed. Refresh and try again.');
  return source.map(function(row) {
    const values = Array.isArray(row) ? row : [];
    const driver = asrText_(values[0]);
    const outcome = asrText_(values[3]);
    const hasEntry = !!(driver || outcome);
    return [driver, values[1] === true ? true : (hasEntry ? false : ''), values[2] === true ? true : (hasEntry ? false : ''), outcome];
  });
}

function normaliseAsrRows_(rows, rowCount, columnCount) {
  const source = Array.isArray(rows) ? rows : [];
  if (source.length !== rowCount) throw new Error('The ASR row count has changed. Refresh and try again.');
  return source.map(function(row) {
    const values = Array.isArray(row) ? row.slice(0, columnCount) : [];
    while (values.length < columnCount) values.push('');
    return values.map(asrText_);
  });
}

function setAsrValuesPreservingUnchanged_(range, submittedValues) {
  const currentDisplay = range.getDisplayValues();
  const currentValues = range.getValues();
  const currentFormulas = range.getFormulas();
  const output = submittedValues.map(function(row, rowIndex) {
    return row.map(function(value, columnIndex) {
      if (asrText_(value) === asrText_(currentDisplay[rowIndex][columnIndex])) {
        return currentFormulas[rowIndex][columnIndex] || currentValues[rowIndex][columnIndex];
      }
      return typeof value === 'boolean' ? value : asrText_(value);
    });
  });
  range.setValues(output);
}

function putAsrCache_(key, value) {
  try { CacheService.getScriptCache().put(key, JSON.stringify(value), F1XL_ASR_SOURCE.cacheSeconds); } catch (error) { /* Large read-only views can safely skip caching. */ }
}

function clearAsrCaches_() {
  const cache = CacheService.getScriptCache();
  cache.remove(F1XL_ASR_SOURCE.initialCacheKey);
  cache.remove(F1XL_ASR_SOURCE.resultsCacheKey);
  Object.keys(F1XL_ASR_VIEWS).forEach(function(name) { cache.remove(F1XL_ASR_SOURCE.viewCachePrefix + name.replace(/[^A-Za-z0-9_-]/g, '_')); });
}

function withAsrLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return work(); } finally { lock.releaseLock(); }
}

function asrRevision_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value));
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function asrColumnLetter_(column) {
  let value = column;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function asrText_(value) {
  return String(value == null ? '' : value).trim();
}
