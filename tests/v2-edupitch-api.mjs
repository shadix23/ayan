// EduPitch MVP: API acceptance for the "Огоньки" layer and the live class pulse, on a LOCAL server with a separate synthetic
// database (.data/test-edu.sqlite). Starts its own server with fake paid-provider keys and records any non-local request.
// Usage: node tests/v2-edupitch-api.mjs   Prints PASS/FAIL per check and exits 1 on any failure.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
// The test server needs a port nobody else uses: with a busy port the checks would silently talk to another server (and
// the direct database edits below would hit a file that server does not read). Env override, otherwise a free port.
import net from 'node:net';
const freePort=()=>new Promise(r=>{const sv=net.createServer();sv.listen(0,'127.0.0.1',()=>{const p=sv.address().port;sv.close(()=>r(p));});});
const PORT=Number(process.env.AYAN_EDU_API_PORT)||await freePort(),B=`http://127.0.0.1:${PORT}`,EXT=`.data/test-edu-external-${PORT}.log`,DB=`.data/test-edu-${PORT}.sqlite`;
fs.mkdirSync('.data',{recursive:true});for(const f of [EXT,DB])try{fs.rmSync(f);}catch{}
const srv=spawn(process.execPath,['--require','./tests/helpers/no-external.cjs','server.mjs'],{env:{...process.env,PORT:String(PORT),AYAN_DEMO:'1',AYAN_DB_FILE:DB,AYAN_EXTERNAL_LOG:EXT,
 GROQ_API_KEY:'fake-test-key',AI_GATEWAY_API_KEY:'fake-test-key',BETTER_AUTH_SECRET:'test-secret-for-local-edu-api-0123456789abcdef',DATABASE_URL:''},stdio:['ignore','pipe','pipe']});
let out='';srv.stdout.on('data',d=>out+=d);srv.stderr.on('data',d=>out+=d);
for(let i=0;i<60&&!out.includes('Ayan http');i++)await new Promise(r=>setTimeout(r,250));
if(!out.includes('Ayan http://127.0.0.1:'+PORT)){console.error('FAIL test server did not start on port '+PORT+':\n'+out.slice(0,400));srv.kill();process.exit(1);}
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const jar=r=>r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
async function call(path,{cookie,body,method}={}){const r=await fetch(B+path,{method:method||(body?'POST':'GET'),headers:{'content-type':'application/json',origin:B,...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json();}catch{}return {status:r.status,data};}
async function login(as){const r=await fetch(B+'/api/demo/login',{method:'POST',headers:{'content-type':'application/json',origin:B},body:JSON.stringify({as})});return jar(r);}
const sid=()=>crypto.randomBytes(12).toString('hex'),uuid=()=>crypto.randomUUID();
const pulseOf=async(cookie,id)=>((await call('/api/v2/pulse',{cookie})).data?.students||[]).find(s=>s.id===id);
try{
 await call('/api/demo/reset',{body:{}});
 const T={a:await login('teacher-a'),b:await login('teacher-b')};
 const S={s1:await login('student-01'),s2:await login('student-02'),s3:await login('student-03')};

 // ---- seed for the golden path ----
 const h1=(await call('/api/v2/child/home',{cookie:S.s1})).data;
 const kinds=(h1.path||[]).map(s=>s.kind).join(',');
 check('SEED-01 student 01: path done -> now -> next, current lesson is "Равные доли" (math-fractions-01), not started',kinds==='done,now,next'&&h1.current?.lessonId==='math-fractions-01'&&h1.current.state==='not_started',kinds+' '+h1.current?.lessonId);
 check('SEED-02 student 01 has earlier days with light, today is still dark (lights up live on the first answer)',Array.isArray(h1.lights?.days)&&h1.lights.days.length===7&&h1.lights.days.slice(0,6).some(Boolean)&&h1.lights.days[6]===false,JSON.stringify(h1.lights));
 check('SEED-03 embers count = correct tasks so far (completed earlier lesson)',Number.isInteger(h1.lights?.embers)&&h1.lights.embers>0,String(h1.lights?.embers));
 check('SEED-04 lessons left until the big lantern is full',h1.lights?.lessonsLeft===2,String(h1.lights?.lessonsLeft));

 // ---- live pulse: baseline ----
 const p0=await call('/api/v2/pulse',{cookie:T.a});
 check('PULSE-01 teacher gets a pulse row for each own student, sorted with "needs help" first',p0.status===200&&p0.data.students.length===3&&p0.data.students[0].status==='help'&&p0.data.students[0].id==='demo-student-03',p0.data?.students?.map(s=>s.id+':'+s.status).join(' '));
 const s1p=p0.data.students.find(s=>s.id==='demo-student-01'),s2p=p0.data.students.find(s=>s.id==='demo-student-02');
 check('PULSE-02 student 01 waits for the lesson, student 02 finished',s1p?.status==='waiting'&&s2p?.status==='done',s1p?.status+','+s2p?.status);
 const anon=await call('/api/v2/pulse'),child=await call('/api/v2/pulse',{cookie:S.s1}),other=(await call('/api/v2/pulse',{cookie:T.b})).data;
 check('PULSE-03 no session -> 401, a child cannot read it, teacher B sees only own students',anon.status===401&&child.status===401&&other.students.every(s=>s.id==='demo-student-b1'),[anon.status,child.status,other.students.length].join(','));

 // ---- student 01 starts, works, asks for a break ----
 const a1=h1.current.assignmentId,att=sid();
 await call('/api/v2/child/attempt',{cookie:S.s1,body:{attemptId:att,assignmentId:a1,locale:'kk'}});
 await call('/api/v2/child/state',{cookie:S.s1,body:{attemptId:att,revision:0,stage:'practice',ui:{taskIndex:0}}});
 const w=await pulseOf(T.a,'demo-student-01');
 check('PULSE-04 working: stage index and task number are shown',w?.status==='working'&&w.stageIndex===4&&w.task?.n===1&&w.task?.m===5,JSON.stringify(w));
 await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att,taskId:'f1',submissionId:sid(),answer:'mark:0,1'}});
 await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att,taskId:'f1',submissionId:sid(),answer:'mark:0,1'}});
 const st=await pulseOf(T.a,'demo-student-01');
 check('PULSE-05 two tries without success on the current task are flagged for the teacher',st?.struggling===true,JSON.stringify(st));
 const ok=await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att,taskId:'f1',submissionId:sid(),answer:'mark:0'}});
 const h1b=(await call('/api/v2/child/home',{cookie:S.s1})).data;
 check('LIGHT-01 the first correct answer today lights today\'s lantern and adds an ember',ok.data?.evaluation==='correct'&&h1b.lights.days[6]===true&&h1b.lights.embers===h1.lights.embers+1,JSON.stringify(h1b.lights));
 await call('/api/v2/child/events',{cookie:S.s1,body:{events:[{eventId:uuid(),type:'break_started',payload:{stageId:'practice'},attemptId:att}]}});
 await call('/api/v2/child/state',{cookie:S.s1,body:{attemptId:att,revision:1,stage:'practice',ui:{taskIndex:1},paused:true}});
 const br=await pulseOf(T.a,'demo-student-01');
 check('PULSE-06 break: the teacher sees "на перерыве" with the step, no reload needed (next poll)',br?.status==='break'&&br.stageIndex===4&&br.since>0,JSON.stringify(br));
 await call('/api/v2/child/events',{cookie:S.s1,body:{events:[{eventId:uuid(),type:'break_ended',payload:{stageId:'practice'},attemptId:att}]}});
 await call('/api/v2/child/state',{cookie:S.s1,body:{attemptId:att,revision:2,stage:'practice',ui:{taskIndex:1},paused:false}});
 check('PULSE-07 back from the break -> working again',(await pulseOf(T.a,'demo-student-01'))?.status==='working');

 // ---- help request and "Видел, иду" ----
 await call('/api/v2/child/help',{cookie:S.s1,body:{requestId:uuid(),phraseId:'help',attemptId:att,stage:'practice'}});
 const hp=await pulseOf(T.a,'demo-student-01');
 check('PULSE-08 help request: status help with the request id',hp?.status==='help'&&!!hp.helpId,JSON.stringify(hp));
 const seen=await call('/api/v2/help/seen',{cookie:T.a,body:{id:hp.helpId}});
 check('PULSE-09 "Видел, иду" clears the help status',seen.status===200&&(await pulseOf(T.a,'demo-student-01'))?.status==='working');

 // ---- fixes round 1: "Видел, иду" stays visible, finished lesson leaves "help", break from home, Student 03 seed ----
 const ack=await pulseOf(T.a,'demo-student-01');
 check('FIX-06 after "Видел, иду" the card keeps a visible "teacher is coming" mark with the time',ack?.status==='working'&&ack.comingAt>0,JSON.stringify({s:ack?.status,c:ack?.comingAt}));
 const s3=await pulseOf(T.a,'demo-student-03');
 const seen3=await call('/api/v2/help/seen',{cookie:T.a,body:{id:s3.helpId}});const s3b=await pulseOf(T.a,'demo-student-03');
 check('FIX-02 seed: Student 03 asks for help without an open break; after "Видел, иду" the card is not "on a break"',s3.status==='help'&&seen3.status===200&&s3b.status==='working',s3.status+' -> '+s3b?.status);
 await call('/api/v2/child/help',{cookie:S.s1,body:{requestId:uuid(),phraseId:'help',attemptId:att,stage:'practice'}});
 let last=null;for(const [task,ans] of [['f2','mark:0'],['f3','mark:0,2'],['f4','mark:0,1,2'],['f5','mark:0'],['c1','mark:1'],['c2','mark:1']])last=await call('/api/v2/child/submit',{cookie:S.s1,body:{attemptId:att,taskId:task,submissionId:sid(),answer:ans}});
 const fin=(await call('/api/v2/pulse',{cookie:T.a})).data;const f1=fin.students.find(s=>s.id==='demo-student-01');
 check('FIX-03 a child who finished the lesson goes to "done" (not "help", not "not started"), counted in "Закончили"',last?.data?.attempt?.state==='completed'&&f1?.status==='done'&&!!f1.score&&fin.counts.done===2,JSON.stringify({st:last?.data?.attempt?.state,s:f1?.status,done:fin.counts.done}));
 await call('/api/v2/child/events',{cookie:S.s1,body:{events:[{eventId:uuid(),type:'break_started',payload:{stageId:'none'}}]}});
 const hb=await pulseOf(T.a,'demo-student-01');
 await call('/api/v2/child/events',{cookie:S.s1,body:{events:[{eventId:uuid(),type:'break_ended',payload:{stageId:'none'}}]}});
 const he=await pulseOf(T.a,'demo-student-01');
 check('FIX-03b a break started from the home screen (no lesson open) reaches the teacher; "ready" ends it',hb?.status==='break'&&he?.status==='done',hb?.status+' -> '+he?.status);

 // ---- "Назначить следующий пример": ready examples, assigned once, the recommendation knows it ----
 const r2=(await call('/api/v2/report?child=demo-student-02',{cookie:T.a})).data;const rec2=r2.recommendations.find(x=>x.kind==='followup');
 const fd=(await call(`/api/v2/followup-draft?child=demo-student-02&attempt=${encodeURIComponent(r2.summary.attemptId)}&fromTask=${encodeURIComponent(rec2.draft.fromTask)}${rec2.draft.unequal?'&unequal=1':''}`,{cookie:T.a})).data;
 check('FIX-05 the next-example draft offers at least two ready examples, each valid on both languages',Array.isArray(fd?.options)&&fd.options.length>=2&&fd.options.every(o=>o.id&&o.fields?.prompt?.ru&&o.fields?.prompt?.kk&&o.label?.ru&&o.label?.kk),JSON.stringify(fd?.options?.map(o=>o.id)));
 check('FIX-05b before assigning, the recommendation is not marked as assigned',!rec2.assignedAt);
 const sv=await call('/api/v2/templates',{cookie:T.a,body:{opId:sid(),followup:true,sourceAttempt:r2.summary.attemptId,fields:fd.options[1].fields}});
 const asg=await call('/api/v2/assign',{cookie:T.a,body:{opId:sid(),childIds:['demo-student-02'],taskVersionId:sv.data.taskVersion.id,kind:'followup',sourceAttempt:r2.summary.attemptId,evidence:rec2.evidence,reason:'x'}});
 const r2b=(await call('/api/v2/report?child=demo-student-02',{cookie:T.a})).data;const rec2b=r2b.recommendations.find(x=>x.id===rec2.id);
 check('FIX-05c after assigning, the same recommendation says it is assigned (the teacher home does not offer it again)',sv.status===200&&asg.status===200&&rec2b?.assignedAt>0,JSON.stringify({sv:sv.status,as:asg.status,at:rec2b?.assignedAt}));

 // ---- parent report on V2 data ----
 const pr=await call('/api/parent/report',{body:{code:'demo-parent-link-student-01'}});
 check('PARENT-01 the parent report reads V2 lessons and days with light',pr.status===200&&Array.isArray(pr.data.v2?.lessons)&&pr.data.v2.lessons.length>=2&&pr.data.v2.lights?.days?.length===7,JSON.stringify(pr.data.v2?.lessons?.map(l=>l.state)));
 check('PARENT-02 no teacher notes or recommendations in the parent report',!JSON.stringify(pr.data).includes('демо-запись')&&!('recommendations' in (pr.data.v2||{})));
 const tips=(pr.data.v2?.lessons||[]).flatMap(l=>l.repeat||[]);const prompts=JSON.stringify(tips);
 check('FIX-04 "можно повторить дома" is advice for the parent on both languages, never the task wording',tips.length>=1&&tips.every(x=>x.ru&&x.kk)&&!/НЕ равные|тең ЕМЕС|Отметь|белгіле/.test(prompts),prompts.slice(0,160));

 // ---- AI lesson draft: no paid provider -> prepared template, no network ----
 const d1=await call('/api/v2/ai/draft',{cookie:T.a,body:{topic:'Доли и дроби',lang:'kk'}});
 check('AI-01 draft without a paid provider comes from a prepared template, marked as such, 5 steps on kk and ru',d1.status===200&&d1.data.source==='template'&&d1.data.draft.steps.length===5&&d1.data.draft.steps.every(s=>s.text.kk&&s.text.ru),JSON.stringify(d1.data?.source));
 const d2=await call('/api/v2/ai/draft',{cookie:T.a,body:{topic:'Квантовая физика',lang:'ru'}});
 check('AI-02 unknown topic without a provider: honest "no template" answer listing what exists',d2.status===200&&d2.data.source==='none'&&d2.data.available.length>=3);
 const d3=await call('/api/v2/ai/draft',{cookie:S.s1,body:{topic:'Доли'}});
 check('AI-03 a child cannot ask for drafts',d3.status===401||d3.status===403,String(d3.status));
 // ---- F2 "Скоро заканчиваем": teacher -> child notice ----
 const SB1=await login('student-b1');
 const nb=await call('/api/v2/child/notice',{cookie:S.s2});
 check('F2-01 no notice yet -> {notice:null}; no child session -> 401',nb.status===200&&nb.data.notice===null&&(await call('/api/v2/child/notice')).status===401,JSON.stringify(nb.data));
 const bad=await call('/api/v2/notice',{cookie:T.a,body:{minutes:3}}),foreign=await call('/api/v2/notice',{cookie:T.a,body:{minutes:2,children:['demo-student-b1']}}),kidPost=await call('/api/v2/notice',{cookie:S.s1,body:{minutes:2}});
 check('F2-02 minutes outside {0,2,5} -> 400; another teacher\'s student -> 404; a child cannot send -> 401',bad.status===400&&foreign.status===404&&kidPost.status===401,[bad.status,foreign.status,kidPost.status].join(','));
 const sent=await call('/api/v2/notice',{cookie:T.a,body:{minutes:2}});
 check('F2-03 teacher warns the whole class: 200 {sent:3, until = now + 2 min}',sent.status===200&&sent.data.sent===3&&Math.abs(sent.data.until-Date.now()-120000)<5000,JSON.stringify(sent.data));
 const got=await call('/api/v2/child/notice',{cookie:S.s2}),gotB=await call('/api/v2/child/notice',{cookie:SB1});
 check('F2-04 own student gets {notice:{id,minutes:2,until,created}}; student of org B gets nothing',got.data.notice?.minutes===2&&!!got.data.notice.id&&got.data.notice.until===sent.data.until&&gotB.data.notice===null,JSON.stringify([got.data,gotB.data]));
 const nst=await call('/api/v2/notice',{cookie:T.a});
 check('F2-05 teacher can read the active notice back (survives reload): {active:{minutes,until,sent}}',nst.status===200&&nst.data.active?.minutes===2&&nst.data.active.sent===3,JSON.stringify(nst.data));
 const one=await call('/api/v2/notice',{cookie:T.a,body:{minutes:5,children:['demo-student-03']}});const g3=await call('/api/v2/child/notice',{cookie:S.s3});
 check('F2-06 one student only: {sent:1}, that child sees the newest notice (5 min)',one.data.sent===1&&g3.data.notice?.minutes===5,JSON.stringify([one.data,g3.data.notice?.minutes]));
 const cancel=await call('/api/v2/notice',{cookie:T.a,body:{minutes:0}});const after=await call('/api/v2/child/notice',{cookie:S.s2}),stc=await call('/api/v2/notice',{cookie:T.a});
 check('F2-07 minutes 0 cancels: {sent:N, until:null}, children get null, teacher sees no active notice',cancel.status===200&&cancel.data.until===null&&after.data.notice===null&&stc.data.active===null,JSON.stringify([cancel.data,after.data,stc.data]));
 // ---- Codex review fixes ----
 const t0=Date.now();const huge=await call('/api/v2/preview',{cookie:T.a,body:{fields:{denominator:1e9,numerator:1,context:'circle',partition:'equal'},answer:'mark:0'}});
 const hugeParts=await call('/api/v2/preview',{cookie:T.a,body:{fields:{denominator:4,numerator:1,context:'circle',partition:'unequal',parts:Array(5000).fill(1)},answer:'mark:0'}});
 check('CX-01 garbage denominator / parts -> fast 400, no giant array',huge.status===400&&hugeParts.status===400&&Date.now()-t0<3000,[huge.status,hugeParts.status,Date.now()-t0].join(','));
 const h3=(await call('/api/v2/child/home',{cookie:S.s3})).data;const cur3=(await call('/api/v2/child/lesson?assignment='+encodeURIComponent(h3.current?.assignmentId||''),{cookie:S.s3})).data?.attempt;
 const rv=Number(cur3?.revision)||0;const ui={taskIndex:1};
 const ok1=await call('/api/v2/child/state',{cookie:S.s3,body:{attemptId:cur3?.id,revision:rv,stage:'practice',ui}});
 const staleSame=await call('/api/v2/child/state',{cookie:S.s3,body:{attemptId:cur3?.id,revision:rv,stage:'practice',ui}});
 check('CX-02 stale revision with the same UI -> 409 stale (no false "saved")',ok1.status===200&&staleSame.status===409&&staleSame.data.code==='stale',[ok1.status,staleSame.status,staleSame.data?.code].join(','));
 const big=await call('/api/v2/child/state',{cookie:S.s3,body:{attemptId:cur3?.id,revision:rv+1,stage:'practice',ui:{draft:'x'.repeat(30000)}}});
 const kept=(await call('/api/v2/child/lesson?assignment='+encodeURIComponent(h3.current?.assignmentId||''),{cookie:S.s3})).data?.attempt;
 check('CX-03 a too large UI -> 413, the saved UI is not cut in half',big.status===413&&JSON.stringify(kept?.ui||{}).includes('taskIndex'),big.status+' '+JSON.stringify(kept?.ui).slice(0,60));
 // student 02: unseen help from the finished lesson must not come back when the next lesson starts
 await call('/api/v2/help/seen',{cookie:T.a,body:{id:(await pulseOf(T.a,'demo-student-02'))?.helpId||'none'}}).catch(()=>{});
 const r02=(await call('/api/v2/report?child=demo-student-02',{cookie:T.a})).data;
 const DBm=await import('node:sqlite');const db=new DBm.DatabaseSync(DB);
 db.prepare("INSERT INTO ayan_help_requests (id,child,phrase,attempt,stage,status,created) VALUES (?,?,?,?,?,?,?)").run('h:old-02','demo-student-02','help',r02.summary.attemptId,'check','delivered',Date.now()-3600000);
 const home02=(await call('/api/v2/child/home',{cookie:S.s2})).data;
 if(home02.current?.assignmentId)await call('/api/v2/child/attempt',{cookie:S.s2,body:{attemptId:sid(),assignmentId:home02.current.assignmentId,locale:'ru'}});
 const p02=await pulseOf(T.a,'demo-student-02');
 check('CX-04 an old unseen help request of a finished lesson does not return when the next lesson starts',!!home02.current?.assignmentId&&p02?.status!=='help',JSON.stringify({cur:home02.current?.assignmentId,s:p02?.status}));
 // a break started 3 hours ago inside an open attempt is no longer "on a break"
 const att02=(await call('/api/v2/report?child=demo-student-02',{cookie:T.a})).data.summary.attemptId;
 await call('/api/v2/child/events',{cookie:S.s2,body:{events:[{eventId:uuid(),type:'break_started',payload:{stageId:'goal'},attemptId:att02}]}});
 const fresh02=await pulseOf(T.a,'demo-student-02');
 db.prepare("UPDATE ayan_learning_events SET received=? WHERE child=? AND type='break_started'").run(Date.now()-3*3600000,'demo-student-02');
 const old02=await pulseOf(T.a,'demo-student-02');db.close();
 check('CX-05 a break is "on a break" only for 2 hours (also inside an open lesson)',fresh02?.status==='break'&&old02?.status!=='break',fresh02?.status+' -> '+old02?.status);
 const prd=await call('/api/parent/report',{body:{code:'demo-parent-link-student-01'}});
 check('CX-07 the parent report says the data is synthetic demo data',prd.data?.demo===true,String(prd.data?.demo));
 // ---- tariffs: plan-locked features point to the "Макс" / "Школа" tariffs ----
 const grp=await call('/api/v2/assign',{cookie:T.b,body:{opId:sid(),childIds:['demo-student-b1','demo-student-b1x'],lessonId:'math-fractions-01'}});
 const lockedLesson=await call('/api/v2/assign',{cookie:T.b,body:{opId:sid(),childIds:['demo-student-b1'],lessonId:'bio-plants-01'}});
 check('PLAN-01 402 texts name the tariffs "Макс или Школа", not the old "школьный пилот"',[grp,lockedLesson].every(r=>r.status!==402||(/Макс или Школа/.test(r.data.error)&&!/пилот/.test(r.data.error)))&&lockedLesson.status===402,JSON.stringify([grp.status,grp.data?.error,lockedLesson.status,lockedLesson.data?.error]));
 const ext=fs.existsSync(EXT)?fs.readFileSync(EXT,'utf8').trim():'';
 check('LOCAL no request outside localhost',!ext,ext.slice(0,120));
}catch(e){console.error(e);results.push(['crash',false]);}
srv.kill();
const failed=results.filter(r=>!r[1]);console.log(JSON.stringify({checks:results.length,failed:failed.length}));process.exit(failed.length?1:0);
