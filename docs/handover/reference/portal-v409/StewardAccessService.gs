/** Restricted reviewers use the existing race tabs and their own named column. */
function fapStewardIdentity_(input){
  const p=fapCurrentPerson_();if(!p)throw new Error('Sign in first.');
  const side=input&&input.side==='appeal'?'appeal':'steward';fapRequire_(p,side,1);
  if(!p.reviewerName&&!p.owner&&!p.roles.includes('god'))throw new Error('Ask the F1XL owner to link your exact reviewer name.');
  return {person:p,side:side,name:p.reviewerName};
}
function fapStewardContext_(input,context,identity){
  identity=identity||fapStewardIdentity_(input);context=context||openTicketProcessingContext_();
  const sheet=findTicketRaceSheet_(context,fapText_(input.sheetName)),round=ticketRoundForSheet_(context.spreadsheet,sheet.getName());
  if(!round)throw new Error('Choose a registered season round.');
  const definitions=reviewerDefinitions_(sheet),reviewers=identity.side==='appeal'?definitions.appeals:definitions.stewards;
  // Owner preview can choose a reviewer. Everyone else is pinned server-side.
  const name=(identity.person.owner||identity.person.roles.includes('god'))?fapText_(input.reviewerName)||reviewers[0].name:identity.name;
  const matches=reviewers.filter(r=>r.name.toLowerCase()===name.toLowerCase());if(matches.length!==1)throw new Error('Your reviewer name must match exactly one column in this round. Ask the head steward to check its reviewer names.');
  return {identity:identity,context:context,sheet:sheet,reviewer:matches[0],round:round,board:{sheetName:sheet.getName(),stewardReviewers:definitions.stewards,appealReviewers:definitions.appeals,options:{penalties:F1XL_REVIEW_PENALTIES,timePenalties:F1XL_REVIEW_TIME_PENALTIES},tickets:[]}};
}
function fapStewardWorkspace_(input,context,identity){
  const c=fapStewardContext_(input,context,identity),sheet=c.sheet;
  const values=sheet.getRange(2,1,F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow-1,sheet.getMaxColumns()>=85?85:F1XL_TICKET_PROCESSING_SOURCE.finalTicketColumn).getDisplayValues();
  c.board.tickets=values.map((v,i)=>buildTicketRaceRecord_(sheet,i+2,v)).filter(t=>t.division).sort((a,b)=>Number(a.division)-Number(b.division)||Number(a.ticketNumber)-Number(b.ticketNumber));
  // Load appeal decision context once per round, never for each ticket/save.
  if(c.identity.side==='appeal'&&c.board.tickets.some(t=>String(t.appealed).toLowerCase()==='yes')){
    const full=c.context.websiteSheet?c.context:openTicketProcessingContext_(),history=full.spreadsheet.getSheetByName('Ticket History');
    const rows=history&&history.getLastRow()>1?history.getRange(2,1,history.getLastRow()-1,5).getDisplayValues():[];
    const published=buildWebsiteTicketExport_(full).tickets.filter(t=>t.race===sheet.getName());
    c.originals={};c.board.tickets.forEach(t=>{const match=published.find(p=>t.caseId&&p.caseId===t.caseId);if(match)c.originals[t.caseId]=ticketAppealOriginal_(full,match,rows);});
  }
  return c;
}
function fapStewardVotes_(votes,names){return votes.map((v,i)=>({name:names[i].name,penalty:v.penalty,timePenalty:v.timePenalty,atFault:v.atFault,comments:v.comments,state:v.state}));}
function fapStewardResponse_(c){
  const appeals=c.identity.side==='appeal',tickets=c.board.tickets.filter(t=>!appeals||String(t.appealed).toLowerCase()==='yes');
  return {sheetName:c.board.sheetName,side:c.identity.side,reviewerName:c.reviewer.name,options:c.board.options,round:c.round,originalDecisions:c.originals||{},
    tickets:tickets.map(t=>({sheetRow:t.sheetRow,caseId:t.caseId,recordRevision:t.recordRevision,ticketNumber:t.ticketNumber,division:t.division,session:t.session,submitter:t.submitter,offender:t.offender,description:t.description,evidence:t.evidence,defenceComments:t.defenceComments,defenceEvidence:t.defenceEvidence,appealDescription:appeals?t.appealDescription:'',appealEvidence:appeals?t.appealEvidence:[],originalReviews:appeals?fapStewardVotes_(t.stewardVotes,c.board.stewardReviewers):[],reviews:fapStewardVotes_(appeals?t.appealVotes:t.stewardVotes,appeals?c.board.appealReviewers:c.board.stewardReviewers),review:appeals?t.appealVotes[c.reviewer.index]:t.stewardVotes[c.reviewer.index]}))};
}
function getStewardDesk(input){fapAssertEntry_('getStewardDesk');
  input=input||{};const identity=fapStewardIdentity_(input);
  if(input.sheetName)return fapStewardResponse_(fapStewardWorkspace_(input));
  const book=openTicketProcessingContext_().spreadsheet,sheet=book.getSheetByName(F1XL_TICKET_SEASONS.rounds);
  const rounds=ticketSheetRows_(sheet,13).map((r,i)=>ticketRoundResponse_(r,i+2)).filter(r=>r.sheetName);
  rounds.sort((a,b)=>Number(b.season)-Number(a.season)||b.round-a.round);
  const response={side:identity.side,rounds:rounds};
  if(input.includeBoard&&rounds.length){const selected=rounds.find(r=>r.sheetName===input.preferredRound)||rounds[0];response.board=fapStewardResponse_(fapStewardWorkspace_({side:identity.side,sheetName:selected.sheetName},{spreadsheet:book},identity));}
  return response;
}
function saveMyStewardReviews(input){fapAssertEntry_('saveMyStewardReviews');
  const c=fapStewardContext_(input);fapRequire_(c.identity.person,c.identity.side,2);
  if(!Array.isArray(input.reviews)||!input.reviews.length)throw new Error('No changed reviews to save.');
  const reviews=input.reviews.map(r=>{if(!r.caseId||!r.recordRevision||!r.revision)throw new Error('Reopen this ticket before saving.');
    return {sheetRow:r.sheetRow,caseId:r.caseId,recordRevision:r.recordRevision,revision:r.revision,review:r.review,reviewType:c.identity.side,reviewerIndex:c.reviewer.index,reviewerName:c.reviewer.name};});
  // Existing save checks the name and case/review revisions again under its lock.
  // The shared writer validates case identity, appeal eligibility, reviewer name
  // and that person's revision under its lock. Never accept a slot from the client.
  const saved=saveTicketReviews({sheetName:c.board.sheetName,reviews:reviews,responseMode:'changed'});
  c.board.tickets=saved.tickets;
  return Object.assign(fapStewardResponse_(c),{partial:true});
}
