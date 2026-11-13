// M01 "Collect a share": 3D/2D equivalence, GLB failure fallback, resources after 10 enters/exits, load timings.
// Usage: PORT=4183 node server.mjs; AYAN_TEST_URL=http://127.0.0.1:4183 PLAYWRIGHT_PATH=... node tests/game-m01.cjs
// Runs on the demo (browser-local data). Desktop headless Chrome with SwiftShader: timings are NOT phone measurements.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{const base=process.env.AYAN_TEST_URL||'http://127.0.0.1:4183';
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-precise-memory-info']});
 const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const out={};
 async function toPractice(){await page.locator('#open-lesson').click();const restart=page.locator('#resume-restart');if(await restart.count())await restart.click();while(await page.locator('#next-step').count())await page.locator('#next-step').click();await page.locator('.fg').waitFor();}
 async function close(){await page.locator('#lesson-close').click();await page.locator('#lesson-dialog').waitFor({state:'detached'});}
 await page.goto(base+'/demo/child');await page.evaluate(()=>{localStorage.setItem('ayan.game.mode','3d');sessionStorage.setItem('ayan.child.tab','day');});await page.reload();await page.locator('#open-lesson').waitFor();

 // 1) Same answers in 3D (raycast picks) and 2D (buttons) give the same server grading.
 await toPractice();await page.locator('.fg-canvas').waitFor();
 const pick=async name=>{const p=await page.evaluate(async n=>{const T=window.AyanGame.three,THREE=await import('three');const o=T.sectors.find(s=>s.name===n);const v=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).project(T.camera);const r=T.renderer.domElement.getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height];},name);await page.mouse.click(p[0],p[1]);};
 await pick('Sector_0');await pick('Sector_2');
 assert.equal(await page.locator('.fg-count').textContent(),'Выбрано частей: 2 из 4.');
 await page.locator('[data-check]').click();await page.locator('.fg-msg',{hasText:'Пока не так'}).waitFor();
 const g3=await page.locator('.fg-msg').textContent();
 await page.locator('.fg-mode').click();assert.equal(await page.locator('.fg-canvas').count(),0);
 assert.equal(await page.locator('.fg-part[aria-pressed="true"]').count(),2,'selection survives 3D -> 2D');
 await page.locator('[data-part="2"]').click(); // one part left -> correct
 await page.locator('[data-check]').click();await page.locator('.fg-msg',{hasText:'Верно'}).waitFor();
 const subs=await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('ayan.demo.workspace.v4'));return Object.values(d.submissions).filter(s=>s.taskId==='m01-t1').map(s=>[s.answer,s.evaluation]);});
 out.equivalence={threeD:g3.trim(),submissions:subs};
 assert.deepEqual(subs.map(s=>s[1]).sort(),['correct','incorrect']);
 // the same selection made with 2D buttons is graded the same as with 3D picks: 2 parts -> incorrect (needOne)
 await page.locator('[data-next]').click();
 await page.locator('[data-part="0"]').click();await page.locator('[data-part="2"]').click();await page.locator('[data-check]').click();await page.locator('.fg-msg',{hasText:'Верно'}).waitFor();
 await close();

 // 2) GLB error -> 2D fallback with the same task; answer kept; retry restores 3D.
 await page.route('**/fractions.glb',r=>r.abort());
 await page.evaluate(()=>localStorage.setItem('ayan.game.mode','3d'));
 await toPractice();await page.locator('.fg-fallback').waitFor();
 out.fallbackText=(await page.locator('.fg-fallback').textContent()).trim();
 assert.equal(await page.locator('.fg-canvas').count(),0);assert.ok(await page.locator('.fg-part, .fg-option').count()>0);
 await page.unroute('**/fractions.glb');await page.locator('[data-retry3d]').click();await page.locator('.fg-canvas').waitFor();
 await close();

 // 3) Ten enters/exits: renderer resources per mount stay constant, no canvases left behind.
 const rows=[],loads=[];
 for(let i=0;i<10;i++){const t0=Date.now();await toPractice();await page.locator('.fg-canvas').waitFor();await page.waitForFunction(()=>window.AyanGame?.three?.renderer.info.render.frame>0);loads.push(Date.now()-t0);
  rows.push(await page.evaluate(()=>{const m=window.AyanGame.three.renderer.info.memory;return {geometries:m.geometries,textures:m.textures,canvases:document.querySelectorAll('canvas.fg-canvas').length,heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null};}));
  await close();}
 out.leftCanvases=await page.locator('canvas.fg-canvas').count();assert.equal(out.leftCanvases,0);
 assert.ok(rows.every(r=>r.geometries===rows[0].geometries&&r.textures===rows[0].textures&&r.canvases===1),JSON.stringify(rows));
 const s=[...loads].sort((a,b)=>a-b);out.mounts=rows;out.openToFirstFrameMs={first:loads[0],median:s[Math.floor(s.length/2)],p95:s[s.length-1]};
 out.glbBytes=Number((await (await fetch(base+'/assets/games/3d/fractions.glb')).arrayBuffer()).byteLength);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify(out,null,1));console.log('PASS: 3D=2D grading, selection kept on switch, GLB error -> 2D + retry, 10 mounts stable');
 await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
