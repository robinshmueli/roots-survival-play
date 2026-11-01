import {t} from './i18n.js';
export const RECIPES=[
  {id:'iron-pickaxe',label:t("מכוש ברזל"),category:t("כלים"),output:'iron-pickaxe',cost:{iron:3,log:2,fiber:1},seconds:3,station:'workbench',description:t("מכוש ברזל חזק לחציבה מהירה של סלעים ועפרות.")},
  {id:'iron-axe',label:t("גרזן ברזל"),category:t("כלים"),output:'iron-axe',cost:{iron:3,log:1,fiber:1},seconds:3,station:'workbench',description:t("ראש ברזל מותך על ידית עץ. כורת עצים ומפרק מבנים בפחות מכות.")},
  {id:'iron-sword',label:t("חרב ברזל"),category:t("כלים"),output:'iron-sword',cost:{iron:2,log:1,fiber:1},seconds:3,station:'workbench',description:t("חרב מברזל מותך. פוגעת חזק יותר מחרב האבן.")},
  {id:'torch',label:t("לפיד"),category:t("תאורה"),output:'torch',cost:{log:1,coal:1},seconds:3,station:'hand',
    description:t("מאיר כשהוא נבחר ביד. לחצו להצבה על הקרקע או ליד קיר כדי לתלות עליו.")},
  {id:'pickaxe',label:t("מכוש אבן"),category:t("כלים"),output:'pickaxe',cost:{stone:3,log:2,fiber:1},seconds:3,station:'workbench',
    description:t("יוצרים בשולחן יצירה. חוצבים סלעים גדולים ומקבלים 2–3 אבנים.")},
  {id:'sword',label:t("חרב אבן"),category:t("כלים"),output:'sword',cost:{stone:2,log:1,fiber:2},seconds:3,station:'workbench',
    description:t("להב אבן על ידית עץ, קשור בשני חבלים. נלחמים בחיות בלחיצה או ברווח.")},
  {id:'spear',label:t("חנית אבן"),category:t("כלים"),output:'spear',cost:{log:2,fiber:1,stone:1},seconds:3,station:'workbench',
    description:t("חנית ארוכה לדקירה. החזיקו קליק ימני ורוצו קדימה עם Shift לפגיעה חזקה פי שניים מחרב. הטווח גדול ב־12% מחרב.")},
  {id:'axe',label:t("גרזן אבן"),category:t("כלים"),output:'axe',cost:{stone:1,log:1,fiber:1},seconds:3,station:'workbench',
    description:t("ראש אבן, ידית עץ וקשירת סיבים. כורת עצים בפחות מכות מהאבן.")},
  {id:'workbench',label:t("שולחן יצירה"),category:t("עמדות"),output:'workbench',cost:{log:2,stone:2},seconds:3,station:'hand',
    description:t("יוצרים ערכה, בוחרים מקום בעזרת העכבר ומניחים בלחיצה.")},
  {id:'furnace',label:t("תנור אבן"),category:t("עמדות"),output:'furnace',cost:{stone:5,log:2},seconds:3,station:'workbench',
    description:t("תנור לבישול בשר ולהתכת עפרות ברזל. מציבים, פותחים עם E ומוסיפים עץ או פחם כדלק. דרוש שולחן יצירה להכנת הערכה.")},
  {id:'campfire',label:t("מדורה"),category:t("מבנים"),output:'campfire',cost:{log:3,coal:1},seconds:3,station:'workbench',
    description:t("מדורה מבולים ופחם. יוצרים ערכה ומציבים על הקרקע; האש בוערת ומאירה.")},
  {id:'wood-wall',label:t("קיר עץ"),category:t("מבנים"),output:'wood-wall',cost:{log:3,fiber:2},seconds:3,station:'workbench',
    description:t("קיר עץ קשור בחבלים. יוצרים ערכה ומציבים כדי לתחום את המחנה.")},
  {id:'wood-door',label:t("דלת עץ"),category:t("מבנים"),output:'wood-door',cost:{log:2,fiber:2},seconds:3,station:'workbench',
    description:t("דלת עם משקוף לבקתה. מציבים בין הקירות, ולוחצים E לפתיחה ולסגירה.")},
  {id:'wood-floor',label:t("רצפת עץ"),category:t("מבנים"),output:'wood-floor',cost:{log:1,fiber:1},seconds:3,station:'workbench',
    description:t("אריח רצפה. מתחבר לאריחים סמוכים, ואפשר ללכת ולהציב רהיטים מעליו.")},
  {id:'chest',label:t("תיבת אחסון"),category:t("מבנים"),output:'chest',cost:{log:5,fiber:2,stone:1},seconds:3,station:'workbench',
    description:t("תיבת עץ לאחסון חפצים. מציבים, מתקרבים ולוחצים E כדי להפקיד ולקחת ציוד.")},
];

export function recipesForStation(nearWorkbench=false) {
  return RECIPES.filter(recipe=>nearWorkbench||recipe.station==='hand');
}

export function recipeStatus(recipe,inventory,nearWorkbench=false) {
  if(!recipe)return {ready:false,reason:'unknown',missing:[]};
  const missing=Object.entries(recipe.cost).filter(([type,n])=>inventory.count(type)<n).map(([type,n])=>({type,count:n-inventory.count(type)}));
  const reason=recipe.station==='workbench'&&!nearWorkbench?'station':missing.length?'materials':
    !inventory.canExchange(recipe.cost,recipe.output)?'space':null;
  return {ready:reason===null,reason,missing};
}

export function createCrafting(inventory) {
  let job=null;
  return {
    state(){return job?{recipe:job.recipe,elapsed:job.elapsed,progress:job.elapsed/job.recipe.seconds}:null;},
    start(id,nearWorkbench=false) {
      const recipe=RECIPES.find(item=>item.id===id),status=recipeStatus(recipe,inventory,nearWorkbench);
      if(job||!status.ready)return false;
      job={recipe,elapsed:0};return true;
    },
    cancel(){job=null;},
    update(dt,nearWorkbench=false) {
      if(!job)return null;
      job.elapsed=Math.min(job.recipe.seconds,job.elapsed+(Number.isFinite(dt)?Math.max(0,dt):0));
      if(job.elapsed<job.recipe.seconds-1e-9)return null;
      const recipe=job.recipe,status=recipeStatus(recipe,inventory,nearWorkbench);job=null;
      return status.ready&&inventory.exchange(recipe.cost,recipe.output)?{crafted:recipe.output,recipe}:{crafted:null,reason:status.reason??'space'};
    },
  };
}

// A continuous press crafts exactly one item. Releasing or losing focus cancels
// without charging ingredients, and another craft requires a fresh press.
export function createCraftingHold(inventory) {
  const crafting=createCrafting(inventory);let holding=false;
  return {
    get holding(){return holding;},
    state:()=>crafting.state(),
    press(id,nearWorkbench=false) {
      if(holding||!crafting.start(id,nearWorkbench))return false;
      holding=true;return true;
    },
    release(){holding=false;crafting.cancel();},
    update(dt,nearWorkbench=false) {
      if(!holding)return null;
      const status=recipeStatus(crafting.state()?.recipe,inventory,nearWorkbench);
      if(!status.ready){holding=false;crafting.cancel();return {crafted:null,reason:status.reason};}
      const result=crafting.update(dt,nearWorkbench);
      if(result)holding=false;
      return result;
    },
  };
}
