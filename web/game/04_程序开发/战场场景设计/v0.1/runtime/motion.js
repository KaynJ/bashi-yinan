/* Complete held-weapon sprites sway together at a fixed size. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CombatMotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const IDS=['wukong','tangseng','bajie','shaseng','bailongma'],TYPES=['attack','small','ultimate'],PHASES=['蓄力','出手','命中','收势'];
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const PROFILES={
    wukong:{attack:1.4,small:2.1,ultimate:2.8},
    tangseng:{attack:1.1,small:1.7,ultimate:2.3},
    bajie:{attack:1.3,small:-1.8,ultimate:2.6},
    shaseng:{attack:1.4,small:2,ultimate:2.7},
    bailongma:{attack:1.1,small:-1.6,ultimate:2.2}
  };
  function curve(time,points){
    if(time<=points[0][0])return points[0][1];
    for(let i=1;i<points.length;i++)if(time<=points[i][0]){
      const a=points[i-1],b=points[i],t=smooth((time-a[0])/(b[0]-a[0]));return a[1]+(b[1]-a[1])*t;
    }
    return points[points.length-1][1];
  }
  function sample(unit,now){
    const a=unit.action;
    if(!a||!IDS.includes(unit.characterId||unit.id)||!TYPES.includes(a.type)||unit.hp<=0||unit.stunnedUntil>now||now<a.startedAt||now+1e-8>=a.endsAt)return null;
    const age=now-a.startedAt,windup=a.hitAt-a.startedAt,recovery=a.endsAt-a.hitAt;
    const drive=curve(age,[[0,0],[windup*.28,-.18],[windup,1],[windup+recovery*.58,.16],[windup+recovery,0]]);
    const stage=now+1e-8<a.hitAt?(age<windup*.28?0:1):(age<windup+recovery*.4?2:3);
    return{type:a.type,stage,phase:PHASES[stage],drive,progress:clamp(age/(a.endsAt-a.startedAt))};
  }
  function pose(unit,now){
    const active=sample(unit,now),profile=PROFILES[unit.id],disabled=unit.hp<=0||unit.stunnedUntil>now;
    const idle=disabled?0:Math.sin(now*2.1)*.3,body=profile?idle+(active?profile[active.type]*active.drive:0):0;
    return{body,left:0,right:0,weapon:0,head:0,cloth:0,active};
  }
  // One affine transform for head, hands, clothes and held weapon: all lines stay straight.
  // The common ground line stays fixed, and there is no animated scale channel.
  function affine(p){return{shear:Math.tan(p.body*Math.PI/180),ground:.95};}
  function deform(id,u,v,aspect,p){
    if(!PROFILES[id])return{x:u*aspect,y:v};
    const a=affine(p);return{x:u*aspect+a.shear*(a.ground-v),y:v};
  }
  function mesh(id,aspect,p,columns=16,rows=32){
    const positions=new Float32Array((columns+1)*(rows+1)*2);let n=0;
    for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
      const point=deform(id,col/columns,row/rows,aspect,p);positions[n++]=point.x;positions[n++]=point.y;
    }
    return positions;
  }
  return{IDS,TYPES,PHASES,PROFILES,sample,pose,affine,deform,mesh};
});
