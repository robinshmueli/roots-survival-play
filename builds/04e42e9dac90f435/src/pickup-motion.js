export const PICKUP_MOTION={liftSeconds:.12,flightSeconds:.66,arrivalSeconds:.22};
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>value*value*(3-2*value);
const curve=(a,b,c,d,t)=>{const s=1-t;return {x:s*s*s*a.x+3*s*s*t*b.x+3*s*t*t*c.x+t*t*t*d.x,y:s*s*s*a.y+3*s*s*t*b.y+3*s*t*t*c.y+t*t*t*d.y};};

// An item first passes outside a shoulder, then approaches the pack from the
// back. Both segments follow the current body/pack and share a tangent.
export function pickupPose(elapsed,from,to,bend=.22,size={width:.95,height:.95}) {
  const {liftSeconds,flightSeconds}=PICKUP_MOTION,age=Math.max(0,elapsed);
  let pose;
  if(age<liftSeconds) {
    const t=age/liftSeconds;
    pose={x:from.x,y:from.y+.24*smooth(t),scale:1+.08*Math.sin(t*Math.PI/2),rotation:0,opacity:1,progress:0,done:false};
  } else {
    const progress=clamp((age-liftSeconds)/flightSeconds),t=smooth(progress),split=.6,side=Math.sign(bend)||1;
    const body=to.body??{x:to.x,y:to.y-.94},facing=to.facing??{x:0,y:1},length=Math.hypot(facing.x,facing.y)||1;
    const outside={x:body.x+side*(.88+size.width/2),y:Math.min(to.y-.2,(to.face?.minY??body.y+.9)-size.height/2-.08)};
    const start={x:from.x,y:from.y+.24},tangent=.28+Math.abs(bend)*.2;
    const point=t<split?curve(start,{x:start.x+side*.3,y:Math.min(start.y+.22,outside.y+.25)},
      {x:outside.x+side*tangent,y:outside.y},outside,t/split):
      curve(outside,{x:outside.x-side*tangent*(1-split)/split,y:outside.y},
        {x:to.x-facing.x/length*.7,y:to.y-facing.y/length*.45-.1},to,(t-split)/(1-split));
    pose={...point,scale:1.08*(1-t*t),rotation:Math.sin(progress*Math.PI)*.24*side,
      opacity:1-smooth(clamp((progress-.9)/.1)),progress,done:age+1e-9>=liftSeconds+flightSeconds};
  }
  const c=Math.abs(Math.cos(pose.rotation)),s=Math.abs(Math.sin(pose.rotation));
  const rx=(size.width*c+size.height*s)*pose.scale/2,ry=(size.height*c+size.width*s)*pose.scale/2,face=to.face;
  const overFace=!!face&&pose.x+rx>face.minX&&pose.x-rx<face.maxX&&pose.y+ry>face.minY&&pose.y-ry<face.maxY;
  // A front-facing body hides its pack. Never draw any part of a flying icon
  // across the mouth/head, including a nearby source already overlapping it.
  return {...pose,behind:overFace||!!to.behind&&smooth(pose.progress)>=.6};
}
