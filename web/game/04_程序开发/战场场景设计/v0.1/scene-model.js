(function(root,factory){
  const data=typeof module==='object'&&module.exports?require('./scene-data.js'):root.SceneData;
  const model=factory(data);
  if(typeof module==='object'&&module.exports)module.exports=model;else root.SceneModel=model;
})(typeof globalThis!=='undefined'?globalThis:this,function(D){
  'use strict';
  const ok=()=>({ok:true});
  const fail=message=>({ok:false,message});
  function create(){return {heroes:D.heroes.map(h=>({...h})),selected:'wukong',filter:'全部',treasures:new Set(),owners:Object.fromEntries(D.equipment.map(i=>[i.id,null])),combat:false};}
  const hero=(s,id)=>s.heroes.find(h=>h.id===id);
  const visible=s=>s.heroes.filter(h=>s.filter==='全部'||h.role===s.filter);
  const gear=(s,id)=>D.equipment.filter(i=>s.owners[i.id]===id);
  function move(s,id,col,row){
    if(s.combat)return fail('请返回布阵后调整站位');
    const h=hero(s,id);if(!h)return fail('人物不存在');
    if(!Number.isInteger(col)||!Number.isInteger(row)||col<0||col>4||row<5||row>9)return fail('请放在我方格子中');
    const other=s.heroes.find(p=>p.id!==id&&p.row===row&&p.col===col);
    if(other&&h.row===null)return fail('该格已有人物，请选择空格');
    if(other){other.row=h.row;other.col=h.col;}h.row=row;h.col=col;return ok();
  }
  function assign(s,itemId,heroId){
    if(s.combat)return fail('请返回布阵后配置装备');
    if(!Object.hasOwn(s.owners,itemId))return fail('装备不存在');
    const h=hero(s,heroId);if(!h||h.row===null)return fail('请拖到已经上阵的人物身上');
    s.owners[itemId]=heroId;return ok();
  }
  function unequip(s,itemId){
    if(s.combat)return fail('请返回布阵后调整装备');
    if(!Object.hasOwn(s.owners,itemId))return fail('装备不存在');
    s.owners[itemId]=null;return ok();
  }
  function remove(s,id){
    if(s.combat)return fail('请返回布阵后撤下人物');
    const h=hero(s,id);if(!h)return fail('人物不存在');h.row=null;
    for(const item of gear(s,id))s.owners[item.id]=null;
    return ok();
  }
  function check(s,id,on){
    if(s.combat)return fail('请返回布阵后选择法宝');
    if(!D.treasures.some(i=>i.id===id))return fail('法宝不存在');
    if(on)s.treasures.add(id);else s.treasures.delete(id);return ok();
  }
  function demo(){const s=create();check(s,'gourd',true);check(s,'pearl',true);assign(s,'staff','wukong');assign(s,'beads','wukong');assign(s,'robe','bajie');return s;}
  return {create,hero,visible,gear,move,assign,unequip,remove,check,demo};
});
