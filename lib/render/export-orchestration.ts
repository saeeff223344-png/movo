import { buildVideoPlanRenderData } from "@/lib/ai/plan-to-scenes";
import { AD_FPS, PLAN_RENDER_COMP_NAME } from "@/remotion/constants";
import type { PlanRenderInputProps } from "@/remotion/compositions/plan-render-types";
import { loadProject, type ProjectsClient, type ProjectAssetsClient } from "@/lib/actions/project-persistence";
import type { NarrationStorageClient } from "@/lib/audio/narration-storage";
import { buildNarrationTrims } from "@/lib/audio/plan-narration";
import { buildFinalVideoPath, uploadFinalVideo, signFinalVideoPath } from "./final-video-storage";
import type { RenderClient } from "./render-client";

/**
 * The actual (testable, "server-only"-free) export job-lifecycle logic
 * behind lib/actions/export-actions.ts's thin "use server" wrappers — same
 * split as lib/actions/project-persistence.ts vs project-actions.ts, and
 * lib/audio/plan-narration.ts vs narration-actions.ts. Every dependency
 * (Supabase-backed clients, the render backend, the file download) is
 * injected so this file never needs a real network/cloud-rendering call to
 * unit-test.
 *
 * Renders the PERSISTED, schema-validated VideoPlan (via project-persistence's
 * loadProject, which already re-signs its narration audio) — never an
 * arbitrary client-supplied render payload. A caller with unsaved editor
 * changes must save them first (lib/actions/project-actions.ts's
 * saveProjectPlanAction) before starting an export; this module has no way
 * to bypass that, by design.
 */

export type NewVideoRow = {
  project_id: string;
  owner_id: string;
  status: "processing";
  aspect_ratio: "9:16" | "16:9" | "1:1";
  resolution: "1080p";
  format: "mp4";
  /** Known upfront from the plan's own render data (durationInFrames / fps) — no need to wait for the render to finish or inspect the output file. */
  duration_seconds: number;
};

export type VideoRow = {
  id: string;
  status: "processing" | "ready" | "failed";
  storage_path: string | null;
  duration_seconds: number | null;
  file_size_mb: number | null;
};

export type VideosClient = {
  insertVideo(row: NewVideoRow): Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  updateVideo(
    id: string,
    ownerId: string,
    patch: Partial<Pick<VideoRow, "status" | "storage_path" | "duration_seconds" | "file_size_mb">>,
  ): Promise<{ ok: true } | { ok: false; error: string }>;
  selectVideo(id: string, ownerId: string): Promise<VideoRow | null>;
};

export type NewRenderJobRow = {
  user_id: string;
  project_id: string;
  video_id: string;
  provider: "remotion-lambda";
  status: "queued";
  resolution: "1080p";
  format: "mp4";
  /** Packs the render backend's own two-part render reference (bucketName:renderId — see RenderClient) into the existing `server` column rather than adding two new ones for a single-provider launch. */
  server: string;
};

export type RenderJobRow = {
  id: string;
  project_id: string | null;
  video_id: string | null;
  status: "queued" | "processing" | "succeeded" | "failed";
  progress: number;
  server: string | null;
  error_message: string | null;
};

export type RenderJobsClient = {
  insertRenderJob(row: NewRenderJobRow): Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  updateRenderJob(
    id: string,
    ownerId: string,
    patch: Partial<Pick<RenderJobRow, "status" | "progress" | "error_message">> & { completed_at?: string },
  ): Promise<{ ok: true } | { ok: false; error: string }>;
  /** Returns null both when the job doesn't exist AND when it exists but belongs to a different owner. */
  selectRenderJob(id: string, ownerId: string): Promise<RenderJobRow | null>;
  /** True when the owner already has a queued/processing job for this project — used to refuse starting a duplicate concurrent export. */
  hasActiveJobForProject(ownerId: string, projectId: string): Promise<boolean>;
};

export type StartExportInput = {
  projects: ProjectsClient;
  storage: NarrationStorageClient;
  videos: VideosClient;
  renderJobs: RenderJobsClient;
  render: RenderClient;
  ownerId: string;
  projectId: string;
  /** Optional — omitted callers (and every existing test) get loadProject's own no-op default, i.e. no durable auto-generated visuals in the export. */
  projectAssets?: ProjectAssetsClient;
};

export type StartExportResult =
  | { ok: true; renderJobId: string }
  | { ok: false; error: string; code: "not_found" | "invalid" | "already_exporting" | "render_unavailable" | "db_error" };

/** Packs/unpacks RenderClient's two-part render reference into the render_jobs.server text column (see NewRenderJobRow's doc comment). */
function packRenderRef(bucketName: string, renderId: string): string {
  return `${bucketName}:${renderId}`;
}
function unpackRenderRef(server: string | null): { bucketName: string; renderId: string } | null {
  if (!server) return null;
  const [bucketName, renderId] = server.split(":");
  if (!bucketName || !renderId) return null;
  return { bucketName, renderId };
}

/**
 * Starts a real 1080p export: loads + validates the persisted project,
 * rebuilds the exact same render props the live preview already uses
 * (buildVideoPlanRenderData — no separate composition/motion logic),
 * refuses a duplicate concurrent export for the same project (Requirement
 * 13: no repeated accidental renders), then creates the `videos` +
 * `render_jobs` rows and kicks off the render. Never marks anything
 * "succeeded" here — only checkExportProgress does, once the MP4 actually
 * exists in Storage.
 */
export async function startExport(input: StartExportInput): Promise<StartExportResult> {
  const alreadyExporting = await input.renderJobs.hasActiveJobForProject(input.ownerId, input.projectId);
  if (alreadyExporting) return { ok: false, error: "An export is already in progress for this project.", code: "already_exporting" };

  const loaded = await loadProject(input.projects, input.storage, input.ownerId, input.projectId, input.projectAssets);
  if (!loaded.ok) return { ok: false, error: "Project not found.", code: loaded.code };

  const renderData = buildVideoPlanRenderData(
    loaded.plan,
    [],
    AD_FPS,
    loaded.narration.narrationAudioUrls,
    buildNarrationTrims(loaded.narration.sceneAudio),
    loaded.visuals,
    loaded.videos,
  );
  const inputProps: PlanRenderInputProps = {
    ...renderData.compositionProps,
    width: renderData.width,
    height: renderData.height,
    durationInFrames: renderData.durationInFrames,
    fps: renderData.fps,
  };

  const started = await input.render.startRender({ compositionId: PLAN_RENDER_COMP_NAME, inputProps });
  if (!started.ok) return { ok: false, error: started.error, code: "render_unavailable" };

  const video = await input.videos.insertVideo({
    project_id: input.projectId,
    owner_id: input.ownerId,
    status: "processing",
    aspect_ratio: loaded.plan.aspectRatio,
    resolution: "1080p",
    format: "mp4",
    duration_seconds: Math.round(renderData.durationInFrames / renderData.fps),
  });
  if (!video.ok) return { ok: false, error: video.error, code: "db_error" };

  const job = await input.renderJobs.insertRenderJob({
    user_id: input.ownerId,
    project_id: input.projectId,
    video_id: video.id,
    provider: "remotion-lambda",
    status: "queued",
    resolution: "1080p",
    format: "mp4",
    server: packRenderRef(started.bucketName, started.renderId),
  });
  if (!job.ok) return { ok: false, error: job.error, code: "db_error" };

  return { ok: true, renderJobId: job.id };
}

export type CheckExportProgressInput = {
  renderJobs: RenderJobsClient;
  videos: VideosClient;
  render: RenderClient;
  storage: NarrationStorageClient;
  /** Fetches the render backend's output file into memory — injected so tests never make a real HTTP call. */
  downloadFile: (url: string) => Promise<{ buffer: Buffer; contentType: string }>;
  ownerId: string;
  renderJobId: string;
};

export type CheckExportProgressResult =
  | { ok: true; status: "queued" | "processing"; progress: number }
  | { ok: true; status: "succeeded"; downloadUrl: string }
  | { ok: true; status: "failed"; error: string }
  | { ok: false; error: string };

/**
 * Polled by the client UI (ResultView's ExportPanel) every few seconds —
 * the "smallest viable" progress mechanism for a launch that has no
 * background worker/queue infrastructure. Every failure path (render
 * backend error, download failure, Storage upload failure) marks both rows
 * "failed" with a useful error rather than leaving them stuck "processing"
 * forever or, worse, marking "succeeded" before the MP4 actually exists in
 * Storage (Requirement 12).
 */
export async function checkExportProgress(input: CheckExportProgressInput): Promise<CheckExportProgressResult> {
  const job = await input.renderJobs.selectRenderJob(input.renderJobId, input.ownerId);
  if (!job) return { ok: false, error: "Render job not found." };

  if (job.status === "succeeded") {
    if (!job.video_id) return { ok: false, error: "Render job is missing its video reference." };
    const video = await input.videos.selectVideo(job.video_id, input.ownerId);
    if (!video?.storage_path) return { ok: false, error: "Rendered video record is missing its storage path." };
    const signed = await signFinalVideoPath(input.storage, video.storage_path);
    if (!signed.ok) return { ok: false, error: signed.error };
    return { ok: true, status: "succeeded", downloadUrl: signed.signedUrl };
  }

  if (job.status === "failed") return { ok: true, status: "failed", error: job.error_message ?? "The render failed." };

  // Everything below talks to the render backend, Supabase Storage, and the
  // DB again — a transient network hiccup in any of those must never escape
  // as an uncaught exception. `checkExportProgressAction` has no try/catch
  // of its own, so an uncaught throw here would skip failJob() entirely and
  // leave the row stuck "processing" forever, which permanently blocks
  // retries too (startExport's hasActiveJobForProject guard treats
  // "processing" as still active). Catching it and routing through the same
  // failJob() path every other failure here already uses keeps that
  // guarantee intact and the export retryable.
  try {
    const ref = unpackRenderRef(job.server);
    if (!ref) return { ok: false, error: "Render job is missing its render reference." };

    const progress = await input.render.getRenderProgress(ref.renderId, ref.bucketName);

    if (!progress.ok) {
      await failJob(input, job, progress.error);
      return { ok: true, status: "failed", error: progress.error };
    }

    if (!progress.done) {
      await input.renderJobs.updateRenderJob(job.id, input.ownerId, { status: "processing", progress: progress.progress });
      return { ok: true, status: "processing", progress: progress.progress };
    }

    let downloaded: { buffer: Buffer; contentType: string };
    try {
      downloaded = await input.downloadFile(progress.downloadUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download the rendered video.";
      await failJob(input, job, message);
      return { ok: true, status: "failed", error: message };
    }

    if (!job.project_id) return { ok: false, error: "Render job is missing its project reference." };
    const path = buildFinalVideoPath(input.ownerId, job.project_id, job.id);
    const uploaded = await uploadFinalVideo(input.storage, path, downloaded.buffer, downloaded.contentType);
    if (!uploaded.ok) {
      await failJob(input, job, uploaded.error);
      return { ok: true, status: "failed", error: uploaded.error };
    }

    if (job.video_id) {
      await input.videos.updateVideo(job.video_id, input.ownerId, {
        status: "ready",
        storage_path: uploaded.path,
        file_size_mb: Number((downloaded.buffer.length / (1024 * 1024)).toFixed(2)),
      });
    }
    await input.renderJobs.updateRenderJob(job.id, input.ownerId, {
      status: "succeeded",
      progress: 1,
      completed_at: new Date().toISOString(),
    });

    return { ok: true, status: "succeeded", downloadUrl: uploaded.signedUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check render progress.";
    await failJob(input, job, message);
    return { ok: true, status: "failed", error: message };
  }
}

async function failJob(input: CheckExportProgressInput, job: RenderJobRow, message: string): Promise<void> {
  await input.renderJobs.updateRenderJob(job.id, input.ownerId, {
    status: "failed",
    error_message: message,
    completed_at: new Date().toISOString(),
  });
  if (job.video_id) await input.videos.updateVideo(job.video_id, input.ownerId, { status: "failed" });
}

/** The minimal `videos` lookup findLatestCompletedExport needs — distinct from VideosClient above (which is keyed by video id, not project id). */
export type LatestExportVideosClient = {
  /** The current owner's most recent `status = 'ready'` video for this project, or null if none exists. Must be scoped to `ownerId` (defense-in-depth alongside RLS — "videos: owner can read own", auth.uid() = owner_id). */
  selectLatestReadyVideoForProject(projectId: string, ownerId: string): Promise<{ id: string; storage_path: string | null } | null>;
};

/** The minimal `render_jobs` lookup findLatestCompletedExport needs — distinct from RenderJobsClient above (keyed by video id, not render job id). */
export type LatestExportRenderJobsClient = {
  /** The current owner's most recent `status = 'succeeded'` render job for this video, or null if none exists (should not normally happen for a "ready" video, but a video/job pair is never assumed to exist). Must be scoped to `ownerId`. */
  selectSucceededRenderJobForVideo(videoId: string, ownerId: string): Promise<{ id: string } | null>;
};

export type FindLatestCompletedExportInput = {
  videos: LatestExportVideosClient;
  renderJobs: LatestExportRenderJobsClient;
  storage: NarrationStorageClient;
  ownerId: string;
  projectId: string;
};

export type FindLatestCompletedExportResult =
  | { ok: true; found: true; downloadUrl: string; renderJobId: string }
  | { ok: true; found: false }
  | { ok: false; error: string };

/**
 * Looks up whether this project already has a real, completed export —
 * used on reopening/reloading a project (ExportPanel.tsx) so a user who
 * already exported never sees "start a new export" and is never tempted
 * into paying for a duplicate Remotion Lambda render of something that
 * already exists. Purely a lookup: never inserts/updates a video or
 * render_jobs row, never calls a render backend, never calls any paid API
 * — the two SELECTs plus a Storage signed-URL reissue (the exact same
 * signFinalVideoPath checkExportProgress already uses for its "succeeded"
 * branch above) are the only work done here.
 *
 * `found: false` (not an error) covers both "no export was ever started"
 * and "a video exists but its render job can't be found" — either way,
 * ExportPanel's correct response is the same: show the normal start-export
 * button, never block on it.
 */
export async function findLatestCompletedExport(input: FindLatestCompletedExportInput): Promise<FindLatestCompletedExportResult> {
  const video = await input.videos.selectLatestReadyVideoForProject(input.projectId, input.ownerId);
  if (!video || !video.storage_path) return { ok: true, found: false };

  const renderJob = await input.renderJobs.selectSucceededRenderJobForVideo(video.id, input.ownerId);
  if (!renderJob) return { ok: true, found: false };

  const signed = await signFinalVideoPath(input.storage, video.storage_path);
  if (!signed.ok) return { ok: false, error: signed.error };

  return { ok: true, found: true, downloadUrl: signed.signedUrl, renderJobId: renderJob.id };
}
