export const COMP_NAME = "MyComp";
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;
export const VIDEO_DURATION_FRAMES = 150;

// Ad composition (props-driven, used for the Hero preview and the /create result).
export const AD_COMP_NAME = "AdDemo";

/** Real-export counterpart to the live PlanPreviewPlayer preview — see Root.tsx and lib/render/export-orchestration.ts. Kept here (not in Root.tsx) so server-side render code can reference the id without importing Root.tsx's React/Composition tree. */
export const PLAN_RENDER_COMP_NAME = "PlanRender";
export const AD_FPS = 30;
export const AD_DURATION_FRAMES = 450; // 15s @ 30fps
export const AD_WIDTH_9_16 = 1080;
export const AD_HEIGHT_9_16 = 1920;

/**
 * Frame size per aspect ratio — shared by every Remotion composition that
 * takes a variable aspect ratio (currently just PlanComposition, the Phase 2
 * AI-plan preview). The 9:16 entry reuses AD_WIDTH_9_16/AD_HEIGHT_9_16 so
 * there's exactly one definition of "what 9:16 means" in pixels.
 */
export const ASPECT_RATIO_DIMENSIONS = {
  "9:16": { width: AD_WIDTH_9_16, height: AD_HEIGHT_9_16 },
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
} as const;

// 1080p is the current render target. Sizes are kept as a base unit so 2K/4K
// can be added later as a scale multiplier without touching composition code.
export const QUALITY_SCALE = {
  "1080p": 1,
  "2k": 1.85,
  "4k": 3.7,
} as const;
