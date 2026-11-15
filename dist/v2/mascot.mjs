// Mascot Аян: one character everywhere. Seven states; the GLB plays them with an AnimationMixer, a static PNG of the
// SAME character is used when motion is reduced/minimal, WebGL is missing, or the GLB fails. Hidden = nothing rendered,
// help text stays where it is. The mascot never decides correctness; callers pass the state the evaluator implies.
export const STATES=['Idle','Greeting','Explaining','Thinking','Encouraging','Celebrating','Helping'];
// Clip names inside the GLB and stills per state. Updated when the Blender model changes (assets-src/firefly_build.py).
export const CONFIG={
 glb:'/assets/mascot/firefly.glb',
 stills:Object.fromEntries(STATES.map(s=>[s,`/assets/mascot/stills/${s}.png`])),
 loop:new Set(['Idle','Explaining','Thinking','Helping']),
 camera:{fov:30,pos:[0,1.32,6.3],look:[0,1.2,0]}
};
const instances=new Set();
export function mount(host,{state='Idle',motion=true,visible=true,label=''}={}){
 let dead=false,three=null,cur=state,still=!motion||matchMedia('(prefers-reduced-motion: reduce)').matches||window.AYAN_FORCE_NO_WEBGL;
 host.classList.add('mascot-box');host.setAttribute('aria-hidden','true');
 function showStill(s){host.innerHTML=`<img src="${CONFIG.stills[s]||CONFIG.stills.Idle}" alt="" draggable="false" loading="lazy" onerror="this.onerror=null;this.src='${CONFIG.stills.Idle}'">`;}
 async function start(){
  if(!visible){host.innerHTML='';host.hidden=true;return;}host.hidden=false;
  if(still){showStill(cur);return;}
  try{three=await scene(host,cur);if(dead){three.destroy();three=null;}}catch(e){three=null;showStill(cur);}
 }
 start();
 const api={get state(){return cur;},
  set(s){if(!STATES.includes(s))return;cur=s;if(!visible)return;if(three)three.play(s);else if(still)showStill(s);},
  update(o){const v=o.visible??visible,m=o.motion??!still;const restart=v!==visible||(!m)!==still;visible=v;still=!m||matchMedia('(prefers-reduced-motion: reduce)').matches;if(restart){three?.destroy();three=null;start();}},
  destroy(){dead=true;instances.delete(api);three?.destroy();three=null;host.innerHTML='';}};
 instances.add(api);return api;
}
export function destroyAll(){for(const i of [...instances])i.destroy();}

async function scene(host,initial){
 const THREE=await import('three');const {GLTFLoader}=await import('/vendor/GLTFLoader.js');
 const gltf=await new Promise((res,rej)=>{const tm=setTimeout(()=>rej(Error('timeout')),12000);new GLTFLoader().load(CONFIG.glb,g=>{clearTimeout(tm);res(g);},undefined,e=>{clearTimeout(tm);rej(e);});});
 const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(CONFIG.camera.fov,1,.05,50);cam.position.set(...CONFIG.camera.pos);cam.lookAt(...CONFIG.camera.look);
 sc.add(new THREE.HemisphereLight(0xffffff,0xd9e4dc,2.3));const key=new THREE.DirectionalLight(0xffffff,1.6);key.position.set(-2.5,4,4);sc.add(key);const rim=new THREE.DirectionalLight(0xffffff,.7);rim.position.set(3,2,-3);sc.add(rim);
 const r=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});r.setPixelRatio(Math.min(devicePixelRatio||1,1.5));r.outputColorSpace=THREE.SRGBColorSpace;r.domElement.setAttribute('aria-hidden','true');
 sc.add(gltf.scene);const mixer=new THREE.AnimationMixer(gltf.scene);const actions={};
 for(const c of gltf.animations){const a=mixer.clipAction(c);if(!CONFIG.loop.has(c.name)){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}actions[c.name]=a;}
 let current=null,raf=0,last=performance.now(),visibleOnScreen=true;
 function play(name){const next=actions[name]||actions.Idle;if(!next)return;if(next===current&&CONFIG.loop.has(name))return;next.reset();next.enabled=true;next.setEffectiveWeight(1);next.play();if(current&&current!==next)current.crossFadeTo(next,.25,false);current=next;tick();}
 mixer.addEventListener('finished',e=>{if(!CONFIG.loop.has(e.action.getClip().name))play('Idle');});
 function frame(t){raf=0;const dt=Math.min(.05,(t-last)/1000);last=t;mixer.update(dt);r.render(sc,cam);if(visibleOnScreen&&!document.hidden)raf=requestAnimationFrame(frame);}
 function tick(){if(!raf){last=performance.now();raf=requestAnimationFrame(frame);}}
 const resize=()=>{const w=host.clientWidth||200,h=host.clientHeight||200;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();tick();};
 host.replaceChildren(r.domElement);const ro=new ResizeObserver(resize);ro.observe(host);resize();
 const io=new IntersectionObserver(([e])=>{visibleOnScreen=e.isIntersecting;if(visibleOnScreen)tick();});io.observe(host);
 const vis=()=>{if(!document.hidden)tick();};document.addEventListener('visibilitychange',vis);
 play(initial);
 return {play,destroy(){cancelAnimationFrame(raf);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',vis);mixer.stopAllAction();
  gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material)){for(const k in m)if(m[k]?.isTexture)m[k].dispose();m.dispose();}}});r.dispose();r.forceContextLoss?.();r.domElement.remove();}};
}
