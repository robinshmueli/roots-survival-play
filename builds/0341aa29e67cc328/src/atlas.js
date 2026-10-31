import {WORLD,CAMP} from './config.js';
import {biomeAt} from './biomes.js';
import {createAtlasArt} from './atlas-art.js';
import {createAtlasView} from './atlas-view.js';
import {createAtlasFog} from './atlas-fog.js';
import {drawBiomeMarkers,drawHomeMarker,drawMiniHomeMarker} from './atlas-markers.js';

export function createAtlas(onToggle,blocked=()=>false,mapState=()=>({revision:0,felled:[]}),initialDiscovery=null) {
  const mini=document.getElementById('world-map'),full=document.getElementById('atlas-map');
  const dialog=document.getElementById('atlas'),toggle=document.getElementById('map-toggle');
  const zoomLabel=document.getElementById('atlas-zoom'),coordinates=document.getElementById('atlas-coordinates');
  const view=createAtlasView(full.width),pointers=new Map();
  let home={x:CAMP.x,y:CAMP.y},position={x:0,y:0},camera={width:32,height:20},dirty=true,lastMini='',lastFull='',stateRevision=-1,opened=false;
  const art=createAtlasArt(()=>{dirty=true;});
  const fog=createAtlasFog(initialDiscovery);
  document.fonts?.ready.then(()=>{lastFull='';dirty=true;drawFull(true);});
  function player(ctx,bounds,size,label=false) {
    const scale=size/(bounds.maxX-bounds.minX),x=(position.x-bounds.minX)*scale,y=(bounds.maxY-position.y)*scale;
    if(x<0||x>size||y<0||y>size)return;
    ctx.save();ctx.strokeStyle='#ffe2a499';ctx.lineWidth=1;
    ctx.strokeRect(Math.round(x-camera.width*scale/2),Math.round(y-camera.height*scale/2),Math.round(camera.width*scale),Math.round(camera.height*scale));
    const radius=label?5:3;
    ctx.fillStyle='#243729';ctx.beginPath();ctx.arc(x,y,radius+3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffe6a1';ctx.beginPath();ctx.moveTo(x,y-radius-1);ctx.lineTo(x+radius,y+radius);ctx.lineTo(x,y+radius-1);ctx.lineTo(x-radius,y+radius);ctx.closePath();ctx.fill();
    if(label) {
      ctx.textAlign='center';ctx.font='bold 12px Heebo,Arial,sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#203426';ctx.fillStyle='#fff0bb';
      const ty=y>size-35?y-14:y+23;ctx.strokeText('אתם כאן',x,ty);ctx.fillText('אתם כאן',x,ty);
    }
    ctx.restore();
  }
  function adorn(ctx,size,scale) {
    ctx.save();
    ctx.fillStyle='#20382acf';ctx.fillRect(12,12,30,40);ctx.fillStyle='#ffebbe';ctx.font='bold 12px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('N',27,26);
    ctx.beginPath();ctx.moveTo(27,31);ctx.lineTo(22,44);ctx.lineTo(27,41);ctx.lineTo(32,44);ctx.closePath();ctx.fill();
    const desired=90/scale,power=10**Math.floor(Math.log10(desired));
    const length=[1,2,5,10].map(n=>n*power).filter(n=>n<=desired).pop()??power;
    const width=length*scale;
    ctx.fillStyle='#20382ad9';ctx.fillRect(12,size-43,width+22,31);ctx.strokeStyle='#ffebbe';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(22,size-24);ctx.lineTo(22,size-18);ctx.lineTo(22+width,size-18);ctx.lineTo(22+width,size-24);ctx.stroke();
    ctx.fillStyle='#ffebbe';ctx.font='11px Heebo,Arial,sans-serif';ctx.textAlign='center';ctx.fillText(`${length} יח׳`,22+width/2,size-28);ctx.restore();
  }
  function drawFull(force=false) {
    if(!dialog.open)return;
    const center=view.center,key=`${art.revision}:${fog.revision}:${home?.x}:${home?.y}:${center.x}:${center.y}:${view.zoom}:${position.x}:${position.y}:${camera.width}:${camera.height}`;
    if(!force&&lastFull===key)return;lastFull=key;
    const ctx=full.getContext('2d'),bounds=view.bounds();
    art.render(ctx,bounds,full.width);fog.draw(ctx,bounds,full.width);
    if(view.scale<2.5)drawBiomeMarkers(ctx,(x,y)=>view.point(x,y),full.width,fog.known);
    drawHomeMarker(ctx,(x,y)=>view.point(x,y),full.width,true,home);
    player(ctx,bounds,full.width,true);adorn(ctx,full.width,view.scale);
    zoomLabel.textContent=`×${Number(view.zoom.toFixed(1))}`;
    document.getElementById('atlas-zoom-out').disabled=view.zoom<=1;
    document.getElementById('atlas-zoom-in').disabled=view.zoom>=32;
    full.setAttribute('aria-label',`מפת האזורים שגילית. עננים מסתירים שטח שלא נחקר. ${home?'הנקודה שמתחת לסמל הבית מסמנת את מיקום האוהל הנוכחי.':'כעת אין אוהל מוצב בעולם.'} הגדלה פי ${Number(view.zoom.toFixed(1))}. חצים להזזה, פלוס ומינוס לזום, 0 לכל העולם.`);
  }
  function drawMini() {
    const key=`${art.revision}:${fog.revision}:${home?.x}:${home?.y}:${position.x.toFixed(1)}:${position.y.toFixed(1)}:${camera.width.toFixed(1)}:${camera.height.toFixed(1)}`;
    if(!dirty&&lastMini===key)return;lastMini=key;
    const half=80,limit=WORLD.size/2-half,x=Math.max(-limit,Math.min(limit,position.x)),y=Math.max(-limit,Math.min(limit,position.y));
    const bounds={minX:x-half,maxX:x+half,minY:y-half,maxY:y+half},ctx=mini.getContext('2d');
    art.render(ctx,bounds,mini.width);fog.draw(ctx,bounds,mini.width);
    drawMiniHomeMarker(ctx,(x,y)=>({x:(x-bounds.minX)/(bounds.maxX-bounds.minX)*mini.width,y:(bounds.maxY-y)/(bounds.maxY-bounds.minY)*mini.width}),mini.width,position,home);
    player(ctx,bounds,mini.width);
    ctx.fillStyle='#ffebbe';ctx.font='bold 10px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText('N',5,12);
  }
  function update(current,nextCamera) {
    position={x:current.x,y:current.y};if(nextCamera)camera=nextCamera;
    if(fog.visit(position))dirty=true;
    const state=mapState();
    if(state.revision!==stateRevision){stateRevision=state.revision;if(Object.hasOwn(state,'home'))home=state.home;art.setFelled(state.felled,state.broken,state.planted);dirty=true;}
    drawMini();drawFull();dirty=false;
  }
  function close(){pointers.clear();onToggle();dialog.close();}
  function open(){if(blocked())return;if(!opened){view.focus(position,WORLD.size/140);opened=true;}dialog.showModal();onToggle();drawFull(true);full.focus({preventScroll:true});}
  function point(event) {
    const rect=full.getBoundingClientRect();
    // Exclude the canvas border, including when CSS scales the map on small screens.
    const x=(event.clientX-rect.left-full.clientLeft)/(full.clientWidth)*full.width;
    const y=(event.clientY-rect.top-full.clientTop)/(full.clientHeight)*full.height;
    return {x,y};
  }
  function change(action){action();drawFull(true);}
  toggle.addEventListener('click',open);
  document.getElementById('atlas-close').addEventListener('click',close);
  dialog.addEventListener('close',()=>{pointers.clear();full.classList.remove('panning');onToggle();});
  dialog.addEventListener('cancel',onToggle);
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
  });
  document.getElementById('atlas-zoom-in').addEventListener('click',()=>change(()=>view.zoomAt(1.6)));
  document.getElementById('atlas-zoom-out').addEventListener('click',()=>change(()=>view.zoomAt(1/1.6)));
  document.getElementById('atlas-fit').addEventListener('click',()=>change(()=>view.fit()));
  document.getElementById('atlas-center').addEventListener('click',()=>change(()=>view.focus(position)));
  full.addEventListener('wheel',event=>{
    event.preventDefault();const p=point(event),delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?full.clientHeight:1);
    change(()=>view.zoomAt(Math.exp(Math.max(-.7,Math.min(.7,-delta*.002))),p.x,p.y));
  },{passive:false});
  full.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();full.focus({preventScroll:true});
    pointers.set(event.pointerId,point(event));full.setPointerCapture(event.pointerId);full.classList.add('panning');
  });
  full.addEventListener('pointermove',event=>{
    const p=point(event),world=view.world(p.x,p.y);
    coordinates.textContent=`X ${Math.round(world.x)} · Y ${Math.round(world.y)} · ${fog.known(world.x,world.y)?biomeAt(world.x,world.y).label:'אזור לא מוכר'}`;
    if(!pointers.has(event.pointerId))return;
    event.preventDefault();
    const before=[...pointers.values()];pointers.set(event.pointerId,p);const after=[...pointers.values()];
    if(after.length===1)view.pan(p.x-before[0].x,p.y-before[0].y);
    else if(after.length===2) {
      const old={x:(before[0].x+before[1].x)/2,y:(before[0].y+before[1].y)/2},next={x:(after[0].x+after[1].x)/2,y:(after[0].y+after[1].y)/2};
      const oldDistance=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y),distance=Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y);
      view.pan(next.x-old.x,next.y-old.y);if(oldDistance>2)view.zoomAt(distance/oldDistance,next.x,next.y);
    }
    drawFull(true);
  });
  function release(event){pointers.delete(event.pointerId);if(!pointers.size)full.classList.remove('panning');}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])full.addEventListener(type,release);
  window.addEventListener('blur',()=>{pointers.clear();full.classList.remove('panning');});
  window.addEventListener('keydown',event=>{
    if(event.metaKey||event.ctrlKey||event.altKey)return;
    if(event.code==='KeyM'&&!event.repeat){event.preventDefault();if(dialog.open)close();else open();return;}
    if(!dialog.open)return;
    if(event.code==='Escape'){event.preventDefault();close();return;}
    const pan={ArrowLeft:[50,0],ArrowRight:[-50,0],ArrowUp:[0,50],ArrowDown:[0,-50]}[event.code];
    if(pan){event.preventDefault();change(()=>view.pan(...pan));}
    else if(['Equal','NumpadAdd','Minus','NumpadSubtract','Digit0','Numpad0'].includes(event.code)) {
      event.preventDefault();change(()=>event.code.includes('0')?view.fit():view.zoomAt(['Minus','NumpadSubtract'].includes(event.code)?1/1.35:1.35));
    }
  });
  return {serializeDiscovery:()=>fog.serialize(),get isOpen(){return dialog.open;},update,ready:art.ready,isDiscovered:fog.known,
    stats:()=>({...art.stats(),...fog.stats(),zoom:view.zoom,center:view.center})};
}
