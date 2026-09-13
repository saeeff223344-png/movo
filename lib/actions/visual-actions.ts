"use server";

import { requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { pickAssetForScene } from "@/lib/ai/plan-to-scenes";
import { resolveAutoVisuals } from "@/lib/visuals/visual-planning";
import { generateOpenAIImage } from "@/lib/visuals/providers/openai-image-provider";
import { uploadVisualAsset } from "@/lib/visuals/visual-asset-storage";
import type { VisualAssetUploader } from "@/lib/visuals/types";
import type { ResolvedSceneVisual } from "@/lib/visuals/types";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import type { Asset } from "@/lib/types/video";

export type { ResolvedSceneVisual } from "@/lib/visuals/types";

/**
 * Automatic Visual Assets phase: resolves every scene's automatic visual
 * for a real generation, via the real OpenAI images provider + real
 * Supabase Storage — all the orchestration (priority, dedup, cost cap,
 * failure fallback) lives in the plain, unit-tested
 * lib/visuals/visual-planning.ts; this wrapper only adds auth and the real,
 * server-only clients, exactly like narration-actions.ts does for
 * synthesizeVideoPlanNarrationAction.
 *
 * `generationId` is the same id CreateWorkspace.tsx already mints/reuses
 * for narration Storage (the project id once saved, or a session-only uuid
 * otherwise) — reused here so a retry of the same generation overwrites
 * its own visuals in place (uploadVisualAsset's upsert) instead of
 * orphaning new Storage objects every time.
 *
 * Never throws: resolveAutoVisuals's own contract already degrades a
 * single failed generateImage/upload call to "skip that scene", and the
 * one remaining failure mode (something throwing before/between calls,
 * e.g. OPENAI_API_KEY missing) is caught here too, so an outage in the
 * image provider or Storage can never break an already-generated VideoPlan
 * — the caller always gets a usable (if visual-less) result back, and the
 * existing gradient/motion/layout engine (Requirement 11) takes over.
 */
export async function generateVideoPlanVisualsAction(plan: VideoPlan, assets: Asset[], generationId: string): Promise<Record<string, ResolvedSceneVisual>> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const hasUserAssetForScene = (scene: VideoPlan["scenes"][number]) => Boolean(pickAssetForScene(scene.purpose, assets));
    const uploadImage: VisualAssetUploader = async (sceneId, dataUrl) => {
      const result = await uploadVisualAsset({ storage: supabase.storage, userId: user.id, generationId, sceneId, dataUrl });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, path: result.path, signedUrl: result.signedUrl };
    };

    return await resolveAutoVisuals(plan, hasUserAssetForScene, generateOpenAIImage, uploadImage);
  } catch (error) {
    console.error("[visual-actions] generateVideoPlanVisualsAction failed unexpectedly:", error);
    return {};
  }
}
