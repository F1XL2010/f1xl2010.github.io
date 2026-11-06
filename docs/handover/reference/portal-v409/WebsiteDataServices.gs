/**
 * TEST replacement for the current Website Config workbook.
 *
 * One permanent config workbook, one main index and one internal config tab
 * per season. The website reads the real Division and Season Master files;
 * no additional seasonal Feed workbook is created.
 */
const F1XL_WEBSITE_CONFIG = Object.freeze({
  propertyKey: 'F1XL_TEST_WEBSITE_CONFIG_ID_V2',
  oldRegistryPropertyKey: 'F1XL_WEBSITE_REGISTRY_ID_V1',
  oldFeedPropertyPrefix: 'F1XL_WEBSITE_FEED_',
  cacheKey: 'F1XL_TEST_WEBSITE_CONFIG_STATUS_V2', cacheSeconds:120,
  workbookName: 'TEST - F1XL Website Config',
  colours: { main:'#24527a', template:'#666666', draft:'#9c6500', ready:'#1b5e20' }
});

function getWebsiteConfigStatus(forceRefresh) { fapAssertEntry_('getWebsiteConfigStatus');
  const cache = CacheService.getScriptCache();
  if (forceRefresh === true) cache.remove(F1XL_WEBSITE_CONFIG.cacheKey);
  const cached = cache.get(F1XL_WEBSITE_CONFIG.cacheKey);
  if (cached) return JSON.parse(cached);
  const properties = PropertiesService.getScriptProperties();
  const configId = properties.getProperty(F1XL_WEBSITE_CONFIG.propertyKey) || '';
  const oldRegistryId = properties.getProperty(F1XL_WEBSITE_CONFIG.oldRegistryPropertyKey) || '';
  let workbook = null;
  let config = { configured:false, available:false, spreadsheetId:configId, name:'', url:'', mainGid:'' };
  if (configId) {
    try { workbook = SpreadsheetApp.openById(configId); config = websiteConfigWorkbookSummary_(workbook); }
    catch (error) { config.available = false; }
  }
  const obsoleteFeeds = websiteConfigObsoleteFeeds_(properties);
  const response = {
    ok:true, config:config, seasons:workbook ? websiteConfigReadSeasons_(workbook) : [],
    prototype:{ registryId:oldRegistryId && oldRegistryId !== configId ? oldRegistryId : '', canReuse:!configId && !!oldRegistryId, obsoleteFeeds:obsoleteFeeds },
    message:config.available ? 'Website Config loaded.' : (oldRegistryId ? 'The previous Registry prototype can be rebuilt as the correct TEST Website Config.' : 'Create the TEST Website Config first.')
  };
  cache.put(F1XL_WEBSITE_CONFIG.cacheKey, JSON.stringify(response), F1XL_WEBSITE_CONFIG.cacheSeconds);
  return response;
}

function createTestWebsiteConfigWorkbook() { fapAssertEntry_('createTestWebsiteConfigWorkbook');
  return websiteConfigWithLock_(function() {
    const properties = PropertiesService.getScriptProperties();
    const existingId = properties.getProperty(F1XL_WEBSITE_CONFIG.propertyKey);
    if (existingId) {
      const existing = SpreadsheetApp.openById(existingId);
      websiteConfigAssertTestWorkbook_(existing);
      return { ok:true, created:false, config:websiteConfigWorkbookSummary_(existing), message:'The TEST Website Config already exists. No duplicate was created.' };
    }
    const prototypeId = properties.getProperty(F1XL_WEBSITE_CONFIG.oldRegistryPropertyKey);
    const workbook = prototypeId ? SpreadsheetApp.openById(prototypeId) : SpreadsheetApp.create(fapWorkbookNewName_(F1XL_WEBSITE_CONFIG.workbookName));
    try {
      if (prototypeId) websiteConfigAssertTestWorkbook_(workbook);
      if (!prototypeId) websiteConfigMoveBesidePermanentData_(workbook.getId());
      workbook.setName(F1XL_WEBSITE_CONFIG.workbookName);
      websiteConfigBuildWorkbook_(workbook);
      websiteConfigMakePublic_(DriveApp.getFileById(workbook.getId()));
      properties.setProperty(F1XL_WEBSITE_CONFIG.propertyKey, workbook.getId());
      properties.deleteProperty(F1XL_WEBSITE_CONFIG.oldRegistryPropertyKey);
      websiteConfigClearCache_();
      return { ok:true, created:!prototypeId, reusedPrototype:!!prototypeId, config:websiteConfigWorkbookSummary_(workbook), message:prototypeId ? 'The old Registry prototype was rebuilt as the TEST Website Config. No additional config workbook was created.' : 'The TEST Website Config was created in the familiar one-workbook, one-tab-per-season structure.' };
    } catch (error) {
      workbook.setName('INCOMPLETE - ' + F1XL_WEBSITE_CONFIG.workbookName);
      throw new Error('The TEST Website Config could not be completed. A clearly labelled INCOMPLETE workbook was left in Drive. ' + error.message);
    }
  });
}

function prepareSeasonWebsiteConfig(input) { fapAssertEntry_('prepareSeasonWebsiteConfig');
  return websiteConfigWithLock_(function() {
    const season = websiteConfigNormaliseSeason_(input && input.season);
    if(testLaunchRecord_(season).sourceMode===F1XL_DIRECT_SOURCE_MODE){testLaunchDirectConfigure_(testLaunchBook_(season),season);return {ok:true,season:season,message:'Direct working-sheet connections checked.'};}
    if(testLaunchRecord_(season).exportId||testLaunchRecord_(season).pendingId)throw new Error('Use this season’s active-season hub to update its public TEST snapshot.');
    const workbook = websiteConfigOpen_();
    const existing = websiteConfigFindSeasonRow_(workbook, season);
    const published = existing ? String(existing.divisions || '').trim() : '';
    const blockCount = Math.max(1, Number(published) || 1);
    const sources = websiteConfigSeasonSources_(season, blockCount);
    websiteConfigWriteSeason_(workbook, sources, published, blockCount);
    websiteConfigClearCache_();
    return { ok:true, season:season, config:websiteConfigWorkbookSummary_(workbook), message:published ? 'Season ' + season + ' was refreshed without changing its published division count.' : 'Season ' + season + ' was prepared as a draft. Divisions remain blank, so the website will not show its teams or standings yet.' };
  });
}

function publishSeasonWebsiteDivisions(input) { fapAssertEntry_('publishSeasonWebsiteDivisions');
  return websiteConfigWithLock_(function() {
    const season = websiteConfigNormaliseSeason_(input && input.season);
    if(testLaunchRecord_(season).sourceMode===F1XL_DIRECT_SOURCE_MODE){testLaunchDirectConfigure_(testLaunchBook_(season),season);return {ok:true,season:season,message:'Direct working-sheet connections checked.'};}
    if(testLaunchRecord_(season).exportId||testLaunchRecord_(season).pendingId)throw new Error('Use this season’s active-season hub to update its public TEST snapshot.');
    const divisions = Number(input && input.divisions);
    if (!Number.isInteger(divisions) || divisions < 1 || divisions > F1XL_CAPACITY.divisions) throw new Error('Confirmed divisions must be a whole number from 1 to ' + F1XL_CAPACITY.divisions + '.');
    const sources = websiteConfigSeasonSources_(season, divisions);
    const workbook = websiteConfigOpen_();
    websiteConfigMakeSeasonSourcesPublic_(sources);
    websiteConfigWriteSeason_(workbook, sources, String(divisions), divisions);
    websiteConfigUpdateCurrentLicence_(workbook, sources.master);
    websiteConfigClearCache_();
    return { ok:true, season:season, divisions:divisions, config:websiteConfigWorkbookSummary_(workbook), message:'Season ' + season + ' now publishes ' + divisions + ' division' + (divisions === 1 ? '' : 's') + ' to the website. The permanent reference data is also readable by the test website.' };
  });
}

function returnSeasonWebsiteConfigToDraft(input) { fapAssertEntry_('returnSeasonWebsiteConfigToDraft');
  return websiteConfigWithLock_(function() {
    const season = websiteConfigNormaliseSeason_(input && input.season);
    if(testLaunchRecord_(season).exportId||testLaunchRecord_(season).pendingId)throw new Error('Use this season’s active-season hub to update its public TEST snapshot.');
    const workbook = websiteConfigOpen_();
    const existing = websiteConfigFindSeasonRow_(workbook, season);
    if (!existing) throw new Error('Season ' + season + ' has not been prepared in the TEST Website Config.');
    const blockCount = Math.max(1, Number(existing.divisions) || 1);
    const sources = websiteConfigSeasonSources_(season, blockCount);
    websiteConfigWriteSeason_(workbook, sources, '', blockCount);
    websiteConfigClearCache_();
    return { ok:true, message:'Season ' + season + ' is back in draft. Its config remains stored, but the website will not show teams or standings.' };
  });
}

function retireObsoleteWebsiteFeedPrototypes() { fapAssertEntry_('retireObsoleteWebsiteFeedPrototypes');
  return websiteConfigWithLock_(function() {
    const properties = PropertiesService.getScriptProperties();
    const obsolete = websiteConfigObsoleteFeeds_(properties);
    obsolete.forEach(function(item) {
      try {
        const file = DriveApp.getFileById(item.spreadsheetId);
        if (!/^TEST\s*-/i.test(fapWorkbookLegacyName_(file.getName()))) throw new Error('The connected obsolete Feed is not clearly labelled TEST. Nothing was moved to the bin.');
        file.setTrashed(true);
      } catch (error) {
        if (/not clearly labelled TEST/i.test(String(error && error.message || error))) throw error;
        /* already unavailable */
      }
      properties.deleteProperty(item.propertyKey);
    });
    websiteConfigClearCache_();
    return { ok:true, removed:obsolete.length, message:obsolete.length ? obsolete.length + ' obsolete Website Feed prototype' + (obsolete.length === 1 ? ' was' : 's were') + ' moved to the Google Drive bin.' : 'No obsolete Website Feed prototypes were connected.' };
  });
}

function websiteConfigBuildWorkbook_(workbook) {
  const sheets = workbook.getSheets();
  const main = sheets[0];
  main.setName('Main');
  for (let index = sheets.length - 1; index >= 1; index -= 1) workbook.deleteSheet(sheets[index]);
  main.clear(); main.clearFormats(); main.setHiddenGridlines(false);
  const globals = websiteConfigGlobalRows_();
  main.getRange(1, 1, 1, 6).merge().setValue('F1XL TEST WEBSITE CONFIG').setFontSize(18).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_WEBSITE_CONFIG.colours.main);
  main.getRange(2, 1, 1, 2).setValues([['Key','Value']]).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_WEBSITE_CONFIG.colours.main);
  main.getRange(3, 1, globals.length, 2).setValues(globals);
  main.getRange(3, 1, globals.length, 1).setFontWeight('bold');
  main.getRange(3, 1, globals.length, 2).setWrap(true).setVerticalAlignment('top');
  const row = 3 + globals.length + 2;
  main.getRange(row, 1, 1, 6).setValues([['New seasons','tab gid from this document','overall_gid','w_totals_gid','divisions','Status']]).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_WEBSITE_CONFIG.colours.ready);
  main.getRange(row + 1, 1, 1, 6).setValues([['','','','','','Prepared season tabs appear here automatically.']]);
  main.setColumnWidth(1, 240); main.setColumnWidth(2, 420); main.setColumnWidth(3, 620); main.setColumnWidth(4, 130); main.setColumnWidth(5, 100); main.setColumnWidth(6, 220); main.setFrozenRows(2);
  const template = workbook.insertSheet('Template');
  websiteConfigWriteTemplate_(template); template.hideSheet();
  workbook.setActiveSheet(main); SpreadsheetApp.flush();
}

function websiteConfigGlobalRows_() {
  const properties = PropertiesService.getScriptProperties();
  const referenceId = properties.getProperty(F1XL_REFERENCE_DATA.propertyKey) || '';
  let reference = null;
  if (referenceId) try { reference = SpreadsheetApp.openById(referenceId); } catch (error) { reference = null; }
  function refGid(name) { const sheet = reference && reference.getSheetByName(name); return sheet ? String(sheet.getSheetId()) : ''; }
  return [
    ['ticket_outcomes_sheet','1018L2jzNseasQVfNNoZCh_fDUbMIQ93EP2ahJvNc6F0'], ['ticket_outcomes_gid','1683645163'],
    ['reference_data_sheet_id',referenceId], ['teams_gid',refGid('Teams')], ['team_aliases_gid',refGid('Team Aliases')], ['tracks_gid',refGid('Tracks')], ['countries_gid',refGid('Countries')], ['car_numbers_gid',refGid('Car Numbers')],
    ['legacy_teams_sheet_id','1f2ECx5qJxc18vFq62yUtdn_Hif6o0c-o_oibo6Pfwd8'],
    ['league_rules_url','https://docs.google.com/document/d/e/2PACX-1vRwERW4dRYCpXDWxL4oTzyTaCKkDec2Twql2rU_rTwCyLnySp_t_8NEDB-evWcM-QIDXGYYD2AOOt73/pub'],
    ['stats_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=931938103#gid=931938103'], ['accolades_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=105772497#gid=105772497'],
    ['D1_winners_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=561849967#gid=561849967'], ['D2_winners_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=1683541154#gid=1683541154'], ['D3_winners_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=1890989966#gid=1890989966'], ['D4_winners_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=831399506#gid=831399506'], ['D5_winners_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=546206063#gid=546206063'], ['D6_winners_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=649254939#gid=649254939'], ['D7_winners_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=922747615#gid=922747615'], ['D8_winners_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=274066127#gid=274066127'],
    ['overall_winners_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=1186778399#gid=1186778399'], ['asr_url','https://docs.google.com/spreadsheets/d/1mrnmIHJNREanKawFTdDbB4m6YuB1B1tq2VS0PC18xfI/edit?gid=334569756#gid=334569756'],
    ['drivers_licence_sheet_id',''], ['drivers_licence_summary_gid',''], ['drivers_licence_bans_gid',''], ['drivers_licence_penalty_guide_gid',''], ['signups_open','no'],
    ['test_season_phase','offseason'], ['latest_completed_test_season',''], ['test_season_closed_at','']
  ];
}

function websiteConfigWriteTemplate_(sheet) {
  sheet.clear();
  sheet.getRange('A1:C1').setValues([['Season Template','value','Explanation']]).setFontWeight('bold').setFontColor('#ffffff').setBackground(F1XL_WEBSITE_CONFIG.colours.template);
  const rows = websiteConfigSeasonRows_({ season:'', rounds:F1XL_CAPACITY.rounds, master:null, divisions:[] }, '', 1, true);
  sheet.getRange(2, 1, rows.length, 3).setValues(rows); sheet.getRange(2, 1, rows.length, 3).setWrap(true);
  sheet.setColumnWidth(1, 240); sheet.setColumnWidth(2, 440); sheet.setColumnWidth(3, 360); sheet.setFrozenRows(1); sheet.setHiddenGridlines(false);
}

function websiteConfigWriteSeason_(workbook, sources, published, blockCount) {
  const name = websiteConfigSeasonSheetName_(sources.season);
  let sheet = workbook.getSheetByName(name);
  if (!sheet) sheet = workbook.insertSheet(name);
  sheet.showSheet(); sheet.clear(); sheet.clearFormats();
  const rows = websiteConfigSeasonRows_(sources, published, blockCount, false);
  sheet.getRange('A1:C1').setValues([['Season ' + sources.season,'value','Explanation']]).setFontWeight('bold').setFontColor('#ffffff').setBackground(published ? F1XL_WEBSITE_CONFIG.colours.ready : F1XL_WEBSITE_CONFIG.colours.draft);
  sheet.getRange(2, 1, rows.length, 3).setValues(rows); sheet.getRange(2, 1, rows.length, 3).setWrap(true).setVerticalAlignment('top');
  sheet.setColumnWidth(1, 240); sheet.setColumnWidth(2, 440); sheet.setColumnWidth(3, 360); sheet.setFrozenRows(1); sheet.setHiddenGridlines(false);
  websiteConfigUpdateMainSeasonRow_(workbook, sources.season, sheet, published, sources.master);
  sheet.hideSheet(); SpreadsheetApp.flush();
}

function websiteConfigSeasonRows_(sources, published, blockCount, templateOnly) {
  const master = sources.master;
  const rows = [
    ['source_format','generated_division_v1','Identifies the new standard Season Master and Division workbook structure.'],
    ['divisions',published,'Blank means draft: the website must not create teams or standings for this season.'],
    ['has_results',published ? 'yes' : 'no','Season-wide launch state.'],
    ['season_master_sheet_id',master ? master.getId() : '','Season Master workbook.'],
    ['teams_and_principals_gid',master ? websiteConfigSheetId_(master, 'Teams & Principals') : '','Season-wide teams and Team Principals.'],
    ['calendar_gid',master ? websiteConfigSheetId_(master, 'Calendar') : '','Season-wide calendar.'],
    ['licence_summary_gid',master ? websiteConfigSheetId_(master, 'Summary') : '','Season-specific current licence totals.'],
    ['licence_bans_gid',master ? websiteConfigSheetId_(master, 'Outstanding Bans') : '','Season-specific outstanding bans.'],
    ['licence_penalty_guide_gid',master ? websiteConfigSheetId_(master, 'Penalty Guide') : '','Penalty guide used by the public licence page.']
  ];
  for (let division = 1; division <= blockCount; division += 1) {
    const item = (sources.divisions || []).find(function(entry) { return entry.division === division; });
    const book = item && item.workbook; const prefix = 'd' + division + '_';
    rows.push([prefix + 'sheet_id',book ? book.getId() : '','Division workbook ID.']);
    rows.push([prefix + 'has_standings',published && book ? 'yes' : 'no','Enabled only after divisions are confirmed.']);
    rows.push([prefix + 'has_results',published && book ? 'yes' : 'no','Enabled only after divisions are confirmed.']);
    rows.push([prefix + 'team_info_gid',book ? websiteConfigSheetId_(book, 'Data') : '','Familiar Division data adapter.']);
    rows.push([prefix + 'driver_results_gid',book ? websiteConfigSheetId_(book, 'Driver Results NoSort') : '','Driver standings source.']);
    rows.push([prefix + 'constructors_gid',book ? websiteConfigSheetId_(book, 'Constructors Standings NoSort') : '','Constructor standings source.']);
    rows.push([prefix + 'driver_stats_gid',book ? websiteConfigSheetId_(book, 'Driver Stats Calc Sheet') : '','Driver statistics source.']);
    rows.push([prefix + 'team_stats_gid',book ? websiteConfigSheetId_(book, 'Team Stats Calc Sheet') : '','Team statistics source.']);
    rows.push([prefix + 'calendar_gid',book ? websiteConfigSheetId_(book, 'Race Calendar') : '','Division calendar adapter used by existing pages.']);
    const roundLimit = templateOnly ? F1XL_CAPACITY.rounds : sources.rounds;
    for (let round = 1; round <= roundLimit; round += 1) rows.push([prefix + 'r' + round + '_gid',book ? websiteConfigSheetId_(book, 'R' + round) : '','Round ' + round + ' results source.']);
  }
  return rows;
}

function websiteConfigSeasonSources_(season, divisions) {
  const master = websiteConfigSeasonMaster_(season); const start = master.getSheetByName('Start Here');
  if (!start) throw new Error('The Season ' + season + ' Master is missing Start Here.');
  const rounds = Math.max(1, Number(start.getRange('B4').getValue()) || 1); const list = []; const properties = PropertiesService.getScriptProperties();
  for (let division = 1; division <= divisions; division += 1) {
    const id = properties.getProperty(divisionTemplatePropertyKey_(season, division));
    if (!id) throw new Error('Create and connect Division ' + division + ' for Season ' + season + ' first.');
    const workbook = SpreadsheetApp.openById(id);
    divisionTemplateAssertTestWorkbook_(workbook);
    list.push({ division:division, workbook:workbook });
  }
  return { season:season, rounds:rounds, master:master, divisions:list };
}

function websiteConfigUpdateMainSeasonRow_(workbook, season, seasonSheet, divisions, master) {
  const main = workbook.getSheetByName('Main'); const header = websiteConfigFindKeyCell_(main, 'New seasons');
  if (!header) throw new Error('The TEST Website Config Main tab is missing New seasons.');
  const start = header.getRow() + 1; const last = Math.max(main.getLastRow(), start);
  const values = main.getRange(start, 1, last - start + 1, 6).getDisplayValues(); const key = 's' + String(season).replace('.', '_') + '_gid';
  let offset = values.findIndex(function(row) { return String(row[0]).trim().toLowerCase() === key.toLowerCase(); });
  if (offset < 0) { main.insertRowBefore(start); offset = 0; }
  const row = start + offset; const overallGid = master ? websiteConfigSheetId_(master, 'Overall Standings') : ''; const weeklyGid = master ? websiteConfigSheetId_(master, 'Weekly Totals') : '';
  const overallUrl = master && overallGid !== '' ? master.getUrl().split('/edit')[0] + '/edit?gid=' + overallGid + '#gid=' + overallGid : '';
  main.getRange(row, 1, 1, 6).setValues([[key,seasonSheet.getSheetId(),overallUrl,weeklyGid,divisions,divisions ? 'Ready' : 'Draft — divisions not confirmed']]);
  main.getRange(row, 1, 1, 6).setBackground(divisions ? '#d9ead3' : '#fff2cc');
}

function websiteConfigUpdateCurrentLicence_(workbook, master) {
  const main = workbook.getSheetByName('Main');
  websiteConfigSetKeyValue_(main, 'drivers_licence_sheet_id', master.getId());
  websiteConfigSetKeyValue_(main, 'drivers_licence_summary_gid', websiteConfigSheetId_(master, 'Summary'));
  websiteConfigSetKeyValue_(main, 'drivers_licence_bans_gid', websiteConfigSheetId_(master, 'Outstanding Bans'));
  websiteConfigSetKeyValue_(main, 'drivers_licence_penalty_guide_gid', websiteConfigSheetId_(master, 'Penalty Guide'));
}

function websiteConfigReadSeasons_(workbook) {
  const main = workbook.getSheetByName('Main'); if (!main) return []; const header = websiteConfigFindKeyCell_(main, 'New seasons'); if (!header) return [];
  const start = header.getRow() + 1; if (main.getLastRow() < start) return [];
  return main.getRange(start, 1, main.getLastRow() - start + 1, 6).getDisplayValues().filter(function(row) { return /^s\d+(?:_\d+)?_gid$/i.test(String(row[0] || '').trim()); }).map(function(row) {
    const season = String(row[0]).replace(/^s/i, '').replace(/_gid$/i, '').replace('_', '.');
    return { season:season, gid:row[1], overallUrl:row[2], weeklyGid:row[3], divisions:row[4], status:row[5] || (row[4] ? 'Ready' : 'Draft') };
  }).sort(function(a,b) { return Number(b.season) - Number(a.season); });
}

function websiteConfigFindSeasonRow_(workbook, season) { return websiteConfigReadSeasons_(workbook).find(function(item) { return String(item.season) === String(season); }) || null; }
function websiteConfigFindKeyCell_(sheet, key) { const last = sheet.getLastRow(); if (!last) return null; const values = sheet.getRange(1, 1, last, 1).getDisplayValues(); const index = values.findIndex(function(row) { return String(row[0] || '').trim().toLowerCase() === String(key).toLowerCase(); }); return index < 0 ? null : sheet.getRange(index + 1, 1); }
function websiteConfigSetKeyValue_(sheet, key, value) { const cell = websiteConfigFindKeyCell_(sheet, key); if (!cell) throw new Error('The TEST Website Config is missing ' + key + '.'); cell.offset(0, 1).setValue(value); }
function websiteConfigSheetId_(workbook, name) { const sheet = workbook && workbook.getSheetByName(name); return sheet ? sheet.getSheetId() : ''; }
function websiteConfigSeasonMaster_(season) { const id = PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(season)); if (!id) throw new Error('Season ' + season + ' does not have a connected Season Master.'); const workbook=SpreadsheetApp.openById(id); seasonMasterAssertTestWorkbook_(workbook); return workbook; }
function websiteConfigSeasonSheetName_(season) { return 'S' + String(season).replace('.', '_'); }
function websiteConfigNormaliseSeason_(value) { const season = String(value || '').trim(); if (!/^\d+(?:\.5)?$/.test(season)) throw new Error('Enter a valid connected season number, for example 1000.'); return season; }
function websiteConfigOpen_() { const id = PropertiesService.getScriptProperties().getProperty(F1XL_WEBSITE_CONFIG.propertyKey); if (!id) throw new Error('Create the TEST Website Config first.'); const workbook=SpreadsheetApp.openById(id); websiteConfigAssertTestWorkbook_(workbook); return workbook; }
function websiteConfigWorkbookSummary_(workbook) { const main = workbook.getSheetByName('Main'); return { configured:true, available:true, spreadsheetId:workbook.getId(), name:workbook.getName(), url:workbook.getUrl(), mainGid:main ? main.getSheetId() : '' }; }

function websiteConfigAssertTestWorkbook_(workbook) {
  if (!workbook || !/^TEST\s*-/i.test(fapWorkbookLegacyName_(workbook.getName()))) throw new Error('For safety, this action is restricted to the TEST Website Config. Nothing was changed.');
}

function websiteConfigObsoleteFeeds_(properties) {
  const all = properties.getProperties();
  return Object.keys(all).filter(function(key) { return key.indexOf(F1XL_WEBSITE_CONFIG.oldFeedPropertyPrefix) === 0; }).map(function(key) {
    const id = all[key]; let name = 'Obsolete Website Feed prototype'; let url = '';
    try { const file = DriveApp.getFileById(id); name = file.getName(); url = file.getUrl(); } catch (error) { /* unavailable */ }
    return { propertyKey:key, spreadsheetId:id, name:name, url:url };
  });
}

function websiteConfigMakePublic_(file) { try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (error) { throw new Error('The TEST Website Config could not be made readable by the test website. Check the Google Drive sharing policy. ' + error.message); } }
function websiteConfigMakeSeasonSourcesPublic_(sources) {
  // New Masters contain private intake and trial records. A public announcement
  // must export selected fields rather than sharing the entire admin workbook.
  const privateTabs=['Applications Tracker','Processed Applications','Time Trial Queue','TT Results','Track Draw','TP Applications','TP Voters','TP Votes','Placement Drivers','Placement Divisions','Draft Order','Draft Picks','Season Allocations'];
  if (seasonMasterIsPlanning_(sources.master) || privateTabs.some(function(name) { return !!sources.master.getSheetByName(name); })) {
    throw new Error('This Season Master contains preseason or private admin data. Public website export must be connected before publishing; the Master has not been shared.');
  }
  const files = [sources.master].concat((sources.divisions || []).map(function(item) { return item.workbook; }));
  const referenceId = PropertiesService.getScriptProperties().getProperty(F1XL_REFERENCE_DATA.propertyKey);
  if (referenceId && !files.some(function(workbook) { return workbook.getId() === referenceId; })) files.push(SpreadsheetApp.openById(referenceId));
  files.forEach(function(workbook) {
    try { DriveApp.getFileById(workbook.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
    catch (error) { throw new Error(workbook.getName() + ' could not be made readable by the public website. Check the Google Drive sharing policy. ' + error.message); }
  });
}
function websiteConfigMoveBesidePermanentData_(fileId) { const referenceId = PropertiesService.getScriptProperties().getProperty(F1XL_REFERENCE_DATA.propertyKey); if (!referenceId) return; const parents = DriveApp.getFileById(referenceId).getParents(); if (parents.hasNext()) DriveApp.getFileById(fileId).moveTo(parents.next()); }
function websiteConfigClearCache_() { CacheService.getScriptCache().remove(F1XL_WEBSITE_CONFIG.cacheKey); }
function websiteConfigWithLock_(work,operation) {
  if(operation&&typeof fapPerformanceMeasure_==='function')return fapPerformanceMeasure_(operation,function(){return fapPerformanceLock_(work);});
  const lock = LockService.getScriptLock(); lock.waitLock(30000); try { return work(); } finally { lock.releaseLock(); }
}
