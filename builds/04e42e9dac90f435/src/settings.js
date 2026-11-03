export const SETTINGS_KEY='roots-survival.settings.v1';
export const LANGUAGES=[{id:'he',name:'עברית',direction:'rtl',locale:'he-IL'},{id:'en',name:'English',direction:'ltr',locale:'en-US'}];
export function createSettings(storage) {
  if(arguments.length===0)try{storage=globalThis.localStorage;}catch{storage=null;}
  let data={version:1,language:'he'};
  try{const stored=JSON.parse(storage?.getItem(SETTINGS_KEY)??'null');if(stored?.version===1&&LANGUAGES.some(l=>l.id===stored.language))data={...stored};}catch{}
  return {
    get language(){return data.language;},
    setLanguage(language){
      if(!LANGUAGES.some(l=>l.id===language))return {changed:false,persisted:false};
      const changed=data.language!==language;data={...data,version:1,language};
      try{if(!storage)throw Error('No storage');storage.setItem(SETTINGS_KEY,JSON.stringify(data));return {changed,persisted:true};}catch{return {changed,persisted:false};}
    },
  };
}
