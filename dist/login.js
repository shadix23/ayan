const P=window.AyanPage,t=(kk,ru)=>P.t(kk,ru);
const isChild=location.pathname.startsWith('/child'),title=document.querySelector('#title'),fields=document.querySelector('#fields'),error=document.querySelector('#error'),register=document.querySelector('#register');let signup=false;
function render(){
 const keep=Object.fromEntries(new FormData(document.querySelector('#login-form')));
 title.textContent=isChild?t('Аянға кіру','Войти к Аяну'):signup?t('Мұғалім аккаунты','Аккаунт учителя'):t('Мұғалімге кіру','Вход для учителя');
 document.querySelector('#description').textContent=isChild?t('Мұғалім берген кодты қой. Пошта мен құпиясөз керек емес.','Вставь код, который дал учитель. Почта и пароль не нужны.'):t('Сабақ материалдары, оқушылар және олардың нәтижелері - сіздің кабинетіңізде.','Материалы занятия, ученики и их результаты - в вашем кабинете.');
 fields.innerHTML=isChild?'<label for="code">'+t('Шақыру коды','Код приглашения')+'</label><input id="code" name="code" required autocomplete="off">'
  :(signup?'<label for="name">'+t('Сізге қалай жүгінейік','Как к вам обращаться')+'</label><input id="name" name="name" required autocomplete="name">':'')
  +'<label for="email">'+t('Пошта','Почта')+'</label><input id="email" name="email" type="email" required autocomplete="email"><label for="password">'+(signup?t('Құпиясөз (8 таңбадан бастап)','Пароль (от 8 символов)'):t('Құпиясөз','Пароль'))+'</label><input id="password" name="password" type="password" '+(signup?'minlength="8" ':'')+'required autocomplete="'+(signup?'new-password':'current-password')+'">';
 for(const [k,v] of Object.entries(keep)){const f=fields.querySelector('[name="'+k+'"]');if(f)f.value=v;}
 register.hidden=isChild;document.querySelector('#submit').textContent=signup?t('Аккаунт ашу →','Создать аккаунт →'):t('Кіру →','Войти →');
 register.textContent=signup?t('Аккаунт бар - кіру','Уже есть аккаунт - войти'):t('Мұғалім аккаунтын ашу','Создать аккаунт учителя');
 document.querySelector('#privacy-link').href=P.link('/privacy');
}
register.onclick=()=>{signup=!signup;render();};render();P.onChange(render);
if(isChild&&location.hash){document.querySelector('#code').value=location.hash.slice(1);history.replaceState(null,'',location.pathname+location.search);}
document.querySelector('form').onsubmit=async e=>{e.preventDefault();error.textContent='';const button=document.querySelector('#submit');button.disabled=true;try{const data=Object.fromEntries(new FormData(e.target));const r=await fetch(isChild?'/api/child/enter':'/api/auth/'+(signup?'sign-up/email':'sign-in/email'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw Error(isChild?t('Сілтеме ескірген немесе код қате. Мұғалімнен жаңа шақыру жасауын сұра.','Ссылка устарела или код неверный. Попроси учителя создать новое приглашение.'):signup?t('Аккаунт ашылмады. Поштаны тексеріңіз, құпиясөз 8 таңбадан кем болмауы керек.','Не удалось создать аккаунт. Проверьте почту, пароль нужен от 8 символов.'):t('Кіру мүмкін болмады. Пошта мен құпиясөзді тексеріңіз.','Не удалось войти. Проверьте почту и пароль.'));location.assign(isChild?'/child':'/teacher');}catch(e){error.textContent=e.message;}finally{button.disabled=false;}};
