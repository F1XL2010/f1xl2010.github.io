/** Meeting decisions are keyed by permanent Driver ID; source refreshes never move them. */
const F1XL_PRESEASON_PLACEMENT=Object.freeze({
  divisions:{name:'Placement Divisions',headers:['Division','Tier 1 slots','Tier 2 slots','Host','RC']},
  drivers:{name:'Placement Drivers',headers:['Driver ID','Gamertag','Decision','Division','Tier','Slot','Social race notes','Placement notes','Commitment override']},
  marker:'F1XL Placement v1'
});
function preseasonPlacementTable_(book,definition) {
  const sheet=book.getSheetByName(definition.name);
  if(!sheet||!sheet.getLastRow())return {sheet:sheet,rows:[]};
  const range=sheet.getRange(1,1,sheet.getLastRow(),definition.headers.length),formulas=range.getFormulas();
  const values=range.getValues().map(function(row,r){return row.map(function(value,c){return formulas[r][c]||value;});});
  if(JSON.stringify(values[0])!==JSON.stringify(definition.headers))throw new Error(definition.name+' has an unrecognised layout. Nothing was changed.');
  if(formulas.some(function(row){return row.some(Boolean);}))throw new Error(definition.name+' contains manual formulas. Review them before saving through FAP.');
  const rows=values.slice(1).filter(function(row){return row.some(function(v){return v!=='';});});
  if(rows.some(function(row){return !row[0];}))throw new Error(definition.name+' has a row without its identity. Check the Master.');
  return {sheet:sheet,rows:rows};
}
function preseasonPlacementCommitment_(value) {
  const text=String(value||'').trim().toLowerCase();return /^yes\b/.test(text)?'Yes':/^maybe\b/.test(text)?'Maybe':/^no\b/.test(text)?'No':'Unknown';
}
function preseasonPlacementContext_(season) {
  const context=preseasonTTContext_(season),tt=preseasonTTResponse_(context),config=F1XL_PRESEASON_PLACEMENT;
  if(context.active)throw new Error("The preseason placement board is closed. Use Driver placement in the Active season hub.");
  const divisions=preseasonPlacementTable_(context.book,config.divisions),records=preseasonPlacementTable_(context.book,config.drivers);
  const meta=divisions.sheet&&divisions.sheet.getLastRow()?seasonPlanningValues_(divisions.sheet.getRange('H1:I4')):[];
  if(meta.length&&(meta[0][0]!==config.marker||String(meta[0][1])!==context.season||meta[1][0]!=='State'||meta[2][0]!=='Confirmed revision'||meta[3][0]!=='Confirmed at'||['Draft','Confirmed'].indexOf(meta[1][1])<0))throw new Error('Placement status metadata has an unrecognised layout.');
  const people={},apps={},warnings=[],notReturning={};
  context.data.tracker.rows.forEach(function(r){
    if(String(r[10]||'').trim().toUpperCase()==='N'){if(r[1])notReturning[r[1]]=true;return;}
    if(!r[1]){warnings.push('Link '+(r[3]||r[2]||'an unnamed tracker entry')+' to a permanent profile in Applications & tracker.');return;}
    people[r[1]]={driverId:r[1],gamertag:r[3]||r[2],previousSeason:r[4],previousDivision:r[5],trackerNotes:r[9],trackerCommitment:r[14],trackerPlatform:r[12],trackerController:r[13],sourcePresent:true};
  });
  context.data.applications.rows.forEach(function(r){let app;try{app=JSON.parse(r[6]);if(!app||typeof app!=='object')throw new Error();}catch(error){warnings.push('Application details need checking for '+r[2]+'.');return;}if(!apps[r[1]]||String(app.received||'')>=String(apps[r[1]].received||''))apps[r[1]]=app;});
  tt.entries.forEach(function(t){if(!notReturning[t.driverId])people[t.driverId]=Object.assign(people[t.driverId]||{driverId:t.driverId}, {gamertag:t.gamertag,trial:t,sourcePresent:true});});
  const seen={};records.rows.forEach(function(r){if(seen[r[0]])throw new Error('Duplicate Driver ID in Placement Drivers.');seen[r[0]]=true;if(notReturning[r[0]])return;if(!people[r[0]])people[r[0]]={driverId:r[0],gamertag:r[1],sourcePresent:false};people[r[0]].placement={decision:r[2],division:r[3]===''?0:Number(r[3]),tier:r[4]===''?0:Number(r[4]),slot:r[5]===''?0:Number(r[5]),socialNotes:String(r[6]),notes:String(r[7]),commitmentOverride:String(r[8])};});
  const drivers=Object.keys(people).map(function(id){const p=people[id],app=apps[id]||{},placement=p.placement||{decision:'Unassigned',division:0,tier:0,slot:0,socialNotes:'',notes:'',commitmentOverride:''};return Object.assign(p,{placement:placement,application:{commitment:app.seasonCommitment||'',reason:app.nonCommitmentReason||'',sunday:app.sundayStartCommitment||'',platform:p.trackerPlatform||app.platform||'',controller:p.trackerController||app.controller||''},sourceCommitment:preseasonPlacementCommitment_(p.trackerCommitment===undefined?app.seasonCommitment:p.trackerCommitment),commitment:placement.commitmentOverride||preseasonPlacementCommitment_(p.trackerCommitment===undefined?app.seasonCommitment:p.trackerCommitment)});});
  drivers.sort(function(a,b){const ar=a.trial&&a.trial.rank,br=b.trial&&b.trial.rank;return (ar||999999)-(br||999999)||(a.gamertag||'').localeCompare(b.gamertag||'');});
  const board=divisions.rows.map(function(r){return {number:Number(r[0]),tierOne:Number(r[1]),tierTwo:Number(r[2]),host:String(r[3]),rc:String(r[4])};});
  preseasonPlacementValidate_(board,drivers,false);
  const signature=intakeHash_([context.revision,divisions.rows,records.rows]);
  const state=meta.length?meta[1][1]:'Draft',review=state==='Confirmed'&&(meta[2][1]!==signature||drivers.some(function(d){return d.placement.decision==='Reserve'&&!d.placement.division;}));
  context.placement={divisions:divisions,records:records,meta:meta,board:board,drivers:drivers,warnings:warnings,state:review?'Review needed':state,signature:signature,sourceRevision:context.revision,tt:tt};
  context.revision=intakeHash_([context.revision,divisions.rows,records.rows,meta]);return context;
}
function preseasonPlacementValidate_(divisions,drivers,confirm) {
  if(divisions.length>F1XL_CAPACITY.divisions)throw new Error('Use at most '+F1XL_CAPACITY.divisions+' divisions.');
  divisions.forEach(function(d,i){if(d.number!==i+1||!Number.isInteger(d.tierOne)||!Number.isInteger(d.tierTwo)||d.tierOne<0||d.tierTwo<0||d.tierOne>F1XL_CAPACITY.teams||d.tierTwo>F1XL_CAPACITY.teams||!d.tierOne&&!d.tierTwo)throw new Error('Each division needs 1–'+F1XL_CAPACITY.raceEntries+' slots, up to '+F1XL_CAPACITY.teams+' per tier, in division order.');if(d.host.length>120||d.rc.length>120)throw new Error('Keep Host and RC names within 120 characters.');});
  const slots={},ids={};drivers.forEach(function(driver){if(ids[driver.driverId])throw new Error('A driver appears more than once.');ids[driver.driverId]=true;const p=driver.placement;
    if(['Unassigned','Placed','Reserve','Not selected'].indexOf(p.decision)<0||['','Yes','Maybe','No','Unknown'].indexOf(p.commitmentOverride)<0)throw new Error('Choose a recognised driver decision and commitment.');
    if(p.socialNotes.length>5000||p.notes.length>5000)throw new Error('Keep each driver note within 5,000 characters.');
    if(p.decision==='Placed'){const d=divisions.find(function(d){return d.number===p.division;}),capacity=d&&(p.tier===1?d.tierOne:p.tier===2?d.tierTwo:0),key=p.division+'/'+p.tier+'/'+p.slot;if(!d||!Number.isInteger(p.slot)||p.slot<1||p.slot>capacity)throw new Error('A driver is outside the configured division/tier slots. Move them before reducing the board.');if(slots[key])throw new Error('Two drivers occupy the same slot.');slots[key]=driver.driverId;}
    else if(p.decision==='Reserve'){
      // Legacy pool entries remain readable until the meeting assigns them explicitly.
      if(!p.division&&!p.tier&&!p.slot){if(confirm)throw new Error('Assign every reserve to a division and tier before confirming.');}
      else if(!divisions.some(function(d){return d.number===p.division;})||[1,2].indexOf(p.tier)<0||p.slot!==0)throw new Error('Choose a valid division and tier for each reserve; reserves do not occupy main-grid slots.');
    }
    else if(p.division||p.tier||p.slot)throw new Error('Unplaced drivers must not retain a division slot.');
  });
  if(confirm){if(!divisions.length)throw new Error('Add a division before confirming placements.');if(drivers.some(function(d){return d.placement.decision==='Unassigned';}))throw new Error('Decide each driver’s placement, reserve status or not-selected status before confirming.');if(drivers.some(function(d){return !d.sourcePresent;}))throw new Error('A saved driver is missing from the tracker and TT queue. Restore their source record before confirming.');if(divisions.some(function(d){return !drivers.some(function(p){return p.placement.decision==='Placed'&&p.placement.division===d.number;});}))throw new Error('Each confirmed division must contain at least one driver.');}
}
function getPreseasonPlacement(season) { fapAssertEntry_('getPreseasonPlacement');
  const c=preseasonPlacementContext_(season),p=c.placement;
  return {season:c.season,url:c.book.getUrl(),revision:c.revision,state:p.state,divisions:p.board,drivers:p.drivers,warnings:p.warnings,tracks:p.tt.tracks,maxDivisions:F1XL_CAPACITY.divisions,maxTierSlots:F1XL_CAPACITY.teams,defaultTierSlots:10,message:''};
}
function savePreseasonPlacement(input) { fapAssertEntry_('savePreseasonPlacement');
  return withApplicationLock_(function(){const c=preseasonPlacementContext_(input.season);intakeRequireRevision_(input,c);const p=c.placement,text=function(v){return String(v==null?'':v).trim();};
    if(!Array.isArray(input.divisions)||!Array.isArray(input.drivers)||input.drivers.length!==p.drivers.length)throw new Error('The driver list changed. Refresh before saving.');
    const divisions=input.divisions.map(function(d){return {number:Number(d.number),tierOne:Number(d.tierOne),tierTwo:Number(d.tierTwo),host:text(d.host),rc:text(d.rc)};});
    const supplied={};input.drivers.forEach(function(d){if(supplied[d.driverId])throw new Error('A driver appears more than once.');supplied[d.driverId]=d.placement;});
    const drivers=p.drivers.map(function(d){const v=supplied[d.driverId];if(!v)throw new Error('A driver is missing from the saved board.');return Object.assign({},d,{placement:{decision:text(v.decision),division:Number(v.division)||0,tier:Number(v.tier)||0,slot:Number(v.slot)||0,socialNotes:text(v.socialNotes),notes:text(v.notes),commitmentOverride:text(v.commitmentOverride)}});});
    preseasonPlacementValidate_(divisions,drivers,input.confirm===true);if(input.confirm===true&&p.warnings.length)throw new Error('Placements were not confirmed. '+p.warnings.join(' '));
    const divRows=divisions.map(function(d){return [d.number,d.tierOne,d.tierTwo,d.host,d.rc];}),driverRows=drivers.slice().sort(function(a,b){return a.driverId.localeCompare(b.driverId);}).map(function(d){const v=d.placement;return [d.driverId,d.gamertag,v.decision,v.division||'',v.tier||'',v.slot||'',v.socialNotes,v.notes,v.commitmentOverride];});
    const writes=[];let divSheet;
    [['divisions',divRows],['drivers',driverRows]].forEach(function(item){const def=F1XL_PRESEASON_PLACEMENT[item[0]],previous=item[0]==='divisions'?p.divisions:p.records;let sheet=previous.sheet;if(!sheet)sheet=c.book.insertSheet(def.name);if(item[0]==='divisions')divSheet=sheet;const values=[def.headers].concat(item[1]),height=Math.max(values.length,sheet.getLastRow(),1);while(values.length<height)values.push(def.headers.map(function(){return '';}));if(height>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),height-sheet.getMaxRows());writes.push({range:sheet.getRange(1,1,height,def.headers.length),values:values});});
    // The source revision predates placement metadata, so a fresh source read will invalidate confirmation without moving anyone.
    const sourceRevision=p.sourceRevision;
    writes.push({range:divSheet.getRange('H1:I4'),values:[[F1XL_PRESEASON_PLACEMENT.marker,c.season],['State',input.confirm===true?'Confirmed':'Draft'],['Confirmed revision',input.confirm===true?intakeHash_([sourceRevision,divRows,driverRows]):''],['Confirmed at',input.confirm===true?new Date().toISOString():'']],text:true});
    intakeCommit_(writes);const result=getPreseasonPlacement(c.season);result.message=input.confirm===true?'Placements confirmed for draft preparation.':'Placement draft saved.';return result;
  });
}
