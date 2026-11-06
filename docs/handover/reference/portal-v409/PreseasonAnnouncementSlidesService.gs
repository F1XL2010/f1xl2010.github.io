/** Editable, private Google Slides copies. The supplied S28 deck is never edited. */
const F1XL_ANNOUNCEMENT_SLIDES=Object.freeze({source:'1NkQj4WGF45MX2Ve0kztpMb2R-FyN2hNbFUw7El1Do6Y',templateProperty:'F1XL_ANNOUNCEMENT_TEMPLATE_ID'});
/** Run once from the editor to grant the newly added Slides scope, if required. */
function checkPreseasonAnnouncementAccess(){ fapAssertEntry_('checkPreseasonAnnouncementAccess');const id=F1XL_ANNOUNCEMENT_SLIDES.source;const result={source:DriveApp.getFileById(id).getName(),slides:SlidesApp.openById(id).getSlides().length};console.log(JSON.stringify(result));return result;}
function announcementSlideShapes_(slide){return slide.getShapes();}
function announcementTemplateTrack_(slide){
  const header=announcementSlideShapes_(slide).find(function(s){return /^Round (?:\d+|\{\{ROUND\}\})\s*-/.test(s.getText().asString());});
  if(!header)return null;
  const line=header.getText().asString().split('\n')[0].replace(/^Round (?:\d+|\{\{ROUND\}\})\s*-\s*(?:Sprint\s*-\s*)?/,'').trim();
  return {key:announcementTrackKey_(line,false),header:header};
}
function announcementSetShape_(shape,text,size){
  const range=shape.getText();let color='#ffffff';try{color=range.getRange(0,1).getTextStyle().getForegroundColor().asRgbColor().asHexString();}catch(e){}
  range.setText(text);range.getListStyle().removeFromList();range.getParagraphStyle().setIndentStart(0).setIndentEnd(0).setIndentFirstLine(0).setSpaceAbove(0).setSpaceBelow(0).setLineSpacing(100);
  range.getTextStyle().setFontFamily('Arial').setFontSize(size).setBold(false).setUnderline(false).setForegroundColor(color);
}
function announcementCreateTemplate_(){
  const props=PropertiesService.getScriptProperties(),existing=props.getProperty(F1XL_ANNOUNCEMENT_SLIDES.templateProperty);if(existing)return existing;
  const file=DriveApp.getFileById(F1XL_ANNOUNCEMENT_SLIDES.source).makeCopy('F1XL Track Announcement Template'),id=file.getId();
  try{
    const deck=SlidesApp.openById(id),slides=deck.getSlides();let tracks=0;
    slides.forEach(function(slide,index){
      const track=announcementTemplateTrack_(slide);
      if(index===0){const title=slide.getShapes().find(function(s){return /Calendar/.test(s.getText().asString());});if(!title)throw new Error('The source cover title is missing.');announcementSetShape_(title,'S{{SEASON}} Calendar announcement',24);return;}
      if(!track){slide.remove();return;}
      const shapes=slide.getShapes(),body=shapes.find(function(s){return /^Results since/.test(s.getText().asString());}),date=shapes.find(function(s){return /^\d{1,2}\s*\//.test(s.getText().asString());});
      if(!body||!date)throw new Error('The source slide for '+track.key+' needs its results and date boxes.');
      const name=track.key==='madrid'?'Spain - Madrid':track.key==='catalunya'?'Catalunya':track.header.getText().asString().split('\n')[0].replace(/^Round \d+\s*-\s*(?:Sprint\s*-\s*)?/,'').trim();
      announcementSetShape_(track.header,'Round {{ROUND}} - '+name+'\n{{WEEKEND}}\nTrack records\n{{RECORDS}}',11);
      announcementSetShape_(body,'Results S{{FROM}}–S{{TO}}\n{{LEADERS}}\n\nS{{PREVIOUS}} results\n{{PREVIOUS_RESULTS}}',11);
      track.header.setHeight(112);body.setTop(track.header.getTop()+112);body.setHeight(deck.getPageHeight()-body.getTop()-21);
      announcementSetShape_(date,'{{DATE}}',18);
      slide.setSkipped(false);tracks++;
      slide.getNotesPage().getSpeakerNotesShape().getText().setText('F1XL reusable track template. Artwork: Chips and Davie. Source: https://docs.google.com/presentation/d/'+F1XL_ANNOUNCEMENT_SLIDES.source+'/edit');
    });
    if(tracks!==25)throw new Error('Expected 25 track exemplars in the S28 reference; found '+tracks+'.');
    deck.saveAndClose();props.setProperty(F1XL_ANNOUNCEMENT_SLIDES.templateProperty,id);return id;
  }catch(error){file.setTrashed(true);throw error;}
}
function announcementWrap_(text,width){const lines=[];String(text).split('\n').forEach(function(line){const words=line.split(/\s+/);let current='';words.forEach(function(word){if(current&&current.length+word.length+1>width){lines.push(current);current='';}current+=(current?' ':'')+word;});lines.push(current);});return lines;}
function announcementTrackPages_(report,track){
  const lines=[];['poles','wins','podiums'].forEach(function(metric){const l=track.leaders[metric];lines.push('Most '+metric+' — '+(l.count?l.names.join(', ')+' ('+l.count+')':'No recorded result'));});
  const previous=track.previous.length?track.previous.map(function(p){return 'D'+p.division+' · R'+p.round+' — Pole: '+(p.pole||'No recorded pole')+'; Win: '+(p.win||'No recorded winner');}):['Not raced in S'+report.to];
  const body=announcementWrap_(['Results S'+report.from+'–S'+report.to].concat(lines,['','S'+report.to+' results'],previous).join('\n'),51),records=track.records.map(function(r){return 'D'+r.division+'  '+r.time+' — '+r.driver+' (S'+r.season+')';});
  const recordLines=announcementWrap_(records.length?records.join('\n'):'No recorded lap record',49),pages=[];
  while(body.length||recordLines.length){pages.push({body:body.splice(0,18).join('\n'),records:recordLines.splice(0,4).join('\n')});}
  return pages;
}
/** Missing artwork never blocks a saved race. Make native editable text on a neutral slide. */
function announcementBlankTrackSlide_(deck,track){
  const slide=deck.appendSlide(SlidesApp.PredefinedLayout.BLANK),width=deck.getPageWidth(),height=deck.getPageHeight();
  slide.getBackground().setSolidFill('#14251e');
  const header=slide.insertTextBox('Round {{ROUND}} - '+track,width*0.235,15,width*0.51,112);
  const body=slide.insertTextBox('{{LEADERS}}',width*0.235,127,width*0.51,height-148);
  const date=slide.insertTextBox('{{DATE}}',width*0.745,59,width*0.25,32);
  [header,body,date].forEach(function(shape){shape.getText().getTextStyle().setForegroundColor('#ffffff');});
  announcementSetShape_(date,'{{DATE}}',18);
  return slide;
}
function createPreseasonAnnouncementPresentation(input){ fapAssertEntry_('createPreseasonAnnouncementPresentation');
  return withApplicationLock_(function(){
    const s=announcementSession_(input),report=announcementCacheGet_(s.token+'_report');
    report.recordDivisions=announcementRecordDivisionCount_(s);report.tracks.forEach(function(t){t.records=t.records.filter(function(r){return r.division<=report.recordDivisions;});});
    const props=PropertiesService.getScriptProperties(),key='F1XL_ANNOUNCEMENT_OUTPUT_'+s.season.replace('.','_'),previous=props.getProperty(key);
    if(previous){const old=JSON.parse(previous);if(old.token===s.token&&old.formatVersion===2)return old;}
    const templateId=announcementCreateTemplate_(),template=SlidesApp.openById(templateId),library={};template.getSlides().forEach(function(slide){const t=announcementTemplateTrack_(slide);if(t){if(library[t.key])throw new Error('Duplicate track in the template: '+t.key);library[t.key]=true;}});
    const file=DriveApp.getFileById(templateId).makeCopy('S'+s.season+' Track Announcement — draft'),id=file.getId();
    try{
      const deck=SlidesApp.openById(id),original=deck.getSlides(),byTrack={};original.forEach(function(slide){const t=announcementTemplateTrack_(slide);if(t)byTrack[t.key]=slide;});
      const cover=original[0];cover.replaceAllText('{{SEASON}}',s.season);cover.setSkipped(false);const keep=[cover.getObjectId()];let position=1;
      s.races.forEach(function(r){
        const key=announcementTrackKey_(r.track,false),track=report.tracks.find(function(t){return t.key===key;}),pages=announcementTrackPages_(report,track);
        pages.forEach(function(page,index){
          const hasArtwork=!!byTrack[key],slide=hasArtwork?byTrack[key].duplicate():announcementBlankTrackSlide_(deck,r.track);slide.move(position++);keep.push(slide.getObjectId());slide.setSkipped(false);
          const info=announcementTemplateTrack_(slide),body=slide.getShapes().find(function(sh){return sh.getText().asString().includes('{{LEADERS}}');});
          if(!info||!body)throw new Error('The template placeholders are missing for '+r.track+'.');
          announcementSetShape_(info.header,'Round '+r.round+' - '+r.track+(index?' (continued)':'')+'\n'+(/Sprint/.test(r.weekend)?'Sprint weekend':'Grand Prix')+'\nCurrent track records\n'+(page.records||'Continued statistics below'),11);
          announcementSetShape_(body,page.body||'Track records continued',11);
          slide.replaceAllText('{{DATE}}',r.date.split('-').reverse().join('/'));
          slide.getNotesPage().getSpeakerNotesShape().getText().setText('Statistics prepared '+report.created+'. Main races and qualifying poles only; sprint results excluded.\nHistorical sources:\n'+report.sources.map(function(src){return 'S'+src.season+' D'+src.division+': '+src.url;}).join('\n')+'\nCurrent track records: '+report.recordSource+' (read '+report.recordsReadAt+'). Divisions 1–'+report.recordDivisions+', matching S'+report.to+'.\n'+(hasArtwork?'Artwork: Chips and Davie.':'Neutral slide: add the track background, flag and map during manual presentation editing.'));
        });
      });
      original.forEach(function(slide){if(!keep.includes(slide.getObjectId()))slide.remove();});
      const remaining=deck.getSlides();if(remaining.length!==position)throw new Error('The presentation has an unexpected number of slides.');
      if(remaining.some(function(slide){return slide.getShapes().some(function(sh){return /\{\{[^}]+\}\}/.test(sh.getText().asString());});}))throw new Error('Unfilled presentation fields remain.');
      deck.saveAndClose();const result={token:s.token,formatVersion:2,url:'https://docs.google.com/presentation/d/'+id+'/edit',templateUrl:'https://docs.google.com/presentation/d/'+templateId+'/edit',slides:position,created:new Date().toISOString()};props.setProperty(key,JSON.stringify(result));return result;
    }catch(error){file.setTrashed(true);throw error;}
  });
}
