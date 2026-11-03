import * as THREE from '../vendor/three.module.js';

export function randomGenerator(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function makeCanvas(width, height = width) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

export function texture(canvas) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  return map;
}

export function sprite(map, width, height) {
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    alphaTest: .05
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Scanline rasterization produces genuine one-pixel edges, without antialiasing.
export function polygon(ctx, points, color, outline) {
  const rows = [];
  const top = Math.floor(Math.min(...points.map(p => p[1])));
  const bottom = Math.ceil(Math.max(...points.map(p => p[1])));
  for (let y = top; y < bottom; y++) {
    const crossings = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      if ((a[1] <= y + .5 && b[1] > y + .5) || (b[1] <= y + .5 && a[1] > y + .5)) {
        crossings.push(a[0] + (y + .5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const left = Math.ceil(crossings[i] - .5),
        right = Math.ceil(crossings[i + 1] - .5);
      if (right > left) rows.push([left, y, right - left]);
    }
  }
  if (outline)
    for (const [x, y, width] of rows) rect(ctx, x - 1, y - 1, width + 2, 3, outline);
  for (const [x, y, width] of rows) rect(ctx, x, y, width, 1, color);
}

export function ellipse(ctx, x, y, rx, ry, color) {
  for (let row = Math.ceil(y - ry); row < y + ry; row++) {
    const extent = rx * Math.sqrt(Math.max(0, 1 - ((row + .5 - y) / ry) ** 2));
    const start = Math.round(x - extent),
      end = Math.round(x + extent);
    rect(ctx, start, row, end - start, 1, color);
  }
}

const green = ['#354b3c', '#466044', '#577d48', '#709751', '#8fb65d', '#b0cd78'];
const blue = ['#2c4242', '#365853', '#456e63', '#5b8c76', '#78a08a', '#a0b79a'];
const leaf = ['#3d4935', '#52633c', '#6d8448', '#8fa451', '#afc86c', '#d0dc8d'];
const ink = '#35362c';

function trunk(ctx, wide = false) {
  if(ctx.treeWood)trunk(ctx.treeWood,wide);
  const w = wide ? 2 : 0;
  polygon(ctx, [
    [28 - w, 57],
    [36 + w, 57],
    [37 + w, 77],
    [40 + w, 86],
    [43 + w, 90],
    [36, 89],
    [33, 86],
    [30, 91],
    [25 - w, 90],
    [28 - w, 83]
  ], '#826342', ink);
  polygon(ctx, [
    [30 - w, 59],
    [33, 60],
    [32, 82],
    [29, 88],
    [28 - w, 87]
  ], '#bc9860');
  polygon(ctx, [
    [35, 60],
    [37 + w, 72],
    [36 + w, 84],
    [39 + w, 88],
    [34, 85]
  ], '#5e4935');
  rect(ctx, 30, 73, 1, 7, '#dfbb79');
  rect(ctx, 34, 78, 1, 6, '#b28a53');
  rect(ctx, 31, 65, 1, 4, '#554431');
  rect(ctx, 33, 86, 1, 3, '#d5ae6b');
}

function paintWood(ctx,draw) {
  draw(ctx);
  if(ctx.treeWood)draw(ctx.treeWood);
}

function fir(ctx, random, palette) {
  trunk(ctx);
  for (let tier = 0; tier < 6; tier++) {
    const y = 74 - tier * 10,
      width = 27 - tier * 4 + Math.floor(random() * 3) - 1,
      tip = y - 24;
    const points = [
      [32, tip],
      [36, tip + 9],
      [34, tip + 8],
      [41, y - 9],
      [38, y - 10],
      [32 + width - 4, y - 6],
      [32 + width - 7, y - 6],
      [32 + width, y],
      [32 + width - 6, y - 1],
      [32 + width - 3, y + 3],
      [32 + width - 11, y + 1],
      [38, y + 5],
      [37, y + 1],
      [31, y + 6],
      [28, y + 2],
      [22, y + 5],
      [32 - width + 9, y + 1],
      [32 - width + 3, y + 4],
      [32 - width + 5, y],
      [32 - width, y + 1],
      [32 - width + 8, y - 7],
      [32 - width + 5, y - 6],
      [26, tip + 10],
      [28, tip + 11]
    ];
    polygon(ctx, points, palette[2], ink);
    polygon(ctx, [
      [32, tip + 2],
      [31, y - 10],
      [24, y - 2],
      [21, y],
      [23, y - 5],
      [32 - width + 6, y - 1],
      [32 - width + 11, y - 7],
      [28, tip + 11]
    ], palette[4]);
    polygon(ctx, [
      [33, tip + 8],
      [37, y - 8],
      [32 + width - 7, y - 1],
      [38, y + 1],
      [33, y - 2]
    ], palette[1]);
    polygon(ctx, [
      [30, tip + 7],
      [29, y - 11],
      [24, y - 6],
      [26, y - 6],
      [22, y - 1],
      [27, y - 4],
      [31, y - 9]
    ], palette[5]);
    for (let n = 0; n < width; n++) {
      const xx = 32 + (random() * 2 - 1) * (width - 6),
        yy = y - 5 + random() * 7;
      rect(ctx, xx, yy, 1 + Math.floor(random() * 3), 1, palette[xx < 32 ? 3 : 0]);
      if (n % 3 === 0) rect(ctx, xx - 1, yy - 1, 1, 1, palette[4]);
    }
  }
  rect(ctx, 31, 1, 1, 7, ink);
  rect(ctx, 31, 6, 1, 3, palette[4]);
}

function broadleaf(ctx, random, fruit) {
  trunk(ctx, true);
  const clumps = [
    [18, 50, 15],
    [43, 48, 15],
    [31, 59, 17],
    [15, 31, 13],
    [46, 29, 13],
    [30, 21, 18],
    [31, 40, 20]
  ];
  for (const clump of clumps) {
    const cx = clump[0] + Math.floor(random() * 5) - 2;
    const cy = clump[1] + Math.floor(random() * 5) - 2;
    const r = clump[2] + Math.floor(random() * 3) - 1;
    const points = [];
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2,
        radius = r + (i % 3 === 0 ? 1 : -2);
      points.push([Math.round(cx + Math.cos(a) * radius), Math.round(cy + Math.sin(a) * radius * .8)]);
    }
    polygon(ctx, points, leaf[2], ink);
    ellipse(ctx, cx - 2, cy - 3, r - 3, r * .55, leaf[3]);
    ellipse(ctx,cx+r*.15,cy+r*.42,r*.64,r*.18,leaf[1]);
    for (let n = 0; n < 34; n++) {
      const x = cx + (random() * 2 - 1) * (r - 4),
        y = cy + (random() * 2 - 1) * (r - 4) * .6;
      polygon(ctx, [
        [x, y],
        [x + 3, y - 2],
        [x + 4, y],
        [x + 7, y],
        [x + 5, y + 3],
        [x + 1, y + 3]
      ], leaf[3 + Math.floor(random() * 3)]);
    }
    if (fruit)
      for (let n = 0; n < 2; n++) {
        const x = Math.round(cx + (random() * 2 - 1) * (r - 4)),
          y = Math.round(cy + (random() * 2 - 1) * (r - 4) * .55);
        rect(ctx, x + 1, y - 1, 1, 2, '#493c28');
        polygon(ctx, [
          [x, y],
          [x + 3, y],
          [x + 4, y + 2],
          [x + 3, y + 4],
          [x, y + 4],
          [x - 1, y + 2]
        ], '#b54c36', '#41382d');
        rect(ctx, x, y, 2, 2, '#ef9a58');
      }
  }
}

export const TREE_TYPES = ['pine', 'blue', 'broadleaf', 'fruit', 'birch', 'maple', 'willow', 'cherry', 'cypress', 'palm', 'jungle', 'acacia', 'autumnOak', 'snowPine', 'snowSpruce'];
export const TREE_ART = { width: 80, height: 112, foot: 102 / 112, variants: 7 };

const birchLeaves = ['#46543a','#627244','#7f9652','#a7bc64','#c6d87b','#dfeb9d'];
const mapleLeaves = ['#503c32','#774333','#a55738','#ce7543','#e8a258','#f1c278'];
const willowLeaves = ['#344a37','#456244','#5e8050','#7e9b60','#a2b77a','#c4ce93'];
const cherryLeaves = ['#664650','#8b5666','#ba7d8c','#d99caa','#efbec6','#ffe1dc'];
const cypressLeaves = ['#253e38','#35564a','#456b55','#5c815c','#799b6b','#9cb787'];

function crownCluster(ctx, random, cx, cy, radius, palette, jagged = false) {
  cx += Math.floor(random() * 5) - 2;
  cy += Math.floor(random() * 5) - 2;
  radius += Math.floor(random() * 3) - 1;
  const points = [];
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2;
    const r = radius - (i % 2 ? (jagged ? 4 : 2) : 0);
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * .82]);
  }
  polygon(ctx, points, palette[1], ink);
  ellipse(ctx, cx - 1, cy - 2, radius - 2, radius * .59, palette[2]);
  ellipse(ctx,cx+radius*.18,cy+radius*.43,radius*.62,radius*.17,palette[0]);
  polygon(ctx,[[cx-radius*.55,cy-radius*.32],[cx-radius*.22,cy-radius*.52],
    [cx+radius*.12,cy-radius*.48],[cx+radius*.3,cy-radius*.27],[cx-radius*.15,cy-radius*.3]],palette[3]);
  for (let i = 0; i < 22; i++) {
    const x = cx + (random() * 2 - 1) * (radius - 4);
    const y = cy - 3 + (random() * 2 - 1) * (radius - 4) * .52;
    polygon(ctx, [[x,y],[x+2,y-2],[x+4,y-1],[x+3,y+1],[x+5,y+2],[x+1,y+3],[x-1,y+1]],
      palette[3 + Math.floor(random() * 3)]);
  }
}

function birch(ctx, random) {
  paintWood(ctx,ctx=>{
  polygon(ctx, [[28,48],[35,47],[35,74],[38,86],[41,90],[35,89],[32,85],[28,91],[24,90],[29,80]], '#d6d5b8', ink);
  polygon(ctx, [[33,49],[35,49],[35,75],[37,85],[35,86],[32,77]], '#929d8a');
  polygon(ctx, [[32,65],[43,49],[46,42],[48,44],[45,53],[35,71]], '#c7ccb0', ink);
  rect(ctx,29,58,5,2,'#4b574a'); rect(ctx,31,67,4,1,'#566251');
  rect(ctx,29,74,3,2,'#4b574a'); rect(ctx,32,81,3,2,'#556050');
  rect(ctx,30,83,1,3,'#faf0ce'); rect(ctx,29,50,2,7,'#f1ebcb');
  });
  for (const [x,y,r] of [[22,45,12],[42,42,13],[29,33,16],[40,22,13],[25,18,13],[31,10,10]]) {
    crownCluster(ctx,random,x,y,r,birchLeaves,true);
  }
}

function maple(ctx, random) {
  trunk(ctx,true);
  for (const [x,y,r] of [[17,48,13],[44,48,15],[30,54,16],[15,29,14],[49,29,13],[33,19,19],[31,38,19]]) {
    crownCluster(ctx,random,x,y,r,mapleLeaves,true);
  }
  rect(ctx,18,36,2,1,'#f5c47b'); rect(ctx,42,22,2,2,'#f5bd68');
}

function willow(ctx, random) {
  // A broad canopy sits on real woody forks, with a clear opening around the trunk.
  polygon(ctx,[[5,30],[11,21],[20,17],[26,9],[39,9],[49,17],[56,25],[60,38],
    [56,51],[49,60],[42,56],[35,47],[26,49],[19,60],[10,58],[4,47]],willowLeaves[0],ink);
  for(const [x,y,r] of [[14,35,11],[48,36,12],[25,24,15],[40,24,15]]) {
    crownCluster(ctx,random,x,y,r,willowLeaves);
  }

  paintWood(ctx,ctx=>{
  polygon(ctx,[[27,47],[33,46],[37,55],[37,72],[40,84],[45,90],[37,89],
    [32,85],[28,91],[20,91],[26,84],[28,70]],'#92734b',ink);
  polygon(ctx,[[28,62],[24,53],[16,44],[10,38],[12,34],[22,40],[29,49],[33,56]],'#947950',ink);
  polygon(ctx,[[32,59],[37,48],[47,40],[52,31],[55,32],[52,44],[42,53],[36,68]],'#80623e',ink);
  polygon(ctx,[[29,51],[27,42],[27,31],[30,25],[33,27],[32,42],[35,52]],'#9d8055',ink);
  polygon(ctx,[[28,58],[31,61],[31,78],[28,87],[24,89],[28,79]],'#c4a46c');
  polygon(ctx,[[34,59],[37,57],[36,72],[39,85],[42,88],[36,85],[33,72]],'#614c35');
  polygon(ctx,[[14,39],[21,43],[29,54],[28,57],[23,48]],'#bea06a');
  polygon(ctx,[[37,52],[46,43],[50,35],[49,43],[41,52],[36,61]],'#b19360');
  rect(ctx,29,68,1,7,'#ead09a');rect(ctx,31,78,2,2,'#594734');
  polygon(ctx,[[31,69],[34,67],[35,70],[33,73],[31,72]],'#654c33');
  rect(ctx,32,69,1,2,'#c9a76b');rect(ctx,30,83,1,5,'#dbc18a');
  });

  // Overlapping leaf fans arch outward and taper unevenly; they are not straight ribbons.
  function fan(x,y,width,length,lean) {
    const left=[],right=[],bend=(random()-.5)*3;
    for(let i=0;i<=7;i++) {
      const t=i/7,cx=x+lean*t+bend*t*t,cy=y+t*length;
      const half=width*.5*(1-t*.82)*(i%2?.78:1);
      left.push([cx-half-(i%2?0:1),cy]);right.push([cx+half+(i%2?1:0),cy+1]);
    }
    polygon(ctx,[...left,[x+lean+bend,y+length+2],...right.reverse()],willowLeaves[1],ink);
    for(let i=0;i<12;i++) {
      const t=random()*.86,cx=x+lean*t+bend*t*t+(random()-.5)*width*(1-t*.8),cy=y+t*length;
      const color=willowLeaves[2+Math.floor(random()*3)];
      polygon(ctx,[[cx,cy-2],[cx+2,cy-1],[cx+1,cy+3],[cx-1,cy+1]],color);
    }
  }
  for(const [x,y,r] of [[12,29,10],[23,20,14],[39,19,16],[50,29,11],[30,32,13]]) {
    crownCluster(ctx,random,x,y,r,willowLeaves);
  }
  for(const [x,y,w,l,bend] of [[7,35,8,23,2],[15,39,12,28,-2],[23,39,9,17,-4],
    [43,40,10,21,4],[52,35,11,31,-1],[57,34,7,21,-2],[34,35,9,14,2]]) {
    fan(x,y,w,l+Math.floor(random()*5)-2,bend);
  }
}

function cherry(ctx, random) {
  trunk(ctx,true);
  for (const [x,y,r] of [[18,48,13],[43,48,14],[31,53,16],[13,32,12],[49,32,12],[23,22,16],[40,20,16],[31,35,20]]) {
    crownCluster(ctx,random,x,y,r,cherryLeaves);
  }
  for (const [x,y] of [[20,28],[34,18],[44,39],[27,46],[12,36],[40,26]]) {
    rect(ctx,x,y,3,1,'#fff0df'); rect(ctx,x+1,y-1,1,3,'#fff0df');
    rect(ctx,x+1,y,1,1,'#d4ac6c');
  }
}

function cypress(ctx, random) {
  trunk(ctx);
  polygon(ctx,[[32,2],[36,12],[35,14],[41,23],[39,28],[45,43],[43,49],[48,64],
    [44,74],[34,79],[23,76],[17,65],[20,52],[18,45],[24,28],[23,22],[28,12]],cypressLeaves[1],ink);
  polygon(ctx,[[31,7],[31,30],[26,37],[28,45],[23,57],[26,72],[20,66],[23,52],[22,45],[27,26]],cypressLeaves[3]);
  polygon(ctx,[[33,17],[37,31],[35,43],[41,59],[37,73],[30,76],[33,59],[30,44]],cypressLeaves[2]);
  for(let i=0;i<70;i++) {
    const y=15+random()*57, span=4+y*.1;
    const x=32+(random()*2-1)*span;
    rect(ctx,x,y,1+random()*3,1,cypressLeaves[2+Math.floor(random()*4)]);
    if(i%3===0)rect(ctx,x-1,y+1,1,2,cypressLeaves[1]);
  }
}

function palm(ctx, random) {
  paintWood(ctx,ctx=>{
  polygon(ctx,[[26,90],[32,90],[34,72],[32,52],[37,30],[33,27],[28,49],[29,69],[25,85]],'#a38a58',ink);
  polygon(ctx,[[27,85],[29,87],[32,70],[30,53],[34,32],[33,31],[29,52],[30,70]],'#d1b378');
  for(let y=45;y<86;y+=6)rect(ctx,29,y,4,1,'#705c3f');
  });
  const leaves=[[4,18],[6,36],[17,6],[31,2],[48,6],[60,20],[59,37],[46,47]];
  for(let i=0;i<leaves.length;i++) {
    const [x,y]=leaves[i],cx=33,cy=29;
    const mx=(cx+x)/2,my=(cy+y)/2-4;
    polygon(ctx,[[cx,cy],[mx-3,my-3],[x,y],[x+1,y+7],[mx+1,my+5],[mx,my+1],[cx+2,cy+1]],'#365b3e',ink);
    polygon(ctx,[[cx,cy],[mx,my-2],[x,y],[mx+1,my+1]],i%2?'#82a551':'#a4ba64');
    for(let j=1;j<4;j++) {
      const t=j/4,px=cx+(x-cx)*t,py=cy+(y-cy)*t;
      rect(ctx,px-1,py+2,2,3,'#4b7944');
    }
  }
  ellipse(ctx,32,30,3,3,'#81633c');ellipse(ctx,37,31,3,3,'#5b4934');rect(ctx,31,28,2,1,'#c3a26a');
}

function jungleTree(ctx, random) {
  trunk(ctx,true);
  paintWood(ctx,ctx=>polygon(ctx,[[27,64],[23,86],[17,91],[28,88],[32,78],[35,88],[45,91],[39,82],[36,60]],'#78573d',ink));
  const palette=['#254a3b','#315e43','#42754b','#5c9152','#7da55c','#a6c476'];
  for(const [x,y,r] of [[17,49,14],[47,47,14],[32,53,18],[13,28,12],[48,27,14],[26,17,17],[40,17,16],[31,35,21]]) {
    crownCluster(ctx,random,x,y,r,palette,true);
  }
  for(const x of [10,51]) {
    for(let y=49;y<79;y++)rect(ctx,x+Math.round(Math.sin(y*.3)*2),y,1,1,'#426a3f');
    for(let y=52;y<76;y+=6)polygon(ctx,[[x,y],[x+4,y-2],[x+3,y+2]],'#80a258');
  }
}

function acacia(ctx, random) {
  paintWood(ctx,ctx=>{
  polygon(ctx,[[27,90],[34,90],[34,65],[39,49],[51,36],[48,33],[34,47],[30,60],[28,77]],'#8c724b',ink);
  polygon(ctx,[[31,65],[24,47],[12,36],[15,33],[29,46],[35,60]],'#9e8151',ink);
  rect(ctx,29,70,2,15,'#c3a267');
  });
  const palette=['#53513a','#696344','#817a4a','#a29859','#beb270','#d7c785'];
  for(const [x,y,r] of [[13,33,11],[50,32,11],[23,27,14],[39,25,15],[32,35,16]]) {
    crownCluster(ctx,random,x,y,r,palette);
  }
}

function autumnOak(ctx, random) {
  trunk(ctx,true);
  const palette=['#60442e','#805633','#a6793d','#c7984d','#e4b65f','#f1d287'];
  for(const [x,y,r] of [[16,49,13],[46,47,14],[31,57,15],[13,30,12],[49,30,12],[23,20,15],[40,21,16],[31,37,21]]) {
    crownCluster(ctx,random,x,y,r,palette);
  }
}

export const SNOW_COVERS = ['dust', 'layered', 'heavy', 'wind-left', 'wind-right', 'patches', 'deep'];

function snowyFir(ctx, random, blueish, variant = 0) {
  fir(ctx, random, blueish ? blue : green);
  const source=ctx.getImageData(0,0,64,96);
  const [maskCanvas,mask]=makeCanvas(64,96);
  const style=SNOW_COVERS[variant];
  function cap(points) {
    polygon(mask,points.map(([x,y])=>[x,y+2]),'#aec9d2');
    polygon(mask,points,'#edf4f0');
  }
  function sideCap(y,width,tip,right) {
    const points=[[32,tip+3],[31,y-14],[26,y-8],[27,y-7],[32-width+7,y-2],
      [32-width+10,y],[25,y-4],[29,y-4],[33,y-10],[36,y-7],[39,y-5],[37,y-9]];
    cap(right?points.map(([x,yy])=>[64-x,yy]):points);
  }
  for(let tier=0;tier<6;tier++) {
    const y=74-tier*10,width=27-tier*4,tip=y-24;
    if(style==='dust') {
      const x=32+(tier%2?1:-1)*(width*.48);
      cap([[x-4,y-4],[x-1,y-6],[x+4,y-4],[x+2,y-2],[x-3,y-2]]);
      rect(mask,31,tip+3,2,3,'#e4efec');
    } else if(style==='layered') {
      cap([[32-width+6,y-4],[27,y-7],[32,y-5],[38,y-6],[32+width-6,y-2],
        [32+width-10,y],[35,y-2],[29,y-1],[25,y-3],[32-width+8,y-1]]);
    } else if(style==='heavy') {
      cap([[32,tip+2],[35,y-13],[39,y-8],[32+width-6,y-3],[32+width-10,y+1],
        [36,y-2],[32,y+2],[27,y-2],[32-width+6,y],[32-width+10,y-6],[29,y-13]]);
    } else if(style==='wind-left'||style==='wind-right') {
      sideCap(y,width,tip,style==='wind-right');
    } else if(style==='patches') {
      for(let n=0;n<4;n++) {
        const x=32+(random()*2-1)*(width-3),yy=y-3-random()*9;
        ellipse(mask,x,yy+1,3+random()*2,2,'#aec9d2');
        ellipse(mask,x-1,yy,3+random()*2,2,'#f2f6ef');
      }
    } else {
      cap([[32,tip+1],[32+width,y+1],[32+width-7,y+5],[36,y+1],[31,y+4],
        [25,y],[32-width+4,y+4],[32-width,y+1],[26,y-11]]);
      polygon(mask,[[35,y-8],[32+width-3,y],[32+width-9,y+2],[34,y-3]],'#c4dce0');
    }
  }
  if(style==='deep'){rect(mask,29,78,3,8,'#d2e4e5');rect(mask,28,84,6,2,'#edf4f0');}
  const snow=mask.getImageData(0,0,64,96).data;
  for(let i=0;i<source.data.length;i+=4) {
    if(source.data[i+3]!==255||snow[i+3]===0)continue;
    if(source.data[i]===53&&source.data[i+1]===54&&source.data[i+2]===44)continue;
    source.data[i]=snow[i];source.data[i+1]=snow[i+1];source.data[i+2]=snow[i+2];
  }
  ctx.putImageData(source,0,0);
}

export const AUTUMN_COLORS = ['#d78335','#e8a44b','#ba652e','#ce853c','#eeaf58','#b97535','#d99642','#c36c32'];

export function drawAutumnLeaf(ctx, x, y, variant = 0) {
  const color = AUTUMN_COLORS[variant % AUTUMN_COLORS.length];
  const shapes = [
    [[0,-3],[2,-1],[4,-2],[3,1],[1,1],[0,3],[-1,1],[-3,1],[-2,-1]],
    [[-3,-1],[0,-2],[3,-1],[2,1],[0,2],[-2,1]],
    [[-2,-3],[1,-2],[3,0],[1,2],[-1,1],[-3,-1]],
    [[-1,-3],[2,-2],[2,1],[0,3],[-2,1],[-2,-1]],
  ];
  const points = shapes[variant % shapes.length].map(([px,py]) => [x+px,y+py]);
  polygon(ctx, points, color);
  rect(ctx,x,y,1,3,'#8b5930');
  rect(ctx,x-1,y-1,2,1,'#f0bb63');
}

const treeProfiles = [
  { width: 1, height: 1, bend: 0, ripple: 0 },
  { width: .8, height: 1.08, bend: 1, ripple: .03 },
  { width: 1.14, height: .87, bend: -1, ripple: .035 },
  { width: .98, height: 1.02, bend: -6, ripple: .08 },
  { width: 1.04, height: .94, bend: 6, ripple: .05 },
  { width: .73, height: .83, bend: -2, ripple: .09 },
  { width: 1.1, height: 1.04, bend: 2, ripple: .12 },
];

function variedTree(source, variant) {
  const [canvas,ctx]=makeCanvas(TREE_ART.width,TREE_ART.height);
  const input=source.getContext('2d').getImageData(0,0,64,96).data;
  const result=ctx.createImageData(canvas.width,canvas.height);
  const profile=treeProfiles[variant];
  for(let y=0;y<canvas.height;y++) {
    const sy=Math.round(90+(y-102)/profile.height);
    if(sy<0||sy>=96)continue;
    const top=Math.max(0,(90-sy)/90),crown=Math.min(1,top*2.4);
    const width=1+(profile.width-1)*crown+Math.sin(sy*.18+variant)*profile.ripple*crown;
    const shift=profile.bend*top*top;
    for(let x=0;x<canvas.width;x++) {
      const sx=Math.round(32+(x-40-shift)/width);
      if(sx<0||sx>=64)continue;
      const a=(sy*64+sx)*4,b=(y*canvas.width+x)*4;
      result.data[b]=input[a];result.data[b+1]=input[a+1];result.data[b+2]=input[a+2];result.data[b+3]=input[a+3];
    }
  }
  ctx.putImageData(result,0,0);
  return canvas;
}

function treeSource(seed,kind,variant,snowCover,captureWood=false) {
  const [canvas, ctx] = makeCanvas(64, 96), random = randomGenerator(seed + variant * 1013);
  const wood=captureWood?makeCanvas(64,96):null;
  if(wood)ctx.treeWood=wood[1];
  if (kind === 'broadleaf' || kind === 'fruit') broadleaf(ctx, random, kind === 'fruit');
  else if (kind === 'birch') birch(ctx, random);
  else if (kind === 'maple') maple(ctx, random);
  else if (kind === 'willow') willow(ctx, random);
  else if (kind === 'cherry') cherry(ctx, random);
  else if (kind === 'cypress') cypress(ctx, random);
  else if (kind === 'palm') palm(ctx, random);
  else if (kind === 'jungle') jungleTree(ctx, random);
  else if (kind === 'acacia') acacia(ctx, random);
  else if (kind === 'autumnOak') autumnOak(ctx, random);
  else if (kind === 'snowPine' || kind === 'snowSpruce') snowyFir(ctx, random, kind === 'snowSpruce', snowCover);
  else fir(ctx, random, kind === 'blue' ? blue : green);
  return {canvas,wood:wood?.[0]};
}

export function treeArt(seed,kind='pine',variant=0,snowCover=variant) {
  return texture(variedTree(treeSource(seed,kind,variant,snowCover).canvas,variant));
}

// Keep native pixels intact: wood and foliage occupy separate rigid sprite quads.
export function treeWindArt(seed,kind='pine',variant=0,snowCover=variant) {
  const source=treeSource(seed,kind,variant,snowCover,true);
  const full=variedTree(source.canvas,variant),wood=variedTree(source.wood,variant);
  const width=TREE_ART.width,height=TREE_ART.height;
  const [atlas,ctx]=makeCanvas(width*2,height);
  const original=full.getContext('2d').getImageData(0,0,width,height);
  const bark=wood.getContext('2d').getImageData(0,0,width,height);
  const leaves=ctx.createImageData(width,height);
  for(let i=0;i<original.data.length;i+=4) {
    const sameWood=bark.data[i+3]>0&&original.data[i]===bark.data[i]&&original.data[i+1]===bark.data[i+1]
      &&original.data[i+2]===bark.data[i+2]&&original.data[i+3]===bark.data[i+3];
    if(!sameWood)leaves.data.set(original.data.subarray(i,i+4),i);
  }
  ctx.drawImage(wood,0,0);ctx.putImageData(leaves,width,0);
  const map=texture(atlas);map.userData.treeImage=full;
  return map;
}

export function cactusArt(variant = 0) {
  const [canvas,ctx]=makeCanvas(32,48);
  const x=15+(variant%2),height=variant===4?23:34;
  polygon(ctx,[[x-4,43],[x+4,43],[x+4,43-height],[x+2,40-height],[x-2,40-height],[x-4,43-height]],'#537c4b',ink);
  rect(ctx,x-2,43-height,2,height,'#94a769');rect(ctx,x+2,45-height,1,height-4,'#365a3d');
  const arms=variant===2?1:2;
  for(let i=0;i<arms;i++) {
    const sign=i?1:-1,y=24+(variant*3+i*5)%10;
    polygon(ctx,[[x+sign*3,y+4],[x+sign*10,y+4],[x+sign*11,y+1],[x+sign*11,y-7],[x+sign*8,y-9],[x+sign*7,y-6],[x+sign*7,y],[x+sign*3,y]],'#638954',ink);
    rect(ctx,x+sign*8,y-6,1,6,'#a5b276');
  }
  for(let y=16;y<42;y+=5)rect(ctx,x+1,y,1,1,'#d5d0a0');
  if(variant===3){rect(ctx,x-2,7,5,2,'#d68a84');rect(ctx,x,5,2,5,'#f0ad9b');}
  return texture(canvas);
}

// Each type has its own silhouette and facets, rather than recoloring one sprite.
export const ROCK_TYPES = ['boulder', 'split', 'pile', 'slab', 'moss'];

export function rockArt(seed, kind = 'boulder') {
  const [canvas, ctx] = makeCanvas(48, 40);
  const random = randomGenerator(seed);
  const edge = '#323a3b';
  const face = (points, color) => polygon(ctx, points, color);
  const shape = (points, color) => polygon(ctx, points, color, edge);

  // A short, stepped contact shadow grounds the wide, angular silhouettes.
  face([
    [3, 32],
    [10, 29],
    [34, 29],
    [44, 32],
    [42, 36],
    [32, 38],
    [11, 37],
    [4, 35]
  ], '#34442f45');

  if (kind === 'boulder') {
    shape([
      [4, 31],
      [5, 21],
      [12, 12],
      [23, 7],
      [35, 10],
      [42, 19],
      [42, 29],
      [35, 35],
      [15, 36]
    ], '#737e84');
    face([
      [6, 22],
      [13, 13],
      [23, 8],
      [34, 11],
      [29, 22],
      [16, 25]
    ], '#a1aaab');
    face([
      [6, 23],
      [16, 25],
      [19, 34],
      [14, 35],
      [5, 30]
    ], '#849092');
    face([
      [29, 22],
      [35, 11],
      [41, 19],
      [41, 29],
      [34, 34],
      [24, 33]
    ], '#505f67');
    face([
      [17, 26],
      [28, 23],
      [24, 33],
      [20, 34]
    ], '#68757c');
    face([
      [13, 14],
      [22, 10],
      [25, 11],
      [17, 15]
    ], '#bac0b8');
    face([
      [31, 25],
      [36, 21],
      [35, 25],
      [30, 29]
    ], '#39494f');
    rect(ctx, 14, 28, 3, 1, '#b0b7b2');
  } else if (kind === 'split') {
    shape([
      [5, 33],
      [7, 19],
      [14, 7],
      [24, 5],
      [28, 13],
      [33, 9],
      [39, 12],
      [43, 27],
      [38, 35],
      [21, 37]
    ], '#586775');
    face([
      [8, 20],
      [15, 8],
      [23, 6],
      [26, 14],
      [21, 20],
      [15, 25]
    ], '#8b9ba1');
    face([
      [8, 21],
      [15, 25],
      [19, 35],
      [7, 32]
    ], '#6b7e89');
    face([
      [28, 17],
      [33, 10],
      [38, 13],
      [41, 24],
      [34, 28],
      [25, 24]
    ], '#7e8e97');
    face([
      [34, 28],
      [42, 26],
      [37, 34],
      [23, 36],
      [25, 27]
    ], '#3f4f60');
    face([
      [24, 6],
      [28, 14],
      [25, 21],
      [29, 25],
      [24, 33],
      [24, 36],
      [20, 36],
      [21, 28],
      [19, 23],
      [23, 16]
    ], '#28353d');
    face([
      [14, 10],
      [22, 7],
      [22, 9],
      [15, 12]
    ], '#b3bebd');
    face([
      [28, 22],
      [33, 15],
      [34, 17],
      [30, 23]
    ], '#a9b6ba');
  } else if (kind === 'pile') {
    shape([
      [23, 21],
      [23, 12],
      [29, 7],
      [36, 8],
      [41, 16],
      [38, 24],
      [30, 26]
    ], '#71746f');
    face([
      [24, 13],
      [29, 8],
      [35, 9],
      [36, 15],
      [29, 18]
    ], '#a4a69b');
    face([
      [36, 15],
      [40, 17],
      [37, 23],
      [30, 25],
      [29, 19]
    ], '#515954');
    shape([
      [5, 28],
      [7, 20],
      [14, 15],
      [23, 17],
      [27, 25],
      [22, 33],
      [11, 34]
    ], '#7e8580');
    face([
      [8, 21],
      [14, 16],
      [22, 18],
      [22, 22],
      [14, 26],
      [6, 26]
    ], '#b0b4a8');
    face([
      [15, 27],
      [24, 23],
      [26, 26],
      [21, 32],
      [12, 33]
    ], '#5c6661');
    shape([
      [23, 34],
      [22, 27],
      [29, 21],
      [37, 22],
      [43, 29],
      [40, 35],
      [30, 37]
    ], '#7a827d');
    face([
      [24, 28],
      [29, 22],
      [36, 23],
      [39, 28],
      [31, 31]
    ], '#abb0a4');
    face([
      [32, 32],
      [41, 29],
      [39, 34],
      [30, 36]
    ], '#505d57');
    shape([
      [4, 35],
      [5, 32],
      [9, 31],
      [12, 34],
      [10, 37],
      [6, 37]
    ], '#939a8d');
  } else if (kind === 'slab') {
    shape([
      [3, 28],
      [10, 21],
      [30, 17],
      [39, 20],
      [44, 26],
      [41, 32],
      [28, 35],
      [10, 35],
      [3, 32]
    ], '#8a8981');
    face([
      [4, 28],
      [11, 22],
      [30, 18],
      [38, 21],
      [41, 25],
      [29, 29],
      [12, 31]
    ], '#b0b0a0');
    face([
      [12, 31],
      [29, 29],
      [42, 26],
      [40, 31],
      [28, 34],
      [11, 34],
      [4, 31],
      [4, 29]
    ], '#626d69');
    face([
      [11, 23],
      [28, 20],
      [32, 21],
      [17, 25]
    ], '#c7c5ae');
    face([
      [30, 18],
      [27, 23],
      [29, 25],
      [24, 29],
      [27, 29],
      [32, 25],
      [30, 23],
      [33, 20]
    ], '#646f69');
    rect(ctx, 8, 28, 4, 1, '#8f9687');
    rect(ctx, 17, 28, 5, 1, '#93998c');
  } else if (kind === 'moss') {
    shape([
      [5, 32],
      [6, 21],
      [13, 14],
      [25, 10],
      [36, 13],
      [42, 24],
      [39, 33],
      [27, 36],
      [13, 36]
    ], '#65736a');
    face([
      [7, 22],
      [14, 15],
      [25, 11],
      [35, 14],
      [30, 23],
      [17, 27]
    ], '#919b8a');
    face([
      [7, 24],
      [17, 28],
      [20, 35],
      [13, 35],
      [6, 31]
    ], '#78877a');
    face([
      [31, 24],
      [36, 15],
      [41, 25],
      [38, 32],
      [27, 35],
      [22, 32]
    ], '#495c55');
    face([
      [10, 21],
      [14, 15],
      [25, 12],
      [32, 14],
      [35, 18],
      [30, 20],
      [30, 23],
      [24, 23],
      [23, 26],
      [18, 24],
      [14, 25],
      [15, 21]
    ], '#526d3b');
    face([
      [13, 19],
      [15, 16],
      [25, 13],
      [31, 15],
      [30, 18],
      [25, 17],
      [23, 20],
      [19, 18],
      [17, 21]
    ], '#86a457');
    face([
      [16, 16],
      [24, 14],
      [27, 15],
      [24, 16],
      [20, 16],
      [19, 18],
      [16, 18]
    ], '#b0c475');
    rect(ctx, 17, 24, 2, 4, '#688548');
    rect(ctx, 27, 22, 2, 5, '#587640');
    face([
      [8, 31],
      [13, 30],
      [15, 32],
      [13, 35],
      [8, 34]
    ], '#6f8b48');
    rect(ctx, 10, 31, 3, 1, '#a1b263');
  } else {
    throw new Error(`Unknown rock type: ${kind}`);
  }

  // Sparse chips remain inside opaque stone faces and preserve the silhouette.
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < 10; i++) {
    const x = 8 + Math.floor(random() * 29),
      y = 14 + Math.floor(random() * 19);
    const offset = (y * canvas.width + x) * 4;
    if (pixels[offset + 3] === 255 && pixels[offset] > 95) {
      rect(ctx, x, y, 1, 1, i % 2 ? '#89958c' : '#b1b7a7');
    }
  }
  return texture(canvas);
}
