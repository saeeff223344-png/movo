import { sanitizeStoragePathSegment } from "@/lib/storage/path-utils";
import type { NarrationStorageClient } from "@/lib/audio/narration-storage";

/**
 * Persistent final-MP4 storage. Reuses the existing private "videos"
 * Storage bucket (006_storage_rls.sql) rather than creating a new
 * "final-videos" bucket — it already exists, is already private, and its
 * path convention (`<user_id>/...`) is exactly what this needs;
 * 017_render_jobs_export.sql only adds the owner-upload/update policies
 * that bucket was missing (it previously only let admins with the
 * `videos.manage` permission write to it). Same structurally-typed client
 * pattern as lib/audio/narration-storage.ts — reused directly (the two
 * buckets need identical upload/createSignedUrl operations) rather than
 * redeclaring an identical interface.
 */

export const FINAL_VIDEO_BUCKET = "videos";

/** Long enough to cover a poll-and-download UI session; the durable, reusable thing is the storage `path` — a fresh signed URL can always be reissued from it later (see signFinalVideoPath). */
export const FINAL_VIDEO_SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

/** Deterministic, collision-safe: `<userId>/<projectId>/<renderJobId>.mp4`. `userId` is always the server-verified owner, never client input. */
export function buildFinalVideoPath(userId: string, projectId: string, renderJobId: string): string {
  return `${sanitizeStoragePathSegment(userId)}/${sanitizeStoragePathSegment(projectId)}/${sanitizeStoragePathSegment(renderJobId)}.mp4`;
}

export type UploadFinalVideoResult = { ok: true; path: string; signedUrl: string } | { ok: false; error: string };

/** Uploads the rendered MP4 bytes and returns a signed download URL. `upsert: true` so re-checking an already-uploaded render (e.g. a duplicate progress poll) never fails or duplicates the object. */
export async function uploadFinalVideo(
  storage: NarrationStorageClient,
  path: string,
  buffer: Buffer,
  contentType: string,
  signedUrlExpirySeconds: number = FINAL_VIDEO_SIGNED_URL_EXPIRY_SECONDS,
): Promise<UploadFinalVideoResult> {
  const { error: uploadError } = await storage.from(FINAL_VIDEO_BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const signed = await signFinalVideoPath(storage, path, signedUrlExpirySeconds);
  if (!signed.ok) return signed;
  return { ok: true, path, signedUrl: signed.signedUrl };
}

export type SignFinalVideoPathResult = { ok: true; signedUrl: string } | { ok: false; error: string };

/** Reissues a fresh signed download URL from an already-uploaded video's durable path — never itself persisted (see supabase/migrations/017_render_jobs_export.sql's comment on videos.storage_path). */
export async function signFinalVideoPath(
  storage: NarrationStorageClient,
  path: string,
  expiresInSeconds: number = FINAL_VIDEO_SIGNED_URL_EXPIRY_SECONDS,
): Promise<SignFinalVideoPathResult> {
  const { data, error } = await storage.from(FINAL_VIDEO_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create a signed URL." };
  return { ok: true, signedUrl: data.signedUrl };
}
