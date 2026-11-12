// Isolated, browser-local sample data. No accounts, cookies or live learner records.
const key='ayan.demo.workspace.v1';
const initial=()=>({lesson:{id:'demo-lesson',title:'Сложение: 2 + 3',steps:['Посмотри: у тебя два яблока. ● ●','Добавь ещё три яблока. ● ● + ● ● ●','Теперь посчитай все яблоки вместе: 1, 2, 3, 4, 5.','Два и три вместе — это пять. Запишем: 2 + 3 = 5.'],question:'Сколько будет 2 + 3?',answer:'5'},state:{version:2,enabled:['pairs','sequence','sort','pack','pattern','puzzle','listen','route','garden'],completed:['sequence','pairs'],garden:[0,null,1],motion:true},events:[{lesson:'Сложение: 2 + 3',kind:'step',value:'1',created:Date.now()-3600000},{lesson:'Сложение: 2 + 3',kind:'hint',value:'',created:Date.now()-3500000},{lesson:'Сложение: 2 + 3',kind:'answer',value:'correct',created:Date.now()-3400000}],children:[{id:'demo-student',label:'Саша · пример ученика'}],teacher:null});
function load(){try{return JSON.parse(localStorage.getItem(key))||initial();}catch{return initial();}}
function save(x){localStorage.setItem(key,JSON.stringify(x));}
export async function request(url,data,method){
 const d=load(),u=new URL(url,location.origin),p=u.pathname;
 if(p==='/api/me')return {id:'demo-'+u.searchParams.get('role'),label:'Саша',name:'Учитель',role:u.searchParams.get('role')};
 if(p==='/api/children'){if(data){const c={id:'demo-'+Date.now(),label:data.label};d.children.push(c);save(d);return c;}return d.children;}
 if(p==='/api/state'){const teacher=u.searchParams.get('role')==='teacher'&&!u.searchParams.has('child');if(data){if(teacher)d.teacher=data;else d.state=data;save(d);}return teacher?d.teacher:d.state;}
 if(p==='/api/lesson'){if(data){d.lesson={...data,id:'demo-'+Date.now()};save(d);}const lesson={...d.lesson};if(u.searchParams.get('role')==='child')delete lesson.answer;return lesson;}
 if(p==='/api/lesson/event'){let value=data.value;if(data.kind==='answer')value=String(value).trim()===d.lesson.answer?'correct':'retry';d.events.push({lesson:d.lesson.title,kind:data.kind,value,created:Date.now()});save(d);return {value};}
 if(p==='/api/invite')return {url:location.origin+'/demo/child'};
 if(p==='/api/parent/invite')return {url:location.origin+'/demo/parent'};
 if(p==='/api/parent/report')return {label:d.children[0].label,games:d.state.completed,lesson:d.lesson.title,events:d.events.slice().reverse()};
 if(p==='/api/assistant')throw Error('В демо показан учебный сценарий. Для настоящего ответа ИИ войдите в личный кабинет.');
 throw Error('Это действие недоступно в демонстрации');
}
