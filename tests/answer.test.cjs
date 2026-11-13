const test=require('node:test'),assert=require('node:assert');
const A=require('../dist/answer-check.js');

test('digits, spacing, case and trailing dot are accepted for "5"',()=>{
 for(const r of ['5',' 5 ','пять','Пять.','ПЯТЬ!','бес','Бес'])assert.equal(A.matches(r,'5'),true,r);
});
test('wrong answers stay wrong',()=>{
 for(const r of ['6','шесть','алты','','  ','55'])assert.equal(A.matches(r,'5'),false,r);
});
test('teacher number word matches digit and the other way',()=>{
 assert.equal(A.matches('5','пять'),true);
 assert.equal(A.matches('он бес','15'),true);
 assert.equal(A.matches('жиырма','20'),true);
 assert.equal(A.matches('двадцать','20'),true);
});
test('several correct answers separated by semicolon',()=>{
 assert.equal(A.matches('квадрат','круг; квадрат'),true);
 assert.equal(A.matches('треугольник','круг; квадрат'),false);
});
test('ё equals е and inner spaces around signs are ignored',()=>{
 assert.equal(A.matches('Ёлка','елка'),true);
 assert.equal(A.matches('2 + 3 = 5','2+3=5'),true);
});
test('decimal comma equals dot',()=>{assert.equal(A.matches('2,5','2.5'),true);});
