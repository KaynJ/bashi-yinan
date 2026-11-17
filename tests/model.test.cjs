const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../web/game/04_程序开发/游戏首页_v0.1/model.js');

test('new journeys survive a full store round trip without touching other slots', () => {
  const state = M.fresh();
  state.slots[1] = M.newSave('challenge', new Date('2026-11-17T08:00:00Z'));
  state.activeSlot = 1;
  const restored = M.restore(JSON.stringify(state));
  assert.deepEqual(restored, state);
  assert.equal(restored.slots[0], null);
  assert.equal(restored.slots[2], null);
});
test('export and import preserve checkpoints and difficulty', () => {
  const save = M.newSave('story'); save.phase = 'tutorial';
  assert.deepEqual(M.importSave(M.exportSave(save)), save);
});
test('untrusted imports reject incompatible format, versions and invalid checkpoints', () => {
  const save = M.newSave('standard');
  for (const value of [null, [], {}, { format: 'other', version: 1, save }, { format: 'bashi-yinan-save', version: 2, save }, { format: 'bashi-yinan-save', version: 1, save: { ...save, phase: 'victory' } }, { format: 'bashi-yinan-save', version: 1, save: { ...save, difficulty: 'unknown' } }, { format: 'bashi-yinan-save', version: 1, save: { ...save, createdAt: 'bad' } }]) {
    assert.throws(() => M.importSave(JSON.stringify(value)));
  }
  assert.throws(() => M.importSave('{broken'));
  assert.throws(() => M.newSave('impossible'));
});
test('settings are bounded and imported extra properties are not retained', () => {
  assert.deepEqual(M.validateSettings({ master: -100, ambience: 900, effects: 'full', textSize: 900, animated: 'false', contrast: true, brightness: 10000, injected: 'oops' }), { ...M.DEFAULT_SETTINGS, master: 0, ambience: 100, brightness: 120, contrast: true });
});
test('tutorial checkpoints unlock witnessed enemies and validate the active slot', () => {
  const state = M.fresh(); state.slots[0] = M.newSave('standard'); state.slots[0].phase = 'tutorial'; state.activeSlot = 5;
  const restored = M.restore(JSON.stringify(state));
  assert.equal(restored.activeSlot, null);
  assert.deepEqual(restored.library, ['bone']);
});
test('corrupted or future storage does not silently overwrite the existing data', () => {
  assert.throws(() => M.restore('{"version":9,"slots":[null,null,null]}'));
  assert.throws(() => M.restore('{"version":1,"slots":[null]}'));
  assert.deepEqual(M.restore(null), M.fresh());
});
test('old checkpoints migrate without losing the journey and new movie checkpoints round-trip', () => {
  const state=M.fresh(),old=M.newSave('standard');delete old.clip;state.slots[0]=old;
  assert.equal(M.restore(JSON.stringify(state)).slots[0].clip,1);
  for(const [phase,clip]of [['prologue',4],['aftermath',5],['aftermath',6],['worlds',6]]){
    const save={...M.newSave('standard'),phase,clip,...(phase==='worlds'?{route:'wukong'}:{})};
    assert.deepEqual(M.importSave(M.exportSave(save)),save);
  }
});
test('invalid movie-stage pairs and invented routes are rejected before import', () => {
  const save=M.newSave('standard');
  for(const change of [{clip:0},{clip:7},{clip:1.5},{phase:'prologue',clip:5},{phase:'aftermath',clip:3},{phase:'worlds',clip:6,route:'invented'}])assert.throws(()=>M.validateSave({...save,...change}));
});
