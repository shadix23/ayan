// Accounts, plans, subscription and payment SIMULATION for the MVP. Contract: hackathon/api-accounts.md.
// Hard rule: no card number, CVV or any real payment data is ever accepted or stored here. A "payment" is an invoice
// (like a Kaspi invoice) that the signed-in owner confirms with one request. Login itself is better-auth (server.mjs).
import crypto from 'node:crypto';
import {addColumn} from './db-util.mjs';
import {PAID_PLANS,ALWAYS} from './learning.mjs';

// VAT in Kazakhstan: standard rate 16% from 1 Jan 2026 under the new Tax Code (was 12%). Source: Налоговый кодекс РК 2026
// (Law of 18.07.2025 No. 214-VIII), not re-checked online from this environment: confirm with the owner before showing a real invoice.
export const VAT_RATE=0.16;
export const LEGAL_VERSION='2026-11';
export const REFUND_DAYS=14;
const MIN=1000*60,DAY=86400000,now=()=>Date.now();
const uid=()=>crypto.randomUUID();
const J=s=>{try{return JSON.parse(s);}catch{return null;}};
const vatOf=gross=>Math.round(gross*VAT_RATE/(1+VAT_RATE));

// Prices are gross (VAT included), whole tenge. Yearly = 10 monthly payments.
export const CONTACT={operator:'Владелец сервиса Аян',email:'supportayan@gmail.com',note:'placeholder until the owner gives real details'};
export const SCHOOL_MIN_SEATS=5,SCHOOL_MAX_SEATS=500;
export const PLAN_DEFS={
 free:{id:'free',name:{ru:'Старт',kk:'Бастау'},forRole:['teacher','parent','school'],month:0,year:0,features:['Один урок: равные доли','Субтитры, спокойный режим, доска общения','Пример отчёта']},
 plus:{id:'plus',name:{ru:'Плюс',kk:'Плюс'},forRole:['teacher','parent'],month:1490,year:14900,flags:['all_lessons','constructor','history'],features:['Все уроки каталога','Конструктор заданий','История и отчёты по ученикам']},
 max:{id:'max',name:{ru:'Макс',kk:'Макс'},forRole:['teacher','parent','school'],month:2990,year:29900,highlight:true,flags:['all_lessons','groups','constructor','history'],features:['Всё из тарифа Плюс','Групповые назначения','Без ограничений по ученикам']},
 school:{id:'school',name:{ru:'Школа',kk:'Мектеп'},forRole:['school'],month:990,year:9900,perSeat:true,minSeats:SCHOOL_MIN_SEATS,flags:['all_lessons','groups','constructor','history'],features:['Всё из тарифа Макс','Цена за одного учителя, от 5 учителей','Сводка для администратора школы']}
};
// Paid plans plug into the existing entitlement logic (Learning.entitlement reads PAID_PLANS). They are NOT in Learning.PLANS,
// so the free pilot endpoint can never hand them out.
for(const p of Object.values(PLAN_DEFS))if(p.flags)PAID_PLANS[p.id]={id:p.id,features:p.flags,label:p.name};

const prices=p=>({month:{amount:p.month,vat:vatOf(p.month)},year:{amount:p.year,vat:vatOf(p.year),...(p.year?{saving:p.month*12-p.year}:{})}});
export const plansView=()=>({currency:'KZT',vatRate:VAT_RATE,vatIncluded:true,refundDays:REFUND_DAYS,
 terms:{refund:`Гарантия возврата ${REFUND_DAYS} дней: если сервис не подошёл, напишите нам в течение ${REFUND_DAYS} дней после оплаты, и мы вернём деньги за текущий период.`,cancel:'Отмена в любой момент. Доступ сохраняется до конца оплаченного периода.',vat:'Все цены указаны с НДС.'},
 plans:Object.values(PLAN_DEFS).map(p=>({id:p.id,name:p.name,forRole:p.forRole,highlight:!!p.highlight,prices:prices(p),features:p.features,...(p.perSeat?{perSeat:true,minSeats:p.minSeats,maxSeats:SCHOOL_MAX_SEATS}:{})})),contact:CONTACT});

const ROLES=['teacher','parent','school'],METHODS={kaspi:'Счёт Kaspi',invoice:'Счёт на организацию'};
const ONBOARD={goal:{type:'single',options:['inclusion','homework','lessons','school_rollout']},subjects:{type:'multi',options:['math','bio','kazakh','other']},grade:{type:'single',options:['1-2','3-4','5-9','mixed']},
 experience:{type:'single',options:['new','some','expert']},children:{type:'single',options:['1','2-5','6-20','20+']},source:{type:'single',options:['colleague','search','social','event','other']},
 lessonLang:{type:'single',options:['kk','ru','both']},needs:{type:'single',options:['several','one','none','unsure']}};
const CARD_KEYS=/^(card|cardnumber|card_number|pan|cvv|cvc|cvv2|expiry|exp|exp_month|exp_year|holder|cardholder)$/i;
const hasCardData=o=>o&&typeof o==='object'&&Object.entries(o).some(([k,v])=>CARD_KEYS.test(k)||(v&&typeof v==='object'&&!Array.isArray(v)&&hasCardData(v)));
const err=(status,code,error,extra)=>[status,{code,error,...extra}];
const addPeriod=(from,period)=>{const d=new Date(from);period==='year'?d.setUTCFullYear(d.getUTCFullYear()+1):d.setUTCMonth(d.getUTCMonth()+1);return d.getTime();};

export function createBilling({query,auth,fromNodeHeaders,send,body,origin,DEMO,Learning}){
 const secure=origin.startsWith('https:')?'; Secure':'';
 const hits=new Map();
 const limited=(req,key,max,windowMs)=>{const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim()||'ip';const k=key+':'+ip,t=now();const a=(hits.get(k)||[]).filter(x=>t-x<windowMs);a.push(t);hits.set(k,a);if(hits.size>5000)hits.clear();return a.length>max;};

 async function migrate(){
  await query('CREATE TABLE IF NOT EXISTS ayan_profiles (user_id TEXT PRIMARY KEY, account_role TEXT NOT NULL, terms_version TEXT, terms_at BIGINT, privacy_version TEXT, privacy_at BIGINT, child_data INTEGER, child_data_at BIGINT, cookie_choice TEXT, cookie_at BIGINT, onboarding TEXT, onboarding_done INTEGER, deletion_requested BIGINT, deletion_due BIGINT, created BIGINT NOT NULL)');
  await query('CREATE TABLE IF NOT EXISTS ayan_consents (id TEXT PRIMARY KEY, user_id TEXT, kind TEXT NOT NULL, value TEXT NOT NULL, version TEXT NOT NULL, created BIGINT NOT NULL)');
  await query('CREATE TABLE IF NOT EXISTS ayan_child_consents (child TEXT PRIMARY KEY, user_id TEXT NOT NULL, basis TEXT NOT NULL, version TEXT NOT NULL, created BIGINT NOT NULL, withdrawn BIGINT)');
  await query('CREATE TABLE IF NOT EXISTS ayan_subscriptions (org TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan TEXT NOT NULL, period TEXT NOT NULL, amount INTEGER NOT NULL, vat INTEGER NOT NULL, method TEXT NOT NULL, started BIGINT NOT NULL, period_end BIGINT NOT NULL, cancel_at_end INTEGER NOT NULL, canceled_at BIGINT, updated BIGINT NOT NULL)');
  await query('CREATE TABLE IF NOT EXISTS ayan_invoices (id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, org TEXT NOT NULL, user_id TEXT NOT NULL, plan TEXT NOT NULL, period TEXT NOT NULL, method TEXT NOT NULL, amount INTEGER NOT NULL, vat INTEGER NOT NULL, vat_rate TEXT NOT NULL, status TEXT NOT NULL, created BIGINT NOT NULL, expires BIGINT NOT NULL, paid BIGINT)');
  await query('CREATE TABLE IF NOT EXISTS ayan_payments (id TEXT PRIMARY KEY, invoice TEXT NOT NULL UNIQUE, org TEXT NOT NULL, user_id TEXT NOT NULL, plan TEXT NOT NULL, period TEXT NOT NULL, amount INTEGER NOT NULL, vat INTEGER NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL, receipt TEXT NOT NULL, created BIGINT NOT NULL)');
  await addColumn(query,'ayan_invoices','seats','INTEGER');await addColumn(query,'ayan_subscriptions','seats','INTEGER');await addColumn(query,'ayan_payments','seats','INTEGER');
  await query('CREATE TABLE IF NOT EXISTS ayan_support_tickets (id TEXT PRIMARY KEY, user_id TEXT, email TEXT NOT NULL, message TEXT NOT NULL, created BIGINT NOT NULL)');
  await query('CREATE INDEX IF NOT EXISTS ayan_payments_org ON ayan_payments (org, created)');
 }

 const log=(user,kind,value,version=LEGAL_VERSION)=>query('INSERT INTO ayan_consents (id,user_id,kind,value,version,created) VALUES (?,?,?,?,?,?)',[uid(),user,kind,String(value),version,now()]);
 async function session(req){return (await auth.api.getSession({headers:fromNodeHeaders(req.headers)}))?.user||null;}
 async function profile(user){
  let p=(await query('SELECT * FROM ayan_profiles WHERE user_id=?',[user.id]))[0];
  if(!p){await query('INSERT INTO ayan_profiles (user_id,account_role,onboarding_done,created) VALUES (?,?,?,?) ON CONFLICT(user_id) DO NOTHING',[user.id,'teacher',0,now()]);p=(await query('SELECT * FROM ayan_profiles WHERE user_id=?',[user.id]))[0];}
  return p;
 }
 const userView=u=>({id:u.id,email:u.email,name:u.name});
 const payView=r=>({id:r.id,receipt:r.receipt,plan:r.plan,planName:PLAN_DEFS[r.plan]?.name,period:r.period,seats:r.seats?Number(r.seats):null,amount:Number(r.amount),vat:Number(r.vat),method:r.method,status:r.status,createdAt:Number(r.created)});
 const invView=r=>({id:r.id,number:r.number,plan:r.plan,planName:PLAN_DEFS[r.plan]?.name,period:r.period,seats:r.seats?Number(r.seats):null,method:r.method,amount:Number(r.amount),vat:Number(r.vat),vatRate:Number(r.vat_rate),currency:'KZT',status:r.status,expiresAt:Number(r.expires),createdAt:Number(r.created)});

 async function subscriptionView(mem){
  const s=(await query('SELECT * FROM ayan_subscriptions WHERE org=?',[mem.org]))[0],ent=await Learning.entitlement(query,mem.org);
  if(!s)return {plan:'free',planName:PLAN_DEFS.free.name,status:'none',period:null,amount:0,vat:0,startedAt:null,renewsAt:null,endsAt:null,cancelAtPeriodEnd:false,paymentMethod:null,features:ent.features};
  const end=Number(s.period_end),ended=end<now(),cancel=Number(s.cancel_at_end)===1;
  return {plan:ended?'free':s.plan,planName:PLAN_DEFS[ended?'free':s.plan].name,status:ended?'expired':cancel?'canceling':'active',period:s.period,seats:s.seats?Number(s.seats):null,amount:Number(s.amount),vat:Number(s.vat),startedAt:Number(s.started),
   renewsAt:ended||cancel?null:end,endsAt:end,cancelAtPeriodEnd:cancel,paymentMethod:{type:s.method,label:METHODS[s.method]||s.method},features:ent.features};
 }
 const nextFor=(p)=>p.onboarding_done?'/teacher':'/onboarding';
 async function fullProfile(user){
  const p=await profile(user),mem=await Learning.member(query,user);
  const oc=J(p.onboarding)||{};
  return {user:userView(user),role:p.account_role,org:{id:mem.org,name:mem.orgName},canManageBilling:mem.manages,onboarding:{done:Number(p.onboarding_done)===1,answers:oc},
   consents:{terms:p.terms_at?{version:p.terms_version,at:Number(p.terms_at)}:null,privacy:p.privacy_at?{version:p.privacy_version,at:Number(p.privacy_at)}:null,childData:{given:Number(p.child_data)===1,at:p.child_data_at?Number(p.child_data_at):null},cookies:p.cookie_choice?{choice:p.cookie_choice,at:Number(p.cookie_at)}:null},
   subscription:await subscriptionView(mem),deletion:p.deletion_requested?{requestedAt:Number(p.deletion_requested),dueAt:Number(p.deletion_due)}:null,next:nextFor(p)};
 }

 // ---------- registration ----------
 async function register(req,res){
  if(limited(req,'register',Number(process.env.AYAN_RATE_REGISTER)||20,10*MIN))return send(res,429,{code:'rate_limited',error:'Слишком много попыток. Подождите несколько минут.'});
  const i=await body(req),c=i.consent&&typeof i.consent==='object'?i.consent:{};
  const email=String(i.email||'').trim().toLowerCase(),password=String(i.password||''),name=String(i.name||'').trim().slice(0,80),role=String(i.role||'');
  if(!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email))return send(res,400,{code:'bad_request',field:'email',error:'Проверьте адрес почты'});
  if(password.length<8||password.length>128)return send(res,400,{code:'bad_request',field:'password',error:'Пароль: от 8 до 128 символов'});
  if(!name)return send(res,400,{code:'bad_request',field:'name',error:'Укажите имя'});
  if(!ROLES.includes(role))return send(res,400,{code:'bad_request',field:'role',error:'Выберите роль: учитель, родитель или школа'});
  const orgName=String(i.orgName||'').trim().slice(0,100);
  if(role==='school'&&!orgName)return send(res,400,{code:'bad_request',field:'orgName',error:'Укажите название школы'});
  if(c.terms!==true)return send(res,400,{code:'consent_required',field:'terms',error:'Нужно принять условия использования'});
  if(c.privacy!==true)return send(res,400,{code:'consent_required',field:'privacy',error:'Нужно принять политику конфиденциальности'});
  if(role==='parent'&&c.childData!==true)return send(res,400,{code:'consent_required',field:'childData',error:'Нужно согласие на обработку данных ребёнка'});
  let r;
  try{r=await auth.api.signUpEmail({body:{email,password,name},asResponse:true});}catch(e){return send(res,e?.status===422||e?.statusCode===422?409:400,e?.status===422||e?.statusCode===422?{code:'email_taken',error:'Этот адрес уже зарегистрирован. Войдите.'}:{code:'bad_request',error:'Не удалось создать аккаунт'});}
  if(!r.ok){const t=await r.json().catch(()=>({}));const taken=r.status===422||/exist/i.test(String(t.code||t.message));return send(res,taken?409:400,taken?{code:'email_taken',error:'Этот адрес уже зарегистрирован. Войдите.'}:{code:'bad_request',error:'Не удалось создать аккаунт'});}
  const u=(await query('SELECT id,email,name FROM "user" WHERE email=?',[email]))[0],t=now(),org=uid();
  await query('INSERT INTO ayan_orgs (id,name,demo,created) VALUES (?,?,?,?)',[org,orgName||(role==='parent'?'Семья':'Личное пространство'),0,t]);
  await query('INSERT INTO ayan_members (user_id,org,role,created) VALUES (?,?,?,?) ON CONFLICT(user_id) DO NOTHING',[u.id,org,'owner',t]);
  await query('INSERT INTO ayan_profiles (user_id,account_role,terms_version,terms_at,privacy_version,privacy_at,child_data,child_data_at,onboarding_done,created) VALUES (?,?,?,?,?,?,?,?,?,?)',[u.id,role,LEGAL_VERSION,t,LEGAL_VERSION,t,c.childData===true?1:0,c.childData===true?t:null,0,t]);
  await log(u.id,'terms','accepted');await log(u.id,'privacy','accepted');if(c.childData===true)await log(u.id,'child_data','given');
  for(const ck of r.headers.getSetCookie())res.appendHeader('Set-Cookie',ck);
  return send(res,200,{ok:true,user:userView(u),role,next:'/onboarding'});
 }

 // ---------- cookie consent ----------
 const cookieChoice=req=>{const m=/(?:^|;\s*)ayan_consent=([^;]+)/.exec(req.headers.cookie||'');if(!m)return null;const [v,c]=m[1].split('.');return v===LEGAL_VERSION&&(c==='necessary'||c==='all')?c:null;};
 async function cookies(req,res,m){
  if(m==='GET'){const ch=cookieChoice(req);return send(res,200,{choice:ch,version:LEGAL_VERSION,at:null});}
  if(m!=='POST')return send(res,405,{error:'Method not allowed'});
  const i=await body(req),choice=String(i.choice||'');
  if(choice!=='necessary'&&choice!=='all')return send(res,400,{code:'bad_request',error:'Выберите: только необходимые или все'});
  const u=await session(req).catch(()=>null);await log(u?.id||null,'cookies',choice);
  if(u){await profile(u);await query('UPDATE ayan_profiles SET cookie_choice=?,cookie_at=? WHERE user_id=?',[choice,now(),u.id]);}
  res.appendHeader('Set-Cookie',`ayan_consent=${LEGAL_VERSION}.${choice}; SameSite=Lax; Path=/; Max-Age=${180*86400}${secure}`);
  return send(res,200,{ok:true,choice,analytics:choice==='all'});
 }

 // ---------- onboarding ----------
 function cleanAnswers(a){
  if(!a||typeof a!=='object'||Array.isArray(a))return null;const out={};
  for(const [k,v] of Object.entries(a)){const q=ONBOARD[k];if(!q)continue;
   if(q.type==='single'){if(typeof v!=='string'||!q.options.includes(v))return null;out[k]=v;}
   else{if(!Array.isArray(v)||v.some(x=>!q.options.includes(x)))return null;out[k]=[...new Set(v)];}}
  return out;
 }

 // ---------- billing ----------
 async function checkout(req,res,user){
  const i=await body(req);
  if(hasCardData(i))return send(res,400,{code:'card_data_not_accepted',error:'Платёжные данные карты не принимаются. Оплата проходит по счёту.'});
  const mem=await Learning.member(query,user);if(!mem.manages)return send(res,403,{code:'forbidden',error:'Оплачивать тариф может владелец пространства'});
  const plan=PLAN_DEFS[String(i.plan||'')];if(!plan||plan.id==='free')return send(res,400,{code:'bad_plan',error:'Выберите платный тариф'});
  const period=String(i.period||'');if(period!=='month'&&period!=='year')return send(res,400,{code:'bad_period',error:'Период: месяц или год'});
  let seats=null;if(plan.perSeat){seats=Number(i.seats);if(!Number.isInteger(seats)||seats<plan.minSeats||seats>SCHOOL_MAX_SEATS)return send(res,400,{code:'bad_seats',error:`Тариф Школа: от ${plan.minSeats} до ${SCHOOL_MAX_SEATS} учителей`});}
  const method=String(i.method||'kaspi');if(!METHODS[method])return send(res,400,{code:'bad_method',error:'Способ оплаты: счёт Kaspi или счёт на организацию'});
  if(limited(req,'checkout',30,10*MIN))return send(res,429,{code:'rate_limited',error:'Слишком много попыток'});
  const t=now();
  const prior=(await query('SELECT * FROM ayan_invoices WHERE org=? AND user_id=? AND plan=? AND period=? AND status=? AND expires>? AND COALESCE(seats,0)=? ORDER BY created DESC',[mem.org,user.id,plan.id,period,'pending',t,seats||0]))[0];
  if(prior){if(prior.method!==method)await query('UPDATE ayan_invoices SET method=? WHERE id=?',[method,prior.id]);return send(res,200,{invoice:invView({...prior,method})});}
  const amount=plan[period]*(seats||1),id='inv_'+uid().replaceAll('-','').slice(0,20);
  for(let n=0;n<5;n++){
   const number='AY-'+new Date().getUTCFullYear()+'-'+crypto.randomBytes(5).toString('base64url').replace(/[^A-Za-z0-9]/g,'').slice(0,6).toUpperCase().padEnd(6,'7');
   try{await query('INSERT INTO ayan_invoices (id,number,org,user_id,plan,period,method,amount,vat,vat_rate,status,created,expires,seats) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,number,mem.org,user.id,plan.id,period,method,amount,vatOf(amount),String(VAT_RATE),'pending',t,t+3*DAY,seats]);break;}catch(e){if(n===4)throw e;}
  }
  return send(res,200,{invoice:invView((await query('SELECT * FROM ayan_invoices WHERE id=?',[id]))[0])});
 }
 async function confirm(req,res,user){
  const i=await body(req);
  if(hasCardData(i))return send(res,400,{code:'card_data_not_accepted',error:'Платёжные данные карты не принимаются.'});
  const mem=await Learning.member(query,user);if(!mem.manages)return send(res,403,{code:'forbidden',error:'Оплачивать тариф может владелец пространства'});
  const inv=(await query('SELECT * FROM ayan_invoices WHERE id=? AND org=? AND user_id=?',[String(i.invoiceId||''),mem.org,user.id]))[0];
  if(!inv)return send(res,404,{code:'not_found',error:'Счёт не найден'});
  const paid=(await query('SELECT * FROM ayan_payments WHERE invoice=?',[inv.id]))[0];
  if(paid)return send(res,200,{ok:true,replay:true,payment:payView(paid),subscription:await subscriptionView(mem)});
  const t=now();
  if(inv.status!=='pending'||Number(inv.expires)<t)return send(res,410,{code:'invoice_expired',error:'Срок счёта истёк. Создайте новый.'});
  // Mark paid only if still pending: two parallel confirms cannot both activate or double the period.
  await query('UPDATE ayan_invoices SET status=?,paid=? WHERE id=? AND status=?',['paid',t,inv.id,'pending']);
  const pid=uid();
  try{await query('INSERT INTO ayan_payments (id,invoice,org,user_id,plan,period,amount,vat,method,status,receipt,created,seats) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',[pid,inv.id,inv.org,inv.user_id,inv.plan,inv.period,inv.amount,inv.vat,inv.method,'paid',inv.number,t,inv.seats]);}
  catch{const again=(await query('SELECT * FROM ayan_payments WHERE invoice=?',[inv.id]))[0];return send(res,200,{ok:true,replay:true,payment:payView(again),subscription:await subscriptionView(mem)});}
  const cur=(await query('SELECT * FROM ayan_subscriptions WHERE org=?',[inv.org]))[0];
  const renew=cur&&cur.plan===inv.plan&&Number(cur.seats||0)===Number(inv.seats||0)&&Number(cur.period_end)>t;
  const start=renew?Number(cur.started):t,end=addPeriod(renew?Number(cur.period_end):t,inv.period);
  await query('INSERT INTO ayan_subscriptions (org,user_id,plan,period,amount,vat,method,started,period_end,cancel_at_end,canceled_at,updated,seats) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(org) DO UPDATE SET seats=excluded.seats,user_id=excluded.user_id,plan=excluded.plan,period=excluded.period,amount=excluded.amount,vat=excluded.vat,method=excluded.method,started=excluded.started,period_end=excluded.period_end,cancel_at_end=0,canceled_at=NULL,updated=excluded.updated',
   [inv.org,user.id,inv.plan,inv.period,inv.amount,inv.vat,inv.method,start,end,0,null,t,inv.seats]);
  await grant(inv.org,inv.plan,start,end,inv.id);
  return send(res,200,{ok:true,replay:false,payment:payView((await query('SELECT * FROM ayan_payments WHERE id=?',[pid]))[0]),subscription:await subscriptionView(mem)});
 }
 async function grant(org,plan,started,end,orderId){
  await query('INSERT INTO ayan_entitlements (org,plan,status,started,expires,order_id,updated) VALUES (?,?,?,?,?,?,?) ON CONFLICT(org) DO UPDATE SET plan=excluded.plan,status=excluded.status,started=excluded.started,expires=excluded.expires,order_id=excluded.order_id,updated=excluded.updated',[org,plan,'active',started,end,orderId,now()]);
 }
 async function cancel(res,user,flag){
  const mem=await Learning.member(query,user);if(!mem.manages)return send(res,403,{code:'forbidden',error:'Управлять подпиской может владелец пространства'});
  const s=(await query('SELECT * FROM ayan_subscriptions WHERE org=?',[mem.org]))[0];
  if(!s||Number(s.period_end)<now())return send(res,409,{code:'no_subscription',error:'Нет действующей подписки'});
  await query('UPDATE ayan_subscriptions SET cancel_at_end=?,canceled_at=?,updated=? WHERE org=?',[flag?1:0,flag?now():null,now(),mem.org]);
  return send(res,200,{subscription:await subscriptionView(mem)});
 }

 // ---------- child consent ----------
 const BASIS=['parent','guardian_consent'];
 async function recordChildConsent(userId,childId,basis){
  const t=now();await query('INSERT INTO ayan_child_consents (child,user_id,basis,version,created,withdrawn) VALUES (?,?,?,?,?,NULL) ON CONFLICT(child) DO UPDATE SET basis=excluded.basis,version=excluded.version,created=excluded.created,withdrawn=NULL',[childId,userId,basis,LEGAL_VERSION,t]);
  await log(userId,'child_consent:'+childId,basis);return t;
 }
 // For POST /api/children: returns {basis} or null when the body carries no valid confirmation.
 const childConsentInput=input=>{const c=input?.consent;return c&&c.confirmed===true&&BASIS.includes(String(c.basis||''))?{basis:c.basis}:null;};

 // ---------- password, export, deletion ----------
 async function checkPassword(user,password){
  const acc=(await query('SELECT password FROM "account" WHERE "userId"=? AND "providerId"=?',[user.id,'credential']))[0];if(!acc?.password)return false;
  return (await auth.$context).password.verify({hash:acc.password,password:String(password||'')});
 }
 async function revoke(req,res,user,scope){
  const before=Number((await query('SELECT COUNT(*) AS n FROM "session" WHERE "userId"=?',[user.id]))[0].n);
  if(scope==='all'){await auth.api.revokeSessions({headers:fromNodeHeaders(req.headers)});res.appendHeader('Set-Cookie','better-auth.session_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+secure);return {ok:true,revoked:before};}
  await auth.api.revokeOtherSessions({headers:fromNodeHeaders(req.headers)});
  const after=Number((await query('SELECT COUNT(*) AS n FROM "session" WHERE "userId"=?',[user.id]))[0].n);
  return {ok:true,revoked:Math.max(0,before-after)};
 }
 async function exportData(res,user){
  const mem=await Learning.member(query,user),kids=await query('SELECT id,label FROM ayan_children WHERE owner=?',[user.id]),out=[];
  for(const k of kids){const r=await Learning.exportChild(query,user,{child:k.id});out.push({...(r[0]===200?r[1]:{student:k}),consent:(await query('SELECT basis,version,created,withdrawn FROM ayan_child_consents WHERE child=?',[k.id]))[0]||null});}
  const data={exportedAt:now(),profile:await fullProfile(user),consentLog:await query('SELECT kind,value,version,created FROM ayan_consents WHERE user_id=? ORDER BY created',[user.id]),
   payments:(await query('SELECT * FROM ayan_payments WHERE org=? ORDER BY created',[mem.org])).map(payView),invoices:(await query('SELECT * FROM ayan_invoices WHERE org=? ORDER BY created',[mem.org])).map(invView),students:out};
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="ayan-data.json"','Cache-Control':'no-store'});res.end(JSON.stringify(data,null,1));
 }
 // Hard delete of accounts whose 30-day window has passed. Payment records stay (accounting) but lose the user link.
 async function purgeDue(at=now()){
  const due=await query('SELECT user_id FROM ayan_profiles WHERE deletion_due IS NOT NULL AND deletion_due<=?',[at]);
  for(const {user_id:uidv} of due){
   for(const k of await query('SELECT id,label FROM ayan_children WHERE owner=?',[uidv]))await Learning.deleteChild(query,{id:uidv},{child:k.id,confirm:k.label});
   for(const k of await query('SELECT child FROM ayan_child_consents WHERE user_id=?',[uidv]))await query('DELETE FROM ayan_child_consents WHERE child=?',[k.child]);
   const m=(await query('SELECT org FROM ayan_members WHERE user_id=?',[uidv]))[0];
   if(m){const others=Number((await query('SELECT COUNT(*) AS n FROM ayan_members WHERE org=? AND user_id<>?',[m.org,uidv]))[0].n);
    await query('DELETE FROM ayan_members WHERE user_id=?',[uidv]);
    if(!others){for(const t of ['ayan_entitlements','ayan_subscriptions'])await query(`DELETE FROM ${t} WHERE org=?`,[m.org]);await query('DELETE FROM ayan_orgs WHERE id=?',[m.org]);}}
   await query("UPDATE ayan_payments SET user_id='deleted' WHERE user_id=?",[uidv]);await query("UPDATE ayan_invoices SET user_id='deleted' WHERE user_id=?",[uidv]);
   for(const t of ['ayan_teacher_state'])await query(`DELETE FROM ${t} WHERE owner=?`,[uidv]);
   await query('DELETE FROM ayan_consents WHERE user_id=?',[uidv]);await query('DELETE FROM ayan_profiles WHERE user_id=?',[uidv]);
   for(const t of ['"session"','"account"'])await query(`DELETE FROM ${t} WHERE "userId"=?`,[uidv]);await query('DELETE FROM "user" WHERE id=?',[uidv]);
  }
  return due.length;
 }

 // ---------- support tickets (stored, no e-mail is sent) ----------
 async function supportTicket(req,res){
  if(limited(req,'support',10,10*MIN))return send(res,429,{code:'rate_limited',error:'Слишком много обращений. Попробуйте позже.'});
  const i=await body(req),email=String(i.email||'').trim().slice(0,200),message=String(i.message||'').trim();
  if(!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email))return send(res,400,{code:'bad_request',field:'email',error:'Проверьте адрес почты'});
  if(!message)return send(res,400,{code:'bad_request',field:'message',error:'Напишите сообщение'});
  if(message.length>2000)return send(res,400,{code:'too_long',field:'message',error:'Сообщение слишком длинное: до 2000 символов'});
  const u=await session(req).catch(()=>null),id='tk_'+uid().replaceAll('-','').slice(0,16);
  await query('INSERT INTO ayan_support_tickets (id,user_id,email,message,created) VALUES (?,?,?,?,?)',[id,u?.id||null,email,message,now()]);
  return send(res,200,{ok:true,id});
 }
 // ---------- router ----------
 async function route(req,res,url,p){
  const m=req.method;
  if(p==='/api/billing/plans'&&m==='GET')return send(res,200,plansView());
  if(p==='/api/consent/cookies')return cookies(req,res,m);
  if(p==='/api/account/register'&&m==='POST')return register(req,res);
  const user=await session(req);if(!user)return send(res,401,{code:'unauthorized',error:'Войдите в аккаунт'});
  const ok=(r)=>send(res,r[0],r[1]);
  if(p==='/api/account/profile'){
   if(m==='GET')return send(res,200,await fullProfile(user));
   if(m==='PATCH'||m==='POST'){const i=await body(req),name=i.name===undefined?user.name:String(i.name||'').trim().slice(0,80);if(!name)return send(res,400,{code:'bad_request',field:'name',error:'Укажите имя'});
    await query('UPDATE "user" SET name=?,"updatedAt"=? WHERE id=?',[name,new Date().toISOString(),user.id]);
    if(i.orgName!==undefined){const mem=await Learning.member(query,user),on=String(i.orgName||'').trim().slice(0,100);if(on&&mem.manages)await query('UPDATE ayan_orgs SET name=? WHERE id=?',[on,mem.org]);}
    return send(res,200,await fullProfile({...user,name}));}
  }
  if(p==='/api/account/onboarding'){
   const pr=await profile(user);
   if(m==='GET')return send(res,200,{done:Number(pr.onboarding_done)===1,answers:J(pr.onboarding)||{},questions:Object.entries(ONBOARD).map(([id,q])=>({id,type:q.type,options:q.options}))});
   if(m==='POST'){const i=await body(req),a=cleanAnswers(i.answers);if(!a)return send(res,400,{code:'bad_request',error:'Ответ не подходит к вопросу'});
    const merged={...(J(pr.onboarding)||{}),...a},done=i.done===true||Number(pr.onboarding_done)===1;
    await query('UPDATE ayan_profiles SET onboarding=?,onboarding_done=? WHERE user_id=?',[JSON.stringify(merged),done?1:0,user.id]);return send(res,200,{ok:true,done});}
  }
  if(p==='/api/account/sessions/revoke'&&m==='POST'){const i=await body(req);if(i.scope!=='all'&&i.scope!=='others')return send(res,400,{code:'bad_request',error:'scope: all или others'});return send(res,200,await revoke(req,res,user,i.scope));}
  if(p==='/api/account/password'&&m==='POST'){const i=await body(req),next=String(i.next||'');
   if(next.length<8||next.length>128)return send(res,400,{code:'weak_password',error:'Новый пароль: от 8 до 128 символов'});
   if(!(await checkPassword(user,i.current)))return send(res,403,{code:'wrong_password',error:'Текущий пароль неверный'});
   try{await auth.api.changePassword({body:{currentPassword:String(i.current),newPassword:next,revokeOtherSessions:true},headers:fromNodeHeaders(req.headers)});}catch{return send(res,400,{code:'weak_password',error:'Не удалось сменить пароль'});}
   return send(res,200,{ok:true});}
  if(p==='/api/account/child-consent'){
   if(m==='POST'){const i=await body(req);if(i.confirmed!==true||!BASIS.includes(String(i.basis||'')))return send(res,400,{code:'consent_required',error:'Подтвердите согласие на обработку данных ребёнка'});
    const c=(await query('SELECT id FROM ayan_children WHERE id=? AND owner=?',[String(i.child||''),user.id]))[0];if(!c)return send(res,404,{code:'not_found',error:'Ученик не найден'});
    return send(res,200,{ok:true,child:c.id,at:await recordChildConsent(user.id,c.id,i.basis)});}
   if(m==='DELETE'){const c=(await query('SELECT id FROM ayan_children WHERE id=? AND owner=?',[String(url.searchParams.get('child')||''),user.id]))[0];if(!c)return send(res,404,{code:'not_found',error:'Ученик не найден'});
    await query('UPDATE ayan_child_consents SET withdrawn=? WHERE child=?',[now(),c.id]);await log(user.id,'child_consent:'+c.id,'withdrawn');return send(res,200,{ok:true,child:c.id,withdrawnAt:now(),next:'Удалите данные ученика: /api/v2/student/delete'});}
  }
  if(p==='/api/account/children-consent'&&m==='GET'){
   const rows=await query('SELECT c.id,c.label,k.basis,k.created,k.withdrawn FROM ayan_children c LEFT JOIN ayan_child_consents k ON k.child=c.id WHERE c.owner=?',[user.id]);
   return send(res,200,{children:rows.map(r=>({id:r.id,label:r.label,consent:r.basis&&!r.withdrawn?{given:true,basis:r.basis,at:Number(r.created)}:null}))});}
  if(p==='/api/account/export'&&m==='GET')return exportData(res,user);
  if(p==='/api/account/delete'&&m==='POST'){const i=await body(req);
   if(String(i.confirm||'')!=='УДАЛИТЬ')return send(res,400,{code:'confirm',error:'Для подтверждения введите слово УДАЛИТЬ'});
   if(!(await checkPassword(user,i.password)))return send(res,403,{code:'wrong_password',error:'Пароль неверный'});
   await profile(user);const t=now(),due=t+30*DAY;
   await query('UPDATE ayan_profiles SET deletion_requested=?,deletion_due=? WHERE user_id=?',[t,due,user.id]);
   const mem=await Learning.member(query,user);await query('UPDATE ayan_subscriptions SET cancel_at_end=1,canceled_at=?,updated=? WHERE org=? AND cancel_at_end=0',[t,t,mem.org]);
   await log(user.id,'account_delete','requested');await revoke(req,res,user,'all');return send(res,200,{ok:true,dueAt:due});}
  if(p==='/api/account/delete/cancel'&&m==='POST'){await query('UPDATE ayan_profiles SET deletion_requested=NULL,deletion_due=NULL WHERE user_id=?',[user.id]);await log(user.id,'account_delete','cancelled');return send(res,200,{ok:true});}
  if(p==='/api/billing/subscription'&&m==='GET')return send(res,200,await subscriptionView(await Learning.member(query,user)));
  if(p==='/api/billing/payments'&&m==='GET'){const mem=await Learning.member(query,user);return send(res,200,{payments:(await query('SELECT * FROM ayan_payments WHERE org=? ORDER BY created DESC',[mem.org])).map(payView)});}
  if(p.startsWith('/api/billing/invoices/')&&m==='GET'){const mem=await Learning.member(query,user),r=(await query('SELECT * FROM ayan_invoices WHERE id=? AND org=?',[decodeURIComponent(p.slice(22)),mem.org]))[0];return r?send(res,200,{invoice:invView(r)}):send(res,404,{code:'not_found',error:'Счёт не найден'});}
  if(p==='/api/billing/checkout'&&m==='POST')return checkout(req,res,user);
  if(p==='/api/billing/confirm'&&m==='POST')return confirm(req,res,user);
  if(p==='/api/billing/cancel'&&m==='POST')return cancel(res,user,true);
  if(p==='/api/billing/resume'&&m==='POST')return cancel(res,user,false);
  return send(res,404,{code:'not_found',error:'Not found'});
 }
 return {migrate,route,supportTicket,purgeDue,recordChildConsent,childConsentInput,grant,profile};
}
