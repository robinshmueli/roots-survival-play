import {t} from './i18n.js';
import {ITEMS} from './items.js';

export function createInventoryDrag({dialog,bar,handGrid,grid,offhandBar,offhandGrid,inventory,icon,onEquip,ensureOpen}) {
  const status=document.getElementById('bag-drag-status');
  let drag=null,suppressClick=false;
  const targets=()=>[...handGrid.querySelectorAll('[data-hand-slot]'),...bar.querySelectorAll('[data-hand-slot]'),...grid.querySelectorAll('[data-bag-slot]'),...(offhandBar?.querySelectorAll('[data-offhand-slot]')??[]),...(offhandGrid?.querySelectorAll('[data-offhand-slot]')??[])];
  const location=button=>button.dataset.offhandSlot!==undefined?{kind:'offhand',index:0}:button.dataset.handSlot!==undefined?{kind:'hand',index:Number(button.dataset.handSlot)}:{kind:'bag',index:Number(button.dataset.bagSlot)};
  function message(text=t("קליק ימני להרמה · קליק נוסף להנחה · אפשר גם לגרור")) {status.textContent=text;}
  function clear() {
    const previous=drag;drag=null;
    for(const target of targets())target.classList.remove('drop-ready','drop-over');
    dialog.classList.remove('item-dragging');
    if(!previous)return;
    previous.source.classList.remove('drag-source');
    if(previous.ghost) {
      try{previous.ghost.hidePopover?.();}catch{}
      previous.ghost.remove();
    }
    if(previous.source.hasPointerCapture?.(previous.pointerId))previous.source.releasePointerCapture(previous.pointerId);
  }
  function cancel() {if(drag){suppressClick=true;clear();message();}}
  function targetAt(x,y) {
    const rect=dialog.getBoundingClientRect();
    const overDialog=x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;
    for(const target of targets()) {
      // The native modal makes the external bar inert; use captured coordinates
      // to allow drops onto the portion that remains visible below it.
      if(overDialog&&(bar.contains(target)||offhandBar?.contains(target)))continue;
      const box=target.getBoundingClientRect();
      if(x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom)return target;
    }
    return null;
  }
  function activate(event) {
    if(!ensureOpen()){cancel();return false;}
    drag.active=true;drag.source.classList.add('drag-source');dialog.classList.add('item-dragging');
    for(const target of targets())target.classList.add('drop-ready');
    const ghost=document.createElement('div');ghost.className='item-drag-ghost';ghost.setAttribute('aria-hidden','true');
    ghost.setAttribute('popover','manual');ghost.append(icon(drag.type));
    const count=document.createElement('span');count.className='item-count';count.textContent=inventory.stack(drag.location)?.count??0;ghost.append(count);
    dialog.append(ghost);ghost.showPopover?.();drag.ghost=ghost;
    message(t("בחרו מקום ביד או בתיק · Escape לביטול"));
    position(event);return true;
  }
  function position(event) {
    const touch=drag.pointerType==='touch';
    const x=Math.max(2,Math.min(innerWidth-60,event.clientX+(touch?-28:14)));
    const y=Math.max(2,Math.min(innerHeight-60,event.clientY+(touch?-72:14)));
    drag.ghost.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
    const target=targetAt(event.clientX,event.clientY);
    for(const button of targets())button.classList.toggle('drop-over',button===target);
  }
  function finish(event) {
    const source=drag.location,type=drag.type,target=targetAt(event.clientX,event.clientY),destination=target?location(target):null;
    clear();suppressClick=true;
    if(destination&&inventory.move(source,destination)) {
      if(destination.kind==='hand')inventory.select(destination.index);
      onEquip();message(t("{0} הועבר {1}", [ITEMS[type]?.label??t("הפריט"), destination.kind==='offhand'?t("ליד השנייה"):destination.kind==='hand'?t("ליד {0}", [destination.index+1]):t("לתיק")]));
    } else message();
  }
  document.addEventListener('pointerdown',event=>{
    if(drag?.sticky&&(event.button===0||event.button===2)) {
      event.preventDefault();event.stopImmediatePropagation();finish(event);return;
    }
    suppressClick=false;
  },true);
  document.addEventListener('pointermove',event=>{
    if(!drag||(!drag.sticky&&event.pointerId!==drag.pointerId))return;
    if(!dialog.open&&drag.active){cancel();return;}
    if(!drag.active) {
      if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;
      if(!activate(event))return;
    }
    event.preventDefault();position(event);
  },{passive:false});
  document.addEventListener('pointerup',event=>{
    if(!drag||drag.sticky||event.pointerId!==drag.pointerId||event.button!==drag.button)return;
    if(!drag.active){clear();return;}
    event.preventDefault();
    if(drag.button===2&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6) {
      // A right click picks up the stack; it follows the pointer until the next click.
      drag.sticky=true;drag.pointerId=null;suppressClick=true;position(event);return;
    }
    finish(event);
  });
  document.addEventListener('pointercancel',event=>{if(drag?.pointerId===event.pointerId)cancel();});
  document.addEventListener('click',event=>{
    if(suppressClick&&event.detail>0){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('contextmenu',event=>{
    if(drag||event.target.closest?.('[data-hand-slot],[data-bag-slot],[data-offhand-slot]'))event.preventDefault();
  });
  dialog.addEventListener('cancel',event=>{if(drag){event.preventDefault();cancel();}});
  dialog.addEventListener('dragstart',event=>event.preventDefault());
  bar.addEventListener('dragstart',event=>event.preventDefault());
  dialog.addEventListener('close',cancel);
  window.addEventListener('blur',cancel);
  window.addEventListener('keydown',event=>{if(event.code==='Escape'&&drag){event.preventDefault();cancel();}});
  document.addEventListener('visibilitychange',cancel);
  return {
    cancel,
    bindSource(button,type) {
      button.draggable=false;
      button.addEventListener('pointerdown',event=>{
        if(drag||(event.button!==0&&event.button!==2)||event.isPrimary===false)return;
        drag={type,location:location(button),source:button,pointerId:event.pointerId,pointerType:event.pointerType,button:event.button,x:event.clientX,y:event.clientY,active:false,sticky:false};
        button.setPointerCapture(event.pointerId);
        if(event.button===2){event.preventDefault();activate(event);}
      });
      button.addEventListener('lostpointercapture',event=>{if(drag?.pointerId===event.pointerId)cancel();});
    },
  };
}
