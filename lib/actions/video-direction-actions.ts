"use server";

import { requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { pickAssetForScene } from "@/lib/ai/plan-to-scenes";
import { directSceneMotion } from "@/lib/video-director/video-director";
import { selectScenesForVideoGeneration } from "@/lib/video-director/eligibility";
import { getMaxAiVideoScenes, getAiVideoDurationSeconds } from "@/lib/video-director/video-director-config";
import { generateRunwayVideo } from "@/lib/video-generation/providers/runway-video-provider-real";
import { uploadVideoAsset } from "@/lib/video-generation/video-asset-storage";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import type { Asset } from "@/lib/types/video";
import type { ResolvedSceneVisual } from "@/lib/visuals/types";
import type { ResolvedSceneVideo } from "@/lib/video-generation/types";
import type { VideoDirectorPlan } from "@/lib/video-director/types";

export type { ResolvedSceneVideo } from "@/lib/video-generation/types";

/**
 * Runway's image-to-video endpoint needs the still image's actual bytes
 * (Requirement 3: the prompt describes motion only — the source image
 * itself already establishes appearance), so a scene is only a real
 * candidate when its resolved still visual is something this server can
 * fetch. An auto-generated visual's signed Supabase Storage URL qualifies;
 * a user-uploaded asset's `blob:` preview URL (see
 * components/create/AssetUploader.tsx — never uploaded to Storage today)
 * does not and is correctly excluded rather than failing later.
 */
function isServerFetchableUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/** Fetches an already-resolved still visual's bytes and re-encodes them as the `data:` URL Runway's image_to_video endpoint accepts directly. Never throws — a failure here just means this one scene has no server-fetchable image, degrading it out of candidacy exactly like isServerFetchableUrl already does for a blob: URL. */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Dynamic AI Video Director + Runway Integration phase — the real
 * orchestrator wiring together every already-built, already-unit-tested
 * piece: lib/video-director/* (Requirement 2: what should physically
 * move), lib/video-generation/providers/runway-video-provider-real.ts
 * (Requirement 8: real Runway Gen-4 Turbo), and
 * lib/video-generation/video-asset-storage.ts (Requirement 9: durable
 * Supabase persistence, never a bare provider URL). Mirrors
 * lib/actions/visual-actions.ts exactly: auth + real Supabase client here,
 * every actual decision (eligibility, cost cap, motion direction) lives in
 * the plain, already-tested modules it calls.
 *
 * `generationId` is the same id CreateWorkspace.tsx already mints/reuses
 * for narration and visual Storage — reused here so a retry of the same
 * generation overwrites its own videos in place (uploadVideoAsset's
 * upsert) instead of orphaning new Storage objects.
 *
 * Requirement 13: never loses the project on failure. Every failure mode —
 * the director call itself failing, a scene having no server-fetchable
 * still image, or one scene's Runway generation/poll/download failing —
 * degrades exactly that one scene back to "no AI video" (its still image +
 * the existing Remotion-only rendering takes over, see
 * lib/ai/plan-to-scenes.ts's priority chain), never the caller's whole
 * VideoPlan. This function itself never throws.
 *
 * Requirement 6: at most getMaxAiVideoScenes() scenes ever reach the real,
 * paid Runway call — selectScenesForVideoGeneration enforces this
 * regardless of how many scenes the director recommends.
 */
export async function directAndGenerateSceneVideosAction(
  plan: VideoPlan,
  assets: Asset[],
  generationId: string,
  autoVisuals: Readonly<Record<string, ResolvedSceneVisual>> = {},
): Promise<Record<string, ResolvedSceneVideo>> {
  try {
    const resolvedImageUrls: Record<string, string> = {};
    for (const scene of plan.scenes) {
      const asset = pickAssetForScene(scene.purpose, assets);
      const url = asset?.previewUrl ?? autoVisuals[scene.id]?.url;
      if (url && isServerFetchableUrl(url)) resolvedImageUrls[scene.id] = url;
    }

    const directorPlan: VideoDirectorPlan = plan;
    const directed = await directSceneMotion(directorPlan, (sceneId) => Boolean(resolvedImageUrls[sceneId]));
    if (!directed.ok) {
      console.error("[video-direction-actions] directSceneMotion failed:", directed.error);
      return {};
    }

    const selected = selectScenesForVideoGeneration(directed.directions, getMaxAiVideoScenes());
    if (selected.length === 0) return {};

    const user = await requireUser();
    const supabase = await createClient();
    const durationSeconds = getAiVideoDurationSeconds();

    const results: Record<string, ResolvedSceneVideo> = {};
    for (const direction of selected) {
      const imageUrl = resolvedImageUrls[direction.sceneId];
      if (!imageUrl || !direction.runwayPrompt) continue;

      const imageDataUrl = await fetchImageAsDataUrl(imageUrl);
      if (!imageDataUrl) continue;

      const generated = await generateRunwayVideo({
        imageDataUrl,
        motionPrompt: direction.runwayPrompt,
        aspectRatio: plan.aspectRatio,
        durationSeconds,
      });
      if (!generated.ok) {
        console.error(`[video-direction-actions] Runway generation failed for scene ${direction.sceneId}:`, generated.error);
        continue;
      }

      const upload = await uploadVideoAsset({
        storage: supabase.storage,
        userId: user.id,
        generationId,
        sceneId: direction.sceneId,
        dataUrl: generated.dataUrl,
      });
      if (!upload.ok) {
        console.error(`[video-direction-actions] Storage upload failed for scene ${direction.sceneId}:`, upload.error);
        continue;
      }

      results[direction.sceneId] = {
        sceneId: direction.sceneId,
        url: upload.signedUrl,
        source: "ai-generated",
        storagePath: upload.path,
        motionPrompt: direction.runwayPrompt,
        provider: generated.provider,
        model: generated.model,
        providerTaskId: generated.providerTaskId,
        durationSeconds: generated.durationSeconds,
        providerCost: generated.providerCost,
      };
    }

    return results;
  } catch (error) {
    console.error("[video-direction-actions] directAndGenerateSceneVideosAction failed unexpectedly:", error);
    return {};
  }
}
