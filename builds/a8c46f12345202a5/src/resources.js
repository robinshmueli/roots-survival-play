import { HARVEST, DAY_CYCLE, DIFFICULTY } from './config.js';

const cycleSeconds=Object.values(DAY_CYCLE.phaseSeconds).reduce((sum,duration)=>sum+duration,0);

// Smaller crowns/trunks take fewer strikes; full-size trees keep their original strength.
export function treeMaxHealth(tree) {
  const size=Number.isFinite(tree?.size)&&tree.size>0?Math.min(1,tree.size):1;
  return Math.max(1,Math.round(HARVEST.hits*size*size));
}

export function treeBodyOpacity(state,seconds) {
  if(!state?.felled)return 1;
  const fadeStart=state.fallAt+HARVEST.fallTime+HARVEST.groundTime;
  const t=Math.max(0,Math.min(1,(seconds-fadeStart)/HARVEST.fadeTime));
  return 1-t*t*(3-2*t);
}

// Session state is independent of streamed meshes: chopped trees and uncollected loot
// survive leaving an area, including a tree whose fall finishes outside the viewport.
export function createResources(random = Math.random,initial=null) {
  const trees=new Map(initial?.trees??[]), drops=new Map((initial?.drops??[]).map(drop=>[drop.id,{...drop}])), gathered=new Map(initial?.gathered??[]);
  let harvestSequence=initial?.harvestSequence??0,revision=0;
  return {
    trees, drops, gathered,
    get revision(){return revision;},
    serialize(){return {harvestSequence,trees:[...trees].map(([id,state])=>{const {tree,...data}=state;return [id,{...data,felled:!!data.felled,dropped:!!data.dropped}];}),drops:[...drops.values()].map(drop=>({...drop})),gathered:[...gathered]};},
    remainingForage(object) {return gathered.get(object.id)??object.count;},
    health(tree) { return trees.get(typeof tree==='object'?tree.id:tree)?.health ?? treeMaxHealth(tree); },
    standing(id) { return !trees.get(id)?.felled; },
    bodyVisible(id,seconds) {
      const state=trees.get(id);
      return !!state?.felled && treeBodyOpacity(state,seconds)>0;
    },
    hit(tree, seconds, direction,damage=1) {
      if(tree.type!=='tree'||!tree.id||!this.standing(tree.id))return null;
      const state=trees.get(tree.id)??{health:treeMaxHealth(tree),felled:false};
      state.health=Math.max(0,state.health-Math.max(1,Math.floor(Number.isFinite(damage)?damage:1)));state.hitAt=seconds;
      if(!state.health) {
        state.felled=true;state.fallAt=seconds;state.tree=tree;
        state.harvest=++harvestSequence;
        state.appleYield=tree.kind==='fruit'?DIFFICULTY.apples[0]+Math.floor(random()*(DIFFICULTY.apples[1]-DIFFICULTY.apples[0]+1)):0;
        state.cherryYield=tree.kind==='cherry'?2+Math.floor(random()*3):0;
        // Regrow at the first sunrise after the stump has formed, on the shared day clock.
        state.regrowAt=(Math.floor((seconds+HARVEST.fallTime)/cycleSeconds)+1)*cycleSeconds;
        state.fallDirection=Math.abs(direction.x)>.15?Math.sign(direction.x):(tree.x>0?1:-1);
      }
      trees.set(tree.id,state);revision++;
      return {health:state.health,felled:state.felled};
    },
    update(seconds) {
      const landed=[],regrown=[];
      for(const [id,state] of trees) {
        if(!state.felled)continue;
        if(!state.dropped&&seconds>=state.fallAt+HARVEST.fallTime) {
          const tree=state.tree,amount=Math.max(1,(tree.woodYield??2)+DIFFICULTY.logBonus);
          for(let i=0;i<amount;i++) {
            const angle=i/amount*Math.PI*2+.65;
            const drop={id:`${id}:harvest:${state.harvest}:log:${i}`,type:'log',count:1,x:tree.x+Math.cos(angle)*.85,y:tree.y+Math.sin(angle)*.85,createdAt:state.fallAt+HARVEST.fallTime};
            drops.set(drop.id,drop);
          }
          for(const [type,count] of [['apple',state.appleYield],['cherry',state.cherryYield??0]])for(let i=0;i<count;i++) {
            const angle=i/count*Math.PI*2-.9;
            const drop={id:`${id}:harvest:${state.harvest}:${type}:${i}`,type,count:1,x:tree.x+Math.cos(angle)*1.1,y:tree.y+Math.sin(angle)*1.1,createdAt:state.fallAt+HARVEST.fallTime};
            drops.set(drop.id,drop);
          }
          state.dropped=true;revision++;
          landed.push({tree,at:state.fallAt+HARVEST.fallTime});
        }
        if(seconds>=state.regrowAt) {regrown.push(state.tree);trees.delete(id);revision++;}
      }
      return {landed,regrown};
    },
    nearestDrop(position,forage=[]) {
      let nearest=null,best=HARVEST.pickupRadius;
      for(const drop of drops.values()) {
        const distance=Math.hypot(drop.x-position.x,drop.y-position.y);
        if(distance<=best){nearest=drop;best=distance;}
      }
      for(const object of forage) {
        const count=this.remainingForage(object);if(count<=0)continue;
        const distance=Math.hypot(object.x-position.x,object.y-position.y);
        if(distance<=best&&(!nearest||distance<best)){nearest={...object,count};best=distance;}
      }
      return nearest;
    },
    collect(position, inventory,forage=[]) {
      const drop=this.nearestDrop(position,forage);
      if(!drop)return {collected:0,full:false,type:null};
      const accepted=inventory.add(drop.type,drop.count);
      drop.count-=accepted;if(accepted)revision++;
      if(drop.source==='forage') {
        if(accepted)gathered.set(drop.id,drop.count);
      } else if(!drop.count)drops.delete(drop.id);
      return {collected:accepted,full:drop.count>0,type:drop.type};
    },
  };
}
