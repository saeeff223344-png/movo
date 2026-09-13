/**
 * Pure sizing decision for the preview wrapper around PlanPreviewPlayer
 * (ResultView.tsx) — kept separate from the component so it's testable
 * without React/DOM. Portrait (9:16) and square (1:1) plans get a narrower
 * cap so the preview doesn't dwarf the surrounding /create UI; landscape
 * (16:9) gets more room. The actual height is never computed here — Player
 * derives it natively from the composition's aspect ratio (see
 * PlanPreviewPlayer.tsx) — this only decides how wide the bounding box
 * is allowed to grow.
 */
export function isPortraitOrSquare(width: number, height: number): boolean {
  return height >= width;
}

export function previewMaxWidthClass(width: number, height: number): "max-w-sm" | "max-w-2xl" {
  return isPortraitOrSquare(width, height) ? "max-w-sm" : "max-w-2xl";
}
