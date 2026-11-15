// Non-fraction tasks: choice, match, order. Same contract as Fraction World: shared state, answer(), setHint(), no grading.
// Matching works by choosing (no drag); ordering has Move up / Move down buttons for keyboard and touch.
import {esc,icon,L,lang} from './ui.mjs';
import * as Fig from './figures.mjs';
const S={choose:['Выбери ответ','Жауапты таңда'],up:['Выше','Жоғары'],down:['Ниже','Төмен'],pos:['Шаг {n}','{n}-қадам'],pairFor:['Пара для «{x}»','«{x}» үшін жұп'],
 selected:['Выбрано: {x}','Таңдалды: {x}'],nothing:['Пока ничего не выбрано.','Әзірге ештеңе таңдалмады.'],pairs:['Соединено пар: {n} из {m}','Қосылған жұп: {m} ішінен {n}'],
 firstFixed:['Первый шаг поставлен на место.','Бірінші қадам орнына қойылды.'],moved:['«{x}» теперь на месте {n}.','«{x}» енді {n}-орында.'],check:['Проверь эту пару','Осы жұпты тексер'],checkStep:['Проверь этот шаг','Осы қадамды тексер']};
const t=(k,v)=>{let s=(S[k]||[k,k])[lang()==='kk'?1:0];if(v)for(const x in v)s=s.replaceAll('{'+x+'}',v[x]);return s;};
const figLabels=()=>({root:L({ru:'корень',kk:'тамыр'}),stem:L({ru:'стебель',kk:'сабақ'}),leaf:L({ru:'лист',kk:'жапырақ'})});

export function mount(host,{task,state,onChange}){
 const st=state;let note='',marks=null;
 if(task.kind==='order'&&!st.order)st.order=task.items.map(i=>i.id);
 if(task.kind==='match')st.pairs??={};
 const change=()=>onChange?.(st,'answer');
 function answer(){if(task.kind==='choice')return st.choice?'choice:'+st.choice:'';
  if(task.kind==='match'){const k=Object.keys(st.pairs);return k.length?'match:'+k.map(a=>a+'='+st.pairs[a]).join(';'):'';}
  return 'order:'+st.order.join(',');}
 function render(){
  const fig=task.figure?`<div class="row" style="justify-content:center">${Fig.figure(task.figure,{size:260,labels:task.figure.type==='plant'?figLabels():undefined})}</div>`:'';
  let body='';
  if(task.kind==='choice'){const big=task.options.some(o=>o.figure);
   body=`<div class="${big?'cards-row':'stack'}" role="group" aria-label="${esc(t('choose'))}">`+task.options.map(o=>big
    ?`<button type="button" class="pick-card" data-choice="${esc(o.id)}" aria-pressed="${st.choice===o.id}">${o.figure?Fig.fraction(o.figure,{size:130}):''}<span style="font-weight:800;font-size:1.125rem">${esc(L(o.label))}</span></button>`
    :`<button type="button" class="btn wide" data-choice="${esc(o.id)}" aria-pressed="${st.choice===o.id}" style="${st.choice===o.id?'border:2px solid var(--primary);background:var(--primary-soft)':''}">${st.choice===o.id?icon('check'):''}${esc(L(o.label))}</button>`).join('')+'</div>';}
  if(task.kind==='match'){
   body=`<div class="stack">`+task.left.map(l=>`<fieldset class="card" style="padding:16px;${marks?.includes(l.id)?'border:2px solid var(--error)':''}"><legend style="font-weight:800;padding:0 6px">${esc(L(l.label))}${marks?.includes(l.id)?` · <span class="err">${esc(t('check'))}</span>`:''}</legend><div class="seg" role="group" aria-label="${esc(t('pairFor',{x:L(l.label)}))}">`
    +task.right.map(r=>`<button type="button" class="chip" data-left="${esc(l.id)}" data-right="${esc(r.id)}" aria-pressed="${st.pairs[l.id]===r.id}">${esc(L(r.label))}</button>`).join('')+'</div></fieldset>').join('')+'</div>';}
  if(task.kind==='order'){const item=id=>task.items.find(i=>i.id===id);
   body=`<ol class="stack" style="list-style:none;margin:0;padding:0">`+st.order.map((id,i)=>`<li class="card" style="padding:12px 16px;display:flex;gap:12px;align-items:center;${marks===i?'border:2px solid var(--error)':''}"><span class="badge tnum">${esc(t('pos',{n:i+1}))}</span><b style="flex:1">${esc(L(item(id).label))}${marks===i?` · <span class="err">${esc(t('checkStep'))}</span>`:''}</b>
    <button type="button" class="btn small inline" data-up="${i}" ${i===0||(st.firstFixed&&i<=1)?'disabled':''} aria-label="${esc(t('up'))}: ${esc(L(item(id).label))}">${icon('back')}<span class="opt-detail">${esc(t('up'))}</span></button><button type="button" class="btn small inline" data-down="${i}" ${i===st.order.length-1||(st.firstFixed&&i===0)?'disabled':''} aria-label="${esc(t('down'))}: ${esc(L(item(id).label))}">${icon('next')}<span class="opt-detail">${esc(t('down'))}</span></button></li>`).join('')+'</ol>';}
  host.innerHTML=`<div class="stack">${fig}${body}<p class="selected-line" aria-live="polite">${esc(note||line())}</p></div>`;
 }
 function line(){if(task.kind==='choice'){const o=task.options.find(x=>x.id===st.choice);return o?t('selected',{x:L(o.label)}):t('nothing');}
  if(task.kind==='match')return t('pairs',{n:Object.keys(st.pairs).length,m:task.left.length});return '';}
 function move(i,dir){const j=i+dir;if(j<0||j>=st.order.length)return;const o=[...st.order];[o[i],o[j]]=[o[j],o[i]];st.order=o;marks=null;
  note=t('moved',{x:L(task.items.find(x=>x.id===o[j]).label),n:j+1});change();render();(host.querySelector(`[data-${dir<0?'up':'down'}="${j}"]:not(:disabled)`)||host.querySelector(`[data-${dir<0?'down':'up'}="${j}"]`))?.focus();}
 host.onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.choice){st.choice=b.dataset.choice;note='';change();render();host.querySelector(`[data-choice="${b.dataset.choice}"]`)?.focus();return;}
  if(b.dataset.left){st.pairs={...st.pairs,[b.dataset.left]:b.dataset.right};marks=null;note='';change();render();host.querySelector(`[data-left="${b.dataset.left}"][data-right="${b.dataset.right}"]`)?.focus();return;}
  if(b.dataset.up!==undefined)return move(Number(b.dataset.up),-1);
  if(b.dataset.down!==undefined)return move(Number(b.dataset.down),1);
 };
 render();
 return {answer,refresh:render,
  reset(){if(task.kind==='choice')st.choice=null;if(task.kind==='match')st.pairs={};if(task.kind==='order'){st.order=task.items.map(i=>i.id);st.firstFixed=false;}marks=null;note='';change();render();},
  setHint(level){if(level>=3&&task.kind==='order'&&task.first){const o=st.order.filter(x=>x!==task.first);st.order=[task.first,...o];st.firstFixed=true;note=t('firstFixed');change();}render();},
  showResult(r){marks=task.kind==='match'?(r?.wrongItems||null):task.kind==='order'?(r?.firstWrong??null):null;render();},
  destroy(){host.onclick=null;host.innerHTML='';}};
}
