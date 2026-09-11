import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { AdComposition } from "./compositions/AdComposition";
import { DEFAULT_AD_PROPS } from "./compositions/ad-types";
import {
  AD_COMP_NAME,
  AD_DURATION_FRAMES,
  AD_FPS,
  AD_HEIGHT_9_16,
  AD_WIDTH_9_16,
} from "./constants";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id={AD_COMP_NAME}
        component={AdComposition}
        durationInFrames={AD_DURATION_FRAMES}
        fps={AD_FPS}
        width={AD_WIDTH_9_16}
        height={AD_HEIGHT_9_16}
        defaultProps={DEFAULT_AD_PROPS}
      />
    </>
  );
};
