import {t} from './i18n.js';
import {ITEMS,itemArt} from './items.js';
import {COOKING,FURNACE_FUELS} from './furnace.js';
import {furnaceArt} from './furnace-art.js';
import {flameCanvas} from './torch-art.js';

export function createFurnaceUI(inventory,onToggle,blocked) {
  const dialog=document.getElementById('furnace-storage'),grid=document.getElementById('furnace-player-slots'),status=document.getElementById('furnace-status');
  const flame=document.getElementById('furnace-flame'),fire=flame.getContext('2d'),title=document.getElementById('furnace-title-art').getContext('2d');
  const ovens=Array.from({length:5},(_,i)=>furnaceArt(i)),flames=Array.from({length:4},(_,i)=>flameCanvas(i));
  fire.imageSmoothingEnabled=title.imageSmoothingEnabled=false;
  let object=null,key='',notice='',painted=-1;
  function button(stack,action,label,placeholder=null) {
    const button=document.createElement('button');button.type='button';button.className='item-slot storage-slot';button.disabled=!stack;
    button.setAttribute('aria-label',label+(stack?` · ${ITEMS[stack.type].label} · ${stack.count}`:t(" · פנוי")));
    if(stack) {
      const canvas=document.createElement('canvas');canvas.width=canvas.height=24;canvas.getContext('2d').drawImage(itemArt(stack.type),0,0);
      const count=document.createElement('b');count.className='item-count';count.textContent=stack.count;
      const name=document.createElement('span');name.className='item-label';name.textContent=ITEMS[stack.type].label;button.append(canvas,count,name);
      button.addEventListener('click',()=>action(20));button.addEventListener('contextmenu',event=>{event.preventDefault();action(1);});
    } else if(placeholder) {
      const canvas=document.createElement('canvas');canvas.width=canvas.height=24;canvas.className='slot-placeholder';canvas.getContext('2d').drawImage(itemArt(placeholder),0,0);
      const name=document.createElement('span');name.className='item-label';name.textContent=label;button.append(canvas,name);
    } else button.textContent=label;
    return button;
  }
  function render(force=false) {
    if(!dialog.open||!object)return;
    const state=object.furnace.state(),next=`${inventory.revision}:${state.fuel}:${state.coal}:${state.input?.type}:${state.input?.count}:${state.output?.type}:${state.output?.count}`;
    if(force||key!==next) {
      key=next;
      for(const [slot,stack,label,placeholder] of [['fuel',state.fuel?{type:'log',count:state.fuel}:null,t("בול עץ"),'log'],['coal',state.coal?{type:'coal',count:state.coal}:null,t("פחם"),'coal'],['input',state.input,t("בשר נא או עפרה"),'iron-ore'],['output',state.output,t("תוצר מוכן"),'iron']]) {
        const node=button(stack,quantity=>{const n=object.furnace.take(slot,inventory,quantity);notice=n?t("הפריטים עברו לציוד"):t("אין מקום בציוד — פנו ערימה או מקום");render(true);},label,placeholder);
        node.dataset.furnaceSlot=slot;document.getElementById(`furnace-${slot}`).replaceChildren(node);
      }
      const data=inventory.serialize();grid.replaceChildren(...[...data.hands,...data.slots,...(data.offhand?[data.offhand]:[])].map(stack=>{
        const node=button(stack,quantity=>{const n=object.furnace.deposit(inventory,stack.type,quantity);notice=n?t("הפריטים הוכנסו לתנור"):Object.hasOwn(FURNACE_FUELS,stack.type)?t("תא הדלק מהסוג הזה מלא"):t("תא החומרים מלא או מכיל חומר מסוג אחר");render(true);},t("מקום פנוי"));
        node.dataset.furnaceItem=stack?.type??'';if(stack&&!COOKING[stack.type]&&!Object.hasOwn(FURNACE_FUELS,stack.type))node.disabled=true;return node;
      }));
    }
    const progress=state.progress/5*100,meter=document.getElementById('furnace-progress');meter.setAttribute('aria-valuenow',Math.round(progress));meter.firstElementChild.style.width=progress+'%';
    document.getElementById('furnace-progress-label').textContent=`${state.progress.toFixed(1)} / 5s`;
    flame.dataset.burning=String(state.burning);dialog.dataset.burning=String(state.burning);
    const frame=state.burning?1+Math.floor(performance.now()/125)%4:0;
    if(painted!==frame){painted=frame;title.clearRect(0,0,64,64);title.drawImage(ovens[frame],0,0);fire.clearRect(0,0,32,40);fire.drawImage(itemArt('coal'),8,24,16,16);if(frame)fire.drawImage(flames[frame-1],4,0,24,32);}
    document.getElementById('furnace-heat').textContent=state.burning?t("{0} · {1} שנ׳", [ITEMS[state.burnType].label, Math.ceil(state.burn)]):t("התנור כבוי");
    document.getElementById('furnace-fuel-info').textContent=t("עץ: {0} שנ׳ · פחם: {1} שנ׳ · מנה: 5 שנ׳", [FURNACE_FUELS.log, FURNACE_FUELS.coal]);
    status.textContent=notice||(state.input?(state.output&&state.output.type!==COOKING[state.input.type].output||state.output?.count===20?t("אספו את התוצר המוכן כדי להמשיך"):state.burning?(state.input.type==='iron-ore'?t("הברזל מותך..."):t("הבשר מתבשל...")):state.fuel||state.coal?t("מוכן להדלקה"):t("הוסיפו עץ או פחם כדלק")):t("בחרו בשר נא או עפרת ברזל, והוסיפו עץ או פחם כדלק"));
  }
  function close(){dialog.close();object=null;key='';notice='';onToggle();}
  document.getElementById('furnace-close').addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{object=null;key='';onToggle();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  window.addEventListener('keydown',event=>{if(dialog.open&&!event.repeat&&['KeyE','Escape'].includes(event.code)){event.preventDefault();close();}});
  return {
    get isOpen(){return dialog.open;},
    open(furnace){if(blocked()||furnace?.type!=='furnace')return false;object=furnace;notice='';dialog.showModal();onToggle();render(true);return true;},
    close,update:render,
  };
}
