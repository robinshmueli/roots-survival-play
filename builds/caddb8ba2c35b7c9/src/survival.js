import { SURVIVAL } from './config.js';

export function createSurvival(initial = {}) {
  const clamp=(value,max)=>Math.max(0,Math.min(max,Math.floor(value)));
  let hunger=clamp(initial.hunger??SURVIVAL.maxHunger,SURVIVAL.maxHunger);
  let health=clamp(initial.health??SURVIVAL.maxHealth,SURVIVAL.maxHealth);
  let hungerProgress=0,starvationProgress=0;
  const state=()=>({hunger,health,maxHunger:SURVIVAL.maxHunger,maxHealth:SURVIVAL.maxHealth,starving:hunger===0,dead:health===0});
  return {
    state,
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
    eatApple(inventory) {
      if(health===0)return {eaten:false,reason:'dead',restored:0,...state()};
      if(hunger===SURVIVAL.maxHunger)return {eaten:false,reason:'full',restored:0,...state()};
      if(inventory.remove('apple',1)!==1)return {eaten:false,reason:'empty',restored:0,...state()};
      const before=hunger;
      hunger=Math.min(SURVIVAL.maxHunger,hunger+SURVIVAL.appleHunger);
      starvationProgress=0;
      return {eaten:true,restored:hunger-before,...state()};
    },
  };
}
