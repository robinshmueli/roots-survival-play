import {makeCanvas,polygon,ellipse,rect} from './art.js';

function icon(kind) {
  const [canvas,ctx]=makeCanvas(24);
  if(kind==='hunger') {
    polygon(ctx,[[11,12],[14,10],[20,17],[18,21]],'#ecddb1','#59412c');
    ellipse(ctx,21,18,2,2,'#f5edcc','#59412c');ellipse(ctx,18,21,2,2,'#f5edcc','#59412c');
    polygon(ctx,[[3,6],[7,3],[12,3],[17,7],[17,12],[12,17],[7,18],[3,14],[1,10]],'#bb743b','#533a28');
    polygon(ctx,[[4,6],[8,4],[12,5],[14,8],[10,12],[5,12],[3,9]],'#e9aa5d');
    rect(ctx,6,6,4,2,'#f8cc83');rect(ctx,11,13,3,2,'#98522f');rect(ctx,4,13,3,2,'#d38a48');
  } else {
    polygon(ctx,[[2,6],[6,3],[10,4],[12,7],[14,4],[18,3],[22,6],[22,11],[19,15],[12,22],[5,15],[2,11]],'#c94242','#622d2f');
    polygon(ctx,[[4,7],[7,5],[10,6],[12,9],[15,6],[18,5],[20,7],[19,12],[12,19],[6,13],[4,10]],'#ed6656');
    rect(ctx,6,7,3,2,'#ffb18a');rect(ctx,5,9,2,3,'#fa926e');
  }
  return canvas;
}

export function createSurvivalUI() {
  for(const kind of ['health','hunger'])document.getElementById(`${kind}-icon`).getContext('2d').drawImage(icon(kind),0,0);
  const hunger=document.getElementById('hunger-meter'),health=document.getElementById('health-meter');
  const hungerFill=document.getElementById('hunger-fill'),healthFill=document.getElementById('health-fill');
  const hungerValue=document.getElementById('hunger-value'),healthValue=document.getElementById('health-value');
  const panel=document.getElementById('survival-panel'),status=document.getElementById('hunger-status');
  let previous='';
  return {
    update(state) {
      const key=`${state.hunger}:${state.health}`;if(key===previous)return;previous=key;
      hungerFill.style.width=`${state.hunger/state.maxHunger*100}%`;
      healthFill.style.width=`${state.health/state.maxHealth*100}%`;
      hunger.setAttribute('aria-valuenow',state.hunger);health.setAttribute('aria-valuenow',state.health);
      hunger.classList.toggle('vital-low',state.hunger<15);
      health.classList.toggle('vital-low',state.health<15);
      hungerValue.textContent=`${state.hunger} / ${state.maxHunger}`;healthValue.textContent=`${state.health} / ${state.maxHealth}`;
      panel.dataset.state=state.dead?'dead':state.starving?'starving':state.hunger<=20?'hungry':'fed';
      status.textContent=state.dead?'נגמרו החיים':state.starving?'רעב אפס — מאבדים חיים':state.hunger<=20?'כדאי לאכול':'';
      status.hidden=!status.textContent;
    },
  };
}
