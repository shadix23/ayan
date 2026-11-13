import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';

// Clips are baked in Blender (assets-src/ayan.blend, assets-src/ayan_clips.py).
// Looping clips become the resting state; one-shot clips play once and fade back to it.
const LOOP=new Set(['Idle','Listen','Rest','Explain','FlyLoop','Assistant']);
const ALIAS={Point:'PointRight',Fly:'Fly'};
const FADE=.3;

export async function mount(host, options = {}) {
  let dead=false, frame=0, last=performance.now(), elapsed=0;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(33,1,.1,100);
  camera.position.set(0,3.5,13.5); camera.lookAt(0,3.3,0);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1;
  renderer.domElement.setAttribute('aria-hidden','true'); renderer.domElement.className='ayan-canvas';
  scene.add(new THREE.HemisphereLight(0xffffff,0xb9c7a8,2.4));
  for(const [x,y,z,power] of [[-5,8,7,2.6],[5,5,3,1.4],[0,7,-5,1.6]]) {const l=new THREE.DirectionalLight(0xffffff,power);l.position.set(x,y,z);scene.add(l);}
  const holder=new THREE.Group();scene.add(holder);
  let model,mixer,actions={},current=null,base='Idle',glow=null,glowBase=0,fly=null,celebrateAt=-9;
  const loading=new GLTFLoader().loadAsync('assets/ayan/ayan.glb');
  const resize=()=>{const w=host.clientWidth||300,h=host.clientHeight||360;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const still=()=>options.motion===false||reduce.matches;

  function fadeTo(name){
    const next=actions[name];if(!next||next===current&&LOOP.has(name))return;
    next.reset();next.enabled=true;next.setEffectiveWeight(1);next.play();
    if(current&&current!==next)current.crossFadeTo(next,FADE,false);
    current=next;
  }
  function play(clip){
    const name=ALIAS[clip]||clip;
    if(name==='Fly'){fly={start:elapsed};fadeTo('TakeOff');return;}
    if(!actions[name])return;
    fly=null;
    if(LOOP.has(name))base=name;
    if(name==='Celebrate')celebrateAt=elapsed;
    fadeTo(name);
  }
  function onFinished(e){
    const name=e.action.getClip().name;
    if(fly){if(name==='TakeOff'){fadeTo('FlyLoop');return;}if(name==='Land'){fly=null;fadeTo(base);return;}}
    if(e.action===current)fadeTo(base);
  }
  function draw(now){
    if(dead)return;frame=requestAnimationFrame(draw);
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(document.hidden||!host.getClientRects().length||!model)return;
    if(!still()){elapsed+=dt;mixer.update(dt);}
    // Flight path: TakeOff 0.6 s, FlyLoop 1.2 s, Land 0.6 s, one smooth arc.
    holder.position.set(0,0,0);holder.rotation.set(0,0,0);
    if(fly){const u=Math.min((elapsed-fly.start)/2.4,1);
      holder.position.x=1.05*Math.sin(2*Math.PI*u);holder.position.y=.42*(1-Math.cos(2*Math.PI*u));
      if(u>=.75&&current===actions.FlyLoop)fadeTo('Land');}
    if(glow){const rest=base==='Rest',period=rest?5:3.5,amp=rest?.15:.25;
      const lift=Math.max(0,1-Math.abs(elapsed-celebrateAt-1.1)/.6);
      glow.emissiveIntensity=glowBase*(rest?.6:1)*(1+amp*Math.sin(2*Math.PI*elapsed/period))+glowBase*1.2*lift;}
    renderer.render(scene,camera);
  }
  function destroy(){dead=true;cancelAnimationFrame(frame);observer.disconnect();mixer?.stopAllAction();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();if(model)model.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material))m.dispose();});}
  try {
    const gltf=await loading;if(dead){destroy();return {play,destroy};}
    model=gltf.scene;holder.add(model);
    model.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material)){
      if(m.name.includes('glow belly')){glow=m;glowBase=m.emissiveIntensity||1;}
      if(m.transparent){m.depthWrite=false;}
    }});
    mixer=new THREE.AnimationMixer(model);
    for(const clip of gltf.animations){const a=mixer.clipAction(clip);
      if(!LOOP.has(clip.name)){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}
      actions[clip.name]=a;}
    mixer.addEventListener('finished',onFinished);
    fadeTo('Idle');mixer.update(0);
    host.appendChild(renderer.domElement);host.classList.add('has-3d');
    play(options.clip||'Wave');
    frame=requestAnimationFrame(draw);
  }catch(error){destroy();throw error;}
  return {play,destroy,setMotion(on){options.motion=on;}};
}
