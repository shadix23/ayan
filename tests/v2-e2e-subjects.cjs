// Главная ребёнка: блок «Менің пәндерім / Мои предметы» (8 предметов 5-6 класса из dist/v2/subjects.js).
// Готовый предмет с назначенным уроком ведёт к этому уроку, готовый без назначения и неготовый - неактивные карточки.
// Тропинка, «Сейчас» и «Дни со светом» остаются на месте. 375 px: две колонки, без горизонтальной прокрутки.
// Usage: AYAN_DEMO=1 AYAN_DB_FILE=.data/test-subjects.sqlite PORT=4314 node server.mjs
//        AYAN_TEST_URL=http://127.0.0.1:4314 PLAYWRIGHT_PATH=... node tests/v2-e2e-subjects.cjs
// Screenshots go to hackathon/shots/subjects/ (AYAN_SHOTS=0 to skip).
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path');
const B=process.env.AYAN_TEST_URL||'http://127.0.0.1:4314',SHOTS=process.env.AYAN_SHOTS!=='0',DIR='hackathon/shots/subjects';
if(SHOTS)fs.mkdirSync(DIR,{recursive:true});
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];
 async function ctx(opts={}){const c=await browser.newContext({viewport:{width:1440,height:900},...opts});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
 async function api(page,p,body){return page.evaluate(async([p,b])=>{const r=await fetch(p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});let d=null;try{d=await r.json();}catch{}return {status:r.status,data:d};},[p,body]);}
 async function child(page,lang){await page.goto(B+'/demo');await api(page,'/api/demo/login',{as:'student-01'});
  await page.evaluate(l=>{try{localStorage.setItem('ayan.v2.demoLang',l);}catch{}},lang);await page.goto(B+'/child#/home');
  // First visit of student 01: the comfort choice comes first (standard view).
  await page.waitForSelector('[data-pick],[data-subjects]',{timeout:8000});if(await page.$('[data-pick="standard"]'))await page.click('[data-pick="standard"]');
  await page.waitForSelector('[data-subjects]',{timeout:8000});await wait(300);}
 const shot=async(page,name)=>{if(SHOTS)await page.screenshot({path:path.join(DIR,name),fullPage:true});};
 try{
  {const p=await (await ctx()).newPage();await p.goto(B+'/demo');await api(p,'/api/demo/reset',{});await p.close();}
  const c=await ctx();const p=await c.newPage();await child(p,'ru');
  const info=await p.evaluate(()=>{const sec=document.querySelector('[data-subjects]');const cards=[...sec.querySelectorAll('[data-subject]')];
   return {n:cards.length,h:sec.querySelector('h2')?.textContent.trim(),ids:cards.map(x=>x.dataset.subject),
    state:Object.fromEntries(cards.map(x=>[x.dataset.subject,x.dataset.state])),
    links:Object.fromEntries(cards.map(x=>[x.dataset.subject,x.tagName==='A'?x.getAttribute('href'):null])),
    disabled:cards.filter(x=>x.tagName!=='A').every(x=>x.getAttribute('aria-disabled')==='true'),
    imgs:cards.every(x=>{const i=x.querySelector('img');return i&&i.complete&&i.naturalWidth>0&&i.getAttribute('alt')==='';}),
    path:!!document.querySelector('.path-card .path'),now:!!document.querySelector('.now-card'),days:!!document.querySelector('.days-card')};});
  check('SUBJ-01 главная: блок «Мои предметы», 8 карточек в порядке каталога',info.n===8&&/Мои предметы/.test(info.h)&&info.ids.join()==='math,kazakh-lang,kazakh-lit,russian,english,natural-science,kz-history,informatics',JSON.stringify({n:info.n,h:info.h}));
  check('SUBJ-02 тропинка, «Сейчас» и «Дни со светом» на месте',info.path&&info.now&&info.days);
  check('SUBJ-03 математика и естествознание (уроки назначены) - ссылки на урок своего назначения',info.state.math==='open'&&/^#\/lesson\?a=/.test(info.links.math||'')&&info.state['natural-science']==='open'&&/^#\/lesson\?a=/.test(info.links['natural-science']||''),JSON.stringify(info.links));
  check('SUBJ-04 информатика: уроки есть, но не назначены - неактивна, «Откроет учитель»',info.state.informatics==='teacher'&&info.links.informatics===null&&/Откроет учитель/.test(await p.textContent('[data-subject="informatics"]')));
  check('SUBJ-05 пять неготовых предметов - «Скоро», не ссылки, aria-disabled',['kazakh-lang','kazakh-lit','russian','english','kz-history'].every(id=>info.state[id]==='soon'&&info.links[id]===null)&&info.disabled&&/Скоро/.test(await p.textContent('[data-subject="english"]')));
  check('SUBJ-06 иконки загружены и декоративные (alt="")',info.imgs);
  const cols=await p.evaluate(()=>getComputedStyle(document.querySelector('.subj-grid')).gridTemplateColumns.split(' ').length);
  check('SUBJ-07 1440 px: сетка 4 колонки (2 ряда)',cols===4,String(cols));
  await shot(p,'child-home-1440.png');
  // Переход: математика открывает урок «Равные доли» (его назначение), а не просто текущий урок.
  const want=await p.evaluate(()=>document.querySelector('[data-subject="math"]').getAttribute('href').split('a=')[1]);
  await p.click('[data-subject="math"]');await p.waitForSelector('#lesson-host',{timeout:8000});await wait(800);
  const opened=await p.evaluate(()=>({focus:document.documentElement.classList.contains('is-focus'),text:document.querySelector('#lesson-host')?.textContent||''}));
  check('SUBJ-08 клик по математике открывает урок в фокус-режиме',opened.focus&&/дол/i.test(opened.text),want);
  // Естествознание ведёт к уроку «Органы растения» (завершён вчера), а не к текущему уроку дробей.
  await p.goto(B+'/child#/home');await p.waitForSelector('[data-subjects]');
  await p.click('[data-subject="natural-science"]');await p.waitForSelector('#lesson-host',{timeout:8000});await wait(800);
  check('SUBJ-09 клик по естествознанию открывает урок «Органы растения»',/растени/i.test(await p.textContent('#lesson-host')));
  // Клавиатура: неактивные карточки не в порядке Tab, ссылки в нём.
  await p.goto(B+'/child#/home');await p.waitForSelector('[data-subjects]');
  const tabbable=await p.evaluate(()=>[...document.querySelectorAll('[data-subject]')].filter(x=>x.tabIndex>=0).map(x=>x.dataset.subject));
  check('SUBJ-10 в порядке Tab только открытые предметы',tabbable.join()==='math,natural-science',tabbable.join());
  await c.close();
  // Казахский: заголовок и названия на казахском.
  const ck=await ctx();const k=await ck.newPage();await child(k,'kk');
  const kk=await k.evaluate(()=>({h:document.querySelector('[data-subjects] h2').textContent,names:[...document.querySelectorAll('[data-subject] .subj-name')].map(x=>x.textContent)}));
  check('SUBJ-11 казахский: «Менің пәндерім», «Жаратылыстану», «Жақында»',/Менің пәндерім/.test(kk.h)&&kk.names.includes('Жаратылыстану')&&kk.names.includes('Қазақстан тарихы')&&/Жақында/.test(await k.textContent('[data-subject="kz-history"]')),JSON.stringify(kk));
  await ck.close();
  // 375 px: две колонки, без горизонтальной прокрутки.
  const cm=await ctx({viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true});const m=await cm.newPage();await child(m,'kk');
  const mob=await m.evaluate(()=>({cols:getComputedStyle(document.querySelector('.subj-grid')).gridTemplateColumns.split(' ').length,over:document.documentElement.scrollWidth>window.innerWidth+1,
   clip:[...document.querySelectorAll('[data-subject]')].some(x=>x.scrollWidth>x.clientWidth+1)}));
  check('SUBJ-12 375 px: две колонки, нет горизонтальной прокрутки, текст не вылезает',mob.cols===2&&!mob.over&&!mob.clip,JSON.stringify(mob));
  await m.evaluate(()=>document.querySelector('[data-subjects]').scrollIntoView());await shot(m,'child-home-375.png');
  await cm.close();
  check('SUBJ-13 нет ошибок JS на страницах',errors.length===0,errors.join(' | '));
 }catch(e){check('SUBJ-XX сценарий не дошёл до конца',false,e.message);}
 await browser.close();
 const fail=results.filter(r=>!r[1]).length;console.log(`\n${results.length-fail}/${results.length} passed`);process.exit(fail?1:0);
})();
