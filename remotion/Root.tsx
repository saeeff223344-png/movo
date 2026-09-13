import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { AdComposition } from "./compositions/AdComposition";
import { DEFAULT_AD_PROPS } from "./compositions/ad-types";
import { PlanComposition } from "./compositions/PlanComposition";
import { DEFAULT_PLAN_RENDER_PROPS, type PlanRenderInputProps } from "./compositions/plan-render-types";

/**
 * PlanComposition's own props (PlanCompositionProps) don't include
 * width/height/durationInFrames/fps — those are normally supplied
 * separately to the Player (see PlanPreviewPlayer.tsx). A registered
 * Composition needs them ON props for `calculateMetadata` to read back out,
 * so PlanRenderInputProps adds them; PlanComposition itself just ignores
 * the extra fields at runtime. This cast is what lets `defaultProps` and
 * `calculateMetadata` below be typed against the wider PlanRenderInputProps
 * instead of Remotion inferring the narrower PlanCompositionProps from
 * `component` directly.
 */
const PlanRenderComponent = PlanComposition as unknown as React.FC<PlanRenderInputProps>;
import {
  AD_COMP_NAME,
  AD_DURATION_FRAMES,
  AD_FPS,
  AD_HEIGHT_9_16,
  AD_WIDTH_9_16,
  PLAN_RENDER_COMP_NAME,
} from "./constants";

/** Real-export counterpart to the live Player preview (components/remotion/PlanPreviewPlayer.tsx) — same PlanComposition component, but registered here so `remotion render`/Remotion Lambda can render it. Width/height/fps/durationInFrames vary per project (unlike AdDemo above), so `calculateMetadata` reads them straight off the `inputProps` MOVO's export orchestration (lib/render/export-orchestration.ts) already computed via lib/ai/plan-to-scenes.ts's buildVideoPlanRenderData — no separate sizing logic is introduced here. */

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
      <Composition
        id={PLAN_RENDER_COMP_NAME}
        component={PlanRenderComponent}
        durationInFrames={DEFAULT_PLAN_RENDER_PROPS.durationInFrames}
        fps={DEFAULT_PLAN_RENDER_PROPS.fps}
        width={DEFAULT_PLAN_RENDER_PROPS.width}
        height={DEFAULT_PLAN_RENDER_PROPS.height}
        defaultProps={DEFAULT_PLAN_RENDER_PROPS}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: props.durationInFrames,
          fps: props.fps,
          width: props.width,
          height: props.height,
        })}
      />
    </>
  );
};
