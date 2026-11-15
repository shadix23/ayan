// Аккаунт: профиль, язык, подписка, платежи, возврат 14 дней, данные, выход и удаление (устройство как у goprep, палитра Аяна).
// API: /api/account/profile, /api/billing/subscription|payments|cancel|resume, /api/account/password|sessions/revoke|delete, /api/support.
import {t,$,$$,topBar,api,esc,I,money,fmtDate,roleName,methodName,setError,clearErrors,busy,toast,onLang,errText,CONTACT} from './acc.js';
topBar({current:'account',cta:false});
let pr=null,pays=[],open=true,editing=null;
const dlg=$('#dlg');
const planTitle=s=>s?.planName?t(s.planName.kk||s.planName.ru,s.planName.ru):'';
const STATUS={active:['Белсенді','Активна','ok'],canceling:['Тоқтатылады','Отменяется','sand'],expired:['Мерзімі өтті','Истекла','grey'],none:['Тегін','Бесплатно','grey']};
const PAY={paid:['Төленді','Оплачен','ok'],refunded:['Қайтарылды','Возвращён','grey']};
const lastPaid=()=>pays.find(p=>p.status==='paid');
const refundable=()=>{const p=lastPaid();return p&&Date.now()-p.createdAt<14*86400000?p:null;};

function row(dt,dd,key){const ed=editing===key;
 if(ed&&key==='name')return `<div><dt>${dt}</dt><dd><form id="ed-form" novalidate><div class="f" style="flex:1 1 200px;gap:4px"><label class="sr-only" for="ed-name">${dt}</label><input class="in" id="ed-name" value="${esc(pr.user.name)}" maxlength="80"></div><button class="b sm primary">${t('Сақтау','Сохранить')}</button><button class="b sm ghost" type="button" data-cancel>${t('Болдырмау','Отмена')}</button></form></dd><span></span></div>`;
 if(ed&&key==='org')return `<div><dt>${dt}</dt><dd><form id="ed-form" novalidate><div class="f" style="flex:1 1 200px;gap:4px"><label class="sr-only" for="ed-org">${dt}</label><input class="in" id="ed-org" value="${esc(pr.org?.name||'')}" maxlength="100"></div><button class="b sm primary">${t('Сақтау','Сохранить')}</button><button class="b sm ghost" type="button" data-cancel>${t('Болдырмау','Отмена')}</button></form></dd><span></span></div>`;
 if(ed&&key==='pass')return `<div><dt>${dt}</dt><dd><form id="ed-form" novalidate style="display:grid;gap:10px"><div class="f"><label for="pw-cur">${t('Қазіргі құпиясөз','Текущий пароль')}</label><input class="in" id="pw-cur" type="password" autocomplete="current-password"></div><div class="f"><label for="pw-new">${t('Жаңа құпиясөз, кемінде 8 таңба','Новый пароль, минимум 8 символов')}</label><input class="in" id="pw-new" type="password" autocomplete="new-password" minlength="8"></div><div class="actions"><button class="b sm primary">${t('Құпиясөзді өзгерту','Сменить пароль')}</button><button class="b sm ghost" type="button" data-cancel>${t('Болдырмау','Отмена')}</button></div></form></dd><span></span></div>`;
 return `<div><dt>${dt}</dt><dd>${dd}</dd>${key?`<button class="edit" type="button" data-edit="${key}" aria-label="${t('Өзгерту','Изменить')}: ${esc(dt)}">${I.pencil}</button>`:'<span></span>'}</div>`;}

function render(){
 if(!pr)return;const s=pr.subscription||{status:'none'},st=STATUS[s.status]||STATUS.none,u=pr.user,del=pr.deletion;
 const lang=window.AyanPage?.lang?.()||'ru',canBill=pr.canManageBilling!==false,paid=s.status==='active'||s.status==='canceling';
 const ref=refundable();
 $('#acc').innerHTML=`
 ${del?`<div class="alert err" role="status">${I.info}<span>${t(`Аккаунт ${fmtDate(del.dueAt)} жойылады.`,`Аккаунт будет удалён ${fmtDate(del.dueAt)}.`)} <button class="textlink" type="button" id="undo-del">${t('Жоюды болдырмау','Отменить удаление')}</button></span></div>`:''}
 <section class="acc-hero" aria-labelledby="acc-name"><div class="avatar" aria-hidden="true">${esc((u.name||u.email||'А').trim()[0].toUpperCase())}</div>
  <div style="min-width:0;flex:1"><h1 id="acc-name">${esc(u.name)}</h1><p class="mail">${esc(u.email)}</p>
  <div class="badges"><span class="badge">${esc(roleName(pr.role))}</span><span class="badge sand">${t('Тариф','Тариф')}: ${esc(planTitle(s))}</span><span class="badge ${st[2]}"><i></i>${t(st[0],st[1])}</span></div></div></section>

 <section class="card" aria-labelledby="h-prof"><div class="card-head"><h2 id="h-prof">${I.user}${t('Профиль','Профиль')}</h2></div>
  <dl class="kv">${row(t('Аты','Имя'),esc(u.name),'name')}${row(t('Пошта','Почта'),esc(u.email))}${row(t('Рөлі','Роль'),esc(roleName(pr.role)))}
  ${pr.role!=='parent'?row(pr.role==='school'?t('Мектеп','Школа'):t('Кеңістік','Пространство'),esc(pr.org?.name||'-'),canBill?'org':null):''}${row(t('Құпиясөз','Пароль'),'••••••••','pass')}</dl>
  <p class="alert err" id="ed-err" role="alert" style="margin-top:12px"></p></section>

 <section class="card" aria-labelledby="h-lang"><div class="card-head"><h2 id="h-lang">${I.globe}${t('Тіл','Язык')}</h2></div>
  <div class="pills" role="group" aria-labelledby="h-lang"><button class="pill" type="button" data-lang="kk" aria-pressed="${lang==='kk'}">Қазақша</button><button class="pill" type="button" data-lang="ru" aria-pressed="${lang==='ru'}">Русский</button></div></section>

 <section class="card" aria-labelledby="h-sub">
  <button class="sub-toggle" type="button" aria-expanded="${open}" aria-controls="sub-body" id="sub-tg"><span class="sub-plan"><span class="medal">${I.star}</span><span><span class="muted" style="font-size:.875rem;font-weight:800" id="h-sub">${t('Жазылым','Подписка')}</span><b>${esc(planTitle(s))}</b></span></span><span class="chev" aria-hidden="true"></span></button>
  <div id="sub-body" ${open?'':'hidden'} style="margin-top:12px">
   <dl class="kv">
    ${row(t('Күйі','Статус'),`<span class="badge ${st[2]}"><i></i>${t(st[0],st[1])}</span>`)}
    ${paid?row(t('Кезең','Период'),s.period==='year'?t('Жылдық','Годовой'):t('Айлық','Месячный')):''}
    ${s.status==='active'?row(t('Келесі ұзарту','Следующее продление'),fmtDate(s.renewsAt)):''}
    ${s.status==='canceling'?row(t('Қолжетімділік','Доступ до'),fmtDate(s.endsAt)):''}
    ${s.status==='active'?row(t('Келесі төлем','Следующий платёж'),`${money(s.amount)} <span class="muted" style="font-weight:600">${t('ҚҚС-пен','с НДС')}</span>`):''}
    ${paid?row(t('Төлем тәсілі','Способ оплаты'),esc(methodName(s.paymentMethod?.type))):''}
   </dl>
   <div class="row-btns">
    ${!canBill?`<p class="muted">${t('Жазылымды кеңістік иесі басқарады.','Подпиской управляет владелец пространства.')}</p>`
     :s.status==='active'?`<a class="b primary" href="/checkout?plan=${esc(s.plan)}&period=${esc(s.period||'month')}">${t('Келесі кезеңді қазір төлеу','Оплатить следующий период сейчас')}</a><a class="b" href="/pricing">${t('Тарифті ауыстыру','Сменить тариф')}</a><button class="b ghost" type="button" id="cancel-sub">${t('Жазылымнан бас тарту','Отменить подписку')}</button>`
     :s.status==='canceling'?`<button class="b primary" type="button" id="resume-sub">${t('Жазылымды жалғастыру','Возобновить подписку')}</button><a class="b" href="/pricing">${t('Тарифтер','Тарифы')}</a>`
     :`<a class="b primary" href="/pricing">${t('Тариф таңдау','Выбрать тариф')}</a>`}
   </div>
  </div></section>

 <section class="card" aria-labelledby="h-bill"><div class="card-head"><h2 id="h-bill">${I.doc}${t('Төлемдер тарихы','История платежей')}</h2></div>
  ${pays.length?`<div class="history-wrap"><table class="history"><thead><tr><th scope="col">${t('Күні','Дата')}</th><th scope="col">${t('Түбіртек','Чек')}</th><th scope="col">${t('Тариф','Тариф')}</th><th scope="col">${t('Күйі','Статус')}</th><th scope="col" class="num">${t('Сома','Сумма')}</th></tr></thead><tbody>
   ${pays.map(p=>{const ps=PAY[p.status]||PAY.paid;return `<tr><td>${fmtDate(p.createdAt)}</td><td class="tnum">${esc(p.receipt)}</td><td>${esc(p.planName?t(p.planName.kk,p.planName.ru):p.plan)}</td><td><span class="badge ${ps[2]}">${t(ps[0],ps[1])}</span></td><td class="num">${money(p.amount)}</td></tr>`;}).join('')}</tbody></table></div>`
   :`<p class="empty">${t('Әзірге төлем жоқ. Бастау тарифі тегін.','Платежей пока нет. Тариф Старт бесплатный.')}</p>`}</section>

 <section class="card sand" aria-labelledby="h-ref"><div class="card-head" style="margin-bottom:8px"><h2 id="h-ref">${I.refund}${t('14 күн ішінде қайтару кепілдігі','Гарантия возврата 14 дней')}</h2></div>
  <p>${t('Сервис сәйкес келмесе, төлемнен кейін 14 күн ішінде жазыңыз: ағымдағы кезеңнің ақшасын сол тәсілмен 10 жұмыс күні ішінде қайтарамыз.','Если сервис не подошёл, напишите в течение 14 дней после оплаты: вернём деньги за текущий период тем же способом в течение 10 рабочих дней.')} <a href="/legal/refunds">${t('Қайтару шарттары','Условия возврата')}</a></p>
  ${ref&&canBill?`<div class="row-btns"><button class="b" type="button" id="refund">${t('Қайтаруды сұрау','Запросить возврат')}</button><span class="muted" style="align-self:center;font-size:.9375rem">${t(`${fmtDate(ref.createdAt+14*86400000)} дейін`,`До ${fmtDate(ref.createdAt+14*86400000)}`)}</span></div>`:''}</section>

 <section class="card" aria-labelledby="h-help"><div class="card-head"><h2 id="h-help">${I.help}${t('Қолдау','Поддержка')}</h2></div>
  <p class="muted">${t('Сұрақ, ұсыныс немесе ақау туралы жазыңыз. Бір жұмыс күні ішінде жауап береміз.','Вопрос, идея или ошибка: напишите нам, ответим в течение рабочего дня.')}</p>
  <div class="row-btns"><a class="b" href="/support#write">${I.mail}${t('Қолдауға жазу','Написать в поддержку')}</a><a class="b ghost" href="/support">${t('Жиі сұрақтар','Частые вопросы')}</a></div></section>

 <section class="card" aria-labelledby="h-data"><div class="card-head"><h2 id="h-data">${I.shield}${t('Деректер және құпиялылық','Данные и конфиденциальность')}</h2></div>
  <div class="row-btns" style="margin-top:0"><a class="b" href="/api/account/export" download>${t('Деректерімді жүктеу (JSON)','Скачать мои данные (JSON)')}</a><button class="b" type="button" data-cookie-settings>${t('Cookie баптаулары','Настройки cookie')}</button><button class="b ghost" type="button" id="revoke">${t('Басқа құрылғылардан шығу','Выйти на других устройствах')}</button></div>
  <p class="muted" style="margin-top:12px;font-size:.9375rem"><a href="/legal/privacy">${t('Құпиялылық саясаты','Политика конфиденциальности')}</a> - <a href="/legal/parental-consent">${t('Ата-ана келісімі','Согласие родителя')}</a> - <a href="/legal/cookies">Cookie</a></p></section>

 <section class="card" aria-label="${t('Шығу','Выход')}"><button class="b block" type="button" id="logout">${I.out}${t('Аккаунттан шығу','Выйти из аккаунта')}</button></section>

 ${del?'':`<section class="card danger" aria-labelledby="h-del"><div class="card-head" style="margin-bottom:8px"><h2 id="h-del" style="color:var(--error)">${I.trash}${t('Аккаунтты жою','Удалить аккаунт')}</h2></div>
  <p>${t('Аккаунт, оқушылар және олардың нәтижелері 30 күннен кейін біржола жойылады. Осы уақытта кіріп, жоюды болдырмауға болады. Белсенді жазылым тоқтатылады.','Аккаунт, ученики и их результаты будут удалены безвозвратно через 30 дней. До этого можно войти и отменить удаление. Активная подписка будет отменена.')}</p>
  <div class="row-btns"><button class="b danger" type="button" id="del">${t('Аккаунтты жою','Удалить аккаунт')}</button></div></section>`}`;
 bind();
}

function modal(html,onSubmit){$('#dlg-body').innerHTML=html;dlg.showModal();const f=$('#dlg-body form');const first=$('input,textarea,button',$('#dlg-body'));first?.focus();
 $$('[data-close]',dlg).forEach(b=>b.onclick=()=>dlg.close());f.onsubmit=async e=>{e.preventDefault();await onSubmit(f);};}

function bind(){
 $$('[data-edit]').forEach(b=>b.onclick=()=>{editing=b.dataset.edit;render();$('#ed-form input')?.focus();});
 const f=$('#ed-form');if(f){$('[data-cancel]',f).onclick=()=>{const k=editing;editing=null;render();$(`[data-edit=${k}]`)?.focus();};
  f.onsubmit=async e=>{e.preventDefault();clearErrors(f);$('#ed-err').textContent='';const btn=$('button.primary',f);
   if(editing==='name'){const v=$('#ed-name').value.trim();if(!v){setError($('#ed-name'),t('Атыңызды жазыңыз','Напишите имя'));$('#ed-name').focus();return;}busy(btn,true);const r=await api.saveProfile({name:v});busy(btn,false);if(!r.ok){setError($('#ed-name'),errText(r,t('Сақталмады','Не удалось сохранить')));return;}pr=r.data;}
   else if(editing==='org'){const v=$('#ed-org').value.trim();if(!v){setError($('#ed-org'),t('Атауын жазыңыз','Напишите название'));$('#ed-org').focus();return;}busy(btn,true);const r=await api.saveProfile({orgName:v});busy(btn,false);if(!r.ok){setError($('#ed-org'),errText(r,t('Сақталмады','Не удалось сохранить')));return;}pr=r.data;}
   else if(editing==='pass'){const cur=$('#pw-cur'),nx=$('#pw-new');if(!cur.value)setError(cur,t('Қазіргі құпиясөзді жазыңыз','Напишите текущий пароль'));if(nx.value.length<8)setError(nx,t('Кемінде 8 таңба','Минимум 8 символов'));if($('[aria-invalid=true]',f)){$('[aria-invalid=true]',f).focus();return;}
    busy(btn,true);const r=await api.password({current:cur.value,next:nx.value});busy(btn,false);if(!r.ok){if(r.data.code==='wrong_password'){setError(cur,t('Қазіргі құпиясөз қате','Текущий пароль неверный'));cur.focus();}else{setError(nx,t('Құпиясөз ауыстырылмады: 8-ден 128 таңбаға дейін','Пароль не изменён: от 8 до 128 символов'));nx.focus();}return;}toast(t('Құпиясөз өзгерді. Басқа құрылғылардан шықтыңыз.','Пароль изменён. На других устройствах выполнен выход.'));}
   const k=editing;editing=null;render();$(`[data-edit=${k}]`)?.focus();if(k!=='pass')toast(t('Сақталды','Сохранено'));};}
 $$('.pill[data-lang]').forEach(b=>b.onclick=()=>{window.AyanPage?.set(b.dataset.lang);});
 $('#sub-tg').onclick=()=>{open=!open;$('#sub-tg').setAttribute('aria-expanded',String(open));$('#sub-body').hidden=!open;};
 $('#cancel-sub')&&($('#cancel-sub').onclick=()=>modal(`<h2>${t('Жазылымнан бас тарту керек пе?','Отменить подписку?')}</h2><p>${t(`Қолжетімділік ${fmtDate(pr.subscription.endsAt)} дейін сақталады, жаңа шот шығарылмайды.`,`Доступ сохранится до ${fmtDate(pr.subscription.endsAt)}, новый счёт выставлен не будет.`)}</p>
  <form novalidate style="display:grid;gap:12px"><div class="f"><label for="why">${t('Себебі (міндетті емес)','Причина (необязательно)')}</label><textarea class="in" id="why" rows="3" maxlength="500"></textarea></div><p class="alert err" role="alert" id="dlg-err"></p>
  <div class="actions"><button class="b" type="button" data-close>${t('Жазылымды қалдыру','Оставить подписку')}</button><button class="b danger fill">${t('Бас тарту','Отменить')}</button></div></form>`,async f=>{const b=$('button.danger',f);busy(b,true);const r=await api.cancel($('#why').value.trim());busy(b,false);if(!r.ok){$('#dlg-err').textContent=errText(r,t('Болмады. Қайталап көріңіз.','Не получилось. Попробуйте ещё раз.'));return;}pr.subscription=r.data.subscription;dlg.close();render();toast(t('Жазылым тоқтатылды','Подписка отменена'));$('#resume-sub')?.focus();}));
 $('#resume-sub')&&($('#resume-sub').onclick=async e=>{const b=e.currentTarget;busy(b,true);const r=await api.resume();busy(b,false);if(r.ok){pr.subscription=r.data.subscription;render();toast(t('Жазылым жалғасты','Подписка возобновлена'));$('#cancel-sub')?.focus();}else toast(errText(r,t('Болмады','Не получилось')));});
 $('#refund')&&($('#refund').onclick=()=>{const p=refundable();modal(`<h2>${t('Қайтаруды сұрау','Запросить возврат')}</h2><p>${t(`Түбіртек № ${esc(p.receipt)}, ${money(p.amount)}. Өтінішті қолдау қызметі қарап, ақшаны сол тәсілмен 10 жұмыс күні ішінде қайтарады.`,`Чек № ${esc(p.receipt)}, ${money(p.amount)}. Поддержка рассмотрит заявку и вернёт деньги тем же способом в течение 10 рабочих дней.`)}</p>
  <form novalidate style="display:grid;gap:12px"><div class="f"><label for="ref-why">${t('Не сәйкес келмеді? (міндетті емес)','Что не подошло? (необязательно)')}</label><textarea class="in" id="ref-why" rows="3" maxlength="1000"></textarea></div><p class="alert err" role="alert" id="dlg-err"></p>
  <div class="actions"><button class="b" type="button" data-close>${t('Болдырмау','Отмена')}</button><button class="b primary">${t('Өтінім жіберу','Отправить заявку')}</button></div></form>`,async f=>{const b=$('button.primary',f);busy(b,true);
  const r=await api.support({email:pr.user.email,message:`Запрос на возврат (14 дней): чек ${p.receipt}, ${p.amount} KZT. ${$('#ref-why').value.trim()}`.slice(0,2000)});busy(b,false);
  if(!r.ok){$('#dlg-err').textContent=errText(r,t('Жіберілмеді. Қайталап көріңіз.','Не отправлено. Попробуйте ещё раз.'));return;}dlg.close();toast(t('Өтінім қабылданды. Поштаңызға жауап жазамыз.','Заявка принята. Ответим на вашу почту.'));});});
 $('#revoke').onclick=async e=>{const b=e.currentTarget;busy(b,true);const r=await api.revoke('others');busy(b,false);toast(r.ok?t('Басқа құрылғылардан шықтыңыз','Выход на других устройствах выполнен'):t('Болмады','Не получилось'));};
 $('#logout').onclick=async e=>{busy(e.currentTarget,true);await api.signOut();location.assign('/');};
 $('#undo-del')&&($('#undo-del').onclick=async()=>{const r=await api.cancelDelete();if(r.ok){await load();toast(t('Жою болдырылмады','Удаление отменено'));}});
 $('#del')&&($('#del').onclick=()=>modal(`<h2 style="color:var(--error)">${t('Аккаунтты жою','Удалить аккаунт')}</h2><p>${t('30 күннен кейін аккаунт, оқушылар және нәтижелер біржола жойылады. Төлем құжаттарын заң бойынша 5 жыл сақтаймыз.','Через 30 дней аккаунт, ученики и результаты будут удалены безвозвратно. Платёжные документы по закону храним 5 лет.')}</p>
  <form novalidate style="display:grid;gap:12px"><div class="f"><label for="del-pw">${t('Растау үшін құпиясөз','Пароль для подтверждения')}</label><input class="in" id="del-pw" type="password" autocomplete="current-password"></div>
  <div class="check-wrap"><label class="check"><input type="checkbox" id="del-ok"><span>${t('Деректер 30 күннен кейін қалпына келтірілмейтінін түсінемін','Понимаю, что через 30 дней данные нельзя будет восстановить')}</span></label></div>
  <div class="actions"><button class="b" type="button" data-close>${t('Болдырмау','Отмена')}</button><button class="b danger fill">${t('Аккаунтты жою','Удалить аккаунт')}</button></div></form>`,async f=>{clearErrors(f);const pw=$('#del-pw'),ok=$('#del-ok');
  if(!pw.value)setError(pw,t('Құпиясөзді жазыңыз','Напишите пароль'));if(!ok.checked)setError(ok,t('Растау үшін белгі қойыңыз','Отметьте, чтобы подтвердить'));if($('[aria-invalid=true]',f)){$('[aria-invalid=true]',f).focus();return;}
  const b=$('button.danger',f);busy(b,true);const r=await api.deleteAccount(pw.value);busy(b,false);
  if(!r.ok){setError(pw,r.data.code==='wrong_password'?t('Құпиясөз қате','Пароль неверный'):errText(r,t('Болмады. Қайталап көріңіз.','Не получилось. Попробуйте ещё раз.')));pw.focus();return;}
  dlg.close();$('#acc').innerHTML=`<div class="card"><h1>${t('Аккаунт жоюға жіберілді','Аккаунт отправлен на удаление')}</h1><p class="muted" style="margin-top:10px">${t(`Деректер ${fmtDate(r.data.dueAt)} жойылады. Ойыңыз өзгерсе, осы күнге дейін кіріп, жоюды болдырмаңыз.`,`Данные будут удалены ${fmtDate(r.data.dueAt)}. Если передумаете, войдите до этой даты и отмените удаление.`)}</p><div class="row-btns"><a class="b primary" href="/">${t('Басты бетке','На главную')}</a></div></div>`;$('#acc h1').setAttribute('tabindex','-1');$('#acc h1').focus();}));
}

async function load(){
 const r=await api.profile();if(r.status===401){location.replace('/login?next=/account');return;}
 if(!r.ok){$('#acc').innerHTML=`<div class="alert err" role="alert">${t('Аккаунт жүктелмеді. Бетті жаңартыңыз.','Не удалось загрузить аккаунт. Обновите страницу.')}</div>`;return;}
 pr=r.data;const p=await api.payments();pays=p.ok?p.data.payments||[]:[];render();
}
onLang(()=>render());load();
