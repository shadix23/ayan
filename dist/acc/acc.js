// Аян: shared layer for the account pages (signup, login, onboarding, pricing, checkout, account, support, legal).
// Language comes from /page-i18n.js (window.AyanPage, key 'ayan.page.lang'), so the landing, the footer and these pages agree.
// API: one place (api below). Contract: hackathon/api-accounts.md.
const P=window.AyanPage||{lang:()=>'ru',t:(kk,ru)=>ru,onChange(){},set(){},link:h=>h};
export const t=(kk,ru)=>P.t(kk,ru);
export const lang=()=>P.lang();
export const onLang=fn=>P.onChange(fn);
export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// Calm motion: the system setting wins; the pages never animate more than one thing at a time.
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduce)document.documentElement.dataset.motion='off';
export const still=()=>reduce||document.documentElement.dataset.motion==='off';

// ---------- contacts (one constant: the owner replaces it in one edit) ----------
export const CONTACT={email:'supportayan@gmail.com'};
for(const a of $$('[data-contact-email]')){a.textContent=CONTACT.email;if(a.tagName==='A')a.href='mailto:'+CONTACT.email;}

// ---------- plans and money ----------
export const VAT=0.16;
// Prices include VAT. year = 10 months.
export const PLANS=[
 {id:'free',name:['Бастау','Старт'],month:0,year:0,
  for:['Танысу үшін','Чтобы познакомиться'],
  feat:[['Бір сабақ: тең үлестер','Один урок: равные доли'],['Субтитрлер, тыныш режим, қарым-қатынас тақтасы','Субтитры, спокойный режим, доска общения'],['Есеп үлгісі','Пример отчёта']]},
 {id:'plus',name:['Плюс','Плюс'],month:1490,year:14900,
  for:['Мұғалімге немесе отбасына','Учителю или семье'],
  feat:[['Каталогтағы барлық сабақ','Все уроки каталога'],['Тапсырма құрастырушы','Конструктор заданий'],['Оқушылар бойынша тарих пен есептер','История и отчёты по ученикам']]},
 {id:'max',name:['Макс','Макс'],month:2990,year:29900,best:true,
  for:['Инклюзивті сынып мұғаліміне','Учителю инклюзивного класса'],
  feat:[['Плюс тарифіндегінің бәрі','Всё из тарифа Плюс'],['Топқа тапсырма беру','Групповые назначения'],['Оқушылар саны шектеусіз','Без ограничений по ученикам']]},
 {id:'school',name:['Мектеп','Школа'],month:990,year:9900,perSeat:true,minSeats:5,
  for:['Бір мұғалімге, 5 мұғалімнен бастап','За одного учителя, от 5 учителей'],
  feat:[['Макс тарифіндегінің бәрі','Всё из тарифа Макс'],['Бір мұғалімнің бағасы, 5 мұғалімнен бастап','Цена за одного учителя, от 5 учителей'],['Мектеп әкімшісіне арналған жиынтық','Сводка для администратора школы']]}
];
export const plan=id=>PLANS.find(p=>p.id===id)||null;
export const planName=p=>p?t(p.name[0],p.name[1]):'';
export const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2,minimumFractionDigits:Number.isInteger(n)?0:2}).format(n).replace(/ /g,' ')+' ₸';
export const vatSplit=total=>{const net=Math.round(total/(1+VAT)*100)/100;return {net,vat:Math.round((total-net)*100)/100,total};};
export const priceFor=(p,period,seats=1)=>(period==='year'?p.year:p.month)*(p.perSeat?Math.max(seats,p.minSeats||1):1);
export const fmtDate=d=>d?new Date(d).toLocaleDateString(lang()==='kk'?'kk-KZ':'ru-RU',{day:'numeric',month:'long',year:'numeric'}):'-';
export const ROLE={teacher:['Мұғалім','Учитель'],parent:['Ата-ана','Родитель'],school:['Мектеп','Школа']};
export const roleName=r=>ROLE[r]?t(...ROLE[r]):'';
export const METHOD={kaspi:['Kaspi шоты','Kaspi счёт'],invoice:['Мектепке арналған шот','Счёт для школы']};
export const methodName=m=>METHOD[m]?t(...METHOD[m]):'-';

// ---------- API ----------
// Auth is Better Auth (real). Account and billing routes follow hackathon/api-accounts.md.
async function call(url,{method='GET',body}={}){
 let r;try{r=await fetch(url,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});}
 catch{return {ok:false,status:0,data:{error:t('Байланыс жоқ. Интернетті тексеріп, қайталап көріңіз.','Нет связи. Проверьте интернет и попробуйте ещё раз.')}};}
 let data=null;try{data=await r.json();}catch{}
 return {ok:r.ok,status:r.status,data:data||{}};
}
export const api={
 call,
 session:()=>call('/api/auth/get-session').then(r=>r.ok&&r.data?.user?r.data:null),
 register:b=>call('/api/account/register',{method:'POST',body:b}),
 signIn:b=>call('/api/auth/sign-in/email',{method:'POST',body:b}),
 signOut:()=>call('/api/auth/sign-out',{method:'POST',body:{}}),
 profile:()=>call('/api/account/profile'),
 saveProfile:b=>call('/api/account/profile',{method:'PATCH',body:b}),
 onboarding:b=>call('/api/account/onboarding',b?{method:'POST',body:b}:{}),
 plans:()=>call('/api/billing/plans'),
 subscription:()=>call('/api/billing/subscription'),
 payments:()=>call('/api/billing/payments'),
 checkout:b=>call('/api/billing/checkout',{method:'POST',body:b}),
 invoice:id=>call('/api/billing/invoices/'+encodeURIComponent(id)),
 confirm:id=>call('/api/billing/confirm',{method:'POST',body:{invoiceId:id}}),
 cancel:reason=>call('/api/billing/cancel',{method:'POST',body:reason?{reason}:{}}),
 resume:()=>call('/api/billing/resume',{method:'POST',body:{}}),
 password:b=>call('/api/account/password',{method:'POST',body:b}),
 revoke:scope=>call('/api/account/sessions/revoke',{method:'POST',body:{scope}}),
 deleteAccount:password=>call('/api/account/delete',{method:'POST',body:{password,confirm:'УДАЛИТЬ'}}),
 cancelDelete:()=>call('/api/account/delete/cancel',{method:'POST',body:{}}),
 support:b=>call('/api/support',{method:'POST',body:b})
};
// Prices come from GET /api/billing/plans (gross, VAT inside); the local PLANS above only add Kazakh texts and a fallback.
export async function loadPlans(){const r=await api.plans();if(!r.ok||!Array.isArray(r.data.plans))return {plans:PLANS.map(p=>({...p,prices:{month:{amount:p.month,vat:vatOf(p.month)},year:{amount:p.year,vat:vatOf(p.year),saving:p.month*12-p.year}}})),refundDays:14,vatRate:VAT,live:false};
 return {...r.data,live:true,plans:r.data.plans.map(x=>{const l=plan(x.id)||{};return {...l,...x,name:[x.name?.kk||l.name?.[0]||x.id,x.name?.ru||l.name?.[1]||x.id],feat:l.feat||x.features.map(f=>[f,f]),for:l.for||['',''],best:!!x.highlight};})};}
export const vatOf=g=>Math.round(g*VAT/(1+VAT));
// A server error message is shown as is only when it is human text; codes get a calm generic line.
export const errText=(r,fallback)=>{const e=r?.data?.message||r?.data?.error;return typeof e==='string'&&/[а-яәіңғүұқөһ]/i.test(e)?e:fallback;};

// ---------- top bar ----------
export function topBar({current='',cta=true}={}){
 const host=$('[data-acc-top]');if(!host)return;
 const link=(href,kk,ru,key)=>`<a href="${href}"${current===key?' aria-current="page"':''} data-kk="${kk}">${ru}</a>`;
 host.className='acc-top';
 host.innerHTML=`<div class="wrap"><a class="brand" href="/" aria-label="Аян"><img src="/assets/ayan-mark.svg" alt="" width="34" height="34"><span>Аян</span></a>
 <nav class="top-links" aria-label="Разделы" data-kk-aria="Бөлімдер">${link('/pricing','Тарифтер','Тарифы','pricing')}${link('/support','Қолдау','Поддержка','support')}${link('/legal/privacy','Құпиялылық','Конфиденциальность','legal')}</nav>
 <div class="top-tools"><span data-lang-switch></span>${cta?'<a class="b sm hide-xs" href="/login" data-acc-login data-kk="Кіру">Войти</a>':''}</div></div>`;
 if(cta)api.session().then(s=>{const a=$('[data-acc-login]',host);if(s&&a){a.href='/account';a.dataset.kk='Кабинет';a.dataset.ru='Кабинет';a.textContent='Кабинет';}}).catch(()=>{});
}

// ---------- forms ----------
export function setError(el,msg){
 const id=(el.id||el.name||'f')+'-err';let box=document.getElementById(id);
 if(!box){box=document.createElement('p');box.id=id;box.className='ferr';(el.closest('.f,.check-wrap,fieldset')||el.parentElement).append(box);}
 box.textContent=msg||'';
 const target=el.matches('fieldset')?el:el;
 if(msg){target.setAttribute('aria-invalid','true');const d=new Set((target.getAttribute('aria-describedby')||'').split(' ').filter(Boolean));d.add(id);target.setAttribute('aria-describedby',[...d].join(' '));}
 else target.removeAttribute('aria-invalid');
}
export function clearErrors(form){for(const el of $$('[aria-invalid=true]',form))el.removeAttribute('aria-invalid');for(const e of $$('.ferr',form))e.textContent='';}
export function focusFirstError(form){const el=$('[aria-invalid=true]',form);if(!el)return;(el.matches('fieldset')?$('input',el):el).focus();}
export const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export function busy(btn,on,label){if(on){btn.dataset.label=btn.innerHTML;btn.setAttribute('aria-busy','true');btn.disabled=true;btn.innerHTML='<span class="spin" aria-hidden="true"></span>'+esc(label||btn.textContent);}else{btn.removeAttribute('aria-busy');btn.disabled=false;if(btn.dataset.label)btn.innerHTML=btn.dataset.label;}}
export function eyeToggle(root=document){for(const b of $$('.pw .eye',root)){b.onclick=()=>{const i=b.parentElement.querySelector('input');const show=i.type==='password';i.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));};}}
export const EYE='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

// ---------- toast ----------
let toastT;export function toast(msg){let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{el.hidden=true;},4200);}

// ---------- mascot (the same 2D Аян as the product; static under Тихо) ----------
export async function mascot(host,state='Idle'){if(!host)return null;try{const M=await import('/v2/mascot2d.mjs');return M.mount(host,{state,motion:!still()});}catch{return null;}}

// ---------- icons ----------
export const I={
 check:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 pencil:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
 teacher:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 9h6M7 12h4"/></svg>',
 parent:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M14.5 20c.2-2.4 1.4-4.2 2.5-4.2 1.6 0 3 1.9 3.3 4.2"/></svg>',
 school:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10l9-5 9 5-9 5z"/><path d="M7 12.5V17c1.5 1.5 3 2 5 2s3.5-.5 5-2v-4.5M21 10v6"/></svg>',
 star:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>',
 card:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
 doc:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
 shield:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
 globe:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
 help:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6V14M12 17.2v.3"/></svg>',
 user:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
 out:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
 trash:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>',
 refund:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/><path d="M12 8v4l3 2"/></svg>',
 info:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.3"/></svg>',
 back:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 close:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 book:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6 4.5 9 4.5 12 6c3-1.5 6-1.5 8-.5V19c-2-1-5-1-8 .5-3-1.5-6-1.5-8-.5z"/><path d="M12 6v13.5"/></svg>',
 calc:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 12h1M12 12h1M15 12h.5M8.5 16h1M12 16h1M15 16h.5"/></svg>',
 leaf:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19l7-7"/></svg>',
 abc:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18l3.5-10L10 18M4.3 14.5h4.4M13 8h3.5a2 2 0 0 1 0 4H13zm0 4h4a2 2 0 0 1 0 4h-4z"/></svg>',
 heart:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
 clock:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 mail:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/></svg>'
};
