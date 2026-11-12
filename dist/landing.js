// Landing: mount 3D Ayan and wire the three movement buttons. No scroll-triggered reveals.
const mascot=AyanMascot.create(document.querySelector('#intro-mascot'),{motion:true});mascot.play('Wave');
document.querySelectorAll('[data-mascot-clip]').forEach(button=>button.onclick=()=>mascot.play(button.dataset.mascotClip));
window.addEventListener('pagehide',()=>mascot.destroy(),{once:true});
