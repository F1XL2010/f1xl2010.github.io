/* Public allowlisted movement feed. Never reads the private Season Master. */
window.F1XLDriverMovements=(()=>{
  let generation=0;
  function csv(text){const rows=[],row=[];let value='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(value);value='';}else if(ch==='\n'&&!quoted){row.push(value.replace(/\r$/,''));rows.push(row.splice(0));value='';}else value+=ch;}if(value||row.length){row.push(value.replace(/\r$/,''));rows.push(row);}return rows;}
  function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
  async function show(season){const token=++generation,host=document.getElementById('driver-movements');host.hidden=false;host.replaceChildren(text('h2','Driver movements'),text('p','Loading movements…'));
    try{const main=await nextLoadMain();if(token!==generation)return;if(String(main.active_test_season)!==String(season)){host.hidden=true;return;}
      const id=main.driver_movements_sheet,gid=main.driver_movements_gid;if(!id||!gid){host.replaceChildren(text('h2','Driver movements'),text('p','No movements published yet.'));return;}
      if(!/^[\w-]+$/.test(id)||!/^\d+$/.test(gid))throw Error('Invalid movement feed.');
      const r=await fetch('https://docs.google.com/spreadsheets/d/'+id+'/export?format=csv&gid='+gid);if(!r.ok)throw Error('HTTP '+r.status);const data=csv(await r.text());if(token!==generation)return;
      if(data[0]?.[0]!=='Date'||data[0]?.[13]!=='Reason')throw Error('Movement feed is not ready.');
      host.replaceChildren(text('h2','Driver movements'));const rows=data.slice(1).filter(r=>r[1]).reverse();if(!rows.length){host.append(text('p','No movements recorded yet.'));return;}
      const list=document.createElement('div');list.className='movement-list';rows.forEach(r=>{const card=document.createElement('article');card.className='movement-card';card.append(text('h3',r[1]),text('p','From R'+r[12]+' · '+r[0].slice(0,10)));
        const assignment=(offset)=>'D'+r[offset]+' · '+r[offset+1]+' · '+r[offset+3]+(r[offset+4]?' #'+r[offset+4]:'');
        card.append(text('p',assignment(2)+' → '+assignment(7)),text('p',r[13]));list.append(card);});host.append(list);
    }catch(e){if(token===generation)host.replaceChildren(text('h2','Driver movements'),text('p','Movements could not be loaded. Please refresh to try again.'));}
  }return {show};
})();
