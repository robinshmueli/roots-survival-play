import {BIOMES} from './biomes.js';

// Native pixel artwork: the wheel stays sharp at the game's low resolution.
let artwork;
export function wheelArt() {
  if(artwork)return artwork;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=240;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.translate(17,0);
  function disk(x,y,r,color) {
    ctx.fillStyle=color;
    for(let py=-r;py<=r;py+=2){const half=Math.floor(Math.sqrt(Math.max(0,r*r-py*py))/2)*2;ctx.fillRect(x-half,y+py,half*2,2);}
  }
  disk(105,124,101,'#14251dd9');disk(103,120,101,'#29271d');disk(103,118,99,'#b4975a');
  disk(103,120,97,'#6e5231');disk(103,120,91,'#302d21');disk(103,120,88,'#58412c');
  const boards=['#5b452f','#624b33','#59422e','#644c32','#59422c'];
  for(let y=33;y<208;y++)for(let x=16;x<192;x++) {
    if((x-103)**2+(y-120)**2>87**2)continue;
    const seam=(y-32)%18,noise=((x*137+y*79)^(x*17+y*23))>>>0;
    ctx.fillStyle=seam<2?'#352f23':seam===2?'#7b5b39':noise%47===0?'#715437':noise%53===0?'#493a2a':boards[Math.floor((y-32)/18)%boards.length];
    ctx.fillRect(x,y,1,1);
    if(seam>4&&noise%373===0){ctx.fillStyle='#473827';ctx.fillRect(x,y,Math.min(7,191-x),1);}
  }
  // Braided outer rope, pegs and moss share the same pixel scale as the game.
  for(let i=0;i<176;i++) {
    const a=i/176*Math.PI*2,x=Math.round(103+94*Math.cos(a)),y=Math.round(120+94*Math.sin(a));
    ctx.fillStyle=i%2?'#856238':'#c1a16a';ctx.fillRect(x-2,y-2,4,4);
    if(i%2===0){ctx.fillStyle='#dec48a';ctx.fillRect(x-1,y-2,2,1);}
  }
  for(const a of [-2.3,-.9,.6,2.1]) {
    const x=Math.round(103+87*Math.cos(a)),y=Math.round(120+87*Math.sin(a));
    ctx.fillStyle='#29291e';ctx.fillRect(x-3,y-3,6,6);ctx.fillStyle='#a0a080';ctx.fillRect(x-1,y-2,2,2);
  }
  for(const [x,y] of [[27,53],[32,47],[40,43],[173,194],[180,184],[165,201]]) {
    ctx.fillStyle='#263c29';ctx.fillRect(x-2,y,8,4);ctx.fillRect(x,y-3,4,9);
    ctx.fillStyle='#607748';ctx.fillRect(x,y,5,2);ctx.fillStyle='#8b995c';ctx.fillRect(x+1,y-2,2,3);
  }
  artwork=canvas;return canvas;
}

const groundCache=new Map();
export function craftGroundArt(biome=BIOMES.forest) {
  biome=BIOMES[biome?.id]??BIOMES.forest;
  if(groundCache.has(biome.id))return groundCache.get(biome.id);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=240;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const snow=biome.id==='snow',sand=['desert','beach'].includes(biome.id),water=['ocean','lake'].includes(biome.id);
  // A patch of the local ground with a soft, uneven pixel edge, never a wooden rim.
  for(let y=12;y<228;y+=2)for(let x=12;x<228;x+=2) {
    const dx=x-120,dy=y-120,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    const edge=99+Math.sin(a*7)*3+Math.cos(a*11)*2;
    if(r>edge+3)continue;
    const noise=((x*137+y*79)^(x*17+y*23))>>>0;
    ctx.globalAlpha=r>edge?.2:r>edge-3?.65:1;
    ctx.fillStyle=noise%7===0?biome.alternate:biome.color;ctx.fillRect(x,y,2,2);
    if(r<edge-3&&noise%19===0){ctx.fillStyle=biome.detail;ctx.globalAlpha=.4;ctx.fillRect(x,y,3,1);}
  }
  ctx.globalAlpha=1;
  for(let i=0;i<160;i++) {
    const x=30+(i*67)%180,y=28+(i*103)%184;
    if(Math.hypot(x-120,y-120)>91)continue;
    ctx.fillStyle=biome.detail;ctx.globalAlpha=.55;
    if(snow) {
      ctx.fillRect(x,y,5,1);ctx.fillRect(x+1,y+1,3,1);
      ctx.fillStyle='#f6faf2';ctx.fillRect(x,y-1,4,1);
    } else if(sand) {
      ctx.fillRect(x,y,i%4===0?8:2,1);
      if(i%4===0){ctx.fillStyle='#f4dfaa';ctx.fillRect(x+1,y-1,5,1);}
    } else if(water) {
      ctx.fillRect(x,y,6,1);ctx.fillRect(x+4,y+1,3,1);
    } else {
      ctx.fillRect(x,y,1,3);ctx.fillRect(x-2,y-1,1,2);ctx.fillRect(x+2,y,1,2);
      if(biome.id==='autumn'&&i%2===0) {
        ctx.globalAlpha=.9;ctx.fillStyle=['#b46b36','#cf8c43','#a5532e'][i%3];ctx.fillRect(x-2,y,5,2);ctx.fillRect(x-1,y-1,3,4);
      } else if(biome.id==='cherry'&&i%3===0) {
        ctx.fillStyle='#e8b5bc';ctx.globalAlpha=.9;ctx.fillRect(x,y,3,2);ctx.fillRect(x+1,y-1,2,1);
      } else if(biome.id==='jungle'&&i%4===0) {
        ctx.fillStyle='#78944e';ctx.fillRect(x,y,5,2);ctx.fillRect(x+1,y-1,3,4);
      }
    }
  }
  ctx.globalAlpha=1;groundCache.set(biome.id,canvas);return canvas;
}

export function paintCraftWheel(canvas,progress=0,{station=false,biome=BIOMES.forest}={}) {
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,240,240);
  ctx.drawImage(station?wheelArt():craftGroundArt(biome),0,0);
  for(let i=0;i<180;i++) {
    const a=-Math.PI/2+i/180*Math.PI*2,x=Math.round(120+44*Math.cos(a)),y=Math.round(120+44*Math.sin(a));
    ctx.fillStyle=i/180<progress?'#c2d98a':station?'#262d20':'#32483b80';ctx.fillRect(x-2,y-2,4,4);
    if(i/180<progress){ctx.fillStyle='#e3edb2';ctx.fillRect(x-1,y-2,2,1);}
  }
}
