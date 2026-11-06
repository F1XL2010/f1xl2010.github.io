/** Public, read-only TEST racing history. No client-selected sheet, range or season.
 * Only the fields explicitly constructed below leave the private registry.
 * No sheet writes, permission changes, triggers or authentication changes.
 */
function publicHistoryResponse_() {
  try {
    const cache=CacheService.getScriptCache(),key='F1XL_PUBLIC_HISTORY_V1';
    let text='',manifest;
    try {
      manifest=JSON.parse(cache.get(key)||'null');
      if(manifest&&manifest.keys.length<=150){
        const parts=cache.getAll(manifest.keys);
        if(manifest.keys.every(function(k){return typeof parts[k]==='string';}))text=manifest.keys.map(function(k){return parts[k];}).join('');
      }
    }catch(ignored){}
    if(!text){
      text=JSON.stringify(publicHistoryBuild_());
      try {
        const prefix=key+'_'+Utilities.getUuid(),values={},keys=[];
        for(let i=0;i<text.length;i+=24000){const part=prefix+'_'+keys.length;keys.push(part);values[part]=text.slice(i,i+24000);}
        if(keys.length<=150){cache.putAll(values,120);cache.put(key,JSON.stringify({keys:keys}),120);}
      }catch(ignored){}
    }
    return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
  }catch(error){
    console.error('TEST public history: '+String(error&&error.stack||error));
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:'The current TEST history could not be loaded. Please retry shortly.'})).setMimeType(ContentService.MimeType.JSON);
  }
}

function publicHistoryBuild_() {
  const props=PropertiesService.getScriptProperties().getProperties();
  const id=props.TEST_DRIVER_REGISTRY_SHEET_ID;
  if(!id)throw new Error('TEST registry is not configured.');
  const book=SpreadsheetApp.openById(id);
  if(fapWorkbookLegacyName_(book.getName())!=='TEST - F1XL Permanent Driver Registry')throw new Error('TEST registry identity check failed.');
  const sheet=function(name){const s=book.getSheetByName(name);if(!s)throw new Error('Missing TEST history tab '+name);return s;};
  const career=sheet('Career Stats'),directory=sheet('Drivers'),aliases=sheet('DriverAliases'),awards=sheet('Accolade Records');
  const count=function(s,max){const n=Math.max(0,s.getLastRow()-1);if(n>max)throw new Error('TEST history capacity exceeded.');return n;};
  const column=function(s,n,start,width){return n?s.getRange(2,start,n,width).getDisplayValues():[];};
  const n=count(directory,2000),identity=column(directory,n,1,2),status=column(directory,n,4,1),destinations=column(directory,n,11,1);
  const identities={},redirects={};
  identity.forEach(function(r,i){if(r[0]){identities[r[0]]=r[1];redirects[r[0]]=/^merged$/i.test(status[i][0])?destinations[i][0]:r[0];}});
  const resolve=function(value){let id=String(value||''),seen={};while(redirects[id]&&redirects[id]!==id){if(seen[id])throw new Error('Merged identity cycle.');seen[id]=true;id=redirects[id];}return id;};
  const a=count(aliases,10000),aliasNames=column(aliases,a,2,3),confirmed=column(aliases,a,8,1),inactive=column(aliases,a,12,1),byId={};
  aliasNames.forEach(function(r,i){if(!r[0]||!r[2]||/^inactive$/i.test(inactive[i][0])||confirmed[i][0]&&!/^confirmed$/i.test(confirmed[i][0]))return;const id=resolve(r[0]);(byId[id]||(byId[id]=[])).push(r[2]);});
  identity.forEach(function(r){const id=resolve(r[0]);if(id!==r[0]&&r[1])(byId[id]||(byId[id]=[])).push(r[1]);});
  if(career.getLastRow()>2003||career.getLastColumn()>1000)throw new Error('Career history capacity exceeded.');
  const rows=career.getRange(1,1,career.getLastRow(),career.getLastColumn()).getDisplayValues();
  const m=count(awards,10000),awardRows=column(awards,m,1,9),awardStatus=column(awards,m,14,1),labels=column(awards,m,16,1);
  const pointsHeader=awards.getLastColumn()>=18?awards.getRange(1,18).getDisplayValue():'';
  if(pointsHeader&&pointsHeader!=='Historical Championship Points')throw new Error('Historical points header changed.');
  const points=pointsHeader?column(awards,m,18,1):[];
  const source=awardRows.map(function(row,i){return {row:row,status:awardStatus[i][0],label:labels[i][0],points:points[i]?points[i][0]:''};});
  return publicHistoryProject_(rows,identities,redirects,byId,source,props,new Date().toISOString());
}

function publicHistoryProject_(rows,names,redirects,aliases,awards,properties,now) {
  const careerHeaders=['Driver ID','Current Gamertag','Aliases JSON','Seasons','Wins','Podiums','Poles','Sprint Wins','Races Started','Season History JSON','Statistics Through','Publication Season','Published Seasons JSON','Publication Revision'];
  const honourHeaders=['Record ID','Season','Category','Division','Result','Recipient Type','Driver ID','Gamertag','Team','Display Label','Points','Publication Revision'];
  const headers=rows[1]||[],metrics=rows[2]||[];
  if(headers.slice(0,8).join('|')!=='Driver ID|Current Gamertag|Seasons|Wins|Podiums|Poles|Sprint Wins|Races Started')throw new Error('Career Stats headers changed.');
  const number=function(value){const text=String(value==null?'':value).trim().replace(/,/g,'');if(text&&!/^\d+(?:\.\d+)?$/.test(text))throw new Error('Career formula or statistic needs attention.');return Number(text||0);};
  const closed=function(season){if(season>=1&&season<=27)return true;const raw=properties['F1XL_POSTSEASON_CLOSED_'+String(season).replace('.','_')];try{const data=JSON.parse(raw||'null');return !!data&&!data.invalid&&!!data.closedAt;}catch(error){return false;}};
  const blocks=[],seen={};
  for(let col=9;col<metrics.length;col++)if(metrics[col]==='Wins'){
    const season=Number(String(headers[col]).replace(/^Season\s+/i,''));
    if(!season||seen[season]||metrics.slice(col,col+5).join('|')!=='Wins|Podiums|Poles|Sprint Wins|Races Started')throw new Error('Career season headers changed.');
    seen[season]=true;if(closed(season))blocks.push({season:season,col:col});
  }
  const resolve=function(value){let id=String(value||''),seen={};while(redirects[id]&&redirects[id]!==id){if(seen[id])throw new Error('Merged identity cycle.');seen[id]=true;id=redirects[id];}return id;};
  const revision=now,drivers=[],ids={},categories=['Team Principal','Driver Championship','Division Constructors','Overall Constructors','All Star Race','ASR Constructors'];
  const confirmed=awards.filter(function(item){return item.status==='Confirmed'&&closed(Number(item.row[1]));});
  const published=Array.from(new Set(confirmed.map(function(item){return Number(item.row[1]);}))).sort(function(a,b){return a-b;});
  if(!published.length)throw new Error('No confirmed historical honours.');
  const through=Math.max.apply(null,published.concat(blocks.map(function(b){return b.season;})));
  rows.slice(3).forEach(function(row){
    if(!row[0]&&!row[1])return;
    const id=resolve(row[0]);if(!id||!names[id])throw new Error('Career profile requires a permanent identity.');
    if(id!==row[0]){if(blocks.some(function(b){return row.slice(b.col,b.col+5).some(function(v){return number(v)>0;});}))throw new Error('Merged career statistics require reconciliation.');return;}
    if(ids[id])throw new Error('Duplicate career identity.');ids[id]=true;
    const history=[],totals=[0,0,0,0,0];
    blocks.forEach(function(b){const values=Array.from({length:5},function(_,j){return number(row[b.col+j]);});values.forEach(function(v,j){totals[j]+=v;});if(values.some(function(v){return v>0;}))history.push({season:b.season,wins:values[0],pods:values[1],poles:values[2],sprints:values[3],races:values[4]});});
    history.sort(function(a,b){return b.season-a.season;});
    const alias=Array.from(new Set((aliases[id]||[]).filter(function(s){return s&&s!==names[id];}))).sort();
    drivers.push([id,names[id],JSON.stringify(alias),history.filter(function(s){return s.races>0;}).length].concat(totals,[JSON.stringify(history),through,through,JSON.stringify(published),revision]));
  });
  const recordIds={},honours=confirmed.map(function(item){
    const r=item.row,id=resolve(r[6]);
    if(!r[0]||recordIds[r[0]]||!categories.includes(r[2])||!['Champion','Runner-up'].includes(r[4])||!['Driver','Team'].includes(r[5])||r[5]==='Driver'&&!ids[id])throw new Error('Confirmed honour requires review.');
    recordIds[r[0]]=true;
    // Unknown stays blank, including ASR; these are official championship totals,
    // separate from the feature-only career statistics above.
    const rawPoints=String(item.points==null?'':item.points).trim();
    const points=Number(r[1])<=27&&!['All Star Race','ASR Constructors'].includes(r[2])&&rawPoints!==''?number(rawPoints):'';
    return [r[0],r[1],r[2],r[3],r[4],r[5],r[5]==='Driver'?id:'',r[5]==='Driver'?names[id]:'',r[8],item.label,points,revision];
  });
  if(!drivers.length)throw new Error('No career profiles.');
  return {ok:true,source:'Current TEST Driver Registry',refreshedAt:now,cacheSeconds:120,careerRows:[careerHeaders].concat(drivers),honourRows:[honourHeaders].concat(honours),notes:honours.some(function(r){return /ASR|All Star/.test(r[2]);})?[]:['Historical ASR honours have not yet been connected to the TEST registry.']};
}
