// Rebuilds docs/KK-REVIEW.md: every Kazakh string of the product next to its Russian pair, for a native-speaker check.
// Usage: node scripts/kk-review.cjs
const fs=require('fs');const rows=[];const add=(where,ru,kk)=>rows.push([where,ru,kk]);
const cell=s=>String(s).replace(/\|/g,'\\|').replace(/\n/g,' / ').replace(/<br>/g,' / ');
const pairs=(file,label,kkFirst=true)=>{const s=fs.readFileSync(file,'utf8');for(const m of s.matchAll(/(\w+):\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\]/g))add(label+': '+m[1],(kkFirst?m[3]:m[2]).replace(/\\n/g,'\n'),(kkFirst?m[2]:m[3]).replace(/\\n/g,'\n'));return s;};
const p=pairs('dist/product.js','Кабинет и урок (product.js)');
const kkPrompt=p.match(/lang\(\)==='kk'\?'([^']+)'/);if(kkPrompt)add('Запрос к ИИ из панели учителя','Разбей тему на 3-5 простых шагов...',kkPrompt[1]);
const v=pairs('dist/video-library.js','Видео (video-library.js)');
for(const m of v.matchAll(/\['(\w+)','([^']+)','([^']+)'\]/g))add('Видео, фильтр ('+m[1]+')',m[2],m[3]);
pairs('dist/games/fraction-game.mjs','Игра «Собери долю» (интерфейс)');
const F=require('../dist/games/fractions.js');
for(const t of F.TASKS){add('Игра M01 '+t.id+': задание',t.prompt[1],t.prompt[0]);add('Игра M01 '+t.id+': подсказка',t.hint[1],t.hint[0]);}
for(const [k,x] of Object.entries(F.FEEDBACK))add('Игра M01: обратная связь ('+k+')',x[1],x[0]);
const e=fs.readFileSync('dist/experience.js','utf8');
for(const m of e.matchAll(/\['(day|games|video)','([^']+)','([^']+)'\]/g))add('Экран ребёнка: вкладка',m[2],m[3]);
for(const k of ['Настройки','Разделы','Сегодня','Один понятный шаг за раз. Можно не спешить.','Загружаем урок…','Ещё','Видео со светлячком']){const m=e.match(new RegExp("tx\\('"+k.replace(/[.…]/g,'\\$&')+"','([^']+)'\\)"));if(m)add('Экран ребёнка (experience.js)',k,m[1]);}
const T=require('../dist/lesson-templates.js');
for(const t of T.all){add('Шаблон '+t.id+': тема',t.title[1],t.title[0]);t.steps.forEach((s,i)=>add('Шаблон '+t.id+': шаг '+(i+1),s[1],s[0]));if(t.question[1])add('Шаблон '+t.id+': вопрос',t.question[1],t.question[0]);}
const sc=JSON.parse(fs.readFileSync('video/lessons/m01/script.json','utf8'));
for(const l of sc.lines)for(const s of l.sentences)add('Видео M01: субтитры (реплика '+l.id+')',s.ru,s.kk);
for(const f of ['parent.js','login.js']){const s=fs.readFileSync('dist/'+f,'utf8');for(const m of s.matchAll(/t\('((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\)/g))add(f,m[2],m[1]);for(const m of s.matchAll(/(\w+):\['([^']*)','([^']*)'\]/g))add(f+' (игра '+m[1]+')',m[3],m[2]);}
for(const f of ['parent.html','login.html','privacy.html']){const s=fs.readFileSync('dist/'+f,'utf8');for(const m of s.matchAll(/data-kk="([^"]*)"[^>]*>([^<]*(?:<br>[^<]*)?)</g))add(f,m[2],m[1]);for(const m of s.matchAll(/data-kk-alt="([^"]*)"/g))add(f+' (alt)','Аян машет рукой',m[1]);const t=s.match(/name="title-kk" content="([^"]*)"/);if(t)add(f+' (title)',s.match(/<title>([^<]*)/)[1],t[1]);}
const pv=fs.readFileSync('dist/privacy.html','utf8');const ru=pv.split('data-lang="ru"')[1].split('</main>')[0],kk=pv.split('data-lang="kk"')[1].split('</main>')[0];
const parts=h=>[...h.matchAll(/<(h1|h2|p|li)[^>]*>([\s\S]*?)<\/\1>/g)].map(m=>m[2].replace(/<[^>]+>/g,''));const R=parts(ru),K=parts(kk);R.forEach((r,i)=>add('privacy.html',r,K[i]||'?'));
add('experience.js (шапка)','← О платформе','← Платформа туралы');add('experience.js (шапка)','Выйти','Шығу');
add('parent.js (месяцы)','января ... декабря','қаңтар, ақпан, наурыз, сәуір, мамыр, маусым, шілде, тамыз, қыркүйек, қазан, қараша, желтоқсан');
add('answer-check.js (числа словами)','ноль ... двадцать','нөл, бір, екі, үш, төрт, бес, алты, жеті, сегіз, тоғыз, он, он бір ... он тоғыз, жиырма');
const md='# Казахские строки на проверку носителем языка\n\nСобирается командой `node scripts/kk-review.cjs`. Интерфейс кабинета, урок ребёнка, «Мой день», игра «Собери долю», видео и субтитры M01, настройки, отчёт родителю, вход, страница о данных, шаблоны уроков. Перевод сделан без носителя языка: проверьте естественность и терминологию (особенно математические термины).\n\nКак отметить правку: исправьте текст в колонке «Каз» прямо в этом файле, разработчик перенесёт его в код.\n\n| Где | Рус | Каз |\n|---|---|---|\n'+rows.map(r=>'| '+r.map(cell).join(' | ')+' |').join('\n')+'\n\nВсего строк: '+rows.length+'.\n';
fs.writeFileSync('docs/KK-REVIEW.md',md);console.log(rows.length);
