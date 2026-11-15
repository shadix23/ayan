// Rebuilds docs/KK-REVIEW-V2.md: every Kazakh string of the V2.1 workspaces next to its Russian pair, for a native-speaker check.
// Sources: makeT dictionaries ['ru','kk'], {ru:'',kk:''} objects in dist/v2/*, the six lessons and the core feedback.
// Usage: node scripts/kk-review-v2.cjs
const fs=require('fs');const rows=[];const seen=new Set();
const add=(where,ru,kk)=>{const k=ru+'\u0001'+kk;if(seen.has(k)||!ru||!kk)return;seen.add(k);rows.push([where,ru,kk]);};
const cell=s=>String(s).replace(/\|/g,'\\|').replace(/\n/g,' / ');
const un=s=>s.replace(/\\'/g,"'").replace(/\\n/g,'\n');
for(const f of ['child.mjs','adult.mjs','lesson.mjs','fraction-world.mjs','tasks.mjs','video.mjs','parent.mjs','demo.html','split.html']){
 const s=fs.readFileSync('dist/v2/'+f,'utf8');
 for(const m of s.matchAll(/(\w+):\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\]/g))add(f+': '+m[1],un(m[2]),un(m[3]));
 for(const m of s.matchAll(/\{ru:'((?:[^'\\]|\\.)*)',kk:'((?:[^'\\]|\\.)*)'\}/g))add(f,un(m[1]),un(m[2]));
 for(const m of s.matchAll(/lang\(\)==='kk'\?'((?:[^'\\]|\\.)*)':'((?:[^'\\]|\\.)*)'/g))add(f,un(m[2]),un(m[1]));
}
// EduPitch lesson-draft templates (ai-draft.mjs): T('ru','kk') pairs.
{const a=fs.readFileSync('ai-draft.mjs','utf8');for(const m of a.matchAll(/T\('((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\)/g))add('ai-draft.mjs',un(m[1]),un(m[2]));}
const {LESSONS}=require('../dist/v2/lessons.js');
const walk=(o,where)=>{if(!o||typeof o!=='object')return;if(typeof o.ru==='string'&&typeof o.kk==='string')add(where,o.ru,o.kk);
 if(Array.isArray(o.ru)&&Array.isArray(o.kk))o.ru.forEach((r,i)=>add(where,r,o.kk[i]));for(const [k,v] of Object.entries(o))if(typeof v==='object')walk(v,where);};
for(const l of LESSONS)walk(l,'Урок '+l.lessonId);
const C=require('../dist/v2/lesson-core.js');
for(const k of ['correct','tooFew','tooMany','area','wrongPiece','wrongCard','unequalCard','wrongChoice','wrongPair','incomplete','wrongOrder']){const f=C.feedback({kind:'choice'},{valid:true,correct:k==='correct',reason:k},'ru'),g=C.feedback({kind:'choice'},{valid:true,correct:k==='correct',reason:k},'kk');add('Обратная связь (lesson-core.js)',f,g);}
for(const [n,d] of [[1,2],[1,3],[1,4],[2,4],[3,4]])add('Дроби словами (lesson-core.js)',C.fractionWords(n,d,'ru'),C.fractionWords(n,d,'kk'));
const md='# Казахские строки V2.1 на проверку носителем языка\n\nСобирается командой `node scripts/kk-review-v2.cjs`. Кабинет ученика и учителя V2.1, маршрут урока, Fraction World, видео, шесть уроков (темы, цели, объяснения, задания, подсказки), обратная связь. Перевод сделан без носителя языка: проверьте естественность и школьную терминологию, особенно дроби (ширек, төрттен бір), биологию (жасуша, вакуоль) и информатику (алгоритм, шарт).\n\nКак отметить правку: исправьте текст в колонке «Каз» прямо в этом файле.\n\n| Где | Рус | Каз |\n|---|---|---|\n'+rows.map(r=>'| '+r.map(cell).join(' | ')+' |').join('\n')+'\n\nВсего строк: '+rows.length+'.\n';
fs.writeFileSync('docs/KK-REVIEW-V2.md',md);console.log(rows.length);
