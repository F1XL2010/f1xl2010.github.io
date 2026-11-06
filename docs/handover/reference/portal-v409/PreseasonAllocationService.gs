/** Division-by-division roster checkpoint. Operational workbook creation is separate. */
const F1XL_PRESEASON_ALLOCATION = Object.freeze({
  name:'Season Allocations', headers:['Division','Driver ID','Gamertag','Allocation','Team','Tier'],
  marker:'F1XL Season Allocations v1', statusHeaders:['Division','State','Source revision','Allocation revision','Confirmed at']
});

function preseasonAllocationBase_(season) {
  return preseasonAllocationAttach_(preseasonLiveDraftContext_(season));
}

// Reuse an already loaded live-draft context when building its display roster.
function preseasonAllocationAttach_(c) {
  const def=F1XL_PRESEASON_ALLOCATION;
  const table=preseasonPlacementTable_(c.book,def);
  let statuses=[];
  if(table.sheet && table.sheet.getLastRow()) {
    const marker=seasonPlanningValues_(table.sheet.getRange('N1:O1'))[0];
    const values=seasonPlanningValues_(table.sheet.getRange('H1:L9'));
    if(marker[0]!==def.marker||String(marker[1])!==c.season||JSON.stringify(values[0])!==JSON.stringify(def.statusHeaders))throw new Error('Season Allocations metadata has an unrecognised layout.');
    statuses=values.slice(1);
    statuses.forEach(function(r,i){if(Number(r[0])!==i+1||['','Draft','Confirmed'].indexOf(r[1])<0)throw new Error('Check the division status rows in Season Allocations.');});
  }
  const seen={};
  const records=table.rows.map(function(r){
    const record={division:Number(r[0]),driverId:String(r[1]),gamertag:String(r[2]),role:String(r[3]),team:String(r[4]),tier:r[5]===''?0:Number(r[5])};
    const key=record.division+'/'+record.driverId;
    if(!record.driverId||!Number.isInteger(record.division)||record.division<1||record.division>8||seen[key])throw new Error('Season Allocations contains a missing or duplicate driver identity.');
    seen[key]=true;return record;
  });
  c.allocations={table:table,statuses:statuses,records:records};return c;
}

function preseasonAllocationBuild_(c,division) {
  if(!c.placement.board.some(function(b){return b.number===division;}))throw new Error('Choose a confirmed placement division.');
  const records=c.allocations.records.filter(function(r){return r.division===division;});
  const turns=c.live.turns.filter(function(t){return t.division===division;});
  const picks={};turns.forEach(function(t){if(t.one)picks[t.one]={team:t.team,tier:1};if(t.two)picks[t.two]={team:t.team,tier:2};});
  (c.live.principalSeats||[]).filter(function(p){return p.division===division;}).forEach(function(p){picks[p.driverId]={team:p.team,tier:p.tier};});
  const sources=c.placement.drivers;
  const ids=new Set(records.map(function(r){return r.driverId;}));
  sources.forEach(function(p){if(p.placement.division===division||p.placement.decision==='Reserve'&&!p.placement.division)ids.add(p.driverId);});
  Object.keys(picks).forEach(function(id){ids.add(id);});
  const drivers=Array.from(ids).map(function(id){
    const p=sources.find(function(p){return p.driverId===id;}), saved=records.find(function(r){return r.driverId===id;}), picked=picks[id];
    const local=!!p&&['Placed','Reserve'].indexOf(p.placement.decision)>=0&&p.placement.division===division;
    const localReserve=local&&p.placement.decision==='Reserve';
    const global=!!p&&p.placement.decision==='Reserve'&&!p.placement.division;
    const present=!!p&&p.sourcePresent&&(local||global);
    const pt=!!p&&p.commitment==='No';
    let role=saved?saved.role:global?'Available reserve':pt||localReserve?'Reserve':'Unassigned';
    let team=saved?saved.team:'',tier=saved?saved.tier:local?p.placement.tier:0;
    if(picked&&!pt){role='Full team';team=picked.team;tier=picked.tier;}
    else if(role==='Full team'){role=pt?'Reserve':'Unassigned';team='';}
    if(pt&&role!=='Available reserve'){role='Reserve';team='';}
    if(role==='Available reserve'){team='';tier=0;}
    if(role==='Reserve'||role==='Unassigned')team='';
    return {driverId:id,gamertag:p?p.gamertag:saved?saved.gamertag:id,commitment:p?p.commitment:'Unknown',sourcePresent:present,
      sourceTier:local?p.placement.tier:0,fromReservePool:global,locked:!!picked&&!pt,pickedPartTime:!!picked&&pt,
      role:role,team:team,tier:tier};
  }).sort(function(a,b){return a.gamertag.localeCompare(b.gamertag);});
  const missing=[];
  if(c.placement.state!=='Confirmed')missing.push('Confirm the current placements before confirming this division.');
  if(c.draft.state!=='Saved')missing.push('Review and save the principal order before confirming this division.');
  const order=c.live.order.filter(function(r){return r.division===division;});
  if(turns.length!==order.length||!order.length)missing.push('Finish every principal turn in Division '+division+'. Other divisions can still be drafting.');
  missing.push.apply(missing,preseasonLiveDraftIssues_(turns,order,c.live.drivers,c.live.principalSeats));
  // A manually edited ledger must still be reviewed in Live draft first.
  if(c.live.canReview)missing.push('Review the saved picks in Live draft before confirming allocations.');
  const view={division:division,drivers:drivers,turns:turns,order:order,missing:missing,fullTeams:c.draft.teams,freeTeams:c.draft.excluded};
  return view;
}

function preseasonAllocationRows_(division,drivers) {
  return drivers.filter(function(d){return d.role!=='Available reserve';}).slice().sort(function(a,b){return a.driverId.localeCompare(b.driverId);})
    .map(function(d){return [division,d.driverId,d.gamertag,d.role,d.team,d.tier||''];});
}

function preseasonAllocationIssues_(c,v,drivers,confirm) {
  const issues=confirm?v.missing.slice():[], seats={},reserves=[];
  drivers.forEach(function(d){
    const original=v.drivers.find(function(p){return p.driverId===d.driverId;});
    if(!original){issues.push('A driver is no longer in this division’s source list.');return;}
    if(['Full team','Free agent','Reserve','Unassigned','Available reserve'].indexOf(d.role)<0){issues.push('Choose a recognised allocation for '+d.gamertag+'.');return;}
    if(original.locked&&(d.role!=='Full team'||d.team!==original.team||d.tier!==original.tier))issues.push('Correct '+d.gamertag+' in Live draft to change their full-team seat.');
    if(!original.locked&&d.role==='Full team')issues.push('Full-team seats must come from the saved draft picks.');
    if(original.pickedPartTime)issues.push(d.gamertag+' is part-time. Correct their live draft pick; part-timers belong in reserves.');
    if(!d.sourcePresent&&d.role!=='Available reserve')issues.push('Remove '+d.gamertag+' from this division or restore their placement source.');
    if(d.commitment==='No'&&d.role!=='Reserve'&&d.role!=='Available reserve')issues.push(d.gamertag+' is part-time and must be a reserve.');
    if(d.role==='Available reserve'&&d.sourcePresent&&!d.fromReservePool)issues.push('Allocate '+d.gamertag+' to a free-agent seat or reserves.');
    if(d.role==='Unassigned'&&confirm)issues.push('Allocate '+d.gamertag+' to a free-agent seat or reserves.');
    if(d.role==='Full team'||d.role==='Free agent') {
      const teams=d.role==='Full team'?v.fullTeams:v.freeTeams;
      if(!teams.some(function(t){return t.team===d.team;})||[1,2].indexOf(d.tier)<0)issues.push('Choose a valid team and tier for '+d.gamertag+'.');
      if(d.sourceTier&&d.tier!==d.sourceTier)issues.push('Keep '+d.gamertag+' in their confirmed placement tier.');
      const key=d.team+'/'+d.tier;
      if(seats[key])issues.push('Two drivers occupy '+d.team+' Tier '+d.tier+'.');seats[key]=d.driverId;
    } else if(d.team)issues.push('Reserve and unassigned entries must not retain a team.');
    if(d.role==='Reserve') {
      reserves.push(d);
      if(d.tier!==0&&[1,2].indexOf(d.tier)<0||confirm&&[1,2].indexOf(d.tier)<0)issues.push('Choose a reserve tier for '+d.gamertag+'.');
    }
    if(d.role!=='Available reserve'&&d.role!=='Unassigned') {
      const elsewhere=c.allocations.records.filter(function(r){return r.division!==v.division&&r.driverId===d.driverId;});
      if(elsewhere.some(function(r){return r.role==='Free agent'||r.role==='Full team'||d.role!=='Reserve'&&r.role==='Reserve';}))issues.push(d.gamertag+' already has an incompatible allocation in another division.');
      if(c.live.turns.some(function(t){return t.division!==v.division&&(t.one===d.driverId||t.two===d.driverId);}))issues.push(d.gamertag+' is already drafted in another division.');
    }
  });
  if(reserves.length>F1XL_CAPACITY.raceEntries)issues.push('This division supports up to '+F1XL_CAPACITY.raceEntries+' reserves in the existing line-up layout.');
  if(confirm)v.fullTeams.forEach(function(t){[1,2].forEach(function(tier){if(!seats[t.team+'/'+tier])issues.push('Fill '+t.team+' Tier '+tier+' in Live draft before confirming Division '+v.division+'.');});});
  return Array.from(new Set(issues));
}

function preseasonAllocationSource_(c,v,drivers) {
  const assigned=new Set(drivers.filter(function(d){return d.role!=='Available reserve';}).map(function(d){return d.driverId;}));
  const source=c.placement.drivers.filter(function(p){return p.placement.division===v.division||assigned.has(p.driverId);}).map(function(p){return [p.driverId,p.gamertag,p.commitment,p.sourcePresent,p.placement.decision,p.placement.division,p.placement.tier];}).sort(function(a,b){return a[0].localeCompare(b[0]);});
  const parts=[v.order,v.turns,source,v.fullTeams,v.freeTeams,c.placement.board.find(function(b){return b.number===v.division;})];
  const fixed=(c.live.principalSeats||[]).filter(function(p){return p.division===v.division;});if(fixed.length)parts.push(fixed);
  return intakeHash_(parts);
}

function preseasonAllocationResponse_(c,division) {
  const v=preseasonAllocationBuild_(c,division), rows=preseasonAllocationRows_(division,v.drivers), source=preseasonAllocationSource_(c,v,v.drivers);
  const issues=preseasonAllocationIssues_(c,v,v.drivers,true), status=c.allocations.statuses[division-1]||[];
  const stored=c.allocations.records.filter(function(r){return r.division===division;}).sort(function(a,b){return a.driverId.localeCompare(b.driverId);}).map(function(r){return [r.division,r.driverId,r.gamertag,r.role,r.team,r.tier||''];});
  const state=status[1]==='Confirmed'?(status[2]===source&&status[3]===intakeHash_(rows)&&JSON.stringify(stored)===JSON.stringify(rows)&&!issues.length?'Confirmed':'Review needed'):'Draft';
  // The lock reads and merges other divisions' latest rows. Independent work in
  // another division stays valid; shared-driver conflicts are checked at save.
  const revision=intakeHash_([source,v.drivers,v.missing,stored,status]);
  return {season:c.season,url:c.book.getUrl(),division:division,revision:revision,state:state,drivers:v.drivers,issues:issues,
    fullTeams:v.fullTeams.map(function(t){return t.team;}),freeTeams:v.freeTeams.map(function(t){return t.team;}),
    divisions:c.placement.board.map(function(b){return b.number;}),confirmedAt:status[4]||'',maxReserves:F1XL_CAPACITY.raceEntries,message:''};
}

function getPreseasonAllocations(input) { fapAssertEntry_('getPreseasonAllocations');
  const c=preseasonAllocationBase_(input.season);
  const division=Number(input.division)||c.placement.board[0]&&c.placement.board[0].number;
  if(!division)return {season:c.season,url:c.book.getUrl(),division:0,revision:'',state:'Waiting for placements',drivers:[],issues:['Add and confirm placement divisions first.'],fullTeams:[],freeTeams:[],divisions:[],message:''};
  return preseasonAllocationResponse_(c,division);
}

function savePreseasonAllocations(input) { fapAssertEntry_('savePreseasonAllocations');
  return withApplicationLock_(function(){
    return preseasonAllocationSave_(preseasonAllocationBase_(input.season),input);
  });
}

function preseasonAllocationSave_(c,input) {
    const division=Number(input.division),current=preseasonAllocationResponse_(c,division);
    intakeRequireRevision_(input,current);
    const v=preseasonAllocationBuild_(c,division);
    if(!Array.isArray(input.drivers)||input.drivers.length!==v.drivers.length)throw new Error('The allocation pool changed. Refresh before saving.');
    const seen={};input.drivers.forEach(function(d){if(seen[d.driverId])throw new Error('A driver appears twice in the submitted allocations.');seen[d.driverId]=d;});
    const drivers=v.drivers.map(function(p){const d=seen[p.driverId];if(!d)throw new Error('A driver is missing from the submitted allocations.');return Object.assign({},p,{role:String(d.role||''),team:String(d.team||''),tier:Number(d.tier)||0});});
    const issues=preseasonAllocationIssues_(c,v,drivers,input.confirm===true);
    if(issues.length)throw new Error(issues.slice(0,8).join(' '));
    const ownRows=preseasonAllocationRows_(division,drivers),source=preseasonAllocationSource_(c,v,drivers);
    const otherRows=c.allocations.table.rows.filter(function(r){return Number(r[0])!==division;});
    const values=[F1XL_PRESEASON_ALLOCATION.headers].concat(otherRows,ownRows);
    const statuses=Array.from({length:8},function(_,i){return c.allocations.statuses[i]||[i+1,'','','',''];});
    statuses[division-1]=[division,input.confirm===true?'Confirmed':'Draft',source,intakeHash_(ownRows),input.confirm===true?new Date().toISOString():''];
    let sheet=c.allocations.table.sheet;if(!sheet)sheet=c.book.insertSheet(F1XL_PRESEASON_ALLOCATION.name);
    const height=Math.max(values.length,sheet.getLastRow(),9);while(values.length<height)values.push(['','','','','','']);
    if(height>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),height-sheet.getMaxRows());
    intakeCommit_([{range:sheet.getRange(1,1,height,6),values:values,text:true},
      {range:sheet.getRange('H1:L9'),values:[F1XL_PRESEASON_ALLOCATION.statusHeaders].concat(statuses),text:true},
      {range:sheet.getRange('N1:O1'),values:[[F1XL_PRESEASON_ALLOCATION.marker,c.season]],text:true}]);
    const result=getPreseasonAllocations({season:c.season,division:division});
    result.message=input.confirm===true?'Division '+division+' allocations confirmed for division preparation.':'Division '+division+' allocations saved.';return result;
}
