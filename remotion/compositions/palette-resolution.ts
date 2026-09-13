import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import { AD_PALETTES, type AdPalette } from "./ad-styles";
import { hashString } from "@/lib/ai/scene-variety";

/**
 * Creative Direction — palette layer (Visual Quality Upgrade phase).
 *
 * Why videos previously converged on indigo/purple: AD_PALETTES (ad-styles.ts)
 * is a fixed lookup of exactly 6 palettes keyed only by `visualStyle`, and 4
 * of those 6 (fast, energetic, fun, tech, minimal) use an indigo/purple hue
 * somewhere in background/accent/secondaryAccent — MOVO's OWN website
 * identity, never intended to double as every customer's brand color. The
 * planner had no way to express a different color choice at all:
 * VideoPlan.brandColors existed in the schema but was never read by any
 * renderer, and every scene in a video shared the exact same AdPalette
 * object, so even the one style-driven palette repeated identically for
 * every single scene.
 *
 * This resolver breaks both problems: it prefers a real color decision
 * (brandColors, then the AI's own deliberate `palette` choice) over the
 * fixed style lookup, and callers can additionally ask for a per-scene
 * variant (see resolveScenePalette) so consecutive scenes in the same video
 * read as related but not pixel-identical.
 */

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

/** `rgba(r,g,b,alpha)` from a hex color — falls back to a neutral gray if the hex is somehow malformed rather than throwing (never let a bad AI-supplied string crash a render). */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex) ?? { r: 160, g: 160, b: 160 };
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Relative luminance (WCAG-style approximation) — used only to pick a legible black/white label color, not for accessibility compliance. */
function luminance(hex: string): number {
  const rgb = hexToRgb(hex) ?? { r: 128, g: 128, b: 128 };
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Picks whichever of near-black/near-white reads legibly on `backgroundHex`. */
function pickContrastingText(backgroundHex: string): string {
  return luminance(backgroundHex) > 0.55 ? "#0a0a13" : "#ffffff";
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = clamp255(rgb.r * (1 - amount));
  const g = clamp255(rgb.g * (1 - amount));
  const b = clamp255(rgb.b * (1 - amount));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

type PaletteInput = Pick<VideoPlan, "visualStyle" | "brandColors" | "palette">;

/**
 * Builds the final AdPalette for a whole plan: color fields (background/
 * backgroundEnd/accent/secondaryAccent/text/subtext/glow/badgeBg/badgeText)
 * come from the best available real decision; motion/pattern personality
 * (springStiffness, springDamping, pattern) always comes from the style
 * lookup, since that governs pacing/feel rather than hue and every style's
 * tuning there is already deliberate.
 *
 * Priority: brandColors (the brief named/implied specific brand colors) >
 * plan.palette (the AI's own deliberate per-brief choice) >
 * AD_PALETTES[visualStyle] (safe default — also what every plan generated
 * before this field existed still resolves to, unchanged).
 */
export function resolvePlanPalette(plan: PaletteInput): AdPalette {
  const base = AD_PALETTES[plan.visualStyle];

  if (plan.brandColors && plan.brandColors.length > 0) {
    const [first, second, third] = plan.brandColors;
    const background = first;
    const backgroundEnd = second ?? darken(first, 0.55);
    const accent = second ?? first;
    const secondaryAccent = third ?? accent;
    const text = pickContrastingText(background);
    return {
      ...base,
      background: `linear-gradient(155deg, ${background} 0%, ${backgroundEnd} 100%)`,
      backgroundStops: [background, backgroundEnd],
      accent,
      secondaryAccent,
      text,
      subtext: hexToRgba(text, 0.72),
      glow: accent,
      badgeBg: `linear-gradient(120deg, ${accent}, ${secondaryAccent})`,
      badgeText: pickContrastingText(accent),
    };
  }

  if (plan.palette) {
    const { background, backgroundEnd, accent, secondaryAccent, text } = plan.palette;
    return {
      ...base,
      background: `linear-gradient(155deg, ${background} 0%, ${backgroundEnd} 100%)`,
      backgroundStops: [background, backgroundEnd],
      accent,
      secondaryAccent,
      text,
      subtext: hexToRgba(text, 0.72),
      glow: accent,
      badgeBg: `linear-gradient(120deg, ${accent}, ${secondaryAccent})`,
      badgeText: pickContrastingText(accent),
    };
  }

  return base;
}

/**
 * A subtle per-scene variant of an already-resolved palette: only the
 * background gradient's angle and stop order shift (deterministically, from
 * the scene's own id — never Math.random()), so consecutive scenes in the
 * same video feel like related but distinct beats instead of one repeated
 * wallpaper. Accent/text/badge colors — the actual brand identity — never
 * change between scenes. A no-op (angle 155, original stop order) when the
 * palette has no `backgroundStops` (e.g. an old persisted plan resolved
 * straight from AD_PALETTES's own 3-stop gradient strings), so nothing
 * already-rendered regresses.
 */
export function resolveScenePalette(palette: AdPalette, sceneId: string): AdPalette {
  if (!palette.backgroundStops) return palette;
  const [a, b] = palette.backgroundStops;
  const seed = hashString(sceneId);
  const angle = 130 + (seed % 60); // 130-189deg — always a diagonal, never flips to a flat horizontal/vertical wash
  const reversed = seed % 2 === 1;
  const [start, end] = reversed ? [b, a] : [a, b];
  return { ...palette, background: `linear-gradient(${angle}deg, ${start} 0%, ${end} 100%)` };
}
