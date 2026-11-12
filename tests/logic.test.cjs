const test = require('node:test');
const assert = require('node:assert');
const L = require('../dist/logic.js');
const S = require('../dev-server.cjs');

const ob = (help, result, extra) => Object.assign({ t: 1700000000000, topic: 'add100', help, result, discomfort: false }, extra);

test('kit is deterministic and has all parts', () => {
  const a = L.generateKit({ topic: 'add100', level: 'basic', grade: 3 });
  const b = L.generateKit({ topic: 'add100', level: 'basic', grade: 3 });
  assert.strictEqual(a.hash, b.hash);
  assert.ok(a.schedule.length >= 4 && a.task.kk.length && a.task.ru.length && a.story.kk.length);
});

test('answers are correct for each topic', () => {
  const add = L.generateKit({ topic: 'add100' }); const m = add.task.ru[2].match(/(\d+) \+ (\d+)/);
  assert.strictEqual(String(+m[1] + +m[2]), add.task.answer);
  const sub = L.generateKit({ topic: 'sub100' }); const s = sub.task.ru[2].match(/(\d+) - (\d+)/);
  assert.strictEqual(String(+s[1] - +s[2]), sub.task.answer);
  assert.ok(+s[1] - +s[2] > 0);
});

test('approval bound to version: edit cancels it', () => {
  const k = L.generateKit({ topic: 'time' });
  assert.strictEqual(L.isApproved(k), false);
  L.approve(k, 'teacher');
  assert.strictEqual(L.isApproved(k), true);
  L.editKit(k, 'task', 'ru', 0, 'Новый текст');
  assert.strictEqual(L.isApproved(k), false);
});

test('restoring the original text does NOT restore approval', () => {
  const k = L.generateKit({ topic: 'add100' });
  const orig = k.task.ru[0];
  L.approve(k, 'teacher');
  L.editKit(k, 'task', 'ru', 0, 'другое');
  L.editKit(k, 'task', 'ru', 0, orig);
  assert.strictEqual(L.isApproved(k), false);
});

test('all generated kits pass the privacy filter (so print/tts are not blocked)', () => {
  for (const topic of Object.keys(L.TOPICS)) for (const level of ['basic', 'fluent']) for (let v = 0; v < 20; v++) {
    const k = L.generateKit({ topic, level, grade: 3, variant: v });
    for (const lang of ['kk', 'ru']) {
      const all = [].concat(k.goal[lang], k.schedule.map(s => s[lang]), k.task[lang], k.story[lang]);
      for (const piece of all) assert.strictEqual(L.sanitizeForExternal(piece).ok, true, topic + ' ' + lang + ' ' + piece + ' ' + JSON.stringify(L.sanitizeForExternal(piece).issues));
    }
  }
});

test('privacy filter blocks identifiers (basic safeguard)', () => {
  assert.strictEqual(L.sanitizeForExternal('Реши 25 + 17').ok, true);
  assert.strictEqual(L.sanitizeForExternal('Пиши на a@b.kz').ok, false);
  assert.strictEqual(L.sanitizeForExternal('ИИН 123456789012').ok, false);
  assert.strictEqual(L.sanitizeForExternal('+7 701 123 45 67').ok, false);
  assert.strictEqual(L.sanitizeForExternal('+7​701​123​45​67').ok, false); // hidden separators
  assert.strictEqual(L.sanitizeForExternal('Иванов Иван решает').ok, false); // name-like
  assert.strictEqual(L.sanitizeForExternal('Живёт на ул. Абая').ok, false); // address-like
});

test('summary hidden until enough observations; unclear excluded', () => {
  assert.strictEqual(L.summarize([ob('none', 'done'), ob('none', 'done')]).enough, false);
  const few = [ob('none', 'done'), ob('none', 'unclear'), ob('hint', 'done'), ob('hint', 'partial'), ob('adult', 'done')];
  assert.strictEqual(L.summarize(few).enough, false);
  const s = L.summarize(few.concat([ob('adult', 'refused', { discomfort: true })]));
  assert.strictEqual(s.enough, true); assert.strictEqual(s.valid, 5);
  assert.strictEqual(s.note, 'observation-not-evidence'); assert.strictEqual(s.discomfort, 1);
});

test('demo records never count toward the real summary', () => {
  const demo = Array.from({ length: 18 }, () => ob('none', 'done', { demo: true }));
  assert.strictEqual(L.summarize(demo).enough, false);
  assert.strictEqual(L.summarize(demo, 'demo').enough, true);
  assert.strictEqual(L.summarize(demo.concat([ob('none', 'done')])).total, 1);
});

test('backup round trip and corrupted file handling', () => {
  const st = { observations: [ob('none', 'done')], settings: { cfs: 1.4, hc: true, sound: true } };
  const res = L.importBackup(L.exportBackup(st));
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.state.observations.length, 1);
  assert.strictEqual(res.state.settings.sound, false); // import never turns sound on
  const txt = L.exportBackup(st);
  assert.strictEqual(L.importBackup('not json').error, 'bad-json');
  assert.strictEqual(L.importBackup(txt.replace('done', 'dine')).ok, false);
  const o = JSON.parse(txt); o.version = 99;
  assert.strictEqual(L.importBackup(JSON.stringify(o)).error, 'bad-version');
  assert.strictEqual(L.importBackup('{"a":1}').error, 'bad-shape');
});

test('import rejects empty records and clamps settings', () => {
  const mk = (state) => { const body = JSON.stringify({ version: 1, state }); return JSON.stringify({ version: 1, body, checksum: require('crypto') && L.exportBackup && JSON.parse(L.exportBackup({ observations: [], settings: {} })).checksum }); };
  // build a valid-checksum file with five empty objects by using the logic's own export on raw state
  const raw = L.exportBackup({ observations: [{}, {}, {}, {}, {}], settings: { cfs: 0 } });
  assert.strictEqual(L.importBackup(raw).error, 'bad-records');
  const good = L.importBackup(L.exportBackup({ observations: [], settings: { cfs: 0 } }));
  assert.strictEqual(good.ok, true);
  assert.ok(good.state.settings.cfs >= 1);
});

test('cleanState survives corrupted storage', () => {
  const s = L.cleanState({ view: 'hax', lang: 'xx', size: 9, observations: [{}, 5, null, ob('none', 'done')], settings: { cfs: 0 } });
  assert.strictEqual(s.view, 'kit'); assert.strictEqual(s.lang, 'ru'); assert.strictEqual(s.size, 0);
  assert.strictEqual(s.observations.length, 1); assert.ok(s.settings.cfs >= 1);
  assert.doesNotThrow(() => L.cleanState(null)); assert.doesNotThrow(() => L.cleanState('x'));
});

test('dev-server path safety', () => {
  assert.ok(S.resolveSafe('/index.html'));
  assert.ok(S.resolveSafe('/'));
  assert.strictEqual(S.resolveSafe('/..%2fdist-private/secret.txt'), null);
  assert.strictEqual(S.resolveSafe('/../package.json'), null);
  assert.strictEqual(S.resolveSafe('/%'), null); // malformed URL must not throw
  assert.strictEqual(S.resolveSafe('/a%00b'), null);
});
