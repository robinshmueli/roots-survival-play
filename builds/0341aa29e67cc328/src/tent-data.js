import {CAMP} from './config.js';
export const STARTER_TENT={id:'tent:0',type:'tent',x:CAMP.x,y:CAMP.y,rotation:0};
export const TENT_SPEC={width:CAMP.width,height:CAMP.height,foot:CAMP.foot,centerY:.35,rx:1.75,ry:.65,reach:CAMP.reach};
export const TENT_SHADOW_VOLUME=[[-1.75,.05,0],[.7,-.05,0],[2.1,.25,0],[-.35,.35,0],[-.35,0,2.9],[.85,.3,2.25]];
// Side views need the actual ground depth, rather than the original painted perspective.
export const TENT_TURN_VOLUME=[[-1.75,-.3,0],[1.75,-.3,0],[1.75,1,0],[-1.75,1,0],[0,-.3,2.75],[0,1,2.75]];
