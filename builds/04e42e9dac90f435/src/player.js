import { makeCanvas, texture, sprite, ellipse, polygon, rect } from './art.js';
import { PLAYER, SPRINT, EATING,toolKind,COMBAT_TOOLS } from './config.js';
import { createBreath } from './breath.js';
import { itemArt } from './items.js';
import {SEEDS} from './tree-seeds.js';
import {flameTextures} from './torch-art.js';
import {clipInteriorArt} from './interior-mask.js';
import {heldSpearArt,heldSpearAngle} from './weapon-art.js';
import {createOffhandView} from './offhand-view.js';

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

function characterArt(facing, frame = 0, walking = false, tool = null, attack = -1, pant = -1, flip = 1, eat = -1, brace = false,dual=false) {
  const [canvas, baseCtx] = makeCanvas(24, 36);
  let ctx=baseCtx;
  const profile = facing === 'right';
  const diagonal = facing === 'upRight' || facing === 'downRight';
  const back = facing === 'up' || facing === 'upRight';
  const lookingRight = profile || diagonal;
  // A mirrored body needs the opposite drawn arm to keep the same anatomical hand.
  const holdingLeft = back || profile ? flip < 0 : flip > 0;
  let grip,offGrip;
  const ink = '#3b302b';
  const phase = frame / 8 * Math.PI * 2;
  const swing = walking ? Math.sin(phase) : 0;
  const bob = walking ? Math.round(Math.abs(swing)) : 0;
  const sway = walking && !profile ? Math.round(Math.cos(phase) * .6) : 0;
  const feeding=eat>=0,chewing=feeding&&eat>=4&&eat<=7,frontEating=feeding&&(!back||diagonal);
  const breathing=pant>=0,inhale=breathing&&(pant===1||pant===2)?1:0;
  const upperY=-bob+(breathing?1+(inhale?0:1):0),headDrop=(breathing&&pant===3||chewing&&eat%2===1)?1:0;

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

  // Keep planted/walking legs separate from the shoulders' attack follow-through.
  // Integer row offsets below preserve the native pixel grid without rotating
  // the entire character or moving its feet and collision circle.
  let upperCanvas=null;
  if(attack>=0)[upperCanvas,ctx]=makeCanvas(24,36);
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
    if(!holding&&dual){handX=profile?(left?3:22):(left?3:21);handY=24+Math.round(motion*(back?-1:1));}
    if(holding && attack>=0&&tool!=='spear') {
      // Wind up over the shoulder, strike out, then draw the hand back to the hip.
      const poses=[[16,16],[15,11],[21,20],[21,24],[20,26],[19,26],[19,26],[19,26]];
      const pose=poses[attack];
      handX=(left?(lookingRight?pose[0]-6:24-pose[0]):pose[0])-(back?2:0);
      handY=pose[1]-(back?2:0);
      if(!lookingRight)handX+=left?2:-2;
    }
    if(holding&&tool==='spear'&&(brace||attack>=0)) {
      const extension=brace?3:[0,-1,5,5,3,1,0,0][attack],x=profile?1:diagonal?Math.SQRT1_2:0,y=back?(diagonal?Math.SQRT1_2:1):profile?0:diagonal?-Math.SQRT1_2:-1;
      handX=Math.max(3,Math.min(20,handX+Math.round(x*extension)));handY=Math.max(12,Math.min(29-(breathing?2:0),handY-Math.round(y*extension)));
    }
    if(holding&&feeding) {
      const lift=[0,.25,.65,1,1,1,.9,.35,0][eat];
      const mouthX=(lookingRight?18:13)+(profile?1:0),mouthY=(back?13:16)+headDrop;
      handX=Math.round(handX+(mouthX-1-handX)*lift);handY=Math.round(handY+(mouthY+2-handY)*lift);
    }
    if(holding&&['axe','pickaxe','torch'].includes(toolKind(tool)))handX=Math.min(handX,20);
    polygon(ctx, [[shoulder-1,19],[shoulder+1,19],[handX+1,handY-1],[handX-1,handY]],
      left ? '#aa5739' : '#c57749', ink);
    rect(ctx, handX-1, handY-1, 3, 3, left ? '#ce9669' : '#e4b581');
    rect(ctx, shoulder, 21, 1, 2, '#e29a5c');
    if(holding)grip={x:(handX+sway-12)/16,y:(18-handY-upperY)/16,side:'right'};
    else offGrip={x:(handX+sway-12)/16,y:(18-handY-upperY)/16,side:'left'};
    if(holding&&tool==='stone') {
      polygon(ctx,[[handX-2,handY-3],[handX+1,handY-5],[handX+4,handY-3],[handX+3,handY],[handX,handY+1]],'#8b9589',ink);
      polygon(ctx,[[handX-1,handY-3],[handX+1,handY-4],[handX+3,handY-3],[handX,handY-1]],'#c4c7b6');
      rect(ctx,handX,handY,2,1,'#e4b581');
    } else if(holding&&tool==='coal') {
      ctx.drawImage(itemArt('coal'),handX-3,handY-5,7,7);rect(ctx,handX-1,handY-1,3,2,'#e4b581');
    } else if(holding&&tool==='log') {
      polygon(ctx,[[handX-2,handY-3],[handX+1,handY-4],[handX+3,handY],[handX,handY+2]],'#956337',ink);
      rect(ctx,handX,handY-2,2,3,'#d2a567');
    } else if(holding&&tool==='apple'&&(!feeding||eat<6)) {
      polygon(ctx,[[handX-2,handY-3],[handX,handY-4],[handX+2,handY-3],[handX+3,handY],[handX+1,handY+2],[handX-1,handY+1],[handX-3,handY-1]],'#d64b39',ink);
      rect(ctx,handX-1,handY-2,1,2,'#ffb073');rect(ctx,handX,handY-5,1,2,'#775032');rect(ctx,handX+1,handY-5,3,1,'#86b75d');
    } else if(holding&&tool==='cherry'&&(!feeding||eat<6)) {
      ctx.drawImage(itemArt('cherry'),handX-3,handY-6,6,7);
    } else if(holding&&['coconut','copper-ore','copper','iron-ore','iron','raw-steak','steak','raw-drumstick','drumstick','raw-bacon','bacon'].includes(tool)&&(!feeding||eat<6)) {
      ctx.drawImage(itemArt(tool),handX-3,handY-5,7,7);
    } else if(holding&&tool==='fiber') {
      ctx.drawImage(itemArt('fiber'),handX-3,handY-6,7,8);
      rect(ctx,handX,handY,2,1,'#e4b581');
    } else if(holding&&['axe','pickaxe'].includes(toolKind(tool))) {
      ctx.drawImage(itemArt(tool),handX-3,handY-9,7,11);
      rect(ctx,handX,handY,2,1,'#e4b581');
    } else if(holding&&tool==='torch') {
      polygon(ctx,[[handX-1,handY+2],[handX+2,handY+2],[handX+4,handY-10],[handX+1,handY-11]],'#ae804b',ink);
      rect(ctx,handX+1,handY-8,2,7,'#d6b77a');rect(ctx,handX,handY-10,5,2,'#4a4931');rect(ctx,handX,handY-8,5,1,'#bb9c61');
      rect(ctx,handX-1,handY-1,3,3,'#e4b581');
    } else if(holding&&toolKind(tool)==='sword') {
      ctx.drawImage(itemArt(tool),handX-2,handY-8,7,10);rect(ctx,handX,handY,2,1,'#e4b581');
    } else if(holding&&(SEEDS[tool]||['furnace','tent','workbench','campfire','wood-wall','wood-door','wood-floor','chest'].includes(tool))) {
      ctx.drawImage(itemArt(tool),handX-3,handY-5,7,7);
    }
  }
  const foregroundLeft=!back&&!profile;
  if(!(frontEating&&holdingLeft===!foregroundLeft))arm(!foregroundLeft);
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
  if(!(frontEating&&holdingLeft===foregroundLeft))arm(foregroundLeft);

  const headShift = profile ? 1 : 0;
  ctx.save();ctx.translate(headShift, headDrop);
  polygon(ctx, [[7,5],[15,5],[18,8],[18,14],[16,18],[8,17],[5,13],[5,8]], '#9b603b', ink);
  if (!back) {
    const faceLeft = profile ? 13 : diagonal ? 11 : 8;
    polygon(ctx, [[faceLeft,10],[18,10],[19,14],[16,17],[faceLeft,16]], '#e8b27a');
    if (lookingRight) rect(ctx, 19, 12, 2, 2, '#ce9162');
    else rect(ctx, 6, 12, 2, 3, '#ce9162');
    rect(ctx, lookingRight ? 17 : 10, 12, 1, 2, ink);
    if (!profile) rect(ctx, diagonal ? 13 : 15, 12, 1, 2, ink);
    rect(ctx, lookingRight ? 16 : 12, 16, 2, 1, '#a86b49');
    if(chewing)rect(ctx,lookingRight?17:12,15,2,eat%2?2:1,ink);
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
  if(frontEating)arm(holdingLeft);
  if(chewing&&(!back||diagonal)) {
    const x=(lookingRight?19:14)+headShift,y=(back?14:17)+headDrop;
    if(eat===4||eat===6){rect(ctx,x+1,y+2,1,1,tool==='cherry'?'#b83e50':'#e4b578');rect(ctx,x-2,y+3,1,1,'#e7bd85');}
  }
  ctx.restore();
  const transformUpper=upperCanvas?paintAttackBody(baseCtx,upperCanvas,{attack,tool,profile,diagonal,back,holdingLeft}):(x,y)=>({x,y});
  const map=texture(canvas);
  const packX=profile?5:diagonal?6:8,packWidth=diagonal||profile?7:9;
  map.userData.backpack={x:(packX+packWidth/2+sway-12)/16,y:(18-19-upperY)/16,
    centerX:(packX+packWidth/2+sway-12)/16,centerY:(18-22.5-upperY)/16,visible:back||profile};
  map.userData.grip=grip;
  map.userData.offGrip=offGrip;map.userData.offhandFront=(!holdingLeft)===foregroundLeft;
  map.userData.dualWield=dual;
  map.userData.mouth={x:((lookingRight?18:13)+sway+headShift-12)/16,
    y:(18-(back?13:16)-upperY-headDrop)/16};
  for(const key of ['grip','offGrip','mouth']) {
    const anchor=map.userData[key],p=transformUpper(12+anchor.x*16,18-anchor.y*16);
    anchor.x=(p.x-12)/16;anchor.y=(18-p.y)/16;
  }
  const pack=map.userData.backpack,opening=transformUpper(12+pack.x*16,18-pack.y*16),center=transformUpper(12+pack.centerX*16,18-pack.centerY*16);
  pack.x=(opening.x-12)/16;pack.y=(18-opening.y)/16;pack.centerX=(center.x-12)/16;pack.centerY=(18-center.y)/16;
  map.userData.attackPose=attack>=0?attack:null;
  return map;
}

function paintAttackBody(ctx,upper,{attack,tool,profile,diagonal,back,holdingLeft}) {
  // The impact falls in frame 2 for all current weapons. Rock/axe/pickaxe
  // swings commit the shoulders; the sword twists and the spear leans forward.
  const force=[-.65,-1.6,2.8,2.1,1.1,.45,0,0][attack],strength=toolKind(tool)==='sword'?.85:toolKind(tool)==='pickaxe'?1.05:1;
  const forwardX=profile?1:diagonal?Math.SQRT1_2:0,forwardY=back?(diagonal?Math.SQRT1_2:1):profile?0:diagonal?-Math.SQRT1_2:-1;
  const twist=tool==='spear'?0:(holdingLeft?-1:1)*[0,-.55,1,.65,.25,0,0,0][attack];
  const leanX=forwardX*force*strength+twist,leanY=-forwardY*force*strength;
  const data=upper.getContext('2d').getImageData(0,0,24,36).data,offsets=[];
  for(let y=0;y<36;y++) {
    let min=24,max=-1;
    for(let x=0;x<24;x++)if(data[(y*24+x)*4+3]){min=Math.min(min,x);max=Math.max(max,x);}
    const weight=Math.max(0,Math.min(1,(27-y)/16));
    const dx=max<0?0:Math.max(-min,Math.min(23-max,Math.round(leanX*weight)));
    const dy=weight?Math.max(1-y,Math.min(30-y,Math.round(leanY*weight))):0;
    offsets.push({x:dx,y:dy});
  }
  for(let y=0;y<36;y++) {
    const {x:dx,y:dy}=offsets[y],next=y<35?y+1+offsets[y+1].y:y+dy+1;
    // Duplicate a native pixel row when leaning stretches the torso, so the
    // jacket never acquires transparent horizontal seams between its rows.
    ctx.drawImage(upper,0,y,24,1,dx,y+dy,24,Math.max(1,next-y-dy));
  }
  return (x,y)=>{const shift=offsets[Math.max(0,Math.min(35,Math.round(y)))];return {x:x+shift.x,y:y+shift.y};};
}

export function createPlayer(scene, lighting) {
  const toolFrames=(facing,flip,tool,dual=false)=>({
    idle:characterArt(facing,0,false,tool,-1,-1,flip,-1,false,dual),
    walk:Array.from({length:8},(_,i)=>characterArt(facing,i,true,tool,-1,-1,flip,-1,false,dual)),
    attack:COMBAT_TOOLS[tool]?Array.from({length:8},(_,i)=>characterArt(facing,0,false,tool,i,-1,flip,-1,false,dual)):null,
  });
  const frames = Object.fromEntries(directions.map(({facing,flip}) => [`${facing}:${flip}`,
    Object.fromEntries(['copper-axe','copper-pickaxe','copper-sword','copper-ore','copper','iron-axe','iron-pickaxe','iron-sword','iron-ore','iron','coconut','empty','stone','log','apple','cherry','fiber','coal','torch','axe','pickaxe','sword','spear','raw-steak','steak','raw-drumstick','drumstick','raw-bacon','bacon','furnace','tent','workbench','campfire','wood-wall','wood-door','wood-floor','chest'].map(tool=>[tool,toolFrames(facing,flip,tool)]))
  ]));
  const [canvas, ctx] = makeCanvas(24, 12);
  ellipse(ctx, 12, 6, 9, 4, '#35452e55');
  const shadow = sprite(texture(canvas), 1.5, .75);
  shadow.position.z = .1;
  scene.add(shadow);
  lighting?.surface(shadow);
  const body = sprite(frames['down:1'].stone.idle, 1.5, 2.25);
  const weaponArt=Object.fromEntries(['spear'].map(type=>{const art=heldSpearArt();return [type,{...art,map:texture(art.canvas)}];}));
  const weapon=sprite(weaponArt.spear.map,4,1);weapon.name='held-melee-weapon';weapon.visible=false;scene.add(weapon);lighting?.surface(weapon);
  const fireMaps=flameTextures(),fire=sprite(fireMaps[0],.6,.8);fire.name='held-torch-flame';fire.visible=false;scene.add(fire);
  let flameTime=0,lightSource=null,indoorFire=null,indoorFireKey=null;
  body.name = 'player';
  scene.add(body);
  lighting?.castShadow(body, { width: 1.5, height: 2.25, foot: 34 / 36 });
  const breath=createBreath(scene,lighting);
  const offhandView=createOffhandView(scene,lighting);
  let facing = 'down', flip = 1, walkDistance = 0;
  let look={x:0,y:-1};
  return {
    get lightSource(){return lightSource;},
    get pickupAnchor() {
      const pack=body.material.map.userData.backpack;
      const mouth=body.material.map.userData.mouth,mouthX=body.position.x+mouth.x*body.scale.x,mouthY=body.position.y+mouth.y;
      return {x:body.position.x+pack.x*body.scale.x,y:body.position.y+pack.y,z:body.position.z,
        center:{x:body.position.x+pack.centerX*body.scale.x,y:body.position.y+pack.centerY},visible:body.visible,behind:!pack.visible,
        body:{x:body.position.x,y:body.position.y-1},facing:{...look},
        face:{minX:mouthX-.45,maxX:mouthX+.45,minY:mouthY-.25,maxY:mouthY+.65}};
    },
    update(position, direction, distance, dt, action = {}) {
      const orientation = getFacing(action.swing?.direction??direction);
      if (orientation) {({ facing, flip } = orientation);look=action.swing?.direction??direction;}
      const moving = distance > .00001;
      walkDistance = moving ? walkDistance + distance : 0;
      const frame = Math.floor(walkDistance / PLAYER.strideLength * 8) % 8;
      const view=frames[`${facing}:${flip}`],held=action.eating?.type??action.equipped;
      if(SEEDS[held]&&!view[held])view[held]=toolFrames(facing,flip,held);
      const dual=!!action.offhand,key=dual?`dual:${held??'empty'}`:held;
      if(dual&&!view[key])view[key]=toolFrames(facing,flip,held??'empty',true);
      const tool=view[key]??view.empty;
      const strike=action.swing&&tool.attack?Math.min(7,Math.floor(action.swing.progress*8)):-1;
      const breathTime=action.panting?Math.max(0,SPRINT.exhaustionDuration-(action.breathRemaining??SPRINT.exhaustionDuration)):null;
      if(held==='spear'&&action.spear?.held) {
        const pant=action.panting?Math.floor((breathTime+1e-8)/.6*4)%4:-1,braced=!!action.spear.braced,key=`${moving?frame:'idle'}:${braced}:${pant}`;
        tool.brace??=new Map();if(!tool.brace.has(key))tool.brace.set(key,characterArt(facing,frame,moving,held,-1,pant,flip,-1,braced,dual));body.material.map=tool.brace.get(key);
      } else if(action.eating) {
        const pose=Math.min(EATING.frames-1,Math.floor(action.eating.progress*EATING.frames)),key=`${moving?frame:'idle'}:${pose}`;
        tool.eat??=new Map();
        if(!tool.eat.has(key))tool.eat.set(key,characterArt(facing,frame,moving,held,-1,-1,flip,pose,false,dual));
        body.material.map=tool.eat.get(key);
      } else if(action.panting) {
        const pose=Math.floor((breathTime+1e-8)/.6*4)%4,key=`${moving?frame:'idle'}:${strike}:${pose}`;
        tool.pant??=new Map();
        if(!tool.pant.has(key))tool.pant.set(key,characterArt(facing,frame,moving,held,strike,pose,flip,-1,false,dual));
        body.material.map=tool.pant.get(key);
      } else if(strike>=0&&moving) {
        const key=`${frame}:${strike}`;tool.walkAttack??=new Map();
        if(!tool.walkAttack.has(key))tool.walkAttack.set(key,characterArt(facing,frame,true,held,strike,-1,flip,-1,false,dual));
        body.material.map=tool.walkAttack.get(key);
      } else body.material.map=strike>=0?tool.attack[strike]:moving?tool.walk[frame]:tool.idle;
      body.userData.eating=Boolean(action.eating);
      body.userData.eatingFood=action.eating?.type??null;
      body.userData.panting=Boolean(action.panting);
      body.visible=shadow.visible=action.visible!==false;body.userData.sleeping=!body.visible;
      body.scale.x = flip;
      const x = Math.round(position.x * 16) / 16, y = Math.round(position.y * 16) / 16;
      // Foot and shadow anchors stay on the ground while the torso bobs inside the sprite.
      body.position.set(x, y + 1, 10 - position.y * .01 + .001);
      shadow.position.set(x, y, .1);
      weapon.visible=body.visible&&Object.hasOwn(weaponArt,held??'');
      if(weapon.visible) {
        const art=weaponArt[held],grip=body.material.map.userData.grip,angle=heldSpearAngle(look,action.swing,action.spear),offset=art.width/2-art.grip.x/16;
        const hand={x:body.position.x+grip.x*flip,y:body.position.y+grip.y};
        weapon.material.map=art.map;weapon.rotation.z=angle;weapon.position.set(hand.x+Math.cos(angle)*offset,hand.y+Math.sin(angle)*offset,body.position.z+(look.y>.2?-.0002:.0003));
        weapon.userData.grip={...hand,side:'right'};weapon.userData.tip={x:hand.x+Math.cos(angle)*(art.tip.x-art.grip.x)/16,y:hand.y+Math.sin(angle)*(art.tip.x-art.grip.x)/16};weapon.userData.tool=held;weapon.userData.braced=!!action.spear?.braced;
      }
      flameTime+=Math.max(0,dt);fire.visible=body.visible&&held==='torch';lightSource=null;
      const offhandLight=offhandView.update(body,action.offhand,flameTime);
      if(fire.visible) {
        const grip=body.material.map.userData.grip;
        fire.material.map=fireMaps[Math.floor(flameTime*8)%4];
        fire.position.set(body.position.x+(grip.x+2/16)*flip,body.position.y+grip.y+9/16+.25,body.position.z+.0001);
        if(action.roofTiles?.length) {
          const roof=action.roofTiles.map(tile=>({x:tile.x-fire.position.x,y:tile.y-fire.position.y})),key=JSON.stringify([Math.floor(flameTime*8)%4,roof]);
          indoorFire??=texture(makeCanvas(16)[0]);
          if(key!==indoorFireKey) {
            clipInteriorArt(fire.material.map.image,{width:.6,height:.8,foot:.5},{roof,walls:[],originY:0},indoorFire.image);
            indoorFire.needsUpdate=true;indoorFireKey=key;
          }
          fire.material.map=indoorFire;
        }
        lightSource={x:fire.position.x,y:position.y+.2,radius:7,power:1.7};
      }
      lightSource??=offhandLight;
      const mouth=body.material.map.userData.mouth;
      if(body.visible)breath.update(position,{x:body.position.x+mouth.x*flip,y:body.position.y+mouth.y},look,dt,breathTime);
      else breath.hide();
    },
  };
}
