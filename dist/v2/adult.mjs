// Teacher / admin workspace (V2.1). Routes: #/students #/assign #/reports #/report #/profiles #/editor #/library #/pilot #/admin.
// Hidden buttons are not access control: every action is re-checked on the server (role, organisation, ownership, plan).
import {esc,icon,MARK,L,lang,setLang,makeT,api,sid,announce,toast,openDialog,$,reducedMotion} from './ui.mjs';
import * as Motion from './motion.mjs';
import * as FW from './fraction-world.mjs';
import * as Fig from './figures.mjs';
import * as Video from './video.mjs';
const Core=window.AyanCore;
const t=makeT({
 now:['Класс сейчас','Сынып қазір'],nowTitle:['Кому сейчас нужна помощь?','Қазір кімге көмек керек?'],nowSub:['Карточки обновляются сами каждые 3 секунды. Новая просьба мягко подсвечивается.','Карточкалар әр 3 секунд сайын өзі жаңарады. Жаңа өтініш жұмсақ белгіленеді.'],
 s_help:['Просит помощь','Көмек сұрап тұр'],s_break:['На перерыве','Үзілісте'],s_working:['Занимается','Сабақта'],s_idle:['Давно без действий','Көптен бері әрекетсіз'],s_waiting:['Ещё не начал','Әлі бастаған жоқ'],s_done:['Урок пройден','Сабақ өтілді'],s_none:['Нет урока','Сабақ жоқ'],
 p_step:['Шаг {n} из 5','5 қадамның {n}-і'],p_task:['задание {n} из {m}','{m} тапсырманың {n}-і'],p_struggle:['Две попытки без успеха на этом задании','Осы тапсырмада екі әрекет сәтсіз болды'],p_hints:['Подсказок на задании: {n}','Тапсырмадағы кеңес: {n}'],
 p_ackGo:['Видел, иду','Көрдім, барамын'],p_ackSeen:['Видел','Көрдім'],p_just:['только что','жаңа ғана'],p_min:['{n} мин назад','{n} мин бұрын'],p_hour:['больше часа назад','бір сағаттан астам бұрын'],
 p_coming:['Вы идёте к ученику · отмечено в {t}','Оқушыға бара жатырсыз · {t} белгіленді'],p_ackDone:['Отмечено: вы идёте к «{n}».','Белгіленді: «{n}» жанына бара жатырсыз.'],
 p_next:['Дальше: {t}','Келесі: {t}'],p_recDone:['Назначено: {n} увидит новый пример следующим.','Тағайындалды: {n} жаңа мысалды келесі болып көреді.'],
 p_lostH:['Связь с кабинетом потеряна.','Кабинетпен байланыс үзілді.'],p_lost:['Сессия закончилась, карточки больше не обновляются. Войдите снова.','Сессия аяқталды, карточкалар енді жаңармайды. Қайта кіріңіз.'],relogin:['Войти снова','Қайта кіру'],
 p_offline:['Нет связи, пробуем ещё раз…','Байланыс жоқ, қайта байқап жатырмыз…'],noSession:['Сессия закончилась. Войдите как учитель, чтобы продолжить.','Сессия аяқталды. Жалғастыру үшін мұғалім ретінде кіріңіз.'],
 fqNote:['Выберите готовый пример. {n} увидит его следующим в своём списке.','Дайын мысалды таңдаңыз. {n} оны тізімінде келесі болып көреді.'],fqPick:['Готовые примеры','Дайын мысалдар'],fqAssign:['Назначить','Тағайындау'],fqCustom:['Настроить','Баптау'],
 fqDone:['Назначено: {n} увидит новый пример следующим.','Тағайындалды: {n} жаңа мысалды келесі болып көреді.'],
 ppOpen:['Паспорт поддержки','Қолдау паспорты'],ppTitle:['Паспорт поддержки','Қолдау паспорты'],ppTitleN:['Паспорт поддержки: {n}','Қолдау паспорты: {n}'],ppKicker:['Паспорт поддержки','Қолдау паспорты'],
 ppFor:['Как работать с учеником завтра: для ассистента, учителя на замену и родителя.','Ертең оқушымен қалай жұмыс істеу керек: ассистентке, алмастырушы мұғалімге және ата-анаға.'],ppLesson:['Последний урок: {t}.','Соңғы сабақ: {t}.'],
 ppHelps:['Что помогает','Не көмектеседі'],ppHelpsNone:['Пока мало уроков: наблюдения появятся после первого урока.','Сабақ әзірге аз: бақылаулар алғашқы сабақтан кейін пайда болады.'],ppModes:['Выбранный способ объяснения: {m}','Таңдаған түсіндіру тәсілі: {m}'],ppView:['Удобный вид задания: {v}','Тапсырманың ыңғайлы түрі: {v}'],
 ppHow:['Как подавать','Қалай ұсыну керек'],ppCalm:['Спокойный режим: меньше движения и украшений','Тыныш режим: қозғалыс пен безендіру аз'],ppMotionLow:['Движение: тихо','Қозғалыс: тыныш'],ppNoSound:['Без звука','Дыбыссыз'],ppBigText:['Крупный текст','Ірі мәтін'],ppTextOnly:['Только текст, без картинок-украшений','Тек мәтін, безендіру суреттерсіз'],
 ppSlow:['Спокойный темп, не торопить','Баяу қарқын, асықтырмау'],ppRepeatInstr:['Повторять инструкцию','Нұсқауды қайталау'],ppButtons:['Ответ кнопками','Жауап түймелермен'],ppDrag:['Ответ перетаскиванием','Жауап сүйреп апару арқылы'],ppHintAsk:['Подсказки по просьбе ученика','Кеңес оқушы сұрағанда'],ppHintOffer:['Подсказку предлагать самим','Кеңесті өзіміз ұсынамыз'],
 ppAsk:['Как просит помощь','Көмекті қалай сұрайды'],ppTimes:['«{p}»: {n} раз','«{p}»: {n} рет'],ppBreaks:['Перерыв в уроке: {n} раз','Сабақтағы үзіліс: {n} рет'],ppNoFault:['Перерыв и просьба о помощи - не ошибка, прогресс сохраняется.','Үзіліс пен көмек сұрау - қате емес, прогресс сақталады.'],
 ppRepeat:['Что повторить','Нені қайталау керек'],ppNotes:['Заметки учителя','Мұғалім жазбалары'],ppPrint:['Печать или PDF','Басып шығару немесе PDF'],ppBack:['Назад к отчёту','Есепке оралу'],
 ppFoot:['{d}. Наблюдение по урокам Аяна, не диагноз. Собрано из событий уроков и профиля поддержки.','{d}. Аян сабақтары бойынша бақылау, диагноз емес. Сабақ оқиғалары мен қолдау профилінен жиналды.'],ppDemo:['Синтетические демо-данные, не результаты реального ребёнка.','Синтетикалық демо-деректер, нақты баланың нәтижесі емес.'],
 ciTitle:['Что работает в классе','Сыныпта не жұмыс істейді'],ciEmpty:['Пока мало данных: нужен хотя бы один законченный урок.','Деректер әзірге аз: кемінде бір аяқталған сабақ керек.'],
 ciVisual:['Визуальная подсказка помогла: {x} из {n}','Көрнекі кеңес көмектесті: {n} оқушының {x}-іне'],ciTwin:['После подсказки новый пример решили сами: {x} из {n}','Кеңестен кейін жаңа мысалды өздері шешті: {n} оқушының {x}-і'],
 ciMode:['Чаще выбирают объяснение: {m} ({x} из {n})','Жиі таңдайтын түсіндіру: {m} ({n} оқушының {x}-і)'],ciBreak:['После перерыва закончили урок: {x}','Үзілістен кейін сабақты аяқтады: {x}'],
 ciBasis:['Основание:','Негізі:'],ciNote:['Наблюдение по {n} ученикам, не статистика.','{n} оқушы бойынша бақылау, статистика емес.'],
 consentLbl:['Есть согласие родителей (законных представителей) на обработку данных ребёнка.','Баланың деректерін өңдеуге ата-ананың (заңды өкілдердің) келісімі бар.'],consentLink:['Форма согласия','Келісім нысаны'],consentErr:['Отметьте согласие родителей (законных представителей): без него ученика добавить нельзя.','Ата-ананың (заңды өкілдердің) келісімін белгілеңіз: онсыз оқушыны қосуға болмайды.'],
 nbTitle:['Предупредить класс: скоро заканчиваем','Сыныпқа ескерту: жақында аяқтаймыз'],nbMin:['{n} мин','{n} мин'],nbSent:['Отправлено {n} ученикам, до {t}','{n} оқушыға жіберілді, {t} дейін'],nbCancel:['Отменить','Болдырмау'],nbCancelled:['Предупреждение отменено','Ескерту болдырылмады'],
 p_live:['Обновлено в {t}','Жаңартылды: {t}'],p_cHelp:['Просят помощь','Көмек сұрайды'],p_cBreak:['На перерыве','Үзілісте'],p_cWork:['Занимаются','Сабақта'],p_cDone:['Закончили','Аяқтады'],
 p_noLesson:['Урок не назначен','Сабақ тағайындалмаған'],p_annHelp:['{n}: просит помощь','{n}: көмек сұрап тұр'],p_annBreak:['{n}: на перерыве','{n}: үзілісте'],p_rec:['Следующий шаг для класса','Сынып үшін келесі қадам'],
 p_open:['Отчёт','Есеп'],p_score:['Решено: {n} из {m}','Шешілді: {m} ішінен {n}'],p_assign:['Назначить урок','Сабақ тағайындау'],p_none:['В классе пока нет учеников.','Сыныпта әзірге оқушы жоқ.'],p_follow:['от учителя','мұғалімнен'],
 ai_title:['Черновик урока за минуту','Сабақтың жобасы бір минутта'],ai_sub:['Тема -> пять шагов на казахском и русском. Черновик не уходит детям, пока вы его не проверите.','Тақырып -> қазақша және орысша бес қадам. Жобаны тексермейінше, ол балаларға жіберілмейді.'],
 ai_topic:['Тема урока','Сабақ тақырыбы'],ai_go:['Собрать черновик','Жоба құрастыру'],ai_template:['Черновик из готовой заготовки (без сети). Проверьте перед публикацией.','Дайын үлгіден алынған жоба (желісіз). Жарияламас бұрын тексеріңіз.'],
 ai_llm:['Черновик от ИИ. Проверьте каждое предложение перед публикацией.','ЖИ жасаған жоба. Жарияламас бұрын әр сөйлемді тексеріңіз.'],ai_none:['Без сети доступны заготовки: {list}. Для другой темы нужен подключённый ИИ-провайдер.','Желісіз мына үлгілер бар: {list}. Басқа тақырыпқа ЖИ провайдері қосылуы керек.'],
 ai_tasks:['Идеи заданий','Тапсырма идеялары'],ai_editor:['Перенести в конструктор','Конструкторға көшіру'],ai_hint:['Например: доли, растения, алгоритм','Мысалы: үлестер, өсімдіктер, алгоритм'],
 brandSub:['учимся по-своему','өз қарқынымызбен'],students:['Мои ученики','Менің оқушыларым'],assign:['Назначить урок','Сабақ тағайындау'],reports:['Отчёты','Есептер'],profiles:['Профили поддержки','Қолдау профильдері'],
 editor:['Редактор уроков','Сабақ редакторы'],library:['Библиотека','Кітапхана'],pilot:['Тестовый пилот','Тест пилоты'],admin:['Организация','Ұйым'],classic:['Прежний кабинет','Бұрынғы кабинет'],logout:['Выйти','Шығу'],menu:['Меню','Мәзір'],
 note:['Только назначенным взрослым','Тек тағайындалған ересектерге'],noteText:['Данные учеников видит только их учитель.','Оқушы деректерін тек олардың мұғалімі көреді.'],
 demo:['Демо-режим: синтетические данные, не результаты реальных детей.','Демо-режим: синтетикалық деректер, нақты балалардың нәтижесі емес.'],switchUser:['Сменить демо-аккаунт','Демо-аккаунтты ауыстыру'],
 planFree:['План: демо','Жоспар: демо'],planPilot:['План: школьный пилот (тест)','Жоспар: мектеп пилоты (тест)'],
 stTitle:['Мои ученики','Менің оқушыларым'],stSub:['Ученик · последний этап · результат · поддержка','Оқушы · соңғы кезең · нәтиже · қолдау'],add:['Добавить ученика','Оқушы қосу'],name:['Имя или метка ученика','Оқушының аты немесе белгісі'],nameHint:['Можно без фамилии: «Ученик 4».','Тегісіз болады: «4-оқушы».'],create:['Создать','Жасау'],
 invite:['Код входа','Кіру коды'],inviteText:['Код действует сутки. Передайте его ученику: он вводит код на странице входа.','Код бір тәулік жарамды. Оны оқушыға беріңіз: ол кіру бетінде кодты енгізеді.'],parentLink:['Ссылка для родителя','Ата-анаға сілтеме'],parentText:['Родитель увидит только отчёт этого ребёнка. Старая ссылка перестанет работать.','Ата-ана тек осы баланың есебін көреді. Ескі сілтеме жұмысын тоқтатады.'],
 revoke:['Закрыть доступ','Қолжетімділікті жабу'],revokeQ:['Закрыть доступ ученика «{n}»? Сессии и ссылки перестанут работать, история обучения сохранится.','«{n}» оқушысының қолжетімділігін жабу керек пе? Сессиялар мен сілтемелер жұмысын тоқтатады, оқу тарихы сақталады.'],confirm:['Подтвердить','Растау'],cancel:['Отмена','Болдырмау'],
 report:['Отчёт','Есеп'],profile:['Профиль','Профиль'],noStudents:['Пока нет учеников','Әзірге оқушы жоқ'],noStudentsText:['Добавьте ученика и назначьте ему урок.','Оқушы қосып, оған сабақ тағайындаңыз.'],
 helpReq:['Запросы помощи','Көмек сұраулары'],helpNone:['Новых запросов нет.','Жаңа сұрау жоқ.'],seen:['Просмотрено','Қаралды'],markSeen:['Отметить просмотренным','Қаралды деп белгілеу'],helpNote:['Запрос помощи - не ошибка и не снижает результат.','Көмек сұрау - қате емес және нәтижені төмендетпейді.'],
 asTitle:['Назначить урок','Сабақ тағайындау'],asSub:['Шесть уроков RU/KK. Цели и класс - предложения, требуют проверки по программе.','RU/KK алты сабақ. Мақсаттар мен сынып - ұсыныс, бағдарлама бойынша тексеруді қажет етеді.'],
 grade:['Класс (предложение): {g}','Сынып (ұсыныс): {g}'],pending:['Требует проверки педагогом','Педагог тексеруін қажет етеді'],locked:['Доступно в тарифе Макс или Школа','Макс немесе Мектеп тарифінде қолжетімді'],tasks:['Заданий: {n}','Тапсырма: {n}'],hasVideo:['видео','бейне'],hasAudio:['озвучка','дыбыс'],
 choose:['Назначить','Тағайындау'],whom:['Кому назначить','Кімге тағайындау'],groupNote:['Несколько учеников сразу - в тарифе Макс или Школа. Сервер проверит тариф.','Бірнеше оқушыға бірден - Макс немесе Мектеп тарифінде. Сервер тарифті тексереді.'],
 assigned:['Назначено: {n}','Тағайындалды: {n}'],replay:['Это назначение уже было создано - повтор не создал дубль.','Бұл тағайындау бұрын жасалған - қайталау көшірме жасамады.'],
 subjects_math:['Математика','Математика'],subjects_bio:['Биология','Биология'],subjects_cs:['Информатика','Информатика'],
 repTitle:['Что получилось на уроке?','Сабақта не шықты?'],repSub:['Демо-класс · только синтетические данные','Демо-сынып · тек синтетикалық деректер'],repSubReal:['Ваши ученики · последние попытки','Сіздің оқушыларыңыз · соңғы әрекеттер'],
 finished:['Завершили','Аяқтады'],finishedCap:['Уникальные попытки','Бірегей әрекеттер'],correct:['Верные ответы','Дұрыс жауаптар'],correctCap:['{n} · первая попытка','{n} · бірінші әрекет'],hints:['Подсказки','Кеңестер'],hintsCap:['Отдельно от оценок','Бағадан бөлек'],
 obsTitle:['Наблюдение по занятию','Сабақ бойынша бақылау'],obsNone:['Наблюдения появятся после первой попытки ученика.','Бақылаулар оқушының бірінші әрекетінен кейін пайда болады.'],
 eventsDiff:['События различаются','Оқиғалар ажыратылады'],eventsList:['Верный ответ · помощь · перерыв · техническая ошибка · ответ после подсказки','Дұрыс жауап · көмек · үзіліс · техникалық қате · кеңестен кейінгі жауап'],openReport:['Открыть отчёт ученика','Оқушы есебін ашу'],
 inWork:['В работе','Орындалуда'],paused:['Перерыв','Үзіліс'],done:['Завершено','Аяқталды'],notStarted:['Не начато','Басталмаған'],noReq:['Нет запросов','Сұрау жоқ'],nHints:['{n} подсказки','{n} кеңес'],nHelp:['Просит помощь','Көмек сұрайды'],
 rTitle:['Отчёт · {n}','Есеп · {n}'],rDemo:['Демонстрационные данные','Демонстрациялық деректер'],rTopic:['Тема: {t} · версия {v}','Тақырып: {t} · {v} нұсқа'],rState:['Состояние: {s} · последний этап: {e}','Күйі: {s} · соңғы кезең: {e}'],
 rSolved:['Решено правильно','Дұрыс шешілді'],rFirst:['С первой попытки','Бірінші әрекеттен'],rHints:['Использовано подсказок','Пайдаланылған кеңес'],rBreaks:['Перерывы','Үзілістер'],rHelp:['Запросы помощи','Көмек сұраулары'],rTech:['Технические ошибки','Техникалық қателер'],
 rTechNote:['Техническая ошибка не считается неверным ответом.','Техникалық қате қате жауап болып есептелмейді.'],rView:['Предпочтительный режим в этом занятии: {v}','Осы сабақтағы таңдаулы режим: {v}'],rModes:['Форматы объяснения: {m}','Түсіндіру форматтары: {m}'],
 colTask:['Задание','Тапсырма'],colFirst:['Первая попытка','Бірінші әрекет'],colAfter:['После подсказки','Кеңестен кейін'],colNew:['Новый пример','Жаңа мысал'],colMode:['Способ ответа','Жауап тәсілі'],
 ok:['верно','дұрыс'],no:['неверно','қате'],notEval:['не оценено','бағаланбады'],dash:['-','-'],independent:['самостоятельно','өз бетімен'],role_core:['основное','негізгі'],role_transfer:['перенос на новую фигуру','жаңа пішінге көшіру'],role_diagnostic:['неравные части','тең емес бөліктер'],
 m_mark:['отметить части','бөлік белгілеу'],m_build:['собрать из кусков','кесектерден құрау'],m_card:['выбрать схему','сызба таңдау'],m_choice:['выбор','таңдау'],m_match:['пары','жұптар'],m_order:['порядок','рет'],
 recTitle:['Рекомендации','Ұсыныстар'],recBasis:['Основание: {r}','Негізі: {r}'],recNone:['Пока нет рекомендаций: нужны оценённые задания.','Әзірге ұсыныс жоқ: бағаланған тапсырмалар керек.'],assignNext:['Назначить следующий пример','Келесі мысалды тағайындау'],assignLesson:['Назначить урок','Сабақты тағайындау'],
 recNote:['Рекомендация - педагогическое правило по событиям этого занятия, не вывод о ребёнке.','Ұсыныс - осы сабақ оқиғалары бойынша педагогикалық ереже, бала туралы қорытынды емес.'],
 obs:['Учебные наблюдения','Оқу бақылаулары'],quiz:['Мини-тест после видео','Бейнеден кейінгі шағын тест'],views:['Просмотр видео','Бейне көру'],viewsNote:['Просмотр - не освоение темы.','Көру - тақырыпты меңгеру емес.'],noAttempt:['Ученик ещё не начинал урок.','Оқушы әлі сабақты бастаған жоқ.'],
 pTitle:['Профиль поддержки · {n}','Қолдау профилі · {n}'],pSub:['Демонстрационные данные · Доступ только назначенным взрослым','Демонстрациялық деректер · Тек тағайындалған ересектерге'],pSubReal:['Доступ только назначенному учителю','Тек тағайындалған мұғалімге'],
 comfort:['Комфорт и доступность','Жайлылық және қолжетімділік'],comfortSub:['Выбор ученика, а не диагноз','Оқушының таңдауы, диагноз емес'],iface:['Интерфейс: {v}','Интерфейс: {v}'],motion:['Движение: {v}','Қозғалыс: {v}'],voice:['Голос: {v}','Дауыс: {v}'],session:['В этом занятии: {v}','Осы сабақта: {v}'],
 calm:['спокойный','тыныш'],standard:['обычный','қалыпты'],notChosen:['не выбран','таңдалмаған'],min:['минимум','ең аз'],normal:['обычное','қалыпты'],on:['включён','қосулы'],off:['выключен','өшірулі'],
 lobs:['Учебные наблюдения','Оқу бақылаулары'],lobsNote:['Не является постоянным ярлыком.','Тұрақты белгі емес.'],tnote:['Заметка учителя','Мұғалім жазбасы'],tnoteSub:['Факт, контекст, дата и автор - отдельно от результата.','Факт, контекст, күн және автор - нәтижеден бөлек.'],
 saveNote:['Сохранить заметку','Жазбаны сақтау'],noteSaved:['Заметка сохранена','Жазба сақталды'],history:['История изменений','Өзгерістер тарихы'],data:['Управление данными','Деректерді басқару'],
 exportBtn:['Скачать данные ученика (JSON)','Оқушы деректерін жүктеу (JSON)'],deleteBtn:['Удалить ученика и все его данные','Оқушыны және оның барлық деректерін жою'],deleteQ:['Это действие нельзя отменить. Будут удалены попытки, ответы, события, заметки, профиль и доступы. Чтобы подтвердить, введите метку ученика: «{n}».','Бұл әрекетті болдырмау мүмкін емес. Әрекеттер, жауаптар, оқиғалар, жазбалар, профиль және қолжетімділік жойылады. Растау үшін оқушы белгісін енгізіңіз: «{n}».'],
 deleted:['Ученик и его данные удалены','Оқушы және оның деректері жойылды'],phrases:['Фразы панели коммуникации','Коммуникация панелінің сөздері'],phrasesNote:['«Мне нужна помощь» и «Нужен перерыв» всегда доступны.','«Маған көмек керек» және «Үзіліс керек» әрқашан қолжетімді.'],pace:['Темп','Қарқын'],slow:['спокойный','баяу'],
 edTitle:['Конструктор задания «Доля целого»','«Бүтіннің үлесі» тапсырма құрастырушысы'],edSub:['Одна структура, два языка. Правильность считается по площади выбранных частей.','Бір құрылым, екі тіл. Дұрыстық таңдалған бөліктердің ауданымен есептеледі.'],
 fTitle:['Название','Атауы'],fObjective:['Цель','Мақсат'],fPrompt:['Короткая инструкция','Қысқа нұсқау'],fContext:['Объект','Нысан'],fDen:['На сколько частей делим (знаменатель)','Неше бөлікке бөлеміз (бөлім)'],fNum:['Сколько частей выбрать (числитель)','Неше бөлік таңдау (алым)'],
 fPartition:['Части','Бөліктер'],equal:['равные','тең'],unequal:['неравные (задание на равенство площадей)','тең емес (аудан теңдігіне тапсырма)'],fParts:['Веса частей через запятую','Бөлік салмақтары үтір арқылы'],fHints:['Подсказки (до 3)','Кеңестер (3-ке дейін)'],fModes:['Способы ответа','Жауап тәсілдері'],
 fStatus:['Статус проверки','Тексеру мәртебесі'],draft:['черновик','жоба'],checked:['проверено учителем','мұғалім тексерді'],ctx_pizza:['пицца','пицца'],ctx_circle:['круг','дөңгелек'],ctx_cake:['торт','торт'],ctx_strip:['бумажная полоска','қағаз жолақ'],ctx_chocolate:['шоколадка','шоколад'],ctx_rect:['прямоугольник','тіктөртбұрыш'],
 criterion:['Критерий: выбранные части покрывают {n}/{d} целого.','Критерий: таңдалған бөліктер бүтіннің {n}/{d} бөлігін жабады.'],geomOk:['Геометрия проверена: правильный ответ совпадает с картинкой.','Геометрия тексерілді: дұрыс жауап суретпен сәйкес.'],
 eye:['Посмотреть глазами ученика','Оқушы көзімен қарау'],eyeNote:['Это preview-попытка: она не попадает в оценки и не меняет прогресс учеников.','Бұл preview-әрекет: ол бағаға түспейді және оқушылар прогресін өзгертпейді.'],
 pvSound:['Звук выключен','Дыбыс өшірулі'],pvMotion:['Уменьшить движение','Қозғалысты азайту'],pv2d:['Открыть в 2D','2D-да ашу'],pvKbd:['Проверить клавиатурой: Tab, Enter, Space','Пернетақтамен тексеру: Tab, Enter, Space'],pvCheck:['Проверить как ученик','Оқушы ретінде тексеру'],pvLang:['Язык preview','Preview тілі'],
 saveVersion:['Сохранить новую версию','Жаңа нұсқаны сақтау'],versions:['Версии','Нұсқалар'],version:['Версия {v}','{v} нұсқа'],assignVersion:['Назначить эту версию','Осы нұсқаны тағайындау'],pinned:['Уже начатые попытки остаются на прежней версии.','Басталған әрекеттер бұрынғы нұсқада қалады.'],
 basis:['Основание назначения','Тағайындау негізі'],followTitle:['Следующий пример для {n}','{n} үшін келесі мысал'],followNote:['Проверьте цель, ответы и подсказки, отредактируйте и подтвердите. Без подтверждения ничего не назначается.','Мақсатты, жауаптарды және кеңестерді тексеріп, өңдеп, растаңыз. Растаусыз ештеңе тағайындалмайды.'],
 confirmAssign:['Подтвердить назначение','Тағайындауды растау'],planLocked:['Доступно в тарифе Макс или Школа','Макс немесе Мектеп тарифінде қолжетімді'],tariffs:['Посмотреть тарифы','Тарифтерді қарау'],openPilot:['Открыть тестовый пилот','Тест пилотын ашу'],
 libTitle:['Библиотека материалов','Материалдар кітапханасы'],libSub:['Уроки, медиа и их статус проверки','Сабақтар, медиа және олардың тексеру мәртебесі'],objective:['Цель (черновик)','Мақсат (жоба)'],criteria:['Критерий успеха','Табыс критерийі'],materials:['Материалы','Материалдар'],
 mediaTitle:['Медиа и адаптеры','Медиа және адаптерлер'],mediaNote:['ElevenLabs и VideoCraft отключены: в этой итерации нет платных вызовов. Используются локальные файлы.','ElevenLabs және VideoCraft өшірулі: бұл итерацияда ақылы шақыру жоқ. Жергілікті файлдар қолданылады.'],testAdapter:['Проверить адаптер (mock)','Адаптерді тексеру (mock)'],
 videoReview:['Видео M01 · ждёт проверки учителем','M01 бейнесі · мұғалім тексеруін күтуде'],
 piTitle:['Тарифы для школы','Мектепке арналған тарифтер'],piSub:['Взрослый управляет подпиской, учитель назначает занятия, ученик учится. Это гипотеза продукта для проверки.','Ересек жазылымды басқарады, мұғалім сабақ тағайындайды, оқушы оқиды. Бұл тексеруге арналған өнім гипотезасы.'],
 testMode:['Тестовый режим: оплата не подключена, деньги не списываются, данные карты не нужны.','Тест режимі: төлем қосылмаған, ақша алынбайды, карта деректері керек емес.'],current:['Текущий план','Ағымдағы жоспар'],status:['Статус','Мәртебе'],until:['до {d}','{d} дейін'],
 startPilot:['Начать тестовый пилот','Тест пилотын бастау'],cancelPilot:['Отменить тестовый пилот','Тест пилотын болдырмау'],endPilot:['Завершить пилот сейчас (проверка окончания)','Пилотты қазір аяқтау (аяқталуды тексеру)'],
 endsNote:['По окончании или отмене история обучения сохраняется. Функции пилота закрываются, базовый урок и доступность продолжают работать.','Аяқталғанда немесе болдырмағанда оқу тарихы сақталады. Пилот функциялары жабылады, негізгі сабақ пен қолжетімділік жұмыс істей береді.'],
 simulate:['Исход тестовой оплаты','Тест төлемінің нәтижесі'],sim_success:['успешно','сәтті'],sim_fail:['ошибка','қате'],sim_cancel:['отмена','болдырмау'],sim_pending:['в ожидании','күтуде'],orders:['Заказы (локальные)','Тапсырыстар (жергілікті)'],
 onlyAdmin:['Подпиской управляет администратор организации. Учитель видит план.','Жазылымды ұйым әкімшісі басқарады. Мұғалім жоспарды көреді.'],features:['Возможности','Мүмкіндіктер'],
 f_captions:['субтитры','субтитрлер'],f_calm_mode:['спокойный режим','тыныш режим'],f_communication:['панель коммуникации','коммуникация панелі'],f_keyboard:['управление с клавиатуры','пернетақтамен басқару'],f_report_example:['пример отчёта','есеп үлгісі'],f_followup:['следующее задание из отчёта','есептен келесі тапсырма'],
 f_all_lessons:['все шесть уроков','барлық алты сабақ'],f_groups:['групповые назначения','топтық тағайындау'],f_constructor:['конструктор заданий','тапсырма құрастырушысы'],f_history:['история прогресса','прогресс тарихы'],
 os_succeeded:['успешно','сәтті'],os_failed:['ошибка','қате'],os_cancelled:['отменён','болдырылмады'],os_pending:['в ожидании','күтуде'],es_active:['активен','белсенді'],es_cancelled:['отменён','болдырылмады'],es_expired:['окончен','аяқталды'],es_none:['нет','жоқ'],
 adTitle:['Организация','Ұйым'],adSub:['Сводка без данных отдельных учеников','Жеке оқушылар деректерінсіз жиынтық'],teachers:['Учителей','Мұғалімдер'],studentsN:['Учеников','Оқушылар'],assignmentsN:['Назначений','Тағайындаулар'],completedN:['Завершённых уроков','Аяқталған сабақтар'],
 loading:['Загружаем…','Жүктеліп жатыр…'],error:['Не удалось выполнить. Попробуйте ещё раз.','Орындау мүмкін болмады. Қайта байқап көріңіз.'],saved:['Сохранено','Сақталды'],close:['Закрыть','Жабу'],copy:['Скопировать','Көшіру'],copied:['Скопировано','Көшірілді']
});
let me=null,classData=null;const app=document.getElementById('app');
async function boot(){
 const r=await api('/api/v2/me').catch(()=>null);if(!r||r.status===401){location.replace('/teacher/login');return;}me=r.data;
 setLang(lang());window.addEventListener('hashchange',route);
 // Adults get calm motion too: the system setting turns every effect off (motion.mjs reads this attribute).
 const mm=()=>{document.documentElement.dataset.motion=reducedMotion()?'off':'full';};mm();matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',mm);
 if(!location.hash)location.hash=me.teaches?'#/now':'#/pilot';else route();
}
const feat=f=>me.plan.features.includes(f);
function shell(active,title,sub,content){
 const nav=me.teaches?[['now','#/now','pulse'],['students','#/students','users'],['assign','#/assign','assign'],['reports','#/reports','report'],['profiles','#/profiles','profile'],['editor','#/editor','edit'],['library','#/library','library'],...(me.demo?[]:[['pilot','#/pilot','star']])]:[['admin','#/admin','users'],['pilot','#/pilot','star']];
 if(me.manages&&me.teaches)nav.push(['admin','#/admin','users']);
 app.innerHTML=`<div class="app"><header class="side"><a class="brand" href="#/reports" aria-label="Аян">${MARK}<span><b>Аян</b><small>${esc(t('brandSub'))}</small></span></a>
  <button type="button" class="tool menu-btn" aria-expanded="false" aria-controls="nav" data-menu>${icon('menu')}${esc(t('menu'))}</button>
  <nav aria-label="${esc(t('menu'))}"><ul class="nav" id="nav">${nav.map(([k,h,ic])=>`<li><a href="${h}" ${k===active?'aria-current="page"':''}>${icon(ic)}<span>${esc(t(k))}</span></a></li>`).join('')}</ul></nav>
  <div class="side-note opt-detail"><b>${esc(t('note'))}</b><p>${esc(t('noteText'))}</p></div></header>
  <main class="main" id="main" tabindex="-1">${me.demo?`<div class="demo-strip"><span>${esc(t('demo'))}</span><a href="/demo">${esc(t('switchUser'))}</a></div>`:''}<div class="page">
  <div class="top"><div><h1 id="page-h" tabindex="-1">${esc(title)}</h1>${sub?`<p class="sub">${esc(sub)}</p>`:''}</div><div class="top-tools"><span class="badge ${me.plan.plan==='free'?'grey':''}" style="min-height:40px;padding:0 14px">${esc(me.plan.plan==='free'?t('planFree'):t('planPilot'))}</span><button type="button" class="tool" data-lang>${icon('globe')}ҚАЗ / РУС</button><button type="button" class="tool" data-logout>${icon('out')}${esc(t('logout'))}</button></div></div>
  <div id="view" class="stack" style="gap:28px">${content}</div></div></main></div>`;
 ($('#page-h'))?.focus({preventScroll:true});
}
function route(){clearInterval(pulseTimer);pulseTimer=null;const [r,qs]=(location.hash.replace(/^#\/?/,'')||'reports').split('?');const q=new URLSearchParams(qs||'');
 const map={now:viewNow,students:viewStudents,assign:viewAssign,reports:viewReports,report:()=>viewReport(q.get('child'),q.get('attempt')),profiles:()=>viewProfile(q.get('child')),passport:()=>viewPassport(q.get('child')),editor:()=>viewEditor(),library:viewLibrary,pilot:viewPilot,admin:viewAdmin};
 (map[r]||viewReports)();}
async function load(url){const r=await api(url);if(!r.ok)throw Object.assign(Error(r.data?.error||'error'),{status:r.status,data:r.data});return r.data;}
const opId=()=>sid();
function errBox(e){if(e?.status===401)return `<section class="card stack" data-lost role="alert"><p class="err">${esc(t('noSession'))}</p><a class="btn primary inline" data-relogin href="${me?.demo?'/demo':'/teacher/login'}" style="align-self:flex-start">${esc(t('relogin'))}</a></section>`;
 return `<section class="card"><p class="err">${esc(e.data?.error||t('error'))}</p></section>`;}
// Demo student labels are stored as "Ученик 01"; on Kazakh screens they read "Оқушы 01".
const kid=l=>lang()==='kk'?String(l??'').replace(/^Ученик(?=\s)/,'Оқушы').replace(/^Родитель ученика/,'Оқушының ата-анасы'):String(l??'');
const stageName=s=>L({goal:{ru:'Цель',kk:'Мақсат'},explanation:{ru:'Объяснение',kk:'Түсіндіру'},example:{ru:'Пример',kk:'Мысал'},practice:{ru:'Практика',kk:'Практика'},check:{ru:'Завершение',kk:'Аяқтау'}}[s]||{ru:s,kk:s});
const stateName=s=>t(s==='completed'?'done':s==='paused'?'paused':s==='in_progress'?'inWork':'notStarted');

// ---------- live class pulse: "Кому сейчас нужна помощь?" (polling every 3 s, no reload) ----------
// Only cards whose content changed are replaced; focus stays on the same control (or the card title); the time shows
// minutes only, so nothing ticks for a screen reader. A lost session stops the polling and shows a sign-in button.
let pulseTimer=null;const pulsePrev=new Map();
const acked=new Set((()=>{try{return JSON.parse(sessionStorage.getItem('ayan.v2.acked')||'[]');}catch{return [];}})());
const saveAcked=()=>{try{sessionStorage.setItem('ayan.v2.acked',JSON.stringify([...acked].slice(-100)));}catch{}};
const P_ICON={help:'hand',break:'pause',working:'pulse',idle:'info',waiting:'assign',done:'check',none:'info'};
const hhmm=ms=>new Date(ms).toLocaleTimeString(lang()==='kk'?'kk-KZ':'ru-RU',{hour:'2-digit',minute:'2-digit'});
function sinceText(ms){const m=Math.floor((Date.now()-ms)/60000);return m<1?t('p_just'):m<60?t('p_min',{n:m}):t('p_hour');}
function pcard(s){
 const attn=(s.status==='help'||s.status==='break')&&!acked.has(s.id+':'+s.since);
 const step=s.status==='done'&&s.score?t('p_score',{n:s.score.n,m:s.score.m}):s.stageIndex?`${t('p_step',{n:s.stageIndex})} · ${stageName(s.stage)}${s.task?' · '+t('p_task',{n:s.task.n,m:s.task.m}):''}`:'';
 const p=s.status==='done'?1:s.stageIndex?((s.stageIndex-1)+(s.task?(s.task.n-1)/s.task.m:.3))/5:0;
 const acts=[s.status==='help'&&s.helpId?`<button type="button" class="btn small primary inline" data-ack="${esc(s.helpId)}" data-label="${esc(kid(s.label))}">${icon('check')}${esc(t('p_ackGo'))}</button>`:'',
  s.status==='break'&&attn?`<button type="button" class="btn small inline" data-ackbreak="${esc(s.id+':'+s.since)}">${icon('check')}${esc(t('p_ackSeen'))}</button>`:'',
  s.attemptId||s.completed?`<a class="btn small inline" href="#/report?child=${encodeURIComponent(s.id)}">${esc(t('p_open'))}</a>`:'',
  (s.status==='done'&&!s.next)||s.status==='none'?`<a class="btn small inline" href="#/assign">${esc(t('p_assign'))}</a>`:''].join('');
 return `<li class="pcard ${attn?'attn':''}" data-pulse="${esc(s.id)}" data-status="${s.status}"><span class="ring" aria-hidden="true"></span>
  <div class="who-row"><h3 tabindex="-1">${esc(kid(s.label))}</h3><span class="status">${icon(P_ICON[s.status]||'info')}${esc(t('s_'+s.status))}</span></div>
  <p class="what">${s.topic?esc(L(s.topic)):esc(t('p_noLesson'))}${s.followup?` <span class="badge grey">${esc(t('p_follow'))}</span>`:''}</p>${step?`<p class="step tnum">${esc(step)}</p>`:''}
  <div class="pbar" aria-hidden="true"><i style="--p:${Math.min(1,p).toFixed(3)}"></i></div>
  ${s.comingAt&&s.status!=='help'?`<p class="coming" data-coming>${icon('check')}${esc(t('p_coming',{t:hhmm(s.comingAt)}))}</p>`:''}
  ${s.struggling?`<p class="flag">${icon('info')}${esc(t('p_struggle'))}</p>`:''}${s.hints&&!s.struggling?`<p class="flag">${icon('question')}${esc(t('p_hints',{n:s.hints}))}</p>`:''}
  ${s.next?`<p class="step">${esc(t('p_next',{t:L(s.next.topic)}))}${s.next.followup?` <span class="badge grey">${esc(t('p_follow'))}</span>`:''}</p>`:''}
  ${s.since?`<p class="since">${esc(sinceText(s.since))}</p>`:''}<div class="acts">${acts}</div></li>`;
}
// Which control had focus inside a card, so the same one gets it back after the card is replaced (never another action).
function focusKey(el){if(!el)return null;if(el.dataset.ack)return '[data-ack]';if(el.dataset.ackbreak)return '[data-ackbreak]';const h=el.getAttribute('href')||'';if(h.includes('report'))return 'a[href*="report"]';if(h==='#/assign')return 'a[href="#/assign"]';return null;}
const loginHref=()=>me?.demo?'/demo':'/teacher/login';
function lostBox(){return `<section class="card lost" data-lost role="alert"><p><b>${esc(t('p_lostH'))}</b> ${esc(t('p_lost'))}</p><a class="btn primary inline" data-relogin href="${loginHref()}">${esc(t('relogin'))}</a></section>`;}
function recHtml(rec){if(!rec)return '';const x=rec.x;
 const act=x.kind==='followup'&&x.assignedAt?`<p class="rec-done" data-recdone tabindex="-1">${icon('check')}${esc(t('p_recDone',{n:kid(rec.s.label)}))}</p>`
  :x.kind==='followup'?`<button type="button" class="btn primary inline" data-recfollow>${esc(t('assignNext'))}</button>`:x.kind==='lesson'?`<a class="btn primary inline" href="#/assign">${esc(t('assignLesson'))}</a>`:'';
 return `<section class="card soft rec-card" aria-labelledby="rec-h"><div><h2 id="rec-h">${esc(t('p_rec'))}</h2><p style="margin-top:8px"><b>${esc(kid(rec.s.label))}:</b> ${esc(L(x.action))}</p><p class="muted" style="margin-top:6px">${esc(t('recBasis',{r:L(x.reason)}))}</p></div>${act}</section>`;}
// F2 "Скоро заканчиваем": the teacher warns the class 2 or 5 minutes ahead; the child sees a calm strip in the lesson.
// The bar lives outside the polled cards and is redrawn only by its own actions, so polling never moves focus.
async function noticeBar(host){
 if(!host)return;let active=null;
 const draw=(focus)=>{host.innerHTML=active?`<div class="notice-bar" role="group" aria-labelledby="nb-h"><span id="nb-h" class="nb-h">${icon('info')}${esc(t('nbTitle'))}</span><span class="nb-st" data-notice-status role="status">${esc(t('nbSent',{n:active.sent,t:hhmm(active.until)}))}</span><button type="button" class="btn small inline" data-notice-cancel>${esc(t('nbCancel'))}</button></div>`
  :`<div class="notice-bar" role="group" aria-labelledby="nb-h"><span id="nb-h" class="nb-h">${icon('info')}${esc(t('nbTitle'))}</span><button type="button" class="btn small inline" data-notice-min="2">${esc(t('nbMin',{n:2}))}</button><button type="button" class="btn small inline" data-notice-min="5">${esc(t('nbMin',{n:5}))}</button><span class="nb-st" data-notice-status role="status"></span></div>`;
  if(focus)host.querySelector(focus)?.focus({preventScroll:true});};
 try{const r=await api('/api/v2/notice');if(r.ok)active=r.data.active;}catch{}
 draw();
 host.onclick=async e=>{const b=e.target.closest('[data-notice-min],[data-notice-cancel]');if(!b||b.getAttribute('aria-busy')==='true')return;b.setAttribute('aria-busy','true');
  const minutes=b.dataset.noticeMin?Number(b.dataset.noticeMin):0;const r=await api('/api/v2/notice',{body:{minutes}}).catch(()=>null);
  if(!r||!r.ok){b.removeAttribute('aria-busy');const st=host.querySelector('[data-notice-status]');if(st)st.textContent=t('error');return;}
  active=minutes?{minutes,until:r.data.until,sent:r.data.sent}:null;draw(minutes?'[data-notice-cancel]':'[data-notice-min="2"]');
  announce(minutes?t('nbSent',{n:r.data.sent,t:hhmm(r.data.until)}):t('nbCancelled'));};
 // the warning ends by itself: return the buttons when the time is up (checked every 15 s, no polling of the server)
 const tick=setInterval(()=>{if(!host.isConnected){clearInterval(tick);return;}if(active&&Date.now()>active.until){const had=host.contains(document.activeElement);active=null;draw(had?'[data-notice-min="2"]':null);}},15000);
}
async function viewNow(){
 shell('now',t('nowTitle'),t('nowSub'),`<p class="muted">${esc(t('loading'))}</p>`);
 let rec=null,built=false,recKey='',offline=false;
 const stop=()=>{clearInterval(pulseTimer);pulseTimer=null;};
 const drawRec=()=>{const box=$('#view [data-recbox]');if(!box)return;const k=JSON.stringify([rec?.x?.id,rec?.x?.assignedAt,lang()]);if(k===recKey)return;recKey=k;
  const had=document.activeElement&&box.contains(document.activeElement);box.innerHTML=recHtml(rec);
  if(had)(box.querySelector('[data-recfollow],[data-recdone],a.btn')||box.querySelector('h2'))?.focus({preventScroll:true});
  const rb=box.querySelector('[data-recfollow]');if(rb)rb.onclick=()=>followup(rec.r,rec.r.summary.attemptId,rec.x.draft.fromTask,!!rec.x.draft.unequal,L(rec.x.reason),rec.x.evidence||[],()=>{rec.x={...rec.x,assignedAt:Date.now()};drawRec();draw(false);});};
 // One pulse request at a time (Codex review): a draw asked for while one is running (an action) runs right after it,
 // so a slow old answer can never land after a newer one.
 let inflight=false,again=false;
 const draw=async first=>{if(inflight){again=true;return;}inflight=true;try{await drawOnce(first);}finally{inflight=false;if(again){again=false;draw(false);}}};
 const drawOnce=async first=>{
  let d;try{d=await load('/api/v2/pulse');}catch(e){
   if(!location.hash.startsWith('#/now'))return;const view=$('#view');if(!view)return;
   if(e.status===401){stop();if(!view.querySelector('[data-lost]'))view.insertAdjacentHTML('afterbegin',lostBox());view.querySelector('[data-live]')?.classList.add('stale');announce(t('p_lostH'));return;}
   if(first||!built){view.innerHTML=errBox(e);return;}
   if(!offline){offline=true;const lv=view.querySelector('[data-live]');if(lv){lv.textContent=t('p_offline');lv.classList.add('stale');}}return;}
  if(!location.hash.startsWith('#/now'))return;const view=$('#view');if(!view)return;
  if(!built){view.innerHTML=`<div class="pulse-top"><div class="pulse-sum" data-sum></div><span class="live" data-live></span></div><div data-noticebar></div><div data-gridbox></div><div data-recbox></div>`;built=true;noticeBar(view.querySelector('[data-noticebar]'));}
  const fresh=[];for(const s of d.students){const k=s.status+':'+(s.helpId||s.since);const prev=pulsePrev.get(s.id);if((s.status==='help'||s.status==='break')&&prev!==undefined&&prev!==k)fresh.push(s);pulsePrev.set(s.id,k);}
  if(!rec){const done=d.students.find(s=>s.status==='done'&&s.attemptId);if(done){try{const r=await load('/api/v2/report?child='+encodeURIComponent(done.id));const x=r.recommendations.find(x=>x.kind==='followup')||r.recommendations[0];if(x)rec={r,x,s:done};}catch{}}}
  const c=d.counts||{};
  const sum=[['help','p_cHelp'],['break','p_cBreak'],['working','p_cWork'],['done','p_cDone']].map(([k,l])=>`<span class="pill ${k==='help'&&c.help?'help':''}">${esc(t(l))}: <b>${c[k]||0}</b></span>`).join('');
  const sumEl=view.querySelector('[data-sum]');if(sumEl.innerHTML!==sum)sumEl.innerHTML=sum;
  const lv=view.querySelector('[data-live]');const lt=t('p_live',{t:hhmm(d.now)});offline=false;lv.classList.remove('stale');if(lv.textContent!==lt)lv.innerHTML=`<i aria-hidden="true"></i>${esc(lt)}`;
  const gb=view.querySelector('[data-gridbox]');
  if(!d.students.length){if(!gb.querySelector('[data-empty]'))gb.innerHTML=`<section class="card" data-empty><p>${esc(t('p_none'))}</p></section>`;}
  else{
   let grid=gb.querySelector('.pulse-grid');if(!grid){gb.innerHTML='<ul class="pulse-grid"></ul>';grid=gb.querySelector('.pulse-grid');}
   const act=document.activeElement,card=act?.closest?.('[data-pulse]');const fCard=card&&grid.contains(card)?card.dataset.pulse:null,fKey=fCard?focusKey(act):null;
   const old=new Map([...grid.children].map(li=>[li.dataset.pulse,li]));const html=new Map(d.students.map(s=>[s.id,pcard(s)]));
   const changed=d.students.filter(s=>old.get(s.id)?.dataset.html!==html.get(s.id)).map(s=>s.id);
   const gone=[...old.keys()].filter(id=>!html.has(id));const order=d.students.map(s=>s.id).join('|'),was=[...old.keys()].join('|');
   if(changed.length||gone.length||order!==was){
    const mutate=()=>{
     for(const id of changed){const tpl=document.createElement('template');tpl.innerHTML=html.get(id).trim();const li=tpl.content.firstElementChild;li.dataset.html=html.get(id);const o=old.get(id);if(o)o.replaceWith(li);else grid.append(li);old.set(id,li);}
     for(const id of gone){old.get(id)?.remove();old.delete(id);}
     if(order!==[...grid.children].map(li=>li.dataset.pulse).join('|'))for(const s of d.students)grid.append(old.get(s.id));};
    if(order!==was&&!first)Motion.flip(grid,'data-pulse',mutate);else mutate();
    if(fCard){const li=grid.querySelector(`[data-pulse="${CSS.escape(fCard)}"]`);const target=(fKey&&li?.querySelector(fKey))||li?.querySelector('h3');if(target&&document.activeElement!==target)target.focus({preventScroll:true});}
   }
  }
  for(const s of fresh){Motion.ring(view.querySelector(`[data-pulse="${CSS.escape(s.id)}"] .ring`));announce(t(s.status==='help'?'p_annHelp':'p_annBreak',{n:kid(s.label)}));}
  drawRec();
 };
 $('#view').onclick=async e=>{const b=e.target.closest('[data-ack],[data-ackbreak]');if(!b)return;
  if(b.dataset.ack){if(b.getAttribute('aria-busy')==='true')return;b.setAttribute('aria-busy','true');const r=await api('/api/v2/help/seen',{body:{id:b.dataset.ack}});
   if(r.ok){const msg=t('p_ackDone',{n:b.dataset.label||''});toast(msg);announce(msg);}else if(r.status===401){draw(false);return;}else{b.removeAttribute('aria-busy');toast(t('error'));return;}}
  if(b.dataset.ackbreak){acked.add(b.dataset.ackbreak);saveAcked();}
  await draw(false);};
 await draw(true);
 if(location.hash.startsWith('#/now')&&!$('#view [data-lost]')){stop();pulseTimer=setInterval(()=>{if(!document.hidden)draw(false);},3000);}
}
// ---------- students ----------
async function viewStudents(){
 shell('students',t('stTitle'),t('stSub'),`<p class="muted">${esc(t('loading'))}</p>`);
 let cls,help;try{[cls,help]=await Promise.all([load('/api/v2/class'),load('/api/v2/help')]);}catch(e){$('#view').innerHTML=errBox(e);return;}classData=cls;
 $('#view').innerHTML=`<section class="card" aria-labelledby="sl-h"><div class="between"><h2 id="sl-h">${esc(t('students'))}</h2><button type="button" class="btn primary inline" data-add>${icon('plus')}${esc(t('add'))}</button></div>
  ${cls.students.length?`<ul class="rows">${cls.students.map(s=>`<li class="rowline" style="grid-template-columns:1.1fr 1fr 1fr auto"><b>${esc(kid(s.label))}${s.demo?' <span class="badge sand">демо</span>':''}</b><span class="muted">${s.summary?esc(stageName(s.summary.stage))+' · '+esc(stateName(s.summary.state)):esc(t('notStarted'))}</span><span>${s.openHelp?`<span class="badge warn">${esc(t('nHelp'))}</span>`:''}</span>
   <span class="row" style="gap:8px;justify-content:flex-end"><a class="btn small inline" href="#/report?child=${encodeURIComponent(s.id)}">${esc(t('report'))}</a><a class="btn small inline" href="#/profiles?child=${encodeURIComponent(s.id)}">${esc(t('profile'))}</a><button type="button" class="btn small inline" data-invite="${esc(s.id)}">${esc(t('invite'))}</button><button type="button" class="btn small inline" data-parent="${esc(s.id)}">${esc(t('parentLink'))}</button><button type="button" class="btn small inline" data-revoke="${esc(s.id)}" data-label="${esc(kid(s.label))}">${esc(t('revoke'))}</button></span></li>`).join('')}</ul>`
  :`<div class="stack" style="margin-top:16px"><p><b>${esc(t('noStudents'))}</b></p><p class="muted">${esc(t('noStudentsText'))}</p></div>`}</section>
  <section class="card" aria-labelledby="hr-h"><h2 id="hr-h">${esc(t('helpReq'))}</h2><p class="sub" style="margin-top:6px">${esc(t('helpNote'))}</p>${help.filter(h=>!h.seen).length?`<ul class="rows">${help.filter(h=>!h.seen).map(h=>`<li class="rowline" style="grid-template-columns:1fr 1fr auto"><b>${esc(kid(h.label))}</b><span class="muted tnum">${new Date(h.createdAt).toLocaleString(lang()==='kk'?'kk-KZ':'ru-RU')}</span><button type="button" class="btn small inline" data-seen="${esc(h.id)}">${esc(t('markSeen'))}</button></li>`).join('')}</ul>`:`<p style="margin-top:12px">${esc(t('helpNone'))}</p>`}</section>`;
}
// ---------- assign ----------
async function viewAssign(preselect){
 shell('assign',t('asTitle'),t('asSub'),`<p class="muted">${esc(t('loading'))}</p>`);
 let cat,cls;try{[cat,cls]=await Promise.all([load('/api/v2/catalog'),load('/api/v2/class')]);}catch(e){$('#view').innerHTML=errBox(e);return;}classData=cls;
 $('#view').innerHTML=`<section class="card soft" aria-labelledby="ai-h"><h2 id="ai-h">${icon('spark','h-ico')} ${esc(t('ai_title'))}</h2><p class="sub" style="margin-top:8px">${esc(t('ai_sub'))}</p>
  <form class="row" data-aiform style="margin-top:16px;align-items:flex-end"><div class="field" style="flex:1;min-width:220px"><label for="ai-topic">${esc(t('ai_topic'))}</label><input id="ai-topic" class="input" maxlength="120" placeholder="${esc(t('ai_hint'))}" required></div><button class="btn primary inline">${esc(t('ai_go'))}</button></form><div data-aiout aria-live="polite"></div></section>
  <div class="grid3">${cat.lessons.map(l=>`<section class="card stack" aria-labelledby="l-${l.lessonId}"><span class="row" style="gap:8px"><span class="badge grey">${esc(t('subjects_'+l.subject))}</span><span class="badge grey tnum">${esc(t('grade',{g:l.gradeProposal}))}</span></span>
  <h2 id="l-${l.lessonId}" style="font-size:1.25rem">${esc(L(l.topic))}</h2><p class="muted" style="font-size:1rem">${esc(L(l.objectiveDraft))}</p><p class="row" style="gap:8px"><span class="badge sand">${esc(t('pending'))}</span><span class="badge grey tnum">${esc(t('tasks',{n:l.taskCount}))}</span>${l.media.video?`<span class="badge">${esc(t('hasVideo'))}</span>`:''}${l.media.audio?`<span class="badge">${esc(t('hasAudio'))}</span>`:''}</p>
  ${l.locked?`<p class="badge grey">${icon('lock')}${esc(t('locked'))}</p><a class="btn" href="/pricing" style="margin-top:auto">${esc(t('tariffs'))}</a>`:`<button type="button" class="btn primary" data-assign="${esc(l.lessonId)}" style="margin-top:auto">${esc(t('choose'))}</button>`}</section>`).join('')}</div>`;
}
function pickStudentsForm(multiAllowed){return `<fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="label" style="font-weight:800;margin-bottom:8px">${esc(t('whom'))}</legend>${(classData?.students||[]).map((s,i)=>`<label class="row" style="min-height:48px;gap:12px"><input type="checkbox" name="kid" value="${esc(s.id)}" ${i===0?'checked':''} style="width:22px;height:22px;accent-color:var(--primary)"> ${esc(kid(s.label))}</label>`).join('')}${multiAllowed?'':`<p class="muted" style="font-size:.9375rem">${esc(t('groupNote'))}</p>`}</fieldset>`;}
function assignDialog(title,extra,send){
 const op=opId();const body=document.createElement('form');body.className='stack';body.innerHTML=`${extra||''}${pickStudentsForm(feat('groups'))}<p class="status-line" role="status" data-st></p><div class="row"><button type="submit" class="btn primary inline">${esc(t('confirmAssign'))}</button><button type="button" class="btn inline" data-close>${esc(t('cancel'))}</button></div>`;
 const d=openDialog({title,body,labelClose:t('close')});
 body.onsubmit=async e=>{e.preventDefault();const ids=[...body.querySelectorAll('input[name=kid]:checked')].map(x=>x.value);const st=body.querySelector('[data-st]');const btn=body.querySelector('[type=submit]');btn.setAttribute('aria-busy','true');
  try{const r=await api('/api/v2/assign',{body:{opId:op,childIds:ids,...send(body)}});btn.removeAttribute('aria-busy');
   if(!r.ok){st.className='status-line warn';st.innerHTML=esc(r.data?.error||t('error'))+(r.status===402?` <a href="/pricing">${esc(t('tariffs'))}</a>`:'');return;}
   st.className='status-line ok';st.textContent=t('assigned',{n:r.data.assignments.length})+(r.data.replay?' '+t('replay'):'');announce(st.textContent);}
  catch{btn.removeAttribute('aria-busy');st.className='status-line warn';st.textContent=t('error');}};
 return d;
}
// ---------- reports (mockup 11) ----------
async function viewReports(){
 shell('reports',t('repTitle'),me.demo?t('repSub'):t('repSubReal'),`<p class="muted">${esc(t('loading'))}</p>`);
 let cls;try{cls=await load('/api/v2/class');}catch(e){$('#view').innerHTML=errBox(e);return;}classData=cls;
 const withS=cls.students.filter(s=>s.summary),first=withS.find(s=>s.summary.state==='completed')||withS[0];
 let rep=null;if(first){try{rep=await load('/api/v2/report?child='+encodeURIComponent(first.id));}catch{}}
 const tot=first?.summary?.totals;
 const status=s=>!s.summary?t('notStarted'):s.summary.state==='completed'?`${s.summary.totals.correct} / ${s.summary.totals.required}`:stateName(s.summary.state);
 const support=s=>s.openHelp?t('nHelp'):!s.summary?t('noReq'):s.summary.state==='paused'||s.summary.totals.breaks?t('paused'):s.summary.totals.hints?t('nHints',{n:s.summary.totals.hints}):t('noReq');
 $('#view').innerHTML=`<div class="grid3"><section class="card" aria-labelledby="c1"><h2 id="c1">${esc(t('finished'))}</h2><p class="stat">${cls.cards.completed} / ${cls.students.length}</p><p class="stat-cap">${esc(t('finishedCap'))}</p></section>
  <section class="card" aria-labelledby="c2"><h2 id="c2">${esc(t('correct'))}</h2><p class="stat">${tot?`${tot.firstTryCorrect} / ${tot.required}`:'-'}</p><p class="stat-cap">${esc(first?t('correctCap',{n:kid(first.label)}):t('noAttempt'))}</p></section>
  <section class="card" aria-labelledby="c3"><h2 id="c3">${esc(t('hints'))}</h2><p class="stat">${tot?tot.hints:0}</p><p class="stat-cap">${esc(t('hintsCap'))}</p></section></div>
  <div data-insight-box></div>
  <div class="split" style="grid-template-columns:minmax(0,1fr) 370px"><section class="card" aria-labelledby="my-h"><h2 id="my-h">${esc(t('students'))}</h2><p class="sub" style="margin-top:8px">${esc(t('stSub'))}</p>
  <ul class="rows">${cls.students.map(s=>`<li><a class="rowline" href="#/report?child=${encodeURIComponent(s.id)}" style="grid-template-columns:1fr 1fr .8fr 1.1fr;color:inherit;text-decoration:none"><b>${esc(kid(s.label))}</b><span>${s.summary?esc(stageName(s.summary.stage)):'-'}</span><span class="tnum">${esc(status(s))}</span><span style="color:var(--primary);font-weight:700">${esc(support(s))}</span></a></li>`).join('')||`<li class="muted">${esc(t('noStudentsText'))}</li>`}</ul></section>
  <section class="card soft" aria-labelledby="obs-h"><h2 id="obs-h">${esc(t('obsTitle'))}</h2>${rep?.observations?.length?`<p class="muted" style="margin-top:6px">${esc(kid(first.label))}</p><div class="stack" style="margin-top:16px;gap:14px">${rep.observations.map(o=>`<p style="font-size:1.125rem">${esc(L(o.text))}</p>`).join('')}${rep.recommendations[0]?`<p style="font-size:1.125rem;margin-top:8px">${esc(L(rep.recommendations[0].action))}</p>`:''}</div>`:`<p style="margin-top:16px">${esc(t('obsNone'))}</p>`}</section></div>
  <section class="card between" aria-labelledby="ev-h"><div><h2 id="ev-h">${esc(t('eventsDiff'))}</h2><p class="sub" style="margin-top:8px">${esc(t('eventsList'))}</p></div>${first?`<a class="btn inline" href="#/report?child=${encodeURIComponent(first.id)}" style="min-width:320px">${esc(t('openReport'))}</a>`:''}</section>`;
 countStats();
 classInsight(cls,$('#view [data-insight-box]'));
}
// F4 "Что работает в классе": which support worked, with the students it is based on. Aggregated on the client from the
// per-student reports; an observation on a few students, not statistics. One failed report just drops that student.
async function classInsight(cls,box){
 if(!box)return;const kids=cls.students.filter(s=>s.summary);
 const reps=(await Promise.allSettled(kids.map(s=>load('/api/v2/report?child='+encodeURIComponent(s.id))))).map((x,i)=>x.status==='fulfilled'&&x.value.summary?{s:kids[i],r:x.value}:null).filter(Boolean);
 if(!box.isConnected)return;const N=reps.length;
 if(!N){box.innerHTML=`<section class="card soft" data-class-insight aria-labelledby="ci-h"><h2 id="ci-h">${esc(t('ciTitle'))}</h2><p style="margin-top:8px">${esc(t('ciEmpty'))}</p></section>`;return;}
 const who=list=>list.map(x=>`<a href="#/report?child=${encodeURIComponent(x.s.id)}">${esc(kid(x.s.label))}</a>`).join(', ');
 const rows=[];
 const visual=reps.filter(x=>x.r.summary.tasks.some(k=>k.assisted&&k.maxHint>=2));if(visual.length)rows.push({text:t('ciVisual',{x:visual.length,n:N}),list:visual});
 const twin=reps.filter(x=>x.r.summary.tasks.some(k=>k.assisted&&k.twin?.independent));if(twin.length)rows.push({text:t('ciTwin',{x:twin.length,n:N}),list:twin});
 const modes={};for(const x of reps)for(const m of new Set(x.r.summary.explanationModes||[]))(modes[m]=modes[m]||[]).push(x);
 const top=Object.entries(modes).sort((a,b)=>b[1].length-a[1].length)[0];if(top)rows.push({text:t('ciMode',{m:pick2(PP_MODE[top[0]])||top[0],x:top[1].length,n:N}),list:top[1]});
 const brk=reps.filter(x=>x.r.summary.totals.breaks>0&&x.r.summary.state==='completed');if(brk.length)rows.push({text:t('ciBreak',{x:brk.length}),list:brk});
 const shown=rows.slice(0,3);
 box.innerHTML=`<section class="card soft" data-class-insight aria-labelledby="ci-h"><h2 id="ci-h">${esc(t('ciTitle'))}</h2>
  ${shown.length?`<ul class="ci-rows">${shown.map(x=>`<li data-insight><p class="ci-text">${esc(x.text)}</p><p class="ci-who">${esc(t('ciBasis'))} ${who(x.list)}</p></li>`).join('')}</ul>`:`<p style="margin-top:8px">${esc(t('ciEmpty'))}</p>`}
  <p class="muted" style="margin-top:12px;font-size:.9375rem">${esc(t('ciNote',{n:N}))}</p></section>`;
}
async function viewReport(childId,attempt){
 if(!childId){location.hash='#/reports';return;}
 shell('reports',t('report'),'',`<p class="muted">${esc(t('loading'))}</p>`);
 let r;try{r=await load('/api/v2/report?child='+encodeURIComponent(childId)+(attempt?'&attempt='+encodeURIComponent(attempt):''));}catch(e){$('#view').innerHTML=errBox(e);return;}
 const s=r.summary;$('#page-h').textContent=t('rTitle',{n:kid(r.child.label)});
 const cell=(v)=>v==='correct'?`<span class="badge">${icon('check')}${esc(t('ok'))}</span>`:v==='incorrect'?`<span class="badge sand">${esc(t('no'))}</span>`:`<span class="muted">${esc(t('notEval'))}</span>`;
 const modeName=m=>t('m_'+m);
 const recs=r.recommendations.map(x=>`<li class="card" style="padding:18px"><p><b>${esc(L(x.action))}</b></p><p class="muted" style="margin-top:6px">${esc(t('recBasis',{r:L(x.reason)}))}</p><div class="row" style="margin-top:12px">${x.kind==='followup'&&x.assignedAt?`<p class="rec-done" data-recdone>${icon('check')}${esc(t('p_recDone',{n:kid(r.child.label)}))}</p>`:x.kind==='followup'?`<button type="button" class="btn primary inline" data-follow="${esc(x.draft.fromTask)}" data-unequal="${x.draft.unequal?1:0}" data-reason="${esc(L(x.reason))}" data-evidence="${esc(JSON.stringify(x.evidence||[]))}">${esc(t('assignNext'))}</button>`:x.kind==='lesson'?`<button type="button" class="btn primary inline" data-assign="${esc(x.lessonId)}">${esc(t('assignLesson'))}</button>`:''}</div></li>`).join('');
 $('#view').innerHTML=`${r.child.demo?`<p><span class="badge sand">${esc(t('rDemo'))}</span></p>`:''}
  ${s?`<section class="card" aria-labelledby="sum-h"><h2 id="sum-h">${esc(t('rTopic',{t:L(s.topic),v:s.version}))}</h2><p class="sub" style="margin-top:8px">${esc(t('rState',{s:stateName(s.state),e:stageName(s.stage)}))}</p>
   <div class="grid3" style="margin-top:20px;gap:16px">${[[t('rSolved'),`${s.totals.correct} / ${s.totals.required}`],[t('rFirst'),`${s.totals.firstTryCorrect} / ${s.totals.evaluated}`],[t('rHints'),s.totals.hints],[t('rBreaks'),s.totals.breaks],[t('rHelp'),s.totals.help],[t('rTech'),s.totals.technicalErrors]].map(([k,v])=>`<div class="card" style="padding:16px"><p class="muted" style="font-size:.9375rem">${esc(k)}</p><p class="stat" style="font-size:1.75rem;margin-top:6px">${esc(v)}</p></div>`).join('')}</div>
   <p class="muted" style="margin-top:12px">${esc(t('rTechNote'))}${s.sessionView?' · '+esc(t('rView',{v:s.sessionView.toUpperCase()})):''}${s.explanationModes.length?' · '+esc(t('rModes',{m:s.explanationModes.join(', ')})):''}</p>
   ${s.totals.notEvaluated.length?`<p class="muted">${esc(t('notEval'))}: ${esc(s.totals.notEvaluated.join(', '))}</p>`:''}</section>
  <section class="card" aria-labelledby="tk-h"><h2 id="tk-h">${esc(L({ru:'По заданиям',kk:'Тапсырмалар бойынша'}))}</h2><div style="overflow-x:auto;margin-top:12px"><table style="width:100%;border-collapse:collapse;min-width:640px;font-size:1rem"><thead><tr style="text-align:left;color:var(--muted)"><th style="padding:10px 8px">${esc(t('colTask'))}</th><th>${esc(t('colFirst'))}</th><th>${esc(t('colAfter'))}</th><th>${esc(t('colNew'))}</th><th>${esc(t('colMode'))}</th></tr></thead><tbody>
   ${s.tasks.map(x=>`<tr style="border-top:1px solid var(--border)"><td style="padding:12px 8px"><b>${esc(L(x.prompt))}</b><br><span class="muted" style="font-size:.875rem">${esc(t('role_'+x.role))}${x.subskill?' · '+esc(x.subskill):''}</span></td><td>${cell(x.firstTry)}</td><td>${x.assisted?`<span class="badge">${esc(L({ru:'решено',kk:'шешілді'}))} · ${esc(L({ru:'подсказка',kk:'кеңес'}))} ${x.maxHint}/3</span>`:x.hintsUsed?esc(x.hintsUsed):'-'}</td><td>${x.twin?(x.twin.independent?`<span class="badge">${esc(t('independent'))}</span>`:cell(x.twin.status)):'-'}</td><td>${esc(x.modes.map(modeName).join(', ')||'-')}</td></tr>`).join('')}</tbody></table></div></section>`
  :`<section class="card"><p>${esc(t('noAttempt'))}</p></section>`}
  <div class="grid2"><section class="card" aria-labelledby="rec-h"><div class="between"><h2 id="rec-h">${esc(t('recTitle'))}</h2><a class="btn small inline" href="#/passport?child=${encodeURIComponent(r.child.id)}">${icon('profile')}${esc(t('ppOpen'))}</a></div><p class="sub" style="margin-top:6px">${esc(t('recNote'))}</p>${recs?`<ul class="stack" style="list-style:none;margin:16px 0 0;padding:0">${recs}</ul>`:`<p style="margin-top:12px">${esc(t('recNone'))}</p>`}</section>
  <section class="card soft" aria-labelledby="o-h"><h2 id="o-h">${esc(t('obs'))}</h2>${r.observations.length?`<ul class="stack" style="margin:16px 0 0;padding-left:20px">${r.observations.map(o=>`<li>${esc(L(o.text))}</li>`).join('')}</ul>`:`<p style="margin-top:12px">${esc(t('obsNone'))}</p>`}
   ${r.quiz.length?`<h3 style="margin-top:20px">${esc(t('quiz'))}</h3><p>${r.quiz.filter(q=>q.evaluation==='correct').length} / ${new Set(r.quiz.map(q=>q.taskId)).size}</p>`:''}
   <p style="margin-top:20px"><a href="#/profiles?child=${encodeURIComponent(r.child.id)}">${esc(t('profiles'))}</a></p></section></div>`;
 $('#view').onclick=async e=>{const b=e.target.closest('[data-follow],[data-assign]');if(!b)return;
  if(b.dataset.assign){await ensureClass();assignDialog(t('asTitle'),'',()=>({lessonId:b.dataset.assign}));return;}
  followup(r,s.attemptId,b.dataset.follow,b.dataset.unequal==='1',b.dataset.reason,JSON.parse(b.dataset.evidence||'[]'),()=>viewReport(childId,attempt));};
}
async function ensureClass(){if(!classData)classData=await load('/api/v2/class');}
// Report numbers count up once ("Живо"); with reduced motion they are shown at once.
function countStats(){for(const el of document.querySelectorAll('#view .stat')){const m=/^(\d+)(.*)$/.exec(el.textContent.trim());if(!m)continue;el.innerHTML=`<span>0</span>${esc(m[2])}`;Motion.countUp(el.firstChild,0,Number(m[1]),{ms:500});}}
// "Assign the next example": ready examples first (one click "Назначить"), the full constructor behind "Настроить".
// The window closes after a clear confirmation; the same window cannot assign twice (busy guard + idempotent opId).
async function followup(r,attemptId,fromTask,unequal,reason,evidence,onDone){
 let d;try{d=await load(`/api/v2/followup-draft?child=${encodeURIComponent(r.child.id)}&attempt=${encodeURIComponent(attemptId)}&fromTask=${encodeURIComponent(fromTask)}${unequal?'&unequal=1':''}`);}catch(e){toast(e.data?.error||t('error'));return;}
 const name=kid(r.child.label);const options=d.options?.length?d.options:[{id:'v1',fields:d.fields,label:d.fields.title,prompt:d.fields.prompt}];
 const box=document.createElement('div');box.className='stack';
 const dlg=openDialog({title:t('followTitle',{n:name}),body:box,labelClose:t('close')});
 const ops={save:opId(),assign:opId()};let ed=null,done=false;
 box.innerHTML=`<p class="muted">${esc(t('fqNote',{n:name}))}</p>
  <fieldset class="fopts"><legend class="sr-only">${esc(t('fqPick'))}</legend>${options.map((o,i)=>`<label class="fopt"><input type="radio" name="fopt" value="${esc(o.id)}" ${i===0?'checked':''}><span><b>${esc(L(o.label))}</b><span class="muted">${esc(L(o.prompt))}</span></span></label>`).join('')}</fieldset>
  <p class="muted" style="font-size:.9375rem">${esc(t('recBasis',{r:reason}))}</p>
  <div class="stack" data-custom hidden id="fcustom"><p class="muted">${esc(t('followNote'))}</p><div class="field"><label for="basis">${esc(t('basis'))}</label><textarea id="basis" class="textarea" maxlength="300">${esc(reason)}</textarea></div><div data-ed></div></div>
  <p class="status-line" role="status" data-fst></p>
  <div class="row"><button type="button" class="btn primary inline" data-fassign>${esc(t('fqAssign'))}</button><button type="button" class="btn inline" data-fcustom aria-expanded="false" aria-controls="fcustom">${icon('edit')}${esc(t('fqCustom'))}</button><button type="button" class="btn inline" data-close>${esc(t('cancel'))}</button></div>`;
 const picked=()=>options.find(o=>o.id===box.querySelector('input[name=fopt]:checked')?.value)||options[0];
 box.querySelector('[data-fcustom]').onclick=e=>{const c=box.querySelector('[data-custom]');const open=c.hidden;c.hidden=!open;e.currentTarget.setAttribute('aria-expanded',String(open));
  if(open&&!ed)ed=editorForm(box.querySelector('[data-ed]'),picked().fields,{compact:true});if(open)box.querySelector('#basis')?.focus();};
 box.addEventListener('change',e=>{if(e.target.name==='fopt'&&ed){box.querySelector('[data-ed]').innerHTML='';ed=editorForm(box.querySelector('[data-ed]'),picked().fields,{compact:true});}ops.save=opId();});
 box.querySelector('[data-fassign]').onclick=async e=>{const st=box.querySelector('[data-fst]');const btn=e.currentTarget;if(done||btn.getAttribute('aria-busy')==='true')return;btn.setAttribute('aria-busy','true');
  const custom=!box.querySelector('[data-custom]').hidden&&ed;
  try{const sv=await api('/api/v2/templates',{body:{opId:ops.save,followup:true,sourceAttempt:attemptId,fields:custom?ed.fields():picked().fields}});if(!sv.ok){st.className='status-line warn';st.textContent=(sv.data?.errors||[]).join(', ')||sv.data?.error||t('error');btn.removeAttribute('aria-busy');return;}
   const as=await api('/api/v2/assign',{body:{opId:ops.assign,childIds:[r.child.id],taskVersionId:sv.data.taskVersion.id,kind:'followup',sourceAttempt:attemptId,evidence,reason:custom?box.querySelector('#basis').value:reason}});btn.removeAttribute('aria-busy');
   if(!as.ok){st.className='status-line warn';st.textContent=as.data?.error||t('error');return;}
   done=true;btn.disabled=true;const msg=t('fqDone',{n:name});st.className='status-line ok';st.textContent=msg;announce(msg);
   setTimeout(()=>{dlg.close();toast(msg);onDone?.();},900);}
  catch{btn.removeAttribute('aria-busy');st.className='status-line warn';st.textContent=t('error');}};
}
// ---------- F1 "Паспорт поддержки": one printable page "how to work with this student tomorrow" ----------
// Built only from the report (lesson events, support profile, help phrases, teacher notes). An observation, never a diagnosis.
const PP_PHRASE={help:['Помогите','Маған көмек керек'],break:['Нужен перерыв','Үзіліс керек'],not_understood:['Я не понял','Мен түсінбедім'],repeat:['Повтори','Қайтала'],example:['Покажи пример','Мысал көрсет'],too_loud:['Слишком громко','Тым қатты'],ready:['Я готов','Мен дайынмын']};
const PP_MODE={text:['Текст','Мәтін'],picture:['Картинка','Сурет'],audio:['Аудио','Аудио'],video:['Видео','Бейне'],model:['Модель','Модель']};
const pick2=a=>a?(lang()==='kk'?a[1]:a[0]):'';
async function viewPassport(childId){
 if(!childId){location.hash='#/students';return;}
 shell('profiles',t('ppTitle'),'',`<p class="muted">${esc(t('loading'))}</p>`);
 let r;try{r=await load('/api/v2/report?child='+encodeURIComponent(childId));}catch(e){$('#view').innerHTML=errBox(e);return;}
 const name=kid(r.child.label),s=r.summary,p=r.support||{},obs=r.observations||[];$('#page-h').textContent=t('ppTitleN',{n:name});
 const helps=[...obs.filter(o=>o.kind==='helpful_hint'||o.kind==='strength').map(o=>L(o.text))];
 if(s?.explanationModes?.length)helps.push(t('ppModes',{m:s.explanationModes.map(m=>pick2(PP_MODE[m])||m).join(', ')}));
 if(s?.sessionView)helps.push(t('ppView',{v:s.sessionView.toUpperCase()}));
 const how=[p.preset==='calm'?t('ppCalm'):null,p.motionIntensity==='low'?t('ppMotionLow'):null,p.sound===false?t('ppNoSound'):null,p.textSize&&p.textSize!=='normal'?t('ppBigText'):null,p.textOnly?t('ppTextOnly'):null,
  p.pace==='slow'?t('ppSlow'):null,p.repeatInstruction?t('ppRepeatInstr'):null,p.input==='drag'?t('ppDrag'):t('ppButtons'),p.hints==='offer'?t('ppHintOffer'):t('ppHintAsk')].filter(Boolean);
 const counts={};for(const h of r.help||[])counts[h.phrase]=(counts[h.phrase]||0)+1;
 const asks=Object.entries(counts).map(([k,n])=>t('ppTimes',{p:pick2(PP_PHRASE[k])||k,n}));if(s?.totals?.breaks)asks.push(t('ppBreaks',{n:s.totals.breaks}));
 asks.push(t('ppNoFault'));
 const rep=[...obs.filter(o=>o.kind==='repeat').map(o=>L(o.text)),...(r.recommendations?.[0]?[L(r.recommendations[0].action)]:[])];
 const notes=(r.notes||[]).slice(0,3).map(n=>`${new Date(n.createdAt).toLocaleDateString(lang()==='kk'?'kk-KZ':'ru-RU')}: ${n.text}`);
 const sec=(id,title,lines)=>lines.length?`<section class="pp-sec" aria-labelledby="pp-${id}"><h2 id="pp-${id}">${esc(title)}</h2><ul>${lines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:'';
 const today=new Date().toLocaleDateString(lang()==='kk'?'kk-KZ':'ru-RU');
 $('#view').innerHTML=`<div class="row pp-tools" style="gap:12px"><button type="button" class="btn primary inline" data-print>${icon('report')}${esc(t('ppPrint'))}</button><a class="btn inline" href="#/report?child=${encodeURIComponent(r.child.id)}">${icon('back')}${esc(t('ppBack'))}</a></div>
  <article class="card passport" data-passport aria-labelledby="pp-h"><header class="pp-head"><p class="pp-kicker">${esc(t('ppKicker'))}</p><h2 id="pp-h" class="pp-name">${esc(name)}</h2>
   <p class="muted">${esc(t('ppFor'))}${s?' '+esc(t('ppLesson',{t:L(s.topic)})):''}</p></header>
   <div class="pp-grid">${sec('help',t('ppHelps'),helps.length?helps:[t('ppHelpsNone')])}${sec('how',t('ppHow'),how)}${sec('ask',t('ppAsk'),asks)}${sec('rep',t('ppRepeat'),rep)}${sec('notes',t('ppNotes'),notes)}</div>
   <footer class="pp-foot"><p>${esc(t('ppFoot',{d:today}))}</p>${r.child.demo?`<p>${esc(t('ppDemo'))}</p>`:''}</footer></article>`;
 $('#view [data-print]').onclick=()=>window.print();
}
// ---------- profile (mockup 12) ----------
async function viewProfile(childId){
 if(!childId){await ensureClass();const c=classData.students[0];if(!c){shell('profiles',t('profiles'),'',`<section class="card"><p>${esc(t('noStudentsText'))}</p></section>`);return;}childId=c.id;}
 shell('profiles',t('profiles'),'',`<p class="muted">${esc(t('loading'))}</p>`);
 let r;try{r=await load('/api/v2/report?child='+encodeURIComponent(childId));}catch(e){$('#view').innerHTML=errBox(e);return;}
 await ensureClass().catch(()=>{});
 const p=r.support||{};$('#page-h').textContent=t('pTitle',{n:kid(r.child.label)});const sub=document.querySelector('.top .sub')||document.createElement('p');
 const other=(classData?.students||[]).length>1?`<label class="row" style="gap:10px"><span class="muted">${esc(t('students'))}</span><select class="select" data-pick style="width:auto">${classData.students.map(s=>`<option value="${esc(s.id)}" ${s.id===r.child.id?'selected':''}>${esc(kid(s.label))}</option>`).join('')}</select></label>`:'';
 const phrasesAll=[['not_understood',{ru:'Я не понял',kk:'Мен түсінбедім'}],['repeat',{ru:'Повтори',kk:'Қайтала'}],['example',{ru:'Покажи пример',kk:'Мысал көрсет'}],['help',{ru:'Мне нужна помощь',kk:'Маған көмек керек'}],['break',{ru:'Нужен перерыв',kk:'Үзіліс керек'}],['too_loud',{ru:'Слишком громко',kk:'Тым қатты'}],['ready',{ru:'Я готов продолжить',kk:'Жалғастыруға дайынмын'}]];
 const phrases=p.phrases||phrasesAll.map(x=>x[0]);
 $('#view').innerHTML=`<p class="row" style="justify-content:space-between"><span class="muted">${esc(r.child.demo?t('pSub'):t('pSubReal'))}</span><span class="row" style="gap:12px">${other}<a class="btn inline" href="#/passport?child=${encodeURIComponent(r.child.id)}">${icon('profile')}${esc(t('ppOpen'))}</a></span></p>
  <div class="grid2"><section class="card soft" aria-labelledby="cf-h"><h2 id="cf-h">${esc(t('comfort'))}</h2><p class="sub" style="margin-top:6px">${esc(t('comfortSub'))}</p><div class="stack" style="margin-top:20px;gap:18px;font-size:1.25rem">
   <p>${esc(t('iface',{v:p.preset?t(p.preset==='calm'?'calm':'standard'):t('notChosen')}))}</p><p>${esc(t('motion',{v:p.motionIntensity==='low'?t('min'):t('normal')}))}</p><p>${esc(t('voice',{v:p.mascotVoice?t('on'):t('off')}))}</p>${r.summary?.sessionView?`<p>${esc(t('session',{v:r.summary.sessionView.toUpperCase()}))}</p>`:''}</div></section>
  <section class="card" aria-labelledby="lo-h"><h2 id="lo-h">${esc(t('lobs'))}</h2><div class="stack" style="margin-top:20px;gap:16px;font-size:1.125rem;color:var(--muted)">${r.observations.map(o=>`<p>${esc(L({strength:{ru:'Сильная сторона: ',kk:'Күшті жағы: '},repeat:{ru:'',kk:''},helpful_hint:{ru:'',kk:''}}[o.kind]||{ru:'',kk:''}))}${esc(L(o.text))}</p>`).join('')||`<p>${esc(t('obsNone'))}</p>`}<p>${esc(t('lobsNote'))}</p></div></section></div>
  <section class="card stack" aria-labelledby="tn-h"><div><h2 id="tn-h">${esc(t('tnote'))}</h2><p class="sub" style="margin-top:6px">${esc(t('tnoteSub'))}</p></div><label class="sr-only" for="note">${esc(t('tnote'))}</label><textarea id="note" class="textarea" maxlength="1000" style="background:#F6F9F7"></textarea>
   <div class="row" style="justify-content:flex-end"><span class="status-line" role="status" data-nst></span><button type="button" class="btn primary inline" data-savenote style="min-width:280px">${esc(t('saveNote'))}</button></div>
   ${r.notes.length?`<ul class="rows">${r.notes.map(n=>`<li class="rowline" style="grid-template-columns:1fr auto"><span>${esc(n.text)}</span><span class="muted tnum">${new Date(n.createdAt).toLocaleDateString(lang()==='kk'?'kk-KZ':'ru-RU')}</span></li>`).join('')}</ul>`:''}</section>
  <section class="card stack" aria-labelledby="ph-h"><h2 id="ph-h">${esc(t('phrases'))}</h2><p class="sub">${esc(t('phrasesNote'))}</p><div class="seg">${phrasesAll.map(([id,l])=>`<button type="button" class="chip" data-phr="${id}" aria-pressed="${phrases.includes(id)}" ${['help','break'].includes(id)?'disabled':''}>${esc(L(l))}</button>`).join('')}</div>
   <div class="row"><span class="label" style="font-weight:800">${esc(t('pace'))}</span><div class="seg">${[['normal',t('normal')],['slow',t('slow')]].map(([v,l])=>`<button type="button" class="chip" data-pace="${v}" aria-pressed="${(p.pace||'normal')===v}">${esc(l)}</button>`).join('')}</div></div></section>
  <div class="between"><button type="button" class="btn inline" data-history style="min-width:260px">${icon('refresh')}${esc(t('history'))}</button><button type="button" class="btn inline" data-data style="min-width:300px">${icon('settings')}${esc(t('data'))}</button></div>`;
 const save=async change=>{const x=await api('/api/v2/support',{body:{child:r.child.id,...change}});toast(x.ok?t('saved'):t('error'));};
 $('#view').onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.phr){const set=new Set(phrases);set.has(b.dataset.phr)?set.delete(b.dataset.phr):set.add(b.dataset.phr);await save({phrases:[...set]});viewProfile(r.child.id);return;}
  if(b.dataset.pace){await save({pace:b.dataset.pace});viewProfile(r.child.id);return;}
  if(b.hasAttribute('data-savenote')){const text=$('#note').value.trim();const st=$('[data-nst]');if(!text){st.className='status-line warn';st.textContent=L({ru:'Пустая заметка не сохраняется',kk:'Бос жазба сақталмайды'});return;}const x=await api('/api/v2/notes',{body:{child:r.child.id,text,noteId:sid()}});st.className='status-line '+(x.ok?'ok':'warn');st.textContent=x.ok?t('noteSaved'):t('error');if(x.ok)setTimeout(()=>viewProfile(r.child.id),500);return;}
  if(b.hasAttribute('data-history')){openDialog({title:t('history'),labelClose:t('close'),body:`<ul class="stack" style="margin:0;padding-left:20px">${r.support?.updatedAt?`<li>${esc(L({ru:'Настройки изменены: ',kk:'Баптау өзгертілді: '}))}${new Date(r.support.updatedAt).toLocaleString(lang()==='kk'?'kk-KZ':'ru-RU')} · ${esc(r.support.updatedBy==='child'?L({ru:'учеником',kk:'оқушы'}):L({ru:'учителем',kk:'мұғалім'}))}</li>`:''}${r.notes.map(n=>`<li>${esc(L({ru:'Заметка: ',kk:'Жазба: '}))}${new Date(n.createdAt).toLocaleString(lang()==='kk'?'kk-KZ':'ru-RU')}</li>`).join('')}${(r.attempts||[]).length?`<li>${esc(L({ru:'Попыток урока: ',kk:'Сабақ әрекеттері: '}))}${r.attempts.length}</li>`:''}</ul>`});return;}
  if(b.hasAttribute('data-data')){const box=document.createElement('div');box.className='stack';box.innerHTML=`<button type="button" class="btn wide" data-exp>${icon('down')}${esc(t('exportBtn'))}</button><hr style="border:0;border-top:1px solid var(--border);width:100%"><p>${esc(t('deleteQ',{n:kid(r.child.label)}))}</p><label class="field"><span class="label">${esc(L({ru:'Метка ученика',kk:'Оқушы белгісі'}))}</span><input class="input" data-conf autocomplete="off"></label><button type="button" class="btn wide" data-del style="border-color:var(--error);color:var(--error)">${icon('trash')}${esc(t('deleteBtn'))}</button><p class="status-line" role="status" data-dst></p>`;
   const dd=openDialog({title:t('data'),body:box,labelClose:t('close')});
   box.onclick=async ev=>{const x=ev.target.closest('button');if(!x)return;
    if(x.hasAttribute('data-exp')){const data=await load('/api/v2/export?child='+encodeURIComponent(r.child.id));const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ayan-student-'+r.child.label.replace(/[^\p{L}\p{N}_-]+/gu,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
    if(x.hasAttribute('data-del')){const st=box.querySelector('[data-dst]');const y=await api('/api/v2/student/delete',{body:{child:r.child.id,confirm:box.querySelector('[data-conf]').value}});if(!y.ok){st.className='status-line warn';st.textContent=y.data?.error||t('error');return;}dd.close();toast(t('deleted'));classData=null;location.hash='#/students';}};
   return;}
 };
 $('[data-pick]')?.addEventListener('change',e=>{location.hash='#/profiles?child='+encodeURIComponent(e.target.value);});void sub;
}
// ---------- constructor ----------
function editorForm(host,init,{compact=false}={}){
 const f=JSON.parse(JSON.stringify(init));f.hints=(f.hints||[]).slice(0,3);while(f.hints.length<3)f.hints.push({ru:'',kk:''});f.modes=f.modes||['mark'];f.title=f.title||{ru:'Доля целого',kk:'Бүтіннің үлесі'};f.objective=f.objective||{ru:'',kk:''};f.prompt=f.prompt||{ru:'',kk:''};f.reviewStatus=f.reviewStatus||'draft';
 const pv={lang:'ru',motion:false,view:'2d',st:{}};
 function spec(){const d=Number(f.denominator),n=Number(f.numerator);const ctx=f.context;const shape=['strip','chocolate','rect'].includes(ctx)?'rect':'circle';
  const parts=f.partition==='unequal'?String(f.partsText??(f.parts||[]).join(',')).split(',').map(x=>Number(x.trim())).filter(x=>x>0):Array(d).fill(1);
  return {id:'t1',kind:'fraction',shape,context:ctx,parts,target:[n,d],modes:f.partition==='unequal'?f.modes.filter(m=>m!=='build'):f.modes,prompt:f.prompt,hints:f.hints.filter(h=>h.ru||h.kk)};}
 function fields(){const s=spec();return {title:f.title,objective:f.objective,prompt:f.prompt,context:f.context,denominator:Number(f.denominator),numerator:Number(f.numerator),partition:f.partition,parts:s.parts,hints:s.hints,modes:s.modes,reviewStatus:f.reviewStatus};}
 const bi=(key,label,max,area)=>`<div class="grid2" style="gap:12px">${['ru','kk'].map(l=>`<div class="field"><label for="f-${key}-${l}">${esc(label)} · ${l.toUpperCase()}</label>${area?`<textarea id="f-${key}-${l}" class="textarea" data-bi="${key}" data-l="${l}" maxlength="${max}" style="min-height:72px">${esc(f[key][l]||'')}</textarea>`:`<input id="f-${key}-${l}" class="input" data-bi="${key}" data-l="${l}" maxlength="${max}" value="${esc(f[key][l]||'')}">`}</div>`).join('')}</div>`;
 function draw(){
  const s=spec();const errs=Core.validateFractionTask(s);const errText={unreachable:L({ru:'Нельзя выбрать целыми частями ровно эту долю: картинка не совпадёт с ответом.',kk:'Дәл осы үлесті тұтас бөліктермен таңдау мүмкін емес: сурет жауаппен сәйкес келмейді.'}),target:L({ru:'Проверьте числитель и знаменатель (числитель меньше знаменателя, знаменатель от 2 до 12).',kk:'Алым мен бөлімді тексеріңіз.'}),parts:L({ru:'Части: от 2 до 12 весов, целые числа.',kk:'Бөліктер: 2-ден 12-ге дейін бүтін салмақ.'}),prompt_ru:L({ru:'Нет инструкции на русском.',kk:'Орысша нұсқау жоқ.'}),prompt_kk:L({ru:'Нет инструкции на казахском.',kk:'Қазақша нұсқау жоқ.'}),hints:L({ru:'Нужна хотя бы одна подсказка на обоих языках.',kk:'Кемінде бір кеңес екі тілде керек.'}),modes:L({ru:'Выберите способ ответа.',kk:'Жауап тәсілін таңдаңыз.'}),build_needs_equal_parts:L({ru:'«Собрать из кусков» только для равных частей.',kk:'«Кесектерден құрау» тек тең бөліктерге.'}),build_needs_den_parts:L({ru:'Для «собрать из кусков» частей должно быть столько же, сколько в знаменателе.',kk:'«Кесектерден құрау» үшін бөлік саны бөліммен бірдей болуы керек.'})};
  host.innerHTML=`<div class="${compact?'stack':'split'}" style="${compact?'':'grid-template-columns:minmax(0,1fr) minmax(0,480px)'}"><div class="stack">
   ${bi('title',t('fTitle'),80)}${bi('objective',t('fObjective'),300,true)}${bi('prompt',t('fPrompt'),240)}
   <div class="grid3" style="gap:12px;align-items:end"><div class="field"><label for="f-ctx">${esc(t('fContext'))}</label><select id="f-ctx" class="select" data-f="context">${['pizza','circle','cake','strip','chocolate','rect'].map(c=>`<option value="${c}" ${f.context===c?'selected':''}>${esc(t('ctx_'+c))}</option>`).join('')}</select></div>
    <div class="field"><label for="f-den">${esc(t('fDen'))}</label><input id="f-den" class="input" type="number" min="2" max="12" data-f="denominator" value="${esc(f.denominator)}"></div><div class="field"><label for="f-num">${esc(t('fNum'))}</label><input id="f-num" class="input" type="number" min="1" max="11" data-f="numerator" value="${esc(f.numerator)}"></div></div>
   <div class="field"><span class="label">${esc(t('fPartition'))}</span><div class="seg">${[['equal',t('equal')],['unequal',t('unequal')]].map(([v,l])=>`<button type="button" class="chip" data-part-mode="${v}" aria-pressed="${f.partition===v}">${esc(l)}</button>`).join('')}</div></div>
   ${f.partition==='unequal'?`<div class="field"><label for="f-parts">${esc(t('fParts'))}</label><input id="f-parts" class="input" data-f="partsText" value="${esc(f.partsText??(f.parts||[]).join(','))}"><span class="hint">${esc(L({ru:'Например 3,1,2,2: четверть - это часть с весом 2 из 8.',kk:'Мысалы 3,1,2,2: ширек - 8-ден 2 салмақты бөлік.'}))}</span></div>`:''}
   <div class="field"><span class="label">${esc(t('fModes'))}</span><div class="seg">${['mark','build','card'].map(m=>`<button type="button" class="chip" data-modebtn="${m}" aria-pressed="${f.modes.includes(m)}">${esc(t('m_'+m))}</button>`).join('')}</div></div>
   <fieldset class="stack" style="border:0;padding:0;margin:0;gap:10px"><legend class="label" style="font-weight:800;margin-bottom:6px">${esc(t('fHints'))}</legend>${f.hints.map((h,i)=>`<div class="grid2" style="gap:12px">${['ru','kk'].map(l=>`<input class="input" aria-label="${esc(t('fHints'))} ${i+1} ${l.toUpperCase()}" data-hint="${i}" data-l="${l}" maxlength="400" value="${esc(h[l]||'')}">`).join('')}</div>`).join('')}</fieldset>
   <div class="field"><span class="label">${esc(t('fStatus'))}</span><div class="seg">${[['draft',t('draft')],['teacher_checked',t('checked')]].map(([v,l])=>`<button type="button" class="chip" data-status="${v}" aria-pressed="${f.reviewStatus===v}">${esc(l)}</button>`).join('')}</div></div>
   <p class="${errs.length?'err':'status-line ok'}" role="status">${errs.length?esc(errs.map(e=>errText[e]||e).join(' ')):esc(t('geomOk'))+' '+esc(t('criterion',{n:f.numerator,d:f.denominator}))}</p></div>
   <section class="card soft stack" aria-labelledby="pv-h"><h3 id="pv-h">${esc(t('eye'))}</h3><p class="muted" style="font-size:.9375rem">${esc(t('eyeNote'))}</p>
    <div class="seg"><span class="badge grey">${icon('quiet')}${esc(t('pvSound'))}</span><button type="button" class="chip" data-pvmotion aria-pressed="${!pv.motion}">${esc(t('pvMotion'))}</button><button type="button" class="chip" data-pvlang>${esc(t('pvLang'))}: ${pv.lang.toUpperCase()}</button></div>
    <p class="muted" style="font-size:.9375rem">${esc(t('pvKbd'))}</p><div class="card" style="padding:16px" ${errs.length?'inert':''}><h4 style="font-size:1.125rem;margin-bottom:10px">${esc(f.prompt[pv.lang]||'…')}</h4><div data-pv></div></div><button type="button" class="btn primary" data-pvcheck ${errs.length?'disabled':''}>${esc(t('pvCheck'))}</button><p data-pvfb aria-live="polite"></p></section></div>`;
  if(!errs.length){const prev=lang();setLang(pv.lang);FW.mount(host.querySelector('[data-pv]'),{task:s,state:pv.st,onEvent:()=>{},decorative:pv.motion,initialView:'2d'});setLang(prev);}
 }
 host.oninput=e=>{const x=e.target;if(x.dataset.bi){f[x.dataset.bi][x.dataset.l]=x.value;return;}if(x.dataset.hint!==undefined){f.hints[Number(x.dataset.hint)][x.dataset.l]=x.value;return;}if(x.dataset.f){f[x.dataset.f]=x.value;}};
 host.onchange=e=>{const x=e.target;if(x.dataset.f||x.dataset.bi||x.dataset.hint!==undefined){pv.st={};const id=x.id;draw();if(id)host.querySelector('#'+id)?.focus();}};
 host.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.partMode){f.partition=b.dataset.partMode;if(f.partition==='unequal'&&!f.partsText)f.partsText='3,1,2,2';pv.st={};draw();host.querySelector(`[data-part-mode="${f.partition}"]`)?.focus();}
  if(b.dataset.modebtn){const m=b.dataset.modebtn;f.modes=f.modes.includes(m)?f.modes.filter(x=>x!==m):[...f.modes,m];pv.st={};draw();host.querySelector(`[data-modebtn="${m}"]`)?.focus();}
  if(b.dataset.status){f.reviewStatus=b.dataset.status;draw();}
  if(b.hasAttribute('data-pvmotion')){pv.motion=!pv.motion;draw();}
  if(b.hasAttribute('data-pvlang')){pv.lang=pv.lang==='ru'?'kk':'ru';draw();host.querySelector('[data-pvlang]')?.focus();}
  if(b.hasAttribute('data-pvcheck')){const s=spec();const a=(()=>{const st=pv.st;const mode=st.mode||s.modes[0];if(mode==='mark')return st.mark?.length?'mark:'+st.mark.join(','):'';if(mode==='build')return st.build?.length?'build:'+st.build.join(','):'';return st.card?'card:'+st.card:'';})();
   const fb=host.querySelector('[data-pvfb]');if(!a){fb.innerHTML=`<span class="feedback info">${icon('info')}${esc(L({ru:'Выберите ответ в preview.',kk:'Preview-да жауапты таңдаңыз.'}))}</span>`;return;}
   const r=await api('/api/v2/preview',{body:{fields:fields(),answer:a}});if(!r.ok){fb.innerHTML=`<span class="feedback warn">${esc(r.data?.error||t('error'))}</span>`;return;}
   const ok=r.data.evaluation==='correct';fb.innerHTML=`<span class="feedback ${ok?'ok':'try'}">${icon(ok?'check':'repeat')}${esc(Core.feedback(s,{valid:true,correct:ok,reason:r.data.reason},pv.lang))} · preview</span>`;}
 };
 draw();
 return {fields,spec};
}
async function viewEditor(){
 shell('editor',t('edTitle'),t('edSub'),`<p class="muted">${esc(t('loading'))}</p>`);
 if(!feat('constructor')){$('#view').innerHTML=`<section class="card stack"><p class="badge grey">${icon('lock')}${esc(t('planLocked'))}</p><a class="btn inline" href="/pricing" style="align-self:flex-start">${esc(t('tariffs'))}</a><p>${esc(L({ru:'Конструктор входит в школьный пилот. Базовый урок, отчёт и следующее задание из отчёта доступны на любом плане.',kk:'Құрастырушы мектеп пилотына кіреді. Негізгі сабақ, есеп және есептен келесі тапсырма кез келген жоспарда қолжетімді.'}))}</p><a class="btn primary inline" href="#/pilot">${esc(t('openPilot'))}</a></section>`;return;}
 let list=[];try{list=await load('/api/v2/templates');}catch{}await ensureClass().catch(()=>{});
 const base=list[0]?.content?{...list[0].content,denominator:list[0].content.target[1],numerator:list[0].content.target[0],partition:Core.isEqualPartition(list[0].content.parts)?'equal':'unequal',parts:list[0].content.parts}
  :{title:{ru:'Доля целого',kk:'Бүтіннің үлесі'},objective:{ru:'Выделять долю целого как выбранные равные части.',kk:'Бүтіннің үлесін таңдалған тең бөліктер ретінде көрсету.'},context:'pizza',denominator:4,numerator:1,partition:'equal',modes:['mark','build','card'],
   prompt:{ru:'Выбери одну четверть',kk:'Бір ширекті таңда'},hints:[{ru:'Сколько частей нужно выбрать?',kk:'Неше бөлік таңдау керек?'},{ru:'Посмотри: все части равные.',kk:'Қара: барлық бөлік тең.'},{ru:'Одна из четырёх равных частей.',kk:'Төрт тең бөліктің біреуі.'}]};
 const templateId=list[0]?.templateId||'';
 $('#view').innerHTML=`<div data-editor></div><section class="card stack" aria-labelledby="ver-h"><div class="between"><h2 id="ver-h">${esc(t('versions'))}</h2><button type="button" class="btn primary inline" data-savever>${esc(t('saveVersion'))}</button></div><p class="muted">${esc(t('pinned'))}</p><p class="status-line" role="status" data-vst></p>
  ${list.length?`<ul class="rows">${list.map(v=>`<li class="rowline" style="grid-template-columns:auto 1fr auto auto"><span class="badge tnum">${esc(t('version',{v:v.version}))}</span><span>${esc(L(v.content.prompt))} · ${esc(t('ctx_'+v.content.context))} · ${v.content.target.join('/')}</span><span class="badge ${v.content.reviewStatus==='teacher_checked'?'':'sand'}">${esc(v.content.reviewStatus==='teacher_checked'?t('checked'):t('draft'))}</span><button type="button" class="btn small inline" data-assignver="${esc(v.id)}">${esc(t('assignVersion'))}</button></li>`).join('')}</ul>`:''}</section>`;
 const ed=editorForm($('[data-editor]'),base);let saveOp=opId();
 $('#view').addEventListener('click',async e=>{const b=e.target.closest('[data-savever],[data-assignver]');if(!b)return;
  if(b.hasAttribute('data-savever')){const st=$('[data-vst]');const r=await api('/api/v2/templates',{body:{opId:saveOp,templateId,fields:ed.fields()}});if(!r.ok){st.className='status-line warn';st.textContent=(r.data?.errors||[]).join(', ')||r.data?.error||t('error');return;}saveOp=opId();st.className='status-line ok';st.textContent=t('version',{v:r.data.taskVersion.version})+' · '+t('saved');setTimeout(viewEditor,700);}
  if(b.dataset.assignver)assignDialog(t('assignVersion'),`<p class="muted">${esc(t('pinned'))}</p>`,()=>({taskVersionId:b.dataset.assignver}));});
}
// ---------- library ----------
async function viewLibrary(){
 shell('library',t('libTitle'),t('libSub'),`<p class="muted">${esc(t('loading'))}</p>`);
 let cat;try{cat=await load('/api/v2/catalog');}catch(e){$('#view').innerHTML=errBox(e);return;}
 const full=await Promise.all(cat.lessons.map(l=>load('/api/v2/lesson?id='+l.lessonId).catch(()=>null)));
 $('#view').innerHTML=full.filter(Boolean).map(l=>`<section class="card stack" aria-labelledby="lb-${l.lessonId}"><div class="between"><h2 id="lb-${l.lessonId}" style="font-size:1.25rem">${esc(L(l.topic))} · <span class="muted" lang="${lang()==='kk'?'ru':'kk'}">${esc(lang()==='kk'?l.topic.ru:l.topic.kk)}</span></h2><span class="row" style="gap:8px"><span class="badge sand">${esc(t('pending'))}</span><span class="badge grey tnum">v${l.version}</span></span></div>
  <dl class="kv"><dt>${esc(t('objective'))}</dt><dd>${esc(L(l.objectiveDraft))}</dd><dt>${esc(t('criteria'))}</dt><dd>${esc(L(l.successCriteria))}</dd><dt>${esc(t('materials'))}</dt><dd>${esc((l.materials?.[lang()]||[]).join(', '))}</dd><dt>lessonId</dt><dd class="tnum">${esc(l.lessonId)} · curriculumSource: ${esc(String(l.curriculumSource))}</dd></dl></section>`).join('')+
  `<section class="card stack" aria-labelledby="md-h"><h2 id="md-h">${esc(t('mediaTitle'))}</h2><p class="muted">${esc(t('mediaNote'))}</p><p><span class="badge sand">${esc(t('videoReview'))}</span></p><div data-video style="max-width:720px"></div><div class="row"><button type="button" class="btn inline" data-adapter>${esc(t('testAdapter'))}</button></div><pre class="card" data-adout style="white-space:pre-wrap;font-size:.875rem;display:none"></pre></section>`;
 Video.mount($('[data-video]'),{videoId:'M01',profile:{captions:true},childApi:false});
 $('[data-adapter]').onclick=async()=>{const r=await api('/api/v2/media/job',{body:{approvedScriptId:'M01',scriptVersion:'0.1.0',locale:lang(),provider:'elevenLabs'}});const o=$('[data-adout]');o.style.display='block';o.textContent=JSON.stringify(r.data,null,2);};
}
// ---------- pilot ----------
async function viewPilot(){
 shell('pilot',t('piTitle'),t('piSub'),`<p class="muted">${esc(t('loading'))}</p>`);
 let p;try{p=await load('/api/v2/pilot');}catch(e){$('#view').innerHTML=errBox(e);return;}
 const e=p.entitlement,active=e.status==='active';const date=ms=>new Date(ms).toLocaleDateString(lang()==='kk'?'kk-KZ':'ru-RU');
 $('#view').innerHTML=`<p class="demo-banner">${esc(t('testMode'))}</p>
  <section class="card soft between" aria-labelledby="cur-h"><div><h2 id="cur-h">${esc(t('current'))}: ${esc(L(e.label))}</h2><p class="sub" style="margin-top:8px">${esc(t('status'))}: ${esc(t('es_'+(e.status||'none')))}${active&&e.expires?' · '+esc(t('until',{d:date(e.expires)})):''} · ${esc(p.org.name)}</p></div>
   ${p.canManage?(active?`<div class="row"><button type="button" class="btn inline" data-stop="cancel">${esc(t('cancelPilot'))}</button><button type="button" class="btn inline" data-stop="expire">${esc(t('endPilot'))}</button></div>`:''):`<p class="muted" style="max-width:320px">${esc(t('onlyAdmin'))}</p>`}</section>
  <div class="grid2">${p.plans.map(pl=>`<section class="card stack" aria-labelledby="pl-${pl.id}"><h2 id="pl-${pl.id}">${esc(L(pl.label))}${pl.trialDays?` · <span class="muted">${pl.trialDays} ${esc(L({ru:'дней, тест',kk:'күн, тест'}))}</span>`:''}</h2><h3 style="font-size:1rem">${esc(t('features'))}</h3><ul style="margin:0;padding-left:20px">${pl.features.map(f=>`<li>${esc(t('f_'+f))}</li>`).join('')}</ul>
   ${pl.id!=='free'&&p.canManage&&!active?`<div class="field" style="margin-top:auto"><span class="label">${esc(t('simulate'))}</span><div class="seg" role="radiogroup">${['success','fail','cancel','pending'].map((s,i)=>`<button type="button" class="chip" role="radio" data-sim="${s}" aria-checked="${i===0}" aria-pressed="${i===0}">${esc(t('sim_'+s))}</button>`).join('')}</div></div><button type="button" class="btn primary" data-start="${pl.id}">${esc(t('startPilot'))}</button>`:''}</section>`).join('')}</div>
  <p class="muted">${esc(t('endsNote'))}</p><p class="status-line" role="status" data-pst></p>
  ${p.orders.length?`<section class="card" aria-labelledby="or-h"><h2 id="or-h">${esc(t('orders'))}</h2><ul class="rows">${p.orders.map(o=>`<li class="rowline" style="grid-template-columns:1fr 1fr 1fr"><span class="tnum">${esc(date(o.createdAt))}</span><span>${esc(o.plan)} · ${esc(o.mode)}</span><span class="badge ${o.status==='succeeded'?'':'sand'}">${esc(t('os_'+o.status))}</span></li>`).join('')}</ul></section>`:''}`;
 let sim='success',key=opId();
 $('#view').onclick=async ev=>{const b=ev.target.closest('button');if(!b)return;const st=$('[data-pst]');
  if(b.dataset.sim){sim=b.dataset.sim;key=opId();document.querySelectorAll('[data-sim]').forEach(x=>{x.setAttribute('aria-checked',String(x===b));x.setAttribute('aria-pressed',String(x===b));});}
  if(b.dataset.start){if(b.getAttribute('aria-busy')==='true')return;b.setAttribute('aria-busy','true');const r=await api('/api/v2/pilot/order',{body:{idempotencyKey:key,planId:b.dataset.start,simulate:sim}});b.removeAttribute('aria-busy');
   if(!r.ok){st.className='status-line warn';st.textContent=r.data?.error||t('error');return;}st.className='status-line '+(r.data.order.status==='succeeded'?'ok':'warn');st.textContent=t('os_'+r.data.order.status)+(r.data.replay?' · '+t('replay'):'');me=(await api('/api/v2/me')).data;setTimeout(viewPilot,900);}
  if(b.dataset.stop){const r=await api('/api/v2/pilot/stop',{body:{reason:b.dataset.stop}});st.textContent=r.ok?t('saved'):(r.data?.error||t('error'));me=(await api('/api/v2/me')).data;setTimeout(viewPilot,600);}};
}
async function viewAdmin(){
 shell('admin',t('adTitle'),t('adSub'),`<p class="muted">${esc(t('loading'))}</p>`);
 let o;try{o=await load('/api/v2/admin/overview');}catch(e){$('#view').innerHTML=errBox(e);return;}
 $('#view').innerHTML=`<section class="card"><h2>${esc(o.org.name)}</h2><p class="sub" style="margin-top:6px">${esc(L(o.entitlement.label))} · ${esc(t('es_'+o.entitlement.status))}</p></section><div class="grid2">${[[t('teachers'),o.teachers],[t('studentsN'),o.students],[t('assignmentsN'),o.assignments],[t('completedN'),o.completed]].map(([k,v])=>`<section class="card"><h2 style="font-size:1.125rem">${esc(k)}</h2><p class="stat">${esc(v)}</p></section>`).join('')}</div><a class="btn primary inline" href="#/pilot">${esc(t('pilot'))}</a>`;
}
async function aiDraft(form){const out=$('[data-aiout]');const topic=form.querySelector('#ai-topic').value.trim();if(!topic)return;const btn=form.querySelector('button');btn.setAttribute('aria-busy','true');
 const r=await api('/api/v2/ai/draft',{body:{topic,lang:lang()}}).catch(()=>null);btn.removeAttribute('aria-busy');if(!r||!r.ok){out.innerHTML=`<p class="err" style="margin-top:12px">${esc(t('error'))}</p>`;return;}
 if(r.data.source==='none'){out.innerHTML=`<p class="feedback info" style="margin-top:16px">${icon('info')}${esc(t('ai_none',{list:r.data.available.map(a=>L(a.topic)).join(', ')}))}</p>`;return;}
 const d=r.data.draft;out.innerHTML=`<div class="stack" style="margin-top:18px"><p class="badge sand" style="align-self:flex-start">${esc(r.data.source==='llm'?t('ai_llm'):t('ai_template'))}</p><h3>${esc(L(d.topic))}</h3>
  <ol class="draft-steps">${d.steps.map(s=>`<li><b>${esc(stageName(s.stage))}</b><span>${esc(L(s.text))}<br><span class="muted" style="font-size:.9375rem">${esc(lang()==='kk'?s.text.ru:s.text.kk)}</span></span></li>`).join('')}</ol>
  ${d.tasks?.length?`<h3 style="margin-top:8px">${esc(t('ai_tasks'))}</h3><ul style="margin:0;padding-left:22px">${d.tasks.map(x=>`<li>${esc(L(x))}</li>`).join('')}</ul>`:''}<a class="btn inline" href="#/editor" style="align-self:flex-start">${esc(t('ai_editor'))}</a></div>`;}
document.addEventListener('submit',e=>{const f=e.target.closest('[data-aiform]');if(!f)return;e.preventDefault();aiDraft(f);});
// ---------- global ----------
document.addEventListener('click',async e=>{const b=e.target.closest('button,a');if(!b)return;
 if(b.dataset.menu!==undefined){const n=$('#nav');const open=!n.classList.contains('open');n.classList.toggle('open',open);b.setAttribute('aria-expanded',String(open));return;}
 if(b.hasAttribute('data-lang')){setLang(lang()==='kk'?'ru':'kk');route();return;}
 if(b.hasAttribute('data-logout')){await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.href='/';return;}
 if(b.hasAttribute('data-add')){const box=document.createElement('form');box.className='stack';box.innerHTML=`<div class="field"><label for="nm">${esc(t('name'))}</label><input id="nm" class="input" maxlength="40" required autofocus><span class="hint">${esc(t('nameHint'))}</span></div>
   <div class="field"><label class="row" style="gap:12px;align-items:flex-start;min-height:48px"><input type="checkbox" name="consent" required aria-describedby="consent-err" style="width:22px;height:22px;margin-top:2px;accent-color:var(--primary)"><span>${esc(t('consentLbl'))} <a href="/legal/parental-consent" target="_blank" rel="noopener">${esc(t('consentLink'))}</a></span></label><p class="err" id="consent-err" data-consent-err role="alert"></p></div>
   <button class="btn primary inline">${esc(t('create'))}</button>`;
  const d=openDialog({title:t('add'),body:box,labelClose:t('close')});box.onsubmit=async ev=>{ev.preventDefault();const er=box.querySelector('[data-consent-err]');er.textContent='';
   const r=await api('/api/children',{body:{label:box.querySelector('#nm').value,consent:{confirmed:box.querySelector('[name=consent]').checked,basis:'guardian_consent'}}});
   if(r.ok){d.close();viewStudents();return;}er.textContent=r.data?.code==='child_consent_required'?t('consentErr'):(r.data?.error||t('error'));};return;}
 if(b.dataset.invite){const r=await api('/api/invite',{body:{child:b.dataset.invite}});if(!r.ok)return toast(t('error'));openDialog({title:t('invite'),labelClose:t('close'),body:`<div class="stack"><p>${esc(t('inviteText'))}</p><p class="card tnum" style="font-size:1.25rem;font-weight:800;word-break:break-all">${esc(r.data.code)}</p><p class="muted" style="word-break:break-all">${esc(r.data.url)}</p></div>`});return;}
 if(b.dataset.parent){const r=await api('/api/parent/invite',{body:{child:b.dataset.parent}});if(!r.ok)return toast(t('error'));openDialog({title:t('parentLink'),labelClose:t('close'),body:`<div class="stack"><p>${esc(t('parentText'))}</p><p class="card" style="word-break:break-all">${esc(r.data.url)}</p></div>`});return;}
 if(b.dataset.revoke){const box=document.createElement('div');box.className='stack';box.innerHTML=`<p>${esc(t('revokeQ',{n:b.dataset.label}))}</p><div class="row"><button type="button" class="btn primary inline" data-yes>${esc(t('confirm'))}</button><button type="button" class="btn inline" data-close>${esc(t('cancel'))}</button></div>`;
  const d=openDialog({title:t('revoke'),body:box,labelClose:t('close')});box.querySelector('[data-yes]').onclick=async()=>{const r=await api('/api/children/revoke',{body:{child:b.dataset.revoke}});d.close();toast(r.ok?t('saved'):t('error'));};return;}
 if(b.dataset.seen){await api('/api/v2/help/seen',{body:{id:b.dataset.seen}});viewStudents();return;}
 if(b.dataset.assign&&!b.closest('#view [data-follow]')&&location.hash.startsWith('#/assign')){await ensureClass();assignDialog(t('asTitle')+' · '+b.closest('section').querySelector('h2').textContent,'',()=>({lessonId:b.dataset.assign}));return;}
});
boot();
