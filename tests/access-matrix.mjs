// Stage 1 acceptance against a LOCAL server with test data (never production).
// Usage: PORT=4183 node server.mjs, then AYAN_TEST_URL=http://127.0.0.1:4183 node tests/access-matrix.mjs
// Covers brief/EdTech_Claude_Handoff/security-and-ux/SECURITY.md (negative checks 1-7) and PROGRESS_AND_UX.md (answer lifecycle).
import assert from 'node:assert/strict';
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4183';
const H={'content-type':'application/json',origin:B};
const jar=r=>r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
async function call(path,{cookie,method,body}={}){const r=await fetch(B+path,{method:method||(body?'POST':'GET'),headers:{...H,...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json();}catch{}return {status:r.status,data};}
const results=[];async function check(name,fn){try{await fn();results.push([name,true]);console.log('PASS  '+name);}catch(e){results.push([name,false]);console.log('FAIL  '+name+'\n      '+e.message.split('\n')[0]);}}
const uid=()=>crypto.randomUUID();
const s=Date.now();
async function signup(n){const r=await fetch(B+'/api/auth/sign-up/email',{method:'POST',headers:H,body:JSON.stringify({email:`matrix${n}${s}@t.test`,password:'matrix-pass-123',name:'T'+n})});assert.equal(r.status,200);return jar(r);}
async function childOf(teacher,label,answer='5'){
 const kid=(await call('/api/children',{cookie:teacher,body:{label}})).data;
 const lesson=(await call('/api/lesson?role=teacher&child='+kid.id,{cookie:teacher,body:{title:'Доли '+label,steps:['Шаг 1','Шаг 2'],question:'Сколько?',answer}})).data;
 const inv=(await call('/api/invite',{cookie:teacher,body:{child:kid.id}})).data;
 const e=await fetch(B+'/api/child/enter',{method:'POST',headers:H,body:JSON.stringify({code:inv.code})});
 const parent=(await call('/api/parent/invite',{cookie:teacher,body:{child:kid.id}})).data.url.split('#')[1];
 return {id:kid.id,lesson,cookie:jar(e),parent};
}
const tA=await signup('a'),tB=await signup('b');
const A=await childOf(tA,'A'),Bc=await childOf(tB,'B');
const startAttempt=async(c,lessonVersion)=>(await call('/api/attempt',{cookie:c.cookie,body:{attemptId:uid(),lessonVersion:lessonVersion||c.lesson.id,locale:'ru'}})).data;
const submit=(c,attemptId,submissionId,answer,extra={})=>call('/api/attempt/submit',{cookie:c.cookie,body:{attemptId,taskId:'final',submissionId,answer,...extra}});

// ---- SECURITY.md negative checks ----
await check('1 anonymous: lesson, attempt, submit, state, children, report, revoke -> 401',async()=>{
 const r=[await call('/api/lesson?role=child'),await call('/api/attempt?id=x'),await call('/api/attempt/submit',{body:{}}),await call('/api/state?role=teacher'),await call('/api/children'),await call('/api/parent/report',{body:{code:'nope'}}),await call('/api/children/revoke',{body:{child:A.id}})];
 for(const x of r)assert.equal(x.status,401,JSON.stringify(r.map(x=>x.status)));
 for(const x of r)assert.ok(!JSON.stringify(x.data).includes(A.id));
});
await check('2 child A cannot read or answer child B attempt; B data unchanged',async()=>{
 const b=await startAttempt(Bc);
 assert.equal((await call('/api/attempt?id='+b.id,{cookie:A.cookie})).status,404);
 assert.equal((await submit(A,b.id,uid(),'5')).status,404);
 assert.equal((await call('/api/lesson/event',{cookie:A.cookie,body:{kind:'step',value:'2',attemptId:b.id}})).status,404);
 const again=await call('/api/attempt?id='+b.id,{cookie:Bc.cookie});assert.equal(again.data.submissions.length,0);assert.equal(again.data.state,'in_progress');
 // reusing B's attempt id for A must not take it over
 const steal=await call('/api/attempt',{cookie:A.cookie,body:{attemptId:b.id,lessonVersion:A.lesson.id}});assert.equal(steal.status,404);
});
await check('3 teacher A cannot open teacher B student (lesson, state, invite, parent link, revoke), list hides B',async()=>{
 for(const role of ['teacher','admin','x','']){assert.equal((await call(`/api/lesson?role=${role}&child=${Bc.id}`,{cookie:tA})).status,404,role);assert.equal((await call(`/api/state?role=${role}&child=${Bc.id}`,{cookie:tA})).status,404,role);}
 assert.equal((await call('/api/invite',{cookie:tA,body:{child:Bc.id}})).status,404);
 assert.equal((await call('/api/parent/invite',{cookie:tA,body:{child:Bc.id}})).status,404);
 assert.equal((await call('/api/children/revoke',{cookie:tA,body:{child:Bc.id}})).status,404);
 const list=(await call('/api/children',{cookie:tA})).data;assert.ok(!list.some(c=>c.id===Bc.id));
});
await check('4 parent link only opens its own child',async()=>{
 const r=await call('/api/parent/report',{body:{code:A.parent,childId:Bc.id,child:Bc.id}});assert.equal(r.status,200);assert.equal(r.data.label,'A');
});
await check('5 client score / completed / role fields are ignored',async()=>{
 const a=await startAttempt(A);
 const r=await submit(A,a.id,uid(),'4',{score:100,completed:true,evaluation:'correct',state:'completed',role:'teacher'});
 assert.equal(r.status,200);assert.equal(r.data.evaluation,'incorrect');assert.equal(r.data.attempt.state,'in_progress');
 const forged=await call('/api/attempt',{cookie:A.cookie,body:{attemptId:uid(),lessonVersion:A.lesson.id,state:'completed'}});assert.equal(forged.data.state,'in_progress');
});
await check('6 after revoke the child session and parent link stop working',async()=>{
 const T=tA;const R=await childOf(T,'R');
 assert.equal((await call('/api/lesson?role=child',{cookie:R.cookie})).status,200);
 assert.equal((await call('/api/children/revoke',{cookie:T,body:{child:R.id}})).status,200);
 assert.equal((await call('/api/lesson?role=child',{cookie:R.cookie})).status,401);
 assert.equal((await call('/api/parent/report',{body:{code:R.parent}})).status,401);
});
await check('7 idempotent replay returns the same result only to the owner',async()=>{
 const a=await startAttempt(A),sub=uid();
 const first=await submit(A,a.id,sub,'4'),second=await submit(A,a.id,sub,'4');
 assert.equal(second.status,200);assert.equal(second.data.replay,true);assert.equal(second.data.savedAt,first.data.savedAt);
 assert.equal((await submit(Bc,a.id,sub,'4')).status,404);
});

// ---- PROGRESS_AND_UX.md answer lifecycle ----
await check('blank answer is "no answer" (400 empty), not a wrong answer, and nothing is stored',async()=>{
 const a=await startAttempt(A);const r=await submit(A,a.id,uid(),'   ');assert.equal(r.status,400);assert.equal(r.data.code,'empty');
 assert.equal((await call('/api/attempt?id='+a.id,{cookie:A.cookie})).data.submissions.length,0);
});
await check('double click (parallel same submission) stores one answer and one report event',async()=>{
 const T=tA;const D=await childOf(T,'D');const a=await startAttempt(D),sub=uid();
 const [x,y]=await Promise.all([submit(D,a.id,sub,'5'),submit(D,a.id,sub,'5')]);
 assert.equal(x.status,200);assert.equal(y.status,200);
 const v=(await call('/api/attempt?id='+a.id,{cookie:D.cookie})).data;assert.equal(v.submissions.length,1);assert.equal(v.state,'completed');
 const rep=(await call('/api/parent/report',{body:{code:D.parent}})).data;assert.equal(rep.events.filter(e=>e.kind==='answer').length,1);
});
await check('retry after a lost response (timeout after server save) does not add a second answer',async()=>{
 const T=tA;const X=await childOf(T,'X');const a=await startAttempt(X),sub=uid();
 await submit(X,a.id,sub,'5'); // response "lost"
 const saved=(await call('/api/attempt?id='+a.id,{cookie:X.cookie})).data;assert.equal(saved.submissions[0].submissionId,sub); // client asks first
 const retry=await submit(X,a.id,sub,'5');assert.equal(retry.data.replay,true);
 const rep=(await call('/api/parent/report',{body:{code:X.parent}})).data;assert.equal(rep.events.filter(e=>e.kind==='answer'&&e.value==='correct').length,1);
});
await check('different content under the same submission key is rejected (409 conflict)',async()=>{
 const a=await startAttempt(A),sub=uid();await submit(A,a.id,sub,'3');const r=await submit(A,a.id,sub,'5');assert.equal(r.status,409);assert.equal(r.data.code,'conflict');
});
await check('late wrong answer cannot undo a completed attempt (two tabs)',async()=>{
 const T=tA;const Wc=await childOf(T,'W');const a=await startAttempt(Wc);
 const tab1=await submit(Wc,a.id,uid(),'5');assert.equal(tab1.data.attempt.state,'completed');
 const tab2=await submit(Wc,a.id,uid(),'9');assert.equal(tab2.status,409);assert.equal(tab2.data.code,'completed');assert.equal(tab2.data.attempt.state,'completed');
});
await check('attempt is graded by the version it started on; re-publish creates a new version',async()=>{
 const T=tA;const Vc=await childOf(T,'V','5');const a=await startAttempt(Vc);
 const v2=(await call('/api/lesson?role=teacher&child='+Vc.id,{cookie:T,body:{title:'Доли V',steps:['Шаг 1'],question:'Сколько?',answer:'7'}})).data;
 assert.equal(v2.version,2);assert.equal(v2.answerKeyVersion,2);assert.notEqual(v2.id,Vc.lesson.id);
 const r=await submit(Vc,a.id,uid(),'5');assert.equal(r.data.evaluation,'correct','old attempt keeps key of version 1');
 assert.equal((await call('/api/attempt',{cookie:Vc.cookie,body:{attemptId:uid(),lessonVersion:Vc.lesson.id}})).data.code,'lesson_changed');
 const b=await startAttempt(Vc,v2.id);assert.equal((await submit(Vc,b.id,uid(),'5')).data.evaluation,'incorrect');
 const rep=(await call('/api/parent/report',{body:{code:Vc.parent}})).data;assert.deepEqual([...new Set(rep.events.filter(e=>e.kind==='answer').map(e=>e.version))].sort(),[1,2]);
});
await check('child lesson hides the answer key and offers resume from the open attempt',async()=>{
 const T=tA;const S=await childOf(T,'S');const a=await startAttempt(S);
 await call('/api/lesson/event',{cookie:S.cookie,body:{kind:'step',value:'2',attemptId:a.id}});
 const l=(await call('/api/lesson?role=child',{cookie:S.cookie})).data;assert.equal(l.answer,undefined);assert.equal(l.attemptId,a.id);assert.equal(l.resume,2);
});
await check('step value is validated; answers via the old event endpoint are refused',async()=>{
 assert.equal((await call('/api/lesson/event',{cookie:A.cookie,body:{kind:'step',value:'<b>999</b>'}})).status,400);
 assert.equal((await call('/api/lesson/event',{cookie:A.cookie,body:{kind:'answer',value:'5'}})).status,400);
});
// ---- Stage 2: support profile and video viewing ----
await check('support profile: child changes only the safe part, teacher changes all, other teacher gets 404',async()=>{
 const put=(c,body,q)=>fetch(B+'/api/support?'+q,{method:'PUT',headers:{...H,cookie:c},body:JSON.stringify(body)}).then(async r=>({status:r.status,data:await r.json()}));
 const c1=await put(A.cookie,{lang:'kk',textSize:'large',pace:'slow',input:'drag',diagnosis:'x'},'role=child');
 assert.equal(c1.status,200);assert.equal(c1.data.lang,'kk');assert.equal(c1.data.textSize,'large');assert.equal(c1.data.pace,'normal');assert.equal(c1.data.input,'buttons');assert.equal(c1.data.diagnosis,undefined);
 const t1=await put(tA,{pace:'slow',repeatInstruction:true,lang:'zz'},'role=teacher&child='+A.id);assert.equal(t1.data.pace,'slow');assert.equal(t1.data.repeatInstruction,true);assert.equal(t1.data.lang,'kk');
 assert.equal((await call('/api/support?role=teacher&child='+A.id,{cookie:tB})).status,404);
 assert.equal((await put(tB,{pace:'normal'},'role=admin&child='+A.id)).status,404);
 assert.equal((await call('/api/support?role=child')).status,401);
});
await check('video viewing: seconds only grow, completed is sticky, separate from answers, owner only',async()=>{
 const v=(c,body)=>call('/api/video/progress',{cookie:c,body});
 assert.equal((await v(A.cookie,{videoId:'M01',version:'0.1.0-draft',seconds:30,duration:70})).data.seconds,30);
 assert.equal((await v(A.cookie,{videoId:'M01',version:'0.1.0-draft',seconds:10,duration:70})).data.seconds,30);
 assert.equal((await v(A.cookie,{videoId:'M01',version:'0.1.0-draft',seconds:70,duration:70,completed:true})).data.completed,true);
 assert.equal((await v(A.cookie,{videoId:'M01',version:'0.1.0-draft',seconds:5,completed:false})).data.completed,true);
 assert.equal((await v(A.cookie,{videoId:'../x',version:'1'})).status,400);
 assert.equal((await call('/api/video/progress',{body:{videoId:'M01',version:'1'}})).status,401);
 const mine=(await call('/api/video/progress',{cookie:Bc.cookie})).data;assert.ok(!mine.some(x=>x.videoId==='M01'));
 const rep=(await call('/api/parent/report',{body:{code:A.parent}})).data;assert.equal(rep.videos[0].completed,true);assert.ok(!rep.events.some(e=>e.kind==='video'));
});
// ---- Stage 3: lesson game M01 graded on the server ----
await check('game M01: server grading, invalid format 400, completion only after all 3 tasks, assisted stored, canonical replay',async()=>{
 const kid=(await call('/api/children',{cookie:tA,body:{label:'G'}})).data;
 const pub=await call('/api/lesson?role=teacher&child='+kid.id,{cookie:tA,body:{title:'Равные доли',steps:['Шаг'],game:'fractions-m01'}});
 assert.equal(pub.status,200);assert.equal(pub.data.game,'fractions-m01');assert.equal(pub.data.answer,null);
 assert.equal((await call('/api/lesson?role=teacher&child='+kid.id,{cookie:tA,body:{title:'x',steps:['y'],game:'unknown'}})).status,400);
 const inv=(await call('/api/invite',{cookie:tA,body:{child:kid.id}})).data;const e=await fetch(B+'/api/child/enter',{method:'POST',headers:H,body:JSON.stringify({code:inv.code})});const G={cookie:jar(e),lesson:pub.data};
 const a=await startAttempt(G);const sub=(task,answer,extra={})=>call('/api/attempt/submit',{cookie:G.cookie,body:{attemptId:a.id,taskId:task,submissionId:uid(),answer,...extra}});
 assert.equal((await sub('m01-t1','0,0')).data.code,'invalid');assert.equal((await sub('m01-t1','5')).status,400);assert.equal((await sub('final','5')).status,400);
 const w=await sub('m01-t1','0,1');assert.equal(w.data.evaluation,'incorrect');assert.equal(w.data.reason,'needOne');
 assert.equal((await sub('m01-t1','2',{assisted:true,score:100})).data.attempt.state,'in_progress');
 const same=uid();const r1=await call('/api/attempt/submit',{cookie:G.cookie,body:{attemptId:a.id,taskId:'m01-t2',submissionId:same,answer:'3,1'}});
 const r2=await call('/api/attempt/submit',{cookie:G.cookie,body:{attemptId:a.id,taskId:'m01-t2',submissionId:same,answer:'1,3'}});
 assert.equal(r1.data.evaluation,'correct');assert.equal(r2.data.replay,true,'1,3 and 3,1 are the same answer');
 assert.equal(r2.data.attempt.state,'in_progress','two of three tasks do not complete the lesson');
 assert.equal((await sub('m01-t3','unequal')).data.reason,'unequal');
 const fin=await sub('m01-t3','equal');assert.equal(fin.data.attempt.state,'completed');
 const v=fin.data.attempt.submissions;assert.equal(v.find(x=>x.taskId==='m01-t1'&&x.evaluation==='correct').assisted,true);
});
const failed=results.filter(r=>!r[1]).length;
console.log(`\n${results.length-failed}/${results.length} passed`);process.exit(failed?1:0);
