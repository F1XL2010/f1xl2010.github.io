/** Admin-controlled paired picks. Driver IDs, not gamertags, own each seat. */
const F1XL_PRESEASON_LIVE_DRAFT = Object.freeze({
  name: 'Draft Picks',
  headers: ['Turn ID', 'Division', 'Pick', 'Team', 'Team Principal', 'Tier 1 Driver ID', 'Tier 1 Driver', 'Tier 2 Driver ID', 'Tier 2 Driver', 'Picked at'],
  marker: 'F1XL Draft Picks v1'
});

function preseasonLiveDraftRows_(turns) {
  return turns.map(function(t) { return [t.key, t.division, t.pick, t.team, t.principal, t.one, t.oneName, t.two, t.twoName, t.at]; });
}

function preseasonLiveDraftIssues_(turns, order, drivers, principalSeats) {
  principalSeats=principalSeats||[];
  const issues = [], seen = {}, used = {}, progress = {};
  const allSelected = new Set();turns.forEach(function(t) { if(t.one)allSelected.add(t.one);if(t.two)allSelected.add(t.two); });
  turns.forEach(function(t) {
    const label = 'D' + t.division + ' pick ' + t.pick;
    const expected = order.find(function(r) { return r.division === t.division && r.pick === t.pick; });
    if (t.key !== t.division + '/' + t.pick || !expected || expected.team !== t.team || expected.principal !== t.principal) issues.push(label + ' does not match the saved principal order.');
    if (seen[t.key]) issues.push(label + ' is recorded twice.'); seen[t.key] = true;
    if (t.pick !== (progress[t.division] || 0) + 1) issues.push(label + ' is out of sequence.'); progress[t.division] = t.pick;
    [[t.one,1],[t.two,2]].forEach(function(pair) {
      const id = pair[0], tier = pair[1];
      const fixed=principalSeats.find(function(p){return p.division===t.division&&p.team===t.team&&p.tier===tier;});
      if(fixed&&id!==fixed.driverId)issues.push(label+' must keep '+fixed.gamertag+' in their own '+fixed.team+' Tier '+tier+' seat. Reset the draft or correct the saved pair.');
      const principal=principalSeats.find(function(p){return p.driverId===id;});
      if(principal&&principal.team!==t.team)issues.push(label+' drafted principal '+principal.gamertag+' to another team. Reset the draft or correct the saved pair.');
      if (!id) {
        if (drivers.some(function(d) { return d.division === t.division && d.tier === tier && !allSelected.has(d.driverId)&&!principalSeats.some(function(p){return p.driverId===d.driverId;}); })) issues.push(label+' Tier '+tier+' is open while an eligible driver is available. Correct the pair before continuing.');
        return;
      }
      if (used[id]) issues.push(label + ' uses a driver already selected on another turn.'); used[id] = true;
      const driver = drivers.find(function(d) { return d.driverId === id; });
      if (!driver || driver.division !== t.division || driver.tier !== tier) issues.push(label + ' Tier ' + tier + ' needs a driver from the current placement pool.');
    });
  });
  return Array.from(new Set(issues));
}

function preseasonLiveDraftContext_(season,prepared) {
  // Only the display reader supplies a source-checked snapshot. Saves always
  // call this with one argument and rebuild the complete current context.
  const c = prepared || preseasonDraftContext_(season), d = c.draft;
  const table = preseasonPlacementTable_(c.book, F1XL_PRESEASON_LIVE_DRAFT);
  const meta = table.sheet && table.sheet.getLastRow() ? seasonPlanningValues_(table.sheet.getRange('L1:M4')) : [];
  if (meta.length && (meta[0][0] !== F1XL_PRESEASON_LIVE_DRAFT.marker || String(meta[0][1]) !== c.season ||
      meta[1][0] !== 'Source revision' || meta[2][0] !== 'Picks revision' || meta[3][0] !== 'Saved at')) throw new Error('Draft Picks metadata has an unrecognised layout. Check the Master.');
  const drivers = c.placement.drivers.filter(function(p) { return p.placement.decision === 'Placed' && p.commitment !== 'No'; }).map(function(p) {
    return {driverId:p.driverId, gamertag:p.gamertag, division:p.placement.division, tier:p.placement.tier, commitment:p.commitment,
      rank:p.trial && p.trial.rank || null, average:p.trial && p.trial.overall != null ? p.trial.overall : null};
  });
  const turns = table.rows.map(function(r) {
    return {key:String(r[0]), division:Number(r[1]), pick:Number(r[2]), team:String(r[3]), principal:String(r[4]),
      one:String(r[5]), oneName:String(r[6]), two:String(r[7]), twoName:String(r[8]), at:String(r[9])};
  });
  const missing = d.missing.slice();
  if (d.state !== 'Saved') missing.push('Save or review the principal order in Draft preparation before making picks.');
  const order = d.rows.slice().sort(function(a,b) { return a.division-b.division || a.pick-b.pick; });
  c.principalSeats=preseasonPrincipalSeatContext_(c);
  const principalSeats=c.principalSeats.seats;
  const issues = c.principalSeats.issues.concat(preseasonLiveDraftIssues_(turns, order, drivers,principalSeats));
  const source = intakeHash_([order, drivers.map(function(p) { return [p.driverId,p.gamertag,p.division,p.tier,p.commitment]; })]);
  const changed = !!turns.length && (!meta.length || meta[1][1] !== source || meta[2][1] !== intakeHash_(preseasonLiveDraftRows_(turns)));
  const ready = !missing.length && !issues.length && !changed;
  c.live = {table:table, meta:meta, turns:turns, drivers:drivers, principalSeats:principalSeats, order:order, missing:missing, issues:issues, source:source,
    state:missing.length ? 'Waiting for setup' : issues.length || changed ? 'Review needed' : !turns.length ? 'Ready' : turns.length === order.length ? 'Picks complete' : 'In progress',
    ready:ready, canReview:!!turns.length && !missing.length && !issues.length && changed};
  c.revision = intakeHash_([c.revision, table.rows, meta]);
  if(principalSeats.length||c.principalSeats.table.rows.length)c.revision=intakeHash_([c.revision,principalSeats,c.principalSeats.table.rows]);
  return c;
}

function preseasonLiveDraftResponse_(c) {
  const l = c.live;
  preseasonLiveHighlightContext_(c);
  preseasonAllocationAttach_(c);
  const rosterNotices=[];
  const rosters=c.placement.board.map(function(b) {
    const v=preseasonAllocationBuild_(c,b.number);
    const invalid=preseasonAllocationIssues_(c,v,v.drivers,false).length>0;
    if(invalid)rosterNotices.push('Division '+b.number+' allocations need review. Showing placement reserves until corrected.');
    const drivers=invalid?c.placement.drivers.filter(function(p){return p.sourcePresent&&p.placement.division===b.number&&(p.placement.decision==='Reserve'||p.placement.decision==='Placed'&&p.commitment==='No');}).map(function(p){return {driverId:p.driverId,gamertag:p.gamertag,tier:p.placement.tier,role:'Reserve',team:'',commitment:p.commitment};}):v.drivers;
    const allocation=preseasonAllocationResponse_(c,b.number);
    return {division:b.number,allocationRevision:allocation.revision,state:allocation.state,canAllocate:!v.missing.length,finishIssues:allocation.issues,
      unassigned:allocation.drivers.filter(function(p){return p.role==='Unassigned';}).map(function(p){return {driverId:p.driverId,gamertag:p.gamertag,tier:p.tier,partTime:p.commitment==='No'};}),
      drivers:drivers.filter(function(p){return (p.role==='Reserve'||p.role==='Free agent')&&[1,2].indexOf(p.tier)>=0;}).map(function(p){return {driverId:p.driverId,gamertag:p.gamertag,tier:p.tier,role:p.role,team:p.team,partTime:p.commitment==='No'};})};
  });
  return {season:c.season, url:c.book.getUrl(), revision:c.revision, state:l.state, ready:l.ready, canReview:l.canReview,
    rosters:rosters,rosterNotices:rosterNotices,rosterRevision:intakeHash_([rosters,rosterNotices]),
    missing:l.missing, issues:l.issues, order:l.order, drivers:l.drivers, turns:l.turns,principalSeats:l.principalSeats,principalWarnings:c.principalSeats.warnings,
    divisions:c.placement.board.map(function(b) { return b.number; }),
    excluded:c.draft.excluded.map(function(t) { return t.team; }), last:l.turns.length ? l.turns[l.turns.length-1] : null,
    latest:l.turns.reduce(function(latest,t) { return !latest || t.at >= latest.at ? t : latest; },null),
    savedAt:l.meta.length ? l.meta[3][1] : '', message:''};
}

/** Poll fingerprints include values, displayed inputs and formulas, so native
 * Sheet edits cannot be hidden by a FAP-only counter. Never used for writes.
 * Bound columns to the actual source layouts (not the entire Master). */
function preseasonLivePollSource_(book,definitions) {
  return intakeHash_(['draft-poll-v1',book.getId(),book.getName(),typeof book.getSpreadsheetTimeZone==='function'?book.getSpreadsheetTimeZone():'',definitions.map(function(def){
    const sheet=book.getSheetByName(def[0]);if(!sheet)return [def[0],null];
    const height=def[2]||Math.max(1,sheet.getLastRow()),range=sheet.getRange(1,def[3]||1,height,def[1]);
    return [def[0],sheet.getLastRow(),sheet.getLastColumn(),range.getValues(),def[4]?range.getDisplayValues():null,range.getFormulas()];
  })]);
}
function preseasonLivePreparationSnapshot_(c) {
  return {season:c.season,revision:c.revision,
    data:{tracker:{rows:c.data.tracker.rows.map(function(r){return r.slice(0,4);})}},
    placement:{state:c.placement.state,board:c.placement.board,drivers:c.placement.drivers.map(function(p){return {
      driverId:p.driverId,gamertag:p.gamertag,sourcePresent:p.sourcePresent,commitment:p.commitment,
      placement:{decision:p.placement.decision,division:p.placement.division,tier:p.placement.tier},
      trial:p.trial?{rank:p.trial.rank,overall:p.trial.overall}:null};})},
    draft:{state:c.draft.state,missing:c.draft.missing,rows:c.draft.rows,teams:c.draft.teams,excluded:c.draft.excluded}};
}
function getPreseasonLiveDraft(input) { fapAssertEntry_('getPreseasonLiveDraft');
  // Initial/manual loads and post-save replies keep their direct validated
  // path. Fingerprinting/cache setup belongs to the background poll only.
  if(!input||typeof input!=='object'){
    const result=preseasonLiveDraftResponse_(preseasonLiveDraftContext_(input));result.checkedAt=Date.now();return result;
  }
  const season=seasonPlanningSeason_(input&&typeof input==='object'?input.season:input),book=seasonPlanningBook_(season);
  if(!book||!seasonMasterIsPlanning_(book))throw new Error('Choose a Season Master that is still in preseason.');
  const sources=[['Start Here',9,7,1,true],['Preseason',5,0,1,true],['Calendar',4,F1XL_CAPACITY.rounds+2],
    ['Applications Tracker',19,0,1,true],['Processed Applications',7,0,1,true],['Time Trial Queue',9,0,1,true],['TT Results',18],
    ['Placement Divisions',9],['Placement Drivers',9],['Teams & Principals',8,F1XL_CAPACITY.teams+1],
    ['Draft Order',8],['Reference Snapshot',9,0,60,true]];
  const source=preseasonLivePollSource_(book,sources),token=intakeHash_([source,preseasonLivePollSource_(book,[['Draft Picks',13],['Principal Seats',3],['Season Allocations',15]])]);
  const age=Date.now()-Number(input&&input.checkedAt);
  if(input&&input.pollToken===token&&age>=0&&age<90000){
    // A lost/expired cache entry needs a real context rebuild to restore highlights.
    try{const key=preseasonLiveHighlightKey_({season:season,revision:input.revision}),cache=CacheService.getScriptCache();
      if(cache.get(key+':context')&&!cache.get(key+':revoked'))return {season:season,unchanged:true,pollToken:token};
    }catch(ignore){}
  }
  const cacheKey='draft-preparation-v1:'+source;let prepared=null,verified=true;
  // Cache only internal data, before role-specific response filtering; the
  // normal gateway still checks the person and redacts every outgoing reply.
  if(input&&typeof input==='object'&&age>=0&&age<90000){try{
    const raw=CacheService.getScriptCache().get(cacheKey),saved=raw&&JSON.parse(raw);
    if(saved&&Date.now()-saved.at>=0&&Date.now()-saved.at<90000)prepared=saved.data;
  }catch(ignore){}}
  if(!prepared){
    prepared=preseasonLivePreparationSnapshot_(preseasonDraftContext_(season));
    // Do not store a snapshot against a fingerprint observed before a source edit.
    verified=preseasonLivePollSource_(book,sources)===source;
    if(verified){try{CacheService.getScriptCache().put(cacheKey,JSON.stringify({at:Date.now(),data:prepared}),90);}catch(ignore){}}
  }
  prepared.book=book;
  const response=preseasonLiveDraftResponse_(preseasonLiveDraftContext_(season,prepared));
  response.pollToken=verified?token:'';response.checkedAt=Date.now();return response;
}

/** Presenter forecasts are independent of official picks and their revision. */
const F1XL_LIVE_PREDICTIONS = Object.freeze({name:'Presenter Predictions',headers:['Presenter ID','Presenter','Predictions JSON','Updated at']});
const F1XL_DRAFT_PICK_PREDICTIONS = Object.freeze({
  name:'Draft Pick Predictions',
  headers:['Presenter','Division','Pick','Team','Principal','Predicted Tier 1','Predicted Tier 2','Actual Tier 1','Actual Tier 2','Tier 1 points','Tier 2 points','Total points']
});
/** Portal editor uses the same plain prediction cells as the manual workbook. */
function preseasonDraftPredictionContext_(season) {
  const c=preseasonLiveDraftContext_(season),presenters=preseasonPredictionContext_(season).presenters;
  const sheet=c.book.getSheetByName(F1XL_DRAFT_PICK_PREDICTIONS.name);
  let saved=[];
  if(sheet&&sheet.getLastRow()){
    if(JSON.stringify(seasonPlanningValues_(sheet.getRange(1,1,1,12))[0])!==JSON.stringify(F1XL_DRAFT_PICK_PREDICTIONS.headers))throw new Error('Draft Pick Predictions has an unrecognised layout.');
    if(sheet.getLastRow()>1)saved=seasonPlanningValues_(sheet.getRange(2,1,sheet.getLastRow()-1,7));
  }
  const byKey={};saved.filter(r=>r[0]).forEach(function(r){const key=JSON.stringify([String(r[0]),Number(r[1]),String(r[3])]);if(byKey[key])throw new Error('Duplicate presenter / division / team in Draft Pick Predictions.');byKey[key]=r;});
  const rows=[];
  presenters.forEach(function(p){c.live.order.forEach(function(t){
    const old=byKey[JSON.stringify([p.name,t.division,t.team])]||[],actual=c.live.turns.find(a=>a.key===t.division+'/'+t.pick);
    const fixed=tier=>c.live.principalSeats.find(s=>s.division===t.division&&s.team===t.team&&s.tier===tier);
    const one=String(old[5]||''),two=String(old[6]||''),fixedOne=fixed(1),fixedTwo=fixed(2);
    rows.push({presenterId:p.id,division:t.division,pick:t.pick,team:t.team,principal:t.principal,one:fixedOne?'':one,two:fixedTwo?'':two,
      fixedOne:fixedOne?fixedOne.gamertag:'',fixedTwo:fixedTwo?fixedTwo.gamertag:'',
      actualOne:actual?actual.oneName:'',actualTwo:actual?actual.twoName:'',played:!!actual,
      points:actual?Number(!!one&&one===actual.oneName&&!fixedOne)+Number(!!two&&two===actual.twoName&&!fixedTwo):null});
  });});
  c.pickPredictions={sheet:sheet,rows:rows,presenters:presenters,revision:intakeHash_([c.revision,saved,presenters])};return c;
}
function preseasonDraftPredictionResponse_(c) {
  const p=c.pickPredictions;
  return {season:c.season,revision:p.revision,presenters:p.presenters.map(v=>({id:v.id,name:v.name})),rows:p.rows,
    drivers:c.live.drivers.filter(d=>!c.live.principalSeats.some(s=>s.driverId===d.driverId)).map(d=>({name:d.gamertag,division:d.division,tier:d.tier})),
    locked:!!c.live.turns.length,ready:c.live.ready,missing:c.live.missing.concat(c.live.issues),
    divisions:Array.from(new Set(c.live.order.map(r=>r.division))).sort((a,b)=>b-a)};
}
function preseasonDraftPredictionSave_(input) {
  return withApplicationLock_(function(){
    const c=preseasonDraftPredictionContext_(input.season),p=c.pickPredictions;
    intakeRequireRevision_(input,p);
    if(c.live.turns.length)throw new Error('The draft has started. Draft-pick predictions are now read-only.');
    if(!c.live.ready||!c.live.order.length)throw new Error('Confirm placements and save the draft order first.');
    const presenter=p.presenters.find(v=>v.id===input.presenterId);if(!presenter)throw new Error('Choose a saved presenter.');
    const rows=p.rows.filter(r=>r.presenterId===presenter.id),seen=new Set(),used=new Set();
    if(!Array.isArray(input.rows)||input.rows.length!==rows.length)throw new Error('Reload the current prediction rows.');
    input.rows.forEach(function(v){
      const row=rows.find(r=>r.division===v.division&&r.team===v.team),key=JSON.stringify([v.division,v.team]);
      if(!row||seen.has(key))throw new Error('Check the prediction division and team.');seen.add(key);
      ['one','two'].forEach(function(field,i){const name=String(v[field]||''),fixed=row[i?'fixedTwo':'fixedOne'];
        if(fixed&&name)throw new Error('Principal seats are assigned automatically; predict only the drivers being drafted.');
        if(name){if(!c.live.drivers.some(d=>d.gamertag===name&&d.division===row.division&&d.tier===i+1&&!c.live.principalSeats.some(s=>s.driverId===d.driverId)))throw new Error('Choose an eligible driver from this division and tier.');
          const driverKey=JSON.stringify([row.division,name]);if(used.has(driverKey))throw new Error('A driver can only be predicted once per division.');used.add(driverKey);
        }row[field]=name;
      });
    });
    // Ensure creates the ordinary sheet only after all submitted choices validate.
    preseasonDraftPickPredictionEnsure_(c.season,p.presenters);
    const sheet=c.book.getSheetByName(F1XL_DRAFT_PICK_PREDICTIONS.name),values=seasonPlanningValues_(sheet.getRange(2,1,sheet.getLastRow()-1,7));
    const choices=values.map(function(v){if(v[0]!==presenter.name)return [v[5],v[6]];const row=rows.find(r=>r.division===Number(v[1])&&r.team===v[3]);return row?[row.one,row.two]:[v[5],v[6]];});
    intakeCommit_([{range:sheet.getRange(2,6,choices.length,2),values:choices,text:true}]);
    return preseasonDraftPredictionResponse_(preseasonDraftPredictionContext_(c.season));
  });
}
function preseasonPredictionReserveTeam_(name) { return /\breserves?\b/i.test(String(name)); }
function preseasonPredictionContext_(season) {
  season=seasonPlanningSeason_(season);
  const book=seasonPlanningBook_(season);
  if(!book||!seasonMasterIsPlanning_(book))throw new Error('Choose a Season Master that is still in preseason.');
  const table=preseasonPlacementTable_(book,F1XL_LIVE_PREDICTIONS);
  const divisions=preseasonPlacementTable_(book,F1XL_PRESEASON_PLACEMENT.divisions).rows.map(function(r){return Number(r[0]);});
  const drivers=preseasonPlacementTable_(book,F1XL_PRESEASON_PLACEMENT.drivers).rows.filter(function(r){return ['Placed','Reserve'].includes(r[2])&&divisions.includes(Number(r[3]));}).map(function(r){return {driverId:String(r[0]),gamertag:String(r[1]),division:Number(r[3]),reserve:r[2]==='Reserve'};});
  const sheet=book.getSheetByName('Teams & Principals');
  const teams=sheet?Array.from(new Set(seasonPlanningValues_(sheet.getRange(2,1,F1XL_CAPACITY.teams,8)).filter(function(r){return r[0]&&['Full team','Free agent team'].includes(r[5])&&!preseasonPredictionReserveTeam_(r[0]);}).map(function(r){return String(r[0]);}))):[];
  const seen=new Set(),presenters=table.rows.map(function(r){
    if(seen.has(String(r[0])))throw new Error('Duplicate presenter in Presenter Predictions.');seen.add(String(r[0]));
    let picks;try{picks=JSON.parse(r[2]);if(!picks||typeof picks!=='object'||!picks.divisions||typeof picks.divisions!=='object')throw new Error();}catch(error){throw new Error('Check the saved predictions for '+r[1]+'.');}
    return {id:String(r[0]),name:String(r[1]),overall:String(picks.overall||''),divisions:picks.divisions};
  });
  return {season:season,book:book,table:table,revision:intakeHash_(table.rows),presenters:presenters,divisions:divisions,drivers:drivers,teams:teams};
}
function preseasonPredictionResponse_(c) { return {season:c.season,revision:c.revision,presenters:c.presenters,divisions:c.divisions,drivers:c.drivers,teams:c.teams}; }
function getPreseasonLivePredictions(input) { fapAssertEntry_('getPreseasonLivePredictions');
  if(input&&input.kind==='draft-picks')return preseasonDraftPredictionResponse_(preseasonDraftPredictionContext_(input.season));
  if(!input||typeof input!=='object')return preseasonPredictionResponse_(preseasonPredictionContext_(input));
  const season=seasonPlanningSeason_(input&&typeof input==='object'?input.season:input),book=seasonPlanningBook_(season);
  if(!book||!seasonMasterIsPlanning_(book))throw new Error('Choose a Season Master that is still in preseason.');
  const token=preseasonLivePollSource_(book,[['Presenter Predictions',4],['Placement Divisions',5],['Placement Drivers',9],['Teams & Principals',8,F1XL_CAPACITY.teams+1]]);
  if(input&&input.pollToken===token)return {season:season,unchanged:true,pollToken:token};
  const response=preseasonPredictionResponse_(preseasonPredictionContext_(season));response.pollToken=token;return response;
}
function savePreseasonLivePredictions(input) { fapAssertEntry_('savePreseasonLivePredictions');
  if(input&&input.kind==='draft-picks')return preseasonDraftPredictionSave_(input);
  return withApplicationLock_(function(){
    const c=preseasonPredictionContext_(input.season);intakeRequireRevision_(input,c);
    if(!Array.isArray(input.presenters)||input.presenters.length>20)throw new Error('Use up to 20 presenters.');
    const ids=new Set(),names=new Set(),prior=new Map(c.presenters.map(function(p){return [p.id,p];}));
    const presenters=input.presenters.map(function(p){
      const id=String(p.id||''),name=String(p.name||'').trim(),old=prior.get(id);
      if(!/^[a-zA-Z0-9-]{8,80}$/.test(id)||ids.has(id))throw new Error('Check the presenter identity.');ids.add(id);
      if(!name||name.length>80||names.has(name.toLowerCase()))throw new Error('Give each presenter a different name (up to 80 characters).');names.add(name.toLowerCase());
      const overall=String(p.overall||''),divisions={};
      if(overall&&!c.teams.includes(overall)&&(!old||old.overall!==overall))throw new Error('Choose an overall constructor from the season teams.');
      if(!p.divisions||typeof p.divisions!=='object'||Array.isArray(p.divisions))throw new Error('Check the division predictions.');
      Object.keys(p.divisions).forEach(function(key){
        const pick=p.divisions[key],previous=old&&old.divisions[key];
        if(!pick||typeof pick!=='object')throw new Error('Check the division prediction.');
        const driverId=String(pick.driverId||''),team=String(pick.team||'');
        // Keep unchanged historical choices when a roster is corrected, but do
        // not accept a newly selected driver/team outside the current division.
        if(!c.divisions.includes(Number(key))){if(!previous||previous.driverId!==driverId||previous.team!==team)throw new Error('Choose an existing division.');}
        if(driverId&&!c.drivers.some(function(d){return d.division===Number(key)&&d.driverId===driverId;})&&(!previous||previous.driverId!==driverId))throw new Error('Choose a driver from this division.');
        if(team&&!c.teams.includes(team)&&(!previous||previous.team!==team))throw new Error('Choose a constructor from the season teams.');
        divisions[key]={driverId:driverId,team:team};
      });
      return {id:id,name:name,overall:overall,divisions:divisions};
    });
    let sheet=c.table.sheet;if(!sheet)sheet=c.book.insertSheet(F1XL_LIVE_PREDICTIONS.name);
    const now=new Date().toISOString(),rows=[F1XL_LIVE_PREDICTIONS.headers].concat(presenters.map(function(p){return [p.id,p.name,JSON.stringify({overall:p.overall,divisions:p.divisions}),now];}));
    const height=Math.max(rows.length,sheet.getLastRow());while(rows.length<height)rows.push(['','','','']);
    if(height>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),height-sheet.getMaxRows());
    intakeCommit_([{range:sheet.getRange(1,1,height,4),values:rows,text:true}]);
    preseasonDraftPickPredictionEnsure_(c.season,presenters,c.presenters);
    c.presenters=presenters;c.revision=intakeHash_(rows.slice(1).filter(function(r){return r[0];}));
    return preseasonPredictionResponse_(c);
  });
}

/**
 * A deliberately ordinary Master-sheet competition. Presenters make two
 * driver calls for every principal turn; one correct driver equals one point.
 * Existing predictions survive a redraw by following the team, not its new
 * picking position.
 */
function preseasonDraftPickPredictionEnsure_(season,presenters,previousPresenters) {
  const liveContext=preseasonLiveDraftContext_(season),live=liveContext.live,book=liveContext.book;
  if(!live.order.length||!presenters||!presenters.length)return null;
  let sheet=book.getSheetByName(F1XL_DRAFT_PICK_PREDICTIONS.name),old=[];
  if(sheet&&sheet.getLastRow()){
    const headers=seasonPlanningValues_(sheet.getRange(1,1,1,F1XL_DRAFT_PICK_PREDICTIONS.headers.length))[0];
    if(JSON.stringify(headers)!==JSON.stringify(F1XL_DRAFT_PICK_PREDICTIONS.headers))throw new Error('Draft Pick Predictions has an unrecognised layout. Restore its headers before refreshing it.');
    old=seasonPlanningValues_(sheet.getRange(2,1,Math.max(0,sheet.getLastRow()-1),F1XL_DRAFT_PICK_PREDICTIONS.headers.length));
  }
  if(!sheet)sheet=book.insertSheet(F1XL_DRAFT_PICK_PREDICTIONS.name);
  const renamed={};(previousPresenters||[]).forEach(function(p){const next=presenters.find(n=>n.id===p.id);if(next)renamed[p.name]=next.name;});
  const preserved={};old.forEach(function(row){if(row[0]&&row[1]&&row[3])preserved[[renamed[row[0]]||row[0],row[1],row[3]].join('|')]={one:row[5],two:row[6]};});
  const names={};live.drivers.filter(d=>!live.principalSeats.some(s=>s.driverId===d.driverId)).forEach(function(driver){const key=driver.division+'/'+driver.tier;(names[key]||(names[key]=[])).push(driver.gamertag);});
  Object.keys(names).forEach(function(key){names[key]=Array.from(new Set(names[key])).sort();});
  const turns=live.order.slice().sort(function(a,b){return a.division-b.division||a.pick-b.pick;}),actual={};live.turns.forEach(function(turn){actual[turn.key]=turn;});
  const rows=[];presenters.forEach(function(presenter){turns.forEach(function(turn){
    const saved=preserved[[presenter.name,turn.division,turn.team].join('|')]||{},picked=actual[turn.division+'/'+turn.pick]||{};
    rows.push([presenter.name,turn.division,turn.pick,turn.team,turn.principal,saved.one||'',saved.two||'',picked.oneName||'',picked.twoName||'','','','']);
  });});
  const height=Math.max(rows.length+1,sheet.getLastRow(),1);while(rows.length+1<height)rows.push(F1XL_DRAFT_PICK_PREDICTIONS.headers.map(function(){return '';}));
  if(height>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),height-sheet.getMaxRows());
  sheet.getRange(1,1,1,F1XL_DRAFT_PICK_PREDICTIONS.headers.length).setValues([F1XL_DRAFT_PICK_PREDICTIONS.headers]).setFontWeight('bold');
  if(height>1){
    sheet.getRange(2,1,height-1,9).setValues(rows.map(function(row){return row.slice(0,9);}));
    const formulas=rows.map(function(row,index){const r=index+2,fixed=tier=>live.principalSeats.some(s=>s.division===row[1]&&s.team===row[3]&&s.tier===tier);return row[0]?[fixed(1)?'=0':'=IF(F'+r+'="","",IF(F'+r+'=H'+r+',1,0))',fixed(2)?'=0':'=IF(G'+r+'="","",IF(G'+r+'=I'+r+',1,0))','=SUM(J'+r+':K'+r+')' ]:['','',''];});
    const formulaRange=sheet.getRange(2,10,height-1,3);if(formulaRange.setFormulas)formulaRange.setFormulas(formulas);else formulaRange.setValues(formulas);
    const tierOneRange=sheet.getRange(2,6,height-1,1),tierTwoRange=sheet.getRange(2,7,height-1,1);
    if(tierOneRange.setDataValidations&&SpreadsheetApp.newDataValidation){const rulesOne=[],rulesTwo=[];rows.forEach(function(row){const one=names[row[1]+'/1']||[],two=names[row[1]+'/2']||[];rulesOne.push([one.length?SpreadsheetApp.newDataValidation().requireValueInList(one,true).setAllowInvalid(false).build():null]);rulesTwo.push([two.length?SpreadsheetApp.newDataValidation().requireValueInList(two,true).setAllowInvalid(false).build():null]);});tierOneRange.setDataValidations(rulesOne);tierTwoRange.setDataValidations(rulesTwo);}
  }
  if(sheet.setFrozenRows)sheet.setFrozenRows(1);if(sheet.autoResizeColumns)sheet.autoResizeColumns(1,F1XL_DRAFT_PICK_PREDICTIONS.headers.length);
  return {url:book.getUrl()+'#gid='+sheet.getSheetId(),rows:rows.filter(function(row){return row[0];}).length};
}

/** Update the actual picks and scores after every confirmed, corrected or undone turn.
 * Prediction cells are never touched here. */
function preseasonDraftPickPredictionRefresh_(book,order,turns) {
  const sheet=book.getSheetByName(F1XL_DRAFT_PICK_PREDICTIONS.name);if(!sheet||sheet.getLastRow()<2)return;
  const headers=seasonPlanningValues_(sheet.getRange(1,1,1,F1XL_DRAFT_PICK_PREDICTIONS.headers.length))[0];
  if(JSON.stringify(headers)!==JSON.stringify(F1XL_DRAFT_PICK_PREDICTIONS.headers))throw new Error('Draft Pick Predictions has an unrecognised layout.');
  const positions={},actual={};order.forEach(function(turn){positions[turn.division+'/'+turn.pick]=turn;});turns.forEach(function(turn){actual[turn.key]=turn;});
  const values=seasonPlanningValues_(sheet.getRange(2,1,sheet.getLastRow()-1,F1XL_DRAFT_PICK_PREDICTIONS.headers.length));
  values.forEach(function(row){const turn=positions[String(row[1])+'/'+String(row[2])],picked=turn&&actual[turn.division+'/'+turn.pick];row[7]=picked?picked.oneName||'':'';row[8]=picked?picked.twoName||'':'';});
  sheet.getRange(2,1,values.length,9).setValues(values.map(function(row){return row.slice(0,9);}));
}

function savePreseasonLiveAllocation(input) { fapAssertEntry_('savePreseasonLiveAllocation'); return preseasonLiveAllocationAction_(input,false); }
function finishPreseasonLiveDivision(input) { fapAssertEntry_('finishPreseasonLiveDivision'); return preseasonLiveAllocationAction_(input,true); }

function preseasonLiveAllocationAction_(input,finish) {
  return withApplicationLock_(function(){
    const c=preseasonAllocationBase_(input.season),division=Number(input.division),current=preseasonAllocationResponse_(c,division);
    intakeRequireRevision_({revision:input.allocationRevision},current);
    const missing=preseasonAllocationBuild_(c,division).missing;
    if(missing.length)throw new Error(missing.join(' '));
    if(!finish){
      const driver=current.drivers.find(function(p){return p.driverId===String(input.driverId);});
      if(!driver||driver.locked)throw new Error('Choose an undrafted driver from this division.');
      if(['Free agent','Reserve'].indexOf(input.role)<0)throw new Error('Choose a free-agent team or reserves.');
      driver.role=input.role;driver.team=input.role==='Free agent'?String(input.team||''):'';driver.tier=Number(input.tier)||0;
    }
    preseasonAllocationSave_(c,Object.assign({},current,{confirm:finish}));
    const result=getPreseasonLiveDraft(c.season);
    result.message=finish?'Division '+division+' finished. Its roster is confirmed.':'Driver allocation saved for Division '+division+'.';
    return result;
  });
}

function preseasonLiveDraftWrites_(c, turns) {
  let sheet = c.live.table.sheet;
  if (!sheet) sheet = c.book.insertSheet(F1XL_PRESEASON_LIVE_DRAFT.name);
  const rows = preseasonLiveDraftRows_(turns), values = [F1XL_PRESEASON_LIVE_DRAFT.headers].concat(rows);
  const height = Math.max(values.length, sheet.getLastRow(), 4);
  while (values.length < height) values.push(F1XL_PRESEASON_LIVE_DRAFT.headers.map(function() { return ''; }));
  if (height > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), height-sheet.getMaxRows());
  return [{range:sheet.getRange(1,1,height,10), values:values, text:true},
    {range:sheet.getRange('L1:M4'), text:true, values:[[F1XL_PRESEASON_LIVE_DRAFT.marker,c.season],
      ['Source revision',c.live.source], ['Picks revision',intakeHash_(rows)], ['Saved at',new Date().toISOString()]]}];
}
function preseasonLiveDraftCommit_(c, turns) {
  intakeCommit_(preseasonLiveDraftWrites_(c,turns));
  try { preseasonDraftPickPredictionRefresh_(c.book,c.live.order,turns); } catch(error) { console.warn('Draft prediction score refresh: '+(error.message||error)); }
  preseasonLiveHighlightRevoke_(c);
  return getPreseasonLiveDraft(c.season);
}

/** Ephemeral broadcast state only. These endpoints never read or write a Sheet. */
function preseasonLiveHighlightKey_(input) {
  if(!input||!/^\d+(?:\.5)?$/.test(String(input.season))||typeof input.revision!=='string'||!input.revision||input.revision.length>150)throw new Error('Load the current live draft before sharing a highlight.');
  return 'f1xl-live-highlight-v1:'+intakeHash_([String(input.season),input.revision]);
}

function preseasonLiveHighlightContext_(c) {
  try {
    const cache=CacheService.getScriptCache(),key=preseasonLiveHighlightKey_(c);
    if(cache.get(key+':revoked'))return;
    const current=c.live.ready?c.placement.board.map(function(b){return c.live.order.find(function(r){return r.division===b.number&&!c.live.turns.some(function(t){return t.key===r.division+'/'+r.pick;});});}).filter(Boolean):[];
    const used=new Set();c.live.turns.forEach(function(t){used.add(t.one);used.add(t.two);});
    cache.put(key+':context',JSON.stringify({turns:current.map(function(r){return [r.division,r.pick];}),drivers:c.live.drivers.filter(function(p){return !used.has(p.driverId)&&!c.live.principalSeats.some(function(s){return s.driverId===p.driverId;});}).map(function(p){return [p.driverId,p.division,p.tier];})}),120);
  } catch(error) { /* Highlight availability must not affect official picks. */ }
}

function preseasonLiveHighlightRevoke_(c) {
  try {const cache=CacheService.getScriptCache(),key=preseasonLiveHighlightKey_(c);cache.put(key+':revoked','1',300);cache.remove(key+':context');}catch(error) { /* Official save remains successful. */ }
}

function getPreseasonLiveHighlight(input) { fapAssertEntry_('getPreseasonLiveHighlight');
  const key=preseasonLiveHighlightKey_(input),cache=CacheService.getScriptCache();
  const division=Number(input.division);if(!Number.isInteger(division)||division<1||division>8)throw new Error('Choose a draft division.');
  const contextRaw=cache.get(key+':context');if(cache.get(key+':revoked'))return {selection:null};
  if(!contextRaw)return {unavailable:true,refresh:true};
  const raw=cache.get(key+':d'+division),selection=raw?JSON.parse(raw):null;
  if(!selection)return {unavailable:true};
  const context=JSON.parse(contextRaw);if(!context.turns.some(function(t){return t[0]===division&&t[1]===selection.pick;}))return {selection:null};
  if(!selection.one&&!selection.two)return {selection:null};
  return {selection:selection&&selection.expiresAt>Date.now()?{pick:selection.pick,one:selection.one,two:selection.two}:null,remainingMs:selection?Math.max(0,selection.expiresAt-Date.now()):0};
}

function setPreseasonLiveHighlight(input) { fapAssertEntry_('setPreseasonLiveHighlight');
  const key=preseasonLiveHighlightKey_(input),division=Number(input.division),pick=Number(input.pick),sequence=Number(input.sequence),owner=String(input.owner||'');
  if(!Number.isInteger(division)||division<1||division>8||!Number.isInteger(pick)||pick<1||!Number.isSafeInteger(sequence)||sequence<1||!/^[a-zA-Z0-9-]{8,80}$/.test(owner))throw new Error('Invalid highlight request.');
  const lock=LockService.getScriptLock();if(!lock.tryLock(100))return {ok:false,retry:true};
  try {
    const cache=CacheService.getScriptCache(),raw=cache.get(key+':context');
    if(cache.get(key+':revoked')||!raw)return !input.one&&!input.two?{ok:true}:{ok:false,refresh:true};
    const context=JSON.parse(raw);
    if(!context.turns.some(function(t){return t[0]===division&&t[1]===pick;}))return {ok:false,refresh:true};
    const one=String(input.one||''),two=String(input.two||'');
    [[one,1],[two,2]].forEach(function(pair){if(pair[0]&&!context.drivers.some(function(p){return p[0]===pair[0]&&p[1]===division&&p[2]===pair[1];}))throw new Error('The highlighted driver is not available in this tier.');});
    const cursor=key+':'+division+':'+owner,previous=Number(cache.get(cursor)||0);
    if(sequence<=previous)return {ok:true};
    cache.put(cursor,String(sequence),180);
    const target=key+':d'+division,currentRaw=cache.get(target),current=currentRaw?JSON.parse(currentRaw):null;
    if(current&&current.owner===owner&&sequence<=current.sequence)return {ok:true};
    // Keep an explicit clear so a read can distinguish it from cache eviction.
    if(!one&&!two){if(!current||current.owner===owner)cache.put(target,JSON.stringify({owner:owner,sequence:sequence,pick:pick,one:'',two:'',expiresAt:Date.now()+120000}),120);return {ok:true};}
    if(input.renew===true&&current&&current.owner!==owner&&current.expiresAt>Date.now())return {ok:true,superseded:true};
    // Background browsers can throttle renewal timers to once a minute.
    cache.put(target,JSON.stringify({owner:owner,sequence:sequence,pick:pick,one:one,two:two,expiresAt:Date.now()+120000}),120);
    return {ok:true};
  } finally {lock.releaseLock();}
}

function savePreseasonLivePick(input) { fapAssertEntry_('savePreseasonLivePick');
  return withApplicationLock_(function() {
    const c = preseasonLiveDraftContext_(input.season); intakeRequireRevision_(input,c);
    const l = c.live, division = Number(input.division), pick = Number(input.pick), key = division+'/'+pick;
    if (l.missing.length) throw new Error(l.missing.join(' '));
    const existing = l.turns.find(function(t) { return t.key === key; });
    if (!existing && !l.ready) throw new Error('Review the existing picks before continuing the draft.');
    const expected = l.order.find(function(r) { return r.division === division && r.pick === pick; });
    if (!expected) throw new Error('Choose a turn from the saved draft order.');
    const next = l.order.find(function(r) { return r.division === division && !l.turns.some(function(t) { return t.key === r.division+'/'+r.pick; }); });
    if (!existing && (!next || next.pick !== pick)) throw new Error('Complete the current principal’s turn before the next pick.');
    const others = l.turns.filter(function(t) { return t !== existing; });
    const used = {}; others.forEach(function(t) { if(t.one)used[t.one]=true;if(t.two)used[t.two]=true; });
    function select(id, tier, open) {
      id = String(id || '');
      const fixed=l.principalSeats.find(function(p){return p.division===division&&p.team===expected.team&&p.tier===tier;});
      if(fixed){if(id&&id!==fixed.driverId)throw new Error('This seat belongs to team principal '+fixed.gamertag+'.');if(used[fixed.driverId])throw new Error('The principal was drafted to another team. Reset the draft or correct that pick first.');return l.drivers.find(function(p){return p.driverId===fixed.driverId;});}
      const pool = l.drivers.filter(function(p) { return p.division === division && p.tier === tier && !used[p.driverId]&&!l.principalSeats.some(function(s){return s.driverId===p.driverId;}); });
      if (!id) {
        if (open !== true || pool.length) throw new Error('Choose a Tier '+tier+' driver. Mark the seat open only when that tier has no available drivers.');
        return null;
      }
      const driver = pool.find(function(p) { return p.driverId === id; });
      if (!driver) throw new Error('That Tier '+tier+' driver is unavailable or belongs to another division/tier. Refresh the draft.');
      return driver;
    }
    const one = select(input.one,1,input.openOne), two = select(input.two,2,input.openTwo);
    const turn = {key:key,division:division,pick:pick,team:expected.team,principal:expected.principal,
      one:one ? one.driverId : '',oneName:one ? one.gamertag : '',two:two ? two.driverId : '',twoName:two ? two.gamertag : '',at:new Date().toISOString()};
    const turns = existing ? l.turns.map(function(t) { return t === existing ? turn : t; }) : l.turns.concat([turn]);
    // Corrections may resolve multiple outdated seats one turn at a time. Remaining
    // issues keep the draft paused until every recorded pair is valid again.
    const result = preseasonLiveDraftCommit_(c,turns);
    result.message = existing ? 'D'+division+' '+expected.team+' picks corrected.' : 'D'+division+' '+expected.team+' pair saved.';
    return result;
  });
}

function undoPreseasonLivePick(input) { fapAssertEntry_('undoPreseasonLivePick');
  return withApplicationLock_(function() {
    const c = preseasonLiveDraftContext_(input.season); intakeRequireRevision_(input,c);
    const last = c.live.turns[c.live.turns.length-1];
    if (!last || last.key !== input.key) throw new Error('The most recent pick changed. Refresh before undoing.');
    const result = preseasonLiveDraftCommit_(c,c.live.turns.slice(0,-1));
    result.message = 'Undid D'+last.division+' '+last.team+' picks. Both seats are available again.';
    return result;
  });
}

function reviewPreseasonLiveDraft(input) { fapAssertEntry_('reviewPreseasonLiveDraft');
  return withApplicationLock_(function() {
    const c = preseasonLiveDraftContext_(input.season); intakeRequireRevision_(input,c);
    if (c.live.missing.length || c.live.issues.length) throw new Error(c.live.missing.concat(c.live.issues).join(' '));
    if (!c.live.turns.length) throw new Error('There are no saved picks to review.');
    const turns = c.live.turns.map(function(t) {
      const one = c.live.drivers.find(function(d) { return d.driverId === t.one; });
      const two = c.live.drivers.find(function(d) { return d.driverId === t.two; });
      return Object.assign({},t,{oneName:one ? one.gamertag : '',twoName:two ? two.gamertag : ''});
    });
    const result = preseasonLiveDraftCommit_(c,turns);result.message = 'Saved picks reviewed against the current placements and order.';return result;
  });
}
