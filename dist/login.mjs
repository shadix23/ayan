// Вход: учитель, родитель и школа по почте (/login, /teacher/login), ученик по коду приглашения (/child/login).
// The ids (#login-form, #fields, #email, #password, #code, #submit, #error) are kept for the older tests.
import {t,$,$$,topBar,api,setError,clearErrors,focusFirstError,emailOk,busy,eyeToggle,mascot,onLang,esc,EYE} from '/acc/acc.mjs';
const isChild=location.pathname.startsWith('/child');
topBar({current:'login',cta:false});
for(const el of $$('[data-mascot]'))if(el.offsetParent)mascot(el,el.dataset.mascot);
const form=$('#login-form'),fields=$('#fields'),error=$('#error');
const q=new URLSearchParams(location.search),nextQ=q.get('next');
const safeNext=nextQ&&/^\/(?!\/)[\w\-\/#?=&.]*$/.test(nextQ)?nextQ:null;

function render(){
 const keep=Object.fromEntries(new FormData(form));
 $('#title').textContent=isChild?t('Аянға кіру','Войти к Аяну'):t('Кабинетке кіру','Вход в кабинет');
 $('#description').textContent=isChild?t('Мұғалім берген кодты қой. Пошта мен құпиясөз керек емес.','Вставь код, который дал учитель. Почта и пароль не нужны.'):t('Мұғалім, ата-ана немесе мектеп аккаунты.','Аккаунт учителя, родителя или школы.');
 if(isChild){$('#side-title').innerHTML=t('Сәлем!<br>Бүгін бір қадамнан бастаймыз.','Привет!<br>Сегодня начнём с одного шага.');$('#side-text').textContent=t('Кодты мұғалімнен немесе ата-анаңнан сұра.','Код можно спросить у учителя или родителей.');}
 fields.innerHTML=isChild
  ?`<div class="f"><label for="code">${t('Шақыру коды','Код приглашения')}</label><input class="in" id="code" name="code" required autocomplete="off" autocapitalize="off" spellcheck="false"></div>`
  :`<div class="f"><label for="email">${t('Пошта','Почта')}</label><input class="in" id="email" name="email" type="email" inputmode="email" required autocomplete="username email"></div>
   <div class="f"><label for="password">${t('Құпиясөз','Пароль')}</label><div class="pw"><input class="in" id="password" name="password" type="password" required autocomplete="current-password"><button type="button" class="eye" aria-pressed="false" aria-label="${t('Құпиясөзді көрсету','Показать пароль')}">${EYE}</button></div>
   <p class="hint"><a href="/support#write">${t('Құпиясөзді ұмыттыңыз ба? Қолдауға жазыңыз','Забыли пароль? Напишите в поддержку')}</a></p></div>`;
 for(const [k,v] of Object.entries(keep)){const f=fields.querySelector(`[name="${k}"]`);if(f)f.value=v;}
 eyeToggle(fields);
 $('#submit').textContent=t('Кіру','Войти');
 $('#register-line').hidden=isChild;
 $('#register-q').textContent=t('Аккаунтыңыз жоқ па?','Нет аккаунта?');$('#register').textContent=t('Тіркелу','Зарегистрироваться');
 const lk=window.AyanPage?.link||(h=>h);$('#privacy-link').href=lk('/legal/privacy');$('#privacy-side').href=lk('/legal/privacy');$('#register').href=lk('/signup');
}
render();onLang(render);
if(isChild&&location.hash){$('#code').value=decodeURIComponent(location.hash.slice(1));history.replaceState(null,'',location.pathname+location.search);}

form.addEventListener('submit',async e=>{
 e.preventDefault();error.textContent='';clearErrors(form);
 const btn=$('#submit');
 if(isChild){
  const code=$('#code').value.trim();if(!code){setError($('#code'),t('Кодты қой','Вставь код'));focusFirstError(form);return;}
  busy(btn,true,t('Тексеріп жатырмыз','Проверяем'));
  const r=await api.call('/api/child/enter',{method:'POST',body:{code}});busy(btn,false);
  if(r.ok)return location.assign('/child');
  setError($('#code'),t('Сілтеме ескірген немесе код қате. Мұғалімнен жаңа шақыру жасауын сұра.','Ссылка устарела или код неверный. Попроси учителя создать новое приглашение.'));focusFirstError(form);return;
 }
 const email=$('#email').value.trim(),password=$('#password').value;
 if(!email)setError($('#email'),t('Поштаны жазыңыз','Напишите почту'));else if(!emailOk(email))setError($('#email'),t('Пошта мекенжайы name@mail.kz түрінде болуы керек','Адрес почты должен выглядеть как name@mail.kz'));
 if(!password)setError($('#password'),t('Құпиясөзді жазыңыз','Напишите пароль'));
 if($('[aria-invalid=true]',form)){focusFirstError(form);return;}
 busy(btn,true,t('Кіріп жатырмыз','Входим'));
 const r=await api.signIn({email,password});
 if(!r.ok){busy(btn,false);
  error.textContent=r.status===429?t('Әрекет тым көп. Бірнеше минуттан кейін қайталаңыз.','Слишком много попыток. Повторите через несколько минут.'):r.status===0?t('Байланыс жоқ. Интернетті тексеріңіз.','Нет связи. Проверьте интернет.'):t('Кіру мүмкін болмады. Пошта мен құпиясөзді тексеріңіз.','Не удалось войти. Проверьте почту и пароль.');
  $('#password').setAttribute('aria-invalid','true');$('#password').setAttribute('aria-describedby','error');$('#password').focus();return;}
 const p=await api.profile();
 location.assign(safeNext||(p.ok&&p.data.next)||'/teacher');
});
