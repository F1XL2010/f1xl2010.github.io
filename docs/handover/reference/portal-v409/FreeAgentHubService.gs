/** Read-only support for current free agents and reserves; no placement writes. */
function freeAgentHubContext_(season,details){
  const c=teamPrincipalHubContext_(season);if(seasonProtectionStatus_(c.season).readOnly)throw Error('Open an active season.');const teams=c.book.getSheetByName('Teams & Principals');if(!teams)throw Error('The season team setup is missing.');
  const types={};teams.getRange(2,1,F1XL_CAPACITY.teams,6).getDisplayValues().forEach(r=>{if(r[0])types[teamPrincipalHubKey_(r[0])]=r[5];});
  const roster=[],seen=new Set(),add=(name,division,tier)=>{name=teamPrincipalHubText_(name);const key=division+'|'+teamPrincipalHubKey_(name);if(!name||seen.has(key))return;seen.add(key);roster.push({name,division,tier:teamPrincipalHubText_(tier)});};
  activeSeasonLines_(c).forEach(line=>line.rows.forEach(r=>{if(types[teamPrincipalHubKey_(r[4])]==='Free agent team')add(r[1],line.division,r[5]);add(r[7],line.division,r[10]);}));
  const setup={c,selected:{team:'Free agents'},market:roster};
  if(details){const directory=teamPrincipalHubDriverDirectory_();setup.market=teamPrincipalHubMarketDetails_(setup).map(d=>Object.assign({},d,{discord:(directory[teamPrincipalHubKey_(d.name)]||{}).discordId||''}));}
  setup.roster=setup.market;return setup;
}
function freeAgentHubMember_(drivers,ticket){return drivers.some(d=>Number(d.division)===Number(ticket.division)&&[ticket.submitter||ticket.fromDriver,ticket.offender||ticket.againstDriver].some(name=>teamPrincipalHubKey_(name)===teamPrincipalHubKey_(d.name)));}
function getFreeAgentHubInitial(){fapAssertEntry_('getFreeAgentHubInitial');const seasons=getResultsEntryInitial(true).seasons;if(!seasons.length)throw Error('No active season is available yet.');return getFreeAgentHub({season:seasons[0].season});}
function getFreeAgentHub(input){fapAssertEntry_('getFreeAgentHub');const setup=freeAgentHubContext_(input&&input.season,true);return {ok:true,season:setup.c.season,drivers:setup.roster,refreshedAt:new Date().toISOString()};}
function freeAgentHubInbox_(roster){
  const response=buildTicketSubmissionResponse_(openTicketSubmissionContext_());return response.submissions.filter(t=>freeAgentHubMember_(roster,t)).map(t=>({id:t.submissionRevision,received:t.received,division:t.division,submitter:t.fromDriver,offender:t.againstDriver,description:t.description,evidence:t.evidence,type:t.type,session:t.session}));
}
function getFreeAgentHubInbox(input){fapAssertEntry_('getFreeAgentHubInbox');const setup=freeAgentHubContext_(input&&input.season,false);return {season:setup.c.season,pendingTickets:freeAgentHubInbox_(setup.roster),refreshedAt:new Date().toISOString()};}
function getFreeAgentHubReview(input){fapAssertEntry_('getFreeAgentHubReview');const setup=freeAgentHubContext_(input&&input.season,false),result={season:setup.c.season,licences:[],bans:[],carryovers:[],reviews:[],pendingTickets:[],rounds:[],tickets:[],selectedRound:0,licenceIssue:'',ticketIssue:'',inboxIssue:'',refreshedAt:new Date().toISOString()};
  try{Object.assign(result,teamPrincipalHubLicenceData_(setup.c,setup.roster));}catch(e){result.licenceIssue='Licences could not be loaded. Use Refresh to retry.';}
  try{result.pendingTickets=freeAgentHubInbox_(setup.roster);}catch(e){result.inboxIssue='Incoming submissions could not be loaded. Use Refresh tickets to retry.';}
  Object.assign(result,freeAgentHubRoundTickets_(setup,input));
  return result;
}
function getFreeAgentHubDriverStats(input){fapAssertEntry_('getFreeAgentHubDriverStats');const setup=freeAgentHubContext_(input&&input.season,false),driver=teamPrincipalHubMarketDetails_(setup).find(d=>d.driverId&&d.driverId===String(input.driverId||'')&&d.division===Number(input.division));if(!driver)throw Error('This driver is no longer in this group. Refresh the driver list.');return teamPrincipalHubDriverStats_(setup,driver);}

function freeAgentHubRoundTickets_(setup,input){const result={rounds:[],tickets:[],selectedRound:0,ticketIssue:''};
  try{const book=openTicketProcessingContext_().spreadsheet,rounds=ticketSheetRows_(book.getSheetByName(F1XL_TICKET_SEASONS.rounds),13).map(ticketRoundResponse_).filter(r=>r.season===setup.c.season&&r.sheetName&&r.state!=='Cancelled').sort((a,b)=>b.round-a.round);
    result.rounds=rounds.map(r=>({round:r.round,track:r.track}));const requested=Number(input&&input.round||0);if(requested&&!rounds.some(r=>r.round===requested))throw Error('Unknown round');const round=rounds.find(r=>r.round===requested)||rounds[0];
    if(round){result.selectedRound=round.round;const sheet=book.getSheetByName(round.sheetName);if(!sheet)throw Error('Round sheet missing');result.tickets=sheet.getRange(2,1,F1XL_TICKET_PROCESSING_SOURCE.finalTicketRow-1,75).getDisplayValues().filter(v=>v[1]).map(v=>({round:round.round,track:round.track,state:round.state,caseId:v[72],ticketNumber:v[0],division:v[1],submitter:v[2],offender:v[4],description:v[6],evidence:v.slice(7,11),defenceComments:v[11],defenceEvidence:v.slice(12,16),appealed:v[42],appealDescription:v[43],appealEvidence:v.slice(44,47),session:v[74]})).filter(t=>freeAgentHubMember_(setup.roster,t));}
  }catch(e){result.ticketIssue='Round tickets could not be loaded. Use Refresh to retry.';}
return result;
}
function getFreeAgentHubTickets(input){fapAssertEntry_('getFreeAgentHubTickets');const setup=freeAgentHubContext_(input&&input.season,false);return Object.assign({season:setup.c.season},freeAgentHubRoundTickets_(setup,input));}
