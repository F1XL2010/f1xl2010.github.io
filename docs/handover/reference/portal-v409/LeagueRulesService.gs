/** Reuse the website's published rules; editing stays in the original Google Doc. */
function getLeagueRulesLinks() { fapAssertEntry_('getLeagueRulesLinks');
  const cache = CacheService.getScriptCache(), key = 'F1XL_LEAGUE_RULES_LINKS_V1';
  let links = cache.get(key);
  if (links) links = JSON.parse(links);
  else {
    const configId = PropertiesService.getScriptProperties().getProperty(F1XL_WEBSITE_CONFIG.propertyKey);
    if (!configId) throw new Error('Connect the Website Config before opening league rules.');
    const sheet = SpreadsheetApp.openById(configId).getSheetByName('Main');
    if (!sheet) throw new Error('Website Config is missing its Main tab.');
    const rows = sheet.getRange(1, 1, sheet.getLastRow(), 2).getDisplayValues();
    const value = key => String((rows.find(r => String(r[0]).trim() === key) || [])[1] || '').trim();
    const publishedUrl = value('league_rules_url');
    if (!/^https:\/\/docs\.google\.com\/document\/d\/e\/[A-Za-z0-9_-]+\/pub(?:\?[^#]*)?$/.test(publishedUrl)) throw new Error('Set a published Google Doc URL in Website Config → league_rules_url.');
    // The original document corresponding to the existing published league rules.
    const knownPublished = 'https://docs.google.com/document/d/e/2PACX-1vRwERW4dRYCpXDWxL4oTzyTaCKkDec2Twql2rU_rTwCyLnySp_t_8NEDB-evWcM-QIDXGYYD2AOOt73/pub';
    const editUrl = value('league_rules_edit_url') || (publishedUrl.split('?')[0] === knownPublished ? 'https://docs.google.com/document/d/1_V3tDMFCNC8RmuG1hYBWEtGzNniMPFpI-Yf4Pj7J-qg/edit' : '');
    links = {publishedUrl:publishedUrl, editUrl:/^https:\/\/docs\.google\.com\/document\/d\/[A-Za-z0-9_-]+\/edit(?:\?[^#]*)?$/.test(editUrl) ? editUrl : ''};
    cache.put(key, JSON.stringify(links), 120);
  }
  const actor = fapRequest_ ? fapRequest_.person : fapOwner_();
  return {publishedUrl:links.publishedUrl, editUrl:fapPermission_(actor, 'maintenance') >= 2 ? links.editUrl : ''};
}
