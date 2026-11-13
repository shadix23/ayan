// Isolated, browser-local sample data. No accounts, cookies or live learner records.
const key='ayan.demo.workspace.v2';
const DAY=86400000,T='Сложение: 2 + 3';
const ev=(ago,kind,value='')=>({lesson:T,kind,value,created:Date.now()-ago});
const ob=(days,topic,help,result,discomfort=false)=>({t:Date.now()-days*DAY-3600000,topic,help,result,discomfort,kitHash:null});
// Sample history for the demo: three short sessions and nine teacher observations.
const demoEvents=()=>[ev(2*DAY+900000,'step','1'),ev(2*DAY+780000,'step','2'),ev(2*DAY+660000,'hint'),ev(2*DAY+540000,'answer','retry'),ev(2*DAY+420000,'pause'),ev(DAY+840000,'step','1'),ev(DAY+720000,'step','2'),ev(DAY+600000,'step','3'),ev(DAY+480000,'hint'),ev(DAY+360000,'answer','correct'),ev(900000,'step','1'),ev(780000,'step','2'),ev(660000,'step','3'),ev(540000,'step','4'),ev(420000,'answer','correct')];
const demoTeacher=()=>({lang:'ru',size:0,view:'home',settings:{},observations:[ob(6,'add100','adult','partial',true),ob(5,'add100','adult','done'),ob(4,'sub100','hint','partial'),ob(4,'add100','hint','done'),ob(3,'word1','adult','done'),ob(2,'add100','hint','done'),ob(2,'time','none','refused',true),ob(1,'add100','hint','done'),ob(0,'add100','none','done')]});
const initial=()=>({lesson:{id:'demo-lesson',title:'Сложение: 2 + 3',steps:['Посмотри: у тебя два яблока. ● ●','Добавь ещё три яблока. ● ● + ● ● ●','Теперь посчитай все яблоки вместе: 1, 2, 3, 4, 5.','Два и три вместе - это пять. Запишем: 2 + 3 = 5.'],question:'Сколько будет 2 + 3?',answer:'5',approvedAt:Date.now()},state:{version:2,enabled:['pairs','sequence','sort','pack','pattern','puzzle','listen','route','garden'],completed:['sequence','pairs'],garden:[0,null,1],motion:true},events:demoEvents(),children:[{id:'demo-student',label:'Саша'}],teacher:demoTeacher()});
function load(){try{return JSON.parse(localStorage.getItem(key))||initial();}catch{return initial();}}
function save(x){localStorage.setItem(key,JSON.stringify(x));}
export async function request(url,data,method){
 const d=load(),u=new URL(url,location.origin),p=u.pathname;
 if(p==='/api/me')return {id:'demo-'+u.searchParams.get('role'),label:'Саша',name:'Учитель',role:u.searchParams.get('role')};
 if(p==='/api/children'){if(data){const c={id:'demo-'+Date.now(),label:data.label};d.children.push(c);save(d);return c;}return d.children;}
 if(p==='/api/state'){const teacher=u.searchParams.get('role')==='teacher'&&!u.searchParams.has('child');if(data){if(teacher)d.teacher=data;else d.state=data;save(d);}return teacher?d.teacher:d.state;}
 if(p==='/api/lesson'){if(data){d.lesson={...data,id:'demo-'+Date.now(),approvedAt:Date.now()};save(d);}const lesson={...d.lesson};if(u.searchParams.get('role')==='child'){delete lesson.answer;const last=d.events.filter(e=>e.lesson===lesson.title&&e.kind==='step'&&e.created>=(lesson.approvedAt||0)).pop();const n=Number(last?.value);if(n>1&&n<=lesson.steps.length+1)lesson.resume=n;}return lesson;}
 if(p==='/api/lesson/event'){let value=data.value;if(data.kind==='answer'){const A=globalThis.AyanAnswer;value=(A?A.matches(value,d.lesson.answer):String(value).trim()===d.lesson.answer)?'correct':'retry';}d.events.push({lesson:d.lesson.title,kind:data.kind,value,created:Date.now()});save(d);return {value};}
 if(p==='/api/invite')return {url:location.origin+'/demo/child'};
 if(p==='/api/parent/invite')return {url:location.origin+'/demo/parent'};
 if(p==='/api/parent/report')return {label:d.children[0].label,games:d.state.completed,lesson:d.lesson.title,events:d.events.slice().reverse()};
 if(p==='/api/assistant'){const e=Error('В демо показан учебный сценарий. Для настоящего ответа ИИ войдите в личный кабинет.');e.code='demo';throw e;}
 throw Error('Это действие недоступно в демонстрации');
}
