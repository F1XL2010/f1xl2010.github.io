/** Administration directory. Reads saved applications and current identities;
 * does not copy data, fetch stream URLs or modify applications/profiles. */
function driverStreamsText_(value){return String(value==null?'':value).trim();}
function driverStreamsLinks_(value){
  const raw=driverStreamsText_(value);
  if(!raw||/^(?:no|none|n\/?a|not applicable|no stream(?:ing)?|don't stream|do not stream|-)\.?$/i.test(raw))return {links:[],needsCheck:false};
  const links=[],seen={};let invalid=false;
  raw.split(/[\s,;]+/).filter(Boolean).forEach(function(part){
    let url=part.replace(/[.)\]}]+$/,'');
    if(/^(?:www\.|(?:[a-z0-9-]+\.)*(?:twitch\.tv|youtube\.com|youtu\.be|kick\.com|tiktok\.com|facebook\.com)\/)/i.test(url))url='https://'+url;
    const match=url.match(/^https?:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?::\d{1,5})?(?:[/?#][^<>"'\\\x00-\x20]*)?$/i);
    if(!match){invalid=true;return;}
    const host=match[1].toLowerCase().replace(/^www\./,''),key=url.replace(/^https?:/i,'').replace(/\/$/,'');
    if(seen[key])return;seen[key]=true;
    const label=/(^|\.)twitch\.tv$/.test(host)?'Twitch':/(^|\.)(youtube\.com|youtu\.be)$/.test(host)?'YouTube':/(^|\.)kick\.com$/.test(host)?'Kick':/(^|\.)tiktok\.com$/.test(host)?'TikTok':/(^|\.)facebook\.com$/.test(host)?'Facebook':host;
    links.push({url:url,label:label});
  });
  return {links:links,needsCheck:invalid};
}
function driverStreamsConsent_(value){const text=driverStreamsText_(value);return /^yes\b|^i (?:agree|consent)\b/i.test(text)?'Allowed':/^no\b|^i (?:do not|don.t) (?:agree|consent)\b/i.test(text)?'Not allowed':'Not recorded';}
function driverStreamsRead_(season){
  season=seasonPlanningSeason_(season);
  if(seasonProtectionStatus_(season).readOnly)throw new Error('Choose an open pre-season or active season.');
  const book=seasonPlanningOpenMasterReadOnly_(season);
  if(!book)throw new Error('This season is no longer available. Refresh the season list.');
  const start=book.getSheetByName('Start Here'),stage=start&&driverStreamsText_(start.getRange('I7').getDisplayValue());
  if(stage!=='Active'&&stage!=='Preseason')throw new Error('Choose an open pre-season or active season.');
  const warnings=[],records=new Map(),names=new Map();
  function record(id,name){id=driverStreamsText_(id);name=driverStreamsText_(name);if(!id||!name)return null;let item=records.get(id);if(!item){item={driverId:id,name:name,placements:[],app:null,appAt:'',discord:'',registryLink:''};records.set(id,item);}return item;}
  const entrants=book.getSheetByName('Season Entrants');
  if(entrants&&entrants.getLastRow()>1)entrants.getRange(2,1,entrants.getLastRow()-1,2).getDisplayValues().forEach(function(row){const item=record(row[0],row[1]);if(item){item.name=driverStreamsText_(row[1]);const key=item.name.toLowerCase();names.set(key,names.has(key)?null:item);}});
  const apps=book.getSheetByName('Processed Applications');let unreadable=0;
  if(apps&&apps.getLastRow()>1){
    const expected=['Application key','Driver ID','Gamertag','Processed','Processed at','Source row','Application details'];
    if(JSON.stringify(apps.getRange(1,1,1,7).getDisplayValues()[0])!==JSON.stringify(expected))throw new Error('Processed Applications has an unrecognised layout. Stream links could not be checked.');
    apps.getRange(2,1,apps.getLastRow()-1,7).getDisplayValues().forEach(function(row){
      if(!/^yes$/i.test(driverStreamsText_(row[3])))return;
      const item=record(row[1],row[2]);if(!item)return;
      let app;try{app=JSON.parse(row[6]);if(!app||typeof app!=='object'||Array.isArray(app))throw Error('Invalid application');}catch(error){unreadable++;return;}
      const at=driverStreamsText_(row[4]);if(!item.app||at>=item.appAt){item.app={streamLink:driverStreamsText_(app.streamLink),streamConsent:driverStreamsText_(app.streamConsent),discord:driverStreamsText_(app.discordId)};item.appAt=at;}
    });
  }
  if(unreadable)warnings.push(unreadable+' saved application'+(unreadable===1?' needs':'s need')+' checking before all stream links can be shown.');
  // One small directory read; no aliases, career statistics or application archive scan.
  try{
    const directory=openDriverDatabaseContext_().directory,width=Math.min(13,directory.getMaxColumns());
    if(directory.getLastRow()>1)directory.getRange(2,1,directory.getLastRow()-1,width).getDisplayValues().forEach(function(row){const item=records.get(driverStreamsText_(row[0]));if(item){item.discord=driverStreamsText_(row[11]);item.registryLink=driverStreamsText_(row[12]);}});
  }catch(error){warnings.push('Saved driver-profile links could not be checked. Application links are still shown.');}
  const count=Number(start.getRange('B5').getValue());
  if(book.getSheetByName('Division Line-ups')&&Number.isInteger(count)&&count>0&&count<=F1XL_CAPACITY.divisions){
    activeSeasonLines_({book:book,count:count}).forEach(function(line){line.rows.forEach(function(row){[[row[1],row[4],row[5]],[row[7],'Reserve',row[10]]].forEach(function(p){const item=names.get(driverStreamsText_(p[0]).toLowerCase());if(item&&!item.placements.some(function(x){return x.division===line.division&&x.team===p[1];}))item.placements.push({division:line.division,team:driverStreamsText_(p[1]),tier:driverStreamsText_(p[2])});});});});
  }
  const drivers=Array.from(records.values()).map(function(item){
    const submitted=item.app&&item.app.streamLink,raw=submitted||item.registryLink,parsed=driverStreamsLinks_(raw);
    const consent=item.app&&(submitted||driverStreamsConsent_(item.app.streamConsent)==='Not allowed')?driverStreamsConsent_(item.app.streamConsent):'Not recorded';
    return {driverId:item.driverId,name:item.name,discord:item.app&&item.app.discord||item.discord,placements:item.placements,links:parsed.links,needsCheck:parsed.needsCheck,submittedLink:parsed.needsCheck?raw:'',consent:consent,source:submitted?'Application':raw?'Driver profile':'',updatedAt:item.appAt};
  }).sort(function(a,b){return a.name.localeCompare(b.name,'en',{sensitivity:'base'});});
  return {season:season,stage:stage,drivers:drivers,warnings:warnings,refreshedAt:new Date().toISOString()};
}
function getDriverStreamLinksInitial(){ fapAssertEntry_('getDriverStreamLinksInitial');
  const nav=getPreseasonHubs({navigationOnly:true}),seasons=(nav.hubs||[]).map(function(h){return {season:String(h.season),active:!!h.active};}).sort(function(a,b){return Number(b.active)-Number(a.active)||Number(b.season)-Number(a.season);});
  if(!seasons.length)return {seasons:[],drivers:[],warnings:[],refreshedAt:new Date().toISOString()};
  return Object.assign({seasons:seasons},driverStreamsRead_(seasons[0].season));
}
function getDriverStreamLinks(input){ fapAssertEntry_('getDriverStreamLinks');return driverStreamsRead_(input&&input.season);}
