// Creates the jury teacher account: plan Max for one year, a class with students and learning history (real mode, not demo).
// Usage: npm run seed:jury   (PORT/AYAN_DB_FILE as for the server; default database .data/ayan.sqlite)
// The generated password goes ONLY to the git-ignored files: ../KEYS.md and .env.jury.local. It is not printed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
process.env.AYAN_SEED_ONLY='1';
const {auth,query,Billing}=await import('../server.mjs');
const Learning=await import('../learning.mjs'),Support=await import('../support.mjs');
const EMAIL=process.env.AYAN_JURY_EMAIL||'jury@ayan-edu.test',NAME='Жюри (учитель)',DAY=86400000;
const PASSWORD_FILE='.env.jury.local',KEYS=path.resolve('..','KEYS.md');
const readPw=()=>{try{return /AYAN_JURY_PASSWORD=(.+)/.exec(fs.readFileSync(PASSWORD_FILE,'utf8'))?.[1]?.trim();}catch{return null;}};
let password=readPw();
let u=(await query('SELECT id FROM "user" WHERE email=?',[EMAIL]))[0];
if(u&&!password)throw Error('Jury account exists but '+PASSWORD_FILE+' has no password. Delete the account row or restore the file.');
if(!u){
 password=crypto.randomBytes(12).toString('base64url');
 await auth.api.signUpEmail({body:{email:EMAIL,password,name:NAME}});
 u=(await query('SELECT id FROM "user" WHERE email=?',[EMAIL]))[0];
 const t=Date.now(),org='jury-org-'+crypto.randomUUID().slice(0,8);
 await query('INSERT INTO ayan_orgs (id,name,demo,created) VALUES (?,?,?,?)',[org,'Школа-лицей (жюри)',0,t]);
 await query('INSERT INTO ayan_members (user_id,org,role,created) VALUES (?,?,?,?)',[u.id,org,'owner',t]);
 await query('INSERT INTO ayan_profiles (user_id,account_role,terms_version,terms_at,privacy_version,privacy_at,child_data,child_data_at,onboarding,onboarding_done,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[u.id,'school','2026-11',t,'2026-11',t,1,t,JSON.stringify({goal:'inclusion',subjects:['math'],grade:'3-4',experience:'some',children:'2-5'}),1,t]);
}
const mem=await Learning.member(query,{id:u.id});
// plan Max for a year (payment record with a normal receipt, like a confirmed invoice)
if(!(await query('SELECT org FROM ayan_subscriptions WHERE org=?',[mem.org])).length){
 const t=Date.now(),end=t+365*DAY,amount=29900,vat=Math.round(amount*0.16/1.16),inv='inv_jury'+crypto.randomBytes(6).toString('hex'),num='AY-'+new Date().getUTCFullYear()+'-JURY01';
 await query('INSERT INTO ayan_invoices (id,number,org,user_id,plan,period,method,amount,vat,vat_rate,status,created,expires,paid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[inv,num,mem.org,u.id,'max','year','invoice',amount,vat,'0.16','paid',t,t,t]);
 await query('INSERT INTO ayan_payments (id,invoice,org,user_id,plan,period,amount,vat,method,status,receipt,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[crypto.randomUUID(),inv,mem.org,u.id,'max','year',amount,vat,'invoice','paid',num,t]);
 await query('INSERT INTO ayan_subscriptions (org,user_id,plan,period,amount,vat,method,started,period_end,cancel_at_end,canceled_at,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[mem.org,u.id,'max','year',amount,vat,'invoice',t,end,0,null,t]);
 await Billing.grant(mem.org,'max',t,end,inv);
}
// class + history (same scenario as demo-seed students 01-03, but real-mode records)
if(!(await query('SELECT id FROM ayan_children WHERE owner=?',[u.id])).length){
 const ctx={user:{id:u.id},mem,ent:await Learning.entitlement(query,mem.org)},t=Date.now(),kids={};
 for(const [k,label] of [['a','Айдана'],['b','Нұрлан'],['c','Амина']]){
  const id='jury-'+k+'-'+crypto.randomUUID().slice(0,8);kids[k]={id,label};
  await query('INSERT INTO ayan_children (id,owner,label,state,demo) VALUES (?,?,?,?,?)',[id,u.id,label,JSON.stringify({version:2,enabled:[],completed:[],garden:[],motion:true}),0]);
  await Billing.recordChildConsent(u.id,id,'guardian_consent');}
 const assign=async(k,lesson,op)=>(await Learning.assign(query,{...ctx,input:{opId:op,childIds:[kids[k].id],lessonId:lesson}}))[1].assignments[0];
 const a2=await assign('b','math-fractions-01','jury-assign-02'),a3=await assign('c','math-fractions-01','jury-assign-03'),a1=await assign('a','math-fractions-01','jury-assign-01');
 await assign('a','bio-plants-01','jury-assign-11');
 const k2=kids.b,att2='jury-attempt-b-'+crypto.randomUUID().slice(0,6);
 await Learning.startAttempt(query,k2,{attemptId:att2,assignmentId:a2.id,locale:'ru'});
 const ev=(type,payload,task)=>Learning.events(query,k2,{events:[{eventId:crypto.randomUUID(),type,payload,attemptId:att2,taskId:task}]});
 const sub=(task,answer,n,h=0)=>Learning.submit(query,k2,{attemptId:att2,taskId:task,submissionId:'jury-sub-'+task+'-'+n,answer,hintLevel:h});
 await ev('explanation_mode_changed',{fromMode:'text',toMode:'picture'});
 await sub('f1','mark:0',1);await sub('f2','mark:0,1',1);await ev('hint_requested',{level:1},'f2');await sub('f2','mark:1',2,1);await sub('f2-twin','mark:0',1);
 await ev('break_started',{stageId:'practice'});await ev('break_ended',{stageId:'practice'});await sub('f3','mark:0,2',1);await sub('f4','mark:0,1,2',1);
 await sub('c1','mark:2',1);await sub('c2','mark:0',1);
 await Support.saveProfile(query,k2.id,{preset:'calm',applyPreset:true,mascotVoice:false},'child');
 await Learning.addNote(query,{id:u.id},{child:k2.id,text:'После примера выполнил следующее задание самостоятельно.'});
 const k3=kids.c,att3='jury-attempt-c-'+crypto.randomUUID().slice(0,6);
 await Learning.startAttempt(query,k3,{attemptId:att3,assignmentId:a3.id,locale:'ru'});
 await Learning.submit(query,k3,{attemptId:att3,taskId:'f1',submissionId:'jury-sub-c-f1',answer:'mark:1'});
 await Learning.help(query,k3,{requestId:crypto.randomUUID(),phraseId:'help',attemptId:att3,stage:'practice'});
}
if(!readPw()||!fs.existsSync(PASSWORD_FILE)){fs.writeFileSync(PASSWORD_FILE,`# local only, git-ignored\nAYAN_JURY_EMAIL=${EMAIL}\nAYAN_JURY_PASSWORD=${password}\n`,{mode:0o600});}
const block=`\n## Аян: аккаунт жюри (${new Date().toISOString().slice(0,10)})\n- сайт: https://<адрес сайта>/login (локально http://127.0.0.1:4315/login)\n- логин: ${EMAIL}\n- пароль: ${password}\n- тариф: Макс на год, класс из 3 учеников с историей\n`;
const cur=fs.existsSync(KEYS)?fs.readFileSync(KEYS,'utf8'):'';
if(!cur.includes('Аян: аккаунт жюри')||!cur.includes(password))fs.appendFileSync(KEYS,block);
console.log('Jury account ready: '+EMAIL+'. Password saved to '+PASSWORD_FILE+' and '+KEYS);
process.exit(0);
