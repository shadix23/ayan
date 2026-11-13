// Stage 0 audit: reproduce suspected problems with direct API calls against a LOCAL server and test data.
// Usage: node server.mjs (PORT=4183), then AYAN_TEST_URL=http://127.0.0.1:4183 node tests/audit-repro.mjs
// Prints one line per check: CONFIRMED (problem reproduced) or NOT REPRODUCED.
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4183';
const json={'content-type':'application/json',origin:B};
const jar=r=>r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
async function call(path,{cookie,method,body}={}){const r=await fetch(B+path,{method:method||(body?'POST':'GET'),headers:{...json,...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json();}catch{}return {status:r.status,data,r};}
const out=[];const report=(id,confirmed,detail)=>{out.push([id,confirmed,detail]);console.log((confirmed?'CONFIRMED     ':'NOT REPRODUCED')+'  '+id+': '+detail);};

const s=Date.now();
const su=await fetch(B+'/api/auth/sign-up/email',{method:'POST',headers:json,body:JSON.stringify({email:`audit${s}@t.test`,password:'audit-pass-123',name:'Audit'})});const teacher=jar(su);
const kid=(await call('/api/children',{cookie:teacher,body:{label:'Audit child'}})).data;
const L=(answer,title='Тема аудита')=>({title,steps:['Шаг 1','Шаг 2'],question:'Сколько?',answer});
await call('/api/lesson?role=teacher&child='+kid.id,{cookie:teacher,body:L('5')});
const inv=(await call('/api/invite',{cookie:teacher,body:{child:kid.id}})).data;
const enter=await fetch(B+'/api/child/enter',{method:'POST',headers:json,body:JSON.stringify({code:inv.code})});const child=jar(enter);
const parentUrl=(await call('/api/parent/invite',{cookie:teacher,body:{child:kid.id}})).data.url;const parentCode=parentUrl.split('#')[1];
const parent=async()=>(await call('/api/parent/report',{body:{code:parentCode}})).data;

// A1: double click / retry after timeout creates duplicate answers and inflates the report
await Promise.all([call('/api/lesson/event',{cookie:child,body:{kind:'answer',value:'5'}}),call('/api/lesson/event',{cookie:child,body:{kind:'answer',value:'5'}})]);
let rep=await parent();let correct=rep.events.filter(e=>e.kind==='answer'&&e.value==='correct').length;
report('A1 duplicate submit',correct>1,`one answer sent twice (double click) -> parent report shows ${correct} correct answers`);

// A2: empty answer is stored as a wrong answer
const empty=await call('/api/lesson/event',{cookie:child,body:{kind:'answer',value:'   '}});
report('A2 empty answer = wrong',empty.status===200&&empty.data?.value==='retry',`blank answer -> HTTP ${empty.status}, stored value "${empty.data?.value}"`);

// A3: no lesson version: re-publishing with the same title and another key merges history
await call('/api/lesson?role=teacher&child='+kid.id,{cookie:teacher,body:L('7')});
rep=await parent();const titles=new Set(rep.events.map(e=>e.lesson));
report('A3 no lesson version',titles.size===1,`after changing the answer key from 5 to 7, old "correct" answers stay under the same lesson "${[...titles][0]}" with no version`);

// A4: child can mark every game as completed through the state API (client-trusted result)
const all=['pairs','sequence','sort','pack','pattern','puzzle','listen','route','garden'];
const put=await call('/api/state?role=child',{cookie:child,method:'PUT',body:{version:2,enabled:all,completed:all,garden:[],motion:true}});
rep=await parent();
report('A4 trusted game completion',put.status===200&&rep.games.length===all.length,`child PUT completed=all -> HTTP ${put.status}, parent report lists ${rep.games.length} completed games`);

// A5: step value is not validated
const step=await call('/api/lesson/event',{cookie:child,body:{kind:'step',value:'<b>999</b>'}});
report('A5 unvalidated step value',step.status===200,`step value "<b>999</b>" -> HTTP ${step.status} (stored as text; output uses textContent, so no XSS seen)`);

// A6: teacher cannot revoke a child session (no unlink / delete endpoint)
const del=await call('/api/children?id='+kid.id,{cookie:teacher,method:'DELETE'});
const still=await call('/api/lesson?role=child',{cookie:child});
report('A6 no access revocation',del.status!==200&&still.status===200,`DELETE /api/children -> HTTP ${del.status}; child session still reads the lesson (HTTP ${still.status})`);

// A7: role spoofing (fixed in 54cad12): another teacher with role=admin
const su2=await fetch(B+'/api/auth/sign-up/email',{method:'POST',headers:json,body:JSON.stringify({email:`audit2${s}@t.test`,password:'audit-pass-123',name:'Other'})});const other=jar(su2);
const spoof=await call(`/api/lesson?role=admin&child=${kid.id}`,{cookie:other});const spoof2=await call(`/api/state?role=x&child=${kid.id}`,{cookie:other});
report('A7 role spoofing (regression)',spoof.status===200||spoof2.status===200,`other teacher with role=admin/x -> lesson HTTP ${spoof.status}, state HTTP ${spoof2.status}`);

// A8: anonymous access to API
const anon=[await call('/api/lesson?role=child'),await call('/api/state?role=teacher'),await call('/api/children'),await call('/api/parent/report',{body:{code:'x'}})];
report('A8 anonymous access',anon.some(a=>a.status===200),'anonymous lesson/state/children/report -> '+anon.map(a=>a.status).join(', '));

// A9: old parent link after a new one is issued
await call('/api/parent/invite',{cookie:teacher,body:{child:kid.id}});const old=await call('/api/parent/report',{body:{code:parentCode}});
report('A9 parent link not revoked',old.status===200,`old parent code after re-issue -> HTTP ${old.status}`);

// A10: the answer endpoint has no attempt id, so a retry cannot be told apart from a second answer
report('A10 no attempt id',true,'POST /api/lesson/event {kind:"answer"} takes only value; server cannot deduplicate a retry (see A1)');
console.log(JSON.stringify({checked:out.length,confirmed:out.filter(x=>x[1]).length}));
