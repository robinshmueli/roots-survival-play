import {t} from './i18n.js';
const directions=[t("צפון"),t("צפון־מזרח"),t("מזרח"),t("דרום־מזרח"),t("דרום"),t("דרום־מערב"),t("מערב"),t("צפון־מערב")];
const normalize=angle=>(angle%360+360)%360;

export function createCompass() {
  const root=document.getElementById('compass'),needle=document.getElementById('compass-needle');
  const label=document.getElementById('compass-heading'),bearing=document.getElementById('compass-bearing');
  let target=180,angle=180,previous='';
  function display() {
    needle.setAttribute('transform',`rotate(${angle.toFixed(2)} 64 64)`);
    const degrees=Math.round(target)%360,name=directions[Math.round(target/45)%8],key=`${degrees}:${name}`;
    if(key===previous)return;previous=key;
    label.textContent=name;bearing.textContent=`${degrees}°`;
    root.setAttribute('aria-label',t("מצפן, כיוון ההליכה: {0}, {1} מעלות", [name, degrees]));
    root.dataset.bearing=degrees;
  }
  display();
  return {
    update(direction,dt) {
      if(direction&&Number.isFinite(direction.x)&&Number.isFinite(direction.y)&&Math.hypot(direction.x,direction.y)>.00001) {
        // World Y grows northward. A clockwise compass has north=0°, east=90°.
        target=normalize(Math.atan2(direction.x,direction.y)*180/Math.PI);
      }
      let turn=normalize(target-angle+180)-180;
      angle=normalize(angle+turn*(1-Math.exp(-12*Math.max(0,dt))));
      if(Math.abs(turn)<.02)angle=target;
      display();
    },
  };
}
