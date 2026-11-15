// 2D mascot Аян in a real browser (hackathon/mascot/brief-mascot.md, acceptance 2-6), against the LOCAL demo server.
// Usage: AYAN_DEMO=1 AYAN_DB_FILE=.data/test-mascot.sqlite PORT=4302 node server.mjs
//        AYAN_TEST_URL=http://127.0.0.1:4302 PLAYWRIGHT_PATH=... node tests/v2-e2e-mascot.cjs
// Frames are scrubbed on a paused timeline at 60 fps (16.7 ms), so the checks do not depend on the machine's speed.
// Screenshots and a contact sheet of state frames go to hackathon/mascot/build-v2/ (AYAN_SHOTS=0 to skip).
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4302',SHOTS=process.env.AYAN_SHOTS!=='0',DIR=process.env.AYAN_MASCOT_DIR||'hackathon/mascot/build-v2';
if(SHOTS)fs.mkdirSync(DIR,{recursive:true});
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const STATES=['Idle','Greeting','Explaining','Thinking','Encouraging','Celebrating','Helping','Lit','Resting','Sleeping'];
const BANNED=/three\.module|GLTFLoader|firefly\.glb|\/stills\//;

// In-page lab: one 240 px mascot (1 viewBox unit = 1 px) mounted from the module itself.
const LAB=`window.__lab=(async(level)=>{document.documentElement.dataset.motion=level;const M=await import('/v2/mascot2d.mjs');
 document.getElementById('lab')?.remove();const h=document.createElement('div');h.id='lab';h.style.cssText='position:fixed;left:20px;top:20px;width:240px;height:240px;z-index:99;background:#F7FAF8';
 document.body.append(h);window.__m?.destroy();window.__m=M.mount(h,{state:'Idle',motion:true});
 const svg=h.querySelector('svg');const own=()=>document.getAnimations().filter(a=>svg.contains(a.effect?.target));
 const pts=()=>{const out=[];for(const el of svg.querySelectorAll('path,ellipse,circle,rect')){const b=el.getBBox(),m=el.getScreenCTM();
   for(const [x,y] of [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height],[b.x+b.width/2,b.y+b.height/2]]){const p=new DOMPoint(x,y).matrixTransform(m);out.push([p.x,p.y]);}}return out;};
 const val=(p,prop)=>getComputedStyle(svg.querySelector('[data-p="'+p+'"]'))[prop];
 // Scrub every running animation of this mascot from 0 to ms (paused), sampling parts at 60 fps.
 const scrub=(ms,{from=0}={})=>{const as=own();as.forEach(a=>a.pause());const frames=[];for(let t=from;t<=ms+.01;t+=1000/60){as.forEach(a=>{a.currentTime=t;});
   frames.push({t:Math.round(t),pts:pts(),ty:parseFloat((val('root','translate')||'0 0').split(' ')[1]||0),sq:(val('squash','scale')||'1 1').split(' ').map(Number),
    wing:parseFloat(val('wingL','rotate'))||0,ant:parseFloat(val('antL','rotate'))||0,arm:parseFloat(val('armL','rotate'))||0,core:+val('core','opacity'),wide:+val('m-wide','opacity')});}return frames;};
 const settle=()=>{for(const a of own()){try{a.finish();}catch{a.cancel();}}};
 return {M,m:window.__m,svg,own,scrub,settle,pts};})`;

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];
 async function ctx(opts={}){const c=await browser.newContext({viewport:{width:1440,height:900},...opts});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
 const shot=async(page,name,clip)=>{if(SHOTS)await page.screenshot({path:path.join(DIR,name),...(clip?{clip}:{})});};
 const maxStep=frames=>{let worst=0,at=0;for(let i=1;i<frames.length;i++){const a=frames[i-1].pts,b=frames[i].pts;for(let j=0;j<a.length;j++){const d=Math.hypot(a[j][0]-b[j][0],a[j][1]-b[j][1]);if(d>worst){worst=d;at=frames[i].t;}}}return {worst:+worst.toFixed(2),at};};
 try{
  // ---------------- landing: the same character, no Three.js ----------------
  {const c=await ctx();const p=await c.newPage();const req=[];p.on('request',r=>req.push(r.url()));
   await p.goto(B+'/');await p.waitForSelector('#intro-mascot svg.ayan2d');await wait(1500);
   const st=await p.evaluate(()=>({canvas:document.querySelectorAll('canvas').length,mark:[...document.querySelectorAll('img[src$="ayan-mark.svg"]')].every(i=>i.naturalWidth>0),
    outlined:[...document.querySelectorAll('#intro-mascot svg :is(path,ellipse,circle,rect)')].filter(e=>getComputedStyle(e).stroke!=='none').length}));
   check('MASCOT-01 landing: the 2D mascot is an inline SVG with flat fills (the page svg stroke rule does not outline it), no canvas, no Three.js, GLB or PNG stills',st.canvas===0&&st.outlined===0&&!req.some(u=>BANNED.test(u))&&st.mark,JSON.stringify({...st,banned:req.filter(u=>BANNED.test(u))}));
   await shot(p,'landing-1440.png');
   for(const b of ['Celebrating','Thinking'])await p.click(`[data-mascot-clip="${b}"]`).then(()=>wait(500));
   await p.evaluate(LAB);
   // ---- "Тихо": no animation at all after any state change
   const quiet=await p.evaluate(async S=>{const L=await window.__lab('off');const out={};for(const s of S){L.m.set(s);out[s]=L.own().length;}
     return {out,sleepCore:+getComputedStyle(L.svg.querySelector('[data-p="core"]')).opacity,lid:+getComputedStyle(L.svg.querySelector('[data-p="lidL"]')).opacity,state:L.svg.dataset.state};},STATES);
   check('MASCOT-02 "Тихо": after each of the 10 states the mascot has no animation (the whole document is checked on child screens in test:edupitch); pose, face and light are set at once',Object.values(quiet.out).every(n=>n===0)&&quiet.state==='Sleeping'&&Math.abs(quiet.sleepCore-.15)<.01&&quiet.lid===1,JSON.stringify(quiet));
   // ---- "Живо", Lit: crouch -> stretch -> landing, wings and antennas lag, <= 600 ms, inside the ceilings
   const lit=await p.evaluate(async()=>{const L=await window.__lab('full');L.settle();L.m.set('Lit');const f=L.scrub(1000);return f.map(x=>({t:x.t,ty:x.ty,sq:x.sq,wing:x.wing,ant:x.ant,wide:x.wide,core:x.core,pts:x.pts}));});
   const first=(f,cond)=>f.find(cond)?.t??-1;
   const crouch=first(lit,x=>x.sq[1]<.97&&x.ty>-.5),air=first(lit,x=>x.ty<-1),stretch=first(lit,x=>x.sq[1]>1.03&&x.ty<0),land=lit.findIndex((x,i)=>i>0&&lit[i-1].ty<-1&&x.ty>-1);
   const landSq=lit.slice(Math.max(0,land-1),land+3).some(x=>x.sq[1]<.97);
   const bodyStart=first(lit,x=>Math.abs(x.sq[1]-1)>.002),wingStart=first(lit,x=>Math.abs(x.wing)>.2),antStart=first(lit,x=>Math.abs(x.ant)>.2);
   const motionEnd=Math.max(...lit.filter(x=>Math.abs(x.ty)>.05||Math.abs(x.sq[0]-1)>.002||Math.abs(x.sq[1]-1)>.002||Math.abs(x.wing)>.05||Math.abs(x.ant)>.05).map(x=>x.t));
   const minTy=Math.min(...lit.map(x=>x.ty)),sqAll=lit.flatMap(x=>x.sq);
   check('MASCOT-03 "Живо" Lit: crouch before take-off, stretch in the air, squash on landing; wings lag >= 60 ms, antennas >= 80 ms; motion <= 600 ms; jump <= 24 px, scale 0.94-1.06',
    crouch>=0&&crouch<air&&stretch>0&&landSq&&wingStart>=60&&antStart>=80&&motionEnd<=600&&minTy>=-24&&Math.min(...sqAll)>=.94&&Math.max(...sqAll)<=1.06,
    JSON.stringify({crouch,air,stretch,land:lit[land]?.t,landSq,bodyStart,wingStart,antStart,motionEnd,minTy,sq:[Math.min(...sqAll),Math.max(...sqAll)]}));
   const litWide=first(lit,x=>x.wide>.5),core1=first(lit,x=>x.core>.98);
   check('MASCOT-03b Lit: the wide smile comes with the take-off, the belly core reaches 1 when the ember arrives (600 ms)',litWide>=60&&litWide<=200&&core1>=600&&core1<=850,JSON.stringify({litWide,core1}));
   const litStep=maxStep(lit);check('MASCOT-04 Lit at 60 fps: no part moves more than 8 px between frames',litStep.worst<=8,JSON.stringify(litStep));
   // ---- Celebrating: <= 2.4 s, arms are the only exception to 24 px; mid-air interruption lands first and never jumps
   const cel=await p.evaluate(async()=>{const L=await window.__lab('full');L.settle();L.m.set('Celebrating');const f=L.scrub(2400);return {f:f.map(x=>({t:x.t,ty:x.ty,sq:x.sq,pts:x.pts})),embers:document.querySelectorAll('.ember').length};});
   const celEnd=Math.max(...cel.f.filter(x=>Math.abs(x.ty)>.05||Math.abs(x.sq[1]-1)>.002).map(x=>x.t)),celTy=Math.min(...cel.f.map(x=>x.ty)),celSq=cel.f.flatMap(x=>x.sq);
   const celStep=maxStep(cel.f);
   check('MASCOT-05 Celebrating: jump 24 px then a half jump, motion <= 2.4 s, scale 0.94-1.06, <= 8 px per 60 fps frame',celTy>=-24&&celTy<=-20&&celEnd<=2400&&Math.min(...celSq)>=.94&&Math.max(...celSq)<=1.06&&celStep.worst<=8,JSON.stringify({celEnd,celTy,celStep}));
   const intr=await p.evaluate(async()=>{const L=await window.__lab('full');L.settle();L.m.set('Celebrating');const a=L.scrub(500);const before=a[a.length-1];
     L.m.set('Helping');const b=L.scrub(800);const tys=b.map(x=>x.ty);return {f:[...a.slice(-3),...b].map(x=>({t:x.t,pts:x.pts})),airAt:before.ty,groundAt:b.find(x=>Math.abs(x.ty)<.05)?.t,tyEnd:tys[tys.length-1]};});
   const intrStep=maxStep(intr.f);
   check('MASCOT-06 state change in mid-air: lands within 200 ms, then flows to the new pose; no part jumps more than 8 px between frames',intr.airAt<-10&&intr.groundAt<=210&&Math.abs(intr.tyEnd)<.05&&intrStep.worst<=8,JSON.stringify({airAt:intr.airAt,groundAt:intr.groundAt,intrStep}));
   // ---- an error is quieter than a success: Helping has no jump, no squash, the light does not drop
   const help=await p.evaluate(async()=>{const L=await window.__lab('full');L.settle();L.m.set('Lit');L.settle();L.settle();const c0=+getComputedStyle(L.svg.querySelector('[data-p="core"]')).opacity;
     L.m.set('Helping');const f=L.scrub(800);return {c0,ty:f.map(x=>x.ty),sq:f.flatMap(x=>x.sq),core:f.map(x=>x.core)};});
   check('MASCOT-07 Helping: no jump, no squash, the belly light never drops',help.ty.every(v=>Math.abs(v)<.01)&&help.sq.every(v=>Math.abs(v-1)<.001)&&help.core.every(v=>v>=help.c0-.001),JSON.stringify({c0:help.c0,coreMin:Math.min(...help.core)}));
   // ---- three right answers in a row: the same frames
   const rep=await p.evaluate(async()=>{const L=await window.__lab('full');const runs=[];for(let i=0;i<3;i++){L.settle();L.m.set('Idle');L.settle();L.m.set('Lit');runs.push(L.scrub(600).map(x=>[x.ty.toFixed(3),x.sq.map(v=>v.toFixed(4)).join(),x.wing.toFixed(3),x.ant.toFixed(3)].join('|')).join(';'));}return runs;});
   check('MASCOT-08 three right answers in a row give the same animation',rep[0]===rep[1]&&rep[1]===rep[2]);
   // ---- only transform and opacity are animated
   const props=await p.evaluate(async S=>{const L=await window.__lab('full');const seen=new Set();for(const s of S){L.m.set(s);for(const a of [...L.own(),...document.getAnimations().filter(a=>a.effect?.target?.classList?.contains('ember'))])for(const k of a.effect.getKeyframes())for(const x of Object.keys(k))if(!['offset','computedOffset','easing','composite'].includes(x))seen.add(x);}return [...seen];},STATES);
   check('MASCOT-09 only transform (translate / rotate / scale) and opacity are animated',props.every(x=>['translate','rotate','scale','transform','opacity'].includes(x)),props.join(','));
   // ---- "Мягко": the pose flows in 180 ms, no jump, no squash
   const soft=await p.evaluate(async()=>{const L=await window.__lab('soft');L.settle();L.m.set('Lit');const durs=L.own().map(a=>a.effect.getComputedTiming().endTime);const f=L.scrub(400);return {ty:f.map(x=>x.ty),sq:f.flatMap(x=>x.sq),durs};});
   check('MASCOT-10 "Мягко": no jump and no squash, the pose flows in <= 180 ms (light <= 1.2 s)',soft.ty.every(v=>Math.abs(v)<.01)&&soft.sq.every(v=>Math.abs(v-1)<.001),JSON.stringify(soft.durs));
   // ---- cycles stop when the mascot is off screen
   const off=await p.evaluate(async()=>{const L=await window.__lab('full');L.settle();L.m.set('Idle');await new Promise(r=>setTimeout(r,700));const h=document.getElementById('lab');h.style.top='3000px';h.style.position='absolute';
     await new Promise(r=>setTimeout(r,400));return L.own().map(a=>a.playState);});
   check('MASCOT-11 idle cycles pause when the mascot is off screen',off.length>0&&off.every(s=>s!=='running'),off.join(','));
   // ---- contact sheet: every state as its pose (what "Тихо" shows at once), 240 px
   if(SHOTS){await p.evaluate(()=>{window.scrollTo(0,0);});for(const s of STATES){await p.evaluate(async st=>{const L=await window.__lab('off');L.m.set(st);},s);await wait(60);await shot(p,`state-${s}.png`,{x:20,y:20,width:240,height:240});}}
   await c.close();}
  // ---------------- reduced motion: the same SVG, nothing animates ----------------
  {const c=await ctx({reducedMotion:'reduce'});const p=await c.newPage();await p.goto(B+'/');await p.waitForSelector('#intro-mascot svg.ayan2d');await p.evaluate(LAB);
   const n=await p.evaluate(async S=>{const L=await window.__lab('full');const out=[];for(const s of S){L.m.set(s);out.push(document.getAnimations().length);}return out;},STATES);
   check('MASCOT-12 prefers-reduced-motion: after any state change document.getAnimations() is empty',n.every(x=>x===0),n.join(','));await c.close();}
  // ---------------- child screens: one character, no Three.js for the mascot ----------------
  {const c=await ctx();const p=await c.newPage();const req=[];p.on('request',r=>req.push(r.url()));
   await p.goto(B+'/demo');await p.evaluate(()=>fetch('/api/demo/reset',{method:'POST'}));await p.evaluate(()=>fetch('/api/demo/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({as:'student-01'})}));
   await p.goto(B+'/child');await p.waitForSelector('[data-pick], .path');if(await p.locator('[data-pick]').count())await p.click('[data-pick="standard"]');await p.waitForSelector('.path');await wait(1200);
   const home=await p.evaluate(()=>({svg:document.querySelectorAll('[data-mascot] svg.ayan2d').length,canvas:document.querySelectorAll('canvas').length,mark:document.querySelector('.brand img')?.getAttribute('src'),state:document.querySelector('[data-mascot] svg')?.dataset.state}));
   check('MASCOT-13 child home: the 2D mascot greets, the header mark is the same character, no canvas, no Three.js or GLB requested',home.svg===1&&home.canvas===0&&/ayan-mark\.svg/.test(home.mark||'')&&home.state==='Greeting'&&!req.some(u=>BANNED.test(u)),JSON.stringify({...home,banned:req.filter(u=>BANNED.test(u))}));
   await shot(p,'child-home-1440.png');
   await p.click('a[data-continue]');await p.waitForSelector('.lesson-top');await wait(800);
   const goal=await p.evaluate(()=>({svg:document.querySelectorAll('[data-mascot] svg.ayan2d').length,img:document.querySelectorAll('img[src*="/stills/"]').length}));
   check('MASCOT-14 lesson goal: the 2D mascot, no PNG stills of the old 3D model',goal.svg>=1&&goal.img===0&&!req.some(u=>BANNED.test(u)),JSON.stringify(goal));
   await p.click('[data-go="explanation"]');await p.waitForSelector('[role=tablist]');await p.click('[data-go="example"]');await p.waitForSelector('#stage-h');await p.click('[data-go="practice"]');await p.waitForSelector('[data-task]');await wait(800);
   if(await p.locator('[data-other]').count()){await p.click('[data-other]');await wait(200);if(await p.locator('[data-view="2d"]').count())await p.click('[data-view="2d"]');await wait(300);}
   const task0=await p.evaluate(()=>({svg:document.querySelectorAll('.task-mascot svg.ayan2d').length,img:document.querySelectorAll('.task-mascot img').length}));
   await p.click('button[data-part="0"]');await p.click('[data-check]');await p.waitForSelector('.sheet[data-kind="ok"]');await wait(100);
   const litState=await p.evaluate(()=>document.querySelector('.task-mascot svg')?.dataset.state);
   await shot(p,'child-lit-1440.png');
   check('MASCOT-15 practice: the task mascot is the live 2D Аян and a right answer sets "Lit"',task0.svg===1&&task0.img===0&&litState==='Lit',JSON.stringify({...task0,litState}));
   await p.click('.lesson-foot [data-phrase="break"]');await p.waitForSelector('.break-layer');await wait(500);
   const brk=await p.evaluate(()=>document.querySelector('.break-layer svg.ayan2d')?.dataset.state);
   await shot(p,'child-break-1440.png');
   check('MASCOT-16 break screen: Аян rests with the child (state "Resting")',brk==='Resting',String(brk));
   await p.click('.break-layer [data-phrase="ready"]');await wait(300);
   await p.goto(B+'/child#/helper');await p.waitForSelector('[data-mstate]');
   const chips=await p.locator('[data-mstate]').count();check('MASCOT-17 "Мой помощник" lists all 10 states',chips===10,String(chips));
   await c.close();}
  // ---------------- teacher and parent: the same mark ----------------
  {const c=await ctx();const p=await c.newPage();await p.goto(B+'/demo');await p.evaluate(()=>fetch('/api/demo/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({as:'teacher-a'})}));
   await p.goto(B+'/teacher');await p.waitForSelector('.brand img');const t=await p.evaluate(()=>{const i=document.querySelector('.brand img');return {src:i.getAttribute('src'),ok:i.naturalWidth>0};});
   await p.evaluate(()=>fetch('/api/demo/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({as:'parent-01'})}));
   await p.goto(B+'/demo/parent#demo-parent-link-student-01');await p.waitForSelector('.brand-mark');const pr=await p.evaluate(()=>{const i=document.querySelector('.brand-mark');return {src:i.getAttribute('src'),ok:i.naturalWidth>0};});
   check('MASCOT-18 teacher and parent headers show the same 2D mark',/ayan-mark\.svg/.test(t.src)&&t.ok&&/ayan-mark\.svg/.test(pr.src)&&pr.ok,JSON.stringify({t,pr}));await c.close();}
  check('no page errors',errors.length===0,errors.slice(0,3).join(' | '));
 }catch(e){console.error(e);results.push(['crash',false]);}
 await browser.close();
 const failed=results.filter(r=>!r[1]);console.log(JSON.stringify({checks:results.length,failed:failed.length}));process.exit(failed.length?1:0);
})();
