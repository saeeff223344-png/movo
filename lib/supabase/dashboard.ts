import "server-only";
import { getSession } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import {
  loadRecentProjects,
  loadRecentReadyVideos,
  type DashboardProjectSummary,
  type ProjectSummaryRow,
  type ProjectTitleSource,
  type VideoSummaryRow,
} from "@/lib/dashboard/recent-activity";

/** How many cards each dashboard widget shows — a "recent activity" list, never the full history. */
const RECENT_ITEMS_LIMIT = 8;

/**
 * Real replacement for lib/data/projects.ts's `mockProjects` (see
 * lib/dashboard/recent-activity.ts's docstring for the bug this fixes).
 * Uses the same authenticated, cookie-scoped Supabase client every other
 * real query in this app uses (lib/supabase/server.ts's createClient) —
 * never the service-role client — so `public.projects`' existing RLS
 * policy ("projects: owner can manage own", auth.uid() = owner_id —
 * 004_projects_video_jobs.sql) is the actual enforcement boundary; the
 * `.eq("owner_id", ownerId)` below is defense-in-depth, matching every
 * other real query in this codebase (e.g. lib/actions/project-actions.ts),
 * never a substitute for RLS.
 *
 * Returns `[]` (never throws) both when signed out and when the account
 * genuinely has no projects yet — RecentProjects renders its existing empty
 * state either way, exactly as before.
 */
export async function getRecentProjectsForCurrentUser(): Promise<DashboardProjectSummary[]> {
  const user = await getSession();
  if (!user) return [];

  const supabase = await createClient();

  return loadRecentProjects(
    {
      async selectRecentProjects(ownerId, limit): Promise<ProjectSummaryRow[]> {
        const { data } = await supabase
          .from("projects")
          .select("id, prompt, business_name, aspect_ratio, duration_seconds, status, scene_plan, created_at")
          .eq("owner_id", ownerId)
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      },
    },
    user.id,
    RECENT_ITEMS_LIMIT,
  );
}

/**
 * The current user's real completed exports — `public.videos` rows with
 * `status = 'ready'` (an actual rendered MP4 in Storage), never
 * `projects.status`, which reflects the AI plan/narration being ready, not
 * whether anything was ever exported (see the investigation this replaces:
 * a project can be "ready" with zero exports). Same auth/RLS pattern as
 * getRecentProjectsForCurrentUser above.
 */
export async function getRecentReadyVideosForCurrentUser(): Promise<DashboardProjectSummary[]> {
  const user = await getSession();
  if (!user) return [];

  const supabase = await createClient();

  return loadRecentReadyVideos(
    {
      async selectRecentReadyVideos(ownerId, limit): Promise<VideoSummaryRow[]> {
        const { data } = await supabase
          .from("videos")
          .select("id, project_id, duration_seconds, aspect_ratio, created_at")
          .eq("owner_id", ownerId)
          .eq("status", "ready")
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      },
      async selectProjectTitleSources(projectIds): Promise<Readonly<Record<string, ProjectTitleSource>>> {
        const { data } = await supabase
          .from("projects")
          .select("id, prompt, business_name, scene_plan")
          .eq("owner_id", user.id)
          .in("id", projectIds as string[]);

        const lookup: Record<string, ProjectTitleSource> = {};
        for (const row of data ?? []) {
          lookup[row.id] = { prompt: row.prompt, business_name: row.business_name, scene_plan: row.scene_plan };
        }
        return lookup;
      },
    },
    user.id,
    RECENT_ITEMS_LIMIT,
  );
}
