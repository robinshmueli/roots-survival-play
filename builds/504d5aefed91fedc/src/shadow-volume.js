// Project a low-poly solid onto the ground and return its outer silhouette.
// A single convex polygon avoids overlapping roof faces and doubled opacity.
export function projectShadowVolume(vertices,direction,length,flip=1) {
  const points=vertices.map(([x,y,z])=>({x:x*flip+direction.x*z*length,y:y+direction.y*z*length}))
    .sort((a,b)=>a.x-b.x||a.y-b.y)
    .filter((point,i,list)=>!i||point.x!==list[i-1].x||point.y!==list[i-1].y);
  if(points.length<3)return points;
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const half=list=>{
    const hull=[];
    for(const point of list) {
      while(hull.length>1&&cross(hull.at(-2),hull.at(-1),point)<=1e-10)hull.pop();
      hull.push(point);
    }
    return hull.slice(0,-1);
  };
  return [...half(points),...half([...points].reverse())];
}
