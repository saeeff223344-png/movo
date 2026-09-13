import { videoPlanSchema, type VideoPlan } from "@/lib/ai/video-plan-schema";
import {
  toPersistedNarration,
  deriveNarrationStatus,
  type PlanNarrationResult,
  type PersistedSceneNarration,
  type SceneNarrationAudio,
} from "@/lib/audio/plan-narration";
import { signNarrationAudioPath, type NarrationStorageClient } from "@/lib/audio/narration-storage";
import { signVisualAssetPath, type VisualAssetStorageClient } from "@/lib/visuals/visual-asset-storage";
import type { ResolvedSceneVisual } from "@/lib/visuals/types";
import { signVideoAssetPath, type VideoAssetStorageClient } from "@/lib/video-generation/video-asset-storage";
import type { ResolvedSceneVideo } from "@/lib/video-generation/types";
import type { Json } from "@/lib/supabase/database.types";
import type { EntitlementClient } from "@/lib/supabase/usage";

/**
 * The actual (testable, "server-only"-free) persistence logic behind
 * lib/actions/project-actions.ts's thin "use server" wrappers — same split
 * as lib/audio/plan-narration.ts vs lib/actions/narration-actions.ts.
 * `ProjectsClient` is a small repository-shaped interface (not a literal
 * mirror of Supabase's fluent query builder — that's harder to fake
 * accurately) that the real action file adapts the authenticated
 * `createClient()` Supabase client onto; tests pass an in-memory fake
 * instead, so nothing here ever touches a real network call or "server-only".
 */

export type NewProjectRow = {
  owner_id: string;
  prompt: string;
  language: "ar" | "en";
  style: string;
  platform: string;
  aspect_ratio: "9:16" | "16:9" | "1:1";
  duration_seconds: number;
  status: "generating";
  scene_plan: Json;
};

export type ProjectRow = {
  id: string;
  prompt: string;
  scene_plan: Json | null;
  narration: Json | null;
};

export type InsertProjectResult = { ok: true; id: string } | { ok: false; error: string };
export type UpdateProjectResult = { ok: true } | { ok: false; error: string };

export type ProjectUpdatePatch = Partial<Pick<ProjectRow, "scene_plan" | "narration">> & { status?: "ready" };

/**
 * Everything project-persistence.ts needs from Supabase for the `projects`
 * table. Every method is already scoped to `ownerId` explicitly (defense in
 * depth alongside the table's own RLS policy — 004_projects_video_jobs.sql's
 * "owner can manage own", `auth.uid() = owner_id`) — `ownerId` here is
 * always the caller's server-verified id, never client input.
 */
export type ProjectsClient = {
  insertProject(row: NewProjectRow): Promise<InsertProjectResult>;
  updateProject(projectId: string, ownerId: string, patch: ProjectUpdatePatch): Promise<UpdateProjectResult>;
  /** Returns null both when the row doesn't exist AND when it exists but belongs to a different owner — the two are indistinguishable to a caller by design. */
  selectProject(projectId: string, ownerId: string): Promise<ProjectRow | null>;
};

export type SaveProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string; code?: "entitlement_blocked" | "db_error" };
export type SaveResult = { ok: true } | { ok: false; error: string };
export type LoadProjectResult =
  | {
      ok: true;
      projectId: string;
      prompt: string;
      plan: VideoPlan;
      narration: PlanNarrationResult;
      visuals: Record<string, ResolvedSceneVisual>;
      videos: Record<string, ResolvedSceneVideo>;
    }
  | { ok: false; code: "not_found" | "invalid" };

/** One durably-persisted automatic visual asset row (public.project_assets, kind='auto-generated' — see supabase/migrations/018_project_assets_auto_generated.sql). Never the signed URL — that's re-issued on load, exactly like narration audio. */
export type PersistedVisualAssetRow = {
  scene_id: string | null;
  storage_path: string;
  provider: string | null;
  prompt: string | null;
  estimated_usd: number | null;
};

export type NewVisualAssetRow = {
  project_id: string;
  owner_id: string;
  kind: "auto-generated";
  scene_id: string;
  storage_path: string;
  mime_type: string;
  metadata: { prompt: string; provider: string; estimatedUsd: number | null };
};

/** One durably-persisted AI-generated scene video row (public.project_assets, kind='ai-video' — see supabase/migrations/019_project_assets_ai_video.sql). Never the signed URL — that's re-issued on load, exactly like narration audio and auto-generated visuals. */
export type PersistedVideoAssetRow = {
  scene_id: string | null;
  storage_path: string;
  provider: string | null;
  model: string | null;
  provider_task_id: string | null;
  duration_seconds: number | null;
  motion_prompt: string | null;
  provider_cost: number | null;
};

export type NewVideoAssetRow = {
  project_id: string;
  owner_id: string;
  kind: "ai-video";
  scene_id: string;
  storage_path: string;
  mime_type: string;
  metadata: { provider: string; model: string; providerTaskId: string; durationSeconds: number; motionPrompt: string; providerCost: number | null };
};

/**
 * Everything project-persistence.ts needs from Supabase for the
 * `project_assets` table's auto-generated-visual AND AI-video rows — a
 * narrower, purpose-built interface rather than a general CRUD client,
 * exactly like ProjectsClient above. Defaults to a no-op implementation in
 * loadProject's signature below so every existing call site (which never
 * needs to know about visuals/videos) keeps working unchanged.
 */
export type ProjectAssetsClient = {
  insertVisualAsset(row: NewVisualAssetRow): Promise<{ ok: true } | { ok: false; error: string }>;
  listAutoGeneratedVisuals(projectId: string, ownerId: string): Promise<PersistedVisualAssetRow[]>;
  insertVideoAsset(row: NewVideoAssetRow): Promise<{ ok: true } | { ok: false; error: string }>;
  listAiVideos(projectId: string, ownerId: string): Promise<PersistedVideoAssetRow[]>;
};

const NO_OP_PROJECT_ASSETS: ProjectAssetsClient = {
  async insertVisualAsset() {
    return { ok: false, error: "No ProjectAssetsClient configured." };
  },
  async listAutoGeneratedVisuals() {
    return [];
  },
  async insertVideoAsset() {
    return { ok: false, error: "No ProjectAssetsClient configured." };
  },
  async listAiVideos() {
    return [];
  },
};

/**
 * Saves a project row immediately after a successful VideoPlan generation —
 * before narration synthesis even starts, so the plan is durable as early
 * as possible. Its returned id doubles as the narration Storage
 * `generationId` (lib/audio/narration-storage.ts) — no separate id is
 * minted.
 *
 * This is also the authoritative entitlement enforcement + trial-consumption
 * point (locked business rule: exactly one free trial video per account,
 * then an active subscription is required). lib/actions/video-plan-actions.ts
 * already does a read-only pre-check before this ever runs (so a blocked
 * user's request never reaches OpenAI), but the real, final decision — and
 * the ONLY place the trial is ever consumed — is here, right after the
 * project a user is actually about to get real value from has been saved.
 * This also protects against a direct server-action bypass that skips the
 * planner action entirely: no project can be created without passing this
 * gate, regardless of caller.
 *
 * The trial is consumed only when this generation wasn't already covered
 * by an active subscription (a subscribed user never spends their trial —
 * Requirement 6). A trial-consumption failure (e.g. a transient RPC error)
 * is logged but never fails the whole save: the user's project is real and
 * already persisted at that point, and losing it over a secondary,
 * best-effort bookkeeping write would be strictly worse than the rare edge
 * case of one extra free generation.
 */
export async function saveGeneratedProject(
  projects: ProjectsClient,
  entitlement: EntitlementClient,
  ownerId: string,
  prompt: string,
  plan: VideoPlan,
): Promise<SaveProjectResult> {
  const status = await entitlement.getStatus(ownerId);
  if (!status.canGenerate) {
    return {
      ok: false,
      error: "Your free trial has been used. An active subscription is required to generate another video.",
      code: "entitlement_blocked",
    };
  }

  const result = await projects.insertProject({
    owner_id: ownerId,
    prompt,
    language: plan.language,
    style: plan.visualStyle,
    platform: plan.platform,
    aspect_ratio: plan.aspectRatio,
    duration_seconds: Math.round(plan.durationSeconds),
    status: "generating",
    scene_plan: plan as unknown as Json,
  });

  if (!result.ok) return { ok: false, error: result.error, code: "db_error" };

  if (!status.activeSubscription) {
    const consumed = await entitlement.consumeTrial(ownerId, result.id);
    if (!consumed.ok) console.error("[project-persistence] consumeTrial failed for project", result.id, consumed.error);
  }

  return { ok: true, projectId: result.id };
}

/** Persists narration metadata once synthesis (initial or a retry) concludes — storage paths and cost/provider metadata only, NEVER the signed `audioUrl` (toPersistedNarration enforces this). Also re-saves `scene_plan` since a retry may follow a scene text edit. Marks the project "ready" regardless of the narration outcome (ok/partial/failed) — the project itself is always viewable once a plan exists. */
export async function saveProjectNarration(
  projects: ProjectsClient,
  ownerId: string,
  projectId: string,
  plan: VideoPlan,
  narration: PlanNarrationResult,
): Promise<SaveResult> {
  return projects.updateProject(projectId, ownerId, {
    scene_plan: plan as unknown as Json,
    narration: toPersistedNarration(narration.sceneAudio) as unknown as Json,
    status: "ready",
  });
}

/** Persists a scene-text/audio-preference edit made in the editor — no narration re-synthesis, just the updated VideoPlan JSON. */
export async function saveProjectPlan(projects: ProjectsClient, ownerId: string, projectId: string, plan: VideoPlan): Promise<SaveResult> {
  return projects.updateProject(projectId, ownerId, { scene_plan: plan as unknown as Json });
}

/**
 * Persists every scene's auto-generated visual (Automatic Visual Assets
 * phase, Requirement 13) as its own `project_assets` row — storage path,
 * provider, and prompt only, NEVER the signed `url` (which expires; a
 * fresh one is re-issued in loadProject below, exactly like narration
 * audio). A single failed insert is logged but never aborts the rest —
 * losing durability for one scene's visual is far better than losing an
 * already-generated VideoPlan over a secondary bookkeeping write.
 */
export async function saveProjectVisuals(
  projectAssets: ProjectAssetsClient,
  ownerId: string,
  projectId: string,
  visuals: Record<string, ResolvedSceneVisual>,
): Promise<void> {
  for (const visual of Object.values(visuals)) {
    if (visual.source !== "auto-generated" || !visual.storagePath) continue;
    const result = await projectAssets.insertVisualAsset({
      project_id: projectId,
      owner_id: ownerId,
      kind: "auto-generated",
      scene_id: visual.sceneId,
      storage_path: visual.storagePath,
      mime_type: "image/png",
      metadata: { prompt: visual.prompt ?? "", provider: visual.provider ?? "unknown", estimatedUsd: visual.estimatedUsd ?? null },
    });
    if (!result.ok) console.error("[project-persistence] saveProjectVisuals: failed to persist scene", visual.sceneId, result.error);
  }
}

/**
 * Persists every scene's AI-generated video (Dynamic AI Video Director +
 * Runway Integration phase, Requirement 9) as its own `project_assets`
 * row — storage path and provider/model/task/prompt/cost metadata only,
 * NEVER the signed `url` (which expires; a fresh one is re-issued in
 * loadProject below). A single failed insert is logged but never aborts
 * the rest — losing durability for one scene's video is far better than
 * losing an already-generated VideoPlan over a secondary bookkeeping
 * write, exactly like saveProjectVisuals.
 */
export async function saveProjectVideos(
  projectAssets: ProjectAssetsClient,
  ownerId: string,
  projectId: string,
  videos: Record<string, ResolvedSceneVideo>,
): Promise<void> {
  for (const video of Object.values(videos)) {
    if (video.source !== "ai-generated" || !video.storagePath) continue;
    const result = await projectAssets.insertVideoAsset({
      project_id: projectId,
      owner_id: ownerId,
      kind: "ai-video",
      scene_id: video.sceneId,
      storage_path: video.storagePath,
      mime_type: "video/mp4",
      metadata: {
        provider: video.provider ?? "unknown",
        model: video.model ?? "unknown",
        providerTaskId: video.providerTaskId ?? "",
        durationSeconds: video.durationSeconds ?? 0,
        motionPrompt: video.motionPrompt ?? "",
        providerCost: video.providerCost ?? null,
      },
    });
    if (!result.ok) console.error("[project-persistence] saveProjectVideos: failed to persist scene", video.sceneId, result.error);
  }
}

/**
 * Reloads a saved project: validates the stored VideoPlan against the same
 * schema a fresh generation must satisfy (defense against a hand-edited or
 * legacy row), then reissues a fresh signed URL for every scene's stored
 * `storagePath` — a signed URL is never itself persisted, since it can
 * expire; the durable path is. Returns "not_found" uniformly for a missing
 * row AND for another user's row (ProjectsClient.selectProject already
 * collapses those), never distinguishing the two to a caller.
 */
export async function loadProject(
  projects: ProjectsClient,
  storage: NarrationStorageClient & VisualAssetStorageClient & VideoAssetStorageClient,
  ownerId: string,
  projectId: string,
  projectAssets: ProjectAssetsClient = NO_OP_PROJECT_ASSETS,
): Promise<LoadProjectResult> {
  const row = await projects.selectProject(projectId, ownerId);
  if (!row || !row.scene_plan) return { ok: false, code: "not_found" };

  // Backfill defaults for schema fields added after this row was first
  // persisted — `palette` (Visual Quality Upgrade phase) and `visualTheme`
  // (Automatic Visual Assets phase) are `.nullable()` rather than
  // `.optional()` in videoPlanSchema (OpenAI Structured Outputs strict mode
  // requires every property in a freshly-generated plan), which means a
  // genuinely ABSENT key — every scene_plan saved before that field existed
  // — fails validation rather than defaulting. Spreading defaults in first,
  // so any key the stored row actually has (including an explicit
  // `null`/a real value from a newer row) still overrides them, keeps every
  // already-persisted project loadable exactly as before. Each scene's own
  // `visual` field gets the same treatment below, since it's per-scene
  // rather than per-plan.
  const normalizedScenePlan =
    typeof row.scene_plan === "object" && row.scene_plan !== null && !Array.isArray(row.scene_plan)
      ? {
          palette: null,
          visualTheme: null,
          ...row.scene_plan,
          scenes: Array.isArray((row.scene_plan as { scenes?: unknown }).scenes)
            ? (row.scene_plan as { scenes: unknown[] }).scenes.map((scene) =>
                typeof scene === "object" && scene !== null && !Array.isArray(scene) ? { visual: null, ...scene } : scene,
              )
            : (row.scene_plan as { scenes?: unknown }).scenes,
        }
      : row.scene_plan;
  const validated = videoPlanSchema.safeParse(normalizedScenePlan);
  if (!validated.success) {
    console.error("[project-persistence] loadProject: stored scene_plan failed schema validation:", validated.error.issues);
    return { ok: false, code: "invalid" };
  }
  const plan = validated.data;

  const persistedNarration = (row.narration ?? {}) as Record<string, PersistedSceneNarration>;
  const sceneAudio: Record<string, SceneNarrationAudio> = {};
  const narrationAudioUrls: Record<string, string> = {};
  let characters = 0;
  let estimatedUsd = 0;
  let hasKnownCost = false;

  for (const [sceneId, meta] of Object.entries(persistedNarration)) {
    characters += meta.characters;
    if (meta.estimatedUsd !== null) {
      estimatedUsd += meta.estimatedUsd;
      hasKnownCost = true;
    }

    if (!meta.storagePath) {
      sceneAudio[sceneId] = { ...meta, audioUrl: null };
      continue;
    }

    const signed = await signNarrationAudioPath(storage, meta.storagePath);
    if (signed.ok) {
      sceneAudio[sceneId] = { ...meta, audioUrl: signed.signedUrl };
      narrationAudioUrls[sceneId] = signed.signedUrl;
    } else {
      console.error("[project-persistence] failed to re-sign narration audio for scene", sceneId, signed.error);
      sceneAudio[sceneId] = { ...meta, audioUrl: null };
    }
  }

  const status = deriveNarrationStatus(
    Object.fromEntries(Object.entries(sceneAudio).map(([id, a]) => [id, a.audioUrl])),
    Object.keys(persistedNarration).length,
  );

  // Auto-generated visuals (Automatic Visual Assets phase) — re-signed from
  // their durable storage_path exactly like narration audio above. A row
  // this can't re-sign (Storage outage, deleted object) is simply dropped
  // rather than failing the whole load: the renderer already falls back
  // gracefully to no image for a scene with none (Requirement 11).
  const visualRows = await projectAssets.listAutoGeneratedVisuals(projectId, ownerId);
  const visuals: Record<string, ResolvedSceneVisual> = {};
  for (const row of visualRows) {
    if (!row.scene_id) continue;
    const signed = await signVisualAssetPath(storage, row.storage_path);
    if (!signed.ok) {
      console.error("[project-persistence] failed to re-sign visual asset for scene", row.scene_id, signed.error);
      continue;
    }
    visuals[row.scene_id] = {
      sceneId: row.scene_id,
      url: signed.signedUrl,
      source: "auto-generated",
      storagePath: row.storage_path,
      prompt: row.prompt ?? undefined,
      provider: row.provider ?? undefined,
      estimatedUsd: row.estimated_usd,
    };
  }

  // AI-generated videos (Dynamic AI Video Director + Runway Integration
  // phase) — re-signed from their durable storage_path, same fallback
  // discipline as visuals above: a row that can't be re-signed is simply
  // dropped so the scene falls back to its still image, never failing the
  // whole load.
  const videoRows = await projectAssets.listAiVideos(projectId, ownerId);
  const videos: Record<string, ResolvedSceneVideo> = {};
  for (const row of videoRows) {
    if (!row.scene_id) continue;
    const signed = await signVideoAssetPath(storage, row.storage_path);
    if (!signed.ok) {
      console.error("[project-persistence] failed to re-sign AI video for scene", row.scene_id, signed.error);
      continue;
    }
    videos[row.scene_id] = {
      sceneId: row.scene_id,
      url: signed.signedUrl,
      source: "ai-generated",
      storagePath: row.storage_path,
      provider: row.provider ?? undefined,
      model: row.model ?? undefined,
      providerTaskId: row.provider_task_id ?? undefined,
      durationSeconds: row.duration_seconds ?? undefined,
      motionPrompt: row.motion_prompt ?? undefined,
      providerCost: row.provider_cost,
    };
  }

  return {
    ok: true,
    projectId: row.id,
    prompt: row.prompt,
    plan,
    narration: { narrationAudioUrls, sceneAudio, status, cost: { characters, estimatedUsd: hasKnownCost ? estimatedUsd : null } },
    visuals,
    videos,
  };
}
