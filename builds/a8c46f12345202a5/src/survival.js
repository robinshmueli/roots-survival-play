import { SURVIVAL, FOODS } from './config.js';

export function createSurvival(initial = {}) {
  const clamp=(value,max)=>Math.max(0,Math.min(max,Math.floor(value)));
  let hunger=clamp(initial.hunger??SURVIVAL.maxHunger,SURVIVAL.maxHunger);
  let health=clamp(initial.health??SURVIVAL.maxHealth,SURVIVAL.maxHealth);
  let hungerProgress=initial.hungerProgress??0,starvationProgress=initial.starvationProgress??0;
  const state=()=>({hunger,health,maxHunger:SURVIVAL.maxHunger,maxHealth:SURVIVAL.maxHealth,starving:hunger===0,dead:health===0});
  return {
    state,
    serialize:()=>({hunger,health,hungerProgress,starvationProgress}),
    update(dt) {
      if(health===0)return {...state(),damage:0};
      const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;
      let starvingSeconds=elapsed;
      if(hunger>0) {
        const untilEmpty=(hunger-hungerProgress)/SURVIVAL.hungerPerSecond;
        hungerProgress+=elapsed*SURVIVAL.hungerPerSecond;
        const lost=Math.min(hunger,Math.floor(hungerProgress+1e-9));
        hunger-=lost;
        hungerProgress=hunger>0?Math.max(0,hungerProgress-lost):0;
        starvingSeconds=Math.max(0,elapsed-untilEmpty);
      }
      starvationProgress+=starvingSeconds;
      const ticks=Math.floor(starvationProgress+1e-9);
      starvationProgress=Math.max(0,starvationProgress-ticks);
      const damage=Math.min(health,ticks*SURVIVAL.starvationDamage);
      health-=damage;
      return {...state(),damage};
    },
    foodStatus,
    eatFood,
    eatApple:inventory=>eatFood(inventory,'apple'),
  };
  function foodStatus(inventory,type) {
    return !Object.hasOwn(FOODS,type)?'food':health===0?'dead':hunger===SURVIVAL.maxHunger?'full':inventory.count(type)<1?'empty':null;
  }
  function eatFood(inventory,type) {
    const reason=foodStatus(inventory,type);
    if(reason)return {eaten:false,reason,restored:0,...state()};
    if(inventory.remove(type,1)!==1)return {eaten:false,reason:'empty',restored:0,...state()};
    const before=hunger;
    hunger=Math.min(SURVIVAL.maxHunger,hunger+FOODS[type]);starvationProgress=0;
    return {eaten:true,restored:hunger-before,...state()};
  }
}
