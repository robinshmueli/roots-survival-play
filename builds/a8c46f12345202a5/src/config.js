import {activeWorld,difficultyFor} from './world-profile.js';
import {createWorldLayout} from './world-layout.js';
export const WORLD_LAYOUT=createWorldLayout(activeWorld);
export const DIFFICULTY=difficultyFor(activeWorld.difficulty);
// World and movement settings live here so future survival systems can reuse them.
export const WORLD = { size: activeWorld.size, seed: activeWorld.seed, generation: activeWorld.generation, chunkSize: 32, pixelsPerUnit: 16, treeVariants: 7 };
export const PLAYER = {
  speed: 5.2, acceleration: 34, braking: 48, strideLength: 3.2,
  radius: 0.28, startX: 0, startY: 0,
};
export const VIEW = { pixelsPerUnit: 16, followSpeed: 7, zoom: 1.25, referenceHeight: 420, referenceAspect: 16/9 };
export const CAMP = {
  x: PLAYER.startX, y: PLAYER.startY+3, width: 4.8, height: 4, foot: 67/80,
  door: {x:PLAYER.startX-.3,y:PLAYER.startY+1.8},
  wake: {x:PLAYER.startX-.3,y:PLAYER.startY+1.65},
  reach: 2.2, sleepSeconds: 4,
};
export const EXPLORATION = { radius: 20, feather: 2, cellSize: 1, sampleStep: .75, maxStep: 8 };
export const LAKES = WORLD_LAYOUT.lakes;
export const LAKE = LAKES[0];
export const DAY_CYCLE = {
  phaseSeconds: { day: 120, evening: 30, night: 120 },
  shadowSpeed: .7,
};
export const WIND = { strength: .4, flutter: .03 };
export const WEATHER = { leafLimit: 96, snowLimit: 220 };
export const OCEAN = { interval: 5.2, travel: 72, runup: 1.8, waveCount: 16 };
export const SPRINT = {
  duration: 10, multiplier: 1.7, rechargeRate: .5, rechargeDelay: 1.2, restartThreshold: 1.5,
  exhaustionDuration: 3, exhaustedSpeed: .55,
};
export const GRASS = { enabled: false, spacing: 1.2, touchRadius: .75, recovery: 3.5 };
export const INVENTORY = { slots: 15, stackLimit: 20, hands: 3 };
export const HARVEST = { hits: 10, cooldown: .6, impactTime: .14, swingTime: .42, reach: 2, fallTime: .95, groundTime: 3, fadeTime: 1.2, pickupRadius: 1.25 };
export const CHOP_TOOLS={
  stone:{damage:1,cooldown:HARVEST.cooldown,impactTime:HARVEST.impactTime,swingTime:HARVEST.swingTime},
  axe:{damage:3,cooldown:.46,impactTime:.12,swingTime:.35},
};
export const SURVIVAL = { maxHunger: 100, maxHealth: 100, hungerPerSecond: .22*DIFFICULTY.hungerMultiplier, starvationDamage: 1, appleHunger: 15 };
export const FOODS = { apple: SURVIVAL.appleHunger, cherry: 5 };
export const EATING = { duration: 1, biteTime: .45, frames: 9 };
