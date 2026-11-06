/** Season-owned time trials. The intake queue owns identity, bookings and completion.
 * TT Results owns tracks and lap inputs; formula columns remain usable in Sheets. */
const F1XL_PRESEASON_TT=Object.freeze({sheet:'TT Results',marker:'F1XL Season Time Trials v1',headers:['Driver ID','Gamertag','Track 1 lap 1','Track 1 lap 2','Track 1 lap 3','Track 1 lap 4','Track 1 lap 5','Track 1 average','Track 2 lap 1','Track 2 lap 2','Track 2 lap 3','Track 2 lap 4','Track 2 lap 5','Track 2 average','Overall average','Rank (completed)','Gap to fastest','Completed average']});
function preseasonTTFormulas_(r) {
  return {name:'=IFERROR(VLOOKUP(A'+r+',\'Time Trial Queue\'!A:B,2,FALSE),"")',one:'=IFERROR(AVERAGE(D'+r+':G'+r+'),"")',two:'=IFERROR(AVERAGE(J'+r+':M'+r+'),"")',overall:'=IFERROR(AVERAGE(H'+r+',N'+r+'),"")',rank:'=IF(R'+r+'="","",COUNTIF(R$5:R,"<"&R'+r+')+1)',gap:'=IF(R'+r+'="","",R'+r+'-MIN(R$5:R))',completed:'=IF(AND(COUNT(D'+r+':G'+r+')=4,COUNT(J'+r+':M'+r+')=4,IFERROR(VLOOKUP(A'+r+',\'Time Trial Queue\'!A:D,4,FALSE),"")="Complete"),ROUND(O'+r+',6),"")'};
}
function preseasonTTLap_(value) {
  if(value===''||value==null)return '';
  const text=String(value).trim();
  if(!/^\d{1,2}(\.\d{1,3})?$/.test(text)||Number(text)>=60)throw new Error('Use SS.SSS, from 0.000 to 59.999, as in the original TT sheet. Leave missing laps blank.');
  return Number(text);
}
function preseasonTTContext_(season,intake) {
  // A placement load already owns a fresh intake read. Keep its revision separate.
  const context=intake?Object.assign({},intake):intakeContext_(season),sheet=context.book.getSheetByName(F1XL_PRESEASON_TT.sheet);
  const values=sheet&&sheet.getLastRow()?seasonPlanningValues_(sheet.getRange(1,1,Math.max(4,sheet.getLastRow()),18)):[];
  if(values.length&&(values[0][0]!==F1XL_PRESEASON_TT.marker||String(values[0][1])!==context.season||JSON.stringify(values[3])!==JSON.stringify(F1XL_PRESEASON_TT.headers)))throw new Error('TT Results has an unrecognised layout. Nothing was changed.');
  const ids={},rows=[];
  context.data.trials.rows.forEach(function(row) { if(ids[row[0]])throw new Error('Duplicate driver in Time Trial Queue. Resolve it before editing trials.');ids[row[0]]=true; });
  values.slice(4).forEach(function(row,i) {
    if(row.every(function(v){return v==='';}))return;
    if(!row[0]||!ids[row[0]]||rows.some(function(r){return r.driverId===row[0];}))throw new Error('TT Results contains an unlinked or duplicate driver. Check the Driver ID in the Master.');
    const r=i+5,formula=preseasonTTFormulas_(r),expected={1:formula.name,7:formula.one,13:formula.two,14:formula.overall,15:formula.rank,16:formula.gap,17:formula.completed};
    Object.keys(expected).forEach(function(col) { if(row[col]!==expected[col])throw new Error('TT Results calculation changed at row '+r+'. Restore its formula before saving through FAP.'); });
    rows.push({row:r,driverId:row[0],one:row.slice(2,7).map(preseasonTTLap_),two:row.slice(8,13).map(preseasonTTLap_)});
  });
  context.tt={sheet:sheet,values:values,rows:rows,tracks:values.length?[String(values[1][1]),String(values[1][9])]:['','']};
  context.revision=intakeHash_([context.revision,context.plan,values]);return context;
}
function preseasonTTAverage_(laps) { const values=laps.slice(1).filter(function(v){return v!=='';});return values.length?values.reduce(function(a,b){return a+b;},0)/values.length:null; }
function getPreseasonTimeTrials(season) { fapAssertEntry_('getPreseasonTimeTrials');
  return preseasonTTResponse_(preseasonTTContext_(season));
}
/** Booking coordinators receive only outstanding drivers and appointment details.
 * Results, tracks and completed names never leave the Master through this route. */
function getPreseasonTimeTrialBookings(season) { fapAssertEntry_('getPreseasonTimeTrialBookings');
  return preseasonTTBookingResponse_(preseasonTTBookingContext_(season));
}
/** Appointments depend on the queue and season deadline, not confidential laps
 * or applications. Read fresh on every request, including saves. */
function preseasonTTBookingContext_(season) {
  const c=intakeSeasonContext_(season),trials=intakeReadTable_(c.book,'trials'),ids={};
  trials.rows.forEach(function(row){if(ids[row[0]])throw new Error('Duplicate driver in Time Trial Queue. Resolve it before editing trials.');ids[row[0]]=true;});
  c.data={trials:trials};c.revision='booking:'+intakeHash_([c.season,c.active,c.plan,trials.headers,trials.positions,trials.rows]);return c;
}
function preseasonTTBookingResponse_(context) {
  const entries=context.data.trials.rows.filter(function(row){return row[3]!=='Complete';}).map(function(row){
    return {driverId:row[0],gamertag:row[1],status:row[3],date:row[4],notes:row[5],time:row[6],admin:row[7],complete:false};
  });
  return {season:context.season,active:context.active,revision:context.revision,deadline:context.plan.dates.tt+' '+context.plan.times.tt+' UK',entries:entries,ranked:[],message:'',bookingsOnly:true};
}
function preseasonTTResponse_(context) {
  const tt=context.tt;
  const entries=context.data.trials.rows.map(function(row) {
    const result=tt.rows.find(function(r){return r.driverId===row[0];})||{one:['','','','',''],two:['','','','','']};
    const a=preseasonTTAverage_(result.one),b=preseasonTTAverage_(result.two),averages=[a,b].filter(function(v){return v!==null;});
    const ready=result.one.slice(1).concat(result.two.slice(1)).every(function(v){return v!=='';});
    return {driverId:row[0],gamertag:row[1],status:row[3],date:row[4],notes:row[5],time:row[6],admin:row[7],completedAt:row[8]||'',one:result.one,two:result.two,averageOne:a,averageTwo:b,overall:averages.length?averages.reduce(function(x,y){return x+y;},0)/averages.length:null,complete:row[3]==='Complete',ready:ready};
  });
  const score=function(e){return Math.round(e.overall*1000000)/1000000;};
  const ranked=entries.filter(function(e){return e.complete&&e.ready;}).sort(function(a,b){return score(a)-score(b)||a.gamertag.localeCompare(b.gamertag);});
  ranked.forEach(function(e,i) { e.rank=i&&score(e)===score(ranked[i-1])?ranked[i-1].rank:i+1;e.gap=score(e)-score(ranked[0]); });
  return {season:context.season,active:context.active,url:context.book.getUrl(),revision:context.revision,tracks:tt.tracks,deadline:context.plan.dates.tt+' '+context.plan.times.tt+' UK',entries:entries,ranked:ranked,message:''};
}
function preseasonTTPrepareSheet_(context,writes) {
  let sheet=context.tt.sheet;
  if(!sheet)sheet=context.book.insertSheet(F1XL_PRESEASON_TT.sheet);
  if(!context.tt.values.length) {
    writes.push({range:sheet.getRange(1,1,1,2),values:[[F1XL_PRESEASON_TT.marker,context.season]],text:true});
    writes.push({range:sheet.getRange(2,1),values:[['Track 1']],text:true},{range:sheet.getRange(2,9),values:[['Track 2']],text:true});
    writes.push({range:sheet.getRange(3,1),values:[['Enter SS.SSS as in the original TT sheet. Lap 1 is excluded; laps 2–5 are averaged per track, then the two averages. Partial averages are provisional. Completed trials with eight scored laps are ranked. Edit bookings/status in Time Trial Queue; preserve IDs and formula columns.']],text:true});
    writes.push({range:sheet.getRange(4,1,1,18),values:[F1XL_PRESEASON_TT.headers],text:true});
  }
  return sheet;
}
function savePreseasonTimeTrialTracks(input) { fapAssertEntry_('savePreseasonTimeTrialTracks');
  return withApplicationLock_(function() {
    const context=preseasonTTContext_(input.season);intakeRequireRevision_(input,context);
    const tracks=[input.trackOne,input.trackTwo].map(function(v){return String(v||'').trim();});
    if(tracks.some(function(v){return !v||v.length>100;})||tracks[0].toLowerCase()===tracks[1].toLowerCase())throw new Error('Enter two different track names (up to 100 characters each).');
    if(context.tt.rows.some(function(r){return r.one.concat(r.two).some(function(v){return v!=='';});})&&JSON.stringify(tracks)!==JSON.stringify(context.tt.tracks))throw new Error('Lap times have already been recorded. Clear those times before changing tracks, so existing results are not relabelled.');
    const writes=[];intakeChangedRowsWrite_(context,'trials',context.data.trials.rows,writes);
    const sheet=preseasonTTPrepareSheet_(context,writes);
    writes.push({range:sheet.getRange(2,2),values:[[tracks[0]]],text:true},{range:sheet.getRange(2,10),values:[[tracks[1]]],text:true});
    intakeCommit_(writes);preseasonTTFormat_(sheet);const result=getPreseasonTimeTrials(context.season);result.message='Time-trial tracks saved.';return result;
  });
}
function savePreseasonTimeTrialBooking(input) { fapAssertEntry_('savePreseasonTimeTrialBooking');
  return withApplicationLock_(function() {
    // Keep already open older booking pages working until they refresh.
    const context=String(input.revision||'').startsWith('booking:')?preseasonTTBookingContext_(input.season):preseasonTTContext_(input.season);intakeRequireRevision_(input,context);
    const queue=context.data.trials.rows.map(function(r){return r.slice();}),driver=queue.find(function(r){return r[0]===input.driverId;});
    if(!driver)throw new Error('Process this driver’s application first to create their time-trial entry.');
    if(driver[3]==='Complete')throw new Error('Completed time trials are no longer available for booking changes.');
    const date=String(input.date||'').trim(),time=String(input.time||'').trim(),admin=String(input.admin||'').trim(),notes=String(input.notes||'').trim();
    if(date)seasonPlanningDate_(date);
    if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Use a valid UK booking time (HH:mm).');
    if(time&&!date)throw new Error('Choose a booking date for that time.');
    if(admin.length>120||notes.length>5000)throw new Error('Keep the admin name within 120 characters and notes within 5,000 characters.');
    driver[3]=date?'Booked':'Awaiting time trial';driver[4]=date;driver[5]=notes;driver[6]=time;driver[7]=admin;
    const writes=[];intakeChangedRowsWrite_(context,'trials',queue,writes);intakeCommit_(writes);
    const result=getPreseasonTimeTrialBookings(context.season);result.message='Time-trial booking saved.';return result;
  });
}
function savePreseasonTimeTrial(input) { fapAssertEntry_('savePreseasonTimeTrial');
  return withApplicationLock_(function() { return savePreseasonTimeTrial_(input); });
}
function savePreseasonTimeTrial_(input) {
    const context=preseasonTTContext_(input.season);intakeRequireRevision_(input,context);
    const queue=context.data.trials.rows.map(function(r){return r.slice();}),driver=queue.find(function(r){return r[0]===input.driverId;});
    if(!driver)throw new Error('Process this driver’s application first to create their time-trial entry.');
    const actor=fapCurrentPerson_();if(driver[3]==='Complete'&&(!actor||fapPermission_(actor,'tt_results')<2))throw new Error('Completed time trials can only be amended with TT results edit access.');
    const one=input.one,two=input.two;
    if(!Array.isArray(one)||!Array.isArray(two)||one.length!==5||two.length!==5)throw new Error('Supply five lap fields for each track.');
    const lapsOne=one.map(preseasonTTLap_),lapsTwo=two.map(preseasonTTLap_),hasLaps=lapsOne.concat(lapsTwo).some(function(v){return v!=='';});
    if(hasLaps&&context.tt.tracks.some(function(t){return !t;}))throw new Error('Save both track names before recording laps.');
    if(input.complete===true&&lapsOne.slice(1).concat(lapsTwo.slice(1)).some(function(v){return v==='';}))throw new Error('Enter laps 2–5 at both tracks before marking the time trial complete.');
    const date=String(input.date||'').trim(),time=String(input.time||'').trim(),admin=String(input.admin||'').trim(),notes=String(input.notes||'').trim();
    if(date)seasonPlanningDate_(date);
    if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Use a valid UK booking time (HH:mm).');
    if(time&&!date)throw new Error('Choose a booking date for that time.');
    if(admin.length>120||notes.length>5000)throw new Error('Keep the admin name within 120 characters and notes within 5,000 characters.');
    // Record the transition, not later edits or a historical booking date.
    driver[8]=input.complete===true?(driver[3]==='Complete'?driver[8]||'':new Date().toISOString()):'';
    driver[3]=input.complete===true?'Complete':hasLaps?'In progress':date?'Booked':'Awaiting time trial';driver[4]=date;driver[5]=notes;driver[6]=time;driver[7]=admin;
    const writes=[];intakeChangedRowsWrite_(context,'trials',queue,writes);
    const sheet=preseasonTTPrepareSheet_(context,writes),old=context.tt.rows.find(function(r){return r.driverId===input.driverId;}),r=old?old.row:Math.max(5,sheet.getLastRow()+1),f=preseasonTTFormulas_(r);
    if(r>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),r-sheet.getMaxRows());
    writes.push({range:sheet.getRange(r,1),values:[[input.driverId]],text:true},{range:sheet.getRange(r,2),values:[[f.name]],formulas:true},{range:sheet.getRange(r,3,1,5),values:[lapsOne]},{range:sheet.getRange(r,8),values:[[f.one]],formulas:true},{range:sheet.getRange(r,9,1,5),values:[lapsTwo]},{range:sheet.getRange(r,14,1,5),values:[[f.two,f.overall,f.rank,f.gap,f.completed]],formulas:true});
    intakeCommit_(writes);preseasonTTFormat_(sheet);
    const result=getPreseasonTimeTrials(context.season);result.message='Booking and time-trial results saved.';return result;
}
function preseasonTTFormat_(sheet) {
  // Formatting is best-effort after the value commit; never present a saved trial as failed.
  sheetPresentationSafely_(function() { sheetPresentationTimeTrials_(sheet); });
}
