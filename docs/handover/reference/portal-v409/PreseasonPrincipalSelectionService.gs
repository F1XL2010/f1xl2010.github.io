/** Private, season-specific application review and named-voter matrix.
 * Staff responses are read only. Yes=1, Maybe=0.5, No=0, as in Team Owner Voting S28. */
const F1XL_TP_SELECTION=Object.freeze({
  applications:{name:'TP Applications',headers:['Application key','Gamertag','Received','Decision','Application snapshot','Reviewed at']},
  voters:{name:'TP Voters',headers:['Voter']},
  votes:{name:'TP Votes',headers:['Application key','Voter','Vote','Updated at']}
});
function principalSelectionContext_(season){
  const base=preseasonPrincipalsContext_(season),tables={};
  Object.keys(F1XL_TP_SELECTION).forEach(function(key){
    const def=F1XL_TP_SELECTION[key],sheet=base.book.getSheetByName(def.name);let rows=[];
    if(sheet&&sheet.getLastRow()){
      const range=sheet.getRange(1,1,sheet.getLastRow(),def.headers.length),values=range.getDisplayValues();
      if(JSON.stringify(values[0])!==JSON.stringify(def.headers)||range.getFormulas().some(function(r){return r.some(Boolean);}))throw new Error(def.name+' has an unexpected layout or manual formulas. Check the Master before saving.');
      rows=values.slice(1).filter(function(r){return r.some(Boolean);});
      const seen={};rows.forEach(function(r){const id=key==='votes'?JSON.stringify([r[0],r[1]]):r[0];if(!r[0]||seen[id])throw new Error('Missing or duplicate identity in '+def.name+'.');seen[id]=true;});
    }
    tables[key]={sheet:sheet,rows:rows};
  });
  return {season:base.season,book:base.book,base:base,tables:tables,revision:intakeHash_([tables.applications.rows,tables.voters.rows,tables.votes.rows])};
}
function principalSelectionWrite_(c,key,rows,writes){
  const def=F1XL_TP_SELECTION[key];let sheet=c.tables[key].sheet;if(!sheet)sheet=c.book.insertSheet(def.name);
  const values=[def.headers].concat(rows),height=Math.max(values.length,sheet.getLastRow());
  if(height>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),height-sheet.getMaxRows());
  while(values.length<height)values.push(def.headers.map(function(){return '';}));
  writes.push({range:sheet.getRange(1,1,height,def.headers.length),values:values,text:true});
}
function principalSelectionApplication_(app,saved){
  const preferences=['first','second','third','fourth','fifth'].map(function(word){const answer=app.answers.find(function(a){return new RegExp('\\b'+word+' choice\\b','i').test(a.question);});return answer?answer.answer:'';});
  const key=intakeHash_([F1XL_STAFF_APPLICATION_SOURCE.spreadsheetId,F1XL_STAFF_APPLICATION_SOURCE.sheetId,app.fingerprint]),legacyKey=F1XL_STAFF_APPLICATION_SOURCE.profile==='combined'?intakeHash_(['1WSmufxq_UkciOtlAmQGmRYMO6S5kUfo2ozg2X6iasoc',240211154,app.fingerprint]):key;
  const prior=Array.isArray(saved)&&saved.find(s=>s.key===key||s.key===legacyKey);
  return {key:prior?prior.key:key,legacyKey,gamertag:app.gamertag,received:app.received,answers:app.answers,preferences:preferences,sourceRevision:intakeHash_([app.received,app.gamertag,app.role,app.answers])};
}
function principalSelectionSaved_(c){
  return c.tables.applications.rows.map(function(r){let app;try{app=JSON.parse(r[4]);}catch(e){throw new Error('A saved TP application cannot be read. Check TP Applications.');}
    if(!app||app.key!==r[0]||app.gamertag!==r[1]||!Array.isArray(app.answers)||!Array.isArray(app.preferences)||['Accepted','Rejected','Pending'].indexOf(r[3])<0)throw new Error('A saved TP application has invalid details. Check TP Applications.');
    return Object.assign({},app,{decision:r[3],reviewedAt:r[5],saved:true});
  });
}
function principalSelectionResponse_(c){
  const applications=principalSelectionSaved_(c),voters=c.tables.voters.rows.map(function(r){return r[0];}),accepted=applications.filter(function(a){return a.decision==='Accepted';});
  const candidates=accepted.map(function(app){const votes={};let score=0,answered=0;
    c.tables.votes.rows.filter(function(r){return r[0]===app.key&&voters.indexOf(r[1])>=0;}).forEach(function(r){if(['Yes','Maybe','No'].indexOf(r[2])<0)throw new Error('An invalid vote is stored in TP Votes.');votes[r[1]]=r[2];score+=r[2]==='Yes'?1:r[2]==='Maybe'?0.5:0;answered++;});
    return Object.assign({},app,{votes:votes,score:score,answered:answered});
  }).sort(function(a,b){return b.score-a.score||a.gamertag.localeCompare(b.gamertag);});
  return {season:c.season,revision:c.revision,applications:applications,candidates:candidates,voters:voters,message:''};
}
function getPreseasonPrincipalSelection(season){ fapAssertEntry_('getPreseasonPrincipalSelection');return principalSelectionResponse_(principalSelectionContext_(season));}
function getPreseasonPrincipalApplications(input){ fapAssertEntry_('getPreseasonPrincipalApplications');
  const c=principalSelectionContext_(input.season),source=getStaffApplications(input.refresh===true),saved=principalSelectionSaved_(c),seen={};
  const applications=source.applications.filter(function(a){return a.role==='Team Principal';}).map(function(a){const app=principalSelectionApplication_(a,saved);if(seen[app.key])throw new Error('Duplicate staff application identity. Check the response source before reviewing.');seen[app.key]=true;const record=saved.find(function(s){return s.key===app.key;});return Object.assign({},app,{decision:record?record.decision:'Pending',saved:!!record,changed:!!record&&record.sourceRevision!==app.sourceRevision});});
  saved.forEach(function(a){if(!seen[a.key])applications.push(Object.assign({},a,{sourceMissing:true}));});
  return {season:c.season,revision:c.revision,selection:principalSelectionResponse_(c),applications:applications,sourceName:source.sourceName,sourceUrl:'https://docs.google.com/spreadsheets/d/'+F1XL_STAFF_APPLICATION_SOURCE.spreadsheetId+'/edit#gid='+F1XL_STAFF_APPLICATION_SOURCE.sheetId};
}
function reviewPreseasonPrincipalApplication(input){ fapAssertEntry_('reviewPreseasonPrincipalApplication');
  return withApplicationLock_(function(){
    const c=principalSelectionContext_(input.season);intakeRequireRevision_(input,c);
    if(['Accepted','Rejected','Pending'].indexOf(input.decision)<0)throw new Error('Choose an application decision.');
    const old=principalSelectionSaved_(c).find(function(a){return a.key===input.key;});
    const source=getStaffApplications(true).applications.filter(function(a){return a.role==='Team Principal';}).map(a=>principalSelectionApplication_(a,principalSelectionSaved_(c))).filter(function(a){return a.key===input.key;});
    if(source.length>1)throw new Error('Duplicate staff application identity. Check the response source.');
    const app=source[0]||old;if(!app)throw new Error('The application is no longer available. Refresh first.');
    if(app.sourceRevision!==input.sourceRevision)throw new Error('The application changed since you reviewed it. Refresh and read it again.');
    const rows=c.tables.applications.rows.map(function(r){return r.slice();}),votes=c.tables.votes.rows;
    if(input.decision!=='Accepted'&&old&&old.decision==='Accepted'){
      if(c.base.teamValues.some(function(r){return String(r[4]).toLowerCase()===app.gamertag.toLowerCase();}))throw new Error('Remove this candidate from Confirmed teams before changing their acceptance.');
      if(votes.some(function(r){return r[0]===app.key;}))throw new Error('Clear this candidate’s saved votes before changing their acceptance.');
    }
    if(input.decision==='Accepted'&&principalSelectionSaved_(c).some(function(a){return a.key!==app.key&&a.decision==='Accepted'&&a.gamertag.toLowerCase()===app.gamertag.toLowerCase();}))throw new Error('This applicant already has an accepted application. Use that entry rather than adding a second voting candidate.');
    const snapshot={key:app.key,gamertag:app.gamertag,received:app.received,answers:app.answers,preferences:app.preferences,sourceRevision:app.sourceRevision};
    const row=[app.key,app.gamertag,app.received,input.decision,JSON.stringify(snapshot),new Date().toISOString()],index=rows.findIndex(function(r){return r[0]===app.key;});if(index<0)rows.push(row);else rows[index]=row;
    const writes=[];principalSelectionWrite_(c,'applications',rows,writes);intakeCommit_(writes);
    const result=getPreseasonPrincipalSelection(c.season);result.message=app.gamertag+(input.decision==='Accepted'?' accepted for consideration and added to Voting.':input.decision==='Rejected'?' rejected for this season. The original application is retained.':' returned to Pending.');return result;
  });
}
function savePreseasonPrincipalVoters(input){ fapAssertEntry_('savePreseasonPrincipalVoters');
  return withApplicationLock_(function(){const c=principalSelectionContext_(input.season);intakeRequireRevision_(input,c);
    if(!Array.isArray(input.voters)||input.voters.length>30)throw new Error('Use up to 30 named voters.');
    const seen={},voters=input.voters.map(function(v){v=String(v).trim();if(!v||v.length>80||/[\r\n]/.test(v)||seen[v.toLowerCase()])throw new Error('Use a unique name for each voter, up to 80 characters.');seen[v.toLowerCase()]=true;return v;});
    if(c.tables.votes.rows.some(function(r){return voters.indexOf(r[1])<0;}))throw new Error('Clear a voter’s saved votes before removing or renaming their column.');
    const writes=[];principalSelectionWrite_(c,'voters',voters.map(function(v){return [v];}),writes);intakeCommit_(writes);const result=getPreseasonPrincipalSelection(c.season);result.message='Voter columns saved.';return result;
  });
}
function savePreseasonPrincipalVotes(input){ fapAssertEntry_('savePreseasonPrincipalVotes');
  return withApplicationLock_(function(){const c=principalSelectionContext_(input.season);intakeRequireRevision_(input,c);
    if(!Array.isArray(input.changes)||!input.changes.length)throw new Error('There are no vote changes to save.');
    const accepted=principalSelectionSaved_(c).filter(function(a){return a.decision==='Accepted';}),voters=c.tables.voters.rows.map(function(r){return r[0];}),rows=c.tables.votes.rows.map(function(r){return r.slice();}),seen={};
    input.changes.forEach(function(change){const id=JSON.stringify([change.key,change.voter]);if(seen[id]||!accepted.some(function(a){return a.key===change.key;})||voters.indexOf(change.voter)<0||['','Yes','Maybe','No'].indexOf(change.vote)<0)throw new Error('Choose a valid vote for an accepted candidate and named voter.');seen[id]=true;
      const index=rows.findIndex(function(r){return r[0]===change.key&&r[1]===change.voter;});if(!change.vote){if(index>=0)rows.splice(index,1);}else{const row=[change.key,change.voter,change.vote,new Date().toISOString()];if(index<0)rows.push(row);else rows[index]=row;}
    });
    const writes=[];principalSelectionWrite_(c,'votes',rows,writes);intakeCommit_(writes);const result=getPreseasonPrincipalSelection(c.season);result.message='Votes saved. Confirm team assignments in Confirmed teams.';return result;
  });
}
function principalSelectionValidateTeams_(input,teams){
  if(input.selectionRevision==null)return; // Older clients retain their existing team-only API.
  const c=principalSelectionContext_(input.season);if(input.selectionRevision!==c.revision)throw new Error('Candidate decisions or votes changed. Refresh before confirming teams.');
  const accepted=principalSelectionSaved_(c).filter(function(a){return a.decision==='Accepted';}),seen={};
  teams.forEach(function(t,i){if(!t.principal)return;const name=t.principal.toLowerCase();if(seen[name])throw new Error('A principal cannot be assigned to more than one team.');seen[name]=true;
    if(!accepted.some(function(a){return a.gamertag===t.principal;})&&t.principal!==String(c.base.teamValues[i][4]))throw new Error('Choose a principal accepted for consideration in Applications.');
    if(t.type==='Free agent team')throw new Error('Free agent teams do not need a principal. Clear the principal or change the team type.');
  });
}
