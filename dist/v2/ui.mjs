// Shared client helpers for the V2.1 workspaces: escaping, icons, ru/kk strings, API with an on-device outbox,
// dialogs that return focus, a polite live region. No framework; every string goes through esc() before innerHTML.
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uuid=()=>crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
export const sid=()=>uuid().replace(/-/g,'').slice(0,24);
export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];

// ---------- icons: one authored set, 24px grid, stroke 2, round caps ----------
const P={
 home:'<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/><path d="M10 19v-5h4v5"/>',
 path:'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
 play:'<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".6" fill="currentColor"/><circle cx="17.5" cy="13.8" r=".6" fill="currentColor"/>',
 video:'<rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor"/>',
 help:'<path d="M5 18.5V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8.5z"/><path d="M10 8.8a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4"/><circle cx="12" cy="13.6" r=".6" fill="currentColor"/>',
 settings:'<path d="M5 7h9M18 7h1M5 12h3M12 12h7M5 17h11M20 17h-1"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="17" r="2"/>',
 star:'<path d="m12 4 2.4 5 5.3.6-3.9 3.6 1 5.3L12 15.9l-4.8 2.6 1-5.3-3.9-3.6 5.3-.6z"/>',
 back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',next:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 repeat:'<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20v-4.5h4.5"/>',
 example:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 15l4.5-4.5 4 4L15 12l5 5"/><circle cx="15.5" cy="8.5" r="1.5"/>',
 pause:'<rect x="6.5" y="5" width="3.5" height="14" rx="1.2"/><rect x="14" y="5" width="3.5" height="14" rx="1.2"/>',
 hand:'<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V5a1.5 1.5 0 0 1 3 0v5.5M14 10.5V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a5.5 5.5 0 0 1-4.6-2.5L4 14.4a1.5 1.5 0 0 1 2.4-1.8L8 14"/>',
 quiet:'<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="m16 9.5 4 5M20 9.5l-4 5"/>',
 question:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4"/><circle cx="12" cy="16.6" r=".7" fill="currentColor"/>',
 ready:'<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.8-5"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".8" fill="currentColor"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 users:'<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.3A4.5 4.5 0 0 1 21 18.5"/>',
 assign:'<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4.5V3h6v1.5M9 11h6M9 15h4"/>',
 report:'<path d="M4 20h16"/><rect x="6" y="11" width="3" height="6" rx="1"/><rect x="11" y="7" width="3" height="10" rx="1"/><rect x="16" y="13" width="3" height="4" rx="1"/>',
 profile:'<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16a3.4 3.4 0 0 1 6.4 0M14 10h4M14 13.5h3"/>',
 edit:'<path d="M5 19h4L19 9l-4-4L5 15z"/><path d="m13.5 6.5 4 4"/>',
 library:'<rect x="4" y="4" width="4" height="16" rx="1.2"/><rect x="10" y="4" width="4" height="16" rx="1.2"/><path d="m16.2 5.2 3.6-1 3 15.4-3.6 1z" transform="translate(-1.5 .3)"/>',
 globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/>',
 leaf:'<path d="M5 19c0-9 6-14 14-14 0 9-5 14-12.5 14"/><path d="M5 19 13 11"/>',
 out:'<path d="M14 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
 text:'<path d="M5 6h14M5 10.5h14M5 15h9M5 19.5h6"/>',audio:'<path d="M4 10h3.5L12 6v12l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
 cube:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',lock:'<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',down:'<path d="M12 4v12M6.5 11 12 16.5 17.5 11M5 20h14"/>',trash:'<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
 refresh:'<path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5"/><path d="M20 4v4.5h-4.5"/>',clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',pulse:'<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',sound:'<path d="M4 10h3.5L12 6v12l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/>'
};
export const icon=(n,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[n]||''}</svg>`;
export const MARK=`<img class="brand-mark" src="/assets/ayan-mark.svg" alt="" width="36" height="36">`;
// Lantern of the "Огоньки" layer: dark = outline, lit = honey flame with a soft halo. Honey is used for rewards only.
export const lantern=(lit,cls='')=>`<svg class="lantern-ico ${lit?'lit':''} ${cls}" viewBox="0 0 40 50" aria-hidden="true" focusable="false"><circle class="halo" cx="20" cy="27" r="15"/><path d="M13 9a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" class="handle" style="color:var(--control)"/><rect class="cap" x="11" y="8" width="18" height="5" rx="2"/><rect class="glass" x="9" y="13" width="22" height="28" rx="7"/><path class="flame" d="M20 19.5c3.2 4.2 5.2 6.8 5.2 9.4a5.2 5.2 0 0 1-10.4 0c0-2.6 2-5.2 5.2-9.4z"/><rect class="cap" x="12" y="41" width="16" height="4" rx="2"/></svg>`;
// Russian plural: plural(5,['урок','урока','уроков']) -> 'уроков'.
export const plural=(n,[one,few,many])=>{const a=Math.abs(n)%100,b=a%10;return a>10&&a<20?many:b===1?one:b>=2&&b<=4?few:many;};

// ---------- language ----------
let LANG=(()=>{try{return localStorage.getItem('ayan.v2.lang')||'ru';}catch{return 'ru';}})();
export const lang=()=>LANG;
export function setLang(l){LANG=l==='kk'?'kk':'ru';document.documentElement.lang=LANG==='kk'?'kk':'ru';try{localStorage.setItem('ayan.v2.lang',LANG);}catch{}}
export const L=o=>o==null?'':typeof o==='string'?o:(o[LANG]??o.ru??'');
export function makeT(dict){return (k,vars)=>{let s=dict[k]?(dict[k][LANG==='kk'?1:0]??dict[k][0]):k;if(vars)for(const x in vars)s=s.replaceAll('{'+x+'}',vars[x]);return s;};}

// ---------- live region and toast ----------
let live;export function announce(msg){if(!live){live=document.createElement('div');live.className='sr-only';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.append(live);}live.textContent='';setTimeout(()=>{live.textContent=msg;},40);}
let toastTimer;export function toast(msg){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},3200);}

// ---------- dialogs: labelled, Escape closes, focus returns to the opener ----------
export function openDialog({title,body,onClose,labelClose='Закрыть',wide=false}){
 const opener=document.activeElement;const d=document.createElement('dialog');const hid='d'+sid().slice(0,8);
 d.setAttribute('aria-labelledby',hid);if(wide)d.style.maxWidth='min(980px,calc(100vw - 32px))';
 d.innerHTML=`<div class="dlg"><div class="dlg-head"><h2 id="${hid}">${esc(title)}</h2><button type="button" class="x" data-close aria-label="${esc(labelClose)}">${icon('x')}</button></div><div class="dlg-body"></div></div>`;
 const box=d.querySelector('.dlg-body');if(typeof body==='string')box.innerHTML=body;else if(body)box.append(body);
 document.body.append(d);d.showModal();
 let done=false;const finish=()=>{if(done)return;done=true;if(d.open)d.close();d.remove();onClose?.();if(opener&&opener.isConnected)opener.focus();};
 const close=finish;d.addEventListener('close',finish);d.addEventListener('cancel',e=>{e.preventDefault();finish();});
 d.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}});
 d.addEventListener('click',e=>{if(e.target.closest('[data-close]'))close();});
 (d.querySelector('[autofocus]')||d.querySelector('.dlg-body button, .dlg-body [href], .dlg-body input, .dlg-body select, .dlg-body textarea')||d.querySelector('[data-close]'))?.focus();
 return {el:d,box,close};
}

// ---------- API ----------
export class NetError extends Error{constructor(m){super(m);this.net=true;}}
// Who this page believes it is. Sent with every request; the server refuses it if another tab has logged in as someone else since.
let ACTOR=null;export const setActor=a=>{ACTOR=a;};
export async function api(url,{method,body,actor}={}){
 let r;const who=actor??ACTOR;try{r=await fetch(url,{method:method||(body?'POST':'GET'),credentials:'same-origin',headers:{...(body?{'Content-Type':'application/json'}:{}),...(who?{'X-Ayan-Actor':who}:{})},body:body?JSON.stringify(body):undefined});}
 catch(e){throw new NetError('offline');}
 let data=null;try{data=await r.json();}catch{}
 if(r.status>=500)throw new NetError('server_'+r.status);
 if(r.status===409&&data?.code==='actor_changed')window.dispatchEvent(new CustomEvent('ayan:actor-changed'));
 return {ok:r.ok,status:r.status,data};
}

// ---------- outbox: writes that must survive reload, offline and a server restart ----------
// Bound to one user id: after a switch of account the previous queue is never sent as the new user.
export function createOutbox(userId,{onChange}={}){
 const key='ayan.v2.outbox.'+userId;let timer=null,busy=false,paused=false;
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];}};
 const write=list=>{try{localStorage.setItem(key,JSON.stringify(list));}catch{}onChange?.(list);};
 async function flush(){
  if(busy)return;busy=true;paused=false;clearTimeout(timer);let list=read();const results=[];
  for(const op of list.slice()){
   try{const r=await api(op.url,{method:'POST',body:op.body,actor:op.actor});
    // 401: the session is gone. Keep this and every later operation; the queue resumes when the same user signs in again
    // (the queue is bound to the user id, so another account never sends it).
    if(r.status===401){paused=true;break;}
    list=read().filter(x=>x.id!==op.id);write(list);results.push({op,r});op.resolve?.(r);
    window.dispatchEvent(new CustomEvent('ayan:outbox-done',{detail:{op,r}}));}
   catch(e){const cur=read();const i=cur.findIndex(x=>x.id===op.id);if(i>=0){cur[i].tries=(cur[i].tries||0)+1;cur[i].last=Date.now();write(cur);}
    const tries=cur[i]?.tries||1;if(tries<8)timer=setTimeout(flush,Math.min(30000,1000*2**(tries-1)));break;}}
  busy=false;return results;
 }
 return {
  list:read,flush,get paused(){return paused;},
  // Puts the operation in the queue first, then sends. A reload re-sends the same body with the same ids.
  async send(id,url,body){const list=read();if(!list.some(x=>x.id===id)){list.push({id,url,body,actor:ACTOR,tries:0,created:Date.now()});write(list);}
   try{const r=await api(url,{method:'POST',body,actor:ACTOR});if(r.status===401){paused=true;return {sent:false,unauthorized:true,r,error:new Error('unauthorized')};}write(read().filter(x=>x.id!==id));return {sent:true,r};}
   catch(e){const cur=read();const i=cur.findIndex(x=>x.id===id);if(i>=0){cur[i].tries=(cur[i].tries||0)+1;write(cur);}clearTimeout(timer);timer=setTimeout(flush,1000);return {sent:false,error:e};}},
  drop(id){write(read().filter(x=>x.id!==id));},
  clear(){write([]);}
 };
}
export function store(userId){const k=n=>'ayan.v2.'+userId+'.'+n;return {get(n,def=null){try{const v=localStorage.getItem(k(n));return v?JSON.parse(v):def;}catch{return def;}},set(n,v){try{localStorage.setItem(k(n),JSON.stringify(v));}catch{}},del(n){try{localStorage.removeItem(k(n));}catch{}}};}
export const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
