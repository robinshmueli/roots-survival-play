import {t} from './i18n.js';
import { INVENTORY, COMBAT_TOOLS as CHOP_TOOLS, FOODS } from './config.js';
import { ITEMS, itemArt } from './items.js';
import {STRUCTURES} from './structures.js';
import { createInventoryDrag } from './inventory-drag.js';
import {SEEDS,seedType,TREE_SEEDS} from './tree-seeds.js';
import {SEED_BUNDLE} from './seed-stacks.js';

export function createInventoryUI(inventory, onToggle, blocked) {
  const dialog=document.getElementById('inventory'),bar=document.getElementById('hotbar-slots');
  const grid=document.getElementById('bag-grid'),handGrid=document.getElementById('bag-hands');
  const offhandBar=document.getElementById('offhand-slot'),offhandGrid=document.getElementById('bag-offhand');
  const label=document.getElementById('equipped-name'),usage=document.getElementById('bag-usage');
  const message=document.getElementById('game-message');
  document.getElementById('bag-icon').getContext('2d').drawImage(itemArt('bag'),0,0);
  let rendered=-1,messageUntil=0;
  const dragging=createInventoryDrag({dialog,bar,handGrid,grid,offhandBar,offhandGrid,inventory,icon,onEquip:()=>render(),ensureOpen:open});
  function icon(type) {
    const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;canvas.setAttribute('aria-hidden','true');
    if(type)canvas.getContext('2d').drawImage(itemArt(type),0,0);
    return canvas;
  }
  const seedDetails=stack=>stack?.type===SEED_BUNDLE?stack.seeds.map(seed=>`${TREE_SEEDS[seed.kind].name}: ${seed.count}`).join(' · '):'';
  function handButton(type,index) {
    const stack=inventory.stack({kind:'hand',index}),displayType=type===SEED_BUNDLE?seedType(stack.seeds[0].kind):type;
    const button=document.createElement('button');button.className='item-slot hand-slot';button.type='button';
    button.dataset.handSlot=index;
    button.setAttribute('aria-pressed',String(inventory.selected===index));
    button.setAttribute('aria-label',`${index+1}: ${type?ITEMS[type]?.label??type:t("יד ריקה")}`);
    button.title=`${index+1} · ${type?t("{0} · קליק ימני להרמה", [ITEMS[type]?.label??type]):t("יד ריקה")}`;
    const key=document.createElement('kbd');key.textContent=index+1;button.append(key,icon(displayType));
    const count=document.createElement('span');count.className='item-count';count.textContent=stack?.count??'';button.append(count);
    if(type)dragging.bindSource(button,type);
    if(type===SEED_BUNDLE)button.title+=' · '+seedDetails(stack);
    button.addEventListener('click',()=>{if(blocked()&&!dialog.open)return;if(inventory.selected===index&&type===SEED_BUNDLE)inventory.cycleSeed(index);else inventory.select(index);render();});return button;
  }
  function render() {
    if(rendered===inventory.revision)return;rendered=inventory.revision;
    dragging.cancel();
    const state=inventory.snapshot();bar.replaceChildren(...state.hands.map(handButton));handGrid.replaceChildren(...state.hands.map(handButton));
    const other=inventory.stack({kind:'offhand',index:0});
    for(const container of [offhandBar,offhandGrid]) {
      container.hidden=!other;container.replaceChildren();if(!other)continue;
      const caption=document.createElement('span');caption.className='offhand-caption';caption.textContent=t("יד שנייה · R");
      const button=document.createElement('button');button.type='button';button.className='item-slot offhand-slot';button.dataset.offhandSlot='0';button.title=t("יד שנייה · R להחלפה");button.setAttribute('aria-label',t("יד שנייה: {0}",[ITEMS[other.type]?.label??other.type]));
      const count=document.createElement('span');count.className='item-count';count.textContent=other.count;
      button.append(icon(inventory.offhand),count);dragging.bindSource(button,other.type);button.addEventListener('click',()=>{if(blocked()&&!dialog.open)return;inventory.swapOffhand();render();});container.append(caption,button);
    }
    const type=inventory.equipped,held=inventory.stack({kind:'hand',index:inventory.selected});
    label.textContent=type?ITEMS[type]?.label??type:t("יד ריקה");
    document.getElementById('item-action').textContent=SEEDS[type]?(held.seeds.length>1?t("לחיצה / רווח לזריעה · לחצו על הערימה ביד להחלפת סוג"):t("לחיצה / רווח לזריעה מול הדמות")):Object.hasOwn(FOODS,type)?t("לחיצה / רווח לאכילה"):type==='spear'?t("קליק לדקירה · ימני + Shift להסתערות"):CHOP_TOOLS[type]?t("מכה כל {0} שנ׳", [CHOP_TOOLS[type].cooldown]):STRUCTURES[type]?t("לחיצה להצבה · R סיבוב"):type?t("חומר גלם"):t("1–5 לבחירה");
    usage.textContent=`${inventory.usedSlots} / ${INVENTORY.slots}`;
    document.getElementById('bag-selected').textContent=t("מציידים ליד {0}", [inventory.selected+1]);
    document.getElementById('unequip').disabled=!inventory.canUnequip();
    document.getElementById('unequip').title=!inventory.canUnequip()?t("התיק מלא — אפשר להחליף עם פריט בתיק"):t("העברת הפריט מהיד לתיק");
    grid.replaceChildren(...state.slots.map((slot,index)=>{
      const button=document.createElement('button');button.type='button';button.className='item-slot bag-slot';button.dataset.bagSlot=index;
      button.classList.toggle('empty-slot',!slot);
      const name=slot?ITEMS[slot.type]?.label??slot.type:t("מקום פנוי");
      button.setAttribute('aria-label',slot?t("{0}, {1} מתוך 20. קליק ימני להרמה, גרירה או לחיצה כדי לצייד ליד {2}", [name, slot.count, inventory.selected+1]):t("מקום {0} פנוי בתיק — אפשר להניח בו פריט", [index+1]));
      button.title=slot?t("{0} · קליק ימני להרמה · {1}", [name, ITEMS[slot.type]?.description??'']):t("מקום פנוי — גררו לכאן פריט מהיד");
      if(slot?.type===SEED_BUNDLE)button.title+=' · '+seedDetails(slot);
      button.append(icon(slot?.type));
      const count=document.createElement('span');count.className='item-count';count.textContent=slot?`${slot.count}/20`:'';button.append(count);
      const caption=document.createElement('span');caption.className='item-label';caption.textContent=slot?name:'';button.append(caption);
      if(slot){dragging.bindSource(button,slot.type);button.addEventListener('click',()=>{inventory.move({kind:'bag',index},{kind:'hand',index:inventory.selected});render();});}
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
    const match=/^(?:Digit|Numpad)([12345])$/.exec(event.code);
    if(match&&!blocked()){event.preventDefault();inventory.select(Number(match[1])-1);render();}
  });
  render();
  return {
    get isOpen(){return dialog.open;},
    render,
    notify(text,seconds,duration=2.2) {message.textContent=text;message.hidden=false;messageUntil=seconds+duration;},
    update(seconds){render();if(seconds>messageUntil)message.hidden=true;},
  };
}
