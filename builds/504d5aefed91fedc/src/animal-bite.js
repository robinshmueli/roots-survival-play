import {DIFFICULTY} from './config.js';
import {DIFFICULTIES} from './world-profile.js';

const LEGACY_BITE={version:1,windup:.5,strikeAt:.62,duration:.9,cooldown:1.25,lunge:.4,recoil:.12,damageMultiplier:1};
const EXTENDED_BITE={...LEGACY_BITE,version:2,windup:.8,strikeAt:.95,duration:1.25,recoil:.26};
export const BITE_PROFILES=Object.fromEntries(DIFFICULTIES.map(d=>[d.id,{
  ...EXTENDED_BITE,version:3,difficulty:d.id,damageMultiplier:d.animalDamageMultiplier,
  windup:.8/d.animalAttackSpeed,strikeAt:.95/d.animalAttackSpeed,duration:1.25/d.animalAttackSpeed,cooldown:1.25/d.animalAttackSpeed,
}]));
export const ANIMAL_BITE=BITE_PROFILES[DIFFICULTY.id];
// Finish saved attacks with their original timing and damage before adopting the world's balance.
export const biteTiming=bite=>bite?.version===3?(typeof bite.difficulty==='string'&&Object.hasOwn(BITE_PROFILES,bite.difficulty)?BITE_PROFILES[bite.difficulty]:ANIMAL_BITE):bite?.version===2?EXTENDED_BITE:LEGACY_BITE;

export function animalBitePose(animal) {
  const bite=animal.health&&animal.bite;if(!bite)return {frame:0,x:0,y:0};
  const t=bite.elapsed,{windup,strikeAt,duration,lunge,recoil}=biteTiming(bite);
  const offset=t<windup?-recoil*t/windup:t<strikeAt?-recoil+(lunge+recoil)*(t-windup)/(strikeAt-windup):lunge*Math.max(0,1-(t-strikeAt)/(duration-strikeAt));
  return {frame:t<windup/2?1:t<windup?2:t<strikeAt+.1?3:4,x:bite.dx*offset,y:bite.dy*offset};
}
