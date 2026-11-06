/**
 * Owner-approved completed archive, verified 12 September 2026.
 * Protect S3–S27 and S7.5 in the FAP; do not infer completion for S1/S2/S28.
 * This is an application write boundary, not a Google Sheets permission change.
 * No browser input, mode selector or TEST label can override this policy.
 */
function seasonProtectionStatus_(value) {
  const text = String(value == null ? '' : value).trim();
  const season = /^\d+(?:\.5)?$/.test(text) ? Number(text) : NaN;
  const historic = (Number.isInteger(season) && season >= 3 && season <= 27) || season === 7.5;
  let closed = false;
  if (!historic && !isNaN(season)) {
    try { closed = !!PropertiesService.getScriptProperties().getProperty('F1XL_POSTSEASON_CLOSED_' + text.replace(/\./g, '_')); } catch (error) {}
  }
  const readOnly = historic || closed;
  return { readOnly:readOnly, readOnlyReason:readOnly
    ? 'Season ' + season + (closed ? ' is closed in the FAP and is read-only. Use the Google Sheet for a deliberate historical correction.' : ' is completed history and is read-only in the FAP. Use the Google Sheet for a deliberate historical correction.')
    : '' };
}

function assertSeasonWritable_(season) {
  const protection = seasonProtectionStatus_(season);
  if (protection.readOnly) throw new Error(protection.readOnlyReason);
  if(typeof driverRenamePending_==='function'&&!driverRenameWriting_&&driverRenamePending_(season))throw new Error('A season gamertag change is in progress. Resume it in Driver Database before saving other season changes.');
}

/** Also check the target, so a different season number cannot relabel an archive. */
function seasonProtectionForWorkbook_(workbook) {
  const properties = PropertiesService.getScriptProperties().getProperties();
  const id = workbook.getId();
  for (const key of Object.keys(properties)) {
    if (properties[key] !== id) continue;
    const match = key.match(/^F1XL_SEASON_MASTER_(\d+(?:_5)?)$/) || key.match(/^F1XL_DIVISION_WORKBOOK_(\d+(?:_5)?)_\d+$/);
    if (match) {
      const protection = seasonProtectionStatus_(match[1].replace('_', '.'));
      if (protection.readOnly) return protection;
    }
  }
  const name = workbook.getName().match(/\bSeason\s+(\d+(?:\.5)?)\b/i);
  if (name && seasonProtectionStatus_(name[1]).readOnly) return seasonProtectionStatus_(name[1]);
  const start = workbook.getSheetByName('Start Here');
  if (start && /^season$/i.test(String(start.getRange('A3').getDisplayValue()).trim())) {
    return seasonProtectionStatus_(start.getRange('B3').getDisplayValue());
  }
  return seasonProtectionStatus_('');
}

function assertSeasonWorkbookWritable_(season, workbook) {
  assertSeasonWritable_(season);
  const protection = seasonProtectionForWorkbook_(workbook);
  if (protection.readOnly) throw new Error(protection.readOnlyReason);
}
