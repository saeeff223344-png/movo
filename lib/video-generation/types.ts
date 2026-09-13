import type { AspectRatio } from "@/lib/types/video";

/**
 * Dynamic AI Video Director + Runway Integration phase — the
 * provider-agnostic contract every image-to-video source implements
 * (Requirement 7). Runway Gen-4 Turbo is provider #1
 * (providers/runway-video-provider.ts); a future Google Veo or other
 * provider only ever needs to satisfy this same interface — nothing in
 * lib/video-director/* or the action layer that calls it needs to change.
 * Exactly the same "pure orchestration + injected client" split
 * lib/visuals/types.ts's VisualProvider uses for images.
 */
export type GenerateVideoInput = {
  /** The source still image as a data URI (data:image/png;base64,... or data:image/jpeg;base64,...) — the already-resolved still visual this scene is animating. */
  imageDataUrl: string;
  /** The director's motion-first prompt (lib/video-director/types.ts's SceneMotionDirection.runwayPrompt) — never a re-description of the still image's appearance. */
  motionPrompt: string;
  aspectRatio: Exclude<AspectRatio, "auto">;
  durationSeconds: number;
};

export type GenerateVideoResult =
  | {
      ok: true;
      /** The generated clip as a data URI — mirrors lib/visuals/types.ts's GenerateImageResult.dataUrl shape so the same "provider returns bytes, a separate storage module persists them" split applies here too. */
      dataUrl: string;
      provider: string;
      model: string;
      /** The provider's own task/job id — kept for debugging and cost audit, never shown to the end user. */
      providerTaskId: string;
      durationSeconds: number;
      /** Credits/cost as reported by the provider, in whatever unit it bills in (Runway: credits) — informational, see lib/video-generation/video-pricing.ts. */
      providerCost: number | null;
    }
  | { ok: false; error: string; providerTaskId?: string };

export type VideoGenerationProvider = {
  generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult>;
};

/** One scene's fully-resolved AI-generated video, ready for the renderer (lib/ai/plan-to-scenes.ts) and for durable persistence (lib/actions/video-direction-actions.ts) — mirrors lib/visuals/types.ts's ResolvedSceneVisual shape exactly, one level up the media-priority chain (Requirement 10: video > still image). */
export type ResolvedSceneVideo = {
  sceneId: string;
  url: string;
  source: "ai-generated";
  /** Only set once persisted — the durable Storage object path (never re-derivable from `url`, which is a signed, time-limited link). */
  storagePath?: string;
  motionPrompt?: string;
  provider?: string;
  model?: string;
  providerTaskId?: string;
  durationSeconds?: number;
  providerCost?: number | null;
};
