// F1XL next-generation website configuration loader.
// Mirrors the current one-workbook, one-season-tab Website Config pattern.
// Until the TEST Config ID is inserted, the Season 1000 fallback remains.

const F1XL_NEXT_CONFIG_SHEET_ID = '1tmTdmjPRXF23Ixj3p_-nxsfIqv76MUIUET7Qht2qfdg';
const F1XL_NEXT_CONFIG_GID = '0';
const F1XL_NEXT_FALLBACK = Object.freeze({
  season:'1000', divisions:'2',
  d1_sheet_id:'1HijQYeegNmq5UShFt8h7dtpFQamhRylrIH2NRuvC3-4', d1_has_standings:'yes', d1_has_results:'yes', d1_driver_results_gid:'595089088', d1_constructors_gid:'1457486856', d1_driver_stats_gid:'799244598', d1_team_stats_gid:'434550697', d1_team_info_gid:'95446837', d1_r1_gid:'845841913', d1_r2_gid:'670523372', d1_r3_gid:'264449523',
  d2_sheet_id:'10PgQXUV3_6F2GCIcsQgPY1yWhh6-4ZeKxqU_RJ-wc7k', d2_has_standings:'yes', d2_has_results:'yes', d2_driver_results_gid:'595089088', d2_constructors_gid:'1457486856', d2_driver_stats_gid:'799244598', d2_team_stats_gid:'434550697', d2_team_info_gid:'95446837', d2_r1_gid:'845841913', d2_r2_gid:'670523372', d2_r3_gid:'264449523',
  overall_gid:'', w_totals_gid:'', teams_and_principals_gid:'', calendar_gid:''
});

let nextMainCache=null, nextSeasonCache=null, nextConfigCache=null;
let nextContentSeasonCache=null, nextContentConfigCache=null;
const nextConfigBySeason={};
function nextSplitCSVLine(line){const cells=[];let current='',quoted=false;for(let index=0;index<line.length;index+=1){const character=line[index];if(character==='"'){if(quoted&&line[index+1]==='"'){current+='"';index+=1;}else quoted=!quoted;}else if(character===','&&!quoted){cells.push(current.trim());current='';}else current+=character;}cells.push(current.trim());return cells;}
function nextParseCSV(text){return text.split(/\r?\n/).filter(function(line){return line.trim();}).map(nextSplitCSVLine);}
async function nextFetchGid(gid){const response=await fetch('https://docs.google.com/spreadsheets/d/'+F1XL_NEXT_CONFIG_SHEET_ID+'/export?format=csv&gid='+gid);if(!response.ok)throw new Error('TEST Website Config returned HTTP '+response.status);const text=await response.text();if(text.includes('<!DOCTYPE')||text.includes('<html'))throw new Error('TEST Website Config is not publicly readable');return nextParseCSV(text);}

async function nextLoadMain(){
  if(nextMainCache)return nextMainCache;
  if(!F1XL_NEXT_CONFIG_SHEET_ID)return {};
  const rows=await nextFetchGid(F1XL_NEXT_CONFIG_GID);const map={};let extra=[];
  rows.forEach(function(parts){const key=String(parts[0]||'').trim().toLowerCase();const value=String(parts[1]||'').trim();if(key==='new seasons'||key==='past seasons'||key==='key'){extra=parts.slice(2).map(function(item){return String(item||'').trim().toLowerCase();});return;}if(!key||key==='value')return;if(value)map[key]=value;extra.forEach(function(header,index){const item=String(parts[index+2]||'').trim();if(header&&item)map[key+'__'+header]=item;});});
  nextMainCache=map;return map;
}

// Compatibility with the live pages. The TEST site can reuse the live page
// presentation while every read still goes through the TEST Website Config.
async function loadConfig(){return nextLoadMain();}

async function getCurrentSeason(){
  if(nextSeasonCache!==null)return nextSeasonCache;
  if(!F1XL_NEXT_CONFIG_SHEET_ID){nextSeasonCache=Number(F1XL_NEXT_FALLBACK.season);return nextSeasonCache;}
  try{const main=await nextLoadMain();const phase=String(main.test_season_phase||'').toLowerCase();if(phase==='offseason'||phase==='postseason'){nextSeasonCache=null;return null;}const explicit=String(main.active_test_season||'');if(/^\d+(?:\.5)?$/.test(explicit)&&main['s'+explicit.replace('.','_')+'_gid']){nextSeasonCache=Number(explicit);return nextSeasonCache;}const seasons=Object.keys(main).map(function(key){const match=key.match(/^s(\d+(?:_\d+)?)_gid$/);return match?Number(match[1].replace('_','.')):null;}).filter(function(value){return value!==null&&!Number.isNaN(value);}).sort(function(a,b){return b-a;});nextSeasonCache=seasons.length?seasons[0]:null;return nextSeasonCache;}catch(error){console.warn('TEST Website Config lookup failed; using local fallback.',error.message);nextSeasonCache=Number(F1XL_NEXT_FALLBACK.season);return nextSeasonCache;}
}

async function getContentSeason(){
  if(nextContentSeasonCache!==null)return nextContentSeasonCache||null;
  const current=await getCurrentSeason();if(current){nextContentSeasonCache=current;return current;}
  try{const main=await nextLoadMain();const completed=String(main.latest_completed_test_season||'');if(/^\d+(?:\.5)?$/.test(completed)&&main['s'+completed.replace('.','_')+'_gid']){nextContentSeasonCache=Number(completed);return nextContentSeasonCache;}const seasons=await getAllSeasons();nextContentSeasonCache=seasons.length?seasons[0].season:'';return nextContentSeasonCache||null;}catch(error){return null;}
}

async function getAllSeasons(){
  if(!F1XL_NEXT_CONFIG_SHEET_ID)return [{season:Number(F1XL_NEXT_FALLBACK.season),gid:'fallback'}];
  try{const main=await nextLoadMain();return Object.keys(main).map(function(key){const match=key.match(/^s(\d+(?:_\d+)?)_gid$/);return match?{season:Number(match[1].replace('_','.')),gid:main[key]}:null;}).filter(Boolean).sort(function(a,b){return b.season-a.season;});}catch(error){return [{season:Number(F1XL_NEXT_FALLBACK.season),gid:'fallback'}];}
}

async function loadSeasonConfig(season){
  const cacheKey=String(season);
  if(nextConfigBySeason[cacheKey])return nextConfigBySeason[cacheKey];
  if(!F1XL_NEXT_CONFIG_SHEET_ID){const fallback=Object.assign({},F1XL_NEXT_FALLBACK);nextConfigBySeason[cacheKey]=fallback;return fallback;}
  const main=await nextLoadMain();const key='s'+String(season).replace('.','_')+'_gid';const gid=main[key];if(!gid)return null;
  const rows=await nextFetchGid(gid);const config={season:String(season)};
  rows.forEach(function(row){const name=String(row[0]||'').trim().toLowerCase();const value=String(row[1]==null?'':row[1]).trim();if(name&&name!=='value'&&!/^season\s/.test(name))config[name]=value;});
  Object.keys(main).forEach(function(name){if(name.indexOf(key+'__')===0){const short=name.slice(key.length+2);if(!(short in config))config[short]=main[name];}});
  config.master_team_sheet_id=config.season_master_sheet_id||'';config.master_team_sheet=config.teams_and_principals_gid||'';nextConfigBySeason[cacheKey]=config;return config;
}

async function getCurrentSeasonConfig(){
  if(nextConfigCache)return nextConfigCache;
  if(!F1XL_NEXT_CONFIG_SHEET_ID){nextConfigCache=Object.assign({},F1XL_NEXT_FALLBACK);return nextConfigCache;}
  try{const season=await getCurrentSeason();if(!season)return null;nextConfigCache=await loadSeasonConfig(season);return nextConfigCache;}catch(error){console.warn('TEST season config lookup failed; using local fallback.',error.message);nextConfigCache=Object.assign({},F1XL_NEXT_FALLBACK);return nextConfigCache;}
}
async function getContentSeasonConfig(){if(nextContentConfigCache)return nextContentConfigCache;const season=await getContentSeason();if(!season)return null;nextContentConfigCache=await loadSeasonConfig(season);return nextContentConfigCache;}

// Direct-source seasons combine the same division calculations in the browser.
// This avoids waiting for the private Master's cross-workbook total imports.
// Historical configurations keep their original fetch path.
const nextDirectTables=new Map(),nextDirectReads=new Map();
function nextWriteCSV(rows){const width=Math.max(...rows.map(r=>r.length));return rows.map(row=>Array.from({length:width},(_,i)=>'"'+String(row[i]==null?'':row[i]).replace(/"/g,'""')+'"').join(',')).join('\n');}
async function nextDirectRead(id,gid){
  const key=id+':'+gid;
  if(!nextDirectReads.has(key))nextDirectReads.set(key,(async()=>{
    const response=await fetch('https://docs.google.com/spreadsheets/d/'+id+'/export?format=csv&gid='+gid);
    if(!response.ok)throw Error('Working sheet returned HTTP '+response.status);
    const text=await response.text();if(/<!doctype|<html/i.test(text))throw Error('Working sheet is not publicly readable');
    return nextParseCSV(text);
  })().catch(e=>{nextDirectReads.delete(key);throw e;}));
  return nextDirectReads.get(key);
}
async function nextDirectTotals(config){
  const key=String(config.season);
  if(!nextDirectTables.has(key))nextDirectTables.set(key,(async()=>{
    const count=Number(config.divisions);if(!Number.isInteger(count)||count<1||count>8)throw Error('Invalid direct division count');
    const [definitions,divisions]=await Promise.all([
      nextDirectRead(config.season_master_sheet_id,config.teams_and_principals_gid),
      Promise.all(Array.from({length:count},async(_,i)=>{const p='d'+(i+1)+'_';return Promise.all([nextDirectRead(config[p+'sheet_id'],config[p+'constructors_gid']),nextDirectRead(config[p+'sheet_id'],config[p+'team_stats_gid'])]);}))
    ]);
    const normal=v=>String(v||'').trim().toLowerCase(),number=v=>{const s=String(v==null?'':v).trim();if(!s)return 0;const n=Number(s.replace(/,/g,''));if(!Number.isFinite(n)||/^#/.test(s))throw Error('A working-sheet points value is invalid');return n;};
    const teams=definitions.slice(1,13).filter(r=>r[0]).map(r=>({short:r[0],name:r[1],principal:r[4],points:0,weekly:Array(22).fill(0)}));
    if(!teams.length||new Set(teams.map(t=>normal(t.short))).size!==teams.length)throw Error('Working team definitions are incomplete');
    divisions.forEach(([standings,stats])=>teams.forEach(t=>{
      standings.slice(4,16).filter(r=>normal(r[1])===normal(t.short)).forEach(r=>t.points+=number(r[2]));
      stats.slice(1,13).filter(r=>normal(r[0])===normal(t.short)).forEach(r=>t.weekly=t.weekly.map((n,i)=>n+number(r[13+i])));
    }));
    // Existing tie-break fractions carry six decimal places. Remove binary
    // representation noise without truncating those fractions.
    teams.forEach(t=>t.points=Math.round(t.points*1e6)/1e6);
    const sorted=teams.slice().sort((a,b)=>b.points-a.points),maximum=Math.max(...sorted.map(t=>t.points));
    const overall=[[' '],['','','','Pos','','Team','','Points','','Gap','','team principal','team']];
    sorted.forEach(t=>overall.push(['','','',1+sorted.filter(o=>o.points>t.points).length,t.name,t.short,Math.floor(t.points),t.points,'',Math.round((t.points-maximum)*1e6)/1e6,'',t.principal,t.short]));
    while(overall.length<15)overall.push(Array(13).fill(''));
    const weekly=[['Weekly Totals'],['Round',...Array.from({length:22},(_,i)=>i+1)],...teams.map(t=>[t.short,...t.weekly])];
    while(weekly.length<14)weekly.push(Array(23).fill(''));
    return {overall:nextWriteCSV(overall),weekly:nextWriteCSV(weekly)};
  })().catch(e=>{nextDirectTables.delete(key);throw e;}));
  return nextDirectTables.get(key);
}
async function nextPublicFetch(url){
  const match=String(url).match(/\/d\/([\w-]+)/),gid=String(url).match(/[?&]gid=(\d+)/);
  if(match&&gid){
    const config=Object.values(nextConfigBySeason).find(c=>c.source_mode==='direct_division_v1'&&c.season_master_sheet_id===match[1]&&[c.direct_overall_gid,c.direct_weekly_gid].includes(gid[1]));
    if(config){const tables=await nextDirectTotals(config);return new Response(gid[1]===config.direct_overall_gid?tables.overall:tables.weekly,{status:200,headers:{'Content-Type':'text/csv; charset=utf-8'}});}
  }
  return fetch(url);
}

async function getConfigValue(key){if(!F1XL_NEXT_CONFIG_SHEET_ID)return null;try{const main=await nextLoadMain();return main[String(key).toLowerCase()]||null;}catch(error){return null;}}
function getRaceGIDs(config,division){const gids=[];for(let round=1;round<=22;round+=1)gids.push(config['d'+division+'_r'+round+'_gid']||null);return gids;}
function isNextGeneratedSeason(config){return !!(config&&(config.source_format==='generated_division_v1'||config.season_master_sheet_id));}

const TEAM_COLOURS={'McLaren':'#EF8733','Mclaren':'#EF8733','Mercedes':'#75F1D3','Red Bull Racing':'#4570C0','Red Bull':'#4570C0','Ferrari':'#D52E37','Williams':'#3267D4','Racing Bull':'#7091F8','Racing Bulls':'#7091F8','RB':'#7091F8','Aston Martin':'#4B9774','Haas':'#DFE1E2','Audi':'#EB4526','Alpine':'#479FE2','Cadillac':'#AAAADD','Reserve':'#ffffff'};
const DIVISION_COLOURS={1:'#8B3A3A',2:'#8B6B2E',3:'#7A8B2E',4:'#2E8B57',5:'#2E7A8B',6:'#2E458B',7:'#6B2E8B',8:'#8B2E6B'};

let nextReferenceColoursLoaded=false;
async function loadReferenceTeamColours(){
  if(nextReferenceColoursLoaded||!F1XL_NEXT_CONFIG_SHEET_ID)return;
  nextReferenceColoursLoaded=true;
  try{
    const main=await nextLoadMain();const sheetId=main.reference_data_sheet_id;const gid=main.teams_gid;
    if(!sheetId||!gid)return;
    const response=await fetch('https://docs.google.com/spreadsheets/d/'+sheetId+'/export?format=csv&gid='+gid);const rows=nextParseCSV(await response.text());
    if(!rows.length)return;
    const headers=rows[0].map(function(value){return String(value||'').trim().toLowerCase();});const nameIndex=headers.indexOf('display name');const colourIndex=headers.indexOf('hex colour');
    if(nameIndex<0||colourIndex<0)return;
    rows.slice(1).forEach(function(row){const name=String(row[nameIndex]||'').trim();const colour=String(row[colourIndex]||'').trim();if(name&&/^#[0-9a-f]{6}$/i.test(colour))TEAM_COLOURS[name]=colour;});
  }catch(error){console.warn('Permanent team colours unavailable; using safe local fallbacks.',error.message);}
}
