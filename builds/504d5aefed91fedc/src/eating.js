import {EATING} from './config.js';

// Charge one fruit at the bite, so canceling the raised-hand animation is safe.
export function createEating(survival,inventory) {
  let meal=null;
  return {
    get active(){return meal!==null;},
    state(){return meal?{type:meal.type,progress:Math.min(1,meal.elapsed/EATING.duration),bitten:meal.bitten}:null;},
    cancel(){meal=null;},
    start(type=inventory.equipped) {
      if(meal)return {started:false,reason:'busy'};
      const reason=survival.foodStatus(inventory,type);
      if(reason)return {started:false,reason};
      meal={type,elapsed:0,bitten:false};return {started:true};
    },
    update(dt,enabled=true) {
      if(!meal)return null;
      if(!enabled||!meal.bitten&&inventory.equipped!==meal.type||meal.bitten&&inventory.equipped&&inventory.equipped!==meal.type){meal=null;return null;}
      meal.elapsed+=Number.isFinite(dt)?Math.max(0,dt):0;
      let result=null;
      if(!meal.bitten&&meal.elapsed+1e-9>=EATING.biteTime) {
        result={...survival.eatFood(inventory,meal.type),type:meal.type};
        if(!result.eaten){meal=null;return result;}
        meal.bitten=true;
      }
      if(meal.elapsed+1e-9>=EATING.duration)meal=null;
      return result;
    },
  };
}
