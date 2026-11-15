// V2.1 lesson core: task geometry, answer formats and the one trusted evaluator.
// Shared by the server (require) and the browser (window.AyanCore). The server is the only judge:
// the client renders and sends what the child chose, never a score.
//
// Fraction tasks are graded by AREA, not by picture position: the selected parts must cover exactly
// target = num/den of the whole. That is what makes a task with four UNEQUAL parts meaningful
// (one of four unequal parts is not automatically a quarter) and makes every answer mode measure the
// same objective. Arithmetic is exact (integer weights, cross-multiplication), no floats.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AyanCore=factory();})(this,function(){
 'use strict';
 const EVALUATOR_VERSION='core-2.1.0';
 const sum=a=>a.reduce((x,y)=>x+y,0);
 const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;};
 const reduce=(n,d)=>{const g=gcd(n,d);return [n/g,d/g];};
 const isEqualPartition=parts=>parts.every(w=>w===parts[0]);
 const L=(o,lang)=>o==null?'':typeof o==='string'?o:(o[lang]??o.ru??'');

 // Readable position of a part, used for screen readers and the "Выбрано: …" line.
 const POS={ru:{tr:'сверху справа',br:'снизу справа',bl:'снизу слева',tl:'сверху слева',t:'сверху',b:'снизу',r:'справа',l:'слева'},
            kk:{tr:'жоғары оң жақта',br:'төменгі оң жақта',bl:'төменгі сол жақта',tl:'жоғары сол жақта',t:'жоғарыда',b:'төменде',r:'оң жақта',l:'сол жақта'}};
 function partPosition(task,i,lang){
  const p=POS[lang]||POS.ru,parts=task.parts,W=sum(parts);
  if(task.shape==='rect'){const n=parts.length;if(n===1)return '';
   const ordinal=lang==='kk'?`сол жақтан ${i+1}-ші`:(['первая','вторая','третья','четвёртая','пятая','шестая','седьмая','восьмая'][i]||(i+1)+'-я')+' слева';return ordinal;}
  let a0=0;for(let k=0;k<i;k++)a0+=parts[k]/W*360;const mid=a0+parts[i]/W*180;
  const dirs=[[22.5,'t'],[67.5,'tr'],[112.5,'r'],[157.5,'br'],[202.5,'b'],[247.5,'bl'],[292.5,'l'],[337.5,'tl'],[360,'t']];
  return p[dirs.find(([lim])=>mid<lim)[1]];
 }

 // ---------- task normalisation and validation (also used by the teacher's constructor) ----------
 const SHAPES=['circle','rect'],CONTEXTS={circle:['pizza','circle','cake'],rect:['strip','chocolate','rect']},MODES=['mark','build','card'];
 function validateFractionTask(t){
  const errors=[];
  if(!/^[a-z0-9-]{1,48}$/.test(String(t.id||'')))errors.push('id');
  if(!SHAPES.includes(t.shape))errors.push('shape');
  if(!Array.isArray(t.parts)||t.parts.length<2||t.parts.length>12||t.parts.some(w=>!Number.isInteger(w)||w<1||w>24))errors.push('parts');
  const [n,d]=Array.isArray(t.target)?t.target:[];
  if(!Number.isInteger(n)||!Number.isInteger(d)||d<2||d>12||n<1||n>=d)errors.push('target');
  if(!errors.length){
   // Geometry check: the target must be reachable by selecting whole parts, otherwise the picture would lie.
   const W=sum(t.parts);if(!subsetReaches(t.parts,n*W,d))errors.push('unreachable');
   if((t.modes||[]).includes('build')&&!isEqualPartition(t.parts))errors.push('build_needs_equal_parts');
   if((t.modes||[]).includes('build')&&t.parts.length!==d)errors.push('build_needs_den_parts');
  }
  if(!Array.isArray(t.modes)||!t.modes.length||t.modes.some(m=>!MODES.includes(m)))errors.push('modes');
  for(const k of ['ru','kk'])if(!String(t.prompt?.[k]||'').trim()||String(t.prompt[k]).length>240)errors.push('prompt_'+k);
  if(!Array.isArray(t.hints)||t.hints.length<1||t.hints.length>3||t.hints.some(h=>!String(h?.ru||'').trim()||!String(h?.kk||'').trim()||h.ru.length>400||h.kk.length>400))errors.push('hints');
  return errors;
 }
 // Is there a subset of part weights whose sum s satisfies s*d === n*W ?  (n*W/d must be an integer weight sum)
 function subsetReaches(parts,nW,d){if(nW%d)return false;const goal=nW/d;let reach=new Set([0]);for(const w of parts){const next=new Set(reach);for(const s of reach)if(s+w<=goal)next.add(s+w);reach=next;}return reach.has(goal);}

 // Cards for the "choose a picture" mode: one correct picture, one with a different number of equal
 // parts selected, one with UNEQUAL parts so that counting alone is not enough. Deterministic.
 function cardsFor(t){
  if(Array.isArray(t.cards)&&t.cards.length)return t.cards;
  const [n,d]=t.target,shape=t.shape,equal=Array(d).fill(1);
  const other=n+1<d?n+1:n-1;
  const cards=[{id:'c1',shape,parts:equal,selected:range(n)},{id:'c2',shape,parts:equal,selected:range(other)}];
  const uneq=d===2?[3,1]:d===3?[3,2,1]:d===4?[3,1,2,2]:[...Array(d-1).fill(1),2];
  // Pick unequal parts whose selected area is NOT the target (so the distractor is really wrong).
  let sel=[uneq.indexOf(Math.min(...uneq))];const Wu=sum(uneq);
  if(sum(sel.map(i=>uneq[i]))*d===n*Wu)sel=[uneq.indexOf(Math.max(...uneq))];
  cards.push({id:'c3',shape,parts:uneq,selected:sel});
  // Stable shuffle by task id, so the correct card is not always first.
  const h=[...String(t.id)].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7),order=[[0,1,2],[1,0,2],[2,0,1],[1,2,0],[0,2,1],[2,1,0]][h%6];
  return order.map(i=>cards[i]);
 }
 const range=n=>Array.from({length:n},(_,i)=>i);
 // Pieces for the "build from ready pieces" mode: d unit pieces 1/d and a pile of a different size.
 function piecesFor(t){const d=t.target[1],alt=d===2?3:d-1;return [{id:'u',size:[1,d],count:d},{id:'x',size:[1,alt],count:alt}];}

 // Independent twin: same objective on another object, offered after a hint so the teacher sees a new,
 // unassisted result. Generated, so the server can grade it from the original task alone.
 function twinOf(t){
  if(!t||t.kind!=='fraction'||t.role==='diagnostic'||!Array.isArray(t.target))return null; // only fraction tasks have an independent twin
  const [n,d]=t.target,shape=t.shape==='circle'?'rect':'circle';
  return {id:t.id+'-twin',kind:'fraction',role:'twin',twinOf:t.id,shape,context:shape==='rect'?'strip':'circle',parts:Array(d).fill(1),target:[n,d],subskill:t.subskill,modes:t.modes.slice(),
   prompt:{ru:'Новый пример. '+L(t.prompt,'ru'),kk:'Жаңа мысал. '+L(t.prompt,'kk')},hints:t.hints};
 }
 function findTask(tasks,id){const t=tasks.find(x=>x.id===id);if(t)return t;const m=/^(.*)-twin$/.exec(id);if(m){const base=tasks.find(x=>x.id===m[1]);return base?twinOf(base):null;}return null;}

 // ---------- answers ----------
 // Formats: "mark:0,2" | "build:u,u,x" | "card:c2" | "choice:a" | "match:a=1;b=2" | "order:a,b,c"
 function parse(task,answer){
  const s=String(answer??'').trim();const m=/^([a-z]+):(.*)$/.exec(s);if(!m)return null;const [,mode,rest]=m;
  if(task.kind==='fraction'){
   if(!(task.modes||[]).includes(mode))return null;
   if(mode==='mark'){if(!rest)return null;const ids=rest.split(',');if(ids.some(x=>!/^\d{1,2}$/.test(x)))return null;const set=new Set(ids.map(Number));if(set.size!==ids.length||[...set].some(i=>i>=task.parts.length))return null;return {mode,value:[...set].sort((a,b)=>a-b)};}
   if(mode==='build'){if(!rest)return null;const ids=rest.split(',');const pieces=piecesFor(task);if(ids.some(x=>!pieces.some(p=>p.id===x)))return null;for(const p of pieces)if(ids.filter(x=>x===p.id).length>p.count)return null;return {mode,value:ids.sort()};}
   if(mode==='card'){if(!cardsFor(task).some(c=>c.id===rest))return null;return {mode,value:rest};}
   return null;}
  if(task.kind==='choice'&&mode==='choice'){return task.options.some(o=>o.id===rest)?{mode,value:rest}:null;}
  if(task.kind==='match'&&mode==='match'){if(!rest)return null;const pairs={};for(const kv of rest.split(';')){const [a,b]=kv.split('=');if(!task.left.some(x=>x.id===a)||!task.right.some(x=>x.id===b)||pairs[a])return null;pairs[a]=b;}return {mode,value:pairs};}
  if(task.kind==='order'&&mode==='order'){const ids=rest.split(',');if(ids.length!==task.items.length||new Set(ids).size!==ids.length||ids.some(x=>!task.items.some(i=>i.id===x)))return null;return {mode,value:ids};}
  return null;
 }
 function normalize(task,answer){const p=task&&parse(task,answer);if(!p)return null;
  if(p.mode==='mark'||p.mode==='build'||p.mode==='order')return p.mode+':'+p.value.join(',');
  if(p.mode==='match')return 'match:'+Object.keys(p.value).sort().map(k=>k+'='+p.value[k]).join(';');
  return p.mode+':'+p.value;}

 // Returns {valid, correct, reason, mode, subskill, shown:[n,d]}. "valid:false" is a malformed or empty
 // answer: it is never stored as a wrong answer.
 function evaluate(task,answer){
  if(!task)return {valid:false};const p=parse(task,answer);if(!p)return {valid:false};
  const out={valid:true,mode:p.mode,subskill:task.subskill||null,evaluatorVersion:EVALUATOR_VERSION};
  if(task.kind==='fraction'){
   const [n,d]=task.target;
   if(p.mode==='mark'){const W=sum(task.parts),s=sum(p.value.map(i=>task.parts[i]));out.shown=reduce(s,W);out.correct=s*d===n*W;
    out.reason=out.correct?null:(isEqualPartition(task.parts)?(p.value.length<n*task.parts.length/d?'tooFew':'tooMany'):'area');return out;}
   if(p.mode==='build'){const pieces=piecesFor(task),wrong=p.value.some(x=>x!=='u');out.correct=!wrong&&p.value.length===n;
    out.reason=out.correct?null:wrong?'wrongPiece':(p.value.length<n?'tooFew':'tooMany');out.shown=wrong?null:reduce(p.value.length,d);return out;}
   if(p.mode==='card'){const c=cardsFor(task).find(x=>x.id===p.value),W=sum(c.parts),s=sum(c.selected.map(i=>c.parts[i]));
    out.correct=s*d===n*W;out.reason=out.correct?null:(isEqualPartition(c.parts)?'wrongCard':'unequalCard');out.shown=reduce(s,W);return out;}
  }
  if(task.kind==='choice'){out.correct=p.value===task.correct;out.reason=out.correct?null:'wrongChoice';return out;}
  if(task.kind==='match'){const all=task.left.every(l=>p.value[l.id]===task.pairs[l.id]);const complete=task.left.every(l=>p.value[l.id]);out.correct=all;out.reason=all?null:complete?'wrongPair':'incomplete';
   out.wrongItems=task.left.filter(l=>p.value[l.id]&&p.value[l.id]!==task.pairs[l.id]).map(l=>l.id);return out;}
  if(task.kind==='order'){out.correct=p.value.join(',')===task.correct.join(',');out.reason=out.correct?null:'wrongOrder';
   out.firstWrong=out.correct?null:p.value.findIndex((x,i)=>x!==task.correct[i]);return out;}
  return {valid:false};
 }

 // Neutral, specific feedback. Never "you are wrong"; always says what to look at.
 const FEEDBACK={
  correct:{ru:'Верно: {what}.',kk:'Дұрыс: {what}.'},
  tooFew:{ru:'Попробуй ещё: нужно выбрать больше частей.',kk:'Тағы байқап көр: көбірек бөлік таңдау керек.'},
  tooMany:{ru:'Попробуй ещё: выбрано больше частей, чем нужно.',kk:'Тағы байқап көр: керегінен көп бөлік таңдалды.'},
  area:{ru:'Попробуй ещё: части здесь не равны. Сравни, какую долю целого занимает выбранное.',kk:'Тағы байқап көр: бөліктер мұнда тең емес. Таңдалғаны бүтіннің қандай үлесі екенін салыстыр.'},
  wrongPiece:{ru:'Попробуй ещё: куски должны быть равными, такого же размера, как одна доля.',kk:'Тағы байқап көр: кесектер тең, бір үлестің өлшеміндей болуы керек.'},
  wrongCard:{ru:'Попробуй ещё: посчитай закрашенные равные части на картинке.',kk:'Тағы байқап көр: суреттегі боялған тең бөліктерді сана.'},
  unequalCard:{ru:'Попробуй ещё: на этой картинке части не равны.',kk:'Тағы байқап көр: бұл суретте бөліктер тең емес.'},
  wrongChoice:{ru:'Попробуй ещё: прочитай вопрос и посмотри на картинку ещё раз.',kk:'Тағы байқап көр: сұрақты оқып, суретке тағы қара.'},
  wrongPair:{ru:'Попробуй ещё: проверь пары, отмеченные рамкой.',kk:'Тағы байқап көр: жақтаумен белгіленген жұптарды тексер.'},
  incomplete:{ru:'Соедини все пары, затем проверь.',kk:'Барлық жұпты қосып, содан кейін тексер.'},
  wrongOrder:{ru:'Попробуй ещё: проверь шаг, отмеченный рамкой.',kk:'Тағы байқап көр: жақтаумен белгіленген қадамды тексер.'}
 };
 function fractionWords(n,d,lang){
  const ru={'1/2':'одна вторая','1/3':'одна третья','2/3':'две третьих','1/4':'одна четвёртая','2/4':'две четвёртых','3/4':'три четвёртых','1/5':'одна пятая','1/6':'одна шестая','1/8':'одна восьмая'};
  const kk={'1/2':'екіден бір','1/3':'үштен бір','2/3':'үштен екі','1/4':'төрттен бір','2/4':'төрттен екі','3/4':'төрттен үш','1/5':'бестен бір','1/6':'алтыдан бір','1/8':'сегізден бір'};
  return (lang==='kk'?kk:ru)[n+'/'+d]||(n+'/'+d);
 }
 function feedback(task,result,lang){
  if(!result||!result.valid)return '';
  if(result.correct){let what=L(task.successText,lang);if(!what&&task.kind==='fraction'){const [n,d]=task.target;
    // parts of different size: the answer is a share of the whole figure, never "N of D equal parts" (UT8, D8)
    if(task.parts&&!isEqualPartition(task.parts))what=lang==='kk'?`бүкіл фигураның ${fractionWords(n,d,lang)} бөлігі`:`${fractionWords(n,d,lang)} всей фигуры`;
    else what=lang==='kk'?`${d} тең бөліктің ${n} бөлігі, ${fractionWords(n,d,lang)}`:`${n} из ${d} равных частей, ${fractionWords(n,d,lang)}`;}
   return what?L(FEEDBACK.correct,lang).replace('{what}',what):(lang==='kk'?'Дұрыс.':'Верно.');}
  return L(FEEDBACK[result.reason]||FEEDBACK.wrongChoice,lang);
 }
 // Worked example used by hint level 3: the analogous solved case, with a different target.
 function workedExample(task){
  if(task.kind!=='fraction')return null;const [n,d]=task.target;const en=n>1?n-1:n,ed=n>1?d:(d===4?2:4);
  return {shape:task.shape,parts:Array(ed).fill(1),selected:range(en),target:[en,ed]};
 }
 return {EVALUATOR_VERSION,validateFractionTask,cardsFor,piecesFor,twinOf,findTask,parse,normalize,evaluate,feedback,fractionWords,workedExample,partPosition,isEqualPartition,sum,reduce,L,CONTEXTS,MODES};
});
