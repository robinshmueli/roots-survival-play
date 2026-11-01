import {createSettings,LANGUAGES} from './settings.js';
import {EN} from './messages-en.js';
const settings=createSettings();
export const getLanguage=()=>settings.language;
export const languageInfo=()=>LANGUAGES.find(l=>l.id===getLanguage());
export function translate(language,key,values=[]) {
  const source=String(key??''),message=language==='en'&&Object.hasOwn(EN,source)?EN[source]:source;
  return message.replace(/\{(\d+)\}/g,(match,index)=>index<values.length?String(values[index]??''):match);
}
export const t=(key,values=[])=>translate(getLanguage(),key,values);
export const setLanguage=language=>settings.setLanguage(language);

// Capture only the original HTML before any user-created names or dynamic UI exists.
// Language changes reapply this fixed template; no mutation observer runs during play.
let template=null;
export function applyStaticTranslations(document) {
  if(!template) {
    template=[];
    const walker=document.createTreeWalker(document,4);let node;
    while((node=walker.nextNode()))if(!node.parentElement?.closest('script,style,[data-language-name]')&&/[א-ת]/.test(node.nodeValue)) {
      const textNode=node,original=node.nodeValue,key=original.trim();template.push(()=>{textNode.nodeValue=original.replace(key,t(key));});
    }
    for(const el of document.querySelectorAll('[aria-label],[title],[placeholder],meta[name="description"]'))for(const name of ['aria-label','title','placeholder','content']) {
      const original=el.getAttribute(name);if(original&&/[א-ת]/.test(original))template.push(()=>el.setAttribute(name,t(original)));
    }
  }
  const {id,direction}=languageInfo();document.documentElement.lang=id;document.documentElement.dir=direction;
  for(const apply of template)apply();
}
