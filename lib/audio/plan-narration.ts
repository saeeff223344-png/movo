import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import { resolveAudioSettings } from "./audio-settings";
import type { UploadNarrationAudioResult } from "./narration-storage";
import type { TtsRequest, TtsResult } from "./types";
import { buildContinuousScript, mapAlignmentToTimings } from "./continuous-narration";
import type { ContinuousSynthesizeResult } from "./providers/elevenlabs-continuous-provider";

export type SceneNarrationAudio = {
  /** A signed, playable Supabase Storage URL — never a `data:` URL. Null when this scene has no real, stored audio (TTS fell back to silence, or the storage upload itself failed — see `storagePath`/PlanNarrationResult.status to tell those apart in logs). */
  audioUrl: string | null;
  /** The durable Storage object path (see ./narration-storage.ts) — null exactly when `audioUrl` is null. A fresh signed URL can always be reissued from this later without re-synthesizing (Requirement 8). */
  storagePath: string | null;
  contentType: string | null;
  durationSeconds: number;
  provider: TtsResult["provider"];
  characters: number;
  estimatedUsd: number | null;
  /**
   * Continuous narration (Visual Quality Upgrade phase) only: when this
   * scene's audio is a SLICE of a shared, longer file (see
   * synthesizePlanNarrationContinuous below) rather than its own
   * independent clip, these mark exactly where — in seconds, within that
   * shared file — this scene's line starts/ends. Absent/null for every
   * scene synthesized the original (per-scene clip) way, including every
   * plan persisted before this field existed, so nothing already-rendered
   * changes: lib/audio/plan-audio.ts only trims playback when both are set.
   */
  trimStartSeconds?: number | null;
  trimEndSeconds?: number | null;
};

/**
 * "ok" — every scene that needed narration got real synthesized audio AND it's safely in Storage.
 * "partial" — some scenes did, some fell back to silence or failed to upload.
 * "failed" — every scene that needed narration ended up with no stored audio.
 * "none" — no scene in this plan has narration at all; nothing to synthesize.
 */
export type NarrationGenerationStatus = "ok" | "partial" | "failed" | "none";

/**
 * The durable, database-safe half of SceneNarrationAudio — everything
 * except `audioUrl`, which is a signed URL and must NEVER be persisted (see
 * supabase/migrations/016_projects_narration_audio.sql's comment on
 * projects.narration). lib/actions/project-actions.ts stores exactly this
 * shape and reissues a fresh `audioUrl` from `storagePath` on every load.
 */
export type PersistedSceneNarration = Omit<SceneNarrationAudio, "audioUrl">;

/** Strips the signed `audioUrl` from every scene before persisting — the one place that boundary is enforced in code, so a future caller can't accidentally save a signed URL by forgetting to omit it themselves. */
export function toPersistedNarration(sceneAudio: Record<string, SceneNarrationAudio>): Record<string, PersistedSceneNarration> {
  const persisted: Record<string, PersistedSceneNarration> = {};
  for (const [sceneId, audio] of Object.entries(sceneAudio)) {
    const { audioUrl: _audioUrl, ...rest } = audio;
    persisted[sceneId] = rest;
  }
  return persisted;
}

/** Same "ok"/"partial"/"failed"/"none" rule synthesizePlanNarration uses internally, exposed so lib/actions/project-actions.ts's reload path (which only ever re-signs already-persisted paths, never calls synthesizePlanNarration) can compute the identical status from a map of sceneId -> freshly-signed-or-null audioUrl. */
export function deriveNarrationStatus(audioUrlBySceneId: Record<string, string | null>, totalNarratedScenes: number): NarrationGenerationStatus {
  if (totalNarratedScenes === 0) return "none";
  const realCount = Object.values(audioUrlBySceneId).filter((url) => url !== null).length;
  if (realCount === totalNarratedScenes) return "ok";
  if (realCount === 0) return "failed";
  return "partial";
}

export type PlanNarrationResult = {
  /** sceneId -> signed Storage playback URL — only scenes that got real audio AND successfully uploaded (never a `data:` URL, never the silent fallback's null). Pass straight into lib/audio/plan-audio.ts's buildPlanAudioProps/lib/ai/plan-to-scenes.ts's buildVideoPlanRenderData as `narrationAudioUrls`. */
  narrationAudioUrls: Record<string, string>;
  /** Full per-scene detail (storage path, provider, content type, cost) for UI status/cost reporting and for reissuing a signed URL later — buildPlanAudioProps doesn't need this, narrationAudioUrls above is already shaped exactly for it. */
  sceneAudio: Record<string, SceneNarrationAudio>;
  status: NarrationGenerationStatus;
  cost: { characters: number; estimatedUsd: number | null };
};

/** A plan with no narrated scenes at all, and nothing left to synthesize — the "none" status is a valid, unremarkable outcome, not an error. */
export const EMPTY_NARRATION_RESULT: PlanNarrationResult = {
  narrationAudioUrls: {},
  sceneAudio: {},
  status: "none",
  cost: { characters: 0, estimatedUsd: null },
};

/** For a genuine, unexpected failure (e.g. the server action itself throwing) — distinct from EMPTY_NARRATION_RESULT above so the UI surfaces it instead of silently treating it as "nothing to synthesize". Used by both lib/actions/narration-actions.ts and its caller (CreateWorkspace.tsx) as the same defensive fallback. */
export const FAILED_NARRATION_RESULT: PlanNarrationResult = {
  narrationAudioUrls: {},
  sceneAudio: {},
  status: "failed",
  cost: { characters: 0, estimatedUsd: null },
};

type NarrationPlanInput = Pick<VideoPlan, "language" | "visualStyle" | "audio" | "business" | "videoTitle" | "durationSeconds"> & {
  scenes: readonly { id: string; narration: string | null; transition: VideoPlan["scenes"][number]["transition"] }[];
};

/**
 * Uploads one scene's already-synthesized audio (a provider's `data:` URL)
 * to durable Storage and returns a signed playback URL. Injected — like
 * `synthesize` below — purely so this orchestration logic never needs a
 * real Supabase client or network call to unit-test; production wires
 * lib/audio/narration-storage.ts's uploadNarrationAudio in via
 * lib/actions/narration-actions.ts, using the authenticated caller's own
 * (RLS-respecting) Supabase client — never the service-role client.
 */
export type NarrationAudioUploader = (sceneId: string, dataUrl: string) => Promise<UploadNarrationAudioResult>;

const EMPTY_SCENE_AUDIO: Omit<SceneNarrationAudio, "provider" | "durationSeconds" | "characters" | "estimatedUsd"> = {
  audioUrl: null,
  storagePath: null,
  contentType: null,
};

/**
 * Synthesizes real narration audio for every scene in a plan that has a
 * spoken line, using MOVO's existing TtsProvider abstraction — never a
 * second TTS pipeline — then uploads each real clip to durable Storage
 * (Requirement: Persistent narration audio with Supabase Storage) so
 * nothing downstream ever needs a large base64 payload again. `synthesize`
 * is injected (production passes lib/audio/tts-provider-factory.ts's
 * synthesizeNarration, which already walks the real ElevenLabs -> OpenAI ->
 * silent-fallback chain and can never reject) purely so this orchestration
 * logic — the part actually worth unit-testing — never needs the
 * "server-only" factory or a real network call: see this file's test for
 * the same fake-provider pattern ./tts-fallback.test.ts already uses.
 *
 * A scene-level failure never destroys the plan, at either stage: a
 * thrown/rejected `synthesize()` call, or a failed `uploadAudio()` call
 * (Storage outage, quota, etc.), both simply leave that scene with no
 * stored audio — logged, recorded in `sceneAudio`, and reflected in
 * `status` — never a thrown error and never a silent fallback to the raw
 * base64 payload (that would defeat the entire point of moving off it).
 *
 * Uses the plan's own resolved audio settings (lib/audio/audio-settings.ts)
 * for voice gender/style/pace — the same settings the AudioPreferencesPanel
 * UI already lets a user override — and the plan's language directly, so
 * whichever ElevenLabs voice is configured for that language (and its
 * dialect policy, see ./providers/elevenlabs-voice-config.ts) applies
 * automatically with no separate wiring here.
 *
 * Scenes are synthesized ONE AT A TIME (in the plan's own scene order),
 * never via Promise.all — MOVO's real integrated test found that firing one
 * request per scene concurrently could open 5+ simultaneous ElevenLabs
 * requests, enough to trip the Starter plan's concurrency/rate limit and
 * silently split one Arabic video's narration across Haytham and the
 * OpenAI fallback voice mid-video. Serializing means this orchestration
 * layer never opens more than one request at a time regardless of provider,
 * trading some wall-clock time (each scene now waits for the previous
 * one) for the reliability launch actually needs; ElevenLabsTtsProvider's
 * own bounded retry (./providers/elevenlabs-retry.ts) additionally gives a
 * single transient rate-limit rejection a short chance to recover before
 * this falls through to OpenAI/silent for that scene.
 */
export async function synthesizePlanNarration(
  plan: NarrationPlanInput,
  synthesize: (request: TtsRequest) => Promise<TtsResult>,
  uploadAudio: NarrationAudioUploader,
): Promise<PlanNarrationResult> {
  const scenesWithNarration = plan.scenes
    .map((scene) => ({ id: scene.id, text: scene.narration?.trim() ?? "" }))
    .filter((scene) => scene.text.length > 0);

  if (scenesWithNarration.length === 0) return EMPTY_NARRATION_RESULT;

  const settings = resolveAudioSettings(plan);
  const sceneAudio: Record<string, SceneNarrationAudio> = {};
  const narrationAudioUrls: Record<string, string> = {};
  let characters = 0;
  let estimatedUsd = 0;
  let hasKnownCost = false;
  let realCount = 0;

  for (const scene of scenesWithNarration) {
    const request: TtsRequest = {
      text: scene.text,
      language: plan.language,
      gender: settings.voiceGender,
      style: settings.voiceStyle,
      pace: settings.narrationPace,
    };

    let result: TtsResult;
    try {
      result = await synthesize(request);
    } catch (error) {
      console.error("[plan-narration] synthesize() rejected unexpectedly for scene", scene.id, error);
      sceneAudio[scene.id] = { ...EMPTY_SCENE_AUDIO, durationSeconds: 0, provider: "silent-fallback", characters: 0, estimatedUsd: null };
      continue;
    }

    if (result.cost.estimatedUsd !== null) {
      estimatedUsd += result.cost.estimatedUsd;
      hasKnownCost = true;
    }
    characters += result.cost.characters;

    const base = {
      durationSeconds: result.durationSeconds,
      provider: result.provider,
      characters: result.cost.characters,
      estimatedUsd: result.cost.estimatedUsd,
    };

    if (result.provider === "silent-fallback" || !result.audioUrl) {
      sceneAudio[scene.id] = { ...EMPTY_SCENE_AUDIO, ...base };
      continue;
    }

    const uploaded = await uploadAudio(scene.id, result.audioUrl);
    if (!uploaded.ok) {
      console.error("[plan-narration] storage upload failed for scene", scene.id, uploaded.error);
      sceneAudio[scene.id] = { ...EMPTY_SCENE_AUDIO, ...base };
      continue;
    }

    sceneAudio[scene.id] = {
      audioUrl: uploaded.signedUrl,
      storagePath: uploaded.path,
      contentType: uploaded.contentType,
      ...base,
    };
    narrationAudioUrls[scene.id] = uploaded.signedUrl;
    realCount += 1;
  }

  const status: NarrationGenerationStatus =
    realCount === scenesWithNarration.length ? "ok" : realCount === 0 ? "failed" : "partial";

  return {
    narrationAudioUrls,
    sceneAudio,
    status,
    cost: { characters, estimatedUsd: hasKnownCost ? estimatedUsd : null },
  };
}

/** One synthesized continuous take for the whole video's script, before it's been uploaded/sliced per scene. Injected by narration-actions.ts as lib/audio/providers/elevenlabs-continuous-provider.ts's synthesizeElevenLabsContinuous, purely so this orchestration never needs a real network call to unit-test. */
export type SynthesizeContinuous = (fullText: string, language: VideoPlan["language"]) => Promise<ContinuousSynthesizeResult>;

/** Uploads the ONE shared continuous audio file (as opposed to NarrationAudioUploader's per-scene path) and returns its durable path/signed URL — production passes a closure over lib/audio/narration-storage.ts's uploadNarrationAudio with a fixed pseudo-scene-id (see narration-actions.ts), reusing the exact same Storage bucket/path convention with no schema change. */
export type UploadContinuousAudio = (dataUrl: string) => Promise<UploadNarrationAudioResult>;

/**
 * Synthesizes ONE continuous Haytham take for every narrated scene in a
 * plan and slices it back onto scenes using the provider's own
 * character-level timestamp alignment (lib/audio/continuous-narration.ts) —
 * see that file's docstring for why this replaces N independent per-scene
 * clips with one natural-sounding take. Every scene ends up pointing at the
 * SAME uploaded file, distinguished only by its own trimStartSeconds/
 * trimEndSeconds (lib/audio/plan-audio.ts turns those into <Audio
 * startFrom/endAt> trims at render time).
 *
 * Deliberately throws (never returns a degraded "partial"/"failed" result)
 * on any failure — synthesis, missing/short alignment, or upload — so its
 * one caller (lib/actions/narration-actions.ts's
 * synthesizeVideoPlanNarrationAction) can catch it and cleanly fall back to
 * the proven, independently-reliable per-scene pipeline
 * (synthesizePlanNarration above) instead of this new path ever being able
 * to make a real generation worse than before it existed.
 */
export async function synthesizePlanNarrationContinuous(
  plan: NarrationPlanInput,
  synthesizeContinuous: SynthesizeContinuous,
  uploadAudio: UploadContinuousAudio,
): Promise<PlanNarrationResult> {
  const scenesWithNarration = plan.scenes
    .map((scene) => ({ sceneId: scene.id, text: scene.narration?.trim() ?? "" }))
    .filter((scene) => scene.text.length > 0);

  if (scenesWithNarration.length === 0) return EMPTY_NARRATION_RESULT;

  const script = buildContinuousScript(scenesWithNarration.map((s) => ({ sceneId: s.sceneId, text: s.text })));

  const result = await synthesizeContinuous(script.fullText, plan.language);
  if (!result.ok) throw new Error(result.error);

  const timings = mapAlignmentToTimings(script, result.alignment);
  if (timings.every((t) => t.endSeconds <= t.startSeconds)) {
    throw new Error("ElevenLabs alignment produced no usable per-scene timing.");
  }

  const uploaded = await uploadAudio(result.audioUrl);
  if (!uploaded.ok) throw new Error(uploaded.error);

  const totalChars = scenesWithNarration.reduce((sum, s) => sum + s.text.length, 0) || 1;
  const sceneAudio: Record<string, SceneNarrationAudio> = {};
  const narrationAudioUrls: Record<string, string> = {};

  for (const timing of timings) {
    const scene = scenesWithNarration.find((s) => s.sceneId === timing.sceneId);
    const shareOfTotal = scene ? scene.text.length / totalChars : 0;
    sceneAudio[timing.sceneId] = {
      audioUrl: uploaded.signedUrl,
      storagePath: uploaded.path,
      contentType: uploaded.contentType,
      durationSeconds: Math.max(0, timing.endSeconds - timing.startSeconds),
      provider: "elevenlabs",
      characters: scene?.text.length ?? 0,
      estimatedUsd: result.estimatedUsd !== null ? result.estimatedUsd * shareOfTotal : null,
      trimStartSeconds: timing.startSeconds,
      trimEndSeconds: timing.endSeconds,
    };
    narrationAudioUrls[timing.sceneId] = uploaded.signedUrl;
  }

  return {
    narrationAudioUrls,
    sceneAudio,
    status: "ok",
    cost: { characters: result.characters, estimatedUsd: result.estimatedUsd },
  };
}

/** Derives lib/audio/plan-audio.ts's optional per-scene trim map straight from a PlanNarrationResult's own sceneAudio — the one place "does this scene need trimming" is decided, so callers (ResultView.tsx, export-orchestration.ts) never touch trimStartSeconds/trimEndSeconds directly. */
export function buildNarrationTrims(
  sceneAudio: Readonly<Record<string, SceneNarrationAudio>>,
): Record<string, { trimStartSeconds: number; trimEndSeconds: number }> {
  const trims: Record<string, { trimStartSeconds: number; trimEndSeconds: number }> = {};
  for (const [sceneId, audio] of Object.entries(sceneAudio)) {
    if (audio.trimStartSeconds != null && audio.trimEndSeconds != null) {
      trims[sceneId] = { trimStartSeconds: audio.trimStartSeconds, trimEndSeconds: audio.trimEndSeconds };
    }
  }
  return trims;
}
