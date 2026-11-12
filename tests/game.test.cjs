const test = require('node:test');
const assert = require('node:assert');
const G = require('../dist/game-logic.js');

const cfg = (g, s, lang) => G.approveConfig(G.makeConfig(g, s, lang || 'ru'));

test('all demo sets are valid in both languages', () => {
  for (const g of G.GAMES) for (const set of G.SETS[g]) assert.deepStrictEqual(G.validateSet(g, set), [], g + ' ' + set.id);
});

test('ambiguous pair answers fail validation', () => {
  const bad = { id: 'x', items: [{ id: 'a', left: { kk: '10+5', ru: '10+5' }, right: { kk: '15', ru: '15' } }, { id: 'b', left: { kk: '12+3', ru: '12+3' }, right: { kk: '15', ru: '15' } }] };
  assert.ok(G.validateSet('pairs', bad).some(e => e.startsWith('ambiguous-answer')));
});

test('seeded shuffle is reproducible', () => {
  assert.deepStrictEqual(G.shuffle([1, 2, 3, 4, 5], 42), G.shuffle([1, 2, 3, 4, 5], 42));
  const a = G.createSession(cfg('pairs', 'p-add'), 9), b = G.createSession(cfg('pairs', 'p-add'), 9);
  assert.deepStrictEqual(a.rightOrder, b.rightOrder);
});

test('pairs: right and wrong answers, no penalty, completion', () => {
  let s = G.start(G.createSession(cfg('pairs', 'p-add'), 3));
  let r = G.pairsPick(s, 'left', 'a1'); r = G.pairsPick(r.s, 'right', 'a2');
  assert.strictEqual(r.event, 'answer:retry'); assert.strictEqual(r.s.done, 0);
  r = G.pairsPick(r.s, 'left', 'a1'); r = G.pairsPick(r.s, 'right', 'a1');
  assert.strictEqual(r.event, 'answer:correct'); assert.strictEqual(r.s.done, 1);
  for (const id of ['a2', 'a3', 'a4']) { r = G.pairsPick(r.s, 'left', id); r = G.pairsPick(r.s, 'right', id); }
  assert.strictEqual(r.event, 'session:complete'); assert.strictEqual(r.s.status, 'completed');
  // no answers accepted after completion
  const again = G.pairsPick(r.s, 'left', 'a1'); assert.strictEqual(again.event, null);
});

test('sequence checked by id; hint locks next correct step; assisted is recorded', () => {
  let s = G.start(G.createSession(cfg('sequence', 's-lesson'), 5));
  assert.notStrictEqual(s.order.join(), 'l1,l2,l3,l4'); // never pre-solved
  let r = G.seqCheck(s); assert.strictEqual(r.event, 'answer:retry');
  r = G.hint(r.s); assert.strictEqual(r.s.order[0], 'l1'); assert.strictEqual(r.s.locked >= 1, true); assert.strictEqual(r.s.assisted, true);
  const before = r.s.order.slice(); G.seqMove(r.s, 0, 1); assert.deepStrictEqual(r.s.order.slice(0, 1), before.slice(0, 1)); // locked card cannot move
  // sort the rest manually
  const target = ['l1', 'l2', 'l3', 'l4'];
  for (let i = r.s.locked; i < 4; i++) { const j = r.s.order.indexOf(target[i]); if (j !== i) G.seqSwap(r.s, i, j); }
  r = G.seqCheck(r.s); assert.strictEqual(r.event, 'session:complete');
});

test('sort: boundary 50 belongs to the first group; mistakes keep earlier answers', () => {
  let s = G.start(G.createSession(cfg('sort', 'c-50'), 1));
  let r = G.sortPlace(s, 'n12', 'le50'); assert.strictEqual(r.event, 'answer:correct');
  r = G.sortPlace(r.s, 'n50', 'gt50'); assert.strictEqual(r.event, 'answer:retry'); assert.strictEqual(r.s.placed.n12, 'le50');
  r = G.sortPlace(r.s, 'n50', 'le50'); assert.strictEqual(r.event, 'answer:correct');
  r = G.sortPlace(r.s, 'n51', 'gt50'); r = G.sortPlace(r.s, 'n87', 'gt50');
  assert.strictEqual(r.event, 'session:complete');
});

test('pause and restore keep order and placed cards; restored session resumes paused', () => {
  const c = cfg('sort', 'c-even');
  let s = G.start(G.createSession(c, 77));
  G.sortPlace(s, 'e8', 'even'); G.pause(s);
  const restored = G.cleanStore(JSON.parse(JSON.stringify({ config: c, session: s, progress: { completed: [], rewards: [] } })));
  assert.ok(restored.session); assert.strictEqual(restored.session.status, 'paused');
  assert.strictEqual(restored.session.placed.e8, 'even'); assert.deepStrictEqual(restored.session.order, s.order);
  G.resume(restored.session); assert.strictEqual(restored.session.status, 'playing');
});

test('reward is granted once per session, even after reload', () => {
  let s = G.start(G.createSession(cfg('pairs', 'p-time'), 11));
  let r; for (const id of ['t1', 't2', 't3', 't4']) { r = G.pairsPick(s, 'left', id); r = G.pairsPick(r.s, 'right', id); }
  let g1 = G.grantReward(null, r.s); assert.strictEqual(g1.granted, true);
  let g2 = G.grantReward(g1.progress, r.s); assert.strictEqual(g2.granted, false);
  const reloaded = G.cleanStore(JSON.parse(JSON.stringify({ progress: g2.progress })));
  assert.strictEqual(G.grantReward(reloaded.progress, r.s).granted, false);
  assert.strictEqual(reloaded.progress.rewards.length, 1);
});

test('changed config needs new approval; old session is not reused', () => {
  const c = cfg('pairs', 'p-add', 'ru');
  assert.strictEqual(G.isConfigApproved(c), true);
  const s = G.createSession(c, 2);
  G.setConfigLang(c, 'kk');
  assert.strictEqual(G.isConfigApproved(c), false);
  const st = G.cleanStore({ config: c, session: s });
  assert.strictEqual(st.session, null); // session belongs to the old config hash
});

test('corrupted game storage never throws', () => {
  for (const v of [null, 'x', 5, { config: { gameId: 'hack' } }, { config: { gameId: 'pairs', setId: 'p-add' }, session: { status: 'completed' } }, { progress: { rewards: [1, 'a'] } }])
    assert.doesNotThrow(() => G.cleanStore(v));
  assert.deepStrictEqual(G.cleanStore({ progress: { rewards: [1, 'a'] } }).progress.rewards, ['a']);
});
