// Аян "Огоньки": pure rules shared by the server (light days), the child page (motion level, path) and the tests.
// Works as a browser global (window.AyanLights) and as a CommonJS module. No DOM here.
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.AyanLights=m;})(typeof self!=='undefined'?self:this,function(){
 // Volume of motion, like volume of sound. "off" = Тихо, "soft" = Мягко, "full" = Живо. One choreography, three amplitudes.
 function motionLevel(p){p=p||{};
  if(p.reducedMotion||p.preset==='calm'||p.decorative===false||p.motionIntensity==='low')return 'off';
  if(p.motionIntensity==='soft')return 'soft';
  return 'full';}
 // Ceilings for any child screen (brief-creative.md). Every effect in motion.mjs and mascot2d.mjs reads these numbers.
 // celebrateArmDeg: the one owner-approved exception (15.11.2026) to maxShift - in "Живо" only, the 2D mascot raises both arms
 // by 70 degrees in Celebrating (the hand tip travels about 45 px at 240 px). Every other part of the mascot stays within maxShift.
 const LIMITS=Object.freeze({maxShift:24,minScale:0.94,maxScale:1.06,maxParticles:14,maxSpeedPxS:120,flyMs:600,sheetMs:220,softMs:160,celebrateMs:2400,gatherStepMs:250,breatheMs:4000,maxRunMs:5000,celebrateArmDeg:70});
 // "Дни со светом": 7 local days ending today. A day is lit when the child did something in a lesson that day.
 // Nothing burns out: a missed day is just false. tzMinutes is the offset east of UTC (Kazakhstan: +300).
 const DAY=86400000;
 function dayIndex(ms,tzMinutes){return Math.floor((ms+tzMinutes*60000)/DAY);}
 function lightDays(times,now,tzMinutes){const today=dayIndex(now,tzMinutes||0);const out=[false,false,false,false,false,false,false];
  for(const t of times||[]){const d=today-dayIndex(Number(t),tzMinutes||0);if(d>=0&&d<7)out[6-d]=true;}return out;}
 // The lesson path on the child's home: done, now (first unfinished) and next stops, at most 5, the current one always inside.
 function pathStops(queue){const q=(queue||[]).map(x=>({...x}));const cur=q.findIndex(x=>x.state!=='completed');
  q.forEach((x,i)=>{x.stop=x.state==='completed'?'done':i===cur?'now':'next';});
  if(q.length<=5)return q;const at=cur<0?q.length-1:cur;let start=Math.max(0,Math.min(at-2,q.length-5));return q.slice(start,start+5);}
 function lessonsLeft(queue){return (queue||[]).filter(x=>x.state!=='completed').length;}
 return {motionLevel,LIMITS,lightDays,pathStops,lessonsLeft,DAY};
});
