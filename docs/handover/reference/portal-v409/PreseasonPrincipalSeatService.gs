/** Fixed racing-principal seats; saved links use permanent driver identities. */
const F1XL_PRINCIPAL_SEATS=Object.freeze({name:'Principal Seats',headers:['Team','Principal','Driver ID']});
function preseasonPrincipalSeatContext_(c,overrideRows){
  const table=preseasonPlacementTable_(c.book,F1XL_PRINCIPAL_SEATS),rows=overrideRows||table.rows;
  const norm=function(s){return String(s||'').trim().toLowerCase().replace(/\s+/g,' ');};
  const drivers=c.placement.drivers.filter(function(p){return p.sourcePresent&&p.placement.decision==='Placed'&&p.commitment!=='No';});
  const issues=[],warnings=[],seats=[],used=new Set();
  const links=c.draft.teams.map(function(t){
    const saved=rows.filter(function(r){return r[0]===t.team&&r[1]===t.principal;});
    if(saved.length>1)issues.push('Duplicate principal link for '+t.team+'.');
    const matches=drivers.filter(function(p){
      return norm(p.gamertag)===norm(t.principal)||c.data.tracker.rows.some(function(r){return r[1]===p.driverId&&[r[2],r[3]].some(function(name){return name&&norm(name)===norm(t.principal);});});
    });
    const id=saved.length?String(saved[0][2]):matches.length===1?matches[0].driverId:null;
    const driver=drivers.find(function(p){return p.driverId===id;});
    if(id===null){const text=t.team+' · '+t.principal+': '+(matches.length?'more than one driver matches; link the correct profile.':'link their driver profile, or mark them as not taking a full-time seat.');(matches.length?issues:warnings).push(text);}
    if(id&&!driver)issues.push(t.principal+' is no longer a placed full-time driver. Check Principal seats.');
    if(driver){
      if(used.has(id))issues.push(driver.gamertag+' is linked as principal to more than one team.');used.add(id);
      seats.push({team:t.team,principal:t.principal,driverId:id,gamertag:driver.gamertag,division:driver.placement.division,tier:driver.placement.tier});
    }
    return {team:t.team,principal:t.principal,driverId:id,matched:!saved.length&&!!driver,division:driver?driver.placement.division:0,tier:driver?driver.placement.tier:0};
  });
  return {table:table,links:links,seats:seats,issues:issues,warnings:warnings};
}
function preseasonPrincipalSeatInput_(c,input){
  if(!Array.isArray(input.links)||input.links.length!==c.draft.teams.length)throw new Error('Check every principal link.');
  const rows=c.draft.teams.map(function(t){
    const matches=input.links.filter(function(p){return p.team===t.team&&p.principal===t.principal;});
    if(matches.length!==1||matches[0].driverId===null||matches[0].driverId===undefined)throw new Error('Choose a driver or no full-time seat for '+t.principal+'.');
    return [t.team,t.principal,String(matches[0].driverId)];
  });
  const resolved=preseasonPrincipalSeatContext_(c,rows);if(resolved.issues.length)throw new Error(resolved.issues.join(' '));
  return {rows:rows,seats:resolved.seats};
}
function preseasonPrincipalSeatResponse_(c){
  preseasonAllocationAttach_(c);
  const predictions=preseasonPlacementTable_(c.book,F1XL_LIVE_PREDICTIONS);
  return {season:c.season,revision:c.revision,resetRevision:intakeHash_([c.revision,c.allocations.table.rows,c.allocations.statuses,predictions.rows]),links:c.principalSeats.links,
    drivers:c.live.drivers,warnings:c.principalSeats.issues.concat(c.principalSeats.warnings),picks:c.live.turns.length,allocations:c.allocations.records.length,presenters:predictions.rows.length};
}
function getPreseasonPrincipalSeats(season){ fapAssertEntry_('getPreseasonPrincipalSeats');return preseasonPrincipalSeatResponse_(preseasonLiveDraftContext_(season));}
function preseasonPrincipalSeatWrite_(c,definition,rows,width,minHeight){
  let sheet=c.book.getSheetByName(definition.name);if(!sheet)sheet=c.book.insertSheet(definition.name);
  const values=[definition.headers].concat(rows),height=Math.max(values.length,sheet.getLastRow(),minHeight||1);
  while(values.length<height)values.push(Array(width).fill(''));
  if(height>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),height-sheet.getMaxRows());
  return {sheet:sheet,write:{range:sheet.getRange(1,1,height,width),values:values,text:true}};
}
function savePreseasonPrincipalSeats(input){ fapAssertEntry_('savePreseasonPrincipalSeats');
  return withApplicationLock_(function(){
    const c=preseasonLiveDraftContext_(input.season);intakeRequireRevision_(input,c);
    const resolved=preseasonPrincipalSeatInput_(c,input),write=preseasonPrincipalSeatWrite_(c,F1XL_PRINCIPAL_SEATS,resolved.rows,3);
    intakeCommit_([write.write]);preseasonLiveHighlightRevoke_(c);
    const result=getPreseasonLiveDraft(c.season);result.message='Principal seats saved. Racing principals stay with their own teams; existing conflicts must be corrected or the draft reset.';return result;
  });
}
function resetPreseasonLiveDraft(input){ fapAssertEntry_('resetPreseasonLiveDraft');
  return withApplicationLock_(function(){
    const c=preseasonLiveDraftContext_(input.season),current=preseasonPrincipalSeatResponse_(c);
    if(input.resetRevision!==current.resetRevision)throw new Error('The draft, allocations or predictions changed. Reload Principal seats before resetting.');
    if(input.confirm!==true)throw new Error('Confirm the draft reset.');
    const resolved=preseasonPrincipalSeatInput_(c,input);
    // Preserve all existing draft data before any write. Copy failures stop reset.
    const suffix=Date.now().toString(36),backups=[];
    [F1XL_PRESEASON_LIVE_DRAFT,F1XL_PRESEASON_ALLOCATION,F1XL_LIVE_PREDICTIONS,F1XL_PRINCIPAL_SEATS].forEach(function(def){
      const sheet=c.book.getSheetByName(def.name);if(sheet&&sheet.getLastRow()){
        const name='Before reset '+suffix+' '+def.name;sheet.copyTo(c.book).setName(name);backups.push(name);
      }
    });
    const binding=preseasonPrincipalSeatWrite_(c,F1XL_PRINCIPAL_SEATS,resolved.rows,3);
    const allocation=preseasonPrincipalSeatWrite_(c,F1XL_PRESEASON_ALLOCATION,resolved.seats.map(function(p){return [p.division,p.driverId,p.gamertag,'Full team',p.team,p.tier];}),6,9);
    const writes=[binding.write].concat(preseasonLiveDraftWrites_(c,[]),[allocation.write,
      {range:allocation.sheet.getRange('H1:L9'),text:true,values:[F1XL_PRESEASON_ALLOCATION.statusHeaders].concat(Array.from({length:8},function(_,i){return [i+1,'Draft','','',''];}))},
      {range:allocation.sheet.getRange('N1:O1'),text:true,values:[[F1XL_PRESEASON_ALLOCATION.marker,c.season]]}]);
    const forecasts=preseasonPlacementTable_(c.book,F1XL_LIVE_PREDICTIONS);
    if(forecasts.sheet){
      const now=new Date().toISOString();writes.push(preseasonPrincipalSeatWrite_(c,F1XL_LIVE_PREDICTIONS,forecasts.rows.map(function(r){return [r[0],r[1],JSON.stringify({overall:'',divisions:{}}),now];}),4).write);
    }
    intakeCommit_(writes);preseasonLiveHighlightRevoke_(c);
    const result=getPreseasonLiveDraft(c.season);result.message='Draft reset. Principal seats are assigned; draft order and placements are unchanged. Presenter names retained and predictions cleared. Backup tabs: '+(backups.join(', ')||'No previous draft data.');return result;
  });
}
