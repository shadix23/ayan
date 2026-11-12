(function(root){
 'use strict';
 const BASE='assets/ayan/';
 const EVENT_CLIP={'session:start':'Wave','instruction:show':'Explain','hint:show':'Point','answer:retry':'Encourage','answer:correct':'Wave','session:complete':'Celebrate','session:pause':'Rest','session:resume':'Idle',wait:'Think'};
 let modulePromise;
 function create(host,opts={}){
   let dead=false,actor=null,current='Idle',loading=false;
   host.classList.add('ayan-stage');
   const img=new Image();img.src=BASE+'stills/Idle.png';img.alt='';img.setAttribute('aria-hidden','true');img.className='ayan-fallback';host.appendChild(img);
   img.onerror=()=>{img.style.visibility='hidden';};
   const reduced=matchMedia('(prefers-reduced-motion: reduce)');
   function start(){if(dead||actor||loading||opts.motion===false||reduced.matches)return;loading=true;
     modulePromise ||= import('./mascot3d.mjs');
     modulePromise.then(m=>m.mount(host,{...opts,clip:current})).then(a=>{loading=false;if(dead||opts.motion===false||reduced.matches){a.destroy();host.classList.remove('has-3d');}else actor=a;}).catch(error=>{console.warn('Ayan 3D fallback:',error);loading=false;host.classList.add('static-fallback');});
   }
   function play(clip){current=clip;actor?.play(clip);const available=['Idle','Wave','Explain','Point','Think','Celebrate','Encourage','Rest'];img.src=BASE+'stills/'+(available.includes(clip)?clip:'Celebrate')+'.png';}
   function change(){if(reduced.matches||opts.motion===false){actor?.destroy();actor=null;host.classList.remove('has-3d');}else start();}
   reduced.addEventListener('change',change);start();
   return {play,onEvent(ev){if(EVENT_CLIP[ev])play(EVENT_CLIP[ev]);},setMotion(on){opts.motion=on;change();},destroy(){dead=true;actor?.destroy();reduced.removeEventListener('change',change);img.remove();host.classList.remove('has-3d');}};
 }
 root.AyanMascot={create,EVENT_CLIP,CLIPS:['Idle','Wave','Explain','Point','Think','Celebrate','Encourage','Rest','Spin','Fly'],still:clip=>BASE+'stills/'+(clip||'Idle')+'.png'};
})(window);
