// Video lesson player. Never starts by itself (no autoplay, no sound on hover or tab switch). Captions are on by default
// and live on a dark plate outside the controls. Position is saved per video + version + language and restored after
// reload (rounded to a second). Watching is engagement only; the mini-test is separate and graded on the server.
import {esc,icon,L,lang,api,sid,announce} from './ui.mjs';
export const VIDEOS={
 M01:{id:'M01',version:'0.2.0',lessonId:'math-fractions-01',status:'review',src:'/media/M01/0.2.0/lesson.mp4',srcCalm:'/media/M01/0.2.0/lesson.calm.mp4',poster:'/media/M01/0.2.0/poster.jpg',
  captions:{ru:'/media/M01/0.2.0/captions.ru.vtt',kk:'/media/M01/0.2.0/captions.kk.vtt'},transcript:{ru:'/media/M01/0.2.0/transcript.ru.md',kk:'/media/M01/0.2.0/transcript.kk.md'},
  title:{ru:'Одна четверть',kk:'Бір ширек'},audioLang:'ru',
  chapters:[{at:0,title:{ru:'Что такое целое',kk:'Бүтін деген не'}},{at:7.4,title:{ru:'Равные части',kk:'Тең бөліктер'}},{at:14.4,title:{ru:'Одна четверть',kk:'Бір ширек'}},{at:25.3,title:{ru:'Как записать дробь',kk:'Бөлшекті қалай жазады'}},{at:39.9,title:{ru:'Части должны быть равными',kk:'Бөліктер тең болуы керек'}},{at:47,title:{ru:'Попробуй сам',kk:'Өзің байқап көр'}}]}
};
const T={play:['Смотреть','Көру'],pause:['Пауза','Кідірту'],back10:['Назад на 10 секунд','10 секунд артқа'],back10s:['10 сек','10 сек'],speed:['Скорость','Жылдамдық'],
 cc:['Субтитры','Субтитрлер'],ccOff:['Субтитры выключены','Субтитрлер өшірулі'],mute:['Без звука','Дыбыссыз'],unmute:['Включить звук','Дыбысты қосу'],seek:['Позиция в видео','Бейнедегі орын'],
 chapters:['Этапы видео','Бейне кезеңдері'],repeat:['Повторить фрагмент','Үзіндіні қайталау'],model:['Открыть модель','Модельді ашу'],text:['Текст урока','Сабақ мәтіні'],
 resumed:['Продолжаем с {s}. Видео начнётся только по кнопке.','{s} бастап жалғастырамыз. Бейне тек түймемен басталады.'],
 review:['Демо: видео ждёт проверки учителем','Демо: бейне мұғалім тексеруін күтуде'],calmCut:['Версия с неподвижной камерой','Камерасы қозғалмайтын нұсқа'],audioRu:['Озвучка на русском, субтитры на казахском','Дыбыс орысша, субтитр қазақша'],
 unavailable:['Видео не загрузилось. Ниже текст урока и практика.','Бейне жүктелмеді. Төменде сабақ мәтіні және практика бар.'],chapter:['Фрагмент: {t}','Үзінді: {t}']};
const t=(k,v)=>{let s=(T[k]||[k,k])[lang()==='kk'?1:0];if(v)for(const x in v)s=s.replaceAll('{'+x+'}',v[x]);return s;};
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};

export function mount(host,{videoId,profile={},onEvent,onModel,onText,compact=false,childApi=true}){
 const v=VIDEOS[videoId];if(!v){host.innerHTML='';return {destroy(){}};}
 const startMuted=profile.sound===false; // sound switched off (for example "too loud"): the video starts muted, one tap unmutes
 let ccOn=profile.captions!==false,ccLang=lang(),dead=false,lastSaved=-1,timer=null;
 // Calm mode, minimal motion or the system setting: the cut with a still camera (same sound, same timing, same captions).
 const calm=!!v.srcCalm&&(document.documentElement.dataset.motion==='off'||profile.motionIntensity==='low'||profile.decorative===false||matchMedia('(prefers-reduced-motion: reduce)').matches);
 host.innerHTML=`<div class="stack" style="gap:16px"><p class="row"><span class="badge sand">${esc(t('review'))}</span>${lang()==='kk'?`<span class="badge grey">${esc(t('audioRu'))}</span>`:''}${calm?`<span class="badge grey">${esc(t('calmCut'))}</span>`:''}</p>
 <div class="player"><video preload="metadata" playsinline poster="${esc(v.poster)}" crossorigin="anonymous" aria-label="${esc(L(v.title))}"><source src="${esc(calm?v.srcCalm:v.src)}" type="video/mp4">${['ru','kk'].map(l=>`<track kind="captions" srclang="${l}" label="${l==='kk'?'Қазақша':'Русский'}" src="${esc(v.captions[l])}"${l===ccLang&&ccOn?' default':''}>`).join('')}</video></div>
 <div class="controls" role="group" aria-label="${esc(L(v.title))}">
  <button type="button" class="btn small inline" data-v="play" aria-label="${esc(t('play'))}">${icon('video')}<span>${esc(t('play'))}</span></button>
  <span class="time tnum" data-time>00:00 / 00:00</span>
  <input type="range" class="seek" min="0" max="100" step="1" value="0" data-v="seek" aria-label="${esc(t('seek'))}">
  <button type="button" class="chip" data-v="back" aria-label="${esc(t('back10'))}">${icon('back')}${esc(t('back10s'))}</button>
  <button type="button" class="chip tnum" data-v="speed" aria-label="${esc(t('speed'))}">1×</button>
  <button type="button" class="chip" data-v="cc" aria-pressed="${ccOn}">CC · ${ccLang.toUpperCase()}</button>
  <button type="button" class="chip" data-v="lang" aria-label="${esc(t('cc'))}: ${ccLang==='kk'?'Русский':'Қазақша'}">${ccLang==='kk'?'RU':'KK'}</button>
  <button type="button" class="chip" data-v="mute" aria-pressed="${startMuted}">${icon(startMuted?'quiet':'sound')}<span>${esc(startMuted?t('unmute'):t('mute'))}</span></button>
 </div><p class="status-line" data-vstatus role="status"></p></div>`;
 const vid=host.querySelector('video'),seek=host.querySelector('[data-v=seek]'),timeEl=host.querySelector('[data-time]'),statusEl=host.querySelector('[data-vstatus]');
 vid.autoplay=false;vid.muted=startMuted;
 function applyTracks(){for(const tr of vid.textTracks)tr.mode=ccOn&&tr.language===ccLang?'showing':'disabled';const b=host.querySelector('[data-v=cc]');b.setAttribute('aria-pressed',String(ccOn));b.textContent=ccOn?'CC · '+ccLang.toUpperCase():t('ccOff');}
 vid.addEventListener('loadedmetadata',async()=>{seek.max=String(Math.floor(vid.duration||0));applyTracks();updateTime();
  if(childApi){try{const r=await api('/api/video/progress');const row=(r.data||[]).find(x=>x.videoId===v.id&&x.version===v.version&&x.lang===(lang()))||(r.data||[]).find(x=>x.videoId===v.id&&x.version===v.version);
   const pos=row?.position??row?.seconds;if(pos>1&&pos<vid.duration-1){vid.currentTime=pos;statusEl.textContent=t('resumed',{s:fmt(pos)});}}catch{}}});
 vid.addEventListener('error',()=>{statusEl.textContent=t('unavailable');statusEl.classList.add('warn');});
 host.querySelector('source').addEventListener('error',()=>{statusEl.textContent=t('unavailable');statusEl.classList.add('warn');});
 function updateTime(){timeEl.textContent=fmt(vid.currentTime)+' / '+fmt(vid.duration);if(document.activeElement!==seek)seek.value=String(Math.floor(vid.currentTime));}
 vid.addEventListener('timeupdate',()=>{updateTime();if(Math.abs(vid.currentTime-lastSaved)>=5)save(false);host.dispatchEvent(new CustomEvent('chapter',{detail:chapterAt(vid.currentTime)}));});
 vid.addEventListener('play',()=>setPlay(true));vid.addEventListener('pause',()=>{setPlay(false);save(false);});vid.addEventListener('ended',()=>save(true));
 function setPlay(on){const b=host.querySelector('[data-v=play]');b.innerHTML=(on?icon('pause'):icon('video'))+`<span>${esc(on?t('pause'):t('play'))}</span>`;b.setAttribute('aria-label',on?t('pause'):t('play'));}
 async function save(completed){if(!childApi||!vid.duration)return;lastSaved=vid.currentTime;try{await api('/api/video/progress',{body:{videoId:v.id,version:v.version,lang:lang(),seconds:Math.floor(vid.currentTime),duration:Math.floor(vid.duration),completed:!!completed}});}catch{}}
 const chapterAt=s=>{let c=0;v.chapters.forEach((ch,i)=>{if(s>=ch.at-.05)c=i;});return c;};
 host.onclick=e=>{const b=e.target.closest('[data-v]');if(!b||dead)return;const k=b.dataset.v;
  if(k==='play'){if(vid.paused){vid.play().catch(()=>{});onEvent?.('video_played',{videoId:v.id});}else{vid.pause();onEvent?.('video_paused',{videoId:v.id});}}
  if(k==='back'){vid.currentTime=Math.max(0,vid.currentTime-10);}
  if(k==='speed'){const opts=[.75,1,1.25];const n=opts[(opts.indexOf(vid.playbackRate)+1)%3]||1;vid.playbackRate=n;b.textContent=String(n).replace('.',',')+'×';announce(t('speed')+' '+n);}
  if(k==='cc'){ccOn=!ccOn;applyTracks();}
  if(k==='lang'){ccLang=ccLang==='kk'?'ru':'kk';ccOn=true;applyTracks();b.textContent=ccLang==='kk'?'RU':'KK';b.setAttribute('aria-label',t('cc')+': '+(ccLang==='kk'?'Русский':'Қазақша'));}
  if(k==='mute'){vid.muted=!vid.muted;b.setAttribute('aria-pressed',String(vid.muted));b.innerHTML=icon(vid.muted?'quiet':'sound')+`<span>${esc(vid.muted?t('unmute'):t('mute'))}</span>`;}
 };
 seek.addEventListener('input',()=>{vid.currentTime=Number(seek.value);updateTime();});
 const api2={el:vid,video:v,calm,
  pause(){vid.pause();},
  repeatFragment(){const c=chapterAt(vid.currentTime);vid.currentTime=v.chapters[c].at;vid.play().catch(()=>{});onEvent?.('video_fragment_repeated',{videoId:v.id,chapter:c});announce(t('chapter',{t:L(v.chapters[c].title)}));},
  goChapter(i){vid.currentTime=v.chapters[i].at;updateTime();announce(t('chapter',{t:L(v.chapters[i].title)}));},
  chapterAt,
  destroy(){dead=true;clearInterval(timer);save(false);vid.pause();vid.removeAttribute('src');host.onclick=null;host.innerHTML='';}};
 window.dispatchEvent(new CustomEvent('ayan:media',{detail:vid}));
 void onModel;void onText;void compact;void sid;
 return api2;
}
export async function transcript(videoId){const v=VIDEOS[videoId];try{const r=await fetch(v.transcript[lang()]);return r.ok?(await r.text()).replace(/^#.*\n+/,''):'';}catch{return '';}}
