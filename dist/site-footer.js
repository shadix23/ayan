// Аян: общий подвал сайта (лендинг и страницы аккаунта). ES-модуль без зависимостей.
// Подключение:  <script type="module" src="/site-footer.js"></script> (стили /site-footer.css скрипт добавит сам, если их нет;
//               можно и подключить <link rel="stylesheet" href="/site-footer.css"> заранее)
//               и в разметке  <div data-site-footer></div>  (подвал вставляется внутрь, можно несколько мест).
// Язык: window.AyanPage.lang() (page-i18n.js), иначе <html lang="kk|ru">, иначе localStorage 'ayan.page.lang'
//       (тот же ключ, что у page-i18n.js на лендинге), иначе русский. Подвал перерисовывается сам, когда меняется <html lang>.
// Кнопки «Қазақша / Русский»: window.AyanPage.set(lang), если на странице есть page-i18n.js. Иначе на document
//       отправляется событие 'ayan:lang' ({detail:{lang}}, cancelable): страница со своим переводом ловит его и вызывает
//       preventDefault(); если никто не поймал, язык пишется в 'ayan.page.lang' и страница открывается с ?lang=.
// Кнопка «Настройки cookie» ([data-cookie-settings]) открывает баннер /cookie-consent.js, если он подключён на странице.
// Тексты без длинных тире и «·». Ссылки /pricing, /login, /support, /legal/* делают страницы аккаунта.
const KEY='ayan.page.lang';
const SUBJECTS=[['math','Математика','Математика'],['kazakh-lang','Казахский язык','Қазақ тілі'],['kazakh-lit','Казахская литература','Қазақ әдебиеті'],
 ['russian','Русский язык и литература','Орыс тілі мен әдебиеті'],['english','Английский язык','Ағылшын тілі'],['natural-science','Естествознание','Жаратылыстану'],
 ['kz-history','История Казахстана','Қазақстан тарихы'],['informatics','Информатика','Информатика']];
// [заголовок ru, kk, [[ru, kk, href], ...]]
const COLS=[
 ['Для учителя','Мұғалімге',[['Кабинет','Кабинет','/teacher'],['Пульс класса','Сынып тынысы','/teacher#/now'],['Паспорт поддержки','Қолдау паспорты','/teacher#/passport'],['Назначить урок','Сабақ тағайындау','/teacher#/assign']]],
 ['Для семьи','Отбасыға',[['Отчёт родителя','Ата-ана есебі','/parent'],['Согласие родителя','Ата-ана келісімі','/legal/parental-consent']]],
 ['Предметы','Пәндер',SUBJECTS.map(([id,ru,kk])=>[ru,kk,'/#subject-'+id])],
 ['Аян','Аян',[['Тарифы','Тарифтер','/pricing'],['Поддержка','Қолдау','/support'],['Войти','Кіру','/login']]],
 ['Сотрудничество','Ынтымақтастық',[['Для школ и управлений образования','Мектептер мен білім басқармаларына','/pricing#schools'],['Написать нам','Бізге жазу','/support#write']]]];
const LEGAL=[['Условия','Шарттар','/legal/terms'],['Конфиденциальность','Құпиялылық','/legal/privacy'],['Cookie','Cookie','/legal/cookies'],['Возврат','Қайтару','/legal/refunds']];
const T={
 nav:['Разделы сайта','Сайт бөлімдері'],docs:['Документы','Құжаттар'],lang:['Язык','Тіл'],
 note:['Аян - платформа визуальной поддержки уроков по программе РК. Не является медицинским сервисом и не ставит диагнозов.','Аян - ҚР бағдарламасы бойынша сабақтарды көрнекі қолдау платформасы. Медициналық қызмет емес және диагноз қоймайды.'],
 copy:['© 2026 Аян','© 2026 Аян'],cookies:['Настройки cookie','Cookie баптаулары']};

export function lang(){
 const p=window.AyanPage?.lang?.();if(p==='kk'||p==='ru')return p;
 const h=document.documentElement.lang;if(h==='kk'||h==='ru')return h;
 try{const s=localStorage.getItem(KEY);if(s==='kk'||s==='ru')return s;}catch{}
 return 'ru';}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let uid=0;
export function html(l=lang()){
 const k=l==='kk'?1:0,x=a=>esc(a[k]);const id='sf'+(++uid);
 const cols=COLS.map(([ru,kk,links],i)=>`<div class="sf-col"><p class="sf-h" id="${id}-${i}">${x([ru,kk])}</p><ul aria-labelledby="${id}-${i}">${links.map(a=>`<li><a href="${esc(a[2])}">${x(a)}</a></li>`).join('')}</ul></div>`).join('');
 const langs=`<div class="sf-col sf-langs"><p class="sf-h" id="${id}-l">${x(T.lang)}</p><ul aria-labelledby="${id}-l"><li><button type="button" data-sf-lang="kk" lang="kk" aria-pressed="${l==='kk'}">Қазақша</button></li><li><button type="button" data-sf-lang="ru" lang="ru" aria-pressed="${l==='ru'}">Русский</button></li></ul></div>`;
 return `<footer class="sf"><div class="sf-wrap"><div class="sf-top"><a class="sf-brand" href="/" aria-label="Аян"><img src="/assets/ayan-mark.svg" alt="" width="36" height="36"><span>Аян</span></a>`+
  `<nav class="sf-cols" aria-label="${x(T.nav)}">${cols}${langs}</nav></div>`+
  `<div class="sf-bottom"><div class="sf-note"><p>${x(T.note)}</p><p>${x(T.copy)}</p></div><nav class="sf-legal" aria-label="${x(T.docs)}">${LEGAL.map(a=>`<a href="${esc(a[2])}">${x(a)}</a>`).join('')}<button type="button" data-cookie-settings>${x(T.cookies)}</button></nav></div></div></footer>`;}

export function setLang(l){
 l=l==='kk'?'kk':'ru';
 if(window.AyanPage?.set){window.AyanPage.set(l);return;}
 if(!document.dispatchEvent(new CustomEvent('ayan:lang',{detail:{lang:l},cancelable:true})))return;
 try{localStorage.setItem(KEY,l);}catch{}
 const u=new URL(location.href);u.searchParams.set('lang',l);location.href=u.toString();}

const hosts=new Set();
export function mount(host){
 if(!host||hosts.has(host))return;hosts.add(host);
 host.addEventListener('click',e=>{const b=e.target.closest('[data-sf-lang]');if(b)setLang(b.dataset.sfLang);});
 render(host);}
function render(host){const l=lang();if(host.dataset.sfRendered===l)return;host.dataset.sfRendered=l;host.innerHTML=html(l);}
// the stylesheet is added once if the page did not link it (the footer is below the fold, so it never blocks the first paint)
function ensureCss(){if(document.querySelector('link[href$="site-footer.css"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/site-footer.css';document.head.append(l);}
export function mountAll(){const all=document.querySelectorAll('[data-site-footer]');if(all.length)ensureCss();all.forEach(mount);}
const rerender=()=>hosts.forEach(render);
new MutationObserver(rerender).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountAll,{once:true});else mountAll();
