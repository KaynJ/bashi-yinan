(function(root){'use strict';const $=id=>document.getElementById(id),B=root.BoneEncounter;let selected='bone-boss',latest=null,lastHint='',lastTick=-1,lastStatus='',lastSeq=-1;
 let statsTeam='ally',sortMetric='damage',detailId='wukong';const metricNames={damage:'伤害',damageTaken:'承伤',sustain:'治疗/护盾'};
 const stats=document.createElement('section');stats.className='panel-section stats-panel';stats.id='stats-panel';stats.setAttribute('aria-label','双方战斗统计');
 stats.innerHTML='<div class="panel-heading"><div><small>实战表现</small><h2>战斗统计</h2></div><span id="stats-state" class="count">待开战</span><button class="mobile-close" data-close="stats-panel" aria-label="收起统计">×</button></div><div class="stats-tabs" role="group" aria-label="切换统计阵营"><button data-stats-team="ally" aria-pressed="true">我方</button><button data-stats-team="enemy" aria-pressed="false">敌方</button></div><div id="stats-totals" class="stats-totals" aria-label="统计总量与排序"></div><div id="stats-rows" class="stats-rows"></div><p class="stats-note" title="承伤按实际扣血统计；绿色合计有效治疗与护盾吸收，分身归本体">绿色＝治疗＋护盾吸收 · 分身归本体</p>';
 document.getElementById('stats-slot').append(stats);
 const statsButton=document.createElement('button');statsButton.id='mobile-stats';statsButton.textContent='统计';document.querySelector('.mobile-dock').append(statsButton);
 const scene=document.getElementById('scene');
 function refreshLayout(){root.TeachingReview?.syncLayout();}
 function syncButtons(){for(const [id,cls]of [['lineup-toggle','lineup-visible'],['loadout-toggle','loadout-visible']]){const open=scene.classList.contains(cls),button=$(id);button.setAttribute('aria-expanded',open);button.querySelector('span').textContent=open?'收起':'展开';}requestAnimationFrame(refreshLayout);}
 function closePanels(){scene.classList.remove('lineup-visible','loadout-visible','left-side-open','right-side-open','side-panel-open');delete scene.dataset.sideTarget;syncButtons();}
 function battleStarted(){closePanels();}
 function openPanel(id,{toggle=true}={}){
  const target=document.getElementById(id);if(!target)return;
  const left=!!target.closest('.roster-zone'),underlay=['stats-panel','battle-result'].includes(id),cls=left?'lineup-visible':'loadout-visible',mobile=matchMedia('(max-width:700px)').matches;
  const close=toggle&&(underlay?scene.dataset.sideTarget===id:scene.classList.contains(cls)&&(['lineup-panel','loadout-panel'].includes(id)||scene.dataset.sideTarget===id));
  if(mobile){scene.classList.remove('left-side-open','right-side-open','side-panel-open','lineup-visible','loadout-visible');if(!close){scene.classList.add('side-panel-open',left?'left-side-open':'right-side-open');scene.dataset.sideTarget=id;}else delete scene.dataset.sideTarget;}
  if(close)scene.classList.remove(cls);else if(!underlay)scene.classList.add(cls);else scene.classList.remove(cls);
  syncButtons();
 }
 if(!matchMedia('(max-width:700px)').matches)scene.classList.add('lineup-visible','loadout-visible');syncButtons();
 statsButton.onclick=()=>openPanel('stats-panel');
 function renderStats(b){
  const units=b?.units||[...Object.keys(root.BattleModel.CHARACTERS).map(id=>({...root.BattleModel.tutorialCharacter(id),id,team:'ally'})),...B.ENEMIES].map(u=>({...u,maxHp:u.hp,stats:{}}));
  const report=root.BattleModel.teamReport({units},statsTeam),rows=report.rows.sort((a,b)=>b[sortMetric]-a[sortMetric]||a.id.localeCompare(b.id));
  stats.dataset.team=statsTeam;
  for(const button of stats.querySelectorAll('[data-stats-team]'))button.setAttribute('aria-pressed',button.dataset.statsTeam===statsTeam);
  $('stats-state').textContent=!b?'待开战':['won','lost','timeout'].includes(b.status)?'本场结算':b.status==='paused'?'已暂停':'实时更新';
  $('stats-totals').innerHTML=Object.entries(metricNames).map(([key,name])=>`<button class="stat-${key}" data-stats-sort="${key}" aria-pressed="${sortMetric===key}" title="按${name}排序"><small>${name}</small><strong data-total="${key}">${Math.round(report.totals[key]).toLocaleString('zh-CN')}</strong></button>`).join('');
  const maximum=Math.max(1,...rows.map(u=>u.damage+u.damageTaken+u.sustain));
  $('stats-rows').innerHTML=rows.map((u,i)=>{const actor=units.find(a=>a.id===u.id),asset=actor.boneId?root.BoneSkin.paths[actor.boneId+'-body']:'assets/'+u.id+'.png';return`<div class="stat-row ${u.hp<=0?'fallen':''}" data-stat-unit="${u.id}"><img src="${asset}" alt="" draggable="false"><div class="stat-line"><span><b>${i+1}</b> ${u.name}<small>${u.role}${u.hp<=0?' · 退场':''}</small></span><div class="stat-values">${Object.entries(metricNames).map(([key,name])=>`<em class="stat-${key}" data-value="${key}" title="${name}">${Math.round(u[key]).toLocaleString('zh-CN')}</em>`).join('')}</div><div class="stat-track">${Object.keys(metricNames).map(key=>`<i class="stat-${key}" style="width:${u[key]/maximum*100}%"></i>`).join('')}</div></div></div>`;}).join('');
 }
 const descriptions={boss:'法师首领 · 飞扇穿过整列；骨刺击飞 2 秒；魅惑首敌 3 秒。',red:'坦克 · 只有举扇守御：减伤 50%，并反弹伤害。',yellow:'辅助 · 只有挥扇治疗：回复所有存活友军。',blue:'法师 · 只有蓝色飞扇：命中首敌，造成单体伤害。',green:'法师 · 只有绿色飞扇：命中首敌，造成单体伤害。'};
 const colors={boss:'#98758f',red:'#ad655f',yellow:'#c4a062',blue:'#799db9',green:'#7c9e84'};
 function selectEnemy(id){selected=id;detailId=id;lastTick=-1;update(latest,true);$('unit-detail').scrollTop=0;openPanel('lineup-panel',{toggle:false});}
 function selectHero(id){detailId=id;renderDetail();$('unit-detail').scrollTop=0;openPanel('lineup-panel',{toggle:false});}
 const basicNames={wukong:'左拳出击',bajie:'钉耙挥击',shaseng:'月牙铲击',tangseng:'锡杖挥击',bailongma:'龙泽光环',boss:'旋转骨扇',red:'骨扇守御',yellow:'暖扇回春',blue:'霜蓝飞扇',green:'青绿飞扇'};
 const bossCopy={attack:'骨扇旋转飞出再返回，对目标所在列、射程内的所有敌人各造成一次伤害。',small:'从身前目标列的敌人脚下升起骨刺，击飞 2 秒。',ultimate:'眨眼嘟嘴发出爱心，使面前首敌攻击相邻友军，持续 3 秒。'};
 function coefficient(u,s){if(s.kind==='summon')return `分身生命＝最大生命的 10%（${Math.round(u.maxHp*.1)}），攻击＝攻击力的 30%（${Math.round(u.attack*.3)}）`;if(s.maxHpPercent)return `治疗＝最大生命的 ${s.maxHpPercent*100}%（${Math.round(u.maxHp*s.maxHpPercent)}）`;if(s.kind==='aura')return `每 0.5 秒治疗 30，持续 2 秒；攻击力 +20%，持续 2 秒`;if(s.amount)return `固定治疗 ${s.amount}`;if(s.kind==='stun')return `控制 ${s.stun} 秒，无伤害`;if(s.kind==='push')return `击退 ${s.knockback} 格，无伤害`;if(s.power===0)return '魅惑 3 秒，无直接伤害';return `攻击力 × ${Math.round((s.power??1)*100)}%（${Math.round(u.attack*(s.power??1))} 点减伤前伤害）`;}
 function renderDetail(){
  const definition=B.ENEMIES.find(u=>u.id===detailId)||root.BattleModel.tutorialCharacter(detailId),live=latest?.units.find(u=>u.id===detailId),u={...definition,...live,maxHp:live?.maxHp||definition.hp};
  let basic={id:'attack',name:basicNames[u.boneId||detailId],cd:u.interval,power:1,description:u.boneId?descriptions[u.boneId]:u.basic?'向最近同伴施加治疗和增攻光环。':`普通攻击；${u.rangeLabel||'身边 8 格'}。`,...u.basic};
  if(u.boneId==='yellow')basic={...basic,kind:'heal',amount:B.SETTINGS.heal};
  const skills=[basic,...u.skills].map(s=>u.boneId==='boss'?{...s,description:bossCopy[s.id]}:s);
  $('unit-detail').innerHTML=`<div class="detail-title"><strong>${u.name}</strong><span>${u.role}${u.team==='enemy'?' · 敌方':' · 我方'}</span></div><dl class="unit-numbers"><div><dt>生命</dt><dd>${Math.ceil(live?.hp??u.hp)} / ${u.maxHp}</dd></div><div><dt>攻击</dt><dd>${u.attack}</dd></div><div><dt>防御</dt><dd>${u.defense}</dd></div><div><dt>普攻间隔</dt><dd>${u.interval} 秒</dd></div></dl><div class="detail-skills">${skills.map(s=>{const remaining=live?Math.max(0,(s.id==='attack'?live.attackReadyAt:s.readyAt)-latest.time):null,formula=u.boneId==='red'?'减伤 50%，持续 2 秒；反弹实际承伤的 50%':coefficient(u,s);return `<article data-detail-skill="${s.id}"><header><b>${s.id==='attack'?'平A':s.id==='small'?'小技能':'大招'} · ${s.name}</b><span>CD ${s.cd} 秒</span></header><p>${s.description||descriptions[u.boneId]||''}</p><em>${formula}</em>${remaining!==null?`<small>${remaining>.05?'冷却剩余 '+remaining.toFixed(1)+' 秒':'已就绪'}</small>`:''}</article>`;}).join('')}</div>`;
 }
 const itemCopy={gourd:'以紫金葫芦收纳妖气的随行法宝。勾选后随队携带。',pearl:'定住山风、安定阵形的宝珠。勾选后随队携带。',bell:'随身护铃，铃声守护同行之人。勾选后随队携带。',lotus:'莲花承身，清气养元。勾选后随队携带。',scroll:'无字经卷，静观万法。勾选后随队携带。',staff:'盘龙纹长棍，作为随身武器配置，可拖给场上任意人物。',robe:'素锦法衣，作为防具配置，可拖给场上任意人物。',beads:'菩提念珠，作为饰品配置，可拖给场上任意人物。',boots:'踏云布履，作为鞋履配置，可拖给场上任意人物。',talisman:'随身平安符，作为护符配置，可拖给场上任意人物。'};
 function showItem(kind,id){const item=root.SceneData[kind==='treasure'?'treasures':'equipment'].find(i=>i.id===id);if(!item)return;const host=$(kind==='treasure'?'treasure-detail':'equipment-detail');host.innerHTML=`<strong>${item.name}</strong><p>${itemCopy[id]}</p><small>当前为配置展示，本次教学战不计属性加成。</small>`;host.dataset.item=id;}
 function update(b,force=false){latest=b;const tick=b?Math.floor(b.time*5):-1;if(!force&&tick===lastTick&&b&&b.status===lastStatus&&b.seq===lastSeq)return;lastTick=tick;lastStatus=b?.status||'';lastSeq=b?.seq??-1;
  renderStats(b);
  $('mobile-enemy').textContent=b&&['won','lost','timeout'].includes(b.status)?'结算':'敌阵';
  const enemies=b?b.units.filter(u=>u.team==='enemy'):B.ENEMIES;$('enemy-count').textContent=enemies.filter(u=>u.hp>0).length+' / 5';
  if(force||!$('enemy-roster').children.length)$('enemy-roster').innerHTML=enemies.map(u=>`<button class="enemy-row ${u.id===selected?'selected':''}" data-enemy="${u.id}" style="--tone:${colors[u.boneId]}" aria-pressed="${u.id===selected}" aria-label="查看${u.name}技能"><img src="${root.BoneSkin.paths[u.boneId+'-body']}" alt="" draggable="false"><strong>${u.name.replace('小妹','')}</strong></button>`).join('');
  const unit=enemies.find(u=>u.id===selected)||enemies[0];$('enemy-detail').textContent=descriptions[unit.boneId];
  renderDetail();
  for(const el of document.querySelectorAll('[data-goal]'))el.classList.toggle('done',el.dataset.goal==='start'?!!b:el.dataset.goal==='skills'?!!b&&b.time>=6:b?.status==='won');
  let title='让八戒守住前排',copy='拖动人物调整站位，法师与辅助留在后方。准备好后，开始这场试炼。',progress='布阵准备';
  if(b){progress=b.status==='won'?'试炼通过':b.status==='lost'?'重新整阵':'战斗进行';title='观察双方自动出招';copy='小技能和大招按冷却自动释放。点选师徒头像，可查看技能准备情况。';const events=b.events.filter(e=>['charm','knockup','guard','defeat'].includes(e.type)&&b.time-e.time<5);const event=events.at(-1);
   if(event?.type==='charm'){title='爱心命中，队友倒戈';copy='魅惑持续 3 秒，目标会转攻身边友军。留意头顶爱心和转向友军的出招。';}
   if(event?.type==='knockup'){title='脚下骨刺，整列击飞';copy='同列目标被击飞 2 秒。布阵时分散前后排，可减少同列同时受控。';}
   if(event?.type==='guard'){title='红扇举起，先破后援';copy='绯红举扇时减伤 50% 并反伤；杏黄持续治疗全队，后排也是关键目标。';}
   if(b.status==='won'){title='白骨阵已破';copy='你已完成这一场教学战。可以再战一次，或返回布阵尝试新的站位。';}
   if(b.status==='lost'){title='重新整阵，再试一次';copy='让坦克承接前排攻击，并注意队伍分散与辅助的位置。';}
   if(b.status==='timeout'){title='试炼暂歇';copy='战斗达到时限，返回布阵调整队伍后再试。';}
  }
  const key=title+copy;if(key!==lastHint){$('tutorial-title').textContent=title;$('tutorial-copy').textContent=copy;lastHint=key;}$('tutorial-progress').textContent=progress;
 }
 document.addEventListener('click',e=>{const team=e.target.closest('[data-stats-team]'),sort=e.target.closest('[data-stats-sort]');if(team){statsTeam=team.dataset.statsTeam;renderStats(latest);}if(sort){sortMetric=sort.dataset.statsSort;renderStats(latest);}const row=e.target.closest('[data-enemy]');if(row)selectEnemy(row.dataset.enemy);const item=e.target.closest('[data-item]');if(item)showItem(item.dataset.itemKind,item.dataset.item);});
 $('mobile-enemy').onclick=()=>openPanel(latest&&['won','lost','timeout'].includes(latest.status)?'battle-result':'encounter-panel');
 document.addEventListener('click',e=>{if(e.target.closest('[data-close-side]'))closePanels();});
 for(const kind of ['treasure','equipment']){const el=document.createElement('div');el.id=kind+'-detail';el.className='item-detail';$(kind+'-panel').querySelector('.panel-content').append(el);showItem(kind,root.SceneData[kind==='treasure'?'treasures':'equipment'][0].id);}
 root.TeachingUI={update,selectEnemy,selectHero,showItem,openPanel,closePanels,battleStarted};
})(window);
