(function(root,factory){if(typeof module==='object')module.exports=factory();else root.AyanWorld=factory();})(this,function(){
 'use strict';
 const games=[
 {id:'pairs',title:['Найди пару','Жұбын тап'],desc:['Соедини то, что подходит друг другу','Сәйкес жұптарды тап'],tag:['Внимание','Зейін'],color:'peach',icon:'pairs'},
 {id:'sequence',title:['Что сначала','Алдымен не'],desc:['Собери маленькую историю по шагам','Қадамдарды ретімен қой'],tag:['Порядок','Рет'],color:'lavender',icon:'sequence'},
 {id:'sort',title:['Всё по местам','Өз орнына'],desc:['Найди для каждого предмета свой домик','Әр заттың орнын тап'],tag:['Логика','Логика'],color:'mint',icon:'sort'},
 {id:'pack',title:['Собери рюкзак','Сөмкені жина'],desc:['Что возьмём с собой рисовать?','Сурет салуға не аламыз?'],tag:['Выбор','Таңдау'],color:'yellow',icon:'pack'},
 {id:'pattern',title:['Продолжи узор','Өрнекті жалғастыр'],desc:['Узнай, какая фигура будет следующей','Келесі пішінді тап'],tag:['Закономерности','Заңдылық'],color:'pink',icon:'pattern'},
 {id:'puzzle',title:['Картинка по кусочкам','Суретті құрастыр'],desc:['Собери уютный домик Аяна','Аянның үйін құрастыр'],tag:['Воображение','Қиял'],color:'blue',icon:'puzzle'},
 {id:'listen',title:['Послушай и найди','Тыңда және тап'],desc:['Услышь слово и выбери картинку','Сөзді тыңдап суретті таңда'],tag:['Слова','Сөздер'],color:'peach',icon:'listen'},
 {id:'route',title:['Тропинка открытий','Жаңалықтар жолы'],desc:['Три маленьких задания в одном путешествии','Бір жолда үш шағын тапсырма'],tag:['Приключение','Саяхат'],color:'mint',icon:'route'},
 {id:'garden',title:['Сад Аяна','Аян бағы'],desc:['Посади цветы и создай свой уголок','Гүл егіп өз бағыңды жаса'],tag:['Творчество','Шығармашылық'],color:'lavender',icon:'garden'}];
 const ids=games.map(g=>g.id);
 const seq=[['Подготовь карандаши','Қарындаштарды дайында'],['Нарисуй домик','Үйдің суретін сал'],['Раскрась рисунок','Суретті боя'],['Убери карандаши','Қарындаштарды жина']];
 function clean(x){x=x&&typeof x==='object'?x:{};return {version:2,enabled:Array.isArray(x.enabled)?[...new Set(x.enabled.filter(id=>ids.includes(id)))]:[],completed:Array.isArray(x.completed)?[...new Set(x.completed.filter(id=>ids.includes(id)))]:[],garden:Array.isArray(x.garden)?x.garden.slice(0,12).map(n=>Number.isInteger(n)&&n>=0&&n<6?n:null):[],motion:x.motion!==false};}
 function check(id,value){
   if(id==='sequence'||id==='puzzle')return Array.isArray(value)&&value.length===4&&value.every((v,i)=>v===i);
   if(id==='pack')return Array.isArray(value)&&value.length===3&&[0,1,3].every(n=>value.includes(n));
   return false;
 }
 function award(state,id){const s=clean(state);if(ids.includes(id)&&id!=='garden'&&!s.completed.includes(id))s.completed.push(id);return s;}
 function question(id,n){
  if(id==='pattern'){const patterns=[['●','◆','●','◆','●'],['▲','▲','●','▲','▲'],['◆','●','▲','◆','●'],['●','●','◆','●','●']];return {prompt:patterns[n%4],choices:['●','◆','▲'],answer:[1,0,2,1][n%4]};}
  if(id==='listen'){return {target:[['Цветок','Гүл'],['Дом','Үй'],['Солнце','Күн']][n%3],choices:['garden','home','sun'],answer:n%3};}
  return {prompt:[['Сколько будет 2 + 3?','2 + 3 неше?'],['Что идёт после 4?','4 тен кейін не келеді?'],['Найди число меньше 3','3 тен кіші санды тап']][n%3],choices:n===2?['2','6','8']:['3','5','7'],answer:n===2?0:1};
 }
 function cleanSession(x){
   if(!x||x.version!==2||!ids.includes(x.game)||x.game==='garden'||!Number.isInteger(x.round)||x.round<0||x.round>3)return null;
   if(!Array.isArray(x.order)||!Array.isArray(x.matched)||x.order.some(n=>!Number.isInteger(n)||n<0||n>5)||x.matched.some(n=>!Number.isInteger(n)||n<0||n>3))return null;
   if(new Set(x.order).size!==x.order.length||new Set(x.matched).size!==x.matched.length)return null;
   if(x.game==='puzzle'&&(x.order.length!==4||x.order.some(n=>n>3)))return null;
   if(x.game==='sequence'&&(x.order.length>4||x.order.some(n=>n>3)))return null;
   if(x.game==='pairs'&&x.matched.some(n=>n>2))return null;
   return {version:2,game:x.game,round:x.round,order:x.order.slice(),matched:x.matched.slice()};
 }
 return {games,seq,clean,cleanSession,check,award,question};
});
