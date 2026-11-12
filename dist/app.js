/* Ayan prototype UI (Jaz! design system). Vanilla JS. Data stays in this browser (localStorage in the prototype). */
(function () {
  'use strict';
  var L = window.AyanLogic;
  var KEY = 'ayan.state.v1', TKEY = 'ayan.theme';

  // ---------- icons (line set, 24px) ----------
  var P = {
    prep: '<path d="M8 8a4 4 0 0 1 8 0"/><rect x="5" y="8" width="14" height="13" rx="3"/><path d="M9 14h6M12 4v1"/>',
    look: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    do: '<path d="M4 20l1-4L17 4l3 3L8 19z"/><path d="M14 7l3 3"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
    break: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19c3-4 6-6 9-8"/>',
    task: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/>',
    time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    hand: '<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-3a1.5 1.5 0 0 1 2.5-1.5L8 14"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    device: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    adult: '<circle cx="12" cy="7" r="3.2"/><path d="M5 21a7 7 0 0 1 14 0"/>',
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    kit: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18 15l.8 1.8L20.5 17.5l-1.7.8L18 20l-.8-1.7-1.7-.8 1.7-.7z"/>',
    track: '<path d="M5 20V10M12 20V4M19 20v-7"/>', sum: '<path d="M4 18l5-6 4 3 7-9"/>',
    data: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    print: '<path d="M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
    play: '<path d="M7 4l13 8-13 8z"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'
  };
  function icon(n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.task) + '</svg>'; }
  // brand mark placeholder: the user is designing the Ayan character separately; swap this SVG for it later
  var OWL = '<svg class="mascot" viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="4" width="56" height="56" rx="18" fill="#2858e0"/>' +
    '<text x="32" y="43" text-anchor="middle" font-family="Comfortaa,Nunito,sans-serif" font-weight="700" font-size="32" fill="#fff">a</text>' +
    '<circle cx="47" cy="17" r="5" fill="#f08a24"/></svg>';

  // ---------- i18n: [kk, ru] ----------
  var D = {
    skip: ['Мазмұнға өту', 'Перейти к содержимому'],
    crumb: ['Мұғалім кабинеті', 'Кабинет учителя'],
    n_home: ['Басты бет', 'Главная'], n_kit: ['Сабақ жинағы', 'Комплект урока'], n_track: ['Бақылау', 'Наблюдения'], n_sum: ['Қорытынды', 'Сводка'], n_data: ['Деректер', 'Данные'],
    m_home: ['Басты', 'Главная'], m_kit: ['Жинақ', 'Комплект'], m_track: ['Бақылау', 'Отметка'], m_sum: ['Қорытынды', 'Сводка'], m_data: ['Деректер', 'Данные'],
    goal_l: ['Аптадағы бақылау', 'Наблюдения за неделю'], goal_p: ['Қорытынды үшін кемінде 5 жазба.', 'Для сводки нужно минимум 5 записей.'],
    side_t: ['Инклюзивті сабақ', 'Инклюзивный урок'], side_p: ['Аутизм спектріндегі балаға көрнекі қолдау. Прототип.', 'Визуальная поддержка для ребёнка с РАС. Прототип.'],
    banner: ['Демо-шаблондар сарапшы тексеруін күтеді. Ayan диагноз қоймайды, көмекші ғана. Шешімді ересек қабылдайды.', 'Демонстрационные шаблоны ждут экспертной проверки. Ayan не ставит диагноз и является помощником. Решение принимает взрослый.'],
    hello: ['Сәлеметсіз бе! Бүгін не дайындаймыз?', 'Здравствуйте! Что готовим сегодня?'],
    hello_p: ['Тапсырманы таңдаңыз - жүйе қадам-қадаммен көрсетеді. Түсініксіз сөздің жанындағы «?» белгісін басыңыз.', 'Выберите задачу - система проведёт по шагам. Нажмите «?» рядом с непонятным словом.'],
    demo_pill: ['Демо-шаблондар (тексерілмеген)', 'Демо-шаблоны (не проверены)'],
    st_1: ['Тақырыпты таңдаңыз', 'Выберите тему'], st_2: ['Тексеріп бекітіңіз', 'Проверьте и утвердите'], st_3: ['Баламен көрсетіңіз', 'Покажите ребёнку'],
    tk_kit: ['Сабақ жинағын жасау', 'Создать комплект урока'], tk_kit_p: ['Көрнекі кесте, жеңілдетілген тапсырма, әлеуметтік әңгіме.', 'Визуальное расписание, упрощённое задание, социальная история.'], tk_kit_m: ['4 тақырып · 3-4 сынып', '4 темы · 3-4 класс'],
    tk_ex: ['Мысалды көрсету', 'Показать пример'], tk_ex_p: ['Бір басуда дайын, бекітілген жинақ: питч үшін.', 'Готовый утверждённый комплект в один клик: для демо.'], tk_ex_m: ['Демо', 'Демо'],
    tk_tr: ['Бақылауды белгілеу', 'Отметить наблюдение'], tk_tr_p: ['Көмек деңгейі, нәтиже, қолайсыздық: 10 секундта.', 'Уровень помощи, результат, дискомфорт: за 10 секунд.'],
    tk_sum: ['Қорытындыны көру', 'Посмотреть сводку'], tk_sum_p: ['Қай қолдау жиі сәтті болды: бақылау, дәлел емес.', 'Какая поддержка чаще помогала: наблюдение, не доказательство.'],
    tk_rep: ['Ата-аналарға есеп', 'Отчёт для родителей'], tk_rep_p: ['PDF есеп: күндер, көмек деңгейі, шектеулер.', 'Отчёт в PDF: даты, уровень помощи, ограничения выводов.'],
    tk_data: ['Деректер және көшірме', 'Данные и копия'], tk_data_p: ['Деректер картасы, сақтық көшірме, қалпына келтіру.', 'Карта данных, резервная копия, восстановление.'], tk_data_m: ['Деректер құрылғыда', 'Данные на устройстве'],
    recs: ['жазба', 'записей'],
    helpbox: ['Кез келген терминнің жанындағы «?» белгісін басыңыз. Мәтінді үлкейту үшін жоғарыдағы «A+» батырмасын басыңыз.', 'Нажмите «?» рядом с любым термином. Чтобы увеличить текст, нажмите «A+» вверху.'],
    h_kit: ['Сабақ жинағы', 'Комплект урока'], h_kit_p: ['Төрт қадам: параметрлер, тексеру, бекіту, көрсету.', 'Четыре шага: параметры, проверка, утверждение, показ.'],
    w1: ['Параметрлер', 'Параметры'], w2: ['Тексеру', 'Проверка'], w3: ['Бекіту', 'Утверждение'], w4: ['Көрсету', 'Показ'],
    topic: ['Тақырып', 'Тема'], grade: ['Сынып', 'Класс'], level: ['Оқу деңгейі', 'Уровень чтения'], basic: ['Базалық (қысқа сөйлем)', 'Базовый (короткие фразы)'], fluent: ['Еркін оқиды', 'Читает свободно'],
    make: ['Жинақ жасау', 'Создать комплект'], again: ['Басқа нұсқа', 'Другой вариант'], next: ['Әрі қарай', 'Далее'], back: ['Артқа', 'Назад'],
    t_sched: ['Көрнекі кесте', 'Визуальное расписание'], t_task: ['Жеңілдетілген тапсырма', 'Упрощённое задание'], t_story: ['Әлеуметтік әңгіме', 'Социальная история'],
    approve: ['Ересек бекітеді', 'Утвердить как взрослый'], approved: ['Бекітілген', 'Утверждено'], notapp: ['Бекітілмеген', 'Не утверждено'],
    appneed: ['Баламен көрсетуге болмайды, алдымен бекітіңіз.', 'Ребёнку показывать нельзя: сначала утвердите.'],
    editnote: ['Мәтінді өзгерткенде бекіту алынады.', 'При правке текста утверждение снимается.'],
    ck1: ['Мәтін баланың деңгейіне сәйкес', 'Текст соответствует уровню ребёнка'], ck2: ['Қысқа сөйлемдер, метафора жоқ', 'Короткие фразы, без метафор'], ck3: ['Мақсат дұрыс (тапсырма мақсатты өзгертпейді)', 'Цель верна (упрощение не меняет цель)'],
    child: ['Бала экраны', 'Экран ребёнка'], printb: ['Басып шығару', 'Печать'],
    demo: ['демо шаблон', 'демо-шаблон'], goalTag: ['мақсат: ~1 минут (өлшенбеген)', 'цель: ~1 минута (не измерено)'],
    c_next: ['Келесі', 'Дальше'], c_back: ['Артқа', 'Назад'], c_pause: ['Үзіліс', 'Пауза'], c_repeat: ['Қайталау', 'Повторить'], c_hard: ['Маған қиын', 'Мне трудно'], c_exit: ['Шығу', 'Выйти'],
    c_hardmsg: ['Жақсы, тоқтайық. Ересекке белгі берілді.', 'Хорошо, остановимся. Взрослому дан знак.'], c_paused: ['Үзіліс. Дайын болғанда басыңыз.', 'Пауза. Нажмите, когда будете готовы.'],
    c_resume: ['Жалғастыру', 'Продолжить'], c_done: ['Дайын! Жарайсың.', 'Готово! Молодец.'],
    s_contrast: ['Жоғары контраст', 'Высокий контраст'], s_sound: ['Дыбыс (сұраныс бойынша)', 'Звук (по запросу)'],
    h_track: ['Бақылауды белгілеу', 'Отметка наблюдения'], h_track_p: ['Бір белгі 10 секундтан аспауы керек (мақсат).', 'Одна отметка не дольше 10 секунд (цель).'],
    help: ['Көмек', 'Помощь'], h_none: ['Көмексіз', 'Без помощи'], h_hint: ['Кеңес', 'Подсказка'], h_adult: ['Ересек', 'Взрослый'],
    result: ['Нәтиже', 'Результат'], r_done: ['Орындады', 'Выполнил'], r_part: ['Жартылай', 'Частично'], r_ref: ['Бас тартты', 'Отказ'], r_unc: ['Жеткіліксіз дерек', 'Недостаточно данных'],
    discomfort: ['Қолайсыздық белгілері', 'Признаки дискомфорта'], save: ['Сақтау', 'Сохранить'], saved: ['Сақталды', 'Сохранено'], savefail: ['Сақтау сәтсіз! Деректер жоғалуы мүмкін. Көшірме жасаңыз.', 'Не удалось сохранить! Данные могут потеряться. Сделайте копию.'],
    h_sum: ['Бақылау қорытындысы', 'Сводка наблюдений'], need: ['Қорытынды үшін кемінде {n} жарамды жазба керек. Қазір: {v}.', 'Для сводки нужно минимум {n} валидных записей. Сейчас: {v}.'],
    sumnote: ['Бұл бақылау, себеп-салдар дәлелі емес. Көмек деңгейі, тапсырма күрделігі және шаршау нәтижеге әсер етеді.', 'Это наблюдение, а не доказательство причины. На результат влияют уровень помощи, сложность задания и усталость.'],
    rate: ['Орындау үлесі', 'Доля выполнения'], n: ['Жазба', 'Записей'], disc_rate: ['Қолайсыздық жазбалары', 'Записей с дискомфортом'],
    k_valid: ['Жарамды жазба', 'Валидных записей'], k_done: ['Орындалды', 'Выполнено'], k_disc: ['Қолайсыздық', 'Дискомфорт'], trend: ['Апталар бойынша орындау үлесі', 'Доля выполнения по неделям'], wk: ['Апта', 'Нед.'],
    load_demo: ['Демо-дерек қосу (синтетика)', 'Добавить демо-данные (синтетика)'], clear: ['Барлығын өшіру', 'Удалить всё'], clear_q: ['Барлық жазбаларды өшіресіз бе?', 'Удалить все записи?'],
    synth: ['демо (синтетика)', 'демо (синтетика)'], report: ['Ата-аналарға есеп (PDF)', 'Отчёт для родителей (PDF)'],
    real_view: ['Нақты деректерді көрсету', 'Показать реальные данные'], demo_view: ['Демо-деректерді көрсету', 'Показать демо-данные'], popup: ['Терезе бұғатталды', 'Окно заблокировано браузером'],
    h_data: ['Деректер және құпиялылық', 'Данные и приватность'], backup: ['Сақтық көшірме', 'Резервная копия'], exp: ['Көшірмені жүктеп алу', 'Скачать копию'], imp: ['Көшірмені жүктеу (файл)', 'Загрузить копию (файл)'],
    imp_ok: ['Қалпына келтірілді', 'Восстановлено'], imp_bad: ['Файл зақымдалған немесе сәйкес емес. Ағымдағы деректер сақталды.', 'Файл повреждён или не подходит. Текущие данные сохранены.'],
    pmap: ['Деректер картасы', 'Карта потоков данных'],
    p1: ['Бала профилі, бақылаулар, есептер: тек осы құрылғыда (прототипте браузер жады). Сыртқа шықпайды.', 'Профиль ребёнка, наблюдения, отчёты: только на этом устройстве (в прототипе память браузера). Наружу не уходят.'],
    p2: ['Сыртқа автоматты түрде: тақырып (тізімнен), жас тобы, оқу деңгейі (ЖИ), тапсырма мәтіні (дыбыстау). Аттар, диагноздар, еркін мәтін жоқ. Сүзгі: негізгі қорғаныс, кепілдік емес.', 'Наружу автоматически: тема (из списка), возрастная группа, уровень чтения (в ИИ), текст задания (в озвучку). Без имён, диагнозов и свободного текста. Фильтр: базовая защита, не гарантия.'],
    p3: ['Мұғалім өзі экспорттайды: PDF, сақтық көшірме.', 'Учитель экспортирует сам: PDF, резервная копия.'],
    p4: ['Прототипте ЖИ мен бұлттық дыбыстау қосылмаған: шаблондар және браузер дыбыстауы жұмыс істейді.', 'В прототипе внешний ИИ и облачная озвучка не подключены: работают шаблоны и озвучка браузера.'],
    status: ['Мәртебе белгілері', 'Метки статуса'], st1: ['Демода жұмыс істейді: жинақ, бекіту, бала экраны, бақылау, көшірме.', 'Работает в демо: комплект, утверждение, экран ребёнка, наблюдения, копия.'], st2: ['Мақсат (өлшенбеген): дайындау ~1 минут, белгі ~10 секунд.', 'Цель (не измерено): подготовка ~1 минута, отметка ~10 секунд.'], st3: ['Гипотеза (пилотта тексеріледі): пайдасы мұғалімге және балаға.', 'Гипотеза (проверим в пилоте): польза для учителя и ребёнка.'],
    sensor: ['Сенсорлық ерекшеліктер жеке: баптауды ересек таңдайды. Қолайсыздық болса, үзіліс беріңіз.', 'Сенсорные особенности индивидуальны: настройки подбирает взрослый. При дискомфорте предложите перерыв.'],
    topics_note: ['Қосу мен азайту: 3-4 сыныпта негізгі дағдыларды бекіту.', 'Сложение и вычитание: закрепление базовых навыков в 3-4 классе.'],
    blocked: ['Мәтінде жеке деректер бар: жіберілмейді.', 'В тексте личные данные: не отправляется.'],
    pr_title: ['Ата-аналарға есеп', 'Отчёт для родителей']
  };
  var HELPTXT = ['Ересек мазмұнды тексеріп бекітеді. Мәтін өзгерсе, бекіту автоматты түрде алынады.', 'Взрослый проверяет содержание и утверждает. Если текст изменён, утверждение снимается автоматически.'];

  var S = L.cleanState(load(), false); // corrupted or tampered storage is sanitised, never crashes startup
  var kit = null, childKit = null, topicSel = 'add100', gradeSel = 3, levelSel = 'basic', variant = 0, wstep = 1;
  var c = { step: 0, paused: false, hard: false };
  var stickyMsg = '', showDemo = false, nt;
  var OBS0 = function () { return { topic: 'add100', help: 'none', result: 'done' }; };
  var obs = OBS0();
  var SHELL_IDS = ['sidebar', 'workspace', 'mnav', 'banner', 'skip'];

  function t(k, o) { var p = D[k]; if (!p) return k; var s = p[S.lang === 'kk' ? 0 : 1]; if (o) for (var x in o) s = s.replace('{' + x + '}', o[x]); return s; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function lg() { return S.lang === 'kk' ? 'kk' : 'ru'; }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); if (stickyMsg) { stickyMsg = ''; paintBanner(); } return true; }
    catch (e) { stickyMsg = t('savefail'); paintBanner(); return false; }
  }
  // toast: transient messages; a failed save stays visible until a save succeeds
  function paintBanner() { var b = document.getElementById('banner'); b.textContent = stickyMsg || ''; b.className = 'toast' + (stickyMsg ? ' bad' : ''); }
  function notify(msg, bad) {
    var b = document.getElementById('banner'); b.textContent = msg; b.className = 'toast ' + (bad ? 'bad' : 'ok');
    clearTimeout(nt); nt = setTimeout(paintBanner, bad ? 6000 : 2200);
  }

  // ---------- theme ----------
  function theme() { try { return localStorage.getItem(TKEY) || 'auto'; } catch (e) { return 'auto'; } }
  function isDark() { var th = theme(); return th === 'dark' || (th === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function applyTheme() {
    var th = theme(), r = document.documentElement;
    if (th === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', th);
    document.getElementById('themeBtn').innerHTML = icon(isDark() ? 'sun' : 'moon');
  }
  function weekCount() { var since = Date.now() - 7 * 86400000; return S.observations.filter(function (o) { return !o.demo && o.t >= since; }).length; }

  // ---------- shell (Jaz!: sidebar + topbar + mobile bottom nav) ----------
  var VIEWS = ['home', 'kit', 'track', 'sum', 'data'];
  function shell() {
    document.documentElement.lang = lg();
    document.documentElement.style.setProperty('--fs', (15 + S.size * 2) + 'px');
    document.getElementById('skip').textContent = t('skip');
    document.getElementById('logo').innerHTML = OWL;
    document.getElementById('mbrand').innerHTML = OWL + '<span class="brand-name">ayan<i>.</i></span>';
    document.getElementById('crumb').textContent = t('crumb') + ' / ' + t('n_' + S.view);
    document.getElementById('nav').innerHTML = VIEWS.map(function (v) { return '<button class="nav-item" data-v="' + v + '"' + (S.view === v ? ' aria-current="page"' : '') + '>' + icon(v) + t('n_' + v) + '</button>'; }).join('');
    document.getElementById('mnav').innerHTML = VIEWS.map(function (v) { return '<button data-v="' + v + '"' + (S.view === v ? ' aria-current="page"' : '') + '>' + icon(v) + t('m_' + v) + '</button>'; }).join('');
    var wc = weekCount();
    document.getElementById('goal').innerHTML = '<div class="mini-label">' + t('goal_l') + '</div><div class="goal-num">' + wc + ' <small>/ ' + L.MIN_OBS + '</small></div><div class="meter"><i style="width:' + Math.min(100, wc / L.MIN_OBS * 100) + '%"></i></div><div class="muted" style="font-size:.78rem">' + t('goal_p') + '</div>';
    document.getElementById('sideFoot').innerHTML = '<b>' + t('side_t') + '</b>' + t('side_p');
    document.getElementById('langSeg').innerHTML = '<button data-lang="kk" aria-pressed="' + (S.lang === 'kk') + '">Қаз</button><button data-lang="ru" aria-pressed="' + (S.lang === 'ru') + '">Рус</button>';
    document.getElementById('sizeSeg').innerHTML = ['A', 'A+', 'A++'].map(function (a, i) { return '<button data-size="' + i + '" aria-pressed="' + (S.size === i) + '">' + a + '</button>'; }).join('');
    applyTheme(); paintBanner();
  }
  function go(v) { S.view = v; obs = OBS0(); persist(); render(); window.scrollTo(0, 0); }
  function render() {
    shell();
    document.getElementById('app').innerHTML = ({ home: vHome, kit: vKit, track: vTrack, sum: vSum, data: vData })[S.view]() + '<p class="foot-note">' + t('banner') + '</p>';
    bind();
  }

  // ---------- views ----------
  function opts(map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(map[k][lg()]) + '</option>'; }).join(''); }
  function head(title, sub, side) { return '<div class="head"><div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (side || '') + '</div>'; }
  function taskCard(id, ic, title, sub, meta, metaWarn) {
    return '<button class="task" data-task="' + id + '"><span class="task-icon">' + icon(ic) + '</span><span class="task-text"><b>' + title + '</b><span>' + sub + '</span>' + (meta ? '<em' + (metaWarn ? ' class="warn"' : '') + '>' + meta + '</em>' : '') + '</span><span class="task-go">' + icon('arrow') + '</span></button>';
  }

  function vHome() {
    var real = S.observations.filter(function (o) { return !o.demo; }).length;
    return head(t('hello'), t('hello_p'), '<span class="pill warn"><span class="dot"></span>' + t('demo_pill') + '</span>') +
      '<div class="steps-strip"><div><b>1</b>' + t('st_1') + '</div><i>→</i><div><b>2</b>' + t('st_2') + '</div><i>→</i><div><b>3</b>' + t('st_3') + '</div></div>' +
      '<div class="tasks">' +
      taskCard('kit', 'kit', t('tk_kit'), t('tk_kit_p'), t('tk_kit_m')) +
      taskCard('example', 'play', t('tk_ex'), t('tk_ex_p'), t('tk_ex_m'), true) +
      taskCard('track', 'track', t('tk_tr'), t('tk_tr_p'), real + ' ' + t('recs')) +
      taskCard('sum', 'sum', t('tk_sum'), t('tk_sum_p'), weekCount() + ' / ' + L.MIN_OBS) +
      taskCard('report', 'doc', t('tk_rep'), t('tk_rep_p')) +
      taskCard('data', 'shield', t('tk_data'), t('tk_data_p'), t('tk_data_m')) +
      '</div><div class="helpbox">' + OWL + '<span>' + t('helpbox') + '</span></div>';
  }

  function stepper() {
    return '<ol class="stepper">' + [1, 2, 3, 4].map(function (i) { return '<li class="' + (i === wstep ? 'on' : i < wstep ? 'done' : '') + '"' + (i === wstep ? ' aria-current="step"' : '') + '><span class="n">' + (i < wstep ? '✓' : i) + '</span>' + t('w' + i) + '</li>'; }).join('') + '</ol>';
  }
  function wnav(backOk, nextOk) {
    return '<div class="wnav"><button class="btn" id="wBack"' + (backOk ? '' : ' disabled') + '>' + t('back') + '</button>' + (nextOk === null ? '' : '<button class="btn primary" id="wNext"' + (nextOk ? '' : ' disabled') + '>' + t('next') + ' ' + icon('arrow') + '</button>') + '</div>';
  }

  function vKit() {
    var h = head(t('h_kit'), t('h_kit_p'));
    if (wstep === 1 || !kit) {
      wstep = 1;
      return h + stepper() + '<div class="card"><p class="muted">' + t('topics_note') + '</p><div class="grid" style="margin-top:12px">' +
        '<div><label for="fTopic">' + t('topic') + '</label><select id="fTopic">' + opts(L.TOPICS, topicSel) + '</select></div>' +
        '<div><label for="fGrade">' + t('grade') + '</label><select id="fGrade"><option value="3"' + (gradeSel === 3 ? ' selected' : '') + '>3</option><option value="4"' + (gradeSel === 4 ? ' selected' : '') + '>4</option></select></div>' +
        '<div><label for="fLevel">' + t('level') + '</label><select id="fLevel"><option value="basic"' + (levelSel === 'basic' ? ' selected' : '') + '>' + t('basic') + '</option><option value="fluent"' + (levelSel === 'fluent' ? ' selected' : '') + '>' + t('fluent') + '</option></select></div>' +
        '</div><div class="row" style="margin-top:18px"><button class="btn primary lg" id="mk">' + icon('kit') + t('make') + '</button></div></div>';
    }
    var ap = L.isApproved(kit);
    var top = '<div class="row"><span class="tag demo">' + t('demo') + '</span><span class="tag goal">' + t('goalTag') + '</span>' +
      (ap ? '<span class="tag ok">' + icon('check') + t('approved') + '</span>' : '<span class="tag bad">' + t('notapp') + '</span>') + '</div><h2 style="margin-top:12px">' + esc(kit.goal[lg()]) + '</h2>';
    h += stepper();
    if (wstep === 2) {
      h += '<div class="card">' + top +
        '<h3 style="margin-top:14px">' + t('t_sched') + '</h3><ol class="plist">' + kit.schedule.map(function (s, i) { return '<li>' + icon(s.id) + '<input type="text" data-e="schedule" data-i="' + i + '" value="' + esc(s[lg()]) + '" aria-label="' + t('t_sched') + ' ' + (i + 1) + '"></li>'; }).join('') + '</ol>' +
        '<h3 style="margin-top:18px">' + t('t_task') + '</h3><div class="edit">' + kit.task[lg()].map(function (x, i) { return '<input type="text" data-e="task" data-i="' + i + '" value="' + esc(x) + '" aria-label="' + t('t_task') + ' ' + (i + 1) + '">'; }).join('') + '</div>' +
        '<h3 style="margin-top:18px">' + t('t_story') + '</h3><div class="edit">' + kit.story[lg()].map(function (x, i) { return '<input type="text" data-e="story" data-i="' + i + '" value="' + esc(x) + '" aria-label="' + t('t_story') + ' ' + (i + 1) + '">'; }).join('') + '</div>' +
        '<p class="muted">' + t('editnote') + '</p><div class="row"><button class="btn" id="mk2">' + t('again') + '</button></div></div>' + wnav(true, true);
    } else if (wstep === 3) {
      h += '<div class="card">' + top + '<ul class="checklist">' + ['ck1', 'ck2', 'ck3'].map(function (k) { return '<li>' + icon('check') + '<span>' + t(k) + '</span></li>'; }).join('') + '</ul>' +
        '<p class="muted">' + t('editnote') + '</p><div class="row" style="margin-top:8px"><button class="btn primary lg" id="ap"' + (ap ? ' disabled' : '') + '>' + icon('shield') + (ap ? t('approved') : t('approve')) + '</button><span class="help" title="' + esc(HELPTXT[S.lang === 'kk' ? 0 : 1]) + '" aria-label="' + esc(HELPTXT[S.lang === 'kk' ? 0 : 1]) + '">?</span></div>' +
        (ap ? '' : '<p class="muted" style="margin-top:10px">' + t('appneed') + '</p>') + '</div>' + wnav(true, ap);
    } else {
      h += '<div class="card">' + top + '<div class="row" style="margin:14px 0"><button class="btn primary lg" id="chb"' + (ap ? '' : ' disabled') + '>' + icon('play') + t('child') + '</button><button class="btn lg" id="pr">' + icon('print') + t('printb') + '</button></div>' +
        '<div class="row"><label style="margin:0;font-weight:600"><input type="checkbox" id="sHc"' + (S.settings.hc ? ' checked' : '') + '> ' + t('s_contrast') + '</label><label style="margin:0;font-weight:600"><input type="checkbox" id="sSound"' + (S.settings.sound ? ' checked' : '') + '> ' + t('s_sound') + '</label></div>' +
        '<p class="muted" style="margin-top:12px">' + t('sensor') + '</p></div>' + wnav(true, null);
    }
    return h;
  }

  function vTrack() {
    return head(t('h_track'), t('h_track_p')) + '<div class="card">' +
      '<label>' + t('topic') + '</label><div class="opts" id="oTopic">' + Object.keys(L.TOPICS).map(function (k, i) { return '<button class="btn" aria-pressed="' + (i === 0) + '" data-k="' + k + '">' + icon({ add100: 'plus', sub100: 'minus', word1: 'book', time: 'time' }[k]) + L.TOPICS[k][lg()] + '</button>'; }).join('') + '</div>' +
      '<label style="margin-top:16px">' + t('help') + '</label><div class="opts" id="oHelp">' + ['none', 'hint', 'adult'].map(function (k, i) { return '<button class="btn" aria-pressed="' + (i === 0) + '" data-k="' + k + '">' + t('h_' + k) + '</button>'; }).join('') + '</div>' +
      '<label style="margin-top:16px">' + t('result') + '</label><div class="opts" id="oRes">' + [['done', 'r_done'], ['partial', 'r_part'], ['refused', 'r_ref'], ['unclear', 'r_unc']].map(function (p, i) { return '<button class="btn" aria-pressed="' + (i === 0) + '" data-k="' + p[0] + '">' + t(p[1]) + '</button>'; }).join('') + '</div>' +
      '<label style="margin-top:16px;font-weight:600"><input type="checkbox" id="oDisc"> ' + t('discomfort') + '</label>' +
      '<div class="row" style="margin-top:16px"><button class="btn primary lg" id="oSave">' + t('save') + '</button><span class="muted">' + t('n') + ': ' + S.observations.filter(function (o) { return !o.demo; }).length + '</span></div></div>';
  }

  function trendSvg(list) {
    var now = Date.now(), W = 7 * 86400000, pts = [];
    for (var w = 3; w >= 0; w--) {
      var inW = list.filter(function (o) { return Math.floor((now - o.t) / W) === w && o.result !== 'unclear'; });
      pts.push(inW.length ? inW.filter(function (o) { return o.result === 'done'; }).length / inW.length : null);
    }
    var xs = [30, 110, 190, 270], path = '', dots = '';
    pts.forEach(function (v, i) { if (v == null) return; var y = 70 - v * 56; path += (path ? 'L' : 'M') + xs[i] + ' ' + y.toFixed(1) + ' '; dots += '<circle class="dt" cx="' + xs[i] + '" cy="' + y.toFixed(1) + '" r="4"/>'; });
    var labels = xs.map(function (x, i) { return '<text x="' + x + '" y="88" text-anchor="middle">' + t('wk') + ' ' + (i === 3 ? '0' : '-' + (3 - i)) + '</text>'; }).join('');
    return '<svg class="spark" viewBox="0 0 300 94" role="img" aria-label="' + t('trend') + '"><line class="ax" x1="14" y1="70" x2="290" y2="70"/><line class="ax" x1="14" y1="14" x2="290" y2="14" stroke-dasharray="3 4"/>' + (path ? '<path class="ln" d="' + path + '"/>' : '') + dots + labels + '</svg>';
  }

  function vSum() {
    var hasDemo = S.observations.some(function (o) { return o.demo; });
    var s = L.summarize(S.observations, showDemo ? 'demo' : 'real');
    var h = head(t('h_sum'), t('sumnote'), hasDemo ? '<button class="btn" id="demoToggle">' + (showDemo ? t('real_view') : t('demo_view')) + '</button>' : '') + '<div class="card">';
    if (showDemo) h += '<div class="demo-banner">' + t('synth') + '</div>';
    if (!s.enough) h += '<p>' + t('need', { n: L.MIN_OBS, v: s.valid }) + '</p>';
    else {
      var doneAll = s.rows.reduce(function (a, r) { return a + Math.round((r.rate || 0) * r.n); }, 0);
      h += '<div class="kpis"><div class="kpi"><b>' + s.valid + '</b>' + t('k_valid') + '</div><div class="kpi"><b>' + Math.round(doneAll / s.valid * 100) + '%</b>' + t('k_done') + '</div><div class="kpi"><b>' + s.discomfort + '</b>' + t('k_disc') + '</div></div>' +
        '<h3>' + t('rate') + '</h3><div class="bars">' + s.rows.map(function (r) { var pc = r.rate == null ? 0 : Math.round(r.rate * 100); return '<div class="bar-row"><span>' + t('h_' + r.help) + ' <span class="muted">(' + r.n + ')</span></span><div class="bar" role="img" aria-label="' + pc + '%"><i style="width:' + pc + '%"></i></div><b>' + (r.rate == null ? '-' : pc + '%') + '</b></div>'; }).join('') + '</div>' +
        '<h3 style="margin-top:20px">' + t('trend') + '</h3>' + trendSvg(S.observations.filter(function (o) { return !!o.demo === showDemo; }));
    }
    h += '<div class="row" style="margin-top:16px"><button class="btn" id="demoData">' + t('load_demo') + '</button><button class="btn" id="rep"' + (s.enough && !showDemo ? '' : ' disabled') + '>' + icon('print') + t('report') + '</button><button class="btn warn" id="clr">' + t('clear') + '</button></div></div>';
    return h;
  }

  function vData() {
    return head(t('h_data')) + '<div class="card"><h2>' + t('pmap') + '</h2><ul><li>' + t('p1') + '</li><li>' + t('p2') + '</li><li>' + t('p3') + '</li><li>' + t('p4') + '</li></ul></div>' +
      '<div class="card"><h2>' + t('backup') + '</h2><div class="row"><button class="btn primary" id="bkExp">' + t('exp') + '</button><label class="btn filebtn" style="margin:0">' + t('imp') + '<input type="file" id="bkImp" accept=".json,application/json" class="sr"></label></div></div>' +
      '<div class="card"><h2>' + t('status') + '</h2><p><span class="tag ok">OK</span> ' + t('st1') + '</p><p><span class="tag goal">Goal</span> ' + t('st2') + '</p><p><span class="tag demo">Hypothesis</span> ' + t('st3') + '</p></div>';
  }

  // ---------- child screen ----------
  function setInert(on) { SHELL_IDS.forEach(function (id) { var e = document.getElementById(id); if (e) { if (on) e.setAttribute('inert', ''); else e.removeAttribute('inert'); } }); }
  function openChild() {
    if (!kit || !L.isApproved(kit)) return;
    childKit = JSON.parse(JSON.stringify(kit)); // frozen approved snapshot
    c = { step: 0, paused: false, hard: false };
    setInert(true);
    var d = document.createElement('div'); d.id = 'child'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    document.body.appendChild(d); drawChild();
    var f = d.querySelector('.go'); if (f) f.focus();
  }
  function closeChild() { var d = document.getElementById('child'); if (d) d.remove(); childKit = null; setInert(false); }
  function childItems() {
    var items = childKit.schedule.map(function (s) { return { icon: s.id, text: s[lg()] }; });
    items.splice(2, 0, { icon: 'task', text: childKit.task[lg()].join(' ') });
    return items;
  }
  function bigIcon(n) { return '<span class="c-ic"><svg viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.task) + '</svg></span>'; }
  function drawChild() {
    var d = document.getElementById('child'); if (!d) return;
    if (!childKit || !L.isApproved(childKit)) { closeChild(); return; } // never show unapproved content
    d.className = 'child' + (S.settings.hc ? ' hc' : '');
    d.style.setProperty('--cfs', S.settings.cfs + 'rem');
    var items = childItems(), cur = items[c.step], last = c.step >= items.length, body;
    if (c.paused) body = '<div class="c-step">' + bigIcon('break') + '<div class="c-text">' + t('c_paused') + '</div></div>';
    else if (c.hard) body = '<div class="c-step">' + bigIcon('hand') + '<div class="c-text">' + t('c_hardmsg') + '</div></div>';
    else if (last) body = '<div class="c-step">' + bigIcon('star') + '<div class="c-text">' + t('c_done') + '</div></div>';
    else body = '<div class="c-step">' + bigIcon(cur.icon) + '<div class="c-text">' + esc(cur.text) + '</div><div class="c-dots">' + items.map(function (_, i) { return '<i class="' + (i < c.step ? 'done' : i === c.step ? 'on' : '') + '"></i>'; }).join('') + '</div></div>';
    d.innerHTML = '<div class="c-top"><span>' + Math.min(c.step + 1, items.length) + ' / ' + items.length + '</span><span class="row"><button class="btn" data-c="sz" aria-label="text size">A±</button><button class="btn" data-c="hc" aria-label="contrast">◐</button><button class="btn" data-c="exit">' + t('c_exit') + '</button></span></div>' +
      '<div class="c-body">' + body + '</div><div class="c-bar">' +
      (c.paused || c.hard ? '<button class="go" data-c="resume">' + t('c_resume') + '</button>' :
        (last ? '' : '<button class="go" data-c="next">' + t('c_next') + '</button>') +
        (c.step > 0 && !last ? '<button data-c="back">' + t('c_back') + '</button>' : '') +
        '<button data-c="rep">' + t('c_repeat') + '</button><button data-c="pause">' + t('c_pause') + '</button><button data-c="hard">' + t('c_hard') + '</button>') + '</div>';
  }
  function speak(text) {
    if (!S.settings.sound || !('speechSynthesis' in window)) return;
    if (!L.sanitizeForExternal(text).ok) { notify(t('blocked'), true); return; }
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.lang = S.lang === 'kk' ? 'kk-KZ' : 'ru-RU'; u.rate = 0.85; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
  }
  function childAct(a) {
    if (!document.getElementById('child') || !childKit) { if (a === 'exit') closeChild(); return; }
    var items = childItems();
    if (a === 'exit') { closeChild(); return; }
    if (a === 'next') c.step = Math.min(items.length, c.step + 1);
    if (a === 'back') c.step = Math.max(0, c.step - 1);
    if (a === 'pause') c.paused = true;
    if (a === 'hard') c.hard = true;
    if (a === 'resume') { c.paused = false; c.hard = false; }
    if (a === 'sz') { S.settings.cfs = S.settings.cfs >= 2 ? 1.2 : S.settings.cfs + 0.3; persist(); }
    if (a === 'hc') { S.settings.hc = !S.settings.hc; persist(); }
    drawChild();
    if (a === 'rep' || a === 'next' || a === 'back') { var it = childItems()[c.step]; if (it) speak(it.text); }
  }

  // ---------- actions ----------
  function seg(id, key, e) { var b = e.target.closest('button'); if (!b) return; obs[key] = b.dataset.k; [].forEach.call(document.querySelectorAll('#' + id + ' button'), function (x) { x.setAttribute('aria-pressed', x === b); }); }
  function makeKit(v) { variant = v; kit = L.generateKit({ topic: topicSel, grade: gradeSel, level: levelSel, variant: variant }); }
  function example() { topicSel = 'add100'; gradeSel = 3; levelSel = 'basic'; makeKit(0); L.approve(kit, 'demo'); wstep = 4; go('kit'); }

  function bind() {
    var q = function (s) { return document.querySelector(s); };
    var on = function (s, ev, fn) { var el = q(s); if (el) el.addEventListener(ev, fn); };
    [].forEach.call(document.querySelectorAll('[data-task]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.task;
        if (k === 'kit') { wstep = 1; go('kit'); } else if (k === 'example') example();
        else if (k === 'report') { showDemo = false; go('sum'); } else go(k);
      });
    });
    on('#fTopic', 'change', function (e) { topicSel = e.target.value; });
    on('#fGrade', 'change', function (e) { gradeSel = +e.target.value; });
    on('#fLevel', 'change', function (e) { levelSel = e.target.value; });
    on('#mk', 'click', function () { makeKit(0); wstep = 2; render(); });
    on('#mk2', 'click', function () { makeKit(variant + 1); render(); });
    on('#wBack', 'click', function () { wstep = Math.max(1, wstep - 1); render(); });
    on('#wNext', 'click', function () { wstep = Math.min(4, wstep + 1); render(); });
    [].forEach.call(document.querySelectorAll('[data-e]'), function (el) { el.addEventListener('change', function () { L.editKit(kit, el.dataset.e, lg(), +el.dataset.i, el.value); render(); }); });
    on('#ap', 'click', function () { L.approve(kit, 'teacher'); render(); notify(t('approved')); });
    on('#chb', 'click', function () { openChild(); });
    on('#pr', 'click', function () { printKit(); });
    on('#sHc', 'change', function (e) { S.settings.hc = e.target.checked; persist(); });
    on('#sSound', 'change', function (e) { S.settings.sound = e.target.checked; persist(); });
    on('#oTopic', 'click', function (e) { seg('oTopic', 'topic', e); });
    on('#oHelp', 'click', function (e) { seg('oHelp', 'help', e); });
    on('#oRes', 'click', function (e) { seg('oRes', 'result', e); });
    on('#oSave', 'click', function () {
      S.observations.push({ t: Date.now(), topic: obs.topic, help: obs.help, result: obs.result, discomfort: !!q('#oDisc').checked, kitHash: kit ? kit.hash : null });
      obs = OBS0();
      var okSave = persist(); render(); if (okSave) notify(t('saved'));
    });
    on('#demoData', 'click', function () { S.observations = S.observations.filter(function (o) { return !o.demo; }); demoData(); persist(); showDemo = true; render(); });
    on('#demoToggle', 'click', function () { showDemo = !showDemo; render(); });
    on('#clr', 'click', function () { if (confirm(t('clear_q'))) { S.observations = []; showDemo = false; persist(); render(); } });
    on('#rep', 'click', function () { report(); });
    on('#bkExp', 'click', function () {
      var blob = new Blob([L.exportBackup({ observations: S.observations, settings: S.settings })], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ayan-backup.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    on('#bkImp', 'change', function (e) {
      var f = e.target.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        var res = L.importBackup(String(r.result));
        if (!res.ok) { notify(t('imp_bad'), true); return; }
        var prev = { o: S.observations, s: S.settings };
        S.observations = res.state.observations; S.settings = res.state.settings;
        if (persist()) { render(); notify(t('imp_ok')); }
        else { S.observations = prev.o; S.settings = prev.s; render(); }
      };
      r.onerror = function () { notify(t('imp_bad'), true); }; r.readAsText(f);
    });
  }

  function demoData() {
    var seed = 7, r = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var helps = ['none', 'hint', 'adult'];
    for (var i = 0; i < 24; i++) {
      var h = helps[i % 3], p = h === 'none' ? 0.4 + (i < 12 ? 0 : 0.15) : h === 'hint' ? 0.6 + (i < 12 ? 0 : 0.1) : 0.8, ok = r() < p;
      S.observations.push({ t: Date.now() - i * 86400000 * 1.1, topic: Object.keys(L.TOPICS)[i % 4], help: h, result: ok ? 'done' : (r() < 0.5 ? 'partial' : 'refused'), discomfort: r() < 0.12, demo: true });
    }
  }

  function printKit() {
    if (!kit) return;
    var pieces = [].concat(kit.goal[lg()], kit.schedule.map(function (s) { return s[lg()]; }), kit.task[lg()], kit.story[lg()]);
    if (!pieces.every(function (x) { return L.sanitizeForExternal(x).ok; })) { notify(t('blocked'), true); return; }
    var w = window.open('', '_blank'); if (!w) { notify(t('popup'), true); return; }
    var li = function (a) { return a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join(''); };
    w.document.write('<!doctype html><meta charset="utf-8"><title>Ayan</title><style>body{font:18px system-ui;max-width:700px;margin:30px auto}li{margin:8px 0}</style><h1>' + esc(kit.goal[lg()]) + '</h1><p><i>' + t('demo') + (L.isApproved(kit) ? '' : ' | ' + t('notapp')) + '</i></p><h2>' + t('t_sched') + '</h2><ol>' + li(kit.schedule.map(function (s) { return s[lg()]; })) + '</ol><h2>' + t('t_task') + '</h2><ol>' + li(kit.task[lg()]) + '</ol><h2>' + t('t_story') + '</h2><ol>' + li(kit.story[lg()]) + '</ol><p><i>' + t('banner') + '</i></p>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300);
  }

  function report() {
    var s = L.summarize(S.observations, 'real'); if (!s.enough) return;
    var w = window.open('', '_blank'); if (!w) { notify(t('popup'), true); return; }
    var rows = s.rows.map(function (r) { return '<tr><td>' + t('h_' + r.help) + '</td><td>' + r.n + '</td><td>' + (r.rate == null ? '-' : Math.round(r.rate * 100) + '%') + '</td></tr>'; }).join('');
    w.document.write('<!doctype html><meta charset="utf-8"><title>' + t('pr_title') + '</title><style>body{font:16px system-ui;max-width:700px;margin:30px auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:6px;text-align:left}</style><h1>' + t('pr_title') + '</h1><p>' + new Date().toLocaleDateString() + '</p><table><tr><th>' + t('help') + '</th><th>' + t('n') + '</th><th>' + t('rate') + '</th></tr>' + rows + '</table><p>' + t('disc_rate') + ': ' + s.discomfort + ' / ' + s.valid + '</p><p><i>' + t('sumnote') + '</i></p><p><i>' + t('banner') + '</i></p>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300);
  }

  // ---------- global events ----------
  function navClick(e) { var b = e.target.closest('button[data-v]'); if (b) go(b.dataset.v); }
  document.getElementById('nav').addEventListener('click', navClick);
  document.getElementById('mnav').addEventListener('click', navClick);
  document.getElementById('brand').addEventListener('click', function () { go('home'); });
  document.getElementById('mbrand').addEventListener('click', function () { go('home'); });
  document.getElementById('langSeg').addEventListener('click', function (e) { var b = e.target.closest('[data-lang]'); if (b) { S.lang = b.dataset.lang; persist(); render(); } });
  document.getElementById('sizeSeg').addEventListener('click', function (e) { var b = e.target.closest('[data-size]'); if (b) { S.size = +b.dataset.size; persist(); render(); } });
  document.getElementById('themeBtn').addEventListener('click', function () { try { localStorage.setItem(TKEY, isDark() ? 'light' : 'dark'); } catch (e) { /* ignore */ } applyTheme(); });
  document.body.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) childAct(b.dataset.c); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') childAct('exit'); });

  render();
})();
