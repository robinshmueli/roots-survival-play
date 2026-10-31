import { SPRINT } from './config.js';

export function createStamina(initial=null) {
  // Older saves used a ten-second bar and did not store its maximum.
  const savedMaximum=initial?.maximum??10;
  let energy = initial?Math.min(SPRINT.duration,(initial.energy??savedMaximum)/savedMaximum*SPRINT.duration):SPRINT.duration;
  let recoveryDelay = Math.min(initial?.recoveryDelay??0,SPRINT.rechargeDelay), exhausted = initial?.exhausted??false, running = false;
  let breathRemaining=initial?.breathRemaining??0;
  return {
    serialize:()=>({energy,maximum:SPRINT.duration,recoveryDelay,exhausted,breathRemaining}),
    plan(dt, requested) {
      if(breathRemaining>0) {
        const slowTime=Math.min(Math.max(0,dt),breathRemaining);
        return {seconds:0,multiplier:dt>0?1-(1-SPRINT.exhaustedSpeed)*slowTime/dt:SPRINT.exhaustedSpeed};
      }
      const seconds = requested && !exhausted ? Math.min(Math.max(0, dt), energy) : 0;
      return { seconds, multiplier: dt > 0 ? 1 + (SPRINT.multiplier - 1) * seconds / dt : 1 };
    },
    update(dt, held, spentSeconds) {
      const elapsed = Math.max(0, dt);
      const wasPanting=breathRemaining>0;
      breathRemaining=Math.max(0,breathRemaining-elapsed);
      if(breathRemaining<1e-9)breathRemaining=0;
      let justExhausted=false;
      const spent = wasPanting?0:Math.min(elapsed, Math.max(0, spentSeconds), energy);
      running = spent > 0;
      if (running) {
        energy = Math.max(0, energy - spent);
        recoveryDelay = SPRINT.rechargeDelay;
        if (energy < 1e-9) {
          energy = 0; exhausted = true;breathRemaining=SPRINT.exhaustionDuration;justExhausted=true;
        }
      } else {
        const rechargeTime = Math.max(0, elapsed - recoveryDelay);
        recoveryDelay = Math.max(0, recoveryDelay - elapsed);
        energy = Math.min(SPRINT.duration, energy + rechargeTime * SPRINT.rechargeRate);
        if(SPRINT.duration-energy<1e-9)energy=SPRINT.duration;
      }
      // Releasing Shift after some recovery prevents repeated tiny sprint bursts at zero.
      if (exhausted && !breathRemaining && !held && energy >= SPRINT.restartThreshold) exhausted = false;
      return { energy, maximum: SPRINT.duration, running, exhausted, recovering: !running && energy < SPRINT.duration,
        panting:breathRemaining>0,breathRemaining,justExhausted };
    },
  };
}
