// Оформление: тариф -> счёт (Kaspi или на организацию) -> подтверждение -> готово.
// Платёжные данные карты не запрашиваются никогда: оплата = подтверждение выставленного счёта (POST /api/billing/checkout, /confirm).
import {t,$,$$,topBar,api,esc,I,money,planName,methodName,loadPlans,fmtDate,setError,clearErrors,busy,mascot,onLang,errText} from './acc.mjs';
topBar({current:'pricing'});
const url=new URL(location.href);
let planId=url.searchParams.get('plan')||'max',period=url.searchParams.get('period')==='year'?'year':'month',method='kaspi',seats=5;
let plans=[],profile=null,invoice=null,result=null,stepN=1;
const P=()=>plans.find(p=>p.id===planId);
const price=()=>{const p=P();const one=p?.prices?.[period]||{amount:0,vat:0};const k=p?.perSeat?seats:1;return {amount:one.amount*k,vat:one.vat*k};};
const perLabel=()=>period==='year'?t('1 жыл','1 год'):t('1 ай','1 месяц');

function stepper(){for(const li of $$('#stepper li')){const n=+li.dataset.s;li.classList.toggle('done',n<stepN);if(n===stepN)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');}
 $('#stepper').setAttribute('aria-label',t('Төлем қадамдары','Шаги оплаты'));}
function summary(){
 const p=P();if(!p){$('#summary').innerHTML='';return;}
 const s=invoice?{amount:invoice.amount,vat:invoice.vat}:price();
 $('#summary').innerHTML=`<div class="card"><h2 style="font-size:1.125rem">${t('Тапсырыс','Ваш заказ')}</h2>
  <div class="sub-plan" style="margin-top:14px"><span class="medal">${I.star}</span><span><b>${esc(planName(p))}</b><span class="muted">${esc(perLabel())}${p.perSeat?', '+t(`${seats} мұғалім`,`${seats} учителей`):''}</span></span></div>
  <div style="margin-top:16px"><div class="sum-row"><span>${t('ҚҚС-сыз сома','Сумма без НДС')}</span><span class="tnum">${money(s.amount-s.vat)}</span></div>
  <div class="sum-row"><span>${t('ҚҚС 16%','НДС 16%')}</span><span class="tnum">${money(s.vat)}</span></div>
  <div class="sum-row total"><span>${t('Барлығы','Итого')}</span><span class="tnum">${money(s.amount)}</span></div></div></div>
  <div class="card soft" style="margin-top:12px;display:flex;gap:12px;align-items:flex-start">${I.refund}<p style="font-size:.9375rem;font-weight:700">${t('14 күн ішінде ақшаны қайтару кепілдігі. Жазылымды кабинетте кез келген уақытта тоқтатуға болады.','Гарантия возврата 14 дней. Подписку можно отменить в кабинете в любой момент.')} <a href="/legal/refunds">${t('Шарттар','Условия')}</a></p></div>`;
}

function stepPlan(){
 stepN=1;stepper();const p=P();
 const paid=plans.filter(x=>(x.prices?.month?.amount||0)>0);
 $('#pane').innerHTML=`<form class="card" id="f1" novalidate>
  <fieldset class="opts" id="plan-set"><legend>${t('Тариф','Тариф')}</legend>
   ${paid.map(x=>`<label class="opt"><input type="radio" name="plan" value="${x.id}"${x.id===planId?' checked':''}><span class="glyph">${I.star}</span><span><b>${esc(planName(x))}</b><small>${esc(t(...x.for))}</small></span><span style="margin-left:auto;font-weight:900" class="tnum">${money(x.prices[period].amount)}</span><span class="tick" aria-hidden="true"></span></label>`).join('')}
  </fieldset>
  <div class="period" role="group" aria-label="${t('Төлем кезеңі','Период оплаты')}" id="period" style="margin-top:16px">
   <button type="button" data-period="month" aria-pressed="${period==='month'}">${t('Ай сайын','Помесячно')}</button>
   <button type="button" data-period="year" aria-pressed="${period==='year'}">${t('Жылына','За год')} <span class="save">${t('2 ай тегін','2 месяца в подарок')}</span></button>
  </div>
  ${p?.perSeat?`<div class="f" style="margin-top:20px;max-width:260px"><label for="seats">${t('Мұғалімдер саны','Количество учителей')}</label><input class="in" id="seats" type="number" inputmode="numeric" min="${p.minSeats||5}" max="${p.maxSeats||500}" value="${seats}"><p class="hint">${t(`${p.minSeats||5}-тен ${p.maxSeats||500}-ге дейін`,`От ${p.minSeats||5} до ${p.maxSeats||500}`)}</p></div>`:''}
  <fieldset class="opts" id="method-set" style="margin-top:24px"><legend>${t('Төлем тәсілі','Способ оплаты')}</legend>
   <label class="opt"><input type="radio" name="method" value="kaspi"${method==='kaspi'?' checked':''}><span class="kaspi" aria-hidden="true">Kaspi</span><span><b>${t('Kaspi шоты','Kaspi счёт')}</b><small>${t('Шотты Kaspi қосымшасында растайсыз','Счёт подтверждается в приложении Kaspi')}</small></span><span class="tick" aria-hidden="true"></span></label>
   <label class="opt"><input type="radio" name="method" value="invoice"${method==='invoice'?' checked':''}><span class="glyph">${I.doc}</span><span><b>${t('Мектепке арналған шот','Счёт для школы')}</b><small>${t('Ұйымның атына шот, ҚҚС бөлек жолмен','Счёт на организацию, НДС отдельной строкой')}</small></span><span class="tick" aria-hidden="true"></span></label>
  </fieldset>
  <p class="hint" style="margin-top:12px">${t('Карта нөмірін енгізудің қажеті жоқ.','Номер карты вводить не нужно.')}</p>
  <p class="alert err" id="e1" role="alert" style="margin-top:16px"></p>
  <div class="actions" style="margin-top:20px"><button class="b primary" id="go1" type="submit">${t('Шот шығару','Выставить счёт')}</button></div>
 </form>`;
 const f=$('#f1');
 f.addEventListener('change',e=>{if(e.target.name==='plan'){planId=e.target.value;stepPlan();summary();}else if(e.target.name==='method')method=e.target.value;else if(e.target.id==='seats'){seats=Math.max(0,Math.round(+e.target.value||0));summary();}});
 $('#period').addEventListener('click',e=>{const b=e.target.closest('[data-period]');if(!b)return;period=b.dataset.period;stepPlan();summary();$(`[data-period=${period}]`).focus();});
 f.addEventListener('submit',async e=>{e.preventDefault();clearErrors(f);$('#e1').textContent='';const p=P();
  if(p?.perSeat){const s=$('#seats');seats=Math.round(+s.value||0);if(seats<(p.minSeats||5)||seats>(p.maxSeats||500)){setError(s,t(`Мұғалімдер саны: ${p.minSeats||5}-тен ${p.maxSeats||500}-ге дейін`,`Количество учителей: от ${p.minSeats||5} до ${p.maxSeats||500}`));s.focus();return;}}
  const b=$('#go1');busy(b,true,t('Шот шығарылуда','Выставляем счёт'));
  const r=await api.checkout({plan:planId,period,method,...(p?.perSeat?{seats}:{})});busy(b,false);
  if(!r.ok){if(r.data.code==='bad_seats'){setError($('#seats'),errText(r,t('Мұғалімдер санын тексеріңіз','Проверьте количество учителей')));$('#seats').focus();return;}
   $('#e1').textContent=r.data.code==='forbidden'?t('Тарифті кеңістік иесі ғана төлей алады. Мектеп әкімшісіне жүгініңіз.','Оплатить тариф может только владелец пространства. Обратитесь к администратору школы.'):errText(r,t('Шот шығарылмады. Қайталап көріңіз.','Не удалось выставить счёт. Попробуйте ещё раз.'));return;}
  invoice=r.data.invoice;url.searchParams.set('plan',planId);url.searchParams.set('period',period);url.searchParams.set('invoice',invoice.id);history.replaceState(null,'',url);stepInvoice(true);});
}

function stepInvoice(focus){
 stepN=2;stepper();summary();const inv=invoice;const payer=profile?.org?.name||profile?.user?.name||'';
 $('#pane').innerHTML=`<div class="invoice">
  <div class="invoice-head"><div><b>${t('Шот','Счёт')} № ${esc(inv.number)}</b><p class="muted" style="font-size:.9375rem">${t('күні','от')} ${fmtDate(inv.createdAt)}</p></div>
   <div style="text-align:right"><span class="badge sand"><i></i>${t('Төлемді күтуде','Ожидает оплаты')}</span><p class="muted" style="font-size:.875rem;margin-top:6px">${t('Төлеу мерзімі','Оплатить до')} ${fmtDate(inv.expiresAt)}</p></div></div>
  <div class="invoice-body">
   <dl class="kv" style="margin-top:8px"><div><dt>${t('Сатушы','Продавец')}</dt><dd>${t('Аян сервисі','Сервис Аян')}</dd><span></span></div><div><dt>${t('Төлеуші','Плательщик')}</dt><dd>${esc(payer)}</dd><span></span></div><div><dt>${t('Төлем тәсілі','Способ оплаты')}</dt><dd>${esc(methodName(inv.method))}</dd><span></span></div></dl>
   <table style="margin-top:8px"><thead><tr><th scope="col">${t('Атауы','Наименование')}</th><th scope="col" class="num">${t('Сома','Сумма')}</th></tr></thead>
    <tbody><tr><td>${t('Аян жазылымы','Подписка Аян')}: ${esc(planName(P()||{name:[inv.plan,inv.plan]}))}, ${esc(perLabel())}${inv.seats?', '+t(`${inv.seats} мұғалім`,`${inv.seats} учителей`):''}</td><td class="num">${money(inv.amount-inv.vat)}</td></tr>
    <tr><td>${t('ҚҚС 16%','НДС 16%')}</td><td class="num">${money(inv.vat)}</td></tr>
    <tr><td><b>${t('Төлеуге','К оплате')}</b></td><td class="num"><b style="font-size:1.25rem">${money(inv.amount)}</b></td></tr></tbody></table>
   <form id="f2" novalidate style="margin-top:20px;display:grid;gap:12px">
    <div class="check-wrap"><label class="check"><input type="checkbox" id="agree"><span>${t('<a href="/legal/terms?lang=kk" target="_blank">Жазылым шарттарымен</a> және <a href="/legal/refunds?lang=kk" target="_blank">қайтару шарттарымен</a> келісемін','Согласен с <a href="/legal/terms" target="_blank">условиями подписки</a> и <a href="/legal/refunds" target="_blank">условиями возврата</a>')}</span></label></div>
    <p class="alert err" id="e2" role="alert"></p>
    <div class="actions"><button class="b primary" id="go2" type="submit">${inv.method==='kaspi'?t('Kaspi арқылы төлеуді растау','Подтвердить оплату в Kaspi'):t('Шот бойынша төлемді растау','Подтвердить оплату счёта')} - ${money(inv.amount)}</button><button class="b ghost" type="button" id="edit">${t('Тарифті өзгерту','Изменить тариф')}</button></div>
   </form>
  </div></div>`;
 $('#edit').onclick=()=>{invoice=null;url.searchParams.delete('invoice');history.replaceState(null,'',url);stepPlan();summary();$('#co-title').focus();};
 $('#agree').onchange=e=>{if(e.target.checked)setError(e.target,'');};
 $('#f2').addEventListener('submit',async e=>{e.preventDefault();$('#e2').textContent='';const a=$('#agree');
  if(!a.checked){setError(a,t('Растау үшін шарттармен келісіңіз','Чтобы подтвердить, согласитесь с условиями'));a.focus();return;}
  const b=$('#go2');busy(b,true,t('Төлем тексерілуде','Проверяем оплату'));const r=await api.confirm(inv.id);busy(b,false);
  if(!r.ok){$('#e2').textContent=r.data.code==='invoice_expired'?t('Шоттың мерзімі өтті. «Тарифті өзгерту» арқылы жаңа шот шығарыңыз.','Срок счёта истёк. Выставите новый через «Изменить тариф».'):errText(r,t('Төлем расталмады. Қайталап көріңіз.','Не удалось подтвердить оплату. Попробуйте ещё раз.'));return;}
  result=r.data;url.searchParams.delete('invoice');history.replaceState(null,'',url);stepDone();});
 if(focus)$('#co-title').focus();
}

function stepDone(){
 stepN=3;stepper();const s=result.subscription,pay=result.payment;
 const home=profile?.role==='parent'?'/account':'/teacher';
 $('#summary').innerHTML='';$('.co').classList.add('done');
 $('#pane').innerHTML=`<div class="card"><div class="done-hero"><div class="mascot" data-m></div>
  <h2 id="done-title" tabindex="-1" style="font-size:clamp(1.5rem,1.2rem + 1vw,2rem);font-weight:850">${t('Төлем қабылданды. ','Оплата принята. ')}${t(`${esc(planName(P()))} тарифі қосылды`,`Тариф ${esc(planName(P()))} подключён`)}</h2>
  <p>${t(`Жазылым ${fmtDate(s.endsAt)} дейін белсенді, түбіртек № ${esc(pay.receipt)} кабинеттегі төлемдер тарихында сақталды.`,`Подписка активна до ${fmtDate(s.endsAt)}, чек № ${esc(pay.receipt)} сохранён в истории платежей в кабинете.`)}</p>
  <div class="actions" style="justify-content:center"><a class="b primary" href="${home}">${t('Кабинетке өту','Перейти в кабинет')}</a><a class="b" href="/account">${t('Жазылым мен төлемдер','Подписка и платежи')}</a></div></div></div>`;
 mascot($('[data-m]'),'Celebrating');$('#done-title').focus();
}

function render(){if(stepN===1)stepPlan();else if(stepN===2&&invoice)stepInvoice(false);else if(result)stepDone();summary();}
(async()=>{
 const ses=await api.session();
 if(!ses){location.replace('/signup?plan='+encodeURIComponent(planId)+'&period='+period);return;}
 const [pl,pr]=await Promise.all([loadPlans(),api.profile()]);plans=pl.plans;profile=pr.ok?pr.data:null;
 if(!P()||!(P().prices?.month?.amount>0))planId='max';
 if(P()?.perSeat)seats=Math.max(seats,P().minSeats||5);
 if(profile?.role==='school'||planId==='school')method='invoice';
 const invId=url.searchParams.get('invoice');
 if(invId){const r=await api.invoice(invId);if(r.ok&&r.data.invoice.status==='pending'){invoice=r.data.invoice;planId=invoice.plan;period=invoice.period;if(invoice.seats)seats=invoice.seats;method=invoice.method;stepInvoice(false);summary();onLang(render);return;}}
 stepPlan();summary();onLang(render);
})();
