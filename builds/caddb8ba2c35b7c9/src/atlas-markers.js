import {REGION_CENTERS,BIOMES,coastline} from './biomes.js';
import {makeCanvas,polygon,rect} from './art.js';

const colors={forest:'#7eaf5f',jungle:'#41865c',desert:'#d8b167',autumn:'#e29449',
  cherry:'#e7a6c2',snow:'#dfedf0',beach:'#e8ca8b',ocean:'#70b9d5'};
export const BIOME_MARKERS=[...REGION_CENTERS,
  {id:'beach',x:coastline(-50)-14,y:-50},{id:'ocean',x:385,y:25},
].map(region=>({...region,color:colors[region.id]}));
const icons=new Map();
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
