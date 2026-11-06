/**
 * Permanent, structured accolades. The source season remains the calculation
 * engine; this service previews its final standings and appends confirmed
 * one-achievement-per-row records to the TEST Driver Registry.
 */
const F1XL_ACCOLADES = Object.freeze({
  recordsTab:'Accolade Records',
  maxRecords:5000,
  categories:Object.freeze({
    teamPrincipal:'Team Principal',
    driver:'Driver Championship',
    divisionConstructors:'Division Constructors',
    overallConstructors:'Overall Constructors'
  }),
  results:Object.freeze({ champion:'Champion', runnerUp:'Runner-up' }),
  headers:['Record ID','Season','Category','Division','Result','Recipient Type','Driver ID','Gamertag at Award','Team','Source Workbook ID','Source Tab','Source Position','Finalised At','Status','Notes','Display Label','Finalised By']
});

function getSeasonAccoladesPreview(input) { fapAssertEntry_('getSeasonAccoladesPreview');
  const season = seasonStatisticsPreviewSeason_(input && input.season);
  const properties = PropertiesService.getScriptProperties();
  const masterId = properties.getProperty(seasonMasterPropertyKey_(season));
  if (!masterId) throw new Error('Season ' + season + ' does not have a connected Season Master.');
  const master = SpreadsheetApp.openById(masterId);
  if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(master.getName()))) throw new Error('Accolade testing is restricted to a TEST Season Master.');
  const start = master.getSheetByName('Start Here');
  const divisions = start ? Number(start.getRange('B5').getValue()) : 0;
  if (!Number.isInteger(divisions) || divisions < 1) throw new Error('The Season Master does not have a valid Division count.');
  const mode = String(start.getRange('I3').getDisplayValue() || 'Modern').trim() || 'Modern';
  const principalsUsed = String(start.getRange('I5').getDisplayValue() || 'Unknown').trim() || 'Unknown';
  const registry = openDriverDatabaseContext_();
  const identity = seasonStatisticsPreviewIdentityMap_(registry);
  const seasonIdentity = accoladeSeasonIdentity_(master, identity);
  const rows = [], blockers = [], warnings = [], divisionRosters = [];

  for (let division = 1; division <= divisions; division += 1) {
    const workbookId = properties.getProperty(divisionTemplatePropertyKey_(season, division));
    if (!workbookId) {
      accoladeMissing_(mode, blockers, warnings, 'Division ' + division + ' workbook is not connected.');
      continue;
    }
    const workbook = SpreadsheetApp.openById(workbookId);
    const driverSheet = workbook.getSheetByName('Driver Results NoSort');
    const constructorSheet = workbook.getSheetByName('Constructors Standings NoSort');
    if (!driverSheet || !constructorSheet) {
      accoladeMissing_(mode, blockers, warnings, 'Division ' + division + ' is missing a final standings output.');
      continue;
    }
    const driverValues = driverSheet.getRange(5, 1, Math.min(F1XL_CAPACITY.seasonDriversPerDivision, Math.max(1, driverSheet.getLastRow() - 4)), 4).getDisplayValues();
    const roster = driverValues.filter(function(row) { return accoladeText_(row[2]); }).map(function(row) {
      return { position:accoladePosition_(row[0]), name:accoladeText_(row[2]), team:accoladeText_(row[3]), division:division, workbookId:workbookId, workbookName:workbook.getName() };
    });
    divisionRosters.push.apply(divisionRosters, roster);
    [1,2].forEach(function(position) {
      const standing = roster.find(function(item) { return item.position === position; });
      if (!standing) return accoladeMissing_(mode, blockers, warnings, 'Division ' + division + ' has no driver in championship position ' + position + '.');
      const resolved = accoladeResolveDriver_(standing.name, seasonIdentity, identity);
      if (!resolved.ok) return blockers.push('Division ' + division + ' driver ' + position + ': ' + standing.name + ' — ' + resolved.reason);
      accoladeAddRecord_(rows, accoladeRecord_(season, F1XL_ACCOLADES.categories.driver, division, position, 'Driver', resolved, standing.team, workbookId, 'Driver Results NoSort'));
    });

    const constructorValues = constructorSheet.getRange(5, 1, Math.min(F1XL_CAPACITY.teams, Math.max(1, constructorSheet.getLastRow() - 4)), 3).getDisplayValues();
    [1,2].forEach(function(position) {
      const standing = constructorValues.map(function(row) { return { position:accoladePosition_(row[0]), team:accoladeText_(row[1]) }; }).find(function(item) { return item.position === position && item.team; });
      if (!standing) return accoladeMissing_(mode, blockers, warnings, 'Division ' + division + ' has no constructor in position ' + position + '.');
      accoladeAddRecord_(rows, accoladeRecord_(season, F1XL_ACCOLADES.categories.divisionConstructors, division, position, 'Team', null, standing.team, workbookId, 'Constructors Standings NoSort'));
      const recipients = roster.filter(function(item) { return accoladeNameKey_(item.team) === accoladeNameKey_(standing.team); });
      if (!recipients.length) warnings.push('No Division ' + division + ' drivers were attached to constructor ' + standing.team + '. The team award is still preserved.');
      recipients.forEach(function(recipient) {
        const resolved = accoladeResolveDriver_(recipient.name, seasonIdentity, identity);
        if (!resolved.ok) return blockers.push('Division ' + division + ' constructor ' + standing.team + ': ' + recipient.name + ' — ' + resolved.reason);
        accoladeAddRecord_(rows, accoladeRecord_(season, F1XL_ACCOLADES.categories.divisionConstructors, division, position, 'Driver', resolved, standing.team, workbookId, 'Constructors Standings NoSort'));
      });
    });
  }

  const overall = accoladeOverallStandings_(master);
  const principals = accoladePrincipalMap_(master);
  [1,2].forEach(function(position) {
    const standing = overall.find(function(item) { return item.position === position; });
    if (!standing) return accoladeMissing_(mode, blockers, warnings, 'Overall constructors has no team in position ' + position + '.');
    accoladeAddRecord_(rows, accoladeRecord_(season, F1XL_ACCOLADES.categories.overallConstructors, '', position, 'Team', null, standing.team, master.getId(), 'Overall Standings'));
    const recipients = divisionRosters.filter(function(item) { return accoladeNameKey_(item.team) === accoladeNameKey_(standing.team); });
    if (!recipients.length) warnings.push('No drivers were attached to overall constructor ' + standing.team + '. The team award is still preserved.');
    recipients.forEach(function(recipient) {
      const resolved = accoladeResolveDriver_(recipient.name, seasonIdentity, identity);
      if (!resolved.ok) return blockers.push('Overall constructor ' + standing.team + ': ' + recipient.name + ' — ' + resolved.reason);
      accoladeAddRecord_(rows, accoladeRecord_(season, F1XL_ACCOLADES.categories.overallConstructors, '', position, 'Driver', resolved, standing.team, master.getId(), 'Overall Standings'));
    });
    if (principalsUsed !== 'No') {
      const principalName = principals[accoladeNameKey_(standing.team)] || '';
      if (!principalName) {
        const message = 'No Team Principal is recorded for overall constructor ' + standing.team + '.';
        if (principalsUsed === 'Yes' && mode !== 'Historical') blockers.push(message); else warnings.push(message);
      } else {
        const resolved = accoladeResolveDriver_(principalName, seasonIdentity, identity);
        if (!resolved.ok) blockers.push('Team Principal ' + principalName + ': ' + resolved.reason);
        else accoladeAddRecord_(rows, accoladeRecord_(season, F1XL_ACCOLADES.categories.teamPrincipal, '', position, 'Driver', resolved, standing.team, master.getId(), 'Teams & Principals'));
      }
    }
  });

  const protection = seasonProtectionStatus_(season);
  if (protection.readOnly) blockers.push(protection.readOnlyReason);
  const alreadyFinalised = accoladeSeasonAlreadyFinalised_(registry.spreadsheet, season);
  if (alreadyFinalised) blockers.push('Season ' + season + ' already has confirmed Accolade Records. It cannot be finalised twice.');
  const response = {
    ok:true,
    readOnly:true,
    season:season,
    mode:mode,
    seasonReadOnly:protection.readOnly,
    readOnlyReason:protection.readOnlyReason,
    principalsUsed:principalsUsed,
    masterName:master.getName(),
    masterUrl:master.getUrl(),
    rows:rows,
    blockers:accoladeUnique_(blockers),
    warnings:accoladeUnique_(warnings),
    alreadyFinalised:alreadyFinalised,
    canFinalise:rows.length > 0 && blockers.length === 0
  };
  response.revision = accoladeRevision_({ season:season, rows:rows, blockers:response.blockers, warnings:response.warnings });
  response.message = response.canFinalise
    ? rows.length + ' structured accolade record(s) are ready for confirmation.'
    : 'Accolades preview needs attention before it can be finalised.';
  return response;
}

function finaliseSeasonAccolades(input) { fapAssertEntry_('finaliseSeasonAccolades');
  assertSeasonWritable_(input && input.season);
  const season = seasonStatisticsPreviewSeason_(input && input.season);
  const confirmation = accoladeText_(input && input.confirmation);
  if (confirmation !== 'FINALISE SEASON ' + season + ' ACCOLADES') throw new Error('The exact season-end confirmation was not supplied. Nothing was changed.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const preview = getSeasonAccoladesPreview({ season:season });
    if (accoladeText_(input && input.revision) !== preview.revision) throw new Error('The standings or preview changed. Run the Accolades preview again before finalising.');
    if (!preview.canFinalise) throw new Error(preview.blockers[0] || 'The Accolades preview is not ready to finalise.');
    assertSeasonWorkbookWritable_(season, SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season))));
    const registry = openDriverDatabaseContext_();
    if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(registry.spreadsheet.getName()))) throw new Error('Accolade testing is restricted to the TEST Driver Registry.');
    accoladeAssertSummarySafe_(registry);
    const backup = accoladeCreateVerifiedBackup_(registry.spreadsheet, season);
    const records = accoladeEnsureRecordsTab_(registry.spreadsheet);
    if (accoladeSeasonAlreadyFinalised_(registry.spreadsheet, season)) throw new Error('Season ' + season + ' was finalised while this action was running. Nothing was appended.');
    const now = new Date();
    const actor = driverDatabaseActor_();
    const output = preview.rows.map(function(row) {
      return [
        'ACC-' + Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase(),
        row.season,row.category,row.division,row.result,row.recipientType,row.driverId,row.gamertag,row.team,
        row.sourceWorkbookId,row.sourceTab,row.sourcePosition,now,'Confirmed','',row.displayLabel,actor
      ];
    });
    const firstRow = Math.max(2, records.getLastRow() + 1);
    if (firstRow + output.length - 1 > F1XL_ACCOLADES.maxRecords) throw new Error('The permanent Accolade Records table has reached its current safe capacity. Nothing was appended.');
    records.getRange(firstRow, 1, output.length, F1XL_ACCOLADES.headers.length).setValues(output);
    accoladeRefreshSummary_(registry);
    driverDatabaseAudit_(registry, 'FINALISE_SEASON_ACCOLADES', 'season', season, 'Appended ' + output.length + ' confirmed accolade records after verified registry backup ' + backup.id + '.');
    SpreadsheetApp.flush();
    return {
      ok:true,
      season:season,
      records:output.length,
      backupUrl:backup.url,
      recordsUrl:registry.spreadsheet.getUrl() + '#gid=' + records.getSheetId(),
      summaryUrl:registry.spreadsheet.getUrl() + '#gid=' + registry.spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.accoladesTab).getSheetId(),
      message:'Season ' + season + ' accolades finalised: ' + output.length + ' permanent records added.'
    };
  } finally {
    lock.releaseLock();
  }
}

function accoladeRecord_(season, category, division, position, recipientType, resolved, team, workbookId, sourceTab) {
  return {
    season:season,
    category:category,
    division:division === '' ? '' : Number(division),
    result:position === 1 ? F1XL_ACCOLADES.results.champion : F1XL_ACCOLADES.results.runnerUp,
    recipientType:recipientType,
    driverId:resolved ? resolved.driverId : '',
    gamertag:resolved ? resolved.seasonGamertag : '',
    team:team || '',
    sourceWorkbookId:workbookId,
    sourceTab:sourceTab,
    sourcePosition:position,
    displayLabel:accoladeDisplayLabel_(season, category, division)
  };
}

function accoladeAddRecord_(rows, record) {
  const key = [record.season,record.category,record.division,record.result,record.recipientType,record.driverId,accoladeNameKey_(record.team)].join('|');
  if (!rows.some(function(existing) { return existing._key === key; })) {
    record._key = key;
    rows.push(record);
  }
}

function accoladeDisplayLabel_(season, category, division) {
  if (category === F1XL_ACCOLADES.categories.driver || category === F1XL_ACCOLADES.categories.divisionConstructors) return 'D' + division + ' - S' + season;
  return 'S' + season;
}

function accoladeSeasonIdentity_(master, identity) {
  const sheet = master.getSheetByName('Season Entrants');
  const byName = {}, ambiguous = {};
  if (!sheet || sheet.getLastRow() < 2) return { byName:byName, ambiguous:ambiguous };
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues().forEach(function(row) {
    const id = accoladeText_(row[0]), name = accoladeText_(row[1]), key = accoladeNameKey_(name);
    if (!id || !key) return;
    const resolved = identity.byId[id] || { driverId:id, currentGamertag:name, matchType:'Confirmed Season Master link' };
    if (byName[key] && byName[key].driverId !== resolved.driverId) ambiguous[key] = true;
    else byName[key] = resolved;
  });
  return { byName:byName, ambiguous:ambiguous };
}

function accoladeResolveDriver_(name, seasonIdentity, identity) {
  const key = accoladeNameKey_(name);
  if (!key) return { ok:false, reason:'Blank driver name' };
  if (seasonIdentity.ambiguous[key] || identity.collisions[key]) return { ok:false, reason:'Name matches more than one permanent profile' };
  const match = seasonIdentity.byName[key] || identity.byName[key] || null;
  if (!match || !match.driverId) return { ok:false, reason:'No confirmed permanent Driver ID' };
  return { ok:true, driverId:match.driverId, currentGamertag:match.currentGamertag || name, seasonGamertag:name, matchType:match.matchType || 'Confirmed match' };
}

function accoladeOverallStandings_(master) {
  const sheet = master.getSheetByName('Overall Standings');
  if (!sheet) return [];
  return sheet.getRange(3, 4, Math.min(F1XL_CAPACITY.teams, Math.max(1, sheet.getLastRow() - 2)), 7).getDisplayValues().map(function(row) {
    return { position:accoladePosition_(row[0]), team:accoladeText_(row[2]) };
  }).filter(function(row) { return row.position && row.team; });
}

function accoladePrincipalMap_(master) {
  const sheet = master.getSheetByName('Teams & Principals');
  const output = {};
  if (!sheet || sheet.getLastRow() < 2) return output;
  sheet.getRange(2, 1, Math.min(F1XL_CAPACITY.teams, sheet.getLastRow() - 1), 5).getDisplayValues().forEach(function(row) {
    const team = accoladeNameKey_(row[0]), principal = accoladeText_(row[4]);
    if (team && principal) output[team] = principal;
  });
  return output;
}

function accoladeEnsureRecordsTab_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(F1XL_ACCOLADES.recordsTab);
  if (sheet) {
    const headings = sheet.getRange(1, 1, 1, F1XL_ACCOLADES.headers.length).getDisplayValues()[0];
    if (headings.join('|') !== F1XL_ACCOLADES.headers.join('|')) throw new Error('Accolade Records headings do not match the permanent structure. Nothing was changed.');
    return sheet;
  }
  sheet = spreadsheet.insertSheet(F1XL_ACCOLADES.recordsTab);
  if (sheet.getMaxColumns() < F1XL_ACCOLADES.headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), F1XL_ACCOLADES.headers.length - sheet.getMaxColumns());
  sheet.getRange(1, 1, 1, F1XL_ACCOLADES.headers.length).setValues([F1XL_ACCOLADES.headers]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1b5e20');
  sheet.setFrozenRows(1);
  sheet.setHiddenGridlines(false);
  sheet.getRange('A1').setNote('Permanent one-achievement-per-row record. Manually usable if the Admin Platform is unavailable. Do not reuse a Record ID.');
  [150,70,190,75,100,110,145,210,170,220,190,100,145,100,260,120,210].forEach(function(width, index) { sheet.setColumnWidth(index + 1, width); });
  sheet.getRange(2, 2, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
  sheet.getRange(2, 13, sheet.getMaxRows() - 1, 1).setNumberFormat('dd mmm yyyy HH:mm');
  sheet.getRange(1, 1, sheet.getMaxRows(), F1XL_ACCOLADES.headers.length).createFilter();
  sheet.setTabColor('#674ea7');
  return sheet;
}

function accoladeAssertSummarySafe_(context) {
  const sheet = context.spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.accoladesTab);
  if (!sheet) throw new Error('The Driver Registry is missing its Accolades summary tab.');
  if (sheet.getLastRow() < 3) return;
  const rows = sheet.getLastRow() - 2;
  const values = sheet.getRange(3, 3, rows, 11).getDisplayValues();
  const formulas = sheet.getRange(3, 3, rows, 11).getFormulas();
  for (let row = 0; row < values.length; row += 1) {
    for (let column = 0; column < values[row].length; column += 1) {
      if (accoladeText_(values[row][column]) && !accoladeText_(formulas[row][column])) {
        throw new Error('The Accolades summary contains manually entered information at ' + sheet.getRange(row + 3, column + 3).getA1Notation() + '. It was preserved. Move that information into structured records before using automatic finalisation.');
      }
    }
  }
}

function accoladeRefreshSummary_(context) {
  const sheet = context.spreadsheet.getSheetByName(F1XL_DRIVER_CAREER_TEMPLATES.accoladesTab);
  if (!sheet) throw new Error('The Driver Registry is missing its Accolades summary tab.');
  const drivers = driverCareerTemplateDrivers_(context.directory);
  driverCareerEnsureRows_(sheet, drivers.length + 2);
  const existingIds = sheet.getLastRow() >= 3 ? sheet.getRange(3, 1, sheet.getLastRow() - 2, 1).getDisplayValues().flat() : [];
  const existing = {};
  existingIds.forEach(function(id) { if (id) existing[id] = true; });
  const missing = drivers.filter(function(driver) { return !existing[driver.id]; });
  if (missing.length) {
    const row = Math.max(3, sheet.getLastRow() + 1);
    sheet.getRange(row, 1, missing.length, 1).setValues(missing.map(function(driver) { return [driver.id]; }));
    sheet.getRange(row, 2, missing.length, 1).setFormulas(missing.map(function(_, index) {
      const target = row + index;
      return ['=IFERROR(VLOOKUP($A' + target + ',\'Drivers\'!$A:$B,2,FALSE),"")'];
    }));
  }
  const lastRow = sheet.getLastRow();
  const formulas = [];
  for (let row = 3; row <= lastRow; row += 1) {
    formulas.push([
      accoladeSummaryFormula_(row, F1XL_ACCOLADES.categories.teamPrincipal, F1XL_ACCOLADES.results.champion),
      accoladeSummaryFormula_(row, F1XL_ACCOLADES.categories.teamPrincipal, F1XL_ACCOLADES.results.runnerUp),
      '=""',
      accoladeSummaryFormula_(row, F1XL_ACCOLADES.categories.driver, F1XL_ACCOLADES.results.champion),
      accoladeSummaryFormula_(row, F1XL_ACCOLADES.categories.driver, F1XL_ACCOLADES.results.runnerUp),
      '=""',
      accoladeSummaryFormula_(row, F1XL_ACCOLADES.categories.divisionConstructors, F1XL_ACCOLADES.results.champion),
      accoladeSummaryFormula_(row, F1XL_ACCOLADES.categories.divisionConstructors, F1XL_ACCOLADES.results.runnerUp),
      '=""',
      accoladeSummaryFormula_(row, F1XL_ACCOLADES.categories.overallConstructors, F1XL_ACCOLADES.results.champion),
      accoladeSummaryFormula_(row, F1XL_ACCOLADES.categories.overallConstructors, F1XL_ACCOLADES.results.runnerUp)
    ]);
  }
  if (formulas.length) sheet.getRange(3, 3, formulas.length, 11).setFormulas(formulas).setWrap(true).setVerticalAlignment('top');
}

function accoladeSummaryFormula_(row, category, result) {
  return '=IFERROR(TEXTJOIN(", ",TRUE,FILTER(\'' + F1XL_ACCOLADES.recordsTab + '\'!$P$2:$P$' + F1XL_ACCOLADES.maxRecords + ',\'' + F1XL_ACCOLADES.recordsTab + '\'!$G$2:$G$' + F1XL_ACCOLADES.maxRecords + '=$A' + row + ',\'' + F1XL_ACCOLADES.recordsTab + '\'!$C$2:$C$' + F1XL_ACCOLADES.maxRecords + '="' + category + '",\'' + F1XL_ACCOLADES.recordsTab + '\'!$E$2:$E$' + F1XL_ACCOLADES.maxRecords + '="' + result + '",\'' + F1XL_ACCOLADES.recordsTab + '\'!$F$2:$F$' + F1XL_ACCOLADES.maxRecords + '="Driver",\'' + F1XL_ACCOLADES.recordsTab + '\'!$N$2:$N$' + F1XL_ACCOLADES.maxRecords + '="Confirmed")),"")';
}

function accoladeSeasonAlreadyFinalised_(spreadsheet, season) {
  const sheet = spreadsheet.getSheetByName(F1XL_ACCOLADES.recordsTab);
  if (!sheet || sheet.getLastRow() < 2) return false;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, F1XL_ACCOLADES.headers.length).getDisplayValues().some(function(row) {
    return accoladeText_(row[1]) === String(season) && /^confirmed$/i.test(accoladeText_(row[13]));
  });
}

function accoladeCreateVerifiedBackup_(spreadsheet, season) {
  SpreadsheetApp.flush();
  const file = DriveApp.getFileById(spreadsheet.getId());
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyyMMdd-HHmmss');
  const name = 'BACKUP - ' + spreadsheet.getName() + ' - before Season ' + season + ' Accolades - ' + timestamp;
  const parents = file.getParents();
  const backupFile = parents.hasNext() ? file.makeCopy(name, parents.next()) : file.makeCopy(name);
  const backup = SpreadsheetApp.openById(backupFile.getId());
  const sourceSheets = spreadsheet.getSheets(), backupSheets = backup.getSheets();
  if (sourceSheets.length !== backupSheets.length) throw new Error('The Registry backup has a different number of tabs from its source. Nothing further was changed.');
  sourceSheets.forEach(function(sourceSheet) {
    const backupSheet = backup.getSheetByName(sourceSheet.getName());
    if (!backupSheet || careerFormulaSheetFingerprint_(sourceSheet) !== careerFormulaSheetFingerprint_(backupSheet)) throw new Error('The Registry backup did not match ' + sourceSheet.getName() + '. Nothing further was changed.');
  });
  return { id:backup.getId(), url:backup.getUrl() };
}

function accoladeMissing_(mode, blockers, warnings, message) {
  if (mode === 'Historical') warnings.push(message); else blockers.push(message);
}
function accoladePosition_(value) { const number = Number(value); return number === 1 || number === 2 ? number : 0; }
function accoladeText_(value) { return String(value == null ? '' : value).trim(); }
function accoladeNameKey_(value) { return accoladeText_(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function accoladeUnique_(values) { return values.filter(function(value, index) { return values.indexOf(value) === index; }); }
function accoladeRevision_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value), Utilities.Charset.UTF_8).map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}
