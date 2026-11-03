import {randomGenerator} from './art.js';
import {addExtraIron,addEchoStones} from './cave-minerals.js';

export const CAVE_GRID={cell:.5,width:128,height:132,minX:-32,minY:-25};
export function caveMaskContains(layout,x,y) {
  const g=CAVE_GRID,ix=Math.floor((x-g.minX)/g.cell),iy=Math.floor((y-g.minY)/g.cell);
  return ix>=0&&iy>=0&&ix<g.width&&iy<g.height&&!!layout.floor[iy*g.width+ix];
}
export function generateCave(id,seed,otherPortal=null) {
  const random=randomGenerator(seed^0x57de319),g=CAVE_GRID;
  const tier=Math.floor(random()*3),height=[22,39,54][tier],halfWidth=[9,18,25][tier];
  let floor=new Uint8Array(g.width*g.height);
  const paths=[],phase=random()*7,phase2=random()*7;
  function brush(x,y,radius) {
    const minX=Math.max(0,Math.floor((x-radius-g.minX)/g.cell)),maxX=Math.min(g.width-1,Math.ceil((x+radius-g.minX)/g.cell));
    const minY=Math.max(0,Math.floor((y-radius-g.minY)/g.cell)),maxY=Math.min(g.height-1,Math.ceil((y+radius-g.minY)/g.cell));
    for(let iy=minY;iy<=maxY;iy++)for(let ix=minX;ix<=maxX;ix++) {
      const dx=g.minX+(ix+.5)*g.cell-x,dy=g.minY+(iy+.5)*g.cell-y;
      const angle=Math.atan2(dy,dx),edge=radius*(1+.12*Math.sin(angle*5+phase)+.08*Math.cos(angle*7+phase2));
      if(Math.hypot(dx,dy)<edge)floor[iy*g.width+ix]=1;
    }
  }
  const spine=[];
  for(let n=0;n<=height;n++) {
    const y=-17+n,x=Math.sin(n*.15+phase)*halfWidth*.35+Math.sin(n*.34+phase2)*halfWidth*.12;
    const taper=Math.min(1,n/5),point={x:x*taper,y};spine.push(point);
    brush(point.x,point.y,2.7+taper*(1.8+Math.sin(n*.24+phase)*1.3));
  }
  paths.push(spine);
  const branches=[2,4,7][tier];
  for(let b=0;b<branches;b++) {
    const source=spine[Math.floor((.2+random()*.65)*height)],path=[source];
    let x=source.x,y=source.y,angle=random()*Math.PI*2;
    const length=7+random()*(7+tier*8);
    for(let n=0;n<length;n++) {
      angle+=(random()-.5)*.8;x+=Math.cos(angle);y+=Math.sin(angle);
      if(Math.abs(x)>halfWidth-3||y<-16||y>-17+height-1)break;
      path.push({x,y});brush(x,y,2.3+random()*1.7);
    }
    paths.push(path);
  }
  // Cellular smoothing joins nearby lobes into one irregular cave silhouette.
  const smoothed=floor.slice();
  for(let y=1;y<g.height-1;y++)for(let x=1;x<g.width-1;x++) {
    let neighbors=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)neighbors+=floor[(y+dy)*g.width+x+dx];
    smoothed[y*g.width+x]=Number(neighbors>=5);
  }
  floor=smoothed;
  const exits=[{id:'entry',x:0,y:-20,dy:-1,portalId:id}];
  const tip=spine.at(-1);
  if(otherPortal)exits.push({id:'far',x:tip.x,y:tip.y,dy:1,portalId:otherPortal});
  for(const exit of exits)for(let n=0;n<=4;n++)brush(exit.x,exit.y-exit.dy*n*.6,1.9);
  for(let n=0;n<=6;n++)brush(0,-20+n*.5,1.9);
  const start=Math.floor((-17-g.minY)/g.cell)*g.width+Math.floor(-g.minX/g.cell),seen=new Uint8Array(floor.length),queue=[start];seen[start]=1;
  for(let i=0;i<queue.length;i++)for(const offset of [-1,1,-g.width,g.width]) {const next=queue[i]+offset;if(next>=0&&next<floor.length&&floor[next]&&!seen[next]){seen[next]=1;queue.push(next);}}
  floor=seen;
  const layout={id,version:2,seed,tier,size:['small','medium','large'][tier],floor,paths,rooms:[],passages:[],exits,rocks:[]};
  const contains=(x,y,r)=>{if(!caveMaskContains(layout,x,y))return false;for(let n=0;n<8;n++)if(!caveMaskContains(layout,x+Math.cos(n*Math.PI/4)*r,y+Math.sin(n*Math.PI/4)*r))return false;return true;};
  for(let iy=-6;iy<=13;iy++)for(let ix=-10;ix<=10;ix++) {
    const x=ix*2.8+random()*.7-.35,y=iy*2.8+random()*.7-.35;
    if(!contains(x,y,1.35)||exits.some(exit=>Math.hypot(x-exit.x,y-exit.y)<4)||paths.some(path=>path.some(point=>Math.hypot(x-point.x,y-point.y)<1.75))||random()>.82)continue;
    const n=layout.rocks.length,roll=random(),mineral=roll<.08?'iron':roll<.46?'coal':roll<.66?'copper':'stone',size=.72+random()*.25;
    layout.rocks.push({id:`${id}:rock:${n}`,type:'rock',biome:'cave',x,y,size,rx:size*1.05,ry:size*.4,variant:n%5,mineral});
  }
  if(layout.rocks.length>=8&&!layout.rocks.some(rock=>rock.mineral==='iron'))layout.rocks.at(-1).mineral='iron';
  let iron=0;for(const rock of layout.rocks)if(rock.mineral==='iron'&&++iron>Math.max(1,Math.ceil(layout.rocks.length/12)))rock.mineral='coal';
  addExtraIron(layout.rocks,seed);
  addEchoStones(layout.rocks,seed);
  const cells=queue.map(index=>({x:g.minX+(index%g.width)*g.cell,y:g.minY+Math.floor(index/g.width)*g.cell}));
  layout.bounds={minX:Math.max(-32,Math.floor(Math.min(...cells.map(p=>p.x)))-2),maxX:Math.min(32,Math.ceil(Math.max(...cells.map(p=>p.x)))+2),minY:-25,maxY:Math.min(41,Math.ceil(Math.max(...cells.map(p=>p.y)))+2)};
  return layout;
}
