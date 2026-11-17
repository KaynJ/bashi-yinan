/* Independent rigid upper arms, forearms, hands and held staff on a single canvas. */
(function(root){
  'use strict';
  const paths={core:'runtime/assets/wukong-actions-v03/core.png',upper:'runtime/assets/wukong-actions-v03/upper.png',fore:'runtime/assets/wukong-actions-v03/fore.png',fist:'runtime/assets/wukong-actions-v03/fist.png',pinch:'runtime/assets/wukong-actions-v03/pinch.png',cloud:'runtime/assets/wukong-actions-v03/cloud.png',staff:'runtime/assets/chibi-v01/wukong/weapon.png'};
  const bounds={core:[0,0,512,640],upper:[66,12,125,232],fore:[71,12,115,232],fist:[46,12,165,232],pinch:[57,12,143,232],cloud:[12,57,488,143],staff:[91,56,41,552]};
  const cache=new Map();
  function commands(p){
    const list=[],add=(part,x,y,w,h,angle=0,origin=.0)=>list.push({part,x,y,w,h,angle,origin});
    const staff=()=>add('staff',p.staff.x,p.staff.y,p.staff.width,p.staff.length,p.staff.angle,p.staff.grip);
    // The wrapped forearm slides underneath the sleeve cuff at the elbow.
    const segments=a=>{for(const [part,from,to,width,extra,origin] of [['fore',a.elbow,a.wrist,.064,.045,.15],['upper',a.shoulder,a.elbow,.09,.026,.045]])add(part,from.x,from.y,width,Math.hypot(to.x-from.x,to.y-from.y)+extra,Math.atan2(to.y-from.y,to.x-from.x)-Math.PI/2,origin);};
    if(!p.staff.front)staff();segments(p.right);if(p.leftBehind)segments(p.left);
    list.push({part:'core',x:0,y:p.bob,w:.8,h:1,angle:0,origin:0,corner:true});
    if(p.staff.front)staff();if(!p.leftBehind)segments(p.left);
    add('fist',p.right.wrist.x,p.right.wrist.y,.076,.095,p.right.handAngle,.15);
    add(p.hand,p.left.wrist.x,p.left.wrist.y,.078*p.fistScale,.099*p.fistScale,p.left.handAngle,.15);
    return list;
  }
  function paint(ctx,images,p){
    for(const c of commands(p)){
      ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);
      ctx.drawImage(images[c.part],...bounds[c.part],c.corner?0:-c.w/2,-c.h*c.origin,c.w,c.h);ctx.restore();
    }
    if(p.hair>.01){const w=p.left.wrist;ctx.save();ctx.globalAlpha=p.hair;ctx.strokeStyle='#e7bd54';ctx.lineWidth=.003;
      ctx.beginPath();ctx.moveTo(w.x,w.y-.06);ctx.quadraticCurveTo(w.x+.025,w.y-.1,w.x+.015,w.y-.14);ctx.stroke();ctx.restore();}
  }
  function create(canvas,onStatus=()=>{}){
    const ctx=canvas.getContext('2d');let ready=false,request=0,lastKey='',images={};
    const layer=root.document.createElement('canvas'),layerCtx=layer.getContext('2d');
    canvas.width=layer.width=594;canvas.height=layer.height=635;canvas.style.setProperty('--rig-aspect','1.16');
    return{load(){const token=++request;ready=false;canvas.hidden=true;lastKey='';images={};
      let remaining=Object.keys(paths).length;
      const finish=(part,img)=>{if(token!==request)return;images[part]=img;onStatus(paths[part],false);if(--remaining===0)ready=true;};
      for(const [part,path] of Object.entries(paths)){
        if(cache.has(path)){finish(part,cache.get(path));continue;}
        const img=new root.Image();img.onload=()=>{cache.set(path,img);finish(part,img);};img.onerror=()=>{if(token===request)onStatus(path,true);};img.src=path;
      }
    },draw(unit,time){
      if(!ready||(unit.characterId||unit.id)!=='wukong'){canvas.hidden=true;return false;}canvas.hidden=false;
      const key=[unit.id,time,unit.hp,unit.stunnedUntil,unit.action?.type,unit.action?.startedAt,unit.isClone].join(':');if(key===lastKey)return true;lastKey=key;
      const p=root.WukongMotion.pose(unit,time);
      layerCtx.setTransform(1,0,0,1,0,0);layerCtx.clearRect(0,0,594,635);layerCtx.setTransform(512,0,0,512,.18*512,.12*512);
      paint(layerCtx,images,p);
      if(p.ghost){
        layerCtx.setTransform(1,0,0,1,0,0);layerCtx.globalCompositeOperation='destination-in';
        const fade=layerCtx.createLinearGradient(0,(.12+.57)*512,0,(.12+.78)*512);fade.addColorStop(0,'rgba(255,255,255,1)');fade.addColorStop(1,'rgba(255,255,255,0)');layerCtx.fillStyle=fade;layerCtx.fillRect(0,0,594,635);layerCtx.globalCompositeOperation='source-over';
      }
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,594,635);ctx.globalAlpha=p.ghost ? .52 : 1;ctx.drawImage(layer,0,0);
      if(p.ghost){ctx.setTransform(512,0,0,512,.18*512,.12*512);ctx.globalAlpha=.58;ctx.drawImage(images.cloud,...bounds.cloud,.01,.66,.70,.205);}
      ctx.globalAlpha=1;return true;
    },destroy(){request++;ready=false;canvas.hidden=true;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,594,635);},get ready(){return ready;}};
  }
  root.WukongRig={create,commands,paths,bounds,paint};
})(typeof globalThis!=='undefined'?globalThis:this);
