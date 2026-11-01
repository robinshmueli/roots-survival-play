import {t} from './i18n.js';
export const TREE_SEEDS={
  pine:{name:t("אורן"),color:'#497248'},blue:{name:t("אשוח כחול"),color:'#477477'},
  broadleaf:{name:t("אלון"),color:'#56825c'},fruit:{name:t("תפוח"),color:'#69914c'},
  birch:{name:t("ליבנה"),color:'#91a95e'},maple:{name:t("מייפל"),color:'#c98443'},
  willow:{name:t("ערבה"),color:'#658653'},cherry:{name:t("דובדבן"),color:'#c98fa4'},
  cypress:{name:t("ברוש"),color:'#47705b'},palm:{name:t("דקל"),color:'#62904f'},
  jungle:{name:t("עץ ג׳ונגל"),color:'#386c48'},acacia:{name:t("שיטה"),color:'#839757'},
  autumnOak:{name:t("אלון סתווי"),color:'#a96e3e'},snowPine:{name:t("אורן מושלג"),color:'#a6c6bd'},
  snowSpruce:{name:t("אשוח מושלג"),color:'#8eafb2'},
};
export const SEEDS=Object.fromEntries(Object.entries(TREE_SEEDS).map(([kind,data])=>['seed-'+kind,{...data,kind}]));
export const seedType=kind=>Object.hasOwn(TREE_SEEDS,kind)?'seed-'+kind:null;
