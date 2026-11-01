import { HARVEST, DAY_CYCLE, DIFFICULTY, COMBAT_TOOLS, CHOP_TOOLS, WORLD,toolKind } from './config.js';
import {seedType,TREE_SEEDS} from './tree-seeds.js';
import {plantedTree,plantRecord,nextMorning} from './planting.js';
import {ANIMAL_LOOT} from './animal-data.js';
import {createDeathLoot} from './death-loot.js';

const cycleSeconds=Object.values(DAY_CYCLE.phaseSeconds).reduce((sum,duration)=>sum+duration,0);
const nightStarts=DAY_CYCLE.phaseSeconds.day+DAY_CYCLE.phaseSeconds.evening;

// Smaller crowns/trunks take fewer strikes; full-size trees keep their original strength.
export function treeMaxHealth(tree) {
  const size=Number.isFinite(tree?.size)&&tree.size>0?Math.min(1,tree.size):1;
  return Math.max(1,Math.round(HARVEST.hits*size*size));
}
export function treeHitDamage(tree,tool='stone') {
  const damage=CHOP_TOOLS[tool]?.damage??0,health=treeMaxHealth(tree);
  // Ordinary trunks (including the common .9 scale) take three iron-axe hits.
  // Small saplings/trees still fall faster, and existing damage is retained.
  return tool==='iron-axe'&&health>6?Math.min(damage,Math.ceil(health/3)):damage;
}
export const rockMaxHealth=rock=>Math.max(4,Math.round(8*Math.min(1,rock?.size??1)**2));

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
  const rocks=new Map(initial?.rocks??[]),plants=new Map((initial?.plants??[]).map(record=>[record.id,plantedTree(record)]));
  const deathLoot=createDeathLoot(initial?.deathLoot);
  let plantSerial=initial?.plantSerial??0,seedCountdown=initial?.seedCountdown??1;
  let harvestSequence=initial?.harvestSequence??0,demolitionSequence=initial?.demolitionSequence??0,forageNight=initial?.forageNight??-1,revision=0;
  return {
    trees, drops, gathered, rocks, plants,deathLoot,
    get revision(){return revision+deathLoot.revision;},
    serialize(){return {harvestSequence,demolitionSequence,forageNight,plantSerial,seedCountdown,deathLoot:deathLoot.serialize(),plants:[...plants.values()].map(plantRecord),rocks:[...rocks].map(([id,state])=>[id,{...state}]),trees:[...trees].map(([id,state])=>{const {tree,...data}=state;return [id,{...data,felled:!!data.felled,dropped:!!data.dropped}];}),drops:[...drops.values()].map(drop=>({...drop})),gathered:[...gathered]};},
    plant(kind,point,seconds) {
      if(!Object.hasOwn(TREE_SEEDS,kind))return null;
      const serial=++plantSerial,tree=plantedTree({id:`planted:${serial}`,kind,x:point.x,y:point.y,variant:serial%WORLD.treeVariants,plantedAt:seconds,growsAt:nextMorning(seconds),grown:false});
      plants.set(tree.id,tree);revision++;return tree;
    },
    rockHealth(rock){return rocks.get(rock.id)?.health??rockMaxHealth(rock);},
    rockStanding(id){return !rocks.get(id)?.broken;},
    hitRock(rock,seconds,tool='pickaxe') {
      if(toolKind(tool)!=='pickaxe'||rock?.type!=='rock'||!this.rockStanding(rock.id))return null;
      const state=rocks.get(rock.id)??{health:rockMaxHealth(rock),broken:false};
      state.health=Math.max(0,state.health-(COMBAT_TOOLS[tool].miningDamage??COMBAT_TOOLS[tool].damage));state.hitAt=seconds;
      if(!state.health) {
        state.broken=true;
        const type=rock.mineral==='coal'?'coal':rock.mineral==='iron'?'iron-ore':'stone',amount=type==='coal'?(random()<.8?1:2):2+Math.min(1,Math.floor(random()*2));
        if(type==='coal')state.coalYield=amount;else if(type==='iron-ore')state.ironYield=amount;else state.stoneYield=amount;
        for(let i=0;i<amount;i++) {
          const angle=i/amount*Math.PI*2,id=`${rock.id}:loot:${type}:${i}`;
          drops.set(id,{id,type,count:1,x:rock.x+Math.cos(angle)*.7,y:rock.y+Math.sin(angle)*.7,createdAt:seconds});
        }
      }
      rocks.set(rock.id,state);revision++;return {health:state.health,broken:state.broken,type:'rock'};
    },
    dropBuilding(object,seconds) {
      const sequence=++demolitionSequence,stacks=[{type:object.type,count:1},...(object.storage?.rawStacks()??[]),...(object.furnace?.stacks()??[])];
      stacks.forEach((stack,index)=>{
        const angle=index*Math.PI*.73,radius=index?1.05:.72,id=`demolition:${sequence}:${object.id}:${index}`;
        drops.set(id,{id,type:stack.type,count:stack.count,x:object.x+Math.cos(angle)*radius,y:object.y+Math.sin(angle)*radius,createdAt:seconds});
      });
      revision++;return stacks.length;
    },
    dropAnimal(animal,seconds) {
      const loot=ANIMAL_LOOT[animal.kind];if(!loot)return 0;
      const type=loot.type,count=loot.min===loot.max?loot.min:loot.min+Math.min(loot.max-loot.min,Math.floor(random()*(loot.max-loot.min+1))),id=`${animal.id}:loot:${type}`;
      drops.set(id,{id,type,count,x:animal.x,y:animal.y,createdAt:seconds});revision++;return count;
    },
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
        state.coconutYield=tree.kind==='palm'?1+Math.min(1,Math.floor(random()*2)):0;
        state.seedYield=0;
        if(seedType(tree.kind)&&--seedCountdown===0){state.seedYield=1;seedCountdown=1+Math.min(1,Math.floor(random()*2));}
        // Regrow at the first sunrise after the stump has formed, on the shared day clock.
        state.regrowAt=(Math.floor((seconds+HARVEST.fallTime)/cycleSeconds)+1)*cycleSeconds;
        state.fallDirection=Math.abs(direction.x)>.15?Math.sign(direction.x):(tree.x>0?1:-1);
      }
      trees.set(tree.id,state);revision++;
      return {health:state.health,felled:state.felled};
    },
    update(seconds,recoveryDt=0) {
      const expiredGraves=deathLoot.update(recoveryDt);
      const landed=[],regrown=[],regrownForage=[],grownPlants=[],night=Math.floor((seconds-nightStarts)/cycleSeconds);
      for(const tree of plants.values())if(!tree.grown&&seconds>=tree.growsAt){tree.grown=true;grownPlants.push(tree);revision++;}
      if(night>forageNight) {
        // Reset harvested plants globally, including chunks that are not loaded.
        for(const id of gathered.keys())if(id.startsWith('forage:fiberBush:')){gathered.delete(id);regrownForage.push(id);}
        forageNight=night;revision++;
      }
      for(const [id,state] of trees) {
        if(!state.felled)continue;
        if(!state.dropped&&seconds>=state.fallAt+HARVEST.fallTime) {
          const tree=state.tree,amount=Math.max(1,(tree.woodYield??2)+DIFFICULTY.logBonus);
          for(let i=0;i<amount;i++) {
            const angle=i/amount*Math.PI*2+.65;
            const drop={id:`${id}:harvest:${state.harvest}:log:${i}`,type:'log',count:1,x:tree.x+Math.cos(angle)*.85,y:tree.y+Math.sin(angle)*.85,createdAt:state.fallAt+HARVEST.fallTime};
            drops.set(drop.id,drop);
          }
          for(const [type,count] of [['apple',state.appleYield],['cherry',state.cherryYield??0],['coconut',state.coconutYield??0]])for(let i=0;i<count;i++) {
            const angle=i/count*Math.PI*2-.9;
            const drop={id:`${id}:harvest:${state.harvest}:${type}:${i}`,type,count:1,x:tree.x+Math.cos(angle)*1.1,y:tree.y+Math.sin(angle)*1.1,createdAt:state.fallAt+HARVEST.fallTime};
            drops.set(drop.id,drop);
          }
          if(state.seedYield) {
            const id=`${tree.id}:harvest:${state.harvest}:seed:0`;
            drops.set(id,{id,type:seedType(tree.kind),count:1,x:tree.x+.35,y:tree.y-1.05,createdAt:state.fallAt+HARVEST.fallTime});
          }
          state.dropped=true;revision++;
          landed.push({tree,at:state.fallAt+HARVEST.fallTime});
        }
        if(seconds>=state.regrowAt) {regrown.push(state.tree);trees.delete(id);revision++;}
      }
      return {landed,regrown,regrownForage,grownPlants,expiredGraves};
    },
    nearestDrop(position,forage=[]) {
      let nearest=deathLoot.nearest(position,HARVEST.pickupRadius),best=nearest?Math.hypot(nearest.x-position.x,nearest.y-position.y):HARVEST.pickupRadius;
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
      if(drop.source==='death')return deathLoot.collect(drop.graveId,inventory);
      const accepted=inventory.add(drop.type,drop.count);
      drop.count-=accepted;if(accepted)revision++;
      if(drop.source==='forage') {
        if(accepted)gathered.set(drop.id,drop.count);
      } else if(!drop.count)drops.delete(drop.id);
      return {collected:accepted,full:drop.count>0,type:drop.type};
    },
  };
}
