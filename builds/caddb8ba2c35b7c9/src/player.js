import { makeCanvas, texture, sprite, ellipse, polygon, rect } from './art.js';
import { PLAYER, SPRINT } from './config.js';
import { createBreath } from './breath.js';

const directions = [
  { facing: 'right', flip: 1 },
  { facing: 'upRight', flip: 1 },
  { facing: 'up', flip: 1 },
  { facing: 'upRight', flip: -1 },
  { facing: 'right', flip: -1 },
  { facing: 'downRight', flip: -1 },
  { facing: 'down', flip: 1 },
  { facing: 'downRight', flip: 1 },
];

export function getFacing(direction) {
  if (!direction.x && !direction.y) return null;
  const sector = Math.round(Math.atan2(direction.y, direction.x) / (Math.PI / 4));
  return directions[(sector + 8) % 8];
}

function characterArt(facing, frame = 0, walking = false, tool = null, attack = -1, pant = -1, flip = 1) {
  const [canvas, ctx] = makeCanvas(24, 36);
  const profile = facing === 'right';
  const diagonal = facing === 'upRight' || facing === 'downRight';
  const back = facing === 'up' || facing === 'upRight';
  const lookingRight = profile || diagonal;
  // A mirrored body needs the opposite drawn arm to keep the same anatomical hand.
  const holdingLeft = back || profile ? flip < 0 : flip > 0;
  let grip;
  const ink = '#3b302b';
  const phase = frame / 8 * Math.PI * 2;
  const swing = walking ? Math.sin(phase) : 0;
  const bob = walking ? Math.round(Math.abs(swing)) : 0;
  const sway = walking && !profile ? Math.round(Math.cos(phase) * .6) : 0;
  const breathing=pant>=0,inhale=breathing&&(pant===1||pant===2)?1:0;
  const upperY=-bob+(breathing?1+(inhale?0:1):0),headDrop=breathing&&pant===3?1:0;

  // Each foot swings forward, lifts, plants, then pushes back. The far leg is darker.
  function leg(left) {
    const motion = left ? swing : -swing;
    const hipX = left ? 9 : 14;
    const lift = walking ? Math.round(Math.max(0, (left ? 1 : -1) * Math.cos(phase)) * 2) : 0;
    const reachX = lookingRight ? Math.round(motion * (profile ? 3 : 2)) : 0;
    const reachY = profile ? 0 : Math.round(motion * (back ? -2 : 2));
    const footX = hipX + reachX;
    const footY = 32 + reachY - lift;
    polygon(ctx, [[hipX-2,26],[hipX+2,26],[footX+2,footY],[footX-2,footY]],
      left ? '#75573f' : '#9a7350', ink);
    rect(ctx, hipX-1, 27, 2, 2, left ? '#aa825b' : '#c09563');
    polygon(ctx, [[footX-2,footY],[footX+2,footY],[footX+(lookingRight?4:2),footY+1],
      [footX+(lookingRight?4:2),footY+2],[footX-2,footY+2]], '#514136', ink);
    rect(ctx, footX-1, footY, lookingRight ? 4 : 2, 1, '#b39768');
    rect(ctx,footX-1,footY+2,lookingRight?4:3,1,'#352f2a');
    if (lift) rect(ctx, footX-1, footY+1, 2, 1, '#786143');
  }
  leg(back);
  leg(!back);

  // The shoulders, pack, and head rise slightly as the supporting leg straightens.
  ctx.save();
  ctx.translate(sway, upperY);
  const shoulderLeft = profile ? 8 : 6;
  const shoulderRight = profile ? 16 : 18;
  function arm(left) {
    const holding=left===holdingLeft;
    const motion = left ? -swing : swing;
    const shoulder = left ? (profile&&holding?14:shoulderLeft) : shoulderRight;
    let handX = shoulder + (left ? -1 : 1) + (lookingRight ? Math.round(motion * 2) : 0);
    let handY = 26 + Math.round(motion * (back ? -2 : 2));
    // The far hand reaches beyond the torso in profile instead of disappearing into the pack.
    if(profile&&holding&&left)handX+=5;
    if(breathing&&attack<0){handX+=left?1:-1;handY++;}
    if(back&&diagonal&&holding&&left)handX-=2;
    if(holding && attack>=0) {
      // Wind up over the shoulder, strike out, then draw the hand back to the hip.
      const poses=[[16,16],[15,11],[21,20],[21,24],[20,26],[19,26],[19,26],[19,26]];
      const pose=poses[attack];
      handX=(left?(lookingRight?pose[0]-6:24-pose[0]):pose[0])-(back?2:0);
      handY=pose[1]-(back?2:0);
      if(!lookingRight)handX+=left?2:-2;
    }
    polygon(ctx, [[shoulder-1,19],[shoulder+1,19],[handX+1,handY-1],[handX-1,handY]],
      left ? '#aa5739' : '#c57749', ink);
    rect(ctx, handX-1, handY-1, 3, 3, left ? '#ce9669' : '#e4b581');
    rect(ctx, shoulder, 21, 1, 2, '#e29a5c');
    if(holding)grip={x:(handX+sway-12)/16,y:(18-handY-upperY)/16,side:'right'};
    if(holding&&tool==='stone') {
      polygon(ctx,[[handX-2,handY-3],[handX+1,handY-5],[handX+4,handY-3],[handX+3,handY],[handX,handY+1]],'#8b9589',ink);
      polygon(ctx,[[handX-1,handY-3],[handX+1,handY-4],[handX+3,handY-3],[handX,handY-1]],'#c4c7b6');
      rect(ctx,handX,handY,2,1,'#e4b581');
    } else if(holding&&tool==='log') {
      polygon(ctx,[[handX-2,handY-3],[handX+1,handY-4],[handX+3,handY],[handX,handY+2]],'#956337',ink);
      rect(ctx,handX,handY-2,2,3,'#d2a567');
    } else if(holding&&tool==='apple') {
      polygon(ctx,[[handX-2,handY-3],[handX,handY-4],[handX+2,handY-3],[handX+3,handY],[handX+1,handY+2],[handX-1,handY+1],[handX-3,handY-1]],'#d64b39',ink);
      rect(ctx,handX-1,handY-2,1,2,'#ffb073');rect(ctx,handX,handY-5,1,2,'#775032');rect(ctx,handX+1,handY-5,3,1,'#86b75d');
    }
  }
  const foregroundLeft=!back&&!profile;
  arm(!foregroundLeft);
  polygon(ctx, [[8,17],[15,17],[(profile?17:18)+inhale,21],[16,28],[8,28],[(profile?7:6)-inhale,21]], '#a34c37', ink);
  polygon(ctx, [[9,18],[12,18],[12,24],[9,26],[8,23]], '#d17b4b');
  rect(ctx, 13, 20, 2, 5, '#b8593d');
  rect(ctx,8,21,1,4,'#854532');
  if(!back&&!profile){rect(ctx,12,21,1,1,'#e1b779');rect(ctx,12,24,1,1,'#c99a61');}
  rect(ctx, 8, 26, 9, 2, '#6b4831');
  rect(ctx, 12, 26, 2, 2, '#d4b379');
  if (!back && !profile) {
    rect(ctx, 8, 18, 1, 6, '#806744');
    rect(ctx, diagonal ? 15 : 14, 18, 1, 6, '#806744');
  }
  if (back || profile) {
    const packX = profile ? 5 : diagonal ? 6 : 8;
    const packWidth = diagonal || profile ? 7 : 9;
    polygon(ctx, [[packX,18],[packX+packWidth,18],[packX+packWidth+1,25],
      [packX+packWidth-1,27],[packX-1,26]], '#806744', ink);
    rect(ctx, packX+1, 19, packWidth-1, 5, '#b2935c');
    rect(ctx, packX+2, 23, packWidth-2, 3, '#9d7d4b');
    rect(ctx,packX+1,19,packWidth-2,1,'#cbb079');
    rect(ctx,packX+1,22,packWidth-2,1,'#8a7047');
    rect(ctx, packX+3, 22, 2, 2, '#d9bc7d');
    rect(ctx,packX+3,22,1,1,'#f0d59b');
  }
  arm(foregroundLeft);

  const headShift = profile ? 1 : 0;
  ctx.translate(headShift, headDrop);
  polygon(ctx, [[7,5],[15,5],[18,8],[18,14],[16,18],[8,17],[5,13],[5,8]], '#9b603b', ink);
  if (!back) {
    const faceLeft = profile ? 13 : diagonal ? 11 : 8;
    polygon(ctx, [[faceLeft,10],[18,10],[19,14],[16,17],[faceLeft,16]], '#e8b27a');
    if (lookingRight) rect(ctx, 19, 12, 2, 2, '#ce9162');
    else rect(ctx, 6, 12, 2, 3, '#ce9162');
    rect(ctx, lookingRight ? 17 : 10, 12, 1, 2, ink);
    if (!profile) rect(ctx, diagonal ? 13 : 15, 12, 1, 2, ink);
    rect(ctx, lookingRight ? 16 : 12, 16, 2, 1, '#a86b49');
    if(breathing&&pant!==2)rect(ctx,lookingRight?17:12,15,2,2,ink);
  } else {
    rect(ctx, 7, 12, 3, 5, '#6e4630');
    rect(ctx, 13, 13, 4, 4, '#6e4630');
    if (diagonal) {
      rect(ctx, 17, 11, 2, 4, '#dda574');
      rect(ctx, 18, 12, 1, 1, ink);
    }
  }
  const brim = lookingRight ? 21 : 19;
  polygon(ctx, [[7,4],[15,3],[18,6],[18,10],[brim,10],[brim-1,12],
    [12,12],[6,10],[5,7]], '#b87842', ink);
  polygon(ctx, [[8,5],[14,4],[16,6],[16,9],[8,9],[6,7]], '#dfaa63');
  rect(ctx, 9, 5, 5, 1, '#f1cc88');
  rect(ctx, 7, 9, 10, 1, '#965b35');
  rect(ctx, lookingRight ? 17 : 13, 10, lookingRight ? 3 : 5, 1, '#e6b371');
  ctx.restore();
  const map=texture(canvas);
  map.userData.grip=grip;
  map.userData.mouth={x:((lookingRight?18:13)+sway+headShift-12)/16,
    y:(18-(back?13:16)-upperY-headDrop)/16};
  return map;
}

export function createPlayer(scene, lighting) {
  const frames = Object.fromEntries(directions.map(({facing,flip}) => [`${facing}:${flip}`,
    Object.fromEntries(['empty','stone','log','apple'].map(tool=>[tool,{
      idle:characterArt(facing,0,false,tool,-1,-1,flip),
      walk:Array.from({length:8},(_,i)=>characterArt(facing,i,true,tool,-1,-1,flip)),
      attack:tool==='stone'?Array.from({length:8},(_,i)=>characterArt(facing,0,false,tool,i,-1,flip)):null,
    }]))
  ]));
  const [canvas, ctx] = makeCanvas(24, 12);
  ellipse(ctx, 12, 6, 9, 4, '#35452e55');
  const shadow = sprite(texture(canvas), 1.5, .75);
  shadow.position.z = .1;
  scene.add(shadow);
  lighting?.surface(shadow);
  const body = sprite(frames['down:1'].stone.idle, 1.5, 2.25);
  body.name = 'player';
  scene.add(body);
  lighting?.castShadow(body, { width: 1.5, height: 2.25, foot: 34 / 36 });
  const breath=createBreath(scene,lighting);
  let facing = 'down', flip = 1, walkDistance = 0;
  let look={x:0,y:-1};
  return {
    update(position, direction, distance, dt, action = {}) {
      const orientation = getFacing(action.swing?.direction??direction);
      if (orientation) {({ facing, flip } = orientation);look=action.swing?.direction??direction;}
      const moving = distance > .00001;
      walkDistance = moving ? walkDistance + distance : 0;
      const frame = Math.floor(walkDistance / PLAYER.strideLength * 8) % 8;
      const view=frames[`${facing}:${flip}`],tool=view[action.equipped]??view.empty;
      const strike=action.swing&&tool.attack?Math.min(7,Math.floor(action.swing.progress*8)):-1;
      const breathTime=action.panting?Math.max(0,SPRINT.exhaustionDuration-(action.breathRemaining??SPRINT.exhaustionDuration)):null;
      if(action.panting) {
        const pose=Math.floor((breathTime+1e-8)/.6*4)%4,key=`${moving?frame:'idle'}:${strike}:${pose}`;
        tool.pant??=new Map();
        if(!tool.pant.has(key))tool.pant.set(key,characterArt(facing,strike>=0?0:frame,strike<0&&moving,action.equipped,strike,pose,flip));
        body.material.map=tool.pant.get(key);
      } else body.material.map=strike>=0?tool.attack[strike]:moving?tool.walk[frame]:tool.idle;
      body.userData.panting=Boolean(action.panting);
      body.scale.x = flip;
      const x = Math.round(position.x * 16) / 16, y = Math.round(position.y * 16) / 16;
      // Foot and shadow anchors stay on the ground while the torso bobs inside the sprite.
      body.position.set(x, y + 1, 10 - position.y * .01 + .001);
      shadow.position.set(x, y, .1);
      const mouth=body.material.map.userData.mouth;
      breath.update(position,{x:body.position.x+mouth.x*flip,y:body.position.y+mouth.y},look,dt,breathTime);
    },
  };
}
