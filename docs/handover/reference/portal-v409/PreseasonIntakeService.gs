/** Season-specific intake. Previous seasons are read-only. Processed responses
 * move to Archive only after their season and permanent records have saved.
 * Three manually readable tables in the TEST Master, sharing permanent Driver IDs. */
const F1XL_INTAKE = Object.freeze({
  tracker:{name:'Applications Tracker',headers:['Tracker ID','Driver ID','Previous gamertag','Current gamertag','Previous season','Previous division','Previous role','Applied','Application key','Notes','Response','Chased','Platform','Controller','Commitment','Applicant group','Self recording TT','Draft eligibility review','Commitment source']},
  applications:{name:'Processed Applications',headers:['Application key','Driver ID','Gamertag','Processed','Processed at','Source row','Application details']},
  trials:{name:'Time Trial Queue',headers:['Driver ID','Gamertag','Application key','Status','Booked date','Notes','Booked time','Conducting admin','Completed at']}
});

function intakeSeasonContext_(season) {
  season=seasonPlanningSeason_(season);
  const book=seasonPlanningBook_(season);
  const active=!!book&&String(book.getSheetByName('Start Here').getRange('I7').getDisplayValue()).trim()==='Active';
  if(!book||!seasonMasterIsPlanning_(book)&&!active)throw new Error('Choose a preseason or active Season Master.');
  const plan=seasonPlanningRead_(book.getSheetByName(F1XL_SEASON_PLANNING.sheetName),season,book).plan;
  return {season:season,book:book,plan:plan,active:active};
}
/** Keep physical row positions so small saves preserve manually spaced tables. */
function intakeReadTable_(book,key) {
    const definition=F1XL_INTAKE[key],sheet=book.getSheetByName(definition.name),last=sheet?sheet.getLastRow():0;
    const display=last?sheet.getRange(1,1,last,definition.headers.length).getDisplayValues():[],headers=display.length?display[0]:null;
    const legacyTrials=key==='trials'&&headers&&[6,8].some(function(width){return JSON.stringify(headers.slice(0,width))===JSON.stringify(definition.headers.slice(0,width))&&headers.slice(width).every(function(v){return !v;})&&sheet.getLastColumn()<=width;});
    const legacyTracker=key==='tracker'&&headers&&JSON.stringify(headers.slice(0,10))===JSON.stringify(definition.headers.slice(0,10))&&headers.slice(10).every(function(v){return !v;})&&sheet.getLastColumn()<=10;
    if(headers&&!legacyTrials&&!legacyTracker&&JSON.stringify(headers)!==JSON.stringify(definition.headers))throw new Error(definition.name+' has an unrecognised layout. Nothing was changed.');
    if(last>1&&sheet.getRange(2,1,last-1,definition.headers.length).getFormulas().some(function(row) { return row.some(Boolean); }))throw new Error(definition.name+' contains manual formulas. Review them before processing through FAP; they have not been overwritten.');
    const positions=[],rows=[];display.slice(1).forEach(function(row,i){if(row[0]){positions.push(i+2);rows.push(row);}});
    return {sheet:sheet,legacy:legacyTracker,headers:headers,rawRows:rows,positions:positions,rows:rows};
}
function intakeContext_(season) {
  const context=intakeSeasonContext_(season),book=context.book,data={};Object.keys(F1XL_INTAKE).forEach(function(key){data[key]=intakeReadTable_(book,key);});
  const revision=intakeHash_(data.tracker.rows.concat([['Applications']],data.applications.rows,[['Trials']],data.trials.rows));
  data.tracker.rows=data.tracker.rows.map(function(r){return intakeTrackerDefaults_(r,data.applications.rows,data.tracker.legacy);});
  return Object.assign(context,{data:data,revision:revision});
}
/** Extend legacy tracker rows on read; persist only on an explicit write. */
function intakeTrackerDefaults_(row,processed,legacy) {
  const r=F1XL_INTAKE.tracker.headers.map(function(_,i){return String(row[i]||'');});
  const matches=processed.filter(function(a){return a[1]===r[1]&&r[1];}).map(function(a){try{return JSON.parse(a[6]);}catch(error){return {};}}).sort(function(a,b){return String(b.received||'').localeCompare(String(a.received||''));});
  const app=matches[0]||{};
  if(legacy&&!r[10]&&r[7]==='Yes')r[10]='Y';
  if(legacy){if(!r[12])r[12]=app.platform||'';if(!r[13])r[13]=app.controller||'';}
  if(r[18]!=='Manual'){r[14]=intakeCommitment_(app.seasonCommitment);r[18]='Application';}
  if(!r[15]&&!r[4])r[15]=/^yes\b/i.test(app.newToF1XL||'')?'New':/^no\b/i.test(app.newToF1XL||'')?'Returning after absence':'Unknown';
  return r;
}
function intakeCommitment_(value) { const m=String(value||'').match(/^(yes|maybe|no)\b/i);return m?m[1].charAt(0).toUpperCase()+m[1].slice(1).toLowerCase():''; }
function savePreseasonTracker(input) { fapAssertEntry_('savePreseasonTracker');
  return withApplicationLock_(function(){
    const c=intakeContext_(input.season);intakeRequireRevision_(input,c);
    if(!Array.isArray(input.rows)||!input.rows.length)throw new Error('There are no tracker changes to save.');
    const rows=c.data.tracker.rows.map(function(r){return r.slice();}),seen={};
    input.rows.forEach(function(change){
      const row=rows.find(function(r){return r[0]===change.id;});
      if(!row||seen[change.id])throw new Error('A tracker entry is missing or repeated. Refresh before saving.');seen[change.id]=true;
      const fields=change.fields;if(!fields||typeof fields!=='object'||Array.isArray(fields))throw new Error('Invalid tracker fields.');
      Object.keys(fields).forEach(function(key){
        if(!/^(9|1[0-7])$/.test(key))throw new Error('Identity and application records cannot be changed through tracker cells.');
        const i=Number(key),v=String(fields[key]==null?'':fields[key]).trim();
        if(v.length>(i===9?5000:300))throw new Error('The tracker entry is too long.');
        const allowed=i===10||i===11||i===17?['','Y','N','R']:i===14?['','Yes','Maybe','No']:i===15?['Unknown','New','Returning after absence']:null;
        if(allowed&&allowed.indexOf(v)<0)throw new Error('Choose one of the listed tracker options.');
        row[i]=v;if(i===14)row[18]='Manual';
      });
    });
    const writes=[];intakeChangedRowsWrite_(c,'tracker',rows,writes);intakeCommit_(writes);
    if(input.trackerReply===true){
      // Only the tracker changed. Read the authoritative season tables back,
      // without rebuilding the unrelated inbox or permanent driver directory.
      const saved=intakeContext_(c.season);
      return {trackerOnly:true,season:saved.season,active:saved.active,revision:saved.revision,tracker:saved.data.tracker.rows,trials:saved.data.trials.rows,
        recordsChanged:JSON.stringify(c.data.applications.rows)!==JSON.stringify(saved.data.applications.rows),
        message:'Tracker changes saved. Application processing and time-trial results are unchanged.'};
    }
    const result=getPreseasonIntake(c.season);result.message='Tracker changes saved. Application processing and time-trial results are unchanged.';return result;
  });
}
function intakeHash_(value) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(value))); }
function addPreseasonDriver(input) { fapAssertEntry_('addPreseasonDriver');
  return withApplicationLock_(function() {
    const context=intakeContext_(input.season);intakeRequireRevision_(input,context);
    const registry=openDriverDatabaseContext_(),drivers=intakeDrivers_(),writes=[];
    const existing=drivers.find(function(d) { return d.driverId===input.driverId; });
    const name=input.createDriver===true?applicationText_(input.gamertag):(existing&&existing.gamertag);
    if(!name)throw new Error('Select an existing profile, or enter the gamertag for a new driver.');
    const driver=intakePrepareDriver_(registry,drivers,{gamertag:name,discordId:'',streamLink:''},{driverId:input.driverId,createDriver:input.createDriver===true},writes,context.season);
    const rows=context.data.tracker.rows.map(function(row) { return row.slice(); });
    if(rows.some(function(row) { return row[1]===driver.driverId; }))throw new Error('That driver is already in this season’s tracker.');
    const unlinked=rows.filter(function(row) { return !row[1]&&intakeName_(row[3])===intakeName_(name); });
    if(unlinked.length>1)throw new Error('Several unlinked tracker entries match. Check them before adding the driver.');
    if(unlinked.length)unlinked[0][1]=driver.driverId;
    else rows.push(['MANUAL-'+driver.driverId,driver.driverId,'',name,'','','Manual entry','','','','','','','','',input.createDriver===true?'New':'Unknown']);
    intakeTableWrite_(context,'tracker',rows,writes);
    writes.push({range:intakeAppendRange_(registry.audit,1,6),values:[[new Date(),driverDatabaseActor_(),'ADD_PRESEASON_DRIVER','driver',driver.driverId,'Manually added to S'+context.season+' tracker']]});
    intakeCommit_(writes);clearDriverDatabaseCache_();
    const result=getPreseasonIntake(context.season);result.message=name+' added to the tracker. Application processing and time trials remain pending.';return result;
  });
}
function intakeName_(value) { return String(value||'').trim().toLowerCase(); }
function intakeDrivers_() {
  return buildDriverDatabaseResponse_(openDriverDatabaseContext_().spreadsheet).drivers.filter(function(d) { return !d.mergedIntoDriverId&&!/^merged$/i.test(d.status); });
}
function intakeMatches_(app,drivers) {
  const name=intakeName_(app.gamertag),discord=intakeName_(app.discordId);
  return drivers.filter(function(d) { return (discord&&intakeName_(d.discordId)===discord)||intakeName_(d.gamertag)===name||d.aliases.some(function(a) { return intakeName_(a.alias)===name; }); });
}
/** Native form timestamps are Dates; manual test entries can be UK or ISO text. */
function intakeApplicationTime_(value) {
  if(value instanceof Date&&!isNaN(value.getTime()))return Utilities.formatDate(value,'Europe/London','yyyy-MM-dd HH:mm');
  const text=String(value||'').trim();
  let m=text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/),parts;
  if(m)parts=[+m[1],+m[2],+m[3],+m[4],+m[5],+(m[6]||0)];
  else {m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(m)parts=[+m[3],+m[2],+m[1],+m[4],+m[5],+(m[6]||0)];}
  if(!parts)return '';
  const [year,month,day,hour,minute,second]=parts,date=new Date(Date.UTC(year,month-1,day,hour,minute,second));
  if(year<2000||year>2100||date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day||hour>23||minute>59||second>59)return '';
  const pad=n=>String(n).padStart(2,'0');return year+'-'+pad(month)+'-'+pad(day)+' '+pad(hour)+':'+pad(minute);
}
function intakeApplicationSource_(context) {
  context=context||openApplicationContext_();const sheet=context.sourceSheet,lastRow=Math.max(1,sheet.getLastRow()),width=Math.max(21,sheet.getLastColumn());
  return {context:context,raw:sheet.getRange(1,1,lastRow,width).getValues(),display:sheet.getRange(1,1,lastRow,width).getDisplayValues()};
}
function intakeApplications_(plan,active,source) {
  source=source||intakeApplicationSource_();const context=source.context,raw=source.raw,display=source.display,sheet=context.sourceSheet;
  const columns=applicationColumns_(context.headers);
  const apps=[],warnings=[],excluded={before:0,after:0,invalid:0};
  raw.slice(1).forEach(function(row,i) {
    if(!applicationText_(row[columns.gamertag]))return;
    const local=intakeApplicationTime_(row[0]);
    if(!local) { excluded.invalid++;warnings.push('Row '+(i+2)+' has an unreadable timestamp. Use a spreadsheet date or DD/MM/YYYY HH:mm.');return; }
    if(local.substring(0,10)<plan.opens){excluded.before++;return;}
    if(!active&&local.substring(0,10)>=plan.start){excluded.after++;return;}
    const app=buildApplicationRecord_(display[i+1],i+2,-1,context.headers);
    app.received=local+' UK';
    app.key=intakeHash_([context.spreadsheet.getId(),sheet.getSheetId(),row.slice(0,21)]);
    app.late=!active&&local>plan.dates.apps+' '+plan.times.apps;
    apps.push(app);
  });
  const keys={};apps.forEach(function(app) { if(keys[app.key])throw new Error('Duplicate identical form responses need checking before processing.');keys[app.key]=true; });
  return {apps:apps.reverse(),warnings:warnings,excluded:excluded,sourceUrl:context.spreadsheet.getUrl()};
}
/** Small read-only hub check. Does not load driver profiles or time-trial results. */
function getApplicationAttention(seasons,force){ fapAssertEntry_('getApplicationAttention');
  const list=Array.from(new Set((Array.isArray(seasons)?seasons:[]).slice(0,10).map(s=>seasonPlanningSeason_(String(s))))).sort();
  return fapAttentionCached_('drivers:'+list.join(',')+(F1XL_APPLICATION_SOURCE.profile==='combined'?':combined':''),force,()=>{
  // Counts need timestamps, identity and the application key, not rendered answers.
  const result={},context=openApplicationContext_(),sheet=context.sourceSheet,raw=sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),21).getValues();
  const columns=applicationColumns_(context.headers);
  const incoming=raw.slice(1).filter(r=>applicationText_(r[columns.gamertag])).map(r=>{const date=intakeApplicationTime_(r[0]),key=intakeHash_([context.spreadsheet.getId(),sheet.getSheetId(),r.slice(0,21)]);return {date,key,app:{key,received:date+' UK',gamertag:applicationText_(r[columns.gamertag]),discordId:applicationText_(r[columns.discordId])}};});
  list.forEach(function(season){
    try{
      season=seasonPlanningSeason_(String(season));
      const book=seasonPlanningBook_(season),active=String(book.getSheetByName('Start Here').getRange('I7').getDisplayValue()).trim()==='Active',plan=seasonPlanningRead_(book.getSheetByName(F1XL_SEASON_PLANNING.sheetName),season,book).plan,processed=book.getSheetByName(F1XL_INTAKE.applications.name);
      // A new season has no processing ledger until its first application is saved.
      if(processed&&processed.getLastRow()&&processed.getRange('A1').getDisplayValue()!==F1XL_INTAKE.applications.headers[0])throw new Error('Processed Applications needs checking.');
      const last=processed?processed.getLastRow():0,rows=last>1?processed.getRange(2,1,last-1,F1XL_APPLICATION_SOURCE.profile==='combined'?7:1).getDisplayValues():[],keys=new Set(rows.map(r=>r[0]).filter(Boolean)),apps=incoming.filter(a=>a.date&&a.date.substring(0,10)>=plan.opens&&(active||a.date.substring(0,10)<plan.start)),seen=new Set();
      if(apps.some(a=>{if(seen.has(a.key))return true;seen.add(a.key);return false;}))throw new Error('Duplicate identical form responses need checking before processing.');
      result[season]={available:true,count:apps.filter(a=>!keys.has(a.key)&&!intakeProcessedApplication_(rows,a.app)).length};
    }
    catch(e){result[season]={available:false,error:String(e.message||e)};}
  });return result;
  });
}
/** Reconcile the same original response after switching workbooks. Never match
 * by driver name alone or rewrite the old processing/TT/tracker keys. */
function intakeProcessedApplication_(rows,app){
  const direct=rows.filter(r=>r[0]===app.key);if(direct.length>1)throw Error('Duplicate processed application records need checking.');if(direct.length)return direct[0];
  if(F1XL_APPLICATION_SOURCE.profile!=='combined')return null;
  const identity=a=>[String(a.received||'').replace(/ UK$/,'').trim(),intakeName_(a.gamertag),String(a.discordId||'').trim().toLowerCase()];
  const id=identity(app);if(!id[0]||!id[1])return null;
  if(!id[2]){if(rows.some(r=>{try{return JSON.stringify(identity(JSON.parse(r[6])).slice(0,2))===JSON.stringify(id.slice(0,2));}catch(error){return false;}}))throw Error('A previously processed application may match, but its Discord ID is missing. Check the original response before processing.');return null;}
  const matches=rows.filter(r=>{let saved;try{saved=JSON.parse(r[6]);}catch(error){return false;}return JSON.stringify(identity(saved))===JSON.stringify(id);});
  if(matches.length>1)throw Error('Several processed applications match this original response. Check them before retrying.');
  if(matches.length){const saved=JSON.parse(matches[0][6]),fields=['realName','age','nationality','controller','platform','streamLink','newToF1XL','promotionDemotionAgreement','sundayStartCommitment','seasonCommitment','rulesAgreement','timeTrialAcknowledgement','discordJoined','previousGamertags','streamConsent'];if(fields.some(k=>saved[k]&&app[k]&&String(saved[k]).trim()!==String(app[k]).trim()))throw Error('A previously processed application has different answers. Check the original and saved response before processing.');}
  return matches[0]||null;
}
function getPreseasonIntake(season) { fapAssertEntry_('getPreseasonIntake');
  const context=intakeContext_(season),drivers=intakeDrivers_();let incoming;
  try { incoming=intakeApplications_(context.plan,context.active); }
  catch(error) { incoming={failed:true,apps:[],warnings:['Applications could not be loaded: '+error.message+' Existing tracker entries remain available. Refresh to retry the application inbox.'],sourceUrl:'https://docs.google.com/spreadsheets/d/'+F1XL_APPLICATION_SOURCE.spreadsheetId+'/edit'}; }
  incoming.apps.forEach(function(app) {
    const processed=intakeProcessedApplication_(context.data.applications.rows,app);
    app.processed=!!processed;app.driverId=processed?processed[1]:'';app.archivePending=!!processed;
    if(processed)app.processedKey=processed[0];
    if(processed)app.seasonGamertag=processed[2];
    app.candidates=intakeMatches_(app,drivers).map(function(d) { return d.driverId; });
  });
  // Keep the complete saved application reviewable after it leaves the inbox.
  context.data.applications.rows.forEach(function(row) {
    if(incoming.apps.some(function(a){return a.key===row[0]||a.processedKey===row[0];}))return;
    let app;try {app=JSON.parse(row[6]);}catch(error){incoming.warnings.push('Saved application details could not be read for '+row[2]+'.');return;}
    app.key=row[0];app.driverId=row[1];app.seasonGamertag=row[2];app.processed=true;app.archivePending=false;app.candidates=[];
    incoming.apps.push(app);
  });
  incoming.apps.sort(function(a,b){return b.received.localeCompare(a.received);});
  return {season:context.season,active:context.active,url:context.book.getUrl(),revision:context.revision,applications:incoming.apps,sourceAvailable:!incoming.failed,warnings:incoming.warnings,excluded:incoming.excluded||{},window:{opens:context.plan.opens,start:context.plan.start},sourceUrl:incoming.sourceUrl,drivers:drivers,tracker:context.data.tracker.rows,trials:context.data.trials.rows,previousSeasons:getSeasonPlanningPreviousSeasons_(context.season)};
}
function getSeasonPlanningPreviousSeasons_(season) {
  return Object.keys(PropertiesService.getScriptProperties().getProperties()).filter(function(key) { return key.indexOf(F1XL_SEASON_MASTER.propertyPrefix)===0; }).map(function(key) { return key.substring(F1XL_SEASON_MASTER.propertyPrefix.length).replace(/_/g,'.'); }).filter(function(value) { return Number(value)<Number(season); }).sort(function(a,b) { return Number(b)-Number(a); });
}

function previewPreseasonCarryForward(input) { fapAssertEntry_('previewPreseasonCarryForward');
  const context=intakeContext_(input.season),previous=seasonPlanningSeason_(input.previousSeason);
  if(context.active)throw new Error("Previous-season import is only available during preseason. Process incoming applications here.");
  if(Number(previous)>=Number(context.season))throw new Error('Choose an earlier season.');
  const people=[],sources=[];
  const add=function(name,id,division,role,platform,controller) { name=applicationText_(name);if(name)people.push({name:name,driverId:applicationText_(id),division:String(division||''),role:role,platform:platform||'',controller:controller||''}); };
  if(input.sourceType==='master') {
    const id=PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(previous));
    if(!id)throw new Error('That previous Season Master is not connected. Use its division spreadsheets instead.');
    const book=SpreadsheetApp.openById(id),start=book.getSheetByName('Start Here'),entrants=book.getSheetByName('Season Entrants');
    if(!start||String(start.getRange('B3').getDisplayValue())!==previous||!entrants)throw new Error('The previous Master does not match the selected season.');
    sources.push(book.getName());
    const entrantRows=entrants.getLastRow()>1?entrants.getRange(2,1,entrants.getLastRow()-1,8).getDisplayValues():[];
    entrantRows.forEach(function(row) { add(row[1],row[0],'','Entrant',row[6],row[7]); });
    const addLineup=function(name,division,role){const entrant=entrantRows.find(function(r){return intakeName_(r[1])===intakeName_(name);})||[];add(name,entrant[0],division,role,entrant[6],entrant[7]);};
    const lineups=book.getSheetByName('Division Line-ups'),count=Number(start.getRange('B5').getValue());
    if(lineups&&count>0&&count<=F1XL_CAPACITY.divisions)for(let division=1;division<=count;division++) {
      lineups.getRange(6+(division-1)*30,2,F1XL_CAPACITY.raceEntries,1).getDisplayValues().forEach(function(row) { addLineup(row[0],division,'Driver'); });
      lineups.getRange(6+(division-1)*30,8,F1XL_CAPACITY.raceEntries,1).getDisplayValues().forEach(function(row) { addLineup(row[0],division,'Reserve'); });
    }
  } else if(input.sourceType==='divisions') {
    const ids=String(input.divisionIds||'').split(/[\s,]+/).filter(Boolean).map(function(value) { const match=value.match(/\/spreadsheets\/d\/([\w-]+)/);return match?match[1]:value; });
    if(!ids.length||ids.length>F1XL_CAPACITY.divisions||new Set(ids).size!==ids.length||ids.some(function(id) { return !/^[\w-]+$/.test(id); }))throw new Error('Enter one different Division Sheet ID or URL per line, in division order.');
    ids.forEach(function(id,index) {
      const book=SpreadsheetApp.openById(id),data=book.getSheetByName('Data');
      if(!data)throw new Error(book.getName()+' is missing its Data tab.');
      const seasonMatch=book.getName().match(/\b(?:Season\s*|S)(\d+(?:\.5)?)\b/i);
      if(seasonMatch&&Number(seasonMatch[1])!==Number(previous))throw new Error(book.getName()+' belongs to a different season.');
      sources.push(book.getName());
      const height=Math.max(1,data.getLastRow()-2);
      data.getRange(3,1,height,7).getDisplayValues().forEach(function(row) { add(row[0],'',index+1,'Entrant',row[5],row[6]); });
      data.getRange(3,16,height,1).getDisplayValues().forEach(function(row) { add(row[0],'',index+1,'Reserve'); });
      data.getRange(3,20,height,1).getDisplayValues().forEach(function(row) { add(row[0],'',index+1,'Retired'); });
    });
  } else throw new Error('Choose the previous-season source.');
  const drivers=intakeDrivers_(),dedup={};
  people.forEach(function(person) {
    const matches=intakeMatches_({gamertag:person.name},drivers);
    if(person.driverId&&!drivers.some(function(d) { return d.driverId===person.driverId; }))person.driverId='';
    if(!person.driverId&&matches.length===1)person.driverId=matches[0].driverId;
    const key=person.driverId||'name:'+intakeName_(person.name);
    if(!dedup[key])dedup[key]={name:person.name,driverId:person.driverId,divisions:[],roles:[],platform:'',controller:''};
    if(person.platform&&!dedup[key].platform)dedup[key].platform=person.platform;if(person.controller&&!dedup[key].controller)dedup[key].controller=person.controller;
    if(person.division&&dedup[key].divisions.indexOf(person.division)<0)dedup[key].divisions.push(person.division);
    if(dedup[key].roles.indexOf(person.role)<0)dedup[key].roles.push(person.role);
  });
  const rows=Object.keys(dedup).map(function(key) { const p=dedup[key],profile=drivers.find(function(d){return d.driverId===p.driverId;});return ['RETURN-'+intakeHash_([previous,key]),p.driverId,p.name,profile?profile.gamertag:p.name,previous,p.divisions.join(', '),p.roles.join(', '),'','','','','',p.platform,p.controller,'','','','']; });
  if(!rows.length)throw new Error('No previous-season drivers were found. Check the source before continuing.');
  return {season:context.season,previousSeason:previous,rows:rows,sources:sources,previewRevision:intakeHash_([rows,sources]),revision:context.revision};
}

function savePreseasonCarryForward(input) { fapAssertEntry_('savePreseasonCarryForward');
  return withApplicationLock_(function() {
    const context=intakeContext_(input.season);intakeRequireRevision_(input,context);
    const preview=previewPreseasonCarryForward(input);
    if(preview.previewRevision!==input.previewRevision)throw new Error('The previous-season roster changed. Preview it again.');
    const rows=context.data.tracker.rows.map(function(row) { return row.slice(); });
    if(rows.some(function(row) { return row[4]&&row[4]!==preview.previousSeason; }))throw new Error('This tracker was already seeded from another season. Check it before importing a different source.');
    let added=0;
    preview.rows.forEach(function(row) {
      const existing=rows.find(function(r) { return r[0]===row[0]||(row[1]&&r[1]===row[1])||intakeName_(r[2]||r[3])===intakeName_(row[2]); });
      if(existing) { if(!existing[4]) { existing[2]=row[2];existing[4]=row[4];existing[5]=row[5];existing[6]=row[6]; } if(!existing[12])existing[12]=row[12];if(!existing[13])existing[13]=row[13]; }
      else { rows.push(row);added++; }
    });
    const writes=[];intakeTableWrite_(context,'tracker',rows,writes);intakeCommit_(writes);
    const result=getPreseasonIntake(context.season);result.message=added+' previous-season drivers added. Existing application statuses were preserved.';return result;
  });
}
function intakeRequireRevision_(input,context) { if(input.revision!==context.revision)throw new Error('This season changed since you opened it. Refresh before saving.'); }
function intakeAppendRange_(sheet,height,width) {
  const row=sheet.getLastRow()+1;
  if(row+height-1>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),row+height-1-sheet.getMaxRows());
  if(width>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),width-sheet.getMaxColumns());
  return sheet.getRange(row,1,height,width);
}
function intakeTableWrite_(context,key,rows,writes) {
  const definition=F1XL_INTAKE[key];let sheet=context.data[key].sheet;
  const newPresentation=!sheet;
  if(!sheet)sheet=context.book.insertSheet(definition.name);
  const values=[definition.headers].concat(rows.map(function(row) { return definition.headers.map(function(_,i) { return row[i]==null?'':row[i]; }); })),height=Math.max(values.length,sheet.getLastRow());
  const grew=height>sheet.getMaxRows();
  if(grew)sheet.insertRowsAfter(sheet.getMaxRows(),height-sheet.getMaxRows());
  if(definition.headers.length>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),definition.headers.length-sheet.getMaxColumns());
  while(values.length<height)values.push(definition.headers.map(function() { return ''; }));
  writes.push({range:sheet.getRange(1,1,height,definition.headers.length),values:values,text:true});
  if(newPresentation||grew)sheetPresentationSafely_(function() { sheetPresentationIntake_(context.book,sheet,key); });
}
/** Existing tables keep their headers, spacing and unchanged cells. Schema changes
 * still use the established whole-table migration/rollback path. */
function intakeChangedRowsWrite_(context,key,rows,writes) {
  const table=context.data[key],definition=F1XL_INTAKE[key],width=definition.headers.length;
  if(!table.sheet||JSON.stringify(table.headers)!==JSON.stringify(definition.headers)||!table.rawRows||rows.length!==table.rawRows.length||rows.some(function(r,i){return r[0]!==table.rawRows[i][0];}))return intakeTableWrite_(context,key,rows,writes);
  const blocks=[];let block=null;
  rows.forEach(function(row,i){
    const old=table.rawRows[i],changed=[];for(let col=0;col<width;col++)if(String(row[col]==null?'':row[col])!==String(old[col]==null?'':old[col]))changed.push(col);
    if(!changed.length)return;
    const first=changed[0],last=changed[changed.length-1],physical=table.positions[i],values=row.slice(first,last+1).map(function(v){return v==null?'':v;});
    if(block&&block.row+block.values.length===physical&&block.column===first+1&&block.width===last-first+1)block.values.push(values);
    else {block={row:physical,column:first+1,width:last-first+1,values:[values]};blocks.push(block);}
  });
  blocks.forEach(function(write){writes.push({range:table.sheet.getRange(write.row,write.column,write.values.length,write.width),values:write.values,text:true});});
}
/** Roll back completed writes on errors; retry is safe because application keys are stable. */
function intakeCommit_(writes) {
  writes.forEach(function(write) { write.before=seasonPlanningValues_(write.range); });
  const done=[];
  try { writes.forEach(function(write) { if(write.text)write.range.setNumberFormat('@');if(write.formulas)write.range.setNumberFormat('General');write.range.setValues(write.values.map(function(row) { return row.map(function(v) { return !write.formulas&&typeof v==='string'&&/^[=+@]/.test(v)?"'"+v:v; }); }));done.push(write); });SpreadsheetApp.flush(); }
  catch(error) {
    let failed=false;done.reverse().forEach(function(write) { try { write.range.setValues(write.before); }catch(restore){failed=true;} });
    throw new Error(failed?'Save failed and restoration needs checking in the Master and Driver Registry. Refresh before retrying.': 'Save failed; completed value changes were restored. '+error.message);
  }
  if(typeof ticketFormQueueWrites_==='function')ticketFormQueueWrites_(writes);
}

function processPreseasonApplication(input) { fapAssertEntry_('processPreseasonApplication');
  return withApplicationLock_(function() {
    const context=intakeContext_(input.season);intakeRequireRevision_(input,context);
    if(context.data.applications.rows.some(function(row){return row[0]===input.key;}))throw new Error('This application is already processed. Use Retry archive if it is still in the inbox.');
    const apps=intakeApplications_(context.plan,context.active).apps,app=apps.find(function(a) { return a.key===input.key; });
    if(!app)throw new Error('The application changed, moved, or falls outside this preseason. Refresh before processing.');
    if(intakeProcessedApplication_(context.data.applications.rows,app))throw Error('This application is already processed. Use Retry archive if it is still in the inbox.');
    if(app.late&&input.acceptLate!==true)throw new Error('This application arrived after the closing time. Confirm accepting the late application.');
    const registry=openDriverDatabaseContext_(),drivers=intakeDrivers_(),writes=[];
    const name=String(input.seasonGamertag==null?app.gamertag:input.seasonGamertag).trim();
    if(!name||name.length>120||/[\x00-\x1f\x7f]/.test(name)||/^[=+@]/.test(name)||!driverDatabaseNormalisedName_(name))throw new Error('Enter a season display name of up to 120 characters on one line.');
    // Preserve the submitted response. Use only the approved name for season
    // records and any explicitly requested permanent profile changes.
    if(input.createDriver===true&&intakeMatches_(app,drivers).length)throw new Error('A matching permanent profile exists. Select it instead of creating a duplicate.');
    const driver=intakePrepareDriver_(registry,drivers,Object.assign({},app,{gamertag:name}),Object.assign({},input,{saveAlias:input.saveAlias===true}),writes,context.season);
    const nameKey=driverDatabaseNormalisedName_(name);
    if(context.data.tracker.rows.some(function(r){return r[1]&&r[1]!==driver.driverId&&driverDatabaseNormalisedName_(r[3]||r[2])===nameKey;})||context.data.trials.rows.some(function(r){return r[0]!==driver.driverId&&driverDatabaseNormalisedName_(r[1])===nameKey;}))throw new Error('That season display name is already used by another driver in this season.');
    const tracker=context.data.tracker.rows.map(function(r) { return r.slice(); });
    let returning=input.trackerId?tracker.find(function(r) { return r[0]===input.trackerId; }):null;
    if(input.trackerId&&!returning)throw new Error('That tracker entry no longer exists. Refresh first.');
    if(returning&&returning[1]&&returning[1]!==driver.driverId)throw new Error('That returning driver is linked to a different permanent profile. Choose the correct profile.');
    const linked=tracker.find(function(r) { return r[1]===driver.driverId; });
    if(linked&&returning&&linked!==returning)throw new Error('This driver already has a different tracker entry. Resolve the duplicate before processing.');
    returning=returning||linked;
    if(!returning) {
      const names=[driver.gamertag,name,app.gamertag].concat(driver.aliases.map(function(a){return a.alias;})).map(intakeName_);
      const matches=tracker.filter(function(r) { return !r[1]&&names.indexOf(intakeName_(r[2]||r[3]))>=0; });
      if(matches.length>1)throw new Error('Several tracker entries match. Select the previous-season driver manually.');
      returning=matches[0];
    }
    if(!returning) { returning=['NEW-'+driver.driverId,driver.driverId,'',name,'','','Application entry','','',''];tracker.push(returning); }
    returning[1]=driver.driverId;returning[3]=name;returning[7]='Yes';returning[8]=app.key;
    if(!returning[10])returning[10]='Y';
    returning[12]=app.platform||returning[12]||'';returning[13]=app.controller||returning[13]||'';
    if(returning[18]!=='Manual'){returning[14]=intakeCommitment_(app.seasonCommitment);returning[18]='Application';}
    if(!returning[4]&&(!returning[15]||returning[15]==='Unknown'))returning[15]=input.createDriver===true||/^yes\b/i.test(app.newToF1XL||'')?'New':/^no\b/i.test(app.newToF1XL||'')?'Returning after absence':'Unknown';
    const trials=context.data.trials.rows.map(function(r){return r.slice();});
    const trial=trials.find(function(r){return r[0]===driver.driverId;});
    if(trial)trial[1]=name;else trials.push([driver.driverId,name,app.key,'Awaiting time trial','','']);
    const processed=context.data.applications.rows.concat([[app.key,driver.driverId,name,'Yes',new Date().toISOString(),String(app.sourceRow),JSON.stringify(Object.assign({},app,{seasonGamertag:name}))]]);
    intakeTableWrite_(context,'tracker',tracker,writes);intakeTableWrite_(context,'trials',trials,writes);intakeTableWrite_(context,'applications',processed,writes);
    writes.push({range:intakeAppendRange_(registry.audit,1,6),values:[[new Date(),driverDatabaseActor_(),'PROCESS_APPLICATION','driver',driver.driverId,'S'+context.season+' application '+app.key]]});
    intakeCommit_(writes);clearDriverDatabaseCache_();
    // Colour is presentation only: a formatting failure must never repeat processing.
    let formattingWarning='';try { context.book.getSheetByName(F1XL_INTAKE.applications.name).getRange(processed.length+1,4).setBackground('#d9ead3'); }catch(error) { formattingWarning=' Processed marker saved; its Sheet colour could not be updated.'; }
    let archiveMessage;try { archiveApplicationByKey_(app.key);archiveMessage=' The response was automatically archived.'; }
    catch(error) { archiveMessage=' The response is still awaiting archive. Use Retry archive; do not process it again. '+error.message; }
    const response=getPreseasonIntake(context.season);response.message=name+' processed: permanent profile linked, tracker updated and time-trial entry ready.'+archiveMessage+formattingWarning;return response;
  });
}

function retryPreseasonApplicationArchive(input) { fapAssertEntry_('retryPreseasonApplicationArchive');
  return withApplicationLock_(function(){
    const context=intakeContext_(input.season);intakeRequireRevision_(input,context);
    const incoming=intakeApplications_(context.plan,context.active).apps.find(a=>a.key===input.key);
    if(!context.data.applications.rows.some(function(r){return r[0]===input.key;})&&!(incoming&&intakeProcessedApplication_(context.data.applications.rows,incoming)))throw new Error('Only a successfully processed application can be archived here.');
    archiveApplicationByKey_(input.key);
    const response=getPreseasonIntake(context.season);response.message='Application archived. Its existing driver, tracker and time-trial records were preserved.';return response;
  });
}

function rejectPreseasonApplication(input) { fapAssertEntry_('rejectPreseasonApplication');
  return withApplicationLock_(function(){
    const context=intakeContext_(input.season);intakeRequireRevision_(input,context);
    if(input.confirmDelete!==true)throw new Error('Confirm rejection and deletion of this application.');
    if(context.data.applications.rows.some(function(r){return r[0]===input.key;}))throw new Error('A processed application cannot be rejected here. Its driver records already exist.');
    const app=intakeApplications_(context.plan,context.active).apps.find(function(a){return a.key===input.key;});
    if(!app)throw new Error('The application changed or is no longer in this preseason. Reload before rejecting.');
    if(intakeProcessedApplication_(context.data.applications.rows,app))throw Error('A processed application cannot be rejected here. Its driver records already exist.');
    const source=openApplicationContext_(),row=applicationRowByKey_(source,source.sourceSheet,input.key);
    if(!row)throw new Error('The application has already left the inbox. Reload the list.');
    CacheService.getScriptCache().remove(F1XL_APPLICATION_SOURCE.cacheKey);
    source.sourceSheet.deleteRow(row);
    const response=getPreseasonIntake(context.season);response.message=app.gamertag+' rejected and deleted from the active responses. No driver, tracker or time-trial records were created.';return response;
  });
}

function intakePrepareDriver_(registry,drivers,app,input,writes,season) {
    let driver=drivers.find(function(d) { return d.driverId===input.driverId; });
    if(input.createDriver===true) {
      if(intakeMatches_(app,drivers).length)throw new Error('A matching permanent profile exists. Select it instead of creating a duplicate.');
      assertGamertagAvailable_(registry,app.gamertag,'');
      const id=nextDriverId_(drivers.map(function(d) { return d.driverId; })),now=new Date(),actor=driverDatabaseActor_();
      driver={driverId:id,gamertag:app.gamertag,aliases:[],sourceRow:registry.directory.getLastRow()+1};
      writes.push({range:intakeAppendRange_(registry.directory,1,13),values:[[id,app.gamertag,driverDatabaseNormalisedName_(app.gamertag),'Active',now,actor,now,actor,'','','',app.discordId,app.streamLink]]});
    }
    if(!driver)throw new Error('Choose a permanent driver profile, or explicitly create one for a new driver.');
    if(input.renameDriver===true&&input.createDriver!==true&&driver.gamertag!==input.expectedGamertag)throw new Error('The permanent gamertag changed since you selected it. Refresh before renaming.');
    assertGamertagAvailable_(registry,app.gamertag,driver.driverId);
    if(input.renameDriver===true&&driver.gamertag!==app.gamertag)writes.push({range:registry.directory.getRange(driver.sourceRow,2,1,2),values:[[app.gamertag,driverDatabaseNormalisedName_(app.gamertag)]]});
    const aliasNames=input.saveAlias!==false||input.renameDriver===true||input.createDriver===true?[app.gamertag]:[];if(input.renameDriver===true)aliasNames.push(driver.gamertag);
    const aliasRows=registry.aliases.getLastRow()>1?registry.aliases.getRange(2,1,registry.aliases.getLastRow()-1,12).getDisplayValues():[];
    const newAliases=[];aliasNames.forEach(function(name) {
      const normal=driverDatabaseNormalisedName_(name);
      if(aliasRows.some(function(r) { return r[1]===driver.driverId&&r[4]===normal&&!/^inactive$/i.test(r[11]); })||newAliases.some(function(r) { return r[4]===normal; }))return;
      newAliases.push(['ALIAS-'+Utilities.getUuid().replace(/-/g,'').substring(0,8).toUpperCase(),driver.driverId,driver.driverId,name,normal,'','','Confirmed','S'+season+' preseason',new Date(),driverDatabaseActor_(),'Active']);
    });
    if(newAliases.length)writes.push({range:intakeAppendRange_(registry.aliases,newAliases.length,12),values:newAliases});
    return driver;
}
