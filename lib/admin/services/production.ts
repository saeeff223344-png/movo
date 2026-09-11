import "server-only";
import type { AdminProject, AdminVideo, AIJob, RenderJob, UsageSummary } from "@/lib/admin/types/production";
import { createClient } from "@/lib/supabase/server";

async function nameMap() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name");
  return new Map((data ?? []).map((p) => [p.id, p.full_name ?? ""]));
}

// ---- Projects ----
async function mapProjects(ownerId?: string): Promise<AdminProject[]> {
  const supabase = await createClient();
  let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (ownerId) query = query.eq("owner_id", ownerId);
  const [{ data: projects }, { data: assets }, { data: videos }, names] = await Promise.all([
    query,
    supabase.from("project_assets").select("project_id"),
    supabase.from("videos").select("id, project_id"),
    nameMap(),
  ]);

  const assetCountByProject = new Map<string, number>();
  for (const a of assets ?? []) {
    assetCountByProject.set(a.project_id, (assetCountByProject.get(a.project_id) ?? 0) + 1);
  }
  const videoIdByProject = new Map((videos ?? []).map((v) => [v.project_id, v.id]));

  return (projects ?? []).map((p) => ({
    id: p.id,
    ownerId: p.owner_id,
    ownerName: names.get(p.owner_id) ?? "",
    prompt: p.prompt,
    language: (p.language ?? "ar") as AdminProject["language"],
    businessName: p.business_name ?? "",
    offer: p.offer,
    style: p.style as AdminProject["style"],
    platform: p.platform ?? "",
    aspectRatio: (p.aspect_ratio ?? "9:16") as AdminProject["aspectRatio"],
    duration: p.duration_seconds ?? 0,
    assetsCount: assetCountByProject.get(p.id) ?? 0,
    status: p.status as AdminProject["status"],
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    videoId: videoIdByProject.get(p.id) ?? null,
  } satisfies AdminProject));
}

export async function getProjects(): Promise<AdminProject[]> {
  return mapProjects();
}
export async function getProject(id: string): Promise<AdminProject | undefined> {
  const all = await mapProjects();
  return all.find((p) => p.id === id);
}
export async function getProjectsByUser(userId: string): Promise<AdminProject[]> {
  return mapProjects(userId);
}

// ---- Videos ----
async function mapVideos(ownerId?: string): Promise<AdminVideo[]> {
  const supabase = await createClient();
  let query = supabase.from("videos").select("*").order("created_at", { ascending: false });
  if (ownerId) query = query.eq("owner_id", ownerId);
  const [{ data: videos }, { data: renders }, names] = await Promise.all([
    query,
    supabase.from("render_jobs").select("id, video_id"),
    nameMap(),
  ]);

  const renderJobIdByVideo = new Map(
    (renders ?? []).filter((r) => r.video_id).map((r) => [r.video_id as string, r.id]),
  );

  return (videos ?? []).map((v) => ({
    id: v.id,
    projectId: v.project_id,
    ownerId: v.owner_id,
    ownerName: names.get(v.owner_id) ?? "",
    durationSeconds: v.duration_seconds ?? 0,
    aspectRatio: (v.aspect_ratio ?? "9:16") as AdminVideo["aspectRatio"],
    resolution: v.resolution as AdminVideo["resolution"],
    format: "mp4",
    fileSizeMb: v.file_size_mb ? Number(v.file_size_mb) : 0,
    createdAt: v.created_at,
    status: v.status as AdminVideo["status"],
    renderJobId: renderJobIdByVideo.get(v.id) ?? null,
  } satisfies AdminVideo));
}

export async function getVideos(): Promise<AdminVideo[]> {
  return mapVideos();
}
export async function getVideo(id: string): Promise<AdminVideo | undefined> {
  const all = await mapVideos();
  return all.find((v) => v.id === id);
}
export async function getVideosByUser(userId: string): Promise<AdminVideo[]> {
  return mapVideos(userId);
}

// ---- AI jobs ----
async function mapAIJobs(userId?: string): Promise<AIJob[]> {
  const supabase = await createClient();
  let query = supabase.from("ai_jobs").select("*").order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const [{ data: jobs }, names] = await Promise.all([query, nameMap()]);

  return (jobs ?? []).map((j) => ({
    id: j.id,
    type: j.operation as AIJob["type"],
    provider: j.provider ?? "",
    model: j.model ?? "",
    userId: j.user_id,
    userName: names.get(j.user_id) ?? "",
    projectId: j.project_id,
    status: j.status as AIJob["status"],
    inputSummary: j.input_summary ?? "",
    tokensUsed: j.tokens_used,
    generatedUnits: j.generated_units,
    durationMs: j.completed_at ? new Date(j.completed_at).getTime() - new Date(j.created_at).getTime() : 0,
    estimatedCostUsd: j.cost_usd ? Number(j.cost_usd) : 0,
    estimatedCostIqd: j.cost_iqd ?? 0,
    errorMessage: j.error_message,
    createdAt: j.created_at,
  } satisfies AIJob));
}

export async function getAIJobs(): Promise<AIJob[]> {
  return mapAIJobs();
}
export async function getAIJob(id: string): Promise<AIJob | undefined> {
  const all = await mapAIJobs();
  return all.find((j) => j.id === id);
}
export async function getAIJobsByUser(userId: string): Promise<AIJob[]> {
  return mapAIJobs(userId);
}

// ---- Render jobs ----
async function mapRenderJobs(userId?: string): Promise<RenderJob[]> {
  const supabase = await createClient();
  let query = supabase.from("render_jobs").select("*").order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const [{ data: jobs }, { data: videos }, names] = await Promise.all([
    query,
    supabase.from("videos").select("id, duration_seconds"),
    nameMap(),
  ]);

  const durationByVideo = new Map((videos ?? []).map((v) => [v.id, v.duration_seconds ?? 0]));

  return (jobs ?? []).map((r) => ({
    id: r.id,
    projectId: r.project_id ?? "",
    videoId: r.video_id,
    userId: r.user_id,
    userName: names.get(r.user_id) ?? "",
    resolution: (r.resolution ?? "1080p") as RenderJob["resolution"],
    format: "mp4",
    durationSeconds: r.video_id ? (durationByVideo.get(r.video_id) ?? 0) : 0,
    renderDurationMs: r.render_seconds ? Math.round(Number(r.render_seconds) * 1000) : null,
    provider: r.provider ?? "",
    server: r.server,
    costIqd: r.estimated_cost_iqd ?? 0,
    status: r.status as RenderJob["status"],
    errorMessage: r.error_message,
    createdAt: r.created_at,
  } satisfies RenderJob));
}

export async function getRenderJobs(): Promise<RenderJob[]> {
  return mapRenderJobs();
}
export async function getRenderJob(id: string): Promise<RenderJob | undefined> {
  const all = await mapRenderJobs();
  return all.find((r) => r.id === id);
}
export async function getRenderJobsByUser(userId: string): Promise<RenderJob[]> {
  return mapRenderJobs(userId);
}

// ---- Usage (aggregated from the append-only usage_events ledger — see
// docs/database-schema.md "Known gaps": empty/zero until AI generation
// actually writes events, which is correct, not mock). ----
export async function getUsage(): Promise<UsageSummary> {
  const supabase = await createClient();
  const [{ data: events }, { data: profiles }, { data: subs }, { data: plans }] = await Promise.all([
    supabase.from("usage_events").select("*"),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("subscriptions").select("user_id, plan_id, status"),
    supabase.from("subscription_plans").select("id, name_ar"),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));
  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name_ar]));
  const activePlanByUser = new Map(
    (subs ?? []).filter((s) => s.status === "active").map((s) => [s.user_id, planNameById.get(s.plan_id) ?? null]),
  );

  const totals = {
    videos: 0,
    aiRequests: 0,
    textTokens: 0,
    imageGenerations: 0,
    aiVideoSeconds: 0,
    voiceSeconds: 0,
    revisions: 0,
    renderMinutes: 0,
    storageMb: 0,
    bandwidthMb: 0,
  };
  const byDateMap = new Map<string, { videos: number; aiRequests: number; renderMinutes: number }>();
  const perUser = new Map<string, { videos: number; aiRequests: number; storageMb: number }>();

  for (const e of events ?? []) {
    const day = e.created_at.slice(0, 10);
    const bucket = byDateMap.get(day) ?? { videos: 0, aiRequests: 0, renderMinutes: 0 };
    const userBucket = perUser.get(e.user_id) ?? { videos: 0, aiRequests: 0, storageMb: 0 };

    switch (e.event_type) {
      case "video_generation":
        totals.videos += e.quantity;
        bucket.videos += e.quantity;
        userBucket.videos += e.quantity;
        break;
      case "text_tokens_input":
      case "text_tokens_output":
        totals.textTokens += e.quantity;
        totals.aiRequests += 1;
        bucket.aiRequests += 1;
        userBucket.aiRequests += 1;
        break;
      case "image_generation":
        totals.imageGenerations += e.quantity;
        break;
      case "video_ai_seconds":
        totals.aiVideoSeconds += e.quantity;
        break;
      case "voice_seconds":
        totals.voiceSeconds += e.quantity;
        break;
      case "render_seconds":
        totals.renderMinutes += e.quantity / 60;
        bucket.renderMinutes += e.quantity / 60;
        break;
      case "storage_bytes":
        totals.storageMb += e.quantity / (1024 * 1024);
        userBucket.storageMb += e.quantity / (1024 * 1024);
        break;
    }
    byDateMap.set(day, bucket);
    perUser.set(e.user_id, userBucket);
  }

  const topConsumers = Array.from(perUser.entries())
    .map(([userId, v]) => ({
      userId,
      userName: nameById.get(userId) ?? "",
      planName: activePlanByUser.get(userId) ?? null,
      videos: v.videos,
      aiRequests: v.aiRequests,
      storageMb: Math.round(v.storageMb),
    }))
    .sort((a, b) => b.videos - a.videos)
    .slice(0, 10);

  return {
    totals,
    byDate: Array.from(byDateMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topConsumers,
  };
}

export async function getProjectRelated(projectId: string) {
  const supabase = await createClient();
  const [{ data: aiJobs }, { data: renderJobs }, { data: video }] = await Promise.all([
    supabase.from("ai_jobs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("render_jobs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("videos").select("*").eq("project_id", projectId).maybeSingle(),
  ]);

  const names = await nameMap();

  return {
    aiJobs: (aiJobs ?? []).map((j) => ({
      id: j.id,
      type: j.operation as AIJob["type"],
      provider: j.provider ?? "",
      model: j.model ?? "",
      userId: j.user_id,
      userName: names.get(j.user_id) ?? "",
      projectId: j.project_id,
      status: j.status as AIJob["status"],
      inputSummary: j.input_summary ?? "",
      tokensUsed: j.tokens_used,
      generatedUnits: j.generated_units,
      durationMs: j.completed_at ? new Date(j.completed_at).getTime() - new Date(j.created_at).getTime() : 0,
      estimatedCostUsd: j.cost_usd ? Number(j.cost_usd) : 0,
      estimatedCostIqd: j.cost_iqd ?? 0,
      errorMessage: j.error_message,
      createdAt: j.created_at,
    } satisfies AIJob)),
    renderJobs: (renderJobs ?? []).map((r) => ({
      id: r.id,
      projectId: r.project_id ?? "",
      videoId: r.video_id,
      userId: r.user_id,
      userName: names.get(r.user_id) ?? "",
      resolution: (r.resolution ?? "1080p") as RenderJob["resolution"],
      format: "mp4",
      durationSeconds: video?.duration_seconds ?? 0,
      renderDurationMs: r.render_seconds ? Math.round(Number(r.render_seconds) * 1000) : null,
      provider: r.provider ?? "",
      server: r.server,
      costIqd: r.estimated_cost_iqd ?? 0,
      status: r.status as RenderJob["status"],
      errorMessage: r.error_message,
      createdAt: r.created_at,
    } satisfies RenderJob)),
    video: video
      ? ({
          id: video.id,
          projectId: video.project_id,
          ownerId: video.owner_id,
          ownerName: names.get(video.owner_id) ?? "",
          durationSeconds: video.duration_seconds ?? 0,
          aspectRatio: (video.aspect_ratio ?? "9:16") as AdminVideo["aspectRatio"],
          resolution: video.resolution as AdminVideo["resolution"],
          format: "mp4",
          fileSizeMb: video.file_size_mb ? Number(video.file_size_mb) : 0,
          createdAt: video.created_at,
          status: video.status as AdminVideo["status"],
          renderJobId: (renderJobs ?? []).find((r) => r.video_id === video.id)?.id ?? null,
        } satisfies AdminVideo)
      : null,
  };
}
