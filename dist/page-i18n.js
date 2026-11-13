// Language for the standalone pages (login, parent report, privacy).
// ?lang=kk or ?lang=ru wins, then the last choice on this device, then Russian.
// Static text: <el data-kk="..."> keeps Russian in the markup; blocks: <div data-lang="kk">.
(function(){
 'use strict';
 const KEY='ayan.page.lang';
 const q=new URLSearchParams(location.search).get('lang');
 let saved=null;try{saved=localStorage.getItem(KEY);}catch(e){}
 let lang=q==='kk'||q==='ru'?q:saved==='kk'?'kk':'ru';
 const listeners=[];
 function apply(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-kk]').forEach(el=>{if(!el.hasAttribute('data-ru'))el.setAttribute('data-ru',el.innerHTML);el.innerHTML=lang==='kk'?el.getAttribute('data-kk'):el.getAttribute('data-ru');});
  document.querySelectorAll('[data-kk-alt]').forEach(el=>{if(!el.hasAttribute('data-ru-alt'))el.setAttribute('data-ru-alt',el.alt);el.alt=lang==='kk'?el.dataset.kkAlt:el.dataset.ruAlt;});
  document.querySelectorAll('[data-lang]').forEach(el=>{el.hidden=el.dataset.lang!==lang;});
  const title=document.querySelector('meta[name="title-kk"]');if(title){if(!title.dataset.ru)title.dataset.ru=document.title;document.title=lang==='kk'?title.content:title.dataset.ru;}
  document.querySelectorAll('.page-lang button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.setLang===lang)));
  for(const fn of listeners)fn(lang);
 }
 function set(next){lang=next==='kk'?'kk':'ru';try{localStorage.setItem(KEY,lang);}catch(e){}
  const u=new URL(location.href);if(u.searchParams.has('lang')){u.searchParams.set('lang',lang);history.replaceState(null,'',u);}apply();}
 function mountSwitch(){
  const host=document.querySelector('[data-lang-switch]')||document.querySelector('.portal-top')||document.querySelector('.auth-form');if(!host||host.querySelector('.page-lang'))return;
  const box=document.createElement('div');box.className='page-lang';box.setAttribute('role','group');box.setAttribute('aria-label','Тіл / Язык');
  box.innerHTML='<button type="button" data-set-lang="kk">Қаз</button><button type="button" data-set-lang="ru">Рус</button>';
  box.onclick=e=>{const b=e.target.closest('[data-set-lang]');if(b)set(b.dataset.setLang);};
  host.append(box);
 }
 window.AyanPage={lang:()=>lang,t:(kk,ru)=>lang==='kk'?kk:ru,set,onChange(fn){listeners.push(fn);},link:href=>lang==='kk'?href+(href.includes('?')?'&':'?')+'lang=kk':href};
 const start=()=>{mountSwitch();apply();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
