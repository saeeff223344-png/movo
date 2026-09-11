import type { RenderJob, RenderQuality } from "@/lib/types/video";

/**
 * Mock render-request service. No render engine is connected yet, so this
 * only produces a RenderJob record for the UI to reflect — it intentionally
 * never resolves to "completed". Swapping this for a real render queue call
 * later should not require any UI changes.
 */
export function requestRender(projectId: string, quality: RenderQuality): RenderJob {
  return {
    id: `render_${Date.now()}`,
    projectId,
    quality,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
}
