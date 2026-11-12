const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.12});
document.querySelectorAll('.story-section,.support-section,.family-section,.faq').forEach(e=>{e.classList.add('reveal');observer.observe(e);});
const mascot=AyanMascot.create(document.querySelector('#intro-mascot'),{motion:true});mascot.play('Wave');
document.querySelectorAll('[data-mascot-clip]').forEach(button=>button.onclick=()=>mascot.play(button.dataset.mascotClip));
window.addEventListener('pagehide',()=>mascot.destroy(),{once:true});
