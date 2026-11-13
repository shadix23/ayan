// Isolated, browser-local sample data. No accounts, cookies or live learner records.
// Mirrors the server contracts (progress.mjs): lesson versions, attempts, idempotent answers.
const key='ayan.demo.workspace.v4';
const DAY=86400000,T='Сложение: 2 + 3',V='demo-lesson';
const ev=(ago,kind,value='')=>({lesson:T,kind,value,created:Date.now()-ago,lessonVersion:V,attempt:'demo-past'});
const ob=(days,topic,help,result,discomfort=false)=>({t:Date.now()-days*DAY-3600000,topic,help,result,discomfort,kitHash:null,student:'demo-student'});
// Sample history for the demo: three short sessions and nine teacher observations of the sample student.
const demoEvents=()=>[ev(2*DAY+900000,'step','1'),ev(2*DAY+780000,'step','2'),ev(2*DAY+660000,'hint'),ev(2*DAY+540000,'answer','retry'),ev(2*DAY+420000,'pause'),ev(DAY+840000,'step','1'),ev(DAY+720000,'step','2'),ev(DAY+600000,'step','3'),ev(DAY+480000,'hint'),ev(DAY+360000,'answer','correct'),ev(900000,'step','1'),ev(780000,'step','2'),ev(660000,'step','3'),ev(540000,'step','4'),ev(420000,'answer','correct')];
const demoTeacher=()=>({lang:'ru',size:0,view:'home',settings:{},observations:[ob(6,'add100','adult','partial',true),ob(5,'add100','adult','done'),ob(4,'sub100','hint','partial'),ob(4,'add100','hint','done'),ob(3,'word1','adult','done'),ob(2,'add100','hint','done'),ob(2,'time','none','refused',true),ob(1,'add100','hint','done'),ob(0,'add100','none','done')]});
const m01=()=>({id:'demo-m01',version:2,answerKeyVersion:1,title:'Равные доли: одна четверть',steps:['Разделим круг на четыре равные части.','Одна такая часть - одна четверть.','Если части не равны, любая одна из них не обязательно четверть.'],question:null,answer:null,game:'fractions-m01',tasks:['m01-t1','m01-t2','m01-t3'],locale:'ru',approvedAt:Date.now()-DAY/2});
const firstLesson=()=>({id:V,version:1,answerKeyVersion:1,title:T,steps:['Посмотри: у тебя два яблока. ● ●','Добавь ещё три яблока. ● ● + ● ● ●','Теперь посчитай все яблоки вместе: 1, 2, 3, 4, 5.','Два и три вместе - это пять. Запишем: 2 + 3 = 5.'],question:'Сколько будет 2 + 3?',answer:'5',locale:'ru',approvedAt:Date.now()-3*DAY});
const initial=()=>{const old=firstLesson(),lesson=m01();return {lesson,versions:{[old.id]:old,[lesson.id]:lesson},attempts:{},submissions:{},state:{version:2,enabled:['pairs','sequence','sort','pack','pattern','puzzle','listen','route','garden'],completed:['sequence','pairs'],garden:[0,null,1],motion:true},events:demoEvents(),children:[{id:'demo-student',label:'Саша'}],teacher:demoTeacher()};};
function load(){try{return JSON.parse(localStorage.getItem(key))||initial();}catch{return initial();}}
function save(x){localStorage.setItem(key,JSON.stringify(x));}
const fail=(status,code,error)=>{const e=Error(error||code);e.status=status;e.code=code;throw e;};
const ID=/^[A-Za-z0-9_-]{8,64}$/;
function view(d,id){const a=d.attempts[id];if(!a)return null;return {...a,submissions:Object.values(d.submissions).filter(s=>s.attemptId===id).sort((x,y)=>x.savedAt-y.savedAt)};}
const matches=(answer,key)=>{const A=globalThis.AyanAnswer;return A?A.matches(answer,key):String(answer).trim()===String(key).trim();};
export async function request(url,data,method){
 const d=load(),u=new URL(url,location.origin),p=u.pathname;
 if(p==='/api/me')return {id:'demo-'+u.searchParams.get('role'),label:'Саша',name:'Учитель',role:u.searchParams.get('role')};
 if(p==='/api/children'){if(data){const c={id:'demo-'+Date.now(),label:data.label};d.children.push(c);save(d);return c;}return d.children;}
 if(p==='/api/children/revoke')return {ok:true};
 if(p==='/api/support'){const base={lang:'ru',textSize:'normal',captions:true,sound:true,motion:true,pace:'normal',input:'buttons',repeatInstruction:false};d.support=d.support||{};const who=u.searchParams.get('role')==='child'?'demo-student':(u.searchParams.get('child')||'demo-student');
  if(data){const allowed=u.searchParams.get('role')==='child'?['lang','textSize','captions','sound','motion']:Object.keys(base);const next={...base,...(d.support[who]||{})};for(const k of allowed)if(data[k]!==undefined&&typeof data[k]===typeof base[k])next[k]=data[k];d.support[who]=next;save(d);}
  return {...base,...(d.support[who]||{})};}
 if(p==='/api/video/progress'){d.views=d.views||{};if(!data)return Object.values(d.views);const k=data.videoId+':'+data.version,old=d.views[k]||{seconds:0,completed:false};d.views[k]={videoId:data.videoId,version:data.version,seconds:Math.max(old.seconds,Number(data.seconds)||0),duration:Number(data.duration)||0,completed:old.completed||data.completed===true,updated:Date.now()};save(d);return d.views[k];}
 if(p==='/api/state'){const teacher=u.searchParams.get('role')==='teacher'&&!u.searchParams.has('child');if(data){if(teacher)d.teacher=data;else d.state=data;save(d);}return teacher?d.teacher:d.state;}
 if(p==='/api/lesson'){
  if(data){const prev=d.lesson,answer=String(data.answer??'').trim();const version=Math.max(...Object.values(d.versions).map(v=>v.version))+1;
   const game=data.game==='fractions-m01'?data.game:null;const lesson={...data,id:'demo-v'+version+'-'+Date.now(),version,answerKeyVersion:game?1:(prev.answer===answer?prev.answerKeyVersion:(prev.answerKeyVersion||0)+1),answer:game?null:answer,question:game?null:data.question,game:game||undefined,tasks:game?['m01-t1','m01-t2','m01-t3']:undefined,approvedAt:Date.now()};
   d.lesson=lesson;d.versions[lesson.id]=lesson;save(d);return lesson;}
  const lesson={...d.lesson};if(u.searchParams.get('role')!=='child')return lesson;
  delete lesson.answer;
  const open=Object.values(d.attempts).filter(a=>a.lessonVersion===lesson.id&&a.state==='in_progress').sort((a,b)=>b.startedAt-a.startedAt)[0];
  if(open){lesson.attemptId=open.id;const last=d.events.filter(e=>e.attempt===open.id&&e.kind==='step').pop();const n=Number(last?.value);if(n>1&&n<=lesson.steps.length+1)lesson.resume=n;}
  const done=Object.values(d.attempts).find(a=>a.lessonVersion===lesson.id&&a.state==='completed');if(done)lesson.completedAttempt=done.id;
  return lesson;}
 if(p==='/api/attempt'&&!data){const v=view(d,u.searchParams.get('id'));if(!v)fail(404,'not_found');return v;}
 if(p==='/api/attempt'){
  const id=String(data.attemptId||'');if(!ID.test(id))fail(400,'bad_request');
  if(d.attempts[id])return view(d,id);
  if(data.lessonVersion!==d.lesson.id)fail(409,'lesson_changed');
  d.attempts[id]={id,lessonVersion:d.lesson.id,locale:data.locale==='kk'?'kk':'ru',state:'in_progress',startedAt:Date.now(),completedAt:null};save(d);return view(d,id);}
 if(p==='/api/attempt/submit'){
  const a=d.attempts[data.attemptId],task=String(data.taskId||'final'),sub=String(data.submissionId||'');let answer=String(data.answer??'').trim();
  const L0=a&&d.versions[a.lessonVersion],G=globalThis.AyanFractions;if(L0?.game&&G){const n=G.normalize(task,answer);if(answer&&n===null)fail(400,'invalid');if(n!==null)answer=n;}
  if(!ID.test(sub))fail(400,'bad_request');if(!answer)fail(400,'empty');if(!a)fail(404,'not_found');
  const k=[a.id,task,sub].join(':'),old=d.submissions[k];
  const out=(s,replay)=>({saved:true,replay,submissionId:sub,taskId:task,evaluation:s.evaluation,savedAt:s.savedAt,attempt:view(d,a.id)});
  if(old){if(old.answer!==answer)fail(409,'conflict');return out(old,true);}
  if(a.state==='completed'){const e=Error('completed');e.status=409;e.code='completed';e.data={attempt:view(d,a.id)};throw e;}
  const lesson=d.versions[a.lessonVersion];let evaluation,reason=null;if(lesson.game){const r=G.evaluate(task,answer);evaluation=r.correct?'correct':'incorrect';reason=r.reason;}else evaluation=matches(answer,lesson.answer)?'correct':'incorrect';
  const s={attemptId:a.id,taskId:task,submissionId:sub,answer,evaluation,answerKeyVersion:lesson.answerKeyVersion,savedAt:Date.now(),assisted:data.assisted===true};d.submissions[k]=s;
  let complete=evaluation==='correct';if(complete&&lesson.game){const ok=new Set(Object.values(d.submissions).filter(x=>x.attemptId===a.id&&x.evaluation==='correct').map(x=>x.taskId));complete=G.TASKS.every(t=>ok.has(t.id));}
  if(complete){a.state='completed';a.completedAt=s.savedAt;}
  d.events.push({lesson:lesson.title,kind:'answer',value:evaluation==='correct'?'correct':'retry',created:s.savedAt,lessonVersion:lesson.id,attempt:a.id});save(d);const o=out(s,false);if(reason&&evaluation!=='correct')o.reason=reason;return o;}
 if(p==='/api/lesson/event'){
  if(!['step','hint','pause'].includes(data.kind))fail(400,'bad_event');
  let value='';if(data.kind==='step'){const n=Number(data.value);if(!Number.isInteger(n)||n<1||n>d.lesson.steps.length+1)fail(400,'bad_step');value=String(n);}
  const a=data.attemptId?d.attempts[data.attemptId]:null;if(data.attemptId&&!a)fail(404,'not_found');
  d.events.push({lesson:d.lesson.title,kind:data.kind,value,created:Date.now(),lessonVersion:a?.lessonVersion||d.lesson.id,attempt:a?.id||null});save(d);return {value};}
 if(p==='/api/invite')return {url:location.origin+'/demo/child'};
 if(p==='/api/parent/invite')return {url:location.origin+'/demo/parent'};
 if(p==='/api/parent/report')return {label:d.children[0].label,games:d.state.completed,lesson:d.lesson.title,events:d.events.slice().reverse().map(e=>({...e,version:d.versions[e.lessonVersion]?.version||null}))};
 if(p==='/api/assistant'){const e=Error('В демо показан учебный сценарий. Для настоящего ответа ИИ войдите в личный кабинет.');e.code='demo';throw e;}
 throw Error('Это действие недоступно в демонстрации');
}
