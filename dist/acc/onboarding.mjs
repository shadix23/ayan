// Онбординг после регистрации: 5 коротких вопросов, по одному на экране (как у goprep, в спокойной палитре Аяна).
// Ответы: POST /api/account/onboarding {answers,done} (ключи grade, subjects, lessonLang, needs, goal; hackathon/api-accounts.md).
// The progress is five lights that fill with honey; the mascot greets once and celebrates once at the end.
import {t,$,$$,api,setError,clearErrors,mascot,onLang,esc,I,plan,planName,money,loadPlans,still} from './acc.mjs';
const q=new URLSearchParams(location.search);
const planQ=/^[a-z]+$/.test(q.get('plan')||'')?q.get('plan'):'',periodQ=q.get('period')==='year'?'year':'month';
let role='teacher',answers={},step=0,next='/teacher',finished=false,fly=null,greeted=false;
async function putMascot(state){const host=$('[data-m]');try{(await fly)?.destroy?.();}catch{}fly=mascot(host,state);}

const STEPS=[
 {id:'grade',type:'single',cols:2,
  title:r=>r==='parent'?t('Балаңыз нешінші сыныпта оқиды?','В каком классе учится ваш ребёнок?'):t('Қай сыныптарда сабақ бересіз?','В каких классах вы ведёте уроки?'),
  hint:()=>t('Сабақтар мен тапсырмаларды осы сыныпқа сай таңдаймыз.','Подберём уроки и задания под этот класс.'),
  opts:[['1-2',I.leaf,['1-2 сынып','1-2 класс'],['Сауат ашу, алғашқы сандар','Грамота, первые числа']],['3-4',I.book,['3-4 сынып','3-4 класс'],['Бастауыш мектептің соңы','Конец начальной школы']],['5-9',I.calc,['5-9 сынып','5-9 класс'],['Негізгі мектеп','Основная школа']],['mixed',I.school,['Әртүрлі сыныптар','Разные классы'],['Бірнеше параллель немесе жеке сабақтар','Несколько параллелей или индивидуальные занятия']]]},
 {id:'subjects',type:'multi',cols:2,
  title:()=>t('Қандай пәндер керек?','Какие предметы нужны?'),
  hint:()=>t('Бірнешеуін таңдауға болады.','Можно выбрать несколько.'),
  opts:[['math',I.calc,['Математика','Математика'],['Үлестер, сандар, есептер','Доли, числа, задачи']],['kazakh',I.abc,['Қазақ тілі','Казахский язык'],['Оқу, сөздер, сөйлемдер','Чтение, слова, предложения']],['bio',I.leaf,['Жаратылыстану','Естествознание'],['Табиғат пен айналадағы әлем','Природа и мир вокруг']],['other',I.star,['Басқа пән','Другой предмет'],['Кейін өзіңіз қосасыз','Добавите позже сами']]]},
 {id:'lessonLang',type:'single',cols:1,
  title:()=>t('Сабақтар қай тілде өтеді?','На каком языке проходят уроки?'),
  hint:()=>t('Интерфейс тілін кез келген уақытта ауыстыруға болады.','Язык интерфейса можно сменить в любой момент.'),
  opts:[['kk',I.globe,['Қазақша','На казахском'],['Тапсырмалар мен дыбыстау қазақша','Задания и озвучка на казахском']],['ru',I.globe,['Орысша','На русском'],['Тапсырмалар мен дыбыстау орысша','Задания и озвучка на русском']],['both',I.globe,['Екі тілде','На двух языках'],['Әр оқушыға тілді жеке таңдаймын','Язык выбираю для каждого ученика']]]},
 {id:'needs',type:'single',cols:2,
  title:r=>r==='parent'?t('Балаға сабақта қосымша қолдау керек пе?','Нужна ли ребёнку дополнительная поддержка на уроках?'):t('Сыныпта қосымша қолдау керек оқушылар бар ма?','Есть ли в классе ученики, которым нужна дополнительная поддержка?'),
  hint:()=>t('Диагноз жазудың қажеті жоқ. Жауап үзіліс, тыныш режим және бір экранда бір қадам сияқты баптауларды қосуға көмектеседі.','Диагнозы указывать не нужно. Ответ поможет включить настройки: перерывы, тихий режим, один шаг на экране.'),
  opts:[['several',I.heart,['Иә, бірнеше оқушы','Да, несколько учеников'],['Сыныпта жеке қарқын керек','В классе нужен разный темп']],['one',I.user,['Иә, бір оқушы','Да, один ученик'],['Немесе бір бала','Или один ребёнок']],['none',I.check,['Қазір жоқ','Сейчас нет'],['Баптауларды кейін қосуға болады','Настройки можно включить позже']],['unsure',I.help,['Әзірге білмеймін','Пока не знаю'],['Алдымен көріп шығамын','Сначала посмотрю']]]},
 {id:'goal',type:'single',cols:2,
  title:()=>t('Аян не үшін керек?','Для чего вам Аян?'),
  hint:()=>t('Бастапқы бетті осыған қарай реттейміз.','Под это настроим стартовый экран.'),
  opts:[['inclusion',I.heart,['Инклюзивті сыныпта көмектесу','Помогать в инклюзивном классе'],['Кімге көмек керек екенін сабақ үстінде көру','Видеть на уроке, кому нужна помощь']],['lessons',I.book,['Бағдарлама бойынша дайын сабақтар','Готовые уроки по программе'],['Қадамдар, ойындар, видео','Шаги, игры, видео']],['homework',I.leaf,['Үйде жаттығу','Практика дома'],['Қысқа сабақтар және ата-анаға есеп','Короткие уроки и отчёт родителю']],['school_rollout',I.school,['Мектепке қосу','Подключить школу'],['Бірнеше мұғалім және жиынтық','Несколько учителей и сводка']]]}
];

function lights(){const ol=$('#lights');ol.style.setProperty('--n',STEPS.length);
 ol.innerHTML=STEPS.map((s,i)=>`<li class="${finished||i<step?'done':i===step?'now':''}"></li>`).join('');
 $('#count').textContent=finished?`${STEPS.length}/${STEPS.length}`:`${step+1}/${STEPS.length}`;
 $('#count').setAttribute('aria-hidden','true');}

function render(focus){
 lights();const s=STEPS[step],val=answers[s.id];
 const opts=s.opts.map(([v,ic,lbl,sub])=>{const on=s.type==='multi'?(val||[]).includes(v):val===v;
  return `<label class="opt${s.type==='multi'?' multi':''}"><input type="${s.type==='multi'?'checkbox':'radio'}" name="${s.id}" value="${v}"${on?' checked':''}><span class="glyph">${ic}</span><span><b>${esc(t(...lbl))}</b><small>${esc(t(...sub))}</small></span><span class="tick" aria-hidden="true"></span></label>`;}).join('');
 $('#step').innerHTML=`<p class="sr-only" id="ob-pos">${t('Сұрақ','Вопрос')} ${step+1} ${t('/','из')} ${STEPS.length}</p>
  <div class="ob-q"><div class="mascot" data-m></div><div><h1 id="q-title" tabindex="-1">${esc(s.title(role))}</h1><p id="q-hint">${esc(s.hint(role))}</p></div></div>
  <fieldset class="opts${s.cols===2?' two':''}" id="q-set" aria-labelledby="q-title" aria-describedby="ob-pos q-hint" style="margin-top:24px"><legend class="sr-only">${esc(s.title(role))}</legend>${opts}</fieldset>`;
 $('#back').textContent=t('Артқа','Назад');$('#back').hidden=step===0;
 $('#next').textContent=step===STEPS.length-1?t('Аяқтау','Готово'):t('Келесі','Дальше');
 $('#next').hidden=false;
 putMascot(greeted?'Idle':'Greeting');greeted=true;
 if(focus)$('#q-title').focus();
}

function read(){const s=STEPS[step],els=$$(`input[name="${s.id}"]:checked`);if(s.type==='multi')return els.map(e=>e.value);return els[0]?.value||null;}
async function save(done){const r=await api.onboarding({answers,done});return r;}

$('#ob-form').addEventListener('change',()=>{setError($('#q-set'),'');});
$('#ob-form').addEventListener('submit',async e=>{
 e.preventDefault();if(finished)return;clearErrors($('#ob-form'));
 const v=read(),s=STEPS[step];
 if(!v||(Array.isArray(v)&&!v.length)){setError($('#q-set'),s.type==='multi'?t('Кемінде бір нұсқаны таңдаңыз','Выберите хотя бы один вариант'):t('Бір нұсқаны таңдаңыз','Выберите один вариант'));$('input',$('#q-set')).focus();return;}
 answers[s.id]=v;
 if(step<STEPS.length-1){save(false);step++;render(true);window.scrollTo(0,0);return;}
 const btn=$('#next');btn.disabled=true;const r=await save(true);btn.disabled=false;
 if(!r.ok&&r.status!==400){setError($('#q-set'),t('Сақталмады. Интернетті тексеріп, қайталап көріңіз.','Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.'));return;}
 finished=true;done();
});
$('#back').addEventListener('click',()=>{if(finished){finished=false;$('.ob').classList.remove('finished');$('#done-acts')?.remove();step=STEPS.length-1;render(true);return;}if(step>0){answers[STEPS[step].id]=read()||answers[STEPS[step].id];step--;render(true);}});

// Recommendation: the plan chosen before signup wins; otherwise by role and answers.
function recommend(){if(planQ&&plan(planQ)&&planQ!=='free')return planQ;if(role==='school'||answers.goal==='school_rollout')return 'school';if(role==='parent')return 'plus';
 return answers.needs==='several'||answers.needs==='one'||answers.goal==='inclusion'?'max':'plus';}
async function done(){
 lights();$('.ob').classList.add('finished');const id=recommend();const {plans}=await loadPlans();const p=plans.find(x=>x.id===id)||plan(id);
 const price=p.prices?.month?.amount??p.month;
 $('#step').innerHTML=`<div class="done-hero"><div class="mascot" data-m></div>
  <h1 id="q-title" tabindex="-1">${t('Дайын! Аян сіздің сыныбыңызға бапталды','Готово! Аян настроен под ваш класс')}</h1>
  <p>${t('Бастау тарифі тегін, оны кез келген уақытта жаңартуға болады. Біз ұсынатын тариф:','Тариф Старт бесплатный, его можно улучшить в любой момент. Мы советуем:')}</p></div>
  <div class="card" style="max-width:560px;margin:0 auto;width:100%;box-shadow:0 0 0 2px var(--primary),var(--lift-hero)">
   <div class="sub-plan"><span class="medal">${I.star}</span><span><b>${esc(planName(p))}</b><span class="muted">${esc(t(...(plan(id)?.for||['',''])))}</span></span>
   <span style="margin-left:auto;text-align:right"><b class="tnum" style="font-size:1.25rem">${money(price)}</b><span class="muted" style="font-size:.875rem;display:block">${p.perSeat?t('мұғалімге / ай','за учителя / мес'):t('айына, ҚҚС-пен','в месяц, с НДС')}</span></span></div>
   <ul class="feat" style="margin-top:16px">${(plan(id)?.feat||[]).map(f=>`<li>${I.check}<span>${esc(t(...f))}</span></li>`).join('')}</ul>
  </div>`;
 $('#back').textContent=t('Жауаптарды өзгерту','Изменить ответы');$('#back').hidden=false;
 const go=$('#next');go.hidden=true;
 let acts=$('#done-acts');if(!acts){acts=document.createElement('div');acts.id='done-acts';acts.className='actions';go.after(acts);}
 acts.innerHTML=`<a class="b" href="${esc(next)}">${t('Тегін бастау','Начать бесплатно')}</a><a class="b primary" href="/checkout?plan=${id}&period=${periodQ}">${t('Тарифті таңдау: ','Выбрать тариф ')}${esc(planName(p))}</a>`;
 putMascot('Celebrating');$('#q-title').focus();
}

(async()=>{
 const pr=await api.profile();
 if(pr.status===401){location.replace('/login?next=/onboarding'+encodeURIComponent(location.search));return;}
 if(pr.ok){role=pr.data.role||'teacher';next=pr.data.next&&pr.data.next!=='/onboarding'?pr.data.next:'/teacher';if(role==='parent'&&next==='/teacher')next='/account';}
 const ob=await api.onboarding();if(ob.ok&&ob.data.answers)answers={...ob.data.answers};
 render(false);
 onLang(()=>{const acts=$('#done-acts');if(acts)acts.remove();finished?done():render(false);});
})();
