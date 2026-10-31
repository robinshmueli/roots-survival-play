import {ITEMS,itemArt} from './items.js';
import {COOKING,FURNACE_FUEL_SECONDS} from './furnace.js';

export function createFurnaceUI(inventory,onToggle,blocked) {
  const dialog=document.getElementById('furnace-storage'),grid=document.getElementById('furnace-player-slots'),status=document.getElementById('furnace-status');
  let object=null,key='',notice='';
  function button(stack,action,label) {
    const button=document.createElement('button');button.type='button';button.className='item-slot storage-slot';button.disabled=!stack;
    button.setAttribute('aria-label',label+(stack?` · ${ITEMS[stack.type].label} · ${stack.count}`:' · פנוי'));
    if(stack) {
      const canvas=document.createElement('canvas');canvas.width=canvas.height=24;canvas.getContext('2d').drawImage(itemArt(stack.type),0,0);
      const count=document.createElement('b');count.className='item-count';count.textContent=stack.count;
      const name=document.createElement('span');name.className='item-label';name.textContent=ITEMS[stack.type].label;button.append(canvas,count,name);
      button.addEventListener('click',()=>action(20));button.addEventListener('contextmenu',event=>{event.preventDefault();action(1);});
    } else button.textContent=label;
    return button;
  }
  function render(force=false) {
    if(!dialog.open||!object)return;
    const state=object.furnace.state(),next=`${inventory.revision}:${state.fuel}:${state.input?.type}:${state.input?.count}:${state.output?.type}:${state.output?.count}`;
    if(force||key!==next) {
      key=next;
      for(const [slot,stack,label] of [['fuel',state.fuel?{type:'log',count:state.fuel}:null,'עץ כדלק'],['input',state.input,'בשר נא'],['output',state.output,'אוכל מוכן']]) {
        const node=button(stack,quantity=>{const n=object.furnace.take(slot,inventory,quantity);notice=n?'הפריטים עברו לציוד':'אין מקום בציוד — פנו ערימה או מקום';render(true);},label);
        node.dataset.furnaceSlot=slot;document.getElementById(`furnace-${slot}`).replaceChildren(node);
      }
      const data=inventory.serialize();grid.replaceChildren(...[...data.hands,...data.slots].map(stack=>{
        const node=button(stack,quantity=>{const n=object.furnace.deposit(inventory,stack.type,quantity);notice=n?'הפריטים הוכנסו לתנור':stack.type==='log'?'תא העצים מלא':'תא הבשר מלא או מכיל בשר מסוג אחר';render(true);},'מקום פנוי');
        node.dataset.furnaceItem=stack?.type??'';if(stack&&!COOKING[stack.type]&&stack.type!=='log')node.disabled=true;return node;
      }));
    }
    const progress=state.progress/5*100,meter=document.getElementById('furnace-progress');meter.setAttribute('aria-valuenow',Math.round(progress));meter.firstElementChild.style.width=progress+'%';
    document.getElementById('furnace-flame').dataset.burning=String(state.burning);
    document.getElementById('furnace-heat').textContent=state.burning?`בוער · ${Math.ceil(state.burn)} שנ׳ חום`:'התנור כבוי';
    document.getElementById('furnace-fuel-info').textContent=`עץ אחד בוער ${FURNACE_FUEL_SECONDS} שנ׳ · בישול מנה: 5 שנ׳`;
    status.textContent=notice||(state.input?(state.output&&state.output.type!==COOKING[state.input.type].output||state.output?.count===20?'אספו את האוכל המוכן כדי להמשיך':state.burning?'הבשר מתבשל...':state.fuel?'מוכן להדלקה':'הוסיפו עץ כדלק'):'בחרו בשר נא ועץ מהציוד כדי לבשל');
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
