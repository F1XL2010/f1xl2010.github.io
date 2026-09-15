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
  try{const main=await nextLoadMain();const explicit=String(main.active_test_season||'');if(/^\d+(?:\.5)?$/.test(explicit)&&main['s'+explicit.replace('.','_')+'_gid']){nextSeasonCache=Number(explicit);return nextSeasonCache;}const seasons=Object.keys(main).map(function(key){const match=key.match(/^s(\d+(?:_\d+)?)_gid$/);return match?Number(match[1].replace('_','.')):null;}).filter(function(value){return value!==null&&!Number.isNaN(value);}).sort(function(a,b){return b-a;});nextSeasonCache=seasons.length?seasons[0]:null;return nextSeasonCache;}catch(error){console.warn('TEST Website Config lookup failed; using local fallback.',error.message);nextSeasonCache=Number(F1XL_NEXT_FALLBACK.season);return nextSeasonCache;}
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
