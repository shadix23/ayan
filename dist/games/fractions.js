// Lesson game M01 "Collect a share" (brief: pedagogy/LESSONS_RU_KK.md, M01).
// Shared by the server (grading, CommonJS require) and the browser (texts and rendering, window.AyanFractions).
// The server is the only judge: the client sends what the child selected, never a score.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AyanFractions=factory();})(this,function(){
 'use strict';
 // Geometry is exact: equal disk = 4 sectors of 90°; the unequal disk is a counterexample (135°, 45°, 90°, 90°).
 const EQUAL=[90,90,90,90],UNEQUAL=[135,45,90,90];
 const TASKS=[
  {id:'m01-t1',kind:'select',disk:'equal',need:1,
   prompt:['Бір ширекті таңда','Выбери одну четверть'],
   hint:['Дөңгелек тең төрт бөлікке бөлінген. Бір ширек - солардың біреуі.','Круг разделён на четыре равные части. Одна четверть - одна из них.']},
  {id:'m01-t2',kind:'select',disk:'equal',need:2,
   prompt:['Төрттен екі бөлікті таңда','Выбери две четверти'],
   hint:['Екі бөлікті таңда. Төрттен екі - бұл дөңгелектің жартысы.','Выбери две части. Две четверти - это половина круга.']},
  {id:'m01-t3',kind:'choose',options:['equal','unequal'],
   prompt:['Қай дөңгелек ширектерге бөлінген?','Где круг разделён на четверти?'],
   hint:['Бөліктердің бірдей екенін тексер.','Проверь, равны ли части.']}
 ];
 const FEEDBACK={
  check:['Таңдалған бөліктерді санап, олардың тең екенін тексерейік.','Считаем выбранные части и проверяем, равны ли они.'],
  selected:['Таңдалғаны: 4 бөліктің {n}.','Выбрано частей: {n} из 4.'],
  needOne:['Бір ширек үшін 1 бөлік керек.','Для одной четверти нужна 1 часть.'],
  needTwo:['Екі ширек үшін 2 бөлік керек.','Для двух четвертей нужно 2 части.'],
  unequal:['Бұл дөңгелектің бөліктері тең емес. Ширек тек тең бөліктерде болады.','Здесь части не равны. Четверть бывает только при равных частях.'],
  nothing:['Алдымен бөлікті таңда.','Сначала выбери часть.']
 };
 // Answer formats: select -> "0,2" (sector indices 0..3, any order); choose -> "equal" | "unequal".
 function parseSelection(answer){
  const s=String(answer??'').trim();if(!s)return null;
  const parts=s.split(',').map(x=>x.trim());
  if(parts.some(x=>!/^[0-3]$/.test(x)))return null;
  const set=new Set(parts.map(Number));if(set.size!==parts.length)return null; // duplicates are malformed
  return [...set].sort();
 }
 function evaluate(taskId,answer){
  const task=TASKS.find(t=>t.id===taskId);if(!task)return {valid:false};
  if(task.kind==='select'){const sel=parseSelection(answer);if(!sel)return {valid:false};
   // Any sectors of the EQUAL disk count: 2 of 4 is 2/4 wherever they are (no single "right picture").
   return {valid:true,correct:sel.length===task.need,count:sel.length,reason:sel.length===task.need?null:(task.need===1?'needOne':'needTwo')};}
  const v=String(answer??'').trim();if(!task.options.includes(v))return {valid:false};
  return {valid:true,correct:v==='equal',reason:v==='equal'?null:'unequal'};
 }
 const normalize=(taskId,answer)=>{const t=TASKS.find(x=>x.id===taskId);if(!t)return null;if(t.kind==='select'){const s=parseSelection(answer);return s?s.join(','):null;}const v=String(answer??'').trim();return t.options.includes(v)?v:null;};
 const lesson={id:'M01',game:'fractions-m01',keyVersion:1,
  title:['Тең үлестер','Равные доли'],
  goal:['Бір ширек бүтіннің тең төрт бөлігінің бір бөлігі екенін түсіну.','Понимать, что одна четверть - одна из четырёх равных частей целого.'],
  steps:[['Дөңгелекті тең төрт бөлікке бөлейік.','Разделим круг на четыре равные части.'],
         ['Осындай бір бөлік - бір ширек.','Одна такая часть - одна четверть.'],
         ['Егер бөліктер тең болмаса, олардың кез келген біреуі ширек бола бермейді.','Если части не равны, любая одна из них не обязательно четверть.']]};
 return {id:'fractions-m01',TASKS,FEEDBACK,EQUAL,UNEQUAL,evaluate,normalize,parseSelection,lesson};
});
