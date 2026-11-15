// Browser regressions for the findings of the Codex review (docs/CODEX_REVIEW_V2.md). Uses the LOCAL demo server (synthetic data).
// Usage: AYAN_DEMO=1 PORT=4300 node server.mjs; AYAN_TEST_URL=http://127.0.0.1:4300 PLAYWRIGHT_PATH=... node tests/v2-e2e-regressions.cjs
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {LESSONS}=require('../dist/v2/lessons.js');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4300';
const results=[];const check=(id,ok,detail)=>{results.push(!!ok);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];
 async function ctx(opts={}){const c=await browser.newContext({viewport:{width:1280,height:900},...opts});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
 async function api(page,path,body,method){return page.evaluate(async([p,b,m])=>{const r=await fetch(p,{method:m||(b?'POST':'GET'),headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});let d=null;try{d=await r.json();}catch{}return {status:r.status,data:d};},[path,body,method]);}
 async function loginAs(page,as){await page.goto(B+'/demo');await api(page,'/api/demo/login',{as});}
 const reset=async()=>{const c=await ctx();const p=await c.newPage();await p.goto(B+'/demo');await api(p,'/api/demo/reset',{});await c.close();};
 const toPractice=async p=>{await p.waitForSelector('[data-go="explanation"]');await p.click('[data-go="explanation"]');await p.click('[data-go="example"]');await p.click('[data-go="practice"]');await p.waitForSelector('[data-task]');await wait(500);};
 async function solve(page,task){
  if(task.kind==='choice'){await page.click(`[data-choice="${task.correct}"]`);return;}
  if(task.kind==='match'){for(const [l,r] of Object.entries(task.pairs))await page.click(`[data-left="${l}"][data-right="${r}"]`);return;}
  if(task.kind==='order'){const want=task.correct.map(id=>task.items.find(i=>i.id===id).label.ru);
   for(let i=0;i<want.length;i++){for(let g=0;g<20;g++){const texts=await page.$$eval('[data-task] ol li b',els=>els.map(e=>e.childNodes[0].textContent.trim()));if(texts[i]===want[i])break;const j=texts.indexOf(want[i]);await page.click(`[data-up="${j}"]`);await wait(60);}}return;}
  if(task.kind==='fraction'){const sel=task.target[0];for(let i=0;i<sel;i++)await page.click(`button[data-part="${i}"]`);}
 }
 try{
  // ---- REV-03: the first correct answer in each of the other five lessons must not break the page ----
  for(const id of ['math-fractions-02','bio-plants-01','bio-cell-02','cs-algorithms-01','cs-conditions-02']){
   await reset();const lesson=LESSONS.find(l=>l.lessonId===id);
   const tc=await ctx();const t=await tc.newPage();await loginAs(t,'teacher-a');const as=await api(t,'/api/v2/assign',{opId:'e2e'+id.replace(/\W/g,'').slice(0,12)+'0001',childIds:['demo-student-02'],lessonId:id});
   const sc=await ctx();const s=await sc.newPage();await loginAs(s,'student-02');await s.goto(B+'/child#/lesson');
   const before=errors.length;await toPractice(s);
   const first=lesson.tasks.find(x=>x.id===lesson.practice[0]);await solve(s,first);
   if(id==='bio-cell-02'){const lbl=await s.$$eval('[data-task] svg[role=img]',els=>els.map(e=>e.getAttribute('aria-label')));check('REV-11 the cell scheme has a text description for a screen reader',lbl.some(x=>/ядро/.test(x)&&/метка/.test(x)),(lbl[0]||'').slice(0,60));}
   await s.click('[data-check]');
   const ok=await s.waitForSelector('[data-fb] .feedback.ok',{timeout:8000}).then(()=>true).catch(()=>false);
   const next=await s.locator('[data-nexttask],[data-twin]').count();
   check(`REV-03 ${id}: first correct answer -> "Верно", next button, no page error`,as.status===200&&ok&&next>0&&errors.length===before,errors.slice(before).join('|'));
   await tc.close();await sc.close();
  }
  // ---- REV-06: offline wrong answer, then a corrected one; the old reply must not hide the new one ----
  await reset();
  {const sc=await ctx();const s=await sc.newPage();await loginAs(s,'student-01');await s.goto(B+'/child#/lesson');await s.waitForSelector('[data-pick]',{timeout:3000}).then(()=>s.click('[data-pick="standard"]')).catch(()=>{});await s.goto(B+'/child#/lesson');
   await toPractice(s);
   await sc.setOffline(true);
   await s.click('button[data-part="0"]');await s.click('button[data-part="1"]');await s.click('[data-check]');
   const f1=await s.waitForFunction(()=>/Не удалось сохранить/.test(document.querySelector('[data-fb]')?.textContent||''),null,{timeout:8000}).then(()=>true).catch(()=>false);
   await s.click('button[data-part="1"]');await s.click('[data-check]');
   await s.waitForFunction(()=>/Не удалось сохранить/.test(document.querySelector('[data-fb]')?.textContent||''),null,{timeout:8000}).catch(()=>{});
   await sc.setOffline(false);
   const okAfter=await s.waitForSelector('[data-fb] .feedback.ok',{timeout:30000}).then(()=>true).catch(()=>false);
   const stuck=await s.locator('[data-check][aria-busy="true"]').count();
   const tc=await ctx();const t=await tc.newPage();await loginAs(t,'teacher-a');const rep=await api(t,'/api/v2/report?child=demo-student-01');const f1r=rep.data.summary.tasks.find(x=>x.taskId==='f1');
   check('REV-06 offline wrong A then correct B: after reconnect the child sees B\'s "Верно" (A\'s late reply is not shown); server has both',f1&&okAfter&&stuck===0&&f1r.status==='correct'&&f1r.firstTry==='incorrect',JSON.stringify({f1,okAfter,stuck,first:f1r.firstTry,status:f1r.status}));
   // ---- REV-07: the page is reloaded while the answer is "pending", but the server already stored it ----
   await s.click('[data-nexttask]');await s.waitForSelector('button[data-part="3"]');
   const state=await s.evaluate(async()=>{const key=Object.keys(localStorage).find(k=>/\.att\./.test(k));const st=JSON.parse(localStorage[key]);const X='pendingsub'+Math.random().toString(36).slice(2,12);
    const r=await fetch('/api/v2/child/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:st.attemptId,taskId:'f2',submissionId:X,answer:'mark:0'})});const d=await r.json();
    st.ui.pending={...(st.ui.pending||{}),[X]:{taskId:'f2',answer:'mark:0'}};st.ui.tasks.f2={...(st.ui.tasks.f2||{}),status:'pending',submissionId:X,sentAnswer:'mark:0',mark:[0]};localStorage[key]=JSON.stringify(st);return {code:r.status,ev:d.evaluation};});
   await s.reload();await s.waitForSelector('[data-task]');await wait(800);
   const busy=await s.locator('[data-check][aria-busy="true"]').count(),shown=await s.locator('[data-fb] .feedback').count();
   check('REV-07 reload with a "pending" mark for an answer the server already has: no endless "Проверяем…", the result is shown',state.code===200&&busy===0&&shown>0,JSON.stringify({state,busy,shown}));
   // ---- REV-12: sound off -> the video starts muted ----
   await api(s,'/api/support?role=child',{sound:false});await s.goto(B+'/child#/watch');await s.reload();await s.waitForSelector('video');await wait(600);
   const muted=await s.evaluate(()=>({m:document.querySelector('video').muted,p:document.querySelector('[data-v="mute"]').getAttribute('aria-pressed')}));
   check('REV-12 with sound off the video starts muted (the unmute button is shown as pressed)',muted.m===true&&muted.p==='true',JSON.stringify(muted));
   await sc.close();await tc.close();}
  // ---- REV-08: two tabs of one child; the old tab must not erase the newer tab's answer ----
  await reset();
  {const sc=await ctx();const a=await sc.newPage();await loginAs(a,'student-01');await a.goto(B+'/child#/lesson');await a.waitForSelector('[data-pick]',{timeout:3000}).then(()=>a.click('[data-pick="standard"]')).catch(()=>{});await a.goto(B+'/child#/lesson');await toPractice(a);await wait(1500);
   const b=await sc.newPage();await b.goto(B+'/child#/lesson');await b.waitForSelector('[data-task]');await wait(800); // tab B now holds revision R
   await a.click('button[data-part="0"]');await wait(1500);                // tab A saves a draft: revision R+1
   await b.click('[data-other]');await b.click('[data-view="cards"]');await wait(2000); // tab B ("Другой способ" -> cards) writes on revision R: 409, then merges its own change only
   const saved=await a.evaluate(async()=>{const h=await (await fetch('/api/v2/child/home')).json();const l=await (await fetch('/api/v2/child/lesson?assignment='+h.current.assignmentId)).json();const f1=l.attempt.ui.tasks.f1||{};return {mark:f1.mark,view:f1.view};});
   check('REV-08 tab B (old revision) changes the view after tab A selected a part: the server keeps A\'s selection AND B\'s view',Array.isArray(saved.mark)&&saved.mark.includes(0)&&saved.view==='cards',JSON.stringify(saved));
   await sc.close();}
  // ---- REV-A: another child logs in in a second tab; the first tab's queued write is refused ----
  await reset();
  {const sc=await ctx();const a=await sc.newPage();await loginAs(a,'student-01');await a.goto(B+'/child#/home');await a.waitForSelector('[data-pick]',{timeout:3000}).then(()=>a.click('[data-pick="standard"]')).catch(()=>{});await wait(500);
   const b=await sc.newPage();await loginAs(b,'student-03');
   const res=await a.evaluate(async()=>{const r=await fetch('/api/support?role=child',{method:'POST',headers:{'Content-Type':'application/json','X-Ayan-Actor':'child.demo-student-01'},body:JSON.stringify({captions:false})});return r.status;});
   const prof3=await api(b,'/api/v2/child/home');
   check('REV-A old tab of student 01 cannot change settings of student 03 after the account switched (409), student 03 unchanged',res===409&&prof3.data.profile.captions!==false,String(res));
   await sc.close();}
  check('no page errors in any test page',errors.length===0,errors.slice(0,3).join(' | '));
 }catch(e){console.error(e);results.push(false);}
 await browser.close();
 console.log(JSON.stringify({checks:results.length,failed:results.filter(x=>!x).length}));process.exit(results.every(Boolean)?0:1);
})();
