// Features for the defence (teacher side), real browser against a LOCAL demo server with synthetic data:
// F1 "Паспорт поддержки" (one printable page, an observation, not a diagnosis), F2 "Скоро заканчиваем" buttons on the
// pulse (no redraw, focus kept), F4 "Что работает в классе" on the reports page.
// Usage: AYAN_DEMO=1 AYAN_DB_FILE=.data/test-teacher.sqlite PORT=4311 node server.mjs
//        AYAN_TEST_URL=http://127.0.0.1:4311 PLAYWRIGHT_PATH=... node tests/v2-e2e-features-teacher.cjs
// Screenshots go to hackathon/shots/features/ (AYAN_SHOTS=0 to skip).
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4311',SHOTS=process.env.AYAN_SHOTS!=='0',DIR='hackathon/shots/features';
if(SHOTS)fs.mkdirSync(DIR,{recursive:true});
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];
 async function ctx(opts={}){const c=await browser.newContext({viewport:{width:1440,height:900},...opts});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
 async function api(page,p,body){return page.evaluate(async([p,b])=>{const r=await fetch(p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});let d=null;try{d=await r.json();}catch{}return {status:r.status,data:d};},[p,body]);}
 async function loginAs(page,as){await page.goto(B+'/demo');await api(page,'/api/demo/login',{as});}
 const shot=async(page,name)=>{if(SHOTS)await page.screenshot({path:path.join(DIR,name),fullPage:/full/.test(name)});};
 const setLang=async(page,l)=>page.evaluate(l=>localStorage.setItem('ayan.v2.lang',l),l);
 try{
  {const p=await (await ctx()).newPage();await p.goto(B+'/demo');await api(p,'/api/demo/reset',{});await p.close();}
  const tc=await ctx();const t=await tc.newPage();await loginAs(t,'teacher-a');await setLang(t,'ru');
  // ---------------- F2: "Скоро заканчиваем" on the pulse ----------------
  await setLang(t,'ru');await t.goto(B+'/teacher#/now');await t.waitForSelector('.pulse-grid');await t.waitForSelector('[data-notice-min="2"]');
  check('F2-T1 above the cards: "Предупредить класс" with 2 and 5 minutes',await t.locator('[data-notice-min="5"]').count()===1);
  await t.click('[data-notice-min="2"]');
  const sent=await t.waitForSelector('[data-notice-status]:has-text("3")',{timeout:5000}).then(()=>true).catch(()=>false);
  const nst=await t.evaluate(()=>({status:document.querySelector('[data-notice-status]')?.textContent?.trim(),cancel:!!document.querySelector('[data-notice-cancel]')}));
  check('F2-T2 one click "2 мин": "Отправлено 3 ученикам, до ЧЧ:ММ" and a cancel button',sent&&/3/.test(nst.status)&&/\d{1,2}:\d{2}/.test(nst.status)&&nst.cancel,JSON.stringify(nst));
  await shot(t,'notice-sent-1440.png');
  const child=await (await ctx()).newPage();await loginAs(child,'student-02');const cn=await api(child,'/api/v2/child/notice');
  check('F2-T3 the child really has the notice (2 min)',cn.data?.notice?.minutes===2,JSON.stringify(cn.data));
  // the bar is not redrawn by the 3 s polling and keeps focus
  await t.focus('[data-notice-cancel]');await t.evaluate(()=>{window.__nf=document.activeElement;});await wait(4000);
  check('F2-T4 focus on "Отменить" survives the pulse polling (no redraw)',await t.evaluate(()=>document.activeElement===window.__nf&&window.__nf.isConnected));
  await t.reload();await t.waitForSelector('[data-notice-cancel]',{timeout:6000}).catch(()=>{});
  check('F2-T5 after a reload the teacher still sees the active warning',await t.locator('[data-notice-cancel]').count()===1);
  await t.click('[data-notice-cancel]');await wait(800);
  const cn2=await api(child,'/api/v2/child/notice');const st2=await t.evaluate(()=>({cancel:!!document.querySelector('[data-notice-cancel]'),two:!!document.querySelector('[data-notice-min="2"]')}));
  check('F2-T6 "Отменить": the child has no notice, the buttons are back',cn2.data?.notice===null&&!st2.cancel&&st2.two,JSON.stringify([cn2.data,st2]));
  // ---------------- F1: support passport ----------------
  await t.goto(B+'/teacher#/report?child=demo-student-02');await t.waitForSelector('#sum-h');
  check('F1-01 the report has a "Паспорт поддержки" link',await t.locator('a[href^="#/passport?child=demo-student-02"]').count()>=1);
  await t.click('a[href^="#/passport?child=demo-student-02"]');await t.waitForSelector('[data-passport]');await wait(300);
  const pp=await t.evaluate(()=>({h:[...document.querySelectorAll('[data-passport] h2')].map(h=>h.textContent.trim()),text:document.querySelector('[data-passport]').innerText,print:!!document.querySelector('[data-print]'),back:!!document.querySelector('a[href^="#/report?child="]')}));
  const want=['Что помогает','Как подавать','Как просит помощь','Что повторить'];
  check('F1-02 passport of Student 02 (ru): the 4 sections, print and back buttons',want.every(w=>pp.h.includes(w))&&pp.print&&pp.back,pp.h.join(' | '));
  check('F1-03 the passport says "наблюдение, не диагноз" and names no diagnosis',/не диагноз/i.test(pp.text)&&!/диагноз поставлен|РАС|аутизм/i.test(pp.text),pp.text.slice(-160).replace(/\n/g,' '));
  await shot(t,'passport-ru-full-1440.png');
  // print preview: everything except the passport is hidden and it fits one A4 page
  await t.emulateMedia({media:'print'});
  const pr=await t.evaluate(()=>{const vis=s=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=='none'&&e.offsetParent!==null;};return {side:vis('.side'),strip:vis('.demo-strip'),btns:vis('[data-print]'),passport:vis('[data-passport]'),h:document.querySelector('[data-passport]').getBoundingClientRect().height};});
  const pdf=await t.pdf({format:'A4',printBackground:true});const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;
  await t.emulateMedia({media:'screen'});
  check('F1-04 print: menu, demo strip and buttons hidden, the passport fits one A4 page',!pr.side&&!pr.strip&&!pr.btns&&pr.passport&&pages===1,JSON.stringify({...pr,pages}));
  if(SHOTS)fs.writeFileSync(path.join(DIR,'passport-02.pdf'),pdf);
  await setLang(t,'kk');await t.goto(B+'/teacher#/passport?child=demo-student-01');await t.reload();await t.waitForSelector('[data-passport]');await wait(300);
  const kk=await t.evaluate(()=>({h:[...document.querySelectorAll('[data-passport] h2')].map(h=>h.textContent.trim()),text:document.querySelector('[data-passport]').innerText}));
  check('F1-05 passport of Student 01 in Kazakh: section titles in Kazakh, "диагноз емес", no Russian section titles',kk.h.length>=3&&kk.h.every(h=>!/Что |Как /.test(h))&&/диагноз емес/i.test(kk.text)&&/Оқушы 01/.test(kk.text),kk.h.join(' | '));
  await shot(t,'passport-kk-full-1440.png');
  {const mc=await ctx({viewport:{width:375,height:812}});const m=await mc.newPage();await loginAs(m,'teacher-a');await m.goto(B+'/teacher#/passport?child=demo-student-02');await m.waitForSelector('[data-passport]');await wait(300);
   check('F1-06 passport at 375: readable, no horizontal scroll',await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(m,'passport-375.png');await mc.close();}
  await t.goto(B+'/teacher#/profiles?child=demo-student-02');await t.waitForSelector('#page-h');await wait(800);
  check('F1-07 the support profile links to the passport',await t.locator('a[href^="#/passport?child=demo-student-02"]').count()>=1);
  // ---------------- F4: what works in the class ----------------
  await setLang(t,'ru');await t.goto(B+'/teacher#/reports');await t.reload();await t.waitForSelector('[data-class-insight]',{timeout:8000}).catch(()=>{});await wait(400);
  const ins=await t.evaluate(()=>{const c=document.querySelector('[data-class-insight]');return c?{rows:c.querySelectorAll('[data-insight]').length,links:[...c.querySelectorAll('a')].map(a=>a.getAttribute('href')),text:c.innerText}:null;});
  check('F4-01 reports: "Что работает в классе" with at least 2 observations, each with names and a link to a report',!!ins&&ins.rows>=2&&ins.links.length>=2&&ins.links.every(h=>h.startsWith('#/report?child=')),JSON.stringify(ins));
  check('F4-02 honest caption: an observation on N students, not statistics',!!ins&&/не статистика/.test(ins.text),ins?.text?.slice(-80));
  await shot(t,'insight-ru-1440.png');
  await setLang(t,'kk');await t.reload();await t.waitForSelector('[data-class-insight]',{timeout:8000}).catch(()=>{});await wait(400);
  const insk=await t.evaluate(()=>document.querySelector('[data-class-insight]')?.innerText||'');
  check('F4-03 the class card in Kazakh',/статистика емес/.test(insk)&&!/Что работает/.test(insk),insk.slice(0,80));
  await shot(t,'insight-kk-1440.png');
  // ---------------- tariffs: locked lessons lead to /pricing ----------------
  {const c=await ctx();const p=await c.newPage();await loginAs(p,'teacher-b');await setLang(p,'ru');await p.goto(B+'/teacher#/assign');await p.reload();await p.waitForSelector('.grid3');
   const lk=await p.evaluate(()=>({pricing:document.querySelectorAll('.grid3 a[href="/pricing"]').length,old:/школьном пилоте|тестовый пилот/i.test(document.querySelector('.grid3').innerText),text:document.querySelector('.grid3 .badge.grey svg')?.parentElement?.textContent||''}));
   check('PLAN-02 locked lessons say "Макс или Школа" and link to /pricing (no "школьный пилот")',lk.pricing>=1&&!lk.old&&/Макс или Школа/.test(lk.text),JSON.stringify(lk));await shot(p,'assign-locked-1440.png');await c.close();}
  check('no page errors',errors.length===0,errors.slice(0,3).join(' | '));
 }catch(e){console.error(e);results.push(['crash',false]);}
 await browser.close();
 const failed=results.filter(r=>!r[1]);console.log(JSON.stringify({checks:results.length,failed:failed.length}));process.exit(failed.length?1:0);
})();
