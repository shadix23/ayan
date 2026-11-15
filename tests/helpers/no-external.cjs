// Preload for tests: records every outgoing request to a non-local host (fetch, http, https).
// The test server runs with fake paid-provider keys; this file proves that none of them is called.
const fs=require('node:fs'),http=require('node:http'),https=require('node:https');
const log=process.env.AYAN_EXTERNAL_LOG;const local=h=>/^(127\.0\.0\.1|localhost|\[::1\]|::1)$/.test(String(h||'').replace(/:\d+$/,''));
const record=(kind,host)=>{if(!local(host)&&log)fs.appendFileSync(log,kind+' '+host+'\n');};
const of=globalThis.fetch;globalThis.fetch=async(input,init)=>{try{const u=new URL(typeof input==='string'?input:input.url);record('fetch',u.host);}catch{}return of(input,init);};
for(const [name,mod] of [['http',http],['https',https]]){const orig=mod.request;mod.request=function(a,b,c){try{const o=typeof a==='string'||a instanceof URL?new URL(a):a;record(name,o.hostname||o.host);}catch{}return orig.apply(this,arguments);};}
