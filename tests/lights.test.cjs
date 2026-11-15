// Pure rules of the "Огоньки" layer (dist/v2/lights.js): motion levels, "Дни со светом", the lesson path and the motion ceilings.
const test=require('node:test');const assert=require('node:assert/strict');
const L=require('../dist/v2/lights.js');

test('motion level: calm preset, decorative off, "минимум" and system reduced motion all mean off',()=>{
 assert.equal(L.motionLevel({preset:'calm'}),'off');
 assert.equal(L.motionLevel({preset:'standard',decorative:false}),'off');
 assert.equal(L.motionLevel({preset:'standard',motionIntensity:'low'}),'off');
 assert.equal(L.motionLevel({preset:'standard',motionIntensity:'normal',reducedMotion:true}),'off');
});
test('motion level: "Мягко" is soft, the default standard profile is full',()=>{
 assert.equal(L.motionLevel({preset:'standard',motionIntensity:'soft'}),'soft');
 assert.equal(L.motionLevel({preset:'standard',motionIntensity:'normal',decorative:true}),'full');
 assert.equal(L.motionLevel({}),'full');
});
test('days with light: last 7 local days, today is the last one, a missed day is simply false',()=>{
 const day=86400000,tz=300;// Kazakhstan, UTC+5
 const now=Date.UTC(2026,10,15,9,0);// 14:00 local
 const days=L.lightDays([now-1*day,now-1*day+3600000,now-4*day,now-20*day],now,tz);
 assert.deepEqual(days,[false,false,true,false,false,true,false]);
 assert.equal(L.lightDays([now],now,tz)[6],true);
});
test('days with light: the local day boundary follows the time zone, not UTC',()=>{
 const tz=300;const now=Date.UTC(2026,10,15,20,0);// 01:00 local on 16 Nov
 const lateYesterdayUtc=Date.UTC(2026,10,15,18,30);// 23:30 local on 15 Nov
 const d=L.lightDays([lateYesterdayUtc],now,tz);assert.equal(d[6],false);assert.equal(d[5],true);
});
test('lesson path: done, current and next stops in queue order, current is the first unfinished',()=>{
 const p=L.pathStops([{assignmentId:'a',state:'completed'},{assignmentId:'b',state:'in_progress'},{assignmentId:'c',state:'not_started'}]);
 assert.deepEqual(p.map(s=>s.stop),['done','now','next']);
 assert.deepEqual(L.pathStops([{assignmentId:'a',state:'completed'}]).map(s=>s.stop),['done']);
});
test('lesson path: never more than 5 stops, the window keeps the current stop visible',()=>{
 const q=Array.from({length:9},(_,i)=>({assignmentId:'x'+i,state:i<6?'completed':'not_started'}));
 const p=L.pathStops(q);assert.equal(p.length,5);assert.ok(p.some(s=>s.stop==='now'));assert.equal(p.find(s=>s.stop==='now').assignmentId,'x6');
});
test('lantern: lessons left until the big lantern is full',()=>{
 assert.equal(L.lessonsLeft([{state:'completed'},{state:'in_progress'},{state:'not_started'}]),2);
 assert.equal(L.lessonsLeft([{state:'completed'}]),0);
});
test('motion ceilings from the brief are fixed in one place',()=>{
 assert.equal(L.LIMITS.maxParticles,14);assert.equal(L.LIMITS.maxShift,24);assert.ok(L.LIMITS.minScale>=0.94&&L.LIMITS.maxScale<=1.06);
 assert.ok(L.LIMITS.flyMs<=600&&L.LIMITS.celebrateMs<=2400);
});
