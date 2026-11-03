const movementCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
const shiftCodes = new Set(['ShiftLeft', 'ShiftRight']);
const actionCodes = new Set(['Space', 'KeyE']);

export function createInput(canvas) {
  const held = new Set();
  let mouseHeld=false, rightHeld=false, pointer=null, pickupRequested=false, useRequested=false,movementRevision=0;
  const keycaps = new Map([...document.querySelectorAll('[data-code]')].map(el => [el.dataset.code, el]));
  function reset() {
    held.clear();
    mouseHeld=rightHeld=false;pointer=null;pickupRequested=false;useRequested=false;
    keycaps.forEach(el => el.classList.remove('pressed'));
  }
  window.addEventListener('keydown', event => {
    // Physical codes keep WASD working when the active keyboard language is Hebrew.
    if ((!movementCodes.has(event.code) && !shiftCodes.has(event.code) && !actionCodes.has(event.code)) || event.metaKey || event.ctrlKey || event.altKey || event.target?.closest?.('dialog[open]')) return;
    event.preventDefault();
    if(movementCodes.has(event.code)&&!event.repeat)movementRevision++;
    if(event.code==='KeyE'&&!event.repeat&&!held.has('KeyE'))pickupRequested=true;
    if(event.code==='Space'&&!event.repeat&&!held.has('Space'))useRequested=true;
    held.add(event.code);
    keycaps.get(shiftCodes.has(event.code) ? 'ShiftLeft' : event.code)?.classList.add('pressed');
  });
  window.addEventListener('keyup', event => {
    held.delete(event.code);
    if (shiftCodes.has(event.code)) keycaps.get('ShiftLeft')?.classList.toggle('pressed', [...shiftCodes].some(code => held.has(code)));
    else keycaps.get(event.code)?.classList.remove('pressed');
  });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  function aim(event) {
    const rect=canvas.getBoundingClientRect();
    pointer={x:(event.clientX-rect.left)/rect.width*2-1,y:1-(event.clientY-rect.top)/rect.height*2};
  }
  canvas?.addEventListener('pointerdown',event=>{if(![0,2].includes(event.button))return;event.preventDefault();if(event.button===2)rightHeld=true;else{mouseHeld=true;useRequested=true;}aim(event);});
  canvas?.addEventListener('contextmenu',event=>event.preventDefault());
  canvas?.addEventListener('pointermove',aim);
  canvas?.addEventListener('pointerleave',()=>{mouseHeld=rightHeld=false;pointer=null;});
  window.addEventListener('pointerup',event=>{if(event.button===0)mouseHeld=false;if(event.button===2)rightHeld=false;});
  window.addEventListener('pointercancel',()=>{mouseHeld=rightHeld=false;});
  return {
    get movementRevision(){return movementRevision;},
    reset,
    attack() {return held.has('Space')||mouseHeld;},
    brace() {return rightHeld;},
    aim() {return pointer;},
    takePickup() {const requested=pickupRequested;pickupRequested=false;return requested;},
    takeUse() {const requested=useRequested;useRequested=false;return requested;},
    sprint() { return held.has('ShiftLeft') || held.has('ShiftRight'); },
    direction() {
      let x = Number(held.has('KeyD')) - Number(held.has('KeyA'));
      let y = Number(held.has('KeyW')) - Number(held.has('KeyS'));
      const length = Math.hypot(x, y);
      if (length) { x /= length; y /= length; }
      return { x, y };
    },
  };
}
