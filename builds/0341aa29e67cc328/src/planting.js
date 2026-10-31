import {DAY_CYCLE} from './config.js';
import {biomeAt} from './biomes.js';

export const growthCycle=Object.values(DAY_CYCLE.phaseSeconds).reduce((a,b)=>a+b,0);
export const nextMorning=seconds=>(Math.floor(seconds/growthCycle)+1)*growthCycle;
export function plantedTree(record) {
  return {...record,type:'tree',biome:biomeAt(record.x,record.y).id,size:.9,rx:.198,ry:.144,
    woodYield:2+Number(record.id.split(':')[1])%2,
    ...(record.kind.startsWith('snow')?{snowCover:record.variant}:{}),planted:true};
}
export const plantRecord=({id,kind,x,y,variant,plantedAt,growsAt,grown})=>({id,kind,x,y,variant,plantedAt,growsAt,grown});
