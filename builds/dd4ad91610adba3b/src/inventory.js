import { INVENTORY } from './config.js';

// Every stack occupies exactly one location: a bag slot or a hand slot.
export function createInventory(starter = true,capacity = INVENTORY,initial = null) {
  const slots = Array(capacity.slots).fill(null), hands = Array(capacity.hands).fill(null);
  let selected = 0, revision = 0;
  const locations=()=>[...hands,...slots];
  const find=type=>locations().find(stack=>stack?.type===type);
  const count=type=>find(type)?.count??0;
  function container(location) {
    const list=location?.kind==='hand'?hands:location?.kind==='bag'?slots:null;
    return list&&Number.isInteger(location.index)&&location.index>=0&&location.index<list.length?list:null;
  }
  const inventory = {
    get revision() { return revision; },
    get selected() { return selected; },
    get equipped() { return hands[selected]?.type??null; },
    get usedSlots() { return slots.filter(Boolean).length; },
    snapshot() { return {slots:slots.map(stack=>stack?{...stack}:null),hands:hands.map(stack=>stack?.type??null),selected}; },
    count,
    drain() {
      const stacks=locations().filter(Boolean).map(stack=>({...stack}));
      if(stacks.length){slots.fill(null);hands.fill(null);revision++;}return stacks;
    },
    serialize(){return {slots:slots.map(stack=>stack?{...stack}:null),hands:hands.map(stack=>stack?{...stack}:null),selected};},
    restore(data) {
      if(!data||!Array.isArray(data.slots)||data.slots.length!==slots.length||!Array.isArray(data.hands)||!Number.isInteger(data.selected)||data.selected<0||data.selected>=Math.max(1,data.hands.length))return false;
      const restoredHands=data.hands.length===hands.length?data.hands:hands.length===5&&data.hands.length===3?[...data.hands,null,null]:null;
      if(!restoredHands)return false;
      const seen=new Set();
      for(const stack of [...data.hands,...data.slots]) {
        if(stack===null)continue;
        if(!stack||typeof stack.type!=='string'||!stack.type||!Number.isInteger(stack.count)||stack.count<1||stack.count>INVENTORY.stackLimit||seen.has(stack.type))return false;
        seen.add(stack.type);
      }
      data.slots.forEach((stack,i)=>slots[i]=stack?{...stack}:null);restoredHands.forEach((stack,i)=>hands[i]=stack?{...stack}:null);
      selected=data.selected;revision++;return true;
    },
    canExchange(cost,output,quantity=1) {
      if(!cost||typeof cost!=='object'||typeof output!=='string'||!output||!Number.isSafeInteger(quantity)||quantity<=0)return false;
      const entries=Object.entries(cost);
      if(entries.some(([type,n])=>!type||!Number.isSafeInteger(n)||n<=0||count(type)<n))return false;
      const remaining=count(output)-(cost[output]??0);
      if(remaining+quantity>INVENTORY.stackLimit)return false;
      return remaining>0||locations().some(stack=>!stack||stack.count-(cost[stack.type]??0)===0);
    },
    exchange(cost,output,quantity=1) {
      if(!inventory.canExchange(cost,output,quantity))return false;
      for(const [type,n] of Object.entries(cost))inventory.remove(type,n);
      return inventory.add(output,quantity)===quantity;
    },
    remove(type,quantity=1) {
      if(!Number.isSafeInteger(quantity)||quantity<=0)return 0;
      const stack=find(type);
      if(!stack||stack.count<quantity)return 0;
      stack.count-=quantity;
      if(!stack.count)for(const list of [slots,hands]) {
        const index=list.indexOf(stack);if(index>=0)list[index]=null;
      }
      revision++;return quantity;
    },
    add(type, quantity) {
      if(typeof type!=='string'||!type||!Number.isSafeInteger(quantity)||quantity<=0)return 0;
      const stack=find(type),accepted=Math.min(quantity,INVENTORY.stackLimit-(stack?.count??0));
      if(!accepted)return 0;
      if(stack)stack.count+=accepted;
      else {
        const list=hands.includes(null)?hands:slots,index=list.indexOf(null);
        if(index<0)return 0;
        list[index]={type,count:accepted};
      }
      revision++;return accepted;
    },
    select(index) {
      if(!Number.isInteger(index)||index<0||index>=hands.length)return false;
      if(selected!==index){selected=index;revision++;}return true;
    },
    move(source,target) {
      const from=container(source),to=container(target);
      if(!from||!to||!from[source.index])return false;
      if(from===to&&source.index===target.index)return true;
      [from[source.index],to[target.index]]=[to[target.index],from[source.index]];
      revision++;return true;
    },
    equip(type,index=selected) {
      const hand=hands.findIndex(stack=>stack?.type===type),bag=slots.findIndex(stack=>stack?.type===type);
      const source=hand>=0?{kind:'hand',index:hand}:{kind:'bag',index:bag};
      return inventory.move(source,{kind:'hand',index});
    },
    unequip(index=selected) {
      const free=slots.indexOf(null);
      return free>=0&&inventory.move({kind:'hand',index},{kind:'bag',index:free});
    },
  };
  if(!(initial&&inventory.restore(initial))&&starter)inventory.add('stone',1);
  return inventory;
}
