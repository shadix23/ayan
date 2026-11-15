// Frame record of the 2D mascot reactions (brief-mascot.md, acceptance 3-4): the WAAPI timeline is paused and scrubbed
// at 60 fps, one PNG per frame, then a contact strip and an mp4 per reaction (ffmpeg from Remotion's compositor, if present).
// Usage: AYAN_TEST_URL=http://127.0.0.1:4302 PLAYWRIGHT_PATH=... node scripts/mascot-frames.cjs   -> hackathon/mascot/build-v2/
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4302',OUT=process.env.AYAN_MASCOT_DIR||'hackathon/mascot/build-v2';
const FF=process.env.AYAN_FFMPEG||['video/node_modules/@remotion/compositor-darwin-arm64/ffmpeg','video/node_modules/@remotion/compositor-darwin-x64/ffmpeg'].find(f=>fs.existsSync(f));
// Remotion's ffmpeg loads its dylibs from its own folder
const FFENV={...process.env,DYLD_LIBRARY_PATH:FF?path.resolve(path.dirname(FF)):''};
const RUNS=[['lit','Lit',900],['celebrating','Celebrating',1700],['greeting','Greeting',1300],['midair-to-helping','Celebrating',500,'Helping',700]];
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:600,height:400},deviceScaleFactor:2});
 await p.goto(B+'/');await p.waitForSelector('#intro-mascot svg.ayan2d');
 await p.evaluate(async()=>{document.documentElement.dataset.motion='full';const M=await import('/v2/mascot2d.mjs');document.body.style.overflow='hidden';
  const h=document.createElement('div');h.style.cssText='position:fixed;left:0;top:0;width:300px;height:300px;padding:30px;box-sizing:border-box;z-index:99;background:#F7FAF8';document.body.append(h);
  window.__m=M.mount(h,{state:'Idle',motion:true});const svg=h.querySelector('svg');window.__own=()=>document.getAnimations().filter(a=>svg.contains(a.effect?.target));
  window.__settle=()=>{for(const a of window.__own()){try{a.finish();}catch{a.cancel();}}};});
 for(const [name,state,ms,next,ms2] of RUNS){const dir=path.join(OUT,'frames',name);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});let n=0;
  const grab=async()=>p.screenshot({path:path.join(dir,String(n++).padStart(3,'0')+'.png'),clip:{x:0,y:0,width:300,height:300}});
  await p.evaluate(s=>{window.__m.set('Idle');window.__settle();window.__settle();window.__own().forEach(a=>a.cancel());window.__m.set(s);window.__own().forEach(a=>a.pause());},state);
  for(let t=0;t<=ms;t+=1000/60){await p.evaluate(t=>window.__own().forEach(a=>{a.currentTime=t;}),t);await grab();}
  if(next){await p.evaluate(s=>{window.__m.set(s);window.__own().forEach(a=>a.pause());},next);
   for(let t=1000/60;t<=ms2;t+=1000/60){await p.evaluate(t=>window.__own().forEach(a=>{a.currentTime=t;}),t);await grab();}}
  if(FF){execFileSync(FF,['-y','-loglevel','error','-framerate','60','-i',path.join(dir,'%03d.png'),'-pix_fmt','yuv420p','-vf','scale=600:600',path.join(OUT,`${name}-60fps.mp4`)],{env:FFENV});
}
  console.log(name,n,'frames');}
 // Contact strips without ffmpeg filters: one mascot per cell, each paused at its own moment (every 4th frame = 67 ms).
 for(const [name,state,ms,next] of RUNS){if(next)continue;const cells=Math.floor(ms/(4000/60))+1;
  const size=await p.evaluate(async([s,cells])=>{document.getElementById('strip')?.remove();const M=await import('/v2/mascot2d.mjs');const g=document.createElement('div');g.id='strip';
   g.style.cssText='position:fixed;left:0;top:0;z-index:100;display:grid;grid-template-columns:repeat(10,120px);gap:0;padding:8px;background:#F7FAF8';document.body.append(g);
   for(let i=0;i<cells;i++){const h=document.createElement('div');h.style.cssText='width:120px;height:138px;padding:12px 6px 18px;box-sizing:border-box;position:relative';
    h.innerHTML=`<span style="position:absolute;left:0;right:0;bottom:2px;text-align:center;font:600 11px system-ui;color:#526475">${Math.round(i*4000/60)} ms</span>`;
    const box=document.createElement('div');box.dataset.mascotSlot='strip'+i;box.style.cssText='width:100%;height:100%';h.append(box);g.append(h);
    const m=M.mount(box,{state:'Idle',motion:true});const svg=box.querySelector('svg');const own=()=>document.getAnimations().filter(a=>svg.contains(a.effect?.target));
    own().forEach(a=>a.cancel());m.set(s);own().forEach(a=>{a.pause();a.currentTime=i*4000/60;});}
   const r=g.getBoundingClientRect();return {w:Math.ceil(r.width),h:Math.ceil(r.height)};},[state,cells]);
  await p.setViewportSize({width:Math.max(600,size.w),height:Math.max(400,size.h)});
  await p.screenshot({path:path.join(OUT,`${name}-strip.png`),clip:{x:0,y:0,width:size.w,height:size.h}});console.log(name,'strip',cells,'cells');}
 await b.close();
})();
