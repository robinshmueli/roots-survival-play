import {tentCanvas} from './camp.js';
import {furnaceArt} from './furnace-art.js';
import {cabinArt} from './cabin-art.js';
import { makeCanvas, polygon, ellipse, rect } from './art.js';
import {directionalStructureArt} from './structure-views.js';
import {normalizeRotation} from './structures.js';
import {SEEDS,TREE_SEEDS} from './tree-seeds.js';

export const ITEMS={
  ...Object.fromEntries(Object.entries(SEEDS).map(([type,seed])=>[type,{label:'זרע '+seed.name,plural:'זרעי '+seed.name,description:'בוחרים ביד ולוחצים לזריעה קרובה מול הדמות · יגדל לעץ בבוקר'}])),
  pickaxe:{label:'מכוש אבן',plural:'מכושים',description:'לחיצה או רווח לחציבת סלעים גדולים · מפילים 2–3 אבנים'},
  sword:{label:'חרב אבן',plural:'חרבות אבן',description:'להב אבן קשור לחבל · לחיצה או רווח לתקיפת חיות'},
  furnace:{label:'ערכת תנור אבן',plural:'ערכות תנור',description:'מציבים ופותחים עם E · עץ כדלק ובשר נא לבישול'},
  'raw-steak':{label:'סטייק נא',plural:'סטייקים נאים',description:'צריך לבשל בתנור עם עץ לפני האכילה'},
  steak:{label:'סטייק מבושל',plural:'סטייקים מבושלים',description:'ממלא 15 רעב · בוחרים ביד ולוחצים לאכילה'},
  'raw-drumstick':{label:'רגל תרנגולת נאה',plural:'רגלי תרנגולת נאות',description:'צריך לבשל בתנור עם עץ לפני האכילה'},
  drumstick:{label:'רגל תרנגולת מבושלת',plural:'רגלי תרנגולת מבושלות',description:'ממלאת 10 רעב · בוחרים ביד ולוחצים לאכילה'},
  tent:{label:'ערכת אוהל',plural:'ערכות אוהל',description:'בוחרים ביד ולוחצים להצבה · אפשר להניח על רצפה ולישון בלילה'},
  stone:{label:'אבן',plural:'אבנים',description:'כורתת עצים · עצים קטנים נשברים בפחות מכות'},
  log:{label:'בול עץ',plural:'בולי עץ',description:'חומר גלם לכלים ולבנייה'},
  apple:{label:'תפוח',plural:'תפוחים',description:'מזון · בוחרים ביד ולוחצים או מקישים רווח כדי לאכול'},
  cherry:{label:'דובדבן',plural:'דובדבנים',description:'מזון · בוחרים ביד ולוחצים או מקישים רווח כדי לאכול'},
  fiber:{label:'גבעול',plural:'גבעולים',description:'סיבים מגבעולי צמח · לקשירת כלים ולבנייה'},
  axe:{label:'גרזן אבן',plural:'גרזנים',description:'גרזן קשור בחבל · כורת עצים ומפרק מבנים לערכות'},
  campfire:{label:'ערכת מדורה',plural:'ערכות מדורה',description:'בוחרים ביד ולוחצים להצבת מדורה'},
  'wood-wall':{label:'ערכת קיר עץ',plural:'ערכות קיר עץ',description:'בוחרים ביד ולוחצים להצבת קיר'},
  'wood-door':{label:'ערכת דלת עץ',plural:'ערכות דלת עץ',description:'מציבים בפתח הבקתה · E לפתיחה ולסגירה'},
  'wood-floor':{label:'ערכת רצפת עץ',plural:'ערכות רצפת עץ',description:'רצפה שאפשר ללכת ולבנות עליה'},
  'wood-roof':{label:'ערכת גג עץ',plural:'ערכות גג עץ',description:'גג לבקתה · נעשה שקוף חלקית כשנכנסים'},
  chest:{label:'ערכת תיבה',plural:'ערכות תיבה',description:'בוחרים ביד ולוחצים להצבה · E לפתיחת התיבה'},
  workbench:{label:'ערכת שולחן יצירה',plural:'ערכות שולחן יצירה',description:'בוחרים ביד ולוחצים להצבה · מזיזים בעכבר ומניחים בלחיצה'},
};
const cache=new Map();
function drawFiberRope(ctx) {
  function cord(points) {
    const pixels=[];
    for(let i=1;i<points.length;i++) {
      const [ax,ay]=points[i-1],[bx,by]=points[i],steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay));
      for(let n=0;n<steps;n++)pixels.push([Math.round(ax+(bx-ax)*n/steps),Math.round(ay+(by-ay)*n/steps)]);
    }
    pixels.push(points[points.length-1]);
    for(const [x,y] of pixels)rect(ctx,x-2,y-2,5,5,'#59422d');
    for(const [x,y] of pixels)rect(ctx,x-1,y-1,3,3,'#ba945c');
    pixels.forEach(([x,y],i)=>{
      if(i%4===0){rect(ctx,x-1,y-1,1,2,'#efd198');rect(ctx,x,y,1,2,'#896139');}
      else if(i%4===1)rect(ctx,x,y-1,1,1,'#dbb77b');
    });
  }
  // Loose ends underneath two oval coils give the plant fibers a cordage silhouette.
  cord([[7,15],[6,19],[7,21],[10,22]]);
  cord([[15,14],[18,17],[20,22]]);
  cord([[8,4],[14,3],[19,6],[21,10],[20,15],[16,18],[10,19],[5,16],[3,11],[4,7],[8,4]]);
  cord([[9,8],[13,7],[16,9],[16,12],[13,14],[10,14],[7,11],[7,9],[9,8]]);
}
export function itemArt(type) {
  if(cache.has(type))return cache.get(type);
  const [canvas,ctx]=makeCanvas(24);
  if(SEEDS[type]) {
    polygon(ctx,[[6,13],[10,9],[16,9],[20,14],[18,21],[12,23],[6,20]],'#9f7040','#443d2c');
    polygon(ctx,[[8,14],[12,11],[16,12],[17,16],[13,20],[9,19]],'#d6ac69');
    rect(ctx,12,5,2,8,'#785932');
    polygon(ctx,[[12,8],[6,8],[3,4],[8,3],[13,6],[17,2],[22,3],[20,8],[14,10]],SEEDS[type].color,'#3b5134');
    rect(ctx,10,13,2,4,'#f0cf8e');
  } else if(type==='pickaxe') {
    polygon(ctx,[[5,21],[8,23],[19,5],[16,3]],'#9b7042','#433a2d');
    polygon(ctx,[[7,20],[8,20],[17,5],[16,5]],'#d8b576');
    polygon(ctx,[[2,11],[5,5],[11,2],[18,3],[23,8],[23,13],[19,9],[14,7],[9,7],[5,9]],'#78867f','#34423b');
    polygon(ctx,[[5,6],[11,3],[18,4],[21,7],[15,5],[9,5]],'#cdd2c3');
    rect(ctx,12,5,3,5,'#c1a270');rect(ctx,11,6,5,1,'#ead6a6');
  } else if(type==='furnace') {ctx.drawImage(furnaceArt(),0,0,24,24);
  } else if(type==='sword') {
    polygon(ctx,[[5,22],[2,19],[7,13],[9,15]],'#a47b42','#393d31');
    polygon(ctx,[[5,12],[8,11],[13,16],[12,19]],'#c0aa74','#494632');
    polygon(ctx,[[8,12],[13,5],[21,2],[21,9],[13,16]],'#83948e','#35443e');
    polygon(ctx,[[9,12],[14,6],[20,3],[19,8],[12,14]],'#d4d9c8');
    polygon(ctx,[[13,12],[20,5],[20,8],[13,15]],'#5b756d');rect(ctx,5,17,3,1,'#e5c78b');rect(ctx,3,20,2,2,'#d2b776');
  } else if(['raw-steak','steak'].includes(type)) {
    const cooked=type==='steak';
    polygon(ctx,[[4,8],[9,4],[17,4],[21,8],[22,14],[18,20],[11,22],[4,19],[2,13]],cooked?'#764126':'#d88b86','#49382c');
    polygon(ctx,[[5,9],[10,6],[17,6],[19,9],[20,14],[16,18],[10,20],[5,17],[4,12]],cooked?'#b4773d':'#b84c56');
    ellipse(ctx,14,10,4,3,cooked?'#d8ac72':'#edbeb1');ellipse(ctx,14,10,2,1,cooked?'#865331':'#c07879');
    if(cooked)for(const [x,y] of [[6,11],[7,15],[12,16]])polygon(ctx,[[x,y],[x+5,y-3],[x+6,y-2],[x+1,y+1]],'#603f29');
    else polygon(ctx,[[6,10],[8,9],[10,13],[15,16],[14,18],[9,15]],'#f2b3a9');
    rect(ctx,6,8,3,1,cooked?'#e7bd7d':'#f6cec1');
  } else if(['raw-drumstick','drumstick'].includes(type)) {
    const cooked=type==='drumstick';
    polygon(ctx,[[12,13],[15,16],[8,22],[5,21],[3,22],[1,20],[2,17],[5,18]],'#d6d2b0','#574b38');
    polygon(ctx,[[9,14],[7,10],[10,4],[15,2],[21,5],[23,11],[19,16],[14,18]],cooked?'#97512b':'#c86f78','#51382c');
    polygon(ctx,[[10,9],[12,5],[17,4],[20,7],[20,12],[15,15],[11,13]],cooked?'#d38a43':'#eda7a3');
    rect(ctx,12,6,3,2,cooked?'#f0bc76':'#ffd5bc');rect(ctx,17,11,3,1,cooked?'#79432a':'#bc616d');
  } else if(type==='tent') {ctx.drawImage(tentCanvas(),0,1,24,22);
  } else if(type==='stone') {
    polygon(ctx,[[3,16],[5,9],[12,4],[18,6],[21,14],[18,20],[7,21]],'#575d58','#303b36');
    polygon(ctx,[[5,12],[12,5],[17,7],[13,13],[7,16]],'#b6bcb0');
    polygon(ctx,[[13,13],[18,8],[20,14],[17,18],[10,19]],'#848c81');
    rect(ctx,8,10,3,2,'#d4d5c6');rect(ctx,6,17,4,2,'#70796e');
  } else if(type==='log') {
    polygon(ctx,[[3,9],[14,3],[21,9],[21,15],[10,22],[3,17]],'#77502e','#3d3425');
    polygon(ctx,[[5,9],[15,5],[19,8],[9,14]],'#b08043');
    polygon(ctx,[[5,15],[16,9],[18,12],[8,19]],'#916237');
    polygon(ctx,[[7,10],[16,6],[17,7],[8,12]],'#d4a15a');
    ellipse(ctx,8,16,5,5,'#d5ab68','#4c3927');
    ellipse(ctx,8,16,3,3,'#b9884c');ellipse(ctx,8,16,2,2,'#dfb976');rect(ctx,7,15,1,2,'#95673e');
  } else if(type==='wood-door') {
    rect(ctx,3,3,18,20,'#4b3b2b');rect(ctx,5,5,14,18,'#b08750');
    for(const x of [8,12,16])rect(ctx,x,6,1,16,'#775532');
    rect(ctx,5,9,14,2,'#785837');rect(ctx,5,17,14,2,'#785837');rect(ctx,15,12,2,2,'#eed28a');
  } else if(type==='wood-floor') {
    polygon(ctx,[[3,6],[18,3],[22,7],[21,20],[6,23],[2,19]],'#bc9158','#453c2b');
    for(let y=8;y<22;y+=4)rect(ctx,5,y,15,1,'#785532');rect(ctx,6,8,1,12,'#ddbb7d');
  } else if(type==='wood-roof') {
    polygon(ctx,[[2,15],[10,3],[21,10],[20,20],[8,23]],'#a37b48','#45382b');
    polygon(ctx,[[2,15],[10,3],[9,12],[8,23]],'#d0a76b','#5e472e');
    for(let y=9;y<21;y+=4)rect(ctx,10,y,9,1,'#785831');
  } else if(type==='apple') {
    polygon(ctx,[[5,9],[8,7],[11,8],[14,7],[18,8],[20,12],[19,18],[16,21],[12,20],[9,21],[5,18],[3,13]],'#bd3735','#55362b');
    polygon(ctx,[[6,10],[9,9],[11,10],[14,9],[16,10],[15,16],[12,19],[8,18],[5,14]],'#e45b44');
    rect(ctx,7,11,2,4,'#ffb073');rect(ctx,12,4,2,5,'#775032');
    polygon(ctx,[[14,5],[17,3],[21,4],[18,7],[14,7]],'#76a653','#3d613b');
    rect(ctx,15,5,3,1,'#b5d67a');
  } else if(type==='cherry') {
    polygon(ctx,[[8,11],[13,9],[18,11],[21,15],[20,20],[16,23],[10,22],[6,18],[6,14]],'#a52d43','#512d32');
    polygon(ctx,[[9,12],[13,11],[17,13],[17,17],[13,20],[9,18],[8,15]],'#df4b5a');
    rect(ctx,10,12,3,2,'#ffb0a1');rect(ctx,8,14,2,2,'#f77978');
    polygon(ctx,[[12,11],[13,6],[16,2],[17,3],[15,7],[14,11]],'#67844b','#3c5735');
    polygon(ctx,[[15,5],[11,3],[6,4],[10,7],[14,7]],'#79a957','#3c5735');rect(ctx,9,4,3,1,'#b2ce7e');
  } else if(type==='fiber') {
    drawFiberRope(ctx);
  } else if(type==='axe') {
    polygon(ctx,[[5,21],[8,22],[19,4],[16,2]],'#946739','#42392b');
    polygon(ctx,[[6,20],[7,20],[17,4],[16,4]],'#d5aa66');
    polygon(ctx,[[7,6],[10,2],[17,2],[22,5],[21,9],[16,12],[11,10]],'#77847c','#303e36');
    polygon(ctx,[[9,5],[11,3],[17,3],[20,5],[16,7],[10,7]],'#c5cbba');
    polygon(ctx,[[17,8],[21,6],[20,9],[16,11],[13,10]],'#52665c');
    rect(ctx,13,6,2,6,'#b99c62');rect(ctx,12,7,4,1,'#ead3a0');rect(ctx,12,10,4,1,'#e2c58b');
  } else if(type==='workbench') {
    ctx.drawImage(workbenchArt(),0,2,24,21);
  } else if(type==='campfire') {
    ellipse(ctx,12,19,10,3,'#656b55');
    polygon(ctx,[[4,18],[18,14],[20,17],[6,21]],'#92653c','#3d3d2d');
    polygon(ctx,[[7,14],[11,5],[14,9],[17,2],[20,13],[17,17],[10,18]],'#d28242','#553d2d');
    polygon(ctx,[[10,15],[13,9],[14,12],[17,8],[17,15],[13,17]],'#efcc77');
  } else if(type==='wood-wall') {
    rect(ctx,3,4,18,18,'#40392a');
    for(let i=0;i<4;i++){rect(ctx,4+i*4,5,3,16,i%2?'#b28b50':'#96723f');rect(ctx,4+i*4,6,1,13,'#ceb17a');}
    rect(ctx,2,8,20,2,'#725437');rect(ctx,2,17,20,2,'#725437');
  } else if(type==='chest') {
    polygon(ctx,[[3,7],[7,3],[20,4],[22,8],[21,21],[3,21]],'#8f693b','#3c392a');
    rect(ctx,4,9,16,10,'#b08a4e');rect(ctx,4,10,16,2,'#634b31');
    rect(ctx,6,5,2,14,'#d1b87a');rect(ctx,17,5,2,14,'#d1b87a');rect(ctx,11,11,3,4,'#e6cc8c');
  } else {
    polygon(ctx,[[6,5],[17,5],[20,10],[19,21],[4,21],[3,11]],'#957545','#3d3425');
    rect(ctx,7,8,9,7,'#c7a466');rect(ctx,8,16,8,4,'#ac8449');rect(ctx,11,13,3,4,'#e9c780');
  }
  cache.set(type,canvas);return canvas;
}

export function saplingArt(kind) {
  const [canvas,ctx]=makeCanvas(24,32),color=TREE_SEEDS[kind]?.color??'#72a04f';
  ellipse(ctx,12,27,8,3,'#4f432e77');ellipse(ctx,12,26,6,2,'#9b7952');
  polygon(ctx,[[11,27],[12,13],[14,12],[13,27]],'#8b6740','#3b4930');
  polygon(ctx,[[12,18],[6,17],[3,12],[8,11],[13,15]],color,'#355033');
  polygon(ctx,[[13,13],[16,7],[21,7],[21,12],[16,16]],color,'#355033');
  rect(ctx,7,13,3,1,'#c0ce8e');rect(ctx,17,9,3,1,'#c0ce8e');
  return canvas;
}

let benchCanvas;
export function workbenchArt() {
  if(benchCanvas)return benchCanvas;
  const [canvas,ctx]=makeCanvas(64,56),ink='#3c392b';
  ellipse(ctx,32,52,27,3,'#233d2d30');
  // Three splayed legs support a round top, seen as an ellipse from above.
  polygon(ctx,[[15,27],[21,29],[16,51],[10,52],[10,49]],'#926b3c',ink);
  polygon(ctx,[[44,27],[50,26],[55,49],[50,52],[47,47]],'#795431',ink);
  polygon(ctx,[[29,30],[36,30],[36,52],[32,54],[29,52]],'#9c7542',ink);
  rect(ctx,13,35,2,13,'#c19b60');rect(ctx,50,35,2,13,'#ad824a');rect(ctx,31,38,2,13,'#d0a76a');
  polygon(ctx,[[17,40],[48,39],[49,43],[16,44]],'#705334',ink);
  ellipse(ctx,32,25,28,15,'#755334',ink);
  ellipse(ctx,32,20,28,15,'#b28a4e',ink);
  ellipse(ctx,31,18,26,12,'#c19a5c');
  // Planks terminate at the curved rim instead of forming square corners.
  for(let y=7;y<34;y++) {
    const half=Math.floor(26*Math.sqrt(Math.max(0,1-((y-20)/14)**2)));
    for(const x of [18,31,44])if(Math.abs(x-32)<half)rect(ctx,x,y,1,1,'#89643b');
  }
  polygon(ctx,[[8,13],[14,8],[25,6],[24,8],[14,10],[10,14]],'#e0bd7d');
  ellipse(ctx,32,29,20,2,'#caa36b');
  // A pinned drawing, a stone-headed hammer and a few loose nails on the tabletop.
  polygon(ctx,[[17,17],[34,15],[41,23],[22,26]],'#c4d4c5','#777b59');
  polygon(ctx,[[19,18],[33,17],[37,22],[23,24]],'#9ebdb3');
  polygon(ctx,[[23,21],[27,18],[32,20],[31,23],[25,24]],'#d6e2cc');
  rect(ctx,24,21,6,1,'#527f7c');rect(ctx,26,19,1,5,'#527f7c');rect(ctx,32,19,3,1,'#6c9490');
  rect(ctx,18,17,1,1,'#e7d59d');rect(ctx,38,23,1,1,'#e7d59d');
  polygon(ctx,[[43,23],[45,23],[50,15],[48,14]],'#88603b',ink);rect(ctx,44,21,1,2,'#d0a76a');
  polygon(ctx,[[45,14],[48,12],[54,14],[54,17],[51,19],[46,17]],'#8c9e94',ink);
  rect(ctx,47,13,5,1,'#d1d8bf');rect(ctx,51,16,2,1,'#5e7569');
  for(const [x,y] of [[47,26],[53,23],[55,26]]){rect(ctx,x,y-2,1,3,'#d7d5b8');rect(ctx,x-1,y-2,3,1,'#7c8c80');}
  benchCanvas=canvas;return canvas;
}

const structureCache=new Map();
export function structureArt(type,frame=0,rotation=0,layout=null) {
  const turn=normalizeRotation(rotation);
  if(type==='workbench'&&!turn)return workbenchArt();
  if(type==='wood-roof'&&layout)return cabinArt(type,turn,frame,layout);
  const cabin=['wood-wall','wood-door','wood-floor','wood-roof'].includes(type);
  const key=`${type}:${type==='campfire'?frame%4:['wood-door','tent','furnace'].includes(type)?frame:0}:${turn}:${layout?JSON.stringify(layout):''}`;
  if(structureCache.has(key))return structureCache.get(key);
  if(type==='tent'){const canvas=tentCanvas(!!frame,turn);structureCache.set(key,canvas);return canvas;}
  if(type==='furnace'){const canvas=furnaceArt(frame,turn);structureCache.set(key,canvas);return canvas;}
  if(cabin){const canvas=cabinArt(type,turn,frame,layout);structureCache.set(key,canvas);return canvas;}
  if(turn){const canvas=directionalStructureArt(type,turn,frame);structureCache.set(key,canvas);return canvas;}
  const [canvas,ctx]=makeCanvas(type==='wood-wall'?64:48,type==='chest'?40:48),ink='#353c2c';
  if(type==='campfire') {
    ellipse(ctx,24,43,20,4,'#233b2a40');
    for(let i=0;i<10;i++) {
      const a=i/10*Math.PI*2,x=Math.round(24+Math.cos(a)*16),y=Math.round(36+Math.sin(a)*6);
      ellipse(ctx,x,y,4,3,'#626d62');ellipse(ctx,x-1,y-1,3,2,'#9ba18b');rect(ctx,x-1,y-2,2,1,'#c2bca0');
    }
    polygon(ctx,[[12,34],[34,29],[38,33],[16,40]],'#92633b',ink);
    polygon(ctx,[[15,28],[37,35],[33,40],[11,32]],'#ab7740',ink);
    rect(ctx,18,34,12,2,'#e79f43');
    const f=frame%4;
    polygon(ctx,[[15,33],[11,25],[16,18-f],[18,21],[23+f,6],[28,19],[34,12+f*2],[33,25],[38,27],[32,35],[23,37]],'#b44d2b',ink);
    polygon(ctx,[[17,32],[15,25],[20,16],[22,23],[26,10+f],[29,26],[33,21],[32,32],[26,35]],'#ee8c3d');
    polygon(ctx,[[21,32],[20,26],[24,20+f],[27,27],[29,25],[28,33],[24,35]],'#ffe0a1');
    rect(ctx,14+f*4,8-f,1,2,'#f4c874');rect(ctx,31-f*3,3+f,1,2,'#e9ac4b');
  } else if(type==='wood-wall') {
    ellipse(ctx,32,44,29,3,'#233b2a40');
    for(let i=0;i<7;i++) {
      const x=5+i*8,top=5+(i*3)%4;
      polygon(ctx,[[x,top+2],[x+3,top],[x+7,top+1],[x+7,43],[x,44]],i%2?'#a17b43':'#b98e50',ink);
      rect(ctx,x+1,top+3,1,36-top,'#d2ac69');rect(ctx,x+5,top+6,1,30-top,'#795630');
    }
    rect(ctx,3,17,57,5,ink);rect(ctx,4,18,55,3,'#795936');rect(ctx,4,33,55,4,'#765431');
    for(const x of [11,49]){rect(ctx,x,15,2,9,'#d0b37a');rect(ctx,x-1,19,4,1,'#efd7a0');rect(ctx,x,31,2,8,'#c2a06a');}
  } else if(type==='chest') {
    ellipse(ctx,24,37,21,3,'#233b2a40');
    polygon(ctx,[[5,17],[40,15],[44,20],[43,35],[9,38],[5,33]],'#876039',ink);
    polygon(ctx,[[6,16],[11,7],[36,5],[42,14],[40,20],[9,23]],'#bb9354',ink);
    polygon(ctx,[[10,15],[14,8],[35,7],[38,14]],'#d0ad6d');
    polygon(ctx,[[9,24],[40,21],[40,33],[10,36]],'#ac8147');
    for(const x of [15,32]){rect(ctx,x,8,3,25,'#5b6152');rect(ctx,x,9,1,24,'#bcc2a3');}
    polygon(ctx,[[7,22],[41,19],[41,23],[8,26]],'#554a32');
    rect(ctx,22,21,6,8,'#d5b979');rect(ctx,23,22,4,5,'#f0d59b');rect(ctx,24,24,2,3,'#5c583e');
    for(const [x,y] of [[12,29],[36,27]]){rect(ctx,x,y,1,1,'#ead498');}
  }
  structureCache.set(key,canvas);return canvas;
}

export function forageArt(kind,variant=0,harvested=false) {
  const [canvas,ctx]=makeCanvas(32,36);
  ellipse(ctx,16,32,kind==='looseStone'?8:11,3,'#263e302b');
  if(kind==='looseStone') {
    const offset=variant-1;
    polygon(ctx,[[8,29],[7,25],[11+offset,20],[19,19],[24,23+offset],[23,29],[18,32],[11,32]],'#77817a','#38443b');
    polygon(ctx,[[9,25],[12+offset,21],[18,20],[21,23],[16,27],[10,28]],'#b4b9a6');
    polygon(ctx,[[17,27],[23,24],[22,28],[18,31],[12,31]],'#586860');
    rect(ctx,12,23,3,1,'#d6d7be');rect(ctx,19,27,2,1,'#91a08b');
  } else if(harvested) {
    for(const [x,h] of [[10,3],[14,5],[18,4],[22,3]]) {
      rect(ctx,x,32-h,1,h,'#8a8c52');rect(ctx,x,32-h,1,1,'#d1c68a');
    }
    rect(ctx,11,32,11,1,'#627b48');
  } else {
    for(let i=0;i<7;i++) {
      const base=12+i,tip=5+i*3+(variant===1?2:0),top=6+(i*7+variant*3)%12;
      polygon(ctx,[[base,32],[base+1,32],[tip+1,top],[tip,top]],i%2?'#9eac65':'#7c9653','#405c3c');
      polygon(ctx,[[base,29],[tip-5,top+8],[tip,top+10],[base+1,31]],i%2?'#638447':'#8ca15a');
      if(i%2===0) {
        polygon(ctx,[[tip,top+9],[tip+6,top+3],[tip+5,top+8],[tip,top+14]],'#a1b56a','#527342');
        rect(ctx,tip-1,top-1,3,5,'#c4b477');rect(ctx,tip,top-2,1,5,'#e1cf94');
      }
    }
    polygon(ctx,[[9,31],[7,25],[13,29],[15,24],[18,30],[25,25],[23,32]],'#7d9a51','#435f3b');
    rect(ctx,13,30,3,1,'#bbca79');
  }
  return canvas;
}

export function stumpArt() {
  const [canvas,ctx]=makeCanvas(32,20);
  polygon(ctx,[[7,6],[25,6],[27,16],[30,18],[21,18],[18,16],[13,19],[4,18],[7,14]],'#785334','#40392b');
  rect(ctx,10,10,3,6,'#a47541');rect(ctx,22,10,2,5,'#4e3c2b');
  ellipse(ctx,16,7,10,5,'#bd945c','#51402a');ellipse(ctx,16,7,7,3,'#e0b77a');ellipse(ctx,16,7,4,2,'#ac8049');rect(ctx,15,6,3,2,'#d8ac6c');
  return canvas;
}
