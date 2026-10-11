// TEST history readers. Registry exports are authoritative; no LIVE totals are merged.
function historyCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      row.push(cell.trim()); rows.push(row); row = []; cell = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

function historyStatsHeader(rows) {
  const index = rows.findIndex(row => String(row[3] || '').trim().toLowerCase() === 'driver');
  if (index < 0) throw new Error('The career statistics headers could not be recognised.');
  return index;
}

function historySeasonBlocks(rows) {
  const header = historyStatsHeader(rows);
  const metrics = rows[header]; const labels = rows[header - 1] || [];
  const blocks = [];
  // Some merged season numbers are centred two columns into their metric block.
  for (let col = 11; col < metrics.length; col++) {
    if (String(metrics[col] || '').trim().toLowerCase() !== 'total wins') continue;
    const season = labels.slice(col, col + 5).map(value => Number(value)).find(value => value > 0);
    if (season) blocks.push({season, col});
  }
  return blocks;
}

function historyCoverage(rows) {
  const start = historyStatsHeader(rows) + 1;
  const populated = historySeasonBlocks(rows).filter(({col}) => rows.slice(start).some(row =>
    row[3] && row.slice(col, col + 5).some(value => Number(value) > 0)));
  return populated.length ? `Recorded statistics through S${Math.max(...populated.map(block => block.season))}`
    : 'Recorded career statistics';
}

function historyLoadNotice(sections) {
  const notice = document.getElementById('history-load-notice');
  notice.hidden = !sections.length;
  const message = notice.querySelector('span');
  message.textContent = sections.length ? `Some history could not load (${[...new Set(sections)].join(', ')}). Displayed records may be incomplete.` : '';
}

function historyHTML(value) {return String(value == null ? '' : value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function historyIdentityKey(value) {return String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');}
function historyPublicHeaders(rows, expected) {
  if(!rows.length || rows[0].slice(0,expected.length).join('|')!==expected.join('|'))throw new Error('Public history headers do not match the export.');
}
async function historyFetchPublic(url) {
  const id=String(url).match(/\/d\/([\w-]+)/),gid=String(url).match(/gid=(\d+)/);
  if(!id||!gid)throw new Error('Public history link is incomplete.');
  const response=await fetch(`https://docs.google.com/spreadsheets/d/${id[1]}/export?format=csv&gid=${gid[1]}`);
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const text=await response.text();if(/<!doctype|<html/i.test(text))throw new Error('Public history export is unavailable.');
  return historyCSV(text);
}
async function historyLoadPublic() {
  const url='https://script.google.com/macros/s/AKfycbxJ9JnIwY39k4k8ouva8CPpa6EvQXeKUD1mNGc3JgaNLfVyiATX68925cKaEZDywf36IQ/exec?view=public-history';
  const response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error('TEST registry returned HTTP '+response.status);
  const data=await response.json();
  if(!data.ok)throw new Error(data.error||'The TEST history feed is unavailable.');
  return {...historyParsePublic(data.careerRows,data.honourRows),mode:'connected',refreshedAt:data.refreshedAt,notes:data.notes||[]};
}

async function historyLoadTest() {
  return historyLoadPublic();
}

function historyShowSource(feed) {
  const banner=document.querySelector('.test-banner');
  if(banner)banner.textContent='TEST · Current registry history';
  let note=document.getElementById('history-source-note');
  if(!note){note=document.createElement('p');note.id='history-source-note';note.style.cssText='padding:12px 20px;color:#acb9b2;font-size:13px;line-height:1.5';banner?.after(note);}
  note.textContent=(feed.notes||[]).join(' ');
  note.hidden=!note.textContent;
}

// Render confirmed facts independently: missing historical runner-ups do not
// invalidate known winners, nor are they inferred from today's team roster.
function historyTestChampionships(feed) {
  const names=new Map(feed.drivers.map(d=>[d.driverId,d.primary]));
  const name=r=>r?(names.get(r.driverId)||r.name||''):'';
  const divisions={},overall=[];
  for(const season of [...feed.publishedSeasons].sort((a,b)=>b-a)) {
    const rows=feed.honours.filter(r=>r.season===season);
    const select=(cat,div,result,type)=>rows.filter(r=>r.category===cat&&r.division===div&&r.result===result&&r.recipientType===type);
    const one=(...args)=>select(...args)[0];
    for(const div of [...new Set(rows.map(r=>r.division).filter(Boolean))].sort((a,b)=>a-b)) {
      const c=one('Driver Championship',div,'Champion','Driver'),r=one('Driver Championship',div,'Runner-up','Driver');
      const t=one('Division Constructors',div,'Champion','Team'),u=one('Division Constructors',div,'Runner-up','Team');
      const key='Division '+div;
      (divisions[key]??=[]).push({season,div:key,champ:name(c),champTeam:c?.team||'',champPts:c?.points??'',ru:name(r),ruTeam:r?.team||'',ruPts:r?.points??'',constructor:t?.team||'',consPts:t?.points??'',consRu:u?.team||'',consRuPts:u?.points??'',consDriver1:select('Division Constructors',div,'Champion','Driver').map(name).join(' · '),consDriver2:'',consRuDriver1:select('Division Constructors',div,'Runner-up','Driver').map(name).join(' · '),consRuDriver2:''});
    }
    const c=one('Overall Constructors','','Champion','Team'),r=one('Overall Constructors','','Runner-up','Team');
    if(c||r||rows.some(row=>row.category==='Driver Championship'))overall.push({season,owner:name(one('Team Principal','','Champion','Driver')),ownerTeam:c?.team||'',ownerPts:c?.points??'',ru:name(one('Team Principal','','Runner-up','Driver')),ruTeam:r?.team||'',ruPts:r?.points??'',driver1:select('Overall Constructors','','Champion','Driver').map(name).join(' · '),driver2:'',ruDriver1:select('Overall Constructors','','Runner-up','Driver').map(name).join(' · '),ruDriver2:''});
  }
  return {divisions,overall};
}
function historyParsePublic(careerRows, honourRows) {
  historyPublicHeaders(careerRows,['Driver ID','Current Gamertag','Aliases JSON','Seasons','Wins','Podiums','Poles','Sprint Wins','Races Started','Season History JSON','Statistics Through','Publication Season','Published Seasons JSON','Publication Revision']);
  historyPublicHeaders(honourRows,['Record ID','Season','Category','Division','Result','Recipient Type','Driver ID','Gamertag','Team','Display Label','Points','Publication Revision']);
  const ids=new Set(), recordIds=new Set();let published=null,publication=null,revision=null;
  const drivers=careerRows.slice(1).filter(row=>row[0]).map(row=>{
    if(!row[1]||ids.has(row[0]))throw new Error('Public career profiles have missing names or duplicate IDs.');ids.add(row[0]);
    const aliases=JSON.parse(row[2]||'[]'),history=JSON.parse(row[9]||'[]'),seasons=JSON.parse(row[12]||'[]');
    if(!Array.isArray(aliases)||aliases.some(name=>typeof name!=='string')||!Array.isArray(history)||!Array.isArray(seasons)||!seasons.length||seasons.some(season=>!Number.isFinite(season)||season<=0)||!/^\d+(?:\.5)?$/.test(row[11]))throw new Error('Public career history is incomplete.');
    if(!row[13]||published!==null&&(JSON.stringify(published)!==JSON.stringify(seasons)||publication!==row[11]||revision!==row[13]))throw new Error('Public history is still updating. Retry in a moment.');
    published=seasons;publication=row[11];revision=row[13];
    const totals=row.slice(3,9).map(value=>Number(value));
    if(totals.some(value=>!Number.isFinite(value)||value<0))throw new Error('Public career totals are invalid.');
    const seasonIds=new Set();
    history.forEach(item=>{if(!Number.isFinite(item.season)||item.season<=0||item.season>Number(publication)||seasonIds.has(item.season)||['wins','pods','poles','sprints','races'].some(key=>!Number.isFinite(item[key])||item[key]<0))throw new Error('Public season statistics are invalid.');seasonIds.add(item.season);});
    if(new Set(seasons).size!==seasons.length||seasons.some(season=>season>Number(publication)))throw new Error('Public completed seasons are invalid.');
    return {driverId:row[0],primary:row[1],aliases,driverRaw:[row[1],...aliases].join(' / '),totalSeasons:totals[0],totalWins:totals[1],totalPodiums:totals[2],totalPoles:totals[3],sprintWins:totals[4],totalRaces:totals[5],seasonBreakdown:history,accolades:[]};
  });
  if(!drivers.length)throw new Error('Public career export is empty.');
  const categories=['Team Principal','Driver Championship','Division Constructors','Overall Constructors','All Star Race','ASR Constructors'];
  const honours=honourRows.slice(1).filter(row=>row[0]).map(row=>{
    if(row[11]!==revision)throw new Error('Public history is still updating. Retry in a moment.');
    if(recordIds.has(row[0])||!published.includes(Number(row[1]))||!categories.includes(row[2])||!['Champion','Runner-up'].includes(row[4])||!['Driver','Team'].includes(row[5])||row[5]==='Driver'&&!ids.has(row[6]))throw new Error('Public honours are incomplete or contain duplicate records.');
    recordIds.add(row[0]);
    return {recordId:row[0],season:Number(row[1]),category:row[2],division:Number(row[3])||'',result:row[4],recipientType:row[5],driverId:row[6],name:row[7],team:row[8],label:row[9],points:row[10]};
  });
  // A reader must not combine the new career export with an older honours export.
  if(published.some(season=>!honours.some(record=>record.season===season)))throw new Error('Public history is still updating. Retry in a moment.');
  return {drivers,honours,publishedSeasons:published,publicationSeason:Number(publication)};
}

/** Preserve historical source totals; replace only seasons explicitly published by the Portal. */
function historyMergeCareer(legacy,feed) {
  if(!feed)return legacy;
  const owners=new Map();
  legacy.forEach((driver,index)=>[driver.primary,...driver.aliases].forEach(name=>{
    const key=historyIdentityKey(name);if(!key)return;if(!owners.has(key))owners.set(key,new Set());owners.get(key).add(index);
  }));
  const claimed=new Set(),merged=legacy.map(driver=>({...driver,aliases:[...driver.aliases],seasonBreakdown:[...driver.seasonBreakdown],accolades:[]}));
  const columns=['totalWins','totalPodiums','totalPoles','sprintWins','totalRaces'],metrics=['wins','pods','poles','sprints','races'];
  for(const fresh of feed.drivers) {
    const matches=new Set();[fresh.primary,...fresh.aliases].forEach(name=>(owners.get(historyIdentityKey(name))||[]).forEach(index=>matches.add(index)));
    if(matches.size>1)throw new Error(`Review the historical aliases for ${fresh.primary}; more than one old profile matches.`);
    if(!matches.size){merged.push({...fresh,aliases:[...fresh.aliases],accolades:[]});continue;}
    const index=[...matches][0];if(claimed.has(index))throw new Error('Two permanent Driver IDs match one historical career profile.');claimed.add(index);
    const old=merged[index],keep=old.seasonBreakdown.filter(item=>!feed.publishedSeasons.includes(item.season));
    const incoming=fresh.seasonBreakdown.filter(item=>feed.publishedSeasons.includes(item.season));
    const replaced=old.seasonBreakdown.filter(item=>feed.publishedSeasons.includes(item.season));
    columns.forEach((key,i)=>old[key]+=incoming.reduce((sum,item)=>sum+item[metrics[i]],0)-replaced.reduce((sum,item)=>sum+item[metrics[i]],0));
    old.totalSeasons+=incoming.filter(item=>item.races>0).length-replaced.filter(item=>item.races>0).length;
    old.driverId=fresh.driverId;
    old.aliases=[...new Set([old.primary,...old.aliases,...fresh.aliases])].filter(name=>name!==fresh.primary);
    old.primary=fresh.primary;old.driverRaw=[old.primary,...old.aliases].join(' / ');
    old.seasonBreakdown=keep.concat(incoming).sort((a,b)=>b.season-a.season);
  }
  return merged.sort((a,b)=>a.primary.localeCompare(b.primary,undefined,{sensitivity:'base'}));
}
function historyWithoutPublished(rows,feed) {
  return !feed?rows:(rows||[]).filter(row=>!feed.publishedSeasons.includes(Number(row[1])));
}
function historyPublicAccolades(drivers,feed) {
  if(!feed)return;
  const labels={'Driver Championship':['Driver Champion','Driver Runner Up'],'Division Constructors':['Constructor Champion','Constructor Runner Up'],'Overall Constructors':['Overall Winning Constructor Team','Overall Constructor Team Runner Up'],'Team Principal':['Team Principal Constructor Champion','Team Principal Constructor Runner Up'],'All Star Race':['All Star Race Champion','All Star Race Runner Up'],'ASR Constructors':['ASR Constructor Champion','ASR Constructor Runner Up']};
  for(const driver of drivers) for(const row of feed.honours.filter(item=>item.recipientType==='Driver'&&item.driverId===driver.driverId)) {
    const winner=row.result==='Champion',label=labels[row.category][winner?0:1],season=row.division?`D${row.division}-S${row.season}`:`S${row.season}`;
    const type=winner?['Team Principal','Overall Constructors'].includes(row.category)?'gold':'champ':'ru';
    const existing=driver.accolades.find(item=>item.label===label&&item.type===type);
    if(existing){if(!existing.seasons.split(', ').includes(season))existing.seasons+=', '+season;}
    else driver.accolades.push({label,type,seasons:season});
  }
}
function historyExactAccolades(drivers,map) {
  const owners=new Map(),awards=new Map();
  drivers.forEach(driver=>[driver.primary,...driver.aliases].forEach(name=>{
    const key=historyIdentityKey(name);if(!owners.has(key))owners.set(key,new Set());owners.get(key).add(driver);
  }));
  Object.entries(map).forEach(([name,items])=>name.split('/').forEach(alias=>{
    const key=historyIdentityKey(alias);if(!awards.has(key))awards.set(key,[]);awards.get(key).push(...items);
  }));
  return drivers.map(driver=>{
    const found=new Map();
    [driver.primary,...driver.aliases].forEach(name=>{
      const key=historyIdentityKey(name);if(owners.get(key)?.size!==1)return;
      (awards.get(key)||[]).forEach(item=>{
        const tag=item.label+'|'+item.type;let group=found.get(tag);
        if(!group){group={...item,seasons:new Set()};found.set(tag,group);}
        item.seasons.split(/,\s*/).forEach(season=>group.seasons.add(season));
      });
    });
    driver.accolades=[...found.values()].map(item=>({...item,seasons:[...item.seasons].join(', ')}));return driver;
  });
}
function historyApplyChampionships(divisions,overall,feed) {
  if(!feed)return {divisions,overall};
  const names=new Map(feed.drivers.map(driver=>[driver.driverId,driver.primary]));
  const name=row=>names.get(row.driverId)||row.name;
  const select=(season,category,division,result,type)=>feed.honours.filter(row=>row.season===season&&row.category===category&&row.division===division&&row.result===result&&row.recipientType===type);
  const updated=Object.fromEntries(Object.entries(divisions).map(([key,value])=>[key,value.filter(item=>!feed.publishedSeasons.includes(item.season))]));
  const all=[...overall.filter(item=>!feed.publishedSeasons.includes(item.season))];
  feed.publishedSeasons.forEach(season=>{
    const counts=[...new Set(feed.honours.filter(row=>row.season===season&&row.division).map(row=>row.division))];
    counts.forEach(division=>{
      const champ=select(season,'Driver Championship',division,'Champion','Driver')[0],ru=select(season,'Driver Championship',division,'Runner-up','Driver')[0];
      const cons=select(season,'Division Constructors',division,'Champion','Team')[0],consRu=select(season,'Division Constructors',division,'Runner-up','Team')[0];
      if(!champ||!ru||!cons||!consRu)throw new Error(`Published S${season} D${division} championship honours are incomplete.`);
      const key='Division '+division;if(!updated[key])updated[key]=[];
      updated[key].push({season,div:key,champ:name(champ),champTeam:champ.team,champPts:champ.points,ru:name(ru),ruTeam:ru.team,ruPts:ru.points,constructor:cons.team,consPts:cons.points,consDriver1:select(season,'Division Constructors',division,'Champion','Driver').map(name).join(' · '),consDriver2:'',consRu:consRu.team,consRuPts:consRu.points,consRuDriver1:select(season,'Division Constructors',division,'Runner-up','Driver').map(name).join(' · '),consRuDriver2:''});
    });
    const winner=select(season,'Overall Constructors','','Champion','Team')[0],runner=select(season,'Overall Constructors','','Runner-up','Team')[0];
    if(!winner||!runner)throw new Error(`Published S${season} overall honours are incomplete.`);
    const owner=select(season,'Team Principal','','Champion','Driver')[0],second=select(season,'Team Principal','','Runner-up','Driver')[0];
    all.push({season,owner:owner?name(owner):'Team championship',ownerTeam:winner.team,ownerPts:winner.points,ru:second?name(second):'Team championship',ruTeam:runner.team,ruPts:runner.points,driver1:select(season,'Overall Constructors','','Champion','Driver').map(name).join(' · '),driver2:'',ruDriver1:select(season,'Overall Constructors','','Runner-up','Driver').map(name).join(' · '),ruDriver2:''});
  });
  Object.values(updated).forEach(items=>items.sort((a,b)=>b.season-a.season));all.sort((a,b)=>b.season-a.season);
  return {divisions:updated,overall:all};
}
function historyChampionshipCounts(divisions,overall,feed) {
  const names=new Map();
  for(const driver of feed?.drivers||[]) for(const name of [driver.primary,...driver.aliases]) {
    const key=historyIdentityKey(name);
    if(!names.has(key))names.set(key,new Set());names.get(key).add(driver.primary);
  }
  function canonical(name) {const matches=names.get(historyIdentityKey(name));return matches?.size===1?[...matches][0]:name;}
  function counts(rows,getName,teams=false) {
    const totals=new Map();
    for(const row of rows){
      const seen=new Set();
      for(const raw of getName(row)){
        const clean=String(raw||'').trim().replace(/\s+/g,' ');
        if(!clean||['--','—','?'].includes(clean))continue;
        const name=teams?(clean.toLowerCase()==='mclaren'?'McLaren':clean):canonical(clean);
        // Team capitalization is not a change of team identity. Do not merge
        // distinct historical names such as Renault and Alpine.
        const key=teams?name.toLowerCase():name;
        if(seen.has(key))continue;seen.add(key);
        const item=totals.get(key)||{name,val:0,lastSeason:0};
        item.val++;item.lastSeason=Math.max(item.lastSeason,Number(row.season)||0);
        totals.set(key,item);
      }
    }
    return [...totals.values()];
  }
  return {divisions:Object.fromEntries(Object.entries(divisions).map(([key,rows])=>[key,{champDrivers:counts(rows,row=>[row.champ]),ruDrivers:counts(rows,row=>[row.ru]),consTeams:counts(rows,row=>[row.constructor],true),consDrivers:counts(rows,row=>[row.consDriver1,row.consDriver2].flatMap(name=>String(name||'').split(' · ')))}])),overall:{champions:counts(overall,row=>[row.owner==='Team championship'?'':row.owner]),runners:counts(overall,row=>[row.ru==='Team championship'?'':row.ru]),consTeams:counts(overall,row=>[row.ownerTeam],true)}};
}
