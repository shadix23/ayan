// Аян landing (EduPitch, 15.11.2026).
// 1) the 2D mascot (dist/v2/mascot2d.mjs, the same character as on every screen) and its three buttons;
// 2) background fireflies: CSS only (transform/opacity), paused out of view and in a hidden tab;
// 3) the hero "teacher screen" card that changes its example every 4.2 s;
// 4) the product demo in #how: 4 steps with a cursor, plays by itself while in view, has a pause button
//    and step buttons; under prefers-reduced-motion or the page "pause motion" button every step is a still poster.
// The footer is the shared partial dist/site-footer.js (loaded by index.html).
const root=document.documentElement;
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const MKEY='ayan.landing.motion';
let userOff=false;try{userOff=localStorage.getItem(MKEY)==='off';}catch{}
if(userOff)root.dataset.motion='off';
const still=()=>RM.matches||root.dataset.motion==='off';
// explicit level for the mascot: its own reading of html[data-motion] would see the change before update() does
const mlevel=()=>still()?false:'full';
const t=(kk,ru)=>window.AyanPage?window.AyanPage.t(kk,ru):ru;

// aria-labels are not covered by page-i18n (it swaps text only)
const ARIA=[['.nav-links','Бөлімдер','Разделы'],['.mascot-actions','Аянмен ойнау','Поиграть с Аяном'],
 ['#intro-mascot','Аян - жарқырауық қоңыз-шам','Аян, светлячок-фонарик']];
const applyAria=()=>{for(const [s,kk,ru] of ARIA)document.querySelectorAll(s).forEach(el=>el.setAttribute('aria-label',t(kk,ru)));
 document.querySelector('[data-motion-toggle]')?.setAttribute('title',t('Беттегі қозғалысты тоқтату','Остановить движение на странице'));};

// ---------- 1. mascot ----------
let mascot=null;
const host=document.querySelector('#intro-mascot');
// Аян lives in the closing card: mounted at once (Idle), says hello once when the card comes into view
if(host)import('/v2/mascot2d.mjs').then(M=>{mascot=M.mount(host,{state:'Idle',motion:mlevel(),ambient:true});
  new IntersectionObserver(([e],o)=>{if(!e.isIntersecting)return;o.disconnect();if(mascot.state==='Idle')mascot.set('Greeting');},{threshold:.5}).observe(host);})
 .catch(()=>{host.innerHTML='<img src="/assets/ayan-mark.svg" alt="">';});
// the same button again plays the same reaction again
document.querySelectorAll('[data-mascot-clip]').forEach(b=>b.addEventListener('click',()=>{if(!mascot)return;const s=b.dataset.mascotClip;if(mascot.state===s)mascot.set('Idle');mascot.set(s);}));
window.addEventListener('pagehide',()=>mascot?.destroy(),{once:true});

// ---------- 2. fireflies ----------
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};}
const narrow=matchMedia('(max-width: 699px)').matches;
document.querySelectorAll('[data-flies]').forEach((box,bi)=>{
 const n=+box.dataset.flies||8,count=narrow?Math.max(4,Math.round(n*.6)):n,r=rng(bi*131+n*17),dark=box.classList.contains('flies-dark'),hero=!!box.closest('.hero');
 const frag=document.createDocumentFragment();
 for(let i=0;i<count;i++){const f=document.createElement('i');f.className='fly';
  // in the hero they keep to the picture side on desktop, so they never sit on the heading
  // on a phone the text is full width, so they keep to the side margins
  const edge=()=>r()<.5?1+r()*6:93+r()*6;
  const art=box.classList.contains('flies-art');
  const x=art?4+r()*92:narrow?edge():hero?48+r()*48:4+r()*92,y=art?4+r()*40:box.closest('.how')?3+r()*62:6+r()*86,s=(dark?7:6)+r()*(dark?11:9);
  const v={x:x+'%',y:y+'%',s:s.toFixed(1)+'px',o:(dark?.5:.42)+r()*(dark?.45:.4),d:(10+r()*8).toFixed(1)+'s',g:(4+r()*3).toFixed(1)+'s',dl:(-r()*12).toFixed(1)+'s',
   mx1:((r()-.5)*56).toFixed(0)+'px',my1:((r()-.5)*44).toFixed(0)+'px',mx2:((r()-.5)*70).toFixed(0)+'px',my2:((r()-.5)*56).toFixed(0)+'px'};
  for(const k in v)f.style.setProperty('--'+k,v[k]);frag.append(f);}
 box.append(frag);
 new IntersectionObserver(([e])=>box.classList.toggle('on',e.isIntersecting),{rootMargin:'80px'}).observe(box.parentElement);
});

// ---------- 3. hero ticker ----------
const ticker=(()=>{const box=document.querySelector('[data-ticker]');if(!box)return null;const items=[...box.querySelectorAll('.tick')];let i=0,timer=0,seen=true;
 const step=()=>{items[i].classList.remove('on');i=(i+1)%items.length;items[i].classList.add('on');};
 const sync=()=>{clearInterval(timer);timer=0;if(!still()&&seen&&!document.hidden)timer=setInterval(step,4200);};
 new IntersectionObserver(([e])=>{seen=e.isIntersecting;sync();}).observe(box);
 return {sync};})();

// ---------- 4. product demo ----------
const demo=(()=>{
 const el=document.querySelector('[data-scene]');if(!el)return null;
 const stage=el.querySelector('.demo-stage'),cur=el.querySelector('.cursor'),fly=el.querySelector('.ember-fly');
 const btns=[...el.querySelectorAll('[data-step-btn]')],play=el.querySelector('[data-scene-play]'),live=el.querySelector('.demo-live');
 const ALL=['sel','checked','lit','trail','next','help','alert','going','known','done','report','assigned'];
 const set=on=>{for(const c of ALL)el.classList.toggle('s-'+c,on.includes(c));};
 const add=c=>el.classList.add('s-'+c),rem=c=>el.classList.remove('s-'+c);
 const focus=p=>{el.dataset.focus=p;};
 const target=n=>el.querySelector(`[data-target="${n}"]`);
 const pos=(node,fx=.55,fy=.6)=>{const a=stage.getBoundingClientRect(),b=node.getBoundingClientRect();return [b.left-a.left+b.width*fx,b.top-a.top+b.height*fy];};
 const place=(x,y)=>{cur.style.setProperty('--cx',x.toFixed(1)+'px');cur.style.setProperty('--cy',y.toFixed(1)+'px');};
 let last=null;
 const moveTo=n=>{const node=target(n);if(!node)return;last=n;place(...pos(node));};
 const away=()=>{if(!last)return;const [x,y]=pos(target(last));place(x+46,y+38);};
 const home=p=>{const pane=el.querySelector(p==='teacher'?'.pane-teacher .pane-body':'.pane-child .pane-body');const [x,y]=pos(pane,.78,.72);place(x,y);last=null;};
 const tap=n=>{const node=target(n);cur.classList.remove('press');void cur.offsetWidth;cur.classList.add('press');
  if(node?.classList.contains('ui-btn')){node.classList.add('press');setTimeout(()=>node.classList.remove('press'),170);}
  setTimeout(()=>cur.classList.remove('press'),460);};
 // one warm dot from the chosen quarter to the next lantern of the path (the product's signature move, 600 ms)
 const flyEmber=()=>{const box=el.querySelector('.pane-child .pane-body').getBoundingClientRect(),a=target('pick').getBoundingClientRect(),b=el.querySelector('.trail .t4').getBoundingClientRect();
  const x0=a.left-box.left+a.width*.5,y0=a.top-box.top+a.height*.5,x1=b.left-box.left+b.width/2,y1=b.top-box.top+b.height/2,xm=Math.max(x0,x1)+24,ym=(y0+y1)/2;
  fly.animate([{transform:`translate(${x0}px,${y0}px) scale(.5)`,opacity:0},{transform:`translate(${xm}px,${ym}px) scale(1.05)`,opacity:1,offset:.45},{transform:`translate(${x1}px,${y1}px) scale(.9)`,opacity:1,offset:.88},{transform:`translate(${x1}px,${y1}px) scale(.4)`,opacity:0}],
   {duration:620,easing:'cubic-bezier(.22,1,.36,1)'});};
 const STEPS=[
  {dur:3800,start:[],poster:['sel'],focus:'child',pf:'child',beats:[[0,()=>home('child')],[350,()=>moveTo('pick')],[1250,()=>{tap('pick');add('sel');}],[1950,()=>moveTo('check')],[2850,()=>{tap('check');add('checked');}]]},
  {dur:3000,start:['sel','checked'],poster:['sel','checked','lit','trail'],focus:'child',pf:'child',beats:[[0,()=>{add('lit');flyEmber();}],[560,()=>add('trail')],[900,away]]},
  {dur:5800,start:['lit','trail'],poster:['trail','next','help','alert','going','known'],focus:'child',pf:'teacher',beats:[[0,()=>{add('next');rem('sel');rem('checked');}],[600,()=>moveTo('help')],[1450,()=>{tap('help');add('help');}],
   [2100,()=>{focus('teacher');add('alert');home('teacher');}],[2900,()=>moveTo('ack')],[3750,()=>{tap('ack');add('going');}],[4500,()=>{focus('child');add('known');away();}]]},
  {dur:5000,start:['trail','next','help','alert','going','known'],poster:['trail','done','going','report','assigned'],focus:'teacher',pf:'teacher',beats:[[0,()=>{add('done');add('report');home('teacher');}],[900,()=>moveTo('assign')],[1900,()=>{tap('assign');add('assigned');}],[2500,away]]}];
 let k=0,timers=[],t0=0,elapsed=0,running=false,started=false,seen=false,userPaused=false;
 const clear=()=>{timers.forEach(clearTimeout);timers=[];};
 const mark=i=>{el.dataset.step=String(i+1);btns.forEach((b,j)=>b.setAttribute('aria-current',j===i?'step':'false'));el.style.setProperty('--dur',STEPS[i].dur+'ms');
  const p=btns[i].querySelector('.prog i');p.style.animation='none';void p.offsetWidth;p.style.animation='';};
 const poster=i=>{clear();k=i;mark(i);set(STEPS[i].poster);focus(STEPS[i].pf);el.classList.remove('cur-on');elapsed=0;};
 const enter=(i,from=0)=>{clear();k=i;const s=STEPS[i];
  if(from===0){mark(i);set(s.start);focus(s.focus);}
  el.classList.add('cur-on');t0=performance.now()-from;
  for(const [at,fn] of s.beats)if(at>=from)timers.push(setTimeout(fn,at-from));
  timers.push(setTimeout(()=>enter((i+1)%STEPS.length),s.dur-from));};
 const label=()=>{play.toggleAttribute('data-paused',userPaused);};
 // plays only when it is on screen, the tab is visible, motion is allowed and the visitor did not pause it
 const sync=()=>{el.classList.toggle('still',still());
  const want=seen&&!userPaused&&!document.hidden&&!still();
  if(want&&!running){running=true;el.classList.add('playing');el.classList.remove('held');if(!started){started=true;enter(0);}else enter(k,elapsed);}
  else if(!want&&running){running=false;elapsed=Math.min(performance.now()-t0,STEPS[k].dur-1);clear();el.classList.add('held');}
  if(still()){running=false;el.classList.remove('playing','held');if(!el.dataset.posterShown){el.dataset.posterShown='1';poster(k);}}
  else delete el.dataset.posterShown;
  label();};
 play.addEventListener('click',()=>{userPaused=!userPaused;sync();});
 btns.forEach((b,j)=>b.addEventListener('click',()=>{const s=STEPS[j];live.textContent=b.querySelector('.st-t').textContent+'. '+b.querySelector('.st-d').textContent;
  if(still()){poster(j);return;}
  userPaused=false;started=true;running=true;el.classList.add('playing');el.classList.remove('held');mark(j);enter(j);label();}));
 new IntersectionObserver(([e])=>{seen=e.intersectionRatio>=.35;sync();},{threshold:[0,.35,.6]}).observe(stage);
 // initial frame before it scrolls into view
 mark(0);set(STEPS[0].start);sync();
 return {sync};})();

// ---------- motion button, hidden tab ----------
const mbtn=document.querySelector('[data-motion-toggle]');
mbtn?.setAttribute('aria-pressed',String(userOff));
mbtn?.addEventListener('click',()=>{userOff=!userOff;if(userOff)root.dataset.motion='off';else delete root.dataset.motion;
 try{localStorage.setItem(MKEY,userOff?'off':'on');}catch{}
 mbtn.setAttribute('aria-pressed',String(userOff));mascot?.update({motion:mlevel()});ticker?.sync();demo?.sync();});
document.addEventListener('visibilitychange',()=>{root.classList.toggle('tab-hidden',document.hidden);ticker?.sync();demo?.sync();});
RM.addEventListener?.('change',()=>{mascot?.update({motion:mlevel()});ticker?.sync();demo?.sync();});

// ---------- language ----------
window.AyanPage?.onChange(applyAria);applyAria();
