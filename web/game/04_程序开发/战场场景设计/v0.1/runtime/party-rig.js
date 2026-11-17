/* Shared modular sprite painter for Bajie, Shaseng, Tangseng and Bailongma. */
(function(root){
  'use strict';const cache=new Map(),tints=new Map();
  function tinted(image,color){
    if(!root.document)return image;
    const key=image.src+color;if(tints.has(key))return tints.get(key);
    const layer=root.document.createElement('canvas');layer.width=image.width;layer.height=image.height;const ctx=layer.getContext('2d');ctx.drawImage(image,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,layer.width,layer.height);tints.set(key,layer);return layer;
  }
  function vector(ctx,c){
    ctx.strokeStyle=c.color;ctx.fillStyle=c.color;ctx.lineWidth=.006;ctx.lineCap='round';ctx.lineJoin='round';
    if(c.kind==='eyes'){
      ctx.lineWidth=.015;
      for(const side of [-1,1]){const x=side*c.w*.235,w=c.w*.205,h=c.h*.45;
        ctx.beginPath();ctx.moveTo(x-w,0);ctx.bezierCurveTo(x-w*.35,-h,x+w*.45,-h,x+w,0);ctx.bezierCurveTo(x+w*.35,h*.75,x-w*.4,h*.75,x-w,0);ctx.stroke();
        const opacity=ctx.globalAlpha;ctx.globalAlpha=opacity*.2;ctx.fill();ctx.globalAlpha=opacity;
        ctx.beginPath();ctx.ellipse(x,0,c.h*.12,c.h*.30,0,0,Math.PI*2);ctx.stroke();
        for(let n=0;n<3;n++){const lash=x+side*w*(.25+n*.28);ctx.beginPath();ctx.moveTo(lash,-h*.65);ctx.lineTo(lash+side*w*.19,-h*(1.15+n*.12));ctx.stroke();}
      }
    }else if(c.kind==='halo'){
      const opacity=ctx.globalAlpha;
      for(const [width,alpha,color] of [[.026,.16,c.color],[.008,1,c.color],[.003,.85,'#fff0b9']]){
        ctx.lineWidth=width;ctx.globalAlpha=opacity*alpha;ctx.strokeStyle=color;
        ctx.beginPath();ctx.ellipse(0,0,c.w*.5,c.h*.5,0,0,Math.PI*2);ctx.stroke();
      }
      ctx.globalAlpha=opacity;
    }else{
      for(const scale of [.52,.77,1]){ctx.beginPath();ctx.ellipse(0,0,c.w*.5*scale,c.h*.5*scale,0,0,Math.PI*2);ctx.stroke();}
    }
  }
  function paint(ctx,images,definition,pose){
    for(const c of root.PartyMotion.commands(pose,definition)){
      ctx.save();ctx.globalAlpha=c.alpha??1;ctx.translate(c.x,c.y);ctx.rotate(c.angle);
      if(c.kind)vector(ctx,c);
      else {const source=definition.parts[c.part],image=c.tint?tinted(images[c.part],c.tint):images[c.part];ctx.drawImage(image,...source.bounds,c.corner?0:-c.w*(c.anchorX??.5),-c.h*c.origin,c.w,c.h);}
      ctx.restore();
    }
    if(pose.booger){ctx.save();ctx.fillStyle='#a28457';ctx.beginPath();ctx.arc(pose.left.palm.x,pose.left.palm.y,.004,0,Math.PI*2);ctx.fill();ctx.restore();}
  }
  function create(canvas,onStatus=()=>{}){
    const ctx=canvas.getContext('2d');let id,definition,images={},ready=false,request=0,lastKey='';
    canvas.width=594;canvas.height=635;canvas.style.setProperty('--rig-aspect','1.16');
    return{load(character){const token=++request;id=character;definition=root.PartyAssets[id];images={};ready=false;canvas.hidden=true;lastKey='';
      let remaining=Object.keys(definition.parts).length;
      const finish=(part,image)=>{if(token!==request)return;images[part]=image;onStatus(definition.parts[part].path,false);if(--remaining===0)ready=true;};
      for(const [part,source] of Object.entries(definition.parts)){
        if(cache.has(source.path)){finish(part,cache.get(source.path));continue;}
        const img=new root.Image();img.onload=()=>{cache.set(source.path,img);finish(part,img);};img.onerror=()=>{if(token===request)onStatus(source.path,true);};img.src=source.path;
      }
    },draw(unit,time){
      if(!ready||(unit.characterId||unit.id)!==id){canvas.hidden=true;return false;}canvas.hidden=false;
      const key=[unit.id,time,unit.hp,unit.stunnedUntil,unit.action?.type,unit.action?.startedAt].join(':');if(key===lastKey)return true;lastKey=key;
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,594,635);ctx.setTransform(512,0,0,512,.18*512,.12*512);
      paint(ctx,images,definition,root.PartyMotion.pose(unit,time));return true;
    },destroy(){request++;ready=false;images={};canvas.hidden=true;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,594,635);},get ready(){return ready;}};
  }
  root.PartyRig={create,paint};
})(typeof globalThis!=='undefined'?globalThis:this);
