// V2.1 end-to-end in a real browser against the LOCAL demo server (synthetic data).
// Usage: AYAN_DEMO=1 PORT=4300 node server.mjs; AYAN_TEST_URL=http://127.0.0.1:4300 PLAYWRIGHT_PATH=/path/to/playwright node tests/v2-e2e.cjs
// Writes screenshots to docs/visual-qa/ (AYAN_SHOTS=0 to skip). Exits 1 on any failure.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4300',SHOTS=process.env.AYAN_SHOTS!=='0',DIR='docs/visual-qa';
if(SHOTS)fs.mkdirSync(DIR,{recursive:true});
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const external=[];
 async function ctx(opts={}){const c=await browser.newContext({viewport:{width:1440,height:1024},...opts});c.on('request',r=>{const u=new URL(r.url());if(!['127.0.0.1','localhost'].includes(u.hostname)&&!u.protocol.startsWith('data')&&!u.protocol.startsWith('blob'))external.push(r.url());});return c;}
 async function loginAs(page,as){await page.goto(B+'/demo');await page.evaluate(async a=>{await fetch('/api/demo/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({as:a})});},as);}
 const shot=async(page,name)=>{if(SHOTS)await page.screenshot({path:path.join(DIR,name)});};
 const key=async(page,sel,k='Enter')=>{await page.focus(sel);await page.keyboard.press(k);};
 try{
  { const p=await (await ctx()).newPage();await p.goto(B+'/demo');await p.evaluate(()=>fetch('/api/demo/reset',{method:'POST'}));await p.close(); }
  // ---------------- student, keyboard only ----------------
  const c1=await ctx();const s=await c1.newPage();await loginAs(s,'student-01');await s.goto(B+'/child');
  await s.waitForSelector('[data-pick]');check('SENS-01 first visit offers standard/calm, no diagnosis question',(await s.locator('[data-pick]').count())===2&&!(await s.locator('body').innerText()).match(/диагноз/i));
  await shot(s,'child-first-visit-1440.png');
  await key(s,'[data-pick="standard"]');await s.waitForSelector('.now-card');
  const autoplay=await s.evaluate(()=>[...document.querySelectorAll('video,audio')].some(m=>!m.paused));
  check('HOME-01 three main actions on home, nothing playing',await s.locator('a[href="#/lesson"].btn').count()>=1&&await s.locator('a[href="#/play"]').count()>=1&&await s.locator('a[href="#/watch"]').count()>=1&&!autoplay);
  await wait(800);await shot(s,'child-home-1440.png');
  // Tab order reaches the main action and the focus ring is visible
  await s.keyboard.press('Tab');let reached=false,ring=false;for(let i=0;i<30;i++){const f=await s.evaluate(()=>{const e=document.activeElement;const cs=getComputedStyle(e);return {t:e.textContent.trim().slice(0,30),o:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor};});if(/Начать урок|Продолжить урок/.test(f.t)){reached=true;ring=/solid 3px rgb\(3, 105, 161\)/.test(f.o);break;}await s.keyboard.press('Tab');}
  check('A11Y-01 Tab reaches "Начать урок" with a visible 3px focus ring',reached&&ring);
  await s.keyboard.press('Enter');await s.waitForSelector('#stage-h');
  await key(s,'[data-go="explanation"]');await s.waitForSelector('[role=tablist]');
  await key(s,'#tab-text');await s.keyboard.press('ArrowRight');await wait(200);
  const tab=await s.evaluate(()=>document.activeElement.id);check('A11Y explanation tabs work with arrow keys',tab==='tab-picture');await shot(s,'child-explanation-picture-1440.png');
  await key(s,'[data-go="example"]');await s.waitForSelector('#stage-h');await wait(700);await shot(s,'child-example-1440.png');
  await key(s,'[data-go="practice"]');await s.waitForSelector('[data-task]');await wait(1500);
  const has3d=await s.locator('[data-3d] canvas').count();check('GAME 3D scene renders (procedural, fixed camera) with DOM part buttons',has3d===1&&await s.locator('button[data-part]').count()===2);
  await shot(s,'child-practice-3d-1440.png');
  // EduPitch focus mode (hackathon/02-mvp-scope.md M2): the lesson has no side menu; trail on top, one centred card, sticky footer.
  const geo=await s.evaluate(()=>{const st=document.querySelector('.lesson-stage').getBoundingClientRect();return {side:!!document.querySelector('.side'),stageW:Math.round(st.width),stageX:Math.round(st.left),
   segs:document.querySelectorAll('.trail .trail-seg').length,btn:Math.round(document.querySelector('[data-check]').getBoundingClientRect().height),
   radius:getComputedStyle(document.querySelector('.task-card')).borderRadius,h1:!!document.querySelector('h1'),h2:getComputedStyle(document.querySelector('#stage-h')).fontSize};});
  check('VIS-01 focus mode at 1440: no side menu, card column 880 centred, 5-step trail, main button 56, card radius 24, page has an h1',!geo.side&&geo.stageW===880&&Math.abs(geo.stageX-280)<=8&&geo.segs===5&&geo.btn>=56&&geo.radius==='24px'&&geo.h1,JSON.stringify(geo));
  // task f1: 1/2 via keyboard
  await key(s,'button[data-part="0"]',' ');await key(s,'[data-check]');await s.waitForSelector('[data-fb] .feedback.ok');
  check('PATH/SCORE keyboard select + check -> server says correct',true);
  await key(s,'[data-nexttask]');await s.waitForSelector('button[data-part="3"]');
  // f2 in 3D: pick, then switch to 2D and cards: selection carried (GAME-01, UDL2-01)
  await key(s,'button[data-part="1"]',' ');await key(s,'[data-other]');await s.waitForSelector('[data-view="2d"]:visible');await key(s,'[data-view="2d"]');await wait(200);
  const kept2d=await s.locator('button[data-part="1"][aria-pressed="true"]').count();
  await key(s,'[data-view="cards"]');await wait(200);const cardSel=await s.locator('[data-card][aria-pressed="true"]').getAttribute('aria-label').catch(()=>null);
  check('GAME-01 / UDL2-01 3D -> 2D -> cards keeps the same answer (1/4)',kept2d===1&&/1 \/ 4/.test(cardSel||''),cardSel||'');
  await shot(s,'child-practice-cards-1440.png');
  await key(s,'[data-view="2d"]');await wait(200);await shot(s,'child-practice-2d-1440.png');
  // reload in the middle: attempt, stage, task and selection restored (PATH-02)
  await s.reload();await s.waitForSelector('[data-task]');await wait(800);
  const after=await s.evaluate(()=>({h:document.querySelector('#stage-h').textContent,sel:document.querySelectorAll('button[data-part][aria-pressed="true"]').length,view:document.querySelector('[data-view][aria-pressed="true"]')?.dataset.view}));
  check('PATH-02 reload restores stage, task, view and selection',after.h==='Выбери одну четверть'&&after.sel===1&&after.view==='2d',JSON.stringify(after));
  // break -> reload -> ready (COM-02)
  await key(s,'[data-phrase="break"]');await s.waitForSelector('.break-layer');await s.reload();await s.waitForSelector('.break-layer');
  await key(s,'.break-layer [data-phrase="ready"]');await wait(500);const h2=await s.locator('#stage-h').textContent();
  check('COM-02 break -> reload -> "I am ready" returns to the saved task without sound',h2==='Выбери одну четверть'&&!(await s.evaluate(()=>[...document.querySelectorAll('video,audio')].some(m=>!m.paused))));
  // "I did not understand" keeps the answer
  await key(s,'[data-board]');await s.waitForSelector('dialog [data-bp="not_understood"]');await key(s,'dialog [data-bp="not_understood"]');await s.waitForSelector('dialog [data-nu]');
  const before=await s.evaluate(()=>[...document.querySelectorAll('button[data-part]')].map(b=>b.getAttribute('aria-pressed')).join(','));
  await s.keyboard.press('Escape');await wait(300);const keptState=await s.evaluate(()=>({sel:[...document.querySelectorAll('button[data-part]')].map(b=>b.getAttribute('aria-pressed')).join(','),dialogs:document.querySelectorAll('dialog').length}));
  check('UDL2 "Я не понял" opens choices, Escape closes, answer kept',keptState.sel===before&&before.includes('true')&&keptState.dialogs===0,before+' -> '+JSON.stringify(keptState));
  // wrong twice -> hint offer -> hint -> correct -> new independent example
  await key(s,'button[data-part="2"]',' ');await key(s,'[data-check]');await s.waitForSelector('[data-fb] .feedback.try');await key(s,'[data-check]');await s.waitForSelector('[data-nohint]');
  await key(s,'[data-fb] [data-hint]');await wait(300);await key(s,'[data-hint]');await wait(300);
  await key(s,'button[data-part="2"]',' ');await key(s,'[data-check]');await s.waitForSelector('[data-twin]');
  await key(s,'[data-twin]');await s.waitForSelector('button[data-part]');await key(s,'button[data-part="0"]',' ');await key(s,'[data-check]');await s.waitForSelector('[data-fb] .feedback.ok');
  check('UDL2-03 help -> solved -> new independent example offered and solved',true);await key(s,'[data-nexttask]');
  // f3 2/4 with "build from pieces" (select piece -> place, no drag)
  await s.waitForSelector('[data-mode="build"]');await key(s,'[data-mode="build"]');await key(s,'[data-piece="u"]');await key(s,'[data-place]');await key(s,'[data-piece="u"]');await key(s,'[data-place]');
  await key(s,'[data-check]');await s.waitForSelector('[data-fb] .feedback.ok');check('UDL2 build mode: select piece -> place -> correct (no drag needed)',true);await key(s,'[data-nexttask]');
  for(const [n,parts] of [['f4',[0,1,2]],['f5',[0]]]){await s.waitForSelector('button[data-part="0"]');for(const i of parts)await key(s,`button[data-part="${i}"]`,' ');await key(s,'[data-check]');await s.waitForSelector('[data-fb] .feedback.ok');await key(s,'[data-nexttask]');void n;}
  // check stage: transfer (strip) and unequal parts (area rule)
  await s.waitForSelector('#stage-h');await key(s,'button[data-part="1"]',' ');await key(s,'[data-check]');await s.waitForSelector('[data-fb] .feedback.ok');await key(s,'[data-nexttask]');
  await s.waitForSelector('button[data-part="3"]');await key(s,'button[data-part="0"]',' ');await key(s,'[data-check]');await s.waitForSelector('[data-fb] .feedback.try');
  const areaMsg=await s.locator('[data-fb] .feedback').textContent();await key(s,'button[data-part="0"]',' ');await key(s,'button[data-part="1"]',' ');await key(s,'[data-check]');await s.waitForSelector('[data-fb] .feedback.ok');
  check('UDL2-02 unequal parts: "one of four" is wrong, the 1/4-area part is right',/не равны/.test(areaMsg),areaMsg.trim());
  await key(s,'[data-nexttask]');await s.waitForSelector('text=Урок завершён');await wait(500);await shot(s,'child-complete-1440.png');
  check('PATH-01 five stages completed, completion is explicit',true);
  // video: no autoplay, captions, too loud stops sound, position restore
  await s.goto(B+'/child#/watch');await s.waitForSelector('video');await wait(1200);
  const v0=await s.evaluate(()=>{const v=document.querySelector('video');return {paused:v.paused,tracks:[...v.textTracks].map(t=>t.language+':'+t.mode)};});
  check('VIDEO-01 opening the video does not start playback; captions on',v0.paused&&v0.tracks.includes('ru:showing'),JSON.stringify(v0));
  const vsrc=await s.evaluate(()=>document.querySelector('video source').getAttribute('src'));check('VIDEO standard mode gets the 0.2.0 cut with camera moves',vsrc==='/media/M01/0.2.0/lesson.mp4',vsrc);
  await shot(s,'child-video-1440.png');
  await s.click('[data-v="play"]');await wait(1500);const playing=await s.evaluate(()=>!document.querySelector('video').paused);
  await key(s,'[data-phrase="help"]').catch(()=>{});await wait(300);
  await key(s,'[data-board]');await s.waitForSelector('dialog [data-bp="too_loud"]');await key(s,'dialog [data-bp="too_loud"]');await wait(500);
  const stopped=await s.evaluate(()=>document.querySelector('video').paused);check('COM-03 "Слишком громко" stops the playing video at once',playing&&stopped);
  await s.keyboard.press('Escape');
  await s.evaluate(()=>{const v=document.querySelector('video');v.currentTime=20;v.dispatchEvent(new Event('pause'));});await wait(800);await s.reload();await s.waitForSelector('video');await wait(1500);
  const pos=await s.evaluate(()=>({t:document.querySelector('video').currentTime,p:document.querySelector('video').paused}));check('VIDEO-03 position restored within 2 s after reload, still paused',Math.abs(pos.t-20)<=2&&pos.p,JSON.stringify(pos));
  await s.goto(B+'/child#/help');await s.waitForSelector('[data-phrase]');await wait(400);await shot(s,'child-help-1440.png');
  await s.goto(B+'/child#/settings');await s.waitForSelector('[data-preset]');await wait(300);await shot(s,'child-settings-1440.png');
  await s.goto(B+'/child#/helper');await s.waitForSelector('[data-mstate]');await wait(2500);await shot(s,'child-helper-1440.png');
  // ---------------- teacher sees the right report ----------------
  const t=await (await ctx()).newPage();await loginAs(t,'teacher-a');await t.goto(B+'/teacher#/reports');await t.waitForSelector('.stat');await wait(500);await shot(t,'teacher-reports-1440.png');
  await t.goto(B+'/teacher#/report?child=demo-student-01');await t.waitForSelector('#tk-h');
  const rep=await t.evaluate(()=>document.querySelector('#view').innerText);
  check('TEACH-01 teacher A sees the completed lesson of student 01 with hints and a break',/7 \/ 7/.test(rep)&&/Перерывы\s*\n?\s*1/.test(rep)&&/самостоятельно/.test(rep),rep.match(/Решено правильно[^\n]*\n[^\n]*/)?.[0]);
  await shot(t,'teacher-report-student-1440.png');
  await t.goto(B+'/teacher#/profiles?child=demo-student-02');await t.waitForSelector('#tn-h');await wait(300);await shot(t,'teacher-profile-1440.png');
  await t.goto(B+'/teacher#/editor');await t.waitForSelector('[data-pv]');await wait(400);await shot(t,'teacher-editor-1440.png');
  await t.goto(B+'/teacher#/assign');await t.waitForSelector('[data-assign]');await shot(t,'teacher-assign-1440.png');
  // ---------------- reduced motion, no WebGL, 200 %, 320 px ----------------
  const c2=await ctx({reducedMotion:'reduce'});const r=await c2.newPage();await loginAs(r,'student-02');await r.goto(B+'/child');await r.waitForSelector('.now-card');await wait(1500);
  const rm=await r.evaluate(()=>({motion:document.documentElement.dataset.motion,canvas:document.querySelectorAll('.now-card canvas').length,svg:document.querySelectorAll('.now-card svg.ayan2d').length,anims:document.getAnimations().length}));
  check('SENS-03 / MASCOT2-05 system reduced motion: decorative motion off, the 2D mascot stands still (no animation, no canvas)',rm.motion==='off'&&rm.canvas===0&&rm.svg===1&&rm.anims===0,JSON.stringify(rm));
  await r.goto(B+'/child#/watch');await r.waitForSelector('video');const csrc=await r.evaluate(()=>document.querySelector('video source').getAttribute('src'));
  check('VIDEO reduced motion gets the still-camera cut of the same lesson',csrc==='/media/M01/0.2.0/lesson.calm.mp4',csrc);
  const c3=await ctx();await c3.addInitScript(()=>{window.AYAN_FORCE_NO_WEBGL=true;});const g=await c3.newPage();await loginAs(g,'student-03');await g.goto(B+'/child');
  await g.waitForSelector('#app .now-card, [data-pick]');if(await g.locator('[data-pick]').count())await key(g,'[data-pick="standard"]');await g.goto(B+'/child#/lesson');await g.waitForSelector('[data-task]');
  await g.evaluate(()=>document.querySelector('[data-view="3d"]')?.click());await wait(600);const fb=await g.evaluate(()=>({view:document.querySelector('[data-view][aria-pressed="true"]')?.dataset.view,line:document.querySelector('.selected-line')?.textContent}));
  check('GAME-04 no WebGL: the same task in 2D with a clear message, answer kept',fb.view==='2d'&&/3D недоступно/.test(fb.line||''),JSON.stringify(fb));
  for(const [w,h,dpr,name] of [[390,844,1,'390'],[320,700,1,'320'],[720,512,2,'zoom200']]){
   const cx=await ctx({viewport:{width:w,height:h},deviceScaleFactor:dpr});const m=await cx.newPage();await loginAs(m,'student-03');
   for(const route of ['#/home','#/lesson','#/help','#/settings']){await m.goto(B+'/child'+route);await m.waitForSelector('#page-h, #stage-h');await wait(700);
    const o=await m.evaluate(()=>({sw:document.documentElement.scrollWidth,w:innerWidth,help:!!document.querySelector('[data-phrase="help"]')}));
    if(route==='#/home'&&name==='390')await shot(m,'child-home-390.png');
    if(route==='#/lesson'&&name==='320')await shot(m,'child-lesson-320.png');
    check(`A11Y-03 / VIS-02 ${name}px ${route}: no horizontal scroll, help reachable`,o.sw<=o.w&&o.help,JSON.stringify(o));}
   await cx.close();}
  check('LOCAL-03 the browser made no request outside localhost',external.length===0,external.slice(0,3).join(' '));
 }catch(e){console.error(e);results.push(['crash',false]);}
 await browser.close();
 const failed=results.filter(r=>!r[1]);console.log(JSON.stringify({checks:results.length,failed:failed.length}));process.exit(failed.length?1:0);
})();
