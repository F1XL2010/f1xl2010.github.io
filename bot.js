const https = require('https');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const DISCORD_TOKEN     = process.env.DISCORD_TOKEN;
const CHANNEL_ID        = process.env.DISCORD_CHANNEL_ID;
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
    // Find header row — look for 'Driver' in col A
    let hdrIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if ((rows[i][0] || '').trim().toLowerCase() === 'driver') { hdrIdx = i; break; }
    }
    if (hdrIdx < 0) return [];

    // Col A=Driver, Col C=Abbreviation, Col D=Team, Col E=Tier
    const teams = {};
    for (let i = hdrIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const driver = (r[0] || '').trim();
      const team   = (r[3] || '').trim();
      const tier   = (r[4] || '').trim();
      if (!driver || !team) continue;
      if (!teams[team]) teams[team] = { drivers: [], tier };
      teams[team].drivers.push(driver);
    }
    return Object.entries(teams).map(([team, data]) => ({ team, ...data }));
  } catch (e) {
    console.warn('Failed to load division data:', e.message);
    return [];
  }
}

// ─── BUILD EMBED ───────────────────────────────────────────────────────────
function buildEmbed(divNum, season, teams) {
  const colour = DIV_COLOURS[divNum] || 0x3DCC47;

  if (!teams.length) {
    return {
      title: `Division ${divNum}`,
      description: '*No team data available yet.*',
      color: colour,
      footer: { text: `F1XL Season ${season} · Division ${divNum}` },
    };
  }

  // Group by tier if tiers exist
  const hasTiers = teams.some(t => t.tier);
  let fields = [];

  if (hasTiers) {
    const byTier = {};
    teams.forEach(t => {
      const tier = t.tier || 'Other';
      if (!byTier[tier]) byTier[tier] = [];
      byTier[tier].push(t);
    });
    for (const [tier, tierTeams] of Object.entries(byTier)) {
      const value = tierTeams.map(t =>
        `**${t.team}**\n${t.drivers.join(' · ')}`
      ).join('\n\n');
      fields.push({ name: tier, value: value || '—', inline: false });
    }
  } else {
    // All teams in one field
    const value = teams.map(t =>
      `**${t.team}**\n${t.drivers.join(' · ')}`
    ).join('\n\n');
    // Discord field value limit is 1024 chars — split if needed
    if (value.length <= 1024) {
      fields.push({ name: 'Teams', value, inline: false });
    } else {
      // Split into two columns
      const half = Math.ceil(teams.length / 2);
      const left  = teams.slice(0, half).map(t => `**${t.team}**\n${t.drivers.join(' · ')}`).join('\n\n');
      const right = teams.slice(half).map(t => `**${t.team}**\n${t.drivers.join(' · ')}`).join('\n\n');
      fields.push({ name: '\u200b', value: left || '—', inline: true });
      fields.push({ name: '\u200b', value: right || '—', inline: true });
    }
  }

  return {
    title: `Division ${divNum}`,
    color: colour,
    fields,
    footer: { text: `F1XL Season ${season} · Last updated` },
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

  // Find active divisions
  const divisions = parseInt(sc['divisions']) || 1;
  console.log(`Divisions: ${divisions}`);

  // Get existing bot messages in channel (to edit rather than repost)
  console.log('Fetching existing channel messages...');
  const existing = await getChannelMessages();

  // Filter to messages from our bot that have embeds with division titles
  const botMessages = existing.filter(m => m.author?.bot && m.embeds?.length > 0);

  // Map division number → existing message ID
  const existingByDiv = {};
  for (const msg of botMessages) {
    const title = msg.embeds[0]?.title || '';
    const match = title.match(/Division (\d+)/i);
    if (match) existingByDiv[parseInt(match[1])] = msg.id;
  }

  // Process each division
  for (let d = 1; d <= divisions; d++) {
    const sheetId = sc[`d${d}_sheet_id`];
    const dataGid = sc[`d${d}_team_info_gid`];

    console.log(`Division ${d}: sheet=${sheetId}, gid=${dataGid}`);

    let teams = [];
    if (sheetId && dataGid !== undefined && dataGid !== '') {
      teams = await getDivisionTeams(sheetId, dataGid);
    }

    const embed = buildEmbed(d, season, teams);

    if (existingByDiv[d]) {
      console.log(`Editing existing message for Division ${d}`);
      await editMessage(existingByDiv[d], embed);
    } else {
      console.log(`Posting new message for Division ${d}`);
      await sendMessage(embed);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('Done.');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
