import {t,$,$$,topBar,api,setError,clearErrors,focusFirstError,emailOk,busy,eyeToggle,mascot,onLang,errText} from './acc.js';
topBar({current:'signup'});
for(const el of $$('[data-mascot]'))if(el.offsetParent)mascot(el,el.dataset.mascot);
eyeToggle();
const form=$('#signup'),q=new URLSearchParams(location.search);
const pre=q.get('role');if(['teacher','parent','school'].includes(pre)){const r=$(`input[name=role][value=${pre}]`);if(r)r.checked=true;}
// After signup: the plan chosen on /pricing travels on to onboarding and then to checkout.
const planQ=/^[a-z]+$/.test(q.get('plan')||'')?q.get('plan'):'',periodQ=q.get('period')==='year'?'year':'month';

function labels(){
 const role=form.role.value;
 for(const el of $$('[data-for]'))el.hidden=!(el.dataset.for===role||(el.dataset.for==='staff'&&(role==='teacher'||role==='school')));
 $('#name-label').textContent=role==='school'?t('Байланыс тұлғасы: аты-жөні','Контактное лицо: имя'):role==='parent'?t('Сіздің атыңыз','Ваше имя'):t('Сізге қалай жүгінейік','Как к вам обращаться');
 for(const b of $$('.eye'))b.setAttribute('aria-label',b.getAttribute('aria-pressed')==='true'?t('Құпиясөзді жасыру','Скрыть пароль'):t('Құпиясөзді көрсету','Показать пароль'));
}
form.addEventListener('change',e=>{if(e.target.name==='role'){labels();setError($('#role'),'');}if(e.target.type==='checkbox'&&e.target.checked)setError(e.target,'');});
for(const b of $$('.eye'))b.addEventListener('click',labels);
onLang(labels);labels();

function validate(){
 clearErrors(form);const role=form.role.value;let ok=true;
 const bad=(el,msg)=>{setError(el,msg);ok=false;};
 if(!role)bad($('#role'),t('Рөлді таңдаңыз: мұғалім, ата-ана немесе мектеп','Выберите роль: учитель, родитель или школа'));
 if(form.name.value.trim().length<2)bad(form.name,t('Атыңызды жазыңыз','Напишите имя'));
 if(role==='school'&&!form.orgName.value.trim())bad(form.orgName,t('Мектептің атауын жазыңыз','Напишите название школы'));
 const em=form.email.value.trim();if(!em)bad(form.email,t('Поштаны жазыңыз','Напишите почту'));else if(!emailOk(em))bad(form.email,t('Пошта мекенжайы name@mail.kz түрінде болуы керек','Адрес почты должен выглядеть как name@mail.kz'));
 if(form.password.value.length<8)bad(form.password,t('Құпиясөз кемінде 8 таңба болуы керек','Пароль должен быть не короче 8 символов'));
 if(!form.terms.checked)bad(form.terms,t('Жалғастыру үшін шарттар мен саясатты қабылдаңыз','Чтобы продолжить, примите условия и политику'));
 if(role==='parent'&&!form.childData.checked)bad(form.childData,t('Ата-ана аккаунты үшін бала деректерін өңдеуге келісім керек','Для аккаунта родителя нужно согласие на обработку данных ребёнка'));
 return ok;
}
const FIELD={email:'email',password:'password',name:'name',orgName:'orgName',terms:'terms',privacy:'terms',childData:'childData',role:'role'};
form.addEventListener('submit',async e=>{
 e.preventDefault();$('#form-error').textContent='';
 if(!validate()){focusFirstError(form);return;}
 const btn=$('#submit');busy(btn,true,t('Аккаунт ашылуда','Создаём аккаунт'));
 const role=form.role.value;
 const r=await api.register({email:form.email.value.trim(),password:form.password.value,name:form.name.value.trim(),role,orgName:form.orgName.value.trim()||undefined,
  consent:{terms:true,privacy:true,childData:role==='parent'?form.childData.checked:false}});
 busy(btn,false);
 if(r.ok){const next=new URL(r.data.next||'/onboarding',location.origin);if(planQ){next.searchParams.set('plan',planQ);next.searchParams.set('period',periodQ);}location.assign(next.pathname+next.search);return;}
 const d=r.data||{};
 if(d.code==='email_taken'){setError(form.email,t('Бұл пошта тіркелген. Кіріп көріңіз немесе басқа поштаны жазыңыз.','Этот адрес уже зарегистрирован. Войдите или укажите другую почту.'));focusFirstError(form);return;}
 if(d.field&&FIELD[d.field]){const el=d.field==='role'?$('#role'):form[FIELD[d.field]];setError(el,errText(r,t('Өрісті тексеріңіз','Проверьте поле')));focusFirstError(form);return;}
 $('#form-error').textContent=r.status===429?t('Әрекет тым көп. Бірнеше минуттан кейін қайталаңыз.','Слишком много попыток. Повторите через несколько минут.'):errText(r,t('Аккаунт ашылмады. Қайталап көріңіз.','Не удалось создать аккаунт. Попробуйте ещё раз.'));
});
