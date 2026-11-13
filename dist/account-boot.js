(async()=>{
 const demo=location.pathname.startsWith('/demo/');
 const demoRequest=demo?(await import('/demo-data.mjs')).request:null;
 const role=location.pathname.endsWith('/child')?'child':'teacher';
 const api=async(url,opts)=>{if(demoRequest)return demoRequest(url,opts?.body?JSON.parse(opts.body):undefined,opts?.method);const r=await fetch(url,opts);if(!r.ok)throw Error('Не удалось сохранить данные');return r.json();};
 const me=await api('/api/me?role='+role).catch(()=>null);if(!me)return location.replace('/'+role+'/login');
 window.AyanAccount={role,me,api,child:null,demo,demoRequest};
 if(role==='teacher'){let children=await api('/api/children');if(!children.length)children=[await api('/api/children',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:'Ученик 1'})})];window.AyanAccount.children=children;window.AyanAccount.child=sessionStorage.getItem('ayan.selected.'+me.id);if(!children.some(c=>c.id===window.AyanAccount.child))window.AyanAccount.child=children[0].id;}
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
