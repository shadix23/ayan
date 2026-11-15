// Outside the demo a teacher adds a student only with the parents' (legal guardians') consent: the "Добавить ученика" dialog
// has a required checkbox with a link to /legal/parental-consent, sends consent {confirmed, basis}, and shows a 400 next to it.
// Needs a NON-demo local server with its own database:
//   AYAN_DB_FILE=.data/test-consent.sqlite PORT=4342 node server.mjs
//   AYAN_CONSENT_URL=http://127.0.0.1:4342 PLAYWRIGHT_PATH=... node tests/v2-e2e-consent.cjs
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const B=process.env.AYAN_CONSENT_URL||'http://127.0.0.1:4342';
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
 try{
  const c=await browser.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(B+'/');const s=Date.now();
  const su=await p.evaluate(async s=>{const r=await fetch('/api/account/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`consent${s}@t.test`,password:'consent-pass-123',name:'Teacher C',role:'teacher',consent:{terms:true,privacy:true}})});return r.status;},s);
  await p.evaluate(()=>localStorage.setItem('ayan.v2.lang','ru'));
  await p.goto(B+'/teacher#/students');await p.waitForSelector('[data-add]',{timeout:15000});await p.click('[data-add]');await p.waitForSelector('dialog #nm');
  const d=await p.evaluate(()=>{const cb=document.querySelector('dialog input[type=checkbox][name=consent]');const a=document.querySelector('dialog a[href="/legal/parental-consent"]');return {cb:!!cb,required:!!cb?.required,label:cb?.closest('label')?.textContent?.trim()||'',link:!!a};});
  check('CONSENT-01 the add-student dialog has a required consent checkbox with a link to /legal/parental-consent',su===200&&d.cb&&d.required&&d.link&&/согласие родителей/i.test(d.label),JSON.stringify({su,...d}));
  // a 400 from the server is shown next to the field (simulated: the request goes out without the box)
  await p.route('**/api/children',r=>r.request().method()==='POST'?r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'child_consent_required',error:'Подтвердите согласие на обработку данных ребёнка'})}):r.continue());
  await p.fill('dialog #nm','Ученик К');await p.check('dialog input[name=consent]');await p.click('dialog form button.primary');
  const err=await p.waitForSelector('dialog [data-consent-err]:not(:empty)',{timeout:4000}).then(e=>e.textContent()).catch(()=>'');
  check('CONSENT-02 a 400 child_consent_required is shown next to the checkbox, the dialog stays open',/согласие/i.test(err)&&await p.locator('dialog').count()===1,err);
  await p.unroute('**/api/children');
  let sent=null;p.on('request',r=>{if(r.url().endsWith('/api/children')&&r.method()==='POST')sent=JSON.parse(r.postData()||'{}');});
  await p.click('dialog form button.primary');
  const added=await p.waitForSelector('.rows li:has-text("Ученик К")',{timeout:6000}).then(()=>true).catch(()=>false);
  check('CONSENT-03 with the box checked the student is created and consent {confirmed:true, basis:"guardian_consent"} is sent',added&&sent?.consent?.confirmed===true&&sent.consent.basis==='guardian_consent',JSON.stringify(sent));
  check('no page errors',errors.length===0,errors.slice(0,3).join(' | '));
 }catch(e){console.error(e);results.push(['crash',false]);}
 await browser.close();const failed=results.filter(r=>!r[1]);console.log(JSON.stringify({checks:results.length,failed:failed.length}));process.exit(failed.length?1:0);
})();
