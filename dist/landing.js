// Landing: mount 3D Ayan and wire the movement buttons. No scroll-triggered reveals.
const mascot=AyanMascot.create(document.querySelector('#intro-mascot'),{motion:true});
let greeted=false;try{greeted=sessionStorage.getItem('ayan.greeted')==='1';sessionStorage.setItem('ayan.greeted','1');}catch(e){}
mascot.play(greeted?'Wave':'Greet');
document.querySelectorAll('[data-mascot-clip]').forEach(button=>button.onclick=()=>mascot.play(button.dataset.mascotClip));
// A small hop when the pointer reaches the child demo links (mouse only, never on touch).
if(matchMedia('(hover:hover)').matches)document.querySelectorAll('a[href="/demo/child"]').forEach(a=>a.addEventListener('pointerenter',()=>mascot.play('Jump')));
window.addEventListener('pagehide',()=>mascot.destroy(),{once:true});
