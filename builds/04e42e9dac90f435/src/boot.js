import {t,setLanguage,getLanguage,languageInfo,applyStaticTranslations} from './i18n.js';
import {createWorldLibrary} from './world-library.js';
import {WORLD_SIZES,DIFFICULTIES,difficultyFor,selectWorld} from './world-profile.js';

applyStaticTranslations(document);
const menu=document.getElementById('main-menu'),game=document.getElementById('game');
let library;
try{library=createWorldLibrary();}catch{document.getElementById('menu-status').textContent=t("יש לאפשר שמירה בדפדפן כדי לפתוח עולמות.");}
const screens=[...menu.querySelectorAll('[data-menu-screen]')];
const status=document.getElementById('menu-status'),list=document.getElementById('world-list');
function screen(id) {
  menu.dataset.screen=id;
  for(const section of screens)section.hidden=section.dataset.menuScreen!==id;
  status.textContent=t(library?.error??'');
  if(id==='worlds')renderWorlds();
  if(id==='settings')renderSettings();
  menu.querySelector(`[data-menu-screen="${id}"] h2`)?.focus();
}
function renderWorlds() {
  list.replaceChildren();const worlds=library?.list()??[];
  document.getElementById('world-count').textContent=worlds.length?t("{0} עולמות שמורים", [worlds.length]):t("המסע הראשון שלך מחכה");
  document.getElementById('no-worlds').hidden=worlds.length>0;
  for(const world of worlds) {
    const card=document.createElement('button');card.type='button';card.className='world-card';card.dataset.worldId=world.id;
    const icon=document.createElement('span');icon.className='world-card-icon';icon.textContent='♧';icon.setAttribute('aria-hidden','true');
    const copy=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('span');
    name.textContent=world.name;name.dir='auto';detail.className='world-detail';
    const size=WORLD_SIZES.find(size=>size.id===world.sizeId);
    detail.textContent=`${t(size.label)} · ${t(difficultyFor(world.difficulty).label)} · ${world.size} × ${world.size}${world.day?t(" · יום {0}", [world.day]):''}`;
    const played=document.createElement('span');played.className='world-played';
    played.textContent=world.lastPlayed?t("ביקור אחרון: {0}", [new Intl.DateTimeFormat(languageInfo().locale,{dateStyle:'short',timeStyle:'short'}).format(world.lastPlayed)]):t("עולם חדש");
    copy.append(name,detail,played);const enter=document.createElement('span');enter.className='world-enter';enter.textContent=t("כניסה ←");
    card.append(icon,copy,enter);card.addEventListener('click',()=>launch(world));list.append(card);
  }
}
let launching=false;
async function launch(world) {
  if(launching)return;launching=true;
  selectWorld(world);library.touch(world.id);menu.dataset.loading='true';
  status.textContent=t("פותחים את {0}…", [world.name]);
  try {
    // Config, shaders and spatial indexes are initialized only after selecting the profile.
    game.hidden=false;menu.hidden=true;
    await import('./main.js');
  }catch(error) {
    console.error(error);game.hidden=true;menu.hidden=false;status.textContent=t("לא הצלחנו לפתוח את העולם. השמירה נשמרה. נסו לרענן את הדף.");
    delete menu.dataset.loading;
    const retry=document.createElement('button');retry.type='button';retry.className='menu-button';retry.textContent=t("רענון");retry.onclick=()=>location.reload();status.append(document.createElement('br'),retry);
  }
}
for(const button of menu.querySelectorAll('[data-go]'))button.addEventListener('click',()=>screen(button.dataset.go));
const sizes=document.getElementById('world-sizes');
for(const size of WORLD_SIZES) {
  const label=document.createElement('label');label.className='size-option';
  const radio=document.createElement('input');radio.type='radio';radio.name='world-size';radio.value=size.id;radio.checked=size.id==='medium';
  const title=document.createElement('strong');title.textContent=t(size.label);
  const dimensions=document.createElement('span');dimensions.className='size-dimensions';dimensions.dir='ltr';dimensions.textContent=`${size.size} × ${size.size}`;
  const hint=document.createElement('small');hint.textContent=t(size.description);
  label.append(radio,title,dimensions,hint);sizes.append(label);
}
const difficulties=document.getElementById('world-difficulties');
for(const difficulty of DIFFICULTIES) {
  const label=document.createElement('label');label.className='size-option difficulty-option';
  const radio=document.createElement('input');radio.type='radio';radio.name='world-difficulty';radio.value=difficulty.id;radio.checked=difficulty.id==='normal';
  const title=document.createElement('strong');title.textContent=t(difficulty.label);
  const hint=document.createElement('small');hint.textContent=t(difficulty.description);
  label.append(radio,title,hint);difficulties.append(label);
}
const nameInput=document.getElementById('world-name');
nameInput.addEventListener('input',()=>nameInput.setCustomValidity(nameInput.value.trim()?'':t("בחרו שם לעולם.")));
nameInput.addEventListener('invalid',()=>{if(!nameInput.value.trim())nameInput.setCustomValidity(t("בחרו שם לעולם."));});
document.getElementById('create-world-form').addEventListener('submit',event=>{
  event.preventDefault();if(launching||!library)return;
  const name=nameInput.value,size=menu.querySelector('[name="world-size"]:checked')?.value,difficulty=menu.querySelector('[name="world-difficulty"]:checked')?.value;
  if(!name.trim()){nameInput.setCustomValidity(t("בחרו שם לעולם."));nameInput.reportValidity();return;}
  const world=library.create(name,size,difficulty);
  if(!world){status.textContent=t(library.error)||t("בחרו שם, גודל ורמת קושי לעולם.");return;}
  launch(world);
});
window.addEventListener('storage',event=>{if(event.key==='roots-survival.worlds.v1'&&!menu.hidden){library=createWorldLibrary();renderWorlds();}});
let settingsPersisted=true;
function renderSettings() {
  for(const input of menu.querySelectorAll('[name="game-language"]'))input.checked=input.value===getLanguage();
  const notice=document.getElementById('settings-status');notice.textContent=t(settingsPersisted?'הבחירה נשמרת אוטומטית בדפדפן הזה.':'השפה עודכנה, אך לא ניתן לשמור אותה בדפדפן כרגע.');notice.dataset.error=String(!settingsPersisted);
}
for(const input of menu.querySelectorAll('[name="game-language"]'))input.addEventListener('change',()=>{
  if(!input.checked)return;
  settingsPersisted=setLanguage(input.value).persisted;applyStaticTranslations(document);
  for(const option of WORLD_SIZES) {const label=sizes.querySelector('[value="'+option.id+'"]').closest('label');label.querySelector('strong').textContent=t(option.label);label.querySelector('small').textContent=t(option.description);}
  for(const option of DIFFICULTIES) {const label=difficulties.querySelector('[value="'+option.id+'"]').closest('label');label.querySelector('strong').textContent=t(option.label);label.querySelector('small').textContent=t(option.description);}
  nameInput.setCustomValidity(nameInput.value.trim()?'':t('בחרו שם לעולם.'));
  renderWorlds();renderSettings();status.textContent=t(library?.error??'');
});
renderSettings();
screen('home');

menu.dataset.ready='true';
