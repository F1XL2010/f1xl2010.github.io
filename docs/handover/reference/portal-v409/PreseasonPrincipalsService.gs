/** Records agreed team assignments in the existing Master team tab. */
function preseasonPrincipalsContext_(season) {
  season=seasonPlanningSeason_(season);const book=seasonPlanningBook_(season);
  if(!book||!seasonMasterIsPlanning_(book))throw new Error('Choose a Season Master that is still in preseason.');
  const start=book.getSheetByName('Start Here'),teams=book.getSheetByName('Teams & Principals'),calendar=book.getSheetByName('Calendar'),snapshot=book.getSheetByName('Reference Snapshot');
  if(!teams||!calendar||!snapshot)throw new Error('This Master is missing Teams & Principals, Calendar or Reference Snapshot.');
  const headers=['Team','Full Team Name','Nationality','Hex Colour','Team Principal','Team Type','Tier 1 #','Tier 2 #'];
  if(JSON.stringify(teams.getRange(1,1,1,8).getDisplayValues()[0])!==JSON.stringify(headers))throw new Error('Teams & Principals has an unrecognised layout. Nothing was changed.');
  const plan=seasonPlanningRead_(book.getSheetByName(F1XL_SEASON_PLANNING.sheetName),season,book);
  const teamValues=seasonPlanningValues_(teams.getRange(2,1,F1XL_CAPACITY.teams,8)),calendarValues=seasonPlanningValues_(calendar.getRange(2,1,F1XL_CAPACITY.rounds+1,4)),metadata=seasonPlanningValues_(start.getRange('I4:I5'));
  if(calendarValues.slice(0,plan.plan.count).some(function(r,i){return Number(r[0])!==i+1;}))throw new Error('Calendar rounds must begin in row 2 in round order. Restore that layout before saving; the All Star Race row has not been changed.');
  if(teamValues.some(function(r){return [0,4,5].some(function(i){return typeof r[i]==='string'&&r[i].startsWith('=');});})||calendarValues.some(function(r){return [1,3].some(function(i){return typeof r[i]==='string'&&r[i].startsWith('=');});}))throw new Error('A team, principal or calendar input contains a manual formula. Review it before saving through FAP.');
  const refHeight=Math.max(1,snapshot.getLastRow()-1);
  const options={};[['teams',60],['tracks',61],['weekends',68]].forEach(function(item) { options[item[0]]=snapshot.getRange(2,item[1],refHeight,1).getDisplayValues().map(function(r){return r[0].trim();}).filter(function(v,i,a){return v&&a.indexOf(v)===i;}); });
  ['Standard','Legacy Sprint','Modern Sprint'].forEach(function(v){if(options.weekends.indexOf(v)<0)options.weekends.push(v);});
  const savedCount=metadata[0][0]===''?0:Number(metadata[0][0]);
  if(!Number.isInteger(savedCount)||savedCount<0||savedCount>F1XL_CAPACITY.teams)throw new Error('Check the team count in Start Here before opening this section.');
  const count=Math.max(savedCount,teamValues.reduce(function(n,r,i){return r[0]||r[4]||r[5]?i+1:n;},0));
  return {season:season,book:book,start:start,teams:teams,calendar:calendar,teamValues:teamValues,calendarValues:calendarValues,plan:plan.plan,count:count,options:options,revision:intakeHash_([plan.revision,teamValues,calendarValues,metadata,options])};
}
function getPreseasonPrincipals(season) { fapAssertEntry_('getPreseasonPrincipals');
  const c=preseasonPrincipalsContext_(season),teams=c.teamValues.map(function(r){return {team:String(r[0]),principal:String(r[4]),type:String(r[5])};});
  const races=c.calendarValues.filter(function(r){return Number.isInteger(Number(r[0]))&&Number(r[0])>0;}).map(function(r,i){return {round:Number(r[0]),date:c.plan.races[i],track:String(r[3]),weekend:String(r[1])};});
  const missing=[];
  const seen={};teams.slice(0,c.count).forEach(function(t){if(t.team&&seen[t.team.toLowerCase()])missing.push('Remove the duplicate '+t.team+' team.');if(t.team)seen[t.team.toLowerCase()]=true;});
  if(!c.count)missing.push('Choose the number of teams.');
  teams.slice(0,c.count).forEach(function(t,i){if(!t.team)missing.push('Choose a team for slot '+(i+1)+'.');if(t.type!=='Free agent team'&&!t.principal)missing.push('Add the principal for '+(t.team||'slot '+(i+1))+'.');});
  const announcement=['Season '+c.season+' — Team principals','Announcement: '+c.plan.dates.announce+(c.plan.times.announce?' '+c.plan.times.announce+' UK':''),'','TEAM PRINCIPALS'].concat(teams.slice(0,c.count).map(function(t){return (t.team||'Team to be confirmed')+' — '+(t.principal||(t.type==='Free agent team'?'Free agent team':'Principal to be confirmed'));})).join('\n');
  return {season:c.season,url:c.book.getUrl(),revision:c.revision,count:c.count,maxTeams:F1XL_CAPACITY.teams,teams:teams,races:races,options:c.options,announcementDate:c.plan.dates.announce,announcementTime:c.plan.times.announce,missing:missing,ready:missing.length===0,announcement:announcement,warnings:[],message:''};
}
function savePreseasonPrincipals(input) { fapAssertEntry_('savePreseasonPrincipals');
  return withApplicationLock_(function() {
    const c=preseasonPrincipalsContext_(input.season);intakeRequireRevision_(input,c);
    const count=Number(input.count);
    if(!Number.isInteger(count)||count<0||count>F1XL_CAPACITY.teams)throw new Error('Choose up to '+F1XL_CAPACITY.teams+' teams, or leave the count undecided. Divisions are decided later.');
    if(!Array.isArray(input.teams)||input.teams.length!==F1XL_CAPACITY.teams)throw new Error('The team list changed. Refresh this section before saving.');
    const text=function(v){return String(v==null?'':v).trim();},seen={};
    const teams=input.teams.map(function(t,i) {
      const team=text(t.team),principal=text(t.principal),type=text(t.type);
      if(i>=count&&(team||principal||type||c.teamValues[i][0]||c.teamValues[i][4]||c.teamValues[i][5]))throw new Error('Clear and save the unused team slots before reducing the team count.');
      if(team&&c.options.teams.indexOf(team)<0&&team!==String(c.teamValues[i][0]))throw new Error('Choose a team from this Master’s reference list.');
      if(team&&seen[team.toLowerCase()])throw new Error(team+' appears in more than one team slot.');if(team)seen[team.toLowerCase()]=true;
      if(principal.length>120||/[\r\n]/.test(principal))throw new Error('Use a principal name of up to 120 characters on one line.');
      if(type&&['Full team','Free agent team'].indexOf(type)<0)throw new Error('Choose Full team or Free agent team.');
      // Partial preparation is intentional: administrators can agree the
      // principals first, then assign the teams after preferences are settled.
      return {team:team,principal:principal,type:type};
    });
    if(typeof principalSelectionValidateTeams_==='function')principalSelectionValidateTeams_(input,teams);
    // Only the manual input columns are written. Dates, ASR and lookup formulas stay owned by their existing tabs.
    const writes=[{range:c.teams.getRange(2,1,F1XL_CAPACITY.teams,1),values:teams.map(function(t){return [t.team];}),text:true},{range:c.teams.getRange(2,5,F1XL_CAPACITY.teams,2),values:teams.map(function(t){return [t.principal,t.type];}),text:true},{range:c.start.getRange('I4:I5'),values:[[count||''],[teams.some(function(t){return t.principal;})?'Yes':'Unknown']]}];
    intakeCommit_(writes);const result=getPreseasonPrincipals(c.season);result.message='Team principals saved to the Season Master.';return result;
  });
}
