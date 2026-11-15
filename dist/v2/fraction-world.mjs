// Fraction World: one task, three views (3D / 2D / cards) and two construct modes (mark parts / build from pieces).
// All views read and write ONE state object owned by the caller, so switching never loses the answer and never
// changes the objective. The game never grades; the lesson sends answer() to the server and shows the result.
import {esc,icon,L,lang,sid} from './ui.mjs';
import * as Fig from './figures.mjs';
const Core=window.AyanCore;
const S={
 v3d:['3D','3D'],v2d:['2D','2D'],cards:['Карточки','Карточкалар'],views:['Как показать задание','Тапсырманы қалай көрсету'],
 mark:['Отметить части','Бөліктерді белгілеу'],build:['Собрать из кусков','Кесектерден құрау'],how:['Способ ответа','Жауап беру тәсілі'],
 part:['Часть {n}','{n}-бөлік'],selected:['Выбрано: {n} из {d} частей','Таңдалды: {d} бөліктің {n}'],selectedNone:['Пока ничего не выбрано.','Әзірге ештеңе таңдалмады.'],
 selectedWhere:['Выбрано: {list}. Изменить выбор можно.','Таңдалды: {list}. Таңдауды өзгертуге болады.'],partL:['часть {n}','{n}-бөлік'],
 pieces:['Куски','Кесектер'],pieceUnit:['кусок 1/{d}','1/{d} кесек'],place:['Положить в фигуру','Пішінге салу'],remove:['Убрать последний','Соңғысын алу'],
 inFigure:['В фигуре: {list}','Пішінде: {list}'],empty:['Фигура пока пустая. Выбери кусок и нажми «Положить в фигуру».','Пішін әзірге бос. Кесекті таңдап, «Пішінге салу» түймесін бас.'],
 pickedPiece:['Выбран кусок {p}. Теперь нажми «Положить в фигуру».','{p} кесегі таңдалды. Енді «Пішінге салу» түймесін бас.'],
 noPieces:['Таких кусков больше нет.','Мұндай кесек қалмады.'],
 cardsHelp:['Выбери картинку, где закрашено то, что просят.','Сұралғаны боялған суретті таңда.'],cardChosen:['Выбрана картинка {n}.','{n}-сурет таңдалды.'],card:['Картинка {n}','{n}-сурет'],unequalCard:['части разные','бөліктер әртүрлі'],
 load3d:['Загружаем 3D…','3D жүктеліп жатыр…'],no3d:['На этом устройстве 3D недоступно. То же задание показано в 2D, выбор сохранён.','Бұл құрылғыда 3D жоқ. Сол тапсырма 2D түрінде, таңдау сақталды.'],
 lost3d:['3D перестало работать. Продолжаем в 2D, выбор сохранён.','3D жұмысын тоқтатты. 2D-да жалғастырамыз, таңдау сақталды.'],
 scene:['Сцена: {shape}, {d} частей. Выбирать можно кнопками ниже.','Сахна: {shape}, {d} бөлік. Төмендегі түймелермен таңдауға болады.'],
 circle:['круг','дөңгелек'],pizza:['пицца','пицца'],strip:['полоска','жолақ'],rect:['прямоугольник','тіктөртбұрыш'],chocolate:['шоколадка','шоколад'],cake:['торт','торт'],
 equalParts:['Части отмечены пунктиром и номерами.','Бөліктер үзік сызықпен және нөмірмен белгіленген.'],example:['Разобранный пример','Шешілген мысал'],
 exampleText:['Здесь выбрано {n} из {d} равных частей: это {w}. Сделай так же со своей фигурой.','Мұнда {d} тең бөліктің {n} бөлігі таңдалды: бұл {w}. Өз пішініңмен солай істе.']
};
const t=(k,v)=>{let s=(S[k]||[k,k])[lang()==='kk'?1:0];if(v)for(const x in v)s=s.replaceAll('{'+x+'}',v[x]);return s;};

export function mount(host,{task,state,onChange,onEvent,motion=true,decorative=true,initialView}){
 const st=state;st.view??=initialView||'2d';st.mode??='mark';st.mark??=[];st.build??=[];st.card??=null;st.highlight??=false;st.example??=null;st.pick??=null;
 const modes=task.modes||['mark'];if(!modes.includes(st.mode))st.mode=modes[0];if(st.view==='cards'&&!modes.includes('card'))st.view='2d';
 if(st.view==='cards')st.mode='card';else if(st.mode==='card')st.mode=modes.find(m=>m!=='card')||'mark';
 let three=null,dead=false,note='';const uidp='fw'+sid().slice(0,6);
 const d=task.target[1],parts=task.parts,equal=Core.isEqualPartition(parts);
 const change=(why)=>{onChange?.(st,why);};

 function answer(){if(st.mode==='mark')return st.mark.length?'mark:'+[...st.mark].sort((a,b)=>a-b).join(','):'';
  if(st.mode==='build')return st.build.length?'build:'+[...st.build].sort().join(','):'';return st.card?'card:'+st.card:'';}
 // Carry the answer across modes as the same quantity (UDL2-01). Nothing is invented: only exact equivalents move.
 function convert(from,to){
  const val=(()=>{if(from==='mark'){if(!st.mark.length)return null;const W=Core.sum(parts),s=Core.sum(st.mark.map(i=>parts[i]));return [s,W];}
   if(from==='build'){if(!st.build.length||st.build.some(x=>x!=='u'))return null;return [st.build.length,d];}
   if(from==='card'&&st.card){const c=Core.cardsFor(task).find(x=>x.id===st.card);if(!c)return null;return [Core.sum(c.selected.map(i=>c.parts[i])),Core.sum(c.parts)];}return null;})();
  if(!val)return;const [n,w]=val;
  if(to==='mark'&&equal&&(n*parts.length)%w===0){const k=n*parts.length/w;st.mark=[...Array(k).keys()];}
  if(to==='build'&&(n*d)%w===0){st.build=Array(n*d/w).fill('u');}
  if(to==='card'){const c=Core.cardsFor(task).find(c=>Core.isEqualPartition(c.parts)&&Core.sum(c.selected.map(i=>c.parts[i]))*w===n*Core.sum(c.parts));st.card=c?c.id:null;}
 }
 function setView(v){if(v===st.view)return;const from=st.view;const prevMode=st.mode;st.view=v;
  if(v==='cards'){convert(prevMode,'card');st.mode='card';}else if(prevMode==='card'){const m=modes.includes('mark')?'mark':modes[0];convert('card',m);st.mode=m;}
  onEvent?.('view_changed',{fromMode:from,toMode:v});if(prevMode!==st.mode)onEvent?.('answer_mode_changed',{fromMode:prevMode,toMode:st.mode});note='';change('view');render();host.querySelector(`[data-view="${v}"]`)?.focus();}
 function setMode(m){if(m===st.mode)return;const from=st.mode;convert(from,m);st.mode=m;onEvent?.('answer_mode_changed',{fromMode:from,toMode:m});change('mode');render();host.querySelector(`[data-mode="${m}"]`)?.focus();}
 function togglePart(i){const s=new Set(st.mark);s.has(i)?s.delete(i):s.add(i);st.mark=[...s].sort((a,b)=>a-b);change('answer');render();}
 const pos=i=>Core.partPosition(task,i,lang());
 function selectedLine(){
  if(st.mode==='mark'){if(!st.mark.length)return t('selectedNone');const list=st.mark.map(i=>t('partL',{n:i+1})+(pos(i)?' '+pos(i):'')).join(', ');return t('selectedWhere',{list});}
  if(st.mode==='build'){if(!st.build.length)return t('empty');return t('inFigure',{list:st.build.map(x=>pieceName(x)).join(', ')});}
  if(!st.card)return t('cardsHelp');const i=Core.cardsFor(task).findIndex(c=>c.id===st.card);return t('cardChosen',{n:i+1});}
 const pieceName=id=>{const p=Core.piecesFor(task).find(x=>x.id===id);return t('pieceUnit',{d:p.size[1]});};
 const shapeName=()=>t(task.context||task.shape);

 function render(){
  if(dead)return;
  const viewTabs=`<div class="modes" role="group" aria-label="${esc(t('views'))}">`+[['3d',t('v3d'),'cube'],['2d',t('v2d'),'example'],...(modes.includes('card')?[['cards',t('cards'),'library']]:[])].map(([v,l,ic])=>`<button type="button" class="chip" data-view="${v}" aria-pressed="${st.view===v}">${icon(ic)}${esc(l)}</button>`).join('')+'</div>';
  const constructModes=modes.filter(m=>m!=='card');
  const modeTabs=st.view!=='cards'&&constructModes.length>1?`<div class="modes" role="group" aria-label="${esc(t('how'))}">`+constructModes.map(m=>`<button type="button" class="chip" data-mode="${m}" aria-pressed="${st.mode===m}">${esc(t(m))}</button>`).join('')+'</div>':'';
  let stage='';
  if(st.view==='cards')stage=cardsHtml();
  else if(st.mode==='build')stage=buildHtml();
  else stage=st.view==='3d'?`<div class="stage-3d" data-3d><p class="muted" role="status">${esc(t('load3d'))}</p></div>`:`<div class="fw-2d">${Fig.fraction(task,{selected:st.mark,interactive:true,size:340,highlight:st.highlight,label:t('scene',{shape:shapeName(),d:parts.length})})}</div>`;
  const partButtons=st.view!=='cards'&&st.mode==='mark'?`<div class="parts-list" role="group" aria-label="${esc(t('scene',{shape:shapeName(),d:parts.length}))}">`+parts.map((_,i)=>`<button type="button" class="part-btn" data-part="${i}" aria-pressed="${st.mark.includes(i)}">${esc(t('part',{n:i+1}))}${pos(i)?`<span class="muted">· ${esc(pos(i))}</span>`:''}</button>`).join('')+'</div>':'';
  const example=st.example?`<div class="card soft" style="padding:16px"><div class="row" style="gap:20px;flex-wrap:nowrap"><div style="flex:none">${Fig.fraction({shape:st.example.shape,context:st.example.shape==='rect'?'strip':'circle',parts:st.example.parts,selected:st.example.selected},{size:120,label:t('example')})}</div><div><b>${esc(t('example'))}</b><p class="muted" style="margin-top:6px">${esc(t('exampleText',{n:st.example.target[0],d:st.example.target[1],w:Core.fractionWords(st.example.target[0],st.example.target[1],lang())}))}</p></div></div></div>`:'';
  const count=st.view!=='cards'&&st.mode==='mark'?t('selected',{n:st.mark.length,d:parts.length}):st.mode==='build'?t('selected',{n:st.build.filter(x=>x==='u').length,d}):'';
  host.innerHTML=`<div class="stack">${count&&equal?`<p class="sub tnum" style="margin-top:-8px">${esc(count)}</p>`:''}${viewTabs}${modeTabs}<div class="stage">${stage}</div>${st.highlight&&st.view!=='cards'?`<p class="muted">${esc(t('equalParts'))}</p>`:''}${partButtons}${example}<p class="selected-line" aria-live="polite">${esc(note||selectedLine())}</p></div>`;
  if(st.view==='3d'&&st.mode==='mark')start3d();else stop3d();
 }
 function cardsHtml(){
  const cards=Core.cardsFor(task);
  return `<div class="cards-row" role="group" aria-label="${esc(t('cardsHelp'))}">`+cards.map((c,i)=>{const eq=Core.isEqualPartition(c.parts);const [n,w]=Core.reduce(Core.sum(c.selected.map(k=>c.parts[k])),Core.sum(c.parts));
   const lbl=eq&&task.cardLabels!==false?`${c.selected.length} / ${c.parts.length}`:'';
   return `<button type="button" class="pick-card" data-card="${esc(c.id)}" aria-pressed="${st.card===c.id}" aria-label="${esc(t('card',{n:i+1}))}${lbl?': '+esc(lbl):''}${eq?'':', '+esc(t('unequalCard'))}">${Fig.fraction({...c,context:task.context},{size:150})}<span class="lbl" aria-hidden="true">${esc(lbl||' ')}</span></button>`;void n;void w;}).join('')+'</div>';
 }
 function buildHtml(){
  const pieces=Core.piecesFor(task);const used=id=>st.build.filter(x=>x===id).length;
  return `<div class="stack" style="align-items:center;width:100%"><div class="fw-frame" data-drop>${Fig.buildFrame(task,st.build,{size:300,label:t('inFigure',{list:st.build.map(pieceName).join(', ')||'-'})})}</div>
  <div class="pieces" role="group" aria-label="${esc(t('pieces'))}">${pieces.map(p=>`<button type="button" class="piece" data-piece="${p.id}" draggable="true" aria-pressed="${st.pick===p.id}" ${used(p.id)>=p.count?'disabled':''}>${Fig.piece(p.size,task.shape)}${esc(t('pieceUnit',{d:p.size[1]}))} <span class="muted tnum">×${p.count-used(p.id)}</span></button>`).join('')}</div>
  <div class="row"><button type="button" class="btn small" data-place ${st.pick?'':'disabled'}>${icon('plus')}${esc(t('place'))}</button><button type="button" class="btn small" data-unplace ${st.build.length?'':'disabled'}>${icon('back')}${esc(t('remove'))}</button></div></div>`;
 }
 function place(id){const p=Core.piecesFor(task).find(x=>x.id===id);if(!p)return;if(st.build.filter(x=>x===id).length>=p.count){note=t('noPieces');render();return;}st.build=[...st.build,id];st.pick=null;note='';change('answer');render();host.querySelector('[data-place]')?.focus();}

 host.onclick=e=>{const b=e.target.closest('button,[data-part]');if(!b||dead)return;
  if(b.dataset.view)return setView(b.dataset.view);
  if(b.dataset.mode)return setMode(b.dataset.mode);
  if(b.dataset.part!==undefined){const i=Number(b.dataset.part);togglePart(i);host.querySelector(`button[data-part="${i}"]`)?.focus({preventScroll:true});return;}
  if(b.dataset.card){st.card=b.dataset.card;change('answer');render();host.querySelector(`[data-card="${b.dataset.card}"]`)?.focus();return;}
  if(b.dataset.piece){st.pick=st.pick===b.dataset.piece?null:b.dataset.piece;note=st.pick?t('pickedPiece',{p:pieceName(st.pick)}):'';render();host.querySelector(`[data-piece="${b.dataset.piece}"]`)?.focus();return;}
  if(b.hasAttribute('data-place')&&st.pick)return place(st.pick);
  if(b.hasAttribute('data-unplace')){st.build=st.build.slice(0,-1);change('answer');render();host.querySelector('[data-unplace]:not(:disabled)')?.focus();return;}
 };
 // Drag-and-drop is only an extra for mouse users; "select piece -> place" is the main way.
 host.ondragstart=e=>{const b=e.target.closest('[data-piece]');if(b)e.dataTransfer.setData('text/plain',b.dataset.piece);};
 host.ondragover=e=>{if(e.target.closest('[data-drop]'))e.preventDefault();};
 host.ondrop=e=>{const z=e.target.closest('[data-drop]');if(!z)return;e.preventDefault();place(e.dataTransfer.getData('text/plain'));};

 // ---------- 3D ----------
 async function start3d(){
  const box=host.querySelector('[data-3d]');if(!box)return;
  if(three){three.attach(box);three.sync();return;}
  const test=document.createElement('canvas');const ok=!!(test.getContext('webgl2')||test.getContext('webgl'));
  if(!ok||window.AYAN_FORCE_NO_WEBGL){fallback('no3d');return;}
  try{three=await scene3d(box,{task,decorative,motion,onPick:i=>togglePart(i),state:()=>st,label:t('scene',{shape:shapeName(),d:parts.length}),onLost:()=>fallback('lost3d')});
   if(dead||!host.querySelector('[data-3d]')){three?.destroy();three=null;return;}three.sync();}
  catch(err){three=null;fallback('no3d');}
 }
 function fallback(key){stop3d();const from=st.view;st.view='2d';note=t(key);onEvent?.('view_changed',{fromMode:from,toMode:'2d',reason:key==='lost3d'?'context_lost':'no_webgl'});change('view');render();}
 function stop3d(){if(three){three.destroy();three=null;}}
 render();
 return {answer,
  reset(){st.mark=[];st.build=[];st.card=null;st.pick=null;note='';change('answer');render();},
  setHint(level){st.highlight=level>=2;st.example=level>=3?Core.workedExample(task):null;render();},
  refresh:render,
  destroy(){dead=true;stop3d();host.onclick=null;host.ondragstart=host.ondragover=host.ondrop=null;host.innerHTML='';},
  get three(){return three;}};
}

// Procedural scene: exact wedges/strips from the task weights, a fixed camera, render only on change, full dispose.
async function scene3d(box,{task,decorative,onPick,state,label,onLost}){
 const THREE=await import('three');
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(32,1,.1,100);
 scene.add(new THREE.HemisphereLight(0xffffff,0xc9d8cf,2.1));const sun=new THREE.DirectionalLight(0xffffff,1.5);sun.position.set(-3,8,4);scene.add(sun);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const cv=renderer.domElement;cv.setAttribute('role','img');cv.setAttribute('aria-label',label);
 const parts=task.parts,W=parts.reduce((a,b)=>a+b,0),pizza=task.context==='pizza',chocolate=task.context==='chocolate';
 const disposables=[];const keep=o=>{disposables.push(o);return o;};
 const mat=c=>keep(new THREE.MeshStandardMaterial({color:c,roughness:.85,metalness:0}));
 const base={circle:pizza?'#F6DE9A':task.context==='cake'?'#FBE7D6':'#FBF4E2',rect:chocolate?'#9A6A47':task.context==='rect'?'#FFF8E8':'#FFFFFF'};
 const meshes=[],root=new THREE.Group();scene.add(root);
 const ex={depth:.22,bevelEnabled:true,bevelThickness:.035,bevelSize:.03,bevelSegments:2,curveSegments:28};
 if(task.shape==='circle'){
  const R=1.5;let a=0;
  parts.forEach((p,i)=>{const a1=a+p/W*Math.PI*2;const sh=new THREE.Shape();sh.moveTo(0,0);sh.absarc(0,0,R,Math.PI/2-a,Math.PI/2-a1,true);sh.lineTo(0,0);
   const g=keep(new THREE.ExtrudeGeometry(sh,ex));g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat(base.circle));const midA=(a+a1)/2;
   m.userData={i,dir:new THREE.Vector3(Math.sin(midA),0,-Math.cos(midA))};m.position.copy(m.userData.dir).multiplyScalar(.06);root.add(m);meshes.push(m);
   const edge=new THREE.LineSegments(keep(new THREE.EdgesGeometry(g,30)),keep(new THREE.LineBasicMaterial({color:'#1F5E57'})));edge.visible=false;m.add(edge);m.userData.edge=edge;
   const cut=new THREE.LineSegments(keep(new THREE.EdgesGeometry(g,30)),keep(new THREE.LineBasicMaterial({color:pizza?'#C9924A':'#8A6B3A'})));m.add(cut);m.userData.cut=cut;
   if(pizza&&decorative){const pep=new THREE.Mesh(keep(new THREE.CylinderGeometry(.16,.16,.04,20)),mat('#C8644C'));const pr=R*.55;pep.position.set(Math.sin(midA)*pr,.27,-Math.cos(midA)*pr);m.add(pep);}
   a=a1;});
  if(pizza){const crust=new THREE.Mesh(keep(new THREE.TorusGeometry(1.56,.12,12,80)),mat('#E2B06A'));crust.rotation.x=Math.PI/2;crust.position.y=.13;root.add(crust);}
  camera.position.set(0,3.4,3.6);camera.lookAt(0,0,.1);
 }else{
  const Wd=3.6,H=chocolate?1.4:1.05;let x=-Wd/2;
  parts.forEach((p,i)=>{const w=p/W*Wd;const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(w-.04,0);sh.lineTo(w-.04,H);sh.lineTo(0,H);sh.lineTo(0,0);
   const g=keep(new THREE.ExtrudeGeometry(sh,{...ex,curveSegments:4}));g.rotateX(-Math.PI/2);g.translate(0,0,H/2);const m=new THREE.Mesh(g,mat(base.rect));m.position.x=x+.02;m.userData={i,dir:new THREE.Vector3(0,0,0)};root.add(m);meshes.push(m);
   const edge=new THREE.LineSegments(keep(new THREE.EdgesGeometry(g,30)),keep(new THREE.LineBasicMaterial({color:'#1F5E57'})));edge.visible=false;m.add(edge);m.userData.edge=edge;const cut=new THREE.LineSegments(keep(new THREE.EdgesGeometry(g,30)),keep(new THREE.LineBasicMaterial({color:chocolate?'#6E4A30':'#879A96'})));m.add(cut);m.userData.cut=cut;x+=w;});
  camera.position.set(0,3.1,3.2);camera.lookAt(0,0,0);
 }
 const sel=new THREE.Color('#B8DCD2');let raf=0,host=box;
 const draw=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;renderer.render(scene,camera);});};
 function resize(){const r=host.getBoundingClientRect();const w=Math.max(220,r.width),h=Math.max(200,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
 function sync(){const s=state();for(const m of meshes){const on=s.mark.includes(m.userData.i);m.material.color.set(on?sel:base[task.shape]);m.userData.edge.visible=on;if(m.userData.cut)m.userData.cut.visible=!on;
   m.position.y=on?.08:0;}draw();}
 const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();
 const at=e=>{const r=cv.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ptr,camera);return ray.intersectObjects(meshes,false)[0];};
 const onDown=e=>{const hit=at(e);if(hit)onPick(hit.object.userData.i);};
 const onMove=e=>{cv.style.cursor=at(e)?'pointer':'default';};
 const onLostCtx=e=>{e.preventDefault();onLost?.();};
 cv.addEventListener('pointerdown',onDown);cv.addEventListener('pointermove',onMove);cv.addEventListener('webglcontextlost',onLostCtx);
 const ro=new ResizeObserver(resize);
 function attach(el){host=el;el.replaceChildren(cv);ro.disconnect();ro.observe(el);resize();}
 attach(box);
 return {sync,attach,renderer,camera,meshes,
  destroy(){cancelAnimationFrame(raf);ro.disconnect();cv.removeEventListener('pointerdown',onDown);cv.removeEventListener('pointermove',onMove);cv.removeEventListener('webglcontextlost',onLostCtx);
   for(const d of disposables)d.dispose?.();renderer.dispose();renderer.forceContextLoss?.();cv.remove();}};
}
