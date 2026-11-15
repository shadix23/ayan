// Поддержка: частые вопросы и форма «Написать нам» (POST /api/support {email,message}, обращение сохраняется на сервере).
import {t,$,topBar,api,setError,clearErrors,focusFirstError,emailOk,busy,errText} from './acc.js';
topBar({current:'support'});
const f=$('#sup'),em=$('#s-email'),msg=$('#s-msg'),res=$('#s-res');
api.session().then(s=>{if(s?.user?.email&&!em.value)em.value=s.user.email;}).catch(()=>{});
msg.addEventListener('input',()=>{$('#s-count').textContent=msg.value.length+' / 2000';});
if(location.hash==='#write')setTimeout(()=>(em.value?msg:em).focus(),300);
f.addEventListener('submit',async e=>{e.preventDefault();clearErrors(f);res.textContent='';res.className='alert';
 if(!emailOk(em.value.trim()))setError(em,t('Пошта мекенжайы name@mail.kz түрінде болуы керек','Адрес почты должен выглядеть как name@mail.kz'));
 if(!msg.value.trim())setError(msg,t('Хабарламаны жазыңыз','Напишите сообщение'));
 if($('[aria-invalid=true]',f)){focusFirstError(f);return;}
 const b=$('#s-go');busy(b,true,t('Жіберілуде','Отправляем'));const r=await api.support({email:em.value.trim(),message:msg.value.trim()});busy(b,false);
 if(r.ok){res.className='alert ok';res.textContent=t(`Хабарлама жіберілді (№ ${r.data.id}). Жауапты ${em.value.trim()} поштасына жазамыз.`,`Сообщение отправлено (№ ${r.data.id}). Ответим на ${em.value.trim()}.`);msg.value='';$('#s-count').textContent='0 / 2000';return;}
 if(r.data.field==='email'){setError(em,t('Поштаны тексеріңіз','Проверьте почту'));em.focus();return;}
 if(r.data.field==='message'){setError(msg,errText(r,t('Хабарламаны тексеріңіз','Проверьте сообщение')));msg.focus();return;}
 res.className='alert err';res.textContent=r.status===429?t('Хабарлама тым көп. Біраздан кейін қайталаңыз.','Слишком много сообщений. Попробуйте позже.'):t('Жіберілмеді. Интернетті тексеріп, қайталап көріңіз.','Не отправлено. Проверьте интернет и попробуйте ещё раз.');
});
