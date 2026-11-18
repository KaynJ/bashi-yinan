(function(root){'use strict';
 // This clock only poses artwork. It never steps the combat model or resolves hits.
 function create(field){
  const nodes=new Map();
  let state=null,raf=0,started=performance.now(),battle={time:0,units:[],effects:[],projectiles:[]};
  function sync(next){state=next;cancelAnimationFrame(raf);if(next.combat)return;
   for(const n of nodes.values())n.rig.destroy?.();nodes.clear();
   const definitions=[...next.heroes.filter(h=>h.row!==null).map(h=>({...root.BattleModel.tutorialCharacter(h.id),id:h.id,characterId:h.id,team:'ally',x:9.5-h.row,y:h.col+.5,facing:1})),...root.BoneEncounter.ENEMIES.map(u=>({...u,facing:-1}))];
   battle.units=definitions.map((u,index)=>{
    const el=u.boneId?field.querySelector(`[data-bone="${u.boneId}"]`):field.querySelector(`[data-unit="${u.id}"]`);if(!el)return u;
    let cv=el.querySelector('canvas');if(!cv){cv=document.createElement('canvas');cv.className='formation-rig';el.append(cv);}
    const rig=u.boneId?root.BoneSkin.create(cv):root.PaperRig.create(cv);if(!u.boneId)rig.load(u.id,u.asset);
    nodes.set(u.id,{el,cv,rig,index,fallback:el.querySelector('.unit-art')});
    return {...u,maxHp:u.hp,stunnedUntil:0,attackBuff:null,moving:false};
   });
   frame(performance.now());
  }
  function frame(now){if(!state||state.combat)return;if(!document.hidden){battle.time=(now-started)/1000;battle.effects=[];battle.projectiles=[];
   for(const u of battle.units){const n=nodes.get(u.id);if(!n)continue;
    const definitions=[{id:'attack',duration:u.attackDuration||.65,windup:u.attackWindup||.28},...u.skills],cycle=definitions.reduce((sum,a)=>sum+a.duration+.5,0),time=(battle.time+n.index*.41)%cycle;
    let offset=0,a=definitions[0];for(const s of definitions){a=s;if(time<offset+s.duration+.5)break;offset+=s.duration+.5;}
    const age=time-offset;u.action=age<a.duration?{type:a.id,startedAt:battle.time-age,endsAt:battle.time-age+a.duration,hitAt:battle.time-age+a.windup,landed:age>=a.windup,targetColumn:Math.floor(u.y)}:null;
    n.el.dataset.previewAction=u.action?.type||'idle';
    if(u.boneId){
     n.rig.draw(u,battle);
    }else root.PaperRig.present(n.rig,n.cv,n.fallback,u,battle.time);
   }
  }raf=requestAnimationFrame(frame);}
  return{sync,get battle(){return battle;}};
 }
 root.FormationPreview={create};
})(window);
