// Demo seed for the LOCAL synthetic database only (AYAN_DEMO=1 -> .data/demo.sqlite). Every name and result here is
// synthetic and marked demo; none of it is a real child's result. Test passwords below exist only for this local demo.
import crypto from 'node:crypto';
import * as Learning from './learning.mjs';
import * as Support from './support.mjs';
export const DEMO_ACCOUNTS=[
 {as:'teacher-a',role:'teacher',label:'Учитель A (демо)',org:'A',email:'teacher-a@demo.ayan.test',password:'demo-teacher-a-2026'},
 {as:'admin-a',role:'admin',label:'Администратор A (демо)',org:'A',email:'admin-a@demo.ayan.test',password:'demo-admin-a-2026'},
 {as:'teacher-b',role:'teacher',label:'Учитель B (демо)',org:'B',email:'teacher-b@demo.ayan.test',password:'demo-teacher-b-2026'},
 {as:'admin-b',role:'admin',label:'Администратор B (демо)',org:'B',email:'admin-b@demo.ayan.test',password:'demo-admin-b-2026'},
 {as:'student-01',role:'child',label:'Ученик 01 (демо)',org:'A'},
 {as:'student-02',role:'child',label:'Ученик 02 (демо)',org:'A'},
 {as:'student-03',role:'child',label:'Ученик 03 (демо)',org:'A'},
 {as:'student-b1',role:'child',label:'Ученик B1 (демо)',org:'B'},
 {as:'parent-01',role:'parent',label:'Родитель ученика 01 (демо)',org:'A'}
];
const PARENT_CODE='demo-parent-link-student-01';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const AUTH_TABLES=['"session"','"account"','"verification"','"rateLimit"','"user"'];
const OWN_TABLES=['ayan_orgs','ayan_members','ayan_entitlements','ayan_pilot_orders','ayan_assignments','ayan_learning_events','ayan_help_requests','ayan_notices','ayan_notes','ayan_task_versions','ayan_preview_submissions','ayan_quiz_answers',
 'ayan_children','ayan_invites','ayan_child_sessions','ayan_teacher_state','ayan_lessons','ayan_events','ayan_parent_links','ayan_lesson_versions','ayan_attempts','ayan_submissions','ayan_support','ayan_video_views'];

// The seed deletes the tables it fills, so it first proves that the database holds nothing but synthetic demo data:
// every adult account must be a demo account and every student must be marked demo. Otherwise it refuses, on the first
// seed as well as on reset.
async function assertDemoOnly(query){
 const users=await query('SELECT email FROM "user"');
 const foreign=users.filter(u=>!/@demo\.ayan\.test$/.test(String(u.email)));
 if(foreign.length)throw Error('Refusing to seed: the database has '+foreign.length+' account(s) that are not demo accounts');
 const kids=await query('SELECT COUNT(*) AS n FROM ayan_children WHERE demo IS NULL OR demo<>1');
 if(Number(kids[0]?.n)>0)throw Error('Refusing to seed: the database has students that are not marked demo');
}
export async function seedDemo({query,auth,reset}){
 if(process.env.AYAN_DEMO!=='1')throw Error('demo seed outside demo mode');
 await assertDemoOnly(query);
 if(!reset&&(await query("SELECT id FROM ayan_orgs WHERE id='demo-org-a'")).length)return;
 for(const t of [...OWN_TABLES,...AUTH_TABLES])try{await query('DELETE FROM '+t);}catch{/* table may not exist yet */}
 const users={};
 for(const a of DEMO_ACCOUNTS.filter(a=>a.email)){await auth.api.signUpEmail({body:{email:a.email,password:a.password,name:a.label}});users[a.as]=(await query('SELECT id FROM "user" WHERE email=?',[a.email]))[0].id;}
 const t=Date.now();
 await query('INSERT INTO ayan_orgs (id,name,demo,created) VALUES (?,?,?,?)',['demo-org-a','Демо-школа A',1,t]);
 await query('INSERT INTO ayan_orgs (id,name,demo,created) VALUES (?,?,?,?)',['demo-org-b','Демо-центр B',1,t]);
 for(const [as,org,role] of [['teacher-a','demo-org-a','teacher'],['admin-a','demo-org-a','admin'],['teacher-b','demo-org-b','teacher'],['admin-b','demo-org-b','admin']])
  await query('INSERT INTO ayan_members (user_id,org,role,created) VALUES (?,?,?,?)',[users[as],org,role,t]);
 // Org A runs an active test pilot (so the constructor episode works); org B is on the free demo plan.
 await query('INSERT INTO ayan_pilot_orders (id,org,created_by,plan,mode,status,idem_key,created,updated) VALUES (?,?,?,?,?,?,?,?,?)',['demo-order-a','demo-org-a',users['admin-a'],'school_pilot','local_mock','succeeded','demo-seed-order-a',t,t]);
 await query('INSERT INTO ayan_entitlements (org,plan,status,started,expires,order_id,updated) VALUES (?,?,?,?,?,?,?)',['demo-org-a','school_pilot','active',t,t+14*86400000,'demo-order-a',t]);
 const kids={};
 for(const [as,label,owner] of [['student-01','Ученик 01','teacher-a'],['student-02','Ученик 02','teacher-a'],['student-03','Ученик 03','teacher-a'],['student-b1','Ученик B1','teacher-b']]){
  const id='demo-'+as;kids[as]={id,label,demo:1};await query('INSERT INTO ayan_children (id,owner,label,state,demo) VALUES (?,?,?,?,?)',[id,users[owner],label,JSON.stringify({version:2,enabled:[],completed:[],garden:[],motion:true}),1]);}
 const mem=async as=>({user:{id:users[as]},mem:await Learning.member(query,{id:users[as]}),ent:await Learning.entitlement(query,(await Learning.member(query,{id:users[as]})).org)});
 const A=await mem('teacher-a'),B=await mem('teacher-b');
 const assignOne=async(ctx,child,op)=>(await Learning.assign(query,{...ctx,input:{opId:op,childIds:[child],lessonId:'math-fractions-01'}}))[1].assignments[0];
 const a1=await assignOne(A,kids['student-01'].id,'demo-assign-0001');
 const a2=await assignOne(A,kids['student-02'].id,'demo-assign-0002');
 const a3=await assignOne(A,kids['student-03'].id,'demo-assign-0003');
 await assignOne(B,kids['student-b1'].id,'demo-assign-0004');
 // Student 02: a complete synthetic session. 4 of 5 core tasks right first time, 2 hints on f2, a break, a technical error.
 const k2=kids['student-02'],att2='demo-attempt-student-02';
 await Learning.startAttempt(query,k2,{attemptId:att2,assignmentId:a2.id,locale:'ru'});
 const ev=(type,payload,task)=>Learning.events(query,k2,{events:[{eventId:crypto.randomUUID(),type,payload,attemptId:att2,taskId:task}]});
 const sub=(task,answer,n,hintLevel=0)=>Learning.submit(query,k2,{attemptId:att2,taskId:task,submissionId:'demo-sub-'+task+'-'+n,answer,hintLevel});
 await ev('view_changed',{fromMode:'3d',toMode:'2d'});await ev('explanation_mode_changed',{fromMode:'text',toMode:'picture'});
 await sub('f1','mark:0',1);await sub('f2','mark:0,1',1);await ev('hint_requested',{level:1},'f2');await ev('hint_requested',{level:2},'f2');await sub('f2','mark:1',2,2);await sub('f2-twin','mark:0',1);
 await ev('break_started',{stageId:'practice'});await ev('break_ended',{stageId:'practice'});
 await sub('f3','mark:0,2',1);await ev('technical_error',{safeCode:'network_timeout',operation:'submit',recoverable:true},'f4');await sub('f4','mark:0,1,2',1);await sub('f5','card:'+Learning.Core.cardsFor(Learning.Catalog.byId('math-fractions-01').tasks.find(x=>x.id==='f5')).find(c=>c.selected.length===1&&Learning.Core.isEqualPartition(c.parts)).id,1);
 await sub('c1','mark:2',1);await sub('c2','mark:0',1);await sub('c2','mark:1',2);
 await Support.saveProfile(query,k2.id,{preset:'calm',applyPreset:true,mascotVoice:false},'child');
 await Learning.addNote(query,A.user,{child:k2.id,text:'После примера выполнил следующее задание самостоятельно. (демо-запись)'});
 // Student 03: in practice, had a short break, then asked for help.
 const k3=kids['student-03'],att3='demo-attempt-student-03';
 await Learning.startAttempt(query,k3,{attemptId:att3,assignmentId:a3.id,locale:'ru'});
 await Learning.saveState(query,k3,{attemptId:att3,revision:0,stage:'practice',ui:{taskIndex:1},paused:false});
 await Learning.submit(query,k3,{attemptId:att3,taskId:'f1',submissionId:'demo-sub-03-f1',answer:'mark:1'});
 // The break is over (started and ended), so after "Видел, иду" the card goes back to "Занимается", not "На перерыве".
 await Learning.events(query,k3,{events:[{eventId:crypto.randomUUID(),type:'break_started',payload:{stageId:'practice'},attemptId:att3}]});
 await Learning.events(query,k3,{events:[{eventId:crypto.randomUUID(),type:'break_ended',payload:{stageId:'practice'},attemptId:att3}]});
 await query("UPDATE ayan_learning_events SET received=received-120000 WHERE attempt=? AND type='break_started'",[att3]);
 await Learning.saveState(query,k3,{attemptId:att3,revision:1,stage:'practice',ui:{taskIndex:1},paused:false});
 await Learning.help(query,k3,{requestId:crypto.randomUUID(),phraseId:'help',attemptId:att3,stage:'practice'});
 // Student 01: the live demo starts here (no comfort preset yet, so the first-visit choice appears). The path behind it is
 // synthetic: "Органы растения" started 4 days ago, continued 2 days ago and finished yesterday (so "Дни со светом" has three
 // lit days and today is still dark); "Равные доли" waits; "Сравнение долей" comes next.
 const k1=kids['student-01'],DAY=86400000,att1='demo-attempt-student-01-bio';
 const bio=(await Learning.assign(query,{...A,input:{opId:'demo-assign-0101',childIds:[k1.id],lessonId:'bio-plants-01'}}))[1].assignments[0];
 const next1=(await Learning.assign(query,{...A,input:{opId:'demo-assign-0102',childIds:[k1.id],lessonId:'math-fractions-02'}}))[1].assignments[0];
 await query('UPDATE ayan_assignments SET created=? WHERE id=?',[t-5*DAY,bio.id]);await query('UPDATE ayan_assignments SET created=? WHERE id=?',[t-3600000,a1.id]);await query('UPDATE ayan_assignments SET created=? WHERE id=?',[t-1800000,next1.id]);
 await Learning.startAttempt(query,k1,{attemptId:att1,assignmentId:bio.id,locale:'ru'});
 const sub1=(task,answer,n)=>Learning.submit(query,k1,{attemptId:att1,taskId:task,submissionId:'demo-sub-01-'+task+'-'+n,answer,hintLevel:0});
 await sub1('p1','choice:root',1);await sub1('p2','choice:leaf',1);await sub1('p3','choice:root',1);await sub1('p3','choice:stem',2);await sub1('p4','choice:root',1);
 await sub1('p5','match:root=w;stem=t;leaf=f',1);await sub1('pc','choice:stem',1);
 const when={p1:-4,p2:-4,p3:-2,p4:-2,p5:-1,pc:-1};const at=(d,h)=>t+d*DAY-h*3600000;
 for(const [task,d] of Object.entries(when)){await query('UPDATE ayan_submissions SET saved=? WHERE attempt=? AND task=?',[at(d,3),att1,task]);await query('UPDATE ayan_learning_events SET received=? WHERE attempt=? AND task=?',[at(d,3),att1,task]);}
 await query("UPDATE ayan_learning_events SET received=? WHERE attempt=? AND type IN ('lesson_started','stage_changed')",[at(-4,4),att1]);
 await query("UPDATE ayan_learning_events SET received=? WHERE attempt=? AND type='lesson_completed'",[at(-1,3),att1]);
 await query('UPDATE ayan_attempts SET started=?,completed=? WHERE id=?',[at(-4,4),at(-1,3),att1]);
 await query('INSERT INTO ayan_parent_links (token,child,expires) VALUES (?,?,?)',[hash(PARENT_CODE),kids['student-01'].id,t+30*86400000]);
}
export async function demoLogin({query,auth,as,hash:h,origin}){
 const acc=DEMO_ACCOUNTS.find(a=>a.as===as);if(!acc)return null;
 if(acc.email){const r=await auth.api.signInEmail({body:{email:acc.email,password:acc.password},asResponse:true});return {cookies:r.headers.getSetCookie(),go:'/teacher'};}
 if(acc.role==='parent')return {cookies:[],go:'/parent#'+PARENT_CODE};
 const token=crypto.randomBytes(32).toString('hex');await query('INSERT INTO ayan_child_sessions (token,child,expires) VALUES (?,?,?)',[h(token),'demo-'+as,Date.now()+86400000]);
 return {cookies:[`ayan_child=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${origin.startsWith('https:')?'; Secure':''}`],go:'/child'};
}
