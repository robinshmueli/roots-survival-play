import {CAMP} from './config.js';

const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

// Visual growth follows real sleep time, even when sleeping just before dawn.
// Resource maturity still belongs to the shared world clock.
export function sleepGrowth(sleep,dueAt) {
  if(!sleep||!Number.isFinite(dueAt)||dueAt<=sleep.from||dueAt>sleep.to)return null;
  const progress=Math.max(0,Math.min(1,sleep.elapsed/CAMP.sleepSeconds));
  return {scale:.12+.88*smooth(progress),opacity:smooth(progress/.2)};
}
