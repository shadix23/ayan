// Аян motion system ("Огоньки"). Pure functions over DOM elements; every effect reads the level from <html data-motion>:
//   off  = Тихо (calm mode, "Движение: минимум", prefers-reduced-motion): no animation at all, the final state is shown at once;
//   soft = Мягко: opacity and short fades, no spring, no flight, no particles;
//   full = Живо: + spring, the ember flight, particles.
// Only transform and opacity are animated (Web Animations API). Motion starts only from the child's own action. One event always
// gives the same animation (no randomness). Ceilings live in lights.js (LIMITS) and are enforced here.
const LIM=()=>window.AyanLights?.LIMITS||{maxShift:24,minScale:.94,maxScale:1.06,maxParticles:14,flyMs:600,sheetMs:220,softMs:160,celebrateMs:2400,gatherStepMs:250,breatheMs:4000};
export const level=()=>{const m=document.documentElement.dataset.motion;return m==='off'?'off':m==='soft'?'soft':'full';};
export const EASE='cubic-bezier(.23,1,.32,1)';
const LINEAR_OK=typeof CSS!=='undefined'&&CSS.supports?.('transition-timing-function','linear(0, 1)');
export const SPRING=LINEAR_OK?'linear(0, .068, .227, .421, .612, .776, .905, .994, 1.049, 1.077, 1.083, 1.077, 1.063, 1.047, 1.031, 1.018, 1.007, 1, .996, .994, .993, .994, .995, .998, 1)':'cubic-bezier(.34,1.45,.64,1)';
const clampScale=s=>Math.max(LIM().minScale,Math.min(LIM().maxScale,s));
// "Мягко": every reaction is short, at most 240 ms (a11y У6).
const SOFT_MAX=240;const cap=ms=>level()==='soft'?Math.min(ms,SOFT_MAX):ms;
function run(el,frames,opts){if(!el||!el.animate)return null;try{return el.animate(frames,opts);}catch{return null;}}
const done=a=>a?new Promise(r=>{a.onfinish=r;a.oncancel=r;}):Promise.resolve();

// A view appears by opacity only (no "everything slides up" entrance).
export function appear(el){const l=level();if(l==='off')return null;return run(el,[{opacity:0},{opacity:1}],{duration:200,easing:'linear'});}
// A step of the lesson changes: 12 px in the direction of travel + fade (full), fade only (soft).
export function stepIn(el,dir=1){const l=level();if(l==='off')return null;const dx=l==='full'?Math.min(12,LIM().maxShift)*Math.sign(dir||1):0;
 return run(el,[{transform:`translateX(${dx}px)`,opacity:0},{transform:'translateX(0)',opacity:1}],{duration:240,easing:EASE});}
// The answer sheet rises 16 px from the footer.
export function sheetIn(el){const l=level();if(l==='off')return null;
 return run(el,[{transform:'translateY(16px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:l==='full'?LIM().sheetMs:LIM().softMs,easing:l==='full'?SPRING:EASE});}
// A chosen option answers with a small spring (1 -> 1.03 -> 1).
export function choose(el){if(level()!=='full')return null;const s=clampScale(1.03);return run(el,[{transform:'scale(1)'},{transform:`scale(${s})`},{transform:'scale(1)'}],{duration:220,easing:'ease-out'});}
// A lantern that just lit pops once.
export function pop(el){if(level()!=='full')return null;const s=clampScale(1.06);return run(el,[{transform:'scale(1)'},{transform:`scale(${s})`},{transform:'scale(1)'}],{duration:260,easing:'ease-out'});}
// The hint button gets one ring after "пока не подошло" (opacity only, once).
export function nudge(el){const l=level();if(l==='off')return null;return run(el,[{opacity:1},{opacity:.55},{opacity:1}],{duration:cap(600),easing:'ease-in-out'});}
// Something lights up (soft and full): opacity 0 -> 1.
export function lightUp(el,ms=400){const l=level();if(l==='off'||!el)return null;return run(el,[{opacity:0},{opacity:1}],{duration:cap(ms),easing:'ease-out'});}

function point(x){if(!x)return null;if(typeof x.x==='number')return x;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
function ember(big){const e=document.createElement('div');e.className='ember'+(big?' big':'');e.setAttribute('aria-hidden','true');document.body.append(e);return e;}
// The brand move: one warm ember flies from the answer to the trail along an arc (600 ms). Only in "Живо".
export function fly(from,to,{onArrive}={}){
 const a=point(from),b=point(to);
 if(level()!=='full'||!a||!b){onArrive?.();return Promise.resolve();}
 const e=ember(true);const cx=(a.x+b.x)/2,cy=Math.min(a.y,b.y)-Math.max(60,Math.abs(b.x-a.x)*.22);const N=16,frames=[];
 for(let i=0;i<=N;i++){const t=i/N,u=1-t;const x=u*u*a.x+2*u*t*cx+t*t*b.x,y=u*u*a.y+2*u*t*cy+t*t*b.y;frames.push({transform:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(1-.4*t).toFixed(3)})`,opacity:i===0?.2:i>=N-1?.85:1,offset:t});}
 const an=run(e,frames,{duration:LIM().flyMs,easing:'cubic-bezier(.45,0,.25,1)',fill:'forwards'});
 return done(an).then(()=>{e.remove();onArrive?.();});
}
// Summary: embers come one by one into the big lantern (step 250 ms). onEach(i) lets the caller add to the counter.
// Speed ceiling (120 px/s): each ember appears in place, then travels 60 px in a straight line over 600 ms (100 px/s, linear).
// The whole scene (gather + float up) ends within about 4.5 s, under the 5 s limit, so it needs no pause button (a11y В5).
export function gather(target,n,{onEach}={}){
 const c=point(target);const count=Math.min(n,7,LIM().maxParticles);
 if(level()!=='full'||!c||!count){for(let i=0;i<n;i++)onEach?.(i);return Promise.resolve();}
 const R=60,jobs=[];
 for(let i=0;i<count;i++){const ang=(-150+i*(120/Math.max(1,count-1)))*Math.PI/180;const sx=c.x+Math.cos(ang)*R,sy=c.y+Math.sin(ang)*R*.8;const e=ember(false);
  const an=run(e,[{transform:`translate(${sx}px,${sy}px) scale(1)`,opacity:0},{transform:`translate(${sx}px,${sy}px) scale(1)`,opacity:1,offset:.25},{transform:`translate(${c.x}px,${c.y}px) scale(.6)`,opacity:.9}],
   {duration:800,delay:i*LIM().gatherStepMs,easing:'linear',fill:'both'});
  jobs.push(done(an).then(()=>{e.remove();onEach?.(i);}));}
 // if the lesson had more embers than flew, the rest are counted with the last one
 return Promise.all(jobs).then(()=>{for(let i=count;i<n;i++)onEach?.(i);});
}
// Then 10-14 embers float up from the lantern and fade (<= 2.4 s, <= 120 px/s on every straight segment, linear). Deterministic positions.
export function floatUp(origin,n=12){
 const c=point(origin);const count=Math.min(n,LIM().maxParticles);if(level()!=='full'||!c)return Promise.resolve();
 const jobs=[];for(let i=0;i<count;i++){const dx=((i*37)%60)-30,rise=70+((i*53)%50),dur=1400;const e=ember(false);
  const an=run(e,[{transform:`translate(${c.x}px,${c.y}px) scale(.6)`,opacity:0},{transform:`translate(${c.x+dx*.4}px,${c.y-rise*.3}px) scale(1)`,opacity:1,offset:.25},{transform:`translate(${c.x+dx}px,${c.y-rise}px) scale(.7)`,opacity:0}],
   {duration:Math.min(dur,LIM().celebrateMs),delay:i*50,easing:'linear',fill:'both'});
  jobs.push(done(an).then(()=>e.remove()));}
 return Promise.all(jobs);
}
// Numbers count up (text only). In "Тихо" the final number is shown at once.
export function countUp(el,from,to,{ms=600}={}){if(!el)return Promise.resolve();if(level()==='off'||from===to){el.textContent=String(to);return Promise.resolve();}
 return new Promise(res=>{const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/ms);el.textContent=String(Math.round(from+(to-from)*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(step);else res();};requestAnimationFrame(step);});}
// Break: 12 lights around a circle; inhale 4 s (they light one by one), exhale 4 s (they dim). Started and paused by the child.
// Three cycles, then it stops by itself. Opacity only; each light changes brightness once per 4 s.
export function breathe(dots,word,{cycles=3,labels=['Вдох','Выдох'],onEnd}={}){
 const D=LIM().breatheMs*2,n=dots.length;
 const anims=dots.map((d,i)=>run(d,[{opacity:.22,offset:0},{opacity:.22,offset:i/(2*n)},{opacity:1,offset:(i+1)/(2*n)},{opacity:1,offset:.5+i/(2*n)},{opacity:.22,offset:.5+(i+1)/(2*n)},{opacity:.22,offset:1}],{duration:D,iterations:cycles,easing:'linear'})).filter(Boolean);
 let raf=0,stopped=false;const tick=()=>{if(stopped||!anims[0])return;const t=Number(anims[0].currentTime)||0;if(word)word.textContent=(t%D)<D/2?labels[0]:labels[1];raf=requestAnimationFrame(tick);};
 if(anims[0]){raf=requestAnimationFrame(tick);anims[0].onfinish=()=>{stopped=true;cancelAnimationFrame(raf);if(word)word.textContent='';onEnd?.();};}
 return {pause(){anims.forEach(a=>a.pause());cancelAnimationFrame(raf);},resume(){anims.forEach(a=>a.play());raf=requestAnimationFrame(tick);},
  stop(){stopped=true;cancelAnimationFrame(raf);anims.forEach(a=>a.cancel());if(word)word.textContent='';},get paused(){return anims[0]?.playState==='paused';}};
}
// Lists reorder smoothly (FLIP), used on the teacher screen. key = attribute that identifies a row.
export function flip(container,key,mutate){
 if(level()==='off'||!container){mutate();return;}
 const before=new Map([...container.querySelectorAll(`[${key}]`)].map(el=>[el.getAttribute(key),el.getBoundingClientRect()]));
 mutate();
 for(const el of container.querySelectorAll(`[${key}]`)){const b=before.get(el.getAttribute(key));if(!b){run(el,[{opacity:0},{opacity:1}],{duration:200});continue;}
  const a=el.getBoundingClientRect();const dx=b.left-a.left,dy=b.top-a.top;if(Math.abs(dx)<1&&Math.abs(dy)<1)continue;
  run(el,[{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:240,easing:EASE});}
}
// One soft ring around a card that just asked for attention (teacher screen; twice, then still).
export function ring(el){if(level()==='off'||!el)return null;return run(el,[{opacity:.9,transform:'scale(.98)'},{opacity:0,transform:'scale(1.03)'}],{duration:1100,iterations:2,easing:'ease-out'});}
