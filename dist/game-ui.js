/* Ayan games UI: teacher catalog + setup/approval, and the calm child game screen.
   Logic lives in game-logic.js (pure); mascot in mascot.js. Storage key: ayan.games.v1 (separate from ayan.state.v1). */
(function (root) {
  'use strict';
  var G = root.AyanGameLogic, M = root.AyanMascot;
  var KEY = 'ayan.games.v1';
  var ctx = null, store = null, mascot = null, setupGame = null, feedback = '';

  var D = {
    h: ['Аянмен ойындар', 'Игры с Аяном'],
    h_p: ['Қысқа оқу ойындары. Мұғалім жинақты таңдап, бекітеді; бала бөлек тыныш экранда ойнайды. Ойын диагноз қоймайды.', 'Короткие учебные игры. Учитель выбирает и утверждает задание; ребёнок играет на отдельном спокойном экране. Игры не дают диагностических выводов.'],
    pairs: ['Жұбын тап', 'Найди пару'], pairs_p: ['Сол жақтағы карточканы, содан кейін оң жақтағы жұбын таңда.', 'Выбери карточку слева, затем её пару справа.'], pairs_ex: ['Мысалы: 12 + 3 және 15', 'Пример: 12 + 3 и 15'],
    sequence: ['Ретімен қой', 'Собери последовательность'], sequence_p: ['Карточкаларды дұрыс ретпен қой, содан кейін «Тексеру» бас.', 'Поставь карточки по порядку и нажми «Проверить».'], sequence_ex: ['Мысалы: дайында, оқы, орында, тексер', 'Пример: приготовь, прочитай, выполни, проверь'],
    sort: ['Топтарға бөл', 'Разложи по группам'], sort_p: ['Карточканы таңда, содан кейін топты таңда.', 'Выбери карточку, затем группу.'], sort_ex: ['Мысалы: 50-ге дейін (50 қоса) және 50-ден көп', 'Пример: до 50 включительно и больше 50'],
    setup: ['Баптау', 'Настроить'], back: ['Каталогқа', 'К каталогу'], set: ['Жинақ', 'Набор карточек'], preview: ['Алдын ала қарау', 'Предварительный просмотр'],
    motion: ['Аянның қозғалысы', 'Движение Аяна'], sound: ['Дыбыс (демода жоқ)', 'Звук (в демо нет)'],
    approve: ['Ересек бекітеді', 'Утвердить как взрослый'], approved: ['Бекітілген', 'Утверждено'], notapp: ['Бекітілмеген: ойынды бастауға болмайды', 'Не утверждено: запускать нельзя'],
    start: ['Бала экранында бастау', 'Запустить на экране ребёнка'], cont: ['Жалғастыру', 'Продолжить'], restart: ['Басынан бастау', 'Начать заново'],
    saved_s: ['Аяқталмаған ойын сақталған.', 'Есть сохранённая незавершённая игра.'],
    done_n: ['Аяқталған ойындар', 'Завершённых игр'], from_kit: ['Сабақ жинағынан: тақырып пен тіл сақталды.', 'Из комплекта урока: тема и язык сохранены.'],
    demo: ['демо-жинақ, сарапшы тексеруін күтеді', 'демо-набор, ждёт экспертной проверки'], kknote: ['Қазақша мәтіндер тексеруді күтеді.', 'Казахские тексты ждут проверки носителем.'],
    store_bad: ['Ойын деректерін сақтау мүмкін емес. Ойын жұмыс істейді, бірақ қайта жүктегенде жоғалады.', 'Не удалось сохранить игру. Играть можно, но после перезагрузки прогресс пропадёт.'],
    backup_note: ['Ойын деректері ескі сақтық көшірмеге кірмейді.', 'Игровые данные пока не входят в резервную копию.'],
    // child screen
    g_start: ['Бастау', 'Начать'], g_repeat: ['Қайталау', 'Повторить'], g_hint: ['Кеңес', 'Подсказка'], g_pause: ['Үзіліс', 'Перерыв'], g_exit: ['Шығу', 'Выход'],
    g_check: ['Тексеру', 'Проверить'], g_paused: ['Үзіліс. Дайын болғанда «Жалғастыру» бас.', 'Перерыв. Нажми «Продолжить», когда будешь готов.'], g_resume: ['Жалғастыру', 'Продолжить'],
    g_ok_pair: ['Дұрыс! Жұбы табылды.', 'Верно! Пара найдена.'], g_retry: ['Тағы бір рет көрейік. Асықпа.', 'Попробуем ещё раз. Не спеши.'], g_need_left: ['Алдымен сол жақтан карточка таңда.', 'Сначала выбери карточку слева.'],
    g_ok_sort: ['Дұрыс! Карточка өз тобында.', 'Верно! Карточка в своей группе.'], g_seq_retry: ['Біраз қадам дұрыс. Кеңесті қолдануға болады.', 'Часть шагов уже верно. Можно взять подсказку.'],
    g_hint_pairs: ['Белгіленген карточкаға жұп іздейміз.', 'Ищем пару для выделенной карточки.'], g_hint_seq: ['Келесі дұрыс қадам бекітілді.', 'Следующий верный шаг закреплён.'],
    g_hint_sort1: ['Санға қара: ол топтың шартына сәйкес пе?', 'Посмотри на число: подходит ли оно под условие группы?'], g_hint_sort2: ['Бұл карточканың тобы белгіленді.', 'Группа для этой карточки выделена.'],
    g_progress: ['Орындалды', 'Сделано'], g_matched: ['жұбы табылды', 'пара найдена'], g_locked: ['бекітілген', 'закреплено'], g_left: ['Солға', 'Влево'], g_right: ['Оңға', 'Вправо'],
    g_selected: ['таңдалды', 'выбрано'], g_pick_cat: ['Енді топты таңда.', 'Теперь выбери группу.'], g_items: ['Карточкалар', 'Карточки'],
    g_done: ['Дайын! Жарайсың.', 'Готово! Молодец.'], g_done_n: ['Орындалды: {d} / {t}.', 'Сделано: {d} из {t}.'], g_assisted: ['Кеңеспен орындалды.', 'Выполнено с подсказкой.'],
    g_again: ['Қайталау', 'Повторить'], g_other: ['Басқа тапсырма', 'Другое задание'], g_lesson: ['Сабаққа оралу', 'Вернуться к уроку'],
    g_reward: ['Аяқталу белгісі сақталды. (Аян бағы: келесі кезеңде)', 'Отметка о завершении сохранена. (Сад Аяна: следующий этап)'],
    g_intro: ['Мысал', 'Пример']
  };
  function t(k, o) { var p = D[k]; if (!p) return k; var s = p[ctx.lang() === 'kk' ? 0 : 1]; if (o) for (var x in o) s = s.replace('{' + x + '}', o[x]); return s; }
  function L(obj) { return obj[ctx.lang() === 'kk' ? 'kk' : 'ru']; }
  function SL(obj) { return obj[store.session && store.session.lang === 'kk' ? 'kk' : (store.config && store.config.lang === 'kk' ? 'kk' : 'ru')]; } // child screen uses the approved config language
  var esc = function (s) { return ctx.esc(s); };

  // ---------- storage ----------
  function load() { try { return G.cleanStore(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return G.cleanStore(null); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); return true; } catch (e) { ctx.notify(t('store_bad'), true); return false; } }

  // ---------- teacher views ----------
  var GAME_ICON = { pairs: 'games', sequence: 'track', sort: 'data' };
  function view() {
    if (!store) store = load();
    if (setupGame) return setupView();
    var h = '<div class="head"><div><h1>' + t('h') + '</h1><p>' + t('h_p') + '</p></div><span class="pill"><span class="dot"></span>' + t('done_n') + ': ' + store.progress.completed.length + '</span></div><div class="tasks">';
    G.GAMES.forEach(function (g) {
      h += '<button class="task" data-gsetup="' + g + '"><span class="task-icon">' + ctx.icon(GAME_ICON[g]) + '</span><span class="task-text"><b>' + t(g) + '</b><span>' + t(g + '_p') + '</span><em>' + t(g + '_ex') + '</em></span><span class="task-go">' + ctx.icon('arrow') + '</span></button>';
    });
    return h + '</div><p class="muted">' + t('backup_note') + '</p>';
  }

  function previewHtml(cfg) {
    var set = G.findSet(cfg.gameId, cfg.setId), lang = cfg.lang;
    if (cfg.gameId === 'pairs') return '<ul class="gprev">' + set.items.map(function (i) { return '<li><b>' + esc(i.left[lang]) + '</b> ↔ ' + esc(i.right[lang]) + '</li>'; }).join('') + '</ul>';
    if (cfg.gameId === 'sequence') return '<ol class="gprev">' + set.items.map(function (i) { return '<li>' + esc(i.text[lang]) + '</li>'; }).join('') + '</ol>';
    return '<div class="grid">' + set.categories.map(function (c) { return '<div class="kpi"><b style="font-size:1rem">' + esc(c.label[lang]) + '</b>' + set.items.filter(function (i) { return i.cats.indexOf(c.id) >= 0; }).map(function (i) { return esc(i.text[lang]); }).join(', ') + '</div>'; }).join('') + '</div>';
  }

  function setupView() {
    var cfg = store.config && store.config.gameId === setupGame ? store.config : null;
    if (!cfg || cfg.lang !== ctx.lang()) {
      var keepSet = cfg ? cfg.setId : G.SETS[setupGame][0].id;
      cfg = store.config = G.makeConfig(setupGame, keepSet, ctx.lang(), { motion: cfg ? cfg.motion : true, sourceKitHash: cfg ? cfg.sourceKitHash : null });
      store.session = null; save();
    }
    var ap = G.isConfigApproved(cfg);
    var hasSession = store.session && store.session.configHash === cfg.hash;
    var h = '<div class="head"><div><h1>' + t(setupGame) + '</h1><p>' + t(setupGame + '_p') + '</p></div><button class="btn" id="gBack">' + t('back') + '</button></div>';
    if (cfg.sourceKitHash) h += '<p class="muted">' + t('from_kit') + '</p>';
    h += '<div class="card"><label>' + t('set') + '</label><div class="opts" id="gSet">' + G.SETS[setupGame].map(function (s) { return '<button class="btn" data-set="' + s.id + '" aria-pressed="' + (s.id === cfg.setId) + '">' + esc(L(s.title)) + '</button>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:14px"><label style="margin:0;font-weight:600"><input type="checkbox" id="gMotion"' + (cfg.motion ? ' checked' : '') + '> ' + t('motion') + '</label><label style="margin:0;font-weight:600;opacity:.6"><input type="checkbox" disabled> ' + t('sound') + '</label></div></div>' +
      '<div class="card"><div class="row"><span class="tag demo">' + t('demo') + '</span>' + (ap ? '<span class="tag ok">' + ctx.icon('check') + t('approved') + '</span>' : '<span class="tag bad">' + t('notapp') + '</span>') + '</div>' +
      '<h3 style="margin-top:12px">' + t('preview') + '</h3>' + previewHtml(cfg) + (cfg.lang === 'kk' ? '<p class="muted">' + t('kknote') + '</p>' : '') +
      '<div class="row" style="margin-top:14px"><button class="btn" id="gApprove"' + (ap ? ' disabled' : '') + '>' + ctx.icon('shield') + (ap ? t('approved') : t('approve')) + '</button>' +
      (hasSession ? '<button class="btn primary lg" id="gCont"' + (ap ? '' : ' disabled') + '>' + ctx.icon('play') + t('cont') + '</button><button class="btn" id="gNew"' + (ap ? '' : ' disabled') + '>' + t('restart') + '</button>'
        : '<button class="btn primary lg" id="gStart"' + (ap ? '' : ' disabled') + '>' + ctx.icon('play') + t('start') + '</button>') + '</div>' +
      (hasSession ? '<p class="muted" style="margin-top:8px">' + t('saved_s') + '</p>' : '') + '</div>';
    return h;
  }

  function bind() {
    var q = function (s) { return document.querySelector(s); };
    [].forEach.call(document.querySelectorAll('[data-gsetup]'), function (b) { b.addEventListener('click', function () { setupGame = b.dataset.gsetup; ctx.rerender(); }); });
    if (q('#gBack')) q('#gBack').addEventListener('click', function () { setupGame = null; ctx.rerender(); });
    if (q('#gSet')) q('#gSet').addEventListener('click', function (e) {
      var b = e.target.closest('[data-set]'); if (!b) return;
      store.config = G.makeConfig(setupGame, b.dataset.set, ctx.lang(), { motion: store.config.motion, sourceKitHash: store.config.sourceKitHash }); // new content -> needs approval again
      store.session = null; save(); ctx.rerender();
    });
    if (q('#gMotion')) q('#gMotion').addEventListener('change', function (e) { store.config.motion = e.target.checked; save(); }); // display setting, does not change content hash
    if (q('#gApprove')) q('#gApprove').addEventListener('click', function () { G.approveConfig(store.config); save(); ctx.rerender(); });
    if (q('#gStart')) q('#gStart').addEventListener('click', function () { openGame(true); });
    if (q('#gNew')) q('#gNew').addEventListener('click', function () { openGame(true); });
    if (q('#gCont')) q('#gCont').addEventListener('click', function () { openGame(false); });
  }

  // ---------- child game screen ----------
  function openGame(fresh) {
    if (!G.isConfigApproved(store.config)) return;
    if (fresh || !store.session || store.session.configHash !== store.config.hash) store.session = G.createSession(store.config, (Date.now() & 0x7fffffff) | 1);
    save();
    ctx.setInert(true);
    var d = document.createElement('div'); d.id = 'game'; d.className = 'gscreen'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', t(store.config.gameId));
    d.innerHTML = '<div class="g-top"><span class="g-prog" id="gProg"></span><span class="row"><button class="btn" data-g="repeat">' + t('g_repeat') + '</button><button class="btn" data-g="hint">' + ctx.icon('kit') + t('g_hint') + '</button><button class="btn" data-g="pause">' + t('g_pause') + '</button><button class="btn" data-g="exit">' + t('g_exit') + '</button></span></div>' +
      '<div class="g-main"><aside class="g-ayan" id="gAyan"></aside><section class="g-play"><p class="g-instr" id="gInstr"></p><div class="g-area" id="gArea"></div><p class="g-fb" id="gFb" role="status" aria-live="polite"></p></section></div>';
    document.body.appendChild(d);
    mascot = M.create(document.getElementById('gAyan'), { motion: store.config.motion });
    feedback = '';
    if (store.session.status === 'intro') mascot.onEvent('session:start');
    else if (store.session.status === 'paused') mascot.onEvent('session:pause');
    d.addEventListener('click', onGameClick);
    draw();
    var f = d.querySelector('.g-area button, [data-g="start"]'); if (f) f.focus();
  }
  function closeGame() {
    var d = document.getElementById('game'); if (!d) return;
    if (store.session && store.session.status !== 'completed' && store.session.status !== 'intro') G.pause(store.session);
    save();
    if (mascot) { mascot.destroy(); mascot = null; }
    d.remove(); ctx.setInert(false); ctx.rerender();
  }
  function emit(ev, msgKey) { if (mascot) mascot.onEvent(ev); if (msgKey !== undefined) feedback = msgKey ? t(msgKey) : ''; }

  function onGameClick(e) {
    var b = e.target.closest('button'); if (!b) return;
    var s = store.session, r = null, g = b.dataset.g;
    if (g === 'exit') return closeGame();
    if (g === 'start') { G.start(s); emit('instruction:show', ''); }
    else if (g === 'repeat') { emit('instruction:show', ''); }
    else if (g === 'pause') { G.pause(s); emit('session:pause', ''); }
    else if (g === 'resume') { G.resume(s); emit('session:resume', ''); }
    else if (g === 'hint') { r = G.hint(s); if (r.event) emit(r.event === 'session:complete' ? 'session:complete' : 'hint:show', s.gameId === 'pairs' ? 'g_hint_pairs' : s.gameId === 'sequence' ? 'g_hint_seq' : (s.hint && s.hint.step === 2 ? 'g_hint_sort2' : 'g_hint_sort1')); }
    else if (g === 'again') { store.session = G.createSession(store.config, (Date.now() & 0x7fffffff) | 1); G.start(store.session); emit('instruction:show', ''); }
    else if (g === 'other') { closeGame(); setupGame = null; ctx.rerender(); return; }
    else if (g === 'lesson') { closeGame(); setupGame = null; ctx.go('kit'); return; }
    else if (b.dataset.left) { r = G.pairsPick(s, 'left', b.dataset.left); feedback = ''; }
    else if (b.dataset.right) { r = G.pairsPick(s, 'right', b.dataset.right); handle(r, 'g_ok_pair'); }
    else if (b.dataset.seq !== undefined) {
      var i = +b.dataset.seq;
      if (s.selectedIdx === null || s.selectedIdx === undefined) { if (i >= s.locked) s.selectedIdx = i; }
      else if (s.selectedIdx === i) s.selectedIdx = null;
      else { G.seqSwap(s, s.selectedIdx, i); }
    }
    else if (b.dataset.mv) { var idx = s.selectedIdx; if (idx !== null && idx !== undefined) G.seqMove(s, idx, +b.dataset.mv); }
    else if (g === 'check') { r = G.seqCheck(s); handle(r, null, 'g_seq_retry'); }
    else if (b.dataset.item) { if (!s.placed[b.dataset.item]) { s.selected = b.dataset.item; feedback = t('g_pick_cat'); } }
    else if (b.dataset.cat) { if (s.selected) { r = G.sortPlace(s, s.selected, b.dataset.cat); handle(r, 'g_ok_sort'); } }
    if (s.status === 'completed') { var res = G.grantReward(store.progress, s); store.progress = res.progress; }
    save(); draw();
    // keep focus inside the game after redraw
    var gd = document.getElementById('game'); if (gd && !gd.contains(document.activeElement)) { var f = gd.querySelector('.g-area button:not([disabled]), .g-done button, .g-pausebox button'); if (f) f.focus(); }
  }
  function handle(r, okKey, retryKey) {
    if (!r || !r.event) return;
    if (r.event === 'answer:correct') emit('answer:correct', okKey);
    else if (r.event === 'answer:retry') emit('answer:retry', retryKey || 'g_retry');
    else if (r.event === 'session:complete') emit('session:complete', '');
    else if (r.event === 'need-left') feedback = t('g_need_left');
  }

  function draw() {
    var d = document.getElementById('game'); if (!d) return;
    var s = store.session, set = G.findSet(s.gameId, s.setId), lang = s.lang;
    document.getElementById('gProg').innerHTML = t('g_progress') + ': <b>' + s.done + ' / ' + s.total + '</b><span class="g-bar"><i style="width:' + Math.round(s.done / s.total * 100) + '%"></i></span>';
    document.getElementById('gInstr').textContent = t(s.gameId + '_p');
    document.getElementById('gFb').textContent = feedback;
    var area = document.getElementById('gArea'), h = '';
    var hideTools = s.status === 'completed' || s.status === 'paused' || s.status === 'intro';
    [].forEach.call(d.querySelectorAll('[data-g="hint"],[data-g="pause"],[data-g="repeat"]'), function (x) { x.disabled = hideTools; });
    if (s.status === 'intro') {
      h = '<div class="g-done"><h2>' + t('g_intro') + '</h2><p class="g-big">' + esc(t(s.gameId + '_ex')) + '</p><button class="btn primary lg" data-g="start">' + t('g_start') + '</button></div>';
    } else if (s.status === 'paused') {
      h = '<div class="g-pausebox"><p class="g-big">' + t('g_paused') + '</p><button class="btn primary lg" data-g="resume">' + t('g_resume') + '</button><button class="btn lg" data-g="exit">' + t('g_exit') + '</button></div>';
    } else if (s.status === 'completed') {
      h = '<div class="g-done"><h2>' + t('g_done') + '</h2><p class="g-big">' + t('g_done_n', { d: s.done, t: s.total }) + '</p>' + (s.assisted ? '<p>' + t('g_assisted') + '</p>' : '') + '<p class="muted">' + t('g_reward') + '</p>' +
        '<div class="row" style="justify-content:center"><button class="btn primary lg" data-g="again">' + t('g_again') + '</button><button class="btn lg" data-g="other">' + t('g_other') + '</button><button class="btn lg" data-g="lesson">' + t('g_lesson') + '</button></div></div>';
    } else if (s.gameId === 'pairs') {
      var byId = {}; set.items.forEach(function (i) { byId[i.id] = i; });
      var col = function (order, side) {
        return '<div class="g-col">' + order.map(function (id) {
          var m = s.matched.indexOf(id) >= 0, sel = side === 'left' && s.selected === id, hi = s.hint && s.hint[side] === id && !m;
          var txt = esc(byId[id][side][lang]);
          return '<button class="g-card' + (m ? ' ok' : '') + (sel ? ' sel' : '') + (hi ? ' hi' : '') + '" data-' + side + '="' + id + '"' + (m ? ' disabled' : '') + ' aria-pressed="' + sel + '">' + txt + (m ? '<small>✓ ' + t('g_matched') + '</small>' : sel ? '<small>' + t('g_selected') + '</small>' : '') + '</button>';
        }).join('') + '</div>';
      };
      h = '<div class="g-pairs">' + col(s.leftOrder, 'left') + col(s.rightOrder, 'right') + '</div>';
    } else if (s.gameId === 'sequence') {
      var map = {}; set.items.forEach(function (i) { map[i.id] = i; });
      h = '<ol class="g-seq">' + s.order.map(function (id, i) {
        var lk = i < s.locked, sel = s.selectedIdx === i;
        return '<li><button class="g-card' + (lk ? ' ok' : '') + (sel ? ' sel' : '') + '" data-seq="' + i + '"' + (lk ? ' disabled' : '') + ' aria-pressed="' + sel + '"><span class="g-num">' + (i + 1) + '</span>' + esc(map[id].text[lang]) + (lk ? '<small>✓ ' + t('g_locked') + '</small>' : sel ? '<small>' + t('g_selected') + '</small>' : '') + '</button></li>';
      }).join('') + '</ol><div class="row" style="justify-content:center;margin-top:14px"><button class="btn lg" data-mv="-1"' + (s.selectedIdx == null || s.selectedIdx <= s.locked ? ' disabled' : '') + '>← ' + t('g_left') + '</button><button class="btn lg" data-mv="1"' + (s.selectedIdx == null || s.selectedIdx >= s.order.length - 1 ? ' disabled' : '') + '>' + t('g_right') + ' →</button><button class="btn primary lg" data-g="check">' + t('g_check') + '</button></div>';
    } else if (s.gameId === 'sort') {
      var it = {}; set.items.forEach(function (i) { it[i.id] = i; });
      var left = s.order.filter(function (id) { return !s.placed[id]; });
      h = '<p class="muted" style="text-align:center">' + t('g_items') + '</p><div class="g-items">' + left.map(function (id) { var sel = s.selected === id; return '<button class="g-card' + (sel ? ' sel' : '') + (s.hint && s.hint.item === id ? ' hi' : '') + '" data-item="' + id + '" aria-pressed="' + sel + '">' + esc(it[id].text[lang]) + (sel ? '<small>' + t('g_selected') + '</small>' : '') + '</button>'; }).join('') + '</div>' +
        '<div class="g-cats">' + set.categories.map(function (c) {
          var inside = Object.keys(s.placed).filter(function (k) { return s.placed[k] === c.id; });
          var hi = s.hint && s.hint.step === 2 && s.hint.cat === c.id;
          return '<button class="g-cat' + (hi ? ' hi' : '') + '" data-cat="' + c.id + '"' + (s.selected ? '' : ' aria-disabled="true"') + '><b>' + esc(c.label[lang]) + '</b><span>' + (inside.length ? inside.map(function (k) { return '✓ ' + esc(it[k].text[lang]); }).join(', ') : '&nbsp;') + '</span></button>';
        }).join('') + '</div>';
    }
    area.innerHTML = h;
  }

  root.AyanGamesUI = {
    init: function (c) { ctx = c; store = load(); },
    view: view, bind: bind,
    fromKit: function (kit) { // second entry point: inherits topic, language and kit version
      store = store || load();
      var setId = kit && kit.topic === 'time' ? 'p-time' : 'p-add';
      store.config = G.makeConfig('pairs', setId, ctx.lang(), { sourceKitHash: kit ? kit.hash : null });
      store.session = null; save(); setupGame = 'pairs';
    },
    reset: function () { setupGame = null; },
    onKey: function (e) { if (document.getElementById('game') && e.key === 'Escape') closeGame(); }
  };
})(typeof self !== 'undefined' ? self : this);
