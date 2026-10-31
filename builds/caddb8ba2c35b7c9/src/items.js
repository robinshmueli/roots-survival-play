import { makeCanvas, polygon, ellipse, rect } from './art.js';

export const ITEMS={
  stone:{label:'אבן',plural:'אבנים',description:'כורתת עצים · עצים קטנים נשברים בפחות מכות'},
  log:{label:'בול עץ',plural:'בולי עץ',description:'חומר גלם לבנייה בהמשך'},
  apple:{label:'תפוח',plural:'תפוחים',description:'מזון · בוחרים ביד ולוחצים או מקישים רווח כדי לאכול'},
};
const cache=new Map();
export function itemArt(type) {
  if(cache.has(type))return cache.get(type);
  const [canvas,ctx]=makeCanvas(24);
  if(type==='stone') {
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
  } else if(type==='apple') {
    polygon(ctx,[[5,9],[8,7],[11,8],[14,7],[18,8],[20,12],[19,18],[16,21],[12,20],[9,21],[5,18],[3,13]],'#bd3735','#55362b');
    polygon(ctx,[[6,10],[9,9],[11,10],[14,9],[16,10],[15,16],[12,19],[8,18],[5,14]],'#e45b44');
    rect(ctx,7,11,2,4,'#ffb073');rect(ctx,12,4,2,5,'#775032');
    polygon(ctx,[[14,5],[17,3],[21,4],[18,7],[14,7]],'#76a653','#3d613b');
    rect(ctx,15,5,3,1,'#b5d67a');
  } else {
    polygon(ctx,[[6,5],[17,5],[20,10],[19,21],[4,21],[3,11]],'#957545','#3d3425');
    rect(ctx,7,8,9,7,'#c7a466');rect(ctx,8,16,8,4,'#ac8449');rect(ctx,11,13,3,4,'#e9c780');
  }
  cache.set(type,canvas);return canvas;
}

export function stumpArt() {
  const [canvas,ctx]=makeCanvas(32,20);
  polygon(ctx,[[7,6],[25,6],[27,16],[30,18],[21,18],[18,16],[13,19],[4,18],[7,14]],'#785334','#40392b');
  rect(ctx,10,10,3,6,'#a47541');rect(ctx,22,10,2,5,'#4e3c2b');
  ellipse(ctx,16,7,10,5,'#bd945c','#51402a');ellipse(ctx,16,7,7,3,'#e0b77a');ellipse(ctx,16,7,4,2,'#ac8049');rect(ctx,15,6,3,2,'#d8ac6c');
  return canvas;
}
