const P=window.AyanPage,t=(kk,ru)=>P.t(kk,ru);
const code=document.querySelector('#parent-code'),out=document.querySelector('#parent-report'),error=document.querySelector('#report-error');
const GAMES={pairs:['Жұбын тап','Найди пару'],sequence:['Алдымен не','Что сначала'],sort:['Өз орнына','Всё по местам'],pack:['Сөмкені жина','Собери рюкзак'],pattern:['Өрнекті жалғастыр','Продолжи узор'],puzzle:['Суретті құрастыр','Картинка по кусочкам'],listen:['Тыңда және тап','Послушай и найди'],route:['Жаңалықтар жолы','Тропинка открытий'],garden:['Аян бағы','Сад Аяна']};
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const KK_MONTHS=['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
const locale=()=>P.lang()==='kk'?'kk-KZ':'ru-RU';
const dayKey=ms=>{const d=new Date(ms);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();};
const dayLabel=ms=>{const now=new Date(),d=new Date(ms),y=new Date(now);y.setDate(now.getDate()-1);if(dayKey(ms)===dayKey(now.getTime()))return t('Бүгін','Сегодня');if(dayKey(ms)===dayKey(y.getTime()))return t('Кеше','Вчера');return P.lang()==='kk'?d.getDate()+' '+KK_MONTHS[d.getMonth()]:d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'});};
const timeLabel=ms=>new Date(ms).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
const eventText=e=>({step:t(e.value+'-қадам ашылды','Открыт шаг '+e.value),hint:t('Кеңес','Подсказка'),pause:t('Үзіліс','Перерыв'),answer:e.value==='correct'?t('Дұрыс жауап','Верный ответ'):t('Қайта талпыныс','Повторная попытка')}[e.kind]||e.kind);
const eventTone=e=>e.kind==='answer'?(e.value==='correct'?'good':'retry'):e.kind==='hint'?'help':'plain';
function stat(value,label){const box=el('div','parent-stat');box.append(el('b','',String(value)),el('span','',label));return box;}
let last=null;
function render(data){
 last=data;out.replaceChildren();
 const events=data.events.filter(e=>e.kind!=='assistant').map(e=>({...e,created:Number(e.created)})).sort((a,b)=>b.created-a.created);
 const count=(list,kind,value)=>list.filter(e=>e.kind===kind&&(value===undefined||e.value===value)).length;
 const correct=count(events,'answer','correct'),retries=count(events,'answer','retry'),hints=count(events,'hint'),pauses=count(events,'pause');
 const head=el('header','parent-head');head.append(el('h2','',data.label),el('p','',t('Ағымдағы тақырып: ','Текущая тема: ')+(data.lesson||t('әлі тағайындалмаған','ещё не назначена'))));out.append(head);
 const stats=el('div','parent-stats');stats.append(stat(correct,t('дұрыс жауап','верных ответов')),stat(retries,t('қайта талпыныс','повторных попыток')),stat(hints,t('кеңес','подсказок')),stat(pauses,t('үзіліс','перерывов')));out.append(stats);
 const home=el('section','parent-home');home.append(el('h3','',t('Үйде не істеуге болады','Что можно сделать дома')),el('p','',retries||hints?t('Тақырыпқа бірге оралыңыз: баладан таныс мысалды көрсетуін сұраңыз. Көмек қажеттілігін мұғаліммен талқылаңыз.','Вернитесь к теме вместе: попросите ребёнка показать знакомый пример. Потребность в помощи обсудите с учителем.'):t('Баладан сабақтың бір қадамын айтып не көрсетіп беруін сұраңыз.','Попросите ребёнка рассказать или показать один шаг занятия.')));out.append(home);
 if(data.games.length){const g=el('section','parent-games');g.append(el('h3','',t('Өтілген ойындар','Пройденные игры')));const chips=el('div','parent-chips');for(const id of data.games)chips.append(el('span','',GAMES[id]?t(...GAMES[id]):id));g.append(chips);out.append(g);}
 out.append(el('h3','',t('Күндер бойынша сабақтар','Занятия по дням')));
 if(!events.length)out.append(el('p','parent-empty',t('Әзірге әрекет жоқ. Нәтижелер алғашқы сабақтан кейін пайда болады.','Пока нет действий. Результаты появятся после первого занятия.')));
 const days=new Map();for(const e of events.slice(0,80)){const k=dayKey(e.created);if(!days.has(k))days.set(k,[]);days.get(k).push(e);}
 for(const list of days.values()){
  const day=el('section','parent-day'),top=el('div','parent-day-top'),ok=count(list,'answer','correct'),help=count(list,'hint');
  top.append(el('h4','',dayLabel(list[0].created)),el('span','',list[0].lesson+(list[0].version>1?t(' ('+list[0].version+'-нұсқа)',' (версия '+list[0].version+')'):'')+(ok?t(', дұрыс жауап: ',', верных ответов: ')+ok:'')+(help?t(', кеңес: ',', подсказок: ')+help:'')));day.append(top);
  const ol=el('ol','parent-timeline');for(const e of list.slice().reverse()){const li=el('li','tone-'+eventTone(e));li.append(el('time','',timeLabel(e.created)),el('span','',eventText(e)));ol.append(li);}
  day.append(ol);out.append(day);
 }
 out.append(el('p','parent-note',t('Бұл деректер баланың білім деңгейін немесе дамуын емес, қосымшадағы әрекеттерді сипаттайды.','Эти данные описывают действия в приложении, а не уровень знаний или развитие ребёнка.')));
 document.querySelector('#parent-form').hidden=true;
}
const demo=location.pathname.startsWith('/demo/');
async function load(){error.textContent='';try{let data;if(demo)data=await (await import('/demo-data.mjs')).request('/api/parent/report');else{const r=await fetch('/api/parent/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code.value.trim()})});data=await r.json();if(!r.ok)throw Error(r.status===401?t('Сілтеме жарамсыз. Мұғалімнен жаңасын жасауын сұраңыз.','Ссылка недействительна. Попросите учителя создать новую.'):data.error);}render(data);}catch(e){error.textContent=e.message;}}
document.querySelector('#parent-form').onsubmit=e=>{e.preventDefault();load();};if(location.hash){code.value=location.hash.slice(1);history.replaceState(null,'',location.pathname+location.search);load();}
function demoBar(){if(!demo)return;let bar=document.querySelector('.demo-bar');if(!bar){bar=document.createElement('aside');bar.className='demo-bar';document.body.prepend(bar);}bar.innerHTML=t('Демо-деректер','Демо-данные')+' <a href="/demo/child">'+t('Оқушы','Ученик')+'</a><a href="/demo/teacher">'+t('Мұғалім','Учитель')+'</a><a href="/demo/parent" aria-current="page">'+t('Ата-ана','Родитель')+'</a>';}
P.onChange(()=>{demoBar();document.querySelector('#privacy-link').href=P.link('/privacy');if(last)render(last);});
demoBar();document.querySelector('#privacy-link').href=P.link('/privacy');if(demo)load();
