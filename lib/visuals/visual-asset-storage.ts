/**
 * Persistent Storage for MOVO's automatically generated visual assets
 * (Automatic Visual Assets phase, Requirement 13: "do not depend on
 * temporary external URLs"). Mirrors lib/audio/narration-storage.ts's
 * shape and guarantees exactly: no real Supabase import, no "server-only",
 * a minimal structurally-typed client parameter, fully unit-testable with
 * a hand-written fake — the real Supabase wiring lives only in
 * lib/actions/visual-actions.ts.
 *
 * Bucket: reuses the existing, already-provisioned "project-assets" bucket
 * (private — see supabase/migrations/006_storage_rls.sql) rather than
 * adding a new one — its path convention (`<user_id>/<project_id>/...`,
 * ownership checked from the path's first segment) already fits this
 * exactly, and its RLS ("project-assets: owner can manage own") already
 * covers upload/upsert/read for the authenticated owner with no migration
 * needed. Path convention here:
 * `<user_id>/<generation_id>/visuals/<scene_id>.<ext>` — `generation_id` is
 * the same id lib/audio/narration-storage.ts's caller already threads
 * through per generation (the project id once saved, or a session-only
 * uuid otherwise); `scene_id` only chooses *where within the caller's own
 * folder* an image lands, so it can never be used to read/write another
 * user's objects even if supplied directly by a caller.
 */

import { sanitizeStoragePathSegment } from "@/lib/storage/path-utils";

export const VISUAL_ASSET_BUCKET = "project-assets";

/** How long a freshly issued playback URL stays valid — the durable, reusable thing is the storage `path` (Requirement 13); a fresh signed URL can always be reissued from it later. */
export const VISUAL_ASSET_SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

const DATA_URL_PATTERN = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function extensionForContentType(contentType: string): string {
  return EXTENSION_BY_CONTENT_TYPE[contentType] ?? "bin";
}

/** Decodes a provider's `data:<mime>;base64,<...>` result back into raw bytes. Returns null for anything else — callers must treat that as a storage failure, never a crash. */
export function parseImageDataUrl(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

/** Deterministic, collision-safe object path: the same (userId, generationId, sceneId) always maps to the same path, so a re-run of the same generation overwrites in place rather than accumulating orphaned copies. */
export function buildVisualAssetPath(userId: string, generationId: string, sceneId: string, contentType: string): string {
  const ext = extensionForContentType(contentType);
  return `${sanitizeStoragePathSegment(userId)}/${sanitizeStoragePathSegment(generationId)}/visuals/${sanitizeStoragePathSegment(sceneId)}.${ext}`;
}

/** The exact shape this module needs from a Supabase client's `.storage` — matches narration-storage.ts's NarrationStorageClient shape so the real `supabase.storage` satisfies both with no adapter. */
export type VisualAssetStorageClient = {
  from(bucket: string): {
    upload(
      path: string,
      body: Buffer,
      options: { contentType: string; upsert: boolean },
    ): Promise<{ error: { message: string } | null }>;
    createSignedUrl(path: string, expiresInSeconds: number): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
  };
};

export type UploadVisualAssetInput = {
  storage: VisualAssetStorageClient;
  /** Server-verified (requireUser().id) — NEVER a client-supplied value. */
  userId: string;
  generationId: string;
  sceneId: string;
  /** The image provider's raw `data:` URL result (see lib/visuals/types.ts's GenerateImageResult.dataUrl). */
  dataUrl: string;
  signedUrlExpirySeconds?: number;
};

export type UploadVisualAssetResult = { ok: true; path: string; signedUrl: string; contentType: string } | { ok: false; error: string };

/**
 * Uploads one auto-generated visual to the private project-assets bucket
 * and returns a signed playback URL. `upsert: true` makes a re-run for the
 * same (userId, generationId, sceneId) overwrite the previous object in
 * place instead of accumulating a duplicate. Never throws: every failure
 * (decode, upload, or signing) resolves to `{ ok: false, error }`, exactly
 * like uploadNarrationAudio — a Storage outage degrades one scene's visual,
 * never the caller's whole VideoPlan (see lib/visuals/visual-planning.ts,
 * which treats this exactly like a failed generateImage call).
 */
export async function uploadVisualAsset({
  storage,
  userId,
  generationId,
  sceneId,
  dataUrl,
  signedUrlExpirySeconds = VISUAL_ASSET_SIGNED_URL_EXPIRY_SECONDS,
}: UploadVisualAssetInput): Promise<UploadVisualAssetResult> {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return { ok: false, error: "Unrecognized image data URL format." };

  const path = buildVisualAssetPath(userId, generationId, sceneId, parsed.contentType);

  const { error: uploadError } = await storage.from(VISUAL_ASSET_BUCKET).upload(path, parsed.buffer, {
    contentType: parsed.contentType,
    upsert: true,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: signedData, error: signError } = await storage.from(VISUAL_ASSET_BUCKET).createSignedUrl(path, signedUrlExpirySeconds);
  if (signError || !signedData) return { ok: false, error: signError?.message ?? "Failed to create a signed URL." };

  return { ok: true, path, signedUrl: signedData.signedUrl, contentType: parsed.contentType };
}

export type SignVisualAssetPathResult = { ok: true; signedUrl: string } | { ok: false; error: string };

/** Reissues a fresh signed playback URL from an already-uploaded object's durable path — the read half of "store the path, never the signed URL" (see lib/actions/project-actions.ts, called once per persisted auto-generated scene visual when a saved project is reopened). */
export async function signVisualAssetPath(
  storage: VisualAssetStorageClient,
  path: string,
  expiresInSeconds: number = VISUAL_ASSET_SIGNED_URL_EXPIRY_SECONDS,
): Promise<SignVisualAssetPathResult> {
  const { data, error } = await storage.from(VISUAL_ASSET_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create a signed URL." };
  return { ok: true, signedUrl: data.signedUrl };
}
