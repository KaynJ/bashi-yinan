(function(root){
  'use strict';
  const M=root.BattleModel,A=root.SceneBattleAdapter,Rig=root.PaperRig,FX=root.UltimateFX;
  const wood='<svg viewBox="0 0 100 175" aria-hidden="true"><path d="M43 51H58L61 163H39Z" fill="#8d7050" stroke="#605141" stroke-width="2"/><path d="M14 73Q48 67 85 73V87H14Z" fill="#ac906a" stroke="#685740" stroke-width="2"/><path d="M27 17Q49 6 73 17L69 123Q49 133 31 123Z" fill="#bea17a" stroke="#6f5b42" stroke-width="2"/><path d="M29 31Q49 23 71 31M30 39Q49 32 71 39M32 102Q49 110 69 102M32 109Q49 116 69 109" fill="none" stroke="#806b4d" stroke-width="4"/><path d="M48 46Q42 66 48 91M57 47L56 91M38 51L39 89" fill="none" stroke="#8c7553" stroke-width="1.6"/></svg>';
  const terminal=b=>['won','lost','timeout'].includes(b.status);
  const assetPaths=()=>[...new Set([...Object.values(M.CHARACTERS).map(c=>c.asset),...Object.values(root.WukongRig.paths),...Object.values(root.PartyAssets).flatMap(c=>Object.values(c.parts).map(p=>p.path))])];
  let preloaded;
  function ultimateScale(unit,time){
    const a=unit.action;if(unit.hp<=0||a?.type!=='ultimate')return 1;
    const phase=Math.max(0,Math.min(1,(time-a.startedAt)/(a.endsAt-a.startedAt)));
    return 1+.16*Math.sin(Math.PI*phase);
  }
  // Health bars share a layer above sprites and effects; their source slots keep
  // equipment layout and the head/lift anchors intact.
  function createHealthLayer(field,phase){
    const layer=document.createElement('div'),bars=new Map();layer.className='battle-health-layer';layer.dataset.phase=phase;field.append(layer);
    function reset(){bars.clear();layer.replaceChildren();}
    function sync(root,selector='.health-bar'){
      const bounds=field.getBoundingClientRect(),sources=[...root.querySelectorAll(selector)],active=new Set(sources);
      for(const [source,bar]of bars)if(!active.has(source)){bar.remove();bars.delete(source);}
      const slots=sources.map(source=>({source,rect:source.getBoundingClientRect(),owner:source.closest('.battle-unit,.unit,.bone-preview')}));
      for(const {source,rect,owner}of slots){
        let bar=bars.get(source);if(!bar){bar=document.createElement('span');bar.innerHTML='<i></i><span class="health-ticks" aria-hidden="true"></span>';bar.setAttribute('role','img');layer.append(bar);bars.set(source,bar);}
        bar.className='health-bar floating-health '+['is-charmed','is-guarding','buffed','clone','drag-source'].filter(c=>owner?.classList.contains(c)).join(' ');
        bar.dataset.team=owner?.dataset.team||(owner?.classList.contains('bone-preview')?'enemy':'ally');bar.dataset.healthUnit=owner?.dataset.combatUnit||owner?.dataset.unit||owner?.dataset.bone||'';
        bar.hidden=!!source.closest('[hidden],.is-dead')||!rect.width||!rect.height;
        bar.style.left=(rect.left-bounds.left+rect.width/2-20)+'px';bar.style.top=(rect.top-bounds.top+rect.height/2-2.5)+'px';
        bar.style.width='40px';bar.style.height='5px';bar.firstElementChild.style.width=source.firstElementChild.style.width||'100%';
        const hp=Number(owner?.dataset.maxHp)||1000;
        if(bar.dataset.maxHp!==String(hp)){bar.dataset.maxHp=hp;const ticks=[];for(let value=1000;value<hp;value+=1000){const tick=document.createElement('b');tick.style.left=value/hp*100+'%';ticks.push(tick);}bar.lastElementChild.replaceChildren(...ticks);}
        bar.setAttribute('aria-label',source.getAttribute('aria-label')||owner?.getAttribute('aria-label')||'生命值');
      }
    }
    return{sync,reset,layer};
  }
  function preload(onProgress){
    if(preloaded)return preloaded;
    const paths=[...assetPaths(),...Object.values(root.BoneSkin.paths)];let count=0;
    preloaded=Promise.all(paths.map(path=>new Promise(resolve=>{const img=new root.Image();let done=false;const timer=setTimeout(()=>finish(false),10000);function finish(ok){if(done)return;done=true;clearTimeout(timer);onProgress?.(++count,paths.length);resolve({path,ok});}img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=path;})));
    return preloaded;
  }
  function create({unitLayer,effectLayer,icon,onFrame=()=>{},onResult=()=>{},onAssetError=()=>{}}){
    let battle=null,token=0,raf=0,last=null,accumulator=0,speed=1,resultShown=false;
    const boneCanvas=document.createElement('canvas');boneCanvas.className='bone-effects-canvas';
    const nodes=new Map(),effects=new Map();
    const health=createHealthLayer(unitLayer.parentElement,'combat');
    function assetStatus(path,failed){if(failed)onAssetError(path);}
    function make(unit){
      const element=document.createElement('div');element.className='battle-unit';element.dataset.combatUnit=unit.id;element.dataset.team=unit.team;
      element.classList.toggle('clone',!!unit.isClone);element.dataset.maxHp=unit.maxHp;
      element.innerHTML='<div class="battle-shadow"></div><div class="battle-art"></div><div class="head-hud"><span class="health-bar"><i></i></span><span class="battle-shield" hidden></span><div class="head-equipment"></div></div><span class="unit-name"></span><span class="battle-stun" hidden>晕</span>';
      element.querySelector('.unit-name').textContent=unit.name;
      const art=element.querySelector('.battle-art');let rig=null,canvas=null,fallback=null;
      if(unit.team==='ally'){
        fallback=document.createElement('img');fallback.className='battle-fallback';fallback.src=unit.asset;fallback.alt=unit.name;fallback.draggable=false;art.append(fallback);
        canvas=document.createElement('canvas');canvas.className='battle-rig';canvas.hidden=true;art.append(canvas);rig=Rig.create(canvas,assetStatus);rig.load(unit.characterId||unit.id,unit.asset);
        if(!unit.isClone)for(const item of root.SceneData.equipment.filter(i=>battle.loadout.owners[i.id]===unit.id)){const badge=document.createElement('span');badge.className='head-item';badge.title=item.name;badge.innerHTML=icon(item.icon);element.querySelector('.head-equipment').append(badge);}
      }else if(unit.boneId){element.dataset.bone=unit.boneId;canvas=document.createElement('canvas');canvas.className='bone-rig';art.append(canvas);rig=root.BoneSkin.create(canvas);}
      else{art.innerHTML=wood;art.classList.add('wood-art');}
      unitLayer.append(element);
      const node={element,art,rig,canvas,fallback,fill:element.querySelector('.health-bar i'),hud:element.querySelector('.head-hud'),shield:element.querySelector('.battle-shield'),stun:element.querySelector('.battle-stun')};nodes.set(unit.id,node);return node;
    }
    function renderUnits(){
      for(const u of battle.units){
        const n=nodes.get(u.id)||make(u),p=A.position(u);n.element.style.left=p.left+'%';n.element.style.top=`calc(${p.top}% - 5px)`;n.element.style.zIndex=String(Math.floor(p.top)+1);
        n.element.classList.toggle('is-dead',u.hp<=0);n.element.classList.toggle('buffed',!!u.attackBuff);n.hud.hidden=u.hp<=0;n.stun.hidden=u.hp<=0||u.stunnedUntil<=battle.time;
        n.fill.style.width=Math.max(0,u.hp/u.maxHp*100)+'%';n.shield.hidden=u.shield<=0;n.shield.textContent=u.shield>0?'护盾 '+u.shield:'';
        n.element.setAttribute('aria-label',`${u.name}，生命${u.hp}/${u.maxHp}`);
        if(n.rig){if(u.boneId)n.rig.draw(u,battle);else Rig.present(n.rig,n.canvas,n.fallback,u,battle.time);}
        const lift=root.BoneEncounter.lift(u,battle.time),zoom=ultimateScale(u,battle.time),rise=(zoom-1)*n.element.offsetHeight;
        n.art.style.transform=u.hp<=0?'translateY(6px) rotate(65deg)':`translateY(${-lift}px) scale(${zoom})`;n.element.dataset.ultimateScale=zoom.toFixed(4);n.hud.style.transform=`translate(-50%,${-lift-rise}px)`;
        n.element.classList.toggle('is-charmed',u.charmedUntil>battle.time);n.element.classList.toggle('is-guarding',root.BoneEncounter.guarding(battle,u));
        n.stun.textContent=u.knockupUntil>battle.time?'击飞 '+(u.knockupUntil-battle.time).toFixed(1)+'s':u.charmedUntil>battle.time?'魅惑 '+(u.charmedUntil-battle.time).toFixed(1)+'s':'晕';n.stun.hidden=u.hp<=0||!(u.stunnedUntil>battle.time||u.charmedUntil>battle.time);n.stun.style.transform=`translate(-50%,${-lift}px)`;
      }
    }
    function makeEffect(effect){
      const element=document.createElement('div');let view=null;
      if(effect.type==='ultimate'&&FX.THEMES[effect.character])view=FX.mount(element,effect.character);
      else if(effect.type==='column')element.className='battle-column';
      else if(['belly','slam','summon','sweep','punch'].includes(effect.type)){element.className='battle-impact '+effect.type;element.innerHTML=effect.type==='punch'?'<i></i><i></i>':'<i></i>';}
      else{element.className='battle-number '+(effect.type==='heal'?'healing':effect.type==='buff'?'buff':effect.type==='shield'?'shielding':effect.team==='ally'?'incoming':'outgoing');element.textContent=effect.type==='buff'?`攻击 +${effect.amount}%`:effect.type==='heal'?`+${effect.amount}`:effect.type==='shield'?`护盾 +${effect.amount}`:effect.amount?`−${effect.amount}`:`护盾 −${effect.absorbed||0}`;}
      effectLayer.append(element);const node={element,view};effects.set(effect.id,node);return node;
    }
    function renderEffects(){
      const active=new Set(battle.effects.map(e=>e.id));for(const [id,n]of effects)if(!active.has(id)){n.element.remove();effects.delete(id);}
      for(const e of battle.effects){
        if(['bone-spike','bone-heal','reflect','charm','betray'].includes(e.type))continue;
        const {element,view}=effects.get(e.id)||makeEffect(e),progress=Math.max(0,Math.min(1,(battle.time-e.start)/(e.expires-e.start)));
        if(e.type==='column'){element.style.left=e.column*20+'%';element.style.top='0';element.style.opacity=String((1-progress)*.7);continue;}
        const p=A.position(e);element.style.left=p.left+'%';element.style.top=`calc(${p.top}% - 5px)`;
        if(view){const radius=FX.THEMES[e.character].radius;element.style.width=radius*40+'%';element.style.height=radius*20+'%';view.draw(battle.time-e.start);continue;}
        element.style.opacity=String(1-progress);
        if(['belly','slam','summon','sweep','punch'].includes(e.type))element.style.transform=`translate(-50%,-50%) translateY(${e.airborne?-100:0}px) scale(${.6+progress*.9})`;
        else element.style.transform=`translate(-50%,-100%) translateY(${(e.airborne?-145:-75)-progress*35}px)`;
      }
    }
    function render(){if(!battle)return;renderUnits();renderEffects();health.sync(unitLayer);if(!boneCanvas.isConnected)effectLayer.append(boneCanvas);const rect=effectLayer.getBoundingClientRect(),scale=Math.min(2,root.devicePixelRatio||1),w=Math.round(rect.width*scale),h=Math.round(rect.height*scale);if(boneCanvas.width!==w||boneCanvas.height!==h){boneCanvas.width=w;boneCanvas.height=h;}const ctx=boneCanvas.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);root.BoneSkin.effects(ctx,battle,rect.width,rect.height);onFrame(battle);if(terminal(battle)&&!resultShown){resultShown=true;onResult(battle);}}
    function frame(now){
      if(!battle)return;
      if(last!==null&&battle.status==='running'&&!document.hidden){accumulator+=Math.min((now-last)/1000,.15)*speed;while(accumulator>=1/60&&battle.status==='running'){M.step(battle,1/60);accumulator-=1/60;}}
      last=now;render();if(!terminal(battle))raf=requestAnimationFrame(frame);
    }
    function reset(){token++;cancelAnimationFrame(raf);last=null;accumulator=0;battle=null;resultShown=false;for(const n of nodes.values())n.rig?.destroy?.();nodes.clear();effects.clear();health.reset();unitLayer.replaceChildren();effectLayer.replaceChildren();}
    async function start(state,onProgress){reset();const request=token;battle=A.create(state);battle.units.forEach(make);render();const loaded=await preload(onProgress);await root.BoneSkin.ready;if(request!==token)return null;loaded.filter(a=>!a.ok).forEach(a=>onAssetError(a.path));M.startBattle(battle);last=null;accumulator=0;render();raf=requestAnimationFrame(frame);return battle;}
    function pause(){if(!battle||terminal(battle))return;M.setPaused(battle,battle.status!=='paused');last=null;accumulator=0;render();}
    document.addEventListener('visibilitychange',()=>{last=null;accumulator=0;});
    return {start,reset,pause,setSpeed(value){speed=value;},get battle(){return battle;},render};
  }
  root.SceneBattleView={create,createHealthLayer,ultimateScale,wood,preload,assetPaths};
})(typeof globalThis!=='undefined'?globalThis:this);
