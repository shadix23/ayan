// Small shared database helpers (same query(sql, params) helper on SQLite and Postgres).
// addColumn swallows ONLY "the column already exists". Permission, connection and missing-table errors must stop the migration,
// otherwise the server would start and fail later on a column that was never created.
const isDuplicateColumn=e=>e?.code==='42701'||/duplicate column|already exists/i.test(String(e?.message||''));
export async function addColumn(query,table,col,type){try{await query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);}catch(e){if(!isDuplicateColumn(e))throw e;}}
