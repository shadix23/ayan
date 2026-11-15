// Frame cost of the 2D mascot (brief-mascot.md: "замер при замедлении CPU 4x, кадр не дольше 8 мс").
// Chrome trace of the renderer main thread while Аян plays Lit and Celebrating, CPU throttled 4x via CDP.
// One frame = ProxyMain::BeginMainFrame (animations, style, layout, paint, commit of that frame).
// Usage: AYAN_TEST_URL=http://127.0.0.1:4302 PLAYWRIGHT_PATH=... node tests/mascot-perf.cjs   (exit 1 if p95 > 8 ms or frames are lost)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4302',LIMIT=8;
const results=[];const check=(id,ok,detail)=>{results.push(!!ok);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 async function measure(page,run,ms){
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await browser.startTracing(page,{categories:['devtools.timeline','disabled-by-default-devtools.timeline.frame','cc']});
  await page.evaluate(run);await page.waitForTimeout(ms);
  const ev=JSON.parse((await browser.stopTracing()).toString()).traceEvents;await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  const names={};for(const e of ev)if(e.ph==='M'&&e.name==='thread_name')names[e.pid+':'+e.tid]=e.args.name;
  const frames=ev.filter(e=>e.name==='ProxyMain::BeginMainFrame'&&e.ph==='X'&&names[e.pid+':'+e.tid]==='CrRendererMain').map(e=>({ts:e.ts,dur:e.dur/1000})).sort((a,b)=>a.ts-b.ts);
  const d=frames.map(f=>f.dur).sort((a,b)=>a-b),q=k=>d[Math.min(d.length-1,Math.floor(d.length*k))]||0;
  const span=frames.length>1?(frames[frames.length-1].ts-frames[0].ts)/1000:0;
  return {frames:frames.length,fps:+(span?(frames.length-1)/(span/1000):0).toFixed(1),mean:+(d.reduce((a,b)=>a+b,0)/(d.length||1)).toFixed(2),p95:+q(.95).toFixed(2),max:+(d[d.length-1]||0).toFixed(2)};
 }
 try{
  // 1) the mascot alone, 240 px (the reaction itself)
  {const p=await browser.newPage({viewport:{width:1440,height:900}});await p.goto(B+'/');await p.waitForSelector('#intro-mascot svg.ayan2d');await p.waitForTimeout(1200);
   await p.evaluate(async()=>{document.documentElement.dataset.motion='full';document.querySelector('.hero')?.setAttribute('hidden','');const M=await import('/v2/mascot2d.mjs');
    const h=document.createElement('div');h.style.cssText='position:fixed;left:40px;top:40px;width:240px;height:240px;z-index:99;background:#F7FAF8';document.body.append(h);window.__m=M.mount(h,{state:'Idle',motion:true});});
   await p.waitForTimeout(400);
   for(const s of ['Lit','Celebrating']){const r=await measure(p,`window.__m.set('Idle');window.__m.set('${s}')`,s==='Lit'?1200:2600);
    check(`PERF-${s} 240 px mascot, CPU 4x: frame p95 <= ${LIMIT} ms and ~60 fps`,r.p95<=LIMIT&&r.fps>=50,JSON.stringify(r));}
   await p.close();}
  // 2) the real landing hero (the mascot with the rest of the page), the "Порадуйся" button
  {const p=await browser.newPage({viewport:{width:1440,height:900}});await p.goto(B+'/');await p.waitForSelector('#intro-mascot svg.ayan2d');await p.waitForTimeout(1500);
   const r=await measure(p,`document.querySelector('[data-mascot-clip="Celebrating"]').click()`,2600);
   check(`PERF-landing landing hero, Celebrating, CPU 4x: frame p95 <= ${LIMIT} ms and ~60 fps`,r.p95<=LIMIT&&r.fps>=50,JSON.stringify(r));await p.close();}
 }catch(e){console.error(e);results.push(false);}
 await browser.close();const failed=results.filter(x=>!x).length;console.log(JSON.stringify({checks:results.length,failed}));process.exit(failed?1:0);
})();
