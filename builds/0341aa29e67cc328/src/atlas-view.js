import {WORLD} from './config.js';

export function miniHomePosition(target,origin,size) {
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const left=18,right=size-18,top=24,bottom=size-18;
  const offscreen=target.x<0||target.x>size||target.y<0||target.y>size;
  if(!offscreen) {
    let x=clamp(target.x,left,right),y=clamp(target.y-16,top,bottom);
    if(Math.hypot(x-origin.x,y-origin.y)<24) {
      const alternatives=[[0,-26],[0,26],[-26,0],[26,0]].map(([dx,dy])=>({x:clamp(origin.x+dx,left,right),y:clamp(origin.y+dy,top,bottom)}))
        .filter(pin=>Math.hypot(pin.x-origin.x,pin.y-origin.y)>=24)
        .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
      if(alternatives.length)({x,y}=alternatives[0]);
    }
    return {x,y,offscreen:false,angle:0};
  }
  const from={x:clamp(origin.x,left,right),y:clamp(origin.y,top,bottom)};
  const dx=target.x-from.x,dy=target.y-from.y;
  const t=Math.min(dx>0?(right-from.x)/dx:dx<0?(left-from.x)/dx:Infinity,
    dy>0?(bottom-from.y)/dy:dy<0?(top-from.y)/dy:Infinity);
  return {x:from.x+dx*t,y:from.y+dy*t,offscreen:true,angle:Math.atan2(dy,dx)};
}

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
