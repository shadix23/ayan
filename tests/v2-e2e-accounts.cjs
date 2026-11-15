// Accounts, pricing, checkout, account, legal, support and the cookie banner in a real browser against a LOCAL server (not demo).
// Usage: PORT=4316 BETTER_AUTH_URL=http://pages.localhost:4316 AYAN_DB_FILE=.data/test-pages.sqlite node server.mjs
//        AYAN_TEST_URL=http://pages.localhost:4316 PLAYWRIGHT_PATH=... node tests/v2-e2e-accounts.cjs
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const B=process.env.AYAN_TEST_URL||'http://pages.localhost:4316';
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
 async function ctx(opts={},consent=true){const c=await browser.newContext({viewport:{width:1440,height:900},...opts});
  if(consent)await c.addInitScript(()=>{try{localStorage.setItem('ayan.cookies',JSON.stringify({v:1,necessary:true,analytics:false,at:'x'}));localStorage.setItem('ayan.page.lang','ru');}catch(e){}});
  c.on('page',p=>p.on('pageerror',e=>errors.push(p.url()+' '+e.message)));return c;}
 const api=(p,u,body,method)=>p.evaluate(async([u,body,method])=>{const r=await fetch(u,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json().catch(()=>null)};},[u,body,method]);
 const email='e2e'+Date.now()+'@example.com',pass='Ayan-e2e-2026';
 try{
  // signup validation
  {const c=await ctx();const p=await c.newPage();await p.goto(B+'/signup');await p.click('#submit');
   const inv=await p.$$eval('[aria-invalid=true]',els=>els.map(e=>e.id));const desc=await p.$eval('#email',e=>{const id=e.getAttribute('aria-describedby')||'';return id.split(' ').map(x=>document.getElementById(x)?.textContent||'').join(' ');});
   check('ACC-01 empty signup marks role, name, email, password, terms with messages next to the field (aria-describedby)',['role','name','email','password','terms'].every(x=>inv.includes(x))&&/почт/i.test(desc),inv.join(','));
   await p.check('input[value=parent]',{force:true});await p.fill('#name','Айгерим');await p.fill('#email',email.replace('e2e','par'));await p.fill('#password',pass);await p.check('#terms',{force:true});await p.click('#submit');
   check('ACC-02 a parent cannot sign up without consent for the child data',await p.$eval('#childData',e=>e.getAttribute('aria-invalid')==='true')&&p.url().includes('/signup'));
   await c.close();}
  // signup -> onboarding
  const c=await ctx();const p=await c.newPage();
  await p.goto(B+'/signup');await p.check('input[value=teacher]',{force:true});await p.fill('#name','Анна Серикова');await p.fill('#email',email);await p.fill('#password',pass);await p.check('#terms',{force:true});await p.click('#submit');
  await p.waitForURL('**/onboarding**');check('ACC-03 teacher signup goes to onboarding',true);
  await p.waitForSelector('#q-set');const steps=[['3-4'],['math','kazakh'],['kk'],['several'],['inclusion']];
  for(const vals of steps){for(const v of vals)await p.check(`input[value="${v}"]`,{force:true});await p.click('#next');}
  await p.waitForSelector('#done-acts');const ob=await api(p,'/api/account/onboarding');
  check('ACC-04 five onboarding answers are saved (grade, subjects, lessonLang, needs, goal)',ob.data.done&&ob.data.answers.grade==='3-4'&&ob.data.answers.subjects.length===2&&ob.data.answers.goal==='inclusion',JSON.stringify(ob.data.answers));
  // pricing
  await p.goto(B+'/pricing');await p.waitForSelector('.plan h2');const n=await p.locator('.plan').count();const m1=await p.locator('.plan').nth(2).locator('.price b').textContent();
  await p.click('[data-period=year]');const y1=await p.locator('.plan').nth(2).locator('.price b').textContent();
  check('ACC-05 pricing: 4 plans, VAT note, month/year switch changes the price',n===4&&/НДС/.test(await p.textContent('#vat-text'))&&m1!==y1,m1+' / '+y1);
  // checkout
  await p.goto(B+'/checkout?plan=max&period=month');await p.waitForSelector('#go1');
  const cardInputs=await p.$$eval('input',els=>els.filter(e=>/card|cvv|cvc|pan|expiry/i.test(e.name+e.id+e.autocomplete)).length);
  await p.click('#go1');await p.waitForSelector('#go2');const invText=await p.textContent('.invoice');
  await p.click('#go2');const agreeErr=await p.$eval('#agree',e=>e.getAttribute('aria-invalid')==='true');
  await p.check('#agree',{force:true});await p.click('#go2');await p.waitForSelector('#done-title');
  check('ACC-06 checkout: no card fields, invoice with VAT line, consent required, payment confirmed',cardInputs===0&&/НДС 16%/.test(invText)&&agreeErr);
  // account
  await p.goto(B+'/account');await p.waitForSelector('#acc-name');const accText=await p.textContent('#acc');
  check('ACC-07 account shows plan Макс active, next payment and one paid receipt',/Макс/.test(accText)&&/Активна/.test(accText)&&await p.locator('.history tbody tr').count()===1);
  await p.click('#cancel-sub');await p.click('#dlg button.danger');await p.waitForSelector('#resume-sub');const canceling=/Отменяется/.test(await p.textContent('#acc'));
  await p.click('#resume-sub');await p.waitForSelector('#cancel-sub');
  check('ACC-08 cancel subscription keeps access until period end, resume brings it back',canceling);
  check('ACC-09 refund request button is shown within 14 days',await p.locator('#refund').count()===1);
  // logout and login
  await p.click('#logout');await p.waitForURL(B+'/');await p.goto(B+'/login');await p.fill('#email',email);await p.fill('#password','wrong-password');await p.click('#submit');
  await p.waitForFunction(()=>document.querySelector('#error').textContent.length>0);const wrong=await p.textContent('#error');
  await p.fill('#password',pass);await p.click('#submit');await p.waitForURL(/\/teacher/);
  check('ACC-10 login: wrong password shows a calm error, right password opens the cabinet',/Проверьте почту и пароль/.test(wrong));
  // support
  await p.goto(B+'/support#write');await p.fill('#s-msg','Тестовое сообщение из e2e');await p.click('#s-go');await p.waitForFunction(()=>document.querySelector('#s-res').textContent.length>0);
  check('ACC-11 support form saves a ticket',/№ tk_/.test(await p.textContent('#s-res')));
  await c.close();
  // legal and cookie banner
  {const c2=await ctx({},false);const q=await c2.newPage();let ok=true;
   for(const k of ['terms','privacy','cookies','parental-consent','refunds']){const r=await q.goto(B+'/legal/'+k);ok=ok&&r.status()===200&&await q.locator('[data-lang=ru] h1').isVisible();}
   await q.goto(B+'/legal/privacy?lang=kk');ok=ok&&await q.locator('[data-lang=kk] h1').isVisible();
   check('ACC-12 five legal pages open in Russian and Kazakh',ok);
   const banner=await q.locator('.cc').isVisible();await Promise.all([q.waitForResponse(r=>r.url().includes('/api/consent/cookies')),q.click('.cc [data-cc=min]')]);const ck=(await c2.cookies()).find(x=>x.name==='ayan_consent');
   check('ACC-13 cookie banner on first visit, "Только необходимые" hides it and stores ayan_consent=necessary',banner&&!(await q.locator('.cc').count())&&ck&&/necessary/.test(ck.value));
   await q.reload();check('ACC-14 the banner does not come back after a choice',!(await q.locator('.cc').count()));await c2.close();}
  // 375 px
  {const c3=await ctx({viewport:{width:375,height:812},isMobile:true,hasTouch:true});const q=await c3.newPage();const bad=[];
   for(const u of ['/signup','/login','/pricing','/support','/legal/terms','/legal/privacy']){await q.goto(B+u);await q.waitForTimeout(200);if(await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth))bad.push(u);}
   check('ACC-15 no horizontal scroll at 375 px',!bad.length,bad.join(','));await c3.close();}
  check('ACC-16 no page errors',!errors.length,errors.slice(0,3).join(' | '));
 }catch(e){console.error(e);check('ACC-XX run',false,e.message);}
 await browser.close();const failed=results.filter(r=>!r[1]).length;console.log(`\n${results.length-failed}/${results.length} passed`);process.exit(failed?1:0);
})();
