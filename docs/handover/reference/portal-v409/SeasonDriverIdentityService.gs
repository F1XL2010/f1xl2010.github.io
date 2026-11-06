/**
 * Links the gamertag stored for a season to the permanent Driver ID without
 * changing the historic name displayed in Season Entrants or Division tabs.
 */
function getSeasonDriverIdentityMatches(input) { fapAssertEntry_('getSeasonDriverIdentityMatches');
  const context = seasonDriverIdentityContext_(input && input.season);
  const directory = seasonDriverIdentityDirectory_();
  const rows = context.entrants.getLastRow() > 1
    ? context.entrants.getRange(2, 1, context.entrants.getLastRow() - 1, 2).getDisplayValues()
    : [];
  const matches = [];
  rows.forEach(function(row, index) {
    const currentId = driverText_(row[0]);
    const seasonGamertag = driverText_(row[1]);
    if (!seasonGamertag) return;
    const currentDriver = currentId && directory.byId[currentId] ? directory.byId[currentId] : null;
    const candidates = directory.byName[driverDatabaseNormalisedName_(seasonGamertag)] || [];
    const uniqueIds = candidates.map(function(candidate) { return candidate.driverId; }).filter(function(id, position, all) { return all.indexOf(id) === position; });
    let status = 'unresolved', suggestedId = '', suggestedName = '', explanation = 'No exact current or previous gamertag match.';
    if (currentDriver) {
      status = 'linked'; suggestedId = currentDriver.driverId; suggestedName = currentDriver.gamertag; explanation = 'Already linked to the permanent Driver ID.';
    } else if (uniqueIds.length === 1) {
      const candidate = directory.byId[uniqueIds[0]];
      status = 'suggested'; suggestedId = candidate.driverId; suggestedName = candidate.gamertag;
      const match = candidates.filter(function(item) { return item.driverId === candidate.driverId; })[0];
      explanation = match && match.kind === 'alias' ? 'Exact match to a confirmed previous gamertag.' : 'Exact match to the current gamertag.';
    } else if (uniqueIds.length > 1) {
      status = 'conflict'; explanation = 'This name is recorded against more than one profile. Choose manually; nothing will be guessed.';
    } else if (currentId) {
      status = 'invalid'; explanation = 'The Sheet contains a Driver ID that is not in the connected permanent registry.';
    }
    matches.push({ sourceRow:index + 2, seasonGamertag:seasonGamertag, currentId:currentId, status:status, suggestedId:suggestedId, suggestedName:suggestedName, explanation:explanation });
  });
  return {
    ok:true,
    season:context.season,
    mode:context.mode,
    readOnly:seasonProtectionStatus_(context.season).readOnly,
    readOnlyReason:seasonProtectionStatus_(context.season).readOnlyReason,
    masterUrl:context.workbook.getUrl() + '#gid=' + context.entrants.getSheetId() + '&range=A1:H' + (F1XL_CAPACITY.seasonEntrants + 1),
    version:seasonDriverIdentityFingerprint_(context.entrants),
    rows:matches,
    drivers:directory.drivers,
    counts:{
      total:matches.length,
      linked:matches.filter(function(row) { return row.status === 'linked'; }).length,
      suggested:matches.filter(function(row) { return row.status === 'suggested'; }).length,
      unresolved:matches.filter(function(row) { return ['unresolved','conflict','invalid'].indexOf(row.status) >= 0; }).length
    },
    message:matches.length ? 'Season ' + context.season + ' driver identities checked. Suggestions have not been saved.' : 'Season Entrants contains no driver names yet. Paste or enter those names first.'
  };
}

function saveSeasonDriverIdentityMatches(input) { fapAssertEntry_('saveSeasonDriverIdentityMatches');
  assertSeasonWritable_(input && input.season);
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const context = seasonDriverIdentityContext_(input && input.season);
    assertSeasonWorkbookWritable_(context.season, context.workbook);
    const expectedVersion = driverText_(input && input.expectedVersion);
    if (!expectedVersion || expectedVersion !== seasonDriverIdentityFingerprint_(context.entrants)) throw new Error('Season Entrants changed after this check. Refresh the matches before saving so newer work is not overwritten.');
    const directory = seasonDriverIdentityDirectory_();
    const changes = Array.isArray(input && input.rows) ? input.rows : [];
    const rowCount = Math.max(F1XL_CAPACITY.seasonEntrants, context.entrants.getLastRow() - 1);
    const values = context.entrants.getRange(2, 1, rowCount, 2).getDisplayValues();
    let saved = 0;
    changes.forEach(function(change) {
      const sourceRow = Number(change && change.sourceRow || 0);
      const driverId = driverText_(change && change.driverId);
      const expectedName = driverText_(change && change.seasonGamertag);
      if (!driverId) return;
      if (!Number.isInteger(sourceRow) || sourceRow < 2 || sourceRow > rowCount + 1) throw new Error('A Season Entrants row is no longer valid. Refresh and try again.');
      const position = sourceRow - 2;
      if (driverText_(values[position][1]) !== expectedName) throw new Error('The gamertag on Season Entrants row ' + sourceRow + ' changed. Refresh before saving.');
      if (!directory.byId[driverId]) throw new Error('Driver ID ' + driverId + ' is not in the connected permanent Driver Registry.');
      if (driverText_(values[position][0]) !== driverId) { values[position][0] = driverId; saved += 1; }
    });
    context.entrants.getRange(2, 1, rowCount, 1).setValues(values.map(function(row) { return [row[0]]; }));
    SpreadsheetApp.flush();
    const response = getSeasonDriverIdentityMatches({ season:context.season });
    response.message = saved + ' permanent Driver ID link' + (saved === 1 ? '' : 's') + ' saved. Historical gamertags were not changed.';
    return response;
  } finally {
    lock.releaseLock();
  }
}

function seasonDriverIdentityContext_(seasonValue) {
  const season = driverText_(seasonValue);
  if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Choose a connected season first.');
  const masterId = PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season));
  if (!masterId) throw new Error('Season ' + season + ' has no connected Season Master.');
  const workbook = SpreadsheetApp.openById(masterId);
  if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(workbook.getName()))) throw new Error('For safety, identity matching is currently available only on clearly labelled TEST Season Masters.');
  const entrants = workbook.getSheetByName('Season Entrants');
  const start = workbook.getSheetByName('Start Here');
  if (!entrants || !start) throw new Error('This Season Master is missing Season Entrants or Start Here.');
  return { season:season, workbook:workbook, entrants:entrants, mode:driverText_(start.getRange('I3').getDisplayValue()) || 'Modern' };
}

function seasonDriverIdentityDirectory_() {
  const database = getDriverDatabase(false);
  const byId = {}, byName = {};
  const drivers = (database.drivers || []).map(function(driver) {
    const compact = { driverId:driver.driverId, gamertag:driver.gamertag, aliases:(driver.aliases || []).map(function(alias) { return alias.alias; }) };
    byId[compact.driverId] = compact;
    [compact.gamertag].concat(compact.aliases).forEach(function(name, index) {
      const key = driverDatabaseNormalisedName_(name);
      if (!key) return;
      if (!byName[key]) byName[key] = [];
      byName[key].push({ driverId:compact.driverId, kind:index === 0 ? 'current' : 'alias', name:name });
    });
    return compact;
  });
  return { drivers:drivers, byId:byId, byName:byName };
}

function seasonDriverIdentityFingerprint_(sheet) {
  const range = sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), 2);
  const content = JSON.stringify({ values:range.getDisplayValues(), formulas:range.getFormulas() });
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, content, Utilities.Charset.UTF_8).map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}
