import {VIEW} from './config.js';

// Fit the screen inside a fixed view of the world. Wider/shorter windows crop
// the shorter axis instead of increasing sight range or jumping between zoom levels.
export function gameViewport(width,height,displayAspect=VIEW.referenceAspect) {
  const w=Math.max(1,width),h=Math.max(1,height);
  const aspect=Number.isFinite(displayAspect)&&displayAspect>0?displayAspect:VIEW.referenceAspect;
  const referenceHeight=VIEW.referenceHeight/VIEW.zoom,referenceWidth=referenceHeight*aspect;
  const scale=Math.max(w/referenceWidth,h/referenceHeight);
  return {
    renderWidth:Math.max(1,Math.round(w/scale)),renderHeight:Math.max(1,Math.round(h/scale)),
    worldWidth:w/scale/VIEW.pixelsPerUnit,worldHeight:h/scale/VIEW.pixelsPerUnit,
  };
}
