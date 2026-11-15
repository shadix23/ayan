// The demo seed deletes tables. These checks prove it can never touch a real local database.
// Usage: node tests/demo-guard.mjs
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const results=[];const check=(id,ok,detail)=>{results.push(ok);console.log((ok?'PASS ':'FAIL ')+id+(detail?'  '+detail:''));};
const env=(extra)=>({...process.env,BETTER_AUTH_SECRET:'guard-test-secret-0123456789abcdefghijkl',DATABASE_URL:'',...extra});
function run(extra,waitReady){return new Promise(res=>{const p=spawn(process.execPath,['server.mjs'],{env:env(extra),stdio:['ignore','pipe','pipe']});let out='';const done=code=>res({code,out,p});
 p.stdout.on('data',d=>{out+=d;if(waitReady&&out.includes('Ayan http'))done(null);});p.stderr.on('data',d=>out+=d);p.on('exit',c=>{if(c!==null)done(c);});setTimeout(()=>done('timeout'),20000);});}
fs.mkdirSync('.data',{recursive:true});
// 1. the path guard
const real='.data/guard-real.sqlite';fs.rmSync(real,{force:true});
const a=await run({AYAN_DEMO:'1',AYAN_DB_FILE:'.data/ayan.sqlite',PORT:'4331'});
check('GUARD-1 AYAN_DEMO=1 with AYAN_DB_FILE=.data/ayan.sqlite is refused at start',a.code!==null&&a.code!==0&&a.code!=='timeout'&&/AYAN_DB_FILE/.test(a.out),'exit '+a.code);
const b=await run({AYAN_DEMO:'1',AYAN_DB_FILE:'../ayan.sqlite',PORT:'4332'});
check('GUARD-1b a path outside .data/ is refused',b.code!==null&&b.code!==0&&b.code!=='timeout');
// 2. the content guard: a database that already holds a real account is not seeded, not even on the first seed
const dbFile='.data/test-guard.sqlite';fs.rmSync(dbFile,{force:true});
const s1=await run({AYAN_DB_FILE:dbFile,PORT:'4333'},true);
const origin='http://127.0.0.1:4333';
const su=await fetch(origin+'/api/auth/sign-up/email',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({email:'real.teacher@example.test',password:'a-real-password-1',name:'Real'})});
s1.p.kill();await new Promise(r=>setTimeout(r,800));
const d=await run({AYAN_DEMO:'1',AYAN_DB_FILE:dbFile,PORT:'4334'});
const db=new DatabaseSync(dbFile);const left=db.prepare('SELECT COUNT(*) AS n FROM "user" WHERE email=?').get('real.teacher@example.test').n;db.close();
check('GUARD-2 the seed refuses a database with a real account and deletes nothing',su.ok&&d.code!==null&&d.code!==0&&/Refusing to seed/.test(d.out)&&left===1,'exit '+d.code+', real accounts left: '+left);
fs.rmSync(dbFile,{force:true});
console.log(JSON.stringify({checks:results.length,failed:results.filter(x=>!x).length}));process.exit(results.every(Boolean)?0:1);
