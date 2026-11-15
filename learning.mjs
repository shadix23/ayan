// V2.1 learning backend (docs/briefs/edtech-v2-claude/requirements/DATA_AND_SECURITY.md).
// Same tiny query(sql, params) helper on SQLite and Postgres. Rules that hold everywhere here:
//  - who is asking comes only from the verified session; ids in URL or body are re-checked against ownership;
//  - a foreign object answers 404 (no difference between "missing" and "not yours");
//  - grading happens only here, with dist/v2/lesson-core.js; a client "correct" flag is ignored;
//  - every write that a double click or a retry can repeat is keyed (opId, submissionId, eventId, idempotencyKey);
//  - plans and features are read from the organisation's entitlement on the server, never from the client.
import crypto from 'node:crypto';
import Core from './dist/v2/lesson-core.js';
import Catalog from './dist/v2/lessons.js';
import {addColumn} from './db-util.mjs';
import Lights from './dist/v2/lights.js';

const ID=/^[A-Za-z0-9_-]{8,64}$/, TASK=/^[a-z0-9-]{1,48}$/, TOKEN=/^[a-z0-9_.-]{1,40}$/i;
const now=()=>Date.now();
const UI_MAX=20000;
const uid=()=>crypto.randomUUID();
const J=s=>{try{return JSON.parse(s);}catch{return null;}};
// Paid plans of billing.mjs register here. They are kept out of PLANS so the free pilot order endpoint cannot grant them.
export const PAID_PLANS={};
export const PLANS={
 free:{id:'free',features:[],label:{ru:'Демо',kk:'Демо'}},
 school_pilot:{id:'school_pilot',features:['all_lessons','groups','constructor','history'],label:{ru:'Школьный пилот',kk:'Мектеп пилоты'},trialDays:14}
};
// Accessibility is never a paid feature: captions, calm mode, communication board and keyboard work on every plan.
export const ALWAYS=['captions','calm_mode','communication','keyboard','report_example','followup'];
const STAGES=['goal','explanation','example','practice','check'];
const CLIENT_EVENTS=new Set(['then_chosen','lesson_started','stage_changed','explanation_mode_changed','answer_mode_changed','view_changed','hint_requested','hint_applied','communication_requested','break_started','break_ended','technical_error','lesson_paused','lesson_resumed','preferences_changed','tutorial_done','video_played','video_paused','video_fragment_repeated']);
const PHRASES=['not_understood','repeat','example','help','break','too_loud','ready'];

export async function migrate(query){
 const t=s=>query(s);
 await t('CREATE TABLE IF NOT EXISTS ayan_orgs (id TEXT PRIMARY KEY, name TEXT NOT NULL, demo INTEGER NOT NULL, created BIGINT NOT NULL)');
 await t('CREATE TABLE IF NOT EXISTS ayan_members (user_id TEXT PRIMARY KEY, org TEXT NOT NULL, role TEXT NOT NULL, created BIGINT NOT NULL)');
 await t('CREATE TABLE IF NOT EXISTS ayan_entitlements (org TEXT PRIMARY KEY, plan TEXT NOT NULL, status TEXT NOT NULL, started BIGINT, expires BIGINT, order_id TEXT, updated BIGINT NOT NULL)');
 await t('CREATE TABLE IF NOT EXISTS ayan_pilot_orders (id TEXT PRIMARY KEY, org TEXT NOT NULL, created_by TEXT NOT NULL, plan TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL, idem_key TEXT NOT NULL, created BIGINT NOT NULL, updated BIGINT NOT NULL, UNIQUE(org,idem_key))');
 await t('CREATE TABLE IF NOT EXISTS ayan_assignments (id TEXT PRIMARY KEY, child TEXT NOT NULL, owner TEXT NOT NULL, lesson_version TEXT NOT NULL, op_id TEXT NOT NULL, kind TEXT NOT NULL, source_attempt TEXT, evidence TEXT, created BIGINT NOT NULL, UNIQUE(owner,op_id,child))');
 await t('CREATE TABLE IF NOT EXISTS ayan_learning_events (id TEXT PRIMARY KEY, child TEXT NOT NULL, attempt TEXT, lesson_version TEXT, task TEXT, type TEXT NOT NULL, payload TEXT NOT NULL, seq INTEGER, occurred BIGINT, received BIGINT NOT NULL, source TEXT NOT NULL)');
 await t('CREATE TABLE IF NOT EXISTS ayan_notices (id TEXT PRIMARY KEY, owner TEXT NOT NULL, child TEXT NOT NULL, minutes INTEGER NOT NULL, created BIGINT NOT NULL, until BIGINT NOT NULL)');
 await t('CREATE TABLE IF NOT EXISTS ayan_help_requests (id TEXT PRIMARY KEY, child TEXT NOT NULL, phrase TEXT NOT NULL, attempt TEXT, stage TEXT, status TEXT NOT NULL, created BIGINT NOT NULL, seen BIGINT)');
 await t('CREATE TABLE IF NOT EXISTS ayan_notes (id TEXT PRIMARY KEY, child TEXT NOT NULL, author TEXT NOT NULL, text TEXT NOT NULL, created BIGINT NOT NULL)');
 await t('CREATE TABLE IF NOT EXISTS ayan_task_versions (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, owner TEXT NOT NULL, version INTEGER NOT NULL, content TEXT NOT NULL, created BIGINT NOT NULL, op_id TEXT, UNIQUE(owner,op_id))');
 await t('CREATE TABLE IF NOT EXISTS ayan_preview_submissions (id TEXT PRIMARY KEY, owner TEXT NOT NULL, task_version TEXT, answer TEXT NOT NULL, evaluation TEXT NOT NULL, created BIGINT NOT NULL)');
 await t('CREATE TABLE IF NOT EXISTS ayan_quiz_answers (id TEXT PRIMARY KEY, child TEXT NOT NULL, video TEXT NOT NULL, version TEXT NOT NULL, task TEXT NOT NULL, answer TEXT NOT NULL, evaluation TEXT NOT NULL, created BIGINT NOT NULL)');
 const add=(table,col,type)=>addColumn(query,table,col,type);
 await add('ayan_attempts','assignment','TEXT');await add('ayan_attempts','stage','TEXT');await add('ayan_attempts','revision','INTEGER');await add('ayan_attempts','ui','TEXT');
 await add('ayan_submissions','meta','TEXT');await add('ayan_children','demo','INTEGER');
 // One attempt per assignment, enforced by the database: two tabs that start at the same moment cannot create two attempts.
 await query('CREATE UNIQUE INDEX IF NOT EXISTS ayan_attempts_one_per_assignment ON ayan_attempts (child, assignment) WHERE assignment IS NOT NULL');
}

// ---------- organisations, roles, plans ----------
export async function member(query,user){
 let m=(await query('SELECT m.org,m.role,o.name,o.demo FROM ayan_members m JOIN ayan_orgs o ON o.id=m.org WHERE m.user_id=?',[user.id]))[0];
 if(!m){// First visit of an adult: a personal space where this adult is both teacher and the one who manages the plan.
  const org=uid();await query('INSERT INTO ayan_orgs (id,name,demo,created) VALUES (?,?,?,?)',[org,'Личное пространство',0,now()]);
  await query('INSERT INTO ayan_members (user_id,org,role,created) VALUES (?,?,?,?) ON CONFLICT(user_id) DO NOTHING',[user.id,org,'owner',now()]);
  m=(await query('SELECT m.org,m.role,o.name,o.demo FROM ayan_members m JOIN ayan_orgs o ON o.id=m.org WHERE m.user_id=?',[user.id]))[0];}
 return {org:m.org,role:m.role,orgName:m.name,demo:Number(m.demo)===1,teaches:m.role==='teacher'||m.role==='owner',manages:m.role==='admin'||m.role==='owner'};
}
export async function entitlement(query,org){
 let e=(await query('SELECT * FROM ayan_entitlements WHERE org=?',[org]))[0];
 if(e&&e.status==='active'&&e.expires&&Number(e.expires)<now()){await query('UPDATE ayan_entitlements SET status=?,updated=? WHERE org=? AND status=?',['expired',now(),org,'active']);e={...e,status:'expired'};}
 const active=e&&e.status==='active'?(PLANS[e.plan]||PAID_PLANS[e.plan]):null;const plan=active||PLANS.free;
 return {plan:plan.id,label:plan.label,status:e?e.status:'none',features:[...ALWAYS,...plan.features],started:e?.started?Number(e.started):null,expires:e?.expires?Number(e.expires):null,mode:'local_mock'};
}
const has=(ent,f)=>ent.features.includes(f);
async function ownChild(query,teacherId,childId){if(!ID.test(String(childId||'')))return null;return (await query('SELECT id,label,demo,owner FROM ayan_children WHERE id=? AND owner=?',[String(childId),teacherId]))[0]||null;}

// ---------- lesson versions for V2 ----------
// A V2 lesson version is the full content snapshot (tasks with answer keys). It never changes; attempts pin it.
async function createLessonVersion(query,{child,owner,content}){
 const max=(await query('SELECT MAX(version) AS v FROM ayan_lesson_versions WHERE child=?',[child]))[0];
 const id=uid(),version=(Number(max?.v)||0)+1,snap={...content,v2:true,id,version,approvedAt:now()};
 await query('INSERT INTO ayan_lesson_versions (id,child,owner,version,content,created) VALUES (?,?,?,?,?,?)',[id,child,owner,version,JSON.stringify(snap),snap.approvedAt]);
 return snap;
}
async function versionContent(query,id){const r=(await query('SELECT content FROM ayan_lesson_versions WHERE id=?',[id]))[0];return r?J(r.content):null;}
// What a child may see: no answer keys. Order items are shuffled deterministically, match sides stay as authored.
function forChild(lesson){
 const strip=t=>{const o={...t};delete o.correct;delete o.pairs;if(o.kind==='order'&&o.correct!==undefined)delete o.correct;
  if(t.kind==='order'){const items=[...t.items];const h=[...t.id].reduce((a,c)=>a*33+c.charCodeAt(0)>>>0,5);items.sort((a,b)=>((a.id.charCodeAt(0)*h)%97)-((b.id.charCodeAt(0)*h)%97));if(items.map(i=>i.id).join()===t.correct.join())items.reverse();o.items=items;o.first=t.correct[0];}
  return o;};
 return {...lesson,tasks:lesson.tasks.map(strip)};
}
// A template task (constructor) becomes a one-task lesson that still has the five predictable stages.
function lessonFromTask(task,{title}={}){
 const [n,d]=task.target;const words=l=>Core.fractionWords(n,d,l);
 return {lessonId:'custom-'+task.templateId,subject:'math',gradeProposal:3,custom:true,templateVersion:task.taskVersionId||null,curriculumVerification:'pending_teacher_review',curriculumSource:null,reviewStatus:task.reviewStatus||'draft',
  topic:title||{ru:'Доля целого',kk:'Бүтіннің үлесі'},objectiveDraft:task.objective||{ru:'Выделять долю целого как выбранные равные части.',kk:'Бүтіннің үлесін таңдалған тең бөліктер ретінде көрсету.'},
  successCriteria:{ru:'Задание и новый пример решены.',kk:'Тапсырма мен жаңа мысал шешілді.'},materials:{ru:[],kk:[]},media:{video:null,audio:{ru:null,kk:null}},
  stages:{goal:{ru:`Сегодня выделим ${words('ru')} целого.`,kk:`Бүгін бүтіннің ${words('kk')} үлесін көрсетеміз.`},
   explanation:{text:{ru:`Целое делят на ${d} равные части. ${n} из них - это ${words('ru')}.`,kk:`Бүтінді ${d} тең бөлікке бөледі. Олардың ${n} бөлігі - ${words('kk')}.`},figure:{type:'fraction',shape:task.shape,context:task.context,parts:Array(d).fill(1),selected:[...Array(n).keys()]},facts:{ru:[`${n} из ${d} равных частей.`],kk:[`${d} тең бөліктің ${n} бөлігі.`]}},
   example:{text:{ru:'Разберём пример на другой фигуре.',kk:'Басқа пішіндегі мысалды талдайық.'},figure:{type:'fraction',shape:task.shape==='circle'?'rect':'circle',parts:Array(d).fill(1),selected:[...Array(n).keys()]},label:`${n} / ${d}`},
   check:{ru:'Новый пример.',kk:'Жаңа мысал.'},completion:{ru:'Задание завершено.',kk:'Тапсырма аяқталды.'}},
  tasks:[task],required:[task.id],practice:[task.id],checkTasks:[]};
}

// ---------- assignment (teacher) ----------
export async function assign(query,{user,mem,ent,input}){
 const opId=String(input.opId||'');if(!ID.test(opId))return [400,{code:'bad_request',error:'opId'}];
 if(!mem.teaches)return [403,{code:'forbidden',error:'Назначать может только учитель'}];
 const ids=[...new Set((Array.isArray(input.childIds)?input.childIds:[input.child]).map(String))].filter(Boolean);
 if(!ids.length||ids.length>40)return [400,{code:'bad_request',error:'Выберите ученика'}];
 if(ids.length>1&&!has(ent,'groups'))return [402,{code:'plan',feature:'groups',error:'Групповые назначения доступны в тарифе Макс или Школа'}];
 const kids=[];for(const id of ids){const c=await ownChild(query,user.id,id);if(!c)return [404,{code:'not_found',error:'Ученик не найден'}];kids.push(c);}
 // Idempotency: the same opId for the same child returns the existing assignment (double click, retry after timeout).
 const existing=[];for(const c of kids){const row=(await query('SELECT * FROM ayan_assignments WHERE owner=? AND op_id=? AND child=?',[user.id,opId,c.id]))[0];if(row)existing.push(row);}
 if(existing.length===kids.length)return [200,{assignments:existing.map(viewAssignment),replay:true}];
 let content,kind='lesson';
 if(input.lessonId){const l=Catalog.byId(String(input.lessonId));if(!l)return [404,{code:'not_found',error:'Урок не найден'}];
  if(l.lessonId!=='math-fractions-01'&&!has(ent,'all_lessons'))return [402,{code:'plan',feature:'all_lessons',error:'Этот урок доступен в тарифе Макс или Школа'}];
  content=JSON.parse(JSON.stringify(l));}
 else if(input.taskVersionId){const tv=(await query('SELECT * FROM ayan_task_versions WHERE id=? AND owner=?',[String(input.taskVersionId),user.id]))[0];if(!tv)return [404,{code:'not_found',error:'Задание не найдено'}];
  kind=input.kind==='followup'?'followup':'template';
  if(kind==='template'&&!has(ent,'constructor'))return [402,{code:'plan',feature:'constructor',error:'Конструктор доступен в тарифе Макс или Школа'}];
  const task=J(tv.content);content=lessonFromTask({...task,taskVersionId:tv.id},{title:task.title});}
 else return [400,{code:'bad_request',error:'Выберите урок'}];
 let source=null,evidence=null;
 if(kind==='followup'){source=String(input.sourceAttempt||'');const a=(await query('SELECT a.id,a.child FROM ayan_attempts a JOIN ayan_children c ON c.id=a.child WHERE a.id=? AND c.owner=?',[source,user.id]))[0];if(!a)return [404,{code:'not_found',error:'Источник отчёта не найден'}];
  // A free follow-up belongs to exactly one report: the task must have been drafted from this attempt, for this student.
  const tvc=J((await query('SELECT content FROM ayan_task_versions WHERE id=? AND owner=?',[String(input.taskVersionId||''),user.id]))[0]?.content);
  if(!tvc||tvc.followup!==true||tvc.sourceAttempt!==a.id||kids.some(c=>c.id!==a.child))return [403,{code:'forbidden',error:'Следующий пример можно назначить только ученику из этого отчёта'}];
  evidence=JSON.stringify({eventIds:(Array.isArray(input.evidence)?input.evidence:[]).map(String).filter(x=>x.length<=120).slice(0,20),reason:String(input.reason||'').slice(0,300),confirmedBy:user.id,confirmedAt:now()});}
 const out=[];
 for(const c of kids){
  const prior=(await query('SELECT * FROM ayan_assignments WHERE owner=? AND op_id=? AND child=?',[user.id,opId,c.id]))[0];if(prior){out.push(viewAssignment(prior));continue;}
  const snap=await createLessonVersion(query,{child:c.id,owner:user.id,content});
  const id=uid();await query('INSERT INTO ayan_assignments (id,child,owner,lesson_version,op_id,kind,source_attempt,evidence,created) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(owner,op_id,child) DO NOTHING',[id,c.id,user.id,snap.id,opId,kind,source,evidence,now()]);
  out.push(viewAssignment((await query('SELECT * FROM ayan_assignments WHERE owner=? AND op_id=? AND child=?',[user.id,opId,c.id]))[0]));}
 return [200,{assignments:out,replay:false}];
}
const viewAssignment=a=>({id:a.id,child:a.child,lessonVersion:a.lesson_version,kind:a.kind,sourceAttempt:a.source_attempt||null,evidence:J(a.evidence),createdAt:Number(a.created)});

// ---------- child: queue, lesson, attempt ----------
async function attemptRow(query,child,id){return (await query('SELECT * FROM ayan_attempts WHERE id=? AND child=?',[id,child]))[0]||null;}
async function attemptView(query,child,id){
 const a=await attemptRow(query,child,id);if(!a)return null;
 const subs=await query('SELECT task,submission,answer,evaluation,saved,meta FROM ayan_submissions WHERE attempt=? AND child=? ORDER BY saved',[id,child]);
 return {id:a.id,assignment:a.assignment||null,lessonVersion:a.lesson_version,locale:a.locale,state:a.state,stage:a.stage||'goal',revision:Number(a.revision)||0,ui:J(a.ui)||{},startedAt:Number(a.started),completedAt:a.completed?Number(a.completed):null,
  submissions:subs.map(s=>{const m=J(s.meta)||{};return {taskId:s.task,submissionId:s.submission,answer:s.answer,evaluation:s.evaluation,savedAt:Number(s.saved),mode:m.mode||null,hintLevel:m.hintLevel||0,reason:m.reason||null,shown:m.shown||null};})};
}
export async function childHome(query,child){
 const rows=await query('SELECT a.*,v.content FROM ayan_assignments a JOIN ayan_lesson_versions v ON v.id=a.lesson_version WHERE a.child=? ORDER BY a.created',[child.id]);
 const queue=[];
 for(const r of rows){const l=J(r.content);const at=(await query('SELECT id,state,stage FROM ayan_attempts WHERE child=? AND assignment=? ORDER BY started DESC LIMIT 1',[child.id,r.id]))[0];
  queue.push({assignmentId:r.id,kind:r.kind,lessonId:l.lessonId,lessonVersion:r.lesson_version,version:l.version,topic:l.topic,subject:l.subject,custom:!!l.custom,reviewStatus:l.reviewStatus,curriculumVerification:l.curriculumVerification,
   attemptId:at?.id||null,state:at?.state||'not_started',stage:at?.stage||null,createdAt:Number(r.created)});}
 // Continue: the oldest assignment that is not completed. A started attempt keeps its own (older) version.
 const current=queue.find(q=>q.state!=='completed')||null;
 // "Огоньки": one ember per task solved right in a lesson; the path shows each lesson's embers out of its required tasks.
 for(const q of queue){const l=J(rows.find(r=>r.id===q.assignmentId).content)||{};q.required=(l.required||[]).length;
  q.embers=q.attemptId?(await query('SELECT DISTINCT task FROM ayan_submissions WHERE attempt=? AND child=? AND evaluation=?',[q.attemptId,child.id,'correct'])).filter(r=>(l.required||[]).includes(r.task)).length:0;}
 const path=Lights.pathStops(queue).map(s=>({assignmentId:s.assignmentId,lessonId:s.lessonId,topic:s.topic,subject:s.subject,kind:s.stop,followup:s.kind==='followup',state:s.state,stage:s.stage,embers:s.embers,required:s.required}));
 // The child's latest help request: once the teacher pressed "Видел, иду" (seen), the lesson shows "Учитель идёт" (fixes-round1 п.11).
 const lh=(await query('SELECT created,seen FROM ayan_help_requests WHERE child=? AND phrase=? ORDER BY created DESC LIMIT 1',[child.id,'help']))[0]||null;
 const help=lh?{createdAt:Number(lh.created),seenAt:lh.seen!=null?Number(lh.seen):null,now:now()}:null;
 return {child:{id:child.id,label:child.label,demo:Number(child.demo)===1},queue,current,path,lights:await lightsOf(query,child.id,queue),help};
}
// Time zone of the pilot schools (Kazakhstan, UTC+5). "Дни со светом" are counted in local days.
const TZ=Number(process.env.AYAN_TZ_OFFSET_MIN??300);
const LIT_TYPES=new Set(['answer_evaluated','transfer_task_evaluated','lesson_completed','stage_changed']);
async function lightsOf(query,childId,queue){
 const since=now()-8*Lights.DAY;
 const ev=await query('SELECT type,payload,received FROM ayan_learning_events WHERE child=? AND received>?',[childId,since]);
 const times=ev.filter(e=>LIT_TYPES.has(e.type)&&(!/evaluated$/.test(e.type)||J(e.payload)?.correct===true)&&(J(e.payload)?.role!=='video_quiz')).map(e=>Number(e.received));
 const embers=(await query('SELECT DISTINCT attempt,task FROM ayan_submissions WHERE child=? AND evaluation=?',[childId,'correct'])).length;
 const days=Lights.lightDays(times,now(),TZ);
 return {days,today:days[6],litDays:days.filter(Boolean).length,embers,lessonsLeft:Lights.lessonsLeft(queue||[]),lessonsTotal:(queue||[]).length,tzOffsetMin:TZ};
}
export async function childLesson(query,child,assignmentId){
 const a=(await query('SELECT * FROM ayan_assignments WHERE id=? AND child=?',[String(assignmentId||''),child.id]))[0];if(!a)return [404,{code:'not_found'}];
 const l=await versionContent(query,a.lesson_version);if(!l)return [404,{code:'not_found'}];
 const at=(await query('SELECT id FROM ayan_attempts WHERE child=? AND assignment=? ORDER BY started DESC LIMIT 1',[child.id,a.id]))[0];
 return [200,{assignmentId:a.id,lesson:forChild(l),attempt:at?await attemptView(query,child.id,at.id):null}];
}
export async function startAttempt(query,child,input){
 const id=String(input.attemptId||''),assignment=String(input.assignmentId||'');if(!ID.test(id))return [400,{code:'bad_request',error:'attemptId'}];
 const a=(await query('SELECT * FROM ayan_assignments WHERE id=? AND child=?',[assignment,child.id]))[0];if(!a)return [404,{code:'not_found'}];
 const open=(await query('SELECT id FROM ayan_attempts WHERE child=? AND assignment=? ORDER BY started DESC LIMIT 1',[child.id,a.id]))[0];
 if(open)return [200,await attemptView(query,child.id,open.id)]; // one attempt per assignment: reload or a second tab continues it
 await query('INSERT INTO ayan_attempts (id,child,lesson_version,locale,state,started,assignment,stage,revision,ui) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',[id,child.id,a.lesson_version,input.locale==='kk'?'kk':'ru','in_progress',now(),a.id,'goal',0,'{}']);
 // Whoever won the race (this request or a parallel one) owns the attempt; every caller gets that same attempt.
 const mine=(await query('SELECT id FROM ayan_attempts WHERE child=? AND assignment=? ORDER BY started,id LIMIT 1',[child.id,a.id]))[0];
 const v=mine?await attemptView(query,child.id,mine.id):null;if(!v)return [404,{code:'not_found'}];
 await logEvent(query,{id:'start:'+mine.id,child:child.id,attempt:mine.id,lessonVersion:a.lesson_version,type:'lesson_started',payload:{stageId:'goal'},source:'system'});
 return [200,v];
}
// Stage, view and draft answers. Revision protects against an old tab or a late offline write.
export async function saveState(query,child,input){
 const a=await attemptRow(query,child.id,String(input.attemptId||''));if(!a)return [404,{code:'not_found'}];
 const rev=Number(input.revision);if(!Number.isInteger(rev))return [400,{code:'bad_request'}];
 const stage=STAGES.includes(input.stage)?input.stage:(a.stage||'goal');
 let ui=a.ui;if(input.ui&&typeof input.ui==='object'){ui=JSON.stringify(input.ui);if(ui.length>UI_MAX)return [413,{code:'too_large',error:'Состояние урока слишком большое'}];}
 if(a.state==='completed')return [409,{code:'completed',attempt:await attemptView(query,child.id,a.id)}];
 const state=input.paused===true?'paused':input.paused===false?'in_progress':a.state;
 // Compare-and-set: success is decided by the row the UPDATE itself changed, never by re-reading (a stale write with the same UI
 // would otherwise look saved). Events are logged only after a successful change.
 const changed=await query('UPDATE ayan_attempts SET stage=?,ui=?,state=?,revision=? WHERE id=? AND child=? AND (revision=? OR (revision IS NULL AND ?=0)) AND state<>? RETURNING id',[stage,ui,state,rev+1,a.id,child.id,rev,rev,'completed']);
 if(!changed.length)return [409,{code:'stale',attempt:await attemptView(query,child.id,a.id)}];
 if(stage!==(a.stage||'goal'))await logEvent(query,{id:'stage:'+a.id+':'+(rev+1),child:child.id,attempt:a.id,lessonVersion:a.lesson_version,type:'stage_changed',payload:{fromStage:a.stage||'goal',toStage:stage},source:'student'});
 return [200,await attemptView(query,child.id,a.id)];
}
export async function submit(query,child,input){
 const attemptId=String(input.attemptId||''),taskId=String(input.taskId||''),submissionId=String(input.submissionId||'');
 if(!ID.test(attemptId)||!ID.test(submissionId)||!TASK.test(taskId))return [400,{code:'bad_request'}];
 const raw=String(input.answer??'').trim().slice(0,400);if(!raw||/^[a-z]+:$/.test(raw))return [400,{code:'empty',error:'Нет ответа'}];
 const a=await attemptRow(query,child.id,attemptId);if(!a)return [404,{code:'not_found'}];
 const lesson=await versionContent(query,a.lesson_version);if(!lesson?.v2)return [409,{code:'lesson_missing'}];
 const task=Core.findTask(lesson.tasks,taskId);if(!task)return [400,{code:'bad_request',error:'task'}];
 const answer=Core.normalize(task,raw);if(answer===null)return [400,{code:'invalid',error:'Неверный формат ответа'}];
 const key=[child.id,attemptId,taskId,submissionId].join(':');
 const stored=async()=>(await query('SELECT answer,evaluation,saved,meta FROM ayan_submissions WHERE id=?',[key]))[0];
 const reply=async(row,replay)=>{const m=J(row.meta)||{};return [200,{saved:true,replay,submissionId,taskId,evaluation:row.evaluation,reason:m.reason||null,shown:m.shown||null,wrongItems:m.wrongItems||null,firstWrong:m.firstWrong??null,mode:m.mode,savedAt:Number(row.saved),attempt:await attemptView(query,child.id,attemptId)}];};
 let row=await stored();
 // Derived writes for one stored submission. Every step is keyed or conditional, so running it twice changes nothing.
 const settle=async(r0)=>{
  await logEvent(query,{id:'sub:'+key,child:child.id,attempt:attemptId,lessonVersion:a.lesson_version,task:taskId,type:'answer_submitted',payload:{submissionId,taskId},source:'system',at:Number(r0.saved)});
  const m0=J(r0.meta)||{};
  await logEvent(query,{id:'eval:'+key,child:child.id,attempt:attemptId,lessonVersion:a.lesson_version,task:taskId,type:task.role==='transfer'||task.role==='diagnostic'?'transfer_task_evaluated':'answer_evaluated',payload:{submissionId,correct:r0.evaluation==='correct',hintLevel:m0.hintLevel||0,mode:m0.mode,role:m0.role,evaluatorVersion:Core.EVALUATOR_VERSION},source:'system',at:Number(r0.saved)});
  if(r0.evaluation!=='correct')return;
  const fresh=await attemptRow(query,child.id,attemptId);
  const ok=new Set((await query('SELECT task FROM ayan_submissions WHERE attempt=? AND child=? AND evaluation=?',[attemptId,child.id,'correct'])).map(x=>x.task));
  if(fresh.state!=='completed'&&(lesson.required||[]).every(id=>ok.has(id)))
   await query('UPDATE ayan_attempts SET state=?,completed=?,stage=? WHERE id=? AND child=? AND state<>?',['completed',now(),'check',attemptId,child.id,'completed']);
  if((await attemptRow(query,child.id,attemptId)).state==='completed')
   await logEvent(query,{id:'done:'+attemptId,child:child.id,attempt:attemptId,lessonVersion:a.lesson_version,type:'lesson_completed',payload:{completedTaskCount:ok.size,projectionVersion:1},source:'system'});
 };
 // A replay also re-runs the idempotent follow-up writes, so a crash between "answer saved" and "lesson completed" heals itself on retry.
 if(row){if(row.answer!==answer)return [409,{code:'conflict',error:'Под этим ключом уже сохранён другой ответ'}];await settle(row);return reply(row,true);}
 if(a.state==='completed'&&!/-twin$/.test(taskId))return [409,{code:'completed',attempt:await attemptView(query,child.id,attemptId)}];
 const r=Core.evaluate(task,answer);if(!r.valid)return [400,{code:'invalid'}];
 // Hint level comes from the server-side events of this attempt and task (and the client's number, whichever is higher).
 const hints=await query('SELECT payload FROM ayan_learning_events WHERE child=? AND attempt=? AND task=? AND type=?',[child.id,attemptId,taskId,'hint_requested']);
 const hintLevel=Math.min(3,Math.max(Number(input.hintLevel)||0,...hints.map(h=>Number(J(h.payload)?.level)||0)));
 const meta={mode:r.mode,subskill:r.subskill,role:task.role||'core',hintLevel,reason:r.reason,shown:r.shown||null,wrongItems:r.wrongItems||null,firstWrong:r.firstWrong??null,evaluatorVersion:Core.EVALUATOR_VERSION,transferOf:task.transferOf||null,twinOf:task.twinOf||null,kind:task.kind};
 const t=now(),evaluation=r.correct?'correct':'incorrect';
 await query('INSERT INTO ayan_submissions (id,attempt,child,task,submission,answer,evaluation,answer_key_version,saved,assisted,meta) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[key,attemptId,child.id,taskId,submissionId,answer,evaluation,Number(lesson.version)||1,t,hintLevel>0?1:0,JSON.stringify(meta)]);
 row=await stored();if(row.answer!==answer)return [409,{code:'conflict'}];
 await settle(row);
 return reply(row,false);
}
async function logEvent(query,{id,child,attempt=null,lessonVersion=null,task=null,type,payload,source,seq=null,occurred=null,at=null}){
 await query('INSERT INTO ayan_learning_events (id,child,attempt,lesson_version,task,type,payload,seq,occurred,received,source) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[id,child,attempt,lessonVersion,task,type,JSON.stringify(payload||{}),seq,occurred,at||now(),source]);
}
// Client events: whitelisted types, flat payload of short tokens/numbers/booleans. Never free text.
function cleanPayload(p){const out={};if(!p||typeof p!=='object')return out;for(const [k,v] of Object.entries(p).slice(0,8)){if(!/^[a-zA-Z]{1,24}$/.test(k))continue;
 if(typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))out[k]=v;else if(typeof v==='string'&&TOKEN.test(v))out[k]=v;else if(Array.isArray(v)&&v.length<=12&&v.every(x=>typeof x==='string'&&TOKEN.test(x)))out[k]=v;}return out;}
export async function events(query,child,input){
 const list=Array.isArray(input.events)?input.events.slice(0,50):[];const accepted=[];
 for(const e of list){const id=String(e.eventId||'');if(!/^[0-9a-f-]{36}$/i.test(id)||!CLIENT_EVENTS.has(e.type))continue;
  let attempt=null,lv=null;if(e.attemptId){const a=await attemptRow(query,child.id,String(e.attemptId));if(!a)continue;attempt=a.id;lv=a.lesson_version;}
  const task=e.taskId&&TASK.test(String(e.taskId))?String(e.taskId):null;
  await logEvent(query,{id:'c:'+child.id+':'+id,child:child.id,attempt,lessonVersion:lv,task,type:e.type,payload:cleanPayload(e.payload),source:'student',seq:Number.isInteger(e.clientSeq)?e.clientSeq:null,occurred:Number(e.occurredAt)||null});
  accepted.push(id);}
 return [200,{accepted}];
}
export async function help(query,child,input){
 const id=String(input.requestId||''),phrase=String(input.phraseId||'');if(!/^[0-9a-f-]{36}$/i.test(id)||!PHRASES.includes(phrase))return [400,{code:'bad_request'}];
 let attempt=null;if(input.attemptId){const a=await attemptRow(query,child.id,String(input.attemptId));attempt=a?.id||null;}
 const stage=STAGES.includes(input.stage)?input.stage:null;
 await query('INSERT INTO ayan_help_requests (id,child,phrase,attempt,stage,status,created) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',['h:'+child.id+':'+id,child.id,phrase,attempt,stage,'delivered',now()]);
 await logEvent(query,{id:'help:'+child.id+':'+id,child:child.id,attempt,type:'communication_requested',payload:{phraseId:phrase,deliveryStatus:'delivered'},source:'student'});
 const r=(await query('SELECT status,created FROM ayan_help_requests WHERE id=?',['h:'+child.id+':'+id]))[0];
 return [200,{requestId:id,status:r.status,createdAt:Number(r.created)}];
}
export async function quiz(query,child,input){
 const QUIZ={'M01':['q1','q2','q3']};const video=String(input.videoId||''),taskId=String(input.taskId||''),sid=String(input.submissionId||'');
 if(!QUIZ[video]?.includes(taskId)||!ID.test(sid))return [400,{code:'bad_request'}];
 const task=quizTasks()[taskId];const answer=Core.normalize(task,String(input.answer||''));if(!answer)return [400,{code:'invalid'}];
 const key=[child.id,video,taskId,sid].join(':');const old=(await query('SELECT answer,evaluation FROM ayan_quiz_answers WHERE id=?',[key]))[0];
 if(old){if(old.answer!==answer)return [409,{code:'conflict'}];return [200,{evaluation:old.evaluation,replay:true}];}
 const r=Core.evaluate(task,answer);await query('INSERT INTO ayan_quiz_answers (id,child,video,version,task,answer,evaluation,created) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[key,child.id,video,String(input.version||'').slice(0,20),taskId,answer,r.correct?'correct':'incorrect',now()]);
 await logEvent(query,{id:'quiz:'+key,child:child.id,task:taskId,type:'answer_evaluated',payload:{correct:r.correct,videoId:video,role:'video_quiz',evaluatorVersion:Core.EVALUATOR_VERSION},source:'system'});
 return [200,{evaluation:r.correct?'correct':'incorrect',reason:r.reason,replay:false}];
}
// Mini-test after the M01 video: recognise 1/4 on a circle, equal vs unequal parts, transfer to a rectangle.
export function quizTasks(){return {
 q1:{id:'q1',kind:'fraction',shape:'circle',context:'circle',parts:[1,1,1,1],target:[1,4],modes:['mark'],role:'video_quiz',prompt:{ru:'Отметь одну четверть круга',kk:'Дөңгелектің бір ширегін белгіле'},hints:[{ru:'Одна из четырёх равных частей.',kk:'Төрт тең бөліктің біреуі.'}]},
 q2:{id:'q2',kind:'fraction',shape:'circle',context:'circle',parts:[1,1,1,1],target:[1,4],modes:['card'],cards:[{id:'a',shape:'circle',parts:[3,1,2,2],selected:[1]},{id:'b',shape:'circle',parts:[1,1,1,1],selected:[2]}],role:'video_quiz',prompt:{ru:'На какой картинке закрашена одна четверть?',kk:'Қай суретте бір ширек боялған?'},hints:[{ru:'Части должны быть равными.',kk:'Бөліктер тең болуы керек.'}]},
 q3:{id:'q3',kind:'fraction',shape:'rect',context:'strip',parts:[1,1,1,1],target:[1,4],modes:['mark'],role:'video_quiz',prompt:{ru:'Отметь одну четверть полоски',kk:'Жолақтың бір ширегін белгіле'},hints:[{ru:'Полоска разделена на 4 равные части.',kk:'Жолақ 4 тең бөлікке бөлінген.'}]}};}

// ---------- teacher: class, report, recommendations ----------
async function attemptSummary(query,childId,attemptId){
 const a=(await query('SELECT * FROM ayan_attempts WHERE id=? AND child=?',[attemptId,childId]))[0];if(!a)return null;
 const lesson=await versionContent(query,a.lesson_version)||{};const subs=await query('SELECT id,task,evaluation,saved,meta FROM ayan_submissions WHERE attempt=? AND child=? ORDER BY saved',[attemptId,childId]);
 const ev=await query('SELECT id,type,task,payload,received FROM ayan_learning_events WHERE attempt=? AND child=? ORDER BY received',[attemptId,childId]);
 const tasks=[];const byTask=new Map();for(const s of subs){if(!byTask.has(s.task))byTask.set(s.task,[]);byTask.get(s.task).push({...s,meta:J(s.meta)||{}});}
 for(const t of (lesson.tasks||[])){const list=byTask.get(t.id)||[];const twin=byTask.get(t.id+'-twin')||[];
  const firstCorrect=list.findIndex(s=>s.evaluation==='correct');const hintEv=ev.filter(e=>e.type==='hint_requested'&&e.task===t.id);
  tasks.push({taskId:t.id,role:t.role||'core',subskill:t.subskill||null,prompt:t.prompt,kind:t.kind,transferOf:t.transferOf||null,
   status:list.length?(firstCorrect>=0?'correct':'incorrect'):'not_evaluated',
   firstTry:list[0]?list[0].evaluation:null,firstMode:list[0]?.meta.mode||null,incorrectBefore:firstCorrect>=0?firstCorrect:list.length,
   hintsUsed:hintEv.length,maxHint:Math.max(0,...hintEv.map(e=>Number(J(e.payload)?.level)||0)),assisted:firstCorrect>=0&&list[firstCorrect].meta.hintLevel>0,
   modes:[...new Set(list.map(s=>s.meta.mode).filter(Boolean))],
   twin:twin.length?{status:twin.some(s=>s.evaluation==='correct')?'correct':'incorrect',firstTry:twin[0].evaluation,independent:twin.some(s=>s.evaluation==='correct'&&!(s.meta.hintLevel>0))}:null,
   evidence:[...list.map(s=>'sub:'+s.id),...hintEv.map(e=>e.id)].slice(0,10)});}
 const count=type=>ev.filter(e=>e.type===type).length;
 const views=ev.filter(e=>e.type==='view_changed').map(e=>J(e.payload)?.toMode).filter(Boolean);
 const modes=ev.filter(e=>e.type==='explanation_mode_changed').map(e=>J(e.payload)?.toMode).filter(Boolean);
 const required=lesson.required||[],evaluated=tasks.filter(t=>required.includes(t.taskId)&&t.status!=='not_evaluated');
 return {attemptId:a.id,lessonId:lesson.lessonId,lessonVersion:a.lesson_version,version:lesson.version,topic:lesson.topic,custom:!!lesson.custom,state:a.state,stage:a.stage||'goal',startedAt:Number(a.started),completedAt:a.completed?Number(a.completed):null,
  tasks,totals:{required:required.length,evaluated:evaluated.length,correct:evaluated.filter(t=>t.status==='correct').length,firstTryCorrect:evaluated.filter(t=>t.firstTry==='correct').length,
   notEvaluated:tasks.filter(t=>required.includes(t.taskId)&&t.status==='not_evaluated').map(t=>t.taskId),
   hints:count('hint_requested'),breaks:count('break_started'),help:count('communication_requested'),technicalErrors:count('technical_error'),pauses:count('lesson_paused')},
  sessionView:views.length?views[views.length-1]:null,explanationModes:[...new Set(modes)]};
}
// Explainable rules. Each recommendation carries the facts it is based on; the teacher can edit or ignore it.
function recommend(sum){
 const out=[];if(!sum)return out;const find=id=>sum.tasks.find(t=>t.taskId===id);
 for(const t of sum.tasks.filter(t=>t.role==='core'&&t.assisted)){
  out.push({id:'more-'+t.taskId,kind:'followup',reason:{ru:`Задание «${Core.L(t.prompt,'ru')}»: неверных попыток - ${t.incorrectBefore}, затем решено после подсказки (уровень ${t.maxHint} из 3).`,kk:`«${Core.L(t.prompt,'kk')}» тапсырмасы: қате әрекет саны - ${t.incorrectBefore}, содан кейін кеңестен соң шешілді (${t.maxHint}/3 деңгей).`},taskId:t.taskId,
   action:{ru:'Предложить ещё один пример на ту же долю.',kk:'Сол үлеске тағы бір мысал ұсыну.'},evidence:t.evidence,draft:{fromTask:t.taskId}});break;}
 const diag=sum.tasks.find(t=>t.role==='diagnostic');
 if(diag&&diag.firstTry==='incorrect')out.unshift({id:'equal-parts',kind:'followup',reason:{ru:'В задании с неравными частями первой выбрана часть, которая не равна четверти.',kk:'Тең емес бөліктер тапсырмасында алдымен ширекке тең емес бөлік таңдалды.'},
   action:{ru:'Назначить упражнение на равенство частей.',kk:'Бөліктердің теңдігіне жаттығу тағайындау.'},evidence:diag.evidence,draft:{fromTask:diag.taskId,unequal:true}});
 const core=sum.tasks.filter(t=>t.role==='core');
 if(core.length&&core.every(t=>t.firstTry==='correct')&&sum.lessonId==='math-fractions-01')out.push({id:'next-lesson',kind:'lesson',reason:{ru:'Все основные задания решены с первой попытки.',kk:'Барлық негізгі тапсырма бірінші әрекеттен шешілді.'},action:{ru:'Можно перейти к сравнению долей.',kk:'Үлестерді салыстыруға өтуге болады.'},evidence:core.flatMap(t=>t.evidence).slice(0,6),lessonId:'math-fractions-02'});
 return out;
}
function observations(sum){
 const out=[];if(!sum)return out;
 for(const t of sum.tasks){if(t.twin?.independent&&t.assisted)out.push({kind:'strength',text:{ru:'После подсказки новый пример решён самостоятельно.',kk:'Кеңестен кейін жаңа мысал өз бетімен шешілді.'},taskId:t.taskId});}
 const tr=sum.tasks.find(t=>t.role==='transfer');if(tr?.firstTry==='correct')out.push({kind:'strength',text:{ru:'Перенёс(ла) понятие на новую фигуру с первой попытки.',kk:'Ұғымды жаңа пішінге бірінші әрекеттен көшірді.'},taskId:tr.taskId});
 const diag=sum.tasks.find(t=>t.role==='diagnostic');if(diag&&diag.firstTry==='incorrect')out.push({kind:'repeat',text:{ru:'Повторить: равенство частей.',kk:'Қайталау: бөліктердің теңдігі.'},taskId:diag.taskId});
 const hinted=sum.tasks.filter(t=>t.assisted);if(hinted.length){const lvl=Math.max(...hinted.map(t=>t.maxHint));out.push({kind:'helpful_hint',text:{ru:lvl>=2?'Помогла визуальная подсказка.':'Помогло повторение инструкции.',kk:lvl>=2?'Көрнекі кеңес көмектесті.':'Нұсқауды қайталау көмектесті.'}});}
 return out;
}
export async function report(query,user,input){
 const c=await ownChild(query,user.id,input.child);if(!c)return [404,{code:'not_found'}];
 const attempts=await query('SELECT id FROM ayan_attempts WHERE child=? AND assignment IS NOT NULL ORDER BY started DESC',[c.id]);
 const want=input.attempt&&attempts.find(a=>a.id===String(input.attempt))?String(input.attempt):attempts[0]?.id;
 const sum=want?await attemptSummary(query,c.id,want):null;
 const help=await query('SELECT id,phrase,status,created,seen FROM ayan_help_requests WHERE child=? ORDER BY created DESC LIMIT 20',[c.id]);
 const quizRows=await query('SELECT task,evaluation,created FROM ayan_quiz_answers WHERE child=? ORDER BY created',[c.id]);
 const notes=(await query('SELECT id,author,text,created FROM ayan_notes WHERE child=? ORDER BY created DESC',[c.id])).map(n=>({id:n.id,text:n.text,createdAt:Number(n.created),mine:n.author===user.id}));
 const prof=(await query('SELECT data,updated,updated_by FROM ayan_support WHERE child=?',[c.id]))[0];
 const fu=want?(await query("SELECT created FROM ayan_assignments WHERE child=? AND kind='followup' AND source_attempt=? ORDER BY created DESC LIMIT 1",[c.id,want]))[0]:null;
 const recs=recommend(sum).map(x=>x.kind==='followup'&&fu?{...x,assignedAt:Number(fu.created)}:x);
 return [200,{child:{id:c.id,label:c.label,demo:Number(c.demo)===1},attempts:attempts.map(a=>a.id),summary:sum,recommendations:recs,observations:observations(sum),
  help:help.map(h=>({id:h.id,phrase:h.phrase,status:h.status,createdAt:Number(h.created),seen:!!h.seen})),quiz:quizRows.map(q=>({taskId:q.task,evaluation:q.evaluation,createdAt:Number(q.created)})),notes,
  support:prof?{...J(prof.data),updatedAt:Number(prof.updated),updatedBy:prof.updated_by}:null}];
}
export async function classView(query,user){
 const kids=await query('SELECT id,label,demo FROM ayan_children WHERE owner=? ORDER BY label',[user.id]);const rows=[];
 for(const c of kids){const at=(await query('SELECT id FROM ayan_attempts WHERE child=? AND assignment IS NOT NULL ORDER BY started DESC LIMIT 1',[c.id]))[0];
  const s=at?await attemptSummary(query,c.id,at.id):null;const assigned=(await query('SELECT COUNT(*) AS n FROM ayan_assignments WHERE child=?',[c.id]))[0];
  const openHelp=(await query('SELECT COUNT(*) AS n FROM ayan_help_requests WHERE child=? AND seen IS NULL AND phrase=?',[c.id,'help']))[0];
  rows.push({id:c.id,label:c.label,demo:Number(c.demo)===1,assigned:Number(assigned.n),summary:s?{attemptId:s.attemptId,topic:s.topic,state:s.state,stage:s.stage,totals:s.totals,sessionView:s.sessionView}:null,openHelp:Number(openHelp.n)});}
 const withS=rows.filter(r=>r.summary);
 return [200,{students:rows,cards:{completed:withS.filter(r=>r.summary.state==='completed').length,attempts:withS.length,hints:withS.reduce((a,r)=>a+r.summary.totals.hints,0)}}];
}
export async function helpList(query,user){
 const rows=await query('SELECT h.id,h.phrase,h.status,h.created,h.seen,c.label,c.id AS child FROM ayan_help_requests h JOIN ayan_children c ON c.id=h.child WHERE c.owner=? AND h.phrase=? ORDER BY h.created DESC LIMIT 50',[user.id,'help']);
 return [200,rows.map(r=>({id:r.id,child:r.child,label:r.label,phrase:r.phrase,status:r.status,createdAt:Number(r.created),seen:!!r.seen}))];
}
export async function helpSeen(query,user,input){
 const r=(await query('SELECT h.id FROM ayan_help_requests h JOIN ayan_children c ON c.id=h.child WHERE h.id=? AND c.owner=?',[String(input.id||''),user.id]))[0];if(!r)return [404,{code:'not_found'}];
 await query('UPDATE ayan_help_requests SET seen=? WHERE id=? AND seen IS NULL',[now(),r.id]);return [200,{ok:true}];
}
export async function addNote(query,user,input){
 const c=await ownChild(query,user.id,input.child);if(!c)return [404,{code:'not_found'}];
 const text=String(input.text||'').trim().slice(0,1000);if(!text)return [400,{code:'empty',error:'Пустая заметка'}];
 const id=ID.test(String(input.noteId||''))?'n:'+user.id+':'+input.noteId:uid();
 await query('INSERT INTO ayan_notes (id,child,author,text,created) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[id,c.id,user.id,text,now()]);
 return [200,{id,text}];
}
// Scoped export (one own student) and deletion of that student's data everywhere, incl. sessions and links.
export async function exportChild(query,user,input){
 const c=await ownChild(query,user.id,input.child);if(!c)return [404,{code:'not_found'}];
 const pick=async(sql)=>query(sql,[c.id]);
 return [200,{exportedAt:now(),environment:'local_demo',demo:Number(c.demo)===1,student:{id:c.id,label:c.label},
  assignments:await pick('SELECT id,lesson_version,kind,created FROM ayan_assignments WHERE child=?'),attempts:await pick('SELECT id,lesson_version,state,stage,started,completed FROM ayan_attempts WHERE child=?'),
  submissions:await pick('SELECT task,answer,evaluation,saved FROM ayan_submissions WHERE child=?'),events:await pick('SELECT type,attempt,task,payload,received FROM ayan_learning_events WHERE child=?'),
  help:await pick('SELECT phrase,status,created FROM ayan_help_requests WHERE child=?'),notes:await pick('SELECT text,created FROM ayan_notes WHERE child=?'),support:await pick('SELECT data,updated FROM ayan_support WHERE child=?'),
  videos:await pick('SELECT video,version,seconds,completed FROM ayan_video_views WHERE child=?'),quiz:await pick('SELECT video,task,evaluation,created FROM ayan_quiz_answers WHERE child=?')}];
}
export async function deleteChild(query,user,input){
 const c=await ownChild(query,user.id,input.child);if(!c)return [404,{code:'not_found'}];
 if(String(input.confirm||'')!==c.label)return [400,{code:'confirm',error:'Введите имя ученика для подтверждения'}];
 for(const t of ['ayan_assignments','ayan_attempts','ayan_submissions','ayan_learning_events','ayan_help_requests','ayan_notices','ayan_notes','ayan_support','ayan_video_views','ayan_quiz_answers','ayan_child_sessions','ayan_invites','ayan_parent_links','ayan_events','ayan_lessons','ayan_lesson_versions'])
  await query(`DELETE FROM ${t} WHERE child=?`,[c.id]);
 await query('DELETE FROM ayan_children WHERE id=? AND owner=?',[c.id,user.id]);return [200,{deleted:true}];
}

// ---------- constructor ----------
const CTX={pizza:'circle',circle:'circle',cake:'circle',strip:'rect',chocolate:'rect',rect:'rect'};
function taskFromFields(f){
 const d=Math.round(Number(f.denominator)),n=Math.round(Number(f.numerator)),context=CTX[f.context]?f.context:'circle',shape=CTX[context];
 // Checked BEFORE any array is built from client numbers: an out-of-range denominator or a huge parts list gives no parts
 // (validation then answers 400) instead of allocating memory.
 const okD=Number.isInteger(d)&&d>=2&&d<=12;
 const parts=f.partition==='unequal'?(Array.isArray(f.parts)&&f.parts.length<=12?f.parts.map(Number):[]):okD?Array(d).fill(1):[];
 const modes=(Array.isArray(f.modes)?f.modes:['mark']).filter(m=>Core.MODES.includes(m));
 const s=(o,max)=>({ru:String(o?.ru||'').trim().slice(0,max),kk:String(o?.kk||'').trim().slice(0,max)});
 return {id:'t1',kind:'fraction',role:'core',shape,context,parts,target:[n,d],modes:f.partition==='unequal'?modes.filter(m=>m!=='build'):modes,subskill:f.partition==='unequal'?'equal_area':'identify_fraction',
  prompt:s(f.prompt,240),hints:(Array.isArray(f.hints)?f.hints:[]).slice(0,3).map(h=>s(h,400)).filter(h=>h.ru||h.kk),objective:s(f.objective,300),title:s(f.title||{ru:'Доля целого',kk:'Бүтіннің үлесі'},80),
  reviewStatus:['draft','teacher_checked'].includes(f.reviewStatus)?f.reviewStatus:'draft'};
}
export async function saveTemplate(query,{user,mem,ent,input}){
 if(!mem.teaches)return [403,{code:'forbidden'}];
 const followup=input.followup===true;
 if(followup){const src=(await query('SELECT a.id FROM ayan_attempts a JOIN ayan_children c ON c.id=a.child WHERE a.id=? AND c.owner=?',[String(input.sourceAttempt||''),user.id]))[0];if(!src)return [404,{code:'not_found',error:'Источник отчёта не найден'}];}
 if(!followup&&!has(ent,'constructor'))return [402,{code:'plan',feature:'constructor',error:'Конструктор доступен в тарифе Макс или Школа'}];
 const opId=String(input.opId||'');if(!ID.test(opId))return [400,{code:'bad_request',error:'opId'}];
 const prior=(await query('SELECT * FROM ayan_task_versions WHERE owner=? AND op_id=?',[user.id,opId]))[0];if(prior)return [200,{taskVersion:viewTV(prior),replay:true}];
 const task=taskFromFields(input.fields||{});const errors=Core.validateFractionTask(task);if(errors.length)return [400,{code:'invalid',errors}];
 let templateId=String(input.templateId||'');if(templateId){const own=(await query('SELECT id FROM ayan_task_versions WHERE template_id=? AND owner=? LIMIT 1',[templateId,user.id]))[0];if(!own)return [404,{code:'not_found'}];}else templateId=uid();
 const max=(await query('SELECT MAX(version) AS v FROM ayan_task_versions WHERE template_id=?',[templateId]))[0];const version=(Number(max?.v)||0)+1;
 const content={...task,templateId,version,followup,sourceAttempt:followup?String(input.sourceAttempt):null};const id=uid();
 await query('INSERT INTO ayan_task_versions (id,template_id,owner,version,content,created,op_id) VALUES (?,?,?,?,?,?,?) ON CONFLICT(owner,op_id) DO NOTHING',[id,templateId,user.id,version,JSON.stringify(content),now(),opId]);
 return [200,{taskVersion:viewTV((await query('SELECT * FROM ayan_task_versions WHERE owner=? AND op_id=?',[user.id,opId]))[0]),replay:false}];
}
const viewTV=r=>({id:r.id,templateId:r.template_id,version:Number(r.version),content:J(r.content),createdAt:Number(r.created)});
export async function templates(query,user){return [200,(await query('SELECT * FROM ayan_task_versions WHERE owner=? ORDER BY created DESC LIMIT 50',[user.id])).map(viewTV)];}
// Preview: the same evaluator on a synthetic attempt owned by the teacher. Nothing touches a child's records.
export async function preview(query,user,input){
 let task;if(input.taskVersionId){const r=(await query('SELECT content FROM ayan_task_versions WHERE id=? AND owner=?',[String(input.taskVersionId),user.id]))[0];if(!r)return [404,{code:'not_found'}];task=J(r.content);}
 else{task=taskFromFields(input.fields||{});const errors=Core.validateFractionTask(task);if(errors.length)return [400,{code:'invalid',errors}];}
 const answer=Core.normalize(task,String(input.answer||''));if(!answer)return [400,{code:'invalid'}];const r=Core.evaluate(task,answer);
 await query('INSERT INTO ayan_preview_submissions (id,owner,task_version,answer,evaluation,created) VALUES (?,?,?,?,?,?)',[uid(),user.id,input.taskVersionId?String(input.taskVersionId):null,answer,r.correct?'correct':'incorrect',now()]);
 return [200,{preview:true,evaluation:r.correct?'correct':'incorrect',reason:r.reason,shown:r.shown||null}];
}
// Draft for "assign the next example" from a report recommendation: prefilled, never assigned without the teacher.
export async function followupDraft(query,user,input){
 const c=await ownChild(query,user.id,input.child);if(!c)return [404,{code:'not_found'}];
 const a=(await query('SELECT id,lesson_version FROM ayan_attempts WHERE id=? AND child=?',[String(input.attempt||''),c.id]))[0];if(!a)return [404,{code:'not_found'}];
 const l=await versionContent(query,a.lesson_version);const src=Core.findTask(l?.tasks||[],String(input.fromTask||''))||l?.tasks?.[0];if(!src||src.kind!=='fraction')return [400,{code:'bad_request'}];
 const unequal=input.unequal===true;const [n,d]=src.target;
 const fields=unequal?{title:{ru:'Равенство частей',kk:'Бөліктердің теңдігі'},objective:{ru:'Проверять, равны ли части, прежде чем называть долю.',kk:'Үлесті атамас бұрын бөліктердің тең екенін тексеру.'},context:'circle',denominator:4,numerator:1,partition:'unequal',parts:[3,1,2,2],modes:['mark','card'],
   prompt:{ru:'Части этого круга не равны. Отметь одну четверть круга',kk:'Бұл дөңгелектің бөліктері тең емес. Дөңгелектің бір ширегін белгіле'},
   hints:[{ru:'Сначала сравни части: какие из них равны?',kk:'Алдымен бөліктерді салыстыр: қайсылары тең?'},{ru:'Четверть - это четверть всего круга, как прямой угол.',kk:'Ширек - бүкіл дөңгелектің ширегі, тік бұрыш сияқты.'},{ru:'Подходит часть, которая занимает ровно угол-уголок, как в равном круге.',kk:'Тең дөңгелектегідей дәл бұрыш алатын бөлік сәйкес келеді.'}]}
  :{title:{ru:'Ещё один пример',kk:'Тағы бір мысал'},objective:{ru:'Выделять долю целого на новой фигуре.',kk:'Жаңа пішінде бүтіннің үлесін көрсету.'},context:src.shape==='circle'?'chocolate':'pizza',denominator:d,numerator:n,partition:'equal',modes:['mark','build','card'],
   prompt:{ru:`Выбери ${Core.fractionWords(n,d,'ru')}`,kk:`${Core.fractionWords(n,d,'kk')} үлесін таңда`},hints:src.hints};
 // Ready examples the teacher can assign in one click; the full constructor stays behind "Настроить".
 const CTX={pizza:{ru:'Пицца',kk:'Пицца'},chocolate:{ru:'Шоколадка',kk:'Шоколад'},circle:{ru:'Круг',kk:'Дөңгелек'},strip:{ru:'Полоска',kk:'Жолақ'},cake:{ru:'Торт',kk:'Торт'},rect:{ru:'Прямоугольник',kk:'Тіктөртбұрыш'}};
 const variants=unequal?[fields,{...fields,context:'strip',parts:[2,1,1,4],prompt:{ru:'Части этой полоски не равны. Отметь одну четверть полоски',kk:'Бұл жолақтың бөліктері тең емес. Жолақтың бір ширегін белгіле'}}]
  :[fields,{...fields,context:fields.context==='pizza'?'strip':'cake'}];
 const options=variants.filter(f=>!Core.validateFractionTask(taskFromFields(f)).length).map((f,i)=>({id:'v'+(i+1),fields:f,
  label:{ru:`${CTX[f.context]?.ru||f.context}, ${f.numerator}/${f.denominator}${f.partition==='unequal'?', части не равны':''}`,kk:`${CTX[f.context]?.kk||f.context}, ${f.numerator}/${f.denominator}${f.partition==='unequal'?', бөліктері тең емес':''}`},
  prompt:f.prompt}));
 return [200,{child:{id:c.id,label:c.label},sourceAttempt:a.id,fields,options,basis:input.reason||null}];
}

// ---------- pilot (local mock checkout) ----------
export async function pilotOrder(query,{user,mem,input}){
 if(!mem.manages)return [403,{code:'forbidden',error:'Подпиской управляет администратор организации'}];
 const key=String(input.idempotencyKey||'');if(!ID.test(key))return [400,{code:'bad_request',error:'idempotencyKey'}];
 const plan=PLANS[String(input.planId||'')];if(!plan||plan.id==='free')return [400,{code:'bad_request',error:'planId'}];
 const prior=(await query('SELECT * FROM ayan_pilot_orders WHERE org=? AND idem_key=?',[mem.org,key]))[0];
 if(prior){await healOrder(query,prior);return [200,{order:viewOrder(prior),entitlement:await entitlement(query,mem.org),replay:true}];}
 const id=uid(),t=now();await query('INSERT INTO ayan_pilot_orders (id,org,created_by,plan,mode,status,idem_key,created,updated) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(org,idem_key) DO NOTHING',[id,mem.org,user.id,plan.id,'local_mock','pending',key,t,t]);
 const order=(await query('SELECT * FROM ayan_pilot_orders WHERE org=? AND idem_key=?',[mem.org,key]))[0];
 if(order.id!==id){await healOrder(query,order);return [200,{order:viewOrder(order),entitlement:await entitlement(query,mem.org),replay:true}];}
 // The disabled provider is replaced by a deterministic local outcome. No card data exists anywhere in this flow.
 const outcome=input.simulate==='fail'?'failed':input.simulate==='cancel'?'cancelled':input.simulate==='pending'?'pending':'succeeded';
 await query('UPDATE ayan_pilot_orders SET status=?,updated=? WHERE id=? AND status=?',[outcome,now(),id,'pending']);
 if(outcome==='succeeded')await grantEntitlement(query,mem.org,plan,id);
 return [200,{order:viewOrder((await query('SELECT * FROM ayan_pilot_orders WHERE id=?',[id]))[0]),entitlement:await entitlement(query,mem.org),replay:false}];
}
async function grantEntitlement(query,org,plan,orderId){
 const days=Math.max(1,Math.min(90,Number(process.env.AYAN_PILOT_DAYS)||plan.trialDays)),t=now();
 await query('INSERT INTO ayan_entitlements (org,plan,status,started,expires,order_id,updated) VALUES (?,?,?,?,?,?,?) ON CONFLICT(org) DO UPDATE SET plan=excluded.plan,status=excluded.status,started=excluded.started,expires=excluded.expires,order_id=excluded.order_id,updated=excluded.updated',[org,plan.id,'active',t,t+days*86400000,orderId,t]);
}
// A succeeded order whose entitlement was never written (crash in between) is completed on retry. An entitlement that was later
// cancelled, expired or replaced by a newer order is left alone.
async function healOrder(query,order){
 if(order.status!=='succeeded')return;
 const e=(await query('SELECT order_id,updated FROM ayan_entitlements WHERE org=?',[order.org]))[0];
 if(!e||(e.order_id!==order.id&&Number(e.updated)<Number(order.updated)))await grantEntitlement(query,order.org,PLANS[order.plan]||PLANS.school_pilot,order.id);
}
const viewOrder=o=>({id:o.id,plan:o.plan,mode:o.mode,status:o.status,createdAt:Number(o.created),updatedAt:Number(o.updated)});
export async function pilotState(query,mem){
 const orders=(await query('SELECT * FROM ayan_pilot_orders WHERE org=? ORDER BY created DESC LIMIT 10',[mem.org])).map(viewOrder);
 return [200,{org:{id:mem.org,name:mem.orgName,demo:mem.demo},role:mem.role,canManage:mem.manages,entitlement:await entitlement(query,mem.org),orders,plans:Object.values(PLANS).map(p=>({id:p.id,label:p.label,features:[...ALWAYS,...p.features],trialDays:p.trialDays||null}))}];
}
// Cancel or end the test pilot. Learning history is kept; only plan features change.
export async function pilotStop(query,{mem,input}){
 if(!mem.manages)return [403,{code:'forbidden',error:'Подпиской управляет администратор организации'}];
 const e=(await query('SELECT * FROM ayan_entitlements WHERE org=?',[mem.org]))[0];if(!e||e.status!=='active')return [200,{entitlement:await entitlement(query,mem.org),changed:false}];
 const status=input.reason==='expire'?'expired':'cancelled';
 await query('UPDATE ayan_entitlements SET status=?,expires=?,updated=? WHERE org=? AND status=?',[status,now(),now(),mem.org,'active']);
 return [200,{entitlement:await entitlement(query,mem.org),changed:true}];
}
export async function adminOverview(query,mem){
 if(!mem.manages)return [403,{code:'forbidden'}];
 // Organisation-level numbers only: an admin manages the plan; student detail stays with the assigned teacher.
 const teachers=await query('SELECT user_id FROM ayan_members WHERE org=? AND role IN (?,?)',[mem.org,'teacher','owner']);
 const ids=teachers.map(t=>t.user_id);let students=0,assignments=0,completed=0;
 for(const id of ids){students+=Number((await query('SELECT COUNT(*) AS n FROM ayan_children WHERE owner=?',[id]))[0].n);
  assignments+=Number((await query('SELECT COUNT(*) AS n FROM ayan_assignments WHERE owner=?',[id]))[0].n);
  completed+=Number((await query('SELECT COUNT(*) AS n FROM ayan_attempts a JOIN ayan_children c ON c.id=a.child WHERE c.owner=? AND a.state=? AND a.assignment IS NOT NULL',[id,'completed']))[0].n);}
 return [200,{org:{id:mem.org,name:mem.orgName,demo:mem.demo},teachers:ids.length,students,assignments,completed,entitlement:await entitlement(query,mem.org)}];
}
export function catalogFor(ent){
 return Catalog.LESSONS.map(l=>({lessonId:l.lessonId,subject:l.subject,gradeProposal:l.gradeProposal,version:l.version,topic:l.topic,objectiveDraft:l.objectiveDraft,successCriteria:l.successCriteria,
  curriculumVerification:l.curriculumVerification,reviewStatus:l.reviewStatus,taskCount:l.tasks.length,media:{video:!!l.media?.video,audio:!!(l.media?.audio?.ru||l.media?.audio?.kk)},
  locked:l.lessonId!=='math-fractions-01'&&!has(ent,'all_lessons')}));
}
export {Catalog,Core};
// "Можно повторить дома": one short piece of advice for the parent, chosen by the skill the child needed support on.
// Never the task wording (it is written for the child and makes no sense out of the lesson).
const HOME_TIPS={
 identify_fraction:{ru:'Разрежьте вместе яблоко или лист бумаги на равные части и попросите показать одну часть.',kk:'Алманы немесе қағазды бірге тең бөліктерге бөліп, баладан бір бөлігін көрсетуін сұраңыз.'},
 transfer_new_shape:{ru:'Разрежьте вместе яблоко или лист бумаги на равные части и попросите показать одну часть.',kk:'Алманы немесе қағазды бірге тең бөліктерге бөліп, баладан бір бөлігін көрсетуін сұраңыз.'},
 equal_area:{ru:'Сложите лист бумаги пополам и ещё раз пополам. Спросите, равные ли получились части.',kk:'Қағазды қақ бүктеп, тағы бір рет бүктеңіз. Бөліктер тең шықты ма деп сұраңыз.'},
 compare_same_den:{ru:'Разделите две одинаковые полоски бумаги и сравните, где больше закрашенных частей.',kk:'Екі бірдей қағаз жолағын бөліп, қайсысында боялған бөлік көп екенін салыстырыңыз.'},
 organ_function:{ru:'Рассмотрите дома комнатное растение: попросите показать корень, стебель и лист.',kk:'Үйдегі гүлді бірге қарап, баладан тамырын, сабағын және жапырағын көрсетуін сұраңыз.'},
 sequence:{ru:'Попросите ребёнка рассказать по шагам, как он чистит зубы или собирает портфель.',kk:'Баладан тісін қалай тазалайтынын немесе сөмкесін қалай жинайтынын қадаммен айтып беруін сұраңыз.'},
 if_then:{ru:'Поиграйте в «если - то»: «если идёт дождь, то берём зонт». Пусть ребёнок придумает своё.',kk:'«Егер - онда» ойынын ойнаңыз: «егер жаңбыр жауса, онда қолшатыр аламыз». Бала өзі ойлап тапсын.'},
 cell_parts:{ru:'Нарисуйте вместе клетку как «дом» и попросите назвать её части.',kk:'Жасушаны «үй» ретінде бірге салып, баладан оның бөліктерін атауын сұраңыз.'}
};
const TIP_ALIAS={organ_transfer:'organ_function',sequence_transfer:'sequence',if_then_transfer:'if_then',cell_transfer:'cell_parts',compare_transfer:'compare_same_den'};
const TIP_DEFAULT={ru:'Попросите ребёнка показать, что было на уроке, на настоящем предмете дома.',kk:'Баладан сабақта болған нәрсені үйдегі нақты затпен көрсетуін сұраңыз.'};
function homeTips(sum){
 const need=sum.tasks.filter(t=>t.assisted||(t.firstTry&&t.firstTry!=='correct'));if(!need.length)return [];
 const skill=need.map(t=>TIP_ALIAS[t.subskill]||t.subskill).find(k=>HOME_TIPS[k]);
 return [skill?HOME_TIPS[skill]:TIP_DEFAULT];
}
// Parent part of the report: the linked child only, facts without teacher notes or recommendations.
// Top-level fields describe the latest lesson (older pages read them); "lessons" lists up to three latest lessons.
export async function parentSummary(query,childId){
 const atts=await query('SELECT id FROM ayan_attempts WHERE child=? AND assignment IS NOT NULL ORDER BY started DESC LIMIT 3',[childId]);if(!atts.length)return null;
 const sums=[];for(const a of atts){const s=await attemptSummary(query,childId,a.id);if(s)sums.push(s);}if(!sums.length)return null;const s=sums[0];
 const queue=(await childHome(query,{id:childId,label:'',demo:0})).queue;
 return {topic:s.topic,state:s.state,stage:s.stage,correct:s.totals.correct,evaluated:s.totals.evaluated,required:s.totals.required,hints:s.totals.hints,breaks:s.totals.breaks,completedAt:s.completedAt,
  lessons:sums.map(x=>({topic:x.topic,state:x.state,stage:x.stage,correct:x.totals.correct,required:x.totals.required,hints:x.totals.hints,breaks:x.totals.breaks,startedAt:x.startedAt,completedAt:x.completedAt,
   repeat:homeTips(x)})),
  lights:await lightsOf(query,childId,queue)};
}

// ---------- "Скоро заканчиваем": a calm transition warning from the teacher to the child (F2) ----------
// minutes 2 or 5 = warn (whole own class when children is empty, or the listed own students); 0 = cancel active notices.
// The child polls its newest notice; a notice stays readable one minute after it ends so the child sees "time is up".
const NOTICE_MIN=[0,2,5];
export async function notice(query,user,input){
 const minutes=Number(input?.minutes);if(!NOTICE_MIN.includes(minutes))return [400,{code:'bad_request',error:'minutes: 0, 2 или 5'}];
 const ids=Array.isArray(input.children)?[...new Set(input.children.map(String))].slice(0,60):[];
 let kids;if(ids.length){kids=[];for(const id of ids){const c=await ownChild(query,user.id,id);if(!c)return [404,{code:'not_found',error:'Ученик не найден'}];kids.push(c);}}
 else kids=await query('SELECT id FROM ayan_children WHERE owner=?',[user.id]);
 const t=now();
 if(minutes===0){let n=0;for(const c of kids){const r=await query('SELECT COUNT(*) AS n FROM ayan_notices WHERE owner=? AND child=? AND until>?',[user.id,c.id,t-60000]);n+=Number(r[0]?.n)>0?1:0;await query('DELETE FROM ayan_notices WHERE owner=? AND child=?',[user.id,c.id]);}return [200,{sent:n,until:null}];}
 const until=t+minutes*60000;
 for(const c of kids){await query('DELETE FROM ayan_notices WHERE owner=? AND child=?',[user.id,c.id]);await query('INSERT INTO ayan_notices (id,owner,child,minutes,created,until) VALUES (?,?,?,?,?,?)',[uid(),user.id,c.id,minutes,t,until]);}
 return [200,{sent:kids.length,until}];
}
export async function noticeState(query,user){
 const rows=await query('SELECT minutes,until FROM ayan_notices WHERE owner=? AND until>? ORDER BY until DESC',[user.id,now()]);
 return [200,{active:rows.length?{minutes:Number(rows[0].minutes),until:Number(rows[0].until),sent:rows.length}:null}];
}
export async function childNotice(query,child){
 const r=(await query('SELECT id,minutes,created,until FROM ayan_notices WHERE child=? AND until>? ORDER BY created DESC LIMIT 1',[child.id,now()-60000]))[0];
 return [200,{notice:r?{id:r.id,minutes:Number(r.minutes),until:Number(r.until),created:Number(r.created)}:null}];
}

// ---------- live class pulse (teacher home "Кому сейчас нужна помощь?") ----------
// One row per own student, read on every poll (3-5 s). Status is derived from stored facts only: an unseen help request,
// a paused attempt or a break_started without break_ended, the attempt stage and task index, and the last activity time.
const PULSE_ORDER={help:0,break:1,working:3,idle:4,waiting:5,done:6,none:7};
const IDLE_MS=10*60000,COMING_MS=3*60000,DONE_MS=45*60000,BREAK_MS=2*3600000;
export async function pulse(query,user){
 const kids=await query('SELECT id,label,demo FROM ayan_children WHERE owner=? ORDER BY label',[user.id]);const rows=[];const t=now();
 for(const c of kids){
  const assigned=await query('SELECT a.id,a.kind,a.created,v.content FROM ayan_assignments a JOIN ayan_lesson_versions v ON v.id=a.lesson_version WHERE a.child=? ORDER BY a.created',[c.id]);
  const atts=await query('SELECT * FROM ayan_attempts WHERE child=? AND assignment IS NOT NULL ORDER BY started DESC',[c.id]);
  const open=atts.find(a=>a.state!=='completed')||null,latest=atts[0]||null;
  const lastHelp=(await query('SELECT id,attempt,created,seen FROM ayan_help_requests WHERE child=? AND phrase=? ORDER BY created DESC LIMIT 1',[c.id,'help']))[0]||null;
  // A help request made before the child finished that lesson is no longer current: the card shows "done", not "help".
  // Linked to a lesson: stale once that lesson is completed. From the home screen: stale once any lesson finished after it.
  const helpAtt=lastHelp?.attempt?atts.find(x=>x.id===lastHelp.attempt):null;
  const finishedAfter=!!lastHelp&&(helpAtt?helpAtt.state==='completed':atts.some(x=>x.state==='completed'&&Number(x.completed)>Number(lastHelp.created)));
  const help=lastHelp&&lastHelp.seen==null&&!finishedAfter?lastHelp:null;
  const comingAt=lastHelp&&lastHelp.seen!=null&&t-Number(lastHelp.seen)<COMING_MS?Number(lastHelp.seen):null;
  // Breaks are read per child, not per attempt: a break can start from the home screen with no lesson open.
  const br=(await query("SELECT MAX(CASE WHEN type='break_started' THEN received END) AS bs,MAX(CASE WHEN type='break_ended' THEN received END) AS be FROM ayan_learning_events WHERE child=? AND type IN ('break_started','break_ended')",[c.id]))[0]||{};
  const cbs=Number(br.bs)||0,cbe=Number(br.be)||0,childBreak=cbs>cbe&&t-cbs<BREAK_MS;
  const doneIds=new Set(atts.filter(a=>a.state==='completed').map(a=>a.assignment));const startedIds=new Set(atts.map(a=>a.assignment));
  const nextUp=assigned.find(a=>!startedIds.has(a.id))||null;
  const row={id:c.id,label:c.label,demo:Number(c.demo)===1,status:'none',topic:null,lessonId:null,stage:null,stageIndex:0,task:null,hints:0,struggling:false,lastAt:null,since:null,helpId:help?.id||null,comingAt,completed:doneIds.size,assigned:assigned.length};
  const a=open||latest;
  if(a){const lesson=await versionContent(query,a.lesson_version)||{};const ui=J(a.ui)||{};row.topic=lesson.topic||null;row.lessonId=lesson.lessonId||null;row.attemptId=a.id;
   row.stage=a.stage||'goal';row.stageIndex=STAGES.indexOf(row.stage)+1;
   const practice=lesson.practice||(lesson.tasks||[]).filter(x=>x.role==='core').map(x=>x.id),checks=lesson.checkTasks||[];
   let taskId=null;
   if(row.stage==='practice'&&practice.length){const i=Math.min(Number(ui.taskIndex)||0,practice.length-1);row.task={n:i+1,m:practice.length};taskId=ui.twinFor===practice[i]?practice[i]+'-twin':practice[i];}
   if(row.stage==='check'&&checks.length){const i=Math.min(Number(ui.checkIndex)||0,checks.length-1);row.task={n:i+1,m:checks.length};taskId=checks[i];}
   const ev=await query('SELECT type,task,received FROM ayan_learning_events WHERE attempt=? AND child=? ORDER BY received',[a.id,c.id]);
   row.lastAt=ev.length?Number(ev[ev.length-1].received):Number(a.started);
   const lastOf=type=>{for(let i=ev.length-1;i>=0;i--)if(ev[i].type===type)return Number(ev[i].received);return 0;};
   const bs=Math.max(lastOf('break_started'),cbs),be=Math.max(lastOf('break_ended'),cbe);
   const onBreak=a.state!=='completed'&&((bs>be&&t-bs<BREAK_MS)||(a.state==='paused'&&t-row.lastAt<BREAK_MS));
   if(taskId){row.hints=ev.filter(e=>e.type==='hint_requested'&&e.task===taskId).length;
    const subs=await query('SELECT evaluation FROM ayan_submissions WHERE attempt=? AND child=? AND task=?',[a.id,c.id,taskId]);
    row.struggling=subs.filter(x=>x.evaluation!=='correct').length>=2&&!subs.some(x=>x.evaluation==='correct');}
   if(a.state!=='completed'){row.status=onBreak?'break':t-row.lastAt>IDLE_MS?'idle':'working';row.since=onBreak?(bs||row.lastAt):row.lastAt;}
   else{row.status=nextUp&&t-Number(a.completed)>DONE_MS?'waiting':'done';row.since=Number(a.completed)||row.lastAt;if(nextUp&&row.status==='done'){const l=J(nextUp.content)||{};row.next={topic:l.topic||null,followup:nextUp.kind==='followup'};}const req=lesson.required||[];const ok=(await query('SELECT DISTINCT task FROM ayan_submissions WHERE attempt=? AND child=? AND evaluation=?',[a.id,c.id,'correct'])).filter(x=>req.includes(x.task)).length;row.score={n:ok,m:req.length};}
  }
  if(row.status==='waiting'||(!a&&nextUp)){const l=J(nextUp.content)||{};row.status='waiting';row.topic=l.topic||null;row.lessonId=l.lessonId||null;row.stage=null;row.stageIndex=0;row.task=null;row.followup=nextUp.kind==='followup';row.since=Number(nextUp.created);}
  if(childBreak&&row.status!=='break'){row.status='break';row.since=cbs;}
  if(help){row.status='help';row.since=Number(help.created);}
  rows.push(row);}
 // A card the teacher just answered with "Видел, иду" keeps its place for a while instead of jumping away.
 const rank=r=>(PULSE_ORDER[r.status]??9)-(r.status==='working'&&r.struggling?1:0)-(r.comingAt&&r.status!=='help'?2.5:0);
 rows.sort((x,y)=>rank(x)-rank(y)||String(x.label).localeCompare(String(y.label)));
 return [200,{now:t,students:rows,counts:Object.fromEntries(Object.keys(PULSE_ORDER).map(k=>[k,rows.filter(r=>r.status===k).length]))}];
}
