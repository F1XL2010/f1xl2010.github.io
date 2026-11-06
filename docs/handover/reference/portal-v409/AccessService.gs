/** FAP identity and access. Deployment continues to execute as the F1XL owner.
 * Google access tokens are used only at sign-in, never returned or persisted.
 * All public operational endpoints must start with fapAssertEntry_(). */
const FAP_ACCESS = Object.freeze({owner:'f1xboxleagues@gmail.com',bookKey:'FAP_ACCESS_BOOK',sessionSeconds:21600,
  headers:['Google ID','Google email','Gamertag','Discord name','Status','Roles','Overrides JSON','Teams by season JSON','Reviewer name','Revision','Created UTC','Updated UTC','Last sign-in UTC','Google display name','Discord user ID']});
let fapRequest_ = null;
function fapText_(v){return String(v==null?'':v).trim();}
function fapNow_(){return new Date().toISOString();}
function fapRandom_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');}
function fapHash_(v){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v))).replace(/=+$/,'');}
function fapJson_(v,fallback){try{return JSON.parse(v);}catch(e){return fallback;}}
function fapLiteral_(v){const s=String(v==null?'':v);return /^[=+@-]/.test(s)?"'"+s:s;}
function fapNativeOwner_(){
  return Session.getActiveUser().getEmail().toLowerCase()===FAP_ACCESS.owner&&Session.getEffectiveUser().getEmail().toLowerCase()===FAP_ACCESS.owner;
}
function fapAssertHost_(){if(Session.getEffectiveUser().getEmail().toLowerCase()!==FAP_ACCESS.owner)throw new Error('Deploy this FAP as '+FAP_ACCESS.owner+'.');}
function fapOwner_(){return {id:'owner',email:FAP_ACCESS.owner,gamertag:'F1XL',discord:'',status:'Active',roles:['owner'],overrides:{},teams:{},reviewerName:'',revision:'owner',owner:true};}
function fapAssertEntry_(method){
  // Internal calls inherit the already checked gateway operation. Never accept a
  // caller-supplied actor or permission; script globals are per execution.
  if(fapRequest_){if(typeof driverRenameCheckWrite_==='function')driverRenameCheckWrite_(method);return;}
  fapAssertHost_();
  if(!fapNativeOwner_())throw new Error('Sign in through the FAP before accessing this function.');
  if(typeof driverRenameCheckWrite_==='function')driverRenameCheckWrite_(method);
}
function fapAssertTrigger_(event,method){
  fapAssertHost_();if(fapNativeOwner_())return;
  // Spreadsheet objects cannot be supplied through google.script.run. Match an
  // installed owner trigger as well, so arbitrary JSON is never a trigger bypass.
  if(!event||!event.source||typeof event.source.getId!=='function'||!event.range||typeof event.range.getSheet!=='function')throw new Error('An installed spreadsheet trigger is required.');
  if(!ScriptApp.getProjectTriggers().some(t=>String(t.getUniqueId())===String(event.triggerUid)&&t.getHandlerFunction()===method&&t.getTriggerSourceId()===event.source.getId()))throw new Error('Unrecognised spreadsheet trigger.');
}
function fapLock_(fn){const lock=LockService.getScriptLock();lock.waitLock(30000);try{return fn();}finally{lock.releaseLock();}}
function fapBook_(){const id=PropertiesService.getScriptProperties().getProperty(FAP_ACCESS.bookKey);if(!id)throw new Error('The F1XL owner must create the access register first.');return SpreadsheetApp.openById(id);}
function fapRows_(){const s=fapBook_().getSheetByName('People');return s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,Math.min(s.getMaxColumns(),FAP_ACCESS.headers.length)).getDisplayValues():[];}
function fapPerson_(r,index){return {id:r[0],email:r[1],gamertag:r[2],discord:r[3],status:r[4],roles:fapRoleNames_(r[5].split(',').map(fapText_).filter(Boolean)),overrides:fapJson_(r[6],{}),teams:fapJson_(r[7],{}),reviewerName:r[8],revision:r[9],created:r[10],updated:r[11],lastSignIn:r[12],googleName:r[13],discordUserId:r[14]||'',row:index+2};}
function fapRoleNames_(roles){return Array.from(new Set(roles.map(r=>r==='time_trial_lead'?'allocations_lead':r==='race_admin'?'admin':r==='head_appeal'?'head_steward':r)));}
function fapRoleBundle_(role){if(role==='viewer')return {permissions:{navigation:1,results:1,calendar:1}};return FAP_ROLES[fapRoleNames_([role])[0]];}
function fapDiscordId_(value){const id=fapText_(value);if(!id)return '';if(!/^\d{17,20}$/.test(id)||id.length===20&&id>'18446744073709551615')throw Error('Paste the numeric Discord user ID, not their name.');return id;}
function fapDraftOnly_(p){return !p.owner&&fapPermission_(p,'draft')>0&&!['applications','time_trials','time_trial_bookings','placement','movements','results','calendar','licences','tickets','asr','season_setup','people','publishing','archive'].some(k=>fapPermission_(p,k)>0);}
function fapEnsurePeopleSchema_(s){const old=s.getRange(1,1,1,14).getDisplayValues()[0];if(JSON.stringify(old)!==JSON.stringify(FAP_ACCESS.headers.slice(0,14)))throw Error('People register headers need reviewing before saving.');if(s.getMaxColumns()<15)s.insertColumnsAfter(s.getMaxColumns(),15-s.getMaxColumns());const h=s.getRange(1,15).getDisplayValue();if(h&&h!=='Discord user ID')throw Error('People column O is already used. Ask maintenance to review it.');if(!h){if(s.getLastRow()>1&&s.getRange(2,15,s.getLastRow()-1,1).getDisplayValues().some(r=>r[0]))throw Error('People column O already contains data. Ask maintenance to review it.');s.getRange(1,15,s.getMaxRows(),1).setNumberFormat('@');s.getRange(1,15).setValue('Discord user ID');}}
function fapFindPerson_(id){const rows=fapRows_(),matches=rows.map(fapPerson_).filter(p=>p.id===id);if(matches.length!==1)throw new Error('Account record is missing or duplicated. Ask the F1XL owner to review it.');return matches[0];}
function fapWritePerson_(p){
  const values=[p.id,p.email,p.gamertag,p.discord,p.status,p.roles.join(','),JSON.stringify(p.overrides),JSON.stringify(p.teams),p.reviewerName,p.revision,p.created,p.updated,p.lastSignIn,p.googleName,p.discordUserId||''];
  const s=fapBook_().getSheetByName('People');fapEnsurePeopleSchema_(s);s.getRange(p.row||s.getLastRow()+1,1,1,values.length).setNumberFormat('@').setValues([values.map(fapLiteral_)]);
}
function fapPermission_(p,key){
  if(p.owner)return 2;
  if(p.status!=='Active'||!Object.prototype.hasOwnProperty.call(FAP_AREAS,key))return 0;
  // God is the explicit operational superuser role. Its access cannot be
  // reduced by an old individual override left on the person record.
  if(p.roles.indexOf('god')>=0)return key==='navigation'?1:2;
  if(key==='navigation')return 1;
  if(key==='season_hub')return ['season_setup','applications','time_trials','time_trial_bookings','placement','movements','tracks','principals','draft','division_allocations','results','calendar','licences','tickets','asr','postseason','publishing'].some(k=>fapPermission_(p,k))?1:0;
  let level=0;p.roles.forEach(role=>{const bundle=fapRoleBundle_(role);if(bundle)level=Math.max(level,Number(bundle.permissions[key]||0));});
  if(key==='time_trials'&&!level&&fapPermission_(p,'tt_results')>0)level=1;
  if(Object.prototype.hasOwnProperty.call(p.overrides,key))level=Number(p.overrides[key]);
  return [0,1,2].includes(level)?level:0;
}
function fapRequire_(p,key,level){if(fapPermission_(p,key)<level)throw new Error('Access denied: '+(FAP_AREAS[key]||key)+'. Ask the F1XL owner if this access is needed.');}
function fapPublicPerson_(p){const permissions={};Object.keys(FAP_AREAS).forEach(k=>permissions[k]=fapPermission_(p,k));return {id:p.id,email:p.email,gamertag:p.gamertag,discord:p.discord,discordUserId:p.discordUserId||'',googleName:p.googleName||'',status:p.status,roles:p.roles,owner:!!p.owner,permissions:permissions,teams:p.teams,reviewerName:p.reviewerName};}
function fapSession_(token){
  fapAssertHost_();
  if(token==='native-owner'&&fapNativeOwner_())return fapOwner_();
  if(!/^[a-f0-9]{64}$/.test(String(token||'')))throw new Error('SIGN_IN_REQUIRED: Sign in to the FAP.');
  const raw=CacheService.getScriptCache().get('fap:session:'+fapHash_(token)),s=fapJson_(raw,null);
  if(!s||s.expires<Date.now())throw new Error('SIGN_IN_REQUIRED: Your session ended. Sign in again. Any unsaved changes have not been saved.');
  const ownerSub=PropertiesService.getScriptProperties().getProperty('FAP_OWNER_SUB');
  if(s.sub===ownerSub)return fapOwner_();
  const p=fapFindPerson_(s.sub);if(p.status==='Suspended'||p.status==='Rejected')throw new Error('ACCESS_REMOVED: This account does not currently have access.');return p;
}
function fapIssueSession_(sub){const token=fapRandom_();CacheService.getScriptCache().put('fap:session:'+fapHash_(token),JSON.stringify({sub:sub,expires:Date.now()+FAP_ACCESS.sessionSeconds*1000}),FAP_ACCESS.sessionSeconds);return token;}
function fapAuthConfig_(){const props=PropertiesService.getScriptProperties();return {clientId:props.getProperty('FAP_GOOGLE_CLIENT_ID')||'',clientSecret:props.getProperty('FAP_GOOGLE_CLIENT_SECRET')||'',redirect:props.getProperty('FAP_GOOGLE_REDIRECT_URI')||''};}
const FAP_GOOGLE_RETURN_URL='https://f1xl.co.uk/next/fap-google-return.html';
function fapConfigReady_(c){return !!(c.clientId&&c.clientSecret&&(c.redirect===FAP_GOOGLE_RETURN_URL||/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(c.redirect)));}
function fapAuthBootstrap(){fapAssertHost_();return {nativeOwner:fapNativeOwner_(),configured:fapConfigReady_(fapAuthConfig_()),registerReady:!!PropertiesService.getScriptProperties().getProperty(FAP_ACCESS.bookKey)};}
/** Run from the Apps Script editor as F1XL after adding required services. */
function fapAuthoriseOwnerServices(){
  fapAssertHost_();if(!fapNativeOwner_())throw new Error('Only the F1XL owner can authorise script services.');
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  const response=UrlFetchApp.fetch('https://accounts.google.com/.well-known/openid-configuration',{muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw new Error('Google identity service check failed.');
  console.log('F1XL owner services authorised; Google identity service reachable.');
  return {ok:true};
}
function fapBeginSignIn(browserProof){
  fapAssertHost_();const c=fapAuthConfig_();if(!fapConfigReady_(c))throw new Error('Google sign-in has not been configured by the F1XL owner yet.');
  if(!/^[a-f0-9]{64}$/.test(String(browserProof)))throw new Error('Unable to start this browser’s sign-in. Reload and try again.');
  const state=fapRandom_(),verifier=fapRandom_();CacheService.getScriptCache().put('fap:oauth:'+state,JSON.stringify({proof:fapHash_(browserProof),verifier:verifier,redirect:c.redirect,expires:Date.now()+600000}),600);
  const params={client_id:c.clientId,redirect_uri:c.redirect,response_type:'code',scope:'openid email profile',state:state,code_challenge:fapHash_(verifier),code_challenge_method:'S256',prompt:'select_account'};
  return {url:'https://accounts.google.com/o/oauth2/v2/auth?'+Object.keys(params).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(params[k])).join('&')};
}
function fapFetchJson_(url,options){const r=UrlFetchApp.fetch(url,Object.assign({muteHttpExceptions:true,followRedirects:false},options));if(r.getResponseCode()!==200)throw new Error('Google sign-in could not be verified. Start sign-in again.');return JSON.parse(r.getContentText());}
function fapOAuthReturn_(parameters,browserProof){
  fapAssertHost_();const c=fapAuthConfig_(),state=String(parameters.state||'');if(!/^[a-f0-9]{64}$/.test(state))throw new Error('Sign-in request is missing or expired. Start again from the FAP.');
  const pending=fapLock_(()=>{const cache=CacheService.getScriptCache(),key='fap:oauth:'+state,value=fapJson_(cache.get(key),null);
    if(value&&(value.redirect===FAP_GOOGLE_RETURN_URL||browserProof!==undefined)&&value.proof!==fapHash_(browserProof))throw new Error('Sign-in must finish in the browser where it started. Start again from the FAP.');
    cache.remove(key);return value;});
  if(!pending||pending.expires<Date.now()||parameters.error||!parameters.code)throw new Error('Sign-in was cancelled or expired. Start again from the FAP.');
  const tokens=fapFetchJson_('https://oauth2.googleapis.com/token',{method:'post',payload:{code:parameters.code,client_id:c.clientId,client_secret:c.clientSecret,redirect_uri:pending.redirect||c.redirect,grant_type:'authorization_code',code_verifier:pending.verifier}});
  if(!tokens.access_token||!tokens.id_token)throw new Error('Google did not return an identity. Start sign-in again.');
  // Tokens come directly from Google's HTTPS token endpoint after a confidential
  // authorization-code exchange. We do not accept client JWTs or use tokeninfo.
  const parts=tokens.id_token.split('.');if(parts.length!==3)throw new Error('Invalid Google identity.');
  const claims=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString());
  if(!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||claims.aud!==c.clientId||!claims.sub||Number(claims.exp)*1000<=Date.now()||(claims.azp&&claims.azp!==c.clientId))throw new Error('Google identity did not match this application.');
  const identity=fapFetchJson_('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+tokens.access_token}});
  if(identity.sub!==claims.sub||identity.email_verified!==true||!identity.email)throw new Error('Google did not verify this account identity.');
  const handoff=fapRandom_();CacheService.getScriptCache().put('fap:handoff:'+fapHash_(handoff),JSON.stringify({proof:pending.proof,identity:{sub:identity.sub,email:identity.email,name:identity.name||''},expires:Date.now()+180000}),180);return handoff;
}
// The public return-page RPC still requires the secret created in this tab,
// single-use state, PKCE and Google's verified identity before issuing a session.
function fapCompleteGoogleReturn(parameters,browserProof){
  fapAssertHost_();
  if(!/^[a-f0-9]{64}$/.test(String(browserProof||'')))throw new Error('Sign-in must finish in the browser where it started. Start again from the FAP.');
  if(!parameters||typeof parameters!=='object'||typeof parameters.state!=='string'||(parameters.code!==undefined&&(typeof parameters.code!=='string'||parameters.code.length>4096))||(parameters.iss&&parameters.iss!=='https://accounts.google.com'))throw new Error('Invalid Google sign-in response. Start again from the FAP.');
  return fapCompleteSignIn(fapOAuthReturn_({state:parameters.state,code:parameters.code,error:parameters.error},browserProof),browserProof);
}
function fapCompleteSignIn(handoff,browserProof){
  fapAssertHost_();if(!/^[a-f0-9]{64}$/.test(String(handoff))||!/^[a-f0-9]{64}$/.test(String(browserProof)))throw new Error('Sign-in must finish in the browser where it started.');
  return fapLock_(()=>{const cache=CacheService.getScriptCache(),key='fap:handoff:'+fapHash_(handoff),pending=fapJson_(cache.get(key),null);
    if(!pending||pending.expires<Date.now()||pending.proof!==fapHash_(browserProof))throw new Error('Sign-in must finish in the browser where it started. Start again from the FAP.');
    cache.remove(key);const identity=pending.identity,now=fapNow_();let p;
    if(identity.email.toLowerCase()===FAP_ACCESS.owner){const props=PropertiesService.getScriptProperties(),sub=props.getProperty('FAP_OWNER_SUB');if(sub&&sub!==identity.sub)throw new Error('Owner identity mismatch.');props.setProperty('FAP_OWNER_SUB',identity.sub);p=fapOwner_();}
    else{const matches=fapRows_().map(fapPerson_).filter(r=>r.id===identity.sub);if(matches.length>1)throw new Error('Duplicate account records. Ask the F1XL owner.');p=matches[0]||{id:identity.sub,email:identity.email,gamertag:'',discord:'',status:'Pending',roles:[],overrides:{},teams:{},reviewerName:'',revision:fapRandom_(),created:now};p.email=identity.email;p.googleName=identity.name;p.lastSignIn=now;p.updated=now;
      if(['Suspended','Rejected'].includes(p.status))throw new Error('This account does not currently have access.');fapWritePerson_(p);}
    return {token:fapIssueSession_(identity.sub),person:fapPublicPerson_(p)};
  });
}
function fapGetSession(token){return fapPublicPerson_(fapSession_(token));}
function fapSignOut(token){if(/^[a-f0-9]{64}$/.test(String(token)))CacheService.getScriptCache().remove('fap:session:'+fapHash_(token));return {ok:true};}
function fapSaveProfile(token,input){return fapLock_(()=>{const p=fapSession_(token);if(p.owner)return fapPublicPerson_(p);p.gamertag=fapText_(input&&input.gamertag);p.discord=fapText_(input&&input.discord);if(!p.gamertag||!p.discord||p.gamertag.length>100||p.discord.length>100)throw new Error('Enter your gamertag and Discord name (up to 100 characters each).');p.updated=fapNow_();p.revision=fapRandom_();fapWritePerson_(p);return fapPublicPerson_(p);});}
function fapSetupAccess(token){
  const p=fapSession_(token);if(!p.owner)throw new Error('Only the F1XL owner can prepare access.');
  return fapLock_(()=>{const props=PropertiesService.getScriptProperties();if(!props.getProperty(FAP_ACCESS.bookKey)){
    const b=SpreadsheetApp.create('F1XL - People and Permissions'),s=b.getSheets()[0];s.setName('People');s.getRange(1,1,1,FAP_ACCESS.headers.length).setValues([FAP_ACCESS.headers]);s.setFrozenRows(1);s.getRange(1,15,s.getMaxRows(),1).setNumberFormat('@');
    const audit=b.insertSheet('Access Audit');audit.appendRow(['UTC time','Operation ID','Google ID','Google email','Gamertag','Action','Context','Status','Finished UTC']);audit.setFrozenRows(1);
    const guide=b.insertSheet('Start Here');guide.getRange(1,1,5,2).setValues([['Purpose','Permanent private access register. Do not publish or share this workbook.'],['Owner',FAP_ACCESS.owner],['People','Google ID is the identity. Profiles are separate from the Driver Database. Prefer People & permissions in FAP for editing roles.'],['Audit','Attempt recorded before an operation, then Completed or Failed (check retained changes). A Started row can indicate interruption.'],['Manual operation','Operational Sheets remain usable directly by their authorised Google editors. FAP permissions do not change Drive sharing.']]);guide.setColumnWidth(2,800);guide.getRange('A1:B5').setWrap(true);props.setProperty(FAP_ACCESS.bookKey,b.getId());}
    return {ok:true,url:fapBook_().getUrl()};});
}
function fapPeopleResponse_(){return {people:fapRows_().map(fapPerson_),areas:FAP_AREAS,roles:FAP_ROLES,retiredRoles:{viewer:{label:'Season viewer (retired)',permissions:{results:1,calendar:1}}},owner:FAP_ACCESS.owner,url:fapBook_().getUrl(),authConfigured:fapConfigReady_(fapAuthConfig_()),redirect:fapAuthConfig_().redirect||ScriptApp.getService().getUrl()};}
function saveFapGoogleAuthConfig(input){
  fapAssertEntry_('saveFapGoogleAuthConfig');
  if(!(fapRequest_?fapRequest_.person.owner:fapNativeOwner_()))throw new Error('Only the F1XL owner can configure Google sign-in.');
  const existing=input&&input.useExistingClient?fapAuthConfig_():{};
  const clientId=fapText_(existing.clientId||input&&input.clientId),clientSecret=fapText_(existing.clientSecret||input&&input.clientSecret),redirect=fapText_(input&&input.redirect);
  if(!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId))throw new Error('Enter the Google OAuth Web client ID.');
  if(clientSecret.length<20)throw new Error('Enter the Google OAuth client secret.');
  if(redirect!==FAP_GOOGLE_RETURN_URL&&redirect!==ScriptApp.getService().getUrl())throw new Error('Use the approved F1XL Google return page or this TEST deployment’s exact /exec address.');
  PropertiesService.getScriptProperties().setProperties({FAP_GOOGLE_CLIENT_ID:clientId,FAP_GOOGLE_CLIENT_SECRET:clientSecret,FAP_GOOGLE_REDIRECT_URI:redirect},false);
  return {configured:true,redirect:redirect};
}
function getFapPeople(){fapAssertEntry_('getFapPeople');return fapPeopleResponse_();}
function fapAssignmentOptions_(){
  const cache=CacheService.getScriptCache(),key='fap:assignment-options:v2',cached=cache.get(key);if(cached)return JSON.parse(cached);
  const props=PropertiesService.getScriptProperties().getProperties(),seasons=[];
  // New team assignments belong to open seasons. Keep existing historical
  // assignments readable without reopening every archived Master here.
  Object.keys(props).filter(k=>/^F1XL_SEASON_MASTER_\d+(?:_5)?$/.test(k)&&!seasonProtectionStatus_(k.slice(F1XL_SEASON_MASTER.propertyPrefix.length).replace(/_/g,'.')).readOnly).forEach(k=>{const season=k.slice(F1XL_SEASON_MASTER.propertyPrefix.length).replace(/_/g,'.');try{const book=SpreadsheetApp.openById(props[k]),sheet=book.getSheetByName('Teams & Principals');if(!sheet)return;const count=Math.min(F1XL_CAPACITY.teams,Math.max(0,sheet.getLastRow()-1));const teams=count?sheet.getRange(2,1,count,6).getDisplayValues().filter(r=>r[0]&&r[5]==='Full team').map(r=>r[0]):[];const active=String(book.getSheetByName('Start Here').getRange('I7').getDisplayValue()).trim()==='Active';seasons.push({season,teams,active});}catch(e){console.warn('Assignment choices unavailable for season '+season);}});
  seasons.sort((a,b)=>Number(b.active)-Number(a.active)||Number(b.season)-Number(a.season));const result={seasons};cache.put(key,JSON.stringify(result),30);return result;
}
function getFapAssignmentOptions(){fapAssertEntry_('getFapAssignmentOptions');return fapAssignmentOptions_();}
function saveFapPerson(input){fapAssertEntry_('saveFapPerson');return fapLock_(()=>{
  const p=fapFindPerson_(fapText_(input.id));if(p.email.toLowerCase()===FAP_ACCESS.owner||p.id===PropertiesService.getScriptProperties().getProperty('FAP_OWNER_SUB'))throw new Error('The F1XL owner cannot be changed.');if(p.revision!==input.revision)throw new Error('This person’s profile changed. Refresh before saving.');
  if(!['Pending','Active','Suspended','Rejected'].includes(input.status))throw new Error('Choose a valid status.');
  if(!Array.isArray(input.roles)||input.roles.some(r=>!Object.prototype.hasOwnProperty.call(FAP_ROLES,r)&&!(r==='viewer'&&p.roles.includes('viewer'))||r==='owner'))throw new Error('Choose valid roles.');
  const overrides=input.overrides||{};if(Object.keys(overrides).some(k=>!Object.prototype.hasOwnProperty.call(FAP_AREAS,k)||k==='people'||![0,1,2].includes(overrides[k])))throw new Error('Invalid permission exception.');
  const teams=input.teams||{};if(Array.isArray(teams)||Object.keys(teams).some(s=>!/^\d+(?:\.5)?$/.test(s)||typeof teams[s]!=='string'||!teams[s].trim()||teams[s].length>100))throw new Error('Set a team against a valid season number.');
  
  const tag=input.gamertag===undefined?p.gamertag:fapText_(input.gamertag),discord=input.discord===undefined?p.discord:fapText_(input.discord),discordUserId=input.discordUserId===undefined?p.discordUserId||'':fapDiscordId_(input.discordUserId);
  if(tag.length>100||discord.length>100)throw Error('Keep names within 100 characters.');
  if(input.status==='Active'&&(!tag||!discord))throw Error('Enter their gamertag and Discord name before approval.');
  if(discordUserId&&fapRows_().map(fapPerson_).some(other=>other.id!==p.id&&other.discordUserId===discordUserId&&other.status==='Active'&&input.status==='Active'))throw Error('That Discord user ID is already linked to another active account.');
  const options=fapAssignmentOptions_();Object.keys(teams).forEach(season=>{if(p.teams[season]===teams[season])return;const choice=options.seasons.find(s=>s.season===season);if(!choice||!choice.teams.includes(teams[season]))throw Error('Choose a configured team for Season '+season+'.');});
  p.gamertag=tag;p.discord=discord;p.discordUserId=discordUserId;p.status=input.status;p.roles=Array.from(new Set(input.roles));p.overrides=overrides;p.teams=teams;p.reviewerName=fapText_(input.reviewerName);if(p.reviewerName.length>100)throw new Error('Reviewer name is too long.');
  if(p.status==='Active'&&!p.roles.includes('god')&&(p.roles.includes('steward')||p.roles.includes('appeal'))&&!p.reviewerName)throw new Error('Enter the exact name used in this reviewer’s ticket column.');
  if(p.status==='Active'&&fapPermission_(p,'team_hub')&&!fapPermission_(p,'team_preview')&&!Object.keys(teams).length)throw new Error('Assign this principal’s team and season first.');
  p.revision=fapRandom_();p.updated=fapNow_();fapWritePerson_(p);return fapPeopleResponse_();
});}
function getFapAccessAudit(){fapAssertEntry_('getFapAccessAudit');const s=fapBook_().getSheetByName('Access Audit'),count=Math.min(200,Math.max(0,s.getLastRow()-1));return {rows:count?s.getRange(s.getLastRow()-count+1,1,count,9).getDisplayValues().reverse():[]};}
function checkFapAccessInstallation(){fapAssertEntry_('checkFapAccessInstallation');
  const special=['doGet','fapAuthBootstrap','fapAuthoriseOwnerServices','fapBeginSignIn','fapCompleteGoogleReturn','fapCompleteSignIn','fapGetSession','fapSignOut','fapSaveProfile','fapSetupAccess','fapCall','divisionTemplateRoundHistoryOnEdit','seasonMasterLineupSafetyOnEdit'];
  const unguarded=Object.keys(FAP_ENDPOINTS).filter(k=>!/^function\s+\w+\([^)]*\)\s*\{\s*fapAssertEntry_\(/.test(String(FAP_ENDPOINTS[k].fn)));
  const unknown=Object.getOwnPropertyNames(globalThis).filter(k=>{
    if(k.endsWith('_')||special.includes(k)||Object.prototype.hasOwnProperty.call(FAP_ENDPOINTS,k))return false;
    const value=globalThis[k];return typeof value==='function'&&/^function\s+\w+\(/.test(String(value))&&!String(value).includes('[native code]');
  });
  return {ok:!unguarded.length&&!unknown.length,endpoints:Object.keys(FAP_ENDPOINTS).length,unguarded:unguarded,unknown:unknown,message:unguarded.length||unknown.length?'Keep deployment owner-only. Replace missing updates and review the listed functions.':'All registered endpoints have entry guards. Complete the external-account checks before general access.'};
}
function fapAuditStart_(p,method,args){return fapLock_(()=>{const s=fapBook_().getSheetByName('Access Audit'),id=fapRandom_(),input=args[0],context=typeof input==='object'&&input?['season','division','round','sheetName','raceName','id'].filter(k=>input[k]!=null).map(k=>k+'='+String(input[k]).slice(0,100)).join(' · '):typeof input==='string'?input.slice(0,100):'';
  const row=s.getLastRow()+1;s.getRange(row,1,1,9).setNumberFormat('@').setValues([[fapNow_(),id,p.id,p.email,p.gamertag,method,context,'Started',''].map(fapLiteral_)]);return {row:row,id:id};});}
function fapAuditFinish_(audit,status){const s=fapBook_().getSheetByName('Access Audit');if(s.getRange(audit.row,2).getDisplayValue()!==audit.id)throw new Error('Audit row changed.');s.getRange(audit.row,8,1,2).setValues([[status,fapNow_()]]);}
// Display-only counters. Mutations always validate fresh Sheets, never this cache.
function fapAttentionCached_(key,force,work){
  let cache,fullKey;
  try{cache=CacheService.getScriptCache();fullKey='fap:attention:v1:'+String(cache.get('fap:attention:epoch')||'')+':'+key;const raw=force===true?null:cache.get(fullKey);if(raw)return JSON.parse(raw);}catch(ignore){}
  const result=work();
  try{if(cache&&fullKey)cache.put(fullKey,JSON.stringify(result),30);}catch(ignore){}
  return result;
}
function fapAttentionInvalidate_(method){
  if(!/^(processPreseasonApplication|retryPreseasonApplicationArchive|rejectPreseasonApplication|savePreseasonCarryForward|saveSeasonPlan|createSeasonMasterWorkbook|archiveApplication|archiveAllApplications|rejectApplication|deleteStaffApplication|markStaffApplicationReviewed|reviewPreseasonPrincipalApplication)$/.test(method))return;
  // A reader that began before this change can only populate the old epoch.
  try{CacheService.getScriptCache().put('fap:attention:epoch',Utilities.getUuid(),21600);}catch(ignore){}
}
function fapCall(token,method,args){
  const label=Object.prototype.hasOwnProperty.call(FAP_ENDPOINTS,method)?method:'unavailable';
  return fapPerformanceMeasure_('rpc.'+label,()=>fapCallMeasured_(token,method,args));
}
function fapCallMeasured_(token,method,args){
  const p=fapPerformancePhase_('rpc.auth',()=>fapSession_(token));if(p.status!=='Active')throw new Error('Your profile is awaiting approval.');
  if(!Object.prototype.hasOwnProperty.call(FAP_ENDPOINTS,method)||!Array.isArray(args)||args.length>6)throw new Error('This operation is not available through the FAP.');
  const route=FAP_ENDPOINTS[method];fapPerformancePhase_('rpc.permissions',()=>{fapRequire_(p,route.area,route.level);
  if(route.requires)Object.keys(route.requires).forEach(k=>fapRequire_(p,k,route.requires[k]));});
  let audit=null;if(route.level===2||route.write)audit=fapPerformancePhase_('rpc.audit.start',()=>fapAuditStart_(p,method,args));
  fapRequest_={person:p,method:method};
  try{const result=fapPerformancePhase_('rpc.action',()=>route.fn.apply(null,args));if(audit){try{fapPerformancePhase_('rpc.audit.finish',()=>fapAuditFinish_(audit,'Completed'));}catch(e){console.error('Audit completion pending for '+audit.id);}}return fapPerformancePhase_('rpc.response',()=>fapSanitiseResponse_(p,method,result));}
  catch(error){if(audit){try{fapPerformancePhase_('rpc.audit.finish',()=>fapAuditFinish_(audit,'Failed — check retained changes'));}catch(e){console.error('Audit completion pending for '+audit.id);}}throw error;}
  finally{fapRequest_=null;if(audit)fapAttentionInvalidate_(method);}
}
function fapCurrentPerson_(){return fapRequest_?fapRequest_.person:fapNativeOwner_()?fapOwner_():null;}
function fapSanitiseResponse_(p,method,value){
  if(method==='getPreseasonHubs'){
    if(!p.owner&&!Object.keys(FAP_AREAS).some(k=>!['team_hub','team_preview','steward','appeal','navigation','people'].includes(k)&&fapPermission_(p,k)))return {hubs:[],postseasonHubs:[],unavailable:[]};
    if(!fapPermission_(p,'postseason'))value.postseasonHubs=[];
  }
  // Completed TT laps belong to placement reviewers, including in network payloads.
  if(['getPreseasonTimeTrials','savePreseasonTimeTrial','savePreseasonTimeTrialTracks'].includes(method)&&!fapPermission_(p,'tt_results')){
    value.entries=value.entries.map(e=>{if(e.complete)return {driverId:e.driverId,gamertag:e.gamertag,complete:true,completedAt:e.completedAt,status:e.status};const clean=Object.assign({},e);['averageOne','averageTwo','overall','rank','gap'].forEach(k=>delete clean[k]);return clean;});value.ranked=[];
  }
  if(method==='getPreseasonHubs'&&fapDraftOnly_(p)){value.hubs=value.hubs.filter(h=>!h.active);value.postseasonHubs=[];value.unavailable=[];}
  if(method==='getTestSeasonLaunch'&&fapDraftOnly_(p)&&value.active)throw Error('This account is assigned to draft work. Choose a pre-season draft from the menu.');
  if(!fapPermission_(p,'tt_results')&&FAP_ENDPOINTS[method]&&['draft','placement','movements'].includes(FAP_ENDPOINTS[method].area)){
    const scrubTrials=x=>{if(!x||typeof x!=='object')return;const driver=Object.prototype.hasOwnProperty.call(x,'driverId')||Object.prototype.hasOwnProperty.call(x,'trial');Object.keys(x).forEach(k=>{if(k==='trial'||driver&&['rank','average','averageOne','averageTwo','overall','gap','one','two','ready'].includes(k))delete x[k];else scrubTrials(x[k]);});};scrubTrials(value);
    if(value&&Array.isArray(value.drivers))value.drivers.sort((a,b)=>String(a.gamertag||a.name||'').localeCompare(String(b.gamertag||b.name||'')));
  }
  if(!p.owner&&!fapPermission_(p,'maintenance')){
    // These endpoints already return only the team's read-only case fields.
    // Submitted statements/evidence may themselves be Google Sheets links;
    // retain those while still hiding internal workbook navigation URLs.
    const ticketRead=['getTeamPrincipalHubTicketInbox','getTeamPrincipalHubWeeklyTickets','getFreeAgentHubInbox','getFreeAgentHubReview','getFreeAgentHubTickets'].includes(method);
    const submitted=['description','evidence','defenceComments','defenceEvidence','appealDescription','appealEvidence'];
    const scrub=x=>{if(!x||typeof x!=='object')return;Object.keys(x).forEach(k=>{if(ticketRead&&submitted.includes(k))return;if(typeof x[k]==='string'&&/^https:\/\/docs\.google\.com\/spreadsheets\//.test(x[k]))x[k]='';else scrub(x[k]);});};scrub(value);
  }return value;
}
