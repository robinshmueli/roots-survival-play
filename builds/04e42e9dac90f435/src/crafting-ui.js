import {t} from './i18n.js';
import {RECIPES,recipesForStation,recipeStatus,createCraftingHold} from './crafting.js';
import {ITEMS,itemArt} from './items.js';
import {paintCraftWheel} from './crafting-art.js';

export function createCraftingUI(inventory,onToggle,blocked,nearWorkbench,onComplete,getBiome=()=>({id:'forest'})) {
  const dialog=document.getElementById('crafting'),recipes=document.getElementById('craft-recipes'),details=document.getElementById('craft-details');
  const action=document.getElementById('craft-start'),status=document.getElementById('craft-status'),progress=document.getElementById('craft-progress');
  const materials=document.getElementById('craft-materials'),wheel=document.getElementById('craft-wheel-art');
  const hint=document.getElementById('craft-hold-hint'),model=createCraftingHold(inventory);
  const selections={hand:'workbench',workbench:'axe'};
  let selected='workbench',mode=null,book=false,renderKey='',hold=null,notice='';
  const recipe=()=>RECIPES.find(item=>item.id===selected);
  const names=type=>type==='fiber'?t("סיבי חבל"):ITEMS[type]?.label??type;
  const surface=()=>({station:mode==='workbench',biome:getBiome()});
  function syncContext() {
    const next=nearWorkbench()?'workbench':'hand';
    if(next===mode)return;
    const previous=hold;hold=null;model.release();releaseCapture(previous);
    mode=next;selected=selections[mode];book=mode==='workbench';notice='';renderKey='';
  }
  function icon(type,size=32) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=24;canvas.style.width=canvas.style.height=size+'px';
    canvas.setAttribute('aria-hidden','true');canvas.getContext('2d').drawImage(itemArt(type),0,0);return canvas;
  }
  function reasonText(available,item) {
    return available.reason==='station'?t("דרוש שולחן יצירה"):available.reason==='space'?t("פנו מקום בציוד"):
      available.reason==='materials'?t("חסרים: {0}", [available.missing.map(({type,count})=>`${count} ${names(type)}`).join(' · ')]):t("החזיקו במרכז {0} שניות כדי ליצור", [item.seconds]);
  }
  function choose(id) {
    if(model.holding||!recipesForStation(mode==='workbench').some(item=>item.id===id))return;
    selected=id;selections[mode]=id;notice='';render(true);
  }
  function render(force=false) {
    if(!dialog.open)return;
    syncContext();
    const station=mode==='workbench',biome=getBiome(),job=model.state(),item=recipe(),available=recipeStatus(item,inventory,station);
    const key=`${inventory.revision}:${selected}:${book}:${mode}:${biome?.id}:${!!job}:${notice}`;
    if(!force&&key===renderKey)return;renderKey=key;
    dialog.dataset.mode=mode;dialog.dataset.biome=biome?.id??'forest';dialog.classList.toggle('hand-crafting',!station);
    document.getElementById('craft-title').textContent=station?t("שולחן יצירה"):t("יצירה בידיים");
    document.getElementById('craft-station').textContent=station?t("כלים ובנייה ליד העמדה"):t("מרכיבים על הקרקע");
    document.getElementById('craft-wheel').setAttribute('aria-label',station?t("משטח עץ עגול"):t("משטח הקרקע המקומית"));
    document.getElementById('recipe-book-tab').setAttribute('aria-expanded',String(book));
    document.getElementById('craft-book').hidden=!book;dialog.classList.toggle('book-open',book);
    recipes.replaceChildren();
    for(const candidate of recipesForStation(station)) {
      const ready=recipeStatus(candidate,inventory,station),button=document.createElement('button');
      button.type='button';button.className='recipe-card';button.dataset.recipe=candidate.id;
      button.classList.toggle('unavailable',!ready.ready);button.setAttribute('aria-pressed',String(selected===candidate.id));button.disabled=!!job;
      button.title=`${candidate.label} · ${reasonText(ready,candidate)}`;button.setAttribute('aria-label',button.title);
      const title=document.createElement('strong');title.textContent=candidate.label;
      const note=document.createElement('span');note.className='recipe-card-note';note.textContent=ready.ready?t("זמין ליצירה"):ready.reason==='station'?t("דרושה עמדה"):ready.reason==='space'?t("הציוד מלא"):t("חסרים חומרים");
      button.append(icon(candidate.output,36),title,note);button.addEventListener('click',()=>choose(candidate.id));recipes.append(button);
    }
    materials.replaceChildren();
    for(const [type,required] of Object.entries(item.cost)) {
      const owned=inventory.count(type),node=document.createElement('div');node.className='craft-material';node.dataset.material=type;
      node.classList.toggle('missing',owned<required);node.setAttribute('aria-label',t("{0}: יש {1}, צריך {2}", [names(type), owned, required]));
      const label=document.createElement('span');label.textContent=names(type);
      const count=document.createElement('b');count.dir='ltr';count.textContent=`${owned} / ${required}`;
      node.append(icon(type,28),label,count);materials.append(node);
    }
    document.getElementById('craft-result-icon').replaceChildren(icon(item.output,56));
    document.getElementById('craft-output-name').textContent=item.output==='workbench'?t("ערכת שולחן יצירה"):item.label;
    action.disabled=!available.ready;action.setAttribute('aria-label',`${item.label} · ${available.ready?t("החזיקו בעכבר או ברווח או Enter שלוש שניות ליצירה"):reasonText(available,item)}`);
    action.setAttribute('aria-pressed',String(!!job));action.classList.toggle('craft-holding',!!job);
    hint.textContent=job?t("יוצרים..."):available.ready?t("החזיקו ליצירה"):available.reason==='station'?t("דרושה עמדה"):available.reason==='space'?t("הציוד מלא"):t("חסרים חומרים");
    status.textContent=notice||(job?t("משחררים כדי לבטל · החומרים ייצרכו בסיום"):reasonText(available,item));
    progress.hidden=!job;progress.setAttribute('aria-valuenow',Math.round((job?.progress??0)*100));
    paintCraftWheel(wheel,job?.progress??0,{station,biome});
    details.replaceChildren();
    const heading=document.createElement('h4');heading.textContent=item.label;
    const description=document.createElement('p');description.textContent=item.description;
    const cost=document.createElement('div');cost.className='book-materials';
    for(const [type,n] of Object.entries(item.cost)) {
      const row=document.createElement('div');row.className='book-material';row.classList.toggle('missing',inventory.count(type)<n);
      const text=document.createElement('span');text.textContent=`${n} ${names(type)}`;row.append(icon(type,26),text);cost.append(row);
    }
    const requirement=document.createElement('p');requirement.className='recipe-help';
    requirement.textContent=item.station==='hand'?t("אפשר ליצור בידיים · 3 שניות"):t("דרוש שולחן יצירה · 3 שניות");
    details.append(heading,description,cost,requirement);
  }
  function releaseCapture(previous) {
    if(previous?.kind==='pointer'&&action.hasPointerCapture(previous.id))action.releasePointerCapture(previous.id);
  }
  function cancelHold(message=true) {
    const previous=hold,wasHolding=model.holding;hold=null;model.release();releaseCapture(previous);
    if(wasHolding&&message)notice=t("היצירה בוטלה · החומרים נשמרו");
    if(wasHolding)render(true);
  }
  function beginHold(source) {
    syncContext();
    if(!dialog.open||hold||!document.hasFocus()||document.hidden||!model.press(selected,nearWorkbench()))return false;
    hold=source;notice='';render(true);return true;
  }
  function close(){cancelHold(false);dialog.close();onToggle();renderKey='';notice='';}
  function open(){if(dialog.open)return true;if(blocked())return false;syncContext();book=mode==='workbench';dialog.showModal();onToggle();render(true);return true;}
  function toggle(){if(dialog.open)close();else open();}
  action.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false)return;
    event.preventDefault();action.focus({preventScroll:true});
    if(beginHold({kind:'pointer',id:event.pointerId}))action.setPointerCapture(event.pointerId);
  });
  action.addEventListener('pointermove',event=>{
    if(hold?.kind!=='pointer'||hold.id!==event.pointerId)return;
    const rect=action.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)cancelHold();
  });
  window.addEventListener('pointerup',event=>{if(hold?.kind==='pointer'&&event.pointerId===hold.id)cancelHold();},true);
  window.addEventListener('pointercancel',event=>{if(hold?.kind==='pointer'&&event.pointerId===hold.id)cancelHold();},true);
  action.addEventListener('lostpointercapture',event=>{if(hold?.kind==='pointer'&&event.pointerId===hold.id)cancelHold();});
  action.addEventListener('keydown',event=>{
    if(!['Space','Enter'].includes(event.code))return;
    event.preventDefault();event.stopPropagation();
    if(!event.repeat)beginHold({kind:'keyboard',code:event.code});
  });
  window.addEventListener('keyup',event=>{
    if(hold?.kind==='keyboard'&&event.code===hold.code){event.preventDefault();cancelHold();}
  },true);
  action.addEventListener('blur',()=>cancelHold());
  window.addEventListener('blur',()=>cancelHold());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelHold();});
  document.getElementById('craft-toggle').getContext('2d').drawImage(itemArt('axe'),0,0);
  document.getElementById('craft-open').addEventListener('click',toggle);
  document.getElementById('craft-close').addEventListener('click',close);
  document.getElementById('recipe-book-tab').addEventListener('click',()=>{book=!book;render(true);});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(dialog.open)return;cancelHold(false);onToggle();renderKey='';});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
  window.addEventListener('keydown',event=>{
    if(event.metaKey||event.ctrlKey||event.altKey||event.repeat)return;
    if(event.code==='KeyF'){event.preventDefault();toggle();}
    else if(event.code==='Escape'&&dialog.open){event.preventDefault();close();}
  });
  return {
    get isOpen(){return dialog.open;},open,close,
    update(dt) {
      if(!dialog.open)return;
      syncContext();
      const result=model.update(dt,mode==='workbench'),job=model.state();
      if(result) {
        const previous=hold;hold=null;releaseCapture(previous);
        notice=result.crafted?t("{0} מוכן!", [result.recipe.label]):t("לא ניתן להשלים — בדקו חומרים ומקום בציוד");
      }
      render();
      if(job) {
        paintCraftWheel(wheel,job.progress,surface());
        progress.setAttribute('aria-valuenow',Math.round(job.progress*100));
        hint.textContent=t("{0} שנ׳", [(job.recipe.seconds-job.elapsed).toFixed(1)]);
      }
      if(result?.crafted)onComplete(result.crafted);
    },
  };
}
