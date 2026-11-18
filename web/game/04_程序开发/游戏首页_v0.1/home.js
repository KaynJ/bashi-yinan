/* Homepage, local records and the first existing playable entry. No battle rules are changed. */
(() => {
  'use strict';
  const M = HomeModel, $ = selector => document.querySelector(selector);
  const icons = {
    journey: '<path d="M12 2 19 8 17 18 12 22 7 18 5 8Z"/><path d="m12 6 3 6-3 6-3-6Z"/>',
    save: '<path d="M6 3h12v18H6zM9 3v6h6V3M9 14h6M9 17h4"/>',
    book: '<path d="M3 5c4-1 6-1 9 1 3-2 5-2 9-1v15c-4-1-6-1-9 1-3-2-5-2-9-1Z"/><path d="M12 6v15M6 9h3M15 9h3M6 12h3M15 12h3"/>',
    mountain: '<path d="m2 19 7-13 4 7 3-10 6 16ZM6 12l3 2 2-2M14 9l2 2 2-2M2 22h20"/>',
    settings: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    scroll: '<path d="M5 3h14M7 3v18h12V6M4 3v3h3M7 18H4v3h15M10 8h6M10 11h6M10 14h4"/>',
    sound: '<path d="M3 9h4l5-4v14l-5-4H3ZM16 8c2 2 2 6 0 8M19 5c4 4 4 10 0 14"/>',
    muted: '<path d="M3 9h4l5-4v14l-5-4H3ZM16 9l5 6M21 9l-5 6"/>',
    fullscreen: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
    collapse: '<path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const difficultyName = id => M.DIFFICULTIES.find(d => d.id === id)?.name || '行者';
  const dateLabel = value => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const bg = $('#background-video'), panel = $('#panel'), content = $('#panel-content'), story = $('#story-video');
  let campaign = null;
  let state, storageBlocked = false, storageMessage = '', returnFocus = null, currentPanel = '', currentTab = '', selectedEntry = 0;
  let draftSettings, draftDifficulty, startSlot = 0, startDifficulty, importPending = null, toastTimer, transitioning = false, audioContext;
  const reducedPreference = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { state = M.restore(localStorage.getItem(M.KEY)); }
  catch (error) { state = M.fresh(); storageBlocked = true; storageMessage = error.message; }
  if (reducedPreference && !localStorageReadable()) state.settings.reduced = true;
  function localStorageReadable() { try { return !!localStorage.getItem(M.KEY); } catch { return false; } }
  function toast(message) {
    clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500);
  }
  function persist() {
    if (storageBlocked) { toast('本地记录暂不可写。旅程只在本次打开期间保留，可通过“读取存档”导出。'); return false; }
    try { localStorage.setItem(M.KEY, JSON.stringify(state)); return true; }
    catch { toast('浏览器未能保存记录。请在“读取存档”中导出备份。'); return false; }
  }
  function effect() {
    if (!state.settings.sound || !state.settings.effects || !state.settings.master) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume().catch(() => {});
      const t = audioContext.currentTime, oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(620, t); oscillator.frequency.exponentialRampToValueAtTime(420, t + .11);
      gain.gain.setValueAtTime(.045 * state.settings.master / 100 * state.settings.effects / 100, t); gain.gain.exponentialRampToValueAtTime(.001, t + .15);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(t); oscillator.stop(t + .16);
    } catch { /* Audio support is optional. */ }
  }
  function applySettings(settings = state.settings) {
    document.documentElement.style.setProperty('--text-scale', settings.textSize / 100);
    document.documentElement.style.setProperty('--scene-brightness', settings.brightness / 100);
    document.body.classList.toggle('reduced-motion', settings.reduced || reducedPreference);
    document.body.classList.toggle('high-contrast', settings.contrast);
    bg.volume = settings.master * settings.ambience / 10000;
    bg.muted = !settings.sound;
    story.volume = settings.master / 100; story.muted = !settings.narration;
    campaign?.settingsChanged(settings);
    $('#sound-toggle').innerHTML = icon(settings.sound ? 'sound' : 'muted');
    $('#sound-toggle').setAttribute('aria-label', settings.sound ? '关闭背景声音' : '开启背景声音');
    $('#sound-toggle').title = settings.sound ? '关闭背景声音' : '开启背景声音';
    if (!settings.animated || settings.reduced || reducedPreference || document.hidden || !$('#story-stage').hidden || !$('#battle-stage').hidden || !$('#world-stage').hidden) bg.pause();
    else bg.play().catch(() => { if (!bg.muted) { bg.muted = true; bg.play().catch(() => {}); } });
    bg.style.opacity = settings.animated && !settings.reduced && !reducedPreference ? '1' : '0';
  }
  function tabs(names, selected) {
    return `<div class="tabs" role="tablist" aria-label="分类">${names.map(([id, label, count]) => `<button class="tab" role="tab" id="tab-${id}" aria-controls="tab-body" data-action="tab" data-id="${id}" aria-selected="${id === selected}" tabindex="${id === selected ? '0' : '-1'}">${label}${count ? `<span class="tab-count">${count}</span>` : ''}</button>`).join('')}</div>`;
  }
  function tabBody(html) { return `<div id="tab-body" role="tabpanel" aria-labelledby="tab-${currentTab}">${html}</div>`; }
  function footer(note, actions = '') { return `<div class="panel-footer"><p class="note">${note}</p><div class="actions">${actions}</div></div>`; }
  const button = (label, action, style = 'solid-button', attributes = '') => `<button class="${style}" data-action="${action}" ${attributes}>${label}</button>`;
  function showPanel(type, options = {}) {
    const wasOpen = panel.open;
    if (!wasOpen) returnFocus = document.activeElement;
    currentPanel = type;
    const titles = { start: ['新旅程 / 起卷', '开始游戏'], saves: ['旅程记录 / 续卷', '读取存档'], codex: ['沿途所见 / 万象', '图鉴收集'], difficulty: ['行路之道 / 步调', '难度调整'], settings: ['此间天地 / 偏好', '系统设置'], guide: ['行前手记 / 入门', '玩法介绍'], confirm: ['旅程记录 / 确认', '请确认'] };
    const [eyebrow, title] = titles[type]; $('#panel-eyebrow').textContent = eyebrow; $('#panel-title').textContent = title;
    if (type === 'start') { startSlot = options.slot ?? state.slots.findIndex(s => !s); if (startSlot < 0) startSlot = 0; startDifficulty = state.difficulty; renderStart(); }
    if (type === 'saves') renderSaves();
    if (type === 'codex') { currentTab = 'heroes'; selectedEntry = 0; renderCodex(); }
    if (type === 'difficulty') { draftDifficulty = state.difficulty; renderDifficulty(); }
    if (type === 'settings') { draftSettings = { ...state.settings }; currentTab = 'display'; renderSettings(); }
    if (type === 'guide') { currentTab = 'journey'; renderGuide(); }
    content.scrollTop = 0;
    if (!wasOpen) panel.showModal();
  }
  function closePanel() {
    if (currentPanel === 'settings') applySettings();
    panel.close(); currentPanel = ''; draftSettings = null;
    returnFocus?.focus({ preventScroll: true });
  }
  function renderStart() {
    content.innerHTML = `<p class="intro-quote">此去山海，前路未名。</p><div class="start-layout"><div class="start-copy"><img class="start-art" src="assets/home-poster.jpg" alt="夕照下，师徒五人沿山脊西行"><h3>你是此间的守护者。</h3><p>西行尚在继续，一场变故却将悄然到来。<br>从天庭的一盏清酌开始，走入这段未曾写下的西游。</p><div class="journey-steps">序章剧情 <b>→</b> 白骨岭教学 <b>→</b> 此后山海</div></div><div><p class="section-label">为这段旅程，留下一卷</p><div class="slot-choices">${state.slots.map((s, i) => `<button class="slot-choice" data-action="choose-slot" data-slot="${i}" aria-pressed="${startSlot === i}"><span class="slot-bullet"></span>第${['一', '二', '三'][i]}卷 <small>${s ? escape(M.PHASES[s.phase]) : '空白旅程'}</small></button>`).join('')}</div><div class="start-options"><label for="new-difficulty">旅程难度</label><select id="new-difficulty">${M.DIFFICULTIES.map(d => `<option value="${d.id}" ${d.id === startDifficulty ? 'selected' : ''}>${d.name}${d.id === 'standard' ? ' · 推荐' : ''}</option>`).join('')}</select></div><p class="note" style="margin-top:13px">${state.slots[startSlot] ? '此卷已有旅程。启程前会再次确认是否替换。' : '新的旅程将记录在此卷，不影响其他卷。'}<br>序章教学采用固定配置，难度偏好随此旅程记录。</p></div></div>${footer('在剧情节点记录进度。教学战的存档将从布阵阶段继续。', button('再想一想', 'close', 'outline-button') + button('启程 <span>→</span>', 'begin'))}`;
  }
  function renderSaves() {
    content.innerHTML = `<p class="panel-lead">每一卷都是一段独立的西行。选择一卷，续上未完的故事。</p><div class="save-list">${state.slots.map((s, i) => `<article class="save-card ${s ? '' : 'empty'}"><div class="save-no">${['壹', '贰', '叁'][i]}</div><div>${s ? `<p class="save-status">${state.activeSlot === i ? '最近旅程' : '旅程记录'}</p><h3>${M.PHASES[s.phase]}</h3><div class="save-meta"><span>难度 · ${difficultyName(s.difficulty)}</span><span>${escape(dateLabel(s.updatedAt))}</span></div>${s.phase === 'tutorial' ? '<p class="save-empty-note">继续后，从教学布阵开始。</p>' : ''}` : `<h3>尚无旅程</h3><p class="save-empty-note">这一卷，正等着你的故事。</p>`}</div><div class="save-actions">${s ? button('导出', 'export', 'text-button', `data-slot="${i}" aria-label="导出第${i + 1}卷"`) + button('删除', 'delete', 'text-button danger-button', `data-slot="${i}" aria-label="删除第${i + 1}卷"`) + button('继续旅程 →', 'load', 'solid-button', `data-slot="${i}"`) : button('开启旅程', 'new-in-slot', 'outline-button', `data-slot="${i}"`)}</div></article>`).join('')}</div>${footer('存档保存在当前浏览器。清理浏览器数据前，可先导出旅程备份。', button('导入存档', 'import', 'outline-button') + button('返回', 'close'))}`;
  }
  function renderDifficulty() {
    content.innerHTML = `<p class="panel-lead">以自己的步调西行。选择适合你的挑战，故事同样完整。</p><div class="difficulty-grid">${M.DIFFICULTIES.map(d => `<button class="difficulty-card" data-action="choose-difficulty" data-id="${d.id}" aria-pressed="${d.id === draftDifficulty}"><span class="difficulty-glyph">${d.glyph}</span>${d.id === draftDifficulty ? '<span class="selection-indicator" aria-hidden="true">◈</span>' : ''}<h3>${d.name}${d.id === 'standard' ? '<span class="tag">推荐</span>' : ''}</h3><p>${d.summary}</p><ul>${d.features.map(f => `<li>${f}</li>`).join('')}</ul></button>`).join('')}</div><p class="difficulty-note">此处设置新旅程的默认难度，已有旅程保留各自的记录。序章教学战采用固定配置，方便认识职业与技能。</p>${footer(`当前默认：${difficultyName(state.difficulty)}。`, button('取消', 'close', 'outline-button') + button('保存选择', 'save-difficulty'))}`;
  }
  const range = (label, help, key, min = 0, max = 100) => `<div class="setting-row"><div><label for="setting-${key}">${label}</label><small>${help}</small></div><div class="setting-control"><input id="setting-${key}" type="range" min="${min}" max="${max}" step="1" value="${draftSettings[key]}" data-setting="${key}"><output for="setting-${key}" id="output-${key}">${draftSettings[key]}%</output></div></div>`;
  const toggle = (label, help, key) => `<div class="setting-row"><div><strong id="label-${key}">${label}</strong><small>${help}</small></div><div class="setting-control"><label class="switch-label"><input type="checkbox" role="switch" aria-labelledby="label-${key}" data-setting="${key}" ${draftSettings[key] ? 'checked' : ''}><span>${draftSettings[key] ? '开启' : '关闭'}</span></label></div></div>`;
  function renderSettings() {
    let html = '';
    if (currentTab === 'display') html = range('画面亮度', '调整首页动态背景的明暗。', 'brightness', 65, 120) + toggle('动态背景', '循环播放夕照山脊；关闭后显示静态画面。', 'animated') + toggle('减少动态效果', reducedPreference ? '系统已启用减少动态效果，当前优先遵循系统偏好。' : '静止首页背景，简化界面与转场动画。', 'reduced') + `<div class="setting-row"><div><strong>显示模式</strong><small>全屏欣赏此间山海。</small></div><div class="setting-control">${button(document.fullscreenElement ? '退出全屏' : '进入全屏', 'fullscreen', 'outline-button')}</div></div>`;
    if (currentTab === 'audio') html = toggle('首页声音', '首页首次进入默认静音，可在右上角快速开启。', 'sound') + toggle('剧情原声', '播放剧情视频自带的声音。', 'narration') + range('主音量', '首页环境声、界面提示音与剧情声音。', 'master') + range('首页环境声', '使用夕照山脊原片自带的声音。', 'ambience') + range('界面提示音', '点击菜单时的轻提示。', 'effects');
    if (currentTab === 'interface') html = `<div class="setting-row"><div><label for="setting-textSize">界面字号</label><small>调整菜单窗口中的文字大小。</small></div><div class="setting-control"><select id="setting-textSize" data-setting="textSize">${[100, 110, 120].map(n => `<option value="${n}" ${draftSettings.textSize === n ? 'selected' : ''}>${n}% ${n === 100 ? '· 标准' : n === 110 ? '· 较大' : '· 大号'}</option>`).join('')}</select></div></div>` + toggle('文字增强对比', '提升提示与窗口文字的可读性。', 'contrast') + `<div class="guide-callout">西行路远，请按自己的步调前行。<br>预览中的设置将在点击“应用设置”后保存。</div>`;
    content.innerHTML = tabs([['display', '画面'], ['audio', '声音'], ['interface', '界面']], currentTab) + tabBody(`<div class="setting-group">${html}</div>`) + footer('调整后即时预览。取消或关闭窗口会恢复原设置。', button('恢复默认', 'defaults', 'text-button') + button('取消', 'close', 'outline-button') + button('应用设置', 'save-settings'));
  }
  function codexEntries() {
    if (currentTab === 'heroes') return state.slots.some(s => s && ['aftermath','worlds'].includes(s.phase))
      ? [...M.HEROES, {...M.ENEMIES[0], role:'法师', description:'白虎岭一战后，白骨精收起骨扇，加入了西行队伍。'}] : M.HEROES;
    if (currentTab === 'enemies') return M.ENEMIES;
    if (currentTab === 'worlds') return [{ id: 'homeland', name: '西行故土', role: '序章', description: '夕照铺满山脊，师徒仍沿着熟悉的路向西。你以守护者的身份，注视此间天地。', tactic: '从师徒五人的一场战斗开始，认识布阵与自动战斗。' }, { id: 'unknown-world', name: '未历之境', locked: true }];
    return [];
  }
  const heroAsset = id => id === 'bone-boss' ? '../战斗表现小样/白骨精初稿/v0.2/assets/boss/body.png' : `../战斗表现小样/assets/${id === 'wukong' ? 'chibi-hold-v02' : 'chibi-v01'}/${id}/front.png`;
  function renderCodex() {
    const entries = codexEntries(), hasEnemies = state.library.includes('bone');
    const selected = entries[selectedEntry] || entries[0];
    const isLocked = e => e.locked || currentTab === 'enemies' && !hasEnemies;
    const known = entries.filter(e => !isLocked(e)).length;
    let html;
    if (currentTab === 'treasures') html = `<div class="empty-state">${icon('scroll')}<p>宝物有灵，尚待相逢。</p><small>在旅途中获得法宝后，会在这里留下记录。</small></div>`;
    else html = `<div class="codex-layout"><div class="codex-list">${entries.map((e, i) => `<button class="codex-card" data-action="codex-entry" data-index="${i}" aria-pressed="${i === selectedEntry}" aria-label="${isLocked(e) ? '尚未相逢的条目' : e.name}">${currentTab === 'heroes' ? `<img src="${heroAsset(e.id)}" alt="${e.name}" loading="lazy">` : `<span class="locked-art">${isLocked(e) ? '？' : currentTab === 'worlds' ? '山' : '妖'}</span>`}<span class="codex-name">${isLocked(e) ? '尚未相逢' : e.name}</span><small>${isLocked(e) ? '随旅程解锁' : e.role}</small></button>`).join('')}</div><article class="codex-detail" aria-live="polite">${isLocked(selected) ? `<span class="unknown-mark">缘</span><span class="tag">待相逢</span><h3>山海尚远</h3><p style="margin-top:17px">有些名字，要待亲身走过，才能知晓。</p><p class="unlock-note">${currentTab === 'enemies' ? '进入白骨岭教学战后，收录相应敌人。' : '抵达新的世界后，记录将在此展开。'}</p>` : `${currentTab === 'heroes' ? `<img class="hero-art" src="${heroAsset(selected.id)}" alt="${selected.name}全身形象">` : ''}<span class="tag">${currentTab === 'heroes' ? '初识同伴' : '已知记录'}</span><h3>${selected.name}</h3><p class="hero-role">${selected.role}${selected.weapon ? ' / ' + selected.weapon : ''}</p><p>${selected.description}</p><h4>布阵手记</h4><p>${selected.tactic}</p><p class="unlock-note">${currentTab === 'heroes' ? '人物简介可提前查阅；相逢后的经历，将随剧情补记。' : '记录来自已抵达的旅程节点。'}</p>`}</article></div>`;
    content.innerHTML = `<p class="panel-lead">把见过的人、遇过的妖、走过的天地，收进这一本行记。</p>` + tabs([['heroes', '人物志'], ['enemies', '妖怪录'], ['treasures', '法宝集'], ['worlds', '世界志']], currentTab) + tabBody(html) + footer(currentTab === 'treasures' ? '尚未收录法宝。' : `${currentTab === 'heroes' ? '初识' : '已知'} ${known} / ${entries.length} 项。未解锁条目隐藏身份与详情。`, button('合上行记', 'close', 'outline-button'));
  }
  function boardDiagram() {
    const cells = (team, positions) => `<div class="diagram-grid">${Array.from({ length: 25 }, (_, i) => `<span class="${positions[i] ? team : ''}">${positions[i] || ''}</span>`).join('')}</div>`;
    return `<div class="board-diagram" role="img" aria-label="双方各五乘五格的布阵示意。敌方在上，我方在下。八戒和沙僧靠前，悟空在侧翼，唐僧和白龙马靠后。"><div class="diagram-label">敌方阵地 · 5 × 5</div>${cells('enemy', { 2: '首', 6: '妖', 8: '妖', 12: '妖', 17: '妖' })}<div class="diagram-divide">◇ ◇ ◇</div>${cells('ally', { 2: '八', 8: '沙', 11: '悟', 17: '唐', 18: '龙' })}<div class="diagram-label" style="margin:10px 0 0">我方阵地 · 5 × 5</div></div>`;
  }
  function renderGuide() {
    let html = '';
    if (currentTab === 'journey') html = `<div class="guide-layout"><div><h3>你是守护者，也是同行者。</h3><p>这是一段由剧情引领的西行。你将见证师徒的相聚与离散，在陌生世界中认识同伴，以布阵与配置帮助队伍。</p><p>战斗之前，查看职业、摆好阵型；战斗开始后，角色会自动寻找目标，移动并攻击。你做出的安排，将化作他们并肩迎敌的力量。</p><div class="guide-callout">先看一段剧情，再赴白骨岭教学战。<br>不用记住所有规则，边走边学便好。</div></div><div>${boardDiagram()}<p class="guide-caption" style="text-align:center">站位示意，实际攻击范围因角色而异。</p></div></div>`;
    if (currentTab === 'battle') html = `<div class="guide-layout"><div><h3>谋定，再动。</h3><div class="mechanic-list"><div class="mechanic-row"><strong>① 战前布阵</strong><p>双方各有 5 × 5 方格。拖动我方角色调整位置，观察攻击范围；让前排承伤，后排输出。</p></div><div class="mechanic-row"><strong>② 自动行动</strong><p>范围内有敌人时攻击，没有敌人时逐格靠近。每格由一名角色占据，移动会考虑阻挡。</p></div><div class="mechanic-row"><strong>③ 双技能冷却</strong><p>每人一个小技能、一个大招，按各自冷却自动释放。无需消耗法力。</p></div></div></div><div><h3>观察，便有破局之法。</h3><div class="mechanic-list"><div class="mechanic-row"><strong>暂停与倍速</strong><p>暂停后观察战局、生命与技能；熟悉后可切换 1× / 2×。战中不能重新布阵。</p></div><div class="mechanic-row"><strong>职业搭配</strong><p>坦克承伤、战士近战、刺客突进、法师施法、增益支援，另有后续登场的射手。</p></div><div class="mechanic-row"><strong>失败与重试</strong><p>调整站位后再战。查看伤害、承伤与治疗统计，寻找下一次安排的依据。</p></div></div></div></div>`;
    if (currentTab === 'controls') html = `<h3 style="font-family:KaiTi,serif;font-size:27px;font-weight:400;margin-bottom:15px">简单几步，便可同行。</h3><div class="key-list"><div><kbd>← / →</kbd><span>首页切换功能；窗口内切换分类</span></div><div><kbd>Enter</kbd><span>确认当前选中的按钮</span></div><div><kbd>Tab</kbd><span>依次选择可操作项目</span></div><div><kbd>Esc</kbd><span>关闭当前窗口，或返回首页</span></div><div><kbd>点击</kbd><span>选择人物、敌人与功能</span></div><div><kbd>拖动</kbd><span>战前移动角色、配置装备</span></div></div><p class="guide-callout">手机和平板可直接点按菜单、拖动布阵。<br>重要的替换、删除操作都会先提示确认。</p>`;
    if (currentTab === 'growth') html = `<div class="guide-layout"><div><h3>每次相逢，都留下痕迹。</h3><p>人物志记录同伴与职业，妖怪录记录见过的敌人。未曾相逢的身份与世界，先以留白保留。</p><p>随着旅途推进，逐步积累人物、法宝与各地见闻；用新的同伴与配置，回应新的战局。</p><p class="guide-callout">你选择先与谁同行，决定故事的起点；守护者的身份始终属于你。</p></div><div><h3>记得，为旅程留一卷。</h3><p>可以保留三段独立旅程。剧情节点会记录进度，读取教学战时从布阵阶段开始。</p><p>通过“读取存档”导出备份。换用浏览器或清理本地数据之前，先把这段旅程带在身边。</p></div></div>`;
    content.innerHTML = tabs([['journey', '这是什么游戏'], ['battle', '如何战斗'], ['controls', '操作方式'], ['growth', '旅途与收集']], currentTab) + tabBody(html) + footer('首次游玩推荐“行者”难度。序章会逐步介绍战斗。', button('知道了', 'close', 'outline-button'));
  }
  let confirmAction;
  function confirm(title, message, accept, back, label = '确认') {
    currentPanel = 'confirm'; $('#panel-eyebrow').textContent = '旅程记录 / 确认'; $('#panel-title').textContent = title;
    content.innerHTML = `<div class="confirm-box"><h3>${escape(title)}</h3><p>${escape(message)}</p><div class="actions">${button('取消', 'confirm-cancel', 'outline-button') + button(label, 'confirm-accept')}</div></div>`;
    confirmAction = { accept, back };
    if (!panel.open) { returnFocus = document.activeElement; panel.showModal(); }
    content.querySelector('[data-action="confirm-cancel"]').focus();
  }
  async function transition(action) {
    if (transitioning) return;
    transitioning = true; const layer = $('#transition'); layer.classList.add('active');
    const reduced = document.body.classList.contains('reduced-motion');
    const delay = reduced ? 0 : 900;
    await new Promise(r => setTimeout(r, delay));
    try { await action(); } finally {
      layer.classList.remove('active');
      if (!reduced) {
        layer.classList.add('revealing');
        await new Promise(r => setTimeout(r, 780));
        layer.classList.remove('revealing');
      }
      transitioning = false;
    }
  }
  campaign = Campaign.create({ getState: () => state, persist, applySettings, transition, toast,
    onNarrationChange: enabled => { state.settings.narration = enabled; persist(); applySettings(); }
  });
  function launchSave(slot) {
    state.activeSlot = slot;
    const save = state.slots[slot];
    persist(); closePanel();
    campaign.launch(save);
  }
  function returnHome() {
    closePanel();
    transition(() => {
      campaign.stop();
      applySettings(); $('#main-menu button').focus();
    });
  }
  function requestReturn() {
    if (transitioning) return;
    campaign.suspend();
    confirm('暂别此间？', campaign.returnMessage(), returnHome, () => { closePanel(); campaign.resume(); }, '返回首页');
  }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { toast('当前窗口不支持全屏，可使用浏览器的 F11。'); }
  }
  function exportSlot(slot) {
    const blob = new Blob([M.exportSave(state.slots[slot])], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `八十一难_第${slot + 1}卷_${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('已导出旅程，请保留这份备份。');
  }
  const actions = {
    close: closePanel,
    'choose-slot': node => { startSlot = Number(node.dataset.slot); startDifficulty = $('#new-difficulty').value; renderStart(); content.querySelector(`[data-slot="${startSlot}"]`).focus(); },
    begin: () => {
      startDifficulty = $('#new-difficulty').value;
      const begin = () => { state.slots[startSlot] = M.newSave(startDifficulty); launchSave(startSlot); };
      if (state.slots[startSlot]) confirm('替换这一卷旅程？', `第${startSlot + 1}卷的“${M.PHASES[state.slots[startSlot].phase]}”将被新旅程替换。可以取消并先导出备份。其他卷不受影响。`, begin, () => showPanel('start', { slot: startSlot }), '替换并启程');
      else begin();
    },
    'new-in-slot': node => showPanel('start', { slot: Number(node.dataset.slot) }),
    load: node => launchSave(Number(node.dataset.slot)),
    export: node => exportSlot(Number(node.dataset.slot)),
    delete: node => { const slot = Number(node.dataset.slot); confirm('删除这一卷旅程？', `第${slot + 1}卷将被删除。此操作无法撤回；如需保留，可取消并先导出备份。`, () => { state.slots[slot] = null; if (state.activeSlot === slot) state.activeSlot = null; persist(); showPanel('saves'); toast('这一卷已清空，待下一段旅程。'); }, () => showPanel('saves'), '删除此卷'); },
    import: () => { $('#import-save').value = ''; $('#import-save').click(); },
    'import-slot': node => {
      const slot = Number(node.dataset.slot), imported = importPending;
      const write = () => { state.slots[slot] = imported; if (imported.phase !== 'prologue' && !state.library.includes('bone')) state.library.push('bone'); persist(); importPending = null; showPanel('saves'); toast('旅程已导入，可以继续西行。'); };
      if (state.slots[slot]) confirm('替换这一卷旅程？', `导入的旅程将替换第${slot + 1}卷。其他卷不受影响。`, write, renderImport, '替换并导入'); else write();
    },
    'choose-difficulty': node => { draftDifficulty = node.dataset.id; renderDifficulty(); content.querySelector(`[data-id="${draftDifficulty}"]`).focus(); },
    'save-difficulty': () => { state.difficulty = draftDifficulty; persist(); closePanel(); toast(`新旅程的默认难度已设为“${difficultyName(state.difficulty)}”。`); },
    'save-settings': () => { state.settings = M.validateSettings(draftSettings); persist(); closePanel(); toast('已将此间调整为你喜欢的样子。'); },
    defaults: () => { draftSettings = { ...M.DEFAULT_SETTINGS }; applySettings(draftSettings); renderSettings(); },
    fullscreen,
    tab: node => { currentTab = node.dataset.id; selectedEntry = 0; if (currentPanel === 'codex') renderCodex(); if (currentPanel === 'settings') renderSettings(); if (currentPanel === 'guide') renderGuide(); content.querySelector(`#tab-${currentTab}`)?.focus(); },
    'codex-entry': node => { selectedEntry = Number(node.dataset.index); renderCodex(); content.querySelector(`[data-index="${selectedEntry}"]`).focus(); },
    'confirm-cancel': () => confirmAction.back(),
    'confirm-accept': () => { const action = confirmAction.accept; confirmAction = null; action(); }
  };
  function renderImport() {
    confirmAction = null;
    currentPanel = 'confirm'; $('#panel-title').textContent = '将旅程放入哪一卷？';
    content.innerHTML = `<p class="panel-lead">${escape(M.PHASES[importPending.phase])} · ${difficultyName(importPending.difficulty)}</p><div class="slot-choices">${state.slots.map((s, i) => `<button class="slot-choice" data-action="import-slot" data-slot="${i}">第${['一', '二', '三'][i]}卷<small>${s ? '已有记录 · 需确认替换' : '空白旅程'}</small></button>`).join('')}</div>${footer('只导入旅程进度，保留当前设备的声音与界面设置。', button('取消', 'import-cancel', 'outline-button'))}`;
    actions['import-cancel'] = () => { importPending = null; showPanel('saves'); };
  }
  $('#import-save').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 100000) throw new Error('存档文件过大，请选择游戏导出的 JSON 存档。'); importPending = M.importSave(await file.text()); renderImport(); }
    catch (error) { toast('导入失败：' + error.message); }
  });
  content.addEventListener('click', event => { const node = event.target.closest('[data-action]'); if (node && !node.disabled) { effect(); actions[node.dataset.action]?.(node); } });
  content.addEventListener('input', event => {
    const node = event.target, key = node.dataset.setting; if (!key || !draftSettings) return;
    draftSettings[key] = node.type === 'checkbox' ? node.checked : Number(node.value);
    const output = content.querySelector(`#output-${key}`); if (output) output.value = node.value + '%';
    if (node.type === 'checkbox') node.nextElementSibling.textContent = node.checked ? '开启' : '关闭';
    applySettings(draftSettings);
  });
  content.addEventListener('change', event => { if (event.target.dataset.setting === 'textSize') applySettings(draftSettings); });
  $('#panel-close').addEventListener('click', closePanel);
  panel.addEventListener('cancel', event => { event.preventDefault(); if (currentPanel === 'confirm' && confirmAction) confirmAction.back(); else closePanel(); });
  panel.addEventListener('click', event => { if (event.target === panel) { const r = panel.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closePanel(); } });
  const hints = { start: '踏上西行之路，去见未曾见过的天地。', saves: '上次暂别的地方，故事仍在等你。', codex: '人、妖、宝物与山海，相逢皆有回响。', difficulty: '山高水长，按自己的步调前行。', settings: '调一调声色，让此间更合心意。', guide: '先布阵，后迎敌。行前，先知一二。' };
  document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
  $('#main-menu').addEventListener('click', event => { const node = event.target.closest('[data-panel]'); if (node) { effect(); showPanel(node.dataset.panel); } });
  for (const eventName of ['pointerover', 'focusin']) $('#main-menu').addEventListener(eventName, event => { const node = event.target.closest('[data-panel]'); if (node) $('#menu-hint').textContent = hints[node.dataset.panel]; });
  $('#main-menu').addEventListener('pointerleave', () => { const active = document.activeElement.closest('[data-panel]'); $('#menu-hint').textContent = hints[active?.dataset.panel || 'start']; });
  document.addEventListener('keydown', event => {
    const target = document.activeElement;
    if (panel.open && target?.getAttribute('role') === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const all = [...content.querySelectorAll('[role="tab"]')], i = all.indexOf(target), next = event.key === 'Home' ? 0 : event.key === 'End' ? all.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length; all[next].click(); return;
    }
    if (panel.open) return;
    if (campaign.scene !== 'home') {
      if (event.key === 'Escape') { event.preventDefault(); requestReturn(); }
      else if (event.code === 'Space' && campaign.scene === 'story' && event.target.tagName !== 'BUTTON') { event.preventDefault(); $('#story-pause').click(); }
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) && !['INPUT', 'SELECT'].includes(target.tagName)) {
      const all = [...$('#main-menu').querySelectorAll('button')], i = all.indexOf(target);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? all.length - 1 : i < 0 ? 0 : (i + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + all.length) % all.length;
      event.preventDefault(); all[next].focus();
    } else if (event.key === 'Enter' && target === document.body) { event.preventDefault(); $('#main-menu button').click(); }
  });
  $('#sound-toggle').addEventListener('click', () => { state.settings.sound = !state.settings.sound; persist(); applySettings(); if (state.settings.sound) effect(); });
  $('#fullscreen-toggle').addEventListener('click', fullscreen);
  document.addEventListener('fullscreenchange', () => { const active = !!document.fullscreenElement; $('#fullscreen-toggle').innerHTML = icon(active ? 'collapse' : 'fullscreen'); $('#fullscreen-toggle').setAttribute('aria-label', active ? '退出全屏' : '进入全屏'); $('#fullscreen-toggle').title = active ? '退出全屏' : '进入全屏'; if (panel.open && currentPanel === 'settings') renderSettings(); });
  $('#fullscreen-toggle').innerHTML = icon('fullscreen');
  document.addEventListener('pointerdown', () => {
    const settings = panel.open && currentPanel === 'settings' ? draftSettings : state.settings;
    if (settings.sound) { applySettings(settings); audioContext?.resume().catch(() => {}); }
  }, { once: true });
  document.addEventListener('visibilitychange', () => { applySettings(panel.open && currentPanel === 'settings' ? draftSettings : state.settings); });
  $('#story-home').addEventListener('click', requestReturn); $('#battle-home').addEventListener('click', requestReturn); $('#world-home').addEventListener('click', requestReturn);
  story.addEventListener('error', () => { if (story.getAttribute('src')) toast('本段视频暂时无法播放，可点击“跳过本段”继续。'); });
  bg.addEventListener('error', () => toast('背景视频暂时无法播放，已保留静态画面。'));
  window.addEventListener('pagehide', () => { story.pause(); bg.pause(); });
  applySettings();
  if (storageMessage) toast(storageMessage);
  window.HomeUI = Object.freeze({ getState: () => structuredClone(state), openPanel: showPanel });
})();
