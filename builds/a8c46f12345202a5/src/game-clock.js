import { CAMP, DAY_CYCLE } from './config.js';
import { getCycleState } from './lighting.js';

export const cycleSeconds=Object.values(DAY_CYCLE.phaseSeconds).reduce((sum,value)=>sum+value,0);

export function createGameClock(initial=null) {
  let seconds=initial?.seconds??0,previous=null,sleep=initial?.sleep?{...initial.sleep,activeAt:null}:null;
  const state=(woke=false)=>({seconds,sleeping:!!sleep,sleepElapsed:sleep?.elapsed??0,woke});
  return {
    serialize(){return {seconds,sleep:sleep?{from:sleep.from,to:sleep.to,elapsed:sleep.elapsed}:null};},
    get seconds(){return seconds;},
    get sleeping(){return !!sleep;},
    get sleepElapsed(){return sleep?.elapsed??0;},
    suspend(){if(sleep)sleep.activeAt=null;},
    startSleep(position) {
      if(sleep||getCycleState(seconds).phase.id!=='night'||Math.hypot(position.x-CAMP.door.x,position.y-CAMP.door.y)>CAMP.reach)return false;
      sleep={from:seconds,to:(Math.floor(seconds/cycleSeconds)+1)*cycleSeconds,elapsed:0,activeAt:previous};
      return true;
    },
    update(timestamp,active=true) {
      if(!Number.isFinite(timestamp))return state();
      const elapsed=previous===null?0:Math.max(0,timestamp-previous);
      previous=timestamp;
      if(!sleep){seconds+=elapsed;return state();}
      if(active&&sleep.activeAt!==null)sleep.elapsed=Math.min(CAMP.sleepSeconds,sleep.elapsed+Math.max(0,timestamp-sleep.activeAt));
      sleep.activeAt=active?timestamp:null;
      const t=sleep.elapsed/CAMP.sleepSeconds,ease=t*t*(3-2*t);
      seconds=sleep.from+(sleep.to-sleep.from)*ease;
      if(sleep.elapsed>=CAMP.sleepSeconds-1e-9){seconds=sleep.to;sleep=null;return state(true);}
      return state();
    },
  };
}
