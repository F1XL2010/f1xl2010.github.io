// F1XL Display Bot — Team Lineups, Standings, Calendar
// Triggered by cron-job.org via GitHub Actions every 30 minutes

const https = require('https');

const DISCORD_TOKEN        = process.env.DISCORD_TOKEN;
const CHANNEL_ID           = process.env.DISCORD_CHANNEL_ID;
const STANDINGS_CHANNEL_ID = process.env.DISCORD_STANDINGS_CHANNEL_ID;
const CALENDAR_CHANNEL_ID  = process.env.DISCORD_CALENDAR_CHANNEL_ID;
const CONFIG_SHEET_ID      = '1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk';
const CONFIG_GID           = '0';

const DIV_COLOURS = {
  1: 0x8B3A3A, 2: 0x8B6B2E, 3: 0x7A8B2E, 4: 0x2E8B57,
  5: 0x2E7A8B, 6: 0x2E458B, 7: 0x6B2E8B, 8: 0x8B2E6B,
};

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

// ─── DISCORD ───────────────────────────────────────────────────────────────
async function discordRequest(method, path, body) {
  return httpRequest({
    hostname: 'discord.com', path: `/api/v10${path}`, method,
    headers: { 'Authorization': `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
  }, body);
}

async function getMessages(channelId) {
  const res = await discordRequest('GET', `/channels/${channelId}/messages?limit=50`);
  return res.status === 200 ? res.body : [];
}

async function postMessage(channelId, embed) {
  let attempts = 0;
  while (attempts < 3) {
    const res = await discordRequest('POST', `/channels/${channelId}/messages`, { embeds: [embed] });
    if (res.status === 200) return;
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, ((res.body.retry_after || 1) + 0.1) * 1000));
      attempts++;
    } else { console.error('Post failed:', res.body); return; }
  }
}

async function editMessage(channelId, id, embed) {
  let attempts = 0;
  while (attempts < 3) {
    const res = await discordRequest('PATCH', `/channels/${channelId}/messages/${id}`, { embeds: [embed] });
    if (res.status === 200) return;
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, ((res.body.retry_after || 1) + 0.1) * 1000));
      attempts++;
    } else { console.error('Edit failed:', res.body); return; }
  }
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

// ─── TEAM DATA ─────────────────────────────────────────────────────────────
async function getDivisionTeams(sheetId, dataGid) {
  try {
    const rows = await fetchCSV(sheetId, dataGid);
    const teams = {};
    for (let i = 1; i <= 22; i++) {
      if (!rows[i]) continue;
      const driver = (rows[i][9]  || '').trim();
      const team   = (rows[i][12] || '').trim();
      const tier   = (rows[i][13] || '').trim();
      if (!driver || !team) continue;
      if (!teams[team]) teams[team] = { drivers: [], tp: '' };
      teams[team].drivers.push({ name: driver, tier });
    }
    for (let i = 2; i <= 23; i++) {
      if (!rows[i]) continue;
      const driver = (rows[i][15] || '').trim();
      const tier   = (rows[i][18] || '').trim();
      if (!driver) continue;
      if (!teams['Reserve']) teams['Reserve'] = { drivers: [], tp: '' };
      teams['Reserve'].drivers.push({ name: driver, tier });
    }
    let tpStart = -1;
    for (let i = 0; i < rows.length; i++) {
      if ((rows[i][9] || '').trim().toLowerCase() === 'team principal') { tpStart = i + 2; break; }
    }
    if (tpStart >= 0) {
      const teamLower = {};
      for (const t of Object.keys(teams)) teamLower[t.toLowerCase()] = t;
      for (let i = tpStart; i < rows.length; i++) {
        const tp   = (rows[i][9]  || '').trim();
        const team = (rows[i][10] || '').trim().toLowerCase();
        if (!tp || !team) continue;
        const key = teamLower[team];
        if (key) teams[key].tp = tp;
      }
    }
    return Object.entries(teams).map(([team, data]) => ({ team, ...data }));
  } catch(e) { console.warn('getDivisionTeams failed:', e.message); return []; }
}

function buildLineupEmbed(team, season) {
  const colour = DIV_COLOURS[team.div] || 0x3DCC47;
  const lines = [];
  if (team.tp) lines.push(`Team Principal: *${team.tp}*`);
  lines.push(`Division ${team.div}`);
  if (team.drivers.length) {
    lines.push(team.drivers.map(d => {
      const name = typeof d === 'object' ? d.name : d;
      const tier = typeof d === 'object' && d.tier ? ` (${d.tier})` : '';
      return `${name}${tier}`;
    }).join('\n'));
  }
  return {
    title: team.team,
    description: lines.join('\n'),
    color: colour,
    footer: { text: `F1XL Season ${season}` },
    timestamp: new Date().toISOString(),
  };
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('Display bot starting...');
  if (!DISCORD_TOKEN) { console.error('Missing DISCORD_TOKEN'); process.exit(1); }

  const config = await loadConfig();
  const { season, sc } = await getSeasonConfig(config);
  const divisions = parseInt(sc['divisions']) || 1;
  console.log(`Season ${season}, Divisions: ${divisions}`);

  // Fetch all data in parallel
  const divTeamPromises = [];
  const divStandingPromises = [];
  for (let d = 1; d <= divisions; d++) {
    const sheetId = sc[`d${d}_sheet_id`];
    const dataGid = sc[`d${d}_team_info_gid`];
    const drvGid  = sc[`d${d}_driver_results_gid`];
    divTeamPromises.push((sheetId && dataGid) ? getDivisionTeams(sheetId, dataGid).then(t => t.map(x => ({...x, div: d}))) : Promise.resolve([]));
    divStandingPromises.push((sheetId && drvGid) ? fetchCSV(sheetId, drvGid).catch(() => null) : Promise.resolve(null));
  }

  const calSheetId = sc['d1_sheet_id'];
  const calGid     = sc['d1_calendar_gid'];

  const [teamResults, standingResults, lineupMsgs, standingsMsgs, calMsgs, calRows] = await Promise.all([
    Promise.all(divTeamPromises),
    Promise.all(divStandingPromises),
    getMessages(CHANNEL_ID),
    getMessages(STANDINGS_CHANNEL_ID),
    calSheetId && calGid ? getMessages(CALENDAR_CHANNEL_ID) : Promise.resolve([]),
    calSheetId && calGid ? fetchCSV(calSheetId, calGid).catch(() => null) : Promise.resolve(null),
  ]);

  // ── TEAM LINEUPS ────────────────────────────────────────────────────────
  const allTeams = teamResults.flat().sort((a, b) => a.team.localeCompare(b.team));
  console.log(`Teams: ${allTeams.length}`);

  const lineupBotMsgs = lineupMsgs.filter(m => m.author?.bot && m.embeds?.length > 0).reverse();
  const existingLineups = {};
  for (const msg of lineupBotMsgs) {
    const title = msg.embeds[0]?.title || '';
    if (title) existingLineups[title] = { id: msg.id, desc: msg.embeds[0]?.description || '' };
  }

  for (const team of allTeams) {
    const embed = buildLineupEmbed(team, season);
    const existing = existingLineups[team.team];
    if (existing) {
      if (existing.desc !== embed.description) {
        console.log(`Editing lineup: ${team.team}`);
        await editMessage(CHANNEL_ID, existing.id, embed);
        await new Promise(r => setTimeout(r, 600));
      }
    } else {
      console.log(`Posting lineup: ${team.team}`);
      await postMessage(CHANNEL_ID, embed);
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // ── STANDINGS ────────────────────────────────────────────────────────────
  const standingsBotMsgs = standingsMsgs.filter(m => m.author?.bot && m.embeds?.length > 0).reverse();
  const existingStandings = {};
  for (const msg of standingsBotMsgs) {
    const title = msg.embeds[0]?.title || '';
    if (title) existingStandings[title] = { id: msg.id, desc: msg.embeds[0]?.description || '' };
  }

  for (let d = 1; d <= divisions; d++) {
    const rows = standingResults[d-1];
    if (!rows) continue;
    let hIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if ((rows[i][0]||'').toLowerCase() === 'pos') { hIdx = i; break; }
    }
    if (hIdx < 0) continue;
    const standRows = [];
    for (let i = hIdx+1; i < rows.length; i++) {
      const pos = (rows[i][0]||'').trim(), driver = (rows[i][2]||'').trim(), team = (rows[i][3]||'').trim();
      if (!pos || !driver) break;
      let pts = '';
      for (let c = rows[i].length-1; c >= 4; c--) { if ((rows[i][c]||'').trim()) { pts = rows[i][c].trim(); break; } }
      standRows.push({ pos, driver, team, pts });
    }
    if (!standRows.length) continue;
    standRows.sort((a, b) => (parseFloat((b.pts||'0').replace(/,/g,''))||0) - (parseFloat((a.pts||'0').replace(/,/g,''))||0));
    standRows.forEach((r, i) => r.pos = String(i + 1));
    const tableLines = standRows.slice(0, 20).map(r => `\`${r.pos.padStart(2)}\` ${r.driver} — ${r.team} — **${r.pts}pts**`).join('\n');
    const embed = { title: `Division ${d} Standings`, description: tableLines, color: DIV_COLOURS[d] || 0x3DCC47, footer: { text: `F1XL Season ${season} · Last updated` }, timestamp: new Date().toISOString() };
    const existing = existingStandings[`Division ${d} Standings`];
    if (existing) {
      if (existing.desc !== tableLines) { console.log(`Editing standings D${d}`); await editMessage(STANDINGS_CHANNEL_ID, existing.id, embed); }
      else console.log(`Standings D${d} unchanged`);
    } else { console.log(`Posting standings D${d}`); await postMessage(STANDINGS_CHANNEL_ID, embed); }
  }

  // ── CALENDAR ─────────────────────────────────────────────────────────────
  if (calRows) {
    const rounds = [];
    for (let i = 1; i < calRows.length; i++) {
      const round = (calRows[i][0]||'').trim(), sprint = (calRows[i][1]||'').trim().toLowerCase()==='sprint';
      const date = (calRows[i][2]||'').trim(), track = (calRows[i][3]||'').trim();
      if (!round || !track) continue;
      rounds.push({ round, sprint, date, track });
    }
    if (rounds.length) {
      const lines = rounds.map(r => `**R${r.round}** ${r.track}${r.sprint?' ⚡':''} — ${r.date||'TBC'}`).join('\n');
      const embed = { title: `Season ${season} Calendar`, description: lines, color: 0xE10600, footer: { text: '⚡ = Sprint Weekend · F1XL' } };
      const calBotMsgs = calMsgs.filter(m => m.author?.bot && m.embeds?.length > 0);
      const existing = calBotMsgs.find(m => m.embeds[0]?.title === `Season ${season} Calendar`);
      if (existing) {
        if ((existing.embeds[0]?.description||'') !== lines) { console.log('Editing calendar'); await editMessage(CALENDAR_CHANNEL_ID, existing.id, embed); }
        else console.log('Calendar unchanged');
      } else { console.log('Posting calendar'); await postMessage(CALENDAR_CHANNEL_ID, embed); }
    }
  }

  console.log('Done.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
