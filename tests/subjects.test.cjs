// Каталог 8 предметов 5-6 класса (dist/v2/subjects.js): структура, тексты, источники, иконки и связи с уроками.
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('fs');const path=require('path');
const S=require('../dist/v2/subjects.js');
const {LESSONS}=require('../dist/v2/lessons.js');

const strings=o=>{const out=[];const walk=v=>{if(typeof v==='string')out.push(v);else if(v&&typeof v==='object')Object.values(v).forEach(walk);};walk(o);return out;};

test('ровно 8 предметов, уникальные id и порядок 1..8',()=>{
 assert.equal(S.SUBJECTS.length,8);
 assert.equal(new Set(S.SUBJECTS.map(s=>s.id)).size,8);
 assert.deepEqual(S.SUBJECTS.map(s=>s.order).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);
 for(const s of S.SUBJECTS)assert.match(s.id,/^[a-z-]{2,24}$/);
});
test('в 5-6 классе естествознание одним предметом, без отдельных биологии и географии',()=>{
 const ru=S.SUBJECTS.map(s=>s.name.ru);
 assert.ok(ru.includes('Естествознание'));
 for(const no of ['Биология','География','Физика','Химия','Алгебра','Геометрия'])assert.ok(!ru.includes(no),no);
});
test('у каждого предмета название и краткое описание на казахском и русском',()=>{
 for(const s of S.SUBJECTS){for(const k of ['name','short']){assert.ok(s[k].kk&&s[k].kk.trim(),s.id+' '+k+' kk');assert.ok(s[k].ru&&s[k].ru.trim(),s.id+' '+k+' ru');}}
});
test('часы в неделю совпадают с типовым планом (казахский язык обучения, 5 и 6 класс)',()=>{
 const want={math:5,'kazakh-lang':3,'kazakh-lit':2,russian:3,english:3,'natural-science':2,'kz-history':2,informatics:1};
 for(const s of S.SUBJECTS){assert.equal(s.hoursPerWeek[5],want[s.id],s.id);assert.equal(s.hoursPerWeek[6],want[s.id],s.id);}
});
test('3-5 тем 5-6 класса у каждого предмета, с разделом программы и обоими языками',()=>{
 for(const s of S.SUBJECTS){
  assert.ok(s.topics.length>=3&&s.topics.length<=5,s.id+' topics '+s.topics.length);
  assert.ok(s.topics.some(t=>t.grade===5),s.id+' нет темы 5 класса');
  for(const t of s.topics){assert.ok([5,6].includes(t.grade),s.id);assert.ok(t.title.kk.trim()&&t.title.ru.trim(),s.id);assert.ok(t.section&&t.section.trim(),s.id);assert.equal(typeof t.kkVerified,'boolean');}
 }
});
test('источник у каждого предмета: номер приложения к приказу № 399 и ссылки на adilet',()=>{
 assert.match(S.PLAN.url,/^https:\/\/adilet\.zan\.kz\//);assert.match(S.PROGRAMS.url,/^https:\/\/adilet\.zan\.kz\//);
 assert.match(S.PLAN.act,/№ 500/);assert.match(S.PROGRAMS.act,/№ 399/);
 for(const s of S.SUBJECTS){assert.ok(Number.isInteger(s.source.appendix)&&s.source.appendix>0,s.id);assert.ok(s.source.program.kk&&s.source.program.ru,s.id);}
 assert.equal(new Set(S.SUBJECTS.map(s=>s.source.appendix)).size,8);
});
test('никто не выдаёт текст за утверждённый: нет слов «утверждено» и «одобрено МП» в видимых строках',()=>{
 for(const s of S.SUBJECTS)for(const v of strings({name:s.name,short:s.short,topics:s.topics}))assert.doesNotMatch(v,/утвержден|одобрен|бекітілген/i,s.id+': '+v);
});
test('в видимых текстах нет длинного и среднего тире и «·» (правило проекта)',()=>{
 for(const v of strings(S))assert.doesNotMatch(v,/[—–·]/,v);
});
test('иконки существуют в dist и помечены как временные',()=>{
 for(const s of S.SUBJECTS){assert.match(s.icon,/^\/assets\/subjects\/[a-z-]+\.webp$/);assert.ok(fs.existsSync(path.join(__dirname,'..','dist',s.icon)),s.icon);assert.equal(s.iconStatus,'temp');}
});
test('статус: available только там, где уже есть уроки в lessons.js; ссылки на уроки существуют',()=>{
 const ids=new Set(LESSONS.map(l=>l.lessonId));
 for(const s of S.SUBJECTS){
  assert.ok(['available','soon'].includes(s.status),s.id);
  for(const l of s.lessons)assert.ok(ids.has(l),s.id+' -> '+l);
  assert.equal(s.status==='available',s.lessons.length>0,s.id);
 }
 // каждый урок каталога lessons.js относится не больше чем к одному предмету
 for(const l of LESSONS)assert.ok(S.SUBJECTS.filter(s=>s.lessons.includes(l.lessonId)).length<=1,l.lessonId);
});
test('помощники: byId, forLesson, label',()=>{
 assert.equal(S.byId('math').name.kk,'Математика');assert.equal(S.byId('nope'),null);
 assert.equal(S.forLesson('bio-plants-01').id,'natural-science');assert.equal(S.forLesson('x'),null);
 assert.equal(S.label(S.byId('kz-history'),'kk'),'Қазақстан тарихы');assert.equal(S.label(S.byId('kz-history'),'ru'),'История Казахстана');
});
