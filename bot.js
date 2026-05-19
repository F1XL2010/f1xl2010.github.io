const https = require('https');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const DISCORD_TOKEN       = process.env.DISCORD_TOKEN;
const CHANNEL_ID          = process.env.DISCORD_CHANNEL_ID;
const NOTIFY_CHANNEL_ID   = process.env.DISCORD_NOTIFY_CHANNEL_ID;
const CONFIG_SHEET_ID   = '1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk';
const CONFIG_GID        = '0';

// Division colours matching the site
const DIV_COLOURS = {
  1: 0x8B3A3A, 2: 0x8B6B2E, 3: 0x7A8B2E, 4: 0x2E8B57,
  5: 0x2E7A8B, 6: 0x2E458B, 7: 0x6B2E8B, 8: 0x8B2E6B,
};

// ─── HELPERS ───────────────────────────────────────────────────────────────
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cells = [];
    let cur = '', inQ = false;
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
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const text = await fetchUrl(url);
  if (text.includes('<!DOCTYPE')) throw new Error('Sheet not public');
  return parseCSV(text);
}

// ─── DISCORD API ───────────────────────────────────────────────────────────
function discordRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      method,
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
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

async function getChannelMessages() {
  const res = await discordRequest('GET', `/channels/${CHANNEL_ID}/messages?limit=50`);
  if (res.status !== 200) { console.error('Failed to get messages:', res.body); return []; }
  return res.body;
}

async function sendMessage(embed) {
  const res = await discordRequest('POST', `/channels/${CHANNEL_ID}/messages`, { embeds: [embed] });
  if (res.status !== 200) console.error('Failed to send message:', res.body);
  return res.body;
}

async function editMessage(messageId, embed) {
  const res = await discordRequest('PATCH', `/channels/${CHANNEL_ID}/messages/${messageId}`, { embeds: [embed] });
  if (res.status !== 200) console.error('Failed to edit message:', res.body);
  return res.body;
}

// ─── CONFIG LOADING ────────────────────────────────────────────────────────
async function loadConfig() {
  const rows = await fetchCSV(CONFIG_SHEET_ID, CONFIG_GID);
  const map = {};
  let extraHeaders = [];
  for (const parts of rows) {
    const key = (parts[0] || '').replace(/^"|"$/g, '').trim().toLowerCase();
    const val = (parts[1] || '').replace(/^"|"$/g, '').trim();
    if (key === 'tab gid from this document' || key === 'new seasons' || key === 'past seasons' || key === 'key') {
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

async function getCurrentSeasonConfig(config) {
  // Find highest season number
  let latestSeason = 0, latestGid = null;
  for (const key of Object.keys(config)) {
    const match = key.match(/^s(\d+)_gid$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > latestSeason) { latestSeason = num; latestGid = config[key]; }
    }
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

    // Main drivers — col J(9)=driver, col M(12)=team, col N(13)=tier, rows 2-23 (index 1-22)
    for (let i = 1; i <= 22; i++) {
      if (!rows[i]) continue;
      const driver = (rows[i][9]  || '').trim();
      const team   = (rows[i][12] || '').trim();
      const tier   = (rows[i][13] || '').trim();
      if (!driver || !team) continue;
      if (!teams[team]) teams[team] = { drivers: [], tp: '' };
      teams[team].drivers.push({ name: driver, tier });
    }

    // Reserve drivers — col P(15)=driver, col S(18)=tier, rows 3-24 (index 2-23)
    for (let i = 2; i <= 23; i++) {
      if (!rows[i]) continue;
      const driver = (rows[i][15] || '').trim();
      const tier   = (rows[i][18] || '').trim();
      if (!driver) continue;
      if (!teams['Reserve']) teams['Reserve'] = { drivers: [], tp: '' };
      teams['Reserve'].drivers.push({ name: driver, tier });
    }

    // Pull TP names — col J(9)=TP name, col K(10)=team, header at row 25
    let tpStart = -1;
    for (let i = 0; i < rows.length; i++) {
      if ((rows[i][9] || '').trim().toLowerCase() === 'team principal') {
        tpStart = i + 2;
        break;
      }
    }
    if (tpStart >= 0) {
      const teamLower = {};
      for (const t of Object.keys(teams)) teamLower[t.toLowerCase()] = t;
      for (let i = tpStart; i < rows.length; i++) {
        const tp   = (rows[i][9] || '').trim();
        const team = (rows[i][10] || '').trim().toLowerCase();
        if (!tp || !team) continue;
        const teamKey = teamLower[team];
        if (teamKey) teams[teamKey].tp = tp;
      }
    }

    return Object.entries(teams).map(([team, data]) => ({ team, ...data }));
  } catch (e) {
    console.warn('Failed to load division data:', e.message);
    return [];
  }
}




// ─── SNAPSHOT ──────────────────────────────────────────────────────────────
const fs = require('fs');
const { execSync } = require('child_process');
const SNAPSHOT_FILE = 'roster_snapshot.json';

function loadSnapshot() {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
    }
  } catch(e) {}
  return null;
}

function saveSnapshot(data) {
  try {
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));
    // Commit back to repo so it persists between runs
    execSync('git config user.email "bot@f1xl.co.uk"');
    execSync('git config user.name "F1XL Bot"');
    execSync(`git add ${SNAPSHOT_FILE}`);
    const status = execSync('git status --porcelain').toString().trim();
    if (status) {
      execSync(`git commit -m "chore: update roster snapshot"`);
      execSync('git push');
      console.log('Snapshot committed to repo');
    } else {
      console.log('No snapshot changes to commit');
    }
  } catch(e) {
    console.warn('Failed to save snapshot:', e.message);
  }
}

// ─── CHANGE DETECTION ──────────────────────────────────────────────────────
function detectChanges(prev, curr) {
  const changes = [];
  if (!prev) return changes; // first run — no notifications

  // Build flat driver→{team,tier,div} maps for prev and curr
  function flatten(snapshot) {
    const map = {};
    for (const [divKey, teams] of Object.entries(snapshot)) {
      const div = divKey.replace('div','');
      for (const t of teams) {
        for (const d of t.drivers) {
          const name = typeof d === 'object' ? d.name : d;
          const tier = typeof d === 'object' ? d.tier : '';
          map[name.toLowerCase()] = { name, team: t.team, tier, div };
        }
      }
    }
    return map;
  }

  const prevMap = flatten(prev);
  const currMap = flatten(curr);

  // Check for new drivers and team changes
  for (const [key, curr_d] of Object.entries(currMap)) {
    if (!prevMap[key]) {
      // Brand new driver
      if (curr_d.team === 'Reserve') {
        changes.push({ type: 'new_reserve', driver: curr_d.name, tier: curr_d.tier, div: curr_d.div });
      } else {
        changes.push({ type: 'signed', driver: curr_d.name, team: curr_d.team, tier: curr_d.tier, div: curr_d.div });
      }
    } else {
      const prev_d = prevMap[key];
      if (prev_d.team !== curr_d.team) {
        if (curr_d.team === 'Reserve') {
          // Moved to reserve — fire departure from old team
          changes.push({ type: 'departed', driver: curr_d.name, team: prev_d.team, div: prev_d.div });
        } else if (prev_d.team === 'Reserve') {
          // Promoted from reserve to team
          changes.push({ type: 'signed', driver: curr_d.name, team: curr_d.team, tier: curr_d.tier, div: curr_d.div });
        } else {
          // Moved between teams
          changes.push({ type: 'departed', driver: curr_d.name, team: prev_d.team, div: prev_d.div });
          changes.push({ type: 'signed', driver: curr_d.name, team: curr_d.team, tier: curr_d.tier, div: curr_d.div });
        }
      }
    }
  }

  // Check for drivers completely removed from roster
  for (const [key, prev_d] of Object.entries(prevMap)) {
    if (!currMap[key] && prev_d.team !== 'Reserve') {
      changes.push({ type: 'departed', driver: prev_d.name, team: prev_d.team, div: prev_d.div });
    }
  }

  return changes;
}

// ─── NOTIFICATION MESSAGES ─────────────────────────────────────────────────
// Message templates — edit these to change wording
const TEMPLATES = {
  new_reserve: (c) => ({
    title: `🆕 RESERVE SIGNING`,
    description: `**${c.driver}** joins the F1XL reserve pool\nTier ${c.tier||'?'}`,
    color: 0x3DCC47,
  }),
  signed: (c) => ({
    title: `✍️ SIGNED`,
    description: `**${c.driver}** joins **${c.team}**\nDivision ${c.div} · Tier ${c.tier||'?'}`,
    color: DIV_COLOURS[parseInt(c.div)] || 0x3DCC47,
  }),
  departed: (c) => ({
    title: `🚪 DEPARTURE`,
    description: `**${c.driver}** departs **${c.team}**\nDivision ${c.div}`,
    color: 0x8B0000,
  }),
};

async function sendNotification(change) {
  if (!NOTIFY_CHANNEL_ID) return;
  const template = TEMPLATES[change.type];
  if (!template) return;
  const embed = { ...template(change), timestamp: new Date().toISOString(), footer: { text: 'F1XL Transfers' } };
  const res = await discordRequest('POST', `/channels/${NOTIFY_CHANNEL_ID}/messages`, { embeds: [embed] });
  if (res.status !== 200) console.error('Failed to send notification:', res.body);
  await new Promise(r => setTimeout(r, 500));
}

// ─── BUILD TEAM EMBED ──────────────────────────────────────────────────────
function buildTeamEmbed(team, season) {
  const colour = DIV_COLOURS[team.div] || 0x3DCC47;
  const lines = [];
  if (team.tp) lines.push(`Team Principal: *${team.tp}*`);
  lines.push(`Division ${team.div}`);
  if (team.drivers.length) lines.push(team.drivers.join('\n'));
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
  console.log('F1XL Bot starting...');

  if (!DISCORD_TOKEN || !CHANNEL_ID) {
    console.error('Missing DISCORD_TOKEN or DISCORD_CHANNEL_ID');
    process.exit(1);
  }

  // Load config
  console.log('Loading config...');
  const config = await loadConfig();
  const { season, sc } = await getCurrentSeasonConfig(config);
  console.log(`Current season: ${season}`);

  const divisions = parseInt(sc['divisions']) || 1;
  console.log(`Divisions: ${divisions}`);

  // Collect all teams from all divisions
  const allTeams = [];
  for (let d = 1; d <= divisions; d++) {
    const sheetId = sc[`d${d}_sheet_id`];
    const dataGid = sc[`d${d}_team_info_gid`];
    if (!sheetId || dataGid === undefined || dataGid === '') continue;
    const teams = await getDivisionTeams(sheetId, dataGid);
    teams.forEach(t => allTeams.push({ ...t, div: d }));
    await new Promise(r => setTimeout(r, 300));
  }

  // Sort alphabetically by team name
  allTeams.sort((a, b) => a.team.localeCompare(b.team));
  console.log(`Total teams: ${allTeams.length}`);

  // Build snapshot structure for change detection
  const currSnapshot = {};
  for (let d = 1; d <= divisions; d++) {
    currSnapshot[`div${d}`] = allTeams.filter(t => t.div === d);
  }

  // Detect changes and send notifications
  const prevSnapshot = loadSnapshot();
  if (prevSnapshot) {
    const prevDrivers = Object.values(prevSnapshot).flat().reduce((a,t) => a + (t.drivers||[]).length, 0);
    const currDrivers = allTeams.reduce((a,t) => a + (t.drivers||[]).length, 0);
    console.log(`Prev snapshot drivers: ${prevDrivers}, Current: ${currDrivers}`);
  } else {
    console.log('No previous snapshot — first run, creating baseline');
  }
  const changes = detectChanges(prevSnapshot, currSnapshot);
  console.log(`Changes detected: ${changes.length}`);
  for (const change of changes) {
    console.log(`  ${change.type}: ${change.driver}`);
    await sendNotification(change);
  }
  saveSnapshot(currSnapshot);

  // Get existing bot messages
  console.log('Fetching existing channel messages...');
  const existing = await getChannelMessages();
  const botMessages = existing
    .filter(m => m.author?.bot && m.embeds?.length > 0)
    .reverse(); // oldest first to match posting order

  // Match existing messages to teams by title
  const existingByTeam = {};
  for (const msg of botMessages) {
    const title = msg.embeds[0]?.title || '';
    if (title) existingByTeam[title] = msg.id;
  }

  // Post or update one message per team — only edit if content changed
  for (const team of allTeams) {
    const embed = buildTeamEmbed(team, season);
    if (existingByTeam[team.team]) {
      // Compare current embed description to existing to avoid unnecessary edits
      const existingMsg = botMessages.find(m => m.embeds[0]?.title === team.team);
      const existingDesc = existingMsg?.embeds[0]?.description || '';
      const newDesc = embed.description || '';
      if (existingDesc !== newDesc) {
        console.log(`Editing: ${team.team} (content changed)`);
        await editMessage(existingByTeam[team.team], embed);
        await new Promise(r => setTimeout(r, 500));
      }
    } else {
      console.log(`Posting: ${team.team}`);
      await sendMessage(embed);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('Done.');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
