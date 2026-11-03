import {makeCanvas,polygon,ellipse,rect} from './art.js';
import {rotateGroundPoint,normalizeRotation} from './structures.js';

// Turn furniture on its ground plane; height always remains upright.
export function directionalStructureArt(type,rotation,frame=0) {
  const [canvas,ctx]=makeCanvas(112),turn=normalizeRotation(rotation),ink='#353c2c';
  ctx.translate(8,8);
  const ground=(x,y)=>{if(type!=='workbench')return rotateGroundPoint(x,y,turn);const p=rotateGroundPoint(x,y/.55,turn);return {x:p.x,y:p.y*.55};};
  const project=(x,y,z=0)=>[Math.round(48+x*20),Math.round(72-(y+z)*20)];
  const point=(x,y,z=0)=>{const p=ground(x,y);return project(p.x,p.y,z);};
  const face=(points,color,outline=ink)=>polygon(ctx,points.map(p=>point(...p)),color,outline);
  function tint(hex,factor) {return '#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*factor)).toString(16).padStart(2,'0')).join('');}
  function grain(left,top,right,bottom,color,vertical=false) {
    const palette=[.84,.94,1,1.08,1.16].map(factor=>tint(color,factor));
    for(let y=top+1;y<bottom;y++)for(let x=left+1;x<right;x++) {
      const noise=((x*137+y*71)^(x*19+y*23))>>>0,edge=x-left<2||y-top<2;
      const stripe=(vertical?x-left:y-top)%8===0;
      ctx.fillStyle=palette[edge?4:stripe?0:noise%19===0?1:noise%23===0?3:2];ctx.fillRect(x,y,1,1);
    }
  }
  function box(x,y,rx,ry,z0,z1,top='#b78e50',front='#87603a') {
    const center=ground(x,y),swap=turn%2===1,hx=swap?ry/(type==='workbench'?.55:1):rx,hy=swap?rx*(type==='workbench'?.55:1):ry;
    const corners=[[center.x-hx,center.y-hy],[center.x+hx,center.y-hy],[center.x+hx,center.y+hy],[center.x-hx,center.y+hy]];
    polygon(ctx,[project(...corners[0],z0),project(...corners[1],z0),project(...corners[1],z1),project(...corners[0],z1)],front,ink);
    const frontTop=project(...corners[0],z1),frontRight=project(...corners[1],z0);
    grain(frontTop[0],frontTop[1],frontRight[0],frontRight[1],front,true);
    polygon(ctx,corners.map(p=>project(...p,z1)),top,ink);
    const backTop=project(...corners[3],z1),frontEdge=project(...corners[1],z1);
    grain(backTop[0],backTop[1],frontEdge[0],frontEdge[1],top);
    const [a,b]=[project(...corners[0],z1),project(...corners[1],z1)];rect(ctx,a[0]+1,a[1],Math.max(1,b[0]-a[0]-1),1,'#ddbd7d');
  }
  if(type==='wood-wall') {
    ellipse(ctx,48,72,turn%2?8:29,turn%2?29:5,'#233b2a40');
    const planks=Array.from({length:7},(_,i)=>({x:-1.2+i*.4,h:1.9+(i*3%4)*.05}));
    planks.sort((a,b)=>ground(a.x,0).y-ground(b.x,0).y).reverse();
    for(const plank of planks)box(plank.x,0,.18,.13,0,plank.h,'#c6a060',Math.round(plank.x*10)%2?'#a17b43':'#b98e50');
    box(0,-.17,1.4,.07,.45,.64,'#b79458','#775532');box(0,-.17,1.4,.07,1.28,1.47,'#b79458','#775532');
    for(const x of [-1,1])for(const z of [.53,1.36])face([[x-.04,-.25,z-.15],[x+.04,-.25,z-.15],[x+.04,-.25,z+.14],[x-.04,-.25,z+.14]],'#d7bd83');
  } else if(type==='chest') {
    ellipse(ctx,48,72,turn%2?14:22,turn%2?22:12,'#233b2a40');
    box(0,0,1,.45,0,.8,'#956e3d','#a87d43');box(0,0,1.02,.47,.8,1.02,'#d0ad6d','#88613a');
    for(const x of [-.55,.55]) {
      box(x,0,.06,.48,1.02,1.05,'#b7bba0','#70765f');
      face([[x-.06,-.46,0],[x+.06,-.46,0],[x+.06,-.46,.78],[x-.06,-.46,.78]],'#b7bba0');
    }
    if(turn!==2) {
      box(0,-.5,.13,.04,.54,.84,'#e7ca8d','#d3b373');
      const [x,y]=point(0,-.55,.68);rect(ctx,x,y,2,3,'#4e5137');
    }
  } else if(type==='workbench') {
    ellipse(ctx,48,72,28,15,'#233b2a40');
    const legs=Array.from({length:3},(_,i)=>{const a=i*Math.PI*2/3+.5+turn*Math.PI/2;return {x:Math.cos(a)*1.05,y:Math.sin(a)*.58};});
    legs.sort((a,b)=>b.y-a.y);
    for(const leg of legs) {
      // The round top stays round; its legs and tools rotate around its center.
      const p=project(leg.x,leg.y),top=project(leg.x,leg.y,.85);
      polygon(ctx,[[p[0]-3,p[1]],[p[0]+3,p[1]],[top[0]+3,top[1]],[top[0]-3,top[1]]],'#926b3c',ink);rect(ctx,p[0]-1,top[1],1,p[1]-top[1],'#d0a76a');
    }
    ellipse(ctx,48,57,29,16,ink);ellipse(ctx,48,57,28,15,'#795634');
    rect(ctx,20,53,56,4,'#795634');ellipse(ctx,48,53,29,16,ink);ellipse(ctx,48,53,28,15,'#bd9556');
    for(let y=40;y<67;y++) {
      const span=Math.floor(27*Math.sqrt(Math.max(0,1-((y-53)/15)**2)));
      for(let x=48-span+1;x<48+span;x++)if((x*13+y*7)%37===0)rect(ctx,x,y,2,1,'#a47c45');
      for(const x of [34,48,62])if(Math.abs(x-48)<span)rect(ctx,x,y,1,1,'#8b663a');
    }
    face([[-.85,-.2,1],[-.1,-.2,1],[-.1,.3,1],[-.85,.3,1]],'#c4d4c5','#777b59');
    face([[-.74,-.13,1.02],[-.2,-.13,1.02],[-.2,.22,1.02],[-.74,.22,1.02]],'#9ebdb3',null);
    face([[-.6,-.03,1.03],[-.35,-.03,1.03],[-.35,.13,1.03],[-.6,.13,1.03]],'#d6e2cc',null);
    face([[-.6,-.08,1.05],[-.55,-.08,1.05],[-.55,.15,1.05],[-.6,.15,1.05]],'#527f7c',null);
    face([[-.7,.02,1.05],[-.25,.02,1.05],[-.25,.06,1.05],[-.7,.06,1.05]],'#527f7c',null);
    box(.65,.02,.055,.27,.96,1.02,'#d0a76a','#88603b');box(.65,.28,.18,.085,1.02,1.15,'#b5c1ac','#8c9e94');
    for(const [x,y] of [[.4,-.35],[.7,-.4],[1,-.25]]){const p=point(x,y,1);rect(ctx,p[0],p[1]-2,1,3,'#d7d5b8');rect(ctx,p[0]-1,p[1]-2,3,1,'#7c8c80');}
  } else if(type==='campfire') {
    ellipse(ctx,48,72,21,10,'#233b2a40');
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5,p=project(Math.cos(a)*.8,Math.sin(a)*.45);
      ellipse(ctx,p[0],p[1],4,3,'#626d62');ellipse(ctx,p[0]-1,p[1]-1,3,2,'#a7aa91');
    }
    box(0,0,.65,.12,.04,.2,'#bd8c4a','#805433');box(0,0,.12,.5,.19,.32,'#d2a164','#90613a');
    const f=frame%4,flame=(points,color,outline)=>polygon(ctx,points.map(([x,y])=>[x+24,y+29]),color,outline);
    flame([[15,33],[11,25],[16,18-f],[18,21],[23+f,6],[28,19],[34,12+f*2],[33,25],[38,27],[32,35],[23,37]],'#b44d2b',ink);
    flame([[17,32],[15,25],[20,16],[22,23],[26,10+f],[29,26],[33,21],[32,32],[26,35]],'#ee8c3d');
    flame([[21,32],[20,26],[24,20+f],[27,27],[29,25],[28,33],[24,35]],'#ffe0a1');
    rect(ctx,38+f*4,37-f,1,2,'#f4c874');
  }
  return canvas;
}
