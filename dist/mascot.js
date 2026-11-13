(function(root){
 'use strict';
 const BASE='assets/ayan/';
 // One event always gives the same clip (predictable for the child screen). Clip list: assets/ayan/manifest.json.
 const EVENT_CLIP={'session:start':'Wave','instruction:show':'Explain','hint:show':'PointRight','hint:left':'PointLeft','hint:right':'PointRight','answer:retry':'Encourage','answer:correct':'Nod','session:complete':'Celebrate','session:pause':'Rest','session:resume':'Idle',wait:'Listen','dont-know':'Think','garden:plant':'Plant',fly:'Fly'};
 const CLIPS=['Idle','Listen','Rest','Wave','PointLeft','PointRight','Explain','Think','Encourage','Nod','Celebrate','Plant','TakeOff','FlyLoop','Land','Spin','Jump','Greet','Assistant'];
 const STILL_ALIAS={Point:'PointRight',Fly:'FlyLoop'};
 const still=clip=>{const c=STILL_ALIAS[clip]||clip||'Idle';return BASE+'stills/'+(CLIPS.includes(c)?c:'Idle')+'.png';};
 let modulePromise;
 function create(host,opts={}){
   let dead=false,actor=null,current=opts.clip||'Idle',loading=false;
   host.classList.add('ayan-stage');
   const img=new Image();img.src=still(current);img.alt='';img.setAttribute('aria-hidden','true');img.className='ayan-fallback';host.appendChild(img);
   img.onerror=()=>{img.style.visibility='hidden';};
   const reduced=matchMedia('(prefers-reduced-motion: reduce)');
   function start(){if(dead||actor||loading||opts.motion===false||reduced.matches)return;loading=true;
     modulePromise ||= import('./mascot3d.mjs');
     modulePromise.then(m=>m.mount(host,{...opts,clip:current})).then(a=>{loading=false;if(dead||opts.motion===false||reduced.matches){a.destroy();host.classList.remove('has-3d');}else actor=a;}).catch(error=>{console.warn('Ayan 3D fallback:',error);loading=false;host.classList.add('static-fallback');});
   }
   function play(clip){current=clip;actor?.play(clip);img.src=still(clip);}
   function change(){if(reduced.matches||opts.motion===false){actor?.destroy();actor=null;host.classList.remove('has-3d');}else start();}
   reduced.addEventListener('change',change);start();
   return {play,onEvent(ev){if(EVENT_CLIP[ev])play(EVENT_CLIP[ev]);},setMotion(on){opts.motion=on;change();},destroy(){dead=true;actor?.destroy();reduced.removeEventListener('change',change);img.remove();host.classList.remove('has-3d');}};
 }
 root.AyanMascot={create,EVENT_CLIP,CLIPS,still};
})(window);
