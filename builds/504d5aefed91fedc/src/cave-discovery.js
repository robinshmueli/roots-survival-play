import {CAVE_BOUNDS} from './cave-data.js';

export const CAVE_MAP_CELL=2;
const width=(CAVE_BOUNDS.maxX-CAVE_BOUNDS.minX)/CAVE_MAP_CELL,height=(CAVE_BOUNDS.maxY-CAVE_BOUNDS.minY)/CAVE_MAP_CELL,bytes=width*height/8;
export function validCaveDiscovery(data) {
  if(data===undefined)return true;
  try{return typeof data==='string'&&data.length===bytes/3*4&&btoa(atob(data))===data&&atob(data).length===bytes;}catch{return false;}
}
export function createCaveDiscovery(initial) {
  const bits=new Uint8Array(bytes);let revision=0,previous='';
  if(initial&&validCaveDiscovery(initial)){const raw=atob(initial);for(let i=0;i<bits.length;i++)bits[i]=raw.charCodeAt(i);}
  const cell=(x,y)=>({x:Math.floor((x-CAVE_BOUNDS.minX)/CAVE_MAP_CELL),y:Math.floor((y-CAVE_BOUNDS.minY)/CAVE_MAP_CELL)});
  return {
    get revision(){return revision;},
    known(x,y){const p=cell(x,y);if(p.x<0||p.y<0||p.x>=width||p.y>=height)return false;const i=p.y*width+p.x;return !!(bits[i>>3]&(1<<(i&7)));},
    visit(point) {
      const p=cell(point.x,point.y),key=p.x+','+p.y;if(key===previous)return false;previous=key;
      let changed=false;
      for(let y=Math.max(0,p.y-4);y<=Math.min(height-1,p.y+4);y++)for(let x=Math.max(0,p.x-4);x<=Math.min(width-1,p.x+4);x++) {
        if(Math.hypot(x-p.x,y-p.y)>3.5)continue;
        const i=y*width+x,mask=1<<(i&7);if(!(bits[i>>3]&mask)){bits[i>>3]|=mask;changed=true;}
      }
      if(changed)revision++;return changed;
    },
    serialize(){return btoa(String.fromCharCode(...bits));},
  };
}
