// World and movement settings live here so future survival systems can reuse them.
export const WORLD = { size: 1120, seed: 2701, chunkSize: 32, pixelsPerUnit: 16, treeVariants: 7 };
export const PLAYER = {
  speed: 5.2, acceleration: 34, braking: 48, strideLength: 3.2,
  radius: 0.28, startX: 0, startY: 0,
};
export const VIEW = { pixelsPerUnit: 16, followSpeed: 7, zoom: 1.25 };
export const EXPLORATION = { radius: 20, feather: 2, cellSize: 1, sampleStep: .75, maxStep: 8 };
export const LAKES = [
  {x:28,y:19,rx:9,ry:6.2,angle:.3,seed:31},
  {x:-32,y:-20,rx:7.5,ry:5.5,angle:-.5,seed:72},
  {x:-94,y:53,rx:12,ry:7.6,angle:.7,seed:53},
  {x:-180,y:-48,rx:8.5,ry:12,angle:.2,seed:94},
  {x:-315,y:-195,rx:12,ry:9,angle:-.3,seed:65},
  {x:-252,y:-302,rx:15,ry:9.5,angle:.8,seed:86},
  {x:-420,y:-330,rx:9,ry:7,angle:.5,seed:127},
  {x:31,y:-244,rx:8.4,ry:6.2,angle:.2,seed:98},
  {x:-105,y:-345,rx:7,ry:10,angle:-.6,seed:159},
  {x:102,y:-390,rx:11,ry:7.5,angle:.6,seed:170},
  {x:-270,y:225,rx:13,ry:8,angle:-.4,seed:111},
  {x:-397,y:365,rx:9,ry:11,angle:.6,seed:142},
  {x:-120,y:295,rx:9,ry:6,angle:-.8,seed:183},
  {x:17,y:215,rx:11,ry:7.2,angle:.4,seed:164},
  {x:98,y:340,rx:8,ry:12,angle:-.2,seed:215},
  {x:-162,y:443,rx:12,ry:8,angle:.3,seed:196},
  {x:-320,y:480,rx:10,ry:7,angle:-.5,seed:227},
  {x:-475,y:100,rx:13,ry:8,angle:.5,seed:208},
  {x:-460,y:-45,rx:8,ry:6,angle:.7,seed:249},
  {x:55,y:70,rx:7,ry:5,angle:-.3,seed:230},
].map((lake,id)=>({...lake,id:`lake-${id}`,phase:lake.seed*.73,shore:.65+(id%4)*.1,
  shape:[.17+(id%3)*.035,.09+(id%4)*.02,.035+(id%3)*.015],fishCount:2+lake.seed%3}));
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
export const HARVEST = { hits: 10, cooldown: .5, impactTime: .12, swingTime: .36, reach: 2, fallTime: .95, groundTime: 3, pickupRadius: 1.25 };
export const SURVIVAL = { maxHunger: 100, maxHealth: 100, hungerPerSecond: .22, starvationDamage: 1, appleHunger: 15 };
