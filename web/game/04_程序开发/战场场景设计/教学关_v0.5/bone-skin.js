(function(root){
 'use strict';const B=root.BoneEncounter,images=new Map(),clamp=x=>Math.max(0,Math.min(1,x));
 const base='../../战斗表现小样/白骨精初稿/v0.2/assets/',paths={};for(const id of ['boss','red','yellow','blue','green'])for(const part of id==='boss'?['body','fan','wink']:['body','fan'])paths[id+'-'+part]=base+id+'/'+part+'.png';
 const ready=Promise.all(Object.entries(paths).map(([key,path])=>new Promise(resolve=>{const im=new Image();im.onload=()=>{images.set(key,im);resolve({path,ok:true});};im.onerror=()=>resolve({path,ok:false});im.src=path;})));
 const anchors={boss:[.17,.53],red:[.14,.55],green:[.18,.54],blue:[.13,.54],yellow:[.13,.53]};
 function fan(c,id,x,y,w,angle=0,center=false){const im=images.get(id+'-fan');if(!im)return;const h=w*im.height/im.width;c.save();c.translate(x,y);c.rotate(angle);c.drawImage(im,-w/2,center?-h/2:-h,w,h);c.restore();}
 function heart(c,x,y,size=14,alpha=1){c.save();c.translate(x,y);c.scale(size/20,size/20);c.globalAlpha*=alpha;c.fillStyle='#d8759b';c.strokeStyle='#a45c7d';c.lineWidth=1;c.beginPath();c.moveTo(0,8);c.bezierCurveTo(-22,-6,-10,-19,0,-9);c.bezierCurveTo(10,-19,22,-6,0,8);c.fill();c.stroke();c.restore();}
 function paint(c,u,b,foot,height){const id=u.boneId,a=u.action,age=a?b.time-a.startedAt:0,phase=a?clamp(age/(a.endsAt-a.startedAt)):0,wink=id==='boss'&&a?.type==='ultimate'&&age>=.18&&age<1.05,im=images.get(id+(wink?'-wink':'-body'));if(!im)return false;
  const w=height*im.width/im.height;c.save();c.translate(foot.x,foot.y);c.rotate(a?Math.sin(phase*Math.PI)*.025:Math.sin(b.time*1.8)*.006);c.drawImage(im,-w/2,-height,w,height);
  const [hx,hy]=anchors[id],grip={x:(hx-.5)*w,y:(hy-1)*height};let fw=height*(id==='boss'?.36:.34),angle=-.14,y=grip.y;
  if(id==='red'&&a?.type==='attack'){const grow=clamp((age-.05)/.3)*clamp((a.endsAt-b.time)/.16);fw=height*(.34+.16*grow);angle+=1.09*grow;}
  if(id==='yellow'&&a?.type==='attack'){angle+=Math.sin(age*17)*.4;y-=Math.sin(phase*Math.PI)*height*.035;}
  if(a?.type==='small')angle-=Math.sin(phase*Math.PI)*.3;if(a?.type==='ultimate')angle-=Math.sin(clamp(age/.18)*Math.PI/2)*.56;
  if(a?.type==='attack'&&!['red','yellow'].includes(id)&&age<.28)angle-=age*1.8;
  if(!b.projectiles?.some(p=>p.sourceId===u.id&&p.type==='fan'))fan(c,id,grip.x,y,fw,angle);c.restore();return true;
 }
 function create(canvas){canvas.width=400;canvas.height=440;const c=canvas.getContext('2d');return{draw(u,b){c.clearRect(0,0,400,440);return paint(c,u,b,{x:200,y:401},340);}};}
 function effects(c,b,width,height){const point=u=>{const p=root.SceneBattleAdapter.position(u);return{x:p.left*width/100,y:p.top*height/100-5};};
  c.clearRect(0,0,width,height);
  for(const u of b.units){if(u.action?.type==='small'&&u.boneId==='boss'&&!u.action.landed)for(const v of B.line(b,u,u.action.targetColumn)){const p=point(v);c.save();c.globalAlpha=.5+.2*Math.sin(b.time*14);c.strokeStyle='#94749e';c.fillStyle='#c3a1c42f';c.lineWidth=1.5;c.beginPath();c.ellipse(p.x,p.y,22,8,0,0,Math.PI*2);c.fill();c.stroke();c.restore();}
   if(u.charmedUntil>b.time&&u.hp>0){const p=point(u);heart(c,p.x,p.y-86,13);}
  }
  for(const p of b.projectiles||[]){const src=b.units.find(u=>u.id===p.sourceId),pos=point({x:B.projectileX(p,b.time),y:B.projectileY(p,b.time)}),age=b.time-p.start;if(p.type==='heart')heart(c,pos.x,pos.y-43,17);else{c.save();c.shadowColor='#ccb6c8';c.shadowBlur=5;fan(c,src.boneId,pos.x,pos.y-30,29,age*19,true);c.restore();}}
  for(const e of b.effects){const p=point(e),age=b.time-e.start,progress=clamp(age/(e.expires-e.start));c.save();c.globalAlpha=1-progress;
   if(e.type==='bone-spike'){const grow=clamp(age/.12);c.fillStyle='#f5ead5';c.strokeStyle='#917b8b';c.lineWidth=1.4;for(const [dx,h]of [[-13,24],[0,39],[14,28]]){c.beginPath();c.moveTo(p.x+dx-6,p.y+3);c.quadraticCurveTo(p.x+dx-4,p.y-h*grow,p.x+dx+2,p.y-h*grow);c.lineTo(p.x+dx+6,p.y+3);c.closePath();c.fill();c.stroke();}}
   if(e.type==='bone-heal'){c.strokeStyle='#91ab79';c.lineWidth=1.4;c.beginPath();c.ellipse(p.x,p.y,20+progress*15,7+progress*5,0,0,Math.PI*2);c.stroke();}
   c.restore();
  }
 }
 root.BoneSkin={ready,paths,images,paint,create,effects};
})(window);
