import {createWorldLibrary} from './world-library.js';
import {WORLD_SIZES,DIFFICULTIES,difficultyFor,selectWorld} from './world-profile.js';

const menu=document.getElementById('main-menu'),game=document.getElementById('game');
let library;
try{library=createWorldLibrary();}catch{document.getElementById('menu-status').textContent='יש לאפשר שמירה בדפדפן כדי לפתוח עולמות.';}
const screens=[...menu.querySelectorAll('[data-menu-screen]')];
const status=document.getElementById('menu-status'),list=document.getElementById('world-list');
function screen(id) {
  menu.dataset.screen=id;
  for(const section of screens)section.hidden=section.dataset.menuScreen!==id;
  status.textContent=library?.error??'';
  if(id==='worlds')renderWorlds();
  menu.querySelector(`[data-menu-screen="${id}"] h2`)?.focus();
}
function renderWorlds() {
  list.replaceChildren();const worlds=library?.list()??[];
  document.getElementById('world-count').textContent=worlds.length?`${worlds.length} עולמות שמורים`:'המסע הראשון שלך מחכה';
  document.getElementById('no-worlds').hidden=worlds.length>0;
  for(const world of worlds) {
    const card=document.createElement('button');card.type='button';card.className='world-card';card.dataset.worldId=world.id;
    const icon=document.createElement('span');icon.className='world-card-icon';icon.textContent='♧';icon.setAttribute('aria-hidden','true');
    const copy=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('span');
    name.textContent=world.name;detail.className='world-detail';
    const size=WORLD_SIZES.find(size=>size.id===world.sizeId);
    detail.textContent=`${size.label} · ${difficultyFor(world.difficulty).label} · ${world.size} × ${world.size}${world.day?` · יום ${world.day}`:''}`;
    const played=document.createElement('span');played.className='world-played';
    played.textContent=world.lastPlayed?`ביקור אחרון: ${new Intl.DateTimeFormat('he-IL',{dateStyle:'short',timeStyle:'short'}).format(world.lastPlayed)}`:'עולם חדש';
    copy.append(name,detail,played);const enter=document.createElement('span');enter.className='world-enter';enter.textContent='כניסה ←';
    card.append(icon,copy,enter);card.addEventListener('click',()=>launch(world));list.append(card);
  }
}
let launching=false;
async function launch(world) {
  if(launching)return;launching=true;
  selectWorld(world);library.touch(world.id);menu.dataset.loading='true';
  status.textContent=`פותחים את ${world.name}…`;
  try {
    // Config, shaders and spatial indexes are initialized only after selecting the profile.
    game.hidden=false;menu.hidden=true;
    await import('./main.js');
  }catch(error) {
    console.error(error);game.hidden=true;menu.hidden=false;status.textContent='לא הצלחנו לפתוח את העולם. השמירה נשמרה. נסו לרענן את הדף.';
    delete menu.dataset.loading;
    const retry=document.createElement('button');retry.type='button';retry.className='menu-button';retry.textContent='רענון';retry.onclick=()=>location.reload();status.append(document.createElement('br'),retry);
  }
}
for(const button of menu.querySelectorAll('[data-go]'))button.addEventListener('click',()=>screen(button.dataset.go));
const sizes=document.getElementById('world-sizes');
for(const size of WORLD_SIZES) {
  const label=document.createElement('label');label.className='size-option';
  const radio=document.createElement('input');radio.type='radio';radio.name='world-size';radio.value=size.id;radio.checked=size.id==='medium';
  const title=document.createElement('strong');title.textContent=size.label;
  const dimensions=document.createElement('span');dimensions.className='size-dimensions';dimensions.dir='ltr';dimensions.textContent=`${size.size} × ${size.size}`;
  const hint=document.createElement('small');hint.textContent=size.description;
  label.append(radio,title,dimensions,hint);sizes.append(label);
}
const difficulties=document.getElementById('world-difficulties');
for(const difficulty of DIFFICULTIES) {
  const label=document.createElement('label');label.className='size-option difficulty-option';
  const radio=document.createElement('input');radio.type='radio';radio.name='world-difficulty';radio.value=difficulty.id;radio.checked=difficulty.id==='normal';
  const title=document.createElement('strong');title.textContent=difficulty.label;
  const hint=document.createElement('small');hint.textContent=difficulty.description;
  label.append(radio,title,hint);difficulties.append(label);
}
const nameInput=document.getElementById('world-name');
nameInput.addEventListener('input',()=>nameInput.setCustomValidity(nameInput.value.trim()?'':'בחרו שם לעולם.'));
nameInput.addEventListener('invalid',()=>{if(!nameInput.value.trim())nameInput.setCustomValidity('בחרו שם לעולם.');});
document.getElementById('create-world-form').addEventListener('submit',event=>{
  event.preventDefault();if(launching||!library)return;
  const name=nameInput.value,size=menu.querySelector('[name="world-size"]:checked')?.value,difficulty=menu.querySelector('[name="world-difficulty"]:checked')?.value;
  if(!name.trim()){nameInput.setCustomValidity('בחרו שם לעולם.');nameInput.reportValidity();return;}
  const world=library.create(name,size,difficulty);
  if(!world){status.textContent=library.error??'בחרו שם, גודל ורמת קושי לעולם.';return;}
  launch(world);
});
window.addEventListener('storage',event=>{if(event.key==='roots-survival.worlds.v1'&&!menu.hidden){library=createWorldLibrary();renderWorlds();}});
screen('home');

menu.dataset.ready='true';
