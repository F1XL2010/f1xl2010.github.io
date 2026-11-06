/** Read-only statistics preparation. Presentation copies are handled separately. */
const F1XL_ANNOUNCEMENT=Object.freeze({records:'1Cn6FdLGjzrFpjXPyrd0ZimC46ieXDrdkPgez1TlS3-M',gids:[0,343950932,806509057,557492395,1468409556,1147341365,1917666666,468074839],ttl:21600,prefix:'F1XL_ANNOUNCEMENT_V1_'});
function announcementTrackKey_(value,historical){
  const text=String(value||'').toLowerCase().trim().replace(/\s+/g,' ');
  const aliases={'usa':'united states','united states of america':'united states','austin':'united states','britain':'great britain','silverstone':'great britain','uk':'great britain','italy':'monza','italy - monza':'monza','united arab emirates':'abu dhabi','uae':'abu dhabi','saudi':'saudi arabia','jeddah':'saudi arabia','barcelona':'catalunya','catalunya (formerly spain)':'catalunya','spain - barcelona':'catalunya','spain - madrid':'madrid','spain (madrid)':'madrid'};
  return text==='spain'?(historical?'catalunya':'madrid'):(aliases[text]||text);
}
function announcementCachePut_(key,value){const text=JSON.stringify(value);if(text.length>85000)throw new Error('This statistics packet is too large. Use a smaller season range.');CacheService.getScriptCache().put(F1XL_ANNOUNCEMENT.prefix+key,text,F1XL_ANNOUNCEMENT.ttl);}
function announcementCacheGet_(key){const value=CacheService.getScriptCache().get(F1XL_ANNOUNCEMENT.prefix+key);if(!value)throw new Error('This preparation expired. Prepare the statistics again.');return JSON.parse(value);}
function announcementSession_(input){
  if(!input||!/^[a-zA-Z0-9-]{20,80}$/.test(String(input.token||'')))throw new Error('Prepare the statistics first.');
  const session=announcementCacheGet_(input.token),c=preseasonTrackDrawContext_(session.season);
  if(c.revision!==session.revision)throw new Error('The saved draw or dates changed. Prepare the statistics again.');
  return session;
}
function getPreseasonAnnouncementOptions(input){ fapAssertEntry_('getPreseasonAnnouncementOptions');
  const c=preseasonTrackDrawContext_(input.season);intakeRequireRevision_(input,c);
  if(!c.savedAt||c.races.some(function(r){return !r.track;}))throw new Error('Save a complete track draw before preparing the announcement.');
  const seasons=getSeasonPlanningPreviousSeasons_(c.season).filter(function(s){return seasonProtectionStatus_(s).readOnly;});
  return {seasons:seasons,from:seasons.includes('20')?'20':seasons[seasons.length-1],to:seasons[0],message:'Main-race wins, podiums and qualifying poles across all divisions. Sprint results are excluded. Track records are the current permanent records. Only completed archive seasons are offered.'};
}
function beginPreseasonAnnouncement(input){ fapAssertEntry_('beginPreseasonAnnouncement');
  const c=preseasonTrackDrawContext_(input.season),options=getPreseasonAnnouncementOptions(input);
  if(!options.seasons.includes(String(input.from))||!options.seasons.includes(String(input.to))||Number(input.from)>Number(input.to))throw new Error('Choose a valid completed-season range.');
  const seasons=options.seasons.filter(function(s){return Number(s)>=Number(input.from)&&Number(s)<=Number(input.to);}).sort(function(a,b){return Number(a)-Number(b);});
  for(let n=Math.ceil(Number(input.from));n<=Number(input.to);n++)if(!seasons.includes(String(n)))throw new Error('Season '+n+' is not connected. Connect it or choose a different range; missing seasons cannot be silently skipped.');
  const props=PropertiesService.getScriptProperties(),tasks=[];
  seasons.forEach(function(season){
    const book=SpreadsheetApp.openById(props.getProperty(seasonMasterPropertyKey_(season))),start=book.getSheetByName('Start Here');
    if(!start||String(start.getRange('B3').getDisplayValue())!==season)throw new Error('The connected S'+season+' Master does not match its season.');
    const count=Number(start.getRange('B5').getValue());if(!Number.isInteger(count)||count<1||count>8)throw new Error('S'+season+' has no valid division count.');
    for(let division=1;division<=count;division++){const id=props.getProperty(divisionTemplatePropertyKey_(season,division));if(!id)throw new Error('S'+season+' D'+division+' is not connected.');tasks.push({season:season,division:division,id:id});}
  });
  const identity=seasonStatisticsPreviewIdentityMap_(openDriverDatabaseContext_());
  const names={};Object.keys(identity.byName).forEach(function(k){const d=identity.byName[k];names[k]={id:d.driverId,name:d.currentGamertag};});
  const token=Utilities.getUuid(),session={token:token,season:c.season,revision:c.revision,from:String(input.from),to:String(input.to),tasks:tasks,races:c.races,pool:c.pool,created:new Date().toISOString()};
  const keys=Object.keys(names);session.nameChunks=Math.ceil(keys.length/300);for(let i=0;i<session.nameChunks;i++){const chunk={};keys.slice(i*300,(i+1)*300).forEach(function(k){chunk[k]=names[k];});announcementCachePut_(token+'_names_'+i,chunk);}announcementCachePut_(token,session);
  return {token:token,total:tasks.length,labels:tasks.map(function(t){return 'S'+t.season+' D'+t.division;})};
}
function announcementCheckCells_(rows,label){if(rows.some(function(r){return r.some(function(v){return /^#(?:REF!|N\/A|VALUE!|ERROR!|DIV\/0!|NAME\?|NUM!)/.test(String(v));});}))throw new Error(label+' contains spreadsheet errors. Resolve those connections before using these statistics.');}
function announcementDriverName_(value){const name=String(value||'').trim();return /^(?:0|-|n\/a|cancelled|canceled|not raced)$/i.test(name)?'':name;}
function announcementDivisionRows_(results,overview,calendar,task){
  announcementCheckCells_(results,'S'+task.season+' D'+task.division+' results');announcementCheckCells_(overview,'Grand Prix Overview');announcementCheckCells_(calendar,'Race Calendar');
  if(!results[3]||!/^driver\s*$/i.test(String(results[3][2])))throw new Error('Unrecognised Driver Results NoSort layout in S'+task.season+' D'+task.division+'.');
  const columns=[];for(let col=4;col<results[3].length;col++){const h=String(results[3][col]).trim();if(/^Pole$/i.test(h))break;const m=h.match(/^R(\d+)(?:\(R\))?$/i);if(m)columns.push({col:col,round:Number(m[1])});else if(h&&!/^R\d+\(s\)$/i.test(h))throw new Error('Unrecognised race heading '+h+'.');}
  const calendarRounds=calendar.filter(function(r){return /^\d+$/.test(String(r[0]))&&Number(r[0])>0;});
  if(!columns.length||new Set(columns.map(function(c){return c.round;})).size!==columns.length||calendarRounds.length!==columns.length)throw new Error('Missing or duplicate main-race columns.');
  const events=[];
  columns.forEach(function(column){
    const cal=calendar.filter(function(r){return Number(r[0])===column.round;});
    if(cal.length!==1||!cal[0][3])throw new Error('Round '+column.round+' has no unique calendar track.');
    const track=announcementTrackKey_(cal[0][3],true),ov=overview.filter(function(r){return Number(r[0])===column.round;});
    if(ov.length!==1)throw new Error('Round '+column.round+' has no unique overview row.');
    const podium=[];
    results.slice(4).forEach(function(row){const position=Number(row[column.col]),name=announcementDriverName_(row[2]);if(name&&position>=1&&position<=3&&Number.isInteger(position))podium.push({position:position,name:name});});
    if(new Set(podium.map(function(p){return p.position;})).size!==podium.length)throw new Error('Duplicate podium positions in round '+column.round+'.');
    events.push({track:track,round:column.round,pole:announcementDriverName_(ov[0][6]),podium:podium});
  });return events;
}
function readPreseasonAnnouncementDivision(input){ fapAssertEntry_('readPreseasonAnnouncementDivision');
  const s=announcementSession_(input),index=Number(input.index);if(!Number.isInteger(index)||index<0||index>=s.tasks.length)throw new Error('Invalid source index.');
  const t=s.tasks[index],book=SpreadsheetApp.openById(t.id),get=function(name){const sheet=book.getSheetByName(name);if(!sheet)throw new Error('S'+t.season+' D'+t.division+' is missing '+name+'.');return sheet.getDataRange().getDisplayValues();};
  const start=get('Start Here');if(String(start[2]&&start[2][1])!==t.season||Number(start[3]&&start[3][1])!==t.division)throw new Error('The connected Division workbook identity does not match.');
  const events=announcementDivisionRows_(get('Driver Results NoSort'),get('Grand Prix Overview'),get('Race Calendar'),t);
  const packet={season:t.season,division:t.division,events:events,url:book.getUrl(),readAt:new Date().toISOString()};announcementCachePut_(s.token+'_'+index,packet);
  return {index:index,rounds:events.length};
}
function announcementLeaders_(counts){const values=Object.keys(counts).map(function(k){return counts[k];}),max=Math.max(0,...values.map(function(v){return v.count;}));return {count:max,names:values.filter(function(v){return v.count===max;}).map(function(v){return v.name;}).sort(function(a,b){return a.localeCompare(b);})};}
function announcementAggregate_(s,packets,names){
  const tracks={},unlinked={};s.races.forEach(function(r){tracks[announcementTrackKey_(r.track,false)]={track:r.track,poles:{},wins:{},podiums:{},previous:[],records:[]};});
  const identity=function(name){const key=seasonStatisticsPreviewNameKey_(name),known=names[key];if(!known)unlinked[name]=true;return known||{id:'name:'+name.trim().toLowerCase(),name:name};};
  const add=function(counts,name){if(!name)return;const d=identity(name);if(!counts[d.id])counts[d.id]={name:d.name,count:0};counts[d.id].count++;};
  packets.forEach(function(p){p.events.forEach(function(e){const t=tracks[e.track];if(!t)return;const podiumIds=e.podium.map(function(d){return identity(d.name).id;});if(new Set(podiumIds).size!==podiumIds.length)throw new Error('S'+p.season+' D'+p.division+' R'+e.round+' lists the same linked driver more than once on the podium. Review the source or driver aliases.');add(t.poles,e.pole);e.podium.forEach(function(driver){add(t.podiums,driver.name);if(driver.position===1)add(t.wins,driver.name);});if(p.season===s.to)t.previous.push({division:p.division,round:e.round,pole:e.pole,win:(e.podium.find(function(d){return d.position===1;})||{}).name||''});});});
  return {tracks:Object.keys(tracks).map(function(k){const t=tracks[k];t.key=k;t.leaders={poles:announcementLeaders_(t.poles),wins:announcementLeaders_(t.wins),podiums:announcementLeaders_(t.podiums)};delete t.poles;delete t.wins;delete t.podiums;t.previous.sort(function(a,b){return a.division-b.division||a.round-b.round;});return t;}),unlinked:Object.keys(unlinked).sort()};
}
/** Permanent records use the workbook's current labels, not historic calendar aliases.
 * Jeddah and Saudi are separate record rows in this source; do not collapse them.
 */
function announcementPermanentRecords_(rows,division,tracks){
  announcementCheckCells_(rows,'Permanent track records');
  const seen={};
  rows.slice(1).forEach(function(row){
    const label=String(row[0]||'').trim(),time=String(row[1]||'').trim();
    if(!time||/^(?:-+|—|–|n\/a)$/i.test(time))return;
    const key=label.toLowerCase()==='jeddah'?'jeddah':announcementTrackKey_(label,false),track=tracks.find(function(t){return t.key===key;});
    if(!track)return;
    if(seen[key])throw new Error('Duplicate permanent records for '+label+' in Division '+division+'.');
    seen[key]=true;
    track.records.push({division:division,time:time,driver:row[2],date:row[4],season:row[5]});
  });
}
function announcementRecordDivisionCount_(session){
  const divisions=Array.from(new Set(session.tasks.filter(function(t){return t.season===session.to;}).map(function(t){return Number(t.division);}))).sort(function(a,b){return a-b;});
  if(!divisions.length||divisions.length>8||divisions.some(function(d,i){return d!==i+1;}))throw new Error('Prepare the statistics again: the previous season division count is unavailable.');
  return divisions.length;
}
function finishPreseasonAnnouncement(input){ fapAssertEntry_('finishPreseasonAnnouncement');
  const s=announcementSession_(input),packets=s.tasks.map(function(t,i){return announcementCacheGet_(s.token+'_'+i);}),names={};for(let i=0;i<s.nameChunks;i++)Object.assign(names,announcementCacheGet_(s.token+'_names_'+i));const report=announcementAggregate_(s,packets,names);
  const book=trackRecordsBook_();
  report.recordDivisions=announcementRecordDivisionCount_(s);
  const permanentRecords=trackRecordsRows_();
  for(let d=1;d<=report.recordDivisions;d++){
    const rows=[['Track','Time','Driver','Team','Date','Season']].concat(permanentRecords.filter(r=>r.division===d&&!r.review).map(r=>[r.circuit,r.time,r.driver,r.team,r.date,r.season]));
    announcementPermanentRecords_(rows,d,report.tracks);
  }
  Object.assign(report,{token:s.token,season:s.season,from:s.from,to:s.to,races:s.races,created:s.created,sources:packets.map(function(p){return {season:p.season,division:p.division,url:p.url,readAt:p.readAt};}),recordSource:book.getUrl(),recordsReadAt:new Date().toISOString()});
  announcementCachePut_(s.token+'_report',report);return report;
}
