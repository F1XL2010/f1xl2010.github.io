/** Current-season identity labels only. Never change points, seats or written history.
 * The Master journal supports resuming a partially completed multi-workbook rename.
 * All writes use server-generated cell plans, under the existing script lock.
 */
const F1XL_RENAME = {sheet:'Gamertag Changes',prefix:'F1XL_GAMERTAG_CHANGE_',headers:['Change ID','Driver ID','Old gamertag','New gamertag','Workbook ID','Workbook','Tab','Row','Column','Before JSON','After JSON','Status','Recorded at']};
let driverRenameWriting_=false;
function driverRenameAccess_(){['drivers','results','licences','tickets'].forEach(area=>fapRequire_(fapCurrentPerson_(),area,2));}
function driverRenameKey_(season){return F1XL_RENAME.prefix+String(season);}
function driverRenamePending_(season){return JSON.parse(PropertiesService.getScriptProperties().getProperty(driverRenameKey_(season))||'null');}
function driverRenameCheckWrite_(method){
  if(driverRenameWriting_||['beginSeasonDriverRename','continueSeasonDriverRename'].includes(method))return;
  const route=FAP_ENDPOINTS[method];if(!route||(!route.write&&route.level!==2))return;
  const props=PropertiesService.getScriptProperties().getProperties(),key=Object.keys(props).find(k=>k.startsWith(F1XL_RENAME.prefix));
  if(key){const job=JSON.parse(props[key]);throw Error('Finish the gamertag change for '+job.old+' → '+job.name+' in Driver Database before saving other changes.');}
}
function driverRenameBase_(season){
  season=seasonPlanningSeason_(season);const protection=seasonProtectionStatus_(season);if(protection.readOnly)throw Error(protection.readOnlyReason);
  const book=seasonPlanningBook_(season);if(!book||!book.getSheetByName('Preseason'))throw Error('Choose a started TEST season.');
  divisionTemplateAssertTestWorkbook_(book);if(book.getSheetByName('Start Here').getRange('I7').getDisplayValue()!=='Active')throw Error('Choose the active TEST season. This action does not rename archived or draft seasons.');return {season:season,book:book};
}
function getDriverRenameOptions(input){ fapAssertEntry_('getDriverRenameOptions');
  driverRenameAccess_();const seasons=[],props=PropertiesService.getScriptProperties().getProperties();
  Object.keys(props).filter(k=>/^F1XL_SEASON_MASTER_\d+(?:_5)?$/.test(k)).forEach(k=>{
    const season=k.slice('F1XL_SEASON_MASTER_'.length).replace('_','.');if(seasonProtectionStatus_(season).readOnly)return;
    const b=SpreadsheetApp.openById(props[k]);if(!/^TEST\b/i.test(fapWorkbookLegacyName_(b.getName()))||!b.getSheetByName('Preseason')||b.getSheetByName('Start Here').getRange('I7').getDisplayValue()!=='Active')return;
    const s=b.getSheetByName('Season Entrants'),rows=s&&s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,2).getDisplayValues():[];
    if(rows.some(r=>r[0]===String(input.driverId)))seasons.push({season:season,name:'Season '+season,pending:driverRenamePending_(season)});
  });return {seasons:seasons.sort((a,b)=>Number(b.season)-Number(a.season))};
}
function driverRenameRead_(book,name){
  const sheet=book.getSheetByName(name);if(!sheet||!sheet.getLastRow())return null;
  const range=sheet.getDataRange();return {sheet:sheet,values:range.getValues(),formulas:range.getFormulas()};
}
function driverRenameCell_(plan,book,data,row,col,after){
  const before=data.values[row-1]&&data.values[row-1][col-1];
  if(before===undefined||String(before)===String(after)||data.formulas[row-1][col-1])return;
  const key=[book.getId(),data.sheet.getName(),row,col].join('|');
  const existing=plan.cells.find(c=>c.key===key);if(existing){if(existing.after!==after)throw Error('Conflicting rename fields.');return;}
  plan.cells.push({key:key,bookId:book.getId(),book:book.getName(),sheet:data.sheet.getName(),row:row,col:col,before:before,after:after});
}
function driverRenameLabel_(plan,value){return plan.names.includes(driverDatabaseNormalisedName_(value))?plan.name:value;}
function driverRenameColumns_(plan,book,name,columns,filter,start){
  const data=driverRenameRead_(book,name);if(!data)return;
  data.values.forEach((r,i)=>{if(i<(start||2)-1||(filter&&!filter(r,i)))return;columns.forEach(col=>driverRenameCell_(plan,book,data,i+1,col,driverRenameLabel_(plan,r[col-1])));});
}
function driverRenameIdentified_(plan,book,name,idCol,nameCol){
  const data=driverRenameRead_(book,name);if(!data)return;
  data.values.forEach((r,i)=>{if(i&&String(r[idCol-1])===plan.driverId)driverRenameCell_(plan,book,data,i+1,nameCol,plan.name);});
}
function driverRenameJson_(plan,value){
  // Only explicit identity fields, never arbitrary strings or narrative text.
  if(Array.isArray(value))return value.map(v=>driverRenameJson_(plan,v));
  if(value&&typeof value==='object'){
    const copy=Object.assign({},value);Object.keys(copy).forEach(k=>{
      if(['driver','gamertag','driverName','oneName','twoName'].includes(k)&&typeof copy[k]==='string'){
        if(!copy.driverId||copy.driverId===plan.driverId)copy[k]=driverRenameLabel_(plan,copy[k]);
      }else if(copy[k]&&typeof copy[k]==='object')copy[k]=driverRenameJson_(plan,copy[k]);
    });return copy;
  }return value;
}
function driverRenameMaster_(p,b){
  [['Season Entrants',1,2],['Applications Tracker',2,4],['Processed Applications',2,3],['Time Trial Queue',1,2],['TT Results',1,2],['Placement Drivers',1,2],['Active Driver Placements',1,2],['Season Allocations',2,3],['Principal Seats',3,2],['Time Penalty Carryovers',2,3]].forEach(s=>driverRenameIdentified_(p,b,...s));
  [['Division Line-ups',[2,8]],['Teams & Principals',[5]],['Draft Order',[4]],['Draft Pick Predictions',[5,6,7,8,9]],['Outstanding Bans',[2]],['TP Applications',[2]],['Social Race Entrants',[3]]].forEach(s=>driverRenameColumns_(p,b,...s));
  const live=F1XL_PRESEASON_LIVE_DRAFT.name;
  driverRenameIdentified_(p,b,live,6,7);driverRenameIdentified_(p,b,live,8,9);driverRenameColumns_(p,b,live,[5]);
  for(let d=1;d<=p.divisions;d++)driverRenameColumns_(p,b,'Division '+d,[1],null,3);
  // Movement entries are an audit trail: retain the name used at the time.
}
function driverRenameDivision_(p,b){
  driverRenameColumns_(p,b,'Data',[1,16,20],null,3);driverRenameColumns_(p,b,'Data',[10],null,2);
  driverRenameIdentified_(p,b,'Driver Assignments',1,2);
  b.getSheets().filter(s=>/^R\d+$/.test(s.getName())).forEach(s=>driverRenameColumns_(p,b,s.getName(),[4],null,9));
}
function driverRenameTickets_(p,b){
  const rounds=driverRenameRead_(b,'Ticket Rounds');if(!rounds)return;
  const races=rounds.values.slice(1).filter(r=>String(r[0])===p.season).map(r=>String(r[11])).filter(Boolean);p.races=races;
  races.forEach(name=>{
    driverRenameColumns_(p,b,name,[3,5]);
    const data=driverRenameRead_(b,name);if(data)data.values.forEach((r,i)=>{if(!i)return;[20,25,30,35,40,51,56,61,66,71].forEach(col=>{
      const old=String(r[col-1]||''),next=old.split(';').map(n=>String(driverRenameLabel_(p,n.trim()))).join('; ');
      if(old.split(';').some(n=>p.names.includes(driverDatabaseNormalisedName_(n))))driverRenameCell_(p,b,data,i+1,col,next);
    });});
    const s=b.getSheetByName(name);if(s)driverRenameColumns_(p,b,'Saved outcomes '+s.getSheetId(),[3,5,17]);
  });
  const outcomes=b.getSheetByName('Ticket Outcomes (new)');if(outcomes&&races.includes(ticketOutcomeSourceRace_(outcomes)))driverRenameColumns_(p,b,outcomes.getName(),[3,5,17]);
  driverRenameColumns_(p,b,'Website Export',[4,6,18],r=>races.includes(String(r[0])));
  driverRenameColumns_(p,b,'Ticket Additional Penalties',[3],r=>races.includes(String(r[0])));
  const baselines=driverRenameRead_(b,'Ticket Threshold Baselines');if(baselines)baselines.values.forEach((r,i)=>{if(i&&String(r[0])===p.season&&r[3]===p.driverId)driverRenameCell_(p,b,baselines,i+1,5,p.name);});
  const ledger=driverRenameRead_(b,'Ticket Penalty Transfers');if(ledger)ledger.values.forEach((r,i)=>{
    if(!i||String(r[0])!==p.season)return;if(r[7])throw Error('Finish the interrupted ticket transfer for '+r[1]+' before renaming a driver.');
    if(r[5]){
      const before=JSON.parse(r[5]),after=driverRenameJson_(p,before);
      if(JSON.stringify(before)!==JSON.stringify(after)){
        driverRenameCell_(p,b,ledger,i+1,6,JSON.stringify(after));
        // Preserve applied/checked status. A label change is not a fresh penalty.
        if(r[4]===licenceRevision_(before)){
          const next=licenceRevision_(after);driverRenameCell_(p,b,ledger,i+1,5,next);
          if(r[6]===r[4])driverRenameCell_(p,b,ledger,i+1,7,next);
        }
      }
    }
    if(r[9])driverRenameCell_(p,b,ledger,i+1,10,JSON.stringify(driverRenameJson_(p,JSON.parse(r[9]))));
  });
}
function driverRenamePublic_(p,b){
  b.getSheets().forEach(s=>{
    const name=s.getName(),base=name.replace(/^(?:M|D\d+) /,'');
    if(/^D\d+ R\d+$/.test(name))driverRenameColumns_(p,b,name,[4],null,9);
    else if(/^D\d+ Data$/.test(name)){driverRenameColumns_(p,b,name,[1,16,20],null,3);driverRenameColumns_(p,b,name,[10],null,2);}
    else if(['Driver Results NoSort','Driver Stats Calc Sheet','Summary'].includes(base)){
      const data=driverRenameRead_(b,name);if(data){
        // Public copies contain values. Identify driver columns from their headers.
        const cols=new Set();data.values.slice(0,5).forEach(r=>r.forEach((v,j)=>{if(/^(driver|gamertag|driver name)$/i.test(String(v).trim()))cols.add(j+1);}));
        if(!cols.size)throw Error('Cannot identify the driver column in '+name+'. No rename has started.');
        driverRenameColumns_(p,b,name,Array.from(cols));
      }
    }else if(base==='Outstanding Bans')driverRenameColumns_(p,b,name,[2]);
    else if(base==='Teams & Principals')driverRenameColumns_(p,b,name,[5]);
    else if(base==='Overall Standings')driverRenameColumns_(p,b,name,[12],null,3);
  });
}
function driverRenamePlan_(input){
  const c=driverRenameBase_(input.season),registry=openDriverDatabaseContext_(),driverId=String(input.driverId||'').trim(),name=String(input.gamertag||'').trim();
  if(!name||!driverDatabaseNormalisedName_(name)||name.length>100||/^[=+@]|[\r\n\t\x00-\x1f]/.test(name))throw Error('Enter a gamertag of 1–100 characters, without formula prefixes or line breaks.');
  const row=findDriverRow_(registry.directory,driverId);if(!row)throw Error('Choose an existing permanent driver profile.');
  assertGamertagAvailable_(registry,name,driverId);
  const entrants=driverRenameRead_(c.book,'Season Entrants');if(!entrants)throw Error('The season has no entrants.');
  const matches=entrants.values.slice(1).filter(r=>r[0]===driverId);if(matches.length!==1)throw Error('This driver needs exactly one Season Entrants record.');
  const profile=registry.directory.getRange(row,1,1,13).getDisplayValues()[0];
  if(profile[10]||/^merged$/i.test(profile[3]))throw Error('This profile was merged. Choose the surviving Driver ID.');
  const oldNames=[profile[1],matches[0][1]],aliases=registry.aliases.getLastRow()>1?registry.aliases.getRange(2,1,registry.aliases.getLastRow()-1,12).getDisplayValues():[];
  aliases.filter(r=>r[1]===driverId&&!/^inactive$/i.test(r[11])).forEach(r=>oldNames.push(r[3]));
  const names=Array.from(new Set(oldNames.map(driverDatabaseNormalisedName_).filter(Boolean)));
  entrants.values.slice(1).filter(r=>r[1]&&r[0]!==driverId).forEach(r=>{if(names.includes(driverDatabaseNormalisedName_(r[1]))||driverDatabaseNormalisedName_(r[1])===driverDatabaseNormalisedName_(name))throw Error('Another season entrant uses one of these names. Resolve that identity before renaming.');});
  oldNames.filter(Boolean).forEach(n=>assertGamertagAvailable_(registry,n,driverId));
  const setup=c.book.getSheetByName('Start Here').getRange('B4:B5').getValues().flat();
  const p={season:c.season,masterId:c.book.getId(),driverId:driverId,name:name,old:matches[0][1],profileOld:profile[1],oldNames:Array.from(new Set(oldNames.filter(Boolean))),names:names,divisions:Number(setup[1]),rounds:Number(setup[0]),cells:[],races:[]};
  driverRenameMaster_(p,c.book);
  for(let d=1;d<=p.divisions;d++){
    const id=PropertiesService.getScriptProperties().getProperty(divisionTemplatePropertyKey_(p.season,d));if(!id)continue;
    const b=SpreadsheetApp.openById(id);divisionTemplateAssertTestWorkbook_(b);assertSeasonWorkbookWritable_(p.season,b);driverRenameDivision_(p,b);
  }
  const tickets=openTicketProcessingContext_().spreadsheet;if(!/^TEST\b/i.test(fapWorkbookLegacyName_(tickets.getName())))throw Error('The ticket source is not a TEST workbook.');driverRenameTickets_(p,tickets);
  const asr=JSON.parse(PropertiesService.getScriptProperties().getProperty('F1XL_ACTIVE_ASR_'+p.season)||'{}');
  if(asr.id){const b=SpreadsheetApp.openById(asr.id);if(fapWorkbookLegacyName_(b.getName())!=='TEST - F1XL Season '+p.season+' ASR')throw Error('Unexpected ASR workbook.');[['ASR Top Ten',3,4],['ASR Invitations',3,4],['ASR Pairings',3,4],['ASR Pairings',7,8]].forEach(s=>driverRenameIdentified_(p,b,...s));['ASR Qualifying','ASR Race'].forEach(n=>driverRenameColumns_(p,b,n,[2]));}
  const launch=testLaunchRecord_(p.season);if(launch.pendingId)throw Error('Finish website preparation before renaming a driver.');
  if(launch.exportId&&launch.sourceMode!==F1XL_DIRECT_SOURCE_MODE)driverRenamePublic_(p,testLaunchExport_(launch.exportId,p.season));
  const directory=driverRenameRead_(registry.spreadsheet,'Drivers');driverRenameCell_(p,registry.spreadsheet,directory,row,2,name);driverRenameCell_(p,registry.spreadsheet,directory,row,3,driverDatabaseNormalisedName_(name));
  p.revision=licenceRevision_([p.season,p.driverId,p.name,p.cells]);return p;
}
function driverRenameSummary_(p){
  const tables={};p.cells.forEach(c=>{const key=c.book+' / '+c.sheet;tables[key]=(tables[key]||0)+1;});
  return {season:p.season,driverId:p.driverId,gamertag:p.name,old:p.old,revision:p.revision,count:p.cells.length,tables:Object.keys(tables).map(name=>({name:name,count:tables[name]}))};
}
function previewSeasonDriverRename(input){ fapAssertEntry_('previewSeasonDriverRename');
  driverRenameAccess_();if(driverRenamePending_(input.season))throw Error('Resume the pending gamertag change for this season first.');
  return driverRenameSummary_(driverRenamePlan_(input));
}
function beginSeasonDriverRename(input){ fapAssertEntry_('beginSeasonDriverRename');
  driverRenameAccess_();return withDriverDatabaseLock_(function(){
    if(driverRenamePending_(input.season))throw Error('A gamertag change is already in progress. Reopen the profile and resume it.');
    const p=driverRenamePlan_(input);if(p.revision!==input.revision)throw Error('Season data changed. Preview again before confirming.');
    if(!p.cells.length)throw Error('These records already use that gamertag.');
    // A rename can span ASR pairing/results tabs and multiple resumable calls.
    if(typeof activeAsrMarkChanged_==='function')activeAsrMarkChanged_(p.season);
    const book=SpreadsheetApp.openById(p.masterId);let sheet=book.getSheetByName(F1XL_RENAME.sheet);
    if(!sheet){sheet=book.insertSheet(F1XL_RENAME.sheet);sheet.getRange(1,1,1,F1XL_RENAME.headers.length).setValues([F1XL_RENAME.headers]);sheet.setFrozenRows(1);sheet.getRange('A1').setNote('Permanent rename audit and recovery journal. Before/after values are JSON. Do not edit unfinished rows. Resume interrupted changes from the Driver Database profile. Points and seat numbers are never changed.');}
    if(JSON.stringify(sheet.getRange(1,1,1,13).getDisplayValues()[0])!==JSON.stringify(F1XL_RENAME.headers))throw Error('Gamertag Changes headers were altered. Restore them first.');
    const id=Utilities.getUuid(),start=sheet.getLastRow()+1,now=new Date().toISOString();
    const rows=p.cells.map(c=>[id,p.driverId,p.old,p.name,c.bookId,c.book,c.sheet,c.row,c.col,JSON.stringify(c.before),JSON.stringify(c.after),'Pending',now]);
    if(start+rows.length-1>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),start+rows.length-1-sheet.getMaxRows());
    sheet.getRange(start,1,rows.length,13).setValues(rows.map(r=>r.map(ticketIntakeLiteral_)));SpreadsheetApp.flush();
    const job={id:id,season:p.season,masterId:p.masterId,driverId:p.driverId,name:p.name,old:p.old,oldNames:p.oldNames,start:start,count:rows.length,divisions:p.divisions,rounds:p.rounds,races:p.races};
    PropertiesService.getScriptProperties().setProperty(driverRenameKey_(p.season),JSON.stringify(job));return {job:job,done:false};
  });
}
function continueSeasonDriverRename(input){ fapAssertEntry_('continueSeasonDriverRename');
  driverRenameAccess_();return withDriverDatabaseLock_(function(){
    const job=driverRenamePending_(input.season);if(!job){return {done:true,message:'No unfinished gamertag change for this season.'};}
    if(job.id!==input.id)throw Error('Reopen the driver profile to resume the current change.');
    driverRenameWriting_=true;
    try{
      const base=driverRenameBase_(job.season);if(base.book.getId()!==job.masterId)throw Error('The season connection changed. Restore it before resuming.');
      const journal=base.book.getSheetByName(F1XL_RENAME.sheet),rows=journal.getRange(job.start,1,job.count,13).getValues();
      if(rows.some(r=>r[0]!==job.id||r[1]!==job.driverId||r[3]!==job.name))throw Error('The rename journal was altered. Restore it before resuming.');
      const pending=rows.map((r,i)=>({r:r,i:i})).filter(x=>x.r[11]!=='Applied');
      if(pending.length){
        const first=pending[0].r,group=pending.filter(x=>x.r[4]===first[4]&&x.r[6]===first[6]);
        const b=SpreadsheetApp.openById(first[4]);if(fapWorkbookLegacyName_(b.getName())!==fapWorkbookLegacyName_(first[5])||!/^TEST\b/i.test(fapWorkbookLegacyName_(b.getName())))throw Error('The target workbook identity changed.');
        const data=driverRenameRead_(b,first[6]);if(!data)throw Error('Restore missing tab '+first[6]+' before resuming.');
        const writes={},validations=data.sheet.getDataRange().getDataValidations();group.forEach(x=>{
          const r=x.r,row=Number(r[7]),col=Number(r[8]),before=JSON.parse(r[9]),after=JSON.parse(r[10]),current=data.values[row-1]&&data.values[row-1][col-1];
          if(!data.formulas[row-1]||data.formulas[row-1][col-1]||(JSON.stringify(current)!==JSON.stringify(before)&&JSON.stringify(current)!==JSON.stringify(after)))throw Error('The value in '+r[6]+' row '+row+' column '+col+' changed. Check it before resuming; completed changes are retained.');
          if(JSON.stringify(current)===JSON.stringify(after))return;
          const rule=validations[row-1][col-1];
          if(rule&&rule.getCriteriaType()===SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST&&String(after)===job.name){
            const criteria=rule.getCriteriaValues(),choices=criteria[0];
            if(!choices.includes(after))data.sheet.getRange(row,col).setDataValidation(rule.copy().requireValueInList(choices.concat([after]),criteria[1]!==false).build());
          }
          const key=JSON.stringify(after);(writes[key]||(writes[key]=[])).push(data.sheet.getRange(row,col).getA1Notation());
        });
        Object.keys(writes).forEach(key=>{
          const ranges=writes[key];for(let i=0;i<ranges.length;i+=80)data.sheet.getRangeList(ranges.slice(i,i+80)).setValue(ticketIntakeLiteral_(JSON.parse(key)));
        });SpreadsheetApp.flush();
        // Fresh read-back before marking the group complete; retry tolerates already-written cells.
        const verify=data.sheet.getDataRange().getValues();group.forEach(x=>{const r=x.r;if(JSON.stringify(verify[r[7]-1][r[8]-1])!==r[10])throw Error('Read-back did not confirm '+r[6]+'. Resume to check again.');});
        journal.getRangeList(group.map(x=>'L'+(job.start+x.i))).setValue('Applied');
        return {done:false,job:job,completed:rows.length-pending.length+group.length,total:rows.length,message:first[5]+' · '+first[6]};
      }
      const registry=openDriverDatabaseContext_();job.oldNames.forEach(n=>addAliasIfMissing_(registry,job.driverId,n));
      registry.directory.getRange(findDriverRow_(registry.directory,job.driverId),7,1,2).setValues([[new Date(),driverDatabaseActor_()]]);
      driverDatabaseAudit_(registry,'RENAME_SEASON_DRIVER','driver',job.driverId,'S'+job.season+': '+job.old+' → '+job.name+'; change '+job.id+'. Historical seasons and written evidence preserved.');
      clearDriverDatabaseCache_();activeSeasonClearDetailCaches_({season:job.season,count:job.divisions,rounds:job.rounds});
      job.races.forEach(clearTicketProcessingCaches_);clearTicketSeasonSetupCache_(job.season);websiteConfigClearCache_();
      if(job.races.length)ticketPublicationQueue_(job.season,false);
      PropertiesService.getScriptProperties().deleteProperty(driverRenameKey_(job.season));
      if(typeof ticketFormQueue_==='function')ticketFormQueue_(job.season,false);
      return {done:true,message:'S'+job.season+' now uses '+job.name+'. Previous names remain aliases. Refresh any other open portal screens.'};
    }finally{driverRenameWriting_=false;}
  });
}
/** Resolve old names when replaying a historical appeal, without rewriting evidence. */
function driverRenameAppealNames_(context,ticket,original){
  const round=ticketRoundForSheet_(context.spreadsheet,ticket.race);if(!round)return original;
  const book=seasonPlanningBook_(round.season),sheet=book&&book.getSheetByName(F1XL_RENAME.sheet);if(!sheet||sheet.getLastRow()<2)return original;
  const renamed=new Set();sheet.getRange(2,1,sheet.getLastRow()-1,13).getValues().forEach(r=>{if(r[11]==='Applied')renamed.add(r[1]);});
  const entrants=book.getSheetByName('Season Entrants').getDataRange().getDisplayValues().slice(1),registry=openDriverDatabaseContext_(),aliases=registry.aliases.getLastRow()>1?registry.aliases.getRange(2,1,registry.aliases.getLastRow()-1,12).getDisplayValues():[];
  const replace=value=>{const key=driverDatabaseNormalisedName_(value),matches=entrants.filter(r=>renamed.has(r[0])&&(driverDatabaseNormalisedName_(r[1])===key||aliases.some(a=>a[1]===r[0]&&!/^inactive$/i.test(a[11])&&driverDatabaseNormalisedName_(a[3])===key)));return matches.length===1?matches[0][1]:value;};
  const copy=Object.assign({},original,{outcome:original.outcome.slice(),additionalPenalties:(original.additionalPenalties||[]).map(p=>Object.assign({},p,{driver:replace(p.driver)}))});copy.outcome[0]=replace(copy.outcome[0]);return copy;
}
