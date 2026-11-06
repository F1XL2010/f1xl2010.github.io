/**
 * F1XL Admin Platform — baseline rebuild.
 *
 * Existing response Sheets remain the source of truth. Driver applications
 * and self-recorded time trials have deliberate archive/reject actions.
 * Non-Team-Principal
 * staff applications can be deleted; Team Principal applications are protected
 * and can be exported. Ticket, defence and appeal submissions can be archived
 * or deleted. Division setup and race entry preserve the current per-division
 * workbook structure. Time-trial entry preserves the seasonal Data and Sorted
 * Data workflow, while Placements keeps its imported ranking separate from its
 * manual division/tier board. The standalone All Star Race remains linked to its closing
 * season without affecting season standings. Seasonal workspaces remain
 * backed by their existing Sheets.
 */

function doGet(event) {
  fapAssertHost_();
  if(event&&event.parameter&&event.parameter.view==='discord-draft')return discordGithubFeedResponse_(event);
  if(event&&event.parameter&&event.parameter.view==='track-records')return trackRecordsResponse_();
  if(event&&event.parameter&&event.parameter.view==='public-history')return publicHistoryResponse_();
  const template=HtmlService.createTemplateFromFile('Index'),parameters=event&&event.parameter||{};
  let handoff='',error='';
  if(parameters.state||parameters.code||parameters.error){try{handoff=fapOAuthReturn_(parameters);}catch(e){error=e.message;}}
  template.accessBootstrap=JSON.stringify({handoff:handoff,error:error,signIn:parameters.signin==='1'}).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  // Existing clients retain their fluent RPC API; all browser calls are routed
  // through the authenticated gateway in the served HTML, including inline code.
  const html=template.evaluate().getContent().replace(/\bgoogle\.script\.run\b/g,'F1XLRpc');
  return HtmlService.createHtmlOutput(html)
    .setTitle('F1XL Admin Portal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getBaselineStatus() { fapAssertEntry_('getBaselineStatus');
  return {
    mode: 'Permanent inboxes and seasonal workspaces',
    writesEnabled: true,
    message: 'The permanent Driver Database, Permanent Reference Data, test Season Master creator and parallel TEST Website Config are available alongside the existing Sheet-backed operational areas.'
  };
}
