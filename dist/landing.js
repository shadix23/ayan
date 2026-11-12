const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.12});
document.querySelectorAll('.story-section,.support-section,.family-section,.faq').forEach(e=>{e.classList.add('reveal');observer.observe(e);});
document.querySelector('.hello-trigger').onclick=()=>{if(!reduced.matches)document.querySelector('.ayan-cartoon').animate([{transform:'rotate(0)'},{transform:'rotate(-7deg) translateY(-12px)'},{transform:'rotate(5deg)'},{transform:'rotate(0)'}],{duration:850,easing:'ease-in-out'});};
