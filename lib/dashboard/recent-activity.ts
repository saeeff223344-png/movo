import type { AspectRatio, ProjectStatus } from "@/lib/types/video";

/**
 * Replaces lib/data/projects.ts's `mockProjects` — a hardcoded, permanently
 * empty array that made the dashboard show "لا توجد مشاريع بعد" /
 * "لا توجد فيديوهات جاهزة بعد" for every user regardless of what Supabase
 * actually held (see the read-only investigation that found this). This
 * file stays free of any real Supabase client or "server-only" import — the
 * real, authenticated wiring lives in lib/supabase/dashboard.ts — purely so
 * the query-shaping and row-mapping logic here is fully unit-testable with
 * hand-written fakes, exactly like lib/actions/project-persistence.ts vs
 * project-actions.ts.
 */

/**
 * The one shape both RecentProjects and RecentVideos render via ProjectCard
 * — a project card and a "real exported video" card are visually identical,
 * just sourced from two different tables.
 *
 * `id` vs `projectId`: for a RecentProjects card these are the same value
 * (the row IS the project), but for a RecentVideos card `id` is the
 * `videos` row's own id (needed as a stable React key and, once
 * ExportPanel checks for an existing export, as that video's identity) while
 * `projectId` is the OWNING project's id — the one "فتح المشروع" must
 * navigate with. Conflating the two would send a "recent video" click to
 * `/create?project=<video id>`, which no project has, and restoring would
 * fail.
 */
export type DashboardProjectSummary = {
  id: string;
  projectId: string;
  title: string;
  status: ProjectStatus;
  aspectRatio: Exclude<AspectRatio, "auto">;
  duration: number;
  createdAt: string;
  posterGradient: string;
};

/** Exactly the columns lib/supabase/dashboard.ts selects from `public.projects` (004_projects_video_jobs.sql). */
export type ProjectSummaryRow = {
  id: string;
  prompt: string;
  business_name: string | null;
  aspect_ratio: "9:16" | "16:9" | "1:1" | null;
  duration_seconds: number | null;
  status: ProjectStatus;
  scene_plan: unknown;
  created_at: string;
};

/** Exactly the columns lib/supabase/dashboard.ts selects from `public.videos` — a REAL completed export, distinct from (and not implied by) `projects.status === "ready"`: a project can be "ready" (its plan/narration finished) with zero exports, as found in the same investigation this replaces. */
export type VideoSummaryRow = {
  id: string;
  project_id: string;
  duration_seconds: number | null;
  aspect_ratio: "9:16" | "16:9" | "1:1" | null;
  created_at: string;
};

/** The minimal slice of a `projects` row needed to derive a title for a video card — looked up separately by the video's project_id since `videos` itself has no title-like column. */
export type ProjectTitleSource = {
  prompt: string;
  business_name: string | null;
  scene_plan: unknown;
};

/**
 * The exact "فتح المشروع" link shape ProjectCard.tsx uses — reuses
 * CreateWorkspace.tsx's existing `?project=<id>` restore mechanism (see its
 * own docstring: presence of this param loads the saved plan/narration/
 * visuals/videos and jumps straight to the result stage, never triggering a
 * new AI generation), never a new route. Extracted into its own function
 * purely so the link shape is unit-testable without rendering ProjectCard
 * (this project's vitest config has no jsdom/tsx render setup — see
 * components/remotion/plan-preview-player-config.ts for the same pattern).
 */
export function buildOpenProjectHref(projectId: string): string {
  return `/create?project=${projectId}`;
}

const DEFAULT_ASPECT_RATIO: Exclude<AspectRatio, "auto"> = "9:16";
const FALLBACK_TITLE = "مشروع بدون عنوان";
const MAX_DERIVED_TITLE_LENGTH = 60;

/**
 * A small, fixed palette so a card without a real thumbnail still looks
 * intentional (matches lib/supabase/examples.ts's thumbnailGradient
 * precedent) — deterministic per id (not random) so a card's color never
 * flickers to a different one on every re-fetch/page reload.
 */
const POSTER_GRADIENTS = [
  "from-brand-500/40 to-accent-500/40",
  "from-purple-500/40 to-pink-500/40",
  "from-amber-500/40 to-orange-500/40",
  "from-emerald-500/40 to-cyan-500/40",
] as const;

function pickPosterGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return POSTER_GRADIENTS[hash % POSTER_GRADIENTS.length];
}

function normalizeAspectRatio(value: "9:16" | "16:9" | "1:1" | null): Exclude<AspectRatio, "auto"> {
  return value ?? DEFAULT_ASPECT_RATIO;
}

const CARD_DATE_FORMATTER = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" });

/** ProjectCard renders `createdAt` as plain text — a raw ISO timestamp (what `projects.created_at`/`videos.created_at` actually store) would look broken there, so this is real display formatting, not just a passthrough. Falls back to the raw string for anything unparseable rather than throwing. */
function formatCardDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return CARD_DATE_FORMATTER.format(date);
}

/**
 * Derives a human title from whatever the AI planner produced for this
 * project — `scene_plan.videoTitle` (lib/ai/video-plan-schema.ts's
 * VideoPlan) when a valid, non-legacy plan exists, falling back to the
 * business name, then a truncated prompt, then a generic label. Never
 * throws on missing/malformed/legacy `scene_plan` JSON (an older project's
 * scene_plan predates the real planner — see 016_projects_narration_audio.sql's
 * comment on the column).
 */
export function deriveProjectTitle(source: ProjectTitleSource): string {
  const scenePlan = source.scene_plan;
  if (scenePlan && typeof scenePlan === "object" && !Array.isArray(scenePlan) && "videoTitle" in scenePlan) {
    const videoTitle = (scenePlan as { videoTitle?: unknown }).videoTitle;
    if (typeof videoTitle === "string" && videoTitle.trim()) return videoTitle.trim();
  }
  if (source.business_name && source.business_name.trim()) return source.business_name.trim();
  const truncatedPrompt = source.prompt.trim().slice(0, MAX_DERIVED_TITLE_LENGTH);
  return truncatedPrompt || FALLBACK_TITLE;
}

/** Maps one real `projects` row into the dashboard's display shape. `title` and `posterGradient` have no real column (projects never persisted either) so both are derived deterministically here rather than left empty like the mock data this replaces. */
export function mapProjectRowToSummary(row: ProjectSummaryRow): DashboardProjectSummary {
  return {
    id: row.id,
    projectId: row.id,
    title: deriveProjectTitle(row),
    status: row.status,
    aspectRatio: normalizeAspectRatio(row.aspect_ratio),
    duration: row.duration_seconds ?? 0,
    createdAt: formatCardDate(row.created_at),
    posterGradient: pickPosterGradient(row.id),
  };
}

/**
 * Maps one real, completed `videos` row (an actual exported MP4) into the
 * same dashboard display shape `mapProjectRowToSummary` produces, so
 * ProjectCard stays one reusable component for both lists. Always reported
 * as "ready" — RecentVideos only ever loads `status = 'ready'` rows in the
 * first place — regardless of the source project's own (independent)
 * status. `titleSource` is null when the owning project can no longer be
 * found (should not normally happen — projects cascade-delete their videos)
 * — falls back to a generic title rather than throwing.
 */
export function mapVideoRowToSummary(video: VideoSummaryRow, titleSource: ProjectTitleSource | null): DashboardProjectSummary {
  return {
    id: video.id,
    projectId: video.project_id,
    title: titleSource ? deriveProjectTitle(titleSource) : FALLBACK_TITLE,
    status: "ready",
    aspectRatio: normalizeAspectRatio(video.aspect_ratio),
    duration: video.duration_seconds ?? 0,
    createdAt: formatCardDate(video.created_at),
    posterGradient: pickPosterGradient(video.id),
  };
}

/** Minimal, structurally-typed dependency the real Supabase wiring (lib/supabase/dashboard.ts) satisfies — same pattern as lib/actions/project-persistence.ts's ProjectsClient, purely so loadRecentProjects below is unit-testable with a hand-written fake instead of a real, authenticated Supabase client. */
export type RecentProjectsClient = {
  selectRecentProjects(ownerId: string, limit: number): Promise<ProjectSummaryRow[]>;
};

/** Real projects, newest first, already scoped to `ownerId` by the injected client (RLS enforces the same boundary server-side regardless — see lib/supabase/dashboard.ts). */
export async function loadRecentProjects(client: RecentProjectsClient, ownerId: string, limit: number): Promise<DashboardProjectSummary[]> {
  const rows = await client.selectRecentProjects(ownerId, limit);
  return rows.map(mapProjectRowToSummary);
}

/** Minimal, structurally-typed dependency for the "real completed videos" query — same purpose as RecentProjectsClient above. */
export type RecentVideosClient = {
  selectRecentReadyVideos(ownerId: string, limit: number): Promise<VideoSummaryRow[]>;
  /** Batch title lookup for a set of project ids — never called with an empty list. */
  selectProjectTitleSources(projectIds: readonly string[]): Promise<Readonly<Record<string, ProjectTitleSource>>>;
};

/** Real completed (status = 'ready') exported videos, newest first, joined against their owning project's title-relevant fields. */
export async function loadRecentReadyVideos(client: RecentVideosClient, ownerId: string, limit: number): Promise<DashboardProjectSummary[]> {
  const videos = await client.selectRecentReadyVideos(ownerId, limit);
  if (videos.length === 0) return [];

  const projectIds = [...new Set(videos.map((v) => v.project_id))];
  const titleSources = await client.selectProjectTitleSources(projectIds);

  return videos.map((video) => mapVideoRowToSummary(video, titleSources[video.project_id] ?? null));
}
