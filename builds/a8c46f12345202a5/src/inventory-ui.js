import { INVENTORY, CHOP_TOOLS, FOODS } from './config.js';
import { ITEMS, itemArt } from './items.js';
import {STRUCTURES} from './structures.js';
import { createInventoryDrag } from './inventory-drag.js';

export function createInventoryUI(inventory, onToggle, blocked) {
  const dialog=document.getElementById('inventory'),bar=document.getElementById('hotbar-slots');
  const grid=document.getElementById('bag-grid'),handGrid=document.getElementById('bag-hands');
  const label=document.getElementById('equipped-name'),usage=document.getElementById('bag-usage');
  const message=document.getElementById('game-message');
  document.getElementById('bag-icon').getContext('2d').drawImage(itemArt('bag'),0,0);
  let rendered=-1,messageUntil=0;
  const dragging=createInventoryDrag({dialog,bar,handGrid,grid,inventory,icon,onEquip:()=>render(),ensureOpen:open});
  function icon(type) {
    const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;canvas.setAttribute('aria-hidden','true');
    if(type)canvas.getContext('2d').drawImage(itemArt(type),0,0);
    return canvas;
  }
  function handButton(type,index) {
    const button=document.createElement('button');button.className='item-slot hand-slot';button.type='button';
    button.dataset.handSlot=index;
    button.setAttribute('aria-pressed',String(inventory.selected===index));
    button.setAttribute('aria-label',`${index+1}: ${type?ITEMS[type]?.label??type:'יד ריקה'}`);
    button.title=`${index+1} · ${type?`${ITEMS[type]?.label??type} · קליק ימני להרמה`:'יד ריקה'}`;
    const key=document.createElement('kbd');key.textContent=index+1;button.append(key,icon(type));
    const count=document.createElement('span');count.className='item-count';count.textContent=type?inventory.count(type):'';button.append(count);
    if(type)dragging.bindSource(button,type);
    button.addEventListener('click',()=>{inventory.select(index);render();});return button;
  }
  function render() {
    if(rendered===inventory.revision)return;rendered=inventory.revision;
    dragging.cancel();
    const state=inventory.snapshot();bar.replaceChildren(...state.hands.map(handButton));handGrid.replaceChildren(...state.hands.map(handButton));
    const type=inventory.equipped;
    label.textContent=type?ITEMS[type]?.label??type:'יד ריקה';
    document.getElementById('item-action').textContent=Object.hasOwn(FOODS,type)?'לחיצה / רווח לאכילה':CHOP_TOOLS[type]?`מכה כל ${CHOP_TOOLS[type].cooldown} שנ׳`:STRUCTURES[type]?'לחיצה להצבה · R סיבוב':type?'חומר גלם':'1–3 לבחירה';
    usage.textContent=`${inventory.usedSlots} / ${INVENTORY.slots}`;
    document.getElementById('bag-selected').textContent=`מציידים ליד ${inventory.selected+1}`;
    document.getElementById('unequip').disabled=!type||inventory.usedSlots>=INVENTORY.slots;
    document.getElementById('unequip').title=inventory.usedSlots>=INVENTORY.slots?'התיק מלא — אפשר להחליף עם פריט בתיק':'העברת הפריט מהיד לתיק';
    grid.replaceChildren(...state.slots.map((slot,index)=>{
      const button=document.createElement('button');button.type='button';button.className='item-slot bag-slot';button.dataset.bagSlot=index;
      button.classList.toggle('empty-slot',!slot);
      const name=slot?ITEMS[slot.type]?.label??slot.type:'מקום פנוי';
      button.setAttribute('aria-label',slot?`${name}, ${slot.count} מתוך 20. קליק ימני להרמה, גרירה או לחיצה כדי לצייד ליד ${inventory.selected+1}`:`מקום ${index+1} פנוי בתיק — אפשר להניח בו פריט`);
      button.title=slot?`${name} · קליק ימני להרמה · ${ITEMS[slot.type]?.description??''}`:'מקום פנוי — גררו לכאן פריט מהיד';
      button.append(icon(slot?.type));
      const count=document.createElement('span');count.className='item-count';count.textContent=slot?`${slot.count}/20`:'';button.append(count);
      const caption=document.createElement('span');caption.className='item-label';caption.textContent=slot?name:'';button.append(caption);
      if(slot){dragging.bindSource(button,slot.type);button.addEventListener('click',()=>{inventory.equip(slot.type);render();});}
      return button;
    }));
  }
  function close(){dragging.cancel();dialog.close();onToggle();}
  function open(){if(dialog.open)return true;if(blocked())return false;dialog.showModal();onToggle();render();return true;}
  function toggle(){if(dialog.open)close();else open();}
  document.getElementById('bag-toggle').addEventListener('click',toggle);
  document.getElementById('inventory-close').addEventListener('click',close);
  document.getElementById('unequip').addEventListener('click',()=>{inventory.unequip();render();});
  dialog.addEventListener('close',onToggle);dialog.addEventListener('cancel',onToggle);
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  window.addEventListener('keydown',event=>{
    if(event.metaKey||event.ctrlKey||event.altKey||event.repeat)return;
    if(event.code==='KeyC' && (!blocked() || dialog.open)) {
      event.preventDefault();toggle();return;
    }
    const match=/^(?:Digit|Numpad)([123])$/.exec(event.code);
    if(match&&!blocked()){event.preventDefault();inventory.select(Number(match[1])-1);render();}
  });
  render();
  return {
    get isOpen(){return dialog.open;},
    render,
    notify(text,seconds) {message.textContent=text;message.hidden=false;messageUntil=seconds+2.2;},
    update(seconds){render();if(seconds>messageUntil)message.hidden=true;},
  };
}
