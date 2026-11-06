/** Private preparation only. Never writes Calendar, Feed, website configuration or sharing. */
const F1XL_TRACK_DRAW=Object.freeze({sheet:'Track Draw',marker:'F1XL Private Track Draw v1',sprints:[3,9,14,19]});
function preseasonTrackDrawContext_(season){
  season=seasonPlanningSeason_(season);const book=seasonPlanningBook_(season);
  if(!book||!seasonMasterIsPlanning_(book))throw new Error('Choose a Season Master that is still in preseason.');
  const plan=seasonPlanningRead_(book.getSheetByName(F1XL_SEASON_PLANNING.sheetName),season,book),snapshot=book.getSheetByName('Reference Snapshot');
  if(!snapshot)throw new Error('This Master is missing Reference Snapshot.');
  const options=snapshot.getRange(2,61,Math.max(1,snapshot.getLastRow()-1),1).getDisplayValues().map(function(r){return r[0].trim();}).filter(function(v,i,a){return v&&a.indexOf(v)===i;});
  if(!options.length)throw new Error('No available tracks were found in this Master’s reference list.');
  const sheet=book.getSheetByName(F1XL_TRACK_DRAW.sheet),values=sheet&&sheet.getLastRow()?seasonPlanningValues_(sheet.getRange(1,1,Math.max(8,sheet.getLastRow()),8)):[];
  const headers=['Round','Date','Track','Weekend','','Track pool','Eligible','Guaranteed'];
  if(values.length&&(values[0][0]!==F1XL_TRACK_DRAW.marker||String(values[0][1])!==season||JSON.stringify(values[7])!==JSON.stringify(headers)))throw new Error('Track Draw has an unrecognised layout. Nothing was changed.');
  if(values.some(function(r){return r.some(function(v){return typeof v==='string'&&v.startsWith('=');});}))throw new Error('Track Draw contains a manual formula. Review it before saving.');
  const stored=values.slice(8),savedRounds=stored.filter(function(r){return r[0]!=='';});
  if(savedRounds.some(function(r,i){return Number(r[0])!==i+1;}))throw new Error('Keep Track Draw rounds numbered in order.');
  if(savedRounds.slice(plan.plan.count).some(function(r){return r[2]!=='';}))throw new Error('The saved draw has tracks beyond the new round count. Restore the season’s round count before editing this draw.');
  const savedPool=stored.filter(function(r){return r[5]!=='';});
  if(savedPool.some(function(r,i){return savedPool.findIndex(function(v){return v[5]===r[5];})!==i||!['Yes','No'].includes(r[6])||!['Yes','No'].includes(r[7]);}))throw new Error('Track Draw pool rows must be unique and use Yes/No markers.');
  const pool=options.map(function(track){const old=savedPool.find(function(r){return r[5]===track;});return {track:track,eligible:old?old[6]==='Yes':true,guaranteed:old?old[7]==='Yes':false};});
  if(savedPool.some(function(r){return !options.includes(r[5]);}))throw new Error('The reference track list changed. Restore the missing reference track before editing the saved draw.');
  let previousTracks=[];if(values.length){try{previousTracks=JSON.parse(values[3][1]||'[]');}catch(e){throw new Error('Track Draw previous-track metadata is unreadable.');}if(!Array.isArray(previousTracks))throw new Error('Invalid previous-track metadata.');}
  const races=plan.plan.races.map(function(date,i){const old=savedRounds[i];return {round:i+1,date:date,track:old?String(old[2]):'',weekend:old?String(old[3]):F1XL_TRACK_DRAW.sprints.includes(i+1)?'Modern Sprint':'Standard'};});
  return {season:season,book:book,plan:plan.plan,sheet:sheet,values:values,headers:headers,options:options,pool:pool,races:races,source:values.length?String(values[2][1]):'',previousTracks:previousTracks,reviewed:values.length&&values[4][1]==='Yes',drawnAt:values.length?String(values[5][1]):'',savedAt:values.length?String(values[1][1]):'',revision:intakeHash_([plan.revision,options,values])};
}
function getPreseasonTrackDraw(season){ fapAssertEntry_('getPreseasonTrackDraw');
  const c=preseasonTrackDrawContext_(season);
  return {season:c.season,url:c.book.getUrl(),revision:c.revision,pool:c.pool,races:c.races,source:c.source,previousTracks:c.previousTracks,reviewed:!!c.reviewed,drawnAt:c.drawnAt,savedAt:c.savedAt,previousSeasons:getSeasonPlanningPreviousSeasons_(c.season),message:''};
}
function importPreseasonTrackHistory(input){ fapAssertEntry_('importPreseasonTrackHistory');
  const c=preseasonTrackDrawContext_(input.season),previous=String(input.previousSeason||'');intakeRequireRevision_(input,c);
  if(!/^\d+(?:\.5)?$/.test(previous)||Number(previous)>=Number(c.season))throw new Error('Choose a previous connected season.');
  const id=PropertiesService.getScriptProperties().getProperty(seasonMasterPropertyKey_(previous));
  if(!id)throw new Error('That Season Master is not connected. Mark its omitted tracks manually in the pool instead.');
  const book=SpreadsheetApp.openById(id),start=book.getSheetByName('Start Here'),calendar=book.getSheetByName('Calendar');
  if(!start||String(start.getRange('B3').getDisplayValue())!==previous||!calendar)throw new Error('The connected workbook does not contain that season’s Master calendar. Mark omitted tracks manually instead.');
  const rows=calendar.getDataRange().getDisplayValues().filter(function(r){return /^\d+$/.test(r[0])&&Number(r[0])>0;});
  const expected=Number(start.getRange('B4').getValue());
  if(!rows.length||(expected>0&&rows.length!==expected)||rows.some(function(r,i){return Number(r[0])!==i+1||!String(r[3]||'').trim();}))throw new Error('The previous calendar is empty or incomplete. Mark omitted tracks manually instead of inferring them from missing data.');
  const tracks=Array.from(new Set(rows.map(function(r){return r[3].trim();}))),normal=function(v){return v.toLowerCase();};
  const pool=input.pool||c.pool;
  if(!Array.isArray(pool)||pool.length!==c.options.length||pool.some(function(p,i){return !p||!c.options.includes(p.track)||typeof p.eligible!=='boolean'||pool.findIndex(function(t){return t&&t.track===p.track;})!==i;}))throw new Error('The eligible pool changed. Reload before importing the previous calendar.');
  return {source:'Season '+previous+' · '+book.getName(),previousTracks:tracks,pool:pool.map(function(p){return {track:p.track,eligible:p.eligible,guaranteed:p.eligible&&!tracks.some(function(t){return normal(t)===normal(p.track);})};}),unmatched:tracks.filter(function(t){return !c.options.some(function(o){return normal(t)===normal(o);});})};
}
function preseasonTrackDrawValidate_(input,c,requireOrder){
  if(!Array.isArray(input.pool)||input.pool.length!==c.options.length)throw new Error('The track pool changed. Reload before drawing.');
  const seen={};const pool=input.pool.map(function(p){if(!p||!c.options.includes(p.track)||seen[p.track]||typeof p.eligible!=='boolean'||typeof p.guaranteed!=='boolean')throw new Error('Use each reference track once with valid pool selections.');seen[p.track]=true;if(p.guaranteed&&!p.eligible)throw new Error('A guaranteed track must also be eligible.');return {track:p.track,eligible:p.eligible,guaranteed:p.guaranteed};});
  const eligible=pool.filter(function(p){return p.eligible;}),guaranteed=eligible.filter(function(p){return p.guaranteed;});
  if(eligible.length<c.races.length)throw new Error('There are fewer eligible tracks than rounds. Add eligible tracks or reduce the round count.');
  if(guaranteed.length>c.races.length)throw new Error('There are more guaranteed tracks than rounds. Review the pool or increase the round count.');
  if(input.reviewed!==true)throw new Error('Confirm that you have reviewed the eligible and omitted-track pool.');
  if(!Array.isArray(input.races)||input.races.length!==c.races.length)throw new Error('The round count changed. Reload before drawing.');
  const tracks={};const races=input.races.map(function(r,i){if(Number(r.round)!==i+1||!['Standard','Modern Sprint','Legacy Sprint'].includes(r.weekend))throw new Error('Keep rounds in order and choose a recognised weekend type.');const track=String(r.track||'');if(requireOrder&&track&&(!eligible.some(function(p){return p.track===track;})||tracks[track]))throw new Error('The saved order must use different eligible tracks.');tracks[track]=true;return {round:i+1,date:c.races[i].date,track:track,weekend:r.weekend};});
  if(requireOrder&&races.some(function(r){return r.track;})){
    if(races.some(function(r){return !r.track;}))throw new Error('Draw or fill every round before saving the order.');
    if(guaranteed.some(function(p){return !races.some(function(r){return r.track===p.track;});}))throw new Error('Every guaranteed track must be included in the order.');
  }
  return {pool:pool,races:races};
}
function preseasonTrackShuffle_(values){const result=values.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function drawPreseasonTracks(input){ fapAssertEntry_('drawPreseasonTracks');
  const c=preseasonTrackDrawContext_(input.season);intakeRequireRevision_(input,c);const checked=preseasonTrackDrawValidate_(input,c,false);
  const guaranteed=checked.pool.filter(function(p){return p.guaranteed;}).map(function(p){return p.track;}),others=checked.pool.filter(function(p){return p.eligible&&!p.guaranteed;}).map(function(p){return p.track;});
  const selected=preseasonTrackShuffle_(guaranteed.concat(preseasonTrackShuffle_(others).slice(0,c.races.length-guaranteed.length)));
  return {races:checked.races.map(function(r,i){r.track=selected[i];return r;}),drawnAt:new Date().toISOString()};
}
function savePreseasonTrackDraw(input){ fapAssertEntry_('savePreseasonTrackDraw');
  return withApplicationLock_(function(){
    const c=preseasonTrackDrawContext_(input.season);intakeRequireRevision_(input,c);const checked=preseasonTrackDrawValidate_(input,c,true);
    const source=String(input.source||'Manually reviewed pool').slice(0,300),previous=Array.isArray(input.previousTracks)?input.previousTracks.map(function(t){return String(t).slice(0,120);}):[];
    if(previous.length>100)throw new Error('The previous track list is too long.');
    const values=Array.from({length:8+Math.max(checked.pool.length,checked.races.length)},function(){return Array(8).fill('');});
    values[0][0]=F1XL_TRACK_DRAW.marker;values[0][1]=c.season;
    [['Saved at',new Date().toISOString()],['Previous season source',source],['Previous tracks',JSON.stringify(previous)],['Pool reviewed','Yes'],['Drawn at',String(input.drawnAt||'').slice(0,40)],['Purpose','Private preparation. Calendar and website are unchanged.']].forEach(function(r,i){values[i+1][0]=r[0];values[i+1][1]=r[1];});values[7]=c.headers;
    checked.races.forEach(function(r,i){values[i+8].splice(0,4,r.round,r.date,r.track,r.weekend);});checked.pool.forEach(function(p,i){values[i+8].splice(5,3,p.track,p.eligible?'Yes':'No',p.guaranteed?'Yes':'No');});
    const sheet=c.sheet||c.book.insertSheet(F1XL_TRACK_DRAW.sheet),height=Math.max(values.length,c.values.length);while(values.length<height)values.push(Array(8).fill(''));
    if(height>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),height-sheet.getMaxRows());
    intakeCommit_([{range:sheet.getRange(1,1,height,8),values:values,text:true}]);
    const result=getPreseasonTrackDraw(c.season);result.message='Track draw saved privately in the Season Master. The calendar and website have not been changed.';return result;
  });
}
