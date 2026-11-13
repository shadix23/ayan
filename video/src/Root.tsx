import {Composition} from 'remotion';
import {M01} from './M01';
import timing from './m01.timing.json';

export const Root = () => (
  <Composition id="M01" component={M01} durationInFrames={timing.durationInFrames} fps={timing.fps} width={1280} height={720} />
);
