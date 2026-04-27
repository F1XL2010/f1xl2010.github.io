// F1XL Website Config Loader
// Main tab: past season GID registry only
// All season-specific data lives in individual season tabs

const F1XL_CONFIG_SHEET_ID = '1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk';
const F1XL_CONFIG_GID = '0';

let _configCache = null;
let _configPromise = null;

function splitCSVLine(line) {
  const parts = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { parts.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  parts.push(cur.trim());
  return parts;
}

function parseConfigCSV(text) {
  const map = {};
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return map;

  // Read extra column headers from row 0 (cols 2+)
  const headerParts = splitCSVLine(lines[0]);
  const extraHeaders = headerParts.slice(2).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase()).filter(h => h);

  for (let li = 1; li < lines.length; li++) {
    const parts = splitCSVLine(lines[li]);
    const key = (parts[0] || '').replace(/^"|"$/g, '').trim().toLowerCase();
    const val = (parts[1] || '').replace(/^"|"$/g, '').trim();
    if (!key || !val) continue;
    if (key === 'key' || key === 'value' || key === 'past seasons' || key === 'new seasons' || key === 'tab gid from this document') continue;
    map[key] = val;
    // Store extra columns keyed as e.g. s26_gid__overall_gid
    extraHeaders.forEach((hdr, i) => {
      const extra = (parts[2 + i] || '').replace(/^"|"$/g, '').trim();
      if (extra) map[key + '__' + hdr] = extra;
    });
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
    const sc = parseConfigCSV(text);
    // Merge any extra main-config columns (e.g. overall_gid, w_totals_gid) into sc
    for (const k of Object.keys(config)) {
      if (k.startsWith(key + '__')) {
        const subKey = k.slice(key.length + 2); // strip "s26_gid__"
        if (!(subKey in sc)) sc[subKey] = config[k];
      }
    }
    return sc;
  } catch(e) {
    console.warn('Season config load failed for season', season, e.message);
    return null;
  }
}

// Returns the current (newest) season number from the 'new seasons' section
async function getCurrentSeason() {
  const config = await loadConfig();
  // Find the highest season number that has a 'new seasons' entry
  // These are stored the same as past seasons — just find the highest s{N}_gid
  // that appears in the config (getAllSeasons returns them sorted newest first)
  const seasons = await getAllSeasons();
  return seasons.length ? seasons[0].season : null;
}

// Load config for the current (newest) season
async function getCurrentSeasonConfig() {
  const season = await getCurrentSeason();
  if (!season) return null;
  return await loadSeasonConfig(season);
}

// Get a global config value (ticket outcomes, track records, drivers licence etc.)
async function getConfigValue(key) {
  const config = await loadConfig();
  return config[key.toLowerCase()] || null;
}

// F1 2025 Team Colours
const TEAM_COLOURS = {
  'McLaren':           '#EF8733',
  'Mercedes':          '#75F1D3',
  'Red Bull Racing':   '#4570C0',
  'Ferrari':           '#D52E37',
  'Williams':          '#3267D4',
  'VCARB':             '#7091F8',
  'Aston Martin':      '#4B9774',
  'Haas':              '#DFE1E2',
  'Audi':              '#EB4526',
  'Alpine':            '#479FE2',
  'Cadillac':          '#AAAADD',
};

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
