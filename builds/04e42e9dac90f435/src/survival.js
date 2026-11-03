import { SURVIVAL, FOODS } from './config.js';

export function createSurvival(initial = {}) {
  const clamp=(value,max,step=1)=>Math.max(0,Math.min(max,Math.floor(value/step)*step));
  let hunger=clamp(initial.hunger??SURVIVAL.maxHunger,SURVIVAL.maxHunger,.5);
  let health=clamp(initial.health??SURVIVAL.maxHealth,SURVIVAL.maxHealth);
  let hungerProgress=initial.hungerProgress??0,starvationProgress=initial.starvationProgress??0;
  let regenerationProgress=initial.regenerationProgress??0;
  const state=()=>({hunger,health,maxHunger:SURVIVAL.maxHunger,maxHealth:SURVIVAL.maxHealth,starving:hunger===0,dead:health===0});
  return {
    state,
    serialize:()=>({hunger,health,hungerProgress,starvationProgress,regenerationProgress}),
    respawn() {
      if(health>0)return false;
      health=SURVIVAL.maxHealth;hunger=SURVIVAL.maxHunger;
      hungerProgress=starvationProgress=regenerationProgress=0;return true;
    },
    hurt(amount){const damage=Math.min(health,Number.isFinite(amount)?Math.max(0,Math.floor(amount)):0);health-=damage;return {...state(),damage};},
    update(dt) {
      if(health===0)return {...state(),damage:0,healed:0};
      const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;
      // Only count the part of this update before hunger falls to the threshold.
      const regenerationSeconds=health<SURVIVAL.maxHealth&&hunger>SURVIVAL.regenerationThreshold?
        Math.min(elapsed,(hunger-SURVIVAL.regenerationThreshold-hungerProgress)/SURVIVAL.hungerPerSecond):0;
      regenerationProgress+=regenerationSeconds*SURVIVAL.regenerationPerSecond;
      const healingTicks=Math.floor(regenerationProgress+1e-9),healed=Math.min(SURVIVAL.maxHealth-health,healingTicks);
      health+=healed;regenerationProgress=Math.max(0,regenerationProgress-healingTicks);
      let starvingSeconds=elapsed;
      if(hunger>0) {
        const untilEmpty=(hunger-hungerProgress)/SURVIVAL.hungerPerSecond;
        hungerProgress+=elapsed*SURVIVAL.hungerPerSecond;
        const lost=hungerProgress+1e-9>=hunger?hunger:Math.floor(hungerProgress+1e-9);
        hunger-=lost;
        hungerProgress=hunger>0?Math.max(0,hungerProgress-lost):0;
        starvingSeconds=Math.max(0,elapsed-untilEmpty);
      }
      starvationProgress+=starvingSeconds;
      const ticks=Math.floor(starvationProgress+1e-9);
      starvationProgress=Math.max(0,starvationProgress-ticks);
      const damage=Math.min(health,ticks*SURVIVAL.starvationDamage);
      health-=damage;
      if(hunger<=SURVIVAL.regenerationThreshold||health===SURVIVAL.maxHealth)regenerationProgress=0;
      return {...state(),damage,healed};
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
