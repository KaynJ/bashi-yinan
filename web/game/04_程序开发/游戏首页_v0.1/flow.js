(() => {
  'use strict';
  window.Campaign = { create };
  function create({ getState, persist, applySettings, transition, toast, onNarrationChange }) {
    const D = CampaignData, $ = selector => document.querySelector(selector);
    const video = $('#story-video'), voice = $('#narration-audio'), frame = $('#battle-frame');
    const cloud = $('#cloud-guide'), focus = $('#guide-focus'), arrow = $('#guide-arrow');
    let scene = 'home', clip = 1, lesson = -1, changing = false, epoch = 0, intro = false;
    let dismissed = false, completed = false, waiting = '', taskDone = false, suspended = false;
    let frameWindow = null, frameDocument = null, frameAbort = null, monitor = null;
    let nextAction = null, alternativeAction = null, currentRecord = null, currentVoiceId = null, introTimer = null;
    let targetSelector = '', voiceCompletion = null, voiceWarning = false, wasRunning = false;
    let pausedByUser = false, lastWasPlaying = false, selectedRoute = null;
    let formationDestination = { col: 1, row: 5 }, initialBajie = '';
    const history = [];
    const save = () => getState().slots[getState().activeSlot];
    const settings = () => getState().settings;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const isReduced = () => document.body.classList.contains('reduced-motion');
    function checkpoint(phase, currentClip = clip, route) {
      const record = save(); if (!record) return;
      Object.assign(record, { phase, clip: currentClip, updatedAt: new Date().toISOString() });
      if (route) record.route = route;
      if (phase !== 'prologue' && !getState().library.includes('bone')) getState().library.push('bone');
      persist();
    }
    function stopVoice() {
      voiceCompletion = null; voice.pause(); voice.removeAttribute('src'); voice.load();
      clearTimeout(introTimer); introTimer = null;
    }
    function settingsChanged(value = settings()) {
      voice.volume = value.master / 100; voice.muted = !value.narration;
      video.volume = value.master / 100; video.muted = !value.narration;
      $('#story-audio').textContent = value.narration ? '语音 · 开' : '语音 · 关';
      $('#story-audio').setAttribute('aria-pressed', String(value.narration));
      $('#guide-voice').textContent = value.narration ? '重听' : '开启语音';
      if (!value.narration && !voice.paused) voice.pause();
    }
    function speak(id, onEnd) {
      stopVoice(); settingsChanged(); voiceCompletion = onEnd || null;
      if (!settings().narration) {
        if (onEnd) introTimer = setTimeout(() => { if (!suspended && !pausedByUser) { voiceCompletion = null; onEnd(); } }, 5400);
        return;
      }
      voice.src = 'assets/narration/' + id + '.mp3'; voice.load();
      voice.play().catch(() => { /* The visible continue button is always available. */ });
    }
    voice.addEventListener('ended', () => { const action = voiceCompletion; voiceCompletion = null; if (!suspended && !pausedByUser) action?.(); });
    voice.addEventListener('error', () => {
      if (!voice.getAttribute('src')) return;
      if (!voiceWarning) { toast('旁白暂时无法播放，可阅读文字并点击继续。'); voiceWarning = true; }
    });
    function hideGuide() {
      cloud.hidden = true; $('#story-stage').classList.remove('guide-open');
      $('#battle-stage').classList.remove('guided'); focus.hidden = true; arrow.toggleAttribute('hidden', true);
      targetSelector = ''; stopVoice();
    }
    function showGuide(record, { label = '', target = '', next = null, nextLabel, task = '', required = false, alternative = null, voiceId } = {}) {
      stopVoice(); currentRecord = record; targetSelector = target; taskDone = !required;
      nextAction = next; alternativeAction = alternative; cloud.hidden = false;
      cloud.dataset.record = record.id || '';
      $('#story-stage').classList.toggle('guide-open', scene === 'story');
      $('#battle-stage').classList.toggle('guided', scene === 'battle');
      $('#guide-step-label').textContent = label;
      $('#guide-title').textContent = record.title || record.heading;
      $('#guide-text').textContent = record.text;
      $('#guide-task').textContent = task;
      $('#guide-next').textContent = nextLabel || record.next || '继续';
      $('#guide-next').disabled = required || !next;
      $('#guide-alternative').hidden = !alternative;
      $('#guide-alternative').textContent = record.alternative || '沿用当前阵容';
      cloud.classList.remove('task-ready');
      currentVoiceId = voiceId || (scene === 'story' ? 'clip-' + clip : D.narration.some(n => n.id === record.id) ? record.id : null);
      $('#guide-voice').hidden = !currentVoiceId;
      if (voiceId) speak(voiceId);
      requestAnimationFrame(() => { ensureTarget(); updatePointer(); });
    }
    function completeTask(message) {
      if (taskDone) return;
      taskDone = true; cloud.classList.add('task-ready');
      $('#guide-task').textContent = message; $('#guide-next').disabled = !nextAction;
    }
    function setScene(next) {
      scene = next; suspended = false; pausedByUser = false;
      $('#home').inert = next !== 'home';
      $('#story-stage').hidden = next !== 'story';
      $('#battle-stage').hidden = next !== 'battle';
      $('#world-stage').hidden = next !== 'worlds';
      applySettings(); settingsChanged();
    }
    async function change(action) {
      if (changing) return false;
      changing = true; $('#story-next').disabled = true;
      stopVoice(); video.pause(); hideGuide();
      try { await transition(action); return true; }
      finally { changing = false; $('#story-next').disabled = false; }
    }
    async function readyVideo() {
      if (video.readyState >= 2) return true;
      return new Promise(resolve => {
        let timer;
        const finish = ok => { clearTimeout(timer); video.removeEventListener('loadeddata', good); video.removeEventListener('error', bad); resolve(ok); };
        const good = () => finish(true), bad = () => finish(false);
        video.addEventListener('loadeddata', good, { once: true }); video.addEventListener('error', bad, { once: true });
        timer = setTimeout(() => finish(false), 9000);
      });
    }
    async function playClip(id) {
      const session = ++epoch, record = D.clips[id - 1];
      if (!record) return;
      stopMonitor(); clip = id;
      const changed = await change(async () => {
        setScene('story'); frame.removeAttribute('src'); frameWindow = frameDocument = null;
        checkpoint(id <= 4 ? 'prologue' : 'aftermath', id);
        history.push(id); $('#story-chapter').textContent = '序章 · ' + record.title;
        video.controls = false; video.poster = record.poster;
        video.setAttribute('aria-label', record.title);
        video.src = '../../02_视频生成/序章/04_采用片段/' + id + '.mp4'; video.load();
        $('#story-state').hidden = true; $('#story-replay').hidden = true;
        const ok = await readyVideo();
        if (!ok) { $('#story-state').hidden = false; $('#story-state').textContent = '本段暂时无法播放，可点击“跳过本段”继续。'; }
      });
      if (!changed || session !== epoch || scene !== 'story') return;
      intro = true;
      const begin = () => beginMovie(session);
      showGuide(record, { label: `序章旁白 · ${id} / 6`, next: begin, nextLabel: '继续剧情' });
      speak('clip-' + id, begin);
      $('#story-pause').textContent = '暂停'; $('#guide-next').focus({ preventScroll: true });
    }
    function beginMovie(session = epoch) {
      if (session !== epoch || scene !== 'story' || suspended || changing) return;
      intro = false; pausedByUser = false; hideGuide(); $('#story-pause').textContent = '暂停';
      video.play().catch(() => { $('#story-replay').hidden = false; });
    }
    async function advanceClip() {
      if (changing || scene !== 'story') return;
      stopVoice(); video.pause();
      if (clip === 4) await openBattle();
      else if (clip === 6) await openWorlds();
      else await playClip(clip + 1);
    }
    video.addEventListener('ended', advanceClip);
    $('#story-next').addEventListener('click', advanceClip);
    $('#story-replay').addEventListener('click', () => { $('#story-replay').hidden = true; beginMovie(); });
    $('#story-pause').addEventListener('click', togglePause);
    function togglePause() {
      if (scene !== 'story' || changing) return;
      pausedByUser = !pausedByUser;
      $('#story-pause').textContent = pausedByUser ? '继续' : '暂停';
      if (pausedByUser) { video.pause(); voice.pause(); clearTimeout(introTimer); }
      else if (intro) {
        if (settings().narration && voice.getAttribute('src') && !voice.ended) voice.play().catch(() => {});
        else beginMovie();
      } else video.play().catch(() => { $('#story-replay').hidden = false; });
    }
    $('#story-audio').addEventListener('click', () => { onNarrationChange(!settings().narration); settingsChanged(); if (intro && !pausedByUser) { if (settings().narration) speak('clip-' + clip, () => beginMovie()); else speak('', () => beginMovie()); } });
    $('#guide-next').addEventListener('click', () => { if (!$('#guide-next').disabled && !changing) nextAction?.(); });
    $('#guide-alternative').addEventListener('click', () => alternativeAction?.());
    $('#guide-voice').addEventListener('click', () => {
      if (!settings().narration) onNarrationChange(true);
      if (scene === 'story') { pausedByUser = false; $('#story-pause').textContent='暂停'; speak('clip-' + clip, () => beginMovie()); }
      else if (currentVoiceId) speak(currentVoiceId);
    });
    async function waitForFrame(session) {
      for (let i = 0; i < 200; i++) {
        if (session !== epoch || scene !== 'battle') return false;
        try { if (frame.contentWindow?.TeachingReview && frame.contentDocument?.querySelector('#phase-toggle')) { frameWindow = frame.contentWindow; frameDocument = frame.contentDocument; return true; } } catch { return false; }
        await delay(50);
      }
      return false;
    }
    async function openBattle() {
      const session = ++epoch; completed = false; dismissed = false; lesson = -1; waiting = '';
      const changed = await change(async () => {
        setScene('battle'); checkpoint('tutorial', 4); history.push('tutorial');
        frame.src = '../战场场景设计/教学关_v0.5/index.html?campaign=1';
        await waitForFrame(session);
      });
      if (!changed || session !== epoch) return;
      if (!frameWindow) { toast('教学引导未能接入，请用“打开八十一难.cmd”启动后继续。'); return; }
      setupBattleFrame(); startMonitor(); enterLesson(0);
    }
    function setupBattleFrame() {
      frameAbort?.abort(); frameAbort = new frameWindow.AbortController();
      const style = frameDocument.createElement('style'); style.id = 'campaign-layout';
      style.textContent = '.scene{min-height:0!important;height:100dvh!important}.designbar{display:none!important}.play-layout{bottom:34px!important}.tutorial-panel{display:none!important}.topbar{height:65px!important}.play-layout{top:72px!important}.left-underlay{overflow:auto}.battle-controls{flex-shrink:0}.campaign-blocked{opacity:.48!important}@media(max-width:700px){.play-layout{top:60px!important;bottom:52px!important}.topbar{height:54px!important}.topbar h1{font-size:17px!important}.mobile-dock{bottom:0!important}}';
      frameDocument.head.append(style);
      frameDocument.addEventListener('click', event => {
        if (scene !== 'battle' || dismissed) return;
        const element = event.target.closest('button');
        if (element?.id === 'phase-toggle' && lesson < 5 && !completed) {
          event.preventDefault(); event.stopImmediatePropagation(); toast('先随守护者看完布阵要点，或点击“略过讲解”。'); return;
        }
        if (lesson === 1 && event.target.closest('[data-enemy="bone-boss"]')) completeTask('已查看白骨精的招式');
        if (lesson === 2 && event.target.closest('[data-hero="bajie"]')) completeTask('已认识前排坦克八戒');
      }, { capture: true, signal: frameAbort.signal });
      frameDocument.addEventListener('pointerdown', event => {
        if (!dismissed && lesson === 2 && event.target.closest('[data-hero="bajie"]')) completeTask('已认识前排坦克八戒');
      }, { capture: true, signal: frameAbort.signal });
      frameDocument.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
      }, { signal: frameAbort.signal });
    }
    function review() { return frameWindow?.TeachingReview; }
    function battle() { return review()?.battle; }
    function pauseBattle() { if (battle()?.status === 'running') review().view.pause(); }
    function resumeBattle() { if (battle()?.status === 'paused') review().view.pause(); }
    function enterLesson(index) {
      if (scene !== 'battle' || suspended || index < 0 || index >= D.lessons.length) return;
      dismissed = false; lesson = index; waiting = ''; pauseBattle();
      const source = D.lessons[index], record = { ...source };
      $('#guide-toggle').textContent = '略过讲解';
      $('#battle-guide-status').textContent = `守护者引导 · ${index + 1} / ${D.lessons.length}`;
      if (index === 3) {
        const units = review().state.heroes;
        const empty = [1,2,3,0,4].find(col => !units.some(u => u.col === col && u.row === 5));
        formationDestination = { col: empty ?? 1, row: 5 };
        const unit = units.find(u => u.id === 'bajie'); initialBajie = `${unit.col},${unit.row}`;
        record.target = `.board-grid>.cell[data-col="${formationDestination.col}"][data-row="5"]`;
      }
      if ([4,7].includes(index)) frameDocument.querySelector('[data-hero="wukong"]')?.click();
      let next = () => enterLesson(index + 1);
      if ([6,7,8].includes(index)) next = () => {
        waiting = index === 6 ? 'cooldowns' : index === 7 ? 'controls' : 'result';
        hideGuide(); $('#guide-toggle').textContent = '展开引导';
        $('#battle-guide-status').textContent = '观察同伴自动行动'; resumeBattle();
      };
      const required = [1,2,3,5].includes(index);
      showGuide(record, { label: `教学 · ${index + 1} / ${D.lessons.length}`, target: record.target, next: index === 5 ? null : next, required, task: record.task || '讲解时战斗已暂停，可以慢慢看。', alternative: index === 3 ? () => enterLesson(4) : null, voiceId: record.id });
      const start = frameDocument.querySelector('#phase-toggle');
      if (start && !review().state.combat) start.disabled = index < 5;
    }
    function ensureTarget() {
      if (!targetSelector || !frameDocument || scene !== 'battle') return;
      const target = frameDocument.querySelector(targetSelector); if (!target) return;
      const ui = frameWindow.TeachingUI;
      if (target.closest('#lineup-panel') || target.closest('.battle-controls')) ui?.openPanel('lineup-panel', { toggle: false });
      else if (target.closest('#loadout-panel,#stats-panel')) ui?.openPanel('loadout-panel', { toggle: false });
      else if (frameWindow.innerWidth <= 700) ui?.closePanels();
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      review()?.syncLayout();
    }
    function updatePointer() {
      if (cloud.hidden || scene !== 'battle' || !targetSelector || !frameDocument || suspended) { focus.hidden = true; arrow.toggleAttribute('hidden', true); return; }
      const target = frameDocument.querySelector(targetSelector);
      if (!target || !target.getClientRects().length) { focus.hidden = true; arrow.toggleAttribute('hidden', true); return; }
      const a = target.getBoundingClientRect(), f = frame.getBoundingClientRect();
      const x = Math.max(f.left + 3, f.left + a.left - 5), y = Math.max(f.top + 3, f.top + a.top - 5);
      const right = Math.min(f.right - 3, f.left + a.right + 5), bottom = Math.min(f.bottom - 3, f.top + a.bottom + 5);
      if (right - x < 4 || bottom - y < 4) { focus.hidden = true; arrow.toggleAttribute('hidden', true); return; }
      focus.hidden = false; Object.assign(focus.style, { left: x + 'px', top: y + 'px', width: right - x + 'px', height: bottom - y + 'px' });
      const c = cloud.getBoundingClientRect(), startX = Math.min(c.right - 100, Math.max(c.left + 180, (x + right) / 2));
      const startY = c.top + 7, endX = (x + right) / 2, endY = bottom + 7;
      const bend = Math.max(35, (startY - endY) * .45);
      $('#guide-arrow-line').setAttribute('d', `M${startX},${startY}C${startX},${startY-bend} ${endX},${endY+bend} ${endX},${endY}`);
      arrow.toggleAttribute('hidden', false);
    }
    function stopMonitor() { clearInterval(monitor); monitor = null; frameAbort?.abort(); frameAbort = null; }
    function startMonitor() {
      clearInterval(monitor);
      monitor = setInterval(() => {
        if (scene !== 'battle' || suspended || changing || !review()) return;
        updatePointer();
        const b = battle();
        if (b?.status === 'won' && !completed) { completed = true; waiting = ''; checkpoint('aftermath', 5); showResult(); return; }
        if (b && ['lost','timeout'].includes(b.status) && !completed) { completed = true; showFailure(); return; }
        if (dismissed) return;
        if (lesson === 2 && review().state.selected === 'bajie') completeTask('已认识前排坦克八戒');
        if (lesson === 3 && !taskDone) {
          const unit = review().state.heroes.find(u => u.id === 'bajie');
          if (`${unit.col},${unit.row}` !== initialBajie && unit.col === formationDestination.col && unit.row === 5) completeTask('八戒已到前排，站位记录完成');
        }
        if (lesson === 5 && b?.status === 'running') { enterLesson(6); return; }
        if (waiting === 'cooldowns' && b?.time >= 7) { enterLesson(7); return; }
        if (waiting === 'controls' && b?.time >= 14) { enterLesson(8); return; }
        if (!b && !review().state.combat) {
          const start = frameDocument.querySelector('#phase-toggle'); if (start) start.disabled = lesson < 5;
        }
      }, 75);
    }
    function showResult() {
      $('#guide-toggle').textContent = '教学完成'; $('#battle-guide-status').textContent = '白骨阵已破 · 继续战后剧情';
      showGuide(D.result, { label: '教学完成', next: () => playClip(5), nextLabel: '继续故事', task: '旅程已记录。下一段：天地裂变。', voiceId: 'victory' });
    }
    function showFailure() {
      showGuide({id:'failure',title:'重整阵形，再来便是',text:'让八戒守住前排，唐僧和白龙马留在后方，再留意敌人的整列攻击。此战可以重试，不必急着赶路。'}, {
        label:'试炼暂歇', nextLabel:'调整布阵', next: () => { completed = false; dismissed = false; review().returnToFormation(); enterLesson(3); }, task:'重试不影响剧情，也不会删除旅程记录。'
      });
    }
    $('#guide-toggle').addEventListener('click', () => {
      if (scene !== 'battle' || !frameWindow) return;
      if (completed) { if (battle()?.status === 'won') showResult(); else showFailure(); return; }
      if (!cloud.hidden) {
        dismissed = true; waiting = ''; hideGuide();
        $('#guide-toggle').textContent = '展开引导'; $('#battle-guide-status').textContent = '讲解已收起 · 击败敌阵后继续剧情';
        const start = frameDocument.querySelector('#phase-toggle'); if (start && !review().state.combat) start.disabled = false;
        resumeBattle();
      } else {
        dismissed = false;
        enterLesson(battle() ? Math.max(6, Math.min(8, lesson)) : Math.max(0, Math.min(5, lesson)));
      }
    });
    async function openWorlds() {
      ++epoch; stopMonitor();
      const changed = await change(() => {
        setScene('worlds'); checkpoint('worlds', 6); history.push('worlds');
        selectedRoute = save()?.route || null;
        $('#world-gates').innerHTML = D.gates.map(g => `<button class="world-gate" data-route="${g.id}" aria-label="追寻${g.name}" aria-pressed="${selectedRoute===g.id}" style="--gate-color:${g.color}"><span>${g.name}</span></button>`).join('');
        $('#route-strip').innerHTML = D.gates.map(g => `<button class="route-button" data-route="${g.id}" aria-pressed="${selectedRoute===g.id}" style="--gate-color:${g.color}">${g.name}<small>${g.role}</small></button>`).join('');
        positionGates();
      });
      if (!changed) return;
      showGuide({id:'worlds',title:'先追寻谁的踪迹？',text:'五道漩涡通向不同的去处。点选一位同伴，记下你想追寻的方向。'}, {label:'五涡之间',next:selectedRoute?recordRoute:null,nextLabel:'记下追寻方向',task:'选择只决定先追寻谁，你仍是此间的守护者。',voiceId:'worlds'});
    }
    function positionGates() {
      if (scene !== 'worlds') return;
      const area = $('#gate-landscape'), w = area.clientWidth, h = area.clientHeight, scale = Math.min(w/1280,h/720);
      const ox = (w-1280*scale)/2, oy = (h-720*scale)/2;
      for (const g of D.gates) {
        const button = area.querySelector(`[data-route="${g.id}"]`); if (button) { button.style.left = ox+g.x/100*1280*scale+'px'; button.style.top = oy+g.y/100*720*scale+'px'; }
      }
    }
    function recordRoute() {
      if (!selectedRoute) return;
      const gate = D.gates.find(g=>g.id===selectedRoute); checkpoint('worlds',6,selectedRoute);
      showGuide({id:'route-recorded',title:'下一程，待续',text:`已记下追寻${gate.name}的方向。这一段序章暂告一段落，下一程将从这份行记继续。`},{label:'行记已存',next:null,nextLabel:'方向已记录',task:'可返回首页，或再看一看其他同伴的去路。'});
    }
    $('#world-stage').addEventListener('click',event=>{
      const target=event.target.closest('[data-route]');if(!target)return;
      selectedRoute=target.dataset.route; const gate=D.gates.find(g=>g.id===selectedRoute);
      $('#world-stage').querySelectorAll('[data-route]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.route===selectedRoute)));
      showGuide({id:'route-preview',title:`追寻${gate.name}`,text:gate.summary+'此时的选择，是先追寻谁的踪迹，并不是变成那位同伴。'},{label:gate.role,next:recordRoute,nextLabel:'记下追寻方向',task:'确认后记录方向；同伴与世界的后续故事待续。'});
    });
    function suspend() {
      suspended = true; wasRunning = battle()?.status === 'running'; lastWasPlaying = scene === 'story' && !video.paused;
      video.pause(); voice.pause(); clearTimeout(introTimer); pauseBattle(); focus.hidden = true; arrow.toggleAttribute('hidden', true);
    }
    function resume() {
      suspended = false;
      if (scene === 'story' && !pausedByUser) {
        if (intro) { if (settings().narration && voice.getAttribute('src') && !voice.ended) voice.play().catch(()=>{}); else beginMovie(); }
        else if (lastWasPlaying) video.play().catch(()=>{$('#story-replay').hidden=false;});
      }
      if (scene === 'battle' && wasRunning && cloud.hidden) resumeBattle();
      updatePointer();
    }
    function stop() {
      ++epoch; stopVoice(); stopMonitor(); video.pause(); video.removeAttribute('src'); video.load();
      hideGuide(); frame.removeAttribute('src'); frameWindow=frameDocument=null; intro=false;
      setScene('home');
    }
    function launch(record) {
      if (record.phase==='tutorial') return openBattle();
      if (record.phase==='worlds') return openWorlds();
      return playClip(record.clip || (record.phase==='aftermath'?5:1));
    }
    function returnMessage() {
      if(scene==='battle')return completed&&battle()?.status==='won'?'教学已经完成。下次继续将从第5段“天地裂变”开始。':'旅程已记录在白骨岭。下次继续会从教学布阵开始，本场交战进度不会保留。';
      if(scene==='worlds')return '五涡之间的行记已保存，下次继续会回到这里。';
      return `旅程已记录在第${clip}段“${D.clips[clip-1].title}”。下次继续会从本段片头开始。`;
    }
    document.addEventListener('visibilitychange',()=>{if(scene==='home')return;if(document.hidden)suspend();else resume();});
    window.addEventListener('resize',()=>{positionGates();if(!cloud.hidden&&scene==='battle'){ensureTarget();updatePointer();}});
    new ResizeObserver(()=>{if(scene==='battle'&&!cloud.hidden){$('#battle-stage').style.setProperty('--guide-size',cloud.offsetHeight+'px');updatePointer();}}).observe(cloud);
    window.CampaignReview=Object.freeze({get scene(){return scene;},get clip(){return clip;},get lesson(){return lesson;},get history(){return [...history];},get intro(){return intro;},get changing(){return changing;}});
    return {launch,stop,suspend,resume,settingsChanged,returnMessage,get scene(){return scene;}};
  }
})();
