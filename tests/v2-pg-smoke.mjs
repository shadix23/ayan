// V2.1 on a real Postgres: the SQL of learning.mjs / support.mjs / db-util.mjs, including the concurrency cases
// (parallel starts of one assignment, parallel settings writes, idempotent submit, pilot order replay).
// Usage: start a LOCAL Postgres and `DATABASE_URL=... BETTER_AUTH_SECRET=... node server.mjs`, then
//        AYAN_TEST_URL=http://127.0.0.1:4340 node tests/v2-pg-smoke.mjs
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4340';
const results=[];const check=(id,ok,detail)=>{results.push(!!ok);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const jar=r=>r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
async function call(path,{cookie,body,method}={}){const r=await fetch(B+path,{method:method||(body?'POST':'GET'),headers:{'content-type':'application/json',origin:B,...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json();}catch{}return {status:r.status,data,r};}
const sid=()=>Math.random().toString(36).slice(2,14)+Math.random().toString(36).slice(2,14);
const mk=async(n)=>{const su=await fetch(B+'/api/account/register',{method:'POST',headers:{'content-type':'application/json',origin:B},body:JSON.stringify({email:`pg${n}${Date.now()}@t.test`,password:'pg-smoke-pass-1',name:'PG '+n,role:'teacher',consent:{terms:true,privacy:true}})});return jar(su);};
const T=await mk('a'),T2=await mk('b');
const kid=(await call('/api/children',{cookie:T,body:{label:'Ученик PG',consent:{confirmed:true,basis:'guardian_consent'}}})).data;
const code=(await call('/api/invite',{cookie:T,body:{child:kid.id}})).data.code;
const enter=await fetch(B+'/api/child/enter',{method:'POST',headers:{'content-type':'application/json',origin:B},body:JSON.stringify({code})});const S=jar(enter);
const me=await call('/api/v2/me',{cookie:T});check('PG-01 adult gets an organisation, role owner and the free plan',me.status===200&&me.data.teaches&&me.data.manages&&me.data.plan.plan==='free',JSON.stringify([me.status,me.data?.role,me.data?.plan?.plan]));
const op=sid();const as=await call('/api/v2/assign',{cookie:T,body:{opId:op,childIds:[kid.id],lessonId:'math-fractions-01'}}),as2=await call('/api/v2/assign',{cookie:T,body:{opId:op,childIds:[kid.id],lessonId:'math-fractions-01'}});
check('PG-02 assign is idempotent by opId',as.status===200&&as2.data.replay===true&&as.data.assignments[0].id===as2.data.assignments[0].id,String(as.status));
const aid=as.data.assignments[0].id;
const starts=await Promise.all(Array.from({length:8},()=>call('/api/v2/child/attempt',{cookie:S,body:{attemptId:sid(),assignmentId:aid}})));
check('PG-03 eight parallel starts of one assignment -> one attempt (partial unique index on Postgres)',starts.every(x=>x.status===200)&&new Set(starts.map(x=>x.data?.id)).size===1,JSON.stringify(starts.map(x=>x.status)));
const att=starts[0].data.id;
const dup=sid();const subs=await Promise.all(Array.from({length:5},()=>call('/api/v2/child/submit',{cookie:S,body:{attemptId:att,taskId:'f1',submissionId:dup,answer:'mark:1'}})));
check('PG-04 five parallel submits of one submissionId -> one stored answer, same reply',subs.every(x=>x.status===200&&x.data.evaluation==='correct'));
const st=await call('/api/v2/child/state',{cookie:S,body:{attemptId:att,revision:0,stage:'practice',ui:{taskIndex:1}}}),stale=await call('/api/v2/child/state',{cookie:S,body:{attemptId:att,revision:0,stage:'goal',ui:{}}});
check('PG-05 state save with revision; a stale revision gets 409 with the current attempt',st.status===200&&stale.status===409&&stale.data.attempt.stage==='practice');
await Promise.all(['f2','f3','f4','f5','c1','c2'].map((t,i)=>call('/api/v2/child/submit',{cookie:S,body:{attemptId:att,taskId:t,submissionId:sid(),answer:{f2:'mark:0',f3:'mark:0,1',f4:'mark:0,1,2',f5:'mark:0',c1:'mark:0',c2:'mark:1'}[t]}})));
const rep=await call('/api/v2/report?child='+kid.id,{cookie:T});
check('PG-06 parallel answers to all required tasks: lesson completed exactly once, report numbers right',rep.status===200&&rep.data.summary.state==='completed'&&rep.data.summary.totals.correct===7);
const ex=await call('/api/v2/export?child='+kid.id,{cookie:T});check('PG-07 export has exactly one lesson_completed event',ex.data.events.filter(e=>e.type==='lesson_completed').length===1);
const v0=(await call('/api/v2/child/home',{cookie:S})).data.profile.settingsVersion;
await Promise.all([{captions:false},{textSize:'large'},{motionIntensity:'low'},{saturation:'calm'},{hints:'offer'},{voiceRate:1.25}].map(k=>call('/api/support?role=child',{cookie:S,body:{...k,settingsVersion:v0}})));
const pr=(await call('/api/v2/child/home',{cookie:S})).data.profile;
check('PG-08 six parallel settings writes on Postgres: all kept, version +6',pr.captions===false&&pr.textSize==='large'&&pr.motionIntensity==='low'&&pr.saturation==='calm'&&pr.hints==='offer'&&pr.voiceRate===1.25&&pr.settingsVersion===v0+6,JSON.stringify({v0,v:pr.settingsVersion}));
const h=await call('/api/v2/child/help',{cookie:S,body:{requestId:crypto.randomUUID(),phraseId:'help',attemptId:att,stage:'practice'}});
const ev=await call('/api/v2/child/events',{cookie:S,body:{events:[{eventId:crypto.randomUUID(),type:'hint_requested',payload:{level:1},attemptId:att,taskId:'f2'}]}});
check('PG-09 help request and a client event are stored',h.status===200&&ev.data.accepted.length===1);
const note=await call('/api/v2/notes',{cookie:T,body:{child:kid.id,text:'проверка заметки'}});check('PG-10 teacher note stored; another teacher gets 404 for the same student',note.status===200&&(await call('/api/v2/report?child='+kid.id,{cookie:T2})).status===404);
const key=sid();const o1=await call('/api/v2/pilot/order',{cookie:T,body:{idempotencyKey:key,planId:'school_pilot'}}),o2=await call('/api/v2/pilot/order',{cookie:T,body:{idempotencyKey:key,planId:'school_pilot'}});
check('PG-11 pilot order twice -> one order, entitlement active, test mode',o1.data.order.status==='succeeded'&&o2.data.replay&&o2.data.entitlement.plan==='school_pilot'&&o2.data.entitlement.mode==='local_mock');
const tv=await call('/api/v2/templates',{cookie:T,body:{opId:sid(),fields:{context:'rect',denominator:4,numerator:1,partition:'equal',modes:['mark','build','card'],prompt:{ru:'Отметь одну четверть',kk:'Бір ширекті белгіле'},hints:[{ru:'Части равные',kk:'Бөліктер тең'}]}}});
check('PG-12 constructor template saved (unique(owner, op_id)) and versioned',tv.status===200&&tv.data.taskVersion.version===1);
const bad=await call('/api/v2/child/help',{cookie:S,method:'POST'});const bad2=await fetch(B+'/api/v2/child/help',{method:'POST',headers:{'content-type':'application/json',origin:B,cookie:S},body:'{bad'});
check('PG-13 malformed JSON -> 400, server alive',bad2.status===400&&(await call('/api/v2/child/home',{cookie:S})).status===200,String(bad2.status));void bad;
const del=await call('/api/v2/student/delete',{cookie:T,body:{child:kid.id,confirm:'Ученик PG'}});check('PG-14 delete student and all data on Postgres',del.status===200&&(await call('/api/v2/report?child='+kid.id,{cookie:T})).status===404);
console.log(JSON.stringify({checks:results.length,failed:results.filter(x=>!x).length}));process.exit(results.every(Boolean)?0:1);
