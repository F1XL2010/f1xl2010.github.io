/**
 * Permanent reusable F1XL reference information.
 *
 * This is deliberately separate from the Driver Database. It contains the
 * controlled lists and sporting reference values reused across seasons. The
 * first workbook is seeded from the current Division Data lookup area and the
 * verified historical team names; later edits are made in deliberate batches.
 */
const F1XL_REFERENCE_DATA = Object.freeze({
  propertyKey: 'F1XL_PERMANENT_REFERENCE_DATA_ID',
  workbookName: 'F1XL Permanent Reference Data',
  seedDivisionId: '1cUtBl-R9lbAeNf9Ctlo5AgKr0B7XXJ6OayCqCjw9280',
  cacheKey: 'F1XL_PERMANENT_REFERENCE_DATA_V1',
  cacheSeconds: 120,
  tabs: {
    teams: 'Teams', aliases: 'Team Aliases', tracks: 'Tracks', countries: 'Countries',
    tyres: 'Tyres', weather: 'Weather', platforms: 'Platforms', controllers: 'Controllers',
    tiers: 'Tiers', weekendTypes: 'Weekend Types', scoring: 'Scoring Systems',
    carNumbers: 'Car Numbers', readme: 'Read Me'
  }
});

const F1XL_REFERENCE_CATEGORIES = Object.freeze({
  teams: { sheet: 'Teams', headers: ['Team ID', 'Display Name', 'Full Team Name', 'Nationality', 'Hex Colour', 'Logo File', 'Available for New Seasons', 'Record Type'], descriptor: 1, available: 6 },
  aliases: { sheet: 'Team Aliases', headers: ['Alias ID', 'Name Used in Existing Data', 'Team ID'], descriptor: 1 },
  tracks: { sheet: 'Tracks', headers: ['Track ID', 'Location', 'Grand Prix Name', 'Country', 'Circuit / Display Description', 'Available for New Seasons'], descriptor: 1, available: 5 },
  countries: { sheet: 'Countries', headers: ['Country ID', 'Country Name', 'Alpha-2 Code', 'Alpha-3 Code', 'Numeric Code'], descriptor: 1, numeric: [4] },
  tyres: { sheet: 'Tyres', headers: ['Tyre ID', 'Compound', 'Available for New Seasons'], descriptor: 1, available: 2 },
  weather: { sheet: 'Weather', headers: ['Weather ID', 'Weather Type', 'Available for New Seasons'], descriptor: 1, available: 2 },
  platforms: { sheet: 'Platforms', headers: ['Platform ID', 'Platform', 'Available for New Seasons'], descriptor: 1, available: 2 },
  controllers: { sheet: 'Controllers', headers: ['Controller ID', 'Controller Type', 'Available for New Seasons'], descriptor: 1, available: 2 },
  tiers: { sheet: 'Tiers', headers: ['Tier ID', 'Tier', 'Available for New Seasons'], descriptor: 1, available: 2 },
  weekendTypes: { sheet: 'Weekend Types', headers: ['Weekend Type ID', 'Weekend Type', 'Session Order', 'Available for New Seasons'], descriptor: 1, available: 3 },
  scoring: { sheet: 'Scoring Systems', headers: ['Scoring Row ID', 'Scoring System', 'Session Type', 'Position', 'Points', 'Available for New Seasons'], descriptor: 1, available: 5, numeric: [3, 4] },
  carNumbers: { sheet: 'Car Numbers', headers: ['Car Number Row ID', 'Team', 'Tier / Seat', 'Car Number', 'Available for New Seasons'], descriptor: 1, available: 4, numeric: [3] }
});

function getPermanentReferenceData(forceRefresh) { fapAssertEntry_('getPermanentReferenceData');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_REFERENCE_DATA.cacheKey);
  const cached = cache.get(F1XL_REFERENCE_DATA.cacheKey);
  if (cached) return JSON.parse(cached);
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(F1XL_REFERENCE_DATA.propertyKey);
  if (!spreadsheetId) return { ok: true, configured: false, message: 'No Permanent Reference Data workbook has been connected yet.' };
  const response = referenceBuildResponse_(SpreadsheetApp.openById(spreadsheetId));
  const serialised = JSON.stringify(response);
  if (serialised.length < 90000) cache.put(F1XL_REFERENCE_DATA.cacheKey, serialised, F1XL_REFERENCE_DATA.cacheSeconds);
  return response;
}

function createPermanentReferenceDataWorkbook() { fapAssertEntry_('createPermanentReferenceDataWorkbook');
  return referenceWithLock_(function() {
    const properties = PropertiesService.getScriptProperties();
    const existingId = properties.getProperty(F1XL_REFERENCE_DATA.propertyKey);
    if (existingId) return referenceBuildResponse_(SpreadsheetApp.openById(existingId));
    const seedWorkbook = SpreadsheetApp.openById(F1XL_REFERENCE_DATA.seedDivisionId);
    const seedData = seedWorkbook.getSheetByName('Data');
    if (!seedData) throw new Error('The current division source is missing its Data tab. Nothing was created.');
    const spreadsheet = SpreadsheetApp.create(F1XL_REFERENCE_DATA.workbookName);
    try {
      referenceInitialiseWorkbook_(spreadsheet, seedData);
      properties.setProperty(F1XL_REFERENCE_DATA.propertyKey, spreadsheet.getId());
      referenceClearCache_();
      const response = referenceBuildResponse_(spreadsheet);
      response.message = 'Permanent Reference Data created and connected.';
      return response;
    } catch (error) {
      spreadsheet.setName('INCOMPLETE - ' + spreadsheet.getName());
      throw new Error('The workbook could not be completed. A clearly labelled INCOMPLETE file was left in Drive. ' + error.message);
    }
  });
}

function connectPermanentReferenceDataWorkbook(spreadsheetId) { fapAssertEntry_('connectPermanentReferenceDataWorkbook');
  return referenceWithLock_(function() {
    const cleanId = String(spreadsheetId || '').trim();
    if (!cleanId) throw new Error('Paste the Google Sheet ID before connecting it.');
    const spreadsheet = SpreadsheetApp.openById(cleanId);
    referenceValidateWorkbook_(spreadsheet);
    PropertiesService.getScriptProperties().setProperty(F1XL_REFERENCE_DATA.propertyKey, spreadsheet.getId());
    referenceClearCache_();
    const response = referenceBuildResponse_(spreadsheet);
    response.message = 'Existing Permanent Reference Data connected.';
    return response;
  });
}

function savePermanentReferenceCategory(input) { fapAssertEntry_('savePermanentReferenceCategory');
  return referenceWithLock_(function() {
    const key = String(input && input.category || '');
    const definition = F1XL_REFERENCE_CATEGORIES[key];
    if (!definition) throw new Error('That reference-data section is not recognised.');
    const spreadsheet = referenceOpenWorkbook_();
    const sheet = spreadsheet.getSheetByName(definition.sheet);
    const current = referenceReadCategory_(sheet, key, definition);
    if (String(input && input.revision || '') !== current.revision) throw new Error('This section changed after you opened it. Refresh before saving.');
    const rows = referenceNormaliseRows_(input && input.rows, key, definition, current.rows);
    const oldCount = Math.max(sheet.getLastRow() - 1, 0);
    if (oldCount) sheet.getRange(2, 1, oldCount, definition.headers.length).clearContent();
    if (rows.length) sheet.getRange(2, 1, rows.length, definition.headers.length).setValues(rows);
    referenceApplyAvailableValidation_(sheet, definition, Math.max(rows.length, 50));
    SpreadsheetApp.flush(); referenceClearCache_();
    const response = referenceBuildResponse_(spreadsheet);
    response.message = definition.sheet + ' saved. Existing records were preserved.';
    return response;
  });
}

function referenceInitialiseWorkbook_(spreadsheet, seedData) {
  const first = spreadsheet.getSheets()[0];
  first.setName(F1XL_REFERENCE_DATA.tabs.teams);
  Object.keys(F1XL_REFERENCE_CATEGORIES).forEach(function(key, index) {
    const definition = F1XL_REFERENCE_CATEGORIES[key];
    const sheet = index === 0 ? first : spreadsheet.insertSheet(definition.sheet);
    referenceCreateTable_(sheet, definition, referenceSeedRows_(key, seedData));
  });
  const readme = spreadsheet.insertSheet(F1XL_REFERENCE_DATA.tabs.readme);
  referenceCreateReadMe_(readme);
  spreadsheet.setActiveSheet(first);
  SpreadsheetApp.flush();
}

function referenceSeedRows_(key, data) {
  if (key === 'teams') return referenceSeedTeams_(data);
  if (key === 'aliases') return referenceSeedAliases_();
  if (key === 'tracks') return referenceSeedTracks_(data);
  if (key === 'countries') return referenceSeedCountries_(data);
  if (key === 'tyres') return referenceSeedSimple_(data.getRange('Z3:Z12').getDisplayValues(), 'TYRE');
  if (key === 'weather') return referenceSeedSimple_(data.getRange('AA2:AA15').getDisplayValues(), 'WEATHER');
  if (key === 'platforms') return referenceSeedSimple_(data.getRange('AC2:AC10').getDisplayValues(), 'PLATFORM');
  if (key === 'controllers') return referenceSeedSimple_(data.getRange('Y2:Y10').getDisplayValues(), 'CONTROLLER');
  if (key === 'tiers') return referenceSeedSimple_(data.getRange('AB2:AB10').getDisplayValues(), 'TIER');
  if (key === 'weekendTypes') return [
    ['WEEKEND-STANDARD', 'Standard', 'Qualifying → Race', 'Yes'],
    ['WEEKEND-SPRINT-MODERN', 'Modern Sprint', 'Sprint Qualifying → Sprint Race → Main Qualifying → Main Race', 'Yes'],
    ['WEEKEND-SPRINT-LEGACY', 'Legacy Sprint', 'Qualifying → Sprint Race → Feature Race; Sprint result sets the Feature Race grid', 'Yes']
  ];
  if (key === 'scoring') return referenceSeedScoring_();
  if (key === 'carNumbers') return referenceSeedCarNumbers_(data);
  return [];
}

function referenceSeedTeams_(data) {
  const sourceRows = data.getRange('V3:X22').getDisplayValues().filter(function(row) { return row[0] && row[0] !== 'NATIONALITIES'; });
  const colours = {
    'Alpine':'#479FE2', 'Aston Martin':'#4B9774', 'Audi':'#EB4526', 'Cadillac':'#AAAADD',
    'Ferrari':'#D52E37', 'Haas':'#DFE1E2', 'McLaren':'#EF8733', 'Mercedes':'#75F1D3',
    'Racing Bull':'#7091F8', 'Red Bull':'#4570C0', 'Williams':'#3267D4', 'Reserve':'#888888'
  };
  const logos = {
    'Alpine':'logo_alpine.png', 'Aston Martin':'logo_aston-martin.png', 'Audi':'logo_audi.png', 'Cadillac':'logo_cadillac.png',
    'Ferrari':'logo_ferrari.png', 'Haas':'logo_haas.png', 'McLaren':'logo_mclaren.png', 'Mercedes':'logo_mercedes.png',
    'Racing Bull':'logo_racing-bulls.png', 'Red Bull':'logo_red-bull.png', 'Williams':'logo_williams.png', 'Reserve':'logo_reserve.png'
  };
  const current = sourceRows.map(function(row) {
    const name = row[0] === 'Mclaren' ? 'McLaren' : row[0];
    return ['TEAM-' + referenceSlug_(name), name, row[1], row[2], colours[name] || '', logos[name] || '', 'Yes', name === 'Reserve' ? 'System' : 'Current'];
  });
  const existing = {};
  current.forEach(function(row) { existing[row[1].toLowerCase()] = true; });
  const historic = [
    ['AlphaTauri', '#1434CB'], ['Alfa Romeo', '#900000'], ['Kick Sauber', '#52C254'], ['Racing Point', '#FF80C7'],
    ['Renault', '#FFD700'], ['Toro Rosso', '#1434CB'], ['Sauber', '#900000'], ['Force India', '#FF80C7'],
    ['Lotus', '#FFB800'], ['Marussia', '#FF0000'], ['Caterham', ''], ['Unknown', '']
  ].filter(function(item) { return !existing[item[0].toLowerCase()]; }).map(function(item) {
    return ['TEAM-' + referenceSlug_(item[0]), item[0], '', '', item[1], '', 'No', item[0] === 'Unknown' ? 'System' : 'Legacy'];
  });
  return current.concat(historic);
}

function referenceSeedAliases_() {
  return [
    ['ALIAS-MCLAREN-LOWER', 'Mclaren', 'TEAM-MCLAREN'],
    ['ALIAS-RACING-BULLS', 'Racing Bulls', 'TEAM-RACING-BULL'],
    ['ALIAS-RB', 'RB', 'TEAM-RACING-BULL'],
    ['ALIAS-RED-BULL-RACING', 'Red Bull Racing', 'TEAM-RED-BULL']
  ];
}

function referenceSeedTracks_(data) {
  const countries = {
    'Bahrain':'Bahrain', 'Saudi Arabia':'Saudi Arabia', 'Australia':'Australia', 'Imola':'Italy', 'Miami':'United States',
    'Catalunya':'Spain', 'Monaco':'Monaco', 'Azerbaijan':'Azerbaijan', 'Canada':'Canada', 'Britain':'United Kingdom',
    'Austria':'Austria', 'Hungary':'Hungary', 'Belgium':'Belgium', 'Netherlands':'Netherlands', 'Italy':'Italy',
    'Singapore':'Singapore', 'Japan':'Japan', 'USA':'United States', 'Mexico':'Mexico', 'Brazil':'Brazil',
    'Abu Dhabi':'United Arab Emirates', 'Portugal':'Portugal', 'China':'China', 'Las Vegas':'United States',
    'Qatar':'Qatar', 'Spain':'Spain'
  };
  return data.getRange('AD2:AF80').getDisplayValues().filter(function(row) { return row[0]; }).map(function(row) {
    return ['TRACK-' + referenceSlug_(row[0]), row[0], row[1], countries[row[0]] || '', row[2], 'Yes'];
  });
}

function referenceSeedCountries_(data) {
  return data.getRange('V25:Y463').getDisplayValues().filter(function(row) { return row[0]; }).map(function(row) {
    return ['COUNTRY-' + (row[2] || referenceSlug_(row[0])), row[0], row[1], row[2], row[3]];
  });
}

function referenceSeedSimple_(rows, prefix) {
  const seen = {};
  return rows.map(function(row) { return String(row[0] || '').trim(); }).filter(function(value) {
    const key = value.toLowerCase(); if (!value || seen[key]) return false; seen[key] = true; return true;
  }).map(function(value) { return [prefix + '-' + referenceSlug_(value), value, 'Yes']; });
}

function referenceSeedScoring_() {
  const rows = [];
  [25,18,15,12,10,8,6,4,2,1].forEach(function(points, index) { rows.push(['SCORING-STANDARD-RACE-' + referencePad_(index + 1), 'Standard', 'Race', index + 1, points, 'Yes']); });
  [8,7,6,5,4,3,2,1].forEach(function(points, index) { rows.push(['SCORING-STANDARD-SPRINT-' + referencePad_(index + 1), 'Standard', 'Sprint Race', index + 1, points, 'Yes']); });
  return rows;
}

function referenceSeedCarNumbers_(data) {
  const rows = data.getRange('I2:N23').getDisplayValues();
  return rows.filter(function(row) { return row[0] && row[4] && row[5]; }).map(function(row) {
    const team = row[4] === 'Mclaren' ? 'McLaren' : row[4];
    return ['CAR-' + referenceSlug_(team) + '-' + referenceSlug_(row[5]), team, row[5], row[0], 'Yes'];
  });
}

function referenceCreateTable_(sheet, definition, rows) {
  sheet.clear();
  sheet.getRange(1, 1, 1, definition.headers.length).setValues([definition.headers]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1b5e20');
  if (rows.length) sheet.getRange(2, 1, rows.length, definition.headers.length).setValues(rows);
  sheet.setFrozenRows(1); sheet.setTabColor('#1b5e20');
  definition.headers.forEach(function(header, index) {
    let width = 135;
    if (/description|session order|full team|name used/i.test(header)) width = 320;
    else if (/display name|grand prix|country name|weather type/i.test(header)) width = 210;
    else if (/id/i.test(header)) width = 180;
    else if (/available|record type|nationality/i.test(header)) width = 150;
    sheet.setColumnWidth(index + 1, width);
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, definition.headers.length).setVerticalAlignment('middle');
  referenceApplyAvailableValidation_(sheet, definition, Math.max(rows.length, 50));
  if (sheet.getMaxRows() > 1) sheet.getRange(1, 1, sheet.getMaxRows(), definition.headers.length).createFilter();
}

function referenceCreateReadMe_(sheet) {
  const values = [
    ['F1XL Permanent Reference Data — Start Here'],
    ['Purpose'],
    ['This workbook holds reusable choices and sporting reference information shared by every season. It is separate from the Driver Database, which identifies people.'],
    ['What belongs here'],
    ['Teams, team aliases, tracks, countries, tyres, weather, platforms, controllers, tiers, weekend formats, scoring systems and the current car-number reference.'],
    ['Preserving history'],
    ['Do not delete an old team or track merely because it is no longer current. Set Available for New Seasons to No. Old seasons can still recognise the preserved record without cluttering new-season dropdowns.'],
    ['Car numbers'],
    ['Car numbers are season-seat references used by the existing calculation system. They are not permanent driver identities. Update them when the real-world car-number allocation changes.'],
    ['Manual fallback'],
    ['Every table can be maintained directly in Google Sheets if the Admin Platform is unavailable. Keep the first ID column and the header names unchanged.'],
    ['Season preservation'],
    ['A new Season Master takes a snapshot of these lists when it is created. Later reference changes therefore do not silently rewrite an old season.']
  ];
  sheet.getRange(1, 1, values.length, 1).setValues(values).setWrap(true);
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1b5e20');
  [2,4,6,8,10,12].forEach(function(row) { sheet.getRange(row, 1).setFontWeight('bold').setBackground('#d9ead3'); });
  sheet.setColumnWidth(1, 820); sheet.setFrozenRows(1); sheet.setTabColor('#666666');
}

function referenceBuildResponse_(spreadsheet) {
  referenceValidateWorkbook_(spreadsheet);
  const categories = {};
  Object.keys(F1XL_REFERENCE_CATEGORIES).forEach(function(key) {
    categories[key] = referenceReadCategory_(spreadsheet.getSheetByName(F1XL_REFERENCE_CATEGORIES[key].sheet), key, F1XL_REFERENCE_CATEGORIES[key]);
  });
  return { ok: true, configured: true, workbookName: spreadsheet.getName(), workbookUrl: spreadsheet.getUrl(), categories: categories, message: 'Permanent Reference Data loaded.' };
}

function referenceReadCategory_(sheet, key, definition) {
  const count = Math.max(sheet.getLastRow() - 1, 0);
  const rows = count ? sheet.getRange(2, 1, count, definition.headers.length).getDisplayValues().filter(function(row) { return row.some(function(value) { return value !== ''; }); }) : [];
  return { key: key, name: definition.sheet, headers: definition.headers, rows: rows, revision: referenceRevision_(rows), availableColumn: typeof definition.available === 'number' ? definition.available : -1 };
}

function referenceNormaliseRows_(inputRows, key, definition, currentRows) {
  if (!Array.isArray(inputRows)) throw new Error('No rows were supplied.');
  const existingIds = currentRows.map(function(row) { return String(row[0] || '').trim(); }).filter(Boolean);
  const allocatedIds = rowsFromInputIds_(inputRows);
  const rows = inputRows.map(function(source) {
    if (!Array.isArray(source)) throw new Error('A row in ' + definition.sheet + ' is invalid.');
    const row = [];
    for (let column = 0; column < definition.headers.length; column += 1) row.push(String(source[column] == null ? '' : source[column]).trim());
    if (!row[definition.descriptor]) return null;
    if (!row[0]) row[0] = referenceUniqueId_(key, row[definition.descriptor], allocatedIds);
    if (typeof definition.available === 'number' && row[definition.available] !== 'Yes' && row[definition.available] !== 'No') throw new Error(definition.sheet + ': Available for New Seasons must be Yes or No.');
    (definition.numeric || []).forEach(function(column) {
      if (row[column] === '') return;
      const numeric = Number(row[column]);
      if (!Number.isFinite(numeric)) throw new Error(definition.sheet + ': ' + definition.headers[column] + ' must be a number.');
      row[column] = numeric;
    });
    return row;
  }).filter(Boolean);
  const ids = rows.map(function(row) { return row[0]; });
  existingIds.forEach(function(id) { if (ids.indexOf(id) === -1) throw new Error('Existing record ' + id + ' is missing. Set it to unavailable instead of deleting it.'); });
  const duplicates = ids.filter(function(id, index) { return ids.indexOf(id) !== index; });
  if (duplicates.length) throw new Error('Duplicate ID: ' + duplicates[0] + '.');
  return rows;
}

function rowsFromInputIds_(rows) {
  return (Array.isArray(rows) ? rows : []).map(function(row) { return String(row && row[0] || '').trim(); }).filter(Boolean);
}

function referenceUniqueId_(key, descriptor, existing) {
  const prefixes = { teams:'TEAM', aliases:'ALIAS', tracks:'TRACK', countries:'COUNTRY', tyres:'TYRE', weather:'WEATHER', platforms:'PLATFORM', controllers:'CONTROLLER', tiers:'TIER', weekendTypes:'WEEKEND', scoring:'SCORING', carNumbers:'CAR' };
  const base = (prefixes[key] || 'REF') + '-' + referenceSlug_(descriptor);
  let candidate = base, counter = 2;
  while (existing.indexOf(candidate) !== -1) { candidate = base + '-' + counter; counter += 1; }
  existing.push(candidate); return candidate;
}

function referenceApplyAvailableValidation_(sheet, definition, rowCount) {
  if (typeof definition.available !== 'number') return;
  sheet.getRange(2, definition.available + 1, Math.max(rowCount, 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).setAllowInvalid(false).build());
}

function referenceValidateWorkbook_(spreadsheet) {
  const missing = Object.keys(F1XL_REFERENCE_CATEGORIES).map(function(key) { return F1XL_REFERENCE_CATEGORIES[key].sheet; }).concat([F1XL_REFERENCE_DATA.tabs.readme]).filter(function(name) { return !spreadsheet.getSheetByName(name); });
  if (missing.length) throw new Error('This Sheet is not an F1XL Permanent Reference Data workbook. Missing tab(s): ' + missing.join(', ') + '.');
}

function referenceOpenWorkbook_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(F1XL_REFERENCE_DATA.propertyKey);
  if (!spreadsheetId) throw new Error('Create or connect Permanent Reference Data first.');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId); referenceValidateWorkbook_(spreadsheet); return spreadsheet;
}

function referenceWithLock_(work) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { return work(); } finally { lock.releaseLock(); }
}

function referenceClearCache_() { CacheService.getScriptCache().remove(F1XL_REFERENCE_DATA.cacheKey); }
function referenceRevision_(value) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value))).substring(0, 24); }
function referenceSlug_(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ITEM'; }
function referencePad_(value) { return String(value).padStart(2, '0'); }
