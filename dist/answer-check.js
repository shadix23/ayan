// Soft answer check shared by server.mjs (CommonJS require) and the demo (window.AyanAnswer).
// "5", " 5 ", "пять", "Пять.", "бес" all match a teacher answer of "5". Several answers: "5; пять".
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AyanAnswer=factory();})(this,function(){
 'use strict';
 const RU=['ноль','один','два','три','четыре','пять','шесть','семь','восемь','девять','десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать','двадцать'];
 const KK=['нөл','бір','екі','үш','төрт','бес','алты','жеті','сегіз','тоғыз','он','он бір','он екі','он үш','он төрт','он бес','он алты','он жеті','он сегіз','он тоғыз','жиырма'];
 const WORDS=new Map();
 RU.forEach((w,i)=>WORDS.set(w,String(i)));KK.forEach((w,i)=>WORDS.set(w,String(i)));
 for(const [w,n] of [['одна','1'],['одно','1'],['две','2'],['нуль','0']])WORDS.set(w,n);
 function normalize(value){
  let s=String(value??'').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[ \s]+/g,' ').trim();
  s=s.replace(/^[\s.,!?;:«»"'()-]+|[\s.,!?;:«»"'()]+$/g,'');
  s=s.replace(/\s*([+\-=×x*:/])\s*/g,'$1');
  if(WORDS.has(s))return WORDS.get(s);
  if(/^-?\d+([.,]\d+)?$/.test(s))return String(Number(s.replace(',','.')));
  return s;
 }
 function variants(answer){return String(answer??'').split(';').map(normalize).filter(Boolean);}
 function matches(response,answer){const r=normalize(response);return !!r&&variants(answer).includes(r);}
 return {normalize,variants,matches};
});
