// Short synthesized notes keep the effect self-contained and quiet. Audio is
// created only after a real player gesture; muted/inactive pages stay silent.
export function createEchoChime() {
  let context=null,disposed=false,running=true;
  const voices=new Set();
  function unlock() {
    if(disposed)return;
    if(context){if(running&&context.state==='suspended')context.resume().catch(()=>{});return;}
    const Audio=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Audio)return;
    try{context=new Audio();context.resume().catch(()=>{});}catch{context=null;}
  }
  globalThis.addEventListener?.('pointerdown',unlock,{capture:true});
  globalThis.addEventListener?.('keydown',unlock,{capture:true});
  function note(frequency,delay,length,gain=.025) {
    if(!context||!running||context.state!=='running')return;
    const at=context.currentTime+delay,osc=context.createOscillator(),amp=context.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(frequency,at);osc.frequency.exponentialRampToValueAtTime(frequency*.985,at+length);
    amp.gain.setValueAtTime(.0001,at);amp.gain.exponentialRampToValueAtTime(gain,at+.012);amp.gain.exponentialRampToValueAtTime(.0001,at+length);
    osc.connect(amp);amp.connect(context.destination);voices.add(osc);
    osc.onended=()=>{voices.delete(osc);osc.disconnect();amp.disconnect();};osc.start(at);osc.stop(at+length+.01);
  }
  return {
    play(kind) {
      if(kind==='release'){note(523.25,0,.2);note(783.99,.045,.24,.019);note(1046.5,.09,.3,.012);}
      else if(kind==='arrive'){note(659.25,0,.16,.014);note(987.77,.055,.22,.012);}
      else if(kind==='finish'){note(1046.5,0,.25,.018);note(1567.98,.035,.34,.01);note(2093,.07,.22,.006);}
    },
    update(active) {
      const next=!!active,changed=next!==running;running=next;
      if(!changed||!context||context.state==='closed')return;
      if(!running&&context.state==='running')context.suspend().catch(()=>{});
      else if(running&&context.state==='suspended'&&globalThis.navigator?.userActivation?.hasBeenActive)context.resume().catch(()=>{});
    },
    clear(){for(const voice of voices){try{voice.stop();}catch{}}voices.clear();},
    dispose(){disposed=true;this.clear();globalThis.removeEventListener?.('pointerdown',unlock,{capture:true});globalThis.removeEventListener?.('keydown',unlock,{capture:true});context?.close().catch(()=>{});},
  };
}
