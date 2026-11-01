import {makeCanvas,polygon,rect} from './art.js';

export function heldSpearArt() {
  const [canvas,ctx]=makeCanvas(64,16),ink='#334139';
  polygon(ctx,[[3,7],[39,7],[39,10],[3,10],[2,8]],'#956b3e','#4b3b2a');
  rect(ctx,4,7,31,1,'#d7b678');rect(ctx,7,9,28,1,'#705035');
  polygon(ctx,[[38,5],[44,4],[50,8],[44,12],[38,11]],'#84958b',ink);
  polygon(ctx,[[39,6],[44,5],[48,8],[40,8]],'#d7dfca');
  polygon(ctx,[[40,9],[47,8],[43,11],[39,10]],'#60776e');
  for(let x=34;x<=39;x+=2){rect(ctx,x,6,1,5,'#dcc18a');rect(ctx,x+1,7,1,4,'#846c43');}
  return {canvas,width:4,height:1,grip:{x:14,y:8},tip:{x:50,y:8}};
}
export function heldSpearAngle(direction,swing=null,brace=null) {
  return Math.atan2(direction.y,direction.x)+(swing?0:.35*(1-(brace?.progress??0)));
}
