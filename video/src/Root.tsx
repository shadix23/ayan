import {Composition} from 'remotion';
import {M01} from './M01';
import timing from './m01.timing.json';

// M01: with the slow virtual camera. M01Calm: the same lesson with a still camera (calm mode, reduced motion).
export const Root = () => (
  <>
    <Composition id="M01" component={M01} defaultProps={{camera: true}} durationInFrames={timing.durationInFrames} fps={timing.fps} width={1280} height={720} />
    <Composition id="M01Calm" component={M01} defaultProps={{camera: false}} durationInFrames={timing.durationInFrames} fps={timing.fps} width={1280} height={720} />
  </>
);
