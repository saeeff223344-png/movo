import type { AdStyle } from "./ad-types";

export type BackgroundPattern = "grid" | "bokeh" | "lines" | "soft";

export type AdPalette = {
  background: string;
  accent: string;
  text: string;
  subtext: string;
  badgeBg: string;
  badgeText: string;
  springStiffness: number;
  springDamping: number;
  /**
   * Everything below is additive — only PlanSceneBackground/PlanScene (the
   * Phase 2 AI-plan preview) reads these. HookScene/OfferScene/PriceScene/
   * CtaScene (the old Generate-video demo) only destructure the fields
   * above, so extending this type never changes their rendered output.
   */
  glow: string;
  secondaryAccent: string;
  pattern: BackgroundPattern;
  /**
   * The two raw hex stops behind `background`'s CSS gradient string, set
   * only by palette-resolution.ts's resolvePlanPalette when the palette came
   * from brandColors or the AI's own per-plan choice — absent for the plain
   * AD_PALETTES entries below (their gradients use 3 hand-tuned stops that
   * don't reduce to a single pair). Lets resolveScenePalette re-angle the
   * gradient per scene without re-deriving colors from the CSS string.
   */
  backgroundStops?: readonly [string, string];
};

export const AD_PALETTES: Record<AdStyle, AdPalette> = {
  fast: {
    background: "linear-gradient(155deg, #0a0a13 0%, #2f1573 55%, #5b24e0 100%)",
    accent: "#ff7a3d",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.75)",
    badgeBg: "linear-gradient(120deg,#ff9a5a,#ff7a3d)",
    badgeText: "#0a0a13",
    springStiffness: 180,
    springDamping: 14,
    glow: "#ff9a5a",
    secondaryAccent: "#5b24e0",
    pattern: "lines",
  },
  energetic: {
    background: "linear-gradient(160deg, #1b0f3a 0%, #6d3ff5 45%, #ff7a3d 100%)",
    accent: "#ffd166",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.8)",
    badgeBg: "linear-gradient(120deg,#ffd166,#ff7a3d)",
    badgeText: "#1b0f3a",
    springStiffness: 220,
    springDamping: 12,
    glow: "#ffd166",
    secondaryAccent: "#ff5da2",
    pattern: "bokeh",
  },
  luxury: {
    background: "linear-gradient(160deg, #05050a 0%, #1a1408 60%, #05050a 100%)",
    accent: "#d4af6a",
    text: "#f5efe0",
    subtext: "rgba(245,239,224,0.65)",
    badgeBg: "linear-gradient(120deg,#d4af6a,#f3d99b)",
    badgeText: "#1a1408",
    springStiffness: 90,
    springDamping: 22,
    glow: "#f3d99b",
    secondaryAccent: "#8a6d3b",
    pattern: "soft",
  },
  fun: {
    background: "linear-gradient(160deg, #2f1573 0%, #ff5da2 55%, #ff9a5a 100%)",
    accent: "#ffe066",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.85)",
    badgeBg: "linear-gradient(120deg,#ffe066,#ff9a5a)",
    badgeText: "#4a1bb8",
    springStiffness: 200,
    springDamping: 10,
    glow: "#ffe066",
    secondaryAccent: "#5da2ff",
    pattern: "bokeh",
  },
  tech: {
    background: "linear-gradient(160deg, #05050a 0%, #0f1c3a 55%, #0d3a4a 100%)",
    accent: "#4fd7ff",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.7)",
    badgeBg: "linear-gradient(120deg,#4fd7ff,#6d3ff5)",
    badgeText: "#05050a",
    springStiffness: 150,
    springDamping: 16,
    glow: "#4fd7ff",
    secondaryAccent: "#6d3ff5",
    pattern: "grid",
  },
  minimal: {
    background: "linear-gradient(160deg, #f6f6fb 0%, #ffffff 100%)",
    accent: "#5b24e0",
    text: "#0a0a13",
    subtext: "rgba(10,10,19,0.6)",
    badgeBg: "linear-gradient(120deg,#0a0a13,#3c1893)",
    badgeText: "#ffffff",
    springStiffness: 120,
    springDamping: 18,
    glow: "#5b24e0",
    secondaryAccent: "#0a0a13",
    pattern: "soft",
  },
};
