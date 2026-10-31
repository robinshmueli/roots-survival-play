export function createFullscreen(game,onChange) {
  const button=document.getElementById('fullscreen-toggle'),label=document.getElementById('fullscreen-label');
  const status=document.getElementById('fullscreen-status');
  const request=game.requestFullscreen??game.webkitRequestFullscreen;
  const exit=document.exitFullscreen??document.webkitExitFullscreen;
  const supported=Boolean(request&&exit&&(document.fullscreenEnabled??document.webkitFullscreenEnabled??true));
  let pending=false,timer;
  function sync() {
    const active=(document.fullscreenElement??document.webkitFullscreenElement)===game;
    button.setAttribute('aria-pressed',String(active));
    label.textContent=active?'יציאה ממסך מלא':'מסך מלא';
    button.setAttribute('aria-label',active?'יציאה ממסך מלא':'מעבר למסך מלא');
    button.title=supported?(active?'יציאה ממסך מלא · Esc':'מעבר למסך מלא'):'מסך מלא אינו נתמך בדפדפן הזה';
    button.disabled=!supported||pending;
  }
  button.addEventListener('pointerup',()=>button.blur());
  button.addEventListener('keydown',event=>{if(event.code==='Space'||event.code==='Enter')event.stopPropagation();});
  button.addEventListener('click',async()=>{
    if(pending||!supported)return;
    pending=true;status.hidden=true;clearTimeout(timer);sync();
    try {
      if((document.fullscreenElement??document.webkitFullscreenElement)===game)await exit.call(document);
      else await request.call(game);
    } catch {
      status.textContent='הדפדפן לא אפשר מעבר למסך מלא.';status.hidden=false;
      timer=setTimeout(()=>{status.hidden=true;},4500);
    } finally {pending=false;sync();}
  });
  for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{sync();onChange();});
  window.addEventListener('keydown',async event=>{
    if(event.code!=='Escape'||event.defaultPrevented||document.querySelector('dialog[open]')
      ||(document.fullscreenElement??document.webkitFullscreenElement)!==game)return;
    event.preventDefault();
    try {await exit.call(document);}catch{}
  });
  sync();
}
