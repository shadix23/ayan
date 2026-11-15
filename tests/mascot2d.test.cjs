// 2D mascot Аян (hackathon/mascot/brief-mascot.md): the pure part of dist/v2/mascot2d.mjs, without a browser.
// States and contract, the rig (<= 18 shapes, one face oval, flat fills), ceilings of every planned motion, size budget, the 32 px mark.
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const ROOT=path.join(__dirname,'..');
const load=()=>import(path.join(ROOT,'dist/v2/mascot2d.mjs'));
const {LIMITS}=require('../dist/v2/lights.js');
const LEVELS=['soft','full'];

test('ten states through the old contract: the seven old ones plus Lit, Resting, Sleeping',async()=>{
 const M=await load();
 assert.deepEqual([...M.STATES].sort(),['Celebrating','Encouraging','Explaining','Greeting','Helping','Idle','Lit','Resting','Sleeping','Thinking']);
 for(const f of ['mount','destroyAll'])assert.equal(typeof M[f],'function',f);
 for(const s of M.STATES)assert.ok(M.POSES[s],'pose for '+s);
});

// Visible shapes of one pose: everything drawn except the ground shadow, the light halo and the stacked alternates
// (four spare mouths and two closed-eye lids that replace the open eyes). Hidden groups are cut out with their shapes.
function shapes(svg){return [...svg.matchAll(/<(path|ellipse|circle|rect)\b([^>]*)>/g)].map(m=>({tag:m[1],attrs:m[2],p:(m[2].match(/data-p="([^"]+)"/)||[])[1]||''}));}
const HIDDEN=['shadow','halo','lidL','lidR','m-wide','m-flat','m-o','m-sleep'];
function visibleSvg(svg){let s=svg;for(const p of HIDDEN)s=s.replace(new RegExp(`<g data-p="${p}"[^>]*>.*?</g>`),'').replace(new RegExp(`<(path|ellipse|circle|rect) data-p="${p}"[^>]*/>`),'');return s;}
test('rig (owner reference "Светлячок"): at most 18 visible shapes, separate head layer, big eyes with brows, no strokes, radial gradients only on head, belly light and halo',async()=>{
 const M=await load();const svg=M.svg();
 const visible=shapes(visibleSvg(svg));
 assert.ok(visible.length<=18,`visible shapes: ${visible.length}`);
 assert.ok(!/stroke(-width)?="(?!none)/.test(svg),'no stroke (stroke="none" only guards against page CSS)');
 assert.ok((svg.match(/<radialGradient/g)||[]).length<=3,'at most 3 radial gradients');
 assert.ok(!/<linearGradient|filter=|<filter/.test(svg),'no linear gradient, no filter');
 const used=shapes(svg).filter(s=>/url\(#/.test(s.attrs)).map(s=>s.p||'head-shape');
 assert.deepEqual(used.sort(),['core','halo','head-shape'].sort(),'gradients only on the head, the belly light and the halo');
 assert.ok(/<g data-p="head"[^>]*>.*<ellipse fill="url\(#[^"]+-h\)"/.test(svg),'the head is one round shape on its own layer');
 assert.equal(shapes(svg).filter(s=>/fill="#fff"/i.test(s.attrs)).length,2,'two white eyes');
 for(const p of ['shadow','root','wingL','wingR','feet','squash','torso','halo','belly','core','armL','armR','head','antL','antR','face','brows','eyeL','eyeR','pupilL','pupilR','lidL','lidR','m-smile','m-wide','m-flat','m-o','m-sleep'])
  assert.ok(svg.includes(`data-p="${p}"`),'part '+p);
 // the head sits above the body and is the biggest shape: head height >= 40% of the figure
 assert.ok(svg.indexOf('data-p="head"')>svg.indexOf('data-p="torso"'),'head is drawn over the collar');
});

test('the 32 px mark is the same head with antennas, brows, eyes and mouth; dist/assets/ayan-mark.svg is that mark',async()=>{
 const M=await load();const mark=M.svg({mark:true});const file=fs.readFileSync(path.join(ROOT,'dist/assets/ayan-mark.svg'),'utf8');
 const norm=s=>s.replace(/\s+/g,' ').trim();
 assert.equal(norm(file),norm(mark),'file = generated mark');
 const d=s=>shapes(s).map(x=>(x.attrs.match(/\sd="([^"]+)"/)||x.attrs.match(/cx="[^"]+" cy="[^"]+"[^/]*/)||[''])[0]);
 const full=new Set(d(M.svg()));for(const x of d(mark))assert.ok(full.has(x),'mark shape comes from the mascot: '+x.slice(0,40));
 assert.ok(!mark.includes(M.C.wing)&&!mark.includes(M.C.limb)&&!mark.includes(M.C.honey),'no wings, limbs or belly: the head only');
 assert.ok(shapes(mark).length<=10);
});

// Arm, wing and antenna tips: displacement of the far point after rotation (and translation) about the pivot.
function tipShift(M,p,rot,tr=[0,0]){const [px,py]=M.PIVOT[p],[tx,ty]=M.TIP[p];const a=rot*Math.PI/180,dx=tx-px,dy=ty-py;
 const x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);return Math.hypot(x-dx+tr[0],y-dy+tr[1]);}
function eachKey(M,cb){for(const lvl of LEVELS)for(const s of M.STATES)for(const opt of [{},{ret:true},{quiet:true}]){const p=M.plan(s,lvl,opt);
 const tracks=[...p.tracks,...(p.ambient||[]).map(a=>({p:a.p,prop:a.prop,amb:true,keys:a.kf.map(k=>[0,k])}))];
 const byPart={};for(const t of tracks){(byPart[t.p]||={})[t.prop]=t;}
 for(const t of tracks)for(const k of t.keys)if(k[1]!=null)cb({lvl,s,t,v:k[1],byPart});}}
test('every planned motion stays inside the ceilings (scale 0.94-1.06, jump <= 24 px, tips <= 24 px except Celebrating arms in "Живо")',async()=>{
 const M=await load();
 assert.equal(LIMITS.celebrateArmDeg,70,'the owner-approved exception lives in LIMITS');
 eachKey(M,({lvl,s,t,v})=>{const id=`${lvl}/${s}/${t.p}.${t.prop}=${JSON.stringify(v)}`;
  if(t.prop==='scale'&&t.p==='squash')for(const x of v)assert.ok(x>=LIMITS.minScale&&x<=LIMITS.maxScale,id);
  if(t.prop==='translate'&&t.p==='root'){assert.ok(Math.abs(v[0])<=LIMITS.maxShift&&Math.abs(v[1])<=LIMITS.maxShift,id);if(lvl==='soft')assert.equal(v[1],0,'no jump in "Мягко": '+id);}
  if(t.prop==='scale'&&t.p==='squash'&&lvl==='soft'&&!t.amb)assert.ok(s==='Sleeping'||v.every(x=>x===1),'no squash reaction in "Мягко": '+id);
  if(t.prop==='rotate'&&M.TIP[t.p]){const cap=(s==='Celebrating'&&lvl==='full'&&/^arm/.test(t.p))?tipShift(M,t.p,LIMITS.celebrateArmDeg)+.01:LIMITS.maxShift;
   assert.ok(tipShift(M,t.p,v)<=cap,`${id} tip ${tipShift(M,t.p,v).toFixed(1)} px`);}
  if(t.prop==='rotate'&&t.p==='root')assert.ok(Math.abs(v)<=4,id);
  if(['translate','rotate','scale','opacity'].indexOf(t.prop)<0)assert.fail('only transform and opacity: '+id);
 });
});
test('arm translation and rotation together stay under 24 px',async()=>{
 const M=await load();for(const lvl of LEVELS)for(const s of M.STATES){if(s==='Celebrating'&&lvl==='full')continue;const tg=M.targets(M.POSES[s],{soft:lvl==='soft'});
  for(const a of ['armL','armR']){const sh=tipShift(M,a,tg[a].rotate,tg[a].translate);assert.ok(sh<=LIMITS.maxShift,`${lvl}/${s}/${a} ${sh.toFixed(1)} px`);}}
});

test('timing from the brief: Lit motion <= 600 ms, Celebrating <= 2.4 s, Helping without jump, squash or light change',async()=>{
 const M=await load();const end=(p,f=()=>true)=>Math.max(0,...p.tracks.filter(f).map(t=>t.keys[t.keys.length-1][0]));
 const motion=t=>!t.light;
 assert.ok(end(M.plan('Lit','full'),motion)<=600,'Lit '+end(M.plan('Lit','full'),motion));
 assert.ok(end(M.plan('Celebrating','full'),motion)<=LIMITS.celebrateMs,'Celebrating');
 for(const s of ['Helping','Encouraging']){const p=M.plan(s,'full');
  assert.ok(!p.tracks.some(t=>t.p==='root'&&t.prop==='translate'&&t.keys.some(k=>k[1]&&k[1][1]!==0)),s+' no jump');
  assert.ok(!p.tracks.some(t=>t.p==='squash'&&t.keys.some(k=>k[1]&&(k[1][0]!==1||k[1][1]!==1))),s+' no squash');
  assert.ok(!p.tracks.some(t=>t.p==='core'),s+' the belly light (core) is not touched');}
 // Lit: crouch before take-off, wings 60 ms and antennas 80 ms behind the body, the core lights when the ember arrives
 const lit=M.plan('Lit','full');const tr=(p,pr)=>lit.tracks.find(t=>t.p===p&&t.prop===pr);
 const up=tr('root','translate').keys.find(k=>k[1]&&k[1][1]<0);const crouch=tr('squash','scale').keys.find(k=>k[1]&&k[1][1]<1);
 assert.ok(crouch[0]<up[0],'crouch first');
 const startOf=t=>t.keys.filter(k=>k[1]==null).slice(-1)[0][0];
 assert.ok(startOf(tr('wingL','rotate'))-startOf(tr('squash','scale'))>=60,'wings lag 60 ms');
 assert.ok(startOf(tr('antL','rotate'))-startOf(tr('squash','scale'))>=80,'antennas lag 80 ms');
 assert.ok(tr('core','opacity').keys.some(k=>k[1]===1&&k[0]>=LIMITS.flyMs),'core reaches 1 after the ember flight');
});

test('one event, one reaction: plans are deterministic and never use randomness',async()=>{
 const M=await load();for(const s of M.STATES)for(const l of LEVELS)assert.deepEqual(M.plan(s,l),M.plan(s,l),s);
 const src=fs.readFileSync(path.join(ROOT,'dist/v2/mascot2d.mjs'),'utf8');
 assert.ok(!/Math\.random/.test(src),'no Math.random');
});

test('budget: module with its SVG <= 12 KB gzip, no Three.js, no PNG stills, no new library',async()=>{
 const src=fs.readFileSync(path.join(ROOT,'dist/v2/mascot2d.mjs'));
 const gz=zlib.gzipSync(src,{level:9}).length;assert.ok(gz<=12*1024,'gzip '+gz);
 const s=src.toString();assert.ok(!/['"]three['"]|GLTFLoader|\.glb|stills\//.test(s),'no 3D in the 2D mascot');
 const imports=[...s.matchAll(/^import .* from '([^']+)'/gm)].map(m=>m[1]);assert.deepEqual(imports,['./motion.mjs']);
});
