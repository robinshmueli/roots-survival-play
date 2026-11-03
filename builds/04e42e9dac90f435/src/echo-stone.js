import {VIEW} from './config.js';

const screenWidth=VIEW.referenceHeight/VIEW.zoom/VIEW.pixelsPerUnit*VIEW.referenceAspect;
export const ECHO={radius:screenWidth*2,growSpeed:10,particleLimit:720,cell:.5,clearance:.32,brightness:.75,orbitSeconds:2.2,burstSeconds:.65,sectionRadius:3};
export const ECHO_MINERALS={iron:0,copper:1,coal:2};

// Wide chamber interiors seed regions; narrow passages belong to the nearest
// chamber. This keeps a scan in the current room rather than a connected cave.
export function createEchoSections(bounds,contains) {
  const step=ECHO.cell,minX=Math.floor(bounds.minX/step)*step,minY=Math.floor(bounds.minY/step)*step;
  const width=Math.ceil((bounds.maxX-minX)/step)+1,height=Math.ceil((bounds.maxY-minY)/step)+1,total=width*height;
  const floor=new Uint8Array(total),core=new Uint8Array(total),labels=new Int32Array(total),queue=new Int32Array(total);
  const point=i=>({x:minX+(i%width)*step,y:minY+Math.floor(i/width)*step});
  const neighbors=i=>{const x=i%width,y=Math.floor(i/width);return [x?i-1:-1,x<width-1?i+1:-1,y?i-width:-1,y<height-1?i+width:-1].filter(n=>n>=0);};
  for(let i=0;i<total;i++){const p=point(i);floor[i]=Number(contains(p.x,p.y,0));if(floor[i])core[i]=Number(contains(p.x,p.y,ECHO.sectionRadius));}
  let region=0;
  for(let i=0;i<total;i++)if(core[i]&&!labels[i]) {
    let head=0,tail=1;queue[0]=i;labels[i]=++region;
    while(head<tail)for(const n of neighbors(queue[head++]))if(core[n]&&!labels[n]){labels[n]=region;queue[tail++]=n;}
  }
  if(!region)for(let i=0;i<total;i++)if(floor[i]&&!labels[i]) {
    let head=0,tail=1;queue[0]=i;labels[i]=++region;
    while(head<tail)for(const n of neighbors(queue[head++]))if(floor[n]&&!labels[n]){labels[n]=region;queue[tail++]=n;}
  }
  let head=0,tail=0;for(let i=0;i<total;i++)if(labels[i])queue[tail++]=i;
  while(head<tail){const i=queue[head++];for(const n of neighbors(i))if(floor[n]&&!labels[n]){labels[n]=labels[i];queue[tail++]=n;}}
  const sectionAt=p=>{const x=Math.round((p.x-minX)/step),y=Math.round((p.y-minY)/step);return x>=0&&x<width&&y>=0&&y<height?labels[y*width+x]:0;};
  return {count:region,sectionAt,same(a,b){const id=sectionAt(a);return id!==0&&sectionAt(b)===id;}};
}

export function echoLineVisible(from,to,contains) {
  const distance=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.max(1,Math.ceil(distance/.25));
  for(let i=1;i<=steps;i++)if(!contains(from.x+(to.x-from.x)*i/steps,from.y+(to.y-from.y)*i/steps))return false;
  return true;
}

// Rank one valuable destination instead of disclosing every nearby deposit.
export function scanEcho(source,rocks,standing=()=>true,radius=ECHO.radius) {
  return rocks.filter(rock=>rock.id!==source.id&&Object.hasOwn(ECHO_MINERALS,rock.mineral)&&standing(rock.id))
    .map(rock=>({...rock,distance:Math.hypot(rock.x-source.x,rock.y-source.y)}))
    .filter(rock=>rock.distance<=radius)
    .sort((a,b)=>ECHO_MINERALS[a.mineral]-ECHO_MINERALS[b.mineral]||a.distance-b.distance||a.id.localeCompare(b.id));
}

// One flood fill finds reachable approach points for every candidate. Diagonal
// steps require both adjacent cells, so the dust never cuts through a corner.
export function findEchoTrail(origin,targets,bounds,blocked,radius=ECHO.radius) {
  if(!targets.length)return null;
  const step=ECHO.cell,minX=Math.floor(bounds.minX/step)*step,minY=Math.floor(bounds.minY/step)*step;
  const width=Math.ceil((bounds.maxX-minX)/step)+1,height=Math.ceil((bounds.maxY-minY)/step)+1,total=width*height;
  if(total>50000||width<1||height<1)return null;
  const status=new Uint8Array(total),parent=new Int32Array(total).fill(-1),depth=new Int32Array(total),queue=new Int32Array(total);
  const point=i=>({x:minX+(i%width)*step,y:minY+Math.floor(i/width)*step});
  function clear(x,y) {
    if(x<0||y<0||x>=width||y>=height)return false;
    const i=y*width+x;if(!status[i]){const p=point(i);status[i]=Math.hypot(p.x-origin.x,p.y-origin.y)<=radius+2&&!blocked(p.x,p.y,ECHO.clearance)?1:2;}
    return status[i]===1;
  }
  const gx=Math.round((origin.x-minX)/step),gy=Math.round((origin.y-minY)/step);let start=-1,best=Infinity;
  for(let y=gy-2;y<=gy+2;y++)for(let x=gx-2;x<=gx+2;x++)if(clear(x,y)) {
    const i=y*width+x,p=point(i),distance=Math.hypot(p.x-origin.x,p.y-origin.y);
    const safe=[.25,.5,.75].every(t=>!blocked(origin.x+(p.x-origin.x)*t,origin.y+(p.y-origin.y)*t,ECHO.clearance));
    if(safe&&distance<best){start=i;best=distance;}
  }
  if(start<0)return null;
  let head=0,tail=1;queue[0]=start;parent[start]=start;
  const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(head<tail) {
    const current=queue[head++],x=current%width,y=Math.floor(current/width);
    for(const [dx,dy] of directions) {
      const nx=x+dx,ny=y+dy;if(!clear(nx,ny)||dx&&dy&&(!clear(x+dx,y)||!clear(x,y+dy)))continue;
      const next=ny*width+nx;if(parent[next]>=0)continue;
      if(blocked(minX+(x+dx*.5)*step,minY+(y+dy*.5)*step,ECHO.clearance))continue;
      parent[next]=current;depth[next]=depth[current]+1;queue[tail++]=next;
    }
  }
  for(const target of targets) {
    const tx=Math.round((target.x-minX)/step),ty=Math.round((target.y-minY)/step),reach=Math.max(1.4,(target.rx??.7)+.65),cells=Math.ceil(reach/step);
    let end=-1,cost=Infinity;
    for(let y=Math.max(0,ty-cells);y<=Math.min(height-1,ty+cells);y++)for(let x=Math.max(0,tx-cells);x<=Math.min(width-1,tx+cells);x++) {
      const i=y*width+x;if(parent[i]<0)continue;
      const p=point(i),distance=Math.hypot(p.x-target.x,p.y-target.y);if(distance>reach)continue;
      const next=depth[i]+distance/step*.25;if(next>=cost)continue;
      let visible=true;
      for(let t=0;t<1;t+=.15/Math.max(.15,distance))if(blocked(p.x+(target.x-p.x)*t,p.y+(target.y-p.y)*t,.06,target.id)){visible=false;break;}
      if(visible){end=i;cost=next;}
    }
    if(end<0)continue;
    const points=[];for(let i=end;;i=parent[i]){points.push(point(i));if(i===start)break;}
    points.reverse();if(Math.hypot(points[0].x-origin.x,points[0].y-origin.y)>.01)points.unshift({x:origin.x,y:origin.y});
    let length=0;for(let i=0;i<points.length;i++){if(i)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);points[i].distance=length;}
    return {target,points,length};
  }
  return null;
}

export function echoPhase(length,age) {
  const arrival=length/ECHO.growSpeed,orbit=Math.max(0,age-arrival);
  return {arrival,orbit,stage:age<arrival?'travel':orbit<ECHO.orbitSeconds?'orbit':orbit<ECHO.orbitSeconds+ECHO.burstSeconds?'burst':'done'};
}
