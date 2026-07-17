// F1XL Standings Bot
// Runs twice daily at noon and 6pm UTC

const https = require('https');

const DISCORD_TOKEN        = process.env.DISCORD_TOKEN;
const STANDINGS_CHANNEL_ID = process.env.DISCORD_STANDINGS_CHANNEL_ID;
const CONFIG_SHEET_ID      = '1ThIh7aKlGOuv83v9IJVSGpuspZLl0c9ajE0GJBpuCtk';
const CONFIG_GID           = '0';

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

async function getMessages() {
  const res = await discordRequest('GET', `/channels/${STANDINGS_CHANNEL_ID}/messages?limit=50`);
  return res.status === 200 ? res.body : [];
}

async function postMessage(embed) {
  let attempts = 0;
  while (attempts < 3) {
    const res = await discordRequest('POST', `/channels/${STANDINGS_CHANNEL_ID}/messages`, { embeds: [embed] });
    if (res.status === 200) return;
    if (res.status === 429) { await new Promise(r => setTimeout(r, ((res.body.retry_after||1)+0.1)*1000)); attempts++; }
    else { console.error('Post failed:', res.body); return; }
  }
}

async function editMessage(id, embed) {
  let attempts = 0;
  while (attempts < 3) {
    const res = await discordRequest('PATCH', `/channels/${STANDINGS_CHANNEL_ID}/messages/${id}`, { embeds: [embed] });
    if (res.status === 200) return;
    if (res.status === 429) { await new Promise(r => setTimeout(r, ((res.body.retry_after||1)+0.1)*1000)); attempts++; }
    else { console.error('Edit failed:', res.body); return; }
  }
}

async function loadConfig() {
  const rows = await fetchCSV(CONFIG_SHEET_ID, CONFIG_GID);
  const map = {}; let extraHeaders = [];
  for (const parts of rows) {
    const key = (parts[0]||'').replace(/^"|"$/g,'').trim().toLowerCase();
    const val = (parts[1]||'').replace(/^"|"$/g,'').trim();
    if (['tab gid from this document','new seasons','past seasons','key'].includes(key)) {
      extraHeaders = parts.slice(2).map(h=>h.replace(/^"|"$/g,'').trim().toLowerCase()).filter(h=>h); continue;
    }
    if (!key||!val||key==='value'||key==='hardcoded - dont touch') continue;
    map[key] = val;
    extraHeaders.forEach((hdr,i) => { const extra=(parts[2+i]||'').replace(/^"|"$/g,'').trim(); if(extra) map[key+'__'+hdr]=extra; });
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

async function main() {
  console.log('Standings bot starting...');
  if (!DISCORD_TOKEN||!STANDINGS_CHANNEL_ID) { console.error('Missing env vars'); process.exit(1); }

  const config = await loadConfig();
  const { season, sc } = await getSeasonConfig(config);
  const divisions = parseInt(sc['divisions'])||1;
  console.log(`Season ${season}, Divisions: ${divisions}`);

  const standingPromises = [];
  for (let d=1; d<=divisions; d++) {
    const sheetId=sc[`d${d}_sheet_id`], drvGid=sc[`d${d}_driver_results_gid`];
    standingPromises.push((sheetId&&drvGid) ? fetchCSV(sheetId,drvGid).catch(()=>null) : Promise.resolve(null));
  }

  const [standingResults, existingMessages] = await Promise.all([
    Promise.all(standingPromises),
    getMessages(),
  ]);

  const botMsgs = existingMessages.filter(m=>m.author?.bot&&m.embeds?.length>0).reverse();
  const existingByTitle = {};
  for (const msg of botMsgs) {
    const title=msg.embeds[0]?.title||'';
    if (title) existingByTitle[title]={id:msg.id,desc:msg.embeds[0]?.description||''};
  }

  for (let d=1; d<=divisions; d++) {
    const rows=standingResults[d-1];
    if (!rows) continue;
    let hIdx=-1;
    for (let i=0;i<rows.length;i++) { if((rows[i][0]||'').toLowerCase()==='pos'){hIdx=i;break;} }
    if (hIdx<0) continue;
    const standRows=[];
    for (let i=hIdx+1;i<rows.length;i++) {
      const pos=(rows[i][0]||'').trim(),driver=(rows[i][2]||'').trim(),team=(rows[i][3]||'').trim();
      if (!driver) continue; // unfilled seat (e.g. no Tier 2 driver yet) — skip, don't stop
      let pts='';
      for (let c=rows[i].length-1;c>=4;c--) { if((rows[i][c]||'').trim()){pts=rows[i][c].trim();break;} }
      standRows.push({pos,driver,team,pts});
    }
    if (!standRows.length) continue;
    standRows.sort((a,b)=>(parseFloat((b.pts||'0').replace(/,/g,''))||0)-(parseFloat((a.pts||'0').replace(/,/g,''))||0));
    standRows.forEach((r,i)=>r.pos=String(i+1));
    const tableLines=standRows.slice(0,20).map(r=>`\`${r.pos.padStart(2)}\` ${r.driver} — ${r.team} — **${r.pts}pts**`).join('\n');
    const embed={title:`Division ${d} Standings`,description:tableLines,color:DIV_COLOURS[d]||0x3DCC47,footer:{text:`F1XL Season ${season} · Last updated`},timestamp:new Date().toISOString()};
    const existing=existingByTitle[`Division ${d} Standings`];
    if (existing) {
      if (existing.desc!==tableLines) { console.log(`Editing D${d}`); await editMessage(existing.id,embed); }
      else console.log(`D${d} unchanged`);
    } else { console.log(`Posting D${d}`); await postMessage(embed); }
  }
  console.log('Done.');
}

main().catch(e=>{console.error('Fatal:',e);process.exit(1);});
