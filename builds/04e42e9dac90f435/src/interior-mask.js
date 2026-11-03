export const coveredByTiles=(point,tiles)=>tiles.some(tile=>Math.abs(point.x-tile.x)<=1.400001&&Math.abs(point.y-tile.y)<=1.400001);

function crossesWall(point,wall,originY) {
  let enter=0,leave=1;
  for(const [start,end,low,high] of [[0,point.x,wall.minX,wall.maxX],[originY,point.y,wall.minY,wall.maxY]]) {
    const d=end-start;
    if(Math.abs(d)<1e-9){if(start<low||start>high)return false;continue;}
    const a=(low-start)/d,b=(high-start)/d;
    enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));
    if(enter>leave)return false;
  }
  return leave>1e-7&&enter<=1;
}
export function interiorPixelVisible(point,layout) {
  if(!layout)return true;
  if(layout.roof.length&&!coveredByTiles(point,layout.roof))return false;
  return !layout.walls.some(wall=>crossesWall(point,wall,layout.originY));
}
export function clipInteriorArt(source,spec,layout,target=null) {
  if(!layout)return source;
  const canvas=target??document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
  const image=ctx.getImageData(0,0,canvas.width,canvas.height),px=canvas.width/spec.width,py=canvas.height/spec.height;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++) {
    const alpha=(y*canvas.width+x)*4+3;
    if(image.data[alpha]&&!interiorPixelVisible({x:(x+.5)/px-spec.width/2,y:spec.height*spec.foot-(y+.5)/py},layout))image.data[alpha]=0;
  }
  ctx.putImageData(image,0,0);return canvas;
}
