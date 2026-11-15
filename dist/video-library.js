// Video tab for the child (brief: MASTER_PROMPT §5, video-lessons/PIPELINE.md).
// A video is shown as published only when it has a real file (`src`) and status 'published'.
// Until then the card honestly says the video is being prepared and offers the text explanation.
// Watching is recorded separately from skill mastery (/api/video/progress).
(function(root){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const TOPICS=[['all','Все темы','Барлық тақырып'],['math','Математика','Математика'],['nature','Природа и биология','Табиғат және биология'],['it','Информатика','Информатика']];
 const LANGS=[['all','Любой язык','Кез келген тіл'],['ru','Русский','Орысша'],['kk','Қазақша','Қазақша']];
 // Catalog. Explanations are the draft lesson texts from brief/EdTech_Claude_Handoff/pedagogy/LESSONS_RU_KK.md.
 const CATALOG=[
  {id:'M01',topic:'math',lesson:'M01',version:'0.2.0',status:'review',src:'/media/M01/0.2.0/lesson.mp4',poster:'/media/M01/0.2.0/poster.jpg',captions:{ru:'/media/M01/0.2.0/captions.ru.vtt',kk:'/media/M01/0.2.0/captions.kk.vtt'},durationSec:54,audio:['ru'],
   title:['Ширек деген не','Что такое четверть'],level:['Бастауыш','Начальный'],
   text:['Дөңгелекті тең төрт бөлікке бөлейік. Осындай бір бөлік - бір ширек. Егер бөліктер тең болмаса, олардың кез келген біреуі ширек бола бермейді.','Разделим круг на четыре равные части. Одна такая часть - одна четверть. Если части не равны, любая одна из них не обязательно четверть.'],
   action:['Бүтінде неше тең бөлік бар?','Сколько равных частей в целом?']},
  {id:'B01',topic:'nature',lesson:'B01',version:'0.1.0-draft',status:'preparing',src:null,poster:null,captions:{},durationSec:null,audio:['ru'],
   title:['Өскінге қалай көмектесеміз','Как помочь ростку'],level:['Бастауыш','Начальный'],
   text:['Өскінге су қажет, бірақ суды шамадан тыс құюға болмайды. Жапырақтар жарықты пайдаланады. Өсімдікке ауа, қолайлы температура және минералды заттар қажет.','Ростку нужна вода, но заливать его нельзя. Листья используют свет. Растению нужны воздух, подходящая температура и минеральные вещества.'],
   action:['Шектеусіз суару керек пе?','Нужно ли поливать без ограничений?']},
  {id:'I01',topic:'it',lesson:'I01',version:'0.1.0-draft',status:'preparing',src:null,poster:null,captions:{},durationSec:null,audio:['ru'],
   title:['Бағытты құрастыр','Составь маршрут'],level:['Бастауыш','Начальный'],
   text:['Алгоритм - есепті шешуге арналған түсінікті қадамдар тізбегі. Алдымен командаларды құрып, содан кейін орындаймыз.','Алгоритм - понятная последовательность шагов для решения задачи. Сначала составим команды, затем запустим их.'],
   action:['Біз неше қадам орындадық?','Сколько шагов мы выполнили?']}
 ];
 const published=v=>!!v.src&&(v.status==='published'||(v.status==='review'&&!!root.AyanAccount?.demo));
 let state={topic:'all',audio:'all'};try{Object.assign(state,JSON.parse(sessionStorage.getItem('ayan.video.filters')||'{}'));}catch{}
 const S={
  topic:['Тақырып','Тема'],audio:['Дыбыстау тілі','Язык озвучки'],
  preparing:['Бейне дайындалып жатыр','Видео готовится'],preparingText:['Әзірге түсіндірмені оқуға болады.','Пока можно прочитать объяснение.'],
  read:['Түсіндірмені оқу','Прочитать объяснение'],watch:['Көру','Смотреть'],hide:['Жасыру','Скрыть'],
  minutes:['{n} мин','{n} мин'],captions:['Субтитр бар','Есть субтитры'],noCaptions:['Субтитр жоқ','Без субтитров'],lesson:['Сабақ: {id}','Урок: {id}'],
  empty:['Бұл сүзгі бойынша бейне әлі жоқ.','По этому фильтру видео пока нет.'],emptyKk:['Қазақша дыбыстау кейінірек болады. Түсіндіру мәтіні қазақша бар.','Казахская озвучка будет позже. Текст объяснения на казахском уже есть.'],
  reset:['Сүзгіні тазалау','Сбросить фильтр'],afterTitle:['Бір қысқа сұрақ','Один короткий вопрос'],toLesson:['Менің күніме','К моему дню'],
  review:['Жоба: мұғалім тексеруін күтуде','Черновик: ждёт проверки педагога'],seconds:['{n} сек','{n} сек'],toLessonBtn:['Сабаққа өту','Перейти к уроку'],
  speed:['Жылдамдық','Скорость'],transcript:['Мәтін','Текст'],close:['Жабу','Закрыть'],langNote:['Дыбыстау: орысша','Озвучка: русская']
 };
 function mount(el,{lang}){
  if(!el)return;const L=lang==='kk'?0:1,t=(k,o)=>{let s=S[k][L];if(o)for(const x in o)s=s.replace('{'+x+'}',o[x]);return s;};
  const chips=(name,list,cur)=>'<div class="video-filter" role="group" aria-label="'+t(name)+'">'+list.map(x=>'<button type="button" data-video-'+name+'="'+x[0]+'" aria-pressed="'+(cur===x[0])+'">'+x[L===0?2:1]+'</button>').join('')+'</div>';
  const list=CATALOG.filter(v=>(state.topic==='all'||v.topic===state.topic)&&(state.audio==='all'||v.audio.includes(state.audio)));
  const card=v=>'<article class="video-card'+(published(v)?'':' is-preparing')+'"><div class="video-thumb" aria-hidden="true">'+(v.poster?'<img src="'+esc(v.poster)+'" alt="">':'<span>'+esc(v.id)+'</span>')+'</div><div class="video-body">'
   +'<h2>'+esc(v.title[L])+'</h2><ul class="video-meta"><li>'+esc(TOPICS.find(x=>x[0]===v.topic)[L===0?2:1])+'</li><li>'+esc(v.level[L])+'</li><li>'+t('lesson',{id:esc(v.lesson)})+'</li>'
   +(published(v)?'<li>'+(v.durationSec<90?t('seconds',{n:v.durationSec}):t('minutes',{n:Math.round(v.durationSec/60)}))+'</li><li>'+(Object.keys(v.captions).length?t('captions'):t('noCaptions'))+'</li>':'')+'<li>'+t('langNote')+'</li></ul>'
   +(published(v)?(v.status==='review'?'<p class="video-status">'+t('review')+'</p>':'')+'<button class="primary video-play" data-video-play="'+v.id+'">'+t('watch')+'</button>'
     :'<p class="video-status"><b>'+t('preparing')+'.</b> '+t('preparingText')+'</p><button type="button" class="secondary" data-video-read="'+v.id+'" aria-expanded="false" aria-controls="read-'+v.id+'">'+t('read')+'</button><div class="video-text" id="read-'+v.id+'" hidden><p>'+esc(v.text[L])+'</p><p class="video-after"><b>'+t('afterTitle')+':</b> '+esc(v.action[L])+'</p></div>')
   +'</div></article>';
  const empty='<div class="video-empty" role="status"><p>'+(state.audio==='kk'?t('emptyKk'):t('empty'))+'</p><button type="button" class="secondary" data-video-reset>'+t('reset')+'</button></div>';
  el.innerHTML='<div class="video-filters">'+chips('topic',TOPICS,state.topic)+chips('audio',LANGS,state.audio)+'</div><div class="video-grid">'+(list.length?list.map(card).join(''):empty)+'</div>';
  const keep=()=>{try{sessionStorage.setItem('ayan.video.filters',JSON.stringify(state));}catch{}};
  el.onclick=e=>{const b=e.target.closest('button');if(!b)return;
   if(b.dataset.videoTopic){state.topic=b.dataset.videoTopic;keep();mount(el,{lang});el.querySelector('[data-video-topic="'+state.topic+'"]')?.focus();return;}
   if(b.dataset.videoAudio){state.audio=b.dataset.videoAudio;keep();mount(el,{lang});el.querySelector('[data-video-audio="'+state.audio+'"]')?.focus();return;}
   if(b.hasAttribute('data-video-reset')){state={topic:'all',audio:'all'};keep();mount(el,{lang});return;}
   if(b.dataset.videoRead){const box=el.querySelector('#read-'+b.dataset.videoRead),open=box.hidden;box.hidden=!open;b.setAttribute('aria-expanded',String(open));b.textContent=open?t('hide'):t('read');return;}
   if(b.dataset.videoPlay)player(CATALOG.find(v=>v.id===b.dataset.videoPlay),L,t);
  };
 }
 // Player: starts only on the child's action, no autoplay; captions, speed and transcript.
 function player(v,L,t){
  document.querySelector('#video-dialog')?.remove();
  const d=document.createElement('dialog');d.id='video-dialog';d.className='ayan-dialog video-dialog';d.setAttribute('aria-label',v.title[L]);
  const profile=root.AyanSupport?.get()||{};const lang=L===0?'kk':'ru';
  const tracks=Object.entries(v.captions).map(([l,src])=>'<track kind="captions" srclang="'+l+'" label="'+(l==='kk'?'Қазақша':'Русский')+'" src="'+esc(src)+'"'+(profile.captions!==false&&(l===lang||!v.captions[lang]&&l==='ru')?' default':'')+'>').join('');
  d.innerHTML='<h2>'+esc(v.title[L])+'</h2><video controls preload="metadata" playsinline'+(v.poster?' poster="'+esc(v.poster)+'"':'')+' src="'+esc(v.src)+'">'+tracks+'</video>'
   +'<div class="video-controls"><label>'+t('speed')+' <select id="video-speed"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option></select></label></div>'
   +'<details><summary>'+t('transcript')+'</summary><p id="video-transcript">'+esc(v.text[L])+'</p></details><div class="video-after" hidden id="video-after"><p><b>'+t('afterTitle')+':</b> '+esc(v.action[L])+'</p><button type="button" class="primary" id="video-to-lesson">'+t('toLessonBtn')+'</button></div><div class="actions"><button type="button" class="secondary" id="video-close">'+t('close')+'</button></div>';
  document.body.append(d);d.showModal();
  const video=d.querySelector('video');let last=0;
  if(v.src)fetch(v.src.replace(/lesson\.mp4$/,'transcript.'+lang+'.md')).then(r=>r.ok?r.text():null).then(md=>{if(md)d.querySelector('#video-transcript').textContent=md.split('\n').slice(2).join('\n').trim();}).catch(()=>{});
  const report=(completed)=>root.AyanVideoProgress?.({videoId:v.id,version:v.version,seconds:Math.round(video.currentTime),duration:Math.round(video.duration||0),completed});
  video.addEventListener('timeupdate',()=>{if(video.currentTime-last>=10){last=video.currentTime;report(false);}});
  video.addEventListener('ended',()=>{report(true);d.querySelector('#video-after').hidden=false;});
  d.querySelector('#video-speed').onchange=e=>{video.playbackRate=Number(e.target.value);};
  d.querySelector('#video-close').onclick=()=>d.close();
  d.querySelector('#video-to-lesson').onclick=()=>{d.close();window.dispatchEvent(new CustomEvent('ayan:goto',{detail:{tab:'day'}}));};
  d.addEventListener('close',()=>{video.pause();if(video.currentTime>0)report(video.ended);d.remove();});
 }
 root.AyanVideoLibrary={mount,catalog:CATALOG};
})(window);
