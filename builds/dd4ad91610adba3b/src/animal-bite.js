export const ANIMAL_BITE={version:2,windup:.8,strikeAt:.95,duration:1.25,cooldown:1.25,lunge:.4,recoil:.26};
const LEGACY_BITE={version:1,windup:.5,strikeAt:.62,duration:.9,cooldown:1.25,lunge:.4,recoil:.12};
export const biteTiming=bite=>bite?.version===2?ANIMAL_BITE:LEGACY_BITE;

export function animalBitePose(animal) {
  const bite=animal.health&&animal.bite;if(!bite)return {frame:0,x:0,y:0};
  const t=bite.elapsed,{windup,strikeAt,duration,lunge,recoil}=biteTiming(bite);
  const offset=t<windup?-recoil*t/windup:t<strikeAt?-recoil+(lunge+recoil)*(t-windup)/(strikeAt-windup):lunge*Math.max(0,1-(t-strikeAt)/(duration-strikeAt));
  return {frame:t<windup/2?1:t<windup?2:t<strikeAt+.1?3:4,x:bite.dx*offset,y:bite.dy*offset};
}
