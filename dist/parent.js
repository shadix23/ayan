const code=document.querySelector('#parent-code'),out=document.querySelector('#parent-report'),error=document.querySelector('#report-error');
const GAMES={pairs:'Найди пару',sequence:'Что сначала',sort:'Всё по местам',pack:'Собери рюкзак',pattern:'Продолжи узор',puzzle:'Картинка по кусочкам',listen:'Послушай и найди',route:'Тропинка открытий',garden:'Сад Аяна'};
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const dayKey=ms=>{const d=new Date(ms);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();};
const dayLabel=ms=>{const now=new Date(),d=new Date(ms),y=new Date(now);y.setDate(now.getDate()-1);if(dayKey(ms)===dayKey(now.getTime()))return 'Сегодня';if(dayKey(ms)===dayKey(y.getTime()))return 'Вчера';return d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'});};
const timeLabel=ms=>new Date(ms).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
const eventText=e=>({step:'Открыт шаг '+e.value,hint:'Подсказка',pause:'Перерыв',answer:e.value==='correct'?'Верный ответ':'Повторная попытка'}[e.kind]||e.kind);
const eventTone=e=>e.kind==='answer'?(e.value==='correct'?'good':'retry'):e.kind==='hint'?'help':'plain';
function stat(value,label){const box=el('div','parent-stat');box.append(el('b','',String(value)),el('span','',label));return box;}
function render(data){
 out.replaceChildren();
 const events=data.events.filter(e=>e.kind!=='assistant').map(e=>({...e,created:Number(e.created)})).sort((a,b)=>b.created-a.created);
 const count=(list,kind,value)=>list.filter(e=>e.kind===kind&&(value===undefined||e.value===value)).length;
 const correct=count(events,'answer','correct'),retries=count(events,'answer','retry'),hints=count(events,'hint'),pauses=count(events,'pause');
 const head=el('header','parent-head');head.append(el('h2','',data.label),el('p','','Текущая тема: '+(data.lesson||'ещё не назначена')));out.append(head);
 const stats=el('div','parent-stats');stats.append(stat(correct,'верных ответов'),stat(retries,'повторных попыток'),stat(hints,'подсказок'),stat(pauses,'перерывов'));out.append(stats);
 const home=el('section','parent-home');home.append(el('h3','','Что можно сделать дома'),el('p','',retries||hints?'Вернитесь к теме вместе: попросите ребёнка показать знакомый пример. Потребность в помощи обсудите с учителем.':'Попросите ребёнка рассказать или показать один шаг занятия.'));out.append(home);
 if(data.games.length){const g=el('section','parent-games');g.append(el('h3','','Пройденные игры'));const chips=el('div','parent-chips');for(const id of data.games)chips.append(el('span','',GAMES[id]||id));g.append(chips);out.append(g);}
 out.append(el('h3','','Занятия по дням'));
 if(!events.length)out.append(el('p','parent-empty','Пока нет действий. Результаты появятся после первого занятия.'));
 const days=new Map();for(const e of events.slice(0,80)){const k=dayKey(e.created);if(!days.has(k))days.set(k,[]);days.get(k).push(e);}
 for(const list of days.values()){
  const day=el('section','parent-day'),top=el('div','parent-day-top'),ok=count(list,'answer','correct'),help=count(list,'hint');
  top.append(el('h4','',dayLabel(list[0].created)),el('span','',list[0].lesson+(ok?', верных ответов: '+ok:'')+(help?', подсказок: '+help:'')));day.append(top);
  const ol=el('ol','parent-timeline');for(const e of list.slice().reverse()){const li=el('li','tone-'+eventTone(e));li.append(el('time','',timeLabel(e.created)),el('span','',eventText(e)));ol.append(li);}
  day.append(ol);out.append(day);
 }
 out.append(el('p','parent-note','Эти данные описывают действия в приложении, а не уровень знаний или развитие ребёнка.'));
 document.querySelector('#parent-form').hidden=true;
}
async function load(){error.textContent='';try{let data;if(location.pathname.startsWith('/demo/'))data=await (await import('/demo-data.mjs')).request('/api/parent/report');else{const r=await fetch('/api/parent/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code.value.trim()})});data=await r.json();if(!r.ok)throw Error(data.error);}render(data);}catch(e){error.textContent=e.message;}}
document.querySelector('#parent-form').onsubmit=e=>{e.preventDefault();load();};if(location.hash){code.value=location.hash.slice(1);history.replaceState(null,'',location.pathname);load();}
if(location.pathname.startsWith('/demo/')){const bar=document.createElement('aside');bar.className='demo-bar';bar.innerHTML='Демо-данные <a href="/demo/child">Ученик</a><a href="/demo/teacher">Учитель</a><a href="/demo/parent" aria-current="page">Родитель</a>';document.body.prepend(bar);load();}
