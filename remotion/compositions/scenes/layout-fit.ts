/**
 * Pure sizing/fit calculations shared by every PlanScene layout
 * (plan-scene-layouts.tsx). Kept dependency-free (no remotion/react
 * imports) so it's directly unit-testable.
 */

/**
 * Percentage of each edge kept clear of important content, on every
 * aspect ratio (9:16, 16:9, 1:1) — a percentage rather than a scaled pixel
 * value so it's a true fraction of the actual composition dimensions,
 * not a manually-tuned number that happens to look right at one size.
 */
export const SAFE_AREA_PERCENT = 7;

/** CSS `inset` value for the safe area — e.g. "7%" on all four sides. */
export const SAFE_AREA_INSET = `${SAFE_AREA_PERCENT}%`;

/**
 * Shrinks a base font size for longer text so a long headline/CTA still
 * fits the safe area instead of overflowing it. Short text (<= softLimit
 * characters) is untouched; beyond that it shrinks smoothly toward
 * minFontSize using a square-root curve (gentle at first, never
 * disappearing). Pure and deterministic — same input always gives the
 * same size, independent of any actual DOM measurement.
 */
export function clampFontSizeForLength(
  text: string,
  baseFontSize: number,
  options?: { softLimit?: number; minFontSize?: number },
): number {
  const softLimit = options?.softLimit ?? 24;
  const minFontSize = options?.minFontSize ?? baseFontSize * 0.45;
  const length = text.trim().length;

  if (length <= softLimit || length === 0) return baseFontSize;

  const shrink = Math.sqrt(softLimit / length);
  return Math.max(minFontSize, baseFontSize * shrink);
}
