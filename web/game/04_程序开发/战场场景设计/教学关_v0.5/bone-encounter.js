(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BoneEncounter=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const alive=u=>u.hp>0;
 const common={team:'enemy',enemyType:'bone',speed:1,range:6,attackWindup:.28,attackDuration:1.65,guardUntil:0,charmedUntil:0,knockupUntil:0};
 const ROLE_STATS={坦克:{hp:3200,attack:48},战士:{hp:2400,attack:66},刺客:{hp:1900,attack:82},辅助:{hp:1600,attack:96},增益:{hp:1600,attack:96},法师:{hp:1300,attack:110},射手:{hp:1300,attack:110}};
 const ENEMIES=[
  {...common,id:'bone-boss',boneId:'boss',name:'白骨精',role:'法师',x:8.5,y:2.5,hp:4200,attack:90,defense:22,interval:2.1,attackArea:{kind:'pyramid',rows:6},skills:[{id:'small',name:'骨刺',kind:'bone',cd:6,windup:.8,duration:1.3,range:20,power:1.2},{id:'ultimate',name:'魅惑术',kind:'bone',cd:14,windup:.65,duration:1.9,range:20,power:0}]},
  {...common,id:'bone-red',boneId:'red',name:'绯红小妹',role:'坦克',x:6.5,y:2.5,hp:2400,attack:0,defense:45,interval:2.4,range:1,attackDuration:2.45,skills:[]},
  {...common,id:'bone-yellow',boneId:'yellow',name:'杏黄小妹',role:'辅助',x:7.5,y:2.5,hp:1500,attack:0,defense:15,interval:2.6,attackDuration:1.15,attackWindup:.4,skills:[]},
  {...common,id:'bone-blue',boneId:'blue',name:'霜蓝小妹',role:'法师',x:7.5,y:1.5,hp:1400,attack:62,defense:15,interval:2.3,attackArea:{kind:'pyramid',rows:6},skills:[]},
  {...common,id:'bone-green',boneId:'green',name:'青绿小妹',role:'法师',x:7.5,y:3.5,hp:1400,attack:62,defense:15,interval:2.3,attackArea:{kind:'pyramid',rows:6},skills:[]}
 ].map(u=>({...u,...ROLE_STATS[u.role],...(u.boneId==='boss'?{hp:2860,attack:126}: {})}));
 const SETTINGS={knockup:2,charm:3,reduction:.5,reflect:.5,guardDuration:2,heal:85};
 const guarding=(b,u)=>u.boneId==='red'&&u.guardUntil>b.time&&u.stunnedUntil<=b.time;
 function line(b,u,column=Math.floor(u.y),facing=u.facing){return b.units.filter(v=>alive(v)&&v.team!==u.team&&Math.floor(v.y)===column&&(v.x-u.x)*facing>0).sort((a,c)=>(a.x-c.x)*facing||a.id.localeCompare(c.id));}
 function effect(b,type,data,duration=.8){b.effects.push({id:++b.seq,type,start:b.time,expires:b.time+duration,...data});}
 function launch(b,u,a){const heart=a.type==='ultimate',front=line(b,u,a.targetColumn)[0];if(!front)return;
  const depth=u.range-Math.abs(front.y-u.y),limit=Math.max(.2,Math.min(9.8,u.x+u.facing*depth)),heartDuration=Math.max(.15,Math.hypot(front.x-u.x,front.y-u.y)/8.7);
  b.projectiles.push({id:++b.seq,type:heart?'heart':'fan',sourceId:u.id,boneId:u.boneId,column:a.targetColumn,facing:u.facing,from:u.x,fromY:u.y,alignAt:front.x,attackArea:u.attackArea,range:u.range,to:heart?front.x:u.boneId==='boss'?limit:front.x+u.facing*.15,start:b.time,outDuration:heart?heartDuration:.62,duration:heart?heartDuration:1.18,hits:[],single:heart||u.boneId!=='boss',done:false});
 }
 function projectileX(p,time){const age=time-p.start,q=p.type==='heart'?Math.min(1,age/p.duration):age<=p.outDuration?age/p.outDuration:1-(age-p.outDuration)/(p.duration-p.outDuration);return p.from+(p.to-p.from)*Math.max(0,Math.min(1,q));}
 function projectileY(p,time){const q=Math.max(0,Math.min(1,(projectileX(p,time)-p.from)/(p.alignAt-p.from)));return p.fromY+(p.column+.5-p.fromY)*q;}
 function resolve(b,u,api){const a=u.action;if(!a||(!u.boneId&&!a.charmStrike))return false;
  if(!a.landed&&b.time+1e-8>=a.hitAt){a.landed=true;
   if(a.charmStrike){const v=b.units.find(v=>v.id===a.targetId&&alive(v));if(v&&u.charmedUntil>b.time&&v.team===u.team&&Math.max(Math.abs(v.x-u.x),Math.abs(v.y-u.y))<=1.0001){api.damage(b,u,v,api.effectiveAttack(u,b.time),'betray');effect(b,'betray',{x:v.x,y:v.y,fromX:u.x,fromY:u.y},.4);}}
   else if(u.boneId==='red'){u.guardUntil=b.time+SETTINGS.guardDuration;api.emit(b,'guard','绯红举扇：减伤 50%，并反弹伤害。',{sourceId:u.id});}
   else if(u.boneId==='yellow'){for(const v of b.units.filter(v=>v.team===u.team&&alive(v))){api.heal(b,u,v,SETTINGS.heal,'bone-heal');effect(b,'bone-heal',{x:v.x,y:v.y,fromX:u.x,fromY:u.y},.85);}}
   else if(a.type==='small'){for(const v of line(b,u,a.targetColumn)){api.damage(b,u,v,api.effectiveAttack(u,b.time)*1.2,'bone-spike');if(!alive(v))continue;api.Grid.settle(v,false);v.action=null;v.knockupAt=b.time;v.knockupUntil=b.time+SETTINGS.knockup;v.stunnedUntil=Math.max(v.stunnedUntil,v.knockupUntil);effect(b,'bone-spike',{x:v.x,y:v.y,targetId:v.id},1);api.emit(b,'knockup',v.name+'被骨刺击飞 2 秒。',{sourceId:u.id,targetId:v.id,duration:2});}}
   else launch(b,u,a);
  }
  if(b.time+1e-8>=a.endsAt)u.action=null;return true;
 }
 function tick(b,dt,api){if(!b.projectiles)b.projectiles=[];
  for(const u of b.units){if(u.guardUntil>b.time&&(!alive(u)||u.stunnedUntil>b.time))u.guardUntil=0;if(u.action?.charmStrike&&u.charmedUntil<=b.time)u.action=null;}
  for(const p of b.projectiles){if(p.done)continue;const src=b.units.find(u=>u.id===p.sourceId);if(!src)continue;const previous=Math.max(p.start,b.time-dt),a=projectileX(p,previous),end=Math.min(b.time,p.start+p.outDuration),z=projectileX(p,end);
   if(previous>p.start+p.outDuration+1e-8)continue;
   const origin={x:p.from,y:p.fromY,facing:p.facing,range:p.range,attackArea:p.attackArea};
   const candidates=b.units.filter(u=>alive(u)&&u.team!==src.team&&Math.floor(u.y)===p.column&&(u.x-p.from)*p.facing>0&&u.x>=Math.min(a,z)-.05&&u.x<=Math.max(a,z)+.05&&!p.hits.includes(u.id)&&(p.type==='heart'||api.inAttackRange(origin,u))).sort((u,v)=>(u.x-v.x)*p.facing||u.id.localeCompare(v.id));
   for(const u of candidates){if(p.single&&p.hits.length)break;p.hits.push(u.id);
    if(p.type==='heart'){p.done=true;u.charmedUntil=b.time+SETTINGS.charm;u.action=null;api.Grid.settle(u,false);u.attackReadyAt=b.time+.25;effect(b,'charm',{x:u.x,y:u.y,targetId:u.id},3);api.emit(b,'charm',u.name+'被魅惑，转攻相邻友军 3 秒。',{sourceId:src.id,targetId:u.id,duration:3,until:u.charmedUntil});}
    else api.damage(b,src,u,api.effectiveAttack(src,b.time),'bone-fan');
   }
  }b.projectiles=b.projectiles.filter(p=>!p.done&&b.time<p.start+p.duration);
 }
 function betray(b,u,api){if(!(u.charmedUntil>b.time))return false;const friend=b.units.filter(v=>alive(v)&&v.id!==u.id&&v.team===u.team&&Math.max(Math.abs(v.x-u.x),Math.abs(v.y-u.y))<=1.0001).sort((a,c)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(c.x-u.x,c.y-u.y)||a.id.localeCompare(c.id))[0];
  if(friend&&b.time+1e-8>=u.attackReadyAt){u.facing=Math.sign(friend.x-u.x)||u.facing;u.targetId=friend.id;u.action={type:'attack',kind:'damage',charmStrike:true,targetId:friend.id,startedAt:b.time,hitAt:b.time+.22,endsAt:b.time+.65,landed:false};u.attackReadyAt=b.time+u.interval;u.stats.attacks++;api.emit(b,'betray',u.name+'受魅惑，攻击'+friend.name+'。',{sourceId:u.id,targetId:friend.id});}return true;
 }
 function turn(b,u,api){if(!u.boneId)return false;
  if(u.boneId==='yellow'){if(b.time>=u.attackReadyAt)api.beginAction(b,u,u);return true;}
  const enemy=api.nearestEnemy(b,u);if(!enemy)return true;
  u.targetId=enemy.id;
  if(Math.abs(enemy.x-u.x)>.02)u.facing=Math.sign(enemy.x-u.x);
  if(u.boneId==='red'){if(api.inAttackRange(u,enemy)){if(b.time>=u.attackReadyAt)api.beginAction(b,u,u);}else api.moveTowards(b,u,enemy);return true;}
  if(api.inAttackRange(u,enemy)){const skill=[...u.skills].reverse().find(k=>b.time+1e-8>=k.readyAt);if(skill)api.beginAction(b,u,enemy,skill);else if(b.time+1e-8>=u.attackReadyAt)api.beginAction(b,u,enemy);}
  else api.moveTowards(b,u,enemy);return true;
 }
 function lift(u,t){if(!(u.knockupUntil>t))return 0;return 34*Math.min(1,(t-u.knockupAt)/.18,(u.knockupUntil-t)/.22);}
 return{ENEMIES,ROLE_STATS,SETTINGS,line,guarding,resolve,tick,betray,turn,lift,projectileX,projectileY};
});
