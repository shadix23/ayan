// Аян: cookie banner. One classic script, works on any page (landing, account, legal): <script src="/cookie-consent.js" defer></script>
// Two groups: necessary (always on: sign-in session, language, this choice) and analytics (off until the person turns it on).
// Choice: server cookie ayan_consent (POST /api/consent/cookies), mirrored in localStorage 'ayan.cookies'. Any element with [data-cookie-settings] reopens it.
// API: window.AyanCookies.get() -> choice or null, .open(), .allowed('analytics'); event 'ayan:cookies' on change.
(function(){
 'use strict';
 const KEY='ayan.cookies',V=1;
 const L=()=>{try{const p=window.AyanPage;if(p&&p.lang)return p.lang();}catch(e){}return (document.documentElement.lang||'ru').startsWith('kk')?'kk':'ru';};
 const T={
  kk:{h:'Cookie файлдары',p:'Кіру мен тіл таңдауы үшін қажетті cookie файлдарын қолданамыз. Сайтты жақсарту үшін жинақталған статистиканы тек сіздің келісіміңізбен қосамыз.',more:'Толығырақ',all:'Қабылдау',min:'Тек қажеттілері',cfg:'Баптау',save:'Таңдауды сақтау',nec:'Қажетті',necS:'Кіру, тіл, қауіпсіздік. Әрқашан қосулы.',an:'Аналитика',anS:'Қай беттер түсініксіз екенін көру үшін жеке басты анықтамайтын статистика.',region:'Cookie келісімі'},
  ru:{h:'Файлы cookie',p:'Мы используем необходимые cookie для входа и выбора языка. Обезличенную статистику для улучшения сайта включаем только с вашего согласия.',more:'Подробнее',all:'Принять',min:'Только необходимые',cfg:'Настроить',save:'Сохранить выбор',nec:'Необходимые',necS:'Вход, язык, безопасность. Всегда включены.',an:'Аналитика',anS:'Обезличенная статистика: какие страницы непонятны и где люди останавливаются.',region:'Согласие на cookie'}
 };
 const CSS=`.cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:80;max-width:540px;background:#fff;color:#1F2A2E;border-radius:20px;box-shadow:0 0 0 1px rgba(31,42,46,.07),0 18px 48px -16px rgba(31,42,46,.35);padding:20px;font:500 15.5px/1.5 Nunito,system-ui,sans-serif}
@media (min-width:700px){.cc{left:24px;bottom:24px;right:auto}}
.cc h2{font-size:17px;font-weight:850;margin:0 0 6px;letter-spacing:-.01em}.cc p{margin:0;color:#4F5F63}.cc a{color:#0369A1;font-weight:750;text-underline-offset:3px}
.cc .cc-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.cc button{font:inherit;min-height:44px;padding:0 16px;border-radius:12px;border:1px solid #6B807C;background:#fff;color:#1F2A2E;font-weight:800;cursor:pointer;flex:1 1 auto}
.cc button:hover{background:#E4F1ED}.cc button.cc-pri{background:#0F766E;border-color:#0F766E;color:#fff}.cc button.cc-pri:hover{background:#115E59}
.cc button.cc-link{flex:0 0 auto;border-color:transparent;background:transparent;color:#0369A1;text-decoration:underline;text-underline-offset:3px;padding:0 8px}
.cc :focus-visible{outline:3px solid #0369A1;outline-offset:3px}
.cc fieldset{border:0;margin:12px 0 0;padding:0;display:grid;gap:8px}.cc legend{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.cc label{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;background:#F3F1EA;cursor:pointer}
.cc label b{display:block;font-weight:800}.cc label small{display:block;color:#4F5F63;font-size:14px}
.cc input{appearance:none;-webkit-appearance:none;width:52px;height:32px;border-radius:999px;background:#9AA9A5;position:relative;cursor:pointer;margin:0;flex:none}
.cc input::after{content:'';position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.cc input:checked{background:#0F766E}.cc input:checked::after{left:24px}.cc input:disabled{opacity:.65;cursor:not-allowed}
@media (prefers-reduced-motion:no-preference){html:not([data-motion=off]) .cc{animation:cc-in 280ms cubic-bezier(.22,1,.36,1) both}}
@keyframes cc-in{from{opacity:0;transform:translateY(12px)}}
@media print{.cc{display:none}}`;
 // The server keeps the choice in the cookie ayan_consent=<version>.<necessary|all> (POST /api/consent/cookies, also logged);
 // localStorage is a fallback for pages served without the API.
 function fromCookie(){const m=/(?:^|;\s*)ayan_consent=([^;]+)/.exec(document.cookie);if(!m)return null;const c=decodeURIComponent(m[1]).split('.').pop();return c==='all'||c==='necessary'?{v:V,necessary:true,analytics:c==='all',at:null}:null;}
 function get(){const c=fromCookie();if(c)return c;try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&v.v===V?v:null;}catch(e){return null;}}
 function save(analytics){const v={v:V,necessary:true,analytics:!!analytics,at:new Date().toISOString()};try{localStorage.setItem(KEY,JSON.stringify(v));}catch(e){}
  try{fetch('/api/consent/cookies',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({choice:analytics?'all':'necessary'})}).catch(function(){});}catch(e){}
  window.dispatchEvent(new CustomEvent('ayan:cookies',{detail:v}));return v;}
 let box=null,lastFocus=null;
 function close(){if(!box)return;box.remove();box=null;if(lastFocus&&lastFocus.isConnected)lastFocus.focus();}
 function render(detail){
  const s=T[L()],cur=get();
  if(!document.getElementById('cc-css')){const st=document.createElement('style');st.id='cc-css';st.textContent=CSS;document.head.append(st);}
  if(!box){box=document.createElement('section');box.className='cc';box.setAttribute('role','region');document.body.append(box);}
  box.setAttribute('aria-label',s.region);
  const policy=L()==='kk'?'/legal/cookies?lang=kk':'/legal/cookies';
  box.innerHTML='<h2 id="cc-h">'+s.h+'</h2><p>'+s.p+' <a href="'+policy+'">'+s.more+'</a></p>'+
   (detail?'<fieldset><legend>'+s.cfg+'</legend><label><span><b>'+s.nec+'</b><small>'+s.necS+'</small></span><input type="checkbox" checked disabled aria-label="'+s.nec+'"></label>'+
    '<label><span><b>'+s.an+'</b><small>'+s.anS+'</small></span><input type="checkbox" id="cc-an" aria-label="'+s.an+'"'+(cur&&cur.analytics?' checked':'')+'></label></fieldset>'+
    '<div class="cc-acts"><button type="button" class="cc-pri" data-cc="save">'+s.save+'</button><button type="button" data-cc="min">'+s.min+'</button></div>'
   :'<div class="cc-acts"><button type="button" class="cc-pri" data-cc="all">'+s.all+'</button><button type="button" data-cc="min">'+s.min+'</button><button type="button" class="cc-link" data-cc="cfg" aria-expanded="false">'+s.cfg+'</button></div>');
  box.onclick=e=>{const b=e.target.closest('[data-cc]');if(!b)return;const a=b.dataset.cc;
   if(a==='all'){save(true);close();}else if(a==='min'){save(false);close();}
   else if(a==='save'){save(box.querySelector('#cc-an').checked);close();}
   else if(a==='cfg'){render(true);const an=box.querySelector('#cc-an');if(an)an.focus();}};
  box.onkeydown=e=>{if(e.key==='Escape'&&get())close();};
 }
 function open(detail){lastFocus=document.activeElement;render(detail!==false);const f=box.querySelector('input:not(:disabled),button');if(f)f.focus();}
 window.AyanCookies={get,open,allowed:k=>k==='necessary'||!!(get()||{})[k]};
 function start(){
  document.addEventListener('click',e=>{const t=e.target.closest('[data-cookie-settings]');if(t){e.preventDefault();open(true);}});
  if(!get())render(false);
  // re-render in the new language when the page switches
  new MutationObserver(()=>{if(box)render(!!box.querySelector('fieldset'));}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
