/**
 * Persistent Storage for MOVO's AI-generated scene videos (Dynamic AI
 * Video Director + Runway Integration phase, Requirement 9: "Runway
 * result URLs must NOT be treated as permanent... download server-side...
 * upload to a PRIVATE Supabase bucket"). Mirrors
 * lib/visuals/visual-asset-storage.ts's shape and guarantees exactly: no
 * real Supabase import, no "server-only", a minimal structurally-typed
 * client parameter, fully unit-testable with a hand-written fake — the
 * real Supabase wiring lives only in lib/actions/project-actions.ts.
 *
 * Bucket: reuses the existing "project-assets" bucket (private — see
 * supabase/migrations/006_storage_rls.sql), exactly like auto-generated
 * still visuals already do — no new bucket/RLS migration needed. Path
 * convention: `<user_id>/<generation_id>/videos/<scene_id>.mp4` — the
 * user's suggested `<userId>/<projectId>/<sceneId>/<generationId>.mp4`
 * shape is adapted to match visual-asset-storage.ts's existing
 * `<user_id>/<generation_id>/visuals/<scene_id>.<ext>` convention exactly
 * (swapping only the "visuals" segment for "videos") rather than
 * introducing a third, different path shape in the same bucket —
 * `generation_id` already *is* the project id once a project is saved
 * (see narration-storage.ts's docstring), so the two conventions land on
 * the same folder either way.
 */

import { sanitizeStoragePathSegment } from "@/lib/storage/path-utils";

export const VIDEO_ASSET_BUCKET = "project-assets";

/** How long a freshly issued playback URL stays valid — the durable, reusable thing is the storage `path` (Requirement 9); a fresh signed URL can always be reissued from it later. */
export const VIDEO_ASSET_SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

const DATA_URL_PATTERN = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

function extensionForContentType(contentType: string): string {
  return EXTENSION_BY_CONTENT_TYPE[contentType] ?? "bin";
}

/** Decodes a provider's `data:<mime>;base64,<...>` result back into raw bytes. Returns null for anything else — callers must treat that as a storage failure, never a crash. */
export function parseVideoDataUrl(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

/** Deterministic, collision-safe object path: the same (userId, generationId, sceneId) always maps to the same path, so a re-run of the same generation overwrites in place rather than accumulating orphaned copies. */
export function buildVideoAssetPath(userId: string, generationId: string, sceneId: string, contentType: string): string {
  const ext = extensionForContentType(contentType);
  return `${sanitizeStoragePathSegment(userId)}/${sanitizeStoragePathSegment(generationId)}/videos/${sanitizeStoragePathSegment(sceneId)}.${ext}`;
}

/** The exact shape this module needs from a Supabase client's `.storage` — matches visual-asset-storage.ts's VisualAssetStorageClient shape so the real `supabase.storage` satisfies both with no adapter. */
export type VideoAssetStorageClient = {
  from(bucket: string): {
    upload(
      path: string,
      body: Buffer,
      options: { contentType: string; upsert: boolean },
    ): Promise<{ error: { message: string } | null }>;
    createSignedUrl(path: string, expiresInSeconds: number): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
  };
};

export type UploadVideoAssetInput = {
  storage: VideoAssetStorageClient;
  /** Server-verified (requireUser().id) — NEVER a client-supplied value. */
  userId: string;
  generationId: string;
  sceneId: string;
  /** The video provider's raw `data:` URL result (see lib/video-generation/types.ts's GenerateVideoResult.dataUrl). */
  dataUrl: string;
  signedUrlExpirySeconds?: number;
};

export type UploadVideoAssetResult = { ok: true; path: string; signedUrl: string; contentType: string } | { ok: false; error: string };

/**
 * Uploads one AI-generated scene video to the private project-assets
 * bucket and returns a signed playback URL. `upsert: true` makes a re-run
 * for the same (userId, generationId, sceneId) overwrite the previous
 * object in place instead of accumulating a duplicate. Never throws:
 * every failure (decode, upload, or signing) resolves to
 * `{ ok: false, error }`, exactly like uploadVisualAsset — a Storage
 * outage degrades one scene's video (falls back to its still image, see
 * lib/actions/video-direction-actions.ts), never the caller's whole
 * VideoPlan.
 */
export async function uploadVideoAsset({
  storage,
  userId,
  generationId,
  sceneId,
  dataUrl,
  signedUrlExpirySeconds = VIDEO_ASSET_SIGNED_URL_EXPIRY_SECONDS,
}: UploadVideoAssetInput): Promise<UploadVideoAssetResult> {
  const parsed = parseVideoDataUrl(dataUrl);
  if (!parsed) return { ok: false, error: "Unrecognized video data URL format." };

  const path = buildVideoAssetPath(userId, generationId, sceneId, parsed.contentType);

  const { error: uploadError } = await storage.from(VIDEO_ASSET_BUCKET).upload(path, parsed.buffer, {
    contentType: parsed.contentType,
    upsert: true,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: signedData, error: signError } = await storage.from(VIDEO_ASSET_BUCKET).createSignedUrl(path, signedUrlExpirySeconds);
  if (signError || !signedData) return { ok: false, error: signError?.message ?? "Failed to create a signed URL." };

  return { ok: true, path, signedUrl: signedData.signedUrl, contentType: parsed.contentType };
}

export type SignVideoAssetPathResult = { ok: true; signedUrl: string } | { ok: false; error: string };

/** Reissues a fresh signed playback URL from an already-uploaded object's durable path — the read half of "store the path, never the signed URL" (see lib/actions/project-actions.ts, called once per persisted AI-video scene when a saved project is reopened). */
export async function signVideoAssetPath(
  storage: VideoAssetStorageClient,
  path: string,
  expiresInSeconds: number = VIDEO_ASSET_SIGNED_URL_EXPIRY_SECONDS,
): Promise<SignVideoAssetPathResult> {
  const { data, error } = await storage.from(VIDEO_ASSET_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create a signed URL." };
  return { ok: true, signedUrl: data.signedUrl };
}
