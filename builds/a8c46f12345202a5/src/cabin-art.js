import {makeCanvas,polygon,rect} from './art.js';
import {rotateGroundPoint,normalizeRotation} from './structures.js';

// All cabin pieces use 20 pixels per world unit and the same fixed ground pivot.
export function cabinArt(type,rotation=0,doorFrame=0,layout=null) {
  const [canvas,ctx]=makeCanvas(112,type==='wood-roof'?128:112),turn=normalizeRotation(rotation),side=turn%2,ink='#39372b';
  const point=(x,y,z=0)=>{const p=type==='wood-roof'?{x,y}:rotateGroundPoint(x,y,turn);return [Math.round(56+p.x*20),Math.round((type==='wood-roof'?96:80)-p.y*20-z*20*(side&&['wood-wall','wood-door'].includes(type)?.08:1))];};
  const face=(points,color,outline=ink)=>polygon(ctx,points.map(p=>point(...p)),color,outline);
  function box(x,y,rx,ry,z0,z1,color) {
    const corners=[[x-rx,y-ry],[x+rx,y-ry],[x+rx,y+ry],[x-rx,y+ry]];
    // Draw from back to front so side profiles retain a narrow, joined silhouette.
    const sides=corners.map((p,i)=>({points:[[...p,z0],[...corners[(i+1)%4],z0],[...corners[(i+1)%4],z1],[...p,z1]],y:(rotateGroundPoint(...p,turn).y+rotateGroundPoint(...corners[(i+1)%4],turn).y)/2})).sort((a,b)=>b.y-a.y);
    for(const side of sides)face(side.points,color);
    face(corners.map(p=>[...p,z1]),'#c7a46b');
  }
  if(type==='wood-floor') {
    face([[-1.4,-1.4,0],[1.4,-1.4,0],[1.4,1.4,0],[-1.4,1.4,0]],'#ad814d');
    for(let i=0;i<7;i++) {
      const y=-1.4+i*.4,shade=['#a77c47','#b58b52','#ae844e'][i%3];
      face([[-1.4,y,0],[1.4,y,0],[1.4,y+.4,0],[-1.4,y+.4,0]],shade,'#735536');
      for(const x of [-1.26,1.26]){const p=point(x,y+.2);rect(ctx,p[0],p[1],1,1,'#e1c28a');}
      const joint=(i%2?.55:-.45);face([[joint,y+.03,0],[joint+.015,y+.03,0],[joint+.015,y+.36,0],[joint,y+.36,0]],'#86603a',null);
      for(let n=0;n<4;n++){const x=-1.1+n*.6+(i%2)*.1,p=point(x,y+.12);rect(ctx,p[0],p[1],3,1,'#bd975e');}
    }
  } else if(type==='wood-roof') {
    const shape=layout??{minX:-1.4,maxX:1.4,minY:-1.4,maxY:1.4,axis:side};
    const axis=shape.axis,lo=axis?shape.minX:shape.minY,hi=axis?shape.maxX:shape.maxY,crossLo=axis?shape.minY:shape.minX,ridge=(lo+hi)/2;
    const x0=-1.4+(Math.abs(shape.minX+1.4)<.01?-.1:0),x1=1.4+(Math.abs(shape.maxX-1.4)<.01?.1:0);
    const y0=-1.4+(Math.abs(shape.minY+1.4)<.01?-.1:0),y1=1.4+(Math.abs(shape.maxY-1.4)<.01?.1:0);
    const low=axis?x0:y0,high=axis?x1:y1,clow=axis?y0:x0,chigh=axis?y1:x1;
    const height=a=>2.15+.85*Math.max(0,1-Math.abs(a-ridge)/((hi-lo)/2));
    const roofPoint=(c,a,extra=0)=>axis?[a,c,height(a)+extra]:[c,a,height(a)+extra];
    // Every connected tile samples the same ridge and shingle grid: one continuous roof.
    const cuts=[low,high];for(let i=Math.floor((low-lo)/.35)+1;lo+i*.35<high;i++)cuts.push(lo+i*.35);
    if(ridge>low&&ridge<high)cuts.push(ridge);cuts.sort((a,b)=>a-b);
    const crossCuts=[clow,chigh];for(let i=Math.floor((clow-crossLo)/.46)+1;crossLo+i*.46<chigh;i++)crossCuts.push(crossLo+i*.46);crossCuts.sort((a,b)=>a-b);
    for(let row=cuts.length-2;row>=0;row--)for(let col=0;col<crossCuts.length-1;col++) {
      const a=cuts[row],b=cuts[row+1],c=crossCuts[col],d=crossCuts[col+1],index=Math.round((a-lo)/.35)+Math.round((c-crossLo)/.46);
      face([roofPoint(c,a),roofPoint(d,a),roofPoint(d,b),roofPoint(c,b)],index%3===0?'#c09b61':a<ridge?'#ac8752':'#88734e','#715638');
    }
    if(ridge>=low-.01&&ridge<=high+.01)face([roofPoint(clow,Math.max(low,ridge-.07),.02),roofPoint(chigh,Math.max(low,ridge-.07),.02),roofPoint(chigh,Math.min(high,ridge+.07),.02),roofPoint(clow,Math.min(high,ridge+.07),.02)],'#d1af70','#6b5436');
    if(Math.abs(low-lo)<.12)face([roofPoint(clow,low),roofPoint(chigh,low),roofPoint(chigh,low,-.11),roofPoint(clow,low,-.11)],'#715034');
  } else if(type==='wood-wall') {
    const planks=Array.from({length:7},(_,i)=>({x:-1.2+i*.4,h:2.04+(i*3%4)*.035})).sort((a,b)=>rotateGroundPoint(b.x,0,turn).y-rotateGroundPoint(a.x,0,turn).y);
    for(const [i,p] of planks.entries()) {
      box(p.x,0,.19,.13,0,p.h,i%2?'#a27a45':'#b98e54');
      if(!side)face([[p.x-.12,-.145,.15],[p.x-.08,-.145,.15],[p.x-.08,-.145,p.h-.08],[p.x-.12,-.145,p.h-.08]],'#d4ae70',null);
    }
    box(0,-.16,1.4,.065,.5,.68,'#795936');box(0,-.16,1.4,.065,1.4,1.58,'#795936');
    for(const x of [-1,1])for(const z of [.56,1.46]){const p=point(x,-.24,z);rect(ctx,p[0],p[1],side?2:1,2,'#ead4a0');}
  } else if(type==='wood-door') {
    for(const x of [-1.28,1.28])box(x,0,.12,.17,0,2.2,'#967042');
    box(0,0,1.4,.18,2.03,2.2,'#977348');
    const angle=Math.min(1,Math.max(0,doorFrame/4))*Math.PI/2;
    const leaf=(x,z)=>[-1.12+(x+1.12)*Math.cos(angle),(x+1.12)*Math.sin(angle)-.03,z];
    for(let i=0;i<6;i++) {
      const a=-1.12+i*2.24/6,b=a+2.24/6;
      face([leaf(a,.07),leaf(b,.07),leaf(b,1.98),leaf(a,1.98)],i%2?'#9d7140':'#b58a50');
    }
    for(const z of [.43,1.48])face([leaf(-1.1,z),leaf(1.1,z),leaf(1.1,z+.13),leaf(-1.1,z+.13)],'#6e5436');
    const knob=point(...leaf(.88,1.05));rect(ctx,knob[0]-1,knob[1]-1,3,3,'#e0c37d');rect(ctx,knob[0],knob[1],1,1,'#68553b');
  }
  return canvas;
}
