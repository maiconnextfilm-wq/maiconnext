import {Composition} from 'remotion';
import {NextCreatorsReel, REEL_DURATION} from './NextCreatorsReel';
import {NextCreatorsReelV2, REEL_V2_DURATION} from './ReelV2';
import {BaloesHolograficos, BALOES_DURATION, BALOES_H, BALOES_W} from './Baloes';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="NextCreatorsReel" component={NextCreatorsReel} durationInFrames={REEL_DURATION} fps={30} width={1080} height={1920} />
    <Composition id="NextCreatorsReelV2" component={NextCreatorsReelV2} durationInFrames={REEL_V2_DURATION} fps={30} width={1080} height={1920} />
    <Composition id="BaloesHolograficos" component={BaloesHolograficos} durationInFrames={BALOES_DURATION} fps={30} width={BALOES_W} height={BALOES_H} />
  </>
);
