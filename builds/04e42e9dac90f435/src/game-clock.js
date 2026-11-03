import {STARTER_TENT} from './tent-data.js';
import {tentInReach,tentWake} from './structures.js';
import { CAMP, DAY_CYCLE } from './config.js';
import { getCycleState } from './lighting.js';

export const cycleSeconds=Object.values(DAY_CYCLE.phaseSeconds).reduce((sum,value)=>sum+value,0);
const phaseNames=['day','evening','night'],legacyPhaseSeconds={day:120,evening:30,night:120};
export function savedPhaseSeconds(clock) {
  const durations=clock?.phaseSeconds??legacyPhaseSeconds;
  return durations&&phaseNames.every(key=>Number.isSafeInteger(durations[key])&&durations[key]>0&&durations[key]<=86400)?Object.fromEntries(phaseNames.map(key=>[key,durations[key]])):null;
}
export function remapCycleTime(seconds,durations) {
  if(phaseNames.every(key=>durations[key]===DAY_CYCLE.phaseSeconds[key]))return seconds;
  const previousCycle=phaseNames.reduce((sum,key)=>sum+durations[key],0),days=Math.floor(seconds/previousCycle);
  let remaining=seconds-days*previousCycle,mapped=days*cycleSeconds;
  for(const key of phaseNames){if(remaining<durations[key])return mapped+remaining/durations[key]*DAY_CYCLE.phaseSeconds[key];remaining-=durations[key];mapped+=DAY_CYCLE.phaseSeconds[key];}
  return mapped;
}
export function migrateClock(clock) {
  if(!clock)return null;
  const durations=savedPhaseSeconds(clock);if(!durations)return null;
  return {seconds:remapCycleTime(clock.seconds,durations),phaseSeconds:{...DAY_CYCLE.phaseSeconds},sleep:clock.sleep?{...clock.sleep,from:remapCycleTime(clock.sleep.from,durations),to:remapCycleTime(clock.sleep.to,durations)}:null};
}

export function createGameClock(initial=null) {
  initial=migrateClock(initial);
  let seconds=initial?.seconds??0,previous=null,paused=false,sleep=initial?.sleep?{...initial.sleep,activeAt:null}:null;
  const state=(woke=false,wake=null)=>({seconds,sleeping:!!sleep,sleepElapsed:sleep?.elapsed??0,woke,wake});
  return {
    serialize(){return {seconds,phaseSeconds:{...DAY_CYCLE.phaseSeconds},sleep:sleep?{from:sleep.from,to:sleep.to,elapsed:sleep.elapsed,...(sleep.tentId?{tentId:sleep.tentId}:{}),...(sleep.wake?{wake:{...sleep.wake}}:{})}:null};},
    get seconds(){return seconds;},
    get sleeping(){return !!sleep;},
    get canSleep(){return !sleep&&getCycleState(seconds).phase.id!=='day';},
    get sleepingTentId(){return sleep?.tentId??null;},
    get sleepElapsed(){return sleep?.elapsed??0;},
    get growthSleep(){return sleep?{from:sleep.from,to:sleep.to,elapsed:sleep.elapsed}:null;},
    suspend(){if(sleep)sleep.activeAt=null;},
    setPaused(value){if(paused===!!value)return;paused=!!value;previous=null;if(sleep)sleep.activeAt=null;},
    startSleep(position,tent=null) {
      if(!this.canSleep||!tentInReach(position,tent??STARTER_TENT))return false;
      sleep={from:seconds,to:(Math.floor(seconds/cycleSeconds)+1)*cycleSeconds,elapsed:0,activeAt:previous,tentId:tent?.id??null,wake:tentWake(tent??STARTER_TENT)};
      return true;
    },
    update(timestamp,active=true) {
      if(!Number.isFinite(timestamp))return state();
      const elapsed=previous===null?0:Math.max(0,timestamp-previous);
      previous=timestamp;
      if(paused)return state();
      if(!sleep){seconds+=elapsed;return state();}
      if(active&&sleep.activeAt!==null)sleep.elapsed=Math.min(CAMP.sleepSeconds,sleep.elapsed+Math.max(0,timestamp-sleep.activeAt));
      sleep.activeAt=active?timestamp:null;
      const t=sleep.elapsed/CAMP.sleepSeconds,ease=t*t*(3-2*t);
      seconds=sleep.from+(sleep.to-sleep.from)*ease;
      if(sleep.elapsed>=CAMP.sleepSeconds-1e-9){seconds=sleep.to;const wake=sleep.wake??CAMP.wake;sleep=null;return state(true,wake);}
      return state();
    },
  };
}
