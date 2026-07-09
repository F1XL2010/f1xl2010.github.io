// F1XL Notifications Bot — Tickets & Bans
// Triggered by cron-job.org via GitHub Actions every 10 minutes

const https = require('https');

const DISCORD_TOKEN      = process.env.DISCORD_TOKEN;
const TICKETS_CHANNEL_ID = process.env.DISCORD_TICKETS_CHANNEL_ID;
const BANS_CHANNEL_ID    = process.env.DISCORD_BANS_CHANNEL_ID;
const GIST_ID            = process.env.GIST_ID;
const GIST_TOKEN         = process.env.GIST_TOKEN;
const CONFIG_SHEET_ID    = '1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk';
const CONFIG_GID         = '0';
const COORDINATOR_ROLES  = [1,2,3,4,5,6,7,8].map(d => process.env[`DISCORD_DIV${d}_COORDINATOR_ROLE`]).filter(Boolean);

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

async function fetchCSVRange(sheetId, gid, range) {
  const text = await fetchUrl(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&range=${range}`);
  if (text.includes('<!DOCTYPE')) throw new Error('Sheet not public');
  return parseCSV(text);
}

// ─── GIST STATE ────────────────────────────────────────────────────────────
async function loadState() {
  try {
    const res = await httpRequest({
      hostname: 'api.github.com',
      path: `/gists/${GIST_ID}`,
      method: 'GET',
      headers: { 'Authorization': `token ${GIST_TOKEN}`, 'User-Agent': 'F1XL-Bot', 'Accept': 'application/vnd.github.v3+json' },
    });
    const content = res.body.files?.['state.json']?.content || '{}';
    console.log('Loaded state from Gist:', content.slice(0, 200));
    return JSON.parse(content);
  } catch(e) { console.warn('Failed to load state:', e.message); return {}; }
}

async function saveState(state) {
  try {
    console.log('Saving state:', JSON.stringify(state));
    const res = await httpRequest({
      hostname: 'api.github.com',
      path: `/gists/${GIST_ID}`,
      method: 'PATCH',
      headers: { 'Authorization': `token ${GIST_TOKEN}`, 'User-Agent': 'F1XL-Bot', 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    }, { files: { 'state.json': { content: JSON.stringify(state, null, 2) } } });
    if (res.status === 200) {
      const savedContent = res.body.files?.['state.json']?.content || 'unknown';
      console.log('State saved — Gist now contains:', savedContent.slice(0, 200));
    } else {
      console.error('Failed to save state — HTTP', res.status, JSON.stringify(res.body).slice(0, 200));
    }
  } catch(e) { console.warn('Failed to save state:', e.message); }
}

// ─── DISCORD ───────────────────────────────────────────────────────────────
async function discordPost(channelId, content) {
  const res = await httpRequest({
    hostname: 'discord.com',
    path: `/api/v10/channels/${channelId}/messages`,
    method: 'POST',
    headers: { 'Authorization': `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
  }, { content });
  if (res.status !== 200) console.error('Discord post failed:', res.body);
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
    extraHeaders.forEach((hdr, i) => {
      const extra = (parts[2 + i] || '').replace(/^"|"$/g, '').trim();
      if (extra) map[key + '__' + hdr] = extra;
    });
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

// ─── TIMEZONE ──────────────────────────────────────────────────────────────
function getUKTimezone(ts) {
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const bstStart = new Date(Date.UTC(year, 2, 31));
  bstStart.setUTCDate(31 - bstStart.getUTCDay());
  const bstEnd = new Date(Date.UTC(year, 9, 31));
  bstEnd.setUTCDate(31 - bstEnd.getUTCDay());
  return d >= bstStart && d < bstEnd ? { label: 'BST', offset: 1 } : { label: 'GMT', offset: 0 };
}

function formatDeadline(ts) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const tz = getUKTimezone(ts);
  const d = new Date(ts + tz.offset * 3600000);
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]} at ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} ${tz.label}`;
}

function isSunday8pm() {
  const tz = getUKTimezone(Date.now());
  const local = new Date(Date.now() + tz.offset * 3600000);
  return local.getUTCDay() === 0 && local.getUTCHours() === 20 && local.getUTCMinutes() < 10;
}

async function getLatestTrack(sc) {
  try {
    const rows = await fetchCSV(sc['d1_sheet_id'], sc['d1_calendar_gid']);
    let lastTrack = '';
    let lastDate = -Infinity;
    const now = Date.now();
    for (let i = 1; i < rows.length; i++) {
      const track   = (rows[i][3] || '').trim();
      const dateStr = (rows[i][2] || '').trim();
      if (!track || !dateStr) continue;
      const parsed = Date.parse(dateStr);
      // Only count rounds that have actually happened — skip future rounds
      // still sitting pre-filled in the calendar (e.g. the season finale).
      // If a date can't be parsed, fall back to treating it as "most recent
      // filled row so far" rather than silently skipping it.
      if (!isNaN(parsed)) {
        if (parsed <= now && parsed > lastDate) { lastDate = parsed; lastTrack = track; }
      } else {
        lastTrack = track;
      }
    }
    return lastTrack || 'latest race';
  } catch(e) { return 'latest race'; }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('Notifications bot starting...');
  if (!DISCORD_TOKEN || !GIST_ID || !GIST_TOKEN) { console.error('Missing env vars'); process.exit(1); }

  const [state, config] = await Promise.all([loadState(), loadConfig()]);
  const prevTickets = state.tickets || { ticketRows: 0, appealRows: 0 };
  const prevBans    = state.bans    || { count: 0 };

  const { season, sc } = await getSeasonConfig(config);
  const divisions = parseInt(sc['divisions']) || 1;
  console.log(`Season ${season}, Divisions: ${divisions}`);

  let stateChanged = false;

  // ── TICKETS ──────────────────────────────────────────────────────────────
  const ticketSheetId = config['ticket_outcomes_sheet'];
  const ticketGid     = config['ticket_outcomes_gid'];

  if (ticketSheetId && ticketGid && TICKETS_CHANNEL_ID) {
    try {
      const [colA, colAB] = await Promise.all([
        fetchCSVRange(ticketSheetId, ticketGid, 'A:A'),
        fetchCSVRange(ticketSheetId, ticketGid, 'AB:AB'),
      ]);
      let ticketRows = 0, appealRows = 0;
      for (let i = 1; i < colA.length; i++)  if ((colA[i][0]||'').trim())  ticketRows++;
      for (let i = 1; i < colAB.length; i++) if ((colAB[i][0]||'').trim()) appealRows++;
      console.log(`Tickets: ${ticketRows} (prev: ${prevTickets.ticketRows}), Appeals: ${appealRows} (prev: ${prevTickets.appealRows})`);

      if (ticketRows > prevTickets.ticketRows) {
        const track    = await getLatestTrack(sc);
        const deadline = formatDeadline(Date.now() + 24 * 3600000);
        await discordPost(TICKETS_CHANNEL_ID,
          `@everyone Ticket outcomes posted for ${track}. Appeals to be submitted by ${deadline} https://f1xl.co.uk/ticket-outcomes.html`
        );
        console.log('Ticket announcement sent');
        state.tickets = { ticketRows, appealRows: prevTickets.appealRows };
        stateChanged = true;
      }

      if (appealRows > prevTickets.appealRows) {
        const track = await getLatestTrack(sc);
        await discordPost(TICKETS_CHANNEL_ID,
          `@everyone Appeals outcomes posted for ${track} - All results also updated for all tickets and tables. https://f1xl.co.uk/ticket-outcomes.html`
        );
        console.log('Appeal announcement sent');
        state.tickets = { ticketRows, appealRows };
        stateChanged = true;
      }
    } catch(e) { console.warn('Ticket check failed:', e.message); }
  }

  // ── BANS ─────────────────────────────────────────────────────────────────
  const bansSheetId = config['drivers_licence_sheet_id'];
  const bansGid     = config['drivers_licence_bans_gid'];

  if (bansSheetId && bansGid && BANS_CHANNEL_ID) {
    try {
      const rows = await fetchCSV(bansSheetId, bansGid);
      const bans = [];
      for (let i = 1; i < rows.length; i++) {
        const driver = (rows[i][1] || '').trim();
        const ban    = (rows[i][2] || '').trim();
        if (!driver) continue;
        bans.push({ driver, ban });
      }
      const newCount = bans.length;
      console.log(`Bans: ${newCount} (prev: ${prevBans.count})`);

      if (newCount > prevBans.count && isSunday8pm()) {
        const newBans = bans.slice(prevBans.count);
        const roles   = COORDINATOR_ROLES.slice(0, divisions).map(id => `<@&${id}>`).join(' ');
        const lines   = newBans.map(b => `• **${b.driver}** — ${b.ban}`).join('\n');
        await discordPost(BANS_CHANNEL_ID,
          `${roles}\n🚫 **Outstanding Bans Update**\n${lines}\nhttps://f1xl.co.uk/drivers-licence.html`
        );
        console.log(`Ban notification sent for ${newBans.length} ban(s)`);
      } else if (newCount > prevBans.count) {
        console.log('New bans — will post Sunday 8pm');
      }

      if (newCount !== prevBans.count) {
        state.bans = { count: newCount };
        stateChanged = true;
      }
    } catch(e) { console.warn('Ban check failed:', e.message); }
  }

  if (stateChanged) await saveState(state);
  console.log('Done.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
