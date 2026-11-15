// Тарифы: суммы из GET /api/billing/plans (с НДС, целые тенге), тексты на двух языках из acc.js.
import {t,$,$$,topBar,api,esc,I,money,planName,loadPlans,onLang} from './acc.mjs';
topBar({current:'pricing'});
const url=new URL(location.href);let period=url.searchParams.get('period')==='year'?'year':'month',data=null,current=null,signedIn=false;

function card(p){
 const pr=p.prices?.[period]||{amount:0,vat:0},free=!pr.amount,per=p.perSeat;
 const monthly=period==='year'&&!free?Math.round(pr.amount/12):null;
 const note=free?t('Мерзімсіз тегін','Бесплатно без срока')
  :period==='year'?t(`Айына шамамен ${money(monthly)}, үнемдеу ${money(pr.saving||0)}`,`Около ${money(monthly)} в месяц, экономия ${money(pr.saving||0)}`)
  :t(`Ішінде ҚҚС ${money(pr.vat)}`,`В том числе НДС ${money(pr.vat)}`);
 const unit=free?'':per?(period==='year'?t('мұғалімге / жыл','за учителя / год'):t('мұғалімге / ай','за учителя / мес')):(period==='year'?t('/ жыл','/ год'):t('/ ай','/ мес'));
 const mine=current&&current===p.id;
 const href=free?(signedIn?'/account':'/signup'):`/checkout?plan=${p.id}&period=${period}`;
 const cta=mine?t('Сіздің тарифіңіз','Ваш тариф'):free?t('Тегін бастау','Начать бесплатно'):per?t('Мектепті қосу','Подключить школу'):t('Таңдау','Выбрать')+' '+planName(p);
 return `<li class="plan${p.best?' best':''}">${p.best?`<span class="tag">${t('Инклюзивті сыныпқа','Для инклюзивного класса')}</span>`:''}
  <div><h2>${esc(planName(p))}</h2><p class="for">${esc(t(...p.for))}</p></div>
  <p class="price"><b>${money(pr.amount)}</b><span>${esc(unit)}</span></p>
  <p class="price-note">${esc(note)}</p>
  <ul class="feat">${p.feat.map(f=>`<li>${I.check}<span>${esc(t(...f))}</span></li>`).join('')}</ul>
  ${mine?`<a class="b block" href="/account" aria-label="${esc(cta+': '+planName(p))}">${esc(cta)}</a>`:`<a class="b block${p.best?' primary':''}" href="${href}">${esc(cta)}</a>`}</li>`;
}
function render(){
 for(const b of $$('#period button'))b.setAttribute('aria-pressed',String(b.dataset.period===period));
 $('#period').setAttribute('aria-label',t('Төлем кезеңі','Период оплаты'));
 if(data)$('#plans').innerHTML=data.plans.map(card).join('');
}
$('#period').addEventListener('click',e=>{const b=e.target.closest('[data-period]');if(!b)return;period=b.dataset.period;url.searchParams.set('period',period);history.replaceState(null,'',url);render();});
onLang(render);
(async()=>{
 data=await loadPlans();render();
 const ses=await api.session();if(!ses)return;const s=await api.subscription();if(s.ok){signedIn=true;current=s.data.status==='active'||s.data.status==='canceling'?s.data.plan:'free';render();}
})();
