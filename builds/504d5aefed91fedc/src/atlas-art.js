import {WORLD,LAKES} from './config.js';
import {biomeBlendAt,biomeColorAt,coastline,COAST} from './biomes.js';
import {lakePoint,lakeBounds} from './lake-data.js';
import {chunkObjects} from './world-data.js';
import {makeCanvas,treeArt,rockArt,cactusArt,TREE_ART,ROCK_TYPES} from './art.js';
import {addCoalDeposits,coalPattern} from './coal-art.js';

export function createAtlasArt(changed=()=>{}) {
  const [terrain,ground]=makeCanvas(280),[overview,ink]=makeCanvas(Math.min(1120,WORLD.size));
  const chunks=new Map(),images=new Map();
  let all=[],ready=false,felled=new Set(),broken=new Set(),planted=[],plantKey='',revision=0;
  for(let py=0;py<terrain.height;py++)for(let px=0;px<terrain.width;px++) {
    const x=((px+.5)/terrain.width-.5)*WORLD.size,y=(.5-(py+.5)/terrain.height)*WORLD.size;
    // Lake contours are painted separately; coarse water samples must not leave
    // square blue blocks outside the true shoreline when the map is magnified.
    ground.fillStyle=biomeColorAt(x,y,false,biomeBlendAt(x,y,null));ground.fillRect(px,py,1,1);
  }
  function objects(cx,cy) {
    const key=`${cx},${cy}`;
    if(!chunks.has(key))chunks.set(key,chunkObjects(cx,cy));
    return chunks.get(key);
  }
  function asset(object) {
    const mineral=object.mineral==='coal'?`coal:${coalPattern(object)}`:object.mineral??'';
    const id=`${object.type}:${object.kind??''}:${object.variant}:${object.snowCover??''}:${mineral}`;
    if(!images.has(id)) {
        const map=object.type==='tree'?treeArt(310,object.kind,object.variant,object.snowCover):object.type==='cactus'?cactusArt(object.variant):rockArt(700+object.variant,ROCK_TYPES[object.variant]);
        if(object.mineral==='coal')addCoalDeposits(map,object.variant,coalPattern(object));
        images.set(id,map.image);map.dispose();
    }
    return images.get(id);
  }
  function drawObject(ctx,object,point,scale) {
    if(felled.has(object.id)||broken.has(object.id))return;
    const p=point(object.x,object.y);
    const width=(object.type==='tree'?TREE_ART.width/16*object.size:object.type==='cactus'?2*object.size:3*object.size)*scale;
    const height=(object.type==='tree'?TREE_ART.height/16*object.size:object.type==='cactus'?3*object.size:2.5*object.size)*scale;
    const foot=object.type==='tree'?TREE_ART.foot:object.type==='cactus'?43/48:.9;
    ctx.drawImage(asset(object),Math.round(p.x-width/2),Math.round(p.y-height*foot),Math.max(1,Math.round(width)),Math.max(1,Math.round(height)));
  }
  const overviewPoint=(x,y)=>({x:x+WORLD.size/2,y:WORLD.size/2-y});
  const canopyColors={pine:'#497248',blue:'#477477',broadleaf:'#56825c',fruit:'#69914c',birch:'#91a95e',
    maple:'#c98443',willow:'#658653',cherry:'#c98fa4',cypress:'#47705b',palm:'#62904f',jungle:'#386c48',
    acacia:'#839757',autumnOak:'#a96e3e',snowPine:'#a6c6bd',snowSpruce:'#8eafb2'};
  function overviewObject(object) {
    ink.save();ink.scale(overview.width/WORLD.size,overview.height/WORLD.size);
    paintOverviewObject(object);ink.restore();
  }
  function paintOverviewObject(object) {
    const p=overviewPoint(object.x,object.y),s=object.size;
    if(felled.has(object.id)||broken.has(object.id))return;
    if(object.type==='tree') {
      ink.fillStyle=canopyColors[object.kind]??'#52764c';ink.beginPath();
      if(['pine','blue','cypress','snowPine','snowSpruce'].includes(object.kind)) {
        ink.moveTo(p.x,p.y-4.5*s);ink.lineTo(p.x+1.7*s,p.y-.6*s);ink.lineTo(p.x-1.7*s,p.y-.6*s);
      } else ink.ellipse(p.x,p.y-2.1*s,1.9*s,1.8*s,0,0,Math.PI*2);
      ink.fill();
    } else {ink.fillStyle=object.type==='rock'?'#7d8f80':'#728746';ink.fillRect(p.x-s,p.y-s,Math.max(1,s*1.8),Math.max(1,s*1.3));}
  }
  function paintOverview() {
    ink.clearRect(0,0,overview.width,overview.height);ink.imageSmoothingEnabled=false;
    for(const object of [...all,...planted])overviewObject(object);
    revision++;changed();
  }
  const jobs=[];
  const minimum=Math.floor(-WORLD.size/2/WORLD.chunkSize),maximum=Math.floor((WORLD.size/2-.001)/WORLD.chunkSize);
  for(let cy=maximum;cy>=minimum;cy--)for(let cx=minimum;cx<=maximum;cx++)jobs.push([cx,cy]);
  let resolveReady;
  const complete=new Promise(resolve=>{resolveReady=resolve;});
  function prepare() {
    const until=performance.now()+7;
    while(jobs.length&&performance.now()<until) {
      const [cx,cy]=jobs.shift(),items=objects(cx,cy).slice().sort((a,b)=>b.y-a.y);
      all.push(...items);ink.imageSmoothingEnabled=false;
      for(const object of items)overviewObject(object);
    }
    revision++;changed();
    if(jobs.length)setTimeout(prepare,8);
    else {all.sort((a,b)=>b.y-a.y);ready=true;paintOverview();resolveReady();}
  }
  // Yield until after the first playable frame; only a few milliseconds of map work run at a time.
  setTimeout(prepare,120);

  function crop(ctx,canvas,bounds,size) {
    const scale=size/(bounds.maxX-bounds.minX);
    ctx.drawImage(canvas,0,0,canvas.width,canvas.height,
      (-WORLD.size/2-bounds.minX)*scale,(bounds.maxY-WORLD.size/2)*scale,WORLD.size*scale,WORLD.size*scale);
  }
  function pathLake(ctx,lake,point,fraction=1) {
    ctx.beginPath();
    for(let i=0;i<=96;i++) {
      const p=lakePoint(lake,i/96*Math.PI*2,fraction),at=point(p.x,p.y);
      if(i===0)ctx.moveTo(at.x,at.y);else ctx.lineTo(at.x,at.y);
    }
    ctx.closePath();
  }
  function drawWater(ctx,bounds,point,scale) {
    // Exact coastal outline remains crisp at every magnification.
    ctx.beginPath();
    const first=point(coastline(bounds.maxY+2),bounds.maxY+2);ctx.moveTo(first.x,first.y);
    for(let y=bounds.maxY+2;y>=bounds.minY-2;y-=2){const p=point(coastline(y),y);ctx.lineTo(p.x,p.y);}
    ctx.lineWidth=6*scale;ctx.strokeStyle='#d9c48f';ctx.stroke();
    const bottom=point(COAST.side*(WORLD.size/2+10),bounds.minY-2),top=point(COAST.side*(WORLD.size/2+10),bounds.maxY+2);
    ctx.lineTo(bottom.x,bottom.y);ctx.lineTo(top.x,top.y);ctx.closePath();ctx.fillStyle='#477f8f';ctx.fill();
    for(const lake of LAKES) {
      const box=lakeBounds(lake);
      if(box.maxX<bounds.minX||box.minX>bounds.maxX||box.maxY<bounds.minY||box.minY>bounds.maxY)continue;
      pathLake(ctx,lake,point);ctx.lineJoin='round';ctx.lineWidth=Math.max(1,lake.shore*2*scale);ctx.strokeStyle='#d7c493';ctx.stroke();
      ctx.fillStyle='#88b7ad';ctx.fill();
      pathLake(ctx,lake,point,.91);ctx.fillStyle='#6ca2a1';ctx.fill();
      pathLake(ctx,lake,point,.72);ctx.fillStyle='#518e96';ctx.fill();
      pathLake(ctx,lake,point,.45);ctx.fillStyle='#477f8f';ctx.fill();
    }
  }
  return {
    ready:complete,
    get revision(){return revision;},
    stats(){return {ready,chunks:chunks.size,objects:all.length,trees:all.filter(object=>object.type==='tree').length,lakes:LAKES.length};},
    setFelled(next,removedRocks=[],newPlants=[]) {
      const incoming=new Set(next),removed=new Set(removedRocks),key=JSON.stringify(newPlants);
      if(incoming.size===felled.size&&[...incoming].every(id=>felled.has(id))&&removed.size===broken.size&&[...removed].every(id=>broken.has(id))&&key===plantKey)return;
      felled=incoming;broken=removed;planted=newPlants;plantKey=key;paintOverview();
    },
    render(ctx,bounds,size) {
      const scale=size/(bounds.maxX-bounds.minX);
      const point=(x,y)=>({x:(x-bounds.minX)*scale,y:(bounds.maxY-y)*scale});
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,size,size);ctx.fillStyle='#293c31';ctx.fillRect(0,0,size,size);
      crop(ctx,terrain,bounds,size);drawWater(ctx,bounds,point,scale);
      if(scale<1.6)crop(ctx,overview,bounds,size);
      else {
        const visible=[];
        for(let cy=Math.floor((bounds.minY-8)/32);cy<=Math.floor((bounds.maxY+1)/32);cy++) {
          for(let cx=Math.floor((bounds.minX-4)/32);cx<=Math.floor((bounds.maxX+4)/32);cx++) {
            if(cx<minimum||cx>maximum||cy<minimum||cy>maximum)continue;
            for(const object of objects(cx,cy)) {
              if(object.x<bounds.minX-4||object.x>bounds.maxX+4||object.y<bounds.minY-8||object.y>bounds.maxY+1)continue;
              visible.push(object);
            }
          }
        }
        for(const object of planted)if(object.x>=bounds.minX-4&&object.x<=bounds.maxX+4&&object.y>=bounds.minY-8&&object.y<=bounds.maxY+1)visible.push(object);
        visible.sort((a,b)=>b.y-a.y);
        for(const object of visible)drawObject(ctx,object,point,scale);
      }
      ctx.restore();
    },
  };
}
