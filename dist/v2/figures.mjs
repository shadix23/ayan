// Inline SVG illustrations for lessons. Geometry is exact (part angle/width = weight / total), so the picture never
// disagrees with the evaluator. Selected parts get an outline and a check mark, not only a color.
import {esc,lang} from './ui.mjs';
const sum=a=>a.reduce((x,y)=>x+y,0);
const C={crust:'#E2B06A',cheese:'#F6DE9A',pep:'#C8644C',basil:'#5C7A4E',sel:'#B8DCD2',selEdge:'#1F5E57',line:'#FFFFFF',neutral:'#FBF4E2',edge:'#8A6B3A',paper:'#FFFFFF',paperEdge:'#879A96',choc:'#9A6A47',chocTop:'#B07D57',chocEdge:'#6E4A30'};
function arc(cx,cy,r,a0,a1){const p=a=>[cx+r*Math.sin(a*Math.PI/180),cy-r*Math.cos(a*Math.PI/180)];const [x0,y0]=p(a0),[x1,y1]=p(a1);
 if(a1-a0>=359.999)return `M${cx},${cy-r} A${r},${r} 0 1 1 ${cx-0.01},${cy-r} Z`;return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1-a0>180?1:0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;}
const mid=(cx,cy,r,a)=>[cx+r*Math.sin(a*Math.PI/180),cy-r*Math.cos(a*Math.PI/180)];
const tick=(x,y,s=1)=>`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})"><circle r="9" fill="#fff" stroke="${C.selEdge}" stroke-width="2"/><path d="m-4 .5 2.7 2.7L4.3-3" stroke="${C.selEdge}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;

// spec: {shape:'circle'|'rect', context, parts:[w], selected:[i]}; opts: {size, interactive, highlight, label, numbers, placed}
export function fraction(spec,opts={}){
 const parts=spec.parts,W=sum(parts),sel=new Set(opts.selected??spec.selected??[]),ctx=spec.context||(spec.shape==='rect'?'strip':'circle');
 const label=opts.label?`role="img" aria-label="${esc(opts.label)}"`:'aria-hidden="true"';const cls=`illus fig-fraction${opts.interactive?' is-interactive':''}`;
 if(spec.shape==='rect'){
  const w=300,h=ctx==='chocolate'?150:110,x0=10,y0=10;let x=x0;let out=`<svg class="${cls}" viewBox="0 0 ${w+20} ${h+20}" width="${opts.size||320}" ${label}>`;
  parts.forEach((p,i)=>{const pw=p/W*w,on=sel.has(i);
   const fill=on?C.sel:ctx==='chocolate'?C.choc:ctx==='rect'?'#FFF8E8':C.paper;
   out+=`<rect x="${x.toFixed(2)}" y="${y0}" width="${pw.toFixed(2)}" height="${h}" fill="${fill}" ${opts.interactive?`data-part="${i}" class="part"`:''} />`;
   if(ctx==='chocolate'&&!on)out+=`<rect x="${(x+6).toFixed(2)}" y="${y0+6}" width="${Math.max(0,pw-12).toFixed(2)}" height="${h-12}" rx="6" fill="${C.chocTop}" pointer-events="none"/>`;
   if(on)out+=tick(x+pw/2,y0+h/2,opts.size&&opts.size<160?1.6:1);
   if(opts.numbers)out+=`<text x="${(x+pw/2).toFixed(1)}" y="${y0+h-10}" text-anchor="middle" font-size="15" font-weight="800" fill="#243342">${i+1}</text>`;
   x+=pw;});
  x=x0;parts.forEach((p,i)=>{const pw=p/W*w;if(i>0)out+=`<line x1="${x.toFixed(2)}" y1="${y0}" x2="${x.toFixed(2)}" y2="${y0+h}" stroke="${ctx==='chocolate'?C.chocEdge:C.paperEdge}" stroke-width="2.5"/>`;x+=pw;});
  out+=`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6" fill="none" stroke="${ctx==='chocolate'?C.chocEdge:C.paperEdge}" stroke-width="3"/>`;
  if(opts.highlight){x=x0;parts.forEach(p=>{const pw=p/W*w;out+=`<rect x="${(x+3).toFixed(1)}" y="${y0+3}" width="${(pw-6).toFixed(1)}" height="${h-6}" rx="4" fill="none" stroke="#0369A1" stroke-width="2.5" stroke-dasharray="7 5" pointer-events="none"/>`;x+=pw;});}
  x=x0;parts.forEach((p,i)=>{const pw=p/W*w;if(sel.has(i))out+=`<rect x="${(x+1.5).toFixed(1)}" y="${y0+1.5}" width="${(pw-3).toFixed(1)}" height="${h-3}" fill="none" stroke="${C.selEdge}" stroke-width="3.5" pointer-events="none"/>`;x+=pw;});
  return out+'</svg>';
 }
 const cx=110,cy=110,r=94,pizza=ctx==='pizza',cake=ctx==='cake';let a=0;
 let out=`<svg class="${cls}" viewBox="0 0 220 220" width="${opts.size||320}" ${label}>`;
 if(pizza||cake)out+=`<circle cx="${cx}" cy="${cy}" r="${r+7}" fill="${pizza?C.crust:'#E9B7A0'}"/>`;
 parts.forEach((p,i)=>{const a1=a+p/W*360,on=sel.has(i);
  out+=`<path d="${arc(cx,cy,r,a,a1)}" fill="${on?C.sel:pizza?C.cheese:cake?'#FBE7D6':C.neutral}" ${opts.interactive?`data-part="${i}" class="part"`:''}/>`;
  if(pizza&&!opts.plain){const [px,py]=mid(cx,cy,r*.55,(a+a1)/2),[bx,by]=mid(cx,cy,r*.72,(a+a1)/2+Math.min(14,(a1-a)/4));
   out+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${Math.min(13,(a1-a)/7+5)}" fill="${C.pep}" class="opt-detail" pointer-events="none"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="4.5" fill="${C.basil}" class="opt-detail" pointer-events="none"/>`;}
  a=a1;});
 a=0;parts.forEach(p=>{const [x,y]=mid(cx,cy,r,a);out+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${pizza||cake?C.line:C.edge}" stroke-width="${pizza||cake?3:2.5}"/>`;a+=p/W*360;});
 out+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${pizza||cake?'#D9A55C':C.edge}" stroke-width="3"/>`;
 if(opts.highlight){a=0;parts.forEach((p,i)=>{const a1=a+p/W*360;out+=`<path d="${arc(cx,cy,r-4,a+1.5,a1-1.5)}" fill="none" stroke="#0369A1" stroke-width="2.5" stroke-dasharray="7 5" pointer-events="none"/>`;const [nx,ny]=mid(cx,cy,r*.5,(a+a1)/2);out+=`<text x="${nx.toFixed(1)}" y="${(ny+5).toFixed(1)}" text-anchor="middle" font-size="15" font-weight="800" fill="#0369A1" pointer-events="none">${i+1}</text>`;a=a1;});}
 a=0;parts.forEach((p,i)=>{const a1=a+p/W*360;if(sel.has(i)){out+=`<path d="${arc(cx,cy,r,a,a1)}" fill="none" stroke="${C.selEdge}" stroke-width="4" stroke-linejoin="round" pointer-events="none"/>`;const [tx,ty]=mid(cx,cy,r*.3,(a+a1)/2);out+=tick(tx,ty,opts.size&&opts.size<160?1.5:1);}a=a1;});
 if(opts.numbers&&!opts.highlight){a=0;parts.forEach((p,i)=>{const a1=a+p/W*360;const [nx,ny]=mid(cx,cy,r*.8,(a+a1)/2);out+=`<text x="${nx.toFixed(1)}" y="${(ny+5).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="800" fill="#243342" pointer-events="none">${i+1}</text>`;a=a1;});}
 return out+'</svg>';
}
// Empty outline with d slots; placed unit pieces fill slots in order, a wrong-size piece shows as a lighter overlay.
export function buildFrame(spec,placed,opts={}){
 const d=spec.target[1],units=placed.filter(x=>x==='u').length,others=placed.filter(x=>x!=='u').length;
 const sel=[...Array(Math.min(units,d)).keys()];const base=fraction({...spec,parts:Array(d).fill(1),selected:sel},{size:opts.size||300,label:opts.label});
 return base.replace('</svg>',others?`<text x="50%" y="96%" text-anchor="middle" font-size="13" font-weight="800" fill="#6B4A00">+ ${others}</text></svg>`:'</svg>');
}
export function piece(size,shape,px=44){
 const [n,d]=size;if(shape==='rect')return `<svg viewBox="0 0 64 30" width="${px+10}" aria-hidden="true"><rect x="2" y="2" width="${(60*n/d).toFixed(1)}" height="26" rx="3" fill="${C.sel}" stroke="${C.selEdge}" stroke-width="2"/></svg>`;
 return `<svg viewBox="0 0 64 64" width="${px}" aria-hidden="true"><path d="${arc(32,32,28,0,360*n/d)}" fill="${C.sel}" stroke="${C.selEdge}" stroke-width="2"/></svg>`;
}
export function pair(spec,opts={}){return `<div class="row" style="justify-content:center;gap:28px">${fraction(spec.a,{size:opts.size||180})}<span style="font-size:2rem;font-weight:800;color:#0F766E" aria-hidden="true">?</span>${fraction(spec.b,{size:opts.size||180})}</div>`;}
export function plant(opts={}){const hl=opts.highlight;const ring=(k,d)=>hl===k?`<path d="${d}" fill="none" stroke="#0369A1" stroke-width="3" stroke-dasharray="7 5"/>`:'';
 return `<svg class="illus" viewBox="0 0 260 260" width="${opts.size||260}" ${opts.label?`role="img" aria-label="${esc(opts.label)}"`:'aria-hidden="true"'}><rect x="0" y="170" width="260" height="90" rx="12" fill="#E9DCC3"/>
 <path d="M130 172V70" stroke="#4F8A58" stroke-width="8" stroke-linecap="round"/><path d="M130 112c-30-6-48-26-50-46 26 2 44 18 50 46zM130 92c26-8 42-28 42-46-24 4-38 20-42 46z" fill="#6BA36F" stroke="#3F7448" stroke-width="2"/>
 <circle cx="130" cy="58" r="14" fill="#F4B740"/><circle cx="130" cy="58" r="6" fill="#C8644C"/>
 <path d="M130 172c0 20-6 34-22 46M130 178c4 22 12 34 28 42M130 176c-2 26 0 44 4 60M118 196c-12 4-20 10-26 20M142 200c10 2 20 8 26 18" stroke="#9A6A47" stroke-width="4" fill="none" stroke-linecap="round"/>
 ${ring('root','M84 180h92v76H84z')}${ring('stem','M118 70h24v100h-24z')}${ring('leaf','M74 34h104v84H74z')}
 <g font-size="13" font-weight="800" fill="#243342"><text x="196" y="226">${esc(opts.labels?.root||'')}</text><text x="150" y="150">${esc(opts.labels?.stem||'')}</text><text x="182" y="54">${esc(opts.labels?.leaf||'')}</text></g></svg>`;}
export function tree(opts={}){return `<svg class="illus" viewBox="0 0 260 260" width="${opts.size||240}" ${opts.label?`role="img" aria-label="${esc(opts.label)}"`:'aria-hidden="true"'}><rect x="0" y="196" width="260" height="64" rx="12" fill="#E9DCC3"/><rect x="116" y="110" width="28" height="90" rx="8" fill="#8B5E3C"/><circle cx="130" cy="86" r="62" fill="#6BA36F"/><circle cx="96" cy="100" r="34" fill="#5C9862"/><circle cx="166" cy="98" r="34" fill="#5C9862"/><path d="M124 200c-10 18-26 26-40 30M136 200c10 16 26 24 42 28" stroke="#9A6A47" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M128 120v76" stroke="#0369A1" stroke-width="3" stroke-dasharray="7 5"/></svg>`;}
export function cell(opts={}){const rot=!!opts.rotated,hl=opts.highlight;
 // Fixed letters: A wall, B nucleus, C chloroplast, D vacuole. The rotated variant moves parts and changes letters.
 const L=rot?{wall:'B',nucleus:'D',chloro:'A',vacuole:'C'}:{wall:'A',nucleus:'B',chloro:'C',vacuole:'D'};
 const pos=rot?{nucleus:[188,74],chloro:[70,170],vacuole:[120,120]}:{nucleus:[76,84],chloro:[190,170],vacuole:[140,120]};
 const tag=(k,x,y)=>`<g><circle cx="${x}" cy="${y}" r="15" fill="${hl===L[k]?'#0369A1':'#243342'}"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">${L[k]}</text></g>`;
 return `<svg class="illus" viewBox="0 0 280 240" width="${opts.size||300}" ${opts.label?`role="img" aria-label="${esc(opts.label)}"`:'aria-hidden="true"'}>
 <rect x="16" y="16" width="248" height="208" rx="26" fill="#DCEFD8" stroke="#3F7448" stroke-width="7"/><rect x="26" y="26" width="228" height="188" rx="20" fill="#EEF7E9" stroke="#7FB27F" stroke-width="2"/>
 <ellipse cx="${pos.vacuole[0]}" cy="${pos.vacuole[1]}" rx="58" ry="44" fill="#E3F1F8" stroke="#7FA9C2" stroke-width="2.5"/>
 <circle cx="${pos.nucleus[0]}" cy="${pos.nucleus[1]}" r="22" fill="#C9B6DE" stroke="#7D63A6" stroke-width="2.5"/><circle cx="${pos.nucleus[0]+4}" cy="${pos.nucleus[1]-3}" r="7" fill="#8F74B8"/>
 ${[[0,0],[26,-14],[-22,12],[18,22]].map(([dx,dy])=>`<ellipse cx="${pos.chloro[0]+dx}" cy="${pos.chloro[1]+dy}" rx="13" ry="7" fill="#4E9A54" stroke="#2F6B35" stroke-width="1.5"/>`).join('')}
 ${opts.labels!==false?tag('wall',rot?250:30,rot?210:30)+tag('nucleus',pos.nucleus[0]+30,pos.nucleus[1]-26)+tag('chloro',pos.chloro[0]+40,pos.chloro[1]+30)+tag('vacuole',pos.vacuole[0]+10,pos.vacuole[1]):''}</svg>`;}
export function robot(opts={}){const path=opts.path||['f'];let x=1,y=3,dir=0;const pts=[[x,y]];const dx=[0,1,0,-1],dy=[-1,0,1,0];
 for(const s of path){if(s==='r')dir=(dir+1)%4;else if(s==='l')dir=(dir+3)%4;else{x+=dx[dir];y+=dy[dir];pts.push([x,y]);}}
 const cell=44,o=10,grid=[...Array(5)].flatMap((_,i)=>[...Array(5)].map((_,j)=>`<rect x="${o+j*cell}" y="${o+i*cell}" width="${cell}" height="${cell}" fill="${(i+j)%2?'#F3F7F5':'#FFFFFF'}" stroke="#DFE7E2"/>`)).join('');
 const [ex,ey]=pts[pts.length-1];
 return `<svg class="illus" viewBox="0 0 240 240" width="${opts.size||220}" ${opts.label?`role="img" aria-label="${esc(opts.label)}"`:'aria-hidden="true"'}>${grid}<polyline points="${pts.map(([a,b])=>`${o+a*cell+22},${o+b*cell+22}`).join(' ')}" fill="none" stroke="#0F766E" stroke-width="4" stroke-dasharray="8 6" stroke-linecap="round"/>
 <rect x="${o+pts[0][0]*cell+8}" y="${o+pts[0][1]*cell+8}" width="28" height="28" rx="8" fill="#0F766E"/><circle cx="${o+pts[0][0]*cell+17}" cy="${o+pts[0][1]*cell+20}" r="3" fill="#fff"/><circle cx="${o+pts[0][0]*cell+27}" cy="${o+pts[0][1]*cell+20}" r="3" fill="#fff"/>
 <path d="m${o+ex*cell+22} ${o+ey*cell+8} 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#F4B740" stroke="#8A5A00" stroke-width="1.5"/></svg>`;}
export function steps(opts={}){return `<ol class="illus" style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;min-width:240px">${(opts.items||[]).map((s,i)=>`<li style="display:flex;gap:12px;align-items:center;background:#F6F9F7;border-radius:14px;padding:12px 14px;font-weight:700"><span style="width:30px;height:30px;border-radius:50%;background:#0F766E;color:#fff;display:grid;place-items:center;font-weight:800">${i+1}</span>${esc(s)}</li>`).join('')}</ol>`;}
export function ifthen(opts={}){return `<svg class="illus" viewBox="0 0 300 170" width="${opts.size||300}" ${opts.label?`role="img" aria-label="${esc(opts.label)}"`:'aria-hidden="true"'}><rect x="10" y="10" width="120" height="70" rx="16" fill="#FFF3D6" stroke="#8A5A00" stroke-width="2"/><text x="70" y="42" text-anchor="middle" font-size="16" font-weight="800" fill="#243342">${esc(opts.ifText||'ЕСЛИ')}</text><text x="70" y="64" text-anchor="middle" font-size="13" fill="#526475">${esc(opts.condText||'')}</text>
 <path d="M130 45h40" stroke="#0F766E" stroke-width="3"/><path d="m164 39 8 6-8 6" fill="none" stroke="#0F766E" stroke-width="3"/><rect x="172" y="10" width="118" height="70" rx="16" fill="#E7F2ED" stroke="#0F766E" stroke-width="2"/><text x="231" y="50" text-anchor="middle" font-size="16" font-weight="800" fill="#0F766E">${esc(opts.thenText||'ТО')}</text>
 <path d="M70 80v40h102" stroke="#879A96" stroke-width="3" fill="none" stroke-dasharray="6 5"/><rect x="172" y="96" width="118" height="60" rx="16" fill="#fff" stroke="#879A96" stroke-width="2"/><text x="231" y="132" text-anchor="middle" font-size="15" font-weight="800" fill="#526475">${esc(opts.elseText||'ИНАЧЕ')}</text></svg>`;}
// Text alternative of a figure, so that the schemes of biology and informatics tasks are not silent for a screen reader.
const DIR={ru:{f:'вперёд',r:'направо',l:'налево'},kk:{f:'алға',r:'оңға',l:'солға'}};
export function describe(spec,o={}){
 const kk=lang()==='kk';if(!spec)return '';
 if(spec.type==='cell'){const rot=!!(spec.rotated||o.rotated),A=rot?{wall:'B',nucleus:'D',chloro:'A',vacuole:'C'}:{wall:'A',nucleus:'B',chloro:'C',vacuole:'D'};
  return kk?`Өсімдік жасушасының сызбасы${rot?' (бұрылған)':''}. Сырты тығыз жасуша қабырғасы - ${A.wall} белгісі. Ішінде: ядро - ${A.nucleus}, хлоропластар (жасыл сопақшалар) - ${A.chloro}, вакуоль (үлкен ашық көпіршік) - ${A.vacuole}.`
   :`Схема растительной клетки${rot?' (повёрнута)':''}. Снаружи плотная клеточная стенка - метка ${A.wall}. Внутри: ядро - ${A.nucleus}, хлоропласты (зелёные овалы) - ${A.chloro}, вакуоль (большой светлый пузырь) - ${A.vacuole}.`;}
 if(spec.type==='plant')return kk?'Өсімдік сызбасы: жерде тамыр, жер үстінде жіңішке сабақ, сабақта жапырақтар мен гүл.':'Схема растения: в земле корень, над землёй тонкий стебель, на стебле листья и цветок.';
 if(spec.type==='tree')return kk?'Ағаш: жуан діңі жапырақты тәжді ұстап тұр.':'Дерево: толстый ствол держит крону из листьев.';
 if(spec.type==='robot'){const steps=(spec.path||o.path||[]).map(x=>DIR[kk?'kk':'ru'][x[0]]||x);return kk?`Робот алаңы 5×5 тор. Робот төменгі сол жақта, жолдың соңында жұлдыз. Жол: ${steps.join(', ')}.`:`Поле робота 5 на 5 клеток. Робот внизу слева, в конце пути звезда. Путь: ${steps.join(', ')}.`;}
 if(spec.type==='ifthen')return kk?'Сызба: ЕГЕР шарт дұрыс болса, ОНДА әрекет жасаймыз, әйтпесе басқа әрекет.':'Схема: ЕСЛИ условие верно, ТО делаем действие, ИНАЧЕ делаем другое действие.';
 if(spec.type==='steps')return (kk?'Қадамдар ретімен: ':'Шаги по порядку: ')+((o.items||spec.items?.[kk?'kk':'ru']||[]).join(', '));
 return '';
}
export function figure(spec,opts={}){
 if(!spec)return '';switch(spec.type){case 'fraction':return fraction(spec,opts);case 'pair':return pair(spec,opts);case 'plant':return plant({...spec,...opts,label:opts.label||describe(spec)});case 'tree':return tree({...opts,label:opts.label||describe(spec)});case 'cell':return cell({...spec,...opts,label:opts.label||describe(spec,opts)});case 'robot':return robot({...spec,...opts,label:opts.label||describe(spec,opts)});case 'steps':return steps({...opts,items:opts.items||spec.items});case 'ifthen':return ifthen({...spec,...opts,label:opts.label||describe(spec)});default:return '';}
}
