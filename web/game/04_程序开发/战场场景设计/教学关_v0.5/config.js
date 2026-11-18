(function(root,factory){const node=typeof module==='object'&&module.exports,base=node?require('../v0.1/scene-data.js'):root.SceneData,data=factory(base);if(node)module.exports=data;else root.SceneData=data;})(typeof globalThis!=='undefined'?globalThis:this,function(D){const campaign = typeof location !== 'undefined' && new URLSearchParams(location.search).has('campaign');
const gear = [
  ['wukong','金箍棒'], ['bajie','九齿钉耙'], ['shaseng','月牙铲'],
  ['tangseng','九环锡杖'], ['bailongma','白龙鞍']
].map(([owner,name])=>({id:'signature-'+owner,name,owner,icon:'staff'}));
return{...D,...(campaign ? {equipment:gear,treasures:[{id:'scroll',name:'御赐经文',icon:'scroll'}]} : {}),heroes:[{id:'wukong',name:'悟空',role:'刺客',col:1,row:6},{id:'bajie',name:'八戒',role:'坦克',col:2,row:5},{id:'shaseng',name:'沙僧',role:'战士',col:3,row:6},{id:'tangseng',name:'唐僧',role:'法师',col:2,row:8},{id:'bailongma',name:'白龙马',role:'增益',col:3,row:7}]};});
