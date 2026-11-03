import {makeCanvas,polygon,rect,ellipse} from './art.js';

let skull,bag;
export function skullArt() {
  if(skull)return skull;
  const [canvas,ctx]=makeCanvas(20);
  polygon(ctx,[[5,2],[14,2],[18,6],[18,12],[14,14],[14,18],[5,18],[5,14],[1,12],[1,6]],'#eadbb4','#352e2b');
  rect(ctx,4,7,4,4,'#423532');rect(ctx,11,7,4,4,'#423532');
  polygon(ctx,[[9,10],[11,13],[8,13]],'#5b4038');rect(ctx,6,14,8,3,'#c8b78e');
  for(const x of [7,10,13])rect(ctx,x,14,1,3,'#4f3e34');rect(ctx,5,4,8,1,'#fff0cd');
  skull=canvas;return skull;
}
export function deathBagArt() {
  if(bag)return bag;
  const [canvas,ctx]=makeCanvas(32);
  ellipse(ctx,16,28,13,3,'#263a2d70');
  polygon(ctx,[[7,12],[12,9],[21,9],[26,13],[29,24],[25,29],[7,29],[3,24]],'#8b6241','#35382c');
  polygon(ctx,[[7,13],[11,11],[22,11],[25,14],[26,23],[21,26],[8,25],[5,22]],'#ad8050');
  rect(ctx,11,6,10,5,'#4c4930');rect(ctx,13,5,6,3,'#d0b17a');rect(ctx,13,7,6,4,'#705437');
  polygon(ctx,[[6,13],[12,10],[22,10],[27,14],[24,18],[8,18]],'#695237','#35382c');
  rect(ctx,6,19,21,2,'#dfb574');rect(ctx,8,24,16,1,'#d0a567');
  ctx.drawImage(skullArt(),10,15,12,12);rect(ctx,4,22,2,4,'#5d4c35');rect(ctx,26,22,2,4,'#5d4c35');
  bag=canvas;return bag;
}
