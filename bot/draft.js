// F1XL Draft Night Bot — Signing Notifications
// Enable manually on draft night, disable when done
// Run manually via GitHub Actions workflow_dispatch

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
    await httpRequest({
      hostname: 'api.github.com', path: `/gists/${GIST_ID}`, method: 'PATCH',
      headers: { 'Authorization': `token ${GIST_TOKEN}`, 'User-Agent': 'F1XL-Bot', 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    }, { files: { 'state.json': { content: JSON.stringify(state, null, 2) } } });
    console.log('State saved');
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
async function getDivisionDrivers(sheetId, dataGid, div) {
  try {
    const rows = await fetchCSV(sheetId, dataGid);
    const drivers = [];
    for (let i = 1; i <= 22; i++) {
      if (!rows[i]) continue;
      const driver = (rows[i][9]  || '').trim();
      const team   = (rows[i][12] || '').trim();
      const tier   = (rows[i][13] || '').trim();
      if (!driver || !team) continue;
      drivers.push({ name: driver, team, tier, reserve: false, div });
    }
    for (let i = 2; i <= 23; i++) {
      if (!rows[i]) continue;
      const driver = (rows[i][15] || '').trim();
      const tier   = (rows[i][18] || '').trim();
      if (!driver) continue;
      drivers.push({ name: driver, team: 'Reserve', tier, reserve: true, div });
    }
    return drivers;
  } catch(e) { return []; }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('Draft bot starting...');
  if (!DISCORD_TOKEN || !GIST_ID || !GIST_TOKEN) { console.error('Missing env vars'); process.exit(1); }

  const [state, config] = await Promise.all([loadState(), loadConfig()]);
  const prevRoster = state.draft_roster || {};

  const { sc } = await getSeasonConfig(config);
  const divisions = parseInt(sc['divisions']) || 1;

  // Fetch all division drivers in parallel
  const divPromises = [];
  for (let d = 1; d <= divisions; d++) {
    const sheetId = sc[`d${d}_sheet_id`];
    const dataGid = sc[`d${d}_team_info_gid`];
    if (!sheetId || !dataGid) { divPromises.push(Promise.resolve([])); continue; }
    divPromises.push(getDivisionDrivers(sheetId, dataGid, d));
  }

  const divResults = await Promise.all(divPromises);
  const allDrivers = divResults.flat();

  // Build current state map
  const currRoster = {};
  for (const d of allDrivers) {
    currRoster[d.name.toLowerCase()] = { name: d.name, team: d.team, tier: d.tier, div: d.div, reserve: d.reserve };
  }

  // Find new signings
  const newSignings = [];
  for (const [key, curr] of Object.entries(currRoster)) {
    if (!prevRoster[key]) newSignings.push(curr);
  }

  console.log(`New signings: ${newSignings.length}`);

  for (const signing of newSignings) {
    let msg;
    if (signing.reserve) {
      msg = `${signing.name} has been placed as a ${signing.tier || 'Tier ?'} reserve in Division ${signing.div}`;
    } else {
      msg = `${signing.team} have signed ${signing.name} to their ${signing.tier || 'Tier ?'} seat in Division ${signing.div}`;
    }
    console.log(msg);
    await discordPost(msg);
    await new Promise(r => setTimeout(r, 500));
  }

  state.draft_roster = currRoster;
  await saveState(state);
  console.log('Done.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
