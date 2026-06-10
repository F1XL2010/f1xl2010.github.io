// F1XL Lineups & Calendar Bot
// Runs Monday and Friday at 9am UTC

const https = require('https');

const DISCORD_TOKEN       = process.env.DISCORD_TOKEN;
const CHANNEL_ID          = process.env.DISCORD_CHANNEL_ID;
const CALENDAR_CHANNEL_ID = process.env.DISCORD_CALENDAR_CHANNEL_ID;
const CONFIG_SHEET_ID     = '1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk';
const CONFIG_GID          = '0';

const DIV_COLOURS = {
  1: 0x8B3A3A, 2: 0x8B6B2E, 3: 0x7A8B2E, 4: 0x2E8B57,
  5: 0x2E7A8B, 6: 0x2E458B, 7: 0x6B2E8B, 8: 0x8B2E6B,
};

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
    if (res.status === 429) { await new Promise(r => setTimeout(r, ((res.body.retry_after||1)+0.1)*1000)); attempts++; }
    else { console.error('Post failed:', res.body); return; }
  }
}

async function editMessage(channelId, id, embed) {
  let attempts = 0;
  while (attempts < 3) {
    const res = await discordRequest('PATCH', `/channels/${channelId}/messages/${id}`, { embeds: [embed] });
    if (res.status === 200) return;
    if (res.status === 429) { await new Promise(r => setTimeout(r, ((res.body.retry_after||1)+0.1)*1000)); attempts++; }
    else { console.error('Edit failed:', res.body); return; }
  }
}

async function loadConfig() {
  const rows = await fetchCSV(CONFIG_SHEET_ID, CONFIG_GID);
  const map = {}; let extraHeaders = [];
  for (const parts of rows) {
    const key=(parts[0]||'').replace(/^"|"$/g,'').trim().toLowerCase();
    const val=(parts[1]||'').replace(/^"|"$/g,'').trim();
    if (['tab gid from this document','new seasons','past seasons','key'].includes(key)) {
      extraHeaders=parts.slice(2).map(h=>h.replace(/^"|"$/g,'').trim().toLowerCase()).filter(h=>h); continue;
    }
    if (!key||!val||key==='value'||key==='hardcoded - dont touch') continue;
    map[key]=val;
    extraHeaders.forEach((hdr,i)=>{ const extra=(parts[2+i]||'').replace(/^"|"$/g,'').trim(); if(extra) map[key+'__'+hdr]=extra; });
  }
  return map;
}

async function getSeasonConfig(config) {
  let latestSeason=0, latestGid=null;
  for (const key of Object.keys(config)) {
    const match=key.match(/^s(\d+)_gid$/);
    if (match) { const n=parseInt(match[1]); if(n>latestSeason){latestSeason=n;latestGid=config[key];} }
  }
  if (!latestGid) return { season: latestSeason, sc: {} };
  const rows = await fetchCSV(CONFIG_SHEET_ID, latestGid);
  const sc = {};
  for (const parts of rows) {
    const key=(parts[0]||'').trim().toLowerCase(); const val=(parts[1]||'').trim();
    if (key&&val) sc[key]=val;
  }
  return { season: latestSeason, sc };
}

async function getDivisionTeams(sheetId, dataGid) {
  try {
    const rows = await fetchCSV(sheetId, dataGid);
    const teams = {};
    for (let i=1;i<=22;i++) {
      if (!rows[i]) continue;
      const driver=(rows[i][9]||'').trim(), team=(rows[i][12]||'').trim(), tier=(rows[i][13]||'').trim();
      if (!driver||!team) continue;
      if (!teams[team]) teams[team]={drivers:[],tp:''};
      teams[team].drivers.push({name:driver,tier});
    }
    for (let i=2;i<=23;i++) {
      if (!rows[i]) continue;
      const driver=(rows[i][15]||'').trim(), tier=(rows[i][18]||'').trim();
      if (!driver) continue;
      if (!teams['Reserve']) teams['Reserve']={drivers:[],tp:''};
      teams['Reserve'].drivers.push({name:driver,tier});
    }
    let tpStart=-1;
    for (let i=0;i<rows.length;i++) { if((rows[i][9]||'').trim().toLowerCase()==='team principal'){tpStart=i+2;break;} }
    if (tpStart>=0) {
      const teamLower={};
      for (const t of Object.keys(teams)) teamLower[t.toLowerCase()]=t;
      for (let i=tpStart;i<rows.length;i++) {
        const tp=(rows[i][9]||'').trim(), team=(rows[i][10]||'').trim().toLowerCase();
        if (!tp||!team) continue;
        const key=teamLower[team]; if(key) teams[key].tp=tp;
      }
    }
    return Object.entries(teams).map(([team,data])=>({team,...data}));
  } catch(e) { return []; }
}

function buildLineupEmbed(teamName, divEntries, season) {
  const tp = divEntries.find(e => e.tp)?.tp || '';
  const lines = [];
  if (tp) lines.push(`Team Principal: *${tp}*`);
  divEntries.forEach(e => {
    lines.push(`\n**Division ${e.div}**`);
    if (e.drivers.length) {
      e.drivers.forEach(d => {
        const name = typeof d === 'object' ? d.name : d;
        const tier = typeof d === 'object' && d.tier ? ` (${d.tier})` : '';
        lines.push(`${name}${tier}`);
      });
    } else {
      lines.push('—');
    }
  });
  return {
    title: teamName,
    description: lines.join('\n'),
    color: DIV_COLOURS[divEntries[0]?.div] || 0x3DCC47,
    footer: { text: `F1XL Season ${season}` },
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  console.log('Lineups & Calendar bot starting...');
  if (!DISCORD_TOKEN) { console.error('Missing DISCORD_TOKEN'); process.exit(1); }

  const config = await loadConfig();
  const { season, sc } = await getSeasonConfig(config);
  const divisions = parseInt(sc['divisions'])||1;
  console.log(`Season ${season}, Divisions: ${divisions}`);

  const calSheetId=sc['d1_sheet_id'], calGid=sc['d1_calendar_gid'];

  const divPromises=[];
  for (let d=1;d<=divisions;d++) {
    const sheetId=sc[`d${d}_sheet_id`], dataGid=sc[`d${d}_team_info_gid`];
    divPromises.push((sheetId&&dataGid)?getDivisionTeams(sheetId,dataGid).then(t=>t.map(x=>({...x,div:d}))):Promise.resolve([]));
  }

  const [teamResults, lineupMsgs, calMsgs, calRows] = await Promise.all([
    Promise.all(divPromises),
    getMessages(CHANNEL_ID),
    calSheetId&&calGid ? getMessages(CALENDAR_CHANNEL_ID) : Promise.resolve([]),
    calSheetId&&calGid ? fetchCSV(calSheetId,calGid).catch(()=>null) : Promise.resolve(null),
  ]);

  // ── LINEUPS ──────────────────────────────────────────────────────────────
  const allTeams = teamResults.flat().sort((a,b)=>a.team.localeCompare(b.team));

  // Merge divisions per team — one embed per constructor
  const teamMap = {};
  for (const team of allTeams) {
    const key = team.team.toLowerCase();
    if (!teamMap[key]) teamMap[key] = { name: team.team, divs: [] };
    teamMap[key].divs.push({ div: team.div, drivers: team.drivers, tp: team.tp });
  }
  const mergedTeams = Object.values(teamMap).sort((a, b) => a.name.localeCompare(b.name));
  console.log(`Merged teams: ${mergedTeams.length}`);

  const lineupBotMsgs = lineupMsgs.filter(m=>m.author?.bot&&m.embeds?.length>0).reverse();
  const existingLineups={};
  for (const msg of lineupBotMsgs) {
    const title=msg.embeds[0]?.title||'';
    if (title) existingLineups[title]={id:msg.id,desc:msg.embeds[0]?.description||''};
  }

  for (const team of mergedTeams) {
    const embed = buildLineupEmbed(team.name, team.divs, season);
    const existing = existingLineups[team.name];
    if (existing) {
      if (existing.desc !== embed.description) {
        console.log(`Editing: ${team.name}`);
        await editMessage(CHANNEL_ID, existing.id, embed);
        await new Promise(r => setTimeout(r, 600));
      }
    } else {
      console.log(`Posting: ${team.name}`);
      await postMessage(CHANNEL_ID, embed);
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // ── CALENDAR ─────────────────────────────────────────────────────────────
  if (calRows) {
    const rounds=[];
    for (let i=1;i<calRows.length;i++) {
      const round=(calRows[i][0]||'').trim(), sprint=(calRows[i][1]||'').trim().toLowerCase()==='sprint';
      const date=(calRows[i][2]||'').trim(), track=(calRows[i][3]||'').trim();
      if (!round||!track) continue;
      rounds.push({round,sprint,date,track});
    }
    if (rounds.length) {
      const lines=rounds.map(r=>`**R${r.round}** ${r.track}${r.sprint?' ⚡':''} — ${r.date||'TBC'}`).join('\n');
      const embed={title:`Season ${season} Calendar`,description:lines,color:0xE10600,footer:{text:'⚡ = Sprint Weekend · F1XL'}};
      const calBotMsgs=calMsgs.filter(m=>m.author?.bot&&m.embeds?.length>0);
      const existing=calBotMsgs.find(m=>m.embeds[0]?.title===`Season ${season} Calendar`);
      if (existing) {
        if ((existing.embeds[0]?.description||'')!==lines) { console.log('Editing calendar'); await editMessage(CALENDAR_CHANNEL_ID,existing.id,embed); }
        else console.log('Calendar unchanged');
      } else { console.log('Posting calendar'); await postMessage(CALENDAR_CHANNEL_ID,embed); }
    }
  }

  console.log('Done.');
}

main().catch(e=>{console.error('Fatal:',e);process.exit(1);});
