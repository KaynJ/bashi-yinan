/* One complete held-weapon sprite, one canvas, one continuous affine draw. */
(function(root){
  'use strict';
  const Motion=root.CombatMotion,PAD_X=.18,PAD_Y=.12,cache=new Map();
  function create(canvas,onStatus=()=>{}){
    const context=canvas.getContext('2d');let artwork=null,image=null,ready=false,request=0,lastKey='',articulated=null;
    return{load(id,source){
      articulated?.destroy();articulated=null;
      const token=++request;artwork=id;ready=false;canvas.hidden=true;lastKey='';
      if(id==='wukong'&&root.WukongRig){articulated=root.WukongRig.create(canvas,onStatus);articulated.load();return;}
      if(root.PartyRig&&root.PartyAssets?.[id]){articulated=root.PartyRig.create(canvas,onStatus);articulated.load(id);return;}
      const finish=value=>{if(token!==request)return;image=value;const aspect=image.width/image.height;
        canvas.width=Math.round((aspect+PAD_X*2)*512);canvas.height=Math.round((1+PAD_Y*2)*512);
        canvas.style.setProperty('--rig-aspect',String(aspect+PAD_X*2));ready=true;onStatus(source,false);};
      if(cache.has(source)){finish(cache.get(source));return;}
      const pending=new Image();pending.onload=()=>{if(token!==request)return;cache.set(source,pending);finish(pending);};
      pending.onerror=()=>{if(token===request)onStatus(source,true);};pending.src=source;
    },draw(unit,time){
      if(articulated)return articulated.draw(unit,time);
      if(!ready||artwork!==unit.id){canvas.hidden=true;return false;}
      canvas.hidden=false;
      const key=[unit.id,time,unit.hp<=0,unit.stunnedUntil>time,unit.action?.type,unit.action?.startedAt].join(':');
      if(key===lastKey)return true;lastKey=key;
      const affine=Motion.affine(Motion.pose(unit,time)),pixelScale=512/image.height;
      context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,canvas.width,canvas.height);
      context.setTransform(pixelScale,0,-affine.shear*pixelScale,pixelScale,(PAD_X+affine.shear*affine.ground)*512,PAD_Y*512);
      context.drawImage(image,0,0);return true;
    },destroy(){articulated?.destroy();articulated=null;request++;ready=false;image=null;canvas.hidden=true;context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,canvas.width,canvas.height);},get ready(){return articulated?articulated.ready:ready;}};
  }
  function present(rig,canvas,fallback,unit,time){
    const rendered=rig.draw(unit,time);canvas.hidden=!rendered;fallback.hidden=rendered;return rendered;
  }
  root.PaperRig={create,present};
})(typeof globalThis!=='undefined'?globalThis:this);
