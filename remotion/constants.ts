export const COMP_NAME = "MyComp";
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;
export const VIDEO_DURATION_FRAMES = 150;

// Ad composition (props-driven, used for the Hero preview and the /create result).
export const AD_COMP_NAME = "AdDemo";
export const AD_FPS = 30;
export const AD_DURATION_FRAMES = 450; // 15s @ 30fps
export const AD_WIDTH_9_16 = 1080;
export const AD_HEIGHT_9_16 = 1920;

// 1080p is the current render target. Sizes are kept as a base unit so 2K/4K
// can be added later as a scale multiplier without touching composition code.
export const QUALITY_SCALE = {
  "1080p": 1,
  "2k": 1.85,
  "4k": 3.7,
} as const;
