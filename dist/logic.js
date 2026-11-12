/* Ayan logic: pure functions (UMD), testable in Node. No network, no personal data. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AyanLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FORMAT_VERSION = 1;
  var MIN_OBS = 5; // minimum observations before a summary is shown

  var TOPICS = {
    add100:  { icon: '➕', kk: '100-ге дейін қосу',        ru: 'Сложение до 100' },
    sub100:  { icon: '➖', kk: '100-ге дейін азайту',      ru: 'Вычитание до 100' },
    word1:   { icon: '📖', kk: 'Бір амалды есеп',          ru: 'Задача в одно действие' },
    time:    { icon: '🕒', kk: 'Уақыт және сағат',          ru: 'Время и часы' }
  };

  // deterministic pseudo random so the same inputs give the same kit
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function seedOf(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function hash(str) { return seedOf(str).toString(16); }
  function pick(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }

  function numbersFor(topic, seedStr) {
    var r = rng(seedOf(seedStr));
    if (topic === 'add100') { var a = pick(r, 11, 48), b = pick(r, 11, 40); return { a: a, b: b, ans: a + b }; }
    if (topic === 'sub100') { var x = pick(r, 52, 95), y = pick(r, 11, 49); return { a: x, b: y, ans: x - y }; }
    if (topic === 'word1') { var p = pick(r, 12, 40), q = pick(r, 11, 30); return { a: p, b: q, ans: p + q }; }
    var h = pick(r, 1, 11), m = [0, 30][pick(r, 0, 1)]; return { h: h, m: m };
  }

  function taskText(topic, n, level) {
    var short = level === 'basic';
    if (topic === 'add100') return {
      kk: [short ? 'Бізде ' + n.a + ' сан бар.' : n.a + ' санын ал.', n.b + ' санын қос.', 'Нәтижені жаз: ' + n.a + ' + ' + n.b + ' = ?'],
      ru: [short ? 'У нас число ' + n.a + '.' : 'Возьми число ' + n.a + '.', 'Прибавь число ' + n.b + '.', 'Запиши: ' + n.a + ' + ' + n.b + ' = ?'],
      answer: String(n.ans) };
    if (topic === 'sub100') return {
      kk: [short ? 'Бізде ' + n.a + ' сан бар.' : n.a + ' санын ал.', n.b + ' санын алып таста.', 'Нәтижені жаз: ' + n.a + ' - ' + n.b + ' = ?'],
      ru: [short ? 'У нас число ' + n.a + '.' : 'Возьми число ' + n.a + '.', 'Отними число ' + n.b + '.', 'Запиши: ' + n.a + ' - ' + n.b + ' = ?'],
      answer: String(n.ans) };
    if (topic === 'word1') return {
      kk: ['Сөреде ' + n.a + ' кітап тұр.', 'Тағы ' + n.b + ' кітап әкелді.', 'Сұрақ: барлығы қанша кітап?', 'Жаз: ' + n.a + ' + ' + n.b + ' = ?'],
      ru: ['На полке ' + n.a + ' книг.', 'Принесли ещё ' + n.b + ' книг.', 'Вопрос: сколько всего книг?', 'Запиши: ' + n.a + ' + ' + n.b + ' = ?'],
      answer: String(n.ans) };
    var mm = n.m === 0 ? '00' : '30';
    return {
      kk: ['Қысқа тілшік сағатты көрсетеді.', 'Ұзын тілшік минутты көрсетеді.', 'Сағат ' + n.h + ':' + mm + '.', 'Сұрақ: қазір сағат неше?'],
      ru: ['Короткая стрелка показывает часы.', 'Длинная стрелка показывает минуты.', 'На часах ' + n.h + ':' + mm + '.', 'Вопрос: сколько сейчас времени?'],
      answer: n.h + ':' + mm };
  }

  function scheduleSteps(topic) {
    return [
      { id: 'prep',  icon: '🎒', kk: 'Дәптер мен қарындашты дайында', ru: 'Приготовь тетрадь и карандаш' },
      { id: 'look',  icon: '👀', kk: 'Тапсырманы оқы',                ru: 'Прочитай задание' },
      { id: 'do',    icon: '✏️', kk: 'Тапсырманы орында',             ru: 'Выполни задание' },
      { id: 'check', icon: '✅', kk: 'Жауабыңды тексер',              ru: 'Проверь ответ' },
      { id: 'break', icon: '🌿', kk: 'Қысқа демалыс',                 ru: 'Короткий перерыв' }
    ];
  }

  function socialStory(topic) {
    var t = TOPICS[topic];
    return {
      kk: ['Қазір математика сабағы болады.', 'Біз «' + t.kk + '» тақырыбын орындаймыз.', 'Бұл тапсырма қиын болса, мен «Маған қиын» батырмасын баса аламын.', 'Мен үзіліс сұрай аламын.', 'Орындаған соң мен демаламын.'],
      ru: ['Сейчас будет урок математики.', 'Мы выполним тему «' + t.ru + '».', 'Если задание трудное, я могу нажать «Мне трудно».', 'Я могу попросить перерыв.', 'Когда закончу, я отдохну.']
    };
  }

  // goalId, topic, grade (3|4), level (basic|fluent), variant counter
  function generateKit(opts) {
    var topic = TOPICS[opts.topic] ? opts.topic : 'add100';
    var level = opts.level === 'fluent' ? 'fluent' : 'basic';
    var variant = opts.variant | 0;
    var n = numbersFor(topic, topic + '|' + level + '|' + (opts.grade || 3) + '|' + variant);
    var task = taskText(topic, n, level);
    var kit = {
      topic: topic, level: level, grade: opts.grade || 3, variant: variant,
      goal: { kk: 'Мақсат: ' + TOPICS[topic].kk, ru: 'Цель: ' + TOPICS[topic].ru },
      schedule: scheduleSteps(topic),
      task: task,
      story: socialStory(topic),
      source: 'demo-template', // not expert reviewed
      approved: null
    };
    kit.hash = kitHash(kit);
    return kit;
  }

  function kitHash(kit) {
    return hash(JSON.stringify({ g: kit.goal, s: kit.schedule, t: kit.task, st: kit.story, a: kit.audio || null }));
  }

  // approval is bound to the content hash: any edit invalidates it
  function approve(kit, byLabel) { kit.hash = kitHash(kit); kit.approved = { hash: kit.hash, by: String(byLabel || 'adult').slice(0, 40), at: Date.now() }; return kit; }
  function isApproved(kit) { return !!(kit && kit.approved && kit.approved.hash === kitHash(kit)); }
  function editKit(kit, path, lang, index, text) {
    var clean = String(text).slice(0, 200);
    if (path === 'task') kit.task[lang][index] = clean;
    else if (path === 'story') kit.story[lang][index] = clean;
    else if (path === 'schedule') kit.schedule[index][lang] = clean;
    kit.approved = null; // any edit cancels approval, even if the text is later restored
    kit.hash = kitHash(kit);
    return kit;
  }

  // privacy filter before text leaves the device (TTS / AI): blocks identifiers
  function sanitizeForExternal(text) {
    var raw = String(text || '');
    // strip zero-width / invisible chars so separators cannot hide identifiers
    var t = raw.replace(/[​-‏⁠﻿­]/g, '');
    var issues = [];
    if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(t)) issues.push('email');
    if (t.replace(/\D/g, '').length >= 9 && /\d[\d\s().+-]{7,}\d/.test(t)) issues.push('phone-or-id');
    if (/\d{6,}/.test(t)) issues.push('long-number');
    // name-like: two consecutive capitalised words (basic safeguard, not a guarantee)
    if (/(^|[^\p{L}])\p{Lu}\p{Ll}{2,}\s+\p{Lu}\p{Ll}{2,}/u.test(t)) issues.push('name-like');
    // \b does not work for Cyrillic in JS, so use unicode-aware lookarounds
    if (/(?<!\p{L})(ул\.|улица|көшесі|көше|дом|кв\.|street)(?!\p{L})/iu.test(t)) issues.push('address-like');
    if (t.length > 400) issues.push('too-long');
    if (t !== raw) issues.push('hidden-chars');
    return { ok: issues.length === 0, issues: issues, text: t };
  }

  // observation: {t, kitHash, topic, help: none|hint|adult, result: done|partial|refused|unclear, discomfort: bool}
  // mode: 'real' (default) ignores synthetic demo records; 'demo' uses only them
  function summarize(allObs, mode) {
    var wantDemo = mode === 'demo';
    var obs = (allObs || []).filter(function (o) { return o && !!o.demo === wantDemo; });
    var list = obs.filter(function (o) { return o.result !== 'unclear'; });
    var total = obs.length;
    if (list.length < MIN_OBS) return { enough: false, total: total, need: MIN_OBS, valid: list.length };
    var by = {};
    ['none', 'hint', 'adult'].forEach(function (h) { by[h] = { n: 0, done: 0 }; });
    var disc = 0;
    list.forEach(function (o) { var b = by[o.help] || by.none; b.n++; if (o.result === 'done') b.done++; if (o.discomfort) disc++; });
    var rows = Object.keys(by).map(function (h) { return { help: h, n: by[h].n, rate: by[h].n ? by[h].done / by[h].n : null }; });
    return { enough: true, demo: wantDemo, total: total, valid: list.length, rows: rows, discomfort: disc, discomfortRate: disc / list.length,
      note: 'observation-not-evidence' };
  }

  var HELPS = ['none', 'hint', 'adult'], RESULTS = ['done', 'partial', 'refused', 'unclear'], VIEWS = ['home', 'kit', 'track', 'sum', 'data'];

  function cleanObs(o) {
    if (!o || typeof o !== 'object') return null;
    if (HELPS.indexOf(o.help) < 0 || RESULTS.indexOf(o.result) < 0 || !TOPICS[o.topic]) return null;
    if (typeof o.t !== 'number' || !isFinite(o.t)) return null;
    return { t: o.t, topic: o.topic, help: o.help, result: o.result, discomfort: o.discomfort === true, demo: o.demo === true, kitHash: typeof o.kitHash === 'string' ? o.kitHash.slice(0, 16) : null };
  }
  function cleanSettings(st, keepSound) {
    st = st && typeof st === 'object' ? st : {};
    var cfs = typeof st.cfs === 'number' && isFinite(st.cfs) ? Math.min(2.2, Math.max(1, st.cfs)) : 1.4;
    return { cfs: cfs, hc: st.hc === true, sound: keepSound ? st.sound === true : false };
  }
  // sanitize whole saved state (localStorage or imported); never throws
  function cleanState(raw, fromImport) {
    raw = raw && typeof raw === 'object' ? raw : {};
    return {
      lang: raw.lang === 'kk' ? 'kk' : 'ru',
      size: [0, 1, 2].indexOf(raw.size) >= 0 ? raw.size : 0,
      view: VIEWS.indexOf(raw.view) >= 0 ? raw.view : 'home',
      observations: Array.isArray(raw.observations) ? raw.observations.map(cleanObs).filter(Boolean) : [],
      settings: cleanSettings(raw.settings, !fromImport) // an imported file never switches sound on
    };
  }

  function exportBackup(state) {
    var body = JSON.stringify({ version: FORMAT_VERSION, state: { observations: state.observations, settings: state.settings } });
    return JSON.stringify({ version: FORMAT_VERSION, checksum: hash(body), body: body });
  }
  function importBackup(text) {
    var outer;
    try { outer = JSON.parse(text); } catch (e) { return { ok: false, error: 'bad-json' }; }
    if (!outer || typeof outer.body !== 'string') return { ok: false, error: 'bad-shape' };
    if (outer.version !== FORMAT_VERSION) return { ok: false, error: 'bad-version' };
    if (hash(outer.body) !== outer.checksum) return { ok: false, error: 'bad-checksum' };
    var inner;
    try { inner = JSON.parse(outer.body); } catch (e2) { return { ok: false, error: 'bad-json' }; }
    if (!inner || inner.version !== FORMAT_VERSION || !inner.state || !Array.isArray(inner.state.observations)) return { ok: false, error: 'bad-shape' };
    var good = inner.state.observations.map(cleanObs).filter(Boolean);
    if (good.length !== inner.state.observations.length) return { ok: false, error: 'bad-records' };
    return { ok: true, state: { observations: good, settings: cleanSettings(inner.state.settings, false) } };
  }

  return { TOPICS: TOPICS, MIN_OBS: MIN_OBS, generateKit: generateKit, kitHash: kitHash, approve: approve, isApproved: isApproved,
    editKit: editKit, sanitizeForExternal: sanitizeForExternal, summarize: summarize, exportBackup: exportBackup, importBackup: importBackup, cleanState: cleanState };
});
