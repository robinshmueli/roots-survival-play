import {ITEMS,itemArt} from './items.js';
import {transferItems} from './storage.js';

export function createChestUI(inventory,onToggle,blocked) {
  const dialog=document.getElementById('chest-storage'),chestGrid=document.getElementById('chest-slots'),playerGrid=document.getElementById('chest-player-slots'),status=document.getElementById('chest-status');
  let object=null,renderKey='';
  function slots(container,stacks,grid,to) {
    grid.replaceChildren(...stacks.map((stack,index)=>{
      const button=document.createElement('button');button.type='button';button.className='item-slot storage-slot';button.dataset.storage=container===inventory?'player':'chest';button.dataset.storageSlot=index;
      button.disabled=!stack;button.setAttribute('aria-label',stack?`${ITEMS[stack.type]?.label??stack.type} · ${stack.count} · לחיצה להעברה`:'מקום פנוי');
      if(stack) {
        const icon=document.createElement('canvas');icon.width=icon.height=24;icon.setAttribute('aria-hidden','true');icon.getContext('2d').drawImage(itemArt(stack.type),0,0);
        const count=document.createElement('b');count.className='item-count';count.textContent=stack.count;
        const name=document.createElement('span');name.className='item-label';name.textContent=ITEMS[stack.type]?.label??stack.type;button.append(icon,count,name);
        const transfer=quantity=>{
          const accepted=transferItems(container,to,stack.type,quantity);
          status.textContent=accepted?`${accepted} ${ITEMS[stack.type]?.label??stack.type} הועברו ${to===inventory?'לציוד':'לתיבה'}`:'אין מקום להעברה — פנו מקום או ערימה';render(true);
        };
        button.addEventListener('click',()=>transfer(container.count(stack.type)));
        button.addEventListener('contextmenu',event=>{event.preventDefault();transfer(1);});
      }
      return button;
    }));
  }
  function render(force=false) {
    if(!dialog.open||!object)return;
    const key=`${inventory.revision}:${object.id}:${object.storage.revision}`;
    if(!force&&key===renderKey)return;renderKey=key;
    slots(object.storage,object.storage.snapshot().slots,chestGrid,inventory);
    const state=inventory.snapshot();slots(inventory,[...state.hands.map(type=>type?{type,count:inventory.count(type)}:null),...state.slots],playerGrid,object.storage);
    document.getElementById('chest-usage').textContent=`${object.storage.usedSlots} / 15`;
  }
  function close(){dialog.close();object=null;renderKey='';onToggle();}
  document.getElementById('chest-close').addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(dialog.open)return;object=null;renderKey='';onToggle();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  window.addEventListener('keydown',event=>{if(dialog.open&&!event.repeat&&['KeyE','Escape'].includes(event.code)){event.preventDefault();close();}});
  return {
    get isOpen(){return dialog.open;},
    open(chest) {
      if(dialog.open)return true;
      if(blocked()||chest?.type!=='chest'||!chest.storage)return false;
      object=chest;dialog.showModal();status.textContent='לחיצה להעברת ערימה · קליק ימני להעברת פריט אחד';onToggle();render(true);return true;
    },
    close,update:render,
  };
}
