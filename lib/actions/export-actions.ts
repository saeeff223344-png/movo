"use server";

import { requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { projectsClientForCurrentUser, projectAssetsClientForCurrentUser } from "@/lib/actions/project-actions";
import { RemotionLambdaRenderClient } from "@/lib/render/remotion-lambda-client";
import {
  startExport,
  checkExportProgress,
  findLatestCompletedExport,
  type VideosClient,
  type RenderJobsClient,
  type NewVideoRow,
  type VideoRow,
  type NewRenderJobRow,
  type RenderJobRow,
  type StartExportResult,
  type CheckExportProgressResult,
  type FindLatestCompletedExportResult,
} from "@/lib/render/export-orchestration";

export type { StartExportResult, CheckExportProgressResult, FindLatestCompletedExportResult } from "@/lib/render/export-orchestration";

/**
 * Thin "use server" wrappers around lib/render/export-orchestration.ts's
 * plain job-lifecycle logic — same split as every other action/persistence
 * pair in this codebase. Auth + the real, authenticated (RLS-scoped, never
 * service-role) Supabase client are added here; `projectId`/`renderJobId`
 * are plain parameters, never a security boundary by themselves — every
 * query is scoped to the caller's own `owner_id`/`user_id` both by RLS AND
 * explicitly in the adapters below.
 */

async function videosClientForCurrentUser(): Promise<VideosClient> {
  const supabase = await createClient();

  return {
    async insertVideo(row: NewVideoRow) {
      const { data, error } = await supabase.from("videos").insert(row).select("id").single();
      if (error || !data) return { ok: false, error: error?.message ?? "Failed to create the video record." };
      return { ok: true, id: data.id };
    },
    async updateVideo(id, ownerId, patch) {
      const { error } = await supabase.from("videos").update(patch).eq("id", id).eq("owner_id", ownerId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    async selectVideo(id, ownerId): Promise<VideoRow | null> {
      const { data } = await supabase
        .from("videos")
        .select("id, status, storage_path, duration_seconds, file_size_mb")
        .eq("id", id)
        .eq("owner_id", ownerId)
        .maybeSingle();
      return data;
    },
  };
}

async function renderJobsClientForCurrentUser(): Promise<RenderJobsClient> {
  const supabase = await createClient();

  return {
    async insertRenderJob(row: NewRenderJobRow) {
      const { data, error } = await supabase.from("render_jobs").insert(row).select("id").single();
      if (error || !data) return { ok: false, error: error?.message ?? "Failed to create the render job." };
      return { ok: true, id: data.id };
    },
    async updateRenderJob(id, ownerId, patch) {
      const { error } = await supabase.from("render_jobs").update(patch).eq("id", id).eq("user_id", ownerId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    async selectRenderJob(id, ownerId): Promise<RenderJobRow | null> {
      const { data } = await supabase
        .from("render_jobs")
        .select("id, project_id, video_id, status, progress, server, error_message")
        .eq("id", id)
        .eq("user_id", ownerId)
        .maybeSingle();
      return data;
    },
    async hasActiveJobForProject(ownerId, projectId) {
      const { count } = await supabase
        .from("render_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ownerId)
        .eq("project_id", projectId)
        .in("status", ["queued", "processing"]);
      return Boolean(count && count > 0);
    },
  };
}

/** Fetches the render backend's finished output into memory for re-upload to Supabase Storage — a plain `fetch`, the one real network call this action makes beyond the injected clients. */
async function downloadFile(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download the rendered video (${response.status} ${response.statusText}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "video/mp4";
  return { buffer, contentType };
}

export async function startExportAction(projectId: string): Promise<StartExportResult> {
  const user = await requireUser();
  const [projects, projectAssets, videos, renderJobs] = await Promise.all([
    projectsClientForCurrentUser(),
    projectAssetsClientForCurrentUser(),
    videosClientForCurrentUser(),
    renderJobsClientForCurrentUser(),
  ]);
  const supabase = await createClient();

  return startExport({
    projects,
    projectAssets,
    storage: supabase.storage,
    videos,
    renderJobs,
    render: new RemotionLambdaRenderClient(),
    ownerId: user.id,
    projectId,
  });
}

export async function checkExportProgressAction(renderJobId: string): Promise<CheckExportProgressResult> {
  const user = await requireUser();
  const [videos, renderJobs] = await Promise.all([videosClientForCurrentUser(), renderJobsClientForCurrentUser()]);
  const supabase = await createClient();

  return checkExportProgress({
    renderJobs,
    videos,
    render: new RemotionLambdaRenderClient(),
    storage: supabase.storage,
    downloadFile,
    ownerId: user.id,
    renderJobId,
  });
}

/**
 * Checked on mount/projectId-change by ExportPanel.tsx so reopening a
 * project that already has a completed export shows "تحميل الفيديو"
 * immediately instead of offering (and risking a duplicate, paid) new
 * export. Uses the same authenticated, RLS-scoped client every other real
 * query in this app uses (never service-role) — every query below is
 * explicitly scoped to the caller's own `owner_id`/`user_id`, matching
 * lib/render/export-orchestration.ts's LatestExportVideosClient/
 * LatestExportRenderJobsClient contracts. Never starts a Remotion Lambda
 * render and never calls RemotionLambdaRenderClient at all — this is a
 * pure lookup (two SELECTs + a Storage signed-URL reissue).
 */
export async function getLatestCompletedExportAction(projectId: string): Promise<FindLatestCompletedExportResult> {
  const user = await requireUser();
  const supabase = await createClient();

  return findLatestCompletedExport({
    videos: {
      async selectLatestReadyVideoForProject(pid, ownerId) {
        const { data } = await supabase
          .from("videos")
          .select("id, storage_path")
          .eq("project_id", pid)
          .eq("owner_id", ownerId)
          .eq("status", "ready")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data;
      },
    },
    renderJobs: {
      async selectSucceededRenderJobForVideo(videoId, ownerId) {
        const { data } = await supabase
          .from("render_jobs")
          .select("id")
          .eq("video_id", videoId)
          .eq("user_id", ownerId)
          .eq("status", "succeeded")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data;
      },
    },
    storage: supabase.storage,
    ownerId: user.id,
    projectId,
  });
}
