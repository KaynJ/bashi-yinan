/* Articulated arms in image-height units. The body never changes scale. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WukongMotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  function curve(t,keys){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const a=keys[i-1],b=keys[i];return a[1]+(b[1]-a[1])*smooth((t-a[0])/(b[0]-a[0]));}return keys.at(-1)[1];}
  const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  function arm(shoulder,wrist,upper,lower,bend){
    const dx=wrist.x-shoulder.x,dy=wrist.y-shoulder.y,length=Math.hypot(dx,dy)||1e-8;
    const d=Math.min(upper+lower-.00001,Math.max(Math.abs(upper-lower)+.00001,length));
    const direction=Math.atan2(dy,dx),offset=Math.acos(Math.max(-1,Math.min(1,(upper*upper+d*d-lower*lower)/(2*upper*d))));
    const elbow={x:shoulder.x+Math.cos(direction+bend*offset)*upper,y:shoulder.y+Math.sin(direction+bend*offset)*upper};
    const hand={x:shoulder.x+dx/length*d,y:shoulder.y+dy/length*d};
    return{shoulder,elbow,wrist:hand,handAngle:Math.atan2(hand.y-elbow.y,hand.x-elbow.x)-Math.PI/2};
  }
  function pose(unit,time){
    let right={x:.17,y:.54},left={x:.53,y:.69},rightElbow={x:.19,y:.62},leftElbow={x:.54,y:.61},staffAngle=80*Math.PI/180,staffFront=false,hand='fist',fistScale=1,hair=0;
    const action=unit.action,enabled=unit.hp>0&&!(unit.stunnedUntil>time),active=enabled&&action&&time>=action.startedAt&&time<action.endsAt;
    let phase='待机',p=0;
    if(active){
      const age=time-action.startedAt,hit=action.hitAt-action.startedAt,end=action.endsAt-action.startedAt;
      p=age/end;phase=age<hit?'蓄力':age<hit+(end-hit)*.3?'命中':'收势';
      if(action.type==='attack'){
        const retract=curve(age,[[0,0],[hit*.55,1],[hit,0],[end,0]]),strike=curve(age,[[0,0],[hit*.55,0],[hit,1],[hit+.12,.7],[end,0]]);
        left=mix(left,{x:.46,y:.58},retract);left=mix(left,{x:.64,y:.53},strike);
        leftElbow=mix(leftElbow,{x:.55,y:.58},strike);fistScale=1+.25*strike;
      }else if(action.type==='small'){
        const lift=smooth(age/(hit*.58)),smash=smooth((age-hit*.58)/(hit*.42)),recover=smooth((age-hit-.09)/(end-hit-.09));
        const raisedRight={x:.24,y:.43},raisedLeft={x:.31,y:.33};
        right=mix(mix(right,raisedRight,lift),{x:.205,y:.66},smash);left=mix(mix(left,raisedLeft,lift),{x:.25,y:.53},smash);
        right=mix(right,{x:.17,y:.54},recover);left=mix(left,{x:.53,y:.69},recover);
        rightElbow=mix(mix(rightElbow,{x:.15,y:.54},lift),{x:.15,y:.63},smash);rightElbow=mix(rightElbow,{x:.19,y:.62},recover);
        leftElbow=mix(mix(leftElbow,{x:.49,y:.43},lift),{x:.43,y:.65},smash);leftElbow=mix(leftElbow,{x:.54,y:.61},recover);
        staffAngle=(80+(36-80)*lift)*(1-smash)*(1-recover)*Math.PI/180+80*recover*Math.PI/180;
        // Both hands grip the same rigid staff during the held portion of the slam.
        staffFront=age>.04&&recover<.95;
      }else if(action.type==='ultimate'){
        const reach=smooth(age/(hit*.56)),pluck=smooth((age-hit*.56)/(hit*.22)),flick=smooth((age-hit*.82)/(hit*.18)),recover=smooth((age-hit)/(end-hit));
        left=mix(left,{x:.39,y:.18},reach);left=mix(left,{x:.43,y:.12},pluck);left=mix(left,{x:.61,y:.30},flick);left=mix(left,{x:.53,y:.69},recover);
        leftElbow=mix(leftElbow,{x:.56,y:.31},reach);leftElbow=mix(leftElbow,{x:.57,y:.41},flick);leftElbow=mix(leftElbow,{x:.54,y:.61},recover);
        hand=reach>.4&&recover<.7?'pinch':'fist';hair=reach>.95?(1-recover)*pluck:0;
        phase=age<hit*.56?'伸手':age<hit*.82?'拔毛':age<hit?'化身':'收势';
      }
    }
    const projected=(shoulder,elbow,wrist)=>({shoulder,elbow,wrist,handAngle:Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x)-Math.PI/2});
    const r=projected({x:.25,y:.53},rightElbow,right);
    const grip={x:right.x-Math.sin(r.handAngle)*.052,y:right.y+Math.cos(r.handAngle)*.052};
    if(staffFront){
      const palm={x:grip.x+Math.sin(staffAngle)*.15,y:grip.y-Math.cos(staffAngle)*.15},dx=palm.x-leftElbow.x,dy=palm.y-leftElbow.y,d=Math.hypot(dx,dy);
      const held={x:palm.x-dx/d*.052,y:palm.y-dy/d*.052};
      const gripWeight=active?curve(time-action.startedAt,[[0,0],[.12,1],[action.endsAt-action.startedAt-.18,1],[action.endsAt-action.startedAt,0]]):0;
      left=mix(left,held,gripWeight);
    }
    const l=projected({x:.49,y:.53},leftElbow,left);
    return{right:r,left:l,staff:{x:grip.x,y:grip.y,angle:staffAngle,length:.78,width:.052,grip:.65,front:staffFront},
      hand,fistScale,hair,phase,progress:p,leftBehind:active&&action.type==='ultimate'&&left.y<.40,
      bodyAngle:unit.hp<=0?.65:0,bob:enabled&&!active&&unit.moving?-Math.abs(Math.sin(time*10))*.008:0,ghost:!!unit.isClone};
  }
  return{pose,arm,curve};
});
