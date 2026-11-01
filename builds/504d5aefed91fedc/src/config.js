import {activeWorld,difficultyFor} from './world-profile.js';
import {createWorldLayout} from './world-layout.js';
export const WORLD_LAYOUT=createWorldLayout(activeWorld);
export const DIFFICULTY=difficultyFor(activeWorld.difficulty);
// World and movement settings live here so future survival systems can reuse them.
export const WORLD = { size: activeWorld.size, seed: activeWorld.seed, generation: activeWorld.generation, chunkSize: 32, pixelsPerUnit: 16, treeVariants: 7 };
export const PLAYER = {
  speed: 5.2, acceleration: 34, braking: 48, strideLength: 3.2,
  radius: 0.28, wallRadiusX: .64, startX: activeWorld.spawn?.x??0, startY: activeWorld.spawn?.y??0,
};
// Keep old world geometry stable, including IDs referenced by saved chopped trees.
export const START_CLEARING={radius:activeWorld.clearingRadius??7,forageRadius:activeWorld.clearingRadius??6};
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
  phaseSeconds: { day: 360, evening: 60, night: 180 },
  shadowSpeed: .7,
};
export const WIND = { strength: .4, flutter: .03 };
export const WEATHER = { leafLimit: 96, snowLimit: 220 };
export const OCEAN = { interval: 5.2, travel: 72, runup: 1.8, waveCount: 16 };
export const SPRINT = {
  duration: 20, multiplier: 1.7, rechargeRate: 4, rechargeDelay: 0, restartThreshold: 1.5,
  exhaustionDuration: 3, exhaustedSpeed: .55,
};
export const GRASS = { enabled: false, spacing: 1.2, touchRadius: .75, recovery: 3.5 };
export const INVENTORY = { slots: 15, stackLimit: 20, hands: 5 };
export const HARVEST = { hits: 10, cooldown: .66, impactTime: .14, swingTime: .42, reach: 2, fallTime: .95, groundTime: 3, fadeTime: 1.2, pickupRadius: 1.25 };
export const CHOP_TOOLS={
  stone:{damage:1,cooldown:HARVEST.cooldown,impactTime:HARVEST.impactTime,swingTime:HARVEST.swingTime},
  axe:{damage:2,cooldown:.5,impactTime:.12,swingTime:.35},
  'iron-axe':{damage:4,cooldown:.46,impactTime:.12,swingTime:.35},
};
export const COMBAT_TOOLS={...CHOP_TOOLS,pickaxe:{damage:2,miningDamage:2,cooldown:.64,impactTime:.16,swingTime:.42},'iron-pickaxe':{damage:3,miningDamage:2,cooldown:.55,impactTime:.16,swingTime:.4},sword:{damage:3,cooldown:.48,impactTime:.12,swingTime:.34,reach:2.25},'iron-sword':{damage:5,cooldown:.46,impactTime:.12,swingTime:.34,reach:2.25},spear:{damage:3,cooldown:.58,impactTime:.13,swingTime:.36,reach:2.65*1.12}};
export const toolKind=tool=>typeof tool==='string'&&tool.startsWith('iron-')?tool.slice(5):tool;
export const SPEAR_CHARGE={holdTime:.35,damage:6,minSpeed:PLAYER.speed*1.1,minAlignment:.75,halfWidth:.18};
export const SURVIVAL = { maxHunger: 100, maxHealth: 100, hungerPerSecond: .22*.93*DIFFICULTY.hungerMultiplier, starvationDamage: 1, appleHunger: 7, regenerationThreshold: 85, regenerationPerSecond: 1/3 };
export const FOODS = { apple: SURVIVAL.appleHunger, cherry: 5, coconut:7, steak:30, 'raw-steak':15, drumstick:20, 'raw-drumstick':10, bacon:25, 'raw-bacon':12.5 };
export const EATING = { duration: 1, biteTime: .45, frames: 9 };
