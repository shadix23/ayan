// Outside the demo a student is created only with a confirmed consent of the parents (POST /api/children needs consent,
// hackathon/api-accounts.md п.5), so the cabinet asks for the first student instead of creating one silently.
function firstChild(api){return new Promise(resolve=>{
 const kk=(()=>{try{return localStorage.getItem('ayan.page.lang')==='kk';}catch(e){return false;}})(),t=(a,b)=>kk?a:b;
 const box=document.createElement('div');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','fc-h');
 box.style.cssText='position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:16px;background:rgba(31,42,46,.42);font-family:Nunito,system-ui,sans-serif';
 box.innerHTML='<form style="background:#fff;color:#1F2A2E;border-radius:24px;padding:24px;max-width:480px;width:100%;display:grid;gap:14px;box-shadow:0 24px 64px -24px rgba(31,42,46,.45)" novalidate>'+
  '<h2 id="fc-h" style="margin:0;font-size:1.375rem">'+t('Бірінші оқушыны қосыңыз','Добавьте первого ученика')+'</h2>'+
  '<p style="margin:0;color:#4F5F63">'+t('Аты немесе бүркеншік ат жеткілікті. Диагноз керек емес.','Достаточно имени или псевдонима. Диагноз не нужен.')+'</p>'+
  '<label for="fc-name" style="font-weight:800">'+t('Оқушының аты','Имя ученика')+'</label><input id="fc-name" maxlength="40" required style="min-height:52px;border:1px solid #6B807C;border-radius:14px;padding:12px 16px;font:inherit">'+
  '<label style="display:grid;grid-template-columns:24px 1fr;gap:12px;align-items:start;cursor:pointer"><input id="fc-ok" type="checkbox" style="width:22px;height:22px;margin:2px 0 0;accent-color:#0F766E" aria-describedby="fc-err"><span>'+t('Оқушының ата-анасы (заңды өкілі) оның дербес деректерін өңдеуге келісім берді. <a href="/legal/parental-consent?lang=kk" target="_blank">Келісім туралы</a>','У меня есть согласие родителей (законных представителей) ученика на обработку его персональных данных. <a href="/legal/parental-consent" target="_blank">О согласии</a>')+'</span></label>'+
  '<p id="fc-err" role="alert" style="margin:0;color:#A33442;font-weight:750"></p>'+
  '<button style="min-height:56px;border:0;border-radius:16px;background:#0F766E;color:#fff;font:inherit;font-weight:800;cursor:pointer">'+t('Оқушыны қосу','Добавить ученика')+'</button></form>';
 document.body.append(box);const f=box.querySelector('form'),name=box.querySelector('#fc-name'),ok=box.querySelector('#fc-ok'),err=box.querySelector('#fc-err');name.focus();
 f.onsubmit=async e=>{e.preventDefault();err.textContent='';name.removeAttribute('aria-invalid');ok.removeAttribute('aria-invalid');
  if(!name.value.trim()){name.setAttribute('aria-invalid','true');name.setAttribute('aria-describedby','fc-err');err.textContent=t('Оқушының атын жазыңыз','Напишите имя ученика');name.focus();return;}
  if(!ok.checked){ok.setAttribute('aria-invalid','true');err.textContent=t('Ата-ананың келісімін растаңыз','Подтвердите согласие родителей');ok.focus();return;}
  try{const c=await api('/api/children',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:name.value.trim(),consent:{confirmed:true,basis:'guardian_consent'}})});box.remove();resolve(c);}
  catch(e2){err.textContent=t('Сақталмады. Қайталап көріңіз.','Не удалось сохранить. Попробуйте ещё раз.');}};
});}
(async()=>{
 const demo=location.pathname.startsWith('/demo/');
 const demoRequest=demo?(await import('/demo-data.mjs')).request:null;
 const role=/\/child(\/|$)/.test(location.pathname)?'child':'teacher';
 const api=async(url,opts)=>{if(demoRequest)return demoRequest(url,opts?.body?JSON.parse(opts.body):undefined,opts?.method);const r=await fetch(url,opts);if(!r.ok)throw Error('Не удалось сохранить данные');return r.json();};
 const me=await api('/api/me?role='+role).catch(()=>null);if(!me)return location.replace('/'+role+'/login');
 window.AyanAccount={role,me,api,child:null,demo,demoRequest};
 if(role==='teacher'){let children=await api('/api/children');if(!children.length)children=[demo?await api('/api/children',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:'Ученик 1'})}):await firstChild(api)];window.AyanAccount.children=children;window.AyanAccount.child=sessionStorage.getItem('ayan.selected.'+me.id);if(!children.some(c=>c.id===window.AyanAccount.child))window.AyanAccount.child=children[0].id;}
 const stateURL='/api/state?role='+role+(role==='teacher'?'&child='+window.AyanAccount.child:'');
 const prefix='ayan.account.'+me.id+'.',nativeGet=Storage.prototype.getItem,nativeSet=Storage.prototype.setItem;
 const mapped=k=>['ayan.state.v1','ayan.experience.v2','ayan.session.v2'].includes(k)?prefix+k:k;
 const remote=await api(stateURL);nativeSet.call(localStorage,mapped('ayan.experience.v2'),JSON.stringify(remote));
 // Teacher observations belong to one student (brief: SECURITY/PROGRESS). The cabinet only sees the selected student's notes;
 // notes of other students are kept aside and merged back on save. Untagged notes from before this change are shown only
 // when the teacher has exactly one student (then they can only be about that student).
 let teacherFull=null;const mine=o=>o.student===window.AyanAccount.child||(!o.student&&window.AyanAccount.children?.length===1);
 if(role==='teacher'){const teacherState=await api('/api/state?role=teacher');
  window.AyanAccount.lessonVersion=await api('/api/lesson?role=teacher&child='+window.AyanAccount.child).then(l=>l?.id||null).catch(()=>null);
  if(teacherState){teacherFull=teacherState;nativeSet.call(localStorage,mapped('ayan.state.v1'),JSON.stringify({...teacherState,observations:(teacherState.observations||[]).filter(mine)}));}}
 const withOthers=v=>{try{const s=JSON.parse(v);const child=window.AyanAccount.child;
  const obs=(s.observations||[]).map(o=>o.student?o:{...o,student:child,lessonVersion:o.lessonVersion||window.AyanAccount.lessonVersion||null});
  teacherFull={...s,observations:(teacherFull?.observations||[]).filter(o=>!mine(o)).concat(obs)};return JSON.stringify(teacherFull);}catch(e){return v;}};
 Storage.prototype.getItem=function(k){return nativeGet.call(this,this===localStorage?mapped(k):k);};
 let queue=Promise.resolve();Storage.prototype.setItem=function(k,v){nativeSet.call(this,this===localStorage?mapped(k):k,v);if(this!==localStorage||!['ayan.state.v1','ayan.experience.v2'].includes(k))return;
 const url=k==='ayan.state.v1'?'/api/state?role=teacher':stateURL;
 const payload=k==='ayan.state.v1'?withOthers(v):v;
 queue=queue.catch(()=>{}).then(()=>api(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:payload})).catch(()=>{let notice=document.querySelector('#sync-error');if(!notice){notice=document.createElement('p');notice.id='sync-error';notice.setAttribute('role','alert');notice.style.cssText='position:fixed;bottom:0;left:0;right:0;padding:16px;background:#fff1df;z-index:100';document.body.append(notice);}notice.textContent='Нет связи с сервером. Последние изменения сохранены только на этом устройстве.';});};
 window.AyanAccount.flush=()=>queue;
 for(const src of ['logic.js','game-logic.js','mascot.js','game-ui.js','app.js','experience-logic.js','experience.js','answer-check.js','games/fractions.js','lesson-templates.js','video-library.js','product.js'])await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/'+src;script.onload=resolve;script.onerror=reject;document.body.append(script);});
})().catch(()=>{document.body.textContent='Не удалось загрузить кабинет. Обновите страницу или войдите снова.';});
