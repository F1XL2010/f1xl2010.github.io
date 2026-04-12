// F1XL Website Config Loader
// Reads from the config Google Sheet and provides season/sheet data to all pages

const F1XL_CONFIG_SHEET_ID = '1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk';
const F1XL_CONFIG_GID = '0';

// Permanent sheet IDs (never change)
const F1XL_PERMANENT = {
  schedule_sheet_id:       '1wjUo7Nq3Kbc3x9EIq4hsVdxQ_gMItofYC90xwMvsLoM',
  schedule_gid:            '0',
  ticket_outcomes_sheet_id:'1018L2jzNseasQVfNNoZCh_fDUbMIQ93EP2ahJvNc6F0',
  ticket_outcomes_gid:     '1683645163',
  teams_sheet_id:          '1VdV1CEefr4nct-_KZPu9xBzbFMHY3nHVbShm9RBnX0c',
  teams_gid:               '1278748961',
  track_records_sheet_id:  '18vD7g_29uzRSr_GYbXkNjclCHe8F_bsp4cY69TjXrW4',
  track_records_gids: {
    d1:'0', d2:'343950932', d3:'806509057', d4:'557492395',
    d5:'1468409556', d6:'1147341365', d7:'1917666666', d8:'468074839'
  }
};

let _configCache = null;
let _configPromise = null;

function parseConfigCSV(text) {
  const map = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    // Parse CSV properly handling quoted values
    const parts = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { parts.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    parts.push(cur.trim());
    const key = (parts[0] || '').replace(/^"|"$/g, '').trim().toLowerCase();
    const val = (parts[1] || '').replace(/^"|"$/g, '').trim();
    // Skip header rows and label rows
    if (!key || !val) continue;
    if (key === 'key' || key === 'value') continue;
    if (key === 'past seasons' || key === 'permanent rows (never change):') continue;
    map[key] = val;
  }
  return map;
}

async function loadConfig() {
  if (_configCache) return _configCache;
  if (_configPromise) return _configPromise;

  _configPromise = (async () => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${F1XL_CONFIG_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${F1XL_CONFIG_GID}`;
      const res = await fetch(url);
      const text = await res.text();
      const config = parseConfigCSV(text);
      _configCache = config;
      return config;
    } catch(e) {
      console.error('Config load failed:', e.message, e);
      return {};
    }
  })();

  return _configPromise;
}

async function loadSeasonConfig(season) {
  // Load a specific season's config tab
  const config = await loadConfig();
  const key = `s${season}_gid`;
  const gid = config[key];
  if (!gid) return null;

  try {
    const url = `https://docs.google.com/spreadsheets/d/${F1XL_CONFIG_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
    const res = await fetch(url);
    const text = await res.text();
    return parseConfigCSV(text);
  } catch(e) {
    console.warn(`Season ${season} config load failed:`, e.message);
    return null;
  }
}

async function getCurrentSeason() {
  const config = await loadConfig();
  return parseInt(config['current_season']) || null;
}

async function getCurrentSeasonConfig() {
  const config = await loadConfig();
  // Use current_season_gid directly if available
  const gid = config['current_season_gid'];
  if (gid) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${F1XL_CONFIG_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
      const res = await fetch(url);
      const text = await res.text();
      const parsed = parseConfigCSV(text);
      return parsed;
    } catch(e) {
      console.error('Current season config load failed:', e.message);
    }
  }
  // Fallback to season number lookup
  const season = await getCurrentSeason();
  if (!season) return null;
  return loadSeasonConfig(season);
}

async function getAllSeasons() {
  // Returns array of {season, gid} for past seasons only (not current)
  const config = await loadConfig();
  const current = parseInt(config['current_season']) || 0;
  const seasons = [];
  for (const key of Object.keys(config)) {
    const match = key.match(/^s(\d+(?:_\d+)?)_gid$/);
    if (match && config[key]) {
      const num = parseFloat(match[1].replace('_', '.'));
      if (!isNaN(num) && num !== current) seasons.push({season: num, gid: config[key]});
    }
  }
  return seasons.sort((a, b) => b.season - a.season);
}

// Helper: get race GIDs array for a season/division from season config
function getRaceGIDs(seasonConfig, division) {
  const d = `d${division}`;
  const gids = [];
  for (let i = 1; i <= 21; i++) {
    const gid = seasonConfig[`${d}_r${i}_gid`];
    gids.push(gid || null);
  }
  return gids;
}
