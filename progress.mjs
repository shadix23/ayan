// Lesson versions, attempts and idempotent answers (stage 1 of brief/EdTech_Claude_Handoff).
// Works with the same tiny `query(sql, params)` helper on SQLite and Postgres.
// Invariants:
//  - a published lesson version never changes; an attempt is graded against the version it started on;
//  - the owner of an attempt always comes from the server session, never from the request;
//  - an answer is keyed by child + attempt + task + submission; a replay returns the stored result,
//    different content under the same key is rejected; completion cannot be undone by a late answer;
//  - a blank answer is "no answer" (400), not a wrong answer.
import crypto from 'node:crypto';
import {addColumn} from './db-util.mjs';
import Answer from './dist/answer-check.js';
import Fractions from './dist/games/fractions.js';
// Lesson games graded on the server. The client only renders and sends the selection.
const GAMES={[Fractions.id]:Fractions};

const ID=/^[A-Za-z0-9_-]{8,64}$/, TASK=/^[a-z0-9_-]{1,40}$/;
export const FINAL_TASK='final';

export async function migrate(query){
 await query('CREATE TABLE IF NOT EXISTS ayan_lesson_versions (id TEXT PRIMARY KEY, child TEXT NOT NULL, owner TEXT NOT NULL, version INTEGER NOT NULL, content TEXT NOT NULL, created BIGINT NOT NULL)');
 await query('CREATE TABLE IF NOT EXISTS ayan_attempts (id TEXT PRIMARY KEY, child TEXT NOT NULL, lesson_version TEXT NOT NULL, locale TEXT NOT NULL, state TEXT NOT NULL, started BIGINT NOT NULL, completed BIGINT)');
 await query('CREATE TABLE IF NOT EXISTS ayan_submissions (id TEXT PRIMARY KEY, attempt TEXT NOT NULL, child TEXT NOT NULL, task TEXT NOT NULL, submission TEXT NOT NULL, answer TEXT NOT NULL, evaluation TEXT NOT NULL, answer_key_version INTEGER NOT NULL, saved BIGINT NOT NULL)');
 for(const col of ['lesson_version','attempt'])await addColumn(query,'ayan_events',col,'TEXT');
 await addColumn(query,'ayan_submissions','assisted','INTEGER');
 // Backfill: lessons published before versions existed become version 1 of themselves.
 const old=await query('SELECT l.child,l.content,c.owner FROM ayan_lessons l JOIN ayan_children c ON c.id=l.child');
 for(const row of old){const lesson=JSON.parse(row.content);if(lesson.version)continue;
  lesson.id=lesson.id||crypto.randomUUID();lesson.version=1;lesson.answerKeyVersion=1;
  await query('INSERT INTO ayan_lesson_versions (id,child,owner,version,content,created) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[lesson.id,row.child,row.owner,1,JSON.stringify(lesson),Number(lesson.approvedAt)||Date.now()]);
  await query('UPDATE ayan_lessons SET content=? WHERE child=?',[JSON.stringify(lesson),row.child]);}
}

export function validateLesson(input){
 if(input.game){if(!GAMES[input.game]||!input.title||!Array.isArray(input.steps)||input.steps.length<1||input.steps.length>12||input.steps.some(s=>typeof s!=='string'||!s.trim()||s.length>2000))return false;return true;}
 if(!input.title||!Array.isArray(input.steps)||input.steps.length<1||input.steps.length>12||input.steps.some(s=>typeof s!=='string'||!s.trim()||s.length>2000)||!String(input.question||'').trim()||!String(input.answer||'').trim())return false;
 return true;
}

// Publishing always creates a new immutable version. The answer key version only grows when the key changes.
export async function publish(query,{child,owner,input}){
 const prev=(await query('SELECT content FROM ayan_lessons WHERE child=?',[child]))[0];const before=prev?JSON.parse(prev.content):null;
 const max=(await query('SELECT MAX(version) AS v FROM ayan_lesson_versions WHERE child=?',[child]))[0];
 const version=(Number(max?.v)||0)+1,game=GAMES[input.game]||null,answer=game?null:String(input.answer).trim().slice(0,200);
 const answerKeyVersion=game?game.lesson.keyVersion:before&&before.answer===answer?(before.answerKeyVersion||1):((before?.answerKeyVersion||0)+1);
 const lesson={id:crypto.randomUUID(),version,answerKeyVersion,title:String(input.title).slice(0,160),steps:input.steps.map(s=>String(s).slice(0,2000)),question:game?null:String(input.question).slice(0,1000),answer,game:game?game.id:undefined,tasks:game?game.TASKS.map(t=>t.id):undefined,locale:input.locale==='kk'?'kk':'ru',approvedAt:Date.now()};
 await query('INSERT INTO ayan_lesson_versions (id,child,owner,version,content,created) VALUES (?,?,?,?,?,?)',[lesson.id,child,owner,version,JSON.stringify(lesson),lesson.approvedAt]);
 await query('INSERT INTO ayan_lessons (child,content) VALUES (?,?) ON CONFLICT(child) DO UPDATE SET content=excluded.content',[child,JSON.stringify(lesson)]);
 return lesson;
}

async function current(query,child){const row=(await query('SELECT content FROM ayan_lessons WHERE child=?',[child]))[0];return row?JSON.parse(row.content):null;}
async function versionContent(query,id){const row=(await query('SELECT content FROM ayan_lesson_versions WHERE id=?',[id]))[0];return row?JSON.parse(row.content):null;}

async function attemptView(query,child,id){
 const a=(await query('SELECT id,lesson_version,locale,state,started,completed FROM ayan_attempts WHERE id=? AND child=?',[id,child]))[0];if(!a)return null;
 const subs=await query('SELECT task,submission,answer,evaluation,saved,assisted FROM ayan_submissions WHERE attempt=? AND child=? ORDER BY saved',[id,child]);
 return {id:a.id,lessonVersion:a.lesson_version,locale:a.locale,state:a.state,startedAt:Number(a.started),completedAt:a.completed?Number(a.completed):null,
  submissions:subs.map(s=>({taskId:s.task,submissionId:s.submission,answer:s.answer,evaluation:s.evaluation,savedAt:Number(s.saved),assisted:Number(s.assisted)===1}))};
}

// Lesson as the child sees it: no answer key, plus where to continue.
export async function childLesson(query,child){
 const lesson=await current(query,child);if(!lesson)return null;delete lesson.answer;
 const open=(await query('SELECT id FROM ayan_attempts WHERE child=? AND lesson_version=? AND state=? ORDER BY started DESC LIMIT 1',[child,lesson.id,'in_progress']))[0];
 if(open){lesson.attemptId=open.id;
  const last=(await query('SELECT value FROM ayan_events WHERE child=? AND attempt=? AND kind=? ORDER BY created DESC LIMIT 1',[child,open.id,'step']))[0];
  const n=Number(last?.value);if(n>1&&n<=lesson.steps.length+1)lesson.resume=n;}
 const done=(await query('SELECT id FROM ayan_attempts WHERE child=? AND lesson_version=? AND state=? LIMIT 1',[child,lesson.id,'completed']))[0];
 if(done)lesson.completedAttempt=done.id;
 return lesson;
}

export async function startAttempt(query,child,input){
 const id=String(input.attemptId||''),lessonVersion=String(input.lessonVersion||'');
 if(!ID.test(id))return {status:400,data:{code:'bad_request',error:'attemptId'}};
 const lesson=await current(query,child);
 if(!lesson||lesson.id!==lessonVersion){const existing=await attemptView(query,child,id);if(existing)return {status:200,data:existing};return {status:409,data:{code:'lesson_changed',error:'Урок обновился'}};}
 await query('INSERT INTO ayan_attempts (id,child,lesson_version,locale,state,started) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[id,child,lesson.id,input.locale==='kk'?'kk':'ru','in_progress',Date.now()]);
 const view=await attemptView(query,child,id);
 return view?{status:200,data:view}:{status:404,data:{code:'not_found'}}; // id taken by someone else: do not reveal it
}

export async function getAttempt(query,child,id){const view=ID.test(String(id||''))?await attemptView(query,child,String(id)):null;return view?{status:200,data:view}:{status:404,data:{code:'not_found'}};}

export async function submit(query,child,input){
 const attemptId=String(input.attemptId||''),taskId=String(input.taskId||FINAL_TASK),submissionId=String(input.submissionId||''),assisted=input.assisted===true?1:0;let answer=String(input.answer??'').trim().slice(0,200);
 if(!ID.test(attemptId)||!ID.test(submissionId)||!TASK.test(taskId))return {status:400,data:{code:'bad_request'}};
 if(!answer)return {status:400,data:{code:'empty',error:'Нет ответа'}};
 const attempt=(await query('SELECT id,lesson_version,state FROM ayan_attempts WHERE id=? AND child=?',[attemptId,child]))[0];
 if(!attempt)return {status:404,data:{code:'not_found'}};
 const key=[child,attemptId,taskId,submissionId].join(':');
 // V2 lessons are graded only by /api/v2/child/submit (own evaluator and storage). A V2 attempt sent here would be stored as a made-up "incorrect".
 {const l0=await versionContent(query,attempt.lesson_version);if(l0?.v2)return {status:409,data:{code:'wrong_contract',error:'Этот урок проверяется другим способом'}};const g0=l0?.game?GAMES[l0.game]:null;if(g0){const n=g0.normalize(taskId,answer);if(n!==null)answer=n;}}
 const stored=async()=>(await query('SELECT answer,evaluation,saved FROM ayan_submissions WHERE id=?',[key]))[0];
 const result=async(row,replay)=>({status:200,data:{saved:true,replay,submissionId,taskId,evaluation:row.evaluation,savedAt:Number(row.saved),attempt:await attemptView(query,child,attemptId)}});
 let row=await stored();
 if(row){if(row.answer!==answer)return {status:409,data:{code:'conflict',error:'Под этим ключом уже сохранён другой ответ'}};const out=await result(row,true);const l1=await versionContent(query,attempt.lesson_version);if(l1?.game&&row.evaluation!=='correct')out.data.reason=GAMES[l1.game].evaluate(taskId,row.answer).reason;return out;}
 if(attempt.state==='completed')return {status:409,data:{code:'completed',attempt:await attemptView(query,child,attemptId)}};
 const lesson=await versionContent(query,attempt.lesson_version);if(!lesson)return {status:409,data:{code:'lesson_missing'}};
 const game=lesson.game?GAMES[lesson.game]:null;let evaluation,reason=null;
 if(game){const norm=game.normalize(taskId,answer);if(norm===null)return {status:400,data:{code:'invalid',error:'Неверный формат ответа'}};const r=game.evaluate(taskId,norm);evaluation=r.correct?'correct':'incorrect';reason=r.reason;}
 else{if(taskId!==FINAL_TASK)return {status:400,data:{code:'bad_request'}};evaluation=Answer.matches(answer,lesson.answer)?'correct':'incorrect';}
 const now=Date.now();
 await query('INSERT INTO ayan_submissions (id,attempt,child,task,submission,answer,evaluation,answer_key_version,saved,assisted) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[key,attemptId,child,taskId,submissionId,answer,evaluation,lesson.answerKeyVersion||1,now,assisted]);
 row=await stored();
 if(row.answer!==answer)return {status:409,data:{code:'conflict'}}; // a parallel request won with different content
 // Completion: question lessons - one correct answer; game lessons - every task has a correct answer.
 let complete=row.evaluation==='correct';
 if(complete&&game){const ok=new Set((await query('SELECT task FROM ayan_submissions WHERE attempt=? AND child=? AND evaluation=?',[attemptId,child,'correct'])).map(r=>r.task));complete=game.TASKS.every(t=>ok.has(t.id));}
 if(complete)await query('UPDATE ayan_attempts SET state=?,completed=? WHERE id=? AND child=? AND state<>?',['completed',now,attemptId,child,'completed']);
 // Timeline event for the parent report. Deterministic id, so a replay or a race never adds a second one.
 await query('INSERT INTO ayan_events (id,child,lesson,kind,value,created,lesson_version,attempt) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',['sub:'+key,child,lesson.title,'answer',row.evaluation==='correct'?'correct':'retry',Number(row.saved),lesson.id,attemptId]);
 const out=await result(row,false);if(reason&&row.evaluation!=='correct')out.data.reason=reason;return out;
}

// Step / hint / pause. Validated and tied to the lesson version and attempt.
export async function recordEvent(query,child,input){
 if(!['step','hint','pause'].includes(input.kind))return {status:400,data:{code:'bad_event',error:input.kind==='answer'?'Ответы отправляются через /api/attempt/submit':'Неверное событие'}};
 const lesson=await current(query,child);if(!lesson)return {status:404,data:{code:'no_lesson'}};
 let attempt=null;
 if(input.attemptId){attempt=(await query('SELECT id,lesson_version FROM ayan_attempts WHERE id=? AND child=?',[String(input.attemptId),child]))[0];if(!attempt)return {status:404,data:{code:'not_found'}};}
 let value='';
 if(input.kind==='step'){const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>lesson.steps.length+1)return {status:400,data:{code:'bad_step'}};value=String(n);}
 await query('INSERT INTO ayan_events (id,child,lesson,kind,value,created,lesson_version,attempt) VALUES (?,?,?,?,?,?,?,?)',[crypto.randomUUID(),child,lesson.title,input.kind,value,Date.now(),attempt?.lesson_version||lesson.id,attempt?.id||null]);
 return {status:200,data:{value}};
}

// Parent report events with the lesson version number, so two versions of one topic do not merge.
export async function reportEvents(query,child){
 const events=await query('SELECT lesson,kind,value,created,lesson_version FROM ayan_events WHERE child=? AND kind<>? ORDER BY created DESC',[child,'assistant']);
 const versions=new Map((await query('SELECT id,version FROM ayan_lesson_versions WHERE child=?',[child])).map(v=>[v.id,Number(v.version)]));
 return events.map(e=>({lesson:e.lesson,kind:e.kind,value:e.value,created:Number(e.created),version:versions.get(e.lesson_version)||null}));
}

// Ends a child's access without deleting learning history: sessions, invites and parent links go away.
export async function revokeChild(query,child){
 await query('DELETE FROM ayan_child_sessions WHERE child=?',[child]);
 await query('DELETE FROM ayan_invites WHERE child=?',[child]);
 await query('DELETE FROM ayan_parent_links WHERE child=?',[child]);
}
