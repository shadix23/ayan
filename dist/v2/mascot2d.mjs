// Аян 2D: the firefly drawn by hand as one inline SVG rig. Model: the owner's reference hackathon/mascot/user-ref-firefly.webp
// ("Светлячок"), made cleaner: a big round head on its own layer, antennas with balls, large eyes with light brows, a scalloped
// collar, a glowing honey belly, two pairs of translucent wings, short arms and dangling legs (it hovers).
// Same outer contract as mascot.mjs: mount(host,{state,motion,visible}) -> {state,set,update,destroy}. No Three.js, no images.
// Poses are a table "state -> target values of parts"; motion is the Web Animations API only (translate, rotate, scale, opacity),
// with EASE / SPRING / level() from motion.mjs. Тихо (off, reduced motion) = the pose is written at once, zero animations.
// Every new pose starts from the current values (commitStyles + cancel), so a change in mid-motion never jumps.
// The light of the belly is the success scale: sleeps .15, thinks .35, calm .5, lit 1 then .65, celebrates 1 with a halo.
import {EASE,SPRING,level,floatUp} from './motion.mjs';

export const STATES=['Idle','Greeting','Explaining','Thinking','Encouraging','Celebrating','Helping','Lit','Resting','Sleeping'];
// Palette (softer, friendlier): head from #2E9C8E on top to #17786D below with a soft light on the crown, body a step darker,
// limbs dark teal (never near-black), warm honey belly with a lighter centre, light brows; translucent mint wings that stay
// visible on mint cards.
export const C={head:'#23897C',body:'#166F63',limb:'#125F57',brow:'#A9E6D8',wing:'#86D9BB',honey:'#F5B947',light:'#FFE38A',
 ink:'#163A37',mouth:'#62252B',tongue:'#F49482',cream:'#FFF0D2',ground:'#243342'};
// Pivots in viewBox px (transform-box: view-box) and the far tips used for the 24 px ceiling.
export const PIVOT={shadow:[120,232],root:[120,224],squash:[120,215],head:[120,140],wingL:[93,130],wingR:[147,130],armL:[88,150],armR:[152,150],
 antL:[103,57],antR:[137,57],eyeL:[99,99],eyeR:[141,99]};
// The one owner-approved exception to the 24 px ceiling: both arms up in Celebrating ("Живо" only), LIMITS.celebrateArmDeg.
const ARM_UP=globalThis.AyanLights?.LIMITS?.celebrateArmDeg??70;
export const TIP={armL:[71.3,169.7],armR:[168.7,169.7],wingL:[43.4,85.1],wingR:[196.6,85.1],antL:[74,20],antR:[166,20],head:[74,20]};

// ---------- drawing (18 visible shapes; spare mouths and closed-eye lids are stacked and shown instead) ----------
const f=n=>+n.toFixed(1);
// a thick arc with round ends (brow, smile, closed eye): centre, mid radius, thickness, angles in degrees (0 = right, 90 = down)
function band(cx,cy,r,th,a0,a1){const R=r+th/2,I=r-th/2,h=th/2,p=(q,a)=>[f(cx+q*Math.cos(a*Math.PI/180)),f(cy+q*Math.sin(a*Math.PI/180))];
 return `M${p(R,a0)}A${R} ${R} 0 0 1 ${p(R,a1)}A${h} ${h} 0 0 1 ${p(I,a1)}A${I} ${I} 0 0 0 ${p(I,a0)}A${h} ${h} 0 0 1 ${p(R,a0)}Z`;}
// an ellipse as a path, optionally turned by deg (lets one path hold two lobes: wings, legs)
function oval(cx,cy,rx,ry,deg=0,cw=0){const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x1=f(cx+rx*c),y1=f(cy+rx*s),x2=f(cx-rx*c),y2=f(cy-rx*s);
 return `M${x1} ${y1}A${rx} ${ry} ${deg} 1 ${cw} ${x2} ${y2}A${rx} ${ry} ${deg} 1 ${cw} ${x1} ${y1}Z`;}
const MIR='transform="matrix(-1 0 0 1 240 0)"';
// antenna: stalk and ball are one shape of one colour
const ANT=`<path fill="${C.head}" d="M82 29.5C95 29 104 40 107.5 56L100 58C98.5 45.5 92 37.5 81 36Z${oval(80,28,9,9,0,1)}"/>`;
// a teardrop: pointed root at (x,y), round end at length L, width W, turned by deg (180 = pointing left)
function drop(x,y,L,W,deg){const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),P=(u,v)=>`${f(x+u*c-v*s)} ${f(y+u*s+v*c)}`,w=W*.67;
 return `M${P(0,0)}C${P(.34*L,-w)} ${P(L,-w)} ${P(L,0)}C${P(L,w)} ${P(.34*L,w)} ${P(0,0)}Z`;}
const WING=`<path fill="${C.wing}" fill-opacity=".45" d="${drop(96,118,62,33,-148)}${drop(94,141,44,24,170)}"/>`;
const ARM=`<path fill="${C.limb}" d="${oval(80,160,8.5,13,42)}"/>`;
const COLLAR='M92 128C80 132 76 146 82 156C86 164 97 165 102 159C106 166 116 166 120 159C124 166 134 166 138 159C143 165 154 164 158 156C164 146 160 132 148 128Z';
const o=p=>`data-p="${p}"`+(PIVOT[p]?` style="transform-origin:${PIVOT[p][0]}px ${PIVOT[p][1]}px"`:'');
// pupil and its highlight are one shape: the highlight is a hole that shows the white (same corner in both eyes)
const pupil=x=>oval(x,101,11.5,13.5)+oval(x+4.5,95,3.8,3.8);
const SMILE='M112.5 119.5C116 120.5 126 120.5 129.5 119.5C129 127 125.5 131.5 121 131.5C116.5 131.5 113 127 112.5 119.5Z',SMILE_T='M115.5 127.6C117.5 124.8 124.5 124.8 126.5 127.6C124.8 130.6 117.2 130.6 115.5 127.6Z';
const WIDE='M110 118C115 119.5 127 119.5 132 118C131.5 129 127 135.5 121 135.5C115 135.5 110.5 129 110 118Z',WIDE_T='M114 130C116.5 126.2 125.5 126.2 128 130C126 134 116 134 114 130Z';
let uidN=0;
export function svg({mark=false}={}){
 const P=s=>mark?'':' '+o(s),id=mark?'ayan':'ay'+(++uidN);
 const grad=`<radialGradient id="${id}-h" cx=".46" cy=".16" r=".95"><stop offset="0" stop-color="#4DB3A4"/><stop offset=".38" stop-color="#2E9C8E"/><stop offset="1" stop-color="#17786D"/></radialGradient>`;
 const ants=`<g${P('antL')}>${ANT}</g><g${P('antR')}><g ${MIR}>${ANT}</g></g>`;
 const eyes=`<g${P('eyeL')}><ellipse fill="#fff" cx="99" cy="99" rx="16.5" ry="19.5"/><path${P('pupilL')} fill="${C.ink}" fill-rule="evenodd" d="${pupil(102.5)}"/></g>`+
  `<g${P('eyeR')}><ellipse fill="#fff" cx="141" cy="99" rx="16.5" ry="19.5"/><path${P('pupilR')} fill="${C.ink}" fill-rule="evenodd" d="${pupil(144.5)}"/></g>`;
 const brows=`<path${P('brows')} fill="${C.brow}" d="${band(97,81,10,5,218,318)}${band(143,81,10,5,222,322)}"/>`;
 const smile=`<g${P('m-smile')}><path fill="${C.mouth}" d="${SMILE}"/><path fill="${C.tongue}" d="${SMILE_T}"/></g>`;
 const head=`${ants}<ellipse fill="url(#${id}-h)" cx="120" cy="96" rx="54" ry="45"/>`;
 if(mark)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="56 14 128 128" role="img" aria-label="Аян"><defs>${grad}</defs>${head}<g>${brows}${eyes}${smile}</g></svg>`;
 return `<svg class="ayan2d" viewBox="0 0 240 240" stroke="none" aria-hidden="true" focusable="false"><defs>${grad}`+
  `<radialGradient id="${id}-c"><stop offset="0" stop-color="#FFFBEA"/><stop offset=".5" stop-color="#FFE9A3" stop-opacity=".9"/><stop offset="1" stop-color="${C.light}" stop-opacity="0"/></radialGradient>`+
  `<radialGradient id="${id}-g"><stop offset="0" stop-color="${C.light}" stop-opacity=".85"/><stop offset="1" stop-color="${C.light}" stop-opacity="0"/></radialGradient></defs>`+
  `<ellipse ${o('shadow')} fill="${C.ground}" fill-opacity=".08" cx="120" cy="232" rx="30" ry="4"/>`+
  `<g ${o('root')}><g ${o('wingL')}>${WING}</g><g ${o('wingR')}><g ${MIR}>${WING}</g></g><path ${o('feet')} fill="${C.limb}" d="${oval(108,214,5.5,10,18)}${oval(132,214,5.5,10,-18)}"/>`+
  `<g ${o('squash')}><ellipse ${o('halo')} fill="url(#${id}-g)" cx="120" cy="184" rx="70" ry="56" opacity=".2"/>`+
  `<ellipse ${o('belly')} fill="${C.honey}" cx="120" cy="184" rx="41" ry="29"/><ellipse ${o('core')} fill="url(#${id}-c)" cx="120" cy="186" rx="39" ry="26" opacity=".5"/>`+
  `<path ${o('torso')} fill="${C.body}" d="${COLLAR}"/><g ${o('armL')}>${ARM}</g><g ${o('armR')}><g ${MIR}>${ARM}</g></g>`+
  `<g ${o('head')}>${head}<g ${o('face')}>${brows}${eyes}`+
  `<path ${o('lidL')} fill="${C.cream}" opacity="0" d="${band(99,97,10,5,30,150)}"/><path ${o('lidR')} fill="${C.cream}" opacity="0" d="${band(141,97,10,5,30,150)}"/>`+
  `${smile}<g ${o('m-wide')} opacity="0"><path fill="${C.mouth}" d="${WIDE}"/><path fill="${C.tongue}" d="${WIDE_T}"/></g>`+
  `<rect ${o('m-flat')} fill="${C.cream}" opacity="0" x="114" y="123" width="14" height="5" rx="2.5"/><ellipse ${o('m-o')} fill="${C.mouth}" opacity="0" cx="121" cy="126" rx="5" ry="6"/>`+
  `<path ${o('m-sleep')} fill="${C.cream}" opacity="0" d="${band(121,120,5.5,4.5,35,145)}"/></g></g></g></g></svg>`;
}

// ---------- poses ----------
// arms/wings: positive = raised outwards; ants: positive = droops outwards; look/face: px; head: tilt in degrees (+ = to the
// viewer's right) and drop in px; brows: px up (negative) or down; core/halo: light; null = keep.
const BASE={tilt:0,jump:0,squash:[1,1],arms:[0,0],armT:[[0,0],[0,0]],wings:0,ants:[0,0],look:[0,0],face:[0,0],head:0,headY:0,brows:0,core:.5,halo:.2,mouth:'smile',eyes:'open'};
export const POSES={
 Idle:{},
 Greeting:{arms:[0,40],wings:6,head:3,brows:-2.5,mouth:'wide'},
 Explaining:{tilt:-2,arms:[22,0],look:[-2,1],face:[-1.5,.5],head:-1.5,brows:-1},
 Thinking:{arms:[-18,0],armT:[[9,-7],[0,0]],ants:[0,-12],look:[2.5,-3],face:[1,-1.5],head:3,brows:-3,core:.35,halo:.08,mouth:'flat'},
 Encouraging:{tilt:-4,arms:[35,0],look:[-2.5,1.5],face:[-2,1],head:-2,brows:-1.5,core:null},
 Celebrating:{arms:[ARM_UP,ARM_UP],wings:10,look:[0,-1.5],brows:-3,core:1,halo:.8,mouth:'wide'},
 Helping:{tilt:-4,arms:[35,0],look:[-2.5,1.5],face:[-2,1],head:-2,brows:-1.5,core:null},
 Lit:{brows:-2,core:.65,halo:.3,mouth:'wide'},
 Resting:{arms:[-28,-28],head:-2,headY:1,brows:1.5,core:.4,halo:.12,mouth:'sleep',eyes:'closed'},
 Sleeping:{squash:[1,.96],arms:[-10,-10],wings:-4,ants:[25,25],head:4,headY:2,brows:2,core:.15,halo:0,mouth:'sleep',eyes:'closed'}
};
const MOUTHS=['smile','wide','flat','o','sleep'];
const LIGHT=new Set(['core','halo']);
// pose -> {part: {prop: value}}. "Мягко": half the rotations, no jump, no squash reaction.
export function targets(pose,{soft=false}={}){
 const q={...BASE,...pose},k=soft?.5:1,cl=q.eyes==='closed';
 const T={root:{translate:[0,soft?0:q.jump],rotate:q.tilt*k},squash:{scale:soft&&!cl?[1,1]:q.squash},shadow:{scale:[1,1],opacity:1},
  head:{rotate:q.head*k,translate:[0,q.headY]},brows:{translate:[0,q.brows]},
  wingL:{rotate:q.wings*k},wingR:{rotate:-q.wings*k},
  armL:{rotate:q.arms[0]*k,translate:[q.armT[0][0]*k,q.armT[0][1]*k]},armR:{rotate:-q.arms[1]*k,translate:[-q.armT[1][0]*k,q.armT[1][1]*k]},
  antL:{rotate:-q.ants[0]*k},antR:{rotate:q.ants[1]*k},face:{translate:q.face},pupilL:{translate:q.look},pupilR:{translate:q.look},
  eyeL:{opacity:cl?0:1,scale:[1,1]},eyeR:{opacity:cl?0:1,scale:[1,1]},lidL:{opacity:cl?1:0},lidR:{opacity:cl?1:0}};
 if(q.core!=null)T.core={opacity:q.core};if(q.halo!=null)T.halo={opacity:q.halo};
 for(const m of MOUTHS)T['m-'+m]={opacity:q.mouth===m?1:0};
 return T;
}

// ---------- choreography ----------
// A track: {p, prop, keys:[[ms, value|null, easing-into-this-key]...], light}. null = the previous value (the first one = current).
// Curves keep every point under 8 px per 60 fps frame: the fall ends at twice the mean speed, the squash starts after contact.
// The head is its own layer: it lags the body (follow-through) by a few px and degrees, inside the ceilings.
const OUT=EASE,LIFT='cubic-bezier(.3,.55,.35,1)',FALL='cubic-bezier(.45,0,.75,.5)',SQ='cubic-bezier(.3,.4,.6,1)',IO='ease-in-out',EO='ease-out',EI='ease-in';
const T=(p,prop,keys,light=false)=>({p,prop,keys,light});
const mir=(p,prop,keys)=>[T(p+'L',prop,keys),T(p+'R',prop,keys.map(([t,v,e])=>[t,v==null?v:-v,e]))];
const mouth=(m,at)=>MOUTHS.map(x=>T('m-'+x,'opacity',[[0,null],[at,null],[at+100,x===m?1:0,'linear']]));
const CH={
 Lit:()=>[
  T('squash','scale',[[0,null],[90,[1.04,.95],EO],[200,[.97,1.05],IO],[250,[1,1],IO],[370,[1,1.01],EI],[430,[1.05,.95],SQ],[600,[1,1],SPRING]]),
  T('root','translate',[[0,null],[90,null],[250,[0,-14],LIFT],[370,[0,0],FALL],[600,[0,0]]]),
  T('head','translate',[[0,null],[90,[0,1],EO],[210,[0,2],IO],[320,[0,-1.5],IO],[440,[0,2],SQ],[600,[0,0],SPRING]]),
  T('head','rotate',[[0,null],[140,null],[300,-2,IO],[450,1.5,IO],[600,0,EO]]),
  T('brows','translate',[[0,null],[90,null],[220,[0,-3],EO],[600,[0,-2],IO]]),
  ...mir('wing','rotate',[[0,null],[60,null],[210,16,EO],[400,3,IO],[600,0,SPRING]]),
  ...mir('ant','rotate',[[0,null],[80,null],[200,-8,EO],[340,6,IO],[470,-2,IO],[600,0,'ease-out']]),
  ...mir('arm','rotate',[[0,null],[130,null],[260,10,EO],[440,0,IO]]),
  ...mouth('wide',90),
  T('core','opacity',[[0,null],[600,null],[800,1,OUT],[1700,.65,IO]],true),T('halo','opacity',[[0,null],[600,null],[800,.7,OUT],[1700,.3,IO]],true)],
 Celebrating:()=>[
  T('squash','scale',[[0,null],[160,[1.06,.94],EO],[290,[.97,1.05],IO],[420,[1,1],IO],[640,[1,1]],[780,[1,1.01],EI],[840,[1.05,.95],SQ],[920,[1.02,.98],IO],
   [1000,[.99,1.02],IO],[1060,[1,1],IO],[1200,[1,1.01],EI],[1260,[1.04,.96],SQ],[1500,[1,1],SPRING]]),
  T('root','translate',[[0,null],[160,null],[420,[0,-24],LIFT],[640,[0,-21],IO],[780,[0,0],FALL],[920,[0,0]],[1060,[0,-12],LIFT],[1200,[0,0],FALL],[1500,[0,0]]]),
  T('head','translate',[[0,null],[160,[0,1.5],EO],[300,[0,2.5],IO],[460,[0,-2],IO],[640,[0,-1],IO],[860,[0,2.5],SQ],[1000,[0,-1],IO],[1280,[0,1.5],SQ],[1500,[0,0],SPRING]]),
  T('head','rotate',[[0,null],[300,null],[480,-3,IO],[640,3,IO],[820,-2,IO],[1000,2,IO],[1500,0,EO]]),
  T('brows','translate',[[0,null],[160,null],[300,[0,-3],EO]]),
  ...mir('arm','rotate',[[0,null],[200,null],[540,ARM_UP,IO],[780,ARM_UP],[860,ARM_UP-8,EO],[990,ARM_UP,IO],[1200,ARM_UP],[1270,ARM_UP-5,EO],[1500,ARM_UP,IO]]),
  ...mir('wing','rotate',[[0,null],[180,null],[380,18,EO],[450,8,IO],[520,20,IO],[590,8,IO],[660,20,IO],[800,13,'ease-out'],[1500,10,IO]]),
  ...mir('ant','rotate',[[0,null],[240,null],[400,-10,EO],[560,7,IO],[700,-3,IO],[820,-9,EO],[980,5,IO],[1120,-2,IO],[1240,-6,EO],[1500,0,'ease-out']]),
  ...mouth('wide',160),
  T('core','opacity',[[0,null],[200,1,OUT]],true),T('halo','opacity',[[0,null],[300,.8,OUT]],true)],
 Greeting:()=>[
  T('squash','scale',[[0,null],[90,[1.03,.97],EO],[190,[.98,1.03],IO],[250,[1,1],IO],[330,[1,1.005],EI],[380,[1.03,.97],SQ],[560,[1,1],SPRING]]),
  T('root','translate',[[0,null],[90,null],[230,[0,-8],LIFT],[330,[0,0],FALL]]),
  T('head','rotate',[[0,null],[120,null],[420,3,IO],[620,2,IO],[860,3,IO]]),T('head','translate',[[0,null],[90,[0,1],EO],[250,[0,-1],IO],[420,[0,1],SQ],[560,[0,0],SPRING]]),
  T('brows','translate',[[0,null],[90,null],[220,[0,-2.5],EO]]),
  T('armR','rotate',[[0,null],[60,null],[320,-40,EO],[460,-28,IO],[600,-40,IO],[740,-28,IO],[880,-40,IO],[1000,-38,'ease-out']]),
  ...mir('wing','rotate',[[0,null],[60,null],[220,10,EO],[520,6,IO]]),
  ...mir('ant','rotate',[[0,null],[80,null],[190,-6,EO],[320,4,IO],[460,0,'ease-out']]),
  ...mouth('wide',90)],
 Helping:()=>[T('root','rotate',[[0,null],[320,-4,OUT]]),T('head','rotate',[[0,null],[80,null],[400,-2,OUT]]),T('armL','rotate',[[0,null],[60,null],[400,35,OUT]]),
  T('pupilL','translate',[[0,null],[200,[-2.5,1.5],OUT]]),T('pupilR','translate',[[0,null],[200,[-2.5,1.5],OUT]])],
 Thinking:()=>[T('pupilL','translate',[[0,null],[200,[2.5,-3],OUT]]),T('pupilR','translate',[[0,null],[200,[2.5,-3],OUT]]),
  T('head','rotate',[[0,null],[60,null],[360,3,OUT]]),T('brows','translate',[[0,null],[200,[0,-3],OUT]]),
  T('armL','rotate',[[0,null],[280,-18,OUT]]),T('armL','translate',[[0,null],[280,[9,-7],OUT]]),
  T('antR','rotate',[[0,null],[200,-15,OUT],[320,-10,IO],[420,-12,IO]]),...mouth('flat',0)],
 Sleeping:()=>[T('squash','scale',[[0,null],[600,[1,.96],IO]]),T('antL','rotate',[[0,null],[600,-25,IO]]),T('antR','rotate',[[0,null],[600,25,IO]]),
  T('head','rotate',[[0,null],[200,null],[900,4,IO]]),T('head','translate',[[0,null],[200,null],[900,[0,2],IO]]),
  T('core','opacity',[[0,null],[1200,.15,IO]],true),T('halo','opacity',[[0,null],[1200,0,IO]],true)]
};
CH.Encouraging=CH.Helping;
const ONE_SHOT=new Set(['Lit','Greeting']);
const BLINK=(()=>{const D=13600,kf=[{offset:0,scale:[1,1]}];for(const s of [4200,9800,13460]){kf.push({offset:s/D,scale:[1,1]},{offset:(s+60)/D,scale:[1,.1]},{offset:(s+140)/D,scale:[1,1]});}
 if(kf[kf.length-1].offset<1)kf.push({offset:1,scale:[1,1]});return {kf,dur:D};})();
// Cycles after the pose settles. Breathing and swaying stop by themselves (no endless motion); blinks follow a fixed rhythm.
function ambient(state,lvl,{ambient:amb=false,quiet=false}={}){
 const A=[],closed=(POSES[state]||{}).eyes==='closed';
 if(!closed)for(const p of ['eyeL','eyeR'])A.push({p,prop:'scale',kf:BLINK.kf.map(k=>k.scale),offsets:BLINK.kf.map(k=>k.offset),dur:BLINK.dur,iter:4});
 const breath=(p,a,b,dur,iter)=>A.push({p,prop:'scale',kf:[a,b,a],offsets:[0,.5,1],dur,iter,ease:IO});
 if(['Idle','Explaining','Helping','Encouraging','Greeting','Lit'].includes(state))breath('squash',[1,1],[1,1.02],4000,lvl==='full'?3:1);
 if(lvl!=='full')return A;
 if(state==='Sleeping')breath('squash',[1,.96],[1.01,.985],5000,3);
 if(state==='Thinking')A.push({p:'antR',prop:'rotate',kf:[-12,-16,-12,-8,-12],offsets:[0,.25,.5,.75,1],dur:3000,iter:3,ease:IO});
 if(amb&&['Idle','Greeting','Lit'].includes(state)&&!quiet)A.push({p:'antL',prop:'rotate',kf:[0,0,-6,2,0],offsets:[0,.9,.94,.97,1],dur:8000,iter:3});
 return A;
}
// The whole reaction for a state as data (tests read it): tracks start from the current values.
export function plan(state,lvl='full',{ret=false,quiet=false,ambient:amb=false}={}){
 const pose=ret?{...POSES.Idle,core:null,halo:null}:POSES[state]||{};
 const soft=lvl==='soft',tg=targets(pose,{soft}),custom=lvl==='full'&&!ret&&!quiet&&CH[state]?CH[state]():[];
 const have=new Set(custom.map(t=>t.p+'.'+t.prop)),dur=ret?300:soft||quiet?180:state==='Sleeping'?600:320;
 const tracks=[...custom];
 for(const [p,props] of Object.entries(tg))for(const [prop,v] of Object.entries(props)){if(have.has(p+'.'+prop))continue;
  const light=LIGHT.has(p),fade=prop==='opacity'&&!light;
  let keys=[[0,null],[light?(soft?240:600):fade?(p.startsWith('lid')||p.startsWith('eye')?(state==='Sleeping'?200:120):100):dur,v,light||!fade?(soft?EASE:OUT):'linear']];
  if(light&&soft&&state==='Lit')keys=[[0,null],[240,1,EASE],[1140,v,IO]];
  if(light&&soft&&state==='Sleeping')keys=[[0,null],[1200,v,IO]];
  tracks.push(T(p,prop,keys,light));}
 // the ground shadow follows the jump: smaller and lighter in the air
 const rt=tracks.find(t=>t.p==='root'&&t.prop==='translate');let out=tracks;
 if(rt&&rt.keys.some(k=>k[1]&&k[1][1]<0))out=[...tracks.filter(t=>t.p!=='shadow'),T('shadow','scale',rt.keys.map(([t,v,e])=>[t,v&&[f(1+v[1]/100),1],e])),T('shadow','opacity',rt.keys.map(([t,v,e])=>[t,v&&f(1+v[1]/48),e]))];
 const fx=lvl==='full'&&state==='Celebrating'&&!ret&&!quiet?[{at:420,embers:3}]:[];
 return {tracks:out,fx,oneShot:ONE_SHOT.has(state)&&!ret&&!quiet,hold:soft&&ONE_SHOT.has(state)?420:0,ambient:ambient(ret?'Idle':state,lvl,{ambient:amb,quiet})};
}
// Mid-air request: first land (120-200 ms, gravity curve), then the new plan.
export function land(p,y){const L=Math.round(Math.min(200,Math.max(120,-y*9))),sh=([t,v,e],i)=>i===0?[t,v,e]:[t+L,v,e];
 const tracks=p.tracks.map(t=>({...t,keys:t.keys.map(sh)}));
 const put=(part,prop,landKeys,after)=>{let t=tracks.find(x=>x.p===part&&x.prop===prop);if(!t){t=T(part,prop,[[0,null],...after]);tracks.push(t);}t.keys=[[0,null],...landKeys,...t.keys.slice(1)];};
 put('root','translate',[[L,[0,0],FALL]],[]);put('squash','scale',[[L,[1,1.01],EI],[L+60,[1.04,.96],SQ]],[[L+240,[1,1],SPRING]]);
 put('shadow','scale',[[L,[1,1],FALL]],[]);put('shadow','opacity',[[L,1,FALL]],[]);
 return {...p,tracks,fx:p.fx.map(x=>({...x,at:x.at+L}))};}

// ---------- DOM ----------
const css=(prop,v)=>prop==='translate'?`${v[0]}px ${v[1]}px`:prop==='rotate'?`${v}deg`:prop==='scale'?`${v[0]} ${v[1]}`:String(v);
const DEF={translate:'0px 0px',rotate:'0deg',scale:'1 1',opacity:'1'};
export function toWaapi(t,cur){const ks=t.keys,t0=ks[0][0],D=Math.max(1,ks[ks.length-1][0]-t0);let prev=cur;
 const kf=ks.map(([tm,v],i)=>{const val=v==null?prev:css(t.prop,v);prev=val;const k={offset:(tm-t0)/D,[t.prop]:val};if(ks[i+1])k.easing=ks[i+1][2]||'linear';return k;});
 return {kf,opt:{duration:D,delay:t0,fill:'both'}};}
function levelOf(m){if(m===false||m==='off')return 'off';if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return 'off';return m==='soft'||m==='full'?m:level();}
let cssDone=false;
function injectCss(){if(cssDone)return;cssDone=true;const s=document.createElement('style');
 s.textContent='.ayan2d{display:block;width:100%;height:100%;max-width:none;overflow:visible;pointer-events:none;stroke:none}.ayan2d [data-p]{transform-box:view-box;transition:none!important}'+
  ':where(.ember){position:fixed;left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;pointer-events:none;z-index:70;opacity:0;background:radial-gradient(circle,#FFFBEA 0 22%,#FFE38A 42%,rgba(244,183,64,.55) 60%,rgba(244,183,64,0) 72%)}';
 document.head.append(s);}

const instances=new Set(),spare=new Map();
// One controller per drawn character; a re-render that replaces the host within a second keeps the same character
// (and its running motion) instead of starting it again.
function controller(){
 const t=document.createElement('template');t.innerHTML=svg();const el=t.content.firstElementChild,P={};
 el.querySelectorAll('[data-p]').forEach(n=>{P[n.dataset.p]=n;});
 const c={el,P,cur:'Idle',host:null,mot:true,vis:true,amb:false,gen:0,anims:new Set(),lights:new Set(),loops:[],timers:[],onScreen:true,io:null};
 const write=tg=>{for(const [p,props] of Object.entries(tg))for(const [prop,v] of Object.entries(props))if(P[p])P[p].style[prop]=css(prop,v);};
 const freeze=set=>{for(const a of set){try{a.commitStyles();}catch{}a.cancel();}set.clear?.();};
 const stopLoops=()=>{freeze(c.loops);c.loops=[];};
 const clearTimers=()=>{c.timers.forEach(clearTimeout);c.timers=[];};
 const rendered=()=>el.isConnected&&c.host&&c.host.getClientRects().length>0;
 const playLoops=()=>{const run=c.onScreen&&!document.hidden;for(const a of c.loops)run?a.play():a.pause();};
 function startLoops(state,lvl,opt){for(const a of ambient(state,lvl,opt)){const n=P[a.p];if(!n)continue;
   const kf=a.kf.map((v,i)=>({offset:a.offsets[i],[a.prop]:css(a.prop,v)}));const an=n.animate(kf,{duration:a.dur,iterations:a.iter,easing:a.ease||'linear'});
   an.finished.then(()=>{c.loops=c.loops.filter(x=>x!==an);an.cancel();}).catch(()=>{});c.loops.push(an);}playLoops();}
 function run(p,g,lvl,state){
  for(const tk of p.tracks){const n=P[tk.p];if(!n)continue;const {kf,opt}=toWaapi(tk,n.style[tk.prop]||DEF[tk.prop]);const a=n.animate(kf,opt);(tk.light?c.lights:c.anims).add(a);}
  // embers from the belly never push the screen over LIMITS.maxParticles (the lesson summary reserves 12 for its lantern)
  for(const x of p.fx)c.timers.push(setTimeout(()=>{if(g!==c.gen||!x.embers)return;const max=globalThis.AyanLights?.LIMITS?.maxParticles??14;
   const n=Math.min(x.embers,max-document.querySelectorAll('.ember').length-(document.querySelector('[data-big]')?12:0));if(n>0)floatUp(P.belly,n);},x.at));
  const lights=[...c.lights];Promise.all(lights.map(a=>a.finished)).then(()=>{if(g===c.gen)freeze(new Set(lights)),lights.forEach(a=>c.lights.delete(a));}).catch(()=>{});
  Promise.all([...c.anims].map(a=>a.finished)).then(()=>{if(g!==c.gen)return;freeze(c.anims);
   if(p.oneShot||p.hold){c.timers.push(setTimeout(()=>{if(g!==c.gen)return;const r=plan(state,lvl,{ret:true,ambient:c.amb});
     run({...r,oneShot:false,hold:0},g,lvl,'Idle');},p.hold));return;}
   startLoops(state,lvl,{ambient:c.amb});}).catch(()=>{});
 }
 c.apply=(state,{quiet=false}={})=>{const g=++c.gen,lvl=levelOf(c.mot);el.dataset.state=state;el.dataset.level=lvl;clearTimers();stopLoops();
  if(lvl==='off'||!c.vis||!rendered()){freeze(c.anims);freeze(c.lights);write(targets(POSES[state]));return;}
  freeze(c.anims);freeze(c.lights);
  let p=plan(state,lvl,{quiet,ambient:c.amb});const y=parseFloat((P.root.style.translate||'0 0').split(/\s+/)[1])||0;
  if(lvl==='full'&&y<-1)p=land(p,y);
  run(p,g,lvl,state);};
 c.breathe=({cycles=3}={})=>{const noop={pause(){},resume(){},stop(){}};if(levelOf(c.mot)==='off'||c.cur!=='Resting'||!rendered())return noop;
  stopLoops();const D=8000,o={duration:D,iterations:cycles,easing:'linear'},e=IO;
  const A=[P.squash.animate([{scale:'1 1',easing:e},{scale:'1.03 1.05',offset:.5,easing:e},{scale:'1 1'}],o),P.core.animate([{opacity:.4,easing:e},{opacity:.8,offset:.5,easing:e},{opacity:.4}],o)];
  c.loops.push(...A);return {pause(){A.forEach(a=>a.pause());},resume(){A.forEach(a=>a.play());},stop(){freeze(new Set(A));c.loops=c.loops.filter(x=>!A.includes(x));}};};
 c.attach=host=>{c.host=host;host.replaceChildren(el);c.io?.disconnect();
  if(typeof IntersectionObserver==='function'){c.io=new IntersectionObserver(([e])=>{c.onScreen=e.isIntersecting;playLoops();});c.io.observe(host);}};
 c.teardown=()=>{c.gen++;clearTimers();stopLoops();for(const a of [...c.anims,...c.lights])a.cancel();c.anims.clear();c.lights.clear();c.io?.disconnect();el.remove();};
 c.playLoops=playLoops;write(targets(POSES.Idle));return c;
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{for(const i of instances)i._c.playLoops();});

// Safety net from the brief: localStorage "ayan.mascot3d" = "1" brings back the old 3D firefly (Three.js loads only then).
function legacy(host,o){const map=s=>({Lit:'Encouraging',Resting:'Idle',Sleeping:'Idle'})[s]||s;let m=null,q=[],dead=false,cur=o.state;const run=f=>m?f():q.push(f);
 import('./mascot.mjs').then(M=>{if(dead)return;m=M.mount(host,{...o,state:map(cur)});q.forEach(f=>f());q=[];}).catch(()=>{});
 return {get state(){return cur;},set(s){if(STATES.includes(s)){cur=s;run(()=>m.set(map(s)));}},update(x){run(()=>m.update(x));},breathe(){return {pause(){},resume(){},stop(){}};},destroy(){dead=true;m?.destroy();}};}
export function mount(host,{state='Idle',motion=true,visible=true,ambient:amb=false}={}){
 try{if(localStorage.getItem('ayan.mascot3d')==='1')return legacy(host,{state,motion,visible});}catch{}
 injectCss();host.classList.add('mascot-box');if(!host.hasAttribute('aria-label'))host.setAttribute('aria-hidden','true');
 const slot=host.dataset.mascotSlot||host.className,sp=spare.get(slot);let c;
 if(sp&&!sp.c.host?.isConnected){spare.delete(slot);clearTimeout(sp.t);c=sp.c;}else c=controller();
 const same=c.host!=null&&c.cur===(STATES.includes(state)?state:'Idle');c.mot=motion;c.vis=visible;c.amb=amb;c.attach(host);host.hidden=!visible;
 const s=STATES.includes(state)?state:'Idle';
 if(!same||levelOf(c.mot)!==c.el.dataset.level){c.cur=s;c.apply(s,{quiet:same});}
 const api={_c:c,get state(){return c.cur;},
  set(x){if(!STATES.includes(x)||x===c.cur)return;c.cur=x;c.apply(x);},
  update(o={}){const before=levelOf(c.mot)+c.vis;c.vis=o.visible??c.vis;c.mot=o.motion??c.mot;host.hidden=!c.vis;if(levelOf(c.mot)+c.vis!==before)c.apply(c.cur,{quiet:true});},
  breathe(o){return c.breathe(o);},
  destroy(){if(!instances.delete(api))return;if(c.host!==host)return;if(host.isConnected){c.teardown();return;}
   // the host left the page (a re-render): kept for a second, so the same slot mounted again continues this character
   const old=spare.get(slot);if(old&&old.c!==c){clearTimeout(old.t);old.c.teardown();}
   spare.set(slot,{c,t:setTimeout(()=>{if(spare.get(slot)?.c===c){spare.delete(slot);c.teardown();}},1000)});}};
 instances.add(api);return api;
}
export function destroyAll(){for(const i of [...instances])i.destroy();}
