import { WORLD, WORLD_LAYOUT } from './config.js';
import { lakeSample } from './lake-data.js';

export const BIOMES = {
  forest: { id: 'forest', label: 'היער הירוק', color: '#8c9f6b', alternate: '#899c67', detail: '#788e57', trees: ['pine','pine','blue','broadleaf','birch','cypress','fruit','willow'], density: .53 },
  jungle: { id: 'jungle', label: 'הג׳ונגל', color: '#4c704b', alternate: '#50764c', detail: '#345c3d', trees: ['jungle','jungle','jungle','palm','broadleaf','willow','fruit'], density: .77 },
  desert: { id: 'desert', label: 'המדבר', color: '#d8bd7f', alternate: '#d5b97b', detail: '#c4a46a', trees: ['acacia','palm'], density: .045 },
  autumn: { id: 'autumn', label: 'יער הסתיו', color: '#a09660', alternate: '#a39963', detail: '#867947', trees: ['maple','maple','autumnOak'], density: .6 },
  cherry: { id: 'cherry', label: 'חורשת הדובדבנים', color: '#98aa79', alternate: '#95a776', detail: '#819660', trees: ['cherry','cherry','cherry','birch'], density: .56 },
  snow: { id: 'snow', label: 'היער המושלג', color: '#dce8e8', alternate: '#d5e3e6', detail: '#b7cdd6', trees: ['snowPine','snowPine','snowSpruce'], density: .47 },
  beach: { id: 'beach', label: 'חוף הים', color: '#e4d39b', alternate: '#dfce94', detail: '#cabb87', trees: ['palm'], density: .16 },
  ocean: { id: 'ocean', label: 'הים הפתוח', color: '#3c788c', alternate: '#3e7b8e', detail: '#81bbbc', trees: [], density: 0 },
  lake: { id: 'lake', label: 'אגם', color: '#518e96', alternate: '#57969b', detail: '#91b9b4', trees: [], density: 0 },
};

export const REGION_CENTERS = WORLD_LAYOUT.regions;
export const COAST = WORLD_LAYOUT.coast;
export function oceanDistance(x,y) {return COAST.side*(x-coastline(y));}
export function coastline(y) {
  return COAST.base + Math.sin(y * COAST.frequency) * COAST.amplitude + Math.sin(y * COAST.detailFrequency + COAST.detailPhase) * COAST.detailAmplitude;
}

export function lakeDistance(x, y) {
  return (lakeSample(x,y)?.ratio??Infinity)**2;
}

export function waterAt(x, y) {
  return oceanDistance(x,y) > 0 || (lakeSample(x,y)?.distance??Infinity) < 0;
}

// Wide, continuous transition bands also handle three-way junctions.
export const BIOME_TRANSITION = 24;
const palette = Object.fromEntries(Object.entries(BIOMES).map(([id, biome]) => [id,
  [biome.color, biome.alternate].map(hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)))
]));
const smooth = value => { const t=Math.max(0,Math.min(1,value)); return t*t*(3-2*t); };

export function biomeBlendAt(x, y, lake=lakeSample(x,y)) {
  const coast = coastline(y);
  if (oceanDistance(x,y) > 0) return [{ biome: BIOMES.ocean, weight: 1 }];
  if (lake?.distance<0) return [{ biome: BIOMES.lake, weight: 1 }];
  const beach = smooth((oceanDistance(x,y)+38)/32);
  if (beach === 1) return [{ biome: BIOMES.beach, weight: 1 }];
  const wx=x+Math.sin(y*.021)*13+Math.sin(y*.061)*4;
  const wy=y+Math.sin(x*.019+1)*15;
  const distances=[];let closest=0;
  REGION_CENTERS.forEach((region,i) => {
    distances[i]=(wx-region.x)**2+(wy-region.y)**2;
    if(distances[i]<distances[closest])closest=i;
  });
  const nearest=Math.sqrt(distances[closest]);
  const parts=[];let total=0;
  REGION_CENTERS.forEach((region,i) => {
    const gap=Math.max(0,(Math.sqrt(distances[i])-nearest)*.5);
    if(gap>=BIOME_TRANSITION)return;
    const weight=(1-gap/BIOME_TRANSITION)**2;
    parts.push({biome:BIOMES[region.id],weight});total+=weight;
  });
  parts.forEach(part=>{part.weight=part.weight/total*(1-beach);});
  if(beach>0)parts.push({biome:BIOMES.beach,weight:beach});
  if(lake&&lake.distance<lake.lake.shore) {
    const sand=smooth(1-lake.distance/lake.lake.shore);
    parts.forEach(part=>{part.weight*=1-sand;});
    parts.push({biome:BIOMES.beach,weight:sand});
  }
  return parts;
}

export function dominantBiome(parts) {
  return parts.reduce((best,part)=>part.weight>best.weight?part:best).biome;
}

export function biomeAt(x,y) { return dominantBiome(biomeBlendAt(x,y)); }

export function biomeWeightAt(x,y,id) {
  return biomeBlendAt(x,y).find(part=>part.biome.id===id)?.weight??0;
}

export function pickBiome(parts, value) {
  let remaining=value;
  for(const part of parts){remaining-=part.weight;if(remaining<=0)return part.biome;}
  return parts[parts.length-1].biome;
}

function patchNoise(x,y) {
  const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
  const a=cellSeed(ix,iy,3719)/4294967296,b=cellSeed(ix+1,iy,3719)/4294967296;
  const c=cellSeed(ix,iy+1,3719)/4294967296,d=cellSeed(ix+1,iy+1,3719)/4294967296;
  return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}

export function biomeColorAt(x,y,alternate=false,parts=biomeBlendAt(x,y)) {
  const slot=alternate?1:0;
  if(parts.length===1)return alternate?parts[0].biome.alternate:parts[0].biome.color;
  const mixed=[0,0,0];
  for(const part of parts){const color=palette[part.biome.id][slot];for(let i=0;i<3;i++)mixed[i]+=color[i]*part.weight;}
  // Organic patches retain crisp pixels while the overall color changes gradually.
  const local=palette[pickBiome(parts,patchNoise(x/3.5,y/3.5)).id][slot];
  return `rgb(${mixed.map((value,i)=>Math.round(value*.4+local[i]*.6)).join(',')})`;
}

export function cellSeed(x, y, salt = 0) {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ WORLD.seed ^ salt;
  value = Math.imul(value ^ value >>> 13, 1274126177);
  return (value ^ value >>> 16) >>> 0;
}
