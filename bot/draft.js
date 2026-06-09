// F1XL Draft Night Bot — Team Signing Notifications
// Runs every 5 minutes during draft night
// Enable workflow on draft night, disable after

const https = require('https');

const DISCORD_TOKEN     = process.env.DISCORD_TOKEN;
const NOTIFY_CHANNEL_ID = process.env.DISCORD_NOTIFY_CHANNEL_ID;
const GIST_ID           = process.env.GIST_ID;
const GIST_TOKEN        = process.env.GIST_TOKEN;
const CONFIG_SHEET_ID   = '1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk';
const CONFIG_GID        = '0';

// ─── HTTP HELPERS ──────────────────────────────────────────────────────────
function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(options, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cells = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && !inQ) { inQ = true; }
      else if (c === '"' && inQ) { if (line[i+1] === '"') { cur += '"'; i++; } else { inQ = false; } }
      else if (c === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  });
}

async function fetchCSV(sheetId, gid) {
  const text = await fetchUrl(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
  if (text.includes('<!DOCTYPE')) throw new Error('Sheet not public');
  return parseCSV(text);
}

// ─── GIST STATE ────────────────────────────────────────────────────────────
async function loadState() {
  try {
    const res = await httpRequest({
      hostname: 'api.github.com', path: `/gists/${GIST_ID}`, method: 'GET',
      headers: { 'Authorization': `token ${GIST_TOKEN}`, 'User-Agent': 'F1XL-Bot', 'Accept': 'application/vnd.github.v3+json' },
    });
    const content = res.body.files?.['state.json']?.content || '{}';
    return JSON.parse(content);
  } catch(e) { return {}; }
}

async function saveState(state) {
  try {
    const res = await httpRequest({
      hostname: 'api.github.com', path: `/gists/${GIST_ID}`, method: 'PATCH',
      headers: { 'Authorization': `token ${GIST_TOKEN}`, 'User-Agent': 'F1XL-Bot', 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    }, { files: { 'state.json': { content: JSON.stringify(state, null, 2) } } });
    if (res.status === 200) console.log('State saved');
    else console.error('State save failed:', res.status, JSON.stringify(res.body).slice(0,100));
  } catch(e) { console.warn('Failed to save state:', e.message); }
}

// ─── DISCORD ───────────────────────────────────────────────────────────────
async function discordPost(content) {
  const res = await httpRequest({
    hostname: 'discord.com', path: `/api/v10/channels/${NOTIFY_CHANNEL_ID}/messages`, method: 'POST',
    headers: { 'Authorization': `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
  }, { content });
  if (res.status !== 200) console.error('Post failed:', res.body);
}

// ─── CONFIG ────────────────────────────────────────────────────────────────
async function loadConfig() {
  const rows = await fetchCSV(CONFIG_SHEET_ID, CONFIG_GID);
  const map = {}; let extraHeaders = [];
  for (const parts of rows) {
    const key = (parts[0] || '').replace(/^"|"$/g, '').trim().toLowerCase();
    const val = (parts[1] || '').replace(/^"|"$/g, '').trim();
    if (['tab gid from this document','new seasons','past seasons','key'].includes(key)) {
      extraHeaders = parts.slice(2).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase()).filter(h => h);
      continue;
    }
    if (!key || !val || key === 'value' || key === 'hardcoded - dont touch') continue;
    map[key] = val;
  }
  return map;
}

async function getSeasonConfig(config) {
  let latestSeason = 0, latestGid = null;
  for (const key of Object.keys(config)) {
    const match = key.match(/^s(\d+)_gid$/);
    if (match) { const n = parseInt(match[1]); if (n > latestSeason) { latestSeason = n; latestGid = config[key]; } }
  }
  if (!latestGid) return { season: latestSeason, sc: {} };
  const rows = await fetchCSV(CONFIG_SHEET_ID, latestGid);
  const sc = {};
  for (const parts of rows) {
    const key = (parts[0] || '').trim().toLowerCase();
    const val = (parts[1] || '').trim();
    if (key && val) sc[key] = val;
  }
  return { season: latestSeason, sc };
}

// ─── TEAM DATA ─────────────────────────────────────────────────────────────
async function getDivisionTeams(sheetId, dataGid, div) {
  try {
    const rows = await fetchCSV(sheetId, dataGid);
    // Map: teamName → [{name, tier}, ...]
    const teams = {};
    for (let i = 1; i <= 22; i++) {
      if (!rows[i]) continue;
      const driver = (rows[i][9]  || '').trim();
      const team   = (rows[i][12] || '').trim();
      const tier   = (rows[i][13] || '').trim();
      if (!driver || !team) continue;
      if (!teams[team]) teams[team] = [];
      teams[team].push({ name: driver, tier, div, reserve: false });
    }
    // Reserves
    for (let i = 2; i <= 23; i++) {
      if (!rows[i]) continue;
      const driver = (rows[i][15] || '').trim();
      const tier   = (rows[i][18] || '').trim();
      if (!driver) continue;
      if (!teams['Reserve']) teams['Reserve'] = [];
      teams['Reserve'].push({ name: driver, tier, div, reserve: true });
    }
    return teams;
  } catch(e) { console.warn('getDivisionTeams failed:', e.message); return {}; }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('Draft bot starting...');
  if (!DISCORD_TOKEN || !GIST_ID || !GIST_TOKEN) { console.error('Missing env vars'); process.exit(1); }

  const [state, config] = await Promise.all([loadState(), loadConfig()]);
  const prevRoster = state.draft_roster || {};

  const { season, sc } = await getSeasonConfig(config);
  const divisions = parseInt(sc['divisions']) || 1;
  console.log(`Season ${season}, Divisions: ${divisions}`);

  // Fetch all division teams in parallel
  const divPromises = [];
  for (let d = 1; d <= divisions; d++) {
    const sheetId = sc[`d${d}_sheet_id`];
    const dataGid = sc[`d${d}_team_info_gid`];
    if (!sheetId || !dataGid) { divPromises.push(Promise.resolve({})); continue; }
    divPromises.push(getDivisionTeams(sheetId, dataGid, d));
  }

  const divResults = await Promise.all(divPromises);

  // Build current roster — keyed by team name, value is array of drivers
  const currRoster = {};
  for (const teamMap of divResults) {
    for (const [team, drivers] of Object.entries(teamMap)) {
      currRoster[team] = drivers;
    }
  }

  // Find new signings by team
  // Compare current drivers against previous state
  const newByTeam = {};

  for (const [team, drivers] of Object.entries(currRoster)) {
    const prevDrivers = prevRoster[team] || [];
    const prevNames = new Set(prevDrivers.map(d => d.name.toLowerCase()));
    const newDrivers = drivers.filter(d => !prevNames.has(d.name.toLowerCase()));
    if (newDrivers.length > 0) {
      newByTeam[team] = newDrivers;
    }
  }

  const teamCount = Object.keys(newByTeam).length;
  console.log(`Teams with new signings: ${teamCount}`);

  // Post one message per team
  for (const [team, drivers] of Object.entries(newByTeam)) {
    const div = drivers[0].div;
    let msg;

    if (team === 'Reserve') {
      // Reserve signings
      const driverList = drivers.map(d => `${d.name} (${d.tier || 'Tier ?'})`).join(' and ');
      msg = `${driverList} ${drivers.length === 1 ? 'has' : 'have'} been placed as ${drivers.length === 1 ? 'a reserve' : 'reserves'} in Division ${div}`;
    } else if (drivers.length === 1) {
      const d = drivers[0];
      msg = `${team} have signed ${d.name} - ${d.tier || 'Tier ?'} to Division ${div}`;
    } else {
      // Two drivers signed to same team
      const d1 = drivers[0], d2 = drivers[1];
      msg = `${team} have signed ${d1.name} - ${d1.tier || 'Tier ?'} and ${d2.name} - ${d2.tier || 'Tier ?'} to Division ${div}`;
    }

    console.log(msg);
    await discordPost(msg);
    await new Promise(r => setTimeout(r, 500));
  }

  // Save updated roster
  state.draft_roster = currRoster;
  await saveState(state);
  console.log('Done.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
