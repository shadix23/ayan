import {Img, staticFile, useCurrentFrame} from 'remotion';

// Mascot from Blender PNG sequences (assets-src/render_video_frames.py), 30 fps.
// Looping clips run on the global frame so they never jump; one-shots play once and hold their last frame.
const CLIPS: Record<string, {frames: number; loop: boolean}> = {
  Idle: {frames: 120, loop: true},
  Explain: {frames: 90, loop: true},
  Wave: {frames: 49, loop: false},
  PointLeft: {frames: 46, loop: false},
  Think: {frames: 61, loop: false},
  Nod: {frames: 31, loop: false},
};
export type Cue = {at: number; clip: keyof typeof CLIPS | string};
const FADE = 8;

const src = (clip: string, local: number, global: number) => {
  const c = CLIPS[clip];
  const i = c.loop ? global % c.frames : Math.min(Math.max(local, 0), c.frames - 1);
  return staticFile(`ayan/${clip}/${String(i).padStart(3, '0')}.png`);
};

// cues: sorted list of {at: frame, clip}. A one-shot is followed by whatever cue comes next.
export const Ayan = ({cues, size, style}: {cues: Cue[]; size: number; style?: React.CSSProperties}) => {
  const frame = useCurrentFrame();
  let idx = 0;
  for (let i = 0; i < cues.length; i++) if (cues[i].at <= frame) idx = i;
  const cur = cues[idx], prev = idx > 0 ? cues[idx - 1] : null;
  const t = Math.min(1, (frame - cur.at + 1) / FADE);
  const fading = prev && t < 1;
  // Gentle hover on top of the baked motion keeps the figure alive while a one-shot holds its last frame.
  return (
    <div style={{position: 'absolute', width: size, height: size, ...style}}>
      {fading ? <Img src={src(prev!.clip, frame - prev!.at, frame)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 1 - t * t}} /> : null}
      <Img src={src(cur.clip, frame - cur.at, frame)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: fading ? t : 1}} />
    </div>
  );
};
