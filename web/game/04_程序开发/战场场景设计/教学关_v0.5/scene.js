'use strict';
(() => {
  const D=window.SceneData,M=window.SceneModel,P=window.ScenePointer,$=id=>document.getElementById(id),scene=$('scene');
  const icon=id=>'<svg viewBox="0 0 52 60" aria-hidden="true" stroke="#8b7751" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">'+D.art[id]+'</svg>';
  let state=new URLSearchParams(window.location.search).get('demo')==='1'?M.demo():M.create();
  let armed=null,toastTimer,ignoreClickUntil=0,loadingBattle=false,battleRequest=0,lastUiTick=-1,lastBattleSeq=-1;
  const fixedLoadout = D.equipment.every(item=>item.owner);
  if (fixedLoadout) {
    const notes = document.querySelectorAll('#equipment-panel .panel-note');
    notes[0].textContent = '本命武器随身绑定';
    notes[1].hidden = true;
  }
  const current=()=>M.hero(state,state.selected);
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2400);}
  function report(result,success){if(!result.ok){toast(result.message);return false;}if(success)toast(success);return true;}
  const clock=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  function renderSkills(battle){
    const live=battle?.units.find(u=>u.id===state.selected),definition=window.BattleModel.CHARACTERS[state.selected];
    for(const skill of definition.skills){const active=live?.skills.find(s=>s.id===skill.id),remaining=active?Math.max(0,active.readyAt-battle.time):skill.cd;
      $(skill.id+'-skill-name').textContent=skill.name;$(skill.id+'-skill-name').title=skill.description;
      $(skill.id+'-skill-cd').textContent=live?(live.hp<=0?'倒下':remaining>.05?remaining.toFixed(1)+'s':'就绪'):current().row===null?'未上场':skill.cd+'s';
      $(skill.id+'-skill-fill').style.width=(live?Math.max(0,Math.min(1,1-remaining/skill.cd))*100:0)+'%';
    }
  }
  function renderBattleUI(battle,force=false){
    window.TeachingUI.update(battle);const tick=Math.floor(battle.time*10);if(!force&&tick===lastUiTick&&battle.seq===lastBattleSeq)return;lastUiTick=tick;
    $('battle-time').textContent=clock(battle.time);
    $('battle-status').textContent=({ready:'正在准备动作',running:'实战进行中',paused:'实战已暂停',won:'对决胜利',lost:'我方落败',timeout:'对决超时'})[battle.status];
    $('battle-pause').disabled=!['running','paused'].includes(battle.status);$('battle-pause').textContent=battle.status==='paused'?'继续':'暂停';
    $('arena-state').textContent=battle.status==='paused'?'◇　战 斗 暂 停　◇':'◇　师 徒 合 战　◇';
    const selected=battle.units.find(u=>u.id===state.selected);
    if(selected)$('selected-state').textContent=selected.hp>0?`${selected.hp} / ${selected.maxHp}`:'已倒下';
    document.querySelectorAll('.hero-card[data-hero]').forEach(card=>{const u=battle.units.find(u=>u.id===card.dataset.hero);card.classList.toggle('fallen',!!u&&u.hp<=0);});
    renderSkills(battle);
    if(lastBattleSeq!==battle.seq){lastBattleSeq=battle.seq;const events=battle.events.filter(e=>['skill','summon','stun','knockback','defeat','result','knockup','charm','guard','betray'].includes(e.type)).slice(-4).reverse();$('battle-events').replaceChildren(...events.map(e=>{const li=document.createElement('li'),time=document.createElement('time');time.textContent=clock(e.time);li.append(time,document.createTextNode(e.text));return li;}));}
  }
  const combatView=window.SceneBattleView.create({unitLayer:$('battle-units'),effectLayer:$('battle-effects'),icon,
    onFrame:b=>renderBattleUI(b),onAssetError:()=>$('battle-asset-error').hidden=false,
    onResult:b=>{const result=window.SceneBattleAdapter.summary(b);$('battle-result').hidden=false;$('battle-result').dataset.status=b.status;$('battle-result-title').textContent=b.status==='won'?'教学关通过':b.status==='lost'?'再整旗鼓':'对决超时';$('battle-result-detail').textContent=`用时 ${result.time} 秒 · 伤害 ${result.damage} · 治疗 ${result.healing}。小技能 ${result.small} 次，大招 ${result.ultimate} 次。`;}
  });
  const deploymentHealth=window.SceneBattleView.createHealthLayer($('field'),'deployment');
  const formationPreview=window.FormationPreview.create($('field'));
  const rangePreview=document.createElement('div');rangePreview.className='attack-range-preview';rangePreview.hidden=true;rangePreview.setAttribute('aria-hidden','true');$('field').append(rangePreview);let rangeKey='';
  function showAttackRange(id,target){
    if(!target||target.row<5){rangePreview.hidden=true;rangeKey='';return;}
    const key=id+':'+target.col+','+target.row;if(key===rangeKey)return;rangeKey=key;
    const unit={...window.BattleModel.CHARACTERS[id],x:9.5-target.row,y:target.col+.5,facing:1};
    rangePreview.replaceChildren(...window.BattleModel.attackCells(unit).map(cell=>{const tile=document.createElement('span');tile.style.gridColumn=cell.row+1;tile.style.gridRow=10-cell.col;tile.dataset.col=cell.row;tile.dataset.row=9-cell.col;return tile;}));rangePreview.hidden=false;
  }
  function returnToFormation(){battleRequest++;loadingBattle=false;combatView.reset();state.combat=false;lastUiTick=-1;lastBattleSeq=-1;$('battle-result').hidden=true;$('battle-feed').hidden=true;$('battle-asset-error').hidden=true;$('battle-pause').disabled=true;$('battle-pause').textContent='暂停';$('battle-status').textContent='师徒五人 · 白骨十字阵';$('battle-time').textContent='00:00';window.TeachingUI.update(null);render();}
  async function startCombat(){
    if(state.combat||loadingBattle)return;
    if(!state.heroes.some(h=>h.row!==null)){toast('请先上阵至少一位人物');return;}
    cleanupDrag();armed=null;const request=++battleRequest;state.combat=true;loadingBattle=true;lastUiTick=-1;lastBattleSeq=-1;$('battle-feed').hidden=false;$('battle-result').hidden=true;window.TeachingUI.battleStarted();render();
    try{await combatView.start(state,(done,total)=>{if(request===battleRequest)$('battle-status').textContent=`准备动作 ${done} / ${total}`;});if(request!==battleRequest)return;loadingBattle=false;render();}
    catch(error){if(request!==battleRequest)return;returnToFormation();toast('战斗未能开始：'+error.message);}
  }
  function renderEnemyPreview(){
    $('field').querySelectorAll('.enemy-mark').forEach(n=>n.remove());
    for(const enemy of window.BoneEncounter.ENEMIES){const n=document.createElement('div'),p=window.SceneBattleAdapter.position(enemy);n.className='enemy-mark bone-preview';n.dataset.bone=enemy.boneId;n.dataset.enemy=enemy.id;n.dataset.maxHp=enemy.hp;n.style.left=p.left+'%';n.style.top=`calc(${p.top}% - 5px)`;n.style.transform='translate(-50%,-100%)';n.innerHTML='<span class="health-bar enemy-health"><i></i></span><canvas></canvas><small>'+enemy.name+'</small>';$('field').append(n);}
    window.TeachingUI.update(null);
  }
  function renderRoster(){
    $('role-filter').innerHTML=D.roles.map(role=>`<button class="role-chip" data-role="${role}" aria-pressed="${role===state.filter}" ${state.combat?'disabled':''}>${role}</button>`).join('');
    const visible=M.visible(state);
    $('roster-grid').innerHTML=visible.map(h=>`<button class="hero-card ${h.row!==null?'deployed':''}" data-hero="${h.id}" aria-pressed="${h.id===state.selected}" title="${h.name} · ${h.role}"><img src="assets/${h.id}.png" alt="" draggable="false"><span>${h.name}</span><i class="deployed-mark" aria-hidden="true">✓</i></button>`).join('');
    $('empty-filter').hidden=visible.length>0;
    $('party-count').textContent=state.heroes.filter(h=>h.row!==null).length+' / 5';
    const h=current();$('selected-name').textContent=h.name;$('selected-role').textContent=h.role;$('selected-state').textContent=h.row===null?'待上场':'已上阵';
    $('deployment-toggle').textContent=h.row===null?'拖到空格，上场':'撤下'+h.name;$('deployment-toggle').disabled=state.combat||h.row===null;
  }
  function renderUnits(){
    $('party-units').innerHTML=state.heroes.filter(h=>h.row!==null).map(h=>{
      const gear=M.gear(state,h.id),hp=window.BattleModel.tutorialCharacter(h.id).hp;
      return `<div class="unit ${h.id===state.selected?'selected':''}" data-unit="${h.id}" data-max-hp="${hp}" style="--col:${h.col};--row:${h.row}" role="button" tabindex="0" aria-label="${h.name}，${h.role}，已装备${gear.length}件"><img class="unit-art" src="assets/${h.id}.png" alt="${h.name}" draggable="false"><div class="head-hud"><span class="health-bar" role="img" aria-label="${h.name}生命值${hp}/${hp}"><i></i></span><div class="head-equipment">${gear.map(i=>`<button class="head-item" ${i.owner ? 'disabled' : 'data-equip="'+i.id+'"'} title="${i.name}" aria-label="${h.name}的${i.name}${i.owner ? '，本命武器' : '，可拖动或按Delete卸下'}" ${state.combat?'disabled':''}>${icon(i.icon)}</button>`).join('')}</div></div><span class="unit-name">${h.name}</span></div>`;
    }).join('');
    document.querySelectorAll('.cell.active').forEach(c=>c.classList.remove('active'));
    const h=current();if(h.row!==null)document.querySelector(`[data-col="${h.col}"][data-row="${h.row}"]`)?.classList.add('active');
  }
  function renderInventory(){
    $('treasure-grid').innerHTML=D.treasures.map(i=>`<div class="treasure-card compact-card ${state.treasures.has(i.id)?'checked':''}"><input type="checkbox" data-treasure="${i.id}" aria-label="随行法宝：${i.name}" ${state.treasures.has(i.id)?'checked':''} ${state.combat?'disabled':''}><button data-item="${i.id}" data-item-kind="treasure" aria-label="查看${i.name}详情">${icon(i.icon)}<span>${i.name}</span></button></div>`).join('');
    $('treasure-count').textContent='已选 '+state.treasures.size;
    $('equipment-grid').innerHTML=D.equipment.map(i=>`<button class="equipment-card compact-card ${armed===i.id?'armed':''}" ${i.owner ? '' : 'data-equip="'+i.id+'"'} data-item="${i.id}" data-item-kind="equipment" title="${i.name} · ${i.owner ? '本命武器' : '点击详情，拖动装备'}" aria-label="查看${i.name}详情">${icon(i.icon)}<span>${i.name}</span>${state.owners[i.id]?`<small>已装备 · ${M.hero(state,state.owners[i.id]).name}</small>`:''}</button>`).join('');
    $('equipment-count').textContent=fixedLoadout ? '已绑定 5 件' : '待配置 '+D.equipment.filter(i=>state.owners[i.id]===null).length;
  }
  function render(){
    renderRoster();renderUnits();renderInventory();
    scene.classList.toggle('combat',state.combat);scene.classList.toggle('item-armed',armed!==null);
    formationPreview.sync(state);
    deploymentHealth.sync($('field'),'.party-units .health-bar,.bone-preview .health-bar');
    $('grid-toggle').disabled=state.combat;
    $('phase-toggle').innerHTML=loadingBattle?'正在准备动作…':state.combat?'重新布阵 <span>↶</span>':'开始战斗 <span>→</span>';$('phase-toggle').disabled=loadingBattle;
    $('arena-state').textContent=state.combat?'◇　战 斗 布 局　◇':'◇　战 前 布 阵　◇';
    $('field-hint').textContent=armed?'点击战场中的人物，为其装备':state.combat?'自动移动与出招 · 点击头像查看技能':`已选${current().name} · ${current().row===null?'拖到我方空格上场':'拖动人物换位，也可点格子'}`;
    renderSkills(state.combat?combatView.battle:null);if(state.combat&&combatView.battle)renderBattleUI(combatView.battle,true);
  }
  function selectUnit(id){
    if(state.combat)return;
    if(armed){const item=D.equipment.find(i=>i.id===armed);if(report(M.assign(state,armed,id),`已为${M.hero(state,id).name}装备${item.name}`))armed=null;}
    state.selected=id;window.TeachingUI.selectHero(id);render();
  }
  for(let row=0;row<10;row++)for(let col=0;col<5;col++){
    const c=document.createElement('button');c.className='cell '+(row>=5?'ally':'enemy');c.dataset.col=col;c.dataset.row=row;c.disabled=row<5;c.setAttribute('aria-label',`${row>=5?'我方':'敌方'}第${row%5+1}行第${col+1}列`);
    c.onclick=()=>{if(Date.now()<ignoreClickUntil)return;if(armed){toast('请把装备放到人物身上');return;}if(report(M.move(state,state.selected,col,row)))render();};$('board-grid').append(c);
  }
  document.addEventListener('click',e=>{
    if(Date.now()<ignoreClickUntil)return;
    const equip=e.target.closest('[data-equip]');
    if(equip){window.TeachingUI.showItem('equipment',equip.dataset.equip);if(state.combat)return;armed=armed===equip.dataset.equip?null:equip.dataset.equip;render();if(armed)toast('已拿起装备，点选战场人物穿戴');return;}
    const combatUnit=e.target.closest('[data-combat-unit]');if(combatUnit&&state.combat){const unit=combatView.battle?.units.find(u=>u.id===combatUnit.dataset.combatUnit);if(unit?.team==='enemy'){window.TeachingUI.selectEnemy(unit.id);return;}if(unit?.team==='ally'){state.selected=unit.ownerId||unit.id;window.TeachingUI.selectHero(state.selected);render();}return;}
    const unit=e.target.closest('[data-unit]');if(unit){selectUnit(unit.dataset.unit);return;}
    const role=e.target.closest('[data-role]');if(role&&!state.combat){state.filter=role.dataset.role;renderRoster();document.querySelector(`[data-role="${state.filter}"]`)?.focus();return;}
    const hero=e.target.closest('[data-hero]');if(hero){state.selected=hero.dataset.hero;window.TeachingUI.selectHero(state.selected);render();}
  });
  $('treasure-grid').addEventListener('change',e=>{
    const input=e.target.closest('[data-treasure]');if(!input)return;
    if(report(M.check(state,input.dataset.treasure,input.checked))){input.closest('.treasure-card').classList.toggle('checked',input.checked);$('treasure-count').textContent='已选 '+state.treasures.size;}else input.checked=state.treasures.has(input.dataset.treasure);
  });
  function dropTarget(x,y){
    const element=document.elementFromPoint(x,y),unit=element?.closest('[data-unit]');
    if(unit)return {kind:'hero',id:unit.dataset.unit,node:unit};
    const tray=element?.closest('#equipment-grid');return tray?{kind:'tray',node:tray}:null;
  }
  function formationTarget(id,x,y){
    const cell=P.cellAt($('field').getBoundingClientRect(),x,y);
    if(!cell)return null;
    const other=document.elementFromPoint(x,y)?.closest('[data-unit]');
    if(other&&other.dataset.unit!==id){const h=M.hero(state,other.dataset.unit);if(h&&h.row!==null)return {col:h.col,row:h.row};}
    return cell;
  }
  function clearDropPreview(){document.querySelectorAll('.drop-target,.drop-cell,.drag-source').forEach(n=>n.classList.remove('drop-target','drop-cell','drag-source'));rangePreview.hidden=true;rangePreview.replaceChildren();rangeKey='';deploymentHealth.sync($('field'),'.party-units .health-bar,.bone-preview .health-bar');}
  const pointer=P.create({
    start(session){
      armed=null;scene.classList.remove('item-armed');session.source.classList.add('drag-source');
      const ghost=$('drag-ghost');
      if(session.kind==='hero'){
        const h=M.hero(state,session.id);ghost.classList.add('hero-ghost');ghost.innerHTML=`<img src="assets/${h.id}.png" alt="" draggable="false">`;scene.classList.add('dragging-hero');
      }else{ghost.classList.remove('hero-ghost');ghost.innerHTML=icon(D.equipment.find(i=>i.id===session.id).icon);scene.classList.add('dragging-equipment');}
      ghost.hidden=false;
    },
    move(session,e){
      $('drag-ghost').style.left=e.clientX+'px';$('drag-ghost').style.top=e.clientY+'px';
      document.querySelectorAll('.drop-target,.drop-cell').forEach(n=>n.classList.remove('drop-target','drop-cell'));
      if(session.kind==='hero'){
        const target=formationTarget(session.id,e.clientX,e.clientY);
        showAttackRange(session.id,target);
        if(target&&target.row>=5){
          document.querySelector(`[data-col="${target.col}"][data-row="${target.row}"]`)?.classList.add('drop-cell');
          const occupant=state.heroes.find(h=>h.id!==session.id&&h.col===target.col&&h.row===target.row),h=M.hero(state,session.id);
          $('field-hint').textContent=occupant?(h.row===null?'该格已有人物，请选择空格':`放开后与${occupant.name}交换站位`):'放开后在此落位';
        }else $('field-hint').textContent='请拖到我方下半场格子';
      }else dropTarget(e.clientX,e.clientY)?.node.classList.add('drop-target');
    },
    end(session){
      if(session.source.hasPointerCapture?.(session.pointerId))session.source.releasePointerCapture(session.pointerId);
      ignoreClickUntil=session.active ? Date.now()+180 : 0;$('drag-ghost').hidden=true;$('drag-ghost').classList.remove('hero-ghost');scene.classList.remove('dragging-equipment','dragging-hero');clearDropPreview();
    },
    tap(session){
      if(session.kind==='hero'){if(session.origin==='field')selectUnit(session.id);else{state.selected=session.id;window.TeachingUI.selectHero(session.id);render();}return;}
      window.TeachingUI.showItem('equipment',session.id);armed=armed===session.id?null:session.id;render();if(armed)toast('已拿起装备，点选战场人物穿戴');
    },
    drop(session,e){
      if(session.kind==='hero'){
        const target=formationTarget(session.id,e.clientX,e.clientY);
        if(target){if(report(M.move(state,session.id,target.col,target.row)))state.selected=session.id;}
        else toast('已取消，人物保留在原处');
      }else{
        const target=dropTarget(e.clientX,e.clientY),item=D.equipment.find(i=>i.id===session.id);
        if(target?.kind==='hero')report(M.assign(state,session.id,target.id),`已为${M.hero(state,target.id).name}装备${item.name}`);
        else if(target?.kind==='tray')report(M.unequip(state,session.id),item.name+'已放回装备栏');
        else toast('已取消，装备保留在原处');
      }
      armed=null;render();
    }
  });
  function cleanupDrag(){const previous=pointer.cancel();if(previous?.active)render();}
  document.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    const resolved=P.sourceFrom(e.target);if(!resolved)return;
    if(state.combat)return;
    const session={...resolved,pointerId:e.pointerId,x:e.clientX,y:e.clientY};
    if(!pointer.down(session))return;
    e.preventDefault();resolved.source.setPointerCapture?.(e.pointerId);
  });
  document.addEventListener('pointermove',e=>{
    if(pointer.move(e))e.preventDefault();
  },{passive:false});
  document.addEventListener('pointerup',e=>pointer.up(e));
  document.addEventListener('pointercancel',e=>{if(pointer.current?.pointerId===e.pointerId)cleanupDrag();});
  document.addEventListener('lostpointercapture',e=>{if(pointer.current?.pointerId===e.pointerId&&pointer.current.source===e.target)cleanupDrag();});
  window.addEventListener('blur',cleanupDrag);
  window.addEventListener('resize',()=>deploymentHealth.sync($('field'),'.party-units .health-bar,.bone-preview .health-bar'));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){cleanupDrag();armed=null;window.TeachingUI.closePanels();render();}
    const equip=e.target.closest('[data-equip]');
    if(equip&&['Delete','Backspace'].includes(e.key)){e.preventDefault();if(report(M.unequip(state,equip.dataset.equip),'装备已放回装备栏')){armed=null;render();}return;}
    const unit=e.target.closest('[data-unit]');if(unit&&!equip&&['Enter',' '].includes(e.key)){e.preventDefault();selectUnit(unit.dataset.unit);}
  });
  $('deployment-toggle').onclick=()=>{if(report(M.remove(state,state.selected),'人物已撤下，装备已放回装备栏')){armed=null;render();}};
  $('phase-toggle').onclick=()=>{cleanupDrag();armed=null;if(state.combat)returnToFormation();else startCombat();};
  $('battle-pause').onclick=()=>combatView.pause();$('battle-speed').onchange=e=>combatView.setSpeed(Number(e.target.value));
  $('battle-return').onclick=()=>returnToFormation();$('battle-again').onclick=()=>{returnToFormation();startCombat();};
  $('grid-toggle').onclick=()=>{const hidden=scene.classList.toggle('no-grid');$('grid-toggle').textContent='格线 · '+(hidden?'关':'开');$('grid-toggle').setAttribute('aria-pressed',!hidden);};
  $('opacity').oninput=e=>{scene.style.setProperty('--panel-alpha',e.target.value/100);$('opacity-value').textContent=(100-e.target.value)+'%';};
  $('reset').onclick=()=>{cleanupDrag();returnToFormation();armed=null;state=M.create();scene.classList.remove('no-grid');$('grid-toggle').textContent='格线 · 开';$('grid-toggle').setAttribute('aria-pressed','true');$('opacity').value=54;$('opacity').dispatchEvent(new Event('input'));render();toast('已还原站位，法宝与装备已清空');};
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>window.TeachingUI.openPanel(b.dataset.open));
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>window.TeachingUI.closePanels());
  window.TeachingReview={get state(){return state;},get battle(){return combatView.battle;},get preview(){return formationPreview.battle;},view:combatView,start:startCombat,returnToFormation,render,syncLayout(){deploymentHealth.sync($('field'),'.party-units .health-bar,.bone-preview .health-bar');combatView.render();}};renderEnemyPreview();render();if(new URLSearchParams(location.search).get('autostart')==='1')startCombat();
})();
