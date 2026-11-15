import React from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Ayan, Cue} from './Ayan';
import timing from './m01.timing.json';

// M01 "What is a quarter", version 0.2.0: the V2.1 firefly, the V2.1 palette and a slow virtual camera.
// Storyboard: brief/EdTech_Claude_Handoff/video-lessons/M01_STORYBOARD.md.
// All scene times come from the measured voiceover (m01.timing.json), nothing is hand-timed.
// Figures are built from exact angles: equal disk 4 x 90 degrees, counterexample 135/45/90/90.
// Camera: gentle pushes and pans towards what the voice is talking about (1.4-2.4 s, ease in-out, zoom at most 1.15),
// with a little parallax between the background, the board and the presenter. No cuts, no flashes, no shake.
// The "camera: false" composition (M01Calm) is the same lesson with a still camera, for calm mode and reduced motion.

const fontHandle = delayRender('Nunito');
const nunito = new FontFace('Nunito', `url(${staticFile('fonts/Nunito.ttf')})`, {weight: '200 1000'});
nunito.load().then(f => { (document.fonts as any).add(f); continueRender(fontHandle); }).catch(() => continueRender(fontHandle));

const C = {bg: '#F7FAF8', panel: '#FFFFFF', ink: '#243342', green: '#0F766E', cream: '#FBF4E2', apricot: '#B8DCD2', selEdge: '#1F5E57', soft: '#E7F2ED', sand: '#FFF3D6', honey: '#F4B740', warn: '#8A5A00', muted: '#526475', line: '#DFE7E2'};
const EQUAL = [90, 90, 90, 90], UNEQUAL = [135, 45, 90, 90];
const R = 190;

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const rise = (T: number, at: number, d = 0.5) => ease((T - at) / d);
const span = (T: number, a: number, b: number, din = 0.45, dout = 0.45) => rise(T, a, din) * (1 - rise(T, b, dout));
// Virtual camera: each key starts a move at `at` that lasts `dur` seconds and eases in and out (cubic).
type Key = {at: number; dur: number; v: number[]};
const inOut = (x: number) => { const t = clamp(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const track = (T: number, start: number[], keys: Key[]) => keys.reduce((cur, k) => { const p = inOut((T - k.at) / k.dur); return cur.map((c, i) => c + (k.v[i] - c) * p); }, start);

const startOf = (angles: number[], i: number) => angles.slice(0, i).reduce((a, b) => a + b, 0);
const pt = (deg: number, r: number) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)];
const sector = (angles: number[], i: number, r = R) => { const a0 = startOf(angles, i), a1 = a0 + angles[i]; const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M0,0 L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${angles[i] > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`; };
const mid = (angles: number[], i: number, r: number) => pt(startOf(angles, i) + angles[i] / 2, r);

const Disk = ({angles, opacity, fills, emph, numerals, v, h}: {angles: number[]; opacity: number; fills: number[]; emph: number[]; numerals: number[]; v: number; h: number}) => (
  <g opacity={opacity}>
    <circle r={R} fill={C.cream} />
    {angles.map((_, i) => fills[i] > 0 ? <path key={'f' + i} d={sector(angles, i)} fill={C.apricot} opacity={fills[i]} /> : null)}
    {angles === EQUAL ? (
      <>
        <line x1={0} y1={-R * v} x2={0} y2={R * v} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={v > 0 ? 1 : 0} />
        <line x1={-R * h} y1={0} x2={R * h} y2={0} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={h > 0 ? 1 : 0} />
      </>
    ) : angles.map((_, i) => { const [x, y] = pt(startOf(angles, i), R); return <line key={'l' + i} x1={0} y1={0} x2={x} y2={y} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />; })}
    {angles.map((_, i) => fills[i] > 0 ? <path key={'o' + i} d={sector(angles, i, R - 5)} fill="none" stroke={C.selEdge} strokeWidth={8} strokeLinejoin="round" opacity={fills[i]} /> : null)}
    {angles.map((_, i) => emph[i] > 0 ? <path key={'e' + i} d={sector(angles, i, R - 7)} fill="none" stroke={C.green} strokeWidth={9} strokeLinejoin="round" opacity={emph[i]} /> : null)}
    {angles.map((_, i) => { const [x, y] = mid(angles, i, R * 0.74); return fills[i] > 0 ? <circle key={'d' + i} cx={x} cy={y} r={13} fill={C.ink} opacity={fills[i]} /> : null; })}
    {angles.map((_, i) => { const [x, y] = mid(angles, i, R * 0.42); return numerals[i] > 0 ? <text key={'n' + i} x={x} y={y + 16} textAnchor="middle" fontFamily="Nunito" fontWeight={800} fontSize={46} fill={C.ink} opacity={numerals[i]}>{i + 1}</text> : null; })}
    <circle r={R} fill="none" stroke={C.ink} strokeWidth={7} />
  </g>
);

const Digit = ({children, ring, opacity = 1}: {children: React.ReactNode; ring: number; opacity?: number}) => (
  <div style={{position: 'relative', width: 150, height: 138, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity}}>
    <div style={{position: 'absolute', inset: 4, borderRadius: 26, border: `7px solid ${C.green}`, background: C.soft, opacity: ring}} />
    <svg width={34} height={40} viewBox="0 0 34 40" style={{position: 'absolute', left: -44, top: 49, opacity: ring}}><path d="M4 4 L30 20 L4 36 Z" fill={C.green} /></svg>
    <span style={{position: 'relative', font: '800 122px/1 Nunito', color: C.ink}}>{children}</span>
  </div>
);
const Fraction = ({top, bottom, ringTop = 0, ringBottom = 0, scale = 1}: {top: React.ReactNode; bottom: React.ReactNode; ringTop?: number; ringBottom?: number; scale?: number}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${scale})`}}>
    <Digit ring={ringTop}>{top}</Digit>
    <div style={{width: 150, height: 9, borderRadius: 5, background: C.ink, margin: '2px 0'}} />
    <Digit ring={ringBottom}>{bottom}</Digit>
  </div>
);
const Label = ({children, opacity, style}: {children: React.ReactNode; opacity: number; style?: React.CSSProperties}) => (
  <div style={{position: 'absolute', font: '700 31px/1.25 Nunito', color: C.ink, textAlign: 'center', opacity, ...style}}>{children}</div>
);
const Mark = ({ok}: {ok: boolean}) => (
  <svg width={66} height={66} viewBox="0 0 66 66"><circle cx={33} cy={33} r={30} fill={ok ? C.soft : C.sand} stroke={ok ? C.green : C.warn} strokeWidth={5} />
    {ok ? <path d="M19 34 L29 44 L48 23" fill="none" stroke={C.green} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        : <><path d="M19 27 H47 M19 40 H47" stroke={C.warn} strokeWidth={6} strokeLinecap="round" /><path d="M41 16 L25 50" stroke={C.warn} strokeWidth={6} strokeLinecap="round" /></>}
  </svg>
);

export const M01 = ({camera = true}: {camera?: boolean}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const T = frame / fps;
  const L = timing.lines;
  const s = (i: number) => L[i - 1].start, e = (i: number) => L[i - 1].end;
  const st = (i: number, j: number) => L[i - 1].sentences[j - 1];
  const f = (sec: number) => Math.round(sec * fps);

  // --- figure states ---
  const diskIn = rise(T, 0.15, 0.7);
  const v = rise(T, s(2) + 0.35, 0.9), h = rise(T, s(2) + 1.35, 0.9);
  const tA = s(3) + 0.5;                                   // "one of these parts": first sector
  const tB = st(5, 1).start + 0.9;                         // "two such parts": second sector
  const clear = rise(T, e(5) + 0.25, 0.5);                 // fills go back to plain before the equality check
  const fillA = rise(T, tA, 0.6) * (1 - clear), fillB = rise(T, tB, 0.6) * (1 - clear);
  const toUnequal = rise(T, st(6, 2).start - 0.35, 0.6) * (1 - rise(T, e(6) + 0.2, 0.6));
  // sectors outlined one after another: "all parts are the same size" and the check before the counterexample
  const sweep = (a: number, b: number) => EQUAL.map((_, i) => { const d = (b - a) / 4; return span(T, a + i * d, a + (i + 1) * d + 0.15, 0.25, 0.3); });
  const sw1 = sweep(st(2, 2).start + 0.5, st(2, 2).end), sw2 = sweep(st(6, 1).start + 0.2, st(6, 1).end + 0.3), sw3 = sweep(st(7, 2).start + 0.2, st(7, 2).end + 0.6);
  const emph = EQUAL.map((_, i) => Math.max(sw1[i], sw2[i], sw3[i]));
  const count = EQUAL.map((_, i) => rise(T, st(3, 3).start + i * 0.26, 0.25) * (1 - rise(T, s(4) - 0.3, 0.4)));
  const fillU = rise(T, st(6, 2).start + 0.5, 0.6);

  // --- fraction and labels ---
  const fracIn = rise(T, st(3, 2).start, 0.6) * (1 - rise(T, e(5) + 0.25, 0.5));
  const two = rise(T, tB + 0.2, 0.35);
  const ringBottom = span(T, st(3, 2).start + 1.3, e(3) + 0.2);
  const ringTop = span(T, s(4) + 0.3, st(4, 3).start - 0.1);
  const half = rise(T, st(5, 2).start + (st(5, 2).end - st(5, 2).start) * 0.5, 0.6) * (1 - rise(T, e(5) + 0.25, 0.5));
  const lWhole = span(T, st(1, 3).start, s(2) - 0.1);
  const lParts = span(T, st(2, 2).start + 0.4, e(5) + 0.2);
  const lBottom = span(T, st(3, 2).start + 1.3, e(3) + 0.2);
  const lTop = span(T, s(4) + 0.3, st(4, 3).start - 0.1);
  const lQuarter = span(T, st(4, 3).start, e(4) + 0.5);
  const lHalf = span(T, st(5, 2).start + 0.3, e(5) + 0.2);
  const lEqual = span(T, st(6, 1).start + 0.2, st(6, 2).start - 0.4);
  const lUnequal = span(T, st(6, 2).start + 0.2, e(6) + 0.2);
  const lTurn = rise(T, s(7), 0.6);

  // --- mascot ---
  const cues: Cue[] = [{at: 0, clip: 'Idle'}];
  const cue = (sec: number, clip: string) => cues.push({at: Math.max(0, f(sec)), clip});
  cue(s(1) - 0.3, 'Greeting'); cue(s(1) - 0.3 + 2, 'Explaining'); cue(e(1) + 0.1, 'Idle');
  cue(s(2) - 0.1, 'Helping'); cue(st(2, 2).start, 'Explaining'); cue(e(2) + 0.1, 'Idle');
  cue(s(3) - 0.1, 'Helping'); cue(st(3, 2).start, 'Explaining'); cue(e(3) + 0.1, 'Idle');
  cue(s(4) - 0.1, 'Explaining'); cue(e(4) + 0.1, 'Idle');
  cue(s(5) - 0.1, 'Helping'); cue(st(5, 2).start, 'Explaining'); cue(e(5) + 0.1, 'Idle');
  cue(s(6) - 0.2, 'Explaining'); cue(st(6, 2).start - 0.3, 'Thinking'); cue(e(6) + 0.1, 'Idle');
  cue(s(7) - 0.1, 'Explaining'); cue(st(7, 3).start - 0.1, 'Encouraging'); cue(st(7, 3).start - 0.1 + 48 / fps, 'Idle');
  cues.sort((a, b) => a.at - b.at);

  // --- camera: [scale, focusX, focusY] for the board; [scale, dx, dy] for the presenter ---
  const wide = [1, 640, 360];
  const boardKeys: Key[] = [
    {at: st(1, 3).start - 0.3, dur: 2.2, v: [1.08, 560, 368]},   // "one whole circle": drift towards the disk
    {at: s(2) - 0.3, dur: 2.4, v: [1.15, 478, 366]},             // dividing into four: closer to the disk
    {at: st(3, 2).start - 0.4, dur: 2.2, v: [1.12, 592, 352]},   // the fraction appears: pan to the notation
    {at: s(4) - 0.2, dur: 2.0, v: [1.15, 628, 340]},             // the number on top
    {at: s(5) - 0.4, dur: 2.2, v: [1.05, 606, 362]},             // two quarters: both the disk and "= 1/2"
    {at: s(6) - 0.4, dur: 2.2, v: [1.07, 520, 364]},             // equal parts: the disk and the check mark
    {at: st(6, 2).start - 0.3, dur: 1.8, v: [1.09, 540, 364]},   // counterexample with its label
    {at: s(7) - 0.5, dur: 2.4, v: wide},                         // your turn: full picture
  ];
  const guideKeys: Key[] = [
    {at: st(1, 3).start - 0.4, dur: 2.0, v: [1, 0, 0]},          // after the greeting the presenter steps back to its place
    {at: s(2) - 0.3, dur: 2.4, v: [0.95, 26, 6]},
    {at: s(5) - 0.4, dur: 2.2, v: [0.98, 12, 2]},
    {at: s(6) - 0.4, dur: 2.2, v: [0.9, 62, 8]},                  // steps aside so the label stays readable
    {at: s(7) - 0.5, dur: 2.4, v: [1.06, -34, 0]},               // closer for the last words
  ];
  const [bs, bx, by] = camera ? track(T, wide, boardKeys) : wide;
  const [gs, gx, gy] = camera ? track(T, [1.16, -150, 14], guideKeys) : [1, 0, 0];
  const board = `translate(${(640 - bx * bs).toFixed(2)}px, ${(360 - by * bs).toFixed(2)}px) scale(${bs.toFixed(4)})`;
  const back = `translate(${((640 - bx * bs) * 0.4).toFixed(2)}px, ${((360 - by * bs) * 0.4).toFixed(2)}px) scale(${(1 + (bs - 1) * 0.4).toFixed(4)})`;

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: 'Nunito'}}>
      {L.map(l => { const n = f(l.srcEnd) - f(l.srcStart); return (
        <Sequence key={l.id} from={f(l.start)} durationInFrames={n}>
          <Audio src={staticFile(timing.audio)} trimBefore={f(l.srcStart)} trimAfter={f(l.srcEnd)} volume={fr => interpolate(fr, [0, 2, n - 3, n - 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
        </Sequence>); })}

      {/* far layer: soft shapes that move less than the board (parallax) */}
      <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: back}}>
        <div style={{position: 'absolute', left: 930, top: -150, width: 560, height: 560, borderRadius: '50%', background: C.soft}} />
        <div style={{position: 'absolute', left: -140, top: 560, width: 380, height: 380, borderRadius: '50%', background: C.sand, opacity: 0.7}} />
      </div>

      {/* board layer: everything the lesson is about */}
      <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: board}}>
      <div style={{position: 'absolute', left: 56, top: 34, font: '800 26px/1 Nunito', color: C.green, opacity: clamp(1 - (bs - 1) / 0.05)}}>Математика: равные доли</div>
      <div style={{position: 'absolute', left: 48, top: 84, width: 850, height: 588, borderRadius: 40, background: C.panel, border: `2px solid ${C.line}`}} />

      <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(292 362) scale(${0.94 + 0.06 * diskIn})`} opacity={diskIn}>
          <Disk angles={EQUAL} opacity={1 - toUnequal} fills={[fillA, fillB, 0, 0]} emph={emph} numerals={count} v={v} h={h} />
          <Disk angles={UNEQUAL} opacity={toUnequal} fills={[fillU, 0, 0, 0]} emph={[0, 0, 0, 0]} numerals={[0, 0, 0, 0]} v={0} h={0} />
        </g>
      </svg>
      <Label opacity={lWhole} style={{left: 92, width: 400, top: 580}}>один целый круг</Label>
      <Label opacity={lParts * (1 - toUnequal)} style={{left: 92, width: 400, top: 580}}>4 равные части</Label>

      {/* fraction block */}
      <div style={{position: 'absolute', left: 528, top: 150, width: 360, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, opacity: fracIn}}>
        <div style={{transform: `translateX(${interpolate(half, [0, 1], [0, -8])}px)`}}>
          <Fraction scale={interpolate(half, [0, 1], [1, 0.74])} ringTop={ringTop} ringBottom={ringBottom}
            top={<><span style={{opacity: 1 - two}}>1</span><span style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', opacity: two}}>2</span></>} bottom="4" />
        </div>
        {half > 0 ? <>
          <div style={{font: '800 96px/1 Nunito', color: C.ink, opacity: half, marginLeft: -14}}>=</div>
          <div style={{opacity: half}}><Fraction scale={0.74} top="1" bottom="2" /></div>
        </> : null}
      </div>
      <Label opacity={lBottom} style={{left: 520, width: 360, top: 500}}>Внизу: на сколько равных частей разделили целое</Label>
      <Label opacity={lTop} style={{left: 520, width: 360, top: 500}}>Сверху: сколько частей взяли</Label>
      <Label opacity={lQuarter} style={{left: 520, width: 360, top: 506, font: '800 40px/1.2 Nunito', color: C.green}}>одна четвёртая</Label>
      <Label opacity={lHalf} style={{left: 520, width: 360, top: 506, font: '800 34px/1.2 Nunito', color: C.green}}>две четверти - это половина</Label>

      {/* equality check and counterexample */}
      <div style={{position: 'absolute', left: 540, top: 250, width: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, opacity: lEqual}}>
        <Mark ok /><div style={{font: '800 44px/1.2 Nunito', color: C.ink, textAlign: 'center'}}>Части равны</div>
      </div>
      <div style={{position: 'absolute', left: 540, top: 220, width: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, opacity: lUnequal}}>
        <Mark ok={false} /><div style={{font: '800 44px/1.2 Nunito', color: C.ink, textAlign: 'center'}}>Части не равны</div>
        <div style={{font: '700 30px/1.3 Nunito', color: C.muted, textAlign: 'center'}}>Это не обязательно четверть</div>
      </div>

      {/* your turn */}
      <div style={{position: 'absolute', left: 530, top: 232, width: 340, opacity: lTurn, transform: `translateY(${interpolate(lTurn, [0, 1], [14, 0])}px)`}}>
        <div style={{font: '800 50px/1.15 Nunito', color: C.ink, textAlign: 'center'}}>Твоя очередь</div>
        <div style={{marginTop: 22, padding: '20px 22px', borderRadius: 24, background: C.soft, border: `3px solid ${C.green}`, font: '800 31px/1.25 Nunito', color: C.ink, textAlign: 'center'}}>Выбери одну четверть в игре</div>
        <div style={{marginTop: 18, font: '700 28px/1.2 Nunito', color: C.muted, textAlign: 'center'}}>Можно не спешить</div>
      </div>

      </div>

      {/* presenter layer: the firefly stands on its own shadow and moves a little against the board */}
      <div style={{position: 'absolute', inset: 0, transformOrigin: '1066px 648px', transform: `translate(${gx.toFixed(2)}px, ${gy.toFixed(2)}px) scale(${gs.toFixed(4)})`}}>
        <div style={{position: 'absolute', left: 956, top: 634, width: 220, height: 28, borderRadius: '50%', background: C.ink, opacity: 0.09}} />
        <Ayan cues={cues} size={560} style={{left: 786, top: 166}} />
      </div>
    </AbsoluteFill>
  );
};
