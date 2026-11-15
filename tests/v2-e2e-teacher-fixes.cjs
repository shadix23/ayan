// Fixes round 1 (teacher cabinet, parent page) in a real browser against a LOCAL demo server with synthetic data.
// B1 the pulse does not redraw unchanged cards and keeps focus, D4 a lost session shows a sign-in button, UT2/D7 "Назначить
// следующий пример" in one or two clicks, UT3 "Видел, иду" leaves a visible mark, UT4 no dead end without a sign-in link,
// UT1 the parent page has no giant icon and gives advice instead of the task wording, D2 student names on Kazakh screens.
// Usage: AYAN_DEMO=1 AYAN_DB_FILE=.data/test-teacher.sqlite PORT=4311 node server.mjs
//        AYAN_TEST_URL=http://127.0.0.1:4311 PLAYWRIGHT_PATH=... node tests/v2-e2e-teacher-fixes.cjs
// Screenshots go to hackathon/shots/fix1/ (AYAN_SHOTS=0 to skip).
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4311',SHOTS=process.env.AYAN_SHOTS!=='0',DIR='hackathon/shots/fix1';
if(SHOTS)fs.mkdirSync(DIR,{recursive:true});
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];
 async function ctx(opts={}){const c=await browser.newContext({viewport:{width:1440,height:900},...opts});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
 async function api(page,p,body){return page.evaluate(async([p,b])=>{const r=await fetch(p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});let d=null;try{d=await r.json();}catch{}return {status:r.status,data:d};},[p,body]);}
 async function loginAs(page,as){await page.goto(B+'/demo');await api(page,'/api/demo/login',{as});}
 const shot=async(page,name)=>{if(SHOTS)await page.screenshot({path:path.join(DIR,name)});};
 try{
  {const p=await (await ctx()).newPage();await p.goto(B+'/demo');await api(p,'/api/demo/reset',{});await p.close();}
  const tc=await ctx();const t=await tc.newPage();await loginAs(t,'teacher-a');await t.goto(B+'/teacher#/now');await t.waitForSelector('.pulse-grid');await t.waitForSelector('[data-recfollow]');await wait(400);
  await shot(t,'teacher-now-1440.png');
  // ---- B1: no redraw of unchanged cards, focus stays on the same element ----
  await t.focus('[data-pulse="demo-student-02"] a[href*="report"]');
  await t.evaluate(()=>{window.__f=document.activeElement;window.__mut=0;new MutationObserver(m=>{for(const x of m)for(const n of x.removedNodes)if(n.nodeType===1&&(n.matches("[data-pulse],.pulse-grid")||n.querySelector?.("[data-pulse]")))window.__mut++;}).observe(document.querySelector("#view"),{childList:true,subtree:true});});
  await wait(7000);
  const b1=await t.evaluate(()=>({same:document.activeElement===window.__f,text:document.activeElement?.textContent?.trim(),mut:window.__mut}));
  check('FIX-01 pulse: 7 s with no change in class -> 0 card replacements, focus stays on "Отчёт"',b1.same&&b1.mut===0&&/Отчёт/.test(b1.text||''),JSON.stringify(b1));
  await t.focus('[data-recfollow]');await t.evaluate(()=>{window.__f=document.activeElement;});await wait(4000);
  check('FIX-01b focus on "Назначить следующий пример" survives the polling',await t.evaluate(()=>document.activeElement===window.__f&&document.activeElement.isConnected));
  const live=await t.textContent('.live');
  check('FIX-01c "Обновлено в" shows hours and minutes only (no seconds ticking every 3 s)',/\d{1,2}:\d{2}/.test(live)&&!/\d{1,2}:\d{2}:\d{2}/.test(live),live);
  // ---- UT3: "Видел, иду" leaves a visible confirmation, the card does not vanish ----
  await t.click('[data-pulse="demo-student-03"] [data-ack]');
  const coming=await t.waitForSelector('[data-pulse="demo-student-03"] [data-coming]',{timeout:5000}).then(()=>true).catch(()=>false);
  const c3=await t.evaluate(()=>{const el=document.querySelector('[data-pulse="demo-student-03"]');return {status:el?.dataset.status,text:el?.querySelector('[data-coming]')?.textContent?.trim()||'',first:document.querySelector('[data-pulse]')===el};});
  check('FIX-06 "Видел, иду": the card stays in place with "Вы идёте" and the time, the child is not shown on a break',coming&&c3.status!=='break'&&c3.first&&/иду|идёте/i.test(c3.text),JSON.stringify(c3));
  await shot(t,'teacher-ack-1440.png');
  // ---- UT2 / D7: next example in one or two clicks ----
  await t.click('[data-recfollow]');await t.waitForSelector('dialog [data-fassign]');
  const dlg=await t.evaluate(()=>({opts:document.querySelectorAll('dialog input[name=fopt]').length,checked:!!document.querySelector('dialog input[name=fopt]:checked'),custom:!!document.querySelector('dialog [data-fcustom]'),
   constructorShown:!!document.querySelector('dialog [data-ed]')?.offsetParent,h:document.querySelector('dialog .dlg')?.getBoundingClientRect().height,vh:innerHeight}));
  check('FIX-05 the next-example window: ready examples (one preselected), the constructor hidden behind "Настроить", fits the screen',dlg.opts>=2&&dlg.checked&&dlg.custom&&!dlg.constructorShown&&dlg.h<=dlg.vh,JSON.stringify(dlg));
  await shot(t,'teacher-next-example-1440.png');
  await t.click('dialog [data-fassign]');
  const closed=await t.waitForSelector('dialog',{state:'detached',timeout:5000}).then(()=>true).catch(()=>false);
  await wait(300);
  const after=await t.evaluate(()=>({done:document.querySelector('[data-recdone]')?.textContent?.trim()||'',again:!!document.querySelector('[data-recfollow]'),toast:document.querySelector('.toast:not([hidden])')?.textContent||''}));
  check('FIX-05b one click "Назначить": the window closes, a clear confirmation, the recommendation shows "назначено" and cannot be assigned twice',closed&&!!after.done&&!after.again&&!!after.toast,JSON.stringify(after));
  await shot(t,'teacher-next-assigned-1440.png');
  const n=(await api(t,'/api/v2/class')).data;const s2=(await api(t,'/api/v2/pulse')).data.students.find(s=>s.id==='demo-student-02');
  check('FIX-05c the new example really waits for Student 02',!!s2?.next?.followup||s2?.followup===true,JSON.stringify(s2?.next||s2?.status));void n;
  // ---- D2: Kazakh screen, Kazakh student names ----
  await t.evaluate(()=>localStorage.setItem('ayan.v2.lang','kk'));await t.reload();await t.waitForSelector('.pulse-grid');await wait(300);
  const kk=await t.evaluate(()=>[...document.querySelectorAll('.pcard h3')].map(h=>h.textContent));
  check('FIX-08 Kazakh teacher screen: student names are Kazakh ("Оқушы 01"), not "Ученик"',kk.length===3&&kk.every(x=>/Оқушы/.test(x)&&!/Ученик/.test(x)),kk.join(','));
  await shot(t,'teacher-now-kk-1440.png');
  await t.evaluate(()=>localStorage.setItem('ayan.v2.lang','ru'));await t.reload();await t.waitForSelector('.pulse-grid');
  // ---- D4 / UT4: lost session -> message and a sign-in button, never a silent freeze or a dead end ----
  await tc.clearCookies();
  const relog=await t.waitForSelector('[data-relogin]',{timeout:7000}).then(()=>true).catch(()=>false);
  const rl=await t.evaluate(()=>({href:document.querySelector('[data-relogin]')?.getAttribute('href'),msg:document.querySelector('[data-lost]')?.textContent?.trim()||''}));
  check('FIX-01d pulse after the session is lost: "Связь с кабинетом потеряна" and a sign-in button',relog&&!!rl.href&&rl.msg.length>10,JSON.stringify(rl));
  await shot(t,'teacher-session-lost-1440.png');
  await t.goto(B+'/teacher#/library');await wait(1200);
  const dead=await t.evaluate(()=>({url:location.pathname,btn:!!document.querySelector('[data-relogin], form input[type=password], [data-role-card]')}));
  check('FIX-07 no dead end "Войдите как учитель": a page without a session offers a way to sign in',dead.btn||/login|demo/.test(dead.url),JSON.stringify(dead));
  await tc.close();
  // a page already open when the session drops (the user-test case): the view shows the sign-in button, not just the error text
  {const c=await ctx();const p=await c.newPage();await loginAs(p,'teacher-a');await p.goto(B+'/teacher#/students');await p.waitForSelector('.rows');await c.clearCookies();
   await p.evaluate(()=>{location.hash='#/library';});await wait(1500);
   const v=await p.evaluate(()=>({btn:!!document.querySelector('#view [data-relogin], [data-relogin]'),text:document.body.innerText.includes('Войдите как учитель')}));
   check('FIX-07b open cabinet, session gone, next section: a sign-in button next to the message',v.btn,JSON.stringify(v));await shot(p,'teacher-no-session-1440.png');await c.close();}
  // ---- UT1: parent page ----
  {const c=await ctx();const p=await c.newPage();await p.goto(B+'/demo');await p.evaluate(()=>localStorage.removeItem('ayan.v2.lang'));await p.goto(B+'/demo/parent#demo-parent-link-student-01');await p.waitForSelector('.p-lesson');await wait(400);
   const pr=await p.evaluate(()=>({svg:Math.max(0,...[...document.querySelectorAll('.p-home svg')].map(s=>s.getBoundingClientRect().height)),home:document.querySelector('.p-home')?.textContent||'',
    title:document.title,skip:document.querySelector('a[href="#main"]')?.textContent||'',lang:document.documentElement.lang,names:document.querySelector('h1')?.textContent||''}));
   check('FIX-04 parent: no giant icon (<= 32 px), advice for the parent instead of the task wording',pr.home.length>10&&pr.svg>0&&pr.svg<=32&&!/тең ЕМЕС|НЕ равные|белгіле/.test(pr.home),JSON.stringify(pr));
   check('FIX-04b parent in Kazakh: tab title, skip link and the student name all Kazakh',pr.lang==='kk'&&/Негізгі/.test(pr.skip)&&!/Как проходит|обучение/.test(pr.title)&&/Оқушы/.test(pr.names),JSON.stringify({t:pr.title,s:pr.skip,n:pr.names}));
   await shot(p,'parent-1440.png');
   await p.setViewportSize({width:375,height:812});await wait(300);await shot(p,'parent-375.png');
   check('FIX-04c parent at 375: no horizontal scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await c.close();}
  // ---- 375 px teacher: pulse and the next-example window ----
  {const c=await ctx({viewport:{width:375,height:812}});const p=await c.newPage();await p.goto(B+'/demo');await api(p,'/api/demo/reset',{});await loginAs(p,'teacher-a');await p.goto(B+'/teacher#/now');await p.waitForSelector('[data-recfollow]');await wait(300);
   await shot(p,'teacher-now-375.png');await p.click('[data-recfollow]');await p.waitForSelector('dialog [data-fassign]');await wait(200);
   const m=await p.evaluate(()=>({h:document.documentElement.scrollWidth<=innerWidth,btn:document.querySelector('dialog [data-fassign]').getBoundingClientRect().bottom<=innerHeight}));
   check('FIX-05d 375: the next-example window has the main button on screen, no horizontal scroll',m.h&&m.btn,JSON.stringify(m));await shot(p,'teacher-next-example-375.png');await c.close();}
  // ---- Codex: one pulse request at a time, a slow old answer never overwrites a newer one ----
  {const c=await ctx();const p=await c.newPage();await loginAs(p,'teacher-a');let inflight=0,maxIn=0,n=0;
   await p.route('**/api/v2/pulse',async route=>{n++;inflight++;maxIn=Math.max(maxIn,inflight);const slow=n===2;if(slow)await wait(7000);try{await route.continue();}finally{inflight--;}});
   await p.goto(B+'/teacher#/now');await p.waitForSelector('.pulse-grid');await wait(11000);
   check('CX-06 pulse: never two requests at once, even when one answer is slow',maxIn===1&&n>=2,JSON.stringify({maxIn,n}));await c.close();}
  {const c=await ctx();const p=await c.newPage();await p.goto(B+'/demo/parent#demo-parent-link-student-01');await p.waitForSelector('.p-lesson');
   const demo=await p.evaluate(()=>document.querySelector('[data-demo-note]')?.textContent?.trim()||'');
   check('CX-07 parent demo report shows "синтетические данные"',/[Сс]интетик/.test(demo),demo);await c.close();}
  check('no page errors',errors.length===0,errors.slice(0,3).join(' | '));
 }catch(e){console.error(e);results.push(['crash',false]);}
 await browser.close();
 const failed=results.filter(r=>!r[1]);console.log(JSON.stringify({checks:results.length,failed:failed.length}));process.exit(failed.length?1:0);
})();
