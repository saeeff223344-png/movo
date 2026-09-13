"use server";

import { requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { synthesizeNarration } from "@/lib/audio/tts-provider-factory";
import {
  synthesizePlanNarration,
  synthesizePlanNarrationContinuous,
  FAILED_NARRATION_RESULT,
  type PlanNarrationResult,
  type NarrationAudioUploader,
  type UploadContinuousAudio,
} from "@/lib/audio/plan-narration";
import { uploadNarrationAudio } from "@/lib/audio/narration-storage";
import { synthesizeElevenLabsContinuous } from "@/lib/audio/providers/elevenlabs-continuous-provider";
import { isElevenLabsVoiceConfigured } from "@/lib/audio/providers/elevenlabs-voice-config";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";

/** Fixed pseudo-scene-id for the ONE shared continuous narration file — reuses narration-storage.ts's existing per-scene path convention (`<user>/<generationId>/<sceneId>.<ext>`) as-is, so continuous narration needs no new bucket path convention or migration. */
const CONTINUOUS_NARRATION_PSEUDO_SCENE_ID = "__continuous__";

export type { PlanNarrationResult } from "@/lib/audio/plan-narration";

/**
 * Phase 5.5 of the real generation engine: synthesizes real narration audio
 * for a VideoPlan (lib/ai/video-plan-schema.ts) via the existing
 * TtsProvider chain (lib/audio/tts-provider-factory.ts's synthesizeNarration
 * — ElevenLabs Haytham first when configured, OpenAI TTS next, silent
 * fallback last), uploads every real clip to the private narration-audio
 * Storage bucket (supabase/migrations/015_narration_audio_storage.sql), and
 * returns signed playback URLs — never a raw base64 payload — so /create's
 * Remotion preview can actually play the generated voice without embedding
 * large audio strings into client props. All the orchestration (looping
 * scenes, calling Storage, aggregating cost, deciding narration status)
 * lives in the plain, unit-tested lib/audio/plan-narration.ts — this
 * wrapper only adds auth and the real, server-only provider chain + Storage
 * client, exactly like generateVideoPlanAction does for generateVideoPlan.
 *
 * `generationId` groups one generate-or-retry session's clips under one
 * Storage folder (see lib/audio/narration-storage.ts's path convention) —
 * it is caller-supplied (CreateWorkspace.tsx mints one per new plan and
 * reuses it for every retry of that same plan) but is NEVER a security
 * boundary: the actual ownership check is the real, server-verified
 * `user.id` below, which is always the leading path segment the
 * narration-audio bucket's RLS policy enforces. A caller could pass any
 * string here and still only ever read/write inside their own folder.
 *
 * Never throws: synthesizeNarration's own fallback chain already guarantees
 * a TTS result for every scene, uploadNarrationAudio never throws either
 * (a Storage failure resolves to `{ ok: false }`, degrading that scene's
 * audio rather than the whole plan), and the one remaining failure mode
 * (something throwing before/between calls) is caught here too, so an
 * outage in either TTS or Storage can never destroy an already-generated
 * VideoPlan — the caller always gets a usable (if degraded) result back.
 */
export async function synthesizeVideoPlanNarrationAction(plan: VideoPlan, generationId: string): Promise<PlanNarrationResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const uploadAudio: NarrationAudioUploader = (sceneId, dataUrl) =>
    uploadNarrationAudio({ storage: supabase.storage, userId: user.id, generationId, sceneId, dataUrl });

  // One continuous Haytham take first (Visual Quality Upgrade phase) — only
  // attempted when ElevenLabs is actually configured for this plan's
  // language, and only ever used if it fully succeeds (synthesis + real
  // alignment + upload); ANY failure falls straight through to the proven
  // per-scene pipeline below, so this new path can never make a real
  // generation worse than before it existed, and never double-spends: only
  // one of the two ever actually calls ElevenLabs for a given generation.
  if (isElevenLabsVoiceConfigured(plan.language)) {
    try {
      const uploadContinuous: UploadContinuousAudio = (dataUrl) =>
        uploadNarrationAudio({ storage: supabase.storage, userId: user.id, generationId, sceneId: CONTINUOUS_NARRATION_PSEUDO_SCENE_ID, dataUrl });
      const continuous = await synthesizePlanNarrationContinuous(plan, synthesizeElevenLabsContinuous, uploadContinuous);
      if (continuous.status !== "none") return continuous;
      // "none" means no scene had narration at all — identical outcome on
      // either path, so just let the per-scene call below confirm the same
      // EMPTY_NARRATION_RESULT rather than special-casing it here.
    } catch (error) {
      console.error("[narration-actions] continuous narration failed, falling back to per-scene synthesis:", error);
    }
  }

  try {
    return await synthesizePlanNarration(plan, synthesizeNarration, uploadAudio);
  } catch (error) {
    // Distinct from plan-narration.ts's own EMPTY_NARRATION_RESULT ("none" — no
    // scene needed narration, an unremarkable outcome): this is a genuine,
    // unexpected failure, so it must surface to the user as "failed", not be
    // silently mistaken for "nothing to synthesize".
    console.error("[narration-actions] synthesizePlanNarration failed unexpectedly:", error);
    return FAILED_NARRATION_RESULT;
  }
}
