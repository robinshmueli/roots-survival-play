import {WORLD} from './config.js';

export function createAtlasView(size=640) {
  let zoom=1,center={x:0,y:0};
  const scale=()=>size*zoom/WORLD.size;
  function clamp() {
    const limit=WORLD.size/2-WORLD.size/(2*zoom);
    if(limit===0){center={x:0,y:0};return;}
    center.x=Math.max(-limit,Math.min(limit,center.x));center.y=Math.max(-limit,Math.min(limit,center.y));
  }
  const view={
    get zoom(){return zoom;},get scale(){return scale();},get center(){return {...center};},
    point(x,y){return {x:size/2+(x-center.x)*scale(),y:size/2-(y-center.y)*scale()};},
    world(x,y){return {x:center.x+(x-size/2)/scale(),y:center.y-(y-size/2)/scale()};},
    bounds(){const half=WORLD.size/(2*zoom);return {minX:center.x-half,maxX:center.x+half,minY:center.y-half,maxY:center.y+half};},
    zoomAt(factor,x=size/2,y=size/2) {
      if(!Number.isFinite(factor)||factor<=0)return;
      const anchor=view.world(x,y);zoom=Math.max(1,Math.min(32,zoom*factor));
      center={x:anchor.x-(x-size/2)/scale(),y:anchor.y+(y-size/2)/scale()};clamp();
    },
    pan(dx,dy){center.x-=dx/scale();center.y+=dy/scale();clamp();},
    focus(position,level=Math.max(WORLD.size/140,zoom)){zoom=Math.max(1,Math.min(32,level));center={x:position.x,y:position.y};clamp();},
    fit(){zoom=1;center={x:0,y:0};},
  };
  return view;
}
