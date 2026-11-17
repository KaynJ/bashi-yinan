(function(root,factory){const node=typeof module==='object'&&module.exports;const a=factory(node?require('./engine.js'):root.BattleModel,node?require('../v0.1/runtime/board.js'):root.BattleBoard);if(node)module.exports=a;else root.SceneBattleAdapter=a;})(typeof globalThis!=='undefined'?globalThis:this,function(M,Board){
 const formation=s=>s.heroes.filter(h=>h.row!==null).map(h=>({id:h.id,col:9-h.row,row:h.col}));
 function create(s){const f=formation(s);if(!f.length)throw new RangeError('请先上阵至少一位人物');const b=M.createBattle({preset:'bones',formation:f});b.loadout={treasures:[...s.treasures],owners:{...s.owners}};return b;}
 const position=u=>{const p=Board.project(u);return{left:p.x*20,top:(p.y+.5)*10};};
 const summary=b=>({status:b.status,time:Math.round(b.time*10)/10,...b.stats,allies:b.units.filter(u=>u.team==='ally'&&!u.isClone).map(u=>({id:u.id,name:u.name,hp:u.hp,maxHp:u.maxHp,...u.stats}))});
 return{formation,create,position,summary};
});
