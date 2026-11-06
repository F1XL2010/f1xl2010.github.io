/**
 * Read-only bridge between completed Division workbooks and the permanent
 * Driver Registry. This module deliberately contains no Sheet-write method.
 */
const F1XL_SEASON_STATISTICS_PREVIEW = Object.freeze({
  cachePrefix: 'F1XL_SEASON_STATISTICS_PREVIEW_V2_',
  cacheSeconds: 120
});

function getDriverSeasonStatisticsPreview(seasonInput, forceRefresh) { fapAssertEntry_('getDriverSeasonStatisticsPreview');
  const season = seasonStatisticsPreviewSeason_(seasonInput);
  const cache = CacheService.getScriptCache();
  const cacheKey = F1XL_SEASON_STATISTICS_PREVIEW.cachePrefix + season.replace(/\./g, '_');
  if (forceRefresh === true) cache.remove(cacheKey);
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const properties = PropertiesService.getScriptProperties();
  const masterId = properties.getProperty(seasonMasterPropertyKey_(season));
  if (!masterId) throw new Error('Season ' + season + ' does not have a connected Season Master.');

  const master = SpreadsheetApp.openById(masterId);
  const start = master.getSheetByName('Start Here');
  if (!start) throw new Error('Season ' + season + ' is missing its Start Here tab.');
  const divisions = Number(start.getRange('B5').getValue());
  if (!Number.isInteger(divisions) || divisions < 1) throw new Error('Season ' + season + ' does not yet have a confirmed number of divisions.');

  const registry = openDriverDatabaseContext_();
  const identity = seasonStatisticsPreviewIdentityMap_(registry);
  const seasonIdentity = seasonStatisticsPreviewSeasonIdentityMap_(master, identity);
  const combined = {};
  const sources = [];

  for (let division = 1; division <= divisions; division += 1) {
    const workbookId = properties.getProperty(divisionTemplatePropertyKey_(season, division));
    if (!workbookId) throw new Error('Season ' + season + ' Division ' + division + ' does not have a connected Division workbook.');
    const workbook = SpreadsheetApp.openById(workbookId);
    const sheet = workbook.getSheetByName('Driver Stats');
    if (!sheet) throw new Error('Season ' + season + ' Division ' + division + ' is missing Driver Stats.');
    const rowCount = Math.min(F1XL_CAPACITY.seasonDriversPerDivision, Math.max(0, sheet.getLastRow() - 1));
    // Column W contains the stable Driver ID. Read and prefer it so an
    // already-linked historic driver is not sent back through name matching.
    const values = rowCount ? sheet.getRange(2, 1, rowCount, 23).getDisplayValues() : [];
    sources.push({ division: division, workbookName: workbook.getName(), workbookUrl: workbook.getUrl(), rowsRead: values.length });

    values.forEach(function(row) {
      const gamertag = seasonStatisticsPreviewText_(row[0]);
      if (!gamertag) return;
      const key = seasonStatisticsPreviewNameKey_(gamertag);
      const stableDriverId = seasonStatisticsPreviewText_(row[22]);
      const match = (stableDriverId && (seasonIdentity.byId[stableDriverId] || identity.byId[stableDriverId])) ||
        seasonIdentity.byName[key] || identity.byName[key] || null;
      const collision = identity.collisions[key] || null;
      const outputKey = match ? 'DRIVER|' + match.driverId : 'NAME|' + key;
      if (!combined[outputKey]) {
        combined[outputKey] = {
          matched: !!match,
          driverId: match ? match.driverId : '',
          currentGamertag: match ? match.currentGamertag : '',
          matchType: match ? match.matchType : (collision ? 'Ambiguous name' : 'No profile or confirmed alias'),
          sourceNames: [],
          divisions: [],
          wins: 0,
          podiums: 0,
          poles: 0,
          sprintWins: 0,
          racesStarted: 0
        };
      }
      const target = combined[outputKey];
      if (target.sourceNames.indexOf(gamertag) < 0) target.sourceNames.push(gamertag);
      if (target.divisions.indexOf(division) < 0) target.divisions.push(division);
      target.wins += seasonStatisticsPreviewNumber_(row[1]);
      target.podiums += seasonStatisticsPreviewNumber_(row[2]);
      target.poles += seasonStatisticsPreviewNumber_(row[3]);
      target.sprintWins += seasonStatisticsPreviewNumber_(row[10]);
      target.racesStarted += seasonStatisticsPreviewNumber_(row[16]);
    });
  }

  const rows = Object.keys(combined).map(function(key) { return combined[key]; }).sort(function(left, right) {
    if (left.matched !== right.matched) return left.matched ? -1 : 1;
    return (left.currentGamertag || left.sourceNames[0]).localeCompare(right.currentGamertag || right.sourceNames[0], undefined, { sensitivity: 'base' });
  });
  const matched = rows.filter(function(row) { return row.matched; }).length;
  const unmatched = rows.length - matched;
  const response = {
    ok: true,
    readOnly: true,
    seasonReadOnly:seasonProtectionStatus_(season).readOnly,
    readOnlyReason:seasonProtectionStatus_(season).readOnlyReason,
    season: season,
    masterName: master.getName(),
    masterUrl: master.getUrl(),
    divisions: divisions,
    sources: sources,
    rows: rows,
    matched: matched,
    unmatched: unmatched,
    message: 'Read-only preview complete. No Google Sheet was changed.'
  };
  cache.put(cacheKey, JSON.stringify(response), F1XL_SEASON_STATISTICS_PREVIEW.cacheSeconds);
  return response;
}

function seasonStatisticsPreviewIdentityMap_(context) {
  const candidates = {};
  const currentById = {};
  const redirects = {};
  const addCandidate = function(name, driverId, currentGamertag, matchType) {
    const key = seasonStatisticsPreviewNameKey_(name);
    if (!key || !driverId) return;
    if (!candidates[key]) candidates[key] = [];
    if (!candidates[key].some(function(item) { return item.driverId === driverId; })) candidates[key].push({ driverId:driverId, currentGamertag:currentGamertag, matchType:matchType });
  };

  const directoryRows = context.directory.getLastRow() > 1 ? context.directory.getRange(2, 1, context.directory.getLastRow() - 1, Math.min(11, context.directory.getMaxColumns())).getDisplayValues() : [];
  directoryRows.forEach(function(row) {
    const driverId = seasonStatisticsPreviewText_(row[0]);
    const currentGamertag = seasonStatisticsPreviewText_(row[1]);
    if (!driverId || !currentGamertag) return;
    const destination = seasonStatisticsPreviewText_(row[10]);
    redirects[driverId] = /^merged$/i.test(seasonStatisticsPreviewText_(row[3])) && destination ? destination : driverId;
    currentById[driverId] = currentGamertag;
  });
  directoryRows.forEach(function(row) {
    const originalId = seasonStatisticsPreviewText_(row[0]);
    const resolvedId = redirects[originalId] || originalId;
    const resolvedName = currentById[resolvedId] || seasonStatisticsPreviewText_(row[1]);
    addCandidate(row[1], resolvedId, resolvedName, originalId === resolvedId ? 'Current gamertag' : 'Merged profile name');
  });

  const aliasRows = context.aliases.getLastRow() > 1 ? context.aliases.getRange(2, 1, context.aliases.getLastRow() - 1, 12).getDisplayValues() : [];
  aliasRows.forEach(function(row) {
    if (/^inactive$/i.test(seasonStatisticsPreviewText_(row[11]))) return;
    if (seasonStatisticsPreviewText_(row[7]) && !/^confirmed$/i.test(seasonStatisticsPreviewText_(row[7]))) return;
    const originalId = seasonStatisticsPreviewText_(row[1]);
    const resolvedId = redirects[originalId] || originalId;
    addCandidate(row[3], resolvedId, currentById[resolvedId] || '', 'Confirmed alias');
  });

  const byName = {}, byId = {}, collisions = {};
  Object.keys(candidates).forEach(function(key) {
    if (candidates[key].length === 1) byName[key] = candidates[key][0];
    else collisions[key] = candidates[key].map(function(item) { return item.driverId; });
  });
  directoryRows.forEach(function(row) {
    const originalId = seasonStatisticsPreviewText_(row[0]);
    const resolvedId = redirects[originalId] || originalId;
    const currentGamertag = currentById[resolvedId] || seasonStatisticsPreviewText_(row[1]);
    if (!originalId || !resolvedId || !currentGamertag) return;
    const match = { driverId:resolvedId, currentGamertag:currentGamertag, matchType:'Confirmed Season Master link' };
    byId[originalId] = match;
    byId[resolvedId] = match;
  });
  return { byName: byName, byId:byId, collisions: collisions };
}

function seasonStatisticsPreviewSeasonIdentityMap_(master, identity) {
  const entrants = master.getSheetByName('Season Entrants');
  if (!entrants || entrants.getLastRow() < 2) return { byName:{}, byId:{} };
  const rows = entrants.getRange(2, 1, entrants.getLastRow() - 1, 2).getDisplayValues();
  const candidates = {}, byId = {};
  rows.forEach(function(row) {
    const driverId = seasonStatisticsPreviewText_(row[0]);
    const seasonName = seasonStatisticsPreviewText_(row[1]);
    const directoryMatch = identity.byId[driverId] || null;
    const match = driverId ? {
      driverId:directoryMatch ? directoryMatch.driverId : driverId,
      currentGamertag:directoryMatch ? directoryMatch.currentGamertag : '',
      matchType:'Confirmed Season Master link'
    } : null;
    const key = seasonStatisticsPreviewNameKey_(seasonName);
    if (!key || !match) return;
    byId[driverId] = match;
    if (!candidates[key]) candidates[key] = [];
    if (!candidates[key].some(function(item) { return item.driverId === match.driverId; })) candidates[key].push(match);
  });
  const byName = {};
  Object.keys(candidates).forEach(function(key) {
    if (candidates[key].length === 1) byName[key] = candidates[key][0];
  });
  return { byName:byName, byId:byId };
}

function seasonStatisticsPreviewSeason_(value) {
  const season = seasonStatisticsPreviewText_(value);
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Enter the season number you want to preview.');
  return season;
}

function seasonStatisticsPreviewNameKey_(value) {
  return seasonStatisticsPreviewText_(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function seasonStatisticsPreviewNumber_(value) {
  const number = Number(String(value == null ? '' : value).replace(/,/g, ''));
  return isFinite(number) ? number : 0;
}

function seasonStatisticsPreviewText_(value) {
  return String(value == null ? '' : value).trim();
}
