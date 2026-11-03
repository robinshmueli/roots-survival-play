import {t} from './i18n.js';
import {REGION_CENTERS,BIOMES,coastline,COAST} from './biomes.js';
import {makeCanvas,polygon,rect} from './art.js';
import {CAMP,WORLD} from './config.js';
import {miniHomePosition} from './atlas-view.js';
import {skullArt} from './death-loot-art.js';
import {recoveryTime} from './death-loot.js';

const colors={forest:'#7eaf5f',jungle:'#41865c',desert:'#d8b167',autumn:'#e29449',
  cherry:'#e7a6c2',snow:'#dfedf0',beach:'#e8ca8b',ocean:'#70b9d5'};
export const BIOME_MARKERS=[...REGION_CENTERS,
  {id:'beach',x:coastline(-50)-14*COAST.side,y:-50},{id:'ocean',x:(coastline(25)+COAST.side*WORLD.size/2)/2,y:25},
].map(region=>({...region,color:colors[region.id]}));
const icons=new Map();
let homeIcon;
function getHomeIcon() {
  if(!homeIcon) {
    const [canvas,ink]=makeCanvas(20,22);
    polygon(ink,[[3,9],[10,3],[17,9],[17,18],[3,18]],'#ead6a0','#243b2e');
    polygon(ink,[[1,9],[10,1],[19,9],[17,11],[10,5],[3,11]],'#b98450','#243b2e');
    rect(ink,8,12,4,7,'#3c5b3b');rect(ink,4,11,3,3,'#fff0bc');
    rect(ink,3,18,14,2,'#304b34');homeIcon=canvas;
  }
  return homeIcon;
}
export function drawHomeMarker(ctx,point,size,label=false,home=CAMP) {
  if(!home)return null;
  const at=point(home.x,home.y);
  if(at.x<0||at.x>size||at.y<0||at.y>size)return;
  ctx.save();ctx.imageSmoothingEnabled=false;
  const width=label?22:16,height=label?24:18;
  const x=Math.max(width/2,Math.min(size-width/2,at.x)),y=Math.max(height+2,at.y);
  homeConnector(ctx,x,y-3,at);
  ctx.drawImage(getHomeIcon(),Math.round(x-width/2),Math.round(y-height-2),width,height);
  homeAnchor(ctx,at);
  if(label) {
    ctx.textAlign='center';ctx.font='bold 12px Heebo,Arial,sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#21382c';ctx.fillStyle='#ffe6ac';
    const labelX=Math.max(55,Math.min(size-55,x));
    ctx.strokeText(t("בית · האוהל"),labelX,Math.max(14,y-height-8));ctx.fillText(t("בית · האוהל"),labelX,Math.max(14,y-height-8));
  }
  ctx.restore();
}
export function drawMiniHomeMarker(ctx,point,size,position,home=CAMP) {
  if(!home)return null;
  const target=point(home.x,home.y),pin=miniHomePosition(target,point(position.x,position.y),size);
  const x=Math.round(pin.x),y=Math.round(pin.y);
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(!pin.offscreen)homeConnector(ctx,x,y+9,target);
  ctx.fillStyle='#20382aeb';ctx.fillRect(x-11,y-12,22,24);
  ctx.strokeStyle='#e7cf91';ctx.lineWidth=1;ctx.strokeRect(x-11.5,y-12.5,23,25);
  if(pin.offscreen) {
    const dx=Math.cos(pin.angle),dy=Math.sin(pin.angle);
    ctx.beginPath();ctx.moveTo(x+dx*16,y+dy*16);
    ctx.lineTo(x+dx*9-dy*4,y+dy*9+dx*4);ctx.lineTo(x+dx*9+dy*4,y+dy*9-dx*4);ctx.closePath();
    ctx.lineWidth=2;ctx.strokeStyle='#20382a';ctx.fillStyle='#ffe0a0';ctx.stroke();ctx.fill();
  }
  ctx.drawImage(getHomeIcon(),x-8,y-9,16,18);
  if(!pin.offscreen)homeAnchor(ctx,target);
  ctx.restore();
  return pin;
}
export function deathMarkerPins(targets,origin,size,occupied=[],mini=true) {
  const pins=[],margin=mini?18:16,step=mini?26:40,clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  for(const target of targets) {
    if(!mini&&(target.x<0||target.x>size||target.y<0||target.y>size))continue;
    const base=mini?miniHomePosition(target,origin,size):{x:target.x,y:target.y+22,offscreen:false};
    const candidates=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]].map(([dx,dy])=>({x:clamp(base.x+dx*step,margin,size-margin),y:clamp(base.y+dy*step,margin,size-margin)}));
    const score=p=>[...occupied,...pins].reduce((sum,q)=>sum+(Math.hypot(p.x-q.x,p.y-q.y)<(mini?24:26)?10000:0),0)+(Math.hypot(p.x-origin.x,p.y-origin.y)<(mini?24:40)?10000:0)+Math.hypot(p.x-base.x,p.y-base.y);
    candidates.sort((a,b)=>score(a)-score(b));const pin=candidates[0];
    pins.push({...pin,id:target.id,remaining:target.remaining,target,offscreen:base.offscreen,angle:Math.atan2(target.y-pin.y,target.x-pin.x)});
  }
  return pins;
}
export function drawDeathMarkers(ctx,point,size,graves,position,home=null,mini=false) {
  if(!graves.length)return [];
  const origin=point(position.x,position.y),occupied=[];
  if(home){const at=point(home.x,home.y);occupied.push(mini?miniHomePosition(at,origin,size):{x:at.x,y:at.y-14});}
  const targets=graves.map(grave=>({...point(grave.x,grave.y),id:grave.id,remaining:grave.remaining})),pins=deathMarkerPins(targets,origin,size,occupied,mini);
  ctx.save();ctx.imageSmoothingEnabled=false;
  for(const [index,pin] of pins.entries()) {
    const x=Math.round(pin.x),y=Math.round(pin.y),width=mini?16:22;
    if(!pin.offscreen){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(pin.target.x,pin.target.y);ctx.strokeStyle='#d78d76';ctx.lineWidth=1;ctx.stroke();}
    ctx.fillStyle='#452e2bed';ctx.fillRect(x-width/2-2,y-width/2-2,width+4,width+4);ctx.strokeStyle='#e69579';ctx.lineWidth=1;ctx.strokeRect(x-width/2-2.5,y-width/2-2.5,width+5,width+5);
    ctx.drawImage(skullArt(),x-width/2,y-width/2,width,width);
    if(pin.offscreen) {
      const dx=Math.cos(pin.angle),dy=Math.sin(pin.angle);ctx.beginPath();ctx.moveTo(x+dx*17,y+dy*17);ctx.lineTo(x+dx*11-dy*4,y+dy*11+dx*4);ctx.lineTo(x+dx*11+dy*4,y+dy*11-dx*4);ctx.closePath();ctx.fillStyle='#f7c0a0';ctx.strokeStyle='#3a2e29';ctx.lineWidth=2;ctx.stroke();ctx.fill();
    } else if(!mini&&index===pins.length-1) {
      ctx.font='bold 12px Heebo,Arial,sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#302f28';ctx.fillStyle='#ffe2bd';
      const labelX=Math.max(60,Math.min(size-60,x)),labelY=y>size-45?y-22:y+29,text=t("ציוד · {0}", [recoveryTime(pin.remaining)]);ctx.strokeText(text,labelX,labelY);ctx.fillText(text,labelX,labelY);
    }
  }
  ctx.restore();return pins;
}
function homeConnector(ctx,x,y,target) {
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(target.x,target.y);
  ctx.strokeStyle='#20382a';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#f4d898';ctx.lineWidth=1;ctx.stroke();
}
function homeAnchor(ctx,point) {
  const x=Math.max(0,Math.min(ctx.canvas.width-1,Math.round(point.x))),y=Math.max(0,Math.min(ctx.canvas.height-1,Math.round(point.y)));
  ctx.fillStyle='#20382a';ctx.fillRect(x-3,y-3,7,7);
  ctx.fillStyle='#f4d898';ctx.fillRect(x-2,y-2,5,5);
  ctx.fillStyle='#20382a';ctx.fillRect(x-1,y-1,3,3);
  ctx.fillStyle='#fff2c3';ctx.fillRect(x,y,1,1);
}
function shade(hex,factor) {
  return '#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*factor)).toString(16).padStart(2,'0')).join('');
}
function treeIcon(color) {
  if(icons.has(color))return icons.get(color);
  const [canvas,ctx]=makeCanvas(32,40),outline='#263c32';
  polygon(ctx,[[13,21],[18,21],[18,32],[22,37],[17,36],[15,34],[12,37],[8,37],[12,32]],'#9c784c',outline);
  rect(ctx,14,24,2,10,'#d1ac6f');
  polygon(ctx,[[4,12],[8,9],[8,5],[13,3],[18,3],[23,6],[24,10],[28,12],[29,18],
    [26,23],[20,25],[15,23],[9,25],[4,22],[2,17]],shade(color,.72),outline);
  polygon(ctx,[[5,12],[10,10],[10,6],[15,5],[20,6],[23,12],[26,13],[27,18],[23,21],
    [18,20],[14,22],[8,21],[4,17]],color);
  polygon(ctx,[[7,12],[12,11],[12,8],[16,7],[20,9],[19,12],[15,14],[10,14],[8,17],[5,16]],shade(color,1.14));
  rect(ctx,21,15,4,2,shade(color,.88));rect(ctx,12,18,3,2,shade(color,.85));
  icons.set(color,canvas);return canvas;
}

// Emblems belong to the atlas overlay; they never create objects in the playable world.
export function drawBiomeMarkers(ctx,point,size,known=()=>true) {
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 14px Heebo,Arial,sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#20392ded';ctx.fillStyle='#fff0c8';
  for(const region of BIOME_MARKERS) {
    if(!known(region.x,region.y))continue;
    const at=point(region.x,region.y);
    if(at.x<20||at.x>size-20||at.y<23||at.y>size-34)continue;
    const x=Math.round(at.x),y=Math.round(at.y);
    ctx.fillStyle='#20392d80';ctx.fillRect(x-10,y+13,20,4);
    ctx.drawImage(treeIcon(region.color),x-16,y-22);
    const labelX=Math.max(58,Math.min(size-58,x));
    ctx.fillStyle='#fff0c8';ctx.strokeText(BIOMES[region.id].label,labelX,y+29);ctx.fillText(BIOMES[region.id].label,labelX,y+29);
  }
  ctx.restore();
}
