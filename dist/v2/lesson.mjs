// Visual learning path: goal -> explanation -> example -> practice -> check & finish.
// State that must survive reload: attemptId (pinned lesson version), stage, task index, draft answers, pending submissions.
// It is written to the device first, then synced with a revision. A network problem is a save state, never "wrong".
import {esc,icon,L,lang,sid,uuid,announce,toast,api,openDialog,lantern} from './ui.mjs';
import * as Motion from './motion.mjs';
import * as Fig from './figures.mjs';
import * as FW from './fraction-world.mjs';
import * as Tasks from './tasks.mjs';
import * as Video from './video.mjs';
const Core=window.AyanCore;
// UI state is stored as a JSON snapshot. To merge two tabs without one erasing the other, a tab never rewrites the server copy
// blindly: it computes what IT changed since the last sync (diffUi) and applies only that on top of the newest server copy.
const jclone=o=>JSON.parse(JSON.stringify(o||{}));
// the summary heading already says "Урок завершён": the lesson text does not repeat it (У12)
const withoutHead=(s,h)=>s.startsWith(h)?s.slice(h.length).replace(/^[.!\s]+/,''):s;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// "tasks" is merged field by field (so tab A's selected part survives tab B changing the view of the same task);
// "pending" entry by entry; every other key as a whole value.
function diffUi(base,cur){const out={};for(const k of Object.keys(cur||{})){
 if(k==='tasks'){const set={},del={};for(const id of Object.keys(cur.tasks||{})){const a=(base.tasks||{})[id]||{},b=cur.tasks[id]||{};const f={};for(const key of Object.keys(b))if(!same(a[key],b[key]))f[key]=b[key];const gone=Object.keys(a).filter(key=>!(key in b));if(Object.keys(f).length||gone.length){set[id]=f;del[id]=gone;}}
  if(Object.keys(set).length)out.tasks={set,del};}
 else if(k==='pending'){const set={};for(const id of Object.keys(cur.pending||{}))if(!same((base.pending||{})[id],cur.pending[id]))set[id]=cur.pending[id];const del=Object.keys(base.pending||{}).filter(id=>!(id in (cur.pending||{})));if(Object.keys(set).length||del.length)out.pending={set,del};}
 else if(!same(base[k],cur[k]))out[k]={set:cur[k]};}return out;}
function applyPatch(base,patch){const o=jclone(base);for(const k of Object.keys(patch)){
 if(k==='tasks'){o.tasks??={};for(const id of Object.keys(patch.tasks.set)){o.tasks[id]={...(o.tasks[id]||{}),...patch.tasks.set[id]};for(const key of patch.tasks.del[id]||[])delete o.tasks[id][key];}}
 else if(k==='pending'){o.pending??={};for(const id of Object.keys(patch.pending.set))o.pending[id]=patch.pending.set[id];for(const id of patch.pending.del)delete o.pending[id];}
 else o[k]=patch[k].set;}return o;}
export const STAGES=['goal','explanation','example','practice','check'];
const T={
 goal:['Цель','Мақсат'],explanation:['Объяснение','Түсіндіру'],example:['Пример','Мысал'],practice:['Практика','Практика'],check:['Завершение','Аяқтау'],
 path:['Мой маршрут · {t}','Менің бағытым · {t}'],stepOf:['Шаг {n} из 5','5 қадамның {n}-і'],left:['Осталось {n}','Қалды: {n}'],leftOne:['Остался 1 шаг','1 қадам қалды'],leftN:['Осталось {n} шага','{n} қадам қалды'],last:['Последний шаг','Соңғы қадам'],
 nextIs:['Далее: {s}','Келесі: {s}'],allSteps:['Все шаги маршрута','Бағыттың барлық қадамы'],
 start:['Начать','Бастау'],back:['Назад','Артқа'],toPath:['К маршруту','Бағытқа'],next:['Дальше','Әрі қарай'],toExample:['К примеру','Мысалға'],toPractice:['К практике','Практикаға'],tryMyself:['Попробовать самому','Өзім байқап көремін'],
 helper:['Помощник рядом','Көмекші қасыңда'],helperSub:['Можно попросить повторить.','Қайталауды сұрауға болады.'],repeatExpl:['Повтори объяснение','Түсіндірмені қайтала'],
 howTitle:['Как объяснить?','Қалай түсіндірейін?'],howSub:['Одна тема · один урок · прогресс сохраняется при переключении.','Бір тақырып · бір сабақ · ауысқанда прогресс сақталады.'],
 m_text:['Текст','Мәтін'],m_picture:['Картинка','Сурет'],m_audio:['Аудио','Аудио'],m_video:['Видео','Бейне'],m_model:['Модель','Модель'],
 noAudio:['Озвучка на казахском пока не записана. Текст объяснения ниже.','Қазақша дыбыстау әлі жазылмаған. Түсіндірме мәтіні төменде.'],noAudioAny:['Озвучка этой темы пока не записана. Можно включить голос устройства в настройках или читать текст.','Бұл тақырыптың дыбысы әлі жазылмаған. Баптауда құрылғы дауысын қосуға немесе мәтінді оқуға болады.'],
 audioPlay:['Слушать объяснение','Түсіндірмені тыңдау'],audioStop:['Остановить','Тоқтату'],audioNote:['Запись русской озвучки. Звук только по кнопке.','Орысша дыбыстың жазбасы. Дыбыс тек түймемен.'],
 noVideo:['Видео для этой темы пока не создано. Посмотри картинку или модель.','Бұл тақырыпқа бейне әлі жасалмаған. Суретті немесе модельді қара.'],showPicture:['Показать картинку','Суретті көрсету'],
 modelHelp:['Нажимай на части: модель не проверяет, она помогает посмотреть.','Бөліктерді бас: модель тексермейді, қарауға көмектеседі.'],modelNo:['Для этой темы модель не нужна. Посмотри картинку.','Бұл тақырыпқа модель керек емес. Суретті қара.'],
 modelSel:['Выбрано {n} из {d} частей.','{d} бөліктің {n} бөлігі таңдалды.'],
 exampleTitle:['Разберём пример','Мысалды талдайық'],
 practiceTitle:['Практика · задание {n} из {m}','Практика · {m} тапсырманың {n}-і'],checkTitle:['Новый пример · {n} из {m}','Жаңа мысал · {m} ішінен {n}'],twinTitle:['Новый самостоятельный пример','Жаңа өз бетімен мысал'],
 howTo:['Как управлять?','Қалай басқарамын?'],howTo1:['Нажми на нужную часть.','Керекті бөлікті бас.'],howTo2:['Или выбери её кнопкой.','Немесе оны түймемен таңда.'],howTo3:['Tab - переход.','Tab - ауысу.'],howTo4:['Enter или Space - выбор.','Enter немесе Space - таңдау.'],
 checkBox:['Проверь свой выбор','Таңдауыңды тексер'],timerOff:['Таймер выключен','Таймер өшірулі'],checkBtn:['Проверить ответ','Жауапты тексеру'],checking:['Проверяем…','Тексеріп жатырмыз…'],hintBtn:['Показать подсказку','Кеңесті көрсету'],moreHint:['Ещё подсказка','Тағы кеңес'],
 hintL:['Подсказка {n} из 3','{n}-кеңес, барлығы 3'],editAnswer:['Изменить ответ','Жауапты өзгерту'],thenTitle:['Что будет потом?','Содан кейін не болады?'],thenSub:['Можно выбрать, что сделать после урока. Это не обязательно.','Сабақтан кейін не істейтініңді таңдауға болады. Міндетті емес.'],then_play:['Игра','Ойын'],then_watch:['Мультфильм','Мультфильм'],then_free:['Тренировка','Жаттығу'],then_rest:['Отдых','Демалыс'],firstThen:['Сначала: {a} → Потом: {b}','Алдымен: {a} → Содан кейін: {b}'],nowThen:['Теперь: {b}','Енді: {b}'],taskIs:['Задание: {t}','Тапсырма: {t}'],totalCap:['Всего огоньков на тропинке: {n}','Соқпақтағы барлық шырақ: {n}'],reset:['Сбросить выбор','Таңдауды тазалау'],resend:['Повторить отправку','Қайта жіберу'],tryAgain:['Попробовать ещё','Тағы байқау'],
 newExample:['Новый пример','Жаңа мысал'],skipTwin:['Дальше без примера','Мысалсыз әрі қарай'],nextTask:['Следующее задание','Келесі тапсырма'],toCheck:['К новым примерам','Жаңа мысалдарға'],
 empty:['Сначала выбери ответ. Это не ошибка.','Алдымен жауапты таңда. Бұл қате емес.'],
 netFail:['Не удалось сохранить. Ответ остаётся на устройстве и отправится сам, когда связь вернётся.','Сақтау мүмкін болмады. Жауап құрылғыда қалады, байланыс оралғанда өзі жіберіледі.'],
 savedLocal:['Сохранено на устройстве, ждёт синхронизации','Құрылғыда сақталды, синхрондауды күтуде'],savedServer:['Сохранено','Сақталды'],
 offerHint:['Две попытки не получились. Можно открыть подсказку - это не влияет на оценку.','Екі әрекет болмады. Кеңесті ашуға болады - бағаға әсер етпейді.'],noThanks:['Не нужно','Керек емес'],
 completed:['Урок завершён','Сабақ аяқталды'],summary:['Решено заданий: {n} из {m}. Подсказки помогают учиться и не снижают результат.','Шешілген тапсырма: {m} ішінен {n}. Кеңестер оқуға көмектеседі және нәтижені төмендетпейді.'],
 home:['На главную','Басты бетке'],watch:['Смотреть видео','Бейне көру'],nextLesson:['Следующее задание','Келесі тапсырма'],
 demoMark:['Демо · цель программы требует проверки','Демо · бағдарлама мақсаты тексеруді қажет етеді'],materials:['Материалы','Материалдар'],criteria:['Критерий успеха','Табыс критерийі'],
 versionLabel:['Версия урока {v}','Сабақ нұсқасы {v}'],stageSaved:['Этап сохранён','Кезең сақталды'],
 exit:['Выйти из урока. Прогресс сохранится.','Сабақтан шығу. Прогресс сақталады.'],planTitle:['Что будет на уроке','Сабақта не болады'],
 lit:['Огонёк зажжён','Шырақ жанды'],notYet:['Пока не подошло','Әзірге сәйкес келмеді'],emptyT:['Сначала выбери ответ','Алдымен жауапты таңда'],savedT:['Ответ остался на устройстве','Жауап құрылғыда қалды'],
 other:['Другой способ','Басқа тәсіл'],checkShort:['Проверить','Тексеру'],hintShort:['Подсказка','Кеңес'],embersAria:['Огоньков: {n}','Шырақ: {n}'],
 earnedCap:['За урок зажжено огоньков:','Сабақта жанған шырақ:'],left0:['Фонарик полный: все назначенные уроки пройдены.','Шам толы: барлық тағайындалған сабақ өтілді.'],
 left1:['Остался один урок до полного фонарика.','Толық шамға дейін бір сабақ қалды.'],leftN:['До полного фонарика осталось уроков: {n}.','Толық шамға дейін {n} сабақ қалды.'],nextLessonBtn:['Следующий урок','Келесі сабақ'],
 completedLocked:['Этот урок уже завершён. Можно пересмотреть объяснение и примеры.','Бұл сабақ аяқталды. Түсіндірме мен мысалдарды қайта қарауға болады.']
};
const t=(k,v)=>{let s=(T[k]||[k,k])[lang()==='kk'?1:0];if(v)for(const x in v)s=s.replaceAll('{'+x+'}',v[x]);return s;};
export const stageName=s=>t(s);

// ctx: {host, assignmentId, lesson, attempt, profile, user, outbox, store, mascot(state), onEvent, go(route), sayText(text), setHeader}
export function mount(ctx){
 const {host,lesson,store,outbox}=ctx;const key='att.'+ctx.assignmentId;
 const local=store.get(key)||{};const srv=ctx.attempt;
 // Server is authoritative for submissions and completion; device copy wins for drafts if it is newer.
 // The newer copy wins. If the server copy is newer (another tab or device wrote after this device did), start from it and keep
 // only what this device had not sent yet: pending submissions and tasks that are still being sent or failed to send.
 const newerOnServer=(srv?.revision||0)>(local.revision||0);
 const mergedUi=(()=>{if(!newerOnServer)return {...(srv?.ui||{}),...(local.ui||{})};const o=jclone(srv?.ui);const lu=local.ui||{};
  o.pending={...(o.pending||{}),...(lu.pending||{})};o.tasks=o.tasks||{};for(const [id,t] of Object.entries(lu.tasks||{}))if(t&&['pending','failed'].includes(t.status))o.tasks[id]=t;return o;})();
 const S={attemptId:srv?.id||local.attemptId||sid(),revision:Math.max(srv?.revision||0,local.revision||0),stage:pickStage(srv,local),ui:mergedUi,completed:srv?.state==='completed',subs:srv?.submissions||[],base:jclone(srv?.ui)};
 S.ui.tasks??={};const completedAtMount=S.completed;S.ui.explMode??='text';S.ui.taskIndex??=0;S.ui.checkIndex??=0;S.ui.pending??={};
 function pickStage(a,b){const ia=STAGES.indexOf(a?.stage||'goal'),ib=STAGES.indexOf(b?.stage||'goal');return STAGES[Math.max(ia,ib,0)];}
 let widget=null,player=null,dead=false,saveTimer=null,audio=null,result={};
 const practice=lesson.practice||lesson.tasks.filter(x=>x.role==='core').map(x=>x.id),checks=lesson.checkTasks||[];
 const taskById=id=>Core.findTask(lesson.tasks,id);
 const outcome=id=>{const list=S.subs.filter(s=>s.taskId===id);return list.some(s=>s.evaluation==='correct')?'correct':list.length?'incorrect':null;};
 const tstate=id=>(S.ui.tasks[id]??={});
 function persist(){store.set(key,{attemptId:S.attemptId,revision:S.revision,stage:S.stage,ui:S.ui});}
 // ---- server sync ----
 async function ensureAttempt(){
  if(srv&&srv.id===S.attemptId)return;
  const r=await outbox.send('attempt:'+S.attemptId,'/api/v2/child/attempt',{attemptId:S.attemptId,assignmentId:ctx.assignmentId,locale:lang()});
  if(r.sent&&r.r.ok){const a=r.r.data;if(a.id!==S.attemptId){S.attemptId=a.id;}S.revision=Math.max(S.revision,a.revision||0);S.subs=a.submissions||S.subs;S.completed=a.state==='completed';persist();}
 }
 function save(paused){persist();clearTimeout(saveTimer);saveTimer=setTimeout(()=>sync(paused),paused!==undefined?0:500);}
 async function sync(paused){
  for(let round=0;round<3;round++){
   const sent=jclone(S.ui),body={attemptId:S.attemptId,revision:S.revision,stage:S.stage,ui:sent,...(paused!==undefined?{paused}:{})};
   let r;try{r=await api('/api/v2/child/state',{body});}catch(e){ctx.setSync?.('local');return;}
   if(r.ok){S.revision=r.data.revision;S.base=sent;persist();ctx.setSync?.('server');return;}
   const a=r.data?.attempt;
   if(r.status===409&&a){
    if(a.state==='completed'){S.completed=true;S.subs=a.submissions;persist();return;}
    // Stale revision: take the server copy as the base and re-apply only this tab's own changes, then write again.
    const mine=diffUi(S.base||{},S.ui);S.revision=a.revision;S.stage=pickStage(a,{stage:S.stage});S.base=jclone(a.ui);S.ui=applyPatch(a.ui,mine);persist();continue;}
   return;
  }
 }
 const ev=(type,payload,taskId)=>ctx.onEvent(type,payload,{attemptId:S.attemptId,taskId});

 // ---- rendering: focus mode (trail on top, one card, footer with help and the main button) ----
 const mlevel=()=>document.documentElement.dataset.motion||'full';
 const solvedIn=list=>list.filter(id=>outcome(id)==='correct').length;
 function stageProgress(k){const i=STAGES.indexOf(S.stage),st=STAGES[k];
  if(S.completed||k<i)return 1;if(k>i)return 0;
  if(st==='practice')return practice.length?solvedIn(practice)/practice.length:0;
  if(st==='check')return checks.length?solvedIn(checks)/checks.length:(S.ui.finishedView?1:0);
  return .12;}
 const lessonEmbers=()=>new Set(S.subs.filter(x=>x.evaluation==='correct').map(x=>x.taskId)).size;
 const reachable=s=>STAGES.indexOf(s)<=Math.max(STAGES.indexOf(S.stage),STAGES.indexOf(S.ui.maxStage||'goal'));void reachable;
 function topBar(){
  const i=STAGES.indexOf(S.stage);
  const segs=STAGES.map((st,k)=>{const p=stageProgress(k);const cls=p>=1?'done':k===i?'now':'';
   return `<li class="trail-seg ${cls}" data-seg="${st}" style="--p:${p.toFixed(3)}"><span class="fill"></span><span class="node">${lantern(p>=1)}</span><span class="sr-only">${esc(t(st))}${p>=1?(lang()==='kk'?' - өтілді':' - пройден'):k===i?(lang()==='kk'?' - қазіргі қадам':' - текущий шаг'):''}</span></li>`;}).join('');
  const total=ctx.embers?.()??0;
  ctx.setHeader?.({title:t('path',{t:L(lesson.topic)})});
  return `<header class="lesson-top">${ctx.demoStrip||''}<h1 class="sr-only">${esc(t('path',{t:L(lesson.topic)}))}</h1><div class="in"><a class="x-btn" href="#/home" data-exit aria-label="${esc(t('exit'))}">${icon('x')}</a>
   <nav class="trail-wrap" aria-label="${esc(t('allSteps'))}"><ol class="trail">${segs}</ol><p class="trail-cap tnum"><span>${esc(t('stepOf',{n:i+1}))}</span><span class="cap-stage"> · ${esc(t(S.stage))}</span></p></nav>
   <span class="ember-count" role="img" aria-label="${esc(t('embersAria',{n:total}))}">${lantern(true)}<span data-embers aria-hidden="true">${total}</span></span>${ctx.topTools?.()||''}</div></header>`;
 }
 const pushBtn=(attrs,label,ic='next')=>`<button type="button" class="btn primary push" ${attrs}><span class="face">${label}${ic?icon(ic):''}</span></button>`;
 const backBtn=to=>`<button type="button" class="quiet-btn back" data-go="${to}">${icon('back')}${esc(t('back'))}</button>`;
 // the task mascot is the live 2D Аян (mascot2d.mjs via ctx.mountMascot); the slot keeps the same character across re-renders
 const taskMascot=`<div class="task-mascot" aria-hidden="true" data-mascot data-mascot-slot="task"></div>`;
 // Focus never falls into <body> after a re-render: the same control gets it back, otherwise the step heading (a11y В1).
 const FKEYS=['data-then','data-then-go','data-check','data-hint','data-nexttask','data-twin','data-reset','data-back','data-other','data-edit','data-go','data-part','data-mode','data-view','data-mpart','data-audio'];
 function focusKey(el){if(!el||el===document.body||!el.hasAttribute)return null;for(const a of FKEYS)if(el.hasAttribute(a)){const v=el.getAttribute(a);return v?`[${a}="${CSS.escape(v)}"]`:`[${a}]`;}return el.id?'#'+CSS.escape(el.id):null;}
 // focus() returns undefined, so "a.focus()||b.focus()" never works (У3): take the first element that really took focus
 function focusFirst(...sels){for(const s of sels){const el=s&&host.querySelector(s);if(!el||el.disabled||!el.getClientRects().length)continue;el.focus({preventScroll:true});if(document.activeElement===el)return el;}return null;}
 function render(){
  if(dead)return;const ae=document.activeElement,keep=(!ae||ae===document.body||host.contains(ae))&&!document.querySelector('[aria-modal="true"],dialog[open]'),key=keep?focusKey(ae):null;stopWidgets();
  const v=S.stage==='goal'?goalView():S.stage==='explanation'?explView():S.stage==='example'?exampleView():S.stage==='practice'?taskView('practice'):checkView();
  host.innerHTML=`${topBar()}<main class="lesson-stage" id="main" tabindex="-1">${ctx.notice?.()||''}${S.stage==='goal'||v.summary?'':thenLine()}${v.body}</main><footer class="lesson-foot" data-foot>${v.sheet||''}<div class="foot-row">${ctx.support?.()||''}<div class="foot-main">${v.main||''}</div></div></footer>`;
  mountDynamic();measureFoot();
  if(keep&&!host.contains(document.activeElement))focusFirst(key,'#stage-h');
 }
 // After an answer the task itself stays readable: the heading is pulled out from under the sticky header (В7).
 function ensureTaskVisible(){const h=host.querySelector('#stage-h'),top=host.querySelector('.lesson-top');if(!h||!top)return;const hr=h.getBoundingClientRect(),tb=top.getBoundingClientRect().bottom;if(hr.top<tb+4)window.scrollBy(0,hr.top-tb-12);}
 // The footer is sticky: its height is kept as scroll padding, so a focused control is never hidden under it.
 function measureFoot(){const f=host.querySelector('[data-foot]');if(f)document.documentElement.style.setProperty('--foot-h',(f.offsetHeight+16)+'px');}
 function stopWidgets(){widget?.destroy?.();widget=null;player?.destroy?.();player=null;}
 // ---- F3 "Сначала - потом": an optional choice of what comes after the lesson (play, cartoon, practice, rest), kept on the device.
 // Shown on the first lesson screen, never blocks the lesson; calm mode and a finished lesson skip it. The summary leads there.
 const THEN={play:['play','#/play'],watch:['video','#/watch'],free:['cube','#/free'],rest:['pause',null]};
 const thenOn=()=>!!ctx.thenChoice&&ctx.thenAllowed?.()!==false;
 const thenNow=()=>{const v=thenOn()?ctx.thenChoice.get():null;return THEN[v]?v:null;};
 function thenPick(){if(!thenOn()||S.completed)return '';const cur=thenNow();
  return `<div class="then-pick" role="group" aria-labelledby="then-h"><h3 id="then-h">${esc(t('thenTitle'))}</h3><p class="muted">${esc(t('thenSub'))}</p><div class="then-opts">${Object.entries(THEN).map(([k,[ic]])=>`<button type="button" class="chip then-opt" data-then="${k}" aria-pressed="${cur===k}">${icon(ic)}${esc(t('then_'+k))}</button>`).join('')}</div></div>`;}
 function thenLine(){const v=thenNow();if(!v||S.completed&&S.stage!=='check')return '';return `<p class="then-line" data-then-line>${icon('next')}<span>${esc(t('firstThen',{a:L(lesson.topic),b:t('then_'+v)}))}</span></p>`;}
 function goalView(){
  ctx.mascot('Greeting');
  const lockNote=S.completed?`<p class="feedback info" style="margin-top:16px">${icon('info')}${esc(t('completedLocked'))}</p>`:'';
  const plan=[['explanation',0],['example',0],['practice',practice.length],['check',checks.length]].filter(([k,n])=>n||k==='explanation'||k==='example').map(([k,n])=>`<li>${esc(t(k))}${n?` <span class="n">${n}</span>`:''}</li>`).join('');
  return {body:`<section class="lcard soft" aria-labelledby="stage-h"><div class="goal-grid"><div><p class="label">${esc(L(lesson.topic))}</p><h2 id="stage-h" tabindex="-1">${esc(t('goal'))}</h2><p class="goal-text">${esc(L(lesson.stages.goal))}</p>
   <ul class="plan" aria-label="${esc(t('planTitle'))}">${plan}</ul>${lockNote}</div><div class="who" data-mascot style="height:220px"></div></div>${thenPick()}</section>`,main:pushBtn('data-go="explanation"',esc(t('start')))};
 }
 function explView(){
  ctx.mascot('Explaining');const ex=lesson.stages.explanation,m=S.ui.explMode;
  const tabs=['text','picture','audio','video','model'].map(k=>`<button type="button" class="chip" role="tab" id="tab-${k}" aria-controls="expl-panel" aria-selected="${m===k}" tabindex="${m===k?0:-1}" data-mode="${k}">${icon({text:'text',picture:'example',audio:'audio',video:'video',model:'cube'}[k])}${esc(t('m_'+k))}</button>`).join('');
  let panel='';
  if(m==='text')panel=`<p style="font-size:var(--fs-instr);max-width:60ch">${esc(L(ex.text))}</p>`;
  if(m==='picture')panel=`<div class="row" style="gap:40px;align-items:center;justify-content:center;flex-wrap:wrap">${Fig.figure(ex.figure,{size:300,label:L(ex.text)})}<div class="stack" style="gap:10px">${ex.figure?.type==='fraction'?`<p style="font-size:3.5rem;font-weight:800;color:var(--primary);line-height:1" aria-hidden="true">${ex.figure.selected.length} / ${ex.figure.parts.length}</p>`:''}${(ex.facts?.[lang()]||[]).map(f=>`<p style="font-size:1.25rem;color:var(--muted)">${esc(f)}</p>`).join('')}</div></div>`;
  if(m==='audio'){const src=lesson.media?.audio?.[lang()];panel=src?`<div class="stack"><div class="row"><button type="button" class="btn primary inline" data-audio>${icon('audio')}${esc(t('audioPlay'))}</button><span class="muted">${esc(t('audioNote'))}</span></div><p style="max-width:60ch">${esc(L(ex.text))}</p></div>`
   :`<div class="stack"><p class="feedback info">${icon('info')}${esc(lesson.media?.audio?.ru&&lang()==='kk'?t('noAudio'):t('noAudioAny'))}</p><p style="max-width:60ch">${esc(L(ex.text))}</p></div>`;}
  if(m==='video')panel=lesson.media?.video?`<div data-video></div>`:`<div class="stack"><p class="feedback info">${icon('info')}${esc(t('noVideo'))}</p><button type="button" class="btn inline" data-mode="picture">${icon('example')}${esc(t('showPicture'))}</button></div>`;
  if(m==='model')panel=ex.figure?.type==='fraction'?`<div class="stack"><p class="muted">${esc(t('modelHelp'))}</p><div data-model class="row" style="justify-content:center"></div><p class="selected-line" data-model-line aria-live="polite"></p></div>`:`<div class="stack"><p class="feedback info">${icon('info')}${esc(t('modelNo'))}</p><button type="button" class="btn inline" data-mode="picture">${icon('example')}${esc(t('showPicture'))}</button></div>`;
  return {body:`<section class="lcard" aria-labelledby="stage-h"><p class="label">${esc(L(lesson.topic))}</p><h2 id="stage-h" tabindex="-1">${esc(t('explanation'))}</h2>
   <div class="modes" role="tablist" aria-label="${esc(t('howTitle'))}" style="margin-top:16px">${tabs}</div><div id="expl-panel" role="tabpanel" aria-labelledby="tab-${m}" style="margin-top:22px;min-height:300px">${panel}</div></section>`,
   main:backBtn('goal')+pushBtn('data-go="example"',esc(t('tryMyself')))};
 }
 function exampleView(){
  ctx.mascot('Explaining');const e=lesson.stages.example;
  return {body:`<section class="lcard" aria-labelledby="stage-h"><p class="label">${esc(L(lesson.topic))}</p><h2 id="stage-h" tabindex="-1">${esc(t('exampleTitle'))}</h2><p class="goal-text" style="max-width:52ch">${esc(L(e.text))}</p>
   <div class="stack" style="align-items:center;margin-top:20px">${Fig.figure(e.figure,{size:300,label:L(e.text),items:e.figure?.items?.[lang()]})}${e.label?`<p style="font-size:3.25rem;font-weight:800;color:var(--primary);letter-spacing:.04em" aria-hidden="true">${esc(e.label)}</p>`:''}</div></section>`,
   main:backBtn('explanation')+pushBtn('data-go="practice"',esc(t('toPractice')))};
 }
 // ---- tasks ----
 function currentTaskId(where){if(where==='practice'){const id=practice[Math.min(S.ui.taskIndex,practice.length-1)];return S.ui.twinFor&&S.ui.twinFor===id?id+'-twin':id;}const id=checks[Math.min(S.ui.checkIndex,checks.length-1)];return id;}
 function taskView(where){
  const id=currentTaskId(where),task=taskById(id),ts=tstate(id),r=result[id]||lastResult(id),twin=/-twin$/.test(id);
  const n=where==='practice'?Math.min(S.ui.taskIndex,practice.length-1)+1:Math.min(S.ui.checkIndex,checks.length-1)+1,mTotal=where==='practice'?practice.length:checks.length;
  const fb=feedback(task,ts,r);const kind=!fb?'':ts.status==='empty'?'info':ts.status==='failed'?'warn':r?.evaluation==='correct'?'ok':'try';
  const ms=ts.status==='pending'?'Thinking':kind==='ok'?(mlevel()==='full'&&where==='check'&&isAllDone()?'Celebrating':'Lit'):(ts.hintLevel||kind==='try')?'Helping':'Idle';
  ctx.mascot(ms);
  const body=`<section class="lcard task-card" aria-labelledby="stage-h"><div class="task-top"><div><p class="label tnum">${esc(twin?t('twinTitle'):where==='practice'?t('practiceTitle',{n,m:mTotal}):t('checkTitle',{n,m:mTotal}))}</p><h2 id="stage-h" tabindex="-1">${esc(L(task.prompt))}</h2></div>${taskMascot}</div>
   ${ts.hintLevel&&kind!=='try'?`<p class="feedback info">${icon('info')}<span><b>${esc(t('hintL',{n:ts.hintLevel}))}.</b> ${esc(L(task.hints?.[Math.min(ts.hintLevel,task.hints.length)-1]))}</span></p>`:''}
   <div data-task class="${S.ui.ways?'':'no-ways'}"></div>
   <div class="task-tools">${task.kind==='fraction'?`<button type="button" class="other-btn" data-other aria-expanded="${!!S.ui.ways}">${icon('cube')}${esc(t('other'))}</button>`:'<span></span>'}<span class="row" style="gap:4px"><button type="button" class="link-btn" data-back>${icon('back')}${esc(t('back'))}</button><button type="button" class="link-btn" data-reset ${outcome(id)==='correct'?'disabled':''}>${icon('refresh')}${esc(t('reset'))}</button></span></div></section>`;
  const title=kind==='ok'?t('lit'):kind==='try'?t('notYet'):kind==='info'?t('emptyT'):t('savedT');
  const sheet=fb?`<div class="sheet-wrap" data-kind="${kind}"><div class="sheet" data-kind="${kind}"><span class="sheet-icon">${kind==='ok'?lantern(true):icon(kind==='try'?'leaf':'info')}</span><div style="min-width:0;flex:1"><b class="sheet-title">${esc(title)}</b><div data-fb>${fb}</div></div></div></div>`:'<div data-fb hidden></div>';
  return {body,sheet,main:taskActions(where,id,task,ts,r)};
 }
 function lastResult(id){const list=S.subs.filter(s=>s.taskId===id);const last=list[list.length-1];return last?{evaluation:last.evaluation,reason:last.reason}:null;}
 function feedback(task,ts,r){
  if(ts.status==='empty')return `<p class="feedback info">${icon('info')}${esc(t('empty'))}</p>`;
  if(ts.status==='failed')return `<p class="feedback warn">${icon('info')}${esc(t('netFail'))}</p>`;
  if(!r)return '';
  if(r.evaluation==='correct')return `<p class="feedback ok">${icon('check')}${esc(Core.feedback(task,{valid:true,correct:true},lang()))}</p>`;
  if(ts.status==='editing')return ''; // the child is already changing the answer: the old message steps aside
  const offer=ts.wrong>=2&&!ts.hintLevel&&!ts.declinedHint?`<div class="feedback info" style="flex-wrap:wrap;padding-left:0">${icon('info')}<span style="flex:1;min-width:200px">${esc(t('offerHint'))}</span><button type="button" class="btn small inline" data-hint>${esc(t('hintBtn'))}</button><button type="button" class="btn small inline" data-nohint>${esc(t('noThanks'))}</button></div>`:'';
  // one hint at a time: with a hint open, the sheet shows the hint instead of the general "why" (UT8)
  const hl=ts.hintLevel?`<b>${esc(t('hintL',{n:ts.hintLevel}))}.</b> ${esc(L(task.hints?.[Math.min(ts.hintLevel,task.hints.length)-1]))}`:'';
  return `<p class="feedback try">${icon('repeat')}<span>${hl||esc(Core.feedback(task,{valid:true,correct:false,reason:r.reason},lang()))}</span></p>${offer}<p class="sheet-task">${esc(t('taskIs',{t:L(task.prompt)}))}</p><button type="button" class="link-btn edit-btn" data-edit>${icon('edit')}${esc(t('editAnswer'))}</button>`;
 }
 function taskActions(where,id,task,ts,r){
  const ok=outcome(id)==='correct';const twin=/-twin$/.test(id);
  if(ok){const hasTwin=!twin&&where==='practice'&&Core.twinOf(task)&&wasAssisted(id)&&!outcome(id+'-twin');
   if(hasTwin)return `<button type="button" class="quiet-btn" data-nexttask>${esc(t('skipTwin'))}</button>`+pushBtn('data-twin',esc(t('newExample')),'plus');
   const lastP=where==='practice'&&Math.min(S.ui.taskIndex,practice.length-1)===practice.length-1,lastC=where==='check'&&S.ui.checkIndex>=checks.length-1;
   return pushBtn('data-nexttask',esc(lastP?(checks.length?t('toCheck'):t('next')):lastC?t('next'):t('nextTask')));}
  const pending=ts.status==='pending';
  return `<button type="button" class="quiet-btn" data-hint ${ts.hintLevel>=3?'disabled':''}>${icon('question')}${esc(ts.hintLevel?t('moreHint'):t('hintShort'))}</button>
   <button type="button" class="btn primary push" data-check ${pending?'aria-busy="true" aria-disabled="true"':''}><span class="face">${pending?'<span class="spin" aria-hidden="true"></span>'+esc(t('checking')):ts.status==='failed'?icon('refresh')+esc(t('resend')):esc(t('checkShort'))}</span></button>`;
 }
 const wasAssisted=id=>S.subs.some(s=>s.taskId===id&&s.evaluation==='correct'&&s.hintLevel>0)||(tstate(id).hintLevel>0&&outcome(id)==='correct');
 const isAllDone=()=>(lesson.required||[]).every(id=>outcome(id)==='correct');
 function checkView(){
  if(S.ui.finishedView||completedAtMount)return completionView();
  if(!checks.length)return completionView();
  return taskView('check');
 }
 // Summary scene: embers gather into the big lantern one by one, the counter grows, then a few float up (Живо only).
 function completionView(){
  ctx.mascot('Celebrating');const req=lesson.required||[];const solved=req.filter(id=>outcome(id)==='correct').length;
  const next=ctx.nextAssignment?.();const left=ctx.lessonsLeft?.()??0;const done=S.completed||isAllDone();
  const leftText=left===0?t('left0'):left===1?t('left1'):t('leftN',{n:left});
  return {body:`<section class="lcard soft summary" aria-labelledby="stage-h"><div class="summary-hero"><div class="big-lantern" data-big>${lantern(true)}</div><div class="who" data-mascot></div></div><h2 id="stage-h" tabindex="-1">${esc(done?t('completed'):t('check'))}</h2>
   <p class="earned"><span>${esc(t('earnedCap'))}</span><b data-earned>${solved}</b></p><p class="muted total">${esc(t('totalCap',{n:ctx.embers?.()??0}))}</p><p class="left">${esc(leftText)}</p>
   <p style="font-size:var(--fs-instr)">${esc(withoutHead(L(lesson.stages.completion),t('completed')))}</p><p class="muted">${esc(t('summary',{n:solved,m:req.length}))}</p>
   <div class="row">${next?`<button type="button" class="btn inline" data-route="#/home">${icon('home')}${esc(t('home'))}</button>`:''}${lesson.media?.video?`<button type="button" class="btn inline" data-route="#/watch">${icon('video')}${esc(t('watch'))}</button>`:''}</div></section>`,
   summary:true,main:(thenNow()?`<button type="button" class="quiet-btn then-go" data-then-go="${thenNow()}">${icon(THEN[thenNow()][0])}${esc(t('nowThen',{b:t('then_'+thenNow())}))}</button>`:'')+(next?pushBtn('data-route="#/lesson"',esc(t('nextLessonBtn'))):pushBtn('data-route="#/home"',esc(t('home')),'home'))};
 }
 let celebrated=false;
 function celebrate(){
  if(celebrated||S.ui.celebrated)return;celebrated=true;S.ui.celebrated=true;persist(); // device only: a completed attempt refuses state writes
  const big=host.querySelector('[data-big]'),num=host.querySelector('[data-earned]');if(!big||!num)return;const n=Number(num.textContent)||0;
  if(mlevel()!=='full'){Motion.lightUp(big.querySelector('.flame'),400);return;}
  const lan=big.querySelector('.lantern-ico');lan.classList.remove('lit');num.textContent='0';let c=0;
  Motion.gather(big,n,{onEach:()=>{c++;num.textContent=String(c);if(c===1)lan.classList.add('lit');}}).then(()=>{num.textContent=String(n);lan.classList.add('lit');Motion.pop(lan);return Motion.floatUp(big,12);});
 }
 function go(stage,{focus=true}={}){const from=S.stage;if(from===stage)return;S.stage=stage;const m=STAGES.indexOf(stage);if(m>STAGES.indexOf(S.ui.maxStage||'goal'))S.ui.maxStage=stage;stopAudio();save();
  swap(STAGES.indexOf(stage)>=STAGES.indexOf(from)?1:-1,render,focus);if(!focus)announce(t(stage));}
 // A step change starts at the top with focus on the new heading (it is read aloud, so no extra announcement: У2).
 // A change of STEP is a crossfade like a View Transition (D9), but synchronous: the new step is in the DOM and focused at once,
 // the old card stays as an inert, hidden-from-readers picture that fades out in 200 ms while the new one comes in (12 px, 240 ms).
 // (The View Transitions API updates the DOM a frame later, so a fast second tap or key press landed on the old step.)
 // "Мягко": fade only; "Тихо": instant. Task to task inside a step only uses stepIn (fade=false).
 function swap(dir,fn,focus=true,fade=true){const after=()=>{window.scrollTo(0,0);if(focus)host.querySelector('#stage-h')?.focus({preventScroll:true});};
  const old=fade&&mlevel()!=='off'?host.querySelector('.lesson-stage>section'):null;let ghost=null;
  if(old&&old.animate){const r=old.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight){ghost=old.cloneNode(true);ghost.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.classList.add('step-ghost');
   ghost.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;pointer-events:none;z-index:2;overflow:hidden`;}}
  fn();if(ghost){document.body.append(ghost);const a=ghost.animate([{opacity:1},{opacity:0}],{duration:200,easing:'linear',fill:'forwards'});a.onfinish=a.oncancel=()=>ghost.remove();setTimeout(()=>ghost.remove(),400);}
  Motion.stepIn(host.querySelector('.lesson-stage>section'),dir);after();}
 function mountDynamic(){
  host.querySelectorAll('[data-mascot]').forEach(el=>ctx.mountMascot(el));
  if(host.querySelector('.summary'))setTimeout(celebrate,250);
  const th=host.querySelector('[data-task]');
  if(th){const where=S.stage;const id=currentTaskId(where),task=taskById(id),ts=tstate(id);const onChange=(st,why)=>{if(why==='answer'&&ts.status!=='pending'){if(ts.status==='failed'&&ts.sentAnswer!==widget?.answer())ts.submissionId=null;ts.status='editing';
     // the answer changes: a "not yet" sheet steps aside, a chosen option answers with a small spring
     const sh=host.querySelector('.sheet-wrap');if(sh&&outcome(id)!=='correct'){sh.remove();measureFoot();}
     requestAnimationFrame(()=>Motion.choose(document.activeElement?.closest?.('[data-part],[data-card],[data-choice],[data-left],[data-piece]')));}save();};
   const done=outcome(id)==='correct';
   // In "Тихо" a task opens in 2D (no WebGL) unless the child chose 3D for it himself.
   if(task.kind==='fraction'&&mlevel()==='off'&&ts.view==='3d'&&!ts.chosen)ts.view='2d';
   widget=task.kind==='fraction'?FW.mount(th,{task,state:ts,onChange,onEvent:(type,p)=>{if(type==='view_changed'&&!p?.reason)ts.chosen=true;ev(type,p,id);},decorative:ctx.profile.decorative,motion:ctx.motion(),initialView:ctx.preferredView?.()}):Tasks.mount(th,{task,state:ts,onChange});
   if(ts.hintLevel)widget.setHint(ts.hintLevel);if(done)th.querySelectorAll('button').forEach(b=>{if(!b.dataset.view&&!b.dataset.mode)b.disabled=true;});}
  const vh=host.querySelector('[data-video]');if(vh)player=Video.mount(vh,{videoId:lesson.media.video,compact:true,onEvent:(type,p)=>ev(type,p),profile:ctx.profile,onModel:()=>{S.ui.explMode='model';save();render();}});
  const mh=host.querySelector('[data-model]');if(mh){const fig=lesson.stages.explanation.figure;const st={sel:[...fig.selected]};const draw=()=>{mh.innerHTML=Fig.fraction({...fig},{selected:st.sel,interactive:true,size:320,label:L(lesson.stages.explanation.text)})+`<div class="parts-list" style="justify-content:center;margin-top:12px">${fig.parts.map((_,i)=>`<button type="button" class="part-btn" data-mpart="${i}" aria-pressed="${st.sel.includes(i)}">${lang()==='kk'?(i+1)+'-бөлік':'Часть '+(i+1)}</button>`).join('')}</div>`;host.querySelector('[data-model-line]').textContent=t('modelSel',{n:st.sel.length,d:fig.parts.length});};
   mh.onclick=e=>{const b=e.target.closest('[data-part],[data-mpart]');if(!b)return;const i=Number(b.dataset.part??b.dataset.mpart);st.sel=st.sel.includes(i)?st.sel.filter(x=>x!==i):[...st.sel,i];draw();mh.querySelector(`[data-mpart="${i}"]`)?.focus();};draw();}
 }
 // ---- actions ----
 async function check(){
  const where=S.stage,id=currentTaskId(where),task=taskById(id),ts=tstate(id);if(ts.status==='pending')return;
  const answer=widget?.answer()||'';if(!answer){ts.status='empty';rerenderTask();ensureTaskVisible();announce(t('empty'));return;}
  // One submission id per intentional confirm. A resend after a failure reuses it with the same answer.
  if(!ts.submissionId||ts.sentAnswer!==answer){ts.submissionId=sid();ts.sentAnswer=answer;}
  ts.status='pending';S.ui.pending[ts.submissionId]={taskId:id,answer};save();rerenderTask();
  const body={attemptId:S.attemptId,taskId:id,submissionId:ts.submissionId,answer,hintLevel:ts.hintLevel||0};
  const r=await outbox.send('sub:'+ts.submissionId,'/api/v2/child/submit',body);if(dead)return;
  if(!r.sent){ts.status='failed';ev('technical_error',{safeCode:r.error?.message==='offline'?'offline':'server_error',operation:'submit',recoverable:true},id);save();rerenderTask();announce(t('netFail'));return;}
  applySubmit(id,r.r,body.submissionId);
 }
 // subId is the submission this server reply belongs to. A late reply to an older answer updates the stored results but never
 // replaces what the child sees for a newer answer, and never clears the newer answer's "pending" mark.
 function applySubmit(id,r,subId){
  const ts=tstate(id);subId=subId||ts.submissionId;delete S.ui.pending[subId];
  const latest=ts.submissionId===subId;const wasCorrect=outcome(id)==='correct';const k=STAGES.indexOf(S.stage);const before=stageProgress(k);
  if(r.ok){const d=r.data;S.subs=d.attempt?.submissions||S.subs;S.completed=d.attempt?.state==='completed'||S.completed;
   if(latest){result[id]={evaluation:d.evaluation,reason:d.reason,wrongItems:d.wrongItems,firstWrong:d.firstWrong};ts.status='evaluated';if(d.evaluation!=='correct'){ts.wrong=(ts.wrong||0)+1;ts.submissionId=null;}
    announce(d.evaluation==='correct'?t('lit')+'. '+Core.feedback(taskById(id),{valid:true,correct:true},lang()):t('notYet')+'. '+Core.feedback(taskById(id),{valid:true,correct:false,reason:d.reason},lang()));
    if(widget?.showResult)widget.showResult(d);}}
  else if(r.status===404){store.del(key);toast(lang()==='kk'?'Сабақ жаңартылды, қайта жүктеп жатырмыз.':'Урок обновился, загружаем заново.');setTimeout(()=>ctx.reload?.(),600);return;}
  else if(latest){
   if(r.status===400&&r.data?.code==='empty'){ts.status='empty';announce(t('empty'));}
   else if(r.status===409&&r.data?.code==='completed'){S.completed=true;ts.status='evaluated';}
   else{ts.status='failed';announce(t('netFail'));}}
  save();rerenderTask();if(latest)ensureTaskVisible();
  if(latest&&(S.stage==='practice'||S.stage==='check'))react(id,r.ok&&r.data?.evaluation==='correct'&&!wasCorrect,before,k);
 }
 // After a reload the answer may already have been saved by the server (the queue finished before this page mounted).
 // Match every "pending" mark against the server's stored submissions so the button never stays on "Проверяем…".
 function reconcile(){
  const queued=new Set(outbox.list().map(o=>o.id));
  for(const [sidv,p] of Object.entries(S.ui.pending||{})){
   const ts=tstate(p.taskId),stored=S.subs.find(x=>x.submissionId===sidv);
   if(stored){delete S.ui.pending[sidv];if(ts.submissionId===sidv||!ts.submissionId){ts.status='evaluated';result[p.taskId]={evaluation:stored.evaluation,reason:stored.reason};if(stored.evaluation!=='correct'){ts.wrong=(ts.wrong||0)+1;ts.submissionId=null;}}}
   else if(!queued.has('sub:'+sidv)){delete S.ui.pending[sidv];if(ts.submissionId===sidv)ts.status='failed';}}
  for(const [id,ts] of Object.entries(S.ui.tasks||{}))if(ts.status==='pending'&&!Object.values(S.ui.pending||{}).some(p=>p.taskId===id))ts.status='failed';
 }
 function rerenderTask(){if(S.stage!=='practice'&&S.stage!=='check')return;const keepFocus=document.activeElement?.matches?.('[data-check],[data-hint]')?document.activeElement.matches('[data-check]')?'[data-check]':'[data-hint]':null;render();
  const fb=host.querySelector('[data-fb] .feedback');if(keepFocus)(host.querySelector(keepFocus)||host.querySelector('[data-nexttask],[data-twin]'))?.focus();else if(fb){}}
 // One event, one reaction, always the same: sheet rises; a new right answer sends one ember to the trail, the trail fills, the counter adds one.
 function react(id,isNew,before,k){
  const sheet=host.querySelector('.sheet-wrap');Motion.sheetIn(sheet);
  if(sheet?.dataset.kind==='try'){Motion.nudge(host.querySelector('.foot-main [data-hint]'));return;}
  if(!isNew)return;
  const seg=host.querySelector(`.trail-seg[data-seg="${STAGES[k]}"]`),fill=seg?.querySelector('.fill');const after=stageProgress(k);
  const from=host.querySelector('[data-task] [aria-pressed="true"]')||host.querySelector('[data-task] [data-card][aria-pressed="true"]')||host.querySelector('[data-task]');
  if(fill&&mlevel()==='full'){fill.style.transition='none';fill.style.transform=`scaleX(${before})`;void fill.offsetWidth;}
  const r=seg?.getBoundingClientRect();const target=r?{x:r.left+r.width*Math.max(.04,after),y:r.top+r.height/2}:null;
  Motion.fly(from,target,{onArrive:()=>{if(fill){fill.style.transition='';fill.style.transform='';}ctx.onEmber?.();const el=host.querySelector('[data-embers]');const total=ctx.embers?.()??0;
   if(el){Motion.countUp(el,total-1,total,{ms:400});el.parentElement.setAttribute('aria-label',t('embersAria',{n:total}));Motion.pop(el.parentElement);}if(after>=1)Motion.pop(seg?.querySelector('.node'));}});
 }
 function hint(){const id=currentTaskId(S.stage),ts=tstate(id);if((ts.hintLevel||0)>=3)return;ts.hintLevel=(ts.hintLevel||0)+1;ev('hint_requested',{level:ts.hintLevel},id);ctx.mascot('Helping');save();render();
  if(!host.querySelector('[data-hint]')?.contains(document.activeElement))focusFirst('.foot-main [data-hint]','#stage-h');const task=taskById(id),ht=L(task.hints?.[Math.min(ts.hintLevel,task.hints?.length||1)-1]);announce(t('hintL',{n:ts.hintLevel})+'. '+ht);ctx.sayText?.(ht);}
 function nextTask(){const where=S.stage;
  if(where==='practice'){if(S.ui.twinFor){S.ui.twinFor=null;}if(S.ui.taskIndex<practice.length-1){S.ui.taskIndex++;save();swap(1,render,true,false);return;}go(checks.length?'check':'check');return;}
  if(S.ui.checkIndex<checks.length-1){S.ui.checkIndex++;save();swap(1,render,true,false);return;}S.ui.finishedView=true;save();swap(1,render);}
 host.onclick=e=>{const b=e.target.closest('button,[data-route]');if(!b||dead)return;
  if(b.dataset.stage){if(!b.disabled)go(b.dataset.stage);return;}
  if(b.dataset.go){go(b.dataset.go);return;}
  if(b.hasAttribute('data-other')){S.ui.ways=!S.ui.ways;save();render();host.querySelector('[data-other]')?.focus();return;}
  if(b.dataset.route){ctx.go(b.dataset.route);return;}
  if(b.dataset.then){const v=b.dataset.then;ctx.thenChoice.set(thenNow()===v?null:v);render();return;}
  if(b.dataset.thenGo){const v=b.dataset.thenGo;if(v==='rest'){ctx.startBreak?.();return;}ctx.go(THEN[v][1]);return;}
  if(b.dataset.mode&&b.closest('[role=tablist],.stack')&&S.stage==='explanation'){const from=S.ui.explMode;S.ui.explMode=b.dataset.mode;ev('explanation_mode_changed',{fromMode:from,toMode:b.dataset.mode});save();render();host.querySelector(`#tab-${b.dataset.mode}`)?.focus();return;}
  if(b.hasAttribute('data-audio')){toggleAudio(b);return;}
  if(b.dataset.act==='repeat'){repeat();return;}
  if(b.hasAttribute('data-check')){check();return;}
  if(b.hasAttribute('data-hint')){hint();return;}
  if(b.hasAttribute('data-nohint')){tstate(currentTaskId(S.stage)).declinedHint=true;save();render();focusFirst('.foot-main [data-hint]','#stage-h');return;}
  if(b.hasAttribute('data-edit')){focusFirst('[data-task] button[aria-pressed="true"]','[data-task] button[data-part]','[data-task] button:not([data-view]):not([data-mode])');return;}
  if(b.hasAttribute('data-reset')){widget?.reset();const id=currentTaskId(S.stage);delete result[id];tstate(id).status='editing';save();render();host.querySelector('[data-reset]')?.focus();return;}
  if(b.hasAttribute('data-twin')){const id=currentTaskId('practice');S.ui.twinFor=id;save();render();host.querySelector('#stage-h')?.focus();return;}
  if(b.hasAttribute('data-nexttask')){nextTask();return;}
  if(b.hasAttribute('data-back')){if(S.stage==='practice'&&S.ui.twinFor){S.ui.twinFor=null;save();swap(-1,render,true,false);return;}if(S.stage==='practice'&&S.ui.taskIndex>0){S.ui.taskIndex--;save();swap(-1,render,true,false);return;}if(S.stage==='check'&&S.ui.checkIndex>0){S.ui.checkIndex--;save();swap(-1,render,true,false);return;}go(STAGES[Math.max(0,STAGES.indexOf(S.stage)-1)]);return;}
 };
 host.onkeydown=e=>{const tab=e.target.closest('[role=tab]');if(!tab)return;const tabs=[...host.querySelectorAll('[role=tab]')];const i=tabs.indexOf(tab);
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];n.click();}};
 function toggleAudio(b){if(audio&&!audio.paused){stopAudio();b.innerHTML=icon('audio')+esc(t('audioPlay'));return;}
  if(!ctx.canPlaySound()){toast(lang()==='kk'?'Дыбыс өшірулі. Баптауда қосуға болады.':'Звук выключен. Его можно включить в настройках.');return;}
  audio=new Audio(lesson.media.audio[lang()]);audio.playbackRate=ctx.profile.voiceRate||1;audio.play().catch(()=>{});ctx.registerMedia(audio);b.innerHTML=icon('pause')+esc(t('audioStop'));audio.onended=()=>{b.innerHTML=icon('audio')+esc(t('audioPlay'));};}
 function stopAudio(){if(audio){audio.pause();audio=null;}}
 function repeat(){const text=S.stage==='practice'||S.stage==='check'?L(taskById(currentTaskId(S.stage)).prompt):S.stage==='example'?L(lesson.stages.example.text):S.stage==='goal'?L(lesson.stages.goal):L(lesson.stages.explanation.text);
  ctx.mascot('Explaining');ctx.sayText?.(text);toast(text);} // the toast is a status region: one channel, read once (У2)
 // Outbox finished in the background (after reconnect): apply the server result to the task it belongs to.
 const onDone=e=>{const op=e.detail.op;if(!op.id.startsWith('sub:'))return;const sidv=op.id.slice(4);const p=S.ui.pending?.[sidv];if(!p)return;applySubmit(p.taskId,e.detail.r,sidv);};
 window.addEventListener('ayan:outbox-done',onDone);
 reconcile();
 (async()=>{await ensureAttempt().catch(()=>{});if(!dead){reconcile();render();
  // Pending submissions from before a reload are still in the outbox: flush them, results arrive via ayan:outbox-done.
  if(Object.keys(S.ui.pending||{}).length)outbox.flush();}})();
 render();setTimeout(()=>{if(!dead&&!host.contains(document.activeElement))host.querySelector('#stage-h')?.focus({preventScroll:true});},0);
 const onResize=()=>measureFoot();window.addEventListener('resize',onResize);
 return {
  get attemptId(){return S.attemptId;},get stage(){return S.stage;},
  repeat,showExample(){const e=lesson.stages.example;openDialog({title:t('exampleTitle'),body:`<div class="stack" style="align-items:center">${Fig.figure(e.figure,{size:260,label:L(e.text),items:e.figure?.items?.[lang()]})}${e.label?`<p style="font-size:2.5rem;font-weight:800;color:var(--primary)">${esc(e.label)}</p>`:''}<p>${esc(L(e.text))}</p></div>`,labelClose:lang()==='kk'?'Жабу':'Закрыть'});},
  explainSteps(){const text=L(lesson.stages.explanation.text);const parts=text.split(/(?<=[.!?])\s+/);let i=0;const box=document.createElement('div');box.className='stack';
   const draw=()=>{box.innerHTML=`<p class="muted tnum">${i+1} / ${parts.length}</p><p style="font-size:var(--fs-instr)">${esc(parts[i])}</p><div class="between"><button type="button" class="btn inline" data-p ${i===0?'disabled':''}>${icon('back')}${esc(t('back'))}</button><button type="button" class="btn primary inline" data-n ${i===parts.length-1?'disabled':''}>${esc(t('next'))}${icon('next')}</button></div>`;};
   box.onclick=e=>{if(e.target.closest('[data-p]')&&i>0)i--;else if(e.target.closest('[data-n]')&&i<parts.length-1)i++;else return;draw();box.querySelector('[data-n]:not(:disabled),[data-p]:not(:disabled)')?.focus();};draw();
   openDialog({title:lang()==='kk'?'Қадамдап түсіндіру':'Объясняю по шагам',body:box,labelClose:lang()==='kk'?'Жабу':'Закрыть'});},
  focusTask(){(host.querySelector('[data-task] button')||host.querySelector('#stage-h'))?.focus();},
  pause(){stopAudio();player?.pause?.();save(true);},resume(){save(false);},
  rerender:render,stopMedia(){stopAudio();player?.pause?.();},
  destroy(){dead=true;clearTimeout(saveTimer);persist();stopWidgets();stopAudio();window.removeEventListener('resize',onResize);document.documentElement.style.removeProperty('--foot-h');window.removeEventListener('ayan:outbox-done',onDone);host.onclick=null;host.onkeydown=null;}
 };
}
