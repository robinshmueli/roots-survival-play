import {WORLD,PLAYER,START_CLEARING} from './config.js';
import {cellSeed,waterAt} from './biomes.js';
import {chunkObjects} from './world-data.js';
import {randomGenerator} from './art.js';
import {generateCave,caveMaskContains} from './cave-shape.js';
import {addExtraIron,addEchoStones} from './cave-minerals.js';

export const CAVE_EXIT={x:0,y:-20};
export const CAVE_SPAWN={x:0,y:-17};
export const CAVE_BOUNDS={minX:-32,maxX:32,minY:-25,maxY:41};
let entrances;
let originalEntranceCount=0;
let boostedEntranceCount=0;
const layouts=new Map();
let links;
export function caveEntrances() {
  if(entrances)return entrances;
  entrances=[];const half=WORLD.size/2,scenery=new Map();
  function clear(x,y) {
    if(Math.abs(x)>half-12||Math.abs(y)>half-12||Math.hypot(x-PLAYER.startX,y-PLAYER.startY)<START_CLEARING.radius+9)return false;
    for(const [dx,dy] of [[0,0],[4,0],[-4,0],[0,4],[0,-4]])if(waterAt(x+dx,y+dy))return false;
    for(let cy=Math.floor((y-5)/32);cy<=Math.floor((y+5)/32);cy++)for(let cx=Math.floor((x-5)/32);cx<=Math.floor((x+5)/32);cx++) {
      const key=cx+','+cy;if(!scenery.has(key))scenery.set(key,chunkObjects(cx,cy));
      if(scenery.get(key).some(object=>Math.hypot(object.x-x,object.y-y)<4.2))return false;
    }
    return !entrances.some(cave=>Math.hypot(cave.x-x,cave.y-y)<70);
  }
  // Guarantee an accessible first expedition near the starting clearing.
  const random=randomGenerator(WORLD.seed^0x76a9e13);
  for(let attempt=0;attempt<1600;attempt++) {
    const angle=random()*Math.PI*2,radius=Math.max(START_CLEARING.radius+12,23)+random()*40;
    const x=Math.round(PLAYER.startX+Math.cos(angle)*radius),y=Math.round(PLAYER.startY+Math.sin(angle)*radius);
    if(clear(x,y)){entrances.push({id:'cave:0',type:'cave-entrance',x,y,seed:cellSeed(x,y,90827)});break;}
  }
  const spacing=150;
  for(let iy=Math.ceil(-half/spacing);iy<half/spacing;iy++)for(let ix=Math.ceil(-half/spacing);ix<half/spacing;ix++) {
    const roll=randomGenerator(cellSeed(ix,iy,792837));
    for(let attempt=0;attempt<35;attempt++) {
      const x=Math.round(ix*spacing+(roll()-.5)*spacing*.8),y=Math.round(iy*spacing+(roll()-.5)*spacing*.8);
      if(clear(x,y)){entrances.push({id:`cave:${entrances.length}`,type:'cave-entrance',x,y,seed:cellSeed(x,y,90827)});break;}
    }
  }
  // Append new entrances after the original pass to preserve every saved cave
  // ID, position and seed. Use a separate stream for the modest density boost.
  originalEntranceCount=entrances.length;
  const extra=Math.max(1,Math.round(originalEntranceCount*.25)),bonus=randomGenerator(WORLD.seed^0x29c7b451);
  for(let attempt=0,added=0;attempt<extra*180&&added<extra;attempt++) {
    const x=Math.round((bonus()*2-1)*(half-12)),y=Math.round((bonus()*2-1)*(half-12));
    if(clear(x,y)){entrances.push({id:`cave:${entrances.length}`,type:'cave-entrance',x,y,seed:cellSeed(x,y,90827)});added++;}
  }
  // Add another 15% without moving or reconnecting either previous generation.
  boostedEntranceCount=entrances.length;
  const additional=Math.max(1,Math.round(boostedEntranceCount*.15)),more=randomGenerator(WORLD.seed^0x61b384d7);
  for(let attempt=0,added=0;attempt<additional*180&&added<additional;attempt++) {
    const x=Math.round((more()*2-1)*(half-12)),y=Math.round((more()*2-1)*(half-12));
    if(clear(x,y)){entrances.push({id:`cave:${entrances.length}`,type:'cave-entrance',x,y,seed:cellSeed(x,y,90827)});added++;}
  }
  return entrances;
}
export const caveById=id=>caveEntrances().find(cave=>cave.id===id)??null;
export function caveRoute(portalId) {
  if(!links) {
    links=new Map();const all=caveEntrances();
    // Pair added caves only with each other so old secondary exits and saved
    // cave layouts continue to lead to their original destinations.
    for(const list of [all.slice(0,originalEntranceCount),all.slice(originalEntranceCount,boostedEntranceCount),all.slice(boostedEntranceCount)]) {
      const used=new Set();
      for(const entrance of list) {
        if(used.has(entrance.id))continue;
        const random=randomGenerator(entrance.seed^0x6c891),candidates=list.filter(other=>other.id!==entrance.id&&!used.has(other.id)&&Math.hypot(other.x-entrance.x,other.y-entrance.y)<250).sort((a,b)=>Math.hypot(a.x-entrance.x,a.y-entrance.y)-Math.hypot(b.x-entrance.x,b.y-entrance.y));
        const partner=random()<.48?candidates[0]:null;
        used.add(entrance.id);links.set(entrance.id,{caveId:entrance.id,exitId:'entry',otherPortal:partner?.id??null});
        if(partner){used.add(partner.id);links.set(partner.id,{caveId:entrance.id,exitId:'far',otherPortal:entrance.id});}
      }
    }
  }
  return links.get(portalId)??null;
}
function segmentDistance(x,y,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
}
export function caveLayout(id,version=2) {
  const key=id+':'+version;
  if(layouts.has(key))return layouts.get(key);
  const cave=caveById(id);if(!cave)return null;
  if(version===2){const route=caveRoute(id),layout=generateCave(id,cave.seed,route?.caveId===id?route.otherPortal:null);layouts.set(key,layout);return layout;}
  const random=randomGenerator(cave.seed),jitter=()=>random()*3-1.5;
  const rooms=[{x:0,y:-12,rx:6.3,ry:9.5},{x:-2+jitter(),y:3+jitter(),rx:11.5,ry:10},
    {x:-17+jitter(),y:16+jitter(),rx:9,ry:8},{x:15+jitter(),y:15+jitter(),rx:8.5,ry:9},
    {x:-3+jitter(),y:29+jitter(),rx:9,ry:7.5}];
  const passages=[[rooms[0],rooms[1]],[rooms[1],rooms[2]],[rooms[1],rooms[3]],[rooms[2],rooms[4]],[rooms[3],rooms[4]]];
  const layout={id,version:1,rooms,passages,seed:cave.seed,rocks:[],bounds:CAVE_BOUNDS,exits:[{id:'entry',...CAVE_EXIT,dy:-1,portalId:id}]};
  layouts.set(key,layout);
  // Keep every saved legacy rock ID, position and random draw unchanged even
  // though the visible cave boundary now has a rougher outline.
  const core=(x,y)=>rooms.some(room=>((x-room.x)/room.rx)**2+((y-room.y)/room.ry)**2<1)||passages.some(([a,b])=>segmentDistance(x,y,a,b)<2.8);
  const coreFoot=(x,y)=>{if(!core(x,y))return false;for(let i=0;i<8;i++)if(!core(x+Math.cos(i*Math.PI/4)*1.4,y+Math.sin(i*Math.PI/4)*1.4))return false;return true;};
  let serial=0;
  for(let iy=-5;iy<=10;iy++)for(let ix=-9;ix<=9;ix++) {
    const x=ix*3+random()*.9-.45,y=iy*3+random()*.9-.45;
    if(!coreFoot(x,y)||Math.hypot(x-CAVE_SPAWN.x,y-CAVE_SPAWN.y)<4||passages.some(([a,b])=>segmentDistance(x,y,a,b)<2)||random()>.8)continue;
    const n=serial++,ore=randomGenerator(cave.seed^Math.imul(n+1,71237))(),mineral=ore<.08?'iron':ore<.46?'coal':ore<.66?'copper':'stone',size=.75+random()*.3;
    layout.rocks.push({id:`${id}:rock:${n}`,type:'rock',biome:'cave',x,y,size,rx:size*1.05,ry:size*.4,variant:n%5,mineral});
  }
  addExtraIron(layout.rocks,cave.seed);
  addEchoStones(layout.rocks,cave.seed);
  return layout;
}
export function caveContains(id,x,y,radius=0,version=2) {
  const layout=caveLayout(id,version);if(!layout)return false;
  const inside=version===2?(px,py)=>caveMaskContains(layout,px,py):(px,py)=>{
    const extra=Math.max(0,.65+.8*Math.sin(px*1.8+layout.seed)*Math.cos(py*1.6));
    return layout.rooms.some(room=>((px-room.x)/(room.rx+extra))**2+((py-room.y)/(room.ry+extra))**2<1)||layout.passages.some(([a,b])=>segmentDistance(px,py,a,b)<2.8+extra);
  };
  if(!inside(x,y))return false;
  for(let i=0;i<8&&radius;i++){const a=i*Math.PI/4;if(!inside(x+Math.cos(a)*radius,y+Math.sin(a)*radius))return false;}
  return true;
}
export function caveRock(id,version=2) {
  const match=typeof id==='string'?/^(cave:\d+):rock:\d+$/.exec(id):null;
  return match?caveLayout(match[1],version)?.rocks.find(rock=>rock.id===id)??null:null;
}
