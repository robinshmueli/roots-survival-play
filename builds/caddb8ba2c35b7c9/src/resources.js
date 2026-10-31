import { HARVEST, DAY_CYCLE } from './config.js';

const cycleSeconds=Object.values(DAY_CYCLE.phaseSeconds).reduce((sum,duration)=>sum+duration,0);

// Smaller crowns/trunks take fewer strikes; full-size trees keep their original strength.
export function treeMaxHealth(tree) {
  const size=Number.isFinite(tree?.size)&&tree.size>0?Math.min(1,tree.size):1;
  return Math.max(1,Math.round(HARVEST.hits*size*size));
}

// Session state is independent of streamed meshes: chopped trees and uncollected loot
// survive leaving an area, including a tree whose fall finishes outside the viewport.
export function createResources(random = Math.random) {
  const trees=new Map(), drops=new Map();
  let harvestSequence=0;
  return {
    trees, drops,
    health(tree) { return trees.get(typeof tree==='object'?tree.id:tree)?.health ?? treeMaxHealth(tree); },
    standing(id) { return !trees.get(id)?.felled; },
    bodyVisible(id,seconds) {
      const state=trees.get(id);
      return !!state?.felled && seconds < state.fallAt+HARVEST.fallTime+HARVEST.groundTime;
    },
    hit(tree, seconds, direction) {
      if(tree.type!=='tree'||!tree.id||!this.standing(tree.id))return null;
      const state=trees.get(tree.id)??{health:treeMaxHealth(tree),felled:false};
      state.health--;state.hitAt=seconds;
      if(!state.health) {
        state.felled=true;state.fallAt=seconds;state.tree=tree;
        state.harvest=++harvestSequence;
        state.appleYield=tree.kind==='fruit'?(random()<.5?1:2):0;
        // Regrow at the first sunrise after the stump has formed, on the shared day clock.
        state.regrowAt=(Math.floor((seconds+HARVEST.fallTime)/cycleSeconds)+1)*cycleSeconds;
        state.fallDirection=Math.abs(direction.x)>.15?Math.sign(direction.x):(tree.x>0?1:-1);
      }
      trees.set(tree.id,state);
      return {health:state.health,felled:state.felled};
    },
    update(seconds) {
      const landed=[],regrown=[];
      for(const [id,state] of trees) {
        if(!state.felled)continue;
        if(!state.dropped&&seconds>=state.fallAt+HARVEST.fallTime) {
          const tree=state.tree,amount=tree.woodYield??2;
          for(let i=0;i<amount;i++) {
            const angle=i/amount*Math.PI*2+.65;
            const drop={id:`${id}:harvest:${state.harvest}:log:${i}`,type:'log',count:1,x:tree.x+Math.cos(angle)*.85,y:tree.y+Math.sin(angle)*.85,createdAt:state.fallAt+HARVEST.fallTime};
            drops.set(drop.id,drop);
          }
          for(let i=0;i<state.appleYield;i++) {
            const angle=i/state.appleYield*Math.PI*2-.9;
            const drop={id:`${id}:harvest:${state.harvest}:apple:${i}`,type:'apple',count:1,x:tree.x+Math.cos(angle)*1.1,y:tree.y+Math.sin(angle)*1.1,createdAt:state.fallAt+HARVEST.fallTime};
            drops.set(drop.id,drop);
          }
          state.dropped=true;
          landed.push({tree,at:state.fallAt+HARVEST.fallTime});
        }
        if(seconds>=state.regrowAt) {regrown.push(state.tree);trees.delete(id);}
      }
      return {landed,regrown};
    },
    nearestDrop(position) {
      let nearest=null,best=HARVEST.pickupRadius;
      for(const drop of drops.values()) {
        const distance=Math.hypot(drop.x-position.x,drop.y-position.y);
        if(distance<=best){nearest=drop;best=distance;}
      }
      return nearest;
    },
    collect(position, inventory) {
      const drop=this.nearestDrop(position);
      if(!drop)return {collected:0,full:false,type:null};
      const accepted=inventory.add(drop.type,drop.count);
      drop.count-=accepted;
      if(!drop.count)drops.delete(drop.id);
      return {collected:accepted,full:drop.count>0,type:drop.type};
    },
  };
}
