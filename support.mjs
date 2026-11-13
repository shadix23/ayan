// Support profile and video viewing (brief: security-and-ux/PROGRESS_AND_UX.md, DATA_CONTRACTS.md).
// A support profile holds only comfort preferences. No diagnosis, no "level", nothing that lowers access to content.
// The child may change the safe part; the teacher (owner of the student) may change everything.
const DEFAULTS={lang:'ru',textSize:'normal',captions:true,sound:true,motion:true,pace:'normal',input:'buttons',repeatInstruction:false};
const RULES={lang:['ru','kk'],textSize:['normal','large'],pace:['normal','slow'],input:['buttons','drag'],captions:'bool',sound:'bool',motion:'bool',repeatInstruction:'bool'};
const CHILD_FIELDS=['lang','textSize','captions','sound','motion'];

export async function migrate(query){
 await query('CREATE TABLE IF NOT EXISTS ayan_support (child TEXT PRIMARY KEY, data TEXT NOT NULL, updated BIGINT NOT NULL, updated_by TEXT NOT NULL)');
 await query('CREATE TABLE IF NOT EXISTS ayan_video_views (id TEXT PRIMARY KEY, child TEXT NOT NULL, video TEXT NOT NULL, version TEXT NOT NULL, seconds INTEGER NOT NULL, duration INTEGER NOT NULL, completed INTEGER NOT NULL, updated BIGINT NOT NULL)');
}
function clean(input,fields){const out={};for(const k of fields){const v=input?.[k],rule=RULES[k];if(v===undefined)continue;if(rule==='bool'){if(typeof v==='boolean')out[k]=v;}else if(rule.includes(v))out[k]=v;}return out;}
export async function getProfile(query,child){const row=(await query('SELECT data FROM ayan_support WHERE child=?',[child]))[0];return {...DEFAULTS,...(row?JSON.parse(row.data):{})};}
export async function saveProfile(query,child,input,by){
 const fields=by==='child'?CHILD_FIELDS:Object.keys(RULES);
 const next={...(await getProfile(query,child)),...clean(input,fields)};
 await query('INSERT INTO ayan_support (child,data,updated,updated_by) VALUES (?,?,?,?) ON CONFLICT(child) DO UPDATE SET data=excluded.data,updated=excluded.updated,updated_by=excluded.updated_by',[child,JSON.stringify(next),Date.now(),by]);
 return next;
}
// Viewing progress: one row per child + video + version; seconds only grow; "completed" never goes back.
// This is engagement, not mastery: the report shows it apart from answers.
const VID=/^[A-Za-z0-9_-]{1,40}$/,VER=/^[A-Za-z0-9._-]{1,40}$/;
export async function recordView(query,child,input){
 const video=String(input.videoId||''),version=String(input.version||'');
 if(!VID.test(video)||!VER.test(version))return {status:400,data:{code:'bad_request'}};
 const seconds=Math.max(0,Math.min(36000,Math.floor(Number(input.seconds)||0))),duration=Math.max(0,Math.min(36000,Math.floor(Number(input.duration)||0)));
 const id=[child,video,version].join(':'),completed=input.completed===true?1:0;
 await query('INSERT INTO ayan_video_views (id,child,video,version,seconds,duration,completed,updated) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET seconds=CASE WHEN excluded.seconds>ayan_video_views.seconds THEN excluded.seconds ELSE ayan_video_views.seconds END, duration=excluded.duration, completed=CASE WHEN ayan_video_views.completed=1 THEN 1 ELSE excluded.completed END, updated=excluded.updated',[id,child,video,version,seconds,duration,completed,Date.now()]);
 const row=(await query('SELECT seconds,completed FROM ayan_video_views WHERE id=?',[id]))[0];
 return {status:200,data:{videoId:video,version,seconds:Number(row.seconds),completed:Number(row.completed)===1}};
}
export async function views(query,child){return (await query('SELECT video,version,seconds,duration,completed,updated FROM ayan_video_views WHERE child=? ORDER BY updated DESC',[child])).map(v=>({videoId:v.video,version:v.version,seconds:Number(v.seconds),duration:Number(v.duration),completed:Number(v.completed)===1,updated:Number(v.updated)}));}
