const test=require('node:test'),assert=require('node:assert');
test('addColumn swallows only "column already exists"; every other database error stops the migration',async()=>{
 const {addColumn}=await import('../db-util.mjs');
 const failing=msg=>async()=>{throw Object.assign(new Error(msg),msg==='pg dup'?{code:'42701'}:{});};
 for(const msg of ['duplicate column name: stage','column "stage" of relation "ayan_attempts" already exists','pg dup'])await addColumn(failing(msg),'t','c','TEXT');
 for(const msg of ['permission denied for table ayan_attempts','no such table: ayan_attempts','connection terminated unexpectedly'])await assert.rejects(()=>addColumn(failing(msg),'t','c','TEXT'),Error,msg);
});
