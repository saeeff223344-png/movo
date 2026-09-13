"use client";

import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/lib/i18n/context";
import type { DashboardProjectSummary } from "@/lib/dashboard/recent-activity";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

/** `videos` is the current user's own real, completed exports (lib/supabase/dashboard.ts's getRecentReadyVideosForCurrentUser — real `videos` rows with status = 'ready', i.e. an actual rendered MP4, not merely `projects.status === "ready"`), newest first, already filtered server-side — replacing the previous hardcoded (always-empty) mockProjects import. */
export function RecentVideos({ videos }: { videos: DashboardProjectSummary[] }) {
  const { t } = useI18n();

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-primary">
        {t("dashboard.recentVideosTitle")}
      </h2>
      {videos.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title={t("dashboard.recentVideosEmpty")}
          description={t("dashboard.recentVideosEmptyDesc")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {videos.map((video) => (
            <ProjectCard key={video.id} project={video} />
          ))}
        </div>
      )}
    </div>
  );
}
