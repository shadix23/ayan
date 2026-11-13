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
  saving:['Сақтап жатырмыз…','Сохраняем…'],assigned:['Сабақ тағайындалды. Бала оны өз бетін жаңартқаннан кейін көреді.','Урок назначен. Ребёнок увидит его после обновления своей страницы.'],
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
  correct:['Дұрыс. Тапсырма орындалды. Нәтиже сақталды.','Верно. Задание выполнено. Результат сохранён.'],
  retry:['Тағы бір рет байқап көрейік. Түсіндірмеге оралып, көмек сұрауға болады.','Попробуем ещё раз. Можно вернуться к объяснению и попросить помощь.'],
  askTitle:['Аяннан түсіндіруді сұрау','Попросить Аяна объяснить'],askNote:['ЖИ қателесуі мүмкін. Түсініксіз болса, ересекті шақыр.','ИИ может ошибаться. Если объяснение непонятно, позови взрослого.'],
  teacherHint:['Мұғалімнің түсіндірмесін қайталау','Повторить объяснение учителя'],askWhat:['Нені түсіндіру керек?','Что объяснить?'],askPh:['Осы қадамды қарапайым мысалмен түсіндірші','Объясни этот шаг на простом примере'],
  askBtn:['Аяннан сұрау (ЖИ)','Спросить Аяна (ИИ)'],thinking:['Аян ойланып жатыр…','Аян думает…'],
  resumeTitle:['Біз {n}-қадамда тоқтадық','Мы остановились на шаге {n}'],resumeGo:['{n}-қадамнан жалғастыру','Продолжить с шага {n}'],restart:['Басынан бастау','Начать сначала']
 };
 const t=(k,o)=>{let s=(S[k]||[k,k])[lang()==='kk'?0:1];if(o)for(const x in o)s=s.replaceAll('{'+x+'}',o[x]);return s;};
 const request=async(url,data)=>{if(A.demoRequest)return A.demoRequest(url,data);const r=await fetch(url,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await r.json().catch(()=>({}));if(!r.ok){const e=Error(value.error||t('failed'));e.code=value.code;throw e;}return value;};
 const aiError=(e,child)=>A.demo?t('aiDemo'):e.code==='ai_unavailable'?t(child?'aiOffChild':'aiOff'):e.message;
 const lessonURL='/api/lesson?role='+A.role+(A.role==='teacher'?'&child='+A.child:'');
 const icon={pause:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
  play:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg>',
  size:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 18 8 6l5 12M5 14h6M15 18l3.5-8 3.5 8M16 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'};

 function demoBar(){if(!A.demo)return;let bar=document.querySelector('.demo-bar');if(!bar){bar=document.createElement('aside');bar.className='demo-bar';document.body.prepend(bar);}
  bar.innerHTML=t('demoBar')+' <a href="/demo/child">'+t('student')+'</a><a href="/demo/teacher">'+t('teacher')+'</a><a href="/demo/parent'+(lang()==='kk'?'?lang=kk':'')+'">'+t('parent')+'</a>';}

 let lesson=null,index=0,large=false,paused=false,resumeAsked=false;
 async function ask(prompt,context){return (await request('/api/assistant',{prompt,context})).text;}

 // ---------- Teacher ----------
 function teacherPanel(){
  const old=document.querySelector('#product-teacher');
  if(old&&old.dataset.lang===lang())return;
  const keep=old?Object.fromEntries(new FormData(old.querySelector('#lesson-editor'))):null;
  const el=document.createElement('section');el.className='account-panel';el.id='product-teacher';el.dataset.lang=lang();
  const tpl=(window.AyanTemplates?.list(lang())||[]).map(x=>'<button type="button" class="template-chip" data-template="'+x.id+'">'+esc(x.title)+'</button>').join('');
  el.innerHTML='<h2>'+t('panelTitle')+'</h2><div class="row"><label for="student-select">'+t('student')+'</label><select id="student-select">'+A.children.map(c=>'<option value="'+c.id+'" '+(c.id===A.child?'selected':'')+'>'+esc(c.label)+'</option>').join('')+'</select><button class="secondary" id="new-student">'+t('addStudent')+'</button><button class="secondary" id="child-invite">'+t('childEntry')+'</button><button class="secondary" id="parent-invite">'+t('parentReport')+'</button></div><p class="invite-result" id="invite-result" role="status"></p><hr>'
   +'<h2>'+t('lessonTitle')+'</h2><p>'+t('lessonHint')+'</p>'
   +(tpl?'<div class="templates"><h3>'+t('templates')+'</h3><p class="help-text">'+t('templatesHint')+'</p><div class="template-list">'+tpl+'</div></div>':'')
   +'<form id="lesson-editor"><label for="lesson-title">'+t('fTitle')+'</label><input id="lesson-title" name="title" placeholder="'+esc(t('fTitlePh'))+'" required maxlength="160">'
   +'<label for="lesson-steps">'+t('fSteps')+'</label><textarea id="lesson-steps" name="steps" rows="5" required placeholder="'+esc(t('fStepsPh'))+'"></textarea>'
   +'<label for="lesson-question">'+t('fQuestion')+'</label><input id="lesson-question" name="question" placeholder="'+esc(t('fQuestionPh'))+'" required>'
   +'<label for="lesson-answer">'+t('fAnswer')+'</label><input id="lesson-answer" name="answer" placeholder="5" required aria-describedby="answer-hint"><p class="help-text" id="answer-hint">'+t('fAnswerHint')+'</p>'
   +'<div class="actions"><button class="secondary" type="button" id="ai-draft">'+t('aiDraft')+'</button><button class="primary">'+t('assign')+'</button></div><p class="status-line" id="lesson-status" role="status"></p></form>';
  if(old)old.replaceWith(el);else document.querySelector('#app').prepend(el);
  const f=el.querySelector('#lesson-editor'),status=el.querySelector('#lesson-status');
  const fill=l=>{f.elements.title.value=l.title||'';f.elements.steps.value=(Array.isArray(l.steps)?l.steps.join('\n'):l.steps)||'';f.elements.question.value=l.question||'';f.elements.answer.value=l.answer||'';};
  if(keep)fill(keep);else request(lessonURL).then(l=>{if(l)fill(l);}).catch(()=>{});
  el.querySelector('#student-select').onchange=e=>{sessionStorage.setItem('ayan.selected.'+A.me.id,e.target.value);location.reload();};
  el.querySelector('#new-student').onclick=studentDialog;
  for(const [id,url] of [['child-invite','/api/invite'],['parent-invite','/api/parent/invite']])el.querySelector('#'+id).onclick=async()=>{const out=el.querySelector('#invite-result');try{await A.flush();const r=await request(url,{child:A.child});out.replaceChildren();const a=document.createElement('a');a.href=r.url;a.textContent=r.url;a.target='_blank';a.rel='noopener';out.append(t(id==='child-invite'?'childLink':'parentLink'),a);}catch(e){out.textContent=e.message;}};
  el.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{const l=window.AyanTemplates.get(b.dataset.template,lang());fill(l);el.querySelectorAll('[data-template]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));status.textContent=t('templateIn');});
  f.onsubmit=async e=>{e.preventDefault();status.textContent=t('saving');try{const data=Object.fromEntries(new FormData(f));data.steps=data.steps.split('\n').filter(x=>x.trim());await request(lessonURL,data);status.textContent=t('assigned');}catch(err){status.textContent=err.message;}};
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
 function mountChild(){
  const mark=document.querySelector('.world-brand .brand-leaf');if(mark&&!mark.querySelector('img'))mark.innerHTML='<img src="/assets/ayan-mark.svg" width="36" height="36" alt="">';
  const main=document.querySelector('.world-main');if(!main)return;
  const old=document.querySelector('#assigned-lesson');if(old&&old.dataset.lang===lang())return;
  const el=document.createElement('section');el.className='account-panel';el.id='assigned-lesson';el.dataset.lang=lang();
  el.innerHTML='<span class="eyebrow">'+t('myLesson')+'</span><h2>'+esc(lesson?.title||t('preparing'))+'</h2><p>'+(lesson?t('lessonInvite'):t('lessonLater'))+'</p>'+(lesson?'<button class="primary" id="open-lesson">'+t('start')+'</button>':'');
  if(old)old.replaceWith(el);else main.prepend(el);
  el.querySelector('#open-lesson')?.addEventListener('click',openLesson);
 }
 let eventQueue=Promise.resolve();
 const event=(kind,value='')=>{eventQueue=eventQueue.catch(()=>{}).then(()=>request('/api/lesson/event',{kind,value}));return eventQueue.catch(()=>{});};
 const total=()=>lesson.steps.length+1;
 function openLesson(){
  document.querySelector('#lesson-dialog')?.remove();
  const d=document.createElement('dialog');d.id='lesson-dialog';d.className='lesson-dialog';document.body.append(d);
  d.addEventListener('close',()=>{speechSynthesis?.cancel();if(index>0)lesson.resume=index+1;d.remove();});
  resumeAsked=!(lesson.resume>1);if(resumeAsked){index=0;event('step','1');}
  d.showModal();draw();
 }
 function draw(){
  const d=document.querySelector('#lesson-dialog');if(!d)return;
  if(!resumeAsked){
   d.innerHTML='<div class="lesson-reader lesson-resume"><div class="lesson-top"><button class="secondary" id="lesson-close">← '+t('back')+'</button></div><h1>'+esc(lesson.title)+'</h1><p class="lesson-step">'+t('resumeTitle',{n:lesson.resume})+'</p><div class="lesson-choice"><button class="primary" id="resume-go">'+t('resumeGo',{n:lesson.resume})+'</button><button class="secondary" id="resume-restart">'+t('restart')+'</button></div></div>';
   d.querySelector('#lesson-close').onclick=()=>d.close();
   d.querySelector('#resume-go').onclick=()=>{resumeAsked=true;index=Math.min(lesson.resume-1,lesson.steps.length);event('step',String(index+1));draw();};
   d.querySelector('#resume-restart').onclick=()=>{resumeAsked=true;index=0;event('step','1');draw();};
   d.querySelector('#resume-go').focus();return;
  }
  const question=index>=lesson.steps.length;
  const body=paused?'<div class="lesson-step">'+t('rest')+'</div>'
   :!question?'<div class="lesson-step">'+esc(lesson.steps[index])+'</div>'
   :'<div class="lesson-step">'+esc(lesson.question)+'</div><form id="answer-form" class="answer-form"><label for="lesson-response">'+t('yourAnswer')+'</label><input id="lesson-response" required maxlength="200" autocomplete="off"></form>';
  const bar=paused?'<button class="primary lesson-next" id="lesson-pause-end">'+t('resume')+'</button>'
   :'<div class="lesson-bar-row"><button class="secondary" id="speak-step" '+(question?'hidden':'')+'>'+t('listen')+'</button><button class="secondary" id="repeat-step" '+(index===0?'disabled':'')+'>'+t('prevStep')+'</button></div>'
    +(question?'<button class="primary lesson-next" type="submit" form="answer-form">'+t('check')+'</button>':'<button class="primary lesson-next" id="next-step">'+t('next')+'</button>');
  d.innerHTML='<div class="lesson-reader'+(large?' is-large':'')+'"><div class="lesson-top"><button class="secondary" id="lesson-close">← '+t('back')+'</button><span class="lesson-progress">'+t('stepOf',{n:index+1,m:total()})+'</span><div class="lesson-tools">'
   +'<button class="icon-btn" id="lesson-pause" aria-pressed="'+paused+'" aria-label="'+t(paused?'resume':'pause')+'" title="'+t(paused?'resume':'pause')+'">'+(paused?icon.play:icon.pause)+'</button>'
   +'<button class="icon-btn" id="lesson-size" aria-pressed="'+large+'" aria-label="'+t('large')+'" title="'+t('large')+'">'+icon.size+'</button></div></div>'
   +'<div class="lesson-content"><h1>'+esc(lesson.title)+'</h1>'+body+'<p id="lesson-feedback" class="lesson-feedback" role="status"></p>'
   +'<details class="lesson-help"><summary>'+t('askTitle')+'</summary><p>'+t('askNote')+'</p><button class="secondary" id="teacher-hint">'+t('teacherHint')+'</button><form id="assistant-form"><label for="assistant-question">'+t('askWhat')+'</label><textarea id="assistant-question" required maxlength="2000" placeholder="'+esc(t('askPh'))+'"></textarea><button class="secondary">'+t('askBtn')+'</button></form><p id="assistant-reply" role="status"></p></details></div>'
   +'<div class="lesson-bar">'+bar+'</div></div>';
  const $=s=>d.querySelector(s);
  $('#lesson-close').onclick=()=>d.close();
  const togglePause=()=>{paused=!paused;if(paused){speechSynthesis?.cancel();event('pause');}draw();};
  $('#lesson-pause').onclick=togglePause;$('#lesson-pause-end')?.addEventListener('click',togglePause);
  $('#lesson-size').onclick=()=>{large=!large;draw();};
  $('#next-step')?.addEventListener('click',()=>{index++;event('step',String(index+1));draw();});
  $('#repeat-step')?.addEventListener('click',()=>{index=Math.max(0,index-1);event('hint');draw();});
  $('#speak-step')?.addEventListener('click',()=>{if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance(lesson.steps[index]);u.lang=lang()==='kk'?'kk-KZ':'ru-RU';u.rate=.85;speechSynthesis.cancel();speechSynthesis.speak(u);});
  $('#teacher-hint').onclick=()=>{event('hint');$('#assistant-reply').textContent=lesson.steps[Math.min(index,lesson.steps.length-1)];};
  $('#answer-form')?.addEventListener('submit',async e=>{e.preventDefault();const result=await event('answer',$('#lesson-response').value);$('#lesson-feedback').textContent=t(result?.value==='correct'?'correct':'retry');});
  $('#assistant-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button'),out=$('#assistant-reply');b.disabled=true;out.textContent=t('thinking');event('hint');try{out.textContent=await ask($('#assistant-question').value);}catch(err){out.textContent=aiError(err,true);}finally{b.disabled=false;}};
  ($('#next-step')||$('#lesson-response')||$('#lesson-pause-end'))?.focus({preventScroll:true});
 }

 function decorate(){
  try{localStorage.setItem('ayan.page.lang',lang());}catch(e){}
  demoBar();
  document.querySelectorAll('.brand #logo,.mobile-brand').forEach(el=>{if(!el.querySelector('img[src$="ayan-mark.svg"]'))el.innerHTML='<img src="/assets/ayan-mark.svg" alt="" width="40" height="40">';});
  document.querySelectorAll('.mode-switch').forEach(el=>el.remove());
  if(A.role==='teacher'){const view=document.querySelector('#nav [aria-current="page"]')?.dataset.v;if(!view||view==='home')teacherPanel();}
  else{mountChild();if(document.querySelector('#lesson-dialog'))draw();}
 }
 request(lessonURL).then(l=>{lesson=l;document.querySelector('#assigned-lesson')?.remove();decorate();}).catch(()=>decorate());
 new MutationObserver(()=>{if(A.role==='child')mountChild();}).observe(document.querySelector('#world'),{childList:true});
 window.addEventListener('ayan:render',decorate);window.addEventListener('ayan:lang',decorate);decorate();
})();
