import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
export async function mount(host, options = {}) {
  let dead=false, frame=0, mode='Idle', started=performance.now(), last=started, elapsed=0;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(33,1,.1,100);
  camera.position.set(0,3.5,13.5); camera.lookAt(0,3.3,0);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
  renderer.domElement.setAttribute('aria-hidden','true'); renderer.domElement.className='ayan-canvas';
  scene.add(new THREE.HemisphereLight(0xffffff,0xa7b69b,3));
  for(const [x,y,z,power] of [[-5,8,7,3],[5,5,3,2],[0,7,-5,2]]) {const l=new THREE.DirectionalLight(0xffffff,power);l.position.set(x,y,z);scene.add(l);}
  const holder=new THREE.Group();scene.add(holder);
  let model,parts={},base=new Map();
  const loading=new GLTFLoader().loadAsync('assets/ayan/ayan.glb');
  const resize=()=>{const w=host.clientWidth||300,h=host.clientHeight||360;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  function play(next){mode=next;started=performance.now();}
  function draw(now){
    if(dead)return;frame=requestAnimationFrame(draw);
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(document.hidden||!host.getClientRects().length||!model)return;
    const still=options.motion===false||reduce.matches;if(!still)elapsed+=dt;
    const t=still?0:elapsed,u=still?0:Math.min((now-started)/2300,1),e=Math.sin(Math.PI*u)**2;
    for(const [o,v] of base){o.position.copy(v.p);o.rotation.copy(v.r);o.scale.copy(v.s);}
    const head=parts.Ayan_Head_Control,right=parts.Ayan_Right_Arm_Control,left=parts.Ayan_Left_Arm_Control;
    holder.position.set(0,still?0:.10*Math.sin(t*1.8),0);holder.rotation.set(0,0,0);
    holder.rotation.y=['Spin','Celebrate'].includes(mode)?Math.PI*2*(u*u*(3-2*u)):.08*Math.sin(t*.6);
    if(mode==='Fly'){holder.position.x=1.05*Math.sin(2*Math.PI*u);holder.position.y+=.42*(1-Math.cos(2*Math.PI*u));holder.rotation.z=-.12*Math.cos(2*Math.PI*u)*e;}
    if(mode==='Wave'&&right)right.rotation.z-=e*(.8+.25*Math.sin(u*22));
    if(mode==='Celebrate'){holder.position.y+=.5*e;if(right)right.rotation.z-=1.2*e;if(left)left.rotation.z+=1.3*e;}
    if(mode==='Think'){if(head)head.rotation.z+=.20;if(right)right.rotation.z-=.9;}
    if(mode==='Encourage'&&head){head.rotation.x+=.18*Math.sin(u*12)*e;head.rotation.z-=.12*e;}
    if(mode==='Explain'&&right)right.rotation.z+=.25*Math.sin(t*3);
    if(mode==='Point'&&right)right.rotation.z+=.45*e;
    if(parts.Ayan_Expression_Control){if(mode==='Celebrate')parts.Ayan_Expression_Control.scale.x*=1+.18*e;if(mode==='Explain')parts.Ayan_Expression_Control.scale.y*=1+.25*Math.sin(t*3);}
    for(const [name,sign] of [['Ayan_Left_Wing_Control',1],['Ayan_Right_Wing_Control',-1]])if(parts[name])parts[name].rotation.y+=still?0:sign*.22*Math.sin(t*6);
    for(const side of ['L','R']){const eye=parts['Ayan_Blink_'+side];if(eye)eye.scale.y*=mode==='Rest'?.09:still?1:1-.94*Math.exp(-Math.pow((t%4-3.3)/.075,2));}
    if(u>=1&&!['Idle','Explain','Think','Rest'].includes(mode))mode='Idle';renderer.render(scene,camera);
  }
  function destroy(){dead=true;cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();if(model)model.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material))m.dispose();});}
  try {const gltf=await loading;if(dead){destroy();return {play,destroy};}model=gltf.scene;holder.add(model);
    // The GLB stores rest transforms on animation channels; initialize them before procedural poses.
    const mixer=new THREE.AnimationMixer(model);
    const idle=gltf.animations.find(a=>a.name==='Idle');
    if(idle){mixer.clipAction(idle).play();mixer.update(.001);}
    model.traverse(o=>{parts[o.name.replaceAll(' ','_')]=o;base.set(o,{p:o.position.clone(),r:o.rotation.clone(),s:o.scale.clone()});if(o.isMesh)for(const m of [].concat(o.material)){m.transmission=0;m.roughness=Math.max(m.roughness||0,.45);}});
    host.appendChild(renderer.domElement);host.classList.add('has-3d');play(options.clip||'Wave');frame=requestAnimationFrame(draw);
  }catch(error){destroy();throw error;}return {play,destroy,setMotion(on){options.motion=on;}};
}
