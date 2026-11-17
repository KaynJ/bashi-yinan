/* Shared, deterministic battle model. Browser classic script and Node both use this file. */
(function (root, factory) {
  const node=typeof module==='object'&&module.exports;
  const model = factory(node ? require('../v0.1/runtime/grid.js') : root.GridMovement,node?require('./bone-encounter.js'):root.BoneEncounter);
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.BattleModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Grid,Bone) {
  'use strict';
  const PRESETS = {
    wukong: { name: '悟空招式试演', hint: '只上阵悟空：左拳、棍击与毫毛分身。木桩可反击，分身可被击败。', enemies: [
      { id: 'wood-1', name: '试招木桩', x: 7.5, y: 2.5, hp: 6000, attack: 24, defense: 18, interval: 1.5, speed: .85 }
    ] },
    practice: { name: '初试身手', hint: '对战一只机关木桩，观察自动接近与双技能。', enemies: [
      { id: 'wood-1', name: '机关木桩', x: 7.5, y: 2.5, hp: 2400, attack: 48, defense: 18, interval: 1.35, speed: 1.05 }
    ] },
    group: { name: '围攻试练', hint: '三个木桩会反击，试着改变悟空的开场站位。', enemies: [
      { id: 'wood-1', name: '前排木桩', x: 6.5, y: 1.5, hp: 1150, attack: 68, defense: 18, interval: 1.25, speed: 1.05 },
      { id: 'wood-2', name: '前排木桩', x: 6.5, y: 3.5, hp: 1150, attack: 68, defense: 18, interval: 1.25, speed: 1.05 },
      { id: 'wood-3', name: '后排木桩', x: 8.5, y: 2.5, hp: 1150, attack: 68, defense: 18, interval: 1.25, speed: 1.05 }
    ] },
    party: { name: '师徒合练', hint: '师徒五人共同上阵，五个机关木桩会移动和反击。', enemies: [
      { id: 'wood-1', name: '前排木桩', x: 6.5, y: .5, hp: 2400, attack: 80, defense: 22, interval: 1.3, speed: 1.05 },
      { id: 'wood-2', name: '前排木桩', x: 6.5, y: 2.5, hp: 2800, attack: 80, defense: 28, interval: 1.3, speed: 1.05 },
      { id: 'wood-3', name: '前排木桩', x: 6.5, y: 4.5, hp: 2400, attack: 80, defense: 22, interval: 1.3, speed: 1.05 },
      { id: 'wood-4', name: '后排木桩', x: 8.5, y: 1.5, hp: 2200, attack: 72, defense: 18, interval: 1.4, speed: 1.0 },
      { id: 'wood-5', name: '后排木桩', x: 8.5, y: 3.5, hp: 2200, attack: 72, defense: 18, interval: 1.4, speed: 1.0 }
    ] }
  };
  PRESETS.bones={name:'白骨岭 · 初遇',hint:'击败白骨精与四位小妹。',enemies:Bone.ENEMIES};
  const SKILLS = [
    { id: 'small', name: '棍击砸地', icon: '棒', description: '挥棍砸地，攻击当前目标', cd: 5, power: 1.8, range: 4, windup: .52, duration: .95 },
    { id: 'ultimate', name: '毫毛分身', icon: '毛', description: '拔毛化出祥云虚影：生命 10%，攻击 30%；本体倒下时消失', kind: 'summon', cd: 10, range: 4, windup: 1.02, duration: 1.45 }
  ];
  const CHARACTERS = {
    wukong: { name: '悟空', role: '刺客', weapon: '金箍棒', hp: 1400, attack: 84, defense: 25, interval: .95, speed: 1.8, range: 4, attackArea: { kind: 'forward', columns: 3, rows: 4 }, rangeLabel: '身前3列×4行', attackWindup: .28, attackDuration: .65,
      asset: 'runtime/assets/chibi-hold-v02/wukong/front.png', skills: SKILLS },
    tangseng: { name: '唐僧', role: '法师', weapon: '九环锡杖', hp: 1100, attack: 76, defense: 15, interval: 1.4, speed: 1.25, range: 6, attackArea: { kind: 'pyramid', rows: 6 }, rangeLabel: '正前方6格·横偏1格纵深减1', attackWindup: .28, attackDuration: .65,
      asset: 'runtime/assets/chibi-v01/tangseng/front.png', skills: [
        { id: 'small', name: '金掌破障', icon: '掌', description: '单掌前推，金色掌影伤害目标所在的整条竖列', cd: 6, power: 1.9, range: 20, shape: 'column', windup: .5, duration: 1.1 },
        { id: 'ultimate', name: '金睛梵目', icon: '目', description: '睁眼显现金色双眼虚影，对所有敌人造成伤害', cd: 11, power: 2.7, range: 20, shape: 'all', windup: .8, duration: 1.5 }
      ] },
    bajie: { name: '八戒', role: '坦克', weapon: '九齿钉耙', hp: 2600, attack: 54, defense: 60, interval: 1.35, speed: 1.15, range: 1, radius: .31, attackWindup: .28, attackDuration: .7,
      asset: 'runtime/assets/chibi-v01/bajie/front.png', skills: [
        { id: 'small', name: '肚皮震慑', icon: '拍', description: '拍肚皮并停顿，肚上泛起涟漪，眩晕 1 格内敌人 2 秒', kind: 'stun', stun: 2, cd: 6, range: 1, windup: .45, duration: 1.15 },
        { id: 'ultimate', name: '回味回元', icon: '回', description: '挖鼻屎后将手指放入口中，回复自身 30% 最大生命', kind: 'heal', targetSelf: true, maxHpPercent: .3, cd: 11, range: 0, windup: 1.35, duration: 1.9 }
      ] },
    shaseng: { name: '沙僧', role: '战士', weapon: '月牙铲', hp: 1750, attack: 72, defense: 38, interval: 1.1, speed: 1.45, range: 1, attackArea: { kind: 'around', radius: 1 }, rangeLabel: '身边8格', attackWindup: .26, attackDuration: .65,
      asset: 'runtime/assets/chibi-v01/shaseng/front.png', skills: [
        { id: 'small', name: '横铲退敌', icon: '推', description: '将武器打横前推，把正前方 1 格内敌人击退 1 格', kind: 'push', knockback: 1, cd: 5.5, range: 1, windup: .5, duration: 1.1 },
        { id: 'ultimate', name: '怒吼镇魔', icon: '吼', description: '闭眼转动发光念珠，再睁眼怒吼；伤害全部敌人并击退 1 格', cd: 10.5, power: 2.9, range: 20, shape: 'all', knockback: 1, windup: 1, duration: 1.8 }
      ] },
    bailongma: { name: '白龙马', role: '增益', weapon: '原画鞍具', hp: 1250, attack: 32, defense: 24, interval: 1.5, speed: 1.6, range: 1, attackArea: { kind: 'around', radius: 1 }, rangeLabel: '身边1格·最近队友', attackWindup: .22, attackDuration: .65,
      basic: { kind: 'aura', amount: 30, auraDuration: 2, tick: .5, attackBonus: .2, buffDuration: 2 },
      asset: 'runtime/assets/chibi-v01/bailongma/front.png', skills: [
        { id: 'small', name: '天使光环', icon: '环', description: '眨眼时头顶升起天使光圈，治疗当前生命值最低的同伴', kind: 'heal', lowestHp: true, excludeSelf: true, amount: 200, cd: 5, range: 20, windup: .48, duration: 1.1 },
        { id: 'ultimate', name: '羽翼龙泽', icon: '翼', description: '生出双翼扇动一次，治疗全体存活友军', kind: 'heal', teamWide: true, allTeam: true, amount: 160, cd: 10, range: 20, windup: .8, duration: 1.7 }
      ] }
  };
  const DEFAULT_FORMATION = [
    { id: 'wukong', col: 3, row: 1 }, { id: 'tangseng', col: 1, row: 2 },
    { id: 'bajie', col: 4, row: 2 }, { id: 'shaseng', col: 3, row: 3 }, { id: 'bailongma', col: 1, row: 0 }
  ];
  const tutorialCharacter=id=>({...CHARACTERS[id],...Bone.ROLE_STATS[CHARACTERS[id].role]});
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const withinRange = (a, b, range, tolerance = 0) => (range === 1
    ? Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))
    : distance(a,b)) <= range + tolerance + 1e-8;
  const alive = unit => unit.hp > 0;

  // Model x is portrait forward/back; y is the five screen columns. Units turn
  // toward targets that pass them; the footprint follows that facing.
  function inAttackRange(unit, target, position = unit) {
    if (unit.isClone && target.id === unit.anchorId) return true;
    const area = unit.attackArea;
    if (!area) return withinRange(position,target,unit.range);
    const dx = (target.x-position.x) * (unit.facing || (unit.team==='enemy'?-1:1)), dy = Math.abs(target.y-position.y);
    if (area.kind === 'around') return Math.max(Math.abs(dx),dy) <= area.radius + 1e-8;
    if (area.kind === 'pyramid') return dx > 1e-8 && dx + dy <= area.rows + 1e-8;
    return dx > 1e-8 && (area.rows === null || dx <= area.rows + 1e-8) && dy <= (area.columns-1)/2 + 1e-8;
  }
  function attackCells(unit) {
    const cells=[];
    for(let col=0;col<Grid.WIDTH;col++)for(let row=0;row<Grid.HEIGHT;row++){
      const target={x:col+.5,y:row+.5};
      if((Math.abs(target.x-unit.x)>1e-8||Math.abs(target.y-unit.y)>1e-8)&&inAttackRange(unit,target))cells.push({col,row});
    }
    return cells;
  }
  function effectiveAttack(unit, time) {
    return unit.attack * (unit.attackBuff && unit.attackBuff.expiresAt > time + 1e-8 ? 1 + unit.attackBuff.percent : 1);
  }

  function emit(battle, type, text, detail = {}) {
    battle.events.push({ seq: ++battle.seq, time: battle.time, type, text, ...detail });
    if (battle.events.length > 120) battle.events.shift();
  }

  function makeUnit(data) {
    return { range: 1, radius: .28, defense: 0, interval: 1, speed: 1,
      facing: data.team === 'ally' ? 1 : -1, action: null, moving: false, targetId: null,
      stunnedUntil: 0, attackReadyAt: 0, shield: 0, shieldUntil: 0, skills: [],
      stats: { damage: 0, damageTaken: 0, healing: 0, shielding: 0, small: 0, ultimate: 0, attacks: 0 }, ...data, maxHp: data.hp,
      cell: { col: Math.floor(data.x), row: Math.floor(data.y) }, move: null };
  }

  function createBattle({ preset = 'practice', col = 3, row = 2, formation } = {}) {
    if (!Object.hasOwn(PRESETS, preset)) throw new RangeError('Unknown encounter');
    const placements = formation === undefined ? [{ id: 'wukong', col, row }] : formation;
    if (!Array.isArray(placements) || placements.length < 1 || placements.length > 5) throw new RangeError('Deploy one to five allies');
    const ids = new Set(), cells = new Set();
    const allies = placements.map(placement => {
      if (!Object.hasOwn(CHARACTERS, placement.id) || ids.has(placement.id)) throw new RangeError('Invalid or duplicate character');
      if (!Number.isInteger(placement.col) || !Number.isInteger(placement.row) || placement.col < 0 || placement.col > 4 || placement.row < 0 || placement.row > 4) throw new RangeError('Allies must deploy in the allied 5 × 5 area');
      const cell = `${placement.col},${placement.row}`;
      if (cells.has(cell)) throw new RangeError('Deployment squares must be unique');
      ids.add(placement.id); cells.add(cell);
      const definition = preset==='bones'?tutorialCharacter(placement.id):CHARACTERS[placement.id];
      return makeUnit({ ...definition, characterId: placement.id, id: placement.id, team: 'ally', x: placement.col + .5, y: placement.row + .5,
        skills: definition.skills.map(skill => ({ kind: 'damage', ...skill, readyAt: skill.cd })) });
    });
    const battle = { preset, status: 'ready', time: 0, seq: 0, cloneSeq: 0, events: [], effects: [], auras: [],
      projectiles:[],units: [...allies, ...PRESETS[preset].enemies.map(enemy => makeUnit({ ...enemy, team: 'enemy',skills:(enemy.skills||[]).map(s=>({...s,readyAt:s.cd})) }))],
      result: null, stats: { damage: 0, healing: 0, small: 0, ultimate: 0, attacks: 0 } };
    emit(battle, 'prepare', '布阵后开始试练。');
    return battle;
  }

  function startBattle(battle) {
    if (battle.status !== 'ready') return false;
    battle.status = 'running';
    emit(battle, 'start', '战斗开始，双方自动寻找目标。');
    return true;
  }

  function setPaused(battle, paused) {
    if (paused && battle.status === 'running') battle.status = 'paused';
    else if (!paused && battle.status === 'paused') battle.status = 'running';
  }

  function nearestEnemy(battle, unit) {
    const enemies = battle.units.filter(other => other.team !== unit.team && alive(other));
    // Keep a valid target already in range to avoid unnecessary target switching.
    const oldTarget = enemies.find(other => other.id === unit.targetId);
    if (oldTarget && inAttackRange(unit, oldTarget)) return oldTarget;
    if(unit.role==='坦克'&&!enemies.some(other=>inAttackRange(unit,other))){const front=tankFrontEnemies(battle,unit);if(front.length)return front.sort((a,b)=>distance(unit,a)-distance(unit,b)||a.id.localeCompare(b.id))[0];}
    return enemies.sort((a, b) => Number(inAttackRange(unit,b))-Number(inAttackRange(unit,a)) || distance(unit, a) - distance(unit, b) || a.id.localeCompare(b.id))[0];
  }
  function tankFrontEnemies(battle,unit){
    const forward=unit.team==='ally'?1:-1;
    return battle.units.filter(other=>other.team!==unit.team&&alive(other)&&(other.x-unit.x)*forward>1e-8&&Math.abs(other.y-unit.y)<=1+1e-8);
  }

  function teamReport(battle,team){
    const rows=new Map(),keys=['damage','damageTaken','healing','shielding'];
    for(const u of battle.units.filter(u=>u.team===team&&!u.isClone))rows.set(u.id,{id:u.id,name:u.name,role:u.role,hp:u.hp,maxHp:u.maxHp,damage:0,damageTaken:0,healing:0,shielding:0});
    for(const u of battle.units.filter(u=>u.team===team)){const row=rows.get(u.ownerId||u.id);if(row)for(const key of keys)row[key]+=u.stats[key]||0;}
    for(const row of rows.values())row.sustain=row.healing+row.shielding;
    return{rows:[...rows.values()].sort((a,b)=>b.damage-a.damage||a.id.localeCompare(b.id)),totals:[...rows.values()].reduce((s,u)=>{for(const key of [...keys,'sustain'])s[key]+=u[key];return s;},{damage:0,damageTaken:0,healing:0,shielding:0,sustain:0})};
  }

  function nearestAlly(battle, unit) {
    return battle.units.filter(other => other.team === unit.team && other.id !== unit.id && alive(other))
      .sort((a,b) => distance(unit,a)-distance(unit,b) || a.id.localeCompare(b.id))[0];
  }

  function finishIfNeeded(battle) {
    removeOrphanClones(battle);
    const allies = battle.units.some(unit => unit.team === 'ally' && alive(unit));
    const enemies = battle.units.some(unit => unit.team === 'enemy' && alive(unit));
    if (allies && enemies && battle.time < 90) return false;
    battle.status = !allies ? 'lost' : !enemies ? 'won' : 'timeout';
    battle.result = { status: battle.status, time: battle.time, ...battle.stats };
    battle.units.forEach(unit => { if (!unit.airborne) Grid.settle(unit,alive(unit)); unit.action = null; });
    emit(battle, 'result', battle.status === 'won' ? '试练成功，敌人已全部击败。' : battle.status === 'lost' ? '我方已全部倒下，可以调整站位重试。' : '试练到达 90 秒时限，可以重试。');
    return true;
  }

  function damage(battle, source, target, raw, kind, stun = 0, reflected = false) {
    if (!alive(target)) return;
    let incoming = Math.max(1, Math.round(raw * 100 / (100 + target.defense)));
    const guarded=Bone.guarding(battle,target);if(guarded)incoming=Math.max(1,Math.round(incoming*(1-Bone.SETTINGS.reduction)));
    const absorbed = Math.min(target.shield, incoming);
    target.shield -= absorbed;
    if(absorbed>0){const giver=battle.units.find(u=>u.id===target.shieldSourceId)||target;giver.stats.shielding=(giver.stats.shielding||0)+absorbed;}
    const amount = Math.min(target.hp, incoming - absorbed);
    target.hp -= amount;
    target.stats.damageTaken=(target.stats.damageTaken||0)+amount;
    source.stats.damage += amount;
    if (source.team === 'ally'&&target.team!==source.team) battle.stats.damage += amount;
    battle.effects.push({ id: ++battle.seq, type: 'damage', x: target.x, y: target.y, airborne: !!target.airborne,
      amount, absorbed, kind, team: target.team, start: battle.time, expires: battle.time + .8 });
    emit(battle, 'damage', `${source.name}对${target.name}造成 ${amount} 点伤害。`, { sourceId: source.id, targetId: target.id, amount, absorbed, kind });
    if (!alive(target)) {
      target.action = null; if (!target.airborne) Grid.settle(target,false);
      emit(battle, 'defeat', `${target.name}被击败。`, { targetId: target.id });
      removeOrphanClones(battle);
    } else if (stun > 0) {
      target.stunnedUntil = Math.max(target.stunnedUntil, battle.time + stun);
      target.action = null;
    }
    if(guarded&&!reflected&&alive(source)&&amount>0){damage(battle,target,source,amount*Bone.SETTINGS.reflect,'reflect',0,true);battle.effects.push({id:++battle.seq,type:'reflect',x:source.x,y:source.y,fromX:target.x,fromY:target.y,start:battle.time,expires:battle.time+.4});}
    return amount;
  }

  function heal(battle, source, target, amount, kind) {
    if (!alive(target)) return;
    const restored = Math.min(target.maxHp - target.hp, amount);
    if (restored <= 0) return;
    target.hp += restored;
    source.stats.healing += restored;
    if (source.team === 'ally') battle.stats.healing += restored;
    battle.effects.push({ id: ++battle.seq, type: 'heal', x: target.x, y: target.y,
      amount: restored, kind, start: battle.time, expires: battle.time + .8 });
    emit(battle, 'heal', `${source.name}为${target.name}恢复 ${restored} 点生命。`, { sourceId: source.id, targetId: target.id, amount: restored });
  }

  function skillTarget(battle, unit, skill, enemy) {
    if (skill.kind === 'summon' && unit.isClone) return null;
    if (skill.kind === 'shield') return unit.shield <= 0 ? unit : null;
    if (skill.kind === 'heal' && skill.targetSelf) return unit.hp < unit.maxHp ? unit : null;
    if (skill.kind === 'push') return frontEnemies(battle,unit)[0] || null;
    if (skill.kind === 'heal') return battle.units.filter(other => other.team === unit.team && alive(other) && (!skill.excludeSelf || other.id !== unit.id)
      && other.hp < other.maxHp && withinRange(unit,other,skill.range))
      .sort((a,b) => (skill.lowestHp ? a.hp-b.hp : a.hp / a.maxHp - b.hp / b.maxHp) || a.id.localeCompare(b.id))[0];
    return enemy && (unit.characterId === 'wukong' ? inAttackRange(unit,enemy) : withinRange(unit,enemy,skill.range)) ? enemy : null;
  }

  function frontEnemies(battle,unit){return battle.units.filter(other=>other.team!==unit.team&&alive(other)
    && (other.x-unit.x)*unit.facing>0 && (other.x-unit.x)*unit.facing<=1.0001 && Math.abs(other.y-unit.y)<.5);}
  function knockback(battle,source,target){
    if(!alive(target)||target.airborne)return;
    const dx=target.x-source.x,dy=target.y-source.y,alongX=Math.abs(dx)>=Math.abs(dy);
    const destination={col:target.cell.col+(alongX?(Math.sign(dx)||source.facing):0),row:target.cell.row+(alongX?0:Math.sign(dy))};
    if(destination.col<0||destination.col>=Grid.WIDTH||destination.row<0||destination.row>=Grid.HEIGHT||Grid.occupied(battle,target.id).has(destination.col+','+destination.row))return;
    target.action=null;Grid.push(target,destination);
    emit(battle,'knockback',`${source.name}将${target.name}击退 1 格。`,{sourceId:source.id,targetId:target.id,from:{...target.cell},to:destination});
  }
  function tickAuras(battle){
    battle.auras=battle.auras.filter(a=>a.expires>=battle.time&&battle.units.some(u=>u.id===a.sourceId&&alive(u)));
    for(const aura of battle.auras){const source=battle.units.find(u=>u.id===aura.sourceId);
      while(aura.nextTick<=battle.time+1e-8&&aura.nextTick<=aura.expires){
        for(const ally of battle.units.filter(u=>u.team===source.team&&u.id!==source.id&&alive(u)&&Math.max(Math.abs(u.x-source.x),Math.abs(u.y-source.y))<=1.0001))heal(battle,source,ally,aura.amount,'attack');
        aura.nextTick+=aura.tick;
      }
    }
  }

  function removeOrphanClones(battle) {
    for (const clone of battle.units) {
      if (!clone.isClone || !alive(clone)) continue;
      const owner = battle.units.find(unit => unit.id === clone.ownerId);
      if (owner && alive(owner)) continue;
      clone.hp = 0; clone.action = null; clone.move = null; clone.moving = false;
      emit(battle, 'despawn', '本体倒下，毫毛分身随之消散。', { targetId: clone.id });
    }
  }

  function followAnchor(battle, clone) {
    let target = battle.units.find(unit => unit.id === clone.anchorId && alive(unit));
    if (!target) target = nearestEnemy(battle, clone);
    if (!target) return;
    clone.anchorId = target.id; clone.x = target.x; clone.y = target.y;
    clone.cell = { ...target.cell }; clone.move = null;
  }

  function summonClone(battle, owner, target) {
    if (owner.isClone || !alive(owner)) return;
    const clone = makeUnit({ ...CHARACTERS.wukong, id: `wukong-clone-${++battle.cloneSeq}`, characterId: 'wukong',
      name: '悟空虚影', team: owner.team, isClone: true, airborne: true, ownerId: owner.id, anchorId: target.id,
      x: target.x, y: target.y, hp: owner.maxHp * .1, attack: owner.attack * .3, defense: owner.defense,
      interval: owner.interval, range: owner.range, speed: 0, attackReadyAt: battle.time + .2,
      skills: owner.skills.filter(skill => skill.kind !== 'summon').map(skill => ({ ...skill, readyAt: battle.time + skill.cd })) });
    battle.units.push(clone);
    battle.effects.push({ id: ++battle.seq, type: 'summon', x: target.x, y: target.y, start: battle.time, expires: battle.time + .8 });
    emit(battle, 'summon', '一根毫毛化作祥云虚影，悬于敌人头顶。', { sourceId: owner.id, targetId: target.id, cloneId: clone.id });
  }

  function resolveAction(battle, unit) {
    if(Bone.resolve(battle,unit,api))return;
    const action = unit.action;
    if (!action) return;
    if (!action.landed && battle.time + 1e-8 >= action.hitAt) {
      action.landed = true;
      if(action.kind==='aura'){
        const old= battle.auras.find(a=>a.sourceId===unit.id);
        if(old)old.expires=battle.time+action.auraDuration;
        else battle.auras.push({sourceId:unit.id,amount:action.amount,tick:action.tick,expires:battle.time+action.auraDuration,nextTick:battle.time});
        // A basic hit refreshes one bonus, independent of the healing ticks.
        // Base attack is never mutated, so repeated basic actions cannot compound it.
        for(const ally of battle.units.filter(other=>other.team===unit.team&&other.id!==unit.id&&alive(other)&&inAttackRange(unit,other))){
          ally.attackBuff={percent:action.attackBonus,expiresAt:battle.time+action.buffDuration,sourceId:unit.id};
          battle.effects.push({id:++battle.seq,type:'buff',x:ally.x,y:ally.y,amount:Math.round(action.attackBonus*100),start:battle.time,expires:battle.time+.8});
          emit(battle,'buff',`${unit.name}使${ally.name}攻击力增加 ${Math.round(action.attackBonus*100)}%，持续 ${action.buffDuration} 秒。`,{sourceId:unit.id,targetId:ally.id,percent:action.attackBonus});
        }
      }
      if(action.kind==='push'){for(const enemy of frontEnemies(battle,unit))knockback(battle,unit,enemy);}
      if(action.shape){
        const victims=battle.units.filter(other=>other.team!==unit.team&&alive(other)&&(action.shape==='all'||Math.floor(other.y)===action.targetColumn));
        battle.effects.push({id:++battle.seq,type:action.shape==='column'?'column':'ultimate',character:unit.id,column:action.targetColumn,x:unit.x,y:unit.y,start:battle.time,expires:battle.time+.85});
        victims.forEach(victim=>{damage(battle,unit,victim,effectiveAttack(unit,battle.time)*action.power,action.type);if(action.knockback)knockback(battle,unit,victim);});
      }
      if (action.kind === 'stun') {
        battle.effects.push({ id: ++battle.seq, type: 'belly', x: unit.x, y: unit.y, radius: action.range, start: battle.time, expires: battle.time + .55 });
        for (const enemy of battle.units.filter(other => other.team !== unit.team && alive(other) && withinRange(unit,other,action.range))) {
          enemy.stunnedUntil = Math.max(enemy.stunnedUntil,battle.time + action.stun);enemy.action = null;
          emit(battle,'stun',`${unit.name}拍肚皮，使${enemy.name}眩晕 ${action.stun} 秒。`,{sourceId:unit.id,targetId:enemy.id,duration:action.stun});
        }
      }
      const target = action.kind==='heal'&&action.allTeam?unit:battle.units.find(other => other.id === action.targetId && alive(other));
      const reaches = target && (action.useAttackArea ? inAttackRange(unit,target) : withinRange(unit,target,action.range,action.range===1?0:.2));
      if (!action.shape && !['stun','push','aura'].includes(action.kind) && reaches) {
        if (action.type === 'ultimate' && action.kind !== 'summon') {
          const anchor = action.kind === 'heal' ? unit : target;
          battle.effects.push({id:++battle.seq,type:'ultimate',character:unit.id,x:anchor.x,y:anchor.y,
            start:battle.time,expires:battle.time+.72});
        }
        if (action.kind === 'summon') {
          summonClone(battle, unit, target);
        } else if (action.kind === 'shield') {
          target.shield = action.amount; target.shieldUntil = battle.time + action.shieldDuration;target.shieldSourceId=unit.id;
          battle.effects.push({ id: ++battle.seq, type: 'shield', x: target.x, y: target.y,
            amount: action.amount, start: battle.time, expires: battle.time + .8 });
        } else if (action.kind === 'heal') {
          const patients = action.teamWide ? battle.units.filter(other => other.team === unit.team && alive(other) && (action.allTeam || distance(unit,other) <= action.range)) : [target];
          patients.forEach(patient => heal(battle,unit,patient,action.amount,action.type));
        } else if (action.radius) {
          const victims = battle.units.filter(other => other.team !== unit.team && alive(other) && distance(other, target) <= action.radius);
          if (action.type !== 'ultimate') battle.effects.push({ id: ++battle.seq, type: 'sweep', x: target.x, y: target.y,
            radius: action.radius, start: battle.time, expires: battle.time + .5 });
          victims.forEach(victim => damage(battle, unit, victim, effectiveAttack(unit,battle.time) * action.power, action.type));
        } else {
          if (unit.characterId === 'wukong') battle.effects.push({ id: ++battle.seq,
            type: action.type === 'attack' ? 'punch' : 'slam', x: action.type === 'attack' ? target.x : unit.x, y: action.type === 'attack' ? target.y : unit.y,
            airborne: action.type === 'attack' ? !!target.airborne : !!unit.airborne,
            start: battle.time, expires: battle.time + .4 });
          damage(battle, unit, target, effectiveAttack(unit,battle.time) * action.power, action.type, action.stun);
        }
      }
    }
    if (battle.time + 1e-8 >= action.endsAt) unit.action = null;
  }

  function beginAction(battle, unit, target, skill) {
    const behavior=skill||unit.basic||{};
    const type = skill ? skill.id : 'attack';
    const windup = skill ? skill.windup : unit.attackWindup || .18;
    unit.action = { type, targetId: target.id, startedAt: battle.time, hitAt: battle.time + windup,
      endsAt: battle.time + (skill ? skill.duration : unit.attackDuration || .46), landed: false,
      power: skill ? skill.power : 1, range: skill ? skill.range : unit.range,
      useAttackArea: !skill || unit.characterId === 'wukong',
      radius: skill?.radius || 0, stun: skill?.stun || 0, kind: behavior.kind || 'damage',
      shape:behavior.shape,targetColumn:Math.floor(target.y),knockback:behavior.knockback||0,
      auraDuration:behavior.auraDuration,tick:behavior.tick,allTeam:behavior.allTeam||false,
      attackBonus:behavior.attackBonus||0,buffDuration:behavior.buffDuration||0,
      amount: behavior.maxHpPercent ? Math.round(unit.maxHp * behavior.maxHpPercent) : behavior.amount || 0, teamWide: behavior.teamWide || false, shieldDuration: behavior.shieldDuration || 0 };
    unit.moving = false;
    if (skill) {
      skill.readyAt = battle.time + skill.cd;
      if (unit.team === 'ally') battle.stats[type]++;
      unit.stats[type]++;
      emit(battle, 'skill', `${unit.name}自动释放「${skill.name}」。`, { sourceId: unit.id, skillId: type });
    } else {
      unit.attackReadyAt = battle.time + unit.interval;
      if (unit.team === 'ally') battle.stats.attacks++;
      unit.stats.attacks++;
    }
  }

  function moveTowards(battle, unit, target) {
    if (unit.airborne) return;
    if (unit.speed <= 0) return;
    if(unit.role==='坦克'&&tankFrontEnemies(battle,unit).length){
      const next={col:unit.cell.col+(unit.team==='ally'?1:-1),row:unit.cell.row};
      if(next.col>=0&&next.col<Grid.WIDTH&&!Grid.occupied(battle,unit.id).has(next.col+','+next.row))Grid.begin(unit,next);
      return;
    }
    const support=unit.basic?.kind==='aura';
    const alternatives = battle.units.filter(other => (support ? other.team === unit.team && other.id !== unit.id : other.team !== unit.team) && alive(other) && other.id !== target.id)
      .sort((a,b) => distance(unit,a) - distance(unit,b));
    for (const candidate of [target,...alternatives]) {
      const next = Grid.nextCell(battle,unit,candidate,unit.range,(position,goal)=>inAttackRange({...unit,facing:Math.sign(goal.x-position.x)||unit.facing},{...candidate,...goal},position));
      if (next) { unit.targetId = candidate.id; Grid.begin(unit,next); return; }
    }
  }

  function step(battle, dt) {
    if (battle.status !== 'running') return;
    if (!Number.isFinite(dt) || dt <= 0 || dt > .05) throw new RangeError('Use a fixed step of at most 0.05 seconds');
    battle.time += dt;
    if (finishIfNeeded(battle)) return;
    battle.effects = battle.effects.filter(effect => effect.expires > battle.time);
    for (const unit of [...battle.units]) {
      unit.moving = false;
      if (unit.shield > 0 && unit.shieldUntil <= battle.time) unit.shield = 0;
      if (unit.attackBuff && unit.attackBuff.expiresAt <= battle.time + 1e-8) unit.attackBuff = null;
      if (!alive(unit)) continue;
      if (unit.stunnedUntil > battle.time) { unit.action = null; continue; }
      if (unit.move) Grid.advance(unit,dt);
    }
    for (const clone of battle.units.filter(unit => unit.isClone && alive(unit))) followAnchor(battle, clone);
    tickAuras(battle);Bone.tick(battle,dt,api);
    for (const unit of [...battle.units]) {
      if (!alive(unit) || unit.stunnedUntil > battle.time || unit.move) continue;
      resolveAction(battle, unit);
      if (finishIfNeeded(battle)) return;
    }
    for (const unit of [...battle.units]) {
      if (!alive(unit) || unit.stunnedUntil > battle.time || unit.action || unit.move) continue;
      if(Bone.betray(battle,unit,api)||Bone.turn(battle,unit,api))continue;
      const support=unit.basic?.kind==='aura', enemy=nearestEnemy(battle,unit);
      const target = support ? nearestAlly(battle,unit) : enemy;
      unit.targetId = target?.id || null;
      if (target && Math.abs(target.x - unit.x) > .02) unit.facing = target.x > unit.x ? 1 : -1;
      // If both skills are ready, the ultimate gets priority; readiness waits for a valid target.
      const skill = [...unit.skills].reverse().find(candidate => battle.time + 1e-8 >= candidate.readyAt && skillTarget(battle,unit,candidate,enemy));
      if (skill) beginAction(battle, unit, skillTarget(battle,unit,skill,enemy), skill);
      else if (!target) continue;
      else if (inAttackRange(unit,target)) {
        if (battle.time + 1e-8 >= unit.attackReadyAt) beginAction(battle, unit, target);
      } else moveTowards(battle, unit, target);
    }
  }

  const api={damage,heal,emit,Grid,effectiveAttack,beginAction,nearestEnemy,inAttackRange,moveTowards};
  return { PRESETS, SKILLS, CHARACTERS, DEFAULT_FORMATION, createBattle, startBattle, setPaused, step, distance, inAttackRange, attackCells, effectiveAttack,tutorialCharacter,teamReport,Bone,testing:{damage,heal,beginAction,resolveAction,tankFrontEnemies} };
});
