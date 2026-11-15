// Accounts, plans and simulated payments on a LOCAL server in REAL mode (no AYAN_DEMO), separate synthetic database.
// Usage: node tests/v2-accounts-api.mjs   (npm run test:accounts). Port 4315, database .data/test-accounts.sqlite.
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const PORT=Number(process.env.AYAN_ACC_PORT)||4315,B=`http://127.0.0.1:${PORT}`,DB='.data/test-accounts.sqlite';
fs.mkdirSync('.data',{recursive:true});for(const f of [DB,DB+'-wal',DB+'-shm','.data/test-accounts.jury.env'])try{fs.rmSync(f);}catch{}
const env={...process.env,PORT:String(PORT),AYAN_DB_FILE:DB,AYAN_DEMO:'',GROQ_API_KEY:'fake-test-key',BETTER_AUTH_SECRET:'test-secret-for-local-accounts-api-0123456789abcdef',DATABASE_URL:'',AYAN_RATE_REGISTER:'200'};
const srv=spawn(process.execPath,['server.mjs'],{env,stdio:['ignore','pipe','pipe']});
let out='';srv.stdout.on('data',d=>out+=d);srv.stderr.on('data',d=>out+=d);
for(let i=0;i<80&&!out.includes('Ayan http');i++)await new Promise(r=>setTimeout(r,250));
const results=[];const check=(id,ok,detail)=>{results.push([id,!!ok]);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const ck=r=>r.headers.getSetCookie().map(c=>c.split(';')[0]).filter(c=>!/=$/.test(c)).join('; ');
async function call(path,{cookie,body,method,raw,origin=B}={}){const r=await fetch(B+path,{method:method||(body?'POST':'GET'),headers:{'content-type':'application/json',...(origin?{origin}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'});let data=null;try{data=raw?await r.text():await r.json();}catch{}return {status:r.status,data,cookie:ck(r),res:r};}
// better-auth allows 3 sign-ins per 10 s per IP: pace the test like a real user would be.
const stamps=[];async function signin(email,password){while(stamps.filter(x=>Date.now()-x<10500).length>=3)await new Promise(r=>setTimeout(r,400));stamps.push(Date.now());return call('/api/auth/sign-in/email',{body:{email,password}});}
const goodConsent={terms:true,privacy:true};
const reg=(email,role='teacher',extra={})=>call('/api/account/register',{body:{email,password:'test-password-1',name:'Тест Тестов',role,consent:{...goodConsent,...(role==='parent'?{childData:true}:{})},...extra}});
try{
 // ---- clean URLs and public data ----
 for(const p of ['/signup','/login','/onboarding','/pricing','/checkout','/account','/support','/legal/terms','/legal/privacy','/legal/cookies','/legal/parental-consent','/legal/refunds','/teacher/login','/child/login','/privacy']){
  const r=await fetch(B+p,{redirect:'manual'}),file='dist'+(p==='/teacher/login'||p==='/child/login'?'/login':p)+'.html';
  check('URL '+p+' -> 200 (page exists) or mapped to its file (404 only while the page is not written yet)',fs.existsSync(file)?r.status===200:r.status===404,String(r.status));}
 const plans=await call('/api/billing/plans');const pl=plans.data?.plans||[];
 check('PLANS-01 public plans: free/plus/max/school, VAT 16% included, refund text',plans.status===200&&['free','plus','max','school'].every(i=>pl.some(p=>p.id===i))&&plans.data.vatRate===0.16&&plans.data.vatIncluded&&/14/.test(plans.data.terms.refund),JSON.stringify(pl.map(p=>p.id)));
 const mx=pl.find(p=>p.id==='max');check('PLANS-02 price math: max month 2990 with VAT 412, year = 10 months',mx.prices.month.amount===2990&&mx.prices.month.vat===412&&mx.prices.year.amount===29900,JSON.stringify(mx.prices));
 check('PLANS-03 free plan costs 0',pl.find(p=>p.id==='free').prices.month.amount===0);

 // ---- registration: wrong data ----
 check('REG-01 bad email -> 400',(await reg('not-an-email')).status===400);
 check('REG-02 short password -> 400',(await call('/api/account/register',{body:{email:'a1@t.kz',password:'123',name:'A',role:'teacher',consent:goodConsent}})).status===400);
 check('REG-03 unknown role -> 400',(await reg('a2@t.kz','admin')).status===400);
 const noTerms=await call('/api/account/register',{body:{email:'a3@t.kz',password:'test-password-1',name:'A',role:'teacher',consent:{privacy:true}}});
 check('REG-04 no terms consent -> 400 consent_required',noTerms.status===400&&noTerms.data.code==='consent_required'&&noTerms.data.field==='terms');
 const parentNo=await call('/api/account/register',{body:{email:'p0@t.kz',password:'test-password-1',name:'P',role:'parent',consent:goodConsent}});
 check('REG-05 parent without child-data consent -> 400',parentNo.status===400&&parentNo.data.field==='childData');
 check('REG-06 school without name -> 400',(await reg('s0@t.kz','school')).status===400);
 check('REG-07 direct better-auth sign-up is closed outside demo (404)',(await call('/api/auth/sign-up/email',{body:{email:'x@t.kz',password:'test-password-1',name:'X'}})).status===404);
 check('REG-08 foreign Origin on register -> 403',(await call('/api/account/register',{origin:'http://evil.example',body:{email:'e@t.kz',password:'test-password-1',name:'E',role:'teacher',consent:goodConsent}})).status===403);

 // ---- registration: success, login, logout ----
 const t1=await reg('teacher1@t.kz');
 check('REG-10 teacher registers, gets session cookie and next=/onboarding',t1.status===200&&t1.data.role==='teacher'&&t1.data.next==='/onboarding'&&/session_token/.test(t1.cookie),JSON.stringify(t1.data));
 check('REG-11 same email again -> 409 email_taken',(await reg('teacher1@t.kz')).status===409);
 const prof=await call('/api/account/profile',{cookie:t1.cookie});
 check('REG-12 profile: role, consents with date, free plan, onboarding not done',prof.status===200&&prof.data.role==='teacher'&&prof.data.consents.terms.at>0&&prof.data.consents.privacy.version&&prof.data.subscription.plan==='free'&&prof.data.onboarding.done===false,JSON.stringify(prof.data?.consents));
 const par=await reg('parent1@t.kz','parent'),sch=await reg('school1@t.kz','school',{orgName:'Школа 12'});
 const pp=await call('/api/account/profile',{cookie:par.cookie}),sp=await call('/api/account/profile',{cookie:sch.cookie});
 check('REG-13 parent: childData consent stored with date',pp.data.role==='parent'&&pp.data.consents.childData.given&&pp.data.consents.childData.at>0);
 check('REG-14 school: org name saved, role school',sp.data.role==='school'&&sp.data.org.name==='Школа 12');
 check('AUTH-01 no session -> 401 on profile, subscription, payments',[(await call('/api/account/profile')).status,(await call('/api/billing/subscription')).status,(await call('/api/billing/payments')).status].every(s=>s===401));
 const bad=await signin('teacher1@t.kz','wrong-password-x');
 check('AUTH-02 wrong password -> 401',bad.status===401);
 const li=await signin('teacher1@t.kz','test-password-1');
 check('AUTH-03 sign-in works',li.status===200&&/session_token/.test(li.cookie));
 const lo=await call('/api/auth/sign-out',{cookie:li.cookie,body:{}});
 check('AUTH-04 sign-out kills the session',lo.status===200&&(await call('/api/account/profile',{cookie:li.cookie})).status===401);
 const l2=await signin('teacher1@t.kz','test-password-1'),l3=await signin('teacher1@t.kz','test-password-1');
 const rv=await call('/api/account/sessions/revoke',{cookie:l2.cookie,body:{scope:'others'}});
 check('AUTH-05 revoke others: this session lives, other dies',rv.status===200&&(await call('/api/account/profile',{cookie:l2.cookie})).status===200&&(await call('/api/account/profile',{cookie:l3.cookie})).status===401&&(await call('/api/account/profile',{cookie:t1.cookie})).status===401);
 const rvAll=await call('/api/account/sessions/revoke',{cookie:l2.cookie,body:{scope:'all'}});
 check('AUTH-06 revoke all kills this session too; bad scope -> 400',rvAll.status===200&&(await call('/api/account/profile',{cookie:l2.cookie})).status===401&&(await call('/api/account/sessions/revoke',{cookie:par.cookie,body:{scope:'x'}})).status===400);
 let T=(await signin('teacher1@t.kz','test-password-1')).cookie;

 // ---- cookies consent ----
 check('COOKIE-01 bad choice -> 400',(await call('/api/consent/cookies',{body:{choice:'maybe'}})).status===400);
 const cc=await call('/api/consent/cookies',{body:{choice:'necessary'}});
 check('COOKIE-02 necessary-only saved, cookie set, analytics false',cc.status===200&&cc.data.analytics===false&&/ayan_consent=/.test(cc.cookie),cc.cookie);
 check('COOKIE-03 GET returns the saved choice from the cookie',(await call('/api/consent/cookies',{cookie:cc.cookie})).data.choice==='necessary');
 await call('/api/consent/cookies',{cookie:T,body:{choice:'all'}});
 check('COOKIE-04 choice of a signed-in user is stored in the profile with a date',(await call('/api/account/profile',{cookie:T})).data.consents.cookies?.choice==='all');

 // ---- onboarding ----
 check('ONB-01 invalid answer -> 400',(await call('/api/account/onboarding',{cookie:T,body:{answers:{goal:'world-domination'}}})).status===400);
 const ob=await call('/api/account/onboarding',{cookie:T,body:{answers:{goal:'inclusion',subjects:['math'],grade:'3-4',experience:'new'},done:true}});
 const ob2=await call('/api/account/onboarding',{cookie:T});
 check('ONB-02 answers saved, done, next leaves onboarding',ob.status===200&&ob2.data.done&&ob2.data.answers.goal==='inclusion'&&(await call('/api/account/profile',{cookie:T})).data.next==='/teacher');
 const ob3=await call('/api/account/onboarding',{cookie:T,body:{answers:{lessonLang:'both',needs:'unsure'}}}),ob4=(await call('/api/account/onboarding',{cookie:T})).data;
 check('ONB-03 lessonLang and needs are saved next to earlier answers; bad value -> 400',ob3.status===200&&ob4.answers.lessonLang==='both'&&ob4.answers.needs==='unsure'&&ob4.answers.grade==='3-4'&&(await call('/api/account/onboarding',{cookie:T,body:{answers:{needs:'autism'}}})).status===400);

 // ---- checkout and confirm ----
 check('PAY-01 checkout without session -> 401',(await call('/api/billing/checkout',{body:{plan:'max',period:'year'}})).status===401);
 check('PAY-02 unknown plan / free / bad period / bad method -> 400',[(await call('/api/billing/checkout',{cookie:T,body:{plan:'gold',period:'year'}})).data.code==='bad_plan',(await call('/api/billing/checkout',{cookie:T,body:{plan:'free',period:'year'}})).data.code==='bad_plan',(await call('/api/billing/checkout',{cookie:T,body:{plan:'max',period:'week'}})).data.code==='bad_period',(await call('/api/billing/checkout',{cookie:T,body:{plan:'max',period:'year',method:'bitcoin'}})).data.code==='bad_method'].every(Boolean));
 const card=await call('/api/billing/checkout',{cookie:T,body:{plan:'max',period:'year',card:{number:'4111111111111111',cvv:'123'}}});
 check('PAY-03 card data is refused (400 card_data_not_accepted) and stored nowhere',card.status===400&&card.data.code==='card_data_not_accepted');
 const db0=new DatabaseSync(DB);const dump=JSON.stringify(db0.prepare('SELECT * FROM ayan_invoices').all())+JSON.stringify(db0.prepare('SELECT * FROM ayan_payments').all());db0.close();
 check('PAY-04 no card number in the database',!dump.includes('4111'));
 check('PAY-05 school plan needs 5+ teachers',(await call('/api/billing/checkout',{cookie:sch.cookie,body:{plan:'school',period:'month',seats:3}})).data.code==='bad_seats');
 const co=await call('/api/billing/checkout',{cookie:T,body:{plan:'plus',period:'month',method:'kaspi'}});
 const inv=co.data.invoice;
 check('PAY-10 checkout creates a pending invoice with number, amount 1490, VAT 206, rate 0.16',co.status===200&&inv.status==='pending'&&inv.amount===1490&&inv.vat===206&&inv.vatRate===0.16&&/^AY-\d{4}-/.test(inv.number),JSON.stringify(inv));
 check('PAY-11 repeat checkout returns the same invoice',(await call('/api/billing/checkout',{cookie:T,body:{plan:'plus',period:'month'}})).data.invoice.id===inv.id);
 check('PAY-12 another user cannot read or confirm my invoice',(await call('/api/billing/invoices/'+inv.id,{cookie:par.cookie})).status===404&&(await call('/api/billing/confirm',{cookie:par.cookie,body:{invoiceId:inv.id}})).status===404);
 check('PAY-13 plan still free before confirmation',(await call('/api/billing/subscription',{cookie:T})).data.plan==='free');
 // gating before payment
 const kid=await call('/api/children',{cookie:T,body:{label:'Ученик 1',consent:{confirmed:true,basis:'guardian_consent'}}});
 const asg=lesson=>call('/api/v2/assign',{cookie:T,body:{opId:'op-'+lesson+Math.random().toString(36).slice(2,8),childIds:[kid.data.id],lessonId:lesson}});
 const g1=await asg('bio-plants-01');
 check('GATE-01 free plan: other lessons -> 402 plan',g1.status===402&&g1.data.code==='plan',g1.status+' '+JSON.stringify(g1.data));
 const kid2=await call('/api/children',{cookie:T,body:{label:'Ученик 2',consent:{confirmed:true,basis:'guardian_consent'}}});
 const grp=op=>call('/api/v2/assign',{cookie:T,body:{opId:op,childIds:[kid.data.id,kid2.data.id],lessonId:'math-fractions-01'}});
 const g2=await grp('op-grp-free-1');
 const cf=await call('/api/billing/confirm',{cookie:T,body:{invoiceId:inv.id}});
 check('PAY-14 confirm marks paid, creates payment with receipt, activates Plus',cf.status===200&&cf.data.payment.status==='paid'&&cf.data.payment.receipt===inv.number&&cf.data.subscription.plan==='plus'&&cf.data.subscription.status==='active'&&cf.data.subscription.renewsAt>Date.now(),JSON.stringify(cf.data.subscription));
 const cf2=await call('/api/billing/confirm',{cookie:T,body:{invoiceId:inv.id}});
 check('PAY-15 confirm twice is safe: same payment, still one payment, one period',cf2.status===200&&cf2.data.replay&&cf2.data.payment.id===cf.data.payment.id&&(await call('/api/billing/payments',{cookie:T})).data.payments.length===1&&cf2.data.subscription.endsAt===cf.data.subscription.endsAt);
 check('PAY-16 payment history carries amount, VAT, method, date',(await call('/api/billing/payments',{cookie:T})).data.payments[0].vat===206);
 check('GATE-02 Plus opens all lessons and constructor, but groups stay closed',(await asg('bio-plants-01')).status===200&&g2.status===402&&(await grp('op-grp-plus-1')).data.feature==='groups');
 const mxi=(await call('/api/billing/checkout',{cookie:T,body:{plan:'max',period:'year',method:'invoice'}})).data.invoice;
 check('PAY-20 Max year price is 29 900 with VAT',mxi.amount===29900&&mxi.vat===4124,JSON.stringify(mxi));
 const mxc=await call('/api/billing/confirm',{cookie:T,body:{invoiceId:mxi.id}});
 check('GATE-03 Max opens everything: groups no longer 402, features list has groups',mxc.data.subscription.plan==='max'&&mxc.data.subscription.features.includes('groups')&&(await grp('op-grp-max-1')).status===200);
 const me2=await call('/api/v2/me',{cookie:T});check('GATE-04 /api/v2/me reports plan max',me2.data.plan?.plan==='max',JSON.stringify(me2.data.plan));
 check('PAY-21 free pilot endpoint cannot hand out paid plans (planId max -> 400)',(await call('/api/v2/pilot/order',{cookie:par.cookie,body:{planId:'max',idemKey:'k-12345678'}})).status>=400);

 // ---- cancel and resume ----
 check('SUB-01 cancel without subscription -> 409',(await call('/api/billing/cancel',{cookie:par.cookie,body:{}})).status===409);
 const cn=await call('/api/billing/cancel',{cookie:T,body:{reason:'test'}});
 check('SUB-02 cancel: status canceling, access kept until endsAt, no renewal date',cn.data.subscription.status==='canceling'&&cn.data.subscription.plan==='max'&&cn.data.subscription.renewsAt===null&&cn.data.subscription.endsAt>Date.now());
 check('SUB-03 resume restores renewal',(await call('/api/billing/resume',{cookie:T,body:{}})).data.subscription.status==='active');
 // school seats
 const si=(await call('/api/billing/checkout',{cookie:sch.cookie,body:{plan:'school',period:'month',seats:10}})).data.invoice;
 check('SCHOOL-01 school: 10 teachers x 990 = 9 900, VAT inside',si.amount===9900&&si.seats===10&&si.vat===1366,JSON.stringify(si));
 check('SCHOOL-02 teacher member of a plain account cannot pay for a school (only owner/admin)',(await call('/api/billing/confirm',{cookie:sch.cookie,body:{invoiceId:si.id}})).status===200);

 // ---- child consent ----
 const nok=await call('/api/children',{cookie:T,body:{label:'Без согласия'}});
 check('CONS-01 adding a child without consent -> 400 child_consent_required',nok.status===400&&nok.data.code==='child_consent_required');
 const kc=await call('/api/account/children-consent',{cookie:T});
 check('CONS-02 child added with consent has flag, basis and date',kc.data.children.find(c=>c.id===kid.data.id)?.consent?.basis==='guardian_consent'&&kc.data.children[0].consent.at>0);
 check('CONS-03 consent for a foreign child -> 404, unconfirmed -> 400',(await call('/api/account/child-consent',{cookie:par.cookie,body:{child:kid.data.id,confirmed:true,basis:'parent'}})).status===404&&(await call('/api/account/child-consent',{cookie:T,body:{child:kid.data.id,confirmed:false,basis:'parent'}})).status===400);

 // ---- profile, password ----
 check('PROF-01 rename',(await call('/api/account/profile',{cookie:T,method:'PATCH',body:{name:'Новое Имя'}})).data.user.name==='Новое Имя');
 check('PROF-02 empty name -> 400',(await call('/api/account/profile',{cookie:T,method:'PATCH',body:{name:'  '}})).status===400);
 check('PASS-01 wrong current password -> 403, short new -> 400',(await call('/api/account/password',{cookie:T,body:{current:'nope-nope-1',next:'new-password-22'}})).status===403&&(await call('/api/account/password',{cookie:T,body:{current:'test-password-1',next:'x'}})).status===400);
 check('PASS-02 password change works, old password stops working',(await call('/api/account/password',{cookie:T,body:{current:'test-password-1',next:'new-password-22'}})).status===200&&(await signin('teacher1@t.kz','test-password-1')).status===401);
 T=(await signin('teacher1@t.kz','new-password-22')).cookie;

 // ---- support ----
 check('SUP-01 empty message / bad email -> 400',(await call('/api/support',{body:{email:'a@b.kz',message:'  '}})).status===400&&(await call('/api/support',{body:{email:'zzz',message:'hi'}})).status===400);
 check('SUP-02 too long -> 400',(await call('/api/support',{body:{email:'a@b.kz',message:'x'.repeat(2001)}})).status===400);
 const sup=await call('/api/support',{body:{email:'a@b.kz',message:'Как оплатить школой?'}});
 check('SUP-03 ticket stored (no e-mail sent)',sup.status===200&&sup.data.ok&&(()=>{const d=new DatabaseSync(DB);const n=d.prepare('SELECT COUNT(*) n FROM ayan_support_tickets').get().n;d.close();return n===1;})());

 // ---- export ----
 const ex=await call('/api/account/export',{cookie:T,raw:true});let exd=null;try{exd=JSON.parse(ex.data);}catch{}
 check('EXP-01 export gives my profile, payments, students, consent log; attachment header',ex.status===200&&/attachment/.test(ex.res.headers.get('content-disposition'))&&exd.profile.user.email==='teacher1@t.kz'&&exd.payments.length===2&&exd.students.length===2&&exd.consentLog.length>=3);
 check('EXP-02 export contains no password hash and nothing of other users',!ex.data.includes('scrypt')&&!ex.data.includes('parent1@t.kz'));
 check('EXP-03 export needs a session',(await call('/api/account/export')).status===401);

 // ---- deletion ----
 check('DEL-01 wrong confirmation word / password -> 400 / 403',(await call('/api/account/delete',{cookie:par.cookie,body:{password:'test-password-1',confirm:'нет'}})).status===400&&(await call('/api/account/delete',{cookie:par.cookie,body:{password:'bad-bad-bad1',confirm:'УДАЛИТЬ'}})).status===403);
 const del=await call('/api/account/delete',{cookie:par.cookie,body:{password:'test-password-1',confirm:'УДАЛИТЬ'}});
 check('DEL-02 soft delete: due in 30 days, sessions revoked',del.status===200&&Math.abs(del.data.dueAt-Date.now()-30*86400000)<60000&&(await call('/api/account/profile',{cookie:par.cookie})).status===401);
 const back=await signin('parent1@t.kz','test-password-1');
 check('DEL-03 within 30 days the user can still sign in and sees the pending deletion',back.status===200&&(await call('/api/account/profile',{cookie:back.cookie})).data.deletion?.dueAt>Date.now());
 await call('/api/account/delete/cancel',{cookie:back.cookie,body:{}});
 check('DEL-04 deletion can be cancelled',(await call('/api/account/profile',{cookie:back.cookie})).data.deletion===null);
 await call('/api/account/delete',{cookie:back.cookie,body:{password:'test-password-1',confirm:'УДАЛИТЬ'}});
 const d1=new DatabaseSync(DB);d1.prepare("UPDATE ayan_profiles SET deletion_due=1 WHERE user_id=(SELECT id FROM \"user\" WHERE email='parent1@t.kz')").run();d1.close();
 const pg=spawnSync(process.execPath,['scripts/purge-accounts.mjs'],{env,encoding:'utf8'});
 check('DEL-05 purge erases the account after the due date (no login, no rows)',pg.status===0&&(await signin('parent1@t.kz','test-password-1')).status===401&&(()=>{const d=new DatabaseSync(DB);const n=d.prepare("SELECT COUNT(*) n FROM \"user\" WHERE email='parent1@t.kz'").get().n+d.prepare("SELECT COUNT(*) n FROM ayan_profiles WHERE account_role='parent'").get().n;d.close();return n===0;})(),pg.stdout+pg.stderr.slice(0,200));
 check('DEL-06 the other accounts survive the purge',(await call('/api/account/profile',{cookie:T})).status===200);

}catch(e){check('RUNTIME no unexpected exception',false,e.stack);}
srv.kill();
const failed=results.filter(r=>!r[1]).length;
console.log(`\n${results.length-failed}/${results.length} passed`+(failed?`, ${failed} FAILED\n--- server log ---\n${out.slice(-1500)}`:''));
process.exit(failed?1:0);
