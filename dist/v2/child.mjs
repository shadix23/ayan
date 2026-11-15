// Child workspace (V2.1). Routes: #/home #/lesson #/play #/watch #/help #/helper #/settings #/achievements.
// Sound, music and autoplay are off by default; calm mode is chosen by the child, never inferred. Help and breaks
// are never errors. Every mutating action goes through the outbox, so a reload or a lost connection keeps it.
import {esc,icon,MARK,L,lang,setLang,makeT,api,setActor,createOutbox,store as mkStore,uuid,sid,announce,toast,openDialog,reducedMotion,$,lantern,plural} from './ui.mjs';
import * as Motion from './motion.mjs';
import * as Lesson from './lesson.mjs';
import * as Mascot from './mascot2d.mjs';
import * as Video from './video.mjs';
import * as FW from './fraction-world.mjs';
import * as Fig from './figures.mjs';
const Core=window.AyanCore;
const t=makeT({
 brandSub:['учимся по-своему','өз қарқынымызбен'],home:['Главная','Басты бет'],lesson:['Мой урок','Менің сабағым'],play:['Играть','Ойнау'],watch:['Смотреть','Көру'],help:['Моя помощь','Менің көмегім'],
 settings:['Настройки','Баптау'],ach:['Мои достижения','Жетістіктерім'],menu:['Меню','Мәзір'],pace:['В своём темпе','Өз қарқыныңмен'],paceText:['Можно повторить и сделать перерыв.','Қайталауға және үзіліс жасауға болады.'],
 langBtn:['ҚАЗ / РУС','ҚАЗ / РУС'],langAria:['Язык: русский. Переключить на казахский','Тіл: қазақша. Орысшаға ауыстыру'],calm:['Тихий режим','Тыныш режим'],
 hi:['Привет! Продолжим учиться?','Сәлем! Оқуды жалғастырамыз ба?'],today:['Сегодня - {t}. Всё получится шаг за шагом.','Бүгін - {t}. Бәрі қадам-қадаммен болады.'],
 myLesson:['Мой урок · {t}','Менің сабағым · {t}'],stepNext:['Шаг {n} из 5 · Далее: {s}','5 қадамның {n}-і · Келесі: {s}'],continueBtn:['Продолжить урок','Сабақты жалғастыру'],startBtn:['Начать урок','Сабақты бастау'],
 lead:['Посмотри объяснение, затем попробуй сам.','Түсіндірмені қара, содан кейін өзің байқап көр.'],playSub:['Мир долей · одна цель, три режима','Үлестер әлемі · бір мақсат, үш режим'],chooseGame:['Выбрать игру','Ойын таңдау'],
 watchSub:['Короткие видео с субтитрами','Субтитрі бар қысқа бейнелер'],openVideo:['Открыть видео','Бейнені ашу'],route:['Мой маршрут','Менің бағытым'],
 noLesson:['Пока нет назначенных уроков','Әзірге тағайындалған сабақ жоқ'],allDone:['Все назначенные уроки пройдены','Барлық тағайындалған сабақ өтілді'],allDoneText:['Можно повторить урок, посмотреть видео или потренироваться. Новый урок назначит учитель.','Сабақты қайталауға, бейне көруге немесе жаттығуға болады. Жаңа сабақты мұғалім тағайындайды.'],review:['Повторить урок','Сабақты қайталау'],noLessonText:['Учитель назначит урок. Пока можно посмотреть видео или потренироваться.','Мұғалім сабақ тағайындайды. Әзірге бейне көруге немесе жаттығуға болады.'],
 more:['Ещё задания','Тағы тапсырмалар'],done:['готово','дайын'],inWork:['в работе','орындалуда'],notStarted:['не начато','басталмаған'],
 support:['Нужна поддержка?','Көмек керек пе?'],repeat:['Повтори','Қайтала'],example:['Покажи пример','Мысал көрсет'],brk:['Нужен перерыв','Үзіліс керек'],needHelp:['Мне нужна помощь','Маған көмек керек'],more7:['Ещё фразы','Тағы сөздер'],
 notUnderstood:['Я не понял(а)','Мен түсінбедім'],tooLoud:['Слишком громко','Тым қатты'],ready:['Я готов продолжить','Жалғастыруға дайынмын'],
 helpTitle:['Моя помощь','Менің көмегім'],helpSub:['Можно выбрать фразу. Говорить или печатать не обязательно.','Сөзді таңдауға болады. Сөйлеу немесе жазу міндетті емес.'],
 breakTitle:['Перерыв - это нормально.','Үзіліс - бұл қалыпты.'],breakAny:['Можно остановиться в любой момент: урок сохранится. Когда будешь готов - нажми кнопку.','Кез келген уақытта тоқтауға болады: сабақ сақталады. Дайын болғанда түймені бас.'],breakText:['Урок сохранён. Вернись, когда будешь готов.','Сабақ сақталды. Дайын болғанда орал.'],
 queued:['Нет связи: просьба отправится учителю, когда связь вернётся.','Байланыс жоқ: өтініш байланыс оралғанда мұғалімге жіберіледі.'],delivered:['Учитель знает, скоро подойдёт.','Мұғалім біледі, жақында келеді.'],
 helpSending:['Отправляем учителю…','Мұғалімге жіберіп жатырмыз…'],helpKnown:['Учитель уже знает и скоро подойдёт. Можно продолжать.','Мұғалім біледі, жақында келеді. Жалғастыра беруге болады.'],helpKnownShort:['Учитель знает, скоро подойдёт','Мұғалім біледі, жақында келеді'],helpQueuedShort:['Просьба ждёт связи','Өтініш байланысты күтуде'],helpComingShort:['Учитель идёт к тебе','Мұғалім саған келе жатыр'],
 noticeText:['Через {m} заканчиваем. Доделай это задание.','{n} минуттан кейін аяқтаймыз. Осы тапсырманы бітір.'],noticeLeft:['Осталось {n} мин','{n} мин қалды'],noticeDone:['Можно закончить на этом шаге. Всё сохранено.','Осы қадаммен аяқтауға болады. Бәрі сақталды.'],noticeOk:['Понятно','Түсіндім'],noticeAria:['Сообщение учителя','Мұғалімнің хабары'],helpSignin:['Нужно войти снова: просьба отправится учителю после входа.','Қайта кіру керек: өтініш кіргеннен кейін мұғалімге жіберіледі.'],helpComing:['Учитель увидел просьбу и идёт к тебе.','Мұғалім өтінішті көрді, саған келе жатыр.'],
 skip:['К основному содержимому','Негізгі мазмұнға өту'],docTitle:['кабинет ученика','оқушы кабинеті'],
 motionNow:['Сейчас работает: Тихо. {why}','Қазір: Тыныш. {why}'],whyReduce:['На устройстве включено «Уменьшение движения».','Құрылғыда «Қозғалысты азайту» қосулы.'],whyCalm:['Включён тихий режим.','Тыныш режим қосулы.'],whyDeco:['Декоративные анимации выключены.','Әшекей анимациялар өшірулі.'],
 loudDone:['Звук выключен. Можно настроить звук в настройках.','Дыбыс өшірілді. Дыбысты баптауда реттеуге болады.'],openSettings:['Открыть настройки','Баптауды ашу'],
 nuTitle:['Что сделаем?','Не істейміз?'],nuOther:['Покажи другой пример','Басқа мысал көрсет'],nuSteps:['Объясни по шагам','Қадамдап түсіндір'],nuRetry:['Попробую ещё раз','Тағы байқап көремін'],nuKept:['Твой ответ и шаг сохранены.','Жауабың мен қадамың сақталды.'],
 boardMore:['Все фразы','Барлық сөздер'],close:['Закрыть','Жабу'],
 sTitle:['Как тебе удобно?','Саған қалай ыңғайлы?'],sSub:['Настройки применяются сразу. Можно изменить в любой момент.','Баптаулар бірден қолданылады. Кез келген уақытта өзгертуге болады.'],
 calmOn:['Тихий режим включён','Тыныш режим қосулы'],stdOn:['Обычный режим','Қалыпты режим'],calmText:['Меньше движения и деталей. Учебная цель остаётся прежней.','Қозғалыс пен бөлшек аз. Оқу мақсаты өзгермейді.'],stdText:['Небольшие иллюстрации и мягкие переходы. Звук и автозапуск всё равно выключены.','Шағын суреттер мен жұмсақ ауысулар. Дыбыс пен автоқосылу бәрібір өшірулі.'],change:['Изменить','Өзгерту'],
 sfx:['Звуковые эффекты','Дыбыс әсерлері'],soundLessons:['Звук в уроках и видео','Сабақ пен бейнедегі дыбыс'],soundNote:['Озвучка и видео всё равно включаются только кнопкой.','Дыбыстау мен бейне бәрібір тек түймемен қосылады.'],music:['Фоновая музыка','Фондық музыка'],motion:['Движение','Қозғалыс'],mascot:['Маскот','Маскот'],textSize:['Размер текста','Мәтін өлшемі'],captions:['Субтитры','Субтитрлер'],
 decorative:['Декоративные анимации','Әшекей анимациялар'],saturation:['Насыщенность картинок','Суреттердің қанықтығы'],complexity:['Интерфейс','Интерфейс'],timers:['Таймеры','Таймерлер'],voiceRate:['Скорость озвучки','Дыбыс жылдамдығы'],autoplay:['Автовоспроизведение','Автоқосылу'],
 on:['Включены','Қосулы'],off:['Выключены','Өшірулі'],onS:['Включена','Қосулы'],offS:['Выключена','Өшірулі'],min:['Минимум','Ең аз'],normal:['Обычное','Қалыпты'],calmSat:['Спокойная','Тыныш'],std:['Обычная','Қалыпты'],
 simple:['Упрощённый','Жеңілдетілген'],standard:['Обычный','Қалыпты'],hidden:['Скрыты','Жасырын'],shown:['Показаны','Көрсетілген'],tNormal:['Обычный · 100%','Қалыпты · 100%'],tLarge:['Крупный · 112%','Үлкен · 112%'],tXl:['Очень крупный · 125%','Өте үлкен · 125%'],
 noVoice:['Без голоса','Дауыссыз'],withVoice:['С голосом','Дауыспен'],hiddenM:['Скрыт','Жасырын'],
 autoOff:['Автовоспроизведение выключено','Автоқосылу өшірулі'],autoNote:['Система учитывает настройку устройства «Уменьшение движения».','Жүйе құрылғының «Қозғалысты азайту» баптауын ескереді.'],reduceOn:['На этом устройстве включено «Уменьшение движения»: движение уже снижено.','Бұл құрылғыда «Қозғалысты азайту» қосулы: қозғалыс азайтылған.'],
 resetPreset:['Вернуть настройки режима','Режим баптауларын қайтару'],saved:['Сохранено','Сақталды'],savedLocal:['Сохранено на устройстве, ждёт синхронизации','Құрылғыда сақталды, синхрондауды күтуде'],
 firstTitle:['Как тебе удобнее учиться?','Саған қалай оқу ыңғайлы?'],firstSub:['Выбери вид. Его можно поменять в любой момент одной кнопкой «Тихий режим».','Түрін таңда. Оны кез келген уақытта «Тыныш режим» түймесімен өзгертуге болады.'],
 pickStd:['Обычный','Қалыпты'],pickCalm:['Тихий','Тыныш'],pickStdText:['Небольшие картинки и мягкие переходы.','Шағын суреттер және жұмсақ ауысулар.'],pickCalmText:['Меньше движения и деталей, приглушённые цвета.','Қозғалыс пен бөлшек аз, түстер жұмсақ.'],bothNote:['В обоих режимах звук и автозапуск выключены. Учебные задания одинаковые.','Екі режимде де дыбыс пен автоқосылу өшірулі. Оқу тапсырмалары бірдей.'],choose:['Выбрать','Таңдау'],
 helperTitle:['Твой помощник','Сенің көмекшің'],helperSub:['Аян - светлячок. Можно скрыть его или выключить голос.','Аян - жарқырауық қоңыз. Оны жасыруға немесе дауысын өшіруге болады.'],
 meet:['Познакомься с Аяном','Аянмен таныс бол'],meetSub:['Мягкий силуэт · спокойная мимика','Жұмсақ пішін · байсалды мимика'],helpLike:['Помощь так, как удобно','Көмек ыңғайлы түрде'],
 helpLine1:['«Давай посмотрим на пример».','«Мысалға қарайық».'],helpLine2:['Короткая фраза и одна мысль.','Қысқа сөз және бір ой.'],helpLine3:['Без оценки личности.','Тұлғаны бағалаусыз.'],
 showHelper:['Показывать помощника','Көмекшіні көрсету'],voice:['Голос','Дауыс'],hintsMode:['Подсказки','Кеңестер'],onRequest:['Только по запросу','Тек сұрау бойынша'],offer:['Предлагать после 2 попыток','2 әрекеттен кейін ұсыну'],yes:['Да','Иә'],no:['Нет','Жоқ'],
 textOnly:['Только текстовые подсказки','Тек мәтіндік кеңестер'],states:['Состояния персонажа','Кейіпкер күйлері'],stateNames:['Покой, приветствие, объясняет, думает, подбадривает, радуется, помогает, огонёк зажжён, отдыхает, спит','Тыныштық, сәлемдесу, түсіндіреді, ойлайды, қолдайды, қуанады, көмектеседі, шырақ жанды, демалады, ұйықтайды'],
 st_Idle:['Покой','Тыныштық'],st_Greeting:['Приветствие','Сәлемдесу'],st_Explaining:['Объясняет','Түсіндіреді'],st_Thinking:['Думает','Ойлайды'],st_Encouraging:['Подбадривает','Қолдайды'],st_Celebrating:['Радуется','Қуанады'],st_Helping:['Помогает','Көмектеседі'],st_Lit:['Огонёк зажжён','Шырақ жанды'],st_Resting:['Отдыхает','Демалады'],st_Sleeping:['Спит','Ұйықтайды'],
 voiceNA:['Голос устройства недоступен. Подсказки показываются текстом.','Құрылғы дауысы жоқ. Кеңестер мәтінмен көрсетіледі.'],
 playTitle:['Играть','Ойнау'],playPage:['Игры к урокам. В каждой - одна цель и несколько способов ответа.','Сабақтарға арналған ойындар. Әрқайсысында бір мақсат және бірнеше жауап тәсілі.'],
 fwCard:['Мир долей','Үлестер әлемі'],fwText:['Доли на пицце, полоске и карточках. 3D, 2D или карточки.','Пиццадағы, жолақтағы және карточкалардағы үлестер. 3D, 2D немесе карточкалар.'],fwGo:['Играть в уроке','Сабақта ойнау'],fwFree:['Тренировка без оценки','Бағасыз жаттығу'],
 classic:['Ещё игры: пары, сад, маршрут','Тағы ойындар: жұптар, бақ, бағыт'],classicText:['Игры из прежней версии кабинета.','Кабинеттің бұрынғы нұсқасындағы ойындар.'],classicGo:['Открыть','Ашу'],
 freeTitle:['Тренировка · без оценки','Жаттығу · бағасыз'],freeNote:['Это тренировка: ответ проверяется здесь и не попадает в отчёт.','Бұл жаттығу: жауап осында тексеріледі және есепке түспейді.'],
 watchTitle:['Смотрим и пробуем · Дроби','Көреміз және байқаймыз · Бөлшектер'],watchPageSub:['Демо 01 · Субтитры включены · Без автоматического воспроизведения.','Демо 01 · Субтитрлер қосулы · Автоқосылусыз.'],
 toQuiz:['К мини-тесту','Шағын тестке'],quizTitle:['Мини-тест после видео','Бейнеден кейінгі шағын тест'],quizNote:['Просмотр видео не ставит отметку. Отметку даёт этот тест.','Бейне көру белгі қоймайды. Белгіні осы тест береді.'],check:['Проверить ответ','Жауапты тексеру'],quizDone:['Мини-тест пройден','Шағын тест өтті'],
 lessonText:['Текст урока','Сабақ мәтіні'],openModel:['Открыть модель','Модельді ашу'],noVideoYet:['Видео для других тем пока не создано.','Басқа тақырыптарға бейне әлі жасалмаған.'],
 achTitle:['Мои достижения','Жетістіктерім'],achSub:['Что уже получилось. Без рейтингов и сравнения с другими.','Не істей алдың. Рейтингсіз және басқалармен салыстырусыз.'],achNone:['Пока ничего не завершено. Начни с урока на главной.','Әзірге ештеңе аяқталмаған. Басты беттегі сабақтан баста.'],achDone:['Урок завершён','Сабақ аяқталды'],
 pathTitle:['Тропинка огоньков','Шырақтар соқпағы'],daysTitle:['Дни со светом','Жарық күндер'],nowKicker:['Сейчас','Қазір'],
 daysNote:['Светлых дней за неделю: {n}. Пропущенный день просто остаётся контуром, ничего не сгорает.','Аптадағы жарық күндер: {n}. Өткізіп алған күн жай контур болып қалады, ештеңе жанып кетпейді.'],
 daysToday:['Сегодняшний фонарик загорится после первого верного ответа.','Бүгінгі шам бірінші дұрыс жауаптан кейін жанады.'],daysTodayLit:['Сегодня фонарик уже горит.','Бүгін шам жанып тұр.'],
 today2:['Сегодня','Бүгін'],dayLit:['светлый день','жарық күн'],dayDark:['без урока','сабақсыз'],embersAria:['Огоньков: {n}','Шырақ: {n}'],
 stopDone:['пройден','өтілді'],stopNow:['сейчас','қазір'],stopNext:['следующий','келесі'],scaleCap:['Урок {n} из {m} на тропинке','Соқпақтағы {m} сабақтың {n}-і'],fromTeacher:['от учителя','мұғалімнен'],
 lessonMeta:['5 шагов · {m} заданий · можно сделать перерыв','5 қадам · {m} тапсырма · үзіліс жасауға болады'],stepNow:['Шаг {n} из 5 · {s}','5 қадамның {n}-і · {s}'],
 helpShort:['Помощь','Көмек'],brkShort:['Перерыв','Үзіліс'],moreShort:['Ещё','Тағы'],
 breath:['Подышать вместе','Бірге тыныстау'],breathPause:['Пауза','Кідірту'],breathResume:['Продолжить дыхание','Тынысты жалғастыру'],breathAgain:['Ещё раз','Тағы бір рет'],
 inhale:['Вдох','Дем ал'],exhale:['Выдох','Дем шығар'],breathOff:['Вдохни медленно, пока считаешь до четырёх. Потом так же медленно выдохни.','Төртке дейін санап, баяу дем ал. Содан кейін солай баяу дем шығар.'],
 mQuiet:['Тихо','Тыныш'],mSoft:['Мягко','Жұмсақ'],mFull:['Живо','Жанды'],
 motionNote:['Тихо - без движения. Мягко - только плавные появления. Живо - огонёк летит и празднует. Звук всё равно выключен.','Тыныш - қозғалыссыз. Жұмсақ - тек баяу пайда болу. Жанды - шырақ ұшады және қуанады. Дыбыс бәрібір өшірулі.'],
 demoShort:['Демо: синтетические данные','Демо: синтетикалық деректер'],
 demo:['Демо-режим: синтетические данные, не результаты реального ребёнка.','Демо-режим: синтетикалық деректер, нақты баланың нәтижесі емес.'],switchUser:['Сменить демо-аккаунт','Демо-аккаунтты ауыстыру'],
 logout:['Выйти','Шығу'],syncLocal:['Сохранено на устройстве, ждёт синхронизации','Құрылғыда сақталды, синхрондауды күтуде'],loading:['Загружаем…','Жүктеліп жатыр…'],loadFail:['Не удалось загрузить. Проверь связь и попробуй ещё раз.','Жүктеу мүмкін болмады. Байланысты тексеріп, қайта байқап көр.'],retry:['Повторить','Қайталау']
});
const R={home:'home',lesson:'path',play:'play',watch:'video',help:'help',settings:'settings'};
let me=null,home=null,profile=null,outbox=null,store=null,lessonInst=null,mascots=[],medias=new Set(),routeName='home',freeState={};
const STAGE_KEYS=Lesson.STAGES;
const app=document.getElementById('app');

async function boot(){
 try{const r=await api('/api/v2/child/home');if(r.status===401){location.replace('/child/login');return;}home=r.data;}
 catch(e){app.innerHTML=`<main class="main"><div class="page"><div class="card stack"><h1>${esc(t('loadFail'))}</h1><button class="btn primary inline" onclick="location.reload()">${esc(t('retry'))}</button></div></div></main>`;return;}
 me=home.child;profile=home.profile;store=mkStore('child.'+me.id);setActor('child.'+me.id);
 window.addEventListener('ayan:actor-changed',()=>{toast(L({ru:'В другой вкладке вошёл другой ученик. Обновляем страницу.',kk:'Басқа қойындыда басқа оқушы кірді. Бетті жаңартамыз.'}));setTimeout(()=>location.reload(),1500);});
 outbox=createOutbox('child.'+me.id,{onChange:list=>setSync(list.length?'local':'server')});
 // In the local demo the presenter's language choice on /demo wins over the synthetic profile.
 setLang((home.demo&&(()=>{try{return localStorage.getItem('ayan.v2.demoLang');}catch{return null;}})())||profile.lang||lang());applyProfile();
 window.addEventListener('hashchange',route);window.addEventListener('online',()=>outbox.flush());
 window.addEventListener('ayan:media',e=>medias.add(e.detail));
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',()=>{applyProfile();});
 setInterval(flushEvents,2500);setInterval(pollNotice,5000);pollNotice();
 outbox.flush();
 if(!profile.preset){firstVisit();return;}
 route();
}
function applyProfile(){
 const h=document.documentElement;h.dataset.text=profile.textSize||'normal';h.dataset.saturation=profile.saturation||'standard';h.dataset.complexity=profile.complexity||'standard';h.dataset.preset=profile.preset||'standard';
 // Volume of motion: off (Тихо) / soft (Мягко) / full (Живо). Calm mode and the system setting always win.
 h.dataset.motion=window.AyanLights.motionLevel({preset:profile.preset,decorative:profile.decorative,motionIntensity:profile.motionIntensity,reducedMotion:reducedMotion()});
}
const motionOn=()=>document.documentElement.dataset.motion!=='off'&&profile.mascotMotion!=='minimal';
// ---------- events (batched through the outbox) ----------
let evq=[],seq=Number(sessionStorage.getItem('ayan.v2.seq')||0);
function logEvent(type,payload={},{attemptId,taskId}={}){evq.push({eventId:uuid(),type,payload,attemptId:attemptId||lessonInst?.attemptId||undefined,taskId,clientSeq:++seq,occurredAt:Date.now()});sessionStorage.setItem('ayan.v2.seq',String(seq));}
function flushEvents(){if(!evq.length)return;const batch=evq.splice(0,50);outbox.send('ev:'+batch[0].eventId,'/api/v2/child/events',{events:batch});}
// ---------- sync status ----------
function setSync(s){const el=$('#sync');if(!el)return;el.textContent=s==='local'?t('syncLocal'):'';el.hidden=s!=='local';}
// ---------- profile changes ----------
async function setProfile(change,{applyPreset=false}={}){
 const prev=profile;profile={...profile,...change};applyProfile();renderMascotsUpdate();
 logEvent('preferences_changed',{changedKeys:Object.keys(change).filter(k=>/^[a-zA-Z]+$/.test(k))});
 const r=await outbox.send('prof:'+sid(),'/api/support?role=child',{...change,settingsVersion:prev.settingsVersion,applyPreset});
 if(r.sent&&r.r.ok){profile={...profile,...r.r.data};applyProfile();return 'server';}return 'local';
}
// ---------- sound control: nothing plays unless the child pressed a button ----------
// Lesson and video audio is allowed unless the child said "too loud" or switched sound off. Nothing ever starts by itself.
function canPlaySound(){return profile.sound!==false;}
function stopAllSound(){for(const m of medias){try{m.pause();}catch{}}document.querySelectorAll('audio,video').forEach(m=>{try{m.pause();}catch{}});try{speechSynthesis.cancel();}catch{}lessonInst?.stopMedia?.();}
function voices(){try{return speechSynthesis.getVoices().filter(v=>v.localService&&v.lang.toLowerCase().startsWith(lang()==='kk'?'kk':'ru'));}catch{return [];}}
// Device voice only (localService): no network TTS, no paid provider. Off unless the child turned the voice on.
function sayText(text){if(!profile.mascotVoice||profile.textOnly||!text)return;try{const v=voices();if(!v.length){toast(t('voiceNA'));return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=v[0];u.lang=v[0].lang;u.rate=profile.voiceRate||1;speechSynthesis.speak(u);}catch{}}
// ---------- mascot ----------
// The 2D Аян (mascot2d.mjs). A re-render replaces the DOM: mascots whose host left the page are destroyed first; the same slot
// mounted again continues the same character. Small idle touches (an antenna twitch) only on the home screen.
function mountMascot(el,state){mascots=mascots.filter(x=>{if(x.el?.isConnected)return true;x.destroy();return false;});if(profile.mascotVisible===false){el.hidden=true;return null;}const m=Mascot.mount(el,{state:state||currentMascot,motion:motionOn(),visible:true,ambient:routeName==='home'});m.el=el;mascots.push(m);return m;}
let currentMascot='Idle';function setMascot(s){currentMascot=s;for(const m of mascots)m.set(s);}
function renderMascotsUpdate(){for(const m of mascots)m.update({visible:profile.mascotVisible!==false,motion:motionOn()});}
function clearMascots(){for(const m of mascots)m.destroy();mascots=[];}

// ---------- shell ----------
function shell(active,title,sub,content){
 // The lesson opens from the path on the home page; achievements live in the lanterns there.
 const nav=[['home','#/home','home'],['play','#/play','play'],['watch','#/watch','video'],['help','#/help','help'],['settings','#/settings','settings']];
 app.innerHTML=`<div class="app"><header class="side"><a class="brand" href="#/home" aria-label="Аян">${MARK}<span><b>Аян</b><small>${esc(t('brandSub'))}</small></span></a>
  <button type="button" class="tool menu-btn" aria-expanded="false" aria-controls="nav" data-menu>${icon('menu')}${esc(t('menu'))}</button>
  <nav aria-label="${esc(t('menu'))}"><ul class="nav" id="nav">${nav.map(([k,href,ic])=>`<li><a href="${href}" ${k===active?'aria-current="page"':''}>${icon(ic)}<span>${esc(t(k))}</span></a></li>`).join('')}</ul></nav>
  <div class="side-note opt-detail"><b>${esc(t('pace'))}</b><p>${esc(t('paceText'))}</p></div></header>
  <main class="main" id="main" tabindex="-1">${home.demo?`<div class="demo-strip"><span>${esc(t('demoShort'))}</span><a href="/demo">${esc(t('switchUser'))}</a></div>`:''}<div class="page">
   <div class="top"><div><h1 id="page-h" tabindex="-1">${esc(title)}</h1>${sub?`<p class="sub" id="page-sub">${esc(sub)}</p>`:'<p class="sub" id="page-sub" hidden></p>'}<p class="status-line warn" id="sync" hidden></p></div>
    <div class="top-tools"><button type="button" class="tool" data-lang aria-label="${esc(t('langAria'))}">${icon('globe')}${esc(t('langBtn'))}</button><button type="button" class="tool" data-calm aria-pressed="${profile.preset==='calm'}">${icon('leaf')}${esc(t('calm'))}</button></div></div>
   <div id="view" class="stack" style="gap:28px">${noticeHtml()}${content}</div></div>
   ${supportBar()}</main></div>`;
 setSync(outbox.list().length?'local':'server');
}
function supportBar(){return `<section class="support" aria-label="${esc(t('support'))}"><b>${esc(t('support'))}</b><div class="acts">
 <button type="button" class="chip" data-phrase="help">${icon('hand')}${esc(t('needHelp'))}</button><button type="button" class="chip" data-phrase="break">${icon('pause')}${esc(t('brk'))}</button>
 <button type="button" class="chip" data-board>${icon('help')}${esc(t('more7'))}</button></div>${helpStateHtml()}</section>`;}
// The same three actions in the lesson footer (short labels on a phone).
function focusSupport(){const b=(attr,ic,long,short)=>`<button type="button" class="quiet-btn" ${attr} aria-label="${esc(long)}">${icon(ic)}<span class="long">${esc(long)}</span><span class="short">${esc(short)}</span></button>`;
 return `<div class="foot-support" role="group" aria-label="${esc(t('support'))}">${b('data-phrase="help"','hand',t('needHelp'),t('helpShort'))}${b('data-phrase="break"','pause',t('brk'),t('brkShort'))}${b('data-board','help',t('more7'),t('moreShort'))}${helpStateHtml()}</div>`;}
// A help request leaves a trace on screen until the teacher answers or 10 minutes pass; a second press does not send another one (a11y В6).
// After the teacher's "Видел, иду" the trace says "Учитель идёт к тебе" for 3 minutes (the server keeps seen on the request).
const HELP_MS=10*60000,COMING_MS=3*60000;
function helpOpen(){const h=store?.get('helpOpen');if(!h)return null;return h.seenAt?(Date.now()-h.seenAt<COMING_MS?h:null):(Date.now()-h.at<HELP_MS?h:null);}
const helpText=h=>h?(h.queued?t('helpQueuedShort'):h.seenAt?t('helpComingShort'):t('helpKnownShort')):'';
function helpStateHtml(){const h=helpOpen();return `<p class="help-state" data-help-state ${h?'':'hidden'}>${icon('ready')}<span>${esc(helpText(h))}</span></p>`;}
let helpTimer=0,helpPoll=0;
function updateHelpState(){const h=helpOpen();document.querySelectorAll('[data-help-state]').forEach(el=>{el.hidden=!h;el.querySelector('span').textContent=helpText(h);});
 clearTimeout(helpTimer);if(h)helpTimer=setTimeout(updateHelpState,(h.seenAt?COMING_MS-(Date.now()-h.seenAt):HELP_MS-(Date.now()-h.at))+50);window.dispatchEvent(new Event('resize'));
 clearInterval(helpPoll);if(h&&!h.queued&&!h.seenAt)helpPoll=setInterval(pollHelp,4000);}
async function pollHelp(){const h=helpOpen();if(!h||h.queued||h.seenAt){clearInterval(helpPoll);return;}
 try{const r=await api('/api/v2/child/home');const hp=r.ok&&r.data?.help;if(hp&&hp.seenAt&&hp.seenAt>=hp.createdAt){store.set('helpOpen',{...h,seenAt:Date.now()});announce(t('helpComing'));updateHelpState();}}catch{}}
function setHeader({title,sub}){const h=$('#page-h'),s=$('#page-sub');if(h)h.textContent=title;if(s){s.textContent=sub||'';s.hidden=!sub;}}

// ---------- routes ----------
// ---------- F2 "Скоро заканчиваем": a calm note from the teacher, polled every 5 s, in the page flow (not over the answers) ----------
// One announcement per new notice; a static bar of the time left (redrawn every 30 s); "Тихо" = no motion; hidden behind a break.
let notice=null,noticePendingSay=false,noticeTick=0;
const noticeSeen=()=>store?.get('noticeSeen',[])||[];
function noticeOpen(){return notice&&!noticeSeen().includes(notice.id)?notice:null;}
function noticeSay(){const n=noticeOpen();if(!n)return '';if(Date.now()>n.until)return t('noticeDone');return lang()==='kk'?t('noticeText',{n:n.minutes}):t('noticeText',{m:n.minutes+' '+plural(n.minutes,['минуту','минуты','минут'])});}
function noticeHtml(){const n=noticeOpen();if(!n)return '';const over=Date.now()>n.until,left=Math.max(0,Math.ceil((n.until-Date.now())/60000)),p=over?0:Math.max(0,Math.min(1,(n.until-Date.now())/(n.minutes*60000)));
 return `<div class="notice" data-notice role="status" aria-label="${esc(t('noticeAria'))}"><span class="notice-ico">${icon('clock')}</span><div class="notice-body"><b>${esc(noticeSay())}</b>${over?'':`<span class="notice-bar" aria-hidden="true"><i style="transform:scaleX(${p.toFixed(3)})"></i></span><span class="notice-left tnum">${esc(t('noticeLeft',{n:left}))}</span>`}</div><button type="button" class="quiet-btn" data-notice-ok>${esc(t('noticeOk'))}</button></div>`;}
function drawNotice({fresh=false}={}){const html=noticeHtml();const slot=$('#lesson-host .lesson-stage')||$('#view');document.querySelectorAll('[data-notice]').forEach(e=>e.remove());
 if(html&&slot){slot.insertAdjacentHTML('afterbegin',html);if(fresh)Motion.appear(slot.querySelector('[data-notice]'));}window.dispatchEvent(new Event('resize'));
 clearInterval(noticeTick);if(html)noticeTick=setInterval(()=>drawNotice(),30000);}
async function pollNotice(){if(document.hidden||!store)return;try{const r=await api('/api/v2/child/notice');if(!r.ok)return;const n=r.data?.notice||null;
 const was=noticeOpen()?.id,changed=(n?.id||null)!==(notice?.id||null)||!!(n&&notice&&n.until!==notice.until);notice=n;if(!changed)return;
 drawNotice({fresh:true});if(noticeOpen()&&noticeOpen().id!==was){if(document.querySelector('.break-layer'))noticePendingSay=true;else announce(noticeSay());}}catch{}}
function docMeta(){document.title='Аян · '+t('docTitle');const sk=document.querySelector('a.sr-only[href="#main"]');if(sk)sk.textContent=t('skip');}
function route(){docMeta();
 const r=(location.hash.replace(/^#\/?/,'')||'home').split('?')[0];
 if(lessonInst&&r!=='lesson'){lessonInst.destroy();lessonInst=null;}
 clearMascots();stopAllSound();routeName=r;window.scrollTo(0,0);document.documentElement.classList.toggle('is-focus',r==='lesson');
 if(r==='lesson')return viewLesson();if(r==='play')return viewPlay();if(r==='watch')return viewWatch();if(r==='help')return viewHelp();if(r==='helper')return viewHelper();
 if(r==='settings')return viewSettings();if(r==='achievements')return viewAch();if(r==='free')return viewFree();return viewHome();
}
function focusPage(){($('#page-h')||$('#main'))?.focus({preventScroll:true});}
const WD={ru:['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],kk:['Жс','Дс','Сс','Ср','Бс','Жм','Сб']};
function stopHtml(st){const label=st.kind==='done'?t('stopDone'):st.kind==='now'?t('stopNow'):t('stopNext');
 const dots=st.kind!=='next'&&st.required?`<span class="mini" aria-hidden="true">${Array.from({length:Math.min(st.required,8)},(_,i)=>`<i class="${i<st.embers?'on':''}"></i>`).join('')}</span>`:'';
 return `<li class="stop" data-stop="${st.kind}" data-aid="${esc(st.assignmentId)}"><span class="lamp">${lantern(st.kind==='done')}</span><span><b>${esc(L(st.topic))}</b><span class="st">${esc(label)}${st.followup?' · '+esc(t('fromTeacher')):''}</span>${dots}</span></li>`;}
function daysHtml(days){const wd=WD[lang()]||WD.ru;const d0=new Date();
 return days.map((lit,i)=>{const d=new Date(d0.getTime()-(6-i)*86400000);const name=i===6?t('today2'):wd[d.getDay()];
  return `<li class="day ${lit?'lit':''} ${i===6?'today':''}"><span class="sr-only">${esc(name)}: ${esc(lit?t('dayLit'):t('dayDark'))}</span>${lantern(lit)}<span aria-hidden="true">${esc(name)}</span></li>`;}).join('');}
// Home always shows the server's latest path: rendered at once from memory, then refreshed and redrawn if anything changed.
async function refreshHome(){try{const r=await api('/api/v2/child/home');if(r.ok){const before=JSON.stringify([home.path,home.lights,home.current]);home={...home,...r.data};return before!==JSON.stringify([home.path,home.lights,home.current]);}}catch{}return false;}
// The "Сейчас" card shows where this lesson is on the path: a static row of lanterns (ref-beside.md, plan step 2).
function nowScale(){const p=home.path||[];const k=p.findIndex(s=>s.kind==='now');if(p.length<2||k<0)return '';const cap=t('scaleCap',{n:k+1,m:p.length});
 return `<div class="now-scale" role="img" aria-label="${esc(cap)}">${p.map(s=>`<span class="${s.kind==='now'?'now':''}">${lantern(s.kind==='done')}</span>`).join('')}<span class="cap" aria-hidden="true">${esc(cap)}</span></div>`;}
function viewHome(fresh){
 if(!fresh)refreshHome().then(changed=>{if(changed&&routeName==='home'&&!lessonInst)viewHome(true);});
 const cur=home.current;const last=home.queue[home.queue.length-1];const lt=home.lights||{days:[false,false,false,false,false,false,false],embers:0,litDays:0};
 const topic=cur?L(cur.topic):last?L(last.topic):L({ru:'дроби',kk:'бөлшектер'});
 const i=cur?Math.max(0,STAGE_KEYS.indexOf(cur.stage||'goal')):0;
 const now=cur?`<section class="card soft now-card" aria-labelledby="hero-h"><div style="display:flex;flex-direction:column;min-width:0"><span class="kicker">${esc(t('nowKicker'))}</span><h2 id="hero-h">${esc(L(cur.topic))}</h2>
   <p class="meta tnum">${esc(cur.state==='not_started'?t('lessonMeta',{m:cur.required||5}):t('stepNow',{n:i+1,s:Lesson.stageName(STAGE_KEYS[i])}))}</p>${nowScale()}
   <a class="btn primary push" href="#/lesson" data-continue><span class="face">${esc(cur.state==='not_started'?t('startBtn'):t('continueBtn'))}${icon('next')}</span></a></div><div class="who" data-mascot></div></section>`
  :last?`<section class="card soft now-card" aria-labelledby="hero-h"><div style="display:flex;flex-direction:column;min-width:0"><span class="kicker">${esc(t('nowKicker'))}</span><h2 id="hero-h">${esc(t('allDone'))}</h2><p class="meta">${esc(t('allDoneText'))}</p>
   <a class="btn primary push" href="#/lesson" data-continue><span class="face">${esc(t('review'))}${icon('next')}</span></a></div><div class="who" data-mascot></div></section>`
  :`<section class="card soft now-card" aria-labelledby="hero-h"><div style="display:flex;flex-direction:column;min-width:0"><h2 id="hero-h">${esc(t('noLesson'))}</h2><p class="meta">${esc(t('noLessonText'))}</p><a class="btn primary push" href="#/watch"><span class="face">${esc(t('openVideo'))}${icon('next')}</span></a></div><div class="who" data-mascot></div></section>`;
 const path=(home.path||[]).length?`<section class="card path-card" aria-labelledby="path-h"><h2 id="path-h"><span>${esc(t('pathTitle'))}</span><span class="ember-total" role="img" aria-label="${esc(t('embersAria',{n:lt.embers}))}">${lantern(true)}<span aria-hidden="true">${lt.embers}</span></span></h2><ol class="path">${home.path.map(stopHtml).join('')}</ol></section>`:'';
 const days=`<section class="card days-card" aria-labelledby="days-h"><h2 id="days-h">${esc(t('daysTitle'))}</h2><ol class="days">${daysHtml(lt.days)}</ol><p class="days-note">${esc(t('daysNote',{n:lt.litDays}))} ${esc(lt.today?t('daysTodayLit'):t('daysToday'))}</p></section>`;
 const tiles=`<div class="home-tiles"><section class="card soft tile" aria-labelledby="play-h"><h2 id="play-h">${esc(t('play'))}</h2><p class="sub" style="margin-top:8px">${esc(t('playSub'))}</p><a class="btn" href="#/play">${esc(t('chooseGame'))}</a></section>
  <section class="card sand tile" aria-labelledby="watch-h"><h2 id="watch-h">${esc(t('watch'))}</h2><p class="sub" style="margin-top:8px">${esc(t('watchSub'))}</p><a class="btn" href="#/watch">${esc(t('openVideo'))}</a></section></div>`;
 shell('home',t('hi'),t('today',{t:topic.toLowerCase()}),`<div class="home-grid"><div class="home-col">${now}${days}</div><div class="home-col">${path}${tiles}</div></div>${subjectsHtml()}`);
 document.querySelectorAll('[data-mascot]').forEach(el=>mountMascot(el,'Greeting'));setMascot('Greeting');
 // Lanterns that lit since the last visit get one quiet moment (soft and full); in "Тихо" they are simply lit.
 const seen=new Set(store.get('litSeen',[]));const doneNow=(home.path||[]).filter(s=>s.kind==='done').map(s=>s.assignmentId);
 for(const id of doneNow)if(!seen.has(id)){const lamp=document.querySelector(`[data-aid="${CSS.escape(id)}"] .lamp`);Motion.lightUp(lamp?.querySelector('.flame'),400);Motion.pop(lamp);}
 const todayKey=new Date().toDateString();if(lt.today&&store.get('todaySeen')!==todayKey){const d=document.querySelector('.days .day.today');Motion.lightUp(d?.querySelector('.flame'),400);Motion.pop(d?.querySelector('.lantern-ico'));store.set('todaySeen',todayKey);}
 store.set('litSeen',[...new Set([...seen,...doneNow])]);
 focusPage();
}
// "Менің пәндерім": 8 subjects of grades 5-6 (dist/v2/subjects.js). A subject opens only a lesson the teacher assigned
// (#/lesson?a=<assignment>); a subject with lessons but no assignment says the teacher opens it; the rest are "Скоро".
function subjectLesson(s){const mine=home.queue.filter(q=>s.lessons.includes(q.lessonId));return mine.find(q=>q.state!=='completed')||mine[0]||null;}
function subjectsHtml(){const S=window.AyanSubjects;if(!S)return '';const kk=lang()==='kk';
 const cards=S.SUBJECTS.slice().sort((a,b)=>a.order-b.order).map(s=>{const q=s.status==='available'?subjectLesson(s):null;const state=q?'open':s.status==='available'?'teacher':'soon';
  const st=state==='open'?`${esc(L({ru:'Открыть',kk:'Ашу'}))}${icon('next')}`:state==='teacher'?esc(L({ru:'Откроет учитель',kk:'Мұғалім ашады'})):esc(L({ru:'Скоро',kk:'Жақында'}));
  const inner=`<img src="${esc(s.icon)}" alt="" width="68" height="68" loading="lazy" decoding="async"><span class="subj-txt"><span class="subj-name">${esc(kk?s.name.kk:s.name.ru)}</span><span class="subj-st">${st}</span></span>`;
  return `<li>${q?`<a class="subj" data-subject="${esc(s.id)}" data-state="open" href="#/lesson?a=${encodeURIComponent(q.assignmentId)}">${inner}</a>`:`<div class="subj" role="link" aria-disabled="true" data-subject="${esc(s.id)}" data-state="${state}">${inner}</div>`}</li>`;}).join('');
 return `<section class="card subj-card" data-subjects aria-labelledby="subj-h"><h2 id="subj-h"><span>${esc(L({ru:'Мои предметы',kk:'Менің пәндерім'}))}</span><span class="subj-note">${esc(L({ru:'5-6 класс',kk:'5-6-сынып'}))}</span></h2><ul class="subj-grid">${cards}</ul></section>`;}
async function viewLesson(){
 const wantA=new URLSearchParams(location.hash.split('?')[1]||'').get('a');
 const cur=(wantA&&home.queue.find(q=>q.assignmentId===wantA))||home.current||home.queue[home.queue.length-1];
 if(!cur){document.documentElement.classList.remove('is-focus');shell('home',t('lesson'),'',`<section class="card stack"><h2>${esc(t('noLesson'))}</h2><p>${esc(t('noLessonText'))}</p><a class="btn primary inline" href="#/watch">${esc(t('openVideo'))}</a></section>`);focusPage();return;}
 // Focus mode (like a lesson in Duolingo): no side menu; trail, exit and the calm toggle on top, one task, help and the main button below.
 app.innerHTML=`<div class="focus" id="lesson-host"><main class="lesson-stage" id="main"><p class="muted" role="status">${esc(t('loading'))}</p></main></div>`;
 let data;try{const r=await api('/api/v2/child/lesson?assignment='+encodeURIComponent(cur.assignmentId));if(!r.ok)throw Error();data=r.data;}catch{
  const cached=store.get('lesson.'+cur.assignmentId);if(!cached){$('#main').innerHTML=`<section class="lcard stack"><p>${esc(t('loadFail'))}</p><button class="btn primary inline" data-reload>${esc(t('retry'))}</button></section>`;return;}data=cached;}
 store.set('lesson.'+cur.assignmentId,{...data,attempt:null});
 const left=()=>home.queue.filter(q=>q.state!=='completed'&&q.assignmentId!==cur.assignmentId).length;
 lessonInst=Lesson.mount({host:$('#lesson-host'),assignmentId:cur.assignmentId,lesson:data.lesson,attempt:data.attempt,profile,store,outbox,
  onEvent:logEvent,go:async h=>{if(location.hash!==h){location.hash=h;return;}await refreshHome();route();},setHeader:({title})=>{document.title='Аян · '+title;},setSync,mascot:setMascot,mountMascot:el=>mountMascot(el),sayText,motion:motionOn,canPlaySound,registerMedia:m=>medias.add(m),
  reload:()=>{store.del('att.'+cur.assignmentId);viewLesson();},
  // Phones and "Тихо" start a task in 2D (the 3D scene is framed for wider screens); 3D stays one tap away in "Другой способ".
  preferredView:()=>store.get('pref.view')||(document.documentElement.dataset.motion==='off'||innerWidth<520?'2d':'3d'),
  nextAssignment:()=>home.queue.find(q=>q.assignmentId!==cur.assignmentId&&q.state!=='completed'),
  support:focusSupport,notice:()=>noticeHtml(),demoStrip:home.demo?`<div class="demo-strip"><span>${esc(t('demoShort'))}</span><a href="/demo">${esc(t('switchUser'))}</a></div>`:'',
  topTools:()=>`<div class="top-mini"><button type="button" class="tool" data-lang aria-label="${esc(t('langAria'))}">${icon('globe')}<span class="lbl">${esc(t('langBtn'))}</span></button><button type="button" class="tool" data-calm aria-pressed="${profile.preset==='calm'}" aria-label="${esc(t('calm'))}">${icon('leaf')}<span class="lbl">${esc(t('calm'))}</span></button></div>`,
  embers:()=>home.lights?.embers||0,onEmber:()=>{if(home.lights){home.lights.embers++;if(!home.lights.days[6]){home.lights.days[6]=true;home.lights.today=true;home.lights.litDays++;}}},
  lessonsLeft:left,
  thenChoice:{get:()=>store.get('then.'+cur.assignmentId),set:v=>v?store.set('then.'+cur.assignmentId,v):store.del('then.'+cur.assignmentId)},thenAllowed:()=>profile.preset!=='calm',startBreak:()=>phrase('break')});
 const refresh=async()=>{try{const r=await api('/api/v2/child/home');if(r.ok)home={...home,...r.data};}catch{}};
 window.addEventListener('hashchange',refresh,{once:true});
}
function viewPlay(){
 const fr=home.queue.find(q=>q.lessonId==='math-fractions-01'||q.custom);
 shell('play',t('playTitle'),t('playPage'),`<div class="grid2"><section class="card soft tile" aria-labelledby="fw-h"><h2 id="fw-h">${esc(t('fwCard'))}</h2><p class="sub" style="margin-top:8px;max-width:30ch">${esc(t('fwText'))}</p><div class="art opt-detail">${Fig.fraction({shape:'circle',context:'pizza',parts:[1,1,1,1],selected:[1]},{size:150})}</div>
  <div class="row" style="margin-top:auto">${fr?`<a class="btn primary inline" href="#/lesson" data-topractice>${esc(t('fwGo'))}${icon('next')}</a>`:''}<a class="btn inline" href="#/free">${esc(t('fwFree'))}</a></div></section>
  ${home.demo?'':`<section class="card tile" aria-labelledby="cl-h"><h2 id="cl-h">${esc(t('classic'))}</h2><p class="sub" style="margin-top:8px">${esc(t('classicText'))}</p><a class="btn" href="/child/classic">${esc(t('classicGo'))}</a></section>`}</div>`);
 $('[data-topractice]')?.addEventListener('click',()=>{const k='ayan.v2.child.'+me.id+'.att.'+fr.assignmentId;try{const s=JSON.parse(localStorage.getItem(k)||'{}');if(['goal','explanation','example'].includes(s.stage||'goal')){s.stage='practice';s.ui={...(s.ui||{}),maxStage:'practice'};localStorage.setItem(k,JSON.stringify(s));}}catch{}});
 focusPage();
}
// Free practice: same renderer and the same evaluator, run on the device and clearly marked as not saved.
function viewFree(){
 const L1=window.AyanLessons.byId('math-fractions-01');const tasks=L1.tasks.filter(x=>x.kind==='fraction');freeState.i??=0;const task=tasks[freeState.i%tasks.length];freeState[task.id]??={};
 shell('play',t('freeTitle'),t('freeNote'),`<div class="split"><section class="card task-card"><h2 id="free-h">${esc(L(task.prompt))}</h2><div data-free></div><p data-ffb aria-live="polite"></p></section><aside class="side-panel"><section class="card soft stack"><button type="button" class="btn primary wide" data-fcheck>${esc(t('check'))}</button><button type="button" class="btn wide" data-fnext>${esc(L({ru:'Другое задание',kk:'Басқа тапсырма'}))}${icon('next')}</button></section></aside></div>`);
 const w=FW.mount($('[data-free]'),{task,state:freeState[task.id],onEvent:()=>{},decorative:profile.decorative,initialView:'2d'});
 $('[data-fcheck]').onclick=()=>{const a=w.answer();const fb=$('[data-ffb]');if(!a){fb.innerHTML=`<span class="feedback info">${icon('info')}${esc(L({ru:'Сначала выбери ответ.',kk:'Алдымен жауапты таңда.'}))}</span>`;return;}const r=Core.evaluate(task,a);fb.innerHTML=`<span class="feedback ${r.correct?'ok':'try'}">${icon(r.correct?'check':'repeat')}${esc(Core.feedback(task,r,lang()))}</span>`;};
 $('[data-fnext]').onclick=()=>{w.destroy();freeState.i++;viewFree();};focusPage();
}
let player=null;
function viewWatch(){
 const v=Video.VIDEOS.M01;
 shell('watch',t('watchTitle'),t('watchPageSub'),`<div class="split" style="grid-template-columns:minmax(0,1fr) 308px"><section class="stack" aria-label="${esc(L(v.title))}"><div class="card soft" style="padding:24px 24px 16px"><h2 style="margin-bottom:12px">${esc(L(v.title))}</h2><div data-player></div></div></section>
  <aside class="card stack" aria-labelledby="ch-h"><h2 id="ch-h">${esc(L({ru:'Этапы видео',kk:'Бейне кезеңдері'}))}</h2><ol class="stack" style="list-style:none;margin:0;padding:0;gap:6px" data-chapters>${v.chapters.map((c,i)=>`<li><button type="button" class="btn wide small" data-ch="${i}" style="border-color:transparent;justify-content:flex-start;font-weight:700"><span class="tnum muted">0${i+1}</span> ${esc(L(c.title))}</button></li>`).join('')}</ol>
  <div class="stack" style="margin-top:auto"><a class="btn wide" href="#/lesson" data-model>${icon('cube')}${esc(t('openModel'))}</a><button type="button" class="btn wide" data-text>${icon('text')}${esc(t('lessonText'))}</button></div></aside></div>
  <div class="between"><button type="button" class="btn inline" data-repeat style="min-width:270px">${icon('repeat')}${esc(L({ru:'Повторить фрагмент',kk:'Үзіндіні қайталау'}))}</button><button type="button" class="btn primary inline" data-quiz style="min-width:308px">${esc(t('toQuiz'))}${icon('next')}</button></div><div id="quiz"></div>`);
 player=Video.mount($('[data-player]'),{videoId:'M01',profile,onEvent:logEvent});
 const mark=i=>document.querySelectorAll('[data-ch]').forEach(b=>{const on=Number(b.dataset.ch)===i;b.style.background=on?'var(--primary-soft)':'';b.toggleAttribute('aria-current',on);});
 $('[data-player]').addEventListener('chapter',e=>mark(e.detail));mark(0);
 $('#view').onclick=async e=>{const b=e.target.closest('button,a');if(!b)return;
  if(b.dataset.ch){player.goChapter(Number(b.dataset.ch));mark(Number(b.dataset.ch));}
  if(b.hasAttribute('data-repeat'))player.repeatFragment();
  if(b.hasAttribute('data-model')){const cur=home.current;if(cur){const k='ayan.v2.child.'+me.id+'.att.'+cur.assignmentId;try{const s=JSON.parse(localStorage.getItem(k)||'{}');s.stage=s.stage&&s.stage!=='goal'?s.stage:'explanation';s.ui={...(s.ui||{}),explMode:'model',maxStage:s.ui?.maxStage||'explanation'};if(s.stage==='explanation')localStorage.setItem(k,JSON.stringify(s));}catch{}}}
  if(b.hasAttribute('data-text')){const txt=await Video.transcript('M01');openDialog({title:t('lessonText'),body:`<div class="stack">${txt.split(/\n\n+/).map(p=>`<p>${esc(p)}</p>`).join('')}</div>`,labelClose:t('close')});}
  if(b.hasAttribute('data-quiz'))quiz();};
 focusPage();
}
function quiz(){
 player?.pause();const tasks=[{id:'q1',kind:'fraction',shape:'circle',context:'circle',parts:[1,1,1,1],target:[1,4],modes:['mark'],prompt:{ru:'Отметь одну четверть круга',kk:'Дөңгелектің бір ширегін белгіле'}},
  {id:'q2',kind:'fraction',shape:'circle',context:'circle',parts:[1,1,1,1],target:[1,4],modes:['card'],cards:[{id:'a',shape:'circle',parts:[3,1,2,2],selected:[1]},{id:'b',shape:'circle',parts:[1,1,1,1],selected:[2]}],cardLabels:false,prompt:{ru:'На какой картинке закрашена одна четверть?',kk:'Қай суретте бір ширек боялған?'}},
  {id:'q3',kind:'fraction',shape:'rect',context:'strip',parts:[1,1,1,1],target:[1,4],modes:['mark'],prompt:{ru:'Отметь одну четверть полоски',kk:'Жолақтың бір ширегін белгіле'}}];
 const st=store.get('quiz.M01',{i:0,res:{},sub:{}});const box=$('#quiz');
 function draw(){if(st.i>=tasks.length){box.innerHTML=`<section class="card soft stack"><h2>${esc(t('quizDone'))}</h2><p>${esc(L({ru:'Верно: ',kk:'Дұрыс: '}))}${Object.values(st.res).filter(x=>x==='correct').length} / ${tasks.length}</p><a class="btn primary inline" href="#/lesson">${esc(t('lesson'))}${icon('next')}</a></section>`;box.querySelector('h2').setAttribute('tabindex','-1');box.querySelector('h2').focus();return;}
  const task=tasks[st.i];st[task.id]??={view:task.modes[0]==='card'?'cards':'2d'};
  box.innerHTML=`<section class="card stack" aria-labelledby="qz-h"><p class="muted">${esc(t('quizNote'))}</p><h2 id="qz-h" tabindex="-1">${esc(t('quizTitle'))} · ${st.i+1}/3 · ${esc(L(task.prompt))}</h2><div data-q></div><p data-qfb aria-live="polite"></p><button type="button" class="btn primary inline" data-qcheck>${esc(t('check'))}</button></section>`;
  const w=FW.mount(box.querySelector('[data-q]'),{task,state:st[task.id],onEvent:()=>{},onChange:()=>store.set('quiz.M01',st),decorative:profile.decorative,initialView:st[task.id].view});
  box.querySelector('[data-qcheck]').onclick=async()=>{const a=w.answer();const fb=box.querySelector('[data-qfb]');if(!a){fb.innerHTML=`<span class="feedback info">${icon('info')}${esc(L({ru:'Сначала выбери ответ.',kk:'Алдымен жауапты таңда.'}))}</span>`;return;}
   if(!st.sub[task.id]||st.sub[task.id].a!==a)st.sub[task.id]={id:sid(),a};store.set('quiz.M01',st);
   const r=await outbox.send('quiz:'+st.sub[task.id].id,'/api/v2/child/quiz',{videoId:'M01',version:'0.2.0',taskId:task.id,submissionId:st.sub[task.id].id,answer:a});
   if(!r.sent||!r.r.ok){fb.innerHTML=`<span class="feedback warn">${icon('info')}${esc(L({ru:'Ответ ещё не сохранён. Он остаётся на устройстве.',kk:'Жауап әлі сақталмады. Ол құрылғыда қалады.'}))}</span>`;return;}
   st.res[task.id]=r.r.data.evaluation;store.set('quiz.M01',st);const ok=r.r.data.evaluation==='correct';
   fb.innerHTML=`<span class="feedback ${ok?'ok':'try'}">${icon(ok?'check':'repeat')}${esc(Core.feedback(task,{valid:true,correct:ok,reason:r.r.data.reason},lang()))}</span>${ok?`<button type="button" class="btn primary inline" data-qnext style="margin-top:12px">${esc(L({ru:'Дальше',kk:'Әрі қарай'}))}${icon('next')}</button>`:''}`;
   if(!ok)st.sub[task.id]=null;box.querySelector('[data-qnext]')?.addEventListener('click',()=>{w.destroy();st.i++;store.set('quiz.M01',st);draw();});box.querySelector('[data-qnext]')?.focus();};
  box.querySelector('#qz-h').focus();}
 draw();
}
function viewHelp(){
 const phrases=(profile.phrases||[]);const all=[['repeat','repeat',t('repeat')],['not_understood','question',t('notUnderstood')],['example','example',t('example')],['help','hand',t('needHelp')],['break','pause',t('brk')],['too_loud','quiet',t('tooLoud')]].filter(([id])=>phrases.includes(id)||id==='help'||id==='break');const onBreak=!!store.get('onBreak');
 shell('help',t('helpTitle'),t('helpSub'),`<div class="grid3" role="group" aria-label="${esc(t('helpTitle'))}">${all.map(([id,ic,label])=>`<button type="button" class="card tile" data-phrase="${id}" style="min-height:226px;cursor:pointer;text-align:left;font:inherit;color:inherit;${['help','break'].includes(id)?'background:var(--mint)':''}"><span style="width:72px;height:72px;border-radius:16px;background:var(--mint);display:grid;place-items:center;color:var(--primary)">${icon(ic)}</span><span style="margin-top:auto;font-size:1.5rem;font-weight:800">${esc(label)}</span></button>`).join('')}</div>
  <section class="card soft" aria-labelledby="brk-h"><div class="between"><div><h2 id="brk-h">${esc(t('breakTitle'))}</h2><p class="sub" style="margin-top:12px;font-size:1.25rem">${esc(onBreak?t('breakText'):t('breakAny'))}</p></div><button type="button" class="btn primary inline" data-phrase="ready" style="min-width:338px">${esc(t('ready'))}</button></div></section>
  <p class="status-line" id="help-status" role="status"></p><p><a href="#/helper">${esc(t('helperTitle'))}</a></p>`);
 focusPage();
}
// ---------- communication actions (shared by the bar, the board and the dialog) ----------
async function phrase(id,opener){
 const stage=lessonInst?.stage;logEvent('communication_requested',{phraseId:id,deliveryStatus:id==='help'?'queued':'local'});
 if(id==='repeat'){if(lessonInst)lessonInst.repeat();else{const h=$('#page-h')?.textContent||'';announce(h);toast(h);sayText(h);}return;}
 if(id==='example'){if(lessonInst)lessonInst.showExample();else location.hash='#/lesson';return;}
 if(id==='not_understood'){const d=openDialog({title:t('nuTitle'),labelClose:t('close'),body:`<div class="stack"><p class="muted">${esc(t('nuKept'))}</p><button type="button" class="btn wide" data-nu="other">${icon('example')}${esc(t('nuOther'))}</button><button type="button" class="btn wide" data-nu="steps">${icon('text')}${esc(t('nuSteps'))}</button><button type="button" class="btn primary wide" data-nu="retry">${icon('repeat')}${esc(t('nuRetry'))}</button></div>`});
  d.box.onclick=e=>{const b=e.target.closest('[data-nu]');if(!b)return;const k=b.dataset.nu;d.close();if(k==='other'){if(lessonInst)lessonInst.showExample();else location.hash='#/lesson';}if(k==='steps'){if(lessonInst)lessonInst.explainSteps();else location.hash='#/lesson';}if(k==='retry')setTimeout(()=>lessonInst?.focusTask(),50);};return;}
 if(id==='too_loud'){stopAllSound();await setProfile({sfx:false,music:false,mascotVoice:false,sound:false});const d=openDialog({title:t('tooLoud'),labelClose:t('close'),body:`<div class="stack"><p>${esc(t('loudDone'))}</p><a class="btn primary inline" href="#/settings" data-close>${icon('settings')}${esc(t('openSettings'))}</a></div>`});void d;return;}
 if(id==='break'){breakOpener=opener&&!opener.closest('dialog')?opener:document.activeElement;stopAllSound();store.set('onBreak',{stage,at:Date.now(),route:routeName});logEvent('break_started',{stageId:stage||'none'});lessonInst?.pause();setMascot('Resting');showBreak();return;}
 if(id==='ready'){breather?.stop();breather=null;setMascot('Idle');const b=store.get('onBreak');store.del('onBreak');if(b){logEvent('break_ended',{stageId:b.stage||'none'});lessonInst?.resume();}{const lay=document.querySelector('.break-layer');lay?.remove();if(lay)endBreakFocus();}
  if(b&&b.route==='lesson'&&routeName!=='lesson'||!b&&routeName==='help'&&home.current){location.hash='#/lesson';return;}toast(L({ru:'Продолжаем с того же места.',kk:'Сол жерден жалғастырамыз.'}));return;}
 if(id==='help'){
  // One honest message: "Отправляем…" only if the server is slow (> 1 s), "нет связи" only when sending failed; no dark toast over the answers.
  const say=m=>{const s=$('#help-status');if(s)s.textContent=m;announce(m);};setMascot('Helping');
  if(helpOpen()&&!helpOpen().queued||helpBusy){say(helpOpen()?.seenAt?t('helpComing'):t('helpKnown'));return;}
  helpBusy=true;const requestId=uuid();const body={requestId,phraseId:'help',attemptId:lessonInst?.attemptId,stage};
  const slow=setTimeout(()=>say(t('helpSending')),1000);
  try{const r=await outbox.send('help:'+requestId,'/api/v2/child/help',body);clearTimeout(slow);
   if(r.sent&&r.r.ok){store.set('helpOpen',{at:Date.now()});say(t('delivered'));}
   else{store.set('helpOpen',{at:Date.now(),queued:true});say(r.unauthorized?t('helpSignin'):t('queued'));const onDone=e=>{if(e.detail.op.id==='help:'+requestId&&e.detail.r?.ok){store.set('helpOpen',{at:Date.now()});updateHelpState();say(t('delivered'));window.removeEventListener('ayan:outbox-done',onDone);}};window.addEventListener('ayan:outbox-done',onDone);}}
  finally{clearTimeout(slow);helpBusy=false;updateHelpState();}
  return;}
}
let breather=null,restMascot=null;
let helpBusy=false,breakOpener=null;
// While the break is open the page behind it is inert; afterwards focus goes back to where the child was (a11y В1, У5).
function endBreakFocus(){app.inert=false;if(noticePendingSay){noticePendingSay=false;announce(noticeSay());}const o=breakOpener;breakOpener=null;if(o&&o.isConnected&&!o.closest('.break-layer')&&o.getClientRects().length){o.focus();return;}($('#stage-h')||$('#page-h')||$('#main'))?.focus({preventScroll:true});}
function showBreak(){
 document.querySelector('.break-layer')?.remove();breather?.stop();breather=null;const layer=document.createElement('div');layer.className='break-layer';
 layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','brk-l-h');
 const off=document.documentElement.dataset.motion==='off';
 layer.innerHTML=`<section class="card soft break-card"><h2 id="brk-l-h" tabindex="-1">${esc(t('breakTitle'))}</h2><p class="muted" style="font-size:1.25rem">${esc(t('breakText'))}</p>
  <div class="breath" aria-hidden="true">${Array.from({length:12},(_,i)=>`<span class="dot" style="--i:${i}"></span>`).join('')}<div data-break-mascot data-mascot-slot="break" style="position:absolute;left:50%;top:50%;width:46%;height:46%;margin:-28% 0 0 -23%"></div><span class="word" data-word style="inset:auto 0 12% 0"></span></div>
  <p style="font-size:1.125rem">${esc(t('breathOff'))}</p>
  <div class="break-actions">${off?'':`<button type="button" class="btn inline" data-breathe>${icon('leaf')}${esc(t('breath'))}</button>`}<button type="button" class="btn primary push" data-phrase="ready"><span class="face">${esc(t('ready'))}</span></button></div></section>`;
 document.body.append(layer);app.inert=true;restMascot=mountMascot(layer.querySelector('[data-break-mascot]'),'Resting');layer.querySelector('h2').focus();
 layer.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const f=[...layer.querySelectorAll('button')];const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?f.length-1:1))%f.length]?.focus();});
}
function toggleBreath(b){const layer=b.closest('.break-layer');
 if(!breather){const c=Motion.breathe([...layer.querySelectorAll('.dot')],layer.querySelector('[data-word]'),{labels:[t('inhale'),t('exhale')],onEnd:()=>{breather=null;b.innerHTML=icon('repeat')+esc(t('breathAgain'));}});
  // Аян breathes on the same clock: pause, resume and stop are shared with the circle of lights
  const m=restMascot?.breathe({cycles:3});breather=m?{pause(){c.pause();m.pause();},resume(){c.resume();m.resume();},stop(){c.stop();m.stop();},get paused(){return c.paused;}}:c;
  b.innerHTML=icon('pause')+esc(t('breathPause'));return;}
 if(breather.paused){breather.resume();b.innerHTML=icon('pause')+esc(t('breathPause'));}else{breather.pause();b.innerHTML=icon('leaf')+esc(t('breathResume'));}}
function board(){const items=[['repeat','repeat'],['not_understood','question'],['example','example'],['help','hand'],['break','pause'],['too_loud','quiet'],['ready','ready']].filter(([id])=>(profile.phrases||[]).includes(id)||id==='help'||id==='break');
 const label={repeat:t('repeat'),not_understood:t('notUnderstood'),example:t('example'),help:t('needHelp'),break:t('brk'),too_loud:t('tooLoud'),ready:t('ready')};
 const d=openDialog({title:t('boardMore'),labelClose:t('close'),body:`<div class="grid2" style="gap:12px">${items.map(([id,ic])=>`<button type="button" class="btn wide" data-bp="${id}" style="min-height:72px;font-size:1.125rem">${icon(ic)}${esc(label[id])}</button>`).join('')}</div>`});
 d.box.onclick=e=>{const b=e.target.closest('[data-bp]');if(!b)return;d.close();setTimeout(()=>phrase(b.dataset.bp),30);};}
function seg(key,options,cur){return `<div class="seg" role="radiogroup" aria-label="${esc(t(key))}">`+options.map(([v,l])=>`<button type="button" class="switch" role="radio" aria-checked="${String(cur)===String(v)}" tabindex="${String(cur)===String(v)||!options.some(([x])=>String(x)===String(cur))&&v===options[0][0]?0:-1}" data-set="${key}" data-val="${esc(JSON.stringify(v))}" style="min-width:0"><span class="dot" aria-hidden="true"></span>${esc(l)}</button>`).join('')+'</div>';}
function motionNow(){const p=profile;if(document.documentElement.dataset.motion!=='off'||p.motionIntensity==='low')return '';const why=reducedMotion()?t('whyReduce'):p.preset==='calm'?t('whyCalm'):p.decorative===false?t('whyDeco'):'';return `<p class="status-line" data-motion-now style="margin-top:10px">${esc(t('motionNow',{why}))}</p>`;}
function viewSettings(){
 const p=profile,calm=p.preset==='calm';
 const card=(key,title,control)=>`<section class="card" aria-labelledby="s-${key}"><h2 id="s-${key}" style="margin-bottom:16px">${esc(title)}</h2>${control}</section>`;
 shell('settings',t('sTitle'),t('sSub'),`<section class="card soft between" aria-labelledby="preset-h" style="min-height:138px"><div><h2 id="preset-h">${esc(calm?t('calmOn'):t('stdOn'))}</h2><p class="sub" style="margin-top:8px">${esc(calm?t('calmText'):t('stdText'))}</p></div><button type="button" class="btn primary inline" data-preset style="min-width:270px">${esc(t('change'))}</button></section>
  <div class="grid2">${card('sound',t('soundLessons'),seg('sound',[[true,t('on')],[false,t('off')]],p.sound!==false)+`<p class="muted" style="margin-top:10px">${esc(t('soundNote'))}</p>`)}${card('sfx',t('sfx'),seg('sfx',[[false,t('off')],[true,t('on')]],p.sfx))}${card('music',t('music'),seg('music',[[false,t('offS')],[true,t('onS')]],p.music)+`<p class="muted" style="margin-top:10px">${esc(L({ru:'Музыки в уроках пока нет; выбор сохранится.',kk:'Сабақтарда әзірге музыка жоқ; таңдау сақталады.'}))}</p>`)}
  ${card('motionIntensity',t('motion'),seg('motionIntensity',[['low',t('mQuiet')],['soft',t('mSoft')],['normal',t('mFull')]],p.motionIntensity)+motionNow()+`<p class="muted" style="margin-top:10px">${esc(t('motionNote'))}</p>`)}${card('mascotVoice',t('mascot'),seg('mascotVoice',[[false,t('noVoice')],[true,t('withVoice')]],p.mascotVoice)+`<p style="margin-top:10px"><a href="#/helper">${esc(t('helperTitle'))}</a></p>`)}
  ${card('textSize',t('textSize'),seg('textSize',[['normal',t('tNormal')],['large',t('tLarge')],['xlarge',t('tXl')]],p.textSize))}${card('captions',t('captions'),seg('captions',[[true,t('on')],[false,t('off')]],p.captions))}
  ${card('decorative',t('decorative'),seg('decorative',[[true,t('on')],[false,t('off')]],p.decorative))}${card('saturation',t('saturation'),seg('saturation',[['standard',t('std')],['calm',t('calmSat')]],p.saturation))}
  ${card('complexity',t('complexity'),seg('complexity',[['standard',t('standard')],['simplified',t('simple')]],p.complexity))}${card('voiceRate',t('voiceRate'),seg('voiceRate',[[0.75,'0,75×'],[1,'1×'],[1.25,'1,25×']],p.voiceRate))}
  ${card('timers',t('timers'),seg('timers',[['hidden',t('hidden')],['shown',t('shown')]],p.timers)+`<p class="muted" style="margin-top:10px">${esc(L({ru:'Обязательных таймеров в уроках нет.',kk:'Сабақтарда міндетті таймер жоқ.'}))}</p>`)}${card('autoplay',t('autoplay'),seg('autoplay',[[false,t('off')],[true,t('on')]],p.autoplay)+`<p class="muted" style="margin-top:10px">${esc(L({ru:'Даже при включении видео стартует только по кнопке в этой версии.',kk:'Қосылса да, бұл нұсқада бейне тек түймемен басталады.'}))}</p>`)}</div>
  <section class="card" aria-labelledby="auto-h"><h2 id="auto-h">${esc(p.autoplay?t('autoplay'):t('autoOff'))}</h2><p class="sub" style="margin-top:8px">${esc(reducedMotion()?t('reduceOn'):t('autoNote'))}</p><div class="row" style="margin-top:16px"><button type="button" class="btn inline" data-resetpreset>${icon('refresh')}${esc(t('resetPreset'))}</button><span class="status-line" id="s-status" role="status"></span></div></section>`);
 focusPage();
}
function viewHelper(){
 const p=profile;
 shell('help',t('helperTitle'),t('helperSub'),`<div class="grid2" style="grid-template-columns:minmax(0,550px) minmax(0,1fr)"><section class="card soft stack" aria-labelledby="meet-h" style="min-height:600px"><div><h2 id="meet-h">${esc(t('meet'))}</h2><p class="sub" style="margin-top:8px">${esc(t('meetSub'))}</p></div><div data-mascot style="flex:1;min-height:380px"></div>
  <div class="seg" role="group" aria-label="${esc(t('states'))}">${Mascot.STATES.map(s=>`<button type="button" class="chip" data-mstate="${s}" aria-pressed="${s==='Idle'}">${esc(t('st_'+s))}</button>`).join('')}</div></section>
  <section class="card stack" aria-labelledby="like-h"><h2 id="like-h">${esc(t('helpLike'))}</h2><p style="font-size:1.25rem;margin-top:12px">${esc(t('helpLine1'))}</p><p style="font-size:1.25rem" class="muted">${esc(t('helpLine2'))}</p><p style="font-size:1.25rem" class="muted">${esc(t('helpLine3'))}</p>
  <div class="stack" style="margin-top:16px;gap:20px">
   <div class="toggle"><span>${esc(t('showHelper'))}</span>${seg('mascotVisible',[[true,t('yes')],[false,t('no')]],p.mascotVisible!==false)}</div>
   <div class="toggle"><span>${esc(t('voice'))}</span>${seg('mascotVoice',[[false,t('off')],[true,t('on')]],p.mascotVoice)}</div>
   <div class="toggle"><span>${esc(t('motion'))}</span>${seg('mascotMotion',[['minimal',t('min')],['normal',t('normal')]],p.mascotMotion)}</div>
   <div class="toggle"><span>${esc(t('hintsMode'))}</span>${seg('hints',[['on_request',t('onRequest')],['offer',t('offer')]],p.hints)}</div>
   <div class="toggle"><span>${esc(t('textOnly'))}</span>${seg('textOnly',[[false,t('no')],[true,t('yes')]],p.textOnly)}</div></div></section></div>
  <section class="card" aria-labelledby="states-h"><h2 id="states-h">${esc(t('states'))}</h2><p class="sub" style="margin-top:8px">${esc(t('stateNames'))}</p></section>`);
 const el=$('[data-mascot]');let m=mountMascot(el,'Idle');
 $('#view').addEventListener('click',e=>{const b=e.target.closest('[data-mstate]');if(!b)return;document.querySelectorAll('[data-mstate]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));m?.set(b.dataset.mstate);});
 focusPage();
}
function viewAch(){
 const done=home.queue.filter(q=>q.state==='completed');
 shell('ach',t('achTitle'),t('achSub'),done.length?`<ul class="rows">${done.map(q=>`<li class="rowline" style="grid-template-columns:auto 1fr auto;background:var(--surface);border:1px solid var(--border)"><span style="color:var(--primary)">${icon('star')}</span><b>${esc(L(q.topic))}</b><span class="badge">${esc(t('achDone'))}</span></li>`).join('')}</ul>`:`<section class="card"><p>${esc(t('achNone'))}</p><a class="btn primary inline" href="#/home" style="margin-top:16px">${esc(t('home'))}</a></section>`);
 focusPage();
}
function firstVisit(){
 const prev=(kind)=>`<div aria-hidden="true" style="border:1px solid var(--border);border-radius:16px;padding:14px;background:${kind==='calm'?'#F3F6F4':'#FAFCFB'};display:grid;grid-template-columns:1fr 70px;gap:10px;align-items:center"><div class="stack" style="gap:8px"><span style="height:12px;border-radius:6px;background:#C9D6D0;width:80%"></span><span style="height:10px;border-radius:5px;background:#DFE7E2;width:60%"></span><span style="height:30px;border-radius:10px;background:#0F766E;width:55%"></span></div><div style="filter:${kind==='calm'?'saturate(.6)':'none'}">${Fig.fraction({shape:'circle',context:kind==='calm'?'circle':'pizza',parts:[1,1,1,1],selected:[1]},{size:70,plain:kind==='calm'})}</div></div>`;
 app.innerHTML=`${home.demo?`<div class="demo-strip"><span>${esc(t('demoShort'))}</span><a href="/demo">${esc(t('switchUser'))}</a></div>`:''}<main class="main" id="main"><div class="page" style="max-width:960px;margin:0 auto"><div class="top"><div><h1 id="page-h" tabindex="-1">${esc(t('firstTitle'))}</h1><p class="sub">${esc(t('firstSub'))}</p></div><div class="top-tools"><button type="button" class="tool" data-lang aria-label="${esc(t('langAria'))}">${icon('globe')}${esc(t('langBtn'))}</button></div></div>
  <div class="grid2">${[['standard',t('pickStd'),t('pickStdText')],['calm',t('pickCalm'),t('pickCalmText')]].map(([k,h,p])=>`<section class="card stack" aria-labelledby="pk-${k}"><h2 id="pk-${k}">${esc(h)}</h2><p class="muted">${esc(p)}</p>${prev(k)}<button type="button" class="btn ${k==='calm'?'':'primary'} wide" data-pick="${k}" style="margin-top:auto">${esc(t('choose'))}: ${esc(h)}</button></section>`).join('')}</div><p class="muted">${esc(t('bothNote'))}</p></div></main>`;
 focusPage();
}

// ---------- global clicks ----------
document.addEventListener('click',async e=>{
 const b=e.target.closest('button,a');if(!b)return;
 if(b.hasAttribute('data-notice-ok')){const n=noticeOpen();if(n)store.set('noticeSeen',[...noticeSeen(),n.id].slice(-20));drawNotice();($('#stage-h')||$('#page-h'))?.focus({preventScroll:true});return;}
 if(b.dataset.menu!==undefined){const n=$('#nav');const open=!n.classList.contains('open');n.classList.toggle('open',open);b.setAttribute('aria-expanded',String(open));return;}
 if(b.closest('#nav')){$('#nav').classList.remove('open');$('[data-menu]')?.setAttribute('aria-expanded','false');}
 if(b.hasAttribute('data-lang')){const l=lang()==='kk'?'ru':'kk';setLang(l);await setProfile({lang:l});if(!profile.preset)firstVisit();else route();setTimeout(()=>$('[data-lang]')?.focus(),0);return;}
 if(b.hasAttribute('data-calm')){const next=profile.preset==='calm'?'standard':'calm';await setProfile({preset:next},{applyPreset:true});if(lessonInst){b.setAttribute('aria-pressed',String(next==='calm'));lessonInst.rerender();}else route();setTimeout(()=>$('[data-calm]')?.focus(),0);announce(next==='calm'?t('calmOn'):t('stdOn'));return;}
 if(b.dataset.pick){await setProfile({preset:b.dataset.pick},{applyPreset:true});route();return;}
 if(b.dataset.phrase){phrase(b.dataset.phrase,b);return;}
 if(b.hasAttribute('data-board')){board();return;}
 if(b.hasAttribute('data-breathe')){toggleBreath(b);return;}
 if(b.hasAttribute('data-reload')){route();return;}
 if(b.hasAttribute('data-preset')){const next=profile.preset==='calm'?'standard':'calm';await setProfile({preset:next},{applyPreset:true});viewSettings();$('[data-preset]')?.focus();return;}
 if(b.hasAttribute('data-resetpreset')){const st=await setProfile({preset:profile.preset||'standard'},{applyPreset:true});viewSettings();const s=$('#s-status');if(s)s.textContent=st==='server'?t('saved'):t('savedLocal');$('[data-resetpreset]')?.focus();return;}
 if(b.dataset.set){const key=b.dataset.set,val=JSON.parse(b.dataset.val);const st=await setProfile({[key]:val});const keepFocus=`[data-set="${key}"][data-val='${b.dataset.val}']`;
  if(routeName==='settings')viewSettings();else if(routeName==='helper')viewHelper();const nb=document.querySelector(keepFocus);nb?.focus();
  const s=$('#s-status');if(s)s.textContent=st==='server'?t('saved'):t('savedLocal');announce(st==='server'?t('saved'):t('savedLocal'));return;}
});
document.addEventListener('keydown',e=>{const r=e.target.closest?.('[role=radiogroup] [role=radio]');if(r&&/^Arrow(Left|Right|Up|Down)$/.test(e.key)){e.preventDefault();const all=[...r.closest('[role=radiogroup]').querySelectorAll('[role=radio]')];const n=all[(all.indexOf(r)+(/Right|Down/.test(e.key)?1:all.length-1))%all.length];n.click();return;}
 if(e.key==='Escape'){const n=$('#nav');if(n?.classList.contains('open')){n.classList.remove('open');$('[data-menu]')?.focus();}}});
window.addEventListener('pagehide',()=>{flushEvents();});
if(sessionStorage.getItem('ayan.v2.lastUser')&&sessionStorage.getItem('ayan.v2.lastUser')!==location.pathname){}
boot().then(()=>{const b=store?.get('onBreak');if(b)showBreak();if(store)updateHelpState();});
