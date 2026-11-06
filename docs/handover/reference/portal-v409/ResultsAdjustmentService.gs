/** Time/order calculator. All arithmetic is integer milliseconds. This pure
 * function is also copied into the client; the test checks the copies match. */
function resultsAdjustmentCalculate_(rows, adjustments) {
  const clean=v=>String(v==null?'':v).trim().replace(/^'/,'').trim();
  const key=v=>clean(v).toLowerCase();
  function millis(value, gap) {
    const s=clean(value),m=s.match(gap?/^\+(?:(\d+):)?(\d+)(?:\.(\d{1,3}))?$/:/^(?:(\d+):)?(\d+):(\d{2})(?:\.(\d{1,3}))?$/);
    if(!m)return null;
    if(gap){if(m[1]&&Number(m[2])>=60)return null;return (Number(m[1]||0)*60+Number(m[2]))*1000+Number((m[3]||'').padEnd(3,'0'));}
    if(Number(m[3])>=60||(m[1]&&Number(m[2])>=60))return null;
    return (Number(m[1]||0)*3600+Number(m[2])*60+Number(m[3]))*1000+Number((m[4]||'').padEnd(3,'0'));
  }
  function time(ms) {const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s/60)%60;return (h?h+':'+String(m).padStart(2,'0'):String(Math.floor(s/60)))+':'+String(s%60).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');}
  function gap(ms){return '+'+Math.floor(ms/1000)+'.'+String(ms%1000).padStart(3,'0');}
  const entries=[],seen=new Set(),deltas=new Map();
  (adjustments||[]).forEach(a=>{const n=Number(a.seconds),k=key(a.driver);if(!k||!Number.isFinite(n)||Math.abs(n)>3600||Math.abs(n*1000-Math.round(n*1000))>0.00001)throw Error('Enter seconds to three decimal places or fewer (up to 3600 seconds).');deltas.set(k,(deltas.get(k)||0)+Math.round(n*1000));});
  (rows||[]).forEach((r,i)=>{if(!clean(r.driver)){if(clean(r.gap))throw Error('A finishing time has no driver. Complete that row first.');return;}const k=key(r.driver);if(seen.has(k))throw Error('A driver appears twice. Remove the duplicate first.');seen.add(k);entries.push({row:r,index:i,key:k});});
  if(!entries.length)throw Error('Enter the race results first.');
  if(entries[0].index!==0)throw Error('Put the winner in the first row before calculating.');
  const leader=millis(entries[0].row.gap,false);
  if(leader===null||leader<=0)throw Error('Enter the winner’s full race time, for example 45:32.218.');
  let last=-1,untimed=false;const timed=[],other=[];
  entries.forEach((e,i)=>{const s=clean(e.row.gap),offset=i===0?0:millis(s,true),delta=deltas.get(e.key)||0;
    if(offset===null){if(!/^(?:\+?\d+\s+Laps?|DNF|DSQ|DNS|DNC)$/i.test(s))throw Error('Check '+e.row.driver+'’s gap: use +seconds, +1 Lap, DNF or DSQ.');untimed=true;if(delta)throw Error(e.row.driver+' has '+s+'. Adjust this driver manually; an exact finishing time is unavailable.');other.push({...e,delta:0,oldGap:s,newGap:s,oldTime:'',newTime:'',manual:true});return;}
    if(untimed||offset<last)throw Error('The current gaps are out of finishing order. Correct them before calculating.');last=offset;
    const finish=leader+offset+delta;if(finish<=0)throw Error('The adjustment would give '+e.row.driver+' an invalid finishing time.');
    timed.push({...e,delta,oldGap:s,oldTime:time(leader+offset),newTime:time(finish),finish});
  });
  for(const [k,n] of deltas)if(n&&!seen.has(k))throw Error('An adjusted driver is missing from this race.');
  timed.sort((a,b)=>a.finish-b.finish||a.index-b.index);
  const winner=timed[0],ordered=timed.concat(other),warnings=[];
  if(other.length)warnings.push('Lapped drivers and DNFs retain their relative order. Their time penalties need a manual check.');
  timed.forEach((e,i)=>{e.newGap=i?gap(e.finish-winner.finish):time(e.finish);if(i&&e.finish===timed[i-1].finish)warnings.push(e.row.driver+' and '+timed[i-1].row.driver+' have equal times; their existing order is retained.');});
  const output=ordered.map((e,i)=>({...e.row,gap:e.newGap}));
  (rows||[]).filter(r=>!clean(r.driver)).forEach(r=>output.push({...r}));
  return {rows:output,winner:winner.row.driver,winnerTime:time(winner.finish),warnings,changes:ordered.map((e,i)=>({driver:e.row.driver,oldPosition:e.index+1,newPosition:i+1,oldGap:e.oldGap,newGap:e.newGap,oldTime:e.oldTime,newTime:e.newTime,seconds:e.delta/1000,manual:!!e.manual}))};
}

const F1XL_RESULT_ADJUSTMENT_MARKER='\n[F1XL time adjustments v1]\n';
function resultsAdjustmentFingerprint_(rows){return divisionDataRevision_(rows.filter(r=>r.driver).map(r=>[String(r.driver).trim().toLowerCase(),String(r.gap||'').trim().replace(/^'/,'')]));}
function resultsAdjustmentRead_(sheet,session){
  const range=sheet.getRange(session.startRow-1,7),note=range.getNote()||'',at=note.indexOf(F1XL_RESULT_ADJUSTMENT_MARKER);let data={included:[]};
  if(at>=0){try{data=JSON.parse(note.slice(at+F1XL_RESULT_ADJUSTMENT_MARKER.length));}catch(e){throw Error('The saved time-adjustment note is damaged. Review the Gap heading note in '+sheet.getName()+'.');}}
  const fingerprint=resultsAdjustmentFingerprint_(session.rows);
  if(data.pending){if(fingerprint===data.pending.after)data=data.pending.next;else if(fingerprint!==data.pending.before)throw Error('An interrupted time adjustment needs checking against the Gap heading note before another calculation.');}
  return {range,note,prefix:at<0?note:note.slice(0,at),data,drift:!!data.fingerprint&&data.fingerprint!==fingerprint,fingerprint};
}
function resultsAdjustmentNote_(prefix,data){
  // Existing notes are retained. The record travels with a workbook copy and
  // can be inspected manually on the normal race table's Gap heading.
  const summary='Time adjustments saved by Admin Portal. Last changes: '+(data.last||[]).map(x=>x.driver+' '+(x.seconds>0?'+':'')+x.seconds+'s').join('; ')+'. '+(data.at||'')+'\n';
  const original=String(prefix||'').replace(/Time adjustments saved by Admin Portal\.[\s\S]*$/,'');
  const text=original+(original?'\n':'')+summary+F1XL_RESULT_ADJUSTMENT_MARKER+JSON.stringify(data);
  if(text.length>45000)throw Error('The time-adjustment record is too large. Review this race before continuing.');return text;
}
function resultsAdjustmentSession_(value){return ticketDeliverySession_(String(value||'').replace(/^R\d+\s+/i,''));}
function resultsAdjustmentSources_(selection,round,session,receipt,ledger){
  const relevant=ledger.filter(r=>String(r[0])===selection.season&&/^S\d+(?:\.5)? R(\d+)\b/.exec(r[1])?.[1]===String(round));
  const out=[],ids=new Set(),tracked=receipt.data.included||[];
  relevant.forEach(r=>{
    if(r[7])throw Error('A ticket penalty transfer is unfinished. Finish applying it before calculating times.');
    const desired=r[5]?JSON.parse(r[5]):[],last=r[9]?JSON.parse(r[9]):[];
    const people=desired.filter(p=>Number(p.division)===selection.division&&p.session===session.id);
    people.forEach(p=>{
      const seconds=Number(p.seconds||0)-Number(p.removedSeconds||0),k=r[2]+'|'+(p.driverId||String(p.driver).toLowerCase()),old=tracked.find(t=>t.key===k);
      if(!seconds&&!old)return;
      const previous=last.find(x=>String(x.driver).toLowerCase()===String(p.driver).toLowerCase()&&resultsAdjustmentSession_(x.session)===session.id),was=previous?Number(previous.seconds||0)-Number(previous.secondsDelta||0)-Number(previous.previousRemovedSeconds||0):0;
      let included=old&&!receipt.drift?old.seconds:r[6]===r[4]?seconds:was?null:0;
      if(receipt.drift&&old)included=null;
      out.push({key:k,caseId:r[2],driver:p.driver,driverId:p.driverId||'',ticket:r[3],target:seconds,included,tracked:!!old&&!receipt.drift,checked:r[6]===r[4],decision:r[4]});ids.add(k);
    });
    // An overturned decision may have no remaining contribution. Preserve
    // the previously included amount so the calculator can subtract it.
    tracked.filter(t=>t.caseId===r[2]&&!ids.has(t.key)).forEach(t=>{out.push({...t,ticket:r[3],target:0,included:receipt.drift?null:t.seconds,tracked:!receipt.drift,decision:r[4]});ids.add(t.key);});
    // For decisions adjusted manually before this tool existed, do not guess
    // whether the previous penalty ever reached the finishing times.
    last.filter(p=>Number(p.division)===selection.division&&resultsAdjustmentSession_(p.session)===session.id).forEach(p=>{
      if(out.some(t=>t.caseId===r[2]&&String(t.driver).toLowerCase()===String(p.driver).toLowerCase()))return;
      const prior=Number(p.seconds||0)-Number(p.secondsDelta||0)-Number(p.previousRemovedSeconds||0),target=Number(p.seconds||0)-Number(p.removedSeconds||0);
      if(prior===target)return;const k=r[2]+'|'+String(p.driver).toLowerCase();
      out.push({key:k,caseId:r[2],driver:p.driver,driverId:'',ticket:r[3],target,included:r[6]===r[4]?target:null,tracked:false,checked:r[6]===r[4],decision:r[4]});ids.add(k);
    });
  });
  tracked.filter(t=>!ids.has(t.key)&&t.seconds).forEach(t=>{throw Error('The recorded ticket for '+t.driver+' is missing. Review it before recalculating this race.');});
  return out;
}
function resultsAdjustmentContext_(selection,context,current,sessionId,ledger){
  const session=current.sessions.find(s=>s.id===sessionId&&s.kind==='race');if(!session)throw Error('Choose a race or sprint race first.');
  const sheet=findDivisionRoundSheet_(context,current.sheetName),receipt=resultsAdjustmentRead_(sheet,session);
  const sources=resultsAdjustmentSources_(selection,current.round,session,receipt,ledger);
  return {session,receipt,sources,revision:divisionDataRevision_([current.revision,receipt.note,sources]),drift:receipt.drift,last:receipt.data.last||[]};
}
function getResultsTimeAdjustments(input){ fapAssertEntry_('getResultsTimeAdjustments');
  const selection=normaliseResultsEntrySelection_(input),context=openResultsEntryContext_(selection),sheet=findDivisionRoundSheet_(context,input.sheetName),current=buildDivisionRound_(context,sheet);
  if(current.revision!==input.revision)throw Error('The saved results changed. Your entries are kept; refresh the round when ready before calculating.');
  const ledger=ticketDeliveryRows_(openTicketProcessingContext_().spreadsheet),x=resultsAdjustmentContext_(selection,context,current,input.sessionId,ledger);
  return {revision:x.revision,sources:x.sources,drift:x.drift,last:x.last,savedTimes:x.session.rows.filter(r=>r.driver).map(r=>[String(r.driver).trim().toLowerCase(),String(r.gap||'').trim().replace(/^'/,'')])};
}
function resultsAdjustmentPlan_(x,plan){
  if(plan.contextRevision!==x.revision)throw Error('The ticket decisions or adjustment history changed. Reopen Preview adjusted results.');
  if(!Array.isArray(plan.beforeRows)||plan.beforeRows.length!==24||!Array.isArray(plan.selections)||plan.selections.length>100||!Array.isArray(plan.manual)||plan.manual.length>24)throw Error('Reopen the time-adjustment preview.');
  const included=(x.receipt.data.included||[]).map(t=>({...t})),deltas=[],seen=new Set();
  plan.selections.forEach(s=>{
    if(seen.has(s.key))throw Error('Duplicate ticket adjustment.');seen.add(s.key);
    const source=x.sources.find(t=>t.key===s.key);if(!source)throw Error('A selected time penalty has changed. Reopen the preview.');
    if(s.included===''||s.included==null||!Number.isFinite(Number(s.included)))throw Error('Enter how many seconds are already included for '+source.driver+'.');
    const amount=Number(s.included);if(Math.abs(amount)>3600||Math.abs(amount*1000-Math.round(amount*1000))>0.00001)throw Error('Check seconds already included.');
    if(source.tracked&&resultsAdjustmentFingerprint_(plan.beforeRows)===x.receipt.fingerprint&&amount!==source.included)throw Error('This ticket adjustment is already recorded. Use an extra correction if the finishing time needs changing.');
    deltas.push({driver:source.driver,seconds:source.target-amount});
    const entry={key:source.key,caseId:source.caseId,driverId:source.driverId,driver:source.driver,seconds:source.target},at=included.findIndex(t=>t.key===source.key);if(at<0)included.push(entry);else included[at]=entry;
  });
  plan.manual.forEach(m=>deltas.push({driver:String(m.driver||''),seconds:m.seconds}));
  const result=resultsAdjustmentCalculate_(plan.beforeRows,deltas),last=result.changes.filter(r=>r.seconds).map(r=>({driver:r.driver,seconds:r.seconds,from:r.oldGap,to:r.newGap}));
  const next={included,fingerprint:resultsAdjustmentFingerprint_(result.rows),last,at:new Date().toISOString()};
  return {result,next};
}
function resultsAdjustmentPrepare_(context,input,selection){
  const plans=input.timeAdjustments;if(!plans)return [];
  if(!Array.isArray(plans)||plans.length>2)throw Error('Reopen the time-adjustment preview.');
  if(!plans.length)return [];
  const sheet=findDivisionRoundSheet_(context,input.sheetName),current=buildDivisionRound_(context,sheet);
  if(current.revision!==input.revision)throw Error('This round changed after you opened it. Refresh before saving.');
  const ledger=ticketDeliveryRows_(openTicketProcessingContext_().spreadsheet),prepared=[],seen=new Set();
  plans.forEach(plan=>{
    if(seen.has(plan.sessionId))throw Error('Duplicate session adjustment.');seen.add(plan.sessionId);
    const x=resultsAdjustmentContext_(selection,context,current,plan.sessionId,ledger),p=resultsAdjustmentPlan_(x,plan);
    const supplied=(input.sessions||[]).find(s=>s.id===plan.sessionId);
    if(!supplied||resultsAdjustmentFingerprint_(supplied.rows.map(r=>({driver:r[1],gap:r[3]})))!==p.next.fingerprint)throw Error('Times or order changed after the preview. Undo the preview, then calculate again.');
    const pending={...x.receipt.data,pending:{before:x.receipt.fingerprint,after:p.next.fingerprint,next:p.next}};
    prepared.push({range:x.receipt.range,before:x.receipt.note,journal:resultsAdjustmentNote_(x.receipt.prefix,pending),after:resultsAdjustmentNote_(x.receipt.prefix,p.next)});
  });
  return prepared;
}
function resultsAdjustmentWriteJournal_(prepared){
  const written=[];try{prepared.forEach(p=>{p.range.setNote(p.journal);written.push(p);});}catch(e){written.forEach(p=>p.range.setNote(p.before));throw e;}
}
function resultsAdjustmentFinish_(prepared){prepared.forEach(p=>p.range.setNote(p.after));}
