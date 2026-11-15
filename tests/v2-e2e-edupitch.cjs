// EduPitch MVP in a real browser against the LOCAL demo server (synthetic data): the "Огоньки" path, the lesson focus mode,
// the three motion levels (Тихо = no animations at all), the live class pulse (break and help reach the teacher without reload),
// the summary scene, the parent report on V2 data, the demo chooser and the split screen.
// Usage: AYAN_DEMO=1 PORT=4301 node server.mjs; AYAN_TEST_URL=http://127.0.0.1:4301 PLAYWRIGHT_PATH=... node tests/v2-e2e-edupitch.cjs
// Screenshots go to hackathon/shots/build/ (AYAN_SHOTS=0 to skip).
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4301',SHOTS=process.env.AYAN_SHOTS!=='0',DIR='hackathon/shots/build';
if(SHOTS)fs.mkdirSync(DIR,{recursive:true});
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];
 async function ctx(opts={}){const c=await browser.newContext({viewport:{width:1440,height:900},...opts});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
 async function api(page,p,body){return page.evaluate(async([p,b])=>{const r=await fetch(p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});let d=null;try{d=await r.json();}catch{}return {status:r.status,data:d};},[p,body]);}
 async function loginAs(page,as){await page.goto(B+'/demo');await api(page,'/api/demo/login',{as});}
 const shot=async(page,name)=>{if(SHOTS)await page.screenshot({path:path.join(DIR,name)});};
 const noHScroll=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 // A focusable element scrolled into view must never sit under the sticky lesson footer (audit B6).
 const covered=page=>page.evaluate(()=>{const foot=document.querySelector('.lesson-foot');if(!foot)return ['no footer'];const bad=[];
  for(const el of document.querySelectorAll('main button:not([disabled]), main a[href], main [tabindex="0"]')){if(!el.offsetParent)continue;el.scrollIntoView({block:'nearest'});
   const r=el.getBoundingClientRect(),f=foot.getBoundingClientRect();if(r.bottom>f.top+1&&r.top<f.bottom)bad.push((el.textContent||el.dataset.part||el.tagName).trim().slice(0,24));}window.scrollTo(0,0);return bad;});
 const animCount=page=>page.evaluate(()=>document.getAnimations().length);
 const watchEmbers=page=>page.evaluate(()=>{window.__embers=0;new MutationObserver(m=>{for(const x of m)for(const n of x.addedNodes)if(n.classList?.contains('ember'))window.__embers++;}).observe(document.body,{childList:true,subtree:true});});
 try{
  {const p=await (await ctx()).newPage();await p.goto(B+'/demo');await api(p,'/api/demo/reset',{});await p.close();}
  // ---------------- demo chooser and split screen ----------------
  {const c=await ctx();const p=await c.newPage();await p.goto(B+'/demo');await p.waitForSelector('[data-role-card]');
   check('DEMO-01 the demo opens with a role choice (child / teacher / parent) and a split-screen button',await p.locator('[data-role-card]').count()>=3&&await p.locator('[data-split]').count()===1);
   await shot(p,'demo-chooser-1440.png');
   await p.click('[data-split]');await p.waitForURL(/\/demo\/split/);await p.waitForSelector('iframe');await wait(2500);
   const frames=await p.evaluate(()=>[...document.querySelectorAll('iframe')].map(f=>f.contentWindow.location.pathname));
   check('DEMO-02 split screen shows the child and the teacher side by side, both signed in',frames.length===2&&frames.includes('/child')&&frames.includes('/teacher'),frames.join(','));
   await shot(p,'demo-split-1440.png');await c.close();}
  // ---------------- child home: path of lights ----------------
  const cc=await ctx();const s=await cc.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');
  await s.waitForSelector('[data-pick]');await s.click('[data-pick="standard"]');await s.waitForSelector('.path');await wait(600);
  const home=await s.evaluate(()=>({stops:[...document.querySelectorAll('.path [data-stop]')].map(e=>e.dataset.stop),days:document.querySelectorAll('.days .day').length,lit:document.querySelectorAll('.days .day.lit').length,
   today:document.querySelector('.days .day:last-child')?.classList.contains('lit'),cta:!!document.querySelector('a.btn[href="#/lesson"][data-continue]'),embers:document.querySelector('.ember-total')?.textContent||''}));
  check('HOME-EDU-01 path of lights: done -> now -> next, 7 "Дни со светом" with 3 lit and today dark, one main button',home.stops.join(',')==='done,now,next'&&home.days===7&&home.lit===3&&home.today===false&&home.cta&&/6/.test(home.embers),JSON.stringify(home));
  await shot(s,'child-home-1440.png');
  // ---------------- lesson in focus mode ----------------
  await s.click('a[data-continue]');await s.waitForSelector('.lesson-top');
  const focus=await s.evaluate(()=>({side:!!document.querySelector('.side'),segs:document.querySelectorAll('.trail .trail-seg').length,exit:!!document.querySelector('[data-exit]'),
   help:!!document.querySelector('.lesson-foot [data-phrase="help"]'),brk:!!document.querySelector('.lesson-foot [data-phrase="break"]'),board:!!document.querySelector('.lesson-foot [data-board]'),
   adult:/Критерий успеха|Версия урока|требует проверки/.test(document.body.innerText)}));
  check('FOCUS-01 lesson is a focus mode: no side menu, 5-step trail, exit, help / break / phrases in the footer, no adult texts',!focus.side&&focus.segs===5&&focus.exit&&focus.help&&focus.brk&&focus.board&&!focus.adult,JSON.stringify(focus));
  await shot(s,'child-lesson-goal-1440.png');
  await s.click('[data-go="explanation"]');await s.waitForSelector('[role=tablist]');await s.click('#tab-model');await wait(400);await shot(s,'child-lesson-model-1440.png');
  await s.click('[data-go="example"]');await s.waitForSelector('#stage-h');await s.click('[data-go="practice"]');await s.waitForSelector('[data-task]');await wait(1200);
  const views=await s.evaluate(()=>({visible:[...document.querySelectorAll('[data-view]')].filter(b=>b.offsetParent).length,other:!!document.querySelector('[data-other]'),howto:/Как управлять|Tab - переход/.test(document.body.innerText)}));
  check('FOCUS-02 3D / 2D / cards hide behind one "Другой способ" button; no keyboard manual on the task',views.visible===0&&views.other&&!views.howto,JSON.stringify(views));
  await s.click('[data-other]');await wait(200);const opened=await s.locator('[data-view]:visible').count();check('FOCUS-03 "Другой способ" opens the view choice',opened>=2,String(opened));
  await s.click('[data-view="2d"]');await wait(300);
  const cov=await covered(s);check('FOCUS-04 1440: no control is covered by the sticky footer (B6)',cov.length===0,cov.join('|'));
  await shot(s,'child-practice-1440.png');
  // correct answer in "Живо": the ember flies, the sheet rises
  await watchEmbers(s);await s.click('button[data-part="0"]');await s.click('[data-check]');
  await s.waitForSelector('.sheet[data-kind="ok"]');const animsLive=await animCount(s);await wait(150);await shot(s,'child-correct-ember-1440.png');await wait(700);
  const live=await s.evaluate(()=>({embers:window.__embers,text:document.querySelector('.sheet')?.innerText||'',ok:!!document.querySelector('[data-fb] .feedback.ok')}));
  check('MOTION-01 "Живо": a correct answer sends one ember to the trail and raises the answer sheet ("Огонёк зажжён")',live.embers===1&&/Огонёк зажжён/.test(live.text)&&live.ok&&animsLive>0,JSON.stringify({...live,animsLive}));
  await s.click('[data-nexttask]');await s.waitForSelector('button[data-part="3"]');
  // a wrong answer is quieter than a right one: sand sheet, no ember
  await s.evaluate(()=>{window.__embers=0;});await s.click('button[data-part="0"]');await s.click('button[data-part="1"]');await s.click('[data-check]');await s.waitForSelector('.sheet[data-kind="try"]');await wait(500);
  const wrong=await s.evaluate(()=>({embers:window.__embers,text:document.querySelector('.sheet')?.innerText||'',red:getComputedStyle(document.querySelector('.sheet')).backgroundColor}));
  check('MOTION-02 wrong answer: "Пока не подошло", sand sheet, no ember, no red',wrong.embers===0&&/Пока не подошло/.test(wrong.text)&&wrong.red!=='rgb(163, 52, 66)',JSON.stringify(wrong));
  await shot(s,'child-try-1440.png');
  // ---------------- live pulse: the teacher sees the break without reload ----------------
  const tc=await ctx();const t=await tc.newPage();await loginAs(t,'teacher-a');await t.goto(B+'/teacher');await t.waitForSelector('.pulse-grid');
  const first=await t.evaluate(()=>[...document.querySelectorAll('[data-pulse]')].map(e=>e.dataset.pulse+':'+e.dataset.status));
  check('LIVE-01 teacher home answers "Кому сейчас нужна помощь?": a card per student, the help request first',first[0]==='demo-student-03:help'&&first.some(x=>x==='demo-student-01:working'),first.join(' '));
  await shot(t,'teacher-now-1440.png');
  await s.click('.lesson-foot [data-phrase="break"]');await s.waitForSelector('.break-layer');
  const seenBreak=await t.waitForSelector('[data-pulse="demo-student-01"][data-status="break"]',{timeout:8000}).then(()=>true).catch(()=>false);
  const attn=await t.evaluate(()=>document.querySelector('[data-pulse="demo-student-01"]')?.classList.contains('attn'));
  check('LIVE-02 child presses "Перерыв" -> the teacher card shows the break within 8 s, highlighted, no reload',seenBreak&&attn,String(attn));
  await shot(t,'teacher-now-break-1440.png');await shot(s,'child-break-1440.png');
  const breathe=await s.locator('.break-layer [data-breathe]').count();check('BREAK-01 the break screen offers breathing started by the child and "Я готов продолжить"',breathe===1&&await s.locator('.break-layer [data-phrase="ready"]').count()===1);
  await s.click('.break-layer [data-phrase="ready"]');
  const back=await t.waitForSelector('[data-pulse="demo-student-01"][data-status="working"]',{timeout:8000}).then(()=>true).catch(()=>false);check('LIVE-03 back from the break -> working again on the teacher screen',back);
  await s.click('.lesson-foot [data-phrase="help"]');
  const helpSeen=await t.waitForSelector('[data-pulse="demo-student-01"][data-status="help"] [data-ack]',{timeout:8000}).then(()=>true).catch(()=>false);
  if(helpSeen)await t.click('[data-pulse="demo-student-01"] [data-ack]');
  const acked=await t.waitForSelector('[data-pulse="demo-student-01"][data-status="working"]',{timeout:8000}).then(()=>true).catch(()=>false);
  check('LIVE-04 "Мне нужна помощь" reaches the teacher; "Видел, иду" clears it',helpSeen&&acked);
  // ---------------- "Тихо": one click, then no animation at all ----------------
  await s.click('[data-calm]');await wait(400);await watchEmbers(s);
  await s.click('button[data-part="0"]');await s.click('[data-check]');await s.waitForSelector('.sheet');await wait(100);
  const quiet=await s.evaluate(()=>({anims:document.getAnimations().length,embers:window.__embers,canvas:document.querySelectorAll('canvas').length,motion:document.documentElement.dataset.motion}));
  check('MOTION-03 "Тихий режим" in one click: after an answer document.getAnimations() is empty, no ember, no WebGL canvas',quiet.anims===0&&quiet.embers===0&&quiet.canvas===0&&quiet.motion==='off',JSON.stringify(quiet));
  await shot(s,'child-calm-1440.png');await s.click('[data-calm]');await wait(300);
  // ---------------- summary scene (remaining tasks answered through the API, then the lesson is reopened) ----------------
  const fin=await s.evaluate(async()=>{const key=Object.keys(localStorage).find(k=>/\.att\./.test(k));const st=JSON.parse(localStorage[key]);
   const ans={f1:'mark:0',f2:'mark:0',f3:'mark:0,2',f4:'mark:0,1,2',f5:'mark:0',c1:'mark:1',c2:'mark:1'};let last=null;
   for(const [task,a] of Object.entries(ans)){const r=await fetch('/api/v2/child/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:st.attemptId,taskId:task,submissionId:'e2e'+task+Math.random().toString(36).slice(2,12),answer:a})});last=await r.json();}
   return last?.attempt?.state;});
  await s.goto(B+'/child#/home');await s.goto(B+'/child#/lesson');await s.waitForSelector('.summary');await wait(2600);
  const sum=await s.evaluate(()=>({h:document.querySelector('#stage-h')?.textContent,earned:document.querySelector('[data-earned]')?.textContent,left:document.querySelector('.summary')?.innerText||'',next:!!document.querySelector('.lesson-foot [data-route="#/lesson"]')}));
  check('SUM-01 summary: "Урок завершён", embers earned, lessons left to the full lantern, next lesson button',fin==='completed'&&/Урок завершён/.test(sum.h||'')&&/\d/.test(sum.earned||'')&&/фонарик/.test(sum.left)&&sum.next,JSON.stringify(sum));
  await shot(s,'child-summary-1440.png');
  await s.goto(B+'/child#/home');await s.waitForSelector('.path');await wait(800);
  const after=await s.evaluate(()=>({stops:[...document.querySelectorAll('.path [data-stop]')].map(e=>e.dataset.stop).join(','),today:document.querySelector('.days .day:last-child')?.classList.contains('lit')}));
  check('HOME-EDU-02 after the lesson: two lanterns lit on the path, today\'s day lit',after.stops==='done,done,now'&&after.today===true,JSON.stringify(after));
  // ---------------- reduced motion: nothing animates ----------------
  {const rc=await ctx({reducedMotion:'reduce'});const r=await rc.newPage();await loginAs(r,'student-03');await r.goto(B+'/child');await r.waitForSelector('[data-pick], .path');
   if(await r.locator('[data-pick]').count())await r.click('[data-pick="standard"]');await r.goto(B+'/child#/lesson');await r.waitForSelector('[data-task]');await wait(600);
   await r.click('button[data-part="0"]').catch(()=>{});await r.click('[data-check]');await r.waitForSelector('.sheet');await wait(100);
   const rm=await r.evaluate(()=>({anims:document.getAnimations().length,canvas:document.querySelectorAll('canvas').length,motion:document.documentElement.dataset.motion}));
   check('MOTION-04 prefers-reduced-motion: no animations after an answer, no WebGL',rm.anims===0&&rm.canvas===0&&rm.motion==='off',JSON.stringify(rm));await shot(r,'child-reduced-motion-1440.png');await rc.close();}
  {const mc=await ctx({viewport:{width:375,height:812},isMobile:true,hasTouch:true});const m=await mc.newPage();await loginAs(m,'student-03');await m.goto(B+'/child#/lesson');await m.waitForSelector('[data-task]');await wait(1500);await shot(m,'child-practice-375.png');
   check('M375-04 practice at 375 ("Живо"): no horizontal scroll',await noHScroll(m));await mc.close();}
  // ---------------- 375 px ----------------
  {const mc=await ctx({viewport:{width:375,height:812},isMobile:true,hasTouch:true});const m=await mc.newPage();await loginAs(m,'student-02');await m.goto(B+'/child');await m.waitForSelector('.path, [data-pick]');await wait(900);
   const fold=await m.evaluate(()=>{const el=document.querySelector('[data-mascot]');const r=el?.getBoundingClientRect();return {mascot:!!el&&!el.hidden&&r.height>40&&r.top<innerHeight,cta:document.querySelector('a[data-continue]')?.getBoundingClientRect().top<innerHeight};});
   check('M375-01 home at 375: mascot and the main button on the first screen, no horizontal scroll',fold.mascot&&await noHScroll(m),JSON.stringify(fold));await shot(m,'child-home-375.png');
   await m.goto(B+'/child#/lesson');await m.waitForSelector('.lesson-top');await wait(700);await shot(m,'child-lesson-375.png');
   const lessonOk=await noHScroll(m);const cov375=await covered(m);
   check('M375-02 lesson at 375: no horizontal scroll, nothing hidden under the footer',lessonOk&&cov375.length===0,cov375.join('|'));await mc.close();}
  {const mc=await ctx({viewport:{width:375,height:812}});const m=await mc.newPage();await loginAs(m,'teacher-a');await m.goto(B+'/teacher');await m.waitForSelector('.pulse-grid');await wait(500);
   check('M375-03 teacher pulse at 375: no horizontal scroll',await noHScroll(m));await shot(m,'teacher-now-375.png');await mc.close();}
  // ---------------- parent report on V2 data, Kazakh by default ----------------
  {const pc=await ctx();const p=await pc.newPage();await loginAs(p,'parent-01');await p.goto(B+'/demo/parent#demo-parent-link-student-01');await p.waitForSelector('.p-lesson');await wait(400);
   const pr=await p.evaluate(()=>({lessons:document.querySelectorAll('.p-lesson').length,days:document.querySelectorAll('.days .day').length,lang:document.documentElement.lang}));
   check('PARENT-E2E the parent report shows the V2 lessons and days with light, Kazakh by default',pr.lessons>=2&&pr.days===7&&pr.lang==='kk',JSON.stringify(pr));await shot(p,'parent-1440.png');await pc.close();}
  // ---------------- Kazakh demo ----------------
  {const kc=await ctx();const k=await kc.newPage();await k.goto(B+'/demo');await k.waitForSelector('[data-setlang="kk"]');await k.click('[data-setlang="kk"]');await api(k,'/api/demo/login',{as:'student-02'});await k.goto(B+'/child');await k.waitForSelector('.path');
   const kk=await k.evaluate(()=>document.body.innerText);check('KK-01 Kazakh interface: path and main button in Kazakh',/Шырақтар соқпағы/.test(kk)&&/Жарық күндер/.test(kk),kk.slice(0,80).replace(/\n/g,' '));await shot(k,'child-home-kk-1440.png');await kc.close();}
  check('no page errors',errors.length===0,errors.slice(0,3).join(' | '));
 }catch(e){console.error(e);results.push(['crash',false]);}
 await browser.close();
 const failed=results.filter(r=>!r[1]);console.log(JSON.stringify({checks:results.length,failed:failed.length}));process.exit(failed.length?1:0);
})();
