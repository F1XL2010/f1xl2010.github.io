/**
 * Seasonal time-trial ranking and manual division-placement workbook.
 *
 * Time Trial Results is an IMPORTRANGE view. Placements is the manual source
 * of truth for division/tier slots, Host/RC names and commitment lists.
 */
const F1XL_PLACEMENT_SOURCE = Object.freeze({
  spreadsheetId:'1LG_5LPl1MPtOhXY-vshrCGLqzzbwoExJe82PQP2KeVw',
  resultsSheetName:'Time Trial Results',
  placementSheetName:'Placements',
  cacheKey:'F1XL_PLACEMENT_WORKSPACE_V1',
  cacheSeconds:120
});

function getPlacementWorkspace(forceRefresh) { fapAssertEntry_('getPlacementWorkspace');
  const cache=CacheService.getScriptCache();
  if (forceRefresh===true) cache.remove(F1XL_PLACEMENT_SOURCE.cacheKey);
  const cached=cache.get(F1XL_PLACEMENT_SOURCE.cacheKey);
  if (cached) return JSON.parse(cached);
  const response=buildPlacementWorkspace_(openPlacementContext_());
  const serialised=JSON.stringify(response);
  if (serialised.length<90000) cache.put(F1XL_PLACEMENT_SOURCE.cacheKey,serialised,F1XL_PLACEMENT_SOURCE.cacheSeconds);
  return response;
}

function savePlacementBoard(input) { fapAssertEntry_('savePlacementBoard');
  return withPlacementLock_(function(){
    const context=openPlacementContext_();
    const current=buildPlacementWorkspace_(context);
    requirePlacementRevision_(input,current);
    const supplied=Array.isArray(input&&input.divisions)?input.divisions:[];
    current.divisions.forEach(function(division){
      const incoming=supplied.find(function(item){return item&&Number(item.number)===division.number;});
      if (!incoming) throw new Error(division.title+' is missing. Refresh and try again.');
      const tierOne=normalisePlacementList_(incoming.tierOne,10);
      const tierTwo=normalisePlacementList_(incoming.tierTwo,10);
      context.placements.getRange(5,division.startColumn,10,1).setValues(tierOne.map(function(value){return [value];}));
      context.placements.getRange(5,division.startColumn+1,10,1).setValues(tierTwo.map(function(value){return [value];}));
      context.placements.getRange(19,division.startColumn+1).setValue(placementText_(incoming.host));
      context.placements.getRange(20,division.startColumn+1).setValue(placementText_(incoming.rc));
    });
    SpreadsheetApp.flush(); clearPlacementCache_();
    const response=buildPlacementWorkspace_(context); response.message='Division, tier, Host and RC placements saved.'; return response;
  });
}

function savePlacementCommitments(input) { fapAssertEntry_('savePlacementCommitments');
  return withPlacementLock_(function(){
    const context=openPlacementContext_();
    const current=buildPlacementWorkspace_(context);
    requirePlacementRevision_(input,current);
    const columns=Array.isArray(input&&input.commitments)?input.commitments:[];
    const byHeader={}; columns.forEach(function(column){if(column)byHeader[placementText_(column.header)]=normalisePlacementList_(column.drivers,72);});
    current.commitments.forEach(function(column,index){
      if (!Object.prototype.hasOwnProperty.call(byHeader,column.header)) throw new Error(column.header+' commitment list is missing. Refresh and try again.');
      context.placements.getRange(5,10+index,72,1).setValues(byHeader[column.header].map(function(value){return [value];}));
    });
    SpreadsheetApp.flush(); clearPlacementCache_();
    const response=buildPlacementWorkspace_(context); response.message='Commitment lists saved.'; return response;
  });
}

function openPlacementContext_() {
  const spreadsheet=SpreadsheetApp.openById(F1XL_PLACEMENT_SOURCE.spreadsheetId);
  const results=spreadsheet.getSheetByName(F1XL_PLACEMENT_SOURCE.resultsSheetName);
  const placements=spreadsheet.getSheetByName(F1XL_PLACEMENT_SOURCE.placementSheetName);
  if (!results||!placements) throw new Error('The placement workbook is missing Time Trial Results or Placements.');
  return {spreadsheet:spreadsheet,results:results,placements:placements};
}

function buildPlacementWorkspace_(context) {
  const resultValues=context.results.getRange('A1:P150').getDisplayValues();
  let headerIndex=resultValues.findIndex(function(row){return /^driver$/i.test(placementText_(row[1]));});
  if (headerIndex<0) headerIndex=1;
  const ranking=resultValues.slice(headerIndex+1).filter(function(row){return placementText_(row[1]);}).map(function(row){
    return {rank:placementText_(row[0]),driver:placementText_(row[1]),trackOneAverage:placementText_(row[7]),trackTwoAverage:placementText_(row[13]),overallAverage:placementText_(row[14]),gap:placementText_(row[15])};
  });
  const tracks={one:placementText_(resultValues[0]&&resultValues[0][1])||'Track 1',two:placementText_(resultValues[0]&&resultValues[0][8])||'Track 2'};
  const divisions=[];
  context.placements.getRange('A3:H3').getDisplayValues()[0].forEach(function(value,index){
    const match=placementText_(value).match(/^Division\s+(\d+)$/i); if(!match)return;
    const startColumn=index+1;
    divisions.push({
      number:Number(match[1]),title:placementText_(value),startColumn:startColumn,
      tierOne:context.placements.getRange(5,startColumn,10,1).getDisplayValues().flat().map(placementText_),
      tierTwo:context.placements.getRange(5,startColumn+1,10,1).getDisplayValues().flat().map(placementText_),
      counts:[context.placements.getRange(15,startColumn).getDisplayValue(),context.placements.getRange(15,startColumn+1).getDisplayValue()].map(placementText_),
      host:placementText_(context.placements.getRange(19,startColumn+1).getDisplayValue()),
      rc:placementText_(context.placements.getRange(20,startColumn+1).getDisplayValue())
    });
  });
  const commitmentHeaders=context.placements.getRange('J4:L4').getDisplayValues()[0].map(placementText_);
  const commitmentValues=context.placements.getRange('J5:L76').getDisplayValues();
  const commitments=commitmentHeaders.map(function(header,index){return {header:header,drivers:commitmentValues.map(function(row){return placementText_(row[index]);})};});
  const importFormula=context.results.getRange('A1').getFormula();
  const importIdMatch=importFormula.match(/([A-Za-z0-9_-]{30,})/);
  const response={
    ok:true,sourceName:context.spreadsheet.getName(),refreshedAt:new Date().toISOString(),tracks:tracks,ranking:ranking,divisions:divisions,commitments:commitments,
    importedTimeTrialSpreadsheetId:importIdMatch?importIdMatch[1]:'',
    notes:{rankingImported:true,placementManual:true,unmappedWorkingCells:['A24:A27','I54']},revision:''
  };
  response.revision=placementRevision_({divisions:divisions.map(placementDivisionRevision_),commitments:commitments});
  return response;
}

function placementDivisionRevision_(division){return {number:division.number,tierOne:division.tierOne,tierTwo:division.tierTwo,host:division.host,rc:division.rc};}
function normalisePlacementList_(values,length){const list=Array.isArray(values)?values.slice(0,length).map(placementText_):[];while(list.length<length)list.push('');return list;}
function requirePlacementRevision_(input,current){if(placementText_(input&&input.revision)!==current.revision)throw new Error('The placement workbook changed after you opened it. Refresh before saving.');}
function placementRevision_(value){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(value),Utilities.Charset.UTF_8);return bytes.map(function(byte){return('0'+((byte+256)%256).toString(16)).slice(-2);}).join('');}
function placementText_(value){return String(value==null?'':value).trim();}
function clearPlacementCache_(){CacheService.getScriptCache().remove(F1XL_PLACEMENT_SOURCE.cacheKey);}
function withPlacementLock_(work){const lock=LockService.getScriptLock();lock.waitLock(30000);try{return work();}finally{lock.releaseLock();}}
