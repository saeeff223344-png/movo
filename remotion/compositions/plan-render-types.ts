import type { PlanCompositionProps } from "./plan-types";

/**
 * Input props for the "PlanRender" Composition (see ../Root.tsx) — the
 * real-export counterpart to PlanPreviewPlayer's live preview. Both
 * ultimately consume the exact same lib/ai/plan-to-scenes.ts's
 * buildVideoPlanRenderData() output: the Player takes
 * {compositionProps, durationInFrames, fps, width, height} as separate
 * props, while a Composition needs everything folded into one `inputProps`
 * object plus a `calculateMetadata` that reads the sizing fields back out —
 * see Root.tsx. No new composition/motion logic is introduced here.
 */
export type PlanRenderInputProps = PlanCompositionProps & {
  width: number;
  height: number;
  durationInFrames: number;
  fps: number;
};

/**
 * Valid (schema-passing-shaped) default so the composition previews
 * sensibly in Remotion Studio and so a render/lambda call always has a
 * fallback if `inputProps` were ever omitted — real exports always pass a
 * real project's data instead (lib/render/export-orchestration.ts).
 */
export const DEFAULT_PLAN_RENDER_PROPS: PlanRenderInputProps = {
  scenes: [
    {
      id: "hook",
      type: "hook",
      durationInFrames: 90,
      content: {
        narration: "",
        onScreenText: "MOVO",
        visualDirection: "",
        motionDirection: "",
        textPosition: "center",
        textAlign: "center",
        imageUrl: "",
        variant: "0",
      },
    },
  ],
  visualStyle: "fast",
  dir: "ltr",
  width: 1080,
  height: 1920,
  durationInFrames: 90,
  fps: 30,
};
