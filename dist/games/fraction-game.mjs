// "Collect a share" (M01). 3D scene (Three.js + GLB from assets-src/fractions.blend) and an equal 2D version.
// Both modes share one state object owned by the caller, so switching 3D <-> 2D or redrawing never loses the answer.
// The game never grades: it sends the selection through opts.submit and shows what the server returned.
const F=window.AyanFractions;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const S={
 title:['Үлесті жина','Собери долю'],task:['{n}-тапсырма, барлығы 3','Задание {n} из 3'],
 part:['{n}-бөлік','Часть {n}'],circleA:['1-дөңгелек','Круг 1'],circleB:['2-дөңгелек','Круг 2'],
 check:['Тексеру','Проверить'],resend:['Қайта жіберу','Отправить ещё раз'],next:['Келесі тапсырма →','Следующее задание →'],hint:['Кеңес','Подсказка'],
 view2d:['Суретпен көрсету','Показать картинкой'],view3d:['3D-да көрсету','Показать в 3D'],retry3d:['3D-ны қайта жүктеу','Загрузить 3D ещё раз'],
 loading:['3D жүктеліп жатыр… {p}%','Загружаем 3D… {p}%'],fallback:['3D әлі жүктелмеді. Осы тапсырманы суретпен шешейік.','3D пока не загрузилось. Решим эту же задачу на картинке.'],
 noWebgl:['Бұл құрылғыда 3D жоқ. Тапсырма суретпен.','На этом устройстве нет 3D. Задание на картинке.'],
 saving:['Жауапты сақтап жатырмыз…','Сохраняем ответ…'],saveFailed:['Жауап әзірге сақталмады. Тағы байқап көрейік.','Ответ пока не сохранён. Попробуем ещё раз.'],
 correct:['Сақталды. Дұрыс!','Сохранено. Верно!'],incorrect:['Сақталды. Әзірге басқаша.','Сохранено. Пока не так.'],
 chosen:['Таңдалды: {c}','Выбран: {c}'],solved:['орындалды','выполнено'],stage:['Сахна','Сцена'],controls:['Таңдау','Выбор']
};
const tr=(L,k,o)=>{let s=(S[k]||F.FEEDBACK[k]||[k,k])[L];if(o)for(const x in o)s=s.replaceAll('{'+x+'}',o[x]);return s;};
// Sector i spans clockwise from 12 o'clock. Same math as the Blender wedges.
function sectorPath(angles,i,cx,cy,r){let a0=0;for(let k=0;k<i;k++)a0+=angles[k];const a1=a0+angles[i],p=a=>[cx+r*Math.sin(a*Math.PI/180),cy-r*Math.cos(a*Math.PI/180)];const [x0,y0]=p(a0),[x1,y1]=p(a1);return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${angles[i]>180?1:0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;}
function diskSvg(angles,selected,size,label){
 return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" ${label?`role="img" aria-label="${esc(label)}"`:'aria-hidden="true"'}>`+angles.map((_,i)=>`<path d="${sectorPath(angles,i,50,50,44)}" fill="${selected.includes(i)?'#f2b38a':'#fff6de'}" stroke="#17301f" stroke-width="2.2" ${selected.includes(i)?'class="is-on"':''}/>`).join('')+(selected.length?angles.map((_,i)=>selected.includes(i)?`<circle cx="${50+26*Math.sin((angles.slice(0,i).reduce((a,b)=>a+b,0)+angles[i]/2)*Math.PI/180)}" cy="${50-26*Math.cos((angles.slice(0,i).reduce((a,b)=>a+b,0)+angles[i]/2)*Math.PI/180)}" r="6" fill="#17301f"/>`:'').join(''):'')+`<circle cx="50" cy="50" r="44" fill="none" stroke="#17301f" stroke-width="3"/></svg>`;
}

export function mount(host,opts){
 const L=opts.lang==='kk'?0:1,t=(k,o)=>tr(L,k,o),st=opts.state;
 st.index??=0;st.sel??={};st.choice??={};st.assisted??={};st.status??={};st.reason??={};st.mode??=(opts.preferMode||'3d');st.solved??={};st.sent??={};
 let three=null,dead=false;
 const task=()=>F.TASKS[st.index];
 const selected=()=>st.sel[task().id]||[];
 function render(){
  const tk=task(),id=tk.id,status=st.status[id]||'editing',done=!!st.solved[id];
  const choiceLabel=st.choice[id]==='equal'?t('circleA'):st.choice[id]==='unequal'?t('circleB'):'';
  const msg=status==='submitting'?t('saving'):status==='save_failed'?t('saveFailed'):status==='empty'?F.FEEDBACK.nothing[L]:status==='hint'?tk.hint[L]
   :status==='evaluated'?(done?t('correct'):t('incorrect')+' '+F.FEEDBACK.check[L]+' '+(st.reason[id]?F.FEEDBACK[st.reason[id]][L]:'')):'';
  const count=tk.kind==='select'?F.FEEDBACK.selected[L].replace('{n}',selected().length):(choiceLabel?t('chosen',{c:choiceLabel}):'');
  host.innerHTML=`<section class="fg" aria-labelledby="fg-prompt"><div class="fg-top"><ol class="fg-tasks" aria-label="${esc(t('title'))}">${F.TASKS.map((x,i)=>`<li class="${st.solved[x.id]?'is-done':i===st.index?'is-current':''}" ${i===st.index?'aria-current="step"':''}>${st.solved[x.id]?'✓':i+1}<span class="sr-only"> ${st.solved[x.id]?t('solved'):''}</span></li>`).join('')}</ol>`
   +`<button type="button" class="secondary fg-mode" data-mode>${st.mode==='3d'?t('view2d'):t('view3d')}</button></div>`
   +`<p class="fg-count-task">${t('task',{n:st.index+1})}</p><h2 id="fg-prompt" tabindex="-1">${esc(tk.prompt[L])}</h2>`
   +`<div class="fg-stage" ${st.mode==='3d'?`role="img" aria-label="${esc(t('stage'))}: ${esc(tk.prompt[L])}"`:''}>${st.mode==='3d'?'<div class="fg-3d"><p class="fg-loading" role="status"></p></div>':''}</div>`
   +`<div class="fg-controls" role="group" aria-label="${esc(t('controls'))}">${controls(tk,done)}</div>`
   +`<p class="fg-count" aria-live="polite">${esc(count)}</p><p class="fg-msg${status==='save_failed'?' is-warning':''}" role="status">${esc(msg)}</p>`
   +`<div class="fg-actions"><button type="button" class="secondary" data-hint ${done?'disabled':''}>${t('hint')}</button>`
   +(done?(st.index<F.TASKS.length-1?`<button type="button" class="primary" data-next>${t('next')}</button>`:'')
     :`<button type="button" class="primary" data-check ${status==='submitting'?'disabled aria-busy="true"':''}>${status==='save_failed'?t('resend'):t('check')}</button>`)+`</div></section>`;
  if(st.mode==='3d')start3d();else{stop3d();}
 }
 function controls(tk,done){
  if(tk.kind==='select'){const sel=selected();return `<div class="fg-2d-preview">${st.mode==='2d'?diskSvg(F.EQUAL,sel,200,''):''}</div><div class="fg-parts">`+F.EQUAL.map((_,i)=>`<button type="button" class="fg-part" data-part="${i}" aria-pressed="${sel.includes(i)}" ${done?'disabled':''}>${diskSvg(F.EQUAL,[i],44,'')}<span>${t('part',{n:i+1})}</span></button>`).join('')+'</div>';}
  const c=st.choice[tk.id];return '<div class="fg-options">'+[['equal',F.EQUAL,'circleA'],['unequal',F.UNEQUAL,'circleB']].map(([v,a,k])=>`<button type="button" class="fg-option" data-choice="${v}" aria-pressed="${c===v}" ${done?'disabled':''}>${diskSvg(a,[],st.mode==='2d'?140:56,'')}<span>${t(k)}</span></button>`).join('')+'</div>';
 }
 function toggle(i){const id=task().id;if(st.solved[id])return;const s=new Set(selected());s.has(i)?s.delete(i):s.add(i);st.sel[id]=[...s].sort();if(st.status[id]!=='submitting')st.status[id]='editing';render();focusAfter(`[data-part="${i}"]`);}
 function choose(v){const id=task().id;if(st.solved[id])return;st.choice[id]=v;if(st.status[id]!=='submitting')st.status[id]='editing';render();focusAfter(`[data-choice="${v}"]`);}
 function focusAfter(sel){if(opts.keyboard?.())host.querySelector(sel)?.focus();}
 async function check(){
  const tk=task(),id=tk.id;if(st.status[id]==='submitting')return;
  const answer=tk.kind==='select'?selected().join(','):(st.choice[id]||'');
  if(!answer){st.status[id]='empty';render();return;} // no answer is not a wrong answer
  st.status[id]='submitting';render();
  const r=await opts.submit(id,answer,!!st.assisted[id]);if(dead)return;
  if(r.status==='evaluated'){st.status[id]='evaluated';st.reason[id]=r.reason||null;if(r.evaluation==='correct')st.solved[id]=true;}else st.status[id]='save_failed';
  render();host.querySelector('.fg-msg')?.focus?.();
  if(r.completed)opts.onDone?.();
 }
 host.onclick=e=>{const b=e.target.closest('button');if(!b||dead)return;
  if(b.hasAttribute('data-mode')){st.mode=st.mode==='3d'?'2d':'3d';st.fallback=null;opts.onMode?.(st.mode);render();host.querySelector('[data-mode]')?.focus();return;}
  if(b.dataset.part!==undefined)return toggle(Number(b.dataset.part));
  if(b.dataset.choice)return choose(b.dataset.choice);
  if(b.hasAttribute('data-hint')){const id=task().id;st.assisted[id]=true;st.status[id]='hint';opts.onHint?.(id);render();return;}
  if(b.hasAttribute('data-check'))return check();
  if(b.hasAttribute('data-next')){st.index=Math.min(F.TASKS.length-1,st.index+1);render();host.querySelector('#fg-prompt')?.focus();return;}
  if(b.hasAttribute('data-retry3d')){st.mode='3d';st.fallback=null;render();}
 };

 // ---------- 3D ----------
 async function start3d(){
  const box=host.querySelector('.fg-3d');if(!box)return;
  if(three){three.attach(box);three.sync();return;}
  const loading=box.querySelector('.fg-loading');
  const fail=(key)=>{if(dead)return;stop3d();st.mode='2d';st.fallback=key;render();const p=document.createElement('p');p.className='fg-fallback';p.setAttribute('role','status');p.innerHTML=esc(t(key))+(key==='fallback'?` <button type="button" class="secondary" data-retry3d>${t('retry3d')}</button>`:'');host.querySelector('.fg-stage').append(p);};
  const gl=document.createElement('canvas').getContext('webgl2')||document.createElement('canvas').getContext('webgl');if(!gl)return fail('noWebgl');
  loading.textContent=t('loading',{p:0});
  try{three=await create3d(box,{url:opts.glbUrl||'/assets/games/3d/fractions.glb',timeoutMs:opts.timeoutMs??12000,motion:opts.motion!==false,onProgress:p=>{if(loading.isConnected)loading.textContent=t('loading',{p})},onPick:(name)=>{const m=/^(U?)Sector_(\d)$/.exec(name);if(!m)return;if(task().kind==='select'&&!m[1])toggle(Number(m[2]));else if(task().kind==='choose')choose(m[1]?'unequal':'equal');},state:()=>({task:task(),sel:selected(),choice:st.choice[task().id]})});
   if(dead){three.destroy();three=null;return;}loading.remove();three.sync();opts.on3d?.(three);
  }catch(err){three=null;fail('fallback');}
 }
 function stop3d(){if(three){three.destroy();three=null;}}
 render();
 return {destroy(){dead=true;stop3d();host.onclick=null;host.innerHTML='';},rerender:render,get three(){return three;}};
}

// Scene: loads the GLB with progress, timeout and error. Renders only when something changes (no idle loop).
async function create3d(box,{url,timeoutMs,motion,onProgress,onPick,state}){
 const THREE=await import('three');const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
 const manager=new THREE.LoadingManager();const loader=new GLTFLoader(manager);
 const gltf=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('timeout')),timeoutMs);
  loader.load(url,g=>{clearTimeout(timer);resolve(g);},e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));},err=>{clearTimeout(timer);reject(err);});});
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.1,100);
 scene.add(new THREE.HemisphereLight(0xffffff,0xa9b99a,2.2));const sun=new THREE.DirectionalLight(0xffffff,1.6);sun.position.set(-4,8,6);scene.add(sun);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.className='fg-canvas';renderer.domElement.setAttribute('aria-hidden','true');
 const root=gltf.scene;scene.add(root);
 const sectors=[],base=new Map(),mats=new Set(),geos=new Set();
 root.traverse(o=>{if(o.isMesh){geos.add(o.geometry);for(const m of [].concat(o.material))mats.add(m);if(/Sector_\d$/.test(o.name)){o.material=o.material.clone();mats.add(o.material);sectors.push(o);base.set(o,o.position.clone());}}});
 root.getObjectByName('Board')?.material?.color?.set('#c5d6ae');
 const diskEq=root.getObjectByName('DiskEqual'),diskUn=root.getObjectByName('DiskUnequal'),eqX=diskEq.position.x;
 const cream=new THREE.Color('#fff6de'),apricot=new THREE.Color('#f2b38a');
 let raf=0,w=0,h=0,host=box;
 function frame(){raf=0;renderer.render(scene,camera);}
 const draw=()=>{if(!raf)raf=requestAnimationFrame(frame);};
 function resize(){const r=host.getBoundingClientRect();w=Math.max(200,r.width);h=Math.max(160,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
 function sync(){const s=state(),choose=s.task.kind==='choose';
  diskUn.visible=choose;diskEq.position.x=choose?eqX:0;
  camera.position.set(0,1.78,choose?7.4:5.0);camera.lookAt(0,1.72,0);
  for(const o of sectors){const un=o.name.startsWith('U'),i=Number(o.name.slice(-1));
   const on=choose?(s.choice===(un?'unequal':'equal')):(!un&&s.sel.includes(i));
   o.material.color.copy(on?apricot:cream);o.position.copy(base.get(o));if(on&&!choose)o.position.z+=.14;}
  for(const [d,v] of [[diskEq,'equal'],[diskUn,'unequal']]){const on=choose&&s.choice===v;d.scale.setScalar(on?1.06:1);}
  draw();}
 const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();
 function pick(e){const r=renderer.domElement.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ptr,camera);const hit=ray.intersectObjects(sectors.filter(o=>o.parent.visible),false)[0];if(hit)onPick(hit.object.name);}
 function hover(e){const r=renderer.domElement.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ptr,camera);renderer.domElement.style.cursor=ray.intersectObjects(sectors.filter(o=>o.parent.visible),false).length?'pointer':'default';}
 const ro=new ResizeObserver(resize);
 function attach(el){host=el;el.querySelector('.fg-loading')?.remove();el.append(renderer.domElement);ro.disconnect();ro.observe(el);resize();}
 renderer.domElement.addEventListener('pointerdown',pick);renderer.domElement.addEventListener('pointermove',hover);
 attach(box);
 return {sync,attach,renderer,camera,sectors,
  destroy(){cancelAnimationFrame(raf);ro.disconnect();renderer.domElement.removeEventListener('pointerdown',pick);renderer.domElement.removeEventListener('pointermove',hover);
   for(const g of geos)g.dispose();for(const m of mats){for(const k in m)if(m[k]?.isTexture)m[k].dispose();m.dispose();}
   renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
