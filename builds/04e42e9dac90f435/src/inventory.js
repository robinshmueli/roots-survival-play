import { INVENTORY } from './config.js';
import {seedType} from './tree-seeds.js';
import {SEED_BUNDLE,seedKind,isSeedStack,cloneStack,validSeedBundle,stackContents,seedCount,takeSeeds,appendSeeds} from './seed-stacks.js';

// Every slot holds up to 20 items. Repeated types can occupy several slots;
// mixed seed bundles retain the species of every seed.
export function createInventory(starter = true,capacity = INVENTORY,initial = null) {
  const slots = Array(capacity.slots).fill(null), hands = Array(capacity.hands).fill(null),offhand=[null];
  let selected = 0, revision = 0;
  const locations=()=>[...hands,...slots,...offhand];
  const count=type=>{
    if(typeof type!=='string'||!type)return 0;
    const kind=seedKind(type);
    return kind?locations().reduce((sum,stack)=>sum+seedCount(stack,kind),0):type===SEED_BUNDLE?locations().reduce((sum,stack)=>sum+(stack?.type===SEED_BUNDLE?stack.count:0),0):locations().reduce((sum,stack)=>sum+(stack?.type===type?stack.count:0),0);
  };
  function container(location) {
    const list=location?.kind==='hand'?hands:location?.kind==='bag'?slots:location?.kind==='offhand'&&hands.length?offhand:null;
    return list&&Number.isInteger(location.index)&&location.index>=0&&location.index<list.length?list:null;
  }
  const empty=(preferBag=false)=>{for(const list of preferBag?[slots,hands]:[hands,slots]){const index=list.indexOf(null);if(index>=0)return {list,index};}return null;};
  function clearEmpty(stack) {if(stack.count)return;for(const list of [hands,slots,offhand]){const index=list.indexOf(stack);if(index>=0)list[index]=null;}}
  function contents() {
    const result=new Map();
    for(const stack of locations())for(const item of stackContents(stack))result.set(item.type,(result.get(item.type)??0)+item.count);
    return [...result].map(([type,count])=>({type,count}));
  }
  function rawStacks() {
    const result=[];for(const item of contents()){let remaining=item.count;while(remaining){const n=Math.min(remaining,INVENTORY.stackLimit);result.push({type:item.type,count:n});remaining-=n;}}return result;
  }
  const inventory = {
    get revision() { return revision; },
    get selected() { return selected; },
    get equipped() {const stack=hands[selected];return stack?.type===SEED_BUNDLE?seedType(stack.seeds[0].kind):stack?.type??null;},
    get offhand(){return offhand[0]?.type===SEED_BUNDLE?seedType(offhand[0].seeds[0].kind):offhand[0]?.type??null;},
    swapOffhand(){if(!hands.length||!hands[selected]&&!offhand[0])return false;[hands[selected],offhand[0]]=[offhand[0],hands[selected]];revision++;return true;},
    get usedSlots() { return slots.filter(Boolean).length; },
    stack(location) {const list=container(location);return list?cloneStack(list[location.index]):null;},
    snapshot() { return {slots:slots.map(cloneStack),hands:hands.map(stack=>stack?.type??null),selected}; },
    count,contents,rawStacks,
    drain() {
      const stacks=rawStacks();
      if(stacks.length){slots.fill(null);hands.fill(null);offhand[0]=null;revision++;}return stacks;
    },
    serialize(){return {slots:slots.map(cloneStack),hands:hands.map(cloneStack),selected,...(offhand[0]?{offhand:cloneStack(offhand[0])}:{})};},
    restore(data) {
      if(!data||!Array.isArray(data.slots)||data.slots.length!==slots.length||!Array.isArray(data.hands)||!Number.isInteger(data.selected)||data.selected<0||data.selected>=Math.max(1,data.hands.length))return false;
      const restoredHands=data.hands.length===hands.length?data.hands:hands.length===5&&data.hands.length===3?[...data.hands,null,null]:null;
      if(!restoredHands)return false;
      if(!hands.length&&data.offhand)return false;
      for(const stack of [...restoredHands,...data.slots,data.offhand??null]) {
        if(stack===null)continue;
        if(!stack||typeof stack.type!=='string'||!stack.type||!Number.isInteger(stack.count)||stack.count<1||stack.count>INVENTORY.stackLimit)return false;
        if(isSeedStack(stack)) {
          if(stack.type===SEED_BUNDLE&&!validSeedBundle(stack,INVENTORY.stackLimit))return false;
        }
      }
      data.slots.forEach((stack,i)=>slots[i]=cloneStack(stack));restoredHands.forEach((stack,i)=>hands[i]=cloneStack(stack));offhand[0]=cloneStack(data.offhand??null);selected=data.selected;
      // Combine legacy species-specific slots, keeping the selected seed hand
      // first. Existing mixed bundles retain their exact locations and order.
      if(locations().some(stack=>seedKind(stack?.type))) {
        const homes=[...hands.map((_,index)=>({list:hands,index})),...slots.map((_,index)=>({list:slots,index})),{list:offhand,index:0}].filter(home=>isSeedStack(home.list[home.index]));
        homes.sort((a,b)=>Number(b.list===hands&&b.index===selected)-Number(a.list===hands&&a.index===selected));
        const seeds=new Map();for(const home of homes)for(const item of stackContents(home.list[home.index])){const kind=seedKind(item.type);seeds.set(kind,(seeds.get(kind)??0)+item.count);}
        for(const home of homes)home.list[home.index]=null;
        let index=0;
        for(const [kind,total] of seeds) {let remaining=total;while(remaining){const home=homes[index];let stack=home.list[home.index];if(!stack)home.list[home.index]=stack={type:SEED_BUNDLE,count:0,seeds:[]};const n=Math.min(remaining,INVENTORY.stackLimit-stack.count);appendSeeds(stack,[{kind,count:n}]);remaining-=n;if(stack.count===INVENTORY.stackLimit)index++;}}
      }
      revision++;return true;
    },
    canExchange(cost,output,quantity=1) {
      if(!cost||typeof cost!=='object'||typeof output!=='string'||!output||output===SEED_BUNDLE||!Number.isSafeInteger(quantity)||quantity<=0)return false;
      const entries=Object.entries(cost);
      if(entries.some(([type,n])=>!type||type===SEED_BUNDLE||!Number.isSafeInteger(n)||n<=0||count(type)<n))return false;
      const preview=createInventory(false,capacity,inventory.serialize());
      for(const [type,n] of entries)preview.remove(type,n);
      return preview.add(output,quantity)===quantity;
    },
    exchange(cost,output,quantity=1) {
      if(!inventory.canExchange(cost,output,quantity))return false;
      for(const [type,n] of Object.entries(cost))inventory.remove(type,n);
      return inventory.add(output,quantity)===quantity;
    },
    remove(type,quantity=1,preferred=null) {
      if(!Number.isSafeInteger(quantity)||quantity<=0||count(type)<quantity)return 0;
      const kind=seedKind(type),preferredList=container(preferred),first=preferredList?.[preferred.index]??hands[selected];
      const ordered=locations().filter(stack=>kind?seedCount(stack,kind)>0:stack?.type===type);
      ordered.sort((a,b)=>Number(b===first)-Number(a===first));let remaining=quantity;
      for(const stack of ordered) {
        const n=Math.min(remaining,kind?seedCount(stack,kind):stack.count);if(!n)continue;
        if(kind){const seed=stack.seeds.find(seed=>seed.kind===kind);seed.count-=n;stack.count-=n;stack.seeds=stack.seeds.filter(seed=>seed.count);}
        else if(type===SEED_BUNDLE)takeSeeds(stack,n);else stack.count-=n;
        remaining-=n;clearEmpty(stack);if(!remaining)break;
      }
      revision++;return quantity;
    },
    add(type, quantity) {
      if(typeof type!=='string'||!type||type===SEED_BUNDLE||!Number.isSafeInteger(quantity)||quantity<=0)return 0;
      const kind=seedKind(type);
      if(kind) {
        let remaining=quantity,accepted=0;const overflow=locations().some(stack=>stack?.type===SEED_BUNDLE);
        while(remaining) {
          let stack=locations().find(stack=>stack?.type===SEED_BUNDLE&&stack.count<INVENTORY.stackLimit);
          if(!stack){const free=empty(overflow||accepted>0);if(!free)break;free.list[free.index]=stack={type:SEED_BUNDLE,count:0,seeds:[]};}
          const n=Math.min(remaining,INVENTORY.stackLimit-stack.count);appendSeeds(stack,[{kind,count:n}]);remaining-=n;accepted+=n;
        }
        if(accepted)revision++;return accepted;
      }
      let remaining=quantity,accepted=0;const overflow=count(type)>0;
      for(const stack of locations())if(stack?.type===type&&stack.count<INVENTORY.stackLimit) {
        const n=Math.min(remaining,INVENTORY.stackLimit-stack.count);stack.count+=n;remaining-=n;accepted+=n;if(!remaining)break;
      }
      while(remaining) {
        const free=empty(overflow||accepted>0);if(!free)break;
        const n=Math.min(remaining,INVENTORY.stackLimit);free.list[free.index]={type,count:n};remaining-=n;accepted+=n;
      }
      if(accepted)revision++;return accepted;
    },
    select(index) {
      if(!Number.isInteger(index)||index<0||index>=hands.length)return false;
      if(selected!==index){selected=index;revision++;}return true;
    },
    cycleSeed(index=selected) {
      const stack=hands[index];if(stack?.type!==SEED_BUNDLE||stack.seeds.length<2)return false;
      stack.seeds.push(stack.seeds.shift());revision++;return true;
    },
    move(source,target) {
      const from=container(source),to=container(target);
      if(!from||!to||!from[source.index])return false;
      if(from===to&&source.index===target.index)return true;
      const moving=from[source.index],destination=to[target.index];
      if(moving.type===destination?.type) {
        const quantity=Math.min(moving.count,INVENTORY.stackLimit-destination.count);if(!quantity)return false;
        if(moving.type===SEED_BUNDLE)appendSeeds(destination,takeSeeds(moving,quantity));else {moving.count-=quantity;destination.count+=quantity;}clearEmpty(moving);
      } else [from[source.index],to[target.index]]=[destination,moving];
      revision++;return true;
    },
    equip(type,index=selected) {
      if(typeof type!=='string'||!type||!Number.isInteger(index)||index<0||index>=hands.length)return false;
      const kind=seedKind(type),matches=stack=>kind?seedCount(stack,kind)>0:stack?.type===type;
      if(matches(hands[index])) {
        const held=hands[index];if(kind&&held.seeds[0].kind!==kind){const at=held.seeds.findIndex(seed=>seed.kind===kind);held.seeds.unshift(...held.seeds.splice(at,1));revision++;}return true;
      }
      const hand=hands.findIndex(matches),bag=slots.findIndex(matches),other=hand<0&&bag<0&&matches(offhand[0]),stack=hand>=0?hands[hand]:other?offhand[0]:slots[bag];
      if(kind&&stack!==hands[index]&&hands[index]?.type===SEED_BUNDLE&&hands[index].count===INVENTORY.stackLimit)return false;
      if(kind&&stack?.type===SEED_BUNDLE&&stack.seeds[0].kind!==kind){const at=stack.seeds.findIndex(seed=>seed.kind===kind);stack.seeds.unshift(...stack.seeds.splice(at,1));revision++;}
      const source=hand>=0?{kind:'hand',index:hand}:other?{kind:'offhand',index:0}:{kind:'bag',index:bag},moved=inventory.move(source,{kind:'hand',index}),held=hands[index];
      if(moved&&kind&&held.type===SEED_BUNDLE&&held.seeds[0].kind!==kind){const at=held.seeds.findIndex(seed=>seed.kind===kind);held.seeds.unshift(...held.seeds.splice(at,1));revision++;}
      return moved;
    },
    canUnequip(index=selected) {const stack=hands[index];return !!stack&&slots.some(slot=>!slot||slot.type===stack.type&&slot.count<INVENTORY.stackLimit);},
    unequip(index=selected) {
      const stack=hands[index];if(!stack)return false;
      const empty=slots.indexOf(null),partial=slots.findIndex(slot=>slot?.type===stack.type&&slot.count<INVENTORY.stackLimit),target=empty>=0?empty:partial;
      return target>=0&&inventory.move({kind:'hand',index},{kind:'bag',index:target});
    },
  };
  if(!(initial&&inventory.restore(initial))&&starter)inventory.add('stone',1);
  return inventory;
}
