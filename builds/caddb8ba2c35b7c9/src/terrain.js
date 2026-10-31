import { WORLD } from './config.js';
import { biomeBlendAt, dominantBiome, pickBiome, biomeColorAt, biomeWeightAt, coastline, cellSeed } from './biomes.js';
import { lakeSample } from './lake-data.js';
import { chunkObjects } from './world-data.js';
import { makeCanvas, rect, polygon, ellipse, randomGenerator, texture, drawAutumnLeaf } from './art.js';

// World-space tones meet at chunk boundaries; these broad patches never form trails.
function groundNoise(x,y) {
  const ix=Math.floor(x),iy=Math.floor(y);
  let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  const a=cellSeed(ix,iy,4739)/4294967296,b=cellSeed(ix+1,iy,4739)/4294967296;
  const c=cellSeed(ix,iy+1,4739)/4294967296,d=cellSeed(ix+1,iy+1,4739)/4294967296;
  return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}
const groundTints=Object.fromEntries([
  ['green',[[37,66,43],[233,233,187]]],
  ['sand',[[119,91,53],[255,239,189]]],
  ['snow',[[108,151,176],[255,255,248]]],
].map(([name,colors])=>[name,Array.from({length:17},(_,i)=>{
  const band=i-8;return `rgba(${colors[band<0?0:1].join(',')},${Math.abs(band)*.012})`;
})]));

export function groundArt(cx, cy, scenery=chunkObjects(cx,cy)) {
  const pixels = WORLD.pixelsPerUnit, size = WORLD.chunkSize;
  const [canvas, ctx] = makeCanvas(size * pixels);
  const random = randomGenerator(cellSeed(cx, cy, 9381));
  const minX = cx * size, maxY = (cy + 1) * size;
  const point = (x, y) => [(x - minX) * pixels, (maxY - y) * pixels];
  function waterColor(depth) {
    const stops=[[0,[137,184,176]],[8,[106,171,174]],[22,[77,145,159]],[55,[60,120,140]]];
    let i=1;while(i<stops.length-1&&depth>stops[i][0])i++;
    const a=stops[i-1],b=stops[i],t=Math.max(0,Math.min(1,(depth-a[0])/(b[0]-a[0])));
    return `rgb(${a[1].map((v,j)=>Math.round(v+(b[1][j]-v)*t)).join(',')})`;
  }
  function paintCell(px, py, step) {
    const x = minX + (px + step / 2) / pixels, y = maxY - (py + step / 2) / pixels;
    const lake=lakeSample(x,y),parts = biomeBlendAt(x, y,lake), biome = dominantBiome(parts);
    const noise = cellSeed(Math.floor(x * 2), Math.floor(y * 2));
    const coast = coastline(y),distance=lake?.distance??Infinity;
    let color = biomeColorAt(x, y, noise % 5 === 0, parts);
    if (biome.id === 'lake') {
      const depth=Math.max(0,-distance),t=Math.min(1,depth/3);
      color=`rgb(${[132,177,164].map((v,i)=>Math.round(v+([64,124,137][i]-v)*t)).join(',')})`;
    } else if (biome.id === 'ocean') {
      color = waterColor(x - coast);
    } else if(lake&&distance<lake.lake.shore*.85) {
      const t=Math.max(0,Math.min(1,distance/(lake.lake.shore*.85)));
      color=`rgb(${[167,166,132].map((v,i)=>Math.round(v+([218,202,151][i]-v)*t+(noise%3-1)*2)).join(',')})`;
    } else if (biome.id === 'beach' && x > coast - 6) {
      const t=Math.max(0,Math.min(1,(x-coast+6)/6));
      color=`rgb(${[228,211,155].map((v,i)=>Math.round(v+([201,196,154][i]-v)*t)).join(',')})`;
    }
    rect(ctx, px, py, step, step, color);
    if(biome.id!=='lake'&&biome.id!=='ocean') {
      const tone=Math.round((groundNoise(x*.11,y*.11)*.72+groundNoise(x*.37+11,y*.37-7)*.28-.5)*16);
      if(tone) {
        const tints=groundTints[biome.id==='snow'?'snow':biome.id==='desert'||biome.id==='beach'?'sand':'green'];
        rect(ctx,px,py,step,step,tints[tone+8]);
      }
    }
    if (Math.abs(x - coast) < 1 || Math.abs(distance) < 1.3) return 2;
    return parts.length > 1 ? 4 : 0;
  }
  for (let py = 0; py < canvas.height; py += 8) {
    for (let px = 0; px < canvas.width; px += 8) {
      // Add detail to transition patches and shorelines without painting every pixel separately.
      const refine = paintCell(px, py, 8);
      if (!refine) continue;
      for (let oy = 0; oy < 8; oy += refine) {
        for (let ox = 0; ox < 8; ox += refine) paintCell(px + ox, py + oy, refine);
      }
    }
  }

  // Small, baked contact shadows join roots and rocks to the ground without extra meshes.
  for(const object of scenery) {
    const [px,py]=point(object.x,object.y),scale=object.size;
    const rx=object.type==='rock'?Math.min(15,object.rx*pixels):8*scale;
    const ry=object.type==='rock'?4*scale:3*scale;
    ellipse(ctx,px,py+1,rx+1,ry+1,'#283e3010');
    ellipse(ctx,px,py,rx*.65,Math.max(1,ry*.55),'#23392920');
  }

  for (let i = 0; i < 650; i++) {
    const x = minX + random() * size, y = maxY - random() * size;
    const parts=biomeBlendAt(x,y);
    const biome=parts.length===1?parts[0].biome:pickBiome(parts,random()), [px,py]=point(x,y);
    const lake=lakeSample(x,y);
    if(lake&&lake.distance<lake.lake.shore) {
      if(lake.distance>0&&i%5===0)rect(ctx,px,py,1+(i%2),1,'#b3a77e');
      continue;
    }
    if (biome.id === 'ocean') {
      if (i % 3 === 0) {
        rect(ctx, px, py, 3 + random() * 9, 1, '#81b6ba');
        if (i % 9 === 0) rect(ctx, px + 3, py + 2, 4, 1, '#619ba8');
      }
      continue;
    }
    if (biome.id === 'snow') {
      if (i % 4 === 0) {
        const width = 4 + random() * 14;
        rect(ctx, px, py, width, 1, '#c0d2da');
        rect(ctx, px + 2, py - 1, width * .6, 1, '#eef3ef');
      } else if (i % 3 === 0) rect(ctx, px, py, 1, 1, '#f3f7f1');
      continue;
    }
    if (biome.id === 'desert' || biome.id === 'beach') {
      if (i % 8 === 0) {
        const length = 9 + random() * 27;
        polygon(ctx, [[px,py],[px+length*.4,py-3],[px+length,py-1],[px+length-3,py+1],[px+length*.4,py-1],[px,py+1]], biome.detail);
        rect(ctx, px + length * .4, py - 4, length * .35, 1, '#e6ce96');
      } else if (i % 3 === 0) rect(ctx, px, py, 1, 1, biome.detail);
      continue;
    }
    if (biome.id === 'autumn' && i % 2) {
      const colors = ['#bd8849','#d6a35a','#997343','#c66e40'];
      rect(ctx, px, py, 3, 1, colors[i % 4]); rect(ctx, px + 1, py - 1, 1, 3, colors[i % 4]);
    } else if (biome.id === 'cherry' && i % 3 === 0) {
      rect(ctx, px, py, 2, 1, '#e4b7bd'); rect(ctx, px + 4, py + 3, 1, 1, '#f1d1cc');
    } else {
      rect(ctx, px, py, 1, 3, biome.detail); rect(ctx, px - 2, py - 1, 1, 2, biome.detail);
      rect(ctx, px + 2, py - 2, 1, 3, biome.detail);
      if (biome.id === 'jungle' && i % 4 === 0) {
        polygon(ctx, [[px,py],[px-5,py-4],[px-1,py-3],[px,py-7],[px+1,py-3],[px+5,py-4]], '#719154');
      }
    }
  }
  // A few tiny flowers, twigs and pebbles add scale while keeping the old grass sparse.
  const details=randomGenerator(cellSeed(cx,cy,4517));
  for(let i=0;i<22;i++) {
    const x=minX+1+details()*(size-2),y=maxY-1-details()*(size-2);
    const biome=dominantBiome(biomeBlendAt(x,y)),lake=lakeSample(x,y);
    if(!['forest','cherry','jungle'].includes(biome.id)||(lake&&lake.distance<lake.lake.shore+1))continue;
    const [px,py]=point(x,y);
    if(i%4===0&&biome.id!=='jungle') {
      rect(ctx,px,py,1,3,'#6c8653');
      rect(ctx,px-1,py-1,3,1,biome.id==='cherry'?'#edcad1':'#e2deae');
      rect(ctx,px,py-2,1,3,biome.id==='cherry'?'#f4dce0':'#f0e9c5');
      rect(ctx,px,py-1,1,1,'#c6a85f');
    } else if(i%3===0) {
      rect(ctx,px,py,4,1,'#7b7852');rect(ctx,px+3,py-1,3,1,'#8c875b');
      rect(ctx,px+2,py-2,1,2,'#79734c');
    } else if(i%2===0) {
      rect(ctx,px,py,2,1,'#737f64');rect(ctx,px,py-1,1,1,'#a5ad86');
    }
  }
  // Groups of broad, veined orange leaves form a visible carpet beneath autumn trees.
  for (let i = 0; i < 90; i++) {
    const x = minX + random() * size, y = maxY - random() * size;
    const autumn=biomeWeightAt(x,y,'autumn');
    if (autumn===0 || random()>autumn) continue;
    const [px, py] = point(x, y);
    const count = 9 + Math.floor(random() * 10);
    for (let n = 0; n < count; n++) {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 19;
      const dx = Math.round(Math.cos(angle) * radius), dy = Math.round(Math.sin(angle) * radius * .65);
      if (random()>biomeWeightAt(x+dx/pixels,y-dy/pixels,'autumn')) continue;
      drawAutumnLeaf(ctx, Math.round(px) + dx, Math.round(py) + dy, Math.floor(random() * 8));
    }
  }
  return texture(canvas);
}
