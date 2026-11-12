const test = require('node:test');
const assert = require('node:assert');
const L = require('../dist/logic.js');

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

test('approval is bound to version: any edit cancels it', () => {
  const k = L.generateKit({ topic: 'time' });
  assert.strictEqual(L.isApproved(k), false);
  L.approve(k, 'teacher');
  assert.strictEqual(L.isApproved(k), true);
  L.editKit(k, 'task', 'ru', 0, 'Новый текст');
  assert.strictEqual(L.isApproved(k), false);
});

test('privacy filter blocks identifiers', () => {
  assert.strictEqual(L.sanitizeForExternal('Реши 25 + 17').ok, true);
  assert.strictEqual(L.sanitizeForExternal('Пиши на a@b.kz').ok, false);
  assert.strictEqual(L.sanitizeForExternal('ИИН 123456789012').ok, false);
  assert.strictEqual(L.sanitizeForExternal('+7 701 123 45 67').ok, false);
});

test('summary hidden until enough observations; unclear excluded', () => {
  const o = (help, result, discomfort) => ({ help, result, discomfort: !!discomfort });
  assert.strictEqual(L.summarize([o('none', 'done'), o('none', 'done')]).enough, false);
  const few = [o('none', 'done'), o('none', 'unclear'), o('hint', 'done'), o('hint', 'partial'), o('adult', 'done')];
  assert.strictEqual(L.summarize(few).enough, false); // only 4 valid
  const ok = few.concat([o('adult', 'refused', true)]);
  const s = L.summarize(ok);
  assert.strictEqual(s.enough, true);
  assert.strictEqual(s.valid, 5);
  assert.strictEqual(s.note, 'observation-not-evidence');
  assert.strictEqual(s.discomfort, 1);
});

test('backup round trip and corrupted file handling', () => {
  const st = { observations: [{ result: 'done' }], settings: {} };
  const txt = L.exportBackup(st);
  assert.deepStrictEqual(L.importBackup(txt).state, st);
  assert.strictEqual(L.importBackup('not json').error, 'bad-json');
  assert.strictEqual(L.importBackup(txt.replace('done', 'dine')).ok, false);
  const o = JSON.parse(txt); o.version = 99;
  assert.strictEqual(L.importBackup(JSON.stringify(o)).error, 'bad-version');
  assert.strictEqual(L.importBackup('{"a":1}').error, 'bad-shape');
});
