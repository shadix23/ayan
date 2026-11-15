// V2.1 API acceptance on a LOCAL server with a separate synthetic database (docs/briefs/edtech-v2-claude/requirements/ACCEPTANCE_TESTS.md).
// Starts its own server (AYAN_DEMO=1, .data/test-v2.sqlite) with FAKE paid-provider keys and a preload that records any
// request to a non-local host. Usage: node tests/v2-api.mjs   Prints PASS/FAIL per check and exits 1 on any failure.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
// The test server needs a port nobody else uses: with a busy port the checks would silently talk to another server (and
// the direct database edits below would hit a file that server does not read). Env override, otherwise a free port.
import net from 'node:net';
const freePort=()=>new Promise(r=>{const sv=net.createServer();sv.listen(0,'127.0.0.1',()=>{const p=sv.address().port;sv.close(()=>r(p));});});
const PORT=Number(process.env.AYAN_V2_API_PORT)||await freePort(),B=`http://127.0.0.1:${PORT}`,EXT=`.data/test-external-${PORT}.log`,DB=`.data/test-v2-${PORT}.sqlite`;
fs.mkdirSync('.data',{recursive:true});for(const f of [EXT,DB])try{fs.rmSync(f);}catch{}
const srv=spawn(process.execPath,['--require','./tests/helpers/no-external.cjs','server.mjs'],{env:{...process.env,PORT:String(PORT),AYAN_DEMO:'1',AYAN_DB_FILE:DB,AYAN_EXTERNAL_LOG:EXT,
 ELEVENLABS_API_KEY:'fake-test-key',GROQ_API_KEY:'fake-test-key',AI_GATEWAY_API_KEY:'fake-test-key',BETTER_AUTH_SECRET:'test-secret-for-local-v2-api-0123456789abcdef',DATABASE_URL:''},stdio:['ignore','pipe','pipe']});
let out='';srv.stdout.on('data',d=>out+=d);srv.stderr.on('data',d=>out+=d);
for(let i=0;i<60&&!out.includes('Ayan http');i++)await new Promise(r=>setTimeout(r,250));
if(!out.includes('Ayan http://127.0.0.1:'+PORT)){console.error('FAIL test server did not start on port '+PORT+':\n'+out.slice(0,400));srv.kill();process.exit(1);}
const results=[];const check=(id,ok,detail)=>{results.push([id,ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const jar=r=>r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
async function call(path,{cookie,body,method,headers,raw}={}){const r=await fetch(B+path,{method:method||(body||raw?'POST':'GET'),headers:{'content-type':'application/json',origin:B,...(cookie?{cookie}:{}),...(headers||{})},body:raw??(body?JSON.stringify(body):undefined)});let data=null;try{data=await r.json();}catch{}return {status:r.status,data};}
async function login(as){const r=await fetch(B+'/api/demo/login',{method:'POST',headers:{'content-type':'application/json',origin:B},body:JSON.stringify({as})});return jar(r);}
const sid=()=>crypto.randomBytes(12).toString('hex'),uuid=()=>crypto.randomUUID();
try{
 const T={a:await login('teacher-a'),b:await login('teacher-b'),adA:await login('admin-a'),adB:await login('admin-b')};
 const S={s1:await login('student-01'),s2:await login('student-02'),s3:await login('student-03'),b1:await login('student-b1')};
 check('DEMO-LOGIN all synthetic accounts',Object.values(T).every(Boolean)&&Object.values(S).every(Boolean));

 // ---- AUTH ----
 const anon=await Promise.all(['/api/v2/report?child=demo-student-01','/api/v2/class','/api/v2/child/home','/api/v2/me','/api/v2/export?child=demo-student-01'].map(p=>call(p)));
 check('AUTH-01 no session -> 401, no data',anon.every(r=>r.status===401&&!r.data?.summary&&!r.data?.students));
 const h1=(await call('/api/v2/child/home',{cookie:S.s1})).data,h2=(await call('/api/v2/child/home',{cookie:S.s2})).data;
 const a1=h1.current.assignmentId,a2=h2.queue[0].assignmentId;
 const foreign=[await call('/api/v2/child/lesson?assignment='+a2,{cookie:S.s1}),await call('/api/v2/child/attempt',{cookie:S.s1,body:{attemptId:sid(),assignmentId:a2}}),
  await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:'demo-attempt-student-02',taskId:'f1',submissionId:sid(),answer:'mark:0'}}),await call('/api/v2/child/state',{cookie:S.s1,body:{attemptId:'demo-attempt-student-02',revision:0,stage:'goal'}})];
 check('AUTH-02 student A cannot read or change student B (404)',foreign.every(r=>r.status===404),foreign.map(r=>r.status).join(','));
 const pa=await call('/api/parent/report',{body:{code:'demo-parent-link-student-01'}}),pb=await call('/api/parent/report',{body:{code:'demo-parent-link-student-02'}});
 check('AUTH-03 parent link reads only the linked child',pa.status===200&&pa.data.label==='Ученик 01'&&pb.status===401);
 const tb=[await call('/api/v2/report?child=demo-student-b1',{cookie:T.a}),await call('/api/v2/assign',{cookie:T.a,body:{opId:sid(),childIds:['demo-student-b1'],lessonId:'math-fractions-01'}}),await call('/api/v2/export?child=demo-student-b1',{cookie:T.a}),
  await call('/api/v2/support?child=demo-student-b1',{cookie:T.a}),await call('/api/v2/notes',{cookie:T.a,body:{child:'demo-student-b1',text:'x'}}),await call('/api/v2/student/delete',{cookie:T.a,body:{child:'demo-student-b1',confirm:'Ученик B1'}})];
 check('AUTH-04 teacher A cannot read/assign/export/edit/delete a student of teacher B',tb.every(r=>r.status===404),tb.map(r=>r.status).join(','));
 const ovB=await call('/api/v2/admin/overview',{cookie:T.adB}),clsAdmin=await call('/api/v2/class',{cookie:T.adB}),repAdmin=await call('/api/v2/report?child=demo-student-01',{cookie:T.adB});
 check('AUTH-05 admin B sees only org B summary, no student detail of org A',ovB.status===200&&ovB.data.org.id==='demo-org-b'&&ovB.data.students===1&&clsAdmin.status===403&&repAdmin.status===403);
 const startS3=(await call('/api/v2/child/home',{cookie:S.s3})).data;const att3='demo-attempt-student-03';
 const spoof=await call('/api/v2/child/submit?role=admin',{cookie:S.s3,body:{attemptId:att3,taskId:'f2',submissionId:sid(),answer:'mark:0,1',correct:true,role:'admin',ownerId:'demo-student-02',isCorrect:true}});
 check('AUTH-06 client role/owner/correct flags ignored, server grades',spoof.status===200&&spoof.data.evaluation==='incorrect');void startS3;
 const xss='<script>alert(1)</script><img src=x onerror=alert(2)>';const n=await call('/api/v2/notes',{cookie:T.a,body:{child:'demo-student-01',text:xss}});
 const rep1=(await call('/api/v2/report?child=demo-student-01',{cookie:T.a})).data;const src=fs.readFileSync('dist/v2/adult.mjs','utf8');
 check('AUTH-07 note stored as plain text and rendered through esc()',n.status===200&&rep1.notes.some(x=>x.text===xss)&&src.includes('${esc(n.text)}'));
 const lo=await call('/api/child/logout',{cookie:S.b1,body:{}});const after=await call('/api/v2/child/home',{cookie:S.b1});
 check('AUTH-08 logout invalidates the old child session; outbox key is per user',lo.status===200&&after.status===401&&fs.readFileSync('dist/v2/ui.mjs','utf8').includes("'ayan.v2.outbox.'+userId"));
 S.b1=await login('student-b1');
 const bundle=['dist/v2/child.mjs','dist/v2/adult.mjs','dist/v2/ui.mjs','dist/v2/lesson.mjs'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
 check('AUTH-09 no keys or tokens in the client bundle',!/(sk-[A-Za-z0-9]{10,}|xi-api-key|GROQ_API_KEY|ELEVENLABS|Bearer )/.test(bundle));

 // ---- scoring and idempotency ----
 const L1=(await call('/api/v2/child/lesson?assignment='+a1,{cookie:S.s1})).data;
 check('LESSON child copy has no answer keys',L1.lesson.tasks.every(t=>t.correct===undefined&&t.pairs===undefined));
 const att1=sid();const st=await call('/api/v2/child/attempt',{cookie:S.s1,body:{attemptId:att1,assignmentId:a1}});const att1id=st.data.id;
 const again=await call('/api/v2/child/attempt',{cookie:S.s1,body:{attemptId:sid(),assignmentId:a1}});
 check('PATH-02 second start (reload, second tab) returns the same attempt',again.data.id===att1id);
 const good=await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'f2',submissionId:sid(),answer:'mark:3'}});
 const bad=await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'f3',submissionId:sid(),answer:'mark:3'}});
 check('SCORE-01 evaluator: right and wrong canonical answers',good.data.evaluation==='correct'&&bad.data.evaluation==='incorrect'&&bad.data.reason==='tooFew');
 const dup=sid();const reqs=await Promise.all([1,2,3,4].map(()=>call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'f1',submissionId:dup,answer:'mark:1'}})));
 const subsF1=(await call('/api/v2/child/lesson?assignment='+a1,{cookie:S.s1})).data.attempt.submissions.filter(s=>s.taskId==='f1');
 check('SCORE-02 double click + retries of one submissionId -> one record, stable reply',reqs.every(r=>r.status===200&&r.data.evaluation==='correct')&&subsF1.length===1);
 const conflict=await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'f1',submissionId:dup,answer:'mark:0,1'}});
 check('SCORE-03 same submissionId with other payload -> 409, result unchanged',conflict.status===409);
 const empty=await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'f4',submissionId:sid(),answer:''}});
 check('SCORE-00 empty answer is 400 "empty", not wrong',empty.status===400&&empty.data.code==='empty');
 // error -> hint -> correct on f3: one task in the denominator, support history kept
 await call('/api/v2/child/events',{cookie:S.s1,body:{events:[{eventId:uuid(),type:'hint_requested',payload:{level:1},attemptId:att1id,taskId:'f3'}]}});
 await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'f3',submissionId:sid(),answer:'mark:0,2'}});
 for(const [id,a] of [['f4','mark:0,1,2'],['f5','mark:0'],['c1','mark:0']])await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:id,submissionId:sid(),answer:a}});
 const sidA=sid(),sidB=sid();
 const finA=call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'c2',submissionId:sidA,answer:'mark:1'}}),finB=call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'c2',submissionId:sidB,answer:'mark:2,3'}});
 const [fa,fb]=await Promise.all([finA,finB]);
 const r1=(await call('/api/v2/report?child=demo-student-01',{cookie:T.a})).data;const t3=r1.summary.tasks.find(t=>t.taskId==='f3');
 check('SCORE-04 two parallel finishes -> completed once',r1.summary.state==='completed'&&[fa,fb].every(x=>x.status===200||x.status===409));
 check('SCORE-05 error -> hint -> correct: one task, support kept, marked as solved with help',t3.status==='correct'&&t3.firstTry==='incorrect'&&t3.assisted===true&&r1.summary.totals.required===7);
 const doneEvents=(await call('/api/v2/export?child=demo-student-01',{cookie:T.a})).data.events.filter(e=>e.type==='lesson_completed'&&e.attempt===att1id); // only this attempt: the seed has an earlier finished lesson
 check('TEACH-03 report numbers match unique answers; one lesson_completed event',r1.summary.totals.correct===7&&doneEvents.length===1);
 const late=await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'f4',submissionId:sid(),answer:'mark:0'}});
 check('SYNC completed attempt is not changed by a late answer',late.status===409&&late.data.code==='completed');
 const stale=await call('/api/v2/child/state',{cookie:S.s3,body:{attemptId:att3,revision:0,stage:'goal'}});
 check('SYNC-02 stale revision -> 409 with the current attempt',stale.status===409&&stale.data.code==='stale'&&stale.data.attempt.stage==='practice');
 const ev=uuid();await call('/api/v2/child/events',{cookie:S.s3,body:{events:[{eventId:ev,type:'break_started',payload:{stageId:'practice'},attemptId:att3}]}});await call('/api/v2/child/events',{cookie:S.s3,body:{events:[{eventId:ev,type:'break_started',payload:{stageId:'practice'},attemptId:att3}]}});
 const e3=(await call('/api/v2/export?child=demo-student-03',{cookie:T.a})).data.events.filter(e=>e.type==='break_started');
 check('SYNC-03 the same eventId twice -> one event',e3.length===2,'(1 from seed + 1 new) got '+e3.length);
 const badEv=await call('/api/v2/child/events',{cookie:S.s3,body:{events:[{eventId:uuid(),type:'answer_evaluated',payload:{correct:true},attemptId:att3},{eventId:uuid(),type:'hint_requested',payload:{text:'<b>free text</b>',level:1},attemptId:att3}]}});
 check('EVENTS client cannot create server events; free text dropped',badEv.data.accepted.length===1);
 const hreq=uuid();const hh=[await call('/api/v2/child/help',{cookie:S.s3,body:{requestId:hreq,phraseId:'help'}}),await call('/api/v2/child/help',{cookie:S.s3,body:{requestId:hreq,phraseId:'help'}})];
 const hl=(await call('/api/v2/help',{cookie:T.a})).data.filter(h=>h.id.endsWith(hreq));
 check('COM-04 help request delivered once with status',hh.every(r=>r.data.status==='delivered')&&hl.length===1);
 const hlB=(await call('/api/v2/help',{cookie:T.b})).data;check('COM help requests visible only to the assigned teacher',!hlB.some(h=>h.id.endsWith(hreq)));

 // ---- assignment, versions, follow-up, constructor, preview ----
 const op=sid();const as1=await call('/api/v2/assign',{cookie:T.a,body:{opId:op,childIds:['demo-student-02'],lessonId:'math-fractions-02'}}),as2=await call('/api/v2/assign',{cookie:T.a,body:{opId:op,childIds:['demo-student-02'],lessonId:'math-fractions-02'}});
 check('TEACH-01 / UDL2-04 assign twice with one opId -> one assignment',as1.status===200&&as2.data.replay===true&&as1.data.assignments[0].id===as2.data.assignments[0].id);
 const q2=(await call('/api/v2/child/home',{cookie:S.s2})).data.queue;check('TEACH-01 the assignment appears for the right student',q2.some(q=>q.lessonId==='math-fractions-02'));
 const tv1=await call('/api/v2/templates',{cookie:T.a,body:{opId:sid(),fields:{title:{ru:'Доля',kk:'Үлес'},context:'rect',denominator:4,numerator:1,partition:'equal',modes:['mark','build','card'],prompt:{ru:'Отметь одну четверть прямоугольника',kk:'Тіктөртбұрыштың бір ширегін белгіле'},hints:[{ru:'Части равные.',kk:'Бөліктер тең.'}]}}});
 const bad1=await call('/api/v2/templates',{cookie:T.a,body:{opId:sid(),fields:{context:'rect',denominator:4,numerator:1,partition:'unequal',parts:[1,1,1],modes:['mark'],prompt:{ru:'a',kk:'b'},hints:[{ru:'h',kk:'h'}]}}});
 check('UDL2-05 constructor validates geometry (unreachable target rejected)',tv1.status===200&&bad1.status===400&&bad1.data.errors.includes('unreachable'));
 const before=(await call('/api/v2/export?child=demo-student-01',{cookie:T.a})).data.submissions.length;
 const pv=await call('/api/v2/preview',{cookie:T.a,body:{taskVersionId:tv1.data.taskVersion.id,answer:'mark:2'}});
 const afterPv=(await call('/api/v2/export?child=demo-student-01',{cookie:T.a})).data.submissions.length;
 check('UDL2-05 preview uses the same evaluator and does not touch student records',pv.data.preview===true&&pv.data.evaluation==='correct'&&before===afterPv);
 const asT1=await call('/api/v2/assign',{cookie:T.a,body:{opId:sid(),childIds:['demo-student-03'],taskVersionId:tv1.data.taskVersion.id}});
 const q3=(await call('/api/v2/child/home',{cookie:S.s3})).data.queue;const tAssign=q3.find(q=>q.assignmentId===asT1.data.assignments[0].id);
 const tAtt=(await call('/api/v2/child/attempt',{cookie:S.s3,body:{attemptId:sid(),assignmentId:tAssign.assignmentId}})).data.id;
 const tv2=await call('/api/v2/templates',{cookie:T.a,body:{opId:sid(),templateId:tv1.data.taskVersion.templateId,fields:{context:'pizza',denominator:4,numerator:3,partition:'equal',modes:['mark'],prompt:{ru:'Выбери три четверти',kk:'Төрттен үшті таңда'},hints:[{ru:'Три части.',kk:'Үш бөлік.'}]}}});
 await call('/api/v2/assign',{cookie:T.a,body:{opId:sid(),childIds:['demo-student-03'],taskVersionId:tv2.data.taskVersion.id}});
 const oldSub=await call('/api/v2/child/submit',{cookie:S.s3,body:{attemptId:tAtt,taskId:'t1',submissionId:sid(),answer:'mark:0'}});
 check('UDL2-06 / PATH-04 a started attempt keeps its version and criteria after v2 is published',tv2.data.taskVersion.version===2&&oldSub.data.evaluation==='correct');
 const fd=await call('/api/v2/followup-draft?child=demo-student-02&attempt=demo-attempt-student-02&fromTask=c2&unequal=1',{cookie:T.a});
 const fsave=await call('/api/v2/templates',{cookie:T.a,body:{opId:sid(),followup:true,sourceAttempt:'demo-attempt-student-02',fields:fd.data.fields}});const fop=sid();
 const f1=await call('/api/v2/assign',{cookie:T.a,body:{opId:fop,childIds:['demo-student-02'],taskVersionId:fsave.data.taskVersion.id,kind:'followup',sourceAttempt:'demo-attempt-student-02',evidence:['sub:x'],reason:'demo'}});
 const f2=await call('/api/v2/assign',{cookie:T.a,body:{opId:fop,childIds:['demo-student-02'],taskVersionId:fsave.data.taskVersion.id,kind:'followup',sourceAttempt:'demo-attempt-student-02',evidence:['sub:x'],reason:'demo'}});
 const fForeign=await call('/api/v2/assign',{cookie:T.b,body:{opId:sid(),childIds:['demo-student-02'],taskVersionId:fsave.data.taskVersion.id,kind:'followup',sourceAttempt:'demo-attempt-student-02'}});
 check('UDL2-04 report -> follow-up: one assignment with evidence, other teacher refused',f1.status===200&&f2.data.replay&&f1.data.assignments[0].evidence?.reason==='demo'&&fForeign.status===404);

 // ---- pilot ----
 const p0=(await call('/api/v2/pilot',{cookie:T.adB})).data;
 const lockedB=await call('/api/v2/assign',{cookie:T.b,body:{opId:sid(),childIds:['demo-student-b1'],lessonId:'bio-plants-01'}}),ctorB=await call('/api/v2/templates',{cookie:T.b,body:{opId:sid(),fields:{}}});
 const freeB=await call('/api/v2/assign',{cookie:T.b,body:{opId:sid(),childIds:['demo-student-b1'],lessonId:'math-fractions-01'}});
 check('PILOT-05 free plan: base lesson works, pilot features refused by the server',p0.entitlement.plan==='free'&&lockedB.status===402&&ctorB.status===402&&freeB.status===200);
 const k1=sid();const fail1=await call('/api/v2/pilot/order',{cookie:T.adB,body:{idempotencyKey:k1,planId:'school_pilot',simulate:'fail'}}),fail2=await call('/api/v2/pilot/order',{cookie:T.adB,body:{idempotencyKey:k1,planId:'school_pilot',simulate:'success'}});
 check('PILOT-02 failed order does not activate; retry with the same key returns the same order',fail1.data.order.status==='failed'&&fail2.data.replay&&fail2.data.order.id===fail1.data.order.id&&fail2.data.entitlement.plan==='free');
 const k2=sid();const ok1=await call('/api/v2/pilot/order',{cookie:T.adB,body:{idempotencyKey:k2,planId:'school_pilot',simulate:'success',organizationId:'demo-org-a',plan:'paid'}}),ok2=await call('/api/v2/pilot/order',{cookie:T.adB,body:{idempotencyKey:k2,planId:'school_pilot',simulate:'success'}});
 const orders=(await call('/api/v2/pilot',{cookie:T.adB})).data.orders.filter(o=>o.status==='succeeded');
 check('PILOT-01 success + repeat -> one order, one active entitlement, test mode',ok1.data.order.status==='succeeded'&&ok2.data.replay&&orders.length===1&&ok1.data.entitlement.plan==='school_pilot'&&ok1.data.entitlement.mode==='local_mock');
 const meA=(await call('/api/v2/me',{cookie:T.a})).data;check('PILOT-03 organizationId in the body does not touch another org',meA.plan.plan==='school_pilot'&&ok1.data.entitlement.plan==='school_pilot');
 const tOrder=await call('/api/v2/pilot/order',{cookie:T.b,body:{idempotencyKey:sid(),planId:'school_pilot'}}),cOrder=await call('/api/v2/pilot/order',{cookie:S.b1,body:{idempotencyKey:sid(),planId:'school_pilot'}});
 const planParam=await call('/api/v2/assign?plan=paid',{cookie:T.b,body:{opId:sid(),childIds:['demo-student-b1'],lessonId:'cs-algorithms-01',plan:'paid'}});
 check('PILOT-03 teacher and child cannot buy; plan=paid in URL/body is ignored',tOrder.status===403&&cOrder.status===401&&planParam.status===200,'(org B is on the pilot now, so this lesson is allowed by the server entitlement)');
 const stop=await call('/api/v2/pilot/stop',{cookie:T.adB,body:{reason:'expire'}});
 const lockedAgain=await call('/api/v2/assign',{cookie:T.b,body:{opId:sid(),childIds:['demo-student-b1'],lessonId:'cs-conditions-02'}});
 const histB=(await call('/api/v2/child/home',{cookie:S.b1})).data.queue.length;
 check('PILOT-04 ending the pilot keeps history and closes pilot features',stop.data.entitlement.status==='expired'&&lockedAgain.status===402&&histB>=2);

 // ---- settings, video, catalog, providers ----
 const pr0=(await call('/api/v2/child/home',{cookie:S.s3})).data.profile;
 const m1=await call('/api/support?role=child',{cookie:S.s3,body:{captions:false,settingsVersion:pr0.settingsVersion}}),m2=await call('/api/support?role=child',{cookie:S.s3,body:{textSize:'large',settingsVersion:pr0.settingsVersion}});
 check('SENS-02 / SYNC-02 two tabs change different settings: both kept (per-field merge)',m2.data.captions===false&&m2.data.textSize==='large'&&m2.data.merged===true);
 const childPhr=await call('/api/support?role=child',{cookie:S.s3,body:{phrases:['help']}});check('SENS child cannot change adult-only fields (phrase list)',!('phrases' in (childPhr.data.changedKeys||[]))&&childPhr.data.phrases.length===7);
 const vv=await call('/api/video/progress',{cookie:S.s3,body:{videoId:'M01',version:'0.2.0',lang:'ru',seconds:30,duration:54,completed:true}});
 const vv2=await call('/api/video/progress',{cookie:S.s3,body:{videoId:'M01',version:'0.2.0',lang:'ru',seconds:12,duration:54}});
 const home3=(await call('/api/v2/child/home',{cookie:S.s3})).data;
 check('VIDEO-03 position is the last reported second, seconds watched only grow; VIDEO-04 watching does not complete a lesson',vv.data.completed&&vv2.data.position===12&&vv2.data.seconds===30&&!home3.queue.some(q=>q.lessonId==='math-fractions-01'&&q.state==='completed'));
 const qz=await call('/api/v2/child/quiz',{cookie:S.s3,body:{videoId:'M01',version:'0.2.0',taskId:'q2',submissionId:sid(),answer:'card:a'}});
 check('VIDEO mini-test graded on the server (unequal card is wrong)',qz.data.evaluation==='incorrect'&&qz.data.reason==='unequalCard');
 const cat=(await call('/api/v2/catalog',{cookie:T.a})).data.lessons;
 check('LESSON-01 / LESSON-03 six lessons, each pending teacher review',cat.length===6&&new Set(cat.map(l=>l.lessonId)).size===6&&cat.every(l=>l.curriculumVerification==='pending_teacher_review'));
 const ai=await call('/api/assistant',{cookie:T.a,body:{prompt:'Объясни дроби'}}),media=await call('/api/v2/media/job',{cookie:T.a,body:{approvedScriptId:'M01',scriptVersion:'0.1.0',locale:'ru',provider:'elevenLabs'}});
 const mErr=await call('/api/v2/media/job',{cookie:T.a,body:{approvedScriptId:'M01',scriptVersion:'0.1.0',simulate:'timeout'}});
 const ext=fs.existsSync(EXT)?fs.readFileSync(EXT,'utf8').trim():'';
 check('LOCAL-02 fake keys present: AI and ElevenLabs stay disabled, no outgoing request',ai.status===503&&media.data.providerMode==='disabled'&&media.data.localArtifactPath==='/media/M01/0.2.0/lesson.mp4'&&mErr.status===504&&!ext,ext||'no external requests');
 const exp=(await call('/api/v2/export?child=demo-student-02',{cookie:T.a})).data;check('DEMO-01 export is marked demo / local',exp.demo===true&&exp.environment==='local_demo');
 const del=await call('/api/v2/student/delete',{cookie:T.a,body:{child:'demo-student-03',confirm:'wrong'}});check('DATA delete needs the exact label',del.status===400);

 // ================= regressions found by the Codex review (docs/CODEX_REVIEW_V2.md) =================
 // 2. a malformed body is a 400, the process stays alive
 const badJson=await call('/api/v2/child/help',{cookie:S.s3,raw:'{bad'}),badJson2=await call('/api/v2/notes',{cookie:T.a,raw:'[1,2]'}),aliveAfter=await call('/api/demo/accounts');
 check('REV-02 malformed JSON -> 400 and the server keeps running',badJson.status===400&&badJson2.status===400&&aliveAfter.status===200,[badJson.status,badJson2.status,aliveAfter.status].join(','));
 // 4. crash between "answer saved" and "lesson completed": a replay of the same submission heals it
 const dbf=new DatabaseSync(DB);
 dbf.prepare("UPDATE ayan_attempts SET state='in_progress',completed=NULL WHERE id=?").run(att1id);dbf.prepare("DELETE FROM ayan_learning_events WHERE id=?").run('done:'+att1id);dbf.prepare("DELETE FROM ayan_learning_events WHERE id LIKE ?").run('eval:%:'+att1id+':c2:'+sidA);
 const heal=await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'c2',submissionId:sidA,answer:'mark:1'}});
 const healRep=(await call('/api/v2/report?child=demo-student-01',{cookie:T.a})).data.summary,healEv=dbf.prepare("SELECT COUNT(*) AS n FROM ayan_learning_events WHERE attempt=? AND type IN ('lesson_completed')").get(att1id).n,evalEv=dbf.prepare("SELECT COUNT(*) AS n FROM ayan_learning_events WHERE id LIKE ?").get('eval:%:'+att1id+':c2:'+sidA).n;
 check('REV-04 replay of a saved answer completes the lesson and restores the missing events (once)',heal.status===200&&heal.data.replay===true&&healRep.state==='completed'&&healEv===1&&evalEv===1,JSON.stringify({s:healRep.state,done:healEv,evalEv}));
 // 5. two tabs start the same assignment at once: one attempt
 const asRace=await call('/api/v2/assign',{cookie:T.a,body:{opId:sid(),childIds:['demo-student-02'],lessonId:'bio-cell-02'}});const raceAssign=asRace.data.assignments[0].id;
 const starts=await Promise.all(Array.from({length:6},()=>call('/api/v2/child/attempt',{cookie:S.s2,body:{attemptId:sid(),assignmentId:raceAssign}})));
 const nAtt=dbf.prepare("SELECT COUNT(*) AS n FROM ayan_attempts WHERE assignment=?").get(raceAssign).n;
 check('REV-05 six parallel starts of one assignment -> one attempt, same id for everyone',nAtt===1&&new Set(starts.map(x=>x.data.id)).size===1&&starts.every(x=>x.status===200),'attempts in db: '+nAtt);
 // 9. two tabs change different settings at the same moment: all changes survive
 const keys=[{captions:false},{textSize:'large'},{motionIntensity:'low'},{saturation:'calm'},{hints:'offer'},{voiceRate:1.25}];
 const before9=(await call('/api/v2/child/home',{cookie:S.s2})).data.profile.settingsVersion;
 await Promise.all(keys.map(k=>call('/api/support?role=child',{cookie:S.s2,body:{...k,settingsVersion:before9}})));
 const p9=(await call('/api/v2/child/home',{cookie:S.s2})).data.profile;
 check('REV-09 six parallel settings writes -> every change is kept, version grew by six',p9.captions===false&&p9.textSize==='large'&&p9.motionIntensity==='low'&&p9.saturation==='calm'&&p9.hints==='offer'&&p9.voiceRate===1.25&&p9.settingsVersion===before9+6,JSON.stringify({v:p9.settingsVersion,b:before9}));
 // sound is its own switch
 const pr2=(await call('/api/v2/child/home',{cookie:S.s1})).data.profile;
 const loud=await call('/api/support?role=child',{cookie:S.s1,body:{sfx:false,music:false,mascotVoice:false,sound:false}}),back=await call('/api/support?role=child',{cookie:S.s1,body:{sfx:true}});
 check('REV-12 "sound" stays on by default, goes off only when set (too loud), and is not changed by effect or voice settings',pr2.sound===true&&loud.data.sound===false&&back.data.sound===false);
 // legacy grading must not touch V2 attempts
 const legacy=await call('/api/attempt/submit',{cookie:S.s1,body:{attemptId:att1id,taskId:'final',submissionId:sid(),answer:'5'}});
 const nLegacy=dbf.prepare("SELECT COUNT(*) AS n FROM ayan_submissions WHERE attempt=? AND task='final'").get(att1id).n;
 check('REV-L legacy /api/attempt/submit refuses a V2 attempt (409) and stores nothing',legacy.status===409&&legacy.data.code==='wrong_contract'&&nLegacy===0);
 // free follow-up is tied to its report; a constructor template cannot be assigned as a free follow-up
 const noSrc=await call('/api/v2/templates',{cookie:T.a,body:{opId:sid(),followup:true,fields:fd.data.fields}}),foreignSrc=await call('/api/v2/templates',{cookie:T.b,body:{opId:sid(),followup:true,sourceAttempt:'demo-attempt-student-02',fields:fd.data.fields}});
 const sneaky=await call('/api/v2/assign',{cookie:T.a,body:{opId:sid(),childIds:['demo-student-02'],taskVersionId:tv1.data.taskVersion.id,kind:'followup',sourceAttempt:'demo-attempt-student-02'}});
 const wrongKid=await call('/api/v2/assign',{cookie:T.a,body:{opId:sid(),childIds:['demo-student-03'],taskVersionId:fsave.data.taskVersion.id,kind:'followup',sourceAttempt:'demo-attempt-student-02'}});
 check('REV-F follow-up needs its own report: no source -> 404, other teacher -> 404, constructor template as follow-up -> 403, other student -> 403',noSrc.status===404&&foreignSrc.status===404&&sneaky.status===403&&wrongKid.status===403,[noSrc.status,foreignSrc.status,sneaky.status,wrongKid.status].join(','));
 // an old tab cannot write as a different child
 const actor1=await call('/api/v2/child/help',{cookie:S.s1,headers:{'x-ayan-actor':'child.demo-student-03'},body:{requestId:uuid(),phraseId:'help'}});
 const actor2=await call('/api/support?role=child',{cookie:S.s1,headers:{'x-ayan-actor':'child.demo-student-03'},body:{captions:true}});
 const same=await call('/api/v2/child/home',{cookie:S.s1,headers:{'x-ayan-actor':'child.demo-student-01'}});
 check('REV-A a request that claims another child is refused with 409 actor_changed; the right child works',actor1.status===409&&actor1.data.code==='actor_changed'&&actor2.status===409&&same.status===200);
 // 4b. pilot: order succeeded but entitlement missing -> the retry completes it; a later cancel is not undone by a retry
 const kk=sid();const o1=await call('/api/v2/pilot/order',{cookie:T.adA,body:{idempotencyKey:kk,planId:'school_pilot'}});
 dbf.prepare("DELETE FROM ayan_entitlements WHERE org='demo-org-a'").run();
 const o2=await call('/api/v2/pilot/order',{cookie:T.adA,body:{idempotencyKey:kk,planId:'school_pilot'}});
 await call('/api/v2/pilot/stop',{cookie:T.adA,body:{reason:'cancel'}});const o3=await call('/api/v2/pilot/order',{cookie:T.adA,body:{idempotencyKey:kk,planId:'school_pilot'}});
 check('REV-04b replay of a succeeded order restores a missing entitlement; after a cancel the replay does not reactivate it',o2.data.entitlement.status==='active'&&o3.data.entitlement.status==='cancelled',[o1.data.entitlement.status,o2.data.entitlement.status,o3.data.entitlement.status].join(','));
 dbf.close();
}catch(e){console.error(e);results.push(['crash',false]);}
finally{srv.kill();}
const failed=results.filter(r=>!r[1]);console.log(JSON.stringify({checks:results.length,failed:failed.length}));if(failed.length){console.log(out.slice(-1500));process.exit(1);}
