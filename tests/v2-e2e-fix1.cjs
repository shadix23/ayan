// Fixes round 1 (hackathon/fixes-round1.md, items 8-15 and P3): the child lesson and home, the landing, Kazakh texts.
// Real browser against a LOCAL demo server with its own database (the test calls /api/demo/reset).
// Usage: AYAN_DEMO=1 AYAN_DB_FILE=.data/test-child.sqlite PORT=4312 node server.mjs
//        AYAN_TEST_URL=http://127.0.0.1:4312 PLAYWRIGHT_PATH=... node tests/v2-e2e-fix1.cjs
// Screenshots go to hackathon/shots/fix1/ (AYAN_SHOTS=0 to skip).
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4312',SHOTS=process.env.AYAN_SHOTS!=='0',DIR='hackathon/shots/fix1';
if(SHOTS)fs.mkdirSync(DIR,{recursive:true});
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ONLY=process.env.ONLY?new RegExp(process.env.ONLY):null;
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];
 async function ctx(opts={}){const c=await browser.newContext({viewport:{width:1440,height:900},...opts});
  await c.addInitScript(()=>{window.__live=[];const obs=new MutationObserver(ms=>{for(const m of ms){const el=m.target.nodeType===3?m.target.parentElement:m.target;const r=el?.closest?.('[aria-live],[role=status],[role=alert]');if(r&&r.textContent.trim())window.__live.push(r.textContent.trim());}});
   document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{subtree:true,childList:true,characterData:true}));
   window.__anims=[];const orig=Element.prototype.animate;Element.prototype.animate=function(k,o){window.__anims.push({cls:String(this.className?.baseVal??this.className),k,dur:typeof o==='number'?o:o?.duration||0,delay:o?.delay||0,it:o?.iterations||1,t:performance.now()});return orig.call(this,k,o);};
   window.__help=0;const of=window.fetch;window.fetch=function(u,o){if(String(u).includes('/api/v2/child/help'))window.__help++;return of.apply(this,arguments);};});
  c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
 async function api(page,p,body){return page.evaluate(async([p,b])=>{const r=await fetch(p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});let d=null;try{d=await r.json();}catch{}return {status:r.status,data:d};},[p,body]);}
 async function loginAs(page,as){await page.goto(B+'/demo');await api(page,'/api/demo/login',{as});}
 const shot=async(page,name)=>{if(SHOTS)await page.screenshot({path:path.join(DIR,name)});};
 const active=page=>page.evaluate(()=>{const e=document.activeElement;return !e||e===document.body?'BODY':(e.id||e.dataset.part||e.textContent.trim().slice(0,30)||e.tagName);});
 const live=page=>page.evaluate(()=>{const x=[...new Set(window.__live)];window.__live.length=0;return x;});
 const reset=async()=>{const c=await ctx();const p=await c.newPage();await p.goto(B+'/demo');await api(p,'/api/demo/reset',{});await c.close();};
 const pick=async p=>{if(await p.locator('[data-pick]').count())await p.click('[data-pick="standard"]');};
 const run=id=>!ONLY||ONLY.test(id);
 // answers through the API so the next test starts at the summary
 const solveAll=p=>p.evaluate(async()=>{const key=Object.keys(localStorage).find(k=>/\.att\./.test(k));const st=JSON.parse(localStorage[key]);
  const ans={f1:'mark:0',f2:'mark:0',f3:'mark:0,2',f4:'mark:0,1,2',f5:'mark:0',c1:'mark:1',c2:'mark:1'};
  for(const [task,a] of Object.entries(ans))await fetch('/api/v2/child/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:st.attemptId,taskId:task,submissionId:'fx'+task+Math.random().toString(36).slice(2,12),answer:a})});});
 const toTask=async(p,id)=>{for(let i=0;i<12;i++){const cur=await p.evaluate(()=>document.querySelector('#stage-h')?.textContent||'');if(new RegExp(id).test(cur))return true;
   if(await p.locator('.foot-main .push[data-go]').count()){await p.click('.foot-main .push[data-go]');await wait(500);continue;}if(await p.locator('.foot-main .push[data-nexttask]').count()){await p.click('.foot-main .push[data-nexttask]');await wait(500);continue;}return false;}return false;};
 try{
  await reset();
  // ---------------- 9. focus never falls into <body>; the skip link is visible ----------------
  if(run('FOCUS')){const c=await ctx();const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');await s.waitForSelector('[data-pick], .path');await pick(s);await s.waitForSelector('.path');
   await s.evaluate(()=>{document.activeElement?.blur();document.body.tabIndex=-1;document.body.focus();document.body.removeAttribute('tabindex');});await s.keyboard.press('Tab');const skip=await s.evaluate(()=>{const a=document.activeElement;const r=a.getBoundingClientRect();return {w:r.width,h:r.height,text:a.textContent};});
   check('FIX-09a skip link is visible when focused',skip.w>40&&skip.h>20,JSON.stringify(skip));
   await s.click('a[data-continue]');await s.waitForSelector('.lesson-top');await wait(1800);
   check('FIX-09b first entry into a new lesson: focus is on the step heading, not on <body>',await active(s)==='stage-h',await active(s));
   await s.click('[data-go="explanation"]');await wait(400);await s.evaluate(()=>scrollTo(0,400));await s.click('[data-go="example"]');await wait(500);
   check('FIX-12a a new step starts at the top of the page',await s.evaluate(()=>scrollY)===0,String(await s.evaluate(()=>scrollY)));
   await s.click('[data-go="practice"]');await s.waitForSelector('[data-task]');await wait(500);
   await s.click('.lesson-foot [data-phrase="break"]');await s.waitForSelector('.break-layer');
   check('U5 the page behind the break is inert',await s.evaluate(()=>document.getElementById('app').inert===true));
   await s.click('.break-layer [data-phrase="ready"]');await wait(500);
   check('FIX-09c after "Я готов продолжить" focus returns into the lesson',await active(s)!=='BODY'&&await s.evaluate(()=>!document.getElementById('app').inert),await active(s));
   await s.click('[data-check]');await wait(400);const l1=await live(s);
   check('FIX-10a "Сначала выбери ответ" is announced',l1.some(x=>/Сначала выбери ответ/.test(x)),l1.join(' | '));
   check('U1 the answer sheet has no nested aria-live region',await s.evaluate(()=>!document.querySelector('.sheet [aria-live]')));
   // two wrong answers -> "Не нужно"
   if(!await s.locator('button[data-part="0"]').count()){await s.click('[data-other]');await s.click('[data-view="2d"]');await wait(300);}
   await s.click('button[data-part="0"]');await s.click('button[data-part="1"]');await s.click('[data-check]');await s.waitForSelector('.sheet[data-kind="try"]');await wait(300);
   check('FIX-12b 1440: after "Проверить" the task heading is on screen, not under the header',await s.evaluate(()=>{const h=document.querySelector('#stage-h').getBoundingClientRect(),top=document.querySelector('.lesson-top').getBoundingClientRect();return h.top>=top.bottom-2&&h.bottom<innerHeight;}));
   check('U4 the "not yet" sheet offers "Изменить ответ"',await s.locator('.sheet [data-edit]').count()===1);
   await s.click('[data-check]');await wait(900);
   if(await s.locator('[data-nohint]').count()){await s.click('[data-nohint]');await wait(300);check('FIX-09d "Не нужно" keeps focus in the lesson',await active(s)!=='BODY',await active(s));}else check('FIX-09d "Не нужно" offered after two tries',false);
   await s.click('[data-back]');await wait(400);check('FIX-09e "Назад" under the task keeps focus in the lesson',await active(s)!=='BODY',await active(s));
   // a right answer: one announcement with the title
   if(await s.locator('[data-go="practice"]').count())await s.click('[data-go="practice"]');await s.waitForSelector('[data-task]');await wait(400);
   await live(s);
   if(!await s.locator('button[data-part="0"]').count()){await s.click('[data-other]');await s.click('[data-view="2d"]');await wait(300);}
   const h=await s.evaluate(()=>document.querySelector('#stage-h').textContent);
   const ans=/половин|екіден/i.test(h)?['0']:/одну четв|бір ширек/i.test(h)?['0']:/две|екі/.test(h)?['0','2']:/три|үш/.test(h)?['0','1','2']:['0'];
   for(const a of ans)await s.click(`button[data-part="${a}"]`);await s.click('[data-check]');await s.waitForSelector('.sheet[data-kind="ok"]').catch(()=>{});await wait(500);
   const l2=(await live(s)).filter(x=>/Огонёк|Верно/.test(x));
   check('FIX-10b a right answer gives one announcement "Огонёк зажжён. Верно: ..."',l2.length===1&&/^Огонёк зажжён\. Верно/.test(l2[0]),l2.join(' | '));
   await c.close();}
  // ---------------- 11. help: one honest message, a trace stays, no duplicates ----------------
  if(run('HELP')){await reset();const c=await ctx();const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');await s.waitForSelector('[data-pick], .path');await pick(s);await s.goto(B+'/child#/lesson');await s.waitForSelector('.lesson-foot');await wait(800);
   await s.click('.lesson-foot [data-phrase="help"]');await wait(1200);const l=await live(s);
   check('FIX-11a help with a live connection never says "в очереди"',!l.some(x=>/очеред/.test(x))&&l.some(x=>/Учитель/.test(x)),l.join(' | '));
   await wait(6000);const trace=await s.evaluate(()=>document.querySelector('[data-help-state]')?.textContent||'');
   check('FIX-11b 7 s later the lesson still shows that the teacher knows',/Учитель знает/.test(trace),trace);
   await s.click('.lesson-foot [data-phrase="help"]');await wait(800);
   check('FIX-11c a second press does not send a second request',await s.evaluate(()=>window.__help)===1,String(await s.evaluate(()=>window.__help)));
   await shot(s,'help-trace-1440.png');
   // the teacher presses "Видел, иду": the child sees "Учитель идёт к тебе" without reload
   const tc=await ctx();const tp=await tc.newPage();await loginAs(tp,'teacher-a');const pl=await api(tp,'/api/v2/pulse');const row=(pl.data?.students||pl.data?.rows||[]).find(r=>/student-01/.test(r.id));
   if(row?.helpId)await api(tp,'/api/v2/help/seen',{id:row.helpId});await tc.close();
   const coming=await s.waitForFunction(()=>/Учитель идёт к тебе/.test(document.querySelector('[data-help-state]')?.textContent||''),null,{timeout:12000}).then(()=>true).catch(()=>false);
   check('FIX-11d after "Видел, иду" the child sees "Учитель идёт к тебе"',coming,String(row?.helpId));await shot(s,'help-coming-1440.png');await c.close();}
  // ---------------- outbox and 401 (Codex review): a lost session keeps the operation until the same child signs in again ----------------
  if(run('OUTBOX')){await reset();const c=await ctx();const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');await s.waitForSelector('[data-pick], .path');await pick(s);await s.goto(B+'/child#/lesson');await s.waitForSelector('.lesson-foot');await wait(1500);
   await c.clearCookies();await live(s);await s.click('.lesson-foot [data-phrase="help"]');await wait(1500);
   const st=await s.evaluate(()=>({q:Object.entries(localStorage).filter(([k])=>/outbox/.test(k)).map(([,v])=>JSON.parse(v)).flat().filter(o=>/^help:/.test(o.id)).length,trace:document.querySelector('[data-help-state]')?.textContent||''}));const l=await live(s);
   check('OUTBOX-01 401: the help request stays in the outbox and the child is not told "Учитель знает"',st.q===1&&!l.some(x=>/Учитель знает/.test(x))&&!/Учитель знает/.test(st.trace),JSON.stringify(st)+' '+l.join(' | '));
   await loginAs(s,'student-01');await s.goto(B+'/child#/lesson');await s.waitForSelector('.lesson-foot');await wait(2500);
   const q2=await s.evaluate(()=>Object.entries(localStorage).filter(([k])=>/outbox/.test(k)).map(([,v])=>JSON.parse(v)).flat().filter(o=>/^help:/.test(o.id)).length);
   const tc=await ctx();const tp=await tc.newPage();await loginAs(tp,'teacher-a');const pl=await api(tp,'/api/v2/pulse');await tc.close();const row=(pl.data?.students||[]).find(r=>/student-01/.test(r.id));
   check('OUTBOX-02 after the same child signs in again the request is delivered and the teacher sees it',q2===0&&row?.status==='help',JSON.stringify({q2,status:row?.status}));await c.close();}
  // ---------------- F2 "Скоро заканчиваем": the teacher warns, the child sees a calm plate in the page flow ----------------
  if(run('NOTICE')){await reset();const c=await ctx({viewport:{width:375,height:812},isMobile:true,hasTouch:true});const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');await s.waitForSelector('[data-pick], .path');await pick(s);
   await s.goto(B+'/child#/lesson');await s.waitForSelector('.lesson-top');for(const g of ['explanation','example','practice']){await s.click(`[data-go="${g}"]`);await wait(500);}await s.waitForSelector('[data-task]');await live(s);
   const tc=await ctx();const tp=await tc.newPage();await loginAs(tp,'teacher-a');const sent=await api(tp,'/api/v2/notice',{minutes:2});
   const seen=await s.waitForSelector('[data-notice]',{timeout:7000}).then(()=>true).catch(()=>false);await wait(400);
   const n=await s.evaluate(()=>{const el=document.querySelector('[data-notice]');const r=el?.getBoundingClientRect();const top=document.querySelector('.lesson-top').getBoundingClientRect().bottom;const b=[...document.querySelectorAll('[data-task] button[data-part]')].find(x=>x.getClientRects().length);const f=document.querySelector('.lesson-foot').getBoundingClientRect().top;
    return {text:el?.innerText||'',inFlow:!!el&&getComputedStyle(el).position!=='fixed'&&r.top>=top-1,btn:b?Math.round(b.getBoundingClientRect().bottom)<=f:false};});
   const l=(await live(s)).filter(x=>/заканчиваем/.test(x));
   check('F2-CHILD-01 the teacher warns: within 6 s the child sees "Через 2 минуты заканчиваем" in the page flow, answers stay visible on 375',sent.status===200&&seen&&/Через 2 минуты заканчиваем/.test(n.text)&&n.inFlow&&n.btn,JSON.stringify({sent:sent.status,...n}));
   check('F2-CHILD-02 one announcement for the notice',l.length===1,l.join(' | '));await shot(s,'notice-375.png');
   await s.click('[data-calm]');await wait(500);check('F2-CHILD-03 "Тихо": the notice is there and nothing moves',await s.locator('[data-notice]').count()===1&&await s.evaluate(()=>document.getAnimations().length)===0);await s.click('[data-calm]');await wait(300);
   await s.click('[data-notice] [data-notice-ok]');await wait(5600);check('F2-CHILD-04 "Понятно" hides the notice and the same notice does not come back',await s.locator('[data-notice]').count()===0);
   await api(tp,'/api/v2/notice',{minutes:0});await tc.close();await c.close();}
  // ---------------- F3 "Сначала - потом": the child may pick what comes after the lesson; the summary leads there ----------------
  if(run('THEN')){await reset();const c=await ctx();const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');await s.waitForSelector('[data-pick], .path');await pick(s);
   await s.goto(B+'/child#/lesson');await s.waitForSelector('[data-then]');await s.focus('[data-then="watch"]');await s.keyboard.press('Enter');await wait(300);
   const t0=await s.evaluate(()=>({pressed:document.querySelector('[data-then="watch"]')?.getAttribute('aria-pressed'),focus:document.activeElement?.dataset?.then}));await s.click('[data-go="explanation"]');await wait(400);
   const t1={...t0,line:await s.evaluate(()=>document.querySelector('[data-then-line]')?.textContent||'')};
   check('F3-01 on the first lesson screen the child picks "Мультфильм" with the keyboard: pressed, focus stays, the line "Сначала ... Потом: Мультфильм"',t1.pressed==='true'&&/Потом: Мультфильм/.test(t1.line)&&t1.focus==='watch',JSON.stringify(t1));
   await shot(s,'then-goal-1440.png');await wait(1200);await solveAll(s);await s.goto(B+'/child#/home');await s.goto(B+'/child#/lesson');await s.waitForSelector('.summary');await wait(500);
   const btn=await s.locator('[data-then-go]').count();check('F3-02 the summary offers "Теперь: Мультфильм"',btn===1&&/Теперь: Мультфильм/.test(await s.locator('[data-then-go]').textContent()));
   if(btn){await s.focus('[data-then-go]');await s.keyboard.press('Enter');await wait(800);check('F3-03 the button leads to the videos (#/watch)',/#\/watch/.test(s.url()),s.url());}
   await c.close();
   const q=await ctx();const p=await q.newPage();await loginAs(p,'student-03');await p.goto(B+'/child');await p.waitForSelector('[data-pick], .path');if(await p.locator('[data-pick]').count())await p.click('[data-pick="calm"]');else{await p.evaluate(()=>{});}
   await p.goto(B+'/child#/lesson');await p.waitForSelector('.lesson-top');await wait(500);const calmPreset=await p.evaluate(()=>document.documentElement.dataset.preset);
   if(calmPreset==='calm')check('F3-04 calm mode: no "Сначала - потом" line',await p.locator('[data-then-line]').count()===0);await q.close();}
  // ---------------- 12. 375: answers visible, header opaque, mascot does not cover text ----------------
  if(run('M375')){await reset();const c=await ctx({viewport:{width:375,height:812},isMobile:true,hasTouch:true});const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');await s.waitForSelector('[data-pick], .path');await pick(s);await s.waitForSelector('.now-card');await wait(800);
   const ov=await s.evaluate(()=>{const m=document.querySelector('.now-card .who');if(!m||m.hidden)return 'no mascot';const a=m.getBoundingClientRect();const bad=[];for(const el of document.querySelectorAll('.now-card h2,.now-card .meta,.now-card .kicker,.now-card .btn')){const rg=document.createRange();rg.selectNodeContents(el);for(const r of rg.getClientRects())if(r.width&&r.right>a.left+2&&r.left<a.right-2&&r.bottom>a.top+2&&r.top<a.bottom-2){bad.push(el.className||el.tagName);break;}}return bad.join(',');});
   check('FIX-12c home 375: the mascot does not cover the text of the "Сейчас" card',ov==='',ov);await shot(s,'home-375.png');
   await s.click('a[data-continue]');await s.waitForSelector('.lesson-top');await wait(600);await shot(s,'lesson-goal-375.png');
   for(const g of ['explanation','example','practice']){await s.click(`[data-go="${g}"]`);await wait(500);}
   await s.waitForSelector('[data-task]');await wait(600);
   const fold=await s.evaluate(()=>{const f=document.querySelector('.lesson-foot').getBoundingClientRect();const b=[...document.querySelectorAll('[data-task] button[data-part]')].find(x=>x.getClientRects().length);const r=b?.getBoundingClientRect();return {btn:r?Math.round(r.bottom):-1,foot:Math.round(f.top)};});
   check('FIX-12d 375: the first answer option is visible above the footer without scrolling',fold.btn>0&&fold.btn<=fold.foot,JSON.stringify(fold));await shot(s,'practice-375.png');
   check('FIX-12e the lesson header has a solid background',await s.evaluate(()=>getComputedStyle(document.querySelector('.lesson-top')).backgroundColor)==='rgb(251, 250, 246)');
   await s.click('button[data-part="0"]');await s.click('button[data-part="1"]');await s.click('[data-check]');await s.waitForSelector('.sheet[data-kind="try"]');await wait(400);
   const vis=await s.evaluate(()=>{const top=document.querySelector('.lesson-top').getBoundingClientRect().bottom,foot=document.querySelector('.lesson-foot').getBoundingClientRect().top;const h=document.querySelector('#stage-h').getBoundingClientRect();const inSheet=/Задание|Тапсырма/.test(document.querySelector('.sheet')?.innerText||'');return {head:h.top>=top-2&&h.bottom<=foot+2,inSheet};});
   check('FIX-12f 375: after a wrong answer the task is visible (heading on screen or repeated in the sheet)',vis.head||vis.inSheet,JSON.stringify(vis));await shot(s,'try-375.png');
   check('FIX-12g 375: no horizontal scroll',await s.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const small=await s.evaluate(()=>[...document.querySelectorAll('.lesson-top a,.lesson-top button')].filter(b=>b.offsetParent).map(b=>b.getBoundingClientRect()).filter(r=>r.width<47.5||r.height<47.5).length);
   check('U9 375: every control in the lesson header is at least 48 px',small===0,String(small));
   await c.close();}
  if(run('M320')){const c=await ctx({viewport:{width:320,height:640},isMobile:true,hasTouch:true});const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child#/lesson');await s.waitForSelector('.lesson-top');await wait(800);
   const r=await s.evaluate(()=>({sw:document.documentElement.scrollWidth,cap:(()=>{const e=document.querySelector('.trail-cap');return e.scrollWidth<=e.clientWidth+1;})()}));
   check('U8 320: no horizontal scroll and the step caption is not cut',r.sw<=320&&r.cap,JSON.stringify(r));await shot(s,'lesson-320.png');await c.close();}
  // ---------------- 13. motion ceilings: the home lantern and the summary ----------------
  if(run('MOTION')){await reset();const c=await ctx();const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');await s.waitForSelector('[data-pick], .path');await pick(s);await s.waitForSelector('.path');
   await wait(5200);const n=await s.evaluate(()=>document.getAnimations().filter(a=>!a.effect?.target?.closest?.('[data-mascot],.who')).length);
   check('FIX-13a home ("Живо"): 5 s after opening nothing moves (lantern breath <= 5 s)',n===0,String(n));
   await s.click('a[data-continue]');await s.waitForSelector('.lesson-top');await wait(1800);await solveAll(s);await s.evaluate(()=>{window.__anims.length=0;});
   await s.goto(B+'/child#/home');await s.goto(B+'/child#/lesson');await s.waitForSelector('.summary');const t0=await s.evaluate(()=>performance.now());await wait(5600);
   const sc=await s.evaluate(t0=>{const a=window.__anims.filter(x=>/ember/.test(x.cls));const end=Math.max(0,...a.map(x=>x.t+x.delay+x.dur*x.it))-t0;
    let vmax=0;for(const x of a){const pts=x.k.map(f=>{const m=/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(f.transform||'');return m?[+m[1],+m[2],f.offset]:null;});const fr=pts.filter(Boolean);
     for(let i=1;i<fr.length;i++){const o0=fr[i-1][2]??(i-1)/(fr.length-1),o1=fr[i][2]??i/(fr.length-1);const d=Math.hypot(fr[i][0]-fr[i-1][0],fr[i][1]-fr[i-1][1]);const dt=(o1-o0)*x.dur/1000;if(dt>0)vmax=Math.max(vmax,d/dt);}}
    return {end:Math.round(end),vmax:Math.round(vmax),n:a.length,embersLeft:document.querySelectorAll('.ember').length};},t0);
   check('FIX-13b summary scene ends within 5 s and no ember is faster than 120 px/s (linear segments)',sc.end<=5000&&sc.vmax<=120&&sc.n>0&&sc.embersLeft===0,JSON.stringify(sc));
   const sum=await s.evaluate(()=>({earned:document.querySelector('[data-earned]')?.textContent,text:document.querySelector('.summary')?.innerText||''}));
   check('FIX-14c summary counters agree: embers of the lesson = solved tasks',/Решено заданий: 7 из 7/.test(sum.text)&&sum.earned==='7',JSON.stringify(sum.earned));
   check('U12 the summary does not repeat "Урок завершён" twice',(sum.text.match(/Урок завершён/g)||[]).length===1);
   await shot(s,'summary-1440.png');await c.close();}
  if(run('SOFT')){const c=await ctx();const s=await c.newPage();await loginAs(s,'student-02');await s.goto(B+'/child#/lesson');await s.waitForSelector('.lesson-top');
   await s.evaluate(()=>{document.documentElement.dataset.motion='soft';window.__anims.length=0;});const M=await s.evaluate(async()=>{const m=await import('/v2/motion.mjs');const el=document.querySelector('.ember-count');m.nudge(el);m.lightUp(el,400);m.sheetIn(el);m.appear(el);m.stepIn(el,1);return window.__anims.map(x=>x.dur);});
   check('U6 "Мягко": no reaction is longer than 240 ms',M.length>0&&M.every(d=>d<=240),M.join(','));await c.close();}
  // ---------------- 14. unequal parts: one hint at a time, an honest right-answer text ----------------
  if(run('C2')){await reset();const c=await ctx();const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');await s.waitForSelector('[data-pick], .path');await pick(s);await s.goto(B+'/child#/lesson');await s.waitForSelector('.lesson-top');
   await s.evaluate(async()=>{const key=Object.keys(localStorage).find(k=>/\.att\./.test(k));});
   await wait(1800);await solveAllBut(s);
   await s.goto(B+'/child#/home');await s.goto(B+'/child#/lesson');await s.waitForSelector('.lesson-top');await wait(600);
   const ok=await toTask(s,'НЕ равные');check('FIX-14 reached the unequal-parts task',ok,await s.evaluate(()=>(document.querySelector('#stage-h')?.textContent||'')+' | '+[...document.querySelectorAll('.foot-main button')].map(b=>b.outerHTML.slice(0,80)).join(' ')));
   if(ok){if(!await s.locator('button[data-part="0"]').count()){await s.click('[data-other]');await s.click('[data-view="2d"]');await wait(300);}
    await s.click('button[data-part="0"]');await s.click('[data-check]');await s.waitForSelector('.sheet[data-kind="try"]');await s.click('.foot-main [data-hint]');await wait(400);
    const blocks=await s.evaluate(()=>[...document.querySelectorAll('.task-card .feedback, .sheet-wrap')].filter(e=>e.offsetParent).length);
    check('FIX-14a one hint at a time: the hint replaces the "not yet" sheet',blocks===1,String(blocks));
    check('FIX-14b the hint label reads naturally ("Подсказка 1 из 3")',await s.evaluate(()=>/Подсказка 1 из 3/.test(document.body.innerText)));
    await s.click('button[data-part="0"]');await s.click('button[data-part="1"]');await s.click('[data-check]');await s.waitForSelector('.sheet[data-kind="ok"]');
    const txt=await s.evaluate(()=>document.querySelector('.sheet').innerText);check('FIX-14d the right answer on unequal parts never says "равных частей"',!/равн/.test(txt)&&/четверть|четвёрт/.test(txt),txt.replace(/\n/g,' '));
    await shot(s,'c2-ok-1440.png');}
   await c.close();}
  // ---------------- 8. Kazakh everywhere (child + landing) ----------------
  if(run('KK')){const c=await ctx();const k=await c.newPage();await k.goto(B+'/demo');await k.evaluate(()=>{localStorage.setItem('ayan.v2.demoLang','kk');localStorage.setItem('ayan.v2.lang','kk');});await api(k,'/api/demo/login',{as:'student-02'});await k.goto(B+'/child');await k.waitForSelector('.path');await wait(500);
   const kk=await k.evaluate(()=>({text:document.body.innerText,title:document.title,skip:document.querySelector('a[href="#main"]')?.textContent}));
   check('FIX-08a child home in Kazakh: no "Fraction World", Kazakh tab title and skip link',!/Fraction World/.test(kk.text)&&/оқушы|Басты/.test(kk.title)&&/Негізгі/.test(kk.skip||''),JSON.stringify({title:kk.title,skip:kk.skip}));
   check('BRAND child: the brand is written "Аян"',!/\bayan\b|\bAyan\b/.test(kk.text));
   await shot(k,'child-home-kk-1440.png');
   await k.goto(B+'/child#/lesson');await k.waitForSelector('.lesson-top');await wait(400);check('FIX-08b lesson tab title in Kazakh',/Аян/.test(await k.title())&&!/Мой маршрут/.test(await k.title()),await k.title());
   const l=await c.newPage();await l.goto(B+'/?lang=kk');await wait(800);const lt=await l.evaluate(()=>document.body.innerText);
   const ru=['Перейти к содержанию','Твой план','Посмотреть пример','Открыть кабинет','Открыть игры','Открыть отчёт','Как ребёнку войти','Создать кабинет учителя','Сначала демо','Учителю','Данные детей','Понимать'].filter(x=>lt.includes(x));
   const skipL=await l.evaluate(()=>document.querySelector('a.skip')?.textContent);
   check('FIX-08c landing in Kazakh: plan, role buttons, FAQ, closing buttons, footer and skip link are Kazakh',ru.length===0&&!/Перейти/.test(skipL||''),ru.join(', ')+' skip='+skipL);
   check('BRAND landing: the brand is written "Аян" (no "ayan" / "Ayan" in visible text)',!/\bayan\b|\bAyan\b/.test(lt),(lt.match(/.{20}\b(ayan|Ayan)\b.{20}/)||[''])[0]);
   await l.setViewportSize({width:1440,height:900});await l.evaluate(()=>scrollTo(0,0));await shot(l,'landing-kk-1440.png');
   const r=await c.newPage();await r.goto(B+'/?lang=ru');await wait(600);const h1=await r.evaluate(()=>document.querySelector('h1').innerText);
   check('FIX-15a landing heading names the audience (inclusive class)',/инклюзивн/i.test(h1),h1);
   check('FIX-15b landing has a product scene (live demo frame)',await r.locator('[data-scene]').count()>=1);
   await shot(r,'landing-ru-1440.png');await r.setViewportSize({width:375,height:812});await wait(300);await shot(r,'landing-ru-375.png');
   check('FIX-15c landing 375: no horizontal scroll',await r.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await c.close();}
  // ---------------- D9: crossfade between lesson steps, synchronous DOM ----------------
  if(run('VT')){await reset();const c=await ctx();const s=await c.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');await s.waitForSelector('[data-pick], .path');await pick(s);await s.goto(B+'/child#/lesson');await s.waitForSelector('.lesson-top');await wait(500);
   const stepBtn='.foot-main .back[data-go], .foot-main .push[data-go]';
   if(await s.locator(stepBtn).count()){const r=await s.evaluate(sel=>{const before=document.querySelector('#stage-h')?.textContent;document.querySelector(sel).click();return {ghost:!!document.querySelector('.step-ghost'),ghostHidden:document.querySelector('.step-ghost')?.getAttribute('aria-hidden'),changed:document.querySelector('#stage-h')?.textContent!==before,focus:document.activeElement?.id};},stepBtn);
    check('D9 "Живо": a step change crossfades (the old card fades out, inert) and the new step is in the DOM and focused at once',r.ghost&&r.ghostHidden==='true'&&r.changed&&r.focus==='stage-h',JSON.stringify(r));
    await wait(500);check('D9 the old card is gone after the crossfade',await s.locator('.step-ghost').count()===0);
    await s.click('[data-calm]');await wait(300);const q=await s.evaluate(sel=>{document.querySelector(sel)?.click();return {ghost:!!document.querySelector('.step-ghost'),anims:document.getAnimations().length};},stepBtn);
    check('D9 "Тихо": no crossfade, no animation',!q.ghost&&q.anims===0,JSON.stringify(q));await s.click('[data-calm]');}
   else check('D9 a step button exists',false);await c.close();}
  check('no page errors',errors.length===0,errors.slice(0,3).join(' | '));
 }catch(e){console.error(e);results.push(['crash',false]);}
 await browser.close();
 const failed=results.filter(r=>!r[1]);console.log(JSON.stringify({checks:results.length,failed:failed.length}));process.exit(failed.length?1:0);
 async function solveAllBut(p){await p.evaluate(async()=>{const key=Object.keys(localStorage).find(k=>/\.att\./.test(k));const st=JSON.parse(localStorage[key]||'{}');if(!st.attemptId)return;
  const ans={f1:'mark:0',f2:'mark:0',f3:'mark:0,2',f4:'mark:0,1,2',f5:'mark:0',c1:'mark:1'};
  for(const [task,a] of Object.entries(ans))await fetch('/api/v2/child/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:st.attemptId,taskId:task,submissionId:'fy'+task+Math.random().toString(36).slice(2,12),answer:a})});
  st.stage='check';st.ui={...(st.ui||{}),checkIndex:1,maxStage:'check'};localStorage.setItem(key,JSON.stringify(st));});}
})();
