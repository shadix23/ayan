const test=require('node:test'),assert=require('node:assert');
const F=require('../dist/games/fractions.js');

test('equal disk is exactly four 90 degree sectors; counterexample sums to 360 and is not equal',()=>{
 assert.deepEqual(F.EQUAL,[90,90,90,90]);
 assert.equal(F.UNEQUAL.reduce((a,b)=>a+b,0),360);
 assert.ok(new Set(F.UNEQUAL).size>1);
});
test('task 1: exactly one sector, any of the four',()=>{
 for(const s of ['0','1','2','3'])assert.equal(F.evaluate('m01-t1',s).correct,true,s);
 assert.equal(F.evaluate('m01-t1','0,1').correct,false);
 assert.equal(F.evaluate('m01-t1','0,1').reason,'needOne');
});
test('task 2: any two sectors are 2/4, order does not matter',()=>{
 for(const s of ['0,1','1,0','0,2','3,1'])assert.equal(F.evaluate('m01-t2',s).correct,true,s);
 assert.equal(F.evaluate('m01-t2','2').correct,false);
 assert.equal(F.evaluate('m01-t2','0,1,2').correct,false);
});
test('task 3: only the equal division shows quarters',()=>{
 assert.equal(F.evaluate('m01-t3','equal').correct,true);
 assert.equal(F.evaluate('m01-t3','unequal').correct,false);
 assert.equal(F.evaluate('m01-t3','unequal').reason,'unequal');
});
test('malformed answers are invalid, not wrong (empty, duplicates, out of range, unknown task)',()=>{
 for(const [t,a] of [['m01-t1',''],['m01-t1','0,0'],['m01-t1','4'],['m01-t1','x'],['m01-t3','maybe'],['nope','0']])assert.equal(F.evaluate(t,a).valid,false,t+':'+a);
});
test('normalize gives one canonical form, so "1,0" and "0,1" are the same submission content',()=>{
 assert.equal(F.normalize('m01-t2','1,0'),'0,1');assert.equal(F.normalize('m01-t2',' 0 , 1 '),'0,1');assert.equal(F.normalize('m01-t1','0,0'),null);
});
