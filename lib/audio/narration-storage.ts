/**
 * Persistent narration audio storage — replaces the previous long-lived
 * base64 `data:` URL transport (kept only as the TTS providers' own return
 * shape, see ./types.ts's TtsResult) with a real Supabase Storage object and
 * a signed, time-limited playback URL. Deliberately free of any real
 * Supabase client import and of "server-only": it takes a minimal,
 * structurally-typed `NarrationStorageClient` (matching supabase-js's real
 * `.storage` accessor shape) as a parameter, exactly like ./types.ts's
 * TtsProvider/synthesize is injected elsewhere in this codebase — so this
 * file is fully unit-testable with a hand-written fake, and the real
 * Supabase wiring (an authenticated, RLS-respecting client — never the
 * service-role client, see lib/supabase/admin.ts's docstring on when that's
 * actually warranted) lives only in lib/actions/narration-actions.ts.
 *
 * Bucket: "narration-audio" (private — see
 * supabase/migrations/015_narration_audio_storage.sql). Path convention:
 * `<user_id>/<generation_id>/<scene_id>.<ext>` — `user_id` is always the
 * server-verified id from requireUser(), never a client-supplied value (the
 * bucket's RLS policy checks exactly this first path segment against
 * auth.uid()); `generation_id`/`scene_id` only choose *where within the
 * caller's own folder* a clip lands, so a caller can never use them to read
 * or write another user's objects even if they supplied that value
 * themselves.
 */

import { sanitizeStoragePathSegment } from "@/lib/storage/path-utils";

export const NARRATION_AUDIO_BUCKET = "narration-audio";

/** How long a freshly issued playback URL stays valid. The durable, reusable thing is the storage `path` (Requirement 8) — a fresh signed URL can always be reissued from it later; this file doesn't need to (and doesn't) persist the URL itself anywhere durable. */
export const NARRATION_SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

const DATA_URL_PATTERN = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
};

/** Falls back to a generic extension for a content type MOVO's providers don't produce today, rather than guessing wrong — see the original Phase 5 report's "save with the correct extension" note. */
function extensionForContentType(contentType: string): string {
  return EXTENSION_BY_CONTENT_TYPE[contentType] ?? "bin";
}

/** Decodes a provider's `data:<mime>;base64,<...>` result back into raw bytes. Returns null for anything else — callers must treat that as a storage failure, never a crash. */
export function parseAudioDataUrl(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

/**
 * Deterministic, collision-safe object path: the same
 * (userId, generationId, sceneId) always maps to the same path, so a retry
 * of the same scene overwrites in place (see uploadNarrationAudio's
 * `upsert: true`) instead of accumulating orphaned copies (Requirement 10).
 * Different users, generations, or scenes can never collide.
 */
export function buildNarrationAudioPath(userId: string, generationId: string, sceneId: string, contentType: string): string {
  const ext = extensionForContentType(contentType);
  return `${sanitizeStoragePathSegment(userId)}/${sanitizeStoragePathSegment(generationId)}/${sanitizeStoragePathSegment(sceneId)}.${ext}`;
}

/** The exact shape this module needs from a Supabase client's `.storage` — matches the real supabase-js interface structurally, so the real `supabase.storage` satisfies it with no adapter, while tests can pass a two-method fake. */
export type NarrationStorageClient = {
  from(bucket: string): {
    upload(
      path: string,
      body: Buffer,
      options: { contentType: string; upsert: boolean },
    ): Promise<{ error: { message: string } | null }>;
    createSignedUrl(path: string, expiresInSeconds: number): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
  };
};

export type UploadNarrationAudioInput = {
  storage: NarrationStorageClient;
  /** Server-verified (requireUser().id) — NEVER a client-supplied value. */
  userId: string;
  generationId: string;
  sceneId: string;
  /** The TTS provider's raw `data:` URL result (see ./types.ts's TtsResult.audioUrl). */
  dataUrl: string;
  signedUrlExpirySeconds?: number;
};

export type UploadNarrationAudioResult =
  | { ok: true; path: string; signedUrl: string; contentType: string }
  | { ok: false; error: string };

/**
 * Uploads one scene's narration audio to the private narration-audio bucket
 * and returns a signed playback URL. `upsert: true` makes a retry of the
 * same (userId, generationId, sceneId) — e.g. ResultView's "Retry voice
 * generation" button, or a user editing a scene's narration text and
 * regenerating — overwrite the previous object in place rather than
 * creating a duplicate (Requirement 10). Never throws: every failure
 * (decode, upload, or signing) resolves to `{ ok: false, error }` so a
 * storage outage degrades one scene's audio, never the caller's VideoPlan
 * (see lib/audio/plan-narration.ts, which treats this exactly like a TTS
 * failure — no audio for that scene rather than a thrown error, and never a
 * fallback to the raw base64 payload, which would defeat the point of
 * moving off it).
 */
export async function uploadNarrationAudio({
  storage,
  userId,
  generationId,
  sceneId,
  dataUrl,
  signedUrlExpirySeconds = NARRATION_SIGNED_URL_EXPIRY_SECONDS,
}: UploadNarrationAudioInput): Promise<UploadNarrationAudioResult> {
  const parsed = parseAudioDataUrl(dataUrl);
  if (!parsed) return { ok: false, error: "Unrecognized audio data URL format." };

  const path = buildNarrationAudioPath(userId, generationId, sceneId, parsed.contentType);

  const { error: uploadError } = await storage.from(NARRATION_AUDIO_BUCKET).upload(path, parsed.buffer, {
    contentType: parsed.contentType,
    upsert: true,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: signedData, error: signError } = await storage.from(NARRATION_AUDIO_BUCKET).createSignedUrl(path, signedUrlExpirySeconds);
  if (signError || !signedData) return { ok: false, error: signError?.message ?? "Failed to create a signed URL." };

  return { ok: true, path, signedUrl: signedData.signedUrl, contentType: parsed.contentType };
}

export type SignNarrationAudioPathResult = { ok: true; signedUrl: string } | { ok: false; error: string };

/**
 * Reissues a fresh signed playback URL from an already-uploaded object's
 * durable path — the read half of the "store the path, never the signed
 * URL" rule (see lib/audio/plan-narration.ts's PersistedSceneNarration and
 * lib/actions/project-actions.ts's loadProjectAction, which calls this once
 * per narrated scene when a saved project is reopened, since the URL
 * persisted nowhere and the original one may already have expired).
 */
export async function signNarrationAudioPath(
  storage: NarrationStorageClient,
  path: string,
  expiresInSeconds: number = NARRATION_SIGNED_URL_EXPIRY_SECONDS,
): Promise<SignNarrationAudioPathResult> {
  const { data, error } = await storage.from(NARRATION_AUDIO_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create a signed URL." };
  return { ok: true, signedUrl: data.signedUrl };
}
