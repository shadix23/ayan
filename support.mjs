// Support profile and video viewing.
// A support profile holds only comfort preferences and how help is offered. No diagnosis, no "level", nothing that lowers
// access to content. Calm mode is a preset the child (or adult) CHOOSES; it is never derived from a diagnosis.
// The child may change the comfort part; the teacher (owner of the student) may also change pace, input and the phrase list.
// Sync: the client sends only the keys it changed plus the settingsVersion it saw. The server merges per field, so two tabs
// changing different settings both win; the same field changed twice keeps the later accepted write. The version grows.
import crypto from 'node:crypto';
import {addColumn} from './db-util.mjs';
const PHRASES=['not_understood','repeat','example','help','break','too_loud','ready'];
export const PRESETS={
 standard:{sfx:false,music:false,decorative:true,motionIntensity:'normal',saturation:'standard',complexity:'standard',mascotMotion:'normal'},
 calm:{sfx:false,music:false,decorative:false,motionIntensity:'low',saturation:'calm',complexity:'simplified',mascotMotion:'minimal'}
};
const DEFAULTS={lang:'ru',textSize:'normal',captions:true,sound:true,motion:true,pace:'normal',input:'buttons',repeatInstruction:false,
 preset:null,...PRESETS.standard,timers:'hidden',autoplay:false,voiceRate:1,mascotVisible:true,mascotVoice:false,hints:'on_request',textOnly:false,
 phrases:PHRASES,settingsVersion:0};
const RULES={lang:['ru','kk'],textSize:['normal','large','xlarge'],pace:['normal','slow'],input:['buttons','drag'],captions:'bool',sound:'bool',motion:'bool',repeatInstruction:'bool',
 preset:['standard','calm'],sfx:'bool',music:'bool',decorative:'bool',motionIntensity:['low','soft','normal'],saturation:['calm','standard'],complexity:['simplified','standard'],mascotMotion:['minimal','normal'],
 timers:['hidden','shown'],autoplay:'bool',voiceRate:[0.75,1,1.25],mascotVisible:'bool',mascotVoice:'bool',hints:['on_request','offer'],textOnly:'bool',phrases:'phrases'};
const ADULT_ONLY=['pace','input','repeatInstruction','phrases'];
const CHILD_FIELDS=Object.keys(RULES).filter(k=>!ADULT_ONLY.includes(k));

export async function migrate(query){
 await query('CREATE TABLE IF NOT EXISTS ayan_support (child TEXT PRIMARY KEY, data TEXT NOT NULL, updated BIGINT NOT NULL, updated_by TEXT NOT NULL)');
 await addColumn(query,'ayan_support','version','INTEGER');await addColumn(query,'ayan_support','token','TEXT');
 await query('CREATE TABLE IF NOT EXISTS ayan_video_views (id TEXT PRIMARY KEY, child TEXT NOT NULL, video TEXT NOT NULL, version TEXT NOT NULL, seconds INTEGER NOT NULL, duration INTEGER NOT NULL, completed INTEGER NOT NULL, updated BIGINT NOT NULL)');
 await addColumn(query,'ayan_video_views','position','INTEGER');
}
function clean(input,fields){const out={};for(const k of fields){const v=input?.[k],rule=RULES[k];if(v===undefined)continue;
 if(rule==='bool'){if(typeof v==='boolean')out[k]=v;}
 else if(rule==='phrases'){if(Array.isArray(v)&&v.every(x=>PHRASES.includes(x))){const set=[...new Set(v)];if(!set.includes('help'))set.unshift('help');if(!set.includes('break'))set.push('break');out[k]=PHRASES.filter(p=>set.includes(p));}}
 else if(rule.includes(v))out[k]=v;}return out;}
export async function getProfile(query,child){const row=(await query('SELECT data,updated,updated_by,version FROM ayan_support WHERE child=?',[child]))[0];const data={...DEFAULTS,...(row?JSON.parse(row.data):{})};
 return {...data,settingsVersion:Number(row?.version)||Number(data.settingsVersion)||0,updatedAt:row?Number(row.updated):null,updatedBy:row?row.updated_by:null};}
// Write = read, merge the changed keys, then a conditional update that only succeeds if nobody wrote in between (version column
// plus a unique token to see who won). A lost race re-reads and merges again, so two tabs changing different settings both win.
export async function saveProfile(query,child,input,by){
 const fields=by==='child'?CHILD_FIELDS:Object.keys(RULES);
 for(let attempt=0;attempt<6;attempt++){
  const row=(await query('SELECT data,version FROM ayan_support WHERE child=?',[child]))[0];
  const base=Number(row?.version)||0,current={...DEFAULTS,...(row?JSON.parse(row.data):{})};delete current.updatedAt;delete current.updatedBy;
  let change=clean(input,fields);
  // Choosing a preset applies its values; individual keys sent together with it override the preset.
  if(change.preset&&input.applyPreset===true)change={...PRESETS[change.preset],...change};
  // "motion" of the earlier cabinet mirrors decorative motion. "sound" (lesson and video audio allowed) is its own switch: only
  // the child's "too loud" or the sound setting change it, never the effect or voice settings.
  if('decorative' in change)change.motion=change.decorative;
  if(!Object.keys(change).length)return {...current,settingsVersion:base,changedKeys:[],merged:Number(input.settingsVersion)!==base};
  const next={...current,...change,settingsVersion:base+1},mine=crypto.randomUUID(),t=Date.now();
  if(!row)await query('INSERT INTO ayan_support (child,data,updated,updated_by,version,token) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING',[child,JSON.stringify(next),t,by,base+1,mine]);
  else await query('UPDATE ayan_support SET data=?,updated=?,updated_by=?,version=?,token=? WHERE child=? AND COALESCE(version,0)=?',[JSON.stringify(next),t,by,base+1,mine,child,base]);
  const won=(await query('SELECT token FROM ayan_support WHERE child=?',[child]))[0];
  if(won?.token===mine)return {...next,changedKeys:Object.keys(change),merged:Number(input.settingsVersion)!==base};
 }
 throw Object.assign(new Error('settings busy'),{status:409,code:'busy'});
}
// Viewing progress: one row per child + video + version + language. "seconds" (how far watched) only grows and "completed"
// never goes back; "position" is the last reported second, so a child who rewinds resumes where they stopped.
// This is engagement, not mastery.
const VID=/^[A-Za-z0-9_-]{1,40}$/,VER=/^[A-Za-z0-9._-]{1,40}$/;
export async function recordView(query,child,input){
 const video=String(input.videoId||''),version=String(input.version||''),lang=input.lang==='kk'?'kk':'ru';
 if(!VID.test(video)||!VER.test(version))return {status:400,data:{code:'bad_request'}};
 const seconds=Math.max(0,Math.min(36000,Math.floor(Number(input.seconds)||0))),duration=Math.max(0,Math.min(36000,Math.floor(Number(input.duration)||0)));
 const id=[child,video,version].join(':')+(input.lang?':'+lang:''),completed=input.completed===true?1:0;
 await query('INSERT INTO ayan_video_views (id,child,video,version,seconds,duration,completed,updated,position) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET seconds=CASE WHEN excluded.seconds>ayan_video_views.seconds THEN excluded.seconds ELSE ayan_video_views.seconds END, position=excluded.position, duration=excluded.duration, completed=CASE WHEN ayan_video_views.completed=1 THEN 1 ELSE excluded.completed END, updated=excluded.updated',[id,child,video,version,seconds,duration,completed,Date.now(),seconds]);
 const row=(await query('SELECT seconds,position,completed FROM ayan_video_views WHERE id=?',[id]))[0];
 return {status:200,data:{videoId:video,version,lang,seconds:Number(row.seconds),position:Number(row.position??row.seconds),completed:Number(row.completed)===1}};
}
export async function views(query,child){return (await query('SELECT id,video,version,seconds,position,duration,completed,updated FROM ayan_video_views WHERE child=? ORDER BY updated DESC',[child])).map(v=>({videoId:v.video,version:v.version,lang:String(v.id).split(':')[3]||'ru',seconds:Number(v.seconds),position:Number(v.position??v.seconds),duration:Number(v.duration),completed:Number(v.completed)===1,updated:Number(v.updated)}));}
