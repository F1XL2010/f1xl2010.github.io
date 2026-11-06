/** One deliberately inactive cutover profile. No Forms destinations are changed here.
 * Set F1XL_INTAKE_CONNECTION_PROFILE=combined only during the approved switch.
 * If the improved ticket Form is moved, record its verified response tab ID in
 * F1XL_COMBINED_TICKET_FORM_SHEET_ID before enabling that additional inbox. */
function intakeConnection_(kind,defaults) {
  const properties=PropertiesService.getScriptProperties(),profile=properties.getProperty('F1XL_INTAKE_CONNECTION_PROFILE')||'test';
  if(profile==='test')return Object.freeze(Object.assign({},defaults,{profile:'test'}));
  if(profile!=='combined')throw Error('Unknown intake connection profile. Check Maintenance before processing submissions.');
  const spreadsheetId='1ObIfEWfQodfCPVCBZCydzKKzK2aDR031mrngoyVemjQ';
  const routes={
    applications:{sheetId:278899100,archiveSheetId:2137215564,archiveSheetName:'F1AppsArchive'},
    staff:{sheetId:1200436264},
    tickets:{sheetId:2140272460,archiveSheetId:154195707,archiveSheetName:'TicketsArchive',enhancedSheetId:0},
    selfTT:{sheetId:602943702,archiveSheetName:'TTSubmissionArchive'}
  };
  if(!routes[kind])throw Error('Unknown intake area.');
  if(kind==='tickets'){
    const value=properties.getProperty('F1XL_COMBINED_TICKET_FORM_SHEET_ID');
    if(value&&!/^\d+$/.test(value))throw Error('Check the improved ticket Form response tab ID.');
    routes.tickets.enhancedSheetId=Number(value||0);
    if(routes.tickets.enhancedSheetId===routes.tickets.sheetId)throw Error('The improved ticket Form must use its own response tab.');
  }
  return Object.freeze(Object.assign({},defaults,routes[kind],{spreadsheetId,profile,cacheKey:defaults.cacheKey+'_COMBINED_V1'}));
}
