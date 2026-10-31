export const TREE_SEEDS={
  pine:{name:'אורן',color:'#497248'},blue:{name:'אשוח כחול',color:'#477477'},
  broadleaf:{name:'אלון',color:'#56825c'},fruit:{name:'תפוח',color:'#69914c'},
  birch:{name:'ליבנה',color:'#91a95e'},maple:{name:'מייפל',color:'#c98443'},
  willow:{name:'ערבה',color:'#658653'},cherry:{name:'דובדבן',color:'#c98fa4'},
  cypress:{name:'ברוש',color:'#47705b'},palm:{name:'דקל',color:'#62904f'},
  jungle:{name:'עץ ג׳ונגל',color:'#386c48'},acacia:{name:'שיטה',color:'#839757'},
  autumnOak:{name:'אלון סתווי',color:'#a96e3e'},snowPine:{name:'אורן מושלג',color:'#a6c6bd'},
  snowSpruce:{name:'אשוח מושלג',color:'#8eafb2'},
};
export const SEEDS=Object.fromEntries(Object.entries(TREE_SEEDS).map(([kind,data])=>['seed-'+kind,{...data,kind}]));
export const seedType=kind=>Object.hasOwn(TREE_SEEDS,kind)?'seed-'+kind:null;
