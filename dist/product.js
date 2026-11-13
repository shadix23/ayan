// Account layer on top of the demo UI: teacher lesson panel, child lesson reader, demo bar.
// Every visible string is a [kk, ru] pair; the panel redraws on `ayan:render` and `ayan:lang`.
(()=>{
 const A=window.AyanAccount;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lang=()=>document.documentElement.lang==='kk'?'kk':'ru';
 const S={
  demoBar:['Демо-деректер','Демо-данные'],student:['Оқушы','Ученик'],teacher:['Мұғалім','Учитель'],parent:['Ата-ана','Родитель'],
  panelTitle:['Оқушылар және сабақ','Ученики и занятие'],addStudent:['Оқушы қосу','Добавить ученика'],childEntry:['Баланың кіруі','Вход ребёнка'],parentReport:['Ата-анаға есеп','Отчёт родителю'],
  childLink:['Балаға арналған бір реттік сілтеме, 24 сағат жарамды: ','Одноразовая ссылка для ребёнка, действует 24 часа: '],
  parentLink:['Есепке сілтеме, 30 күн жарамды. Жаңа сілтеме бұрынғысын жояды: ','Ссылка на отчёт, действует 30 дней. Новая ссылка отменяет прежнюю: '],
  lessonTitle:['Тақырыпты қадаммен түсіндіру','Объяснение темы по шагам'],lessonHint:['Материал тексеріп, жариялағаннан кейін таңдалған оқушыда пайда болады','Материал появится у выбранного ученика после вашей проверки и публикации'],
  templates:['Дайын үлгілер','Готовые шаблоны'],templatesHint:['Үлгіні таңдаңыз, түзетіңіз де тағайындаңыз','Выберите шаблон, поправьте и назначьте'],templateIn:['Үлгі қойылды. Әр қадамды тексеріп, сабақты тағайындаңыз.','Шаблон вставлен. Проверьте шаги и назначьте урок.'],
  fTitle:['Сабақ тақырыбы','Тема урока'],fTitlePh:['Мысалы, 10 көлеміндегі қосу','Например, сложение в пределах 10'],
  fSteps:['Түсіндіру: бір жолға бір қадам','Объяснение: один шаг на строке'],fStepsPh:['Екі дөңгелекке қара.\nТағы үш дөңгелек қос.\nБарлық дөңгелекті бірге сана.','Посмотри на два кружка.\nДобавь ещё три кружка.\nПосчитай все кружки вместе.'],
  fQuestion:['Өзін-өзі тексеруге арналған сұрақ','Вопрос для самостоятельной проверки'],fQuestionPh:['2 + 3 неше болады?','Сколько будет 2 + 3?'],
  fAnswer:['Қысқа дұрыс жауап','Короткий правильный ответ'],fAnswerHint:['Бірнеше дұрыс жауапты нүктелі үтірмен жазыңыз: 5; бес','Несколько верных ответов через точку с запятой: 5; пять'],
  aiDraft:['Түсіндіруге көмек (ЖИ)','Помочь с объяснением (ИИ)'],assign:['Тексерілді - сабақты тағайындау →','Проверено - назначить урок →'],
  saving:['Сақтап жатырмыз…','Сохраняем…'],versionN:['({n}-нұсқа)','(версия {n})'],revoke:['Баланың кіруін жабу','Закрыть доступ ребёнку'],revokeConfirm:['Баланың барлық сессиялары, шақырулары және ата-ана сілтемесі жойылады. Сабақ тарихы сақталады. Жалғастырамыз ба?','Все сессии ребёнка, приглашения и ссылка родителя перестанут работать. История занятий сохранится. Продолжить?'],revoked:['Кіру жабылды. Жаңа кіру үшін жаңа шақыру жасаңыз.','Доступ закрыт. Для нового входа создайте новое приглашение.'],assigned:['Сабақ тағайындалды. Бала оны өз бетін жаңартқаннан кейін көреді.','Урок назначен. Ребёнок увидит его после обновления своей страницы.'],
  needTitle:['Алдымен сабақ тақырыбын жазыңыз','Сначала укажите тему урока'],drafting:['Аян түсіндірме құрастырып жатыр…','Аян составляет объяснение…'],
  draftDone:['ЖИ жобасы. Жарияламас бұрын әр қадамды тексеріңіз.','Черновик ИИ. Проверьте каждый шаг перед публикацией.'],
  aiOff:['ЖИ қазір қолжетімсіз, қадамдарды қолмен толтырыңыз.','ИИ сейчас недоступен, заполните шаги вручную.'],
  aiOffChild:['ЖИ қазір қолжетімсіз. Мұғалімнің түсіндірмесін қайтала немесе ересекті шақыр.','ИИ сейчас недоступен. Повтори объяснение учителя или позови взрослого.'],
  aiDemo:['Демода оқу сценарийі көрсетілген. ЖИ-дің нағыз жауабы үшін жеке кабинетке кіріңіз.','В демо показан учебный сценарий. Для настоящего ответа ИИ войдите в личный кабинет.'],
  failed:['Сұранысты орындау мүмкін болмады. Қайталап көріңіз.','Не удалось выполнить запрос. Попробуйте ещё раз.'],
  dlgTitle:['Жаңа оқушы','Новый ученик'],dlgName:['Аты немесе лақап аты','Имя или псевдоним'],dlgHint:['Тегі мен диагнозы жазылмайды','Без фамилии и диагноза'],add:['Қосу','Добавить'],cancel:['Болдырмау','Отмена'],
  myLesson:['Менің сабағым','Моё занятие'],preparing:['Мұғалім сабақ дайындап жатыр','Учитель готовит занятие'],
  lessonInvite:['Түсіндірмені көріп, бірге байқап көрейік','Посмотрим на объяснение и попробуем вместе'],lessonLater:['Мұғалім тақырып тағайындағанда, ол осында пайда болады','Когда учитель назначит тему, она появится здесь'],
  start:['Сабақты бастау →','Начать занятие →'],back:['Артқа','Назад'],pause:['Үзіліс','Перерыв'],resume:['Жалғастыру','Продолжить'],large:['Ірі мәтін','Крупный текст'],
  stepOf:['{n}-қадам, барлығы {m}','Шаг {n} из {m}'],rest:['Демалуға болады. Сабақ күтіп тұрады.','Можно отдохнуть. Занятие подождёт.'],
  listen:['Тыңдау','Послушать'],prevStep:['Қадамға оралу','Назад к шагу'],next:['Әрі қарай →','Дальше →'],
  yourAnswer:['Сенің жауабың','Твой ответ'],check:['Тексеру','Проверить'],
  savingAnswer:['Жауапты сақтап жатырмыз…','Сохраняем ответ…'],saveFailed:['Жауап әзірге сақталмады. Тағы байқап көрейік.','Ответ пока не сохранён. Попробуем ещё раз.'],resend:['Қайта жіберу','Отправить ещё раз'],
  emptyAnswer:['Алдымен жауабыңды жаз.','Сначала напиши ответ.'],correctDone:['Сақталды. Дұрыс! Сабақ аяқталды.','Сохранено. Верно! Урок завершён.'],
  incorrectSaved:['Сақталды. Әзірге басқаша. Түсіндірмеге оралып, тағы байқап көр.','Сохранено. Пока не так. Можно вернуться к объяснению и попробовать ещё раз.'],
  finish:['Тапсырмаларыма','К моим заданиям'],alreadyDone:['Бұл сабақ өтілді. Қайталауға болады.','Этот урок уже пройден. Можно повторить.'],again:['Сабақты қайталау','Повторить урок'],
  lessonChanged:['Мұғалім сабақты жаңартты. Бетті жаңартыңыз.','Учитель обновил урок. Обнови страницу.'],
  askTitle:['Аяннан түсіндіруді сұрау','Попросить Аяна объяснить'],askNote:['ЖИ қателесуі мүмкін. Түсініксіз болса, ересекті шақыр.','ИИ может ошибаться. Если объяснение непонятно, позови взрослого.'],
  teacherHint:['Мұғалімнің түсіндірмесін қайталау','Повторить объяснение учителя'],askWhat:['Нені түсіндіру керек?','Что объяснить?'],askPh:['Осы қадамды қарапайым мысалмен түсіндірші','Объясни этот шаг на простом примере'],
  askBtn:['Аяннан сұрау (ЖИ)','Спросить Аяна (ИИ)'],thinking:['Аян ойланып жатыр…','Аян думает…'],
  loadingLesson:['Сабақты жүктеп жатырмыз…','Загружаем урок…'],repeatExplain:['Түсіндіруді қайталау','Повторить объяснение'],yourLesson:['Сенің сабағың','Твой урок'],stExplain:['Түсіндіру','Объяснение'],stPractice:['Жаттығу','Практика'],stResult:['Нәтиже','Результат'],
  about:['Шамамен {n} минут. Таймер жоқ.','Примерно {n} минут. Без таймера.'],savedAt:['Сақталды: {n}-қадам, барлығы {m}','Сохранено: шаг {n} из {m}'],
  startLesson:['Сабақты бастау →','Начать урок →'],continueLesson:['Сабақты жалғастыру →','Продолжить урок →'],lessonPassed:['Сабақ өтілді ✓','Урок пройден ✓'],
  noLesson:['Мұғалім әлі сабақ тағайындаған жоқ','Учитель пока не назначил урок'],noLessonText:['Әзірге ойнауға немесе бейне көруге болады.','Пока можно поиграть или посмотреть видео.'],openGames:['Ойындарды ашу','Открыть игры'],
  offline:['Серверге қосылу жоқ','Нет связи с сервером'],offlineText:['Байланыс оралғанда сабақ пайда болады.','Урок появится, когда связь вернётся.'],tryAgain:['Қайта байқау','Попробовать ещё раз'],
  resultTitle:['Сабақ өтілді','Урок пройден'],resultAnswer:['Жауабың сақталды: «{a}». Дұрыс.','Ответ сохранён: «{a}». Верно.'],nextStep:['Келесі қадам','Следующий шаг'],
  nextGame:['Ойында бекіт: «{g}»','Закрепи в игре «{g}»'],playGame:['Ойнау: {g}','Играть: {g}'],toDay:['Менің күніме','К моему дню'],
  settings:['Баптаулар','Настройки'],settingsNote:['Бұл тек ыңғайлылық баптаулары.','Это только настройки удобства.'],language:['Тіл','Язык'],bigText:['Ірі мәтін','Крупный текст'],
  captionsOpt:['Бейнеде субтитр','Субтитры в видео'],soundOpt:['Дыбыс және оқып беру','Звук и озвучка'],motionOpt:['Қозғалыс және анимация','Движение и анимация'],save:['Сақтау','Сохранить'],saved:['Сақталды','Сохранено'],
  support:['Қолдау профилі','Профиль поддержки'],supportNote:['Бұл диагноз емес: тек оқушыға ыңғайлы баптаулар. Мазмұнға қол жетімділікті азайтпайды.','Это не диагноз: только удобные ученику настройки. Доступ к содержанию не уменьшают.'],
  paceOpt:['Нұсқаулық қарқыны','Темп инструкций'],paceNormal:['Қалыпты','Обычный'],paceSlow:['Баяу','Медленный'],inputOpt:['Енгізу тәсілі','Способ ввода'],inputButtons:['Батырмалар','Кнопки'],inputDrag:['Сүйреу','Перетаскивание'],
  repeatOpt:['Түсіндіруді қайталау батырмасы әрқашан көрінеді','Кнопка повтора объяснения всегда видна'],
  resumeTitle:['Біз {n}-қадамда тоқтадық','Мы остановились на шаге {n}'],resumeGo:['{n}-қадамнан жалғастыру','Продолжить с шага {n}'],restart:['Басынан бастау','Начать сначала']
 };
 const t=(k,o)=>{let s=(S[k]||[k,k])[lang()==='kk'?0:1];if(o)for(const x in o)s=s.replaceAll('{'+x+'}',o[x]);return s;};
 const request=async(url,data)=>{if(A.demoRequest)return A.demoRequest(url,data);let r;try{r=await fetch(url,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}catch(err){const e=Error(t('failed'));e.status=0;throw e;}const value=await r.json().catch(()=>({}));if(!r.ok){const e=Error(value.error||t('failed'));e.code=value.code;e.status=r.status;e.data=value;throw e;}return value;};
 const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,12);
 const aiError=(e,child)=>A.demo?t('aiDemo'):e.code==='ai_unavailable'?t(child?'aiOffChild':'aiOff'):e.message;
 const lessonURL='/api/lesson?role='+A.role+(A.role==='teacher'?'&child='+A.child:'');
 const icon={pause:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
  play:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg>',
  size:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 18 8 6l5 12M5 14h6M15 18l3.5-8 3.5 8M16 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'};

 function demoBar(){if(!A.demo)return;let bar=document.querySelector('.demo-bar');if(!bar){bar=document.createElement('aside');bar.className='demo-bar';document.body.prepend(bar);}
  bar.innerHTML=t('demoBar')+' <a href="/demo/child">'+t('student')+'</a><a href="/demo/teacher">'+t('teacher')+'</a><a href="/demo/parent'+(lang()==='kk'?'?lang=kk':'')+'">'+t('parent')+'</a>';}

 let lesson=null,lessonState='loading',index=0,large=false,paused=false,resumeAsked=false,attempt=null;
 // Support profile (support.mjs). Applied everywhere: language, text size, motion, sound, captions, pace.
 let profile=null;
 const supportURL='/api/support?role='+A.role+(A.role==='teacher'?'&child='+A.child:'');
 window.AyanSupport={get:()=>profile};
 function applyProfile(p){profile=p;if(A.role!=='child')return;large=p.textSize==='large';window.dispatchEvent(new CustomEvent('ayan:profile',{detail:p}));decorate();}
 window.AyanVideoProgress=data=>request('/api/video/progress',data).catch(()=>{}); // viewing only, not mastery
 const speak=text=>{if(!window.speechSynthesis||profile?.sound===false)return;const u=new SpeechSynthesisUtterance(text);u.lang=lang()==='kk'?'kk-KZ':'ru-RU';u.rate=profile?.pace==='slow'?.7:.85;speechSynthesis.cancel();speechSynthesis.speak(u);};
 // Answer lifecycle: editing -> submitting -> evaluated, or submitting -> save_failed -> retry with the same submissionId.
 let ans={status:'editing',text:'',submissionId:null,evaluation:null};
 async function ask(prompt,context){return (await request('/api/assistant',{prompt,context})).text;}

 // ---------- Teacher ----------
 function teacherPanel(){
  const old=document.querySelector('#product-teacher');
  if(old&&old.dataset.lang===lang())return;
  const keep=old?Object.fromEntries(new FormData(old.querySelector('#lesson-editor'))):null;
  const el=document.createElement('section');el.className='account-panel';el.id='product-teacher';el.dataset.lang=lang();
  const tpl=(window.AyanTemplates?.list(lang())||[]).map(x=>'<button type="button" class="template-chip" data-template="'+x.id+'">'+esc(x.title)+'</button>').join('');
  el.innerHTML='<h2>'+t('panelTitle')+'</h2><div class="row"><label for="student-select">'+t('student')+'</label><select id="student-select">'+A.children.map(c=>'<option value="'+c.id+'" '+(c.id===A.child?'selected':'')+'>'+esc(c.label)+'</option>').join('')+'</select><button class="secondary" id="new-student">'+t('addStudent')+'</button><button class="secondary" id="child-invite">'+t('childEntry')+'</button><button class="secondary" id="parent-invite">'+t('parentReport')+'</button><button class="secondary" id="child-revoke">'+t('revoke')+'</button></div><p class="invite-result" id="invite-result" role="status"></p><hr>'
   +'<h2>'+t('lessonTitle')+'</h2><p>'+t('lessonHint')+'</p>'
   +(tpl?'<div class="templates"><h3>'+t('templates')+'</h3><p class="help-text">'+t('templatesHint')+'</p><div class="template-list">'+tpl+'</div></div>':'')
   +'<form id="lesson-editor"><label for="lesson-title">'+t('fTitle')+'</label><input id="lesson-title" name="title" placeholder="'+esc(t('fTitlePh'))+'" required maxlength="160">'
   +'<label for="lesson-steps">'+t('fSteps')+'</label><textarea id="lesson-steps" name="steps" rows="5" required placeholder="'+esc(t('fStepsPh'))+'"></textarea>'
   +'<label for="lesson-question">'+t('fQuestion')+'</label><input id="lesson-question" name="question" placeholder="'+esc(t('fQuestionPh'))+'" required>'
   +'<label for="lesson-answer">'+t('fAnswer')+'</label><input id="lesson-answer" name="answer" placeholder="5" required aria-describedby="answer-hint"><p class="help-text" id="answer-hint">'+t('fAnswerHint')+'</p>'
   +'<div class="actions"><button class="secondary" type="button" id="ai-draft">'+t('aiDraft')+'</button><button class="primary">'+t('assign')+'</button></div><p class="status-line" id="lesson-status" role="status"></p></form>';
  el.insertAdjacentHTML('beforeend','<hr><h2>'+t('support')+'</h2><p class="help-text">'+t('supportNote')+'</p><form id="support-form" class="support-form"><div class="support-grid">'
   +'<label>'+t('language')+'<select name="lang"><option value="ru">Русский</option><option value="kk">Қазақша</option></select></label>'
   +'<label>'+t('paceOpt')+'<select name="pace"><option value="normal">'+t('paceNormal')+'</option><option value="slow">'+t('paceSlow')+'</option></select></label>'
   +'<label>'+t('inputOpt')+'<select name="input"><option value="buttons">'+t('inputButtons')+'</option><option value="drag">'+t('inputDrag')+'</option></select></label></div>'
   +['textSize:'+t('bigText'),'captions:'+t('captionsOpt'),'sound:'+t('soundOpt'),'motion:'+t('motionOpt'),'repeatInstruction:'+t('repeatOpt')].map(x=>{const [k,l]=x.split(':');return '<label class="check-row"><input type="checkbox" name="'+k+'"> '+l+'</label>';}).join('')
   +'<div class="actions"><button class="secondary">'+t('save')+'</button></div><p class="status-line" role="status" id="support-status"></p></form>');
  if(old)old.replaceWith(el);else document.querySelector('#app').prepend(el);
  const sf=el.querySelector('#support-form');
  const fillSupport=p=>{sf.lang.value=p.lang;sf.pace.value=p.pace;sf.input.value=p.input;sf.textSize.checked=p.textSize==='large';for(const k of ['captions','sound','motion','repeatInstruction'])sf[k].checked=!!p[k];};
  request(supportURL).then(p=>{profile=p;fillSupport(p);}).catch(()=>{});
  sf.onsubmit=async e=>{e.preventDefault();const st=el.querySelector('#support-status');try{profile=await request(supportURL,{lang:sf.lang.value,pace:sf.pace.value,input:sf.input.value,textSize:sf.textSize.checked?'large':'normal',captions:sf.captions.checked,sound:sf.sound.checked,motion:sf.motion.checked,repeatInstruction:sf.repeatInstruction.checked});fillSupport(profile);st.textContent=t('saved');}catch(err){st.textContent=err.message;}};
  const f=el.querySelector('#lesson-editor'),status=el.querySelector('#lesson-status');
  const fill=l=>{f.elements.title.value=l.title||'';f.elements.steps.value=(Array.isArray(l.steps)?l.steps.join('\n'):l.steps)||'';f.elements.question.value=l.question||'';f.elements.answer.value=l.answer||'';};
  if(keep)fill(keep);else request(lessonURL).then(l=>{if(l){fill(l);A.lessonVersion=l.id;}}).catch(()=>{});
  el.querySelector('#student-select').onchange=e=>{sessionStorage.setItem('ayan.selected.'+A.me.id,e.target.value);location.reload();};
  el.querySelector('#new-student').onclick=studentDialog;
  for(const [id,url] of [['child-invite','/api/invite'],['parent-invite','/api/parent/invite']])el.querySelector('#'+id).onclick=async()=>{const out=el.querySelector('#invite-result');try{await A.flush();const r=await request(url,{child:A.child});out.replaceChildren();const a=document.createElement('a');a.href=r.url;a.textContent=r.url;a.target='_blank';a.rel='noopener';out.append(t(id==='child-invite'?'childLink':'parentLink'),a);}catch(e){out.textContent=e.message;}};
  el.querySelector('#child-revoke').onclick=async()=>{const out=el.querySelector('#invite-result');if(!confirm(t('revokeConfirm')))return;try{await request('/api/children/revoke',{child:A.child});out.textContent=t('revoked');}catch(e){out.textContent=e.message;}};
  el.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{const l=window.AyanTemplates.get(b.dataset.template,lang());fill(l);el.querySelectorAll('[data-template]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));status.textContent=t('templateIn');});
  f.onsubmit=async e=>{e.preventDefault();status.textContent=t('saving');try{const data=Object.fromEntries(new FormData(f));data.steps=data.steps.split('\n').filter(x=>x.trim());const published=await request(lessonURL,{...data,locale:lang()});A.lessonVersion=published?.id||A.lessonVersion;status.textContent=t('assigned')+(published?.version?' '+t('versionN',{n:published.version}):'');}catch(err){status.textContent=err.message;}};
  el.querySelector('#ai-draft').onclick=async e=>{if(!f.elements.title.value.trim()){status.textContent=t('needTitle');return;}const b=e.currentTarget;b.disabled=true;status.textContent=t('drafting');
   const prompt=lang()==='kk'?'Тақырыпты 3-5 қарапайым қадамға бөл. Бір жолға бір қадам. Нөмірсіз, тақырыпшасыз, белгілеусіз. Қазақ тілінде жаз. Тақырып: ':'Разбей тему на 3-5 простых шагов. Один шаг на строке. Без нумерации, заголовков и разметки. Тема: ';
   try{f.elements.steps.value=await ask(prompt+f.elements.title.value,f.elements.steps.value);status.textContent=t('draftDone');}catch(err){status.textContent=aiError(err,false);}finally{b.disabled=false;}};
 }
 function studentDialog(){
  document.querySelector('#student-dialog')?.remove();
  const d=document.createElement('dialog');d.id='student-dialog';d.className='ayan-dialog';d.setAttribute('aria-labelledby','student-dialog-title');
  d.innerHTML='<form method="dialog" class="student-form"><h2 id="student-dialog-title">'+t('dlgTitle')+'</h2><label for="student-name">'+t('dlgName')+'</label><input id="student-name" name="label" required maxlength="40" autocomplete="off" aria-describedby="student-hint"><p class="help-text" id="student-hint">'+t('dlgHint')+'</p><p class="status-line" role="status" id="student-status"></p><div class="actions"><button type="button" class="secondary" value="cancel" id="student-cancel">'+t('cancel')+'</button><button class="primary" value="add">'+t('add')+'</button></div></form>';
  document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();d.querySelector('#student-name').focus();
  d.querySelector('#student-cancel').onclick=()=>d.close();
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();const label=d.querySelector('#student-name').value.trim();if(!label)return;const b=e.submitter;if(b)b.disabled=true;
   try{const c=await request('/api/children',{label});sessionStorage.setItem('ayan.selected.'+A.me.id,c.id);location.reload();}catch(err){d.querySelector('#student-status').textContent=err.message;if(b)b.disabled=false;}};
 }

 // ---------- Child ----------
 function nextGame(){try{const st=JSON.parse(localStorage.getItem('ayan.experience.v2')||'{}');const g=(window.AyanWorld?.games||[]).find(x=>(st.enabled||[]).includes(x.id)&&!(st.completed||[]).includes(x.id))||(window.AyanWorld?.games||[])[0];return g||null;}catch{return null;}}
 function stageOf(){if(!lesson)return 0;if(lesson.completedAttempt&&!lesson.attemptId)return 3;const n=Number(lesson.resume)||1;return n>lesson.steps.length?2:1;}
 function stages(current,done){return '<ol class="lesson-stages">'+[['stExplain',1],['stPractice',2],['stResult',3]].map(([k,n])=>'<li class="'+(done||n<current?'is-done':n===current?'is-current':'')+'"'+(n===current&&!done?' aria-current="step"':'')+'><span aria-hidden="true">'+(done||n<current?'✓':n)+'</span>'+t(k)+'</li>').join('')+'</ol>';}
 // "My day": one main call to action; honest loading, empty and offline states.
 function mountChild(){
  const mark=document.querySelector('.world-brand .brand-leaf');if(mark&&!mark.querySelector('img'))mark.innerHTML='<img src="/assets/ayan-mark.svg" width="36" height="36" alt="">';
  const slot=document.querySelector('#day-lesson');if(!slot)return;
  const sig=lang()+'|'+lessonState+'|'+(lesson?.id||'')+'|'+(lesson?.resume||'')+'|'+(lesson?.completedAttempt||'')+'|'+(lesson?.attemptId||'');if(slot.dataset.sig===sig)return;slot.dataset.sig=sig;
  if(lessonState==='loading'){slot.innerHTML='<div class="day-card is-loading" role="status">'+t('loadingLesson')+'</div>';return;}
  if(lessonState==='error'){slot.innerHTML='<article class="day-card is-offline" role="alert"><h2>'+t('offline')+'</h2><p>'+t('offlineText')+'</p><button class="primary day-cta" id="lesson-retry">'+t('tryAgain')+'</button></article>';slot.querySelector('#lesson-retry').onclick=loadLesson;return;}
  if(!lesson){slot.innerHTML='<article class="day-card is-empty"><h2>'+t('noLesson')+'</h2><p>'+t('noLessonText')+'</p><button class="primary day-cta" data-goto-tab="games">'+t('openGames')+'</button></article>';return;}
  const st=stageOf(),done=st===3;
  slot.innerHTML='<article class="day-card" aria-labelledby="day-lesson-title"><span class="eyebrow">'+t('yourLesson')+'</span><h2 id="day-lesson-title">'+esc(lesson.title)+'</h2>'+stages(st,done)
   +'<p class="day-meta">'+t('about',{n:Math.max(3,lesson.steps.length+2)})+'</p>'+(lesson.resume>1&&!done?'<p class="day-saved">'+t('savedAt',{n:lesson.resume,m:lesson.steps.length+1})+'</p>':'')+(done?'<p class="day-saved">'+t('lessonPassed')+'</p>':'')
   +'<button class="primary day-cta" id="open-lesson">'+(done?t('again'):lesson.resume>1?t('continueLesson'):t('startLesson'))+'</button></article>';
  slot.querySelector('#open-lesson').addEventListener('click',openLesson);
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-goto-tab]');if(b)window.dispatchEvent(new CustomEvent('ayan:goto',{detail:{tab:b.dataset.gotoTab}}));});
 async function loadLesson(){lessonState='loading';mountChild();try{lesson=await request(lessonURL);lessonState='ready';}catch(e){lessonState=e.status===0||e.status>=500?'error':'ready';lesson=null;}mountChild();}
 let eventQueue=Promise.resolve();
 const event=(kind,value='')=>{eventQueue=eventQueue.catch(()=>{}).then(()=>request('/api/lesson/event',{kind,value,attemptId:attempt?.id}));return eventQueue.catch(()=>{});};
 // Starts (or re-opens) an attempt on the server. Idempotent: the same id can be sent again after a timeout.
 async function ensureAttempt(){if(!attempt)return null;if(attempt.confirmed)return attempt;try{const view=await request('/api/attempt',{attemptId:attempt.id,lessonVersion:lesson.id,locale:lang()});attempt={...view,confirmed:true};return attempt;}catch(e){if(e.code==='lesson_changed')attempt.changed=true;return null;}}
 function newAttempt(){attempt={id:uid(),confirmed:false};ans={status:'editing',text:'',submissionId:null,evaluation:null};}
 const total=()=>lesson.steps.length+1;
 function openLesson(){
  document.querySelector('#lesson-dialog')?.remove();
  const d=document.createElement('dialog');d.id='lesson-dialog';d.className='lesson-dialog';document.body.append(d);
  d.addEventListener('close',()=>{speechSynthesis?.cancel();if(attempt&&attempt.state!=='completed'){lesson.attemptId=attempt.id;if(index>0)lesson.resume=index+1;}d.remove();});
  if(lesson.attemptId){attempt={id:lesson.attemptId,confirmed:false};ans={status:'editing',text:'',submissionId:null,evaluation:null};}else newAttempt();
  resumeAsked=!(lesson.resume>1)&&!(lesson.completedAttempt&&!lesson.attemptId);
  if(resumeAsked){index=0;ensureAttempt().then(()=>event('step','1'));}
  d.showModal();draw();
 }
 function draw(){
  const d=document.querySelector('#lesson-dialog');if(!d)return;
  if(!resumeAsked&&lesson.completedAttempt&&!lesson.attemptId){
   d.innerHTML='<div class="lesson-reader lesson-resume"><div class="lesson-top"><button class="secondary" id="lesson-close">← '+t('back')+'</button></div><h1>'+esc(lesson.title)+'</h1><p class="lesson-step">'+t('alreadyDone')+'</p><div class="lesson-choice"><button class="primary" id="resume-restart">'+t('again')+'</button></div></div>';
   d.querySelector('#lesson-close').onclick=()=>d.close();
   d.querySelector('#resume-restart').onclick=()=>{resumeAsked=true;index=0;newAttempt();lesson.completedAttempt=null;ensureAttempt().then(()=>event('step','1'));draw();};
   d.querySelector('#resume-restart').focus();return;
  }
  if(!resumeAsked){
   d.innerHTML='<div class="lesson-reader lesson-resume"><div class="lesson-top"><button class="secondary" id="lesson-close">← '+t('back')+'</button></div><h1>'+esc(lesson.title)+'</h1><p class="lesson-step">'+t('resumeTitle',{n:lesson.resume})+'</p><div class="lesson-choice"><button class="primary" id="resume-go">'+t('resumeGo',{n:lesson.resume})+'</button><button class="secondary" id="resume-restart">'+t('restart')+'</button></div></div>';
   d.querySelector('#lesson-close').onclick=()=>d.close();
   d.querySelector('#resume-go').onclick=()=>{resumeAsked=true;index=Math.min(lesson.resume-1,lesson.steps.length);ensureAttempt().then(()=>event('step',String(index+1)));draw();};
   d.querySelector('#resume-restart').onclick=()=>{resumeAsked=true;index=0;newAttempt();ensureAttempt().then(()=>event('step','1'));draw();};
   d.querySelector('#resume-go').focus();return;
  }
  const question=index>=lesson.steps.length;
  if(finished()&&!paused)return drawResult(d);
  const body=paused?'<div class="lesson-step">'+t('rest')+'</div>'
   :!question?'<div class="lesson-step">'+esc(lesson.steps[index])+'</div>'
   :'<div class="lesson-step">'+esc(lesson.question)+'</div><form id="answer-form" class="answer-form"><label for="lesson-response">'+t('yourAnswer')+'</label><input id="lesson-response" maxlength="200" autocomplete="off" value="'+esc(ans.text)+'" '+(ans.status==='submitting'||ans.evaluation==='correct'?'readonly':'')+'></form>';
  const bar=paused?'<button class="primary lesson-next" id="lesson-pause-end">'+t('resume')+'</button>'
   :'<div class="lesson-bar-row"><button class="secondary" id="speak-step" '+(question||profile?.sound===false?'hidden':'')+'>'+t('listen')+'</button><button class="secondary" id="repeat-step" '+(index===0?'disabled':'')+'>'+t('prevStep')+'</button></div>'+(question&&profile?.repeatInstruction?'<button class="secondary" id="repeat-explain">'+t('repeatExplain')+'</button>':'')
    +(question?(ans.evaluation==='correct'&&attempt?.state==='completed'?'<button class="primary lesson-next" id="lesson-finish">'+t('finish')+'</button>':'<button class="primary lesson-next" type="submit" form="answer-form" '+(ans.status==='submitting'?'disabled aria-busy="true"':'')+'>'+t(ans.status==='save_failed'?'resend':'check')+'</button>'):'<button class="primary lesson-next" id="next-step">'+t('next')+'</button>');
  d.innerHTML='<div class="lesson-reader'+(large?' is-large':'')+'"><div class="lesson-top"><button class="secondary" id="lesson-close">← '+t('back')+'</button><div class="lesson-head-mid">'+stages(finished()?3:index>=lesson.steps.length?2:1,finished())+'<span class="lesson-progress">'+(index<lesson.steps.length?t('stepOf',{n:index+1,m:lesson.steps.length}):'')+'</span></div><div class="lesson-tools">'
   +'<button class="icon-btn" id="lesson-pause" aria-pressed="'+paused+'" aria-label="'+t(paused?'resume':'pause')+'" title="'+t(paused?'resume':'pause')+'">'+(paused?icon.play:icon.pause)+'</button>'
   +'<button class="icon-btn" id="lesson-size" aria-pressed="'+large+'" aria-label="'+t('large')+'" title="'+t('large')+'">'+icon.size+'</button></div></div>'
   +'<div class="lesson-content"><h1>'+esc(lesson.title)+'</h1>'+body+'<p id="lesson-feedback" class="lesson-feedback'+(ans.status==='save_failed'?' is-warning':'')+'" role="status">'+feedbackText()+'</p>'
   +'<details class="lesson-help"><summary>'+t('askTitle')+'</summary><p>'+t('askNote')+'</p><button class="secondary" id="teacher-hint">'+t('teacherHint')+'</button><form id="assistant-form"><label for="assistant-question">'+t('askWhat')+'</label><textarea id="assistant-question" required maxlength="2000" placeholder="'+esc(t('askPh'))+'"></textarea><button class="secondary">'+t('askBtn')+'</button></form><p id="assistant-reply" role="status"></p></details></div>'
   +'<div class="lesson-bar">'+bar+'</div></div>';
  const $=s=>d.querySelector(s);
  $('#lesson-close').onclick=()=>d.close();
  const togglePause=()=>{paused=!paused;if(paused){speechSynthesis?.cancel();event('pause');}draw();};
  $('#lesson-pause').onclick=togglePause;$('#lesson-pause-end')?.addEventListener('click',togglePause);
  $('#lesson-size').onclick=()=>{large=!large;draw();};
  $('#next-step')?.addEventListener('click',()=>{index++;event('step',String(index+1));draw();});
  $('#repeat-step')?.addEventListener('click',()=>{index=Math.max(0,index-1);event('hint');draw();});
  $('#speak-step')?.addEventListener('click',()=>speak(lesson.steps[index]));
  $('#repeat-explain')?.addEventListener('click',()=>{event('hint');$('#lesson-feedback').textContent=lesson.steps.join(' ');});
  $('#teacher-hint').onclick=()=>{event('hint');$('#assistant-reply').textContent=lesson.steps[Math.min(index,lesson.steps.length-1)];};
  $('#answer-form')?.addEventListener('submit',e=>{e.preventDefault();submitAnswer($('#lesson-response').value);});
  $('#lesson-response')?.addEventListener('input',e=>{if(ans.status!=='submitting'){ans.text=e.target.value;}});
  $('#lesson-finish')?.addEventListener('click',()=>d.close());
  $('#assistant-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button'),out=$('#assistant-reply');b.disabled=true;out.textContent=t('thinking');event('hint');try{out.textContent=await ask($('#assistant-question').value);}catch(err){out.textContent=aiError(err,true);}finally{b.disabled=false;}};
  ($('#next-step')||$('#lesson-response')||$('#lesson-pause-end'))?.focus({preventScroll:true});
 }

 const finished=()=>ans.status==='evaluated'&&ans.evaluation==='correct'&&attempt?.state==='completed';
 // Result -> next step. Shown only after the server confirmed completion.
 function drawResult(d){
  const g=nextGame(),gt=g?g.title[lang()==='kk'?1:0]:'';
  d.innerHTML='<div class="lesson-reader'+(large?' is-large':'')+'"><div class="lesson-top"><button class="secondary" id="lesson-close">← '+t('back')+'</button><div class="lesson-head-mid">'+stages(3,true)+'</div><div class="lesson-tools"></div></div>'
   +'<div class="lesson-content lesson-result"><h1 tabindex="-1">'+t('resultTitle')+'</h1><p id="lesson-feedback" class="lesson-feedback" role="status">'+t('correctDone')+'</p><p>'+t('resultAnswer',{a:esc(ans.text)})+'</p>'
   +(g?'<h2>'+t('nextStep')+'</h2><p>'+t('nextGame',{g:esc(gt)})+'</p>':'')+'</div>'
   +'<div class="lesson-bar">'+(g?'<button class="primary lesson-next" id="next-game">'+t('playGame',{g:esc(gt)})+'</button>':'')+'<button class="'+(g?'secondary':'primary lesson-next')+'" id="lesson-finish">'+t('toDay')+'</button></div></div>';
  d.querySelector('#lesson-close').onclick=()=>d.close();
  d.querySelector('#lesson-finish').onclick=()=>{d.close();window.dispatchEvent(new CustomEvent('ayan:goto',{detail:{tab:'day'}}));};
  d.querySelector('#next-game')?.addEventListener('click',()=>{d.close();window.dispatchEvent(new CustomEvent('ayan:goto',{detail:{game:g.id}}));});
  d.querySelector('h1').focus();
 }
 // Child settings: only the safe part of the support profile.
 function settingsDialog(){
  document.querySelector('#settings-dialog')?.remove();const p=profile||{};
  const d=document.createElement('dialog');d.id='settings-dialog';d.className='ayan-dialog';d.setAttribute('aria-labelledby','settings-title');
  const chk=(id,key,label)=>'<label class="check-row"><input type="checkbox" id="'+id+'" '+(p[key]!==false?'checked':'')+'> '+label+'</label>';
  d.innerHTML='<form method="dialog" class="settings-form"><h2 id="settings-title">'+t('settings')+'</h2><p class="help-text">'+t('settingsNote')+'</p>'
   +'<fieldset><legend>'+t('language')+'</legend><label class="check-row"><input type="radio" name="lang" value="ru" '+(lang()==='ru'?'checked':'')+'> Русский</label><label class="check-row"><input type="radio" name="lang" value="kk" '+(lang()==='kk'?'checked':'')+'> Қазақша</label></fieldset>'
   +'<label class="check-row"><input type="checkbox" id="set-large" '+(p.textSize==='large'?'checked':'')+'> '+t('bigText')+'</label>'+chk('set-captions','captions',t('captionsOpt'))+chk('set-sound','sound',t('soundOpt'))+chk('set-motion','motion',t('motionOpt'))
   +'<p class="status-line" role="status" id="settings-status"></p><div class="actions"><button type="button" class="secondary" id="settings-cancel">'+t('cancel')+'</button><button class="primary">'+t('save')+'</button></div></form>';
  document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();
  d.querySelector('#settings-cancel').onclick=()=>d.close();
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,next={lang:f.lang.value,textSize:f.querySelector('#set-large').checked?'large':'normal',captions:f.querySelector('#set-captions').checked,sound:f.querySelector('#set-sound').checked,motion:f.querySelector('#set-motion').checked};
   applyProfile({...profile,...next}); // works even offline; saved when the server answers
   try{applyProfile(await request(supportURL,next));d.close();}catch(err){d.querySelector('#settings-status').textContent=t('saveFailed');}};
 }
 window.addEventListener('ayan:support-open',()=>{if(A.role==='child')settingsDialog();});

 function feedbackText(){
  if(attempt?.changed)return t('lessonChanged');
  if(ans.status==='submitting')return t('savingAnswer');
  if(ans.status==='save_failed')return t('saveFailed');
  if(ans.status==='empty')return t('emptyAnswer');
  if(ans.status==='evaluated')return ans.evaluation==='correct'?t('correctDone'):t('incorrectSaved');
  return '';
 }
 async function submitAnswer(raw){
  const text=String(raw||'').trim();
  if(ans.status==='submitting')return; // double click
  if(!text){ans.status='empty';draw();return;} // no answer is not a wrong answer
  if(!ans.submissionId||ans.status==='evaluated'||text!==ans.sentText)ans.submissionId=uid(); // a new answer gets a new key; a retry of the same text keeps it
  ans.sentText=text;
  ans.text=text;ans.status='submitting';draw();
  try{
   if(!(await ensureAttempt()))throw Object.assign(Error('attempt'),{status:attempt?.changed?409:0});
   const r=await request('/api/attempt/submit',{attemptId:attempt.id,taskId:'final',submissionId:ans.submissionId,answer:text});
   ans.status='evaluated';ans.evaluation=r.evaluation;attempt={...r.attempt,confirmed:true};
  }catch(e){
   if(e.code==='completed'&&e.data?.attempt){attempt={...e.data.attempt,confirmed:true};const last=attempt.submissions.filter(s=>s.evaluation==='correct').pop();ans.status='evaluated';ans.evaluation=last?'correct':ans.evaluation;}
   else if(e.code==='empty')ans.status='empty';
   else if(e.code==='conflict'){ans.submissionId=null;ans.status='save_failed';}
   else{ // unknown outcome: ask the server what it has saved before offering a retry
    const saved=await request('/api/attempt?id='+encodeURIComponent(attempt.id)).catch(()=>null);
    const mine=saved?.submissions?.find(s=>s.submissionId===ans.submissionId);
    if(mine){ans.status='evaluated';ans.evaluation=mine.evaluation;attempt={...saved,confirmed:true};}else ans.status='save_failed';
   }
  }
  draw();
  if(ans.status==='evaluated'&&ans.evaluation==='correct'&&attempt?.state==='completed'){lesson.completedAttempt=attempt.id;lesson.attemptId=null;lesson.resume=null;}
 }

 function decorate(){
  try{localStorage.setItem('ayan.page.lang',lang());}catch(e){}
  demoBar();
  document.querySelectorAll('.brand #logo,.mobile-brand').forEach(el=>{if(!el.querySelector('img[src$="ayan-mark.svg"]'))el.innerHTML='<img src="/assets/ayan-mark.svg" alt="" width="40" height="40">';});
  document.querySelectorAll('.mode-switch').forEach(el=>el.remove());
  if(A.role==='teacher'){const view=document.querySelector('#nav [aria-current="page"]')?.dataset.v;if(!view||view==='home')teacherPanel();}
  else{mountChild();if(document.querySelector('#lesson-dialog'))draw();}
 }
 if(A.role==='child')request(supportURL).then(applyProfile).catch(()=>{});
 loadLesson();
 new MutationObserver(()=>{if(A.role==='child')mountChild();}).observe(document.querySelector('#world'),{childList:true});
 window.addEventListener('ayan:render',decorate);window.addEventListener('ayan:lang',decorate);decorate();
})();
