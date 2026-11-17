/* Four supporting characters: actual arm, hand, head and leg joints; fixed-size bodies. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PartyMotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const IDS=['bajie','shaseng','tangseng','bailongma'],clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  function envelope(age,hit,end){return age<hit?smooth(age/hit):1-smooth((age-hit)/(end-hit));}
  function sample(unit,time){
    const a=unit.action;if(!a||unit.hp<=0||unit.stunnedUntil>time||time<a.startedAt||time>=a.endsAt)return null;
    const age=time-a.startedAt,hit=a.hitAt-a.startedAt,end=a.endsAt-a.startedAt;
    return{type:a.type,age,hit,end,progress:age/end,phase:age<hit*.55?'蓄力':age<hit?'出手':age<hit+(end-hit)*.35?'命中':'收势',amount:envelope(age,hit,end)};
  }
  function handFromPalm(shoulder,elbow,palm,reach=.045){
    const dx=palm.x-elbow.x,dy=palm.y-elbow.y,d=Math.hypot(dx,dy)||1;
    const wrist={x:palm.x-dx/d*reach,y:palm.y-dy/d*reach};
    return{shoulder,elbow,wrist,palm,angle:Math.atan2(dy,dx)-Math.PI/2};
  }
  // Fixed bones for Bajie. The contact point includes the hand beyond the wrist.
  function bajieArm(shoulder,palm,upper,fore,reach,bend){
    const dx=palm.x-shoulder.x,dy=palm.y-shoulder.y,d=Math.hypot(dx,dy)||1e-8,lower=fore+reach;
    const distance=Math.max(Math.abs(upper-lower)+1e-6,Math.min(upper+lower-1e-6,d));
    const direction=Math.atan2(dy,dx),offset=Math.acos(Math.max(-1,Math.min(1,(upper*upper+distance*distance-lower*lower)/(2*upper*distance))));
    const elbow={x:shoulder.x+Math.cos(direction+bend*offset)*upper,y:shoulder.y+Math.sin(direction+bend*offset)*upper};
    return handFromPalm(shoulder,elbow,{x:shoulder.x+dx/d*distance,y:shoulder.y+dy/d*distance},reach);
  }
  function keyCurve(time,keys){for(let i=1;i<keys.length;i++)if(time<=keys[i][0]){const a=keys[i-1],b=keys[i];return a[1]+(b[1]-a[1])*smooth((time-a[0])/(b[0]-a[0]));}return keys.at(-1)[1];}
  function bajiePose(unit,time,active){
    const a=active?.amount||0,type=active?.type;
    const rest={x:.565,y:.665},shoulder={x:.565,y:.465},fistReach=.085*.44;
    let palm={...rest},hand='fist',reach=fistReach,mouth=0,booger=0,weaponAngle=0,phase=active?.phase||'待机';
    let grip={x:.18,y:.61};
    if(type==='attack'){
      const {age,hit,end}=active;
      weaponAngle=keyCurve(age,[[0,0],[hit*.5,-.18],[hit,.22],[hit+(end-hit)*.45,-.055],[end,0]]);
      grip=mix(grip,{x:.195,y:.60},a);
      phase=age<hit*.5?'提耙':age<hit?'晃耙':age<hit+(end-hit)*.45?'命中':'收耙';
    }else if(type==='small'){
      const hold=.18,slap=active.age<active.hit?smooth(active.age/active.hit):active.age<active.hit+hold?1:1-smooth((active.age-active.hit-hold)/(active.end-active.hit-hold));
      palm=mix(palm,{x:.405,y:.59},slap);hand=slap>.1?'palm':'fist';reach=fistReach+(.105*.51-fistReach)*slap;
      if(active.age>=active.hit&&active.age<active.hit+hold)phase='拍下停顿';
    }else if(type==='ultimate'){
      const t=active.age,h=active.hit,end=active.end;
      const approach=smooth(t/(h*.36)),withdraw=smooth((t-h*.63)/(h*.16)),eat=smooth((t-h*.79)/(h*.21)),recover=smooth((t-h-.12)/(end-h-.12));
      let tip=mix(rest,{x:.43,y:.30},approach);
      if(t>h*.36&&t<h*.63)tip.x+=Math.sin(t*34)*.004;
      tip=mix(tip,{x:.54,y:.40},withdraw);tip=mix(tip,{x:.43,y:.345},eat);palm=mix(tip,rest,recover);
      reach=fistReach+(.12*.84-fistReach)*approach*(1-recover);
      hand=approach>.15&&recover<.9?'point':'fist';mouth=t>h*.89&&recover<.3?1:0;booger=t>h*.63&&t<h?1:0;
      phase=t<h*.36?'伸手':t<h*.63?'挖鼻':t<h*.79?'收指':t<h?'放入口中':recover<.3?'回元':'收势';
    }
    const right=bajieArm({x:.235,y:.465},grip,.13,.07,fistReach,1),left=bajieArm(shoulder,palm,.15,.12,reach,-1);
    return{id:'bajie',active,phase,right,left,hand,footLift:0,footAngle:0,mouth,booger,handReach:reach,bellyRipple:type==='small'&&active.age>=active.hit?(active.age-active.hit)/.7:-1,
      weapon:{x:right.palm.x,y:right.palm.y,angle:weaponAngle,length:.88,origin:.58},customBajie:true};
  }
  function monkPose(id,active){
    const a=active?.amount||0,type=active?.type;
    let grip={x:.20,y:.58},angle=0,join=0,leftPalm={x:.54,y:.70},rightElbow={x:.17,y:.65},leftElbow={x:.56,y:.61},open=false;
    let closed=false,mouth=false,beadAngle=0,beadGlow=0,palmGhost=0,eyeGhost=0,palmGlow=0,roar=-1,slam=-1,projection=1,phase=active?.phase||'待机';
    if(id==='tangseng'){
      closed=type!=='ultimate'||active.age<active.hit;
      open=true;leftPalm={x:.48,y:.535};
      if(type==='attack'){mouth=Math.sin(active.age*30)>-.3;palmGlow=a;phase='念经';}
      if(type==='small'){
        const push=active.age<active.hit?smooth(active.age/active.hit):1-smooth((active.age-active.hit)/(active.end-active.hit));
        leftPalm=mix(leftPalm,{x:.48,y:.435},push);palmGlow=push;mouth=active.age<active.hit&&Math.sin(active.age*27)>-.3;
        palmGhost=active.age>=active.hit?smooth((active.age-active.hit)/.18)*(1-smooth((active.age-active.hit-.22)/.38)):0;
        phase=active.age<active.hit?'念经推掌':'金掌破障';
      }
      if(type==='ultimate'){const age=active.age-active.hit;eyeGhost=age>=0?smooth(age/.16)*(1-smooth((age-.26)/.45)):0;phase=age<0?'闭眼凝神':'睁眼显目';}
    }else if(active){
      const {age,hit,end}=active;
      if(type==='attack'){
        const lift=smooth(age/(hit*.55)),down=smooth((age-hit*.55)/(hit*.45)),back=smooth((age-hit-.08)/(end-hit-.08));
        grip=mix(mix(grip,{x:.25,y:.46},lift),{x:.29,y:.68},down);grip=mix(grip,{x:.20,y:.58},back);
        angle=(-.46*lift+.50*down)*(1-back);join=Math.max(lift,down)*(1-back);slam=age>=hit?(age-hit)/.45:-1;
        phase=age<hit?'提铲':'砸地';
      }else if(type==='small'){
        const horizontal=smooth(age/(hit*.55))*(1-smooth((age-hit-.15)/(end-hit-.15))),push=smooth((age-hit*.55)/(hit*.45))*(1-smooth((age-hit-.1)/(end-hit-.1)));
        angle=Math.PI/2*horizontal;grip=mix(grip,{x:.31,y:.62},horizontal);grip.y-=.09*push;join=horizontal;
        projection=1+.14*push;
        phase=age<hit*.55?'横铲':age<hit+.1?'向前推':'收铲';
      }else{
        closed=age<hit;beadAngle=4*Math.PI*smooth(age/(hit+.16));beadGlow=a;roar=age>=hit?(age-hit)/.7:-1;mouth=age>=hit&&age<end-.2;
        phase=age<hit?'闭眼转珠':'睁眼怒吼';
      }
    }
    if(join){leftPalm=mix(leftPalm,{x:grip.x+Math.sin(angle)*.18,y:grip.y-Math.cos(angle)*.18},join);leftElbow=mix(leftElbow,{x:.51,y:.66},join);}
    // Project the held assembly toward the viewer, keeping both palms attached
    // to the same rigid shaft. Shoulders and body remain fixed in size.
    if(projection!==1){const anchor={x:.4,y:.55},project=p=>({x:anchor.x+(p.x-anchor.x)*projection,y:anchor.y+(p.y-anchor.y)*projection});grip=project(grip);leftPalm=project(leftPalm);rightElbow=project(rightElbow);leftElbow=project(leftElbow);}
    const right=handFromPalm({x:.25,y:.49},rightElbow,grip,.045*projection),left=id==='tangseng'?bajieArm({x:.525,y:.50},leftPalm,.13,.10,.045,-1):handFromPalm({x:.55,y:.49},leftElbow,leftPalm,.045*projection);
    return{id,active,phase,right,left,open,weapon:{x:grip.x,y:grip.y,angle,length:.88*projection,origin:.58},projection,join,closed,mouth,beadAngle,beadGlow,palmGhost,eyeGhost,palmGlow,roar,slam,monk:true};
  }
  function horsePose(active){
    const a=active?.amount||0,type=active?.type,age=active?.age||0,attack=type==='attack',small=type==='small',ult=type==='ultimate';
    const wing=ult?smooth(age/(active.hit*.65))*(1-smooth((age-active.hit-.1)/(active.end-active.hit-.1))):0;
    const flap=ult?Math.sin(Math.PI*smooth((age-active.hit*.2)/(active.hit*1.35))):0;
    const blinkStart=small?active.hit*.35:0;
    const haloRise=small?smooth((age-blinkStart)/(active.hit-blinkStart)):0;
    const halo=small?smooth((age-blinkStart)/.12)*(1-smooth((age-active.hit-.18)/(active.end-active.hit-.18))):0;
    return{id:'bailongma',active,phase:attack?'摇头润泽':small?(age<active.hit?'眨眼升环':'光环赐福'):ult?'展翼轻扇':'待机',horse:true,
      head:{x:.40,y:.71,angle:attack?Math.sin(age/active.end*Math.PI*2)*.075*a:0},blink:small&&age>=blinkStart&&age<active.hit+.15,wing,flap,halo,haloRise,
      aura:attack?a:0,legs:[{x:.31,y:.71,upper:0,lower:0},{x:.49,y:.71,upper:0,lower:0}]};
  }
  function pose(unit,time){
    const id=unit.characterId||unit.id,active=sample(unit,time);
    const p=id==='bajie'?bajiePose(unit,time,active):id==='bailongma'?horsePose(active):monkPose(id,active);
    p.effects=unit.effectsEnabled!==false;return p;
  }
  function commands(p,definition){
    const list=[],add=(part,x,y,w,h,angle=0,origin=0,corner=false)=>{const c={part,x,y,w,h,angle,origin,corner};list.push(c);return c;};
    const vector=(kind,x,y,w,h,alpha=1,color='#d5ad4d')=>{if(p.effects!==false)list.push({kind,x,y,w,h,angle:0,origin:.5,alpha,color});};
    const ratio=(part,fallback)=>{const b=definition?.parts[part]?.bounds;return b?b[2]/b[3]:fallback;};
    if(p.horse){
      if(p.wing>.001){for(const side of [0,1]){const part=side?'wingRight':'wingLeft',h=.48*p.wing,c=add(part,side?.47:.33,.63,h*ratio(part,1),h,(side?1:-1)*p.flap*.36,.84);c.anchorX=side?.08:.92;}}
      // Crop each painted leg into thigh/shin pieces, rotating independently at hip and knee.
      p.legs.forEach((leg,index)=>{
        const prefix=index?'left':'right',upperLength=.125,lowerLength=.12;
        const knee={x:leg.x-Math.sin(leg.upper)*upperLength,y:leg.y+Math.cos(leg.upper)*upperLength};
        add(prefix+'Upper',leg.x,leg.y,.10,upperLength+.015,leg.upper,.04);
        add(prefix+'Lower',knee.x,knee.y,.105,lowerLength+.01,leg.upper+leg.lower,.06);
      });
      const head=p.blink?'headBlink':'head',headHeight=.64*488/400;
      add(head,p.head.x,p.head.y,headHeight*ratio('head',.54/.59),headHeight,p.head.angle,.97*400/488);
      add('core',.4,.95,.44*ratio('core',.50/.44),.44,0,1);
      if(p.halo>0)vector('halo',p.head.x,.135-.14*p.haloRise,.25+.015*p.haloRise,.052,p.halo,'#e6c264');
      if(p.aura>0)vector('ripples',.40,.94,.58,.18,p.aura*.5,'#8dbb91');return list;
    }
    const dimensions={bajie:{upper:.13,fore:.085,fist:.09},shaseng:{upper:.105,fore:.075,fist:.082},tangseng:{upper:.14,fore:.115,fist:.065}}[p.id];
    const projection=p.projection||1;
    function arm(a){for(const [part,start,end,width] of [['upper',a.shoulder,a.elbow,dimensions.upper],['fore',a.elbow,a.wrist,dimensions.fore]])add(part,start.x,start.y,width*projection,Math.hypot(end.x-start.x,end.y-start.y)+.02,Math.atan2(end.y-start.y,end.x-start.x)-Math.PI/2,.04);}
    if(p.customBajie){
      const limb=(part,start,end)=>{const h=Math.hypot(end.x-start.x,end.y-start.y)+.018;add(part,start.x,start.y,h*ratio(part,.5),h,Math.atan2(end.y-start.y,end.x-start.x)-Math.PI/2,.04);};
      const hand=(part,arm)=>{const h=part==='point'?.12:part==='palm'?.105:.085;add(part,arm.wrist.x,arm.wrist.y,h*ratio(part,.65),h,arm.angle,part==='point'?.14:.16);};
      add('leg',.285,.85,.13,.105,0,.02);
      limb('upper',p.right.shoulder,p.right.elbow);
      add('core',0,0,.8,1,0,0,true);
      if(p.bellyRipple>=0&&p.bellyRipple<1)vector('ripples',.405,.59,.19+p.bellyRipple*.25,.09+p.bellyRipple*.13,(1-p.bellyRipple)*.9,'#d9b05c');
      if(p.mouth)add('mouth',.427,.348,.09,.06,0,.5);
      limb('fore',p.right.elbow,p.right.wrist);
      add('weapon',p.weapon.x,p.weapon.y,p.weapon.length*ratio('weapon',165/552),p.weapon.length,p.weapon.angle,p.weapon.origin);
      hand('fist',p.right);limb('upper',p.left.shoulder,p.left.elbow);limb('fore',p.left.elbow,p.left.wrist);hand(p.hand,p.left);return list;
    }
    const beads=[];
    if(p.id==='shaseng')for(let i=0;i<20;i++){const angle=i*Math.PI/10+(p.beadAngle||0),front=Math.sin(angle)>=0;beads.push({x:.4+Math.cos(angle)*.083,y:.445+Math.sin(angle)*.09,front});}
    for(const b of beads.filter(b=>!b.front))add('bead',b.x,b.y,.03,.03,0,.5);
    arm(p.right);add('core',0,0,.8,1,0,0,true);
    for(const b of beads.filter(b=>b.front)){add('bead',b.x,b.y,.033,.033,0,.5);if(p.beadGlow>.01&&p.effects!==false){const c=add('bead',b.x,b.y,.036,.036,0,.5);c.tint='#e9bc53';c.alpha=p.beadGlow*.7;}}
    if(p.closed)add(p.id==='tangseng'?'tangEyes':'shaEyes',p.id==='tangseng'?.4:.394,p.id==='tangseng'?.367:.297,p.id==='tangseng'?.186:.191,p.id==='tangseng'?.064:.066,0,.5);
    if(p.mouth)add(p.id==='tangseng'?'tangMouth':'shaMouth',p.id==='tangseng'?.403:.394,p.id==='tangseng'?.432:.384,p.id==='tangseng'?.064:.187,p.id==='tangseng'?.036:.095,0,.5);
    add('weapon',p.weapon.x,p.weapon.y,p.weapon.length*({bajie:165,shaseng:117,tangseng:124}[p.id]/552),p.weapon.length,p.weapon.angle,p.weapon.origin);
    arm(p.left);
    add('fist',p.right.wrist.x,p.right.wrist.y,dimensions.fist*projection,.09*projection,p.right.angle,.15);
    const hand=p.hand||(p.open?'palm':'fist');
    add(hand,p.left.wrist.x,p.left.wrist.y,dimensions.fist*projection,(hand==='point'?.132:hand==='palm'?.12:.09)*projection,p.left.angle,.15);
    if(p.id==='tangseng'&&p.palmGlow>0&&p.effects!==false){const c=add('palm',p.left.wrist.x,p.left.wrist.y,dimensions.fist,.12,p.left.angle,.15);c.tint='#ebc35b';c.alpha=p.palmGlow*.65;}
    if(p.palmGlow>0)vector('ripples',p.left.palm.x,p.left.palm.y,.12,.14,p.palmGlow*.75);
    if(p.palmGhost>0&&p.effects!==false){const h=.18+.33*p.palmGhost,c=add('palm',.48,.40-.10*p.palmGhost,h*ratio('palm',.6),h,Math.PI,.5);c.tint='#e5b846';c.alpha=p.palmGhost*.75;}
    if(p.eyeGhost>0)vector('eyes',.4,.36-.06*p.eyeGhost,.24+.57*p.eyeGhost,.07+.14*p.eyeGhost,p.eyeGhost*.65,'#efbd3e');
    if(p.roar>=0&&p.roar<1)vector('ripples',.4,.36,.25+p.roar*.7,.15+p.roar*.48,(1-p.roar)*.9,'#d8b274');
    if(p.slam>=0&&p.slam<1)vector('ripples',.4,.95,.28+p.slam*.45,.08+p.slam*.12,(1-p.slam)*.9,'#b69c70');
    return list;
  }
  return{IDS,pose,sample,commands,handFromPalm};
});
