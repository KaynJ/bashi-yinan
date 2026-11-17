(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HomeModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'bashi-yinan.home.v1';
  const DEFAULT_SETTINGS = Object.freeze({ master: 70, ambience: 45, effects: 35, sound: false, narration: true, brightness: 100, animated: true, reduced: false, textSize: 100, contrast: false });
  const DIFFICULTIES = [
    { id: 'story', name: '随心', glyph: '水', summary: '放慢脚步，细品人物与故事。', features: ['降低后续战斗的压力', '更宽裕的布阵容错', '完整体验剧情与收集'] },
    { id: 'standard', name: '行者', glyph: '山', summary: '在旅途与战局之间，找到自己的章法。', features: ['建议首次游玩选择', '重视职业搭配与站位', '保留适度的策略挑战'] },
    { id: 'challenge', name: '劫难', glyph: '雷', summary: '每一步落子，都需多一分思量。', features: ['提高后续战斗的压力', '更考验阵容与应对', '适合熟悉玩法后尝试'] }
  ];
  const HEROES = [
    { id: 'tangseng', name: '唐僧', role: '法师', weapon: '禅杖', quote: '西行路远，愿与诸位同行。', description: '西行队伍中的法术输出者。站在队伍后方，以法术对敌方造成伤害。', tactic: '保持前方有队友掩护，利用法术覆盖敌人的阵列。' },
    { id: 'wukong', name: '悟空', role: '刺客', weapon: '金箍棒', quote: '山高路远，先看俺老孙的。', description: '擅长近身突进与爆发。凭借棍击和毫毛分身，向敌阵持续施压。', tactic: '留意可接近敌人的路线，寻找敌方防线的缺口。' },
    { id: 'bajie', name: '八戒', role: '坦克', weapon: '九齿钉耙', quote: '有俺在前头，你们尽管放心。', description: '队伍前排的承伤者，以钉耙迎敌，为身后的同伴争取出手机会。', tactic: '优先放在前排，衔接治疗与护盾，稳住队伍的防线。' },
    { id: 'shaseng', name: '沙僧', role: '战士', weapon: '降妖宝杖', quote: '一步一程，总能走到。', description: '攻守兼顾的近战同伴。以稳定的近身行动，协助队伍推进。', tactic: '照应前排与侧翼，让远程同伴能持续发挥。' },
    { id: 'bailongma', name: '白龙马', role: '增益', weapon: '灵佑', quote: '风过山海，仍有回响。', description: '以治疗与增益维系队伍。普通行动可以治疗同伴并提升攻击，小技能提供单体治疗。', tactic: '置于相对安全的位置，持续支援正在承伤的同伴。' }
  ];
  const ENEMIES = [
    { id: 'bone-boss', name: '白骨精', role: '首领 · 法师', description: '白骨岭上的敌手。飞扇与骨刺威胁整列目标，魅惑会扰乱队伍。', tactic: '留意纵向站位与队友间距，观察首领和随从的配合。' },
    { id: 'bone-red', name: '绯红', role: '坦克', description: '举扇守御，降低所受伤害，并对攻击者造成反伤。', tactic: '她擅长守御，处理其他随从能减轻持续消耗。' },
    { id: 'bone-blue', name: '霜蓝小妹', role: '法师', description: '以蓝色飞扇进行远程单体攻击。', tactic: '前排掩护脆弱同伴，避免后排直接承受飞扇。' },
    { id: 'bone-green', name: '青绿小妹', role: '法师', description: '以绿色飞扇进行远程单体攻击。', tactic: '关注跨列的远程威胁，尽量维持己方完整阵型。' },
    { id: 'bone-yellow', name: '杏黄', role: '增益', description: '挥扇为存活的同伴恢复生命。', tactic: '她的治疗会延长战斗，需考虑处理的先后顺序。' }
  ];
  const PHASES = { prologue: '序章 · 西行前记', tutorial: '序章 · 白骨岭教学战', aftermath: '序章 · 战后变故', worlds: '序章 · 五涡之间' };
  const fresh = () => ({ version: 1, difficulty: 'standard', settings: { ...DEFAULT_SETTINGS }, slots: [null, null, null], activeSlot: null, library: [] });
  const validDifficulty = value => DIFFICULTIES.some(d => d.id === value);
  const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  function validateSettings(value) {
    const result = { ...DEFAULT_SETTINGS };
    if (!isObject(value)) return result;
    for (const key of ['master', 'ambience', 'effects']) if (Number.isFinite(value[key])) result[key] = Math.min(100, Math.max(0, value[key]));
    if (Number.isFinite(value.brightness)) result.brightness = Math.min(120, Math.max(65, value.brightness));
    if ([100, 110, 120].includes(value.textSize)) result.textSize = value.textSize;
    for (const key of ['sound', 'narration', 'animated', 'reduced', 'contrast']) if (typeof value[key] === 'boolean') result[key] = value[key];
    return result;
  }
  function validateSave(value) {
    if (!isObject(value) || value.version !== 1 || !Object.hasOwn(PHASES, value.phase) || !validDifficulty(value.difficulty)) throw new Error('存档格式或版本不受支持。');
    if (typeof value.id !== 'string' || value.id.length < 1 || value.id.length > 100 || !Number.isFinite(Date.parse(value.createdAt)) || !Number.isFinite(Date.parse(value.updatedAt))) throw new Error('存档缺少有效的旅程信息。');
    const clip = value.clip ?? (value.phase === 'aftermath' ? 5 : value.phase === 'tutorial' ? 4 : 1);
    if (!Number.isInteger(clip) || clip < 1 || clip > 6 || value.phase === 'prologue' && clip > 4 || value.phase === 'aftermath' && clip < 5) throw new Error('存档中的剧情片段无效。');
    if (value.route !== undefined && !HEROES.some(h=>h.id===value.route)) throw new Error('存档中的追寻对象无效。');
    return { version: 1, id: value.id, phase: value.phase, clip, difficulty: value.difficulty, createdAt: new Date(value.createdAt).toISOString(), updatedAt: new Date(value.updatedAt).toISOString(), ...(value.route ? {route:value.route} : {}) };
  }
  function restore(raw) {
    if (!raw) return fresh();
    const value = JSON.parse(raw);
    if (!isObject(value) || value.version !== 1 || !Array.isArray(value.slots) || value.slots.length !== 3) throw new Error('本地记录无法识别。原记录仍被保留。');
    const state = fresh();
    state.settings = validateSettings(value.settings);
    state.difficulty = validDifficulty(value.difficulty) ? value.difficulty : 'standard';
    state.slots = value.slots.map(slot => slot === null ? null : validateSave(slot));
    state.activeSlot = Number.isInteger(value.activeSlot) && value.activeSlot >= 0 && value.activeSlot < 3 && state.slots[value.activeSlot] ? value.activeSlot : null;
    state.library = Array.isArray(value.library) && value.library.includes('bone') ? ['bone'] : [];
    if (state.slots.some(s => s && s.phase !== 'prologue')) state.library = ['bone'];
    return state;
  }
  function newSave(difficulty, now = new Date()) {
    if (!validDifficulty(difficulty)) throw new Error('请选择有效的难度。');
    const date = now.toISOString();
    return { version: 1, id: 'journey-' + date + '-' + Math.random().toString(36).slice(2, 8), phase: 'prologue', clip: 1, difficulty, createdAt: date, updatedAt: date };
  }
  function importSave(raw) {
    const parsed = JSON.parse(raw);
    if (!isObject(parsed) || parsed.format !== 'bashi-yinan-save' || parsed.version !== 1) throw new Error('请选择《八十一难》导出的存档文件。');
    return validateSave(parsed.save);
  }
  const exportSave = save => JSON.stringify({ format: 'bashi-yinan-save', version: 1, save: validateSave(save) }, null, 2);
  return { KEY, DEFAULT_SETTINGS, DIFFICULTIES, HEROES, ENEMIES, PHASES, fresh, restore, newSave, importSave, exportSave, validateSave, validateSettings };
});
