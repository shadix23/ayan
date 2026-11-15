const test=require('node:test'),assert=require('node:assert');
const C=require('../dist/v2/lesson-core.js');
const {LESSONS,byId}=require('../dist/v2/lessons.js');

test('catalog: exactly six unique lessons, each with ru and kk, version, tasks, criteria and review status',()=>{
 assert.equal(LESSONS.length,6);assert.equal(new Set(LESSONS.map(l=>l.lessonId)).size,6);
 for(const l of LESSONS){
  for(const k of ['topic','objectiveDraft','successCriteria'])for(const lang of ['ru','kk'])assert.ok(String(l[k]?.[lang]||'').trim(),l.lessonId+' '+k+' '+lang);
  assert.ok(Number.isInteger(l.version));assert.equal(l.curriculumVerification,'pending_teacher_review');assert.equal(l.curriculumSource,null);
  assert.ok(l.tasks.length>=6,l.lessonId+' needs 5 tasks + a check');
  for(const id of l.required)assert.ok(l.tasks.some(t=>t.id===id),l.lessonId+' required '+id);
  for(const s of ['goal','explanation','example','check','completion'])assert.ok(l.stages[s],l.lessonId+' stage '+s);
 }
});
test('every fraction task has valid geometry, and exactly one card is correct',()=>{
 for(const l of LESSONS)for(const t of l.tasks.filter(t=>t.kind==='fraction')){
  assert.deepEqual(C.validateFractionTask(t),[],l.lessonId+':'+t.id);
  if(t.modes.includes('card')){const ok=C.cardsFor(t).filter(c=>C.evaluate(t,'card:'+c.id).correct);assert.equal(ok.length,1,t.id);}
  const tw=C.twinOf(t);if(tw)assert.deepEqual(C.validateFractionTask(tw),[],'twin '+t.id);
 }
});
test('choice / match / order tasks have exactly one correct answer that the evaluator accepts',()=>{
 for(const l of LESSONS)for(const t of l.tasks){
  if(t.kind==='choice')assert.equal(C.evaluate(t,'choice:'+t.correct).correct,true,t.id);
  if(t.kind==='match')assert.equal(C.evaluate(t,'match:'+Object.entries(t.pairs).map(([a,b])=>a+'='+b).join(';')).correct,true,t.id);
  if(t.kind==='order')assert.equal(C.evaluate(t,'order:'+t.correct.join(',')).correct,true,t.id);
 }
});
test('area rule: on four UNEQUAL parts [4,2,1,1] a quarter is the 2-part or the two 1-parts, never "any one part"',()=>{
 const t=byId('math-fractions-01').tasks.find(x=>x.id==='c2');
 assert.equal(C.evaluate(t,'mark:1').correct,true);assert.equal(C.evaluate(t,'mark:2,3').correct,true);
 assert.equal(C.evaluate(t,'mark:0').correct,false);assert.equal(C.evaluate(t,'mark:0').reason,'area');assert.equal(C.evaluate(t,'mark:3').correct,false);
});
test('the three answer modes measure the same objective (3/4)',()=>{
 const t=byId('math-fractions-01').tasks.find(x=>x.id==='f4');const card=C.cardsFor(t).find(c=>C.evaluate(t,'card:'+c.id).correct);
 for(const a of ['mark:0,1,3','build:u,u,u','card:'+card.id])assert.equal(C.evaluate(t,a).correct,true,a);
 assert.equal(C.evaluate(t,'build:u,u,x').reason,'wrongPiece');assert.equal(C.evaluate(t,'mark:0').reason,'tooFew');
});
test('malformed answers are invalid, not wrong; normalize gives one canonical form',()=>{
 const t=byId('math-fractions-01').tasks.find(x=>x.id==='f2');
 for(const a of ['','mark:','mark:0,0','mark:4','mark:x','build:u,u,u,u,u','card:zz','choice:a','0'])assert.equal(C.evaluate(t,a).valid,false,a);
 assert.equal(C.normalize(t,'mark:3,1'),'mark:1,3');assert.equal(C.normalize(t,'build:x,u'),'build:u,x');
 const d=byId('math-fractions-01').tasks.find(x=>x.id==='c2');assert.equal(C.evaluate(d,'build:u').valid,false,'diagnostic has no build mode');
});
test('twin task ids resolve on the server from the original task',()=>{
 const l=byId('math-fractions-01');const tw=C.findTask(l.tasks,'f3-twin');assert.equal(tw.shape,'rect');assert.deepEqual(tw.target,[2,4]);
 assert.equal(C.findTask(l.tasks,'c2-twin'),null,'diagnostic has no twin');assert.equal(C.findTask(l.tasks,'nope'),null);
});
test('constructor validation rejects geometry that cannot show the target',()=>{
 const base={id:'x1',kind:'fraction',shape:'rect',parts:[1,1,1],target:[1,4],modes:['mark'],prompt:{ru:'a',kk:'b'},hints:[{ru:'h',kk:'h'}]};
 assert.ok(C.validateFractionTask(base).includes('unreachable'));
 assert.deepEqual(C.validateFractionTask({...base,parts:[1,1,1,1]}),[]);
 assert.ok(C.validateFractionTask({...base,parts:[3,1,2,2],modes:['build']}).includes('build_needs_equal_parts'));
 assert.ok(C.validateFractionTask({...base,prompt:{ru:'a',kk:''}}).includes('prompt_kk'));
});
test('twinOf and findTask never throw: only fraction tasks have a twin (regression: five lessons crashed after the first correct answer)',()=>{
 for(const l of LESSONS)for(const t of l.tasks){assert.doesNotThrow(()=>C.twinOf(t),l.lessonId+':'+t.id);assert.doesNotThrow(()=>C.findTask(l.tasks,t.id+'-twin'));
  if(t.kind!=='fraction'){assert.equal(C.twinOf(t),null);assert.equal(C.findTask(l.tasks,t.id+'-twin'),null);}}
});
