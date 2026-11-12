/* Ayan prototype UI. Vanilla JS. Data stays in this browser (localStorage in the prototype). */
(function () {
  'use strict';
  var L = window.AyanLogic;
  var KEY = 'ayan.state.v1';

  // ---------- i18n: [kk, ru] ----------
  var D = {
    proto: ['прототип · демо', 'прототип · демо'],
    n_kit: ['Сабақ жинағы', 'Комплект урока'], n_track: ['Бақылау', 'Наблюдения'], n_sum: ['Қорытынды', 'Сводка'], n_data: ['Деректер', 'Данные и приватность'],
    banner: ['Демо-шаблондар сарапшы тексеруін күтеді. Ayan диагноз қоймайды, көмекші ғана. Шешімді ересек қабылдайды.', 'Демонстрационные шаблоны ждут экспертной проверки. Ayan не ставит диагноз и является помощником. Решение принимает взрослый.'],
    h_kit: ['Сабақ жинағын дайындау', 'Подготовка комплекта урока'],
    topic: ['Тақырып', 'Тема'], grade: ['Сынып', 'Класс'], level: ['Оқу деңгейі', 'Уровень чтения'], basic: ['Базалық (қысқа сөйлем)', 'Базовый (короткие фразы)'], fluent: ['Еркін оқиды', 'Читает свободно'],
    make: ['Жинақ жасау', 'Создать комплект'], again: ['Басқа нұсқа', 'Другой вариант'],
    t_sched: ['Көрнекі кесте', 'Визуальное расписание'], t_task: ['Жеңілдетілген тапсырма', 'Упрощённое задание'], t_story: ['Әлеуметтік әңгіме', 'Социальная история'],
    approve: ['Ересек бекітеді', 'Утвердить (взрослый)'], approved: ['Бекітілген', 'Утверждено'], notapp: ['Бекітілмеген: баламен көрсетуге болмайды', 'Не утверждено: ребёнку показывать нельзя'],
    editnote: ['Мәтінді өзгерткенде бекіту алынады.', 'При правке текста утверждение снимается.'],
    child: ['Бала экраны', 'Экран ребёнка'], printb: ['Басып шығару', 'Печать'], listen: ['Тыңдау', 'Озвучить'],
    demo: ['демо шаблон', 'демо-шаблон'], goalTag: ['мақсат: ~1 минут (өлшенбеген)', 'цель: ~1 минута (не измерено)'],
    c_next: ['Келесі', 'Дальше'], c_back: ['Артқа', 'Назад'], c_pause: ['Үзіліс', 'Пауза'], c_repeat: ['Қайталау', 'Повторить'], c_hard: ['Маған қиын', 'Мне трудно'], c_exit: ['Шығу', 'Выйти'],
    c_hardmsg: ['Жақсы, тоқтайық. Ересекке белгі берілді.', 'Хорошо, остановимся. Взрослому дан знак.'], c_paused: ['Үзіліс. Дайын болғанда басыңыз.', 'Пауза. Нажмите, когда будете готовы.'],
    c_resume: ['Жалғастыру', 'Продолжить'], c_done: ['Дайын! Жарайсың.', 'Готово! Молодец.'], c_ans: ['Жауап (ересекке)', 'Ответ (для взрослого)'],
    s_size: ['Мәтін өлшемі', 'Размер текста'], s_contrast: ['Жоғары контраст', 'Высокий контраст'], s_sound: ['Дыбыс (сұраныс бойынша)', 'Звук (по запросу)'],
    h_track: ['Бақылауды белгілеу', 'Отметка наблюдения'], help: ['Көмек', 'Помощь'], h_none: ['Көмексіз', 'Без помощи'], h_hint: ['Кеңес', 'Подсказка'], h_adult: ['Ересек', 'Взрослый'],
    result: ['Нәтиже', 'Результат'], r_done: ['Орындады', 'Выполнил'], r_part: ['Жартылай', 'Частично'], r_ref: ['Бас тартты', 'Отказ'], r_unc: ['Жеткіліксіз дерек', 'Недостаточно данных'],
    discomfort: ['Қолайсыздық белгілері', 'Признаки дискомфорта'], save: ['Сақтау', 'Сохранить'], saved: ['Сақталды', 'Сохранено'], savefail: ['Сақтау сәтсіз! Деректер жоғалуы мүмкін. Көшірме жасаңыз.', 'Не удалось сохранить! Данные могут потеряться. Сделайте копию.'],
    h_sum: ['Бақылау қорытындысы', 'Сводка наблюдений'], need: ['Қорытынды үшін кемінде {n} жарамды жазба керек. Қазір: {v}.', 'Для сводки нужно минимум {n} валидных записей. Сейчас: {v}.'],
    sumnote: ['Бұл бақылау, себеп-салдар дәлелі емес. Көмек деңгейі, тапсырма күрделігі және шаршау нәтижеге әсер етеді.', 'Это наблюдение, а не доказательство причины. На результат влияют уровень помощи, сложность задания и усталость.'],
    rate: ['Орындау үлесі', 'Доля выполнения'], n: ['Жазба', 'Записей'], disc_rate: ['Қолайсыздық жазбалары', 'Записей с дискомфортом'],
    load_demo: ['Демо-дерек қосу (синтетика)', 'Добавить демо-данные (синтетика)'], clear: ['Барлығын өшіру', 'Удалить всё'], clear_q: ['Барлық жазбаларды өшіресіз бе?', 'Удалить все записи?'],
    synth: ['демо (синтетика)', 'демо (синтетика)'], report: ['Ата-аналарға есеп (PDF)', 'Отчёт для родителей (PDF)'],
    h_data: ['Деректер және құпиялылық', 'Данные и приватность'], backup: ['Сақтық көшірме', 'Резервная копия'], exp: ['Көшірмені жүктеу', 'Скачать копию'], imp: ['Көшірмені жүктеу (файл)', 'Загрузить копию (файл)'],
    imp_ok: ['Қалпына келтірілді', 'Восстановлено'], imp_bad: ['Файл зақымдалған немесе сәйкес емес. Ағымдағы деректер сақталды.', 'Файл повреждён или не подходит. Текущие данные сохранены.'],
    pmap: ['Деректер картасы', 'Карта потоков данных'],
    p1: ['Бала профилі, бақылаулар, есептер: тек осы құрылғыда (прототипте браузер жады). Сыртқа шықпайды.', 'Профиль ребёнка, наблюдения, отчёты: только на этом устройстве (в прототипе память браузера). Наружу не уходят.'],
    p2: ['Сыртқа автоматты түрде: тақырып (тізімнен), жас тобы, оқу деңгейі (ЖИ), тапсырма мәтіні (дыбыстау). Аттар, диагноздар, еркін мәтін жоқ.', 'Наружу автоматически: тема (из списка), возрастная группа, уровень чтения (в ИИ), текст задания (в озвучку). Без имён, диагнозов и свободного текста.'],
    p3: ['Мұғалім өзі экспорттайды: PDF, сақтық көшірме.', 'Учитель экспортирует сам: PDF, резервная копия.'],
    p4: ['Прототипте ЖИ мен сыртқы дыбыстау қосылмаған: шаблондар және браузер дыбыстауы жұмыс істейді.', 'В прототипе внешний ИИ и облачная озвучка не подключены: работают шаблоны и озвучка браузера.'],
    status: ['Мәртебе белгілері', 'Метки статуса'], st1: ['Демода жұмыс істейді: жинақ, бекіту, бала экраны, бақылау, көшірме.', 'Работает в демо: комплект, утверждение, экран ребёнка, наблюдения, копия.'], st2: ['Мақсат (өлшенбеген): дайындау ~1 минут, белгі ~10 секунд.', 'Цель (не измерено): подготовка ~1 минута, отметка ~10 секунд.'], st3: ['Гипотеза (пилотта тексеріледі): пайдасы мұғалімге және балаға.', 'Гипотеза (проверим в пилоте): польза для учителя и ребёнка.'],
    sensor: ['Сенсорлық мінез: баптаулар жеке болуы керек. Қолайсыздық болса, үзіліс беріңіз.', 'Сенсорные особенности индивидуальны: настройки подбирает взрослый. При дискомфорте предложите перерыв.'],
    topics_note: ['Қосу мен азайту: 3-4 сыныпта негізгі дағдыларды бекіту.', 'Сложение и вычитание: закрепление базовых навыков в 3-4 классе.'],
    sent_ext: ['Сыртқа жіберілетін мәтін', 'Текст, который будет отправлен наружу'], blocked: ['Мәтінде жеке деректер бар: жіберілмейді.', 'В тексте личные данные: не отправляется.'],
    pr_title: ['Ata-analarға есеп', 'Отчёт для родителей']
  };
  var HELPTXT = {
    approve: ['Ересек мазмұнды тексеріп бекітеді. Мәтін өзгерсе, бекіту автоматты түрде алынады.', 'Взрослый проверяет содержание и утверждает. Если текст изменён, утверждение снимается автоматически.']
  };

  var S = load() || { lang: 'ru', size: 0, view: 'kit', observations: [], settings: { cfs: 1.4, hc: false, sound: false } };
  var kit = null, topicSel = 'add100', gradeSel = 3, levelSel = 'basic', variant = 0;
  var c = { step: 0, paused: false, hard: false };

  function t(k, o) { var p = D[k]; if (!p) return k; var s = p[S.lang === 'kk' ? 0 : 1]; if (o) for (var x in o) s = s.replace('{' + x + '}', o[x]); return s; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function lg() { return S.lang === 'kk' ? 'kk' : 'ru'; }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) { notify(t('savefail'), true); return false; }
  }
  var nt;
  function notify(msg, bad) { var b = document.getElementById('banner'); b.textContent = msg; b.style.background = bad ? 'var(--bad-soft)' : 'var(--good-soft)'; b.style.color = bad ? 'var(--bad)' : 'var(--good)'; clearTimeout(nt); nt = setTimeout(function () { b.textContent = t('banner'); b.style.background = ''; b.style.color = ''; }, bad ? 6000 : 2200); }

  // ---------- shell ----------
  function shell() {
    document.documentElement.lang = lg();
    document.documentElement.style.setProperty('--fs', (16 + S.size * 2) + 'px');
    document.querySelector('[data-i="proto"]').textContent = t('proto');
    document.getElementById('langBtn').textContent = S.lang === 'kk' ? 'Қаз | Рус' : 'Рус | Қаз';
    document.getElementById('sizeBtn').textContent = ['A', 'A+', 'A++'][S.size];
    var views = ['kit', 'track', 'sum', 'data'];
    document.getElementById('nav').innerHTML = views.map(function (v) { return '<button data-v="' + v + '"' + (S.view === v ? ' aria-current="page"' : '') + '>' + t('n_' + v) + '</button>'; }).join('');
    document.getElementById('banner').textContent = t('banner');
  }

  function render() {
    shell();
    var app = document.getElementById('app');
    app.innerHTML = ({ kit: vKit, track: vTrack, sum: vSum, data: vData })[S.view]();
    bind();
  }

  // ---------- views ----------
  function opts(map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + (map[k].icon ? map[k].icon + ' ' : '') + esc(map[k][lg()] || map[k]) + '</option>'; }).join(''); }

  function vKit() {
    var h = '<h1>' + t('h_kit') + '</h1><p class="muted">' + t('topics_note') + '</p>';
    h += '<div class="card"><div class="grid">' +
      '<div><label for="fTopic">' + t('topic') + '</label><select id="fTopic">' + opts(L.TOPICS, topicSel) + '</select></div>' +
      '<div><label for="fGrade">' + t('grade') + '</label><select id="fGrade"><option value="3"' + (gradeSel === 3 ? ' selected' : '') + '>3</option><option value="4"' + (gradeSel === 4 ? ' selected' : '') + '>4</option></select></div>' +
      '<div><label for="fLevel">' + t('level') + '</label><select id="fLevel"><option value="basic"' + (levelSel === 'basic' ? ' selected' : '') + '>' + t('basic') + '</option><option value="fluent"' + (levelSel === 'fluent' ? ' selected' : '') + '>' + t('fluent') + '</option></select></div>' +
      '</div><div class="row" style="margin-top:12px"><button class="btn primary" id="mk">' + t('make') + '</button>' + (kit ? '<button class="btn" id="mk2">' + t('again') + '</button>' : '') + '</div></div>';
    if (!kit) return h;
    var ap = L.isApproved(kit);
    h += '<div class="card"><div class="row"><span class="tag demo">' + t('demo') + '</span><span class="tag goal">' + t('goalTag') + '</span>' +
      (ap ? '<span class="tag ok">✓ ' + t('approved') + '</span>' : '<span class="tag bad">' + t('notapp') + '</span>') + '</div>' +
      '<h2 style="margin-top:10px">' + esc(kit.goal[lg()]) + '</h2>' +
      '<h3>' + t('t_sched') + '</h3><ol class="steps">' + kit.schedule.map(function (s, i) { return '<li><span class="ic">' + s.icon + '</span><input type="text" data-e="schedule" data-i="' + i + '" value="' + esc(s[lg()]) + '" aria-label="step"></li>'; }).join('') + '</ol>' +
      '<h3 style="margin-top:14px">' + t('t_task') + '</h3><div class="edit">' + kit.task[lg()].map(function (x, i) { return '<input type="text" data-e="task" data-i="' + i + '" value="' + esc(x) + '">'; }).join('') + '</div>' +
      '<h3 style="margin-top:14px">' + t('t_story') + '</h3><div class="edit">' + kit.story[lg()].map(function (x, i) { return '<input type="text" data-e="story" data-i="' + i + '" value="' + esc(x) + '">'; }).join('') + '</div>' +
      '<p class="muted">' + t('editnote') + '</p>' +
      '<div class="row"><button class="btn primary" id="ap">' + t('approve') + '</button><span class="help" title="' + esc(HELPTXT.approve[S.lang === 'kk' ? 0 : 1]) + '">?</span>' +
      '<button class="btn" id="chb"' + (ap ? '' : ' disabled') + '>' + t('child') + '</button><button class="btn" id="pr">' + t('printb') + '</button></div>' +
      '<p class="muted" style="margin-top:10px">' + t('sensor') + '</p></div>';
    return h;
  }

  function vTrack() {
    return '<h1>' + t('h_track') + '</h1><div class="card">' +
      '<label>' + t('topic') + '</label><div class="seg" id="oTopic">' + Object.keys(L.TOPICS).map(function (k, i) { return '<button class="btn" aria-pressed="' + (i === 0) + '" data-k="' + k + '">' + L.TOPICS[k].icon + ' ' + L.TOPICS[k][lg()] + '</button>'; }).join('') + '</div>' +
      '<label style="margin-top:12px">' + t('help') + '</label><div class="seg" id="oHelp">' + ['none', 'hint', 'adult'].map(function (k, i) { return '<button class="btn" aria-pressed="' + (i === 0) + '" data-k="' + k + '">' + t('h_' + k) + '</button>'; }).join('') + '</div>' +
      '<label style="margin-top:12px">' + t('result') + '</label><div class="seg" id="oRes">' + [['done', 'r_done'], ['partial', 'r_part'], ['refused', 'r_ref'], ['unclear', 'r_unc']].map(function (p, i) { return '<button class="btn" aria-pressed="' + (i === 0) + '" data-k="' + p[0] + '">' + t(p[1]) + '</button>'; }).join('') + '</div>' +
      '<label style="margin-top:12px"><input type="checkbox" id="oDisc"> ' + t('discomfort') + '</label>' +
      '<div class="row" style="margin-top:12px"><button class="btn primary" id="oSave">' + t('save') + '</button><span class="muted">' + t('n') + ': ' + S.observations.length + '</span></div></div>';
  }

  function vSum() {
    var s = L.summarize(S.observations);
    var h = '<h1>' + t('h_sum') + '</h1><div class="card">';
    if (!s.enough) h += '<p>' + t('need', { n: L.MIN_OBS, v: s.valid }) + '</p>';
    else {
      h += '<table><thead><tr><th>' + t('help') + '</th><th>' + t('n') + '</th><th>' + t('rate') + '</th></tr></thead><tbody>' +
        s.rows.map(function (r) { return '<tr><td>' + t('h_' + r.help) + '</td><td>' + r.n + '</td><td>' + (r.rate == null ? '-' : '<div class="bar" aria-hidden="true"><i style="width:' + Math.round(r.rate * 100) + '%"></i></div>' + Math.round(r.rate * 100) + '%') + '</td></tr>'; }).join('') +
        '</tbody></table><p>' + t('disc_rate') + ': ' + s.discomfort + ' / ' + s.valid + '</p>';
    }
    h += '<p class="muted"><span class="tag demo">' + t('synth') + '</span> ' + t('sumnote') + '</p>' +
      '<div class="row"><button class="btn" id="demoData">' + t('load_demo') + '</button><button class="btn" id="rep"' + (s.enough ? '' : ' disabled') + '>' + t('report') + '</button><button class="btn warn" id="clr">' + t('clear') + '</button></div></div>';
    return h;
  }

  function vData() {
    return '<h1>' + t('h_data') + '</h1><div class="card"><h2>' + t('pmap') + '</h2><ul><li>' + t('p1') + '</li><li>' + t('p2') + '</li><li>' + t('p3') + '</li><li>' + t('p4') + '</li></ul></div>' +
      '<div class="card"><h2>' + t('backup') + '</h2><div class="row"><button class="btn primary" id="bkExp">' + t('exp') + '</button><label class="btn" style="margin:0">' + t('imp') + '<input type="file" id="bkImp" accept=".json,application/json" class="hide"></label></div></div>' +
      '<div class="card"><h2>' + t('status') + '</h2><p><span class="tag ok">OK</span> ' + t('st1') + '</p><p><span class="tag goal">Goal</span> ' + t('st2') + '</p><p><span class="tag demo">Hypothesis</span> ' + t('st3') + '</p></div>';
  }

  // ---------- child screen ----------
  function openChild() {
    c = { step: 0, paused: false, hard: false };
    var d = document.createElement('div'); d.id = 'child'; d.className = 'child' + (S.settings.hc ? ' hc' : ''); d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    document.body.appendChild(d); drawChild();
  }
  function childItems() {
    var items = kit.schedule.map(function (s) { return { icon: s.icon, text: s[lg()] }; });
    items.splice(3, 0, { icon: '🧩', text: kit.task[lg()].join(' ') });
    return items;
  }
  function drawChild() {
    var d = document.getElementById('child'); if (!d) return;
    d.style.setProperty('--cfs', S.settings.cfs + 'rem');
    var items = childItems(), cur = items[c.step], last = c.step >= items.length;
    var body;
    if (c.paused) body = '<div class="c-step"><div class="c-ic">🌿</div><div class="c-text">' + t('c_paused') + '</div></div>';
    else if (c.hard) body = '<div class="c-step"><div class="c-ic">🤝</div><div class="c-text">' + t('c_hardmsg') + '</div></div>';
    else if (last) body = '<div class="c-step"><div class="c-ic">⭐</div><div class="c-text">' + t('c_done') + '</div></div>';
    else body = '<div class="c-step"><div class="c-ic">' + cur.icon + '</div><div class="c-text">' + esc(cur.text) + '</div><div class="c-dots">' + items.map(function (_, i) { return '<i class="' + (i < c.step ? 'done' : i === c.step ? 'on' : '') + '"></i>'; }).join('') + '</div></div>';
    d.innerHTML = '<div class="c-top"><span>' + (c.step + 1 > items.length ? items.length : c.step + 1) + ' / ' + items.length + '</span><span class="row"><button class="btn" data-c="sz" aria-label="text">A±</button><button class="btn" data-c="hc" aria-label="contrast">◐</button><button class="btn" data-c="exit">' + t('c_exit') + '</button></span></div>' +
      '<div class="c-body">' + body + '</div><div class="c-bar">' +
      (c.paused || c.hard ? '<button class="go" data-c="resume">' + t('c_resume') + '</button>' :
        (last ? '' : '<button class="go" data-c="next">' + t('c_next') + '</button>') +
        (c.step > 0 && !last ? '<button data-c="back">' + t('c_back') + '</button>' : '') +
        '<button data-c="rep">' + t('c_repeat') + '</button><button data-c="pause">' + t('c_pause') + '</button><button data-c="hard">' + t('c_hard') + '</button>') +
      '</div>' + (last ? '' : '');
    d.className = 'child' + (S.settings.hc ? ' hc' : '');
  }
  function speak(text) {
    if (!S.settings.sound || !('speechSynthesis' in window)) return;
    var chk = L.sanitizeForExternal(text); if (!chk.ok) { notify(t('blocked'), true); return; }
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.lang = S.lang === 'kk' ? 'kk-KZ' : 'ru-RU'; u.rate = 0.85; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
  }
  function childAct(a) {
    var items = childItems();
    if (a === 'exit') { var d = document.getElementById('child'); if (d) d.remove(); return; }
    if (a === 'next') c.step = Math.min(items.length, c.step + 1);
    if (a === 'back') c.step = Math.max(0, c.step - 1);
    if (a === 'pause') c.paused = true;
    if (a === 'hard') c.hard = true;
    if (a === 'resume') { c.paused = false; c.hard = false; }
    if (a === 'sz') S.settings.cfs = S.settings.cfs >= 2 ? 1.2 : S.settings.cfs + 0.3, persist();
    if (a === 'hc') S.settings.hc = !S.settings.hc, persist();
    drawChild();
    if (a === 'rep' || a === 'next' || a === 'back') { var it = childItems()[c.step]; if (it) speak(it.text); }
  }

  // ---------- actions ----------
  var obs = { topic: 'add100', help: 'none', result: 'done' };
  function seg(id, key, e) { var b = e.target.closest('button'); if (!b) return; obs[key] = b.dataset.k; [].forEach.call(document.querySelectorAll('#' + id + ' button'), function (x) { x.setAttribute('aria-pressed', x === b); }); }

  function bind() {
    var q = function (s) { return document.querySelector(s); };
    var on = function (s, ev, fn) { var el = q(s); if (el) el.addEventListener(ev, fn); };
    on('#fTopic', 'change', function (e) { topicSel = e.target.value; });
    on('#fGrade', 'change', function (e) { gradeSel = +e.target.value; });
    on('#fLevel', 'change', function (e) { levelSel = e.target.value; });
    on('#mk', 'click', function () { variant = 0; kit = L.generateKit({ topic: topicSel, grade: gradeSel, level: levelSel, variant: variant }); render(); });
    on('#mk2', 'click', function () { variant++; kit = L.generateKit({ topic: topicSel, grade: gradeSel, level: levelSel, variant: variant }); render(); });
    [].forEach.call(document.querySelectorAll('[data-e]'), function (el) { el.addEventListener('change', function () { L.editKit(kit, el.dataset.e, lg(), +el.dataset.i, el.value); render(); }); });
    on('#ap', 'click', function () { L.approve(kit, 'teacher'); render(); notify(t('approved')); });
    on('#chb', 'click', function () { if (L.isApproved(kit)) openChild(); });
    on('#pr', 'click', function () { window.print(); });
    on('#oTopic', 'click', function (e) { seg('oTopic', 'topic', e); });
    on('#oHelp', 'click', function (e) { seg('oHelp', 'help', e); });
    on('#oRes', 'click', function (e) { seg('oRes', 'result', e); });
    on('#oSave', 'click', function () {
      S.observations.push({ t: Date.now(), topic: obs.topic, help: obs.help, result: obs.result, discomfort: !!q('#oDisc').checked, kitHash: kit ? kit.hash : null });
      if (persist()) notify(t('saved')); render();
    });
    on('#demoData', 'click', function () { demoData(); persist(); render(); });
    on('#clr', 'click', function () { if (confirm(t('clear_q'))) { S.observations = []; persist(); render(); } });
    on('#rep', 'click', function () { report(); });
    on('#bkExp', 'click', function () {
      var blob = new Blob([L.exportBackup({ observations: S.observations, settings: S.settings })], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ayan-backup.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    on('#bkImp', 'change', function (e) {
      var f = e.target.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () { var res = L.importBackup(String(r.result)); if (res.ok) { S.observations = res.state.observations; S.settings = res.state.settings || S.settings; persist(); render(); notify(t('imp_ok')); } else notify(t('imp_bad'), true); };
      r.onerror = function () { notify(t('imp_bad'), true); }; r.readAsText(f);
    });
  }

  function demoData() {
    var seed = 7, r = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    var helps = ['none', 'hint', 'adult'];
    for (var i = 0; i < 18; i++) {
      var h = helps[i % 3], p = h === 'none' ? 0.45 : h === 'hint' ? 0.65 : 0.8, ok = r() < p;
      S.observations.push({ t: Date.now() - i * 86400000, topic: Object.keys(L.TOPICS)[i % 4], help: h, result: ok ? 'done' : (r() < 0.5 ? 'partial' : 'refused'), discomfort: r() < 0.12, demo: true });
    }
  }

  function report() {
    var s = L.summarize(S.observations); if (!s.enough) return;
    var w = window.open('', '_blank'); if (!w) { notify('popup blocked', true); return; }
    var rows = s.rows.map(function (r) { return '<tr><td>' + t('h_' + r.help) + '</td><td>' + r.n + '</td><td>' + (r.rate == null ? '-' : Math.round(r.rate * 100) + '%') + '</td></tr>'; }).join('');
    w.document.write('<!doctype html><meta charset="utf-8"><title>' + t('pr_title') + '</title><style>body{font:16px system-ui;max-width:700px;margin:30px auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:6px;text-align:left}</style><h1>' + t('pr_title') + '</h1><p>' + new Date().toLocaleDateString() + ' | ' + t('synth') + '</p><table><tr><th>' + t('help') + '</th><th>' + t('n') + '</th><th>' + t('rate') + '</th></tr>' + rows + '</table><p>' + t('disc_rate') + ': ' + s.discomfort + ' / ' + s.valid + '</p><p><i>' + t('sumnote') + '</i></p><p><i>' + t('banner') + '</i></p>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300);
  }

  // ---------- global events ----------
  document.getElementById('nav').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { S.view = b.dataset.v; persist(); render(); } });
  document.getElementById('langBtn').addEventListener('click', function () { S.lang = S.lang === 'kk' ? 'ru' : 'kk'; persist(); render(); });
  document.getElementById('sizeBtn').addEventListener('click', function () { S.size = (S.size + 1) % 3; persist(); render(); });
  document.body.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) childAct(b.dataset.c); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') childAct('exit'); });

  render();
})();
