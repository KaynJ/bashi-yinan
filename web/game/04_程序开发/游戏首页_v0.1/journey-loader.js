// Keep the fetched movies and the initialized battlefield for this journey.
window.createJourneyLoader = function (frame) {
  const movies = new Map();
  let preparedBattle = false;

  function clear() {
    for (const url of movies.values()) URL.revokeObjectURL(url);
    movies.clear();
    frame.removeAttribute('src');
    preparedBattle = false;
  }

  async function prepareBattle(signal, progress) {
    if (preparedBattle) { progress(1); return; }
    await new Promise((resolve, reject) => {
      const done = (error) => {
        frame.removeEventListener('load', loaded);
        signal.removeEventListener('abort', aborted);
        if (error) reject(error); else resolve();
      };
      const aborted = () => done(signal.reason);
      const loaded = () => {
        if (frame.contentDocument?.URL === 'about:blank') return;
        done(frame.contentWindow?.TeachingReview ? null : new Error('教学战场'));
      };
      signal.throwIfAborted();
      signal.addEventListener('abort', aborted, {once:true});
      frame.addEventListener('load', loaded);
      frame.src = '../战场场景设计/教学关_v0.5/index.html?campaign=1';
    });
    const battle = frame.contentWindow;
    const [characters, enemies] = await Promise.all([
      battle.SceneBattleView.preload((done, total) => {
        if (!signal.aborted) progress(0.95 * done / total);
      }, 240000),
      battle.BoneSkin.ready
    ]);
    signal.throwIfAborted();
    if ([...characters, ...enemies].some(asset => !asset.ok)) throw new Error('教学战角色素材');
    preparedBattle = true;
    progress(1);
  }

  async function prepare(record, signal, render) {
    const needsBattle = ['tutorial','prologue'].includes(record.phase);
    const first = record.phase === 'tutorial' ? 5 : record.phase === 'worlds' ? 6 : record.clip || 1;
    const ids = Array.from({length:7-first}, (_, i) => i+first);
    const parts = new Map(ids.map(id => [id, movies.has(id) ? 1 : 0]));
    if (needsBattle) parts.set('battle', preparedBattle ? 1 : 0);
    const report = (key, fraction) => {
      signal.throwIfAborted();
      parts.set(key, fraction);
      const sum = [...parts.values()].reduce((a,b)=>a+b,0);
      render(Math.floor(sum / parts.size * 100));
    };
    report(first, parts.get(first));
    async function downloadNext() {
      while (ids.length) {
        signal.throwIfAborted();
        const id = ids.shift();
        if (movies.has(id)) continue;
        const response = await fetch('../../02_视频生成/序章/04_采用片段/' + id + '.mp4', {signal});
        if (!response.ok || response.status === 206) throw new Error('剧情片段 ' + id);
        const size = Number(response.headers.get('Content-Length'));
        const reader = response.body.getReader();
        const chunks = [];
        let bytes = 0;
        for (;;) {
          const {done,value} = await reader.read();
          if (done) break;
          chunks.push(value);
          bytes += value.length;
          if (size) report(id, Math.min(bytes / size, .99));
        }
        signal.throwIfAborted();
        if (!bytes) throw new Error('剧情片段 ' + id);
        movies.set(id, URL.createObjectURL(new Blob(chunks, {type:'video/mp4'})));
        report(id, 1);
      }
    }
    await Promise.all([downloadNext(), downloadNext(),
      needsBattle && prepareBattle(signal, value=>report('battle',value))]);
  }

  return {prepare, clear, movie:id=>movies.get(id)};
};
