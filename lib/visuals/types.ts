import type { VideoPlan } from "@/lib/ai/video-plan-schema";

/**
 * Automatic Visual Assets phase: the provider-agnostic contract every
 * concrete image source (OpenAI images today, a stock-photo API or another
 * generator later) implements. lib/visuals/visual-planning.ts's
 * orchestrator only ever calls through this interface, never a concrete
 * SDK — exactly the same "pure orchestration + injected client" split
 * lib/audio/plan-narration.ts uses for TTS providers, so the planning
 * logic is fully unit-testable with a hand-written fake and swapping/adding
 * a provider never touches that logic.
 */
export type GenerateImageInput = {
  prompt: string;
  /** Target pixel size — providers that only support fixed sizes should pick their closest match rather than failing. */
  width: number;
  height: number;
};

export type GenerateImageResult =
  | { ok: true; dataUrl: string; provider: string; estimatedUsd: number | null }
  | { ok: false; error: string };

export type VisualProvider = {
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
};

/** Where a scene's final visual actually came from — the priority chain Requirement 3 mandates, poorest-to-best documented at the call site in visual-planning.ts. */
export const VISUAL_SOURCES = ["user-product", "user-logo", "user-other", "auto-generated"] as const;
export type VisualSource = (typeof VISUAL_SOURCES)[number];

/** One scene's fully-resolved visual, ready for the renderer (lib/ai/plan-to-scenes.ts) and, for auto-generated ones, for durable persistence (lib/actions/visual-actions.ts). */
export type ResolvedSceneVisual = {
  sceneId: string;
  url: string;
  source: VisualSource;
  /** Only set for "auto-generated" — the durable Storage object path (never re-derivable from `url`, which is a signed, time-limited link). */
  storagePath?: string;
  /** Only set for "auto-generated" — the exact prompt sent to the provider, kept for persistence/debugging, never shown to the end user. */
  prompt?: string;
  provider?: string;
  estimatedUsd?: number | null;
};

/** Uploads one generated image (as a provider's raw `data:` URL result) and returns a durable path + signed playback URL — mirrors lib/audio/plan-narration.ts's NarrationAudioUploader shape exactly. */
export type VisualAssetUploader = (sceneId: string, dataUrl: string) => Promise<UploadVisualAssetOutcome>;

export type UploadVisualAssetOutcome = { ok: true; path: string; signedUrl: string } | { ok: false; error: string };

/** The subset of VideoPlan a visual-planning call actually needs — narrowed so tests never have to construct a full plan just to exercise prompt-building. */
export type VisualPlanningPlan = Pick<VideoPlan, "business" | "objective" | "targetAudience" | "tone" | "cta" | "visualStyle" | "language" | "aspectRatio" | "visualTheme" | "scenes">;
