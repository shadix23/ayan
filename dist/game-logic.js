/* Ayan games: pure logic (UMD), no DOM, no network. Testable in Node.
   Games: pairs (Найди пару), sequence (Собери последовательность), sort (Разложи по группам).
   Rules follow docs plan: no penalties, no streaks, reward once per completionId. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AyanGameLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA = 1, CONTENT_VERSION = 1;
  var GAMES = ['pairs', 'sequence', 'sort'];

  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  // seeded Fisher-Yates: same seed -> same order
  function shuffle(arr, seed) { var a = arr.slice(), r = rng(seed); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function T(kk, ru) { return { kk: kk, ru: ru }; }

  // ---------- demo content: 2 small sets per game, ru + kk (kk awaits native-speaker review) ----------
  var SETS = {
    pairs: [
      { id: 'p-add', title: T('Өрнек және жауап', 'Выражение и ответ'), items: [
        { id: 'a1', left: T('12 + 3', '12 + 3'), right: T('15', '15') },
        { id: 'a2', left: T('20 - 2', '20 - 2'), right: T('18', '18') },
        { id: 'a3', left: T('30 + 5', '30 + 5'), right: T('35', '35') },
        { id: 'a4', left: T('40 - 10', '40 - 10'), right: T('30', '30') }] },
      { id: 'p-time', title: T('Сағат және уақыт', 'Часы и время'), items: [
        { id: 't1', left: T('3:00', '3:00'), right: T('сағат үш', 'три часа') },
        { id: 't2', left: T('6:30', '6:30'), right: T('алты жарым', 'половина седьмого') },
        { id: 't3', left: T('9:00', '9:00'), right: T('сағат тоғыз', 'девять часов') },
        { id: 't4', left: T('12:00', '12:00'), right: T('сағат он екі', 'двенадцать часов') }] }
    ],
    sequence: [
      { id: 's-lesson', title: T('Сабақ қадамдары', 'Шаги урока'), items: [
        { id: 'l1', text: T('Дәптерді дайында', 'Приготовь тетрадь') },
        { id: 'l2', text: T('Тапсырманы оқы', 'Прочитай задание') },
        { id: 'l3', text: T('Тапсырманы орында', 'Выполни задание') },
        { id: 'l4', text: T('Жауабыңды тексер', 'Проверь ответ') }] },
      { id: 's-problem', title: T('Есеп шығару', 'Решение задачи'), items: [
        { id: 'w1', text: T('Есепті оқы', 'Прочитай задачу') },
        { id: 'w2', text: T('Сандарды тап', 'Найди числа') },
        { id: 'w3', text: T('Амалды таңда', 'Выбери действие') },
        { id: 'w4', text: T('Жауапты жаз', 'Запиши ответ') }] }
    ],
    sort: [
      { id: 'c-50', title: T('50-ге дейін және 50-ден көп', 'До 50 и больше 50'),
        categories: [{ id: 'le50', label: T('50-ге дейін (50 қоса)', 'До 50 включительно') }, { id: 'gt50', label: T('50-ден көп', 'Больше 50') }],
        items: [{ id: 'n12', text: T('12', '12'), cats: ['le50'] }, { id: 'n50', text: T('50', '50'), cats: ['le50'] }, { id: 'n51', text: T('51', '51'), cats: ['gt50'] }, { id: 'n87', text: T('87', '87'), cats: ['gt50'] }] },
      { id: 'c-even', title: T('Жұп және тақ', 'Чётные и нечётные'),
        categories: [{ id: 'even', label: T('Жұп сандар', 'Чётные числа') }, { id: 'odd', label: T('Тақ сандар', 'Нечётные числа') }],
        items: [{ id: 'e8', text: T('8', '8'), cats: ['even'] }, { id: 'e13', text: T('13', '13'), cats: ['odd'] }, { id: 'e20', text: T('20', '20'), cats: ['even'] }, { id: 'e7', text: T('7', '7'), cats: ['odd'] }] }
    ]
  };

  function findSet(gameId, setId) { return (SETS[gameId] || []).filter(function (s) { return s.id === setId; })[0] || null; }

  // content checks: ambiguous sets must not pass
  function validateSet(gameId, set) {
    var errs = [];
    if (!set || !Array.isArray(set.items) || set.items.length < 2) return ['too-few-items'];
    var ids = set.items.map(function (i) { return i.id; });
    if (new Set(ids).size !== ids.length) errs.push('duplicate-id');
    ['kk', 'ru'].forEach(function (lang) {
      if (gameId === 'pairs') {
        var rights = set.items.map(function (i) { return i.right && i.right[lang]; });
        var lefts = set.items.map(function (i) { return i.left && i.left[lang]; });
        if (new Set(rights).size !== rights.length) errs.push('ambiguous-answer-' + lang);
        if (new Set(lefts).size !== lefts.length) errs.push('duplicate-left-' + lang);
      }
    });
    if (gameId === 'sequence' && set.items.length < 3) errs.push('sequence-too-short');
    if (gameId === 'sort') {
      var cats = (set.categories || []).map(function (c) { return c.id; });
      if (cats.length < 2) errs.push('too-few-categories');
      set.items.forEach(function (i) { if (!Array.isArray(i.cats) || !i.cats.length || i.cats.some(function (c) { return cats.indexOf(c) < 0; })) errs.push('bad-category-' + i.id); });
    }
    return errs;
  }

  // ---------- config + approval (bound to content hash, like lesson kits) ----------
  function makeConfig(gameId, setId, lang, opts) {
    var set = findSet(gameId, setId); if (!set) return null;
    opts = opts || {};
    var cfg = { schemaVersion: SCHEMA, gameId: gameId, setId: setId, contentVersion: CONTENT_VERSION, lang: lang === 'kk' ? 'kk' : 'ru',
      motion: opts.motion !== false, sound: opts.sound === true, sourceKitHash: opts.sourceKitHash || null, approved: null };
    cfg.hash = configHash(cfg);
    return cfg;
  }
  function configHash(cfg) { var set = findSet(cfg.gameId, cfg.setId); return hash(JSON.stringify({ g: cfg.gameId, s: cfg.setId, v: cfg.contentVersion, l: cfg.lang, set: set })); }
  function approveConfig(cfg) { cfg.hash = configHash(cfg); cfg.approved = { hash: cfg.hash, at: Date.now() }; return cfg; }
  function isConfigApproved(cfg) { return !!(cfg && cfg.approved && cfg.approved.hash === configHash(cfg)); }
  function setConfigLang(cfg, lang) { cfg.lang = lang === 'kk' ? 'kk' : 'ru'; cfg.approved = null; cfg.hash = configHash(cfg); return cfg; }

  // ---------- session ----------
  // states: intro -> playing <-> feedback -> completed; paused from playing/feedback
  function createSession(cfg, seed) {
    var set = findSet(cfg.gameId, cfg.setId);
    seed = seed >>> 0 || 1;
    var s = { schemaVersion: SCHEMA, sessionId: 'g' + seed.toString(16) + '-' + cfg.hash, configHash: cfg.hash, gameId: cfg.gameId, setId: cfg.setId, lang: cfg.lang,
      seed: seed, status: 'intro', prevStatus: null, attempts: 0, hintsUsed: 0, assisted: false, total: set.items.length, done: 0, hint: null };
    if (cfg.gameId === 'pairs') { s.leftOrder = shuffle(set.items.map(function (i) { return i.id; }), seed); s.rightOrder = shuffle(set.items.map(function (i) { return i.id; }), seed + 7); s.matched = []; s.selected = null; }
    if (cfg.gameId === 'sequence') {
      var ids = set.items.map(function (i) { return i.id; }), order = shuffle(ids, seed);
      if (order.join() === ids.join()) order = ids.slice(1).concat(ids[0]); // never start already solved
      s.order = order; s.locked = 0; s.selectedIdx = null;
    }
    if (cfg.gameId === 'sort') { s.order = shuffle(set.items.map(function (i) { return i.id; }), seed); s.placed = {}; s.selected = null; }
    return s;
  }
  function active(s) { return s.status === 'playing' || s.status === 'feedback'; }
  function start(s) { if (s.status === 'intro') s.status = 'playing'; return s; }
  function pause(s) { if (active(s)) { s.prevStatus = s.status; s.status = 'paused'; } return s; }
  function resume(s) { if (s.status === 'paused') { s.status = 'playing'; s.prevStatus = null; } return s; }
  function finish(s) { s.status = 'completed'; s.hint = null; return { s: s, event: 'session:complete' }; }

  // pairs: select left then right
  function pairsPick(s, side, id) {
    if (!active(s) || s.gameId !== 'pairs' || s.matched.indexOf(id) >= 0) return { s: s, event: null };
    s.status = 'playing';
    if (side === 'left') { s.selected = id; return { s: s, event: 'select' }; }
    if (!s.selected) return { s: s, event: 'need-left' };
    s.attempts++;
    if (s.selected === id) { s.matched.push(id); s.done = s.matched.length; s.selected = null; s.hint = null; if (s.done === s.total) return finish(s); return { s: s, event: 'answer:correct' }; }
    s.status = 'feedback'; return { s: s, event: 'answer:retry' };
  }
  // sequence: select a card, move it left/right; check by button
  function seqMove(s, idx, dir) {
    if (!active(s) || s.gameId !== 'sequence') return { s: s, event: null };
    var j = idx + dir;
    if (idx < s.locked || j < s.locked || j < 0 || j >= s.order.length) return { s: s, event: null };
    var t = s.order[idx]; s.order[idx] = s.order[j]; s.order[j] = t; s.selectedIdx = j; s.status = 'playing';
    return { s: s, event: 'move' };
  }
  function seqSwap(s, i, j) {
    if (!active(s) || s.gameId !== 'sequence' || i < s.locked || j < s.locked || i === j) return { s: s, event: null };
    var t = s.order[i]; s.order[i] = s.order[j]; s.order[j] = t; s.selectedIdx = null; s.status = 'playing';
    return { s: s, event: 'move' };
  }
  function seqCheck(s) {
    if (!active(s) || s.gameId !== 'sequence') return { s: s, event: null };
    var set = findSet(s.gameId, s.setId), ids = set.items.map(function (i) { return i.id; });
    s.attempts++;
    var ok = 0; while (ok < ids.length && s.order[ok] === ids[ok]) ok++;
    s.done = ok;
    if (ok === ids.length) return finish(s);
    s.status = 'feedback'; return { s: s, event: 'answer:retry' };
  }
  // sort: choose item, then category; check against stored categoryIds, not label text
  function sortPlace(s, itemId, catId) {
    if (!active(s) || s.gameId !== 'sort' || s.placed[itemId]) return { s: s, event: null };
    var item = findSet(s.gameId, s.setId).items.filter(function (i) { return i.id === itemId; })[0];
    if (!item) return { s: s, event: null };
    s.attempts++;
    if (item.cats.indexOf(catId) >= 0) { s.placed[itemId] = catId; s.selected = null; s.hint = null; s.done = Object.keys(s.placed).length; s.status = 'playing'; if (s.done === s.total) return finish(s); return { s: s, event: 'answer:correct' }; }
    s.status = 'feedback'; return { s: s, event: 'answer:retry' }; // earlier correct answers stay
  }

  // hint: pairs -> highlight a left card and its match; sequence -> lock next correct step; sort -> explain rule, then point to the right group
  function hint(s) {
    if (!active(s)) return { s: s, event: null };
    var set = findSet(s.gameId, s.setId);
    s.hintsUsed++; s.assisted = true; s.status = 'playing';
    if (s.gameId === 'pairs') { var id = s.selected && s.matched.indexOf(s.selected) < 0 ? s.selected : s.leftOrder.filter(function (x) { return s.matched.indexOf(x) < 0; })[0]; s.selected = id; s.hint = { left: id, right: id }; }
    if (s.gameId === 'sequence') {
      var ids = set.items.map(function (i) { return i.id; }), k = s.locked;
      while (k < ids.length && s.order[k] === ids[k]) k++;
      if (k < ids.length) { var from = s.order.indexOf(ids[k]); s.order.splice(from, 1); s.order.splice(k, 0, ids[k]); }
      s.locked = Math.min(ids.length, k + 1); s.done = s.locked; s.hint = { locked: s.locked };
      if (s.locked === ids.length) return finish(s);
    }
    if (s.gameId === 'sort') {
      var next = s.selected && !s.placed[s.selected] ? s.selected : s.order.filter(function (x) { return !s.placed[x]; })[0];
      var it = set.items.filter(function (i) { return i.id === next; })[0];
      s.selected = next; s.hint = { step: s.hint && s.hint.item === next ? 2 : 1, item: next, cat: it.cats[0] };
    }
    return { s: s, event: 'hint:show' };
  }

  // ---------- progress / rewards (once per completionId) ----------
  function completionId(s) { return s.sessionId; }
  function grantReward(progress, s) {
    progress = progress || { completed: [], rewards: [] };
    if (s.status !== 'completed') return { progress: progress, granted: false };
    var cid = completionId(s);
    if (progress.rewards.indexOf(cid) >= 0) return { progress: progress, granted: false };
    progress.rewards.push(cid);
    if (progress.completed.indexOf(s.sessionId) < 0) progress.completed.push(s.sessionId);
    return { progress: progress, granted: true };
  }

  // ---------- storage validation (key ayan.games.v1); never throws ----------
  function cleanStore(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var out = { schemaVersion: SCHEMA, config: null, session: null, progress: { completed: [], rewards: [] } };
    var cfg = raw.config;
    if (cfg && GAMES.indexOf(cfg.gameId) >= 0 && findSet(cfg.gameId, cfg.setId)) {
      out.config = { schemaVersion: SCHEMA, gameId: cfg.gameId, setId: cfg.setId, contentVersion: CONTENT_VERSION, lang: cfg.lang === 'kk' ? 'kk' : 'ru', motion: cfg.motion !== false, sound: cfg.sound === true, sourceKitHash: typeof cfg.sourceKitHash === 'string' ? cfg.sourceKitHash : null, approved: cfg.approved && typeof cfg.approved.hash === 'string' ? { hash: cfg.approved.hash, at: +cfg.approved.at || 0 } : null };
      out.config.hash = configHash(out.config);
    }
    var s = raw.session;
    if (s && out.config && s.configHash === out.config.hash && s.gameId === out.config.gameId && ['intro', 'playing', 'feedback', 'paused'].indexOf(s.status) >= 0) {
      var fresh = createSession(out.config, s.seed);
      var set = findSet(fresh.gameId, fresh.setId), ids = set.items.map(function (i) { return i.id; });
      var sameIds = function (a) { return Array.isArray(a) && a.length === ids.length && a.slice().sort().join() === ids.slice().sort().join(); };
      fresh.status = s.status === 'intro' ? 'intro' : 'paused'; // a restored session always resumes from pause
      fresh.attempts = +s.attempts || 0; fresh.hintsUsed = +s.hintsUsed || 0; fresh.assisted = s.assisted === true;
      if (fresh.gameId === 'pairs' && Array.isArray(s.matched)) { fresh.matched = s.matched.filter(function (x) { return ids.indexOf(x) >= 0; }); fresh.done = fresh.matched.length; }
      if (fresh.gameId === 'sequence' && sameIds(s.order)) { fresh.order = s.order.slice(); fresh.locked = Math.max(0, Math.min(ids.length, +s.locked || 0)); fresh.done = fresh.locked; }
      if (fresh.gameId === 'sort' && s.placed && typeof s.placed === 'object') {
        Object.keys(s.placed).forEach(function (k) { var it = set.items.filter(function (i) { return i.id === k; })[0]; if (it && it.cats.indexOf(s.placed[k]) >= 0) fresh.placed[k] = s.placed[k]; });
        fresh.done = Object.keys(fresh.placed).length;
      }
      out.session = fresh;
    }
    var p = raw.progress;
    if (p && Array.isArray(p.rewards)) out.progress = { completed: (p.completed || []).filter(function (x) { return typeof x === 'string'; }), rewards: p.rewards.filter(function (x) { return typeof x === 'string'; }) };
    return out;
  }

  return { SETS: SETS, GAMES: GAMES, findSet: findSet, validateSet: validateSet, shuffle: shuffle, makeConfig: makeConfig, configHash: configHash,
    approveConfig: approveConfig, isConfigApproved: isConfigApproved, setConfigLang: setConfigLang, createSession: createSession, start: start, pause: pause, resume: resume,
    pairsPick: pairsPick, seqMove: seqMove, seqSwap: seqSwap, seqCheck: seqCheck, sortPlace: sortPlace, hint: hint, grantReward: grantReward, completionId: completionId, cleanStore: cleanStore };
});
