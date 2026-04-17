// F1XL Website Config Loader
// Main tab: past season GID registry only
// All season-specific data lives in individual season tabs

const F1XL_CONFIG_SHEET_ID = '1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk';
const F1XL_CONFIG_GID = '0';

let _configCache = null;
let _configPromise = null;

function parseConfigCSV(text) {
  const map = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
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
    if (!key || !val) continue;
    if (key === 'key' || key === 'value' || key === 'past seasons' || key === 'tab gid from this document') continue;
    map[key] = val;
  }
  return map;
}

async function loadConfig() {
  if (_configCache) return _configCache;
  if (_configPromise) return _configPromise;
  _configPromise = (async () => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${F1XL_CONFIG_SHEET_ID}/export?format=csv&gid=${F1XL_CONFIG_GID}`;
      const res = await fetch(url);
      const text = await res.text();
      const config = parseConfigCSV(text);
      _configCache = config;
      return config;
    } catch(e) {
      console.error('Config load failed:', e.message);
      return {};
    }
  })();
  return _configPromise;
}

// Returns array of {season, gid} objects, sorted newest first
async function getAllSeasons() {
  const config = await loadConfig();
  const seasons = [];
  for (const key of Object.keys(config)) {
    const match = key.match(/^s(\d+(?:_\d+)?)_gid$/);
    if (match && config[key]) {
      const num = parseFloat(match[1].replace('_', '.'));
      if (!isNaN(num)) seasons.push({ season: num, gid: config[key] });
    }
  }
  return seasons.sort((a, b) => b.season - a.season);
}

// Load a specific season's config tab by season number
async function loadSeasonConfig(season) {
  const config = await loadConfig();
  const key = 's' + String(season).replace('.', '_') + '_gid';
  const gid = config[key];
  if (!gid) return null;
  try {
    const url = `https://docs.google.com/spreadsheets/d/${F1XL_CONFIG_SHEET_ID}/export?format=csv&gid=${gid}`;
    const res = await fetch(url);
    const text = await res.text();
    if (text.includes('<!DOCTYPE')) return null;
    return parseConfigCSV(text);
  } catch(e) {
    console.warn('Season config load failed for season', season, e.message);
    return null;
  }
}

// Get race GIDs array for a season/division (returns array of gid|null per round)
function getRaceGIDs(seasonConfig, division) {
  const d = 'd' + division;
  const gids = [];
  for (let i = 1; i <= 21; i++) {
    const gid = seasonConfig[d + '_r' + i + '_gid'];
    gids.push(gid || null);
  }
  return gids;
}
