const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export const CAVE_TRAVEL={switchAt:.9,duration:1.85};

export function createCaveTransition() {
  let job=null,last=null,lock=null;
  return {
    get active(){return !!job;},
    get closed(){return last?.closed??0;},
    canStart(position,revision) {
      if(job)return false;
      if(lock&&(revision!==lock.revision||Math.hypot(position.x-lock.arrival.x,position.y-lock.arrival.y)>5))lock=null;
      return !lock;
    },
    start(plan,position) {
      if(job||!plan)return false;
      job={plan,from:{x:position.x,y:position.y},previous:{x:position.x,y:position.y},elapsed:0,switched:false};
      last={closed:0};return true;
    },
    savePosition(){return job?{...(job.switched?job.plan.end:job.plan.checkpoint)}:null;},
    update(dt,onSwitch,revision=0) {
      if(!job)return null;
      const j=job;j.elapsed=Math.min(CAVE_TRAVEL.duration,j.elapsed+Math.max(0,Number.isFinite(dt)?dt:0));
      if(j.elapsed>=CAVE_TRAVEL.duration-1e-9)j.elapsed=CAVE_TRAVEL.duration;
      let switched=false;
      if(!j.switched&&j.elapsed>=CAVE_TRAVEL.switchAt) {
        if(!onSwitch(j.plan)){const position={...j.plan.checkpoint};job=null;last=null;return {position,direction:j.plan.direction,distance:0,aborted:true};}
        j.switched=switched=true;j.previous={...j.plan.arrival};
      }
      const position=j.switched?lerp(j.plan.arrival,j.plan.end,ease((j.elapsed-.9)/.75)):lerp(j.from,j.plan.depart,ease(j.elapsed/.75));
      const closed=j.switched?1-ease((j.elapsed-1.03)/.82):ease((j.elapsed-.12)/.7);
      const distance=switched?0:Math.hypot(position.x-j.previous.x,position.y-j.previous.y);j.previous=position;
      const result={position,direction:j.switched?j.plan.emergeDirection:j.plan.direction,distance,closed,switched,finished:j.elapsed>=CAVE_TRAVEL.duration};
      last=result;
      if(result.finished){lock={arrival:{...j.plan.arrival},revision};job=null;}
      return result;
    },
  };
}

export function createCaveIris(container) {
  const canvas=document.createElement('canvas');canvas.id='cave-iris';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;container.append(canvas);
  const ctx=canvas.getContext('2d');
  return {
    paint(closed,center) {
      if(closed<=0){canvas.hidden=true;return;}
      const width=container.clientWidth,height=container.clientHeight;if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      canvas.hidden=false;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,width,height);ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
      const radius=Math.hypot(width,height)*(1-clamp(closed));
      if(radius>.1){ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(center.x*width,center.y*height,radius,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';}
    },
  };
}
