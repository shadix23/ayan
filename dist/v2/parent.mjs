// Parent report (Read surface): only the linked child, only facts from the V2 lessons. No teacher notes, no recommendations,
// no comparison with other children. Kazakh by default; the code comes from the teacher's link (#code) or the form.
import {esc,icon,L,lang,setLang,makeT,lantern,$} from './ui.mjs';
const t=makeT({
 title:['Как проходит обучение','Оқу қалай өтіп жатыр'],sub:['Отчёт по приглашению учителя. Без оценок и сравнения с другими детьми.','Мұғалімнің шақыруы бойынша есеп. Бағасыз және басқа балалармен салыстырусыз.'],
 code:['Код из ссылки учителя','Мұғалім сілтемесіндегі код'],open:['Открыть отчёт','Есепті ашу'],bad:['Ссылка недействительна. Попросите учителя создать новую.','Сілтеме жарамсыз. Мұғалімнен жаңасын жасауын сұраңыз.'],
 days:['Дни со светом','Жарық күндер'],daysNote:['Светлых дней за неделю: {n}. Пропущенный день не считается ошибкой.','Аптадағы жарық күндер: {n}. Өткізіп алған күн қате саналмайды.'],
 lessons:['Уроки','Сабақтар'],done:['Урок пройден','Сабақ өтілді'],going:['Урок в процессе','Сабақ жүріп жатыр'],solved:['Решено: {n} из {m}','Шешілді: {m} ішінен {n}'],
 hints:['Подсказки: {n}','Кеңестер: {n}'],breaks:['Перерывы: {n}','Үзілістер: {n}'],repeatH:['Можно повторить дома','Үйде қайталауға болады'],skip:['К основному содержимому','Негізгі мазмұнға'],
 homeH:['Что можно сделать дома','Үйде не істеуге болады'],homeP:['Попросите ребёнка показать, как он решал. Отмечайте, что получилось, а не скорость. Подсказки и перерывы - это нормальная часть урока.','Баладан қалай шешкенін көрсетуін сұраңыз. Жылдамдықты емес, не шыққанын атап өтіңіз. Кеңес пен үзіліс - сабақтың қалыпты бөлігі.'],
 none:['Уроков пока нет. Результаты появятся после первого урока.','Әзірге сабақ жоқ. Нәтижелер алғашқы сабақтан кейін пайда болады.'],
 today:['Сегодня','Бүгін'],dayLit:['был урок','сабақ болды'],dayDark:['без урока','сабақсыз'],privacy:['Какие данные хранит Аян','Аян қандай деректерді сақтайды'],
 demo:['Демо: синтетические данные, не результаты реального ребёнка.','Демо: синтетикалық деректер, нақты баланың нәтижесі емес.']
});
// Kazakh month names are spelled out here: not every browser ships kk-KZ dates.
const KK_MONTHS=['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
const WD={ru:['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],kk:['Жс','Дс','Сс','Ср','Бс','Жм','Сб']};
try{if(!localStorage.getItem('ayan.v2.lang'))setLang('kk');else setLang(lang());}catch{setLang('kk');}
const main=$('#main');let code=decodeURIComponent(location.hash.slice(1)||''),data=null;
function form(err){main.innerHTML=`<h1>${esc(t('title'))}</h1><p class="sub">${esc(t('sub'))}</p><form class="card stack" data-form><div class="field"><label for="pc">${esc(t('code'))}</label><input id="pc" class="input" required autocomplete="off"></div>${err?`<p class="err" role="alert">${esc(err)}</p>`:''}<button class="btn primary inline">${esc(t('open'))}</button></form>`;}
async function load(){if(!code){form();return;}
 const r=await fetch('/api/parent/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})}).catch(()=>null);
 if(!r||!r.ok){form(t('bad'));return;}data=await r.json();draw();}
function draw(){
 const v=data.v2,lt=v?.lights||{days:[false,false,false,false,false,false,false],litDays:0};const wd=WD[lang()]||WD.ru;const d0=new Date();
 const days=lt.days.map((lit,i)=>{const d=new Date(d0.getTime()-(6-i)*86400000);const name=i===6?t('today'):wd[d.getDay()];return `<li class="day ${lit?'lit':''} ${i===6?'today':''}"><span class="sr-only">${esc(name)}: ${esc(lit?t('dayLit'):t('dayDark'))}</span>${lantern(lit)}<span aria-hidden="true">${esc(name)}</span></li>`;}).join('');
 const lessons=(v?.lessons||[]).map(x=>{const done=x.state==='completed';const dt=new Date(x.completedAt||x.startedAt);const when=lang()==='kk'?dt.getDate()+' '+KK_MONTHS[dt.getMonth()]:dt.toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
  return `<li class="card p-lesson ${done?'done':''}"><span class="lamp">${lantern(done)}</span><div><h3>${esc(L(x.topic))}</h3><p class="muted" style="margin-top:4px">${esc(done?t('done'):t('going'))} · ${esc(when)}</p>
   <p class="p-facts"><span>${esc(t('solved',{n:x.correct,m:x.required}))}</span><span>${esc(t('hints',{n:x.hints}))}</span><span>${esc(t('breaks',{n:x.breaks}))}</span></p>${(x.repeat||[]).length?`<p class="p-home">${icon('repeat')}<span><b>${esc(t('repeatH'))}</b>${esc(x.repeat.map(p=>L(p)).join(' '))}</span></p>`:''}</div></li>`;}).join('');
 main.innerHTML=`<div><h1>${esc(t('title'))}: ${esc(kid(data.label))}</h1><p class="sub" style="margin-top:8px">${esc(t('sub'))}</p></div>
  ${data.demo?`<p class="badge sand" data-demo-note style="align-self:flex-start">${esc(t('demo'))}</p>`:''}
  <section class="card days-card" aria-labelledby="pd-h"><h2 id="pd-h">${esc(t('days'))}</h2><ol class="days">${days}</ol><p class="days-note">${esc(t('daysNote',{n:lt.litDays}))}</p></section>
  <section aria-labelledby="pl-h" class="stack"><h2 id="pl-h">${esc(t('lessons'))}</h2>${lessons?`<ul class="p-lessons">${lessons}</ul>`:`<p class="card">${esc(t('none'))}</p>`}</section>
  <section class="card soft" aria-labelledby="ph-h"><h2 id="ph-h">${esc(t('homeH'))}</h2><p style="margin-top:8px">${esc(t('homeP'))}</p></section>`;
 document.title='Аян · '+t('title');syncChrome();
}
// Demo labels are stored as "Ученик 01"; Kazakh screens read "Оқушы 01".
function kid(l){return lang()==='kk'?String(l??'').replace(/^Ученик(?=\s)/,'Оқушы'):String(l??'');}
// Tab title, skip link and privacy link follow the chosen language (they live outside the drawn area).
function syncChrome(){document.title='Аян · '+t('title');const sk=document.querySelector('a[href="#main"]');if(sk)sk.textContent=t('skip');document.querySelector('[data-privacy]').textContent=t('privacy');}
syncChrome();
document.addEventListener('submit',e=>{if(!e.target.closest('[data-form]'))return;e.preventDefault();code=$('#pc').value.trim();load();});
document.querySelector('[data-lang]').addEventListener('click',()=>{setLang(lang()==='kk'?'ru':'kk');syncChrome();if(data)draw();else form();});
load();
