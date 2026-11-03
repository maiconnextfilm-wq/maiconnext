import {Composition} from 'remotion';
import {NextCreatorsReel, REEL_DURATION} from './NextCreatorsReel';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="NextCreatorsReel"
    component={NextCreatorsReel}
    durationInFrames={REEL_DURATION}
    fps={30}
    width={1080}
    height={1920}
  />
);
