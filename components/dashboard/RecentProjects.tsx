"use client";

import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import type { DashboardProjectSummary } from "@/lib/dashboard/recent-activity";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

/** `projects` is the current user's own real projects (lib/supabase/dashboard.ts's getRecentProjectsForCurrentUser), newest first — fetched server-side in app/(app)/dashboard/page.tsx and passed down, replacing the previous hardcoded (always-empty) mockProjects import. */
export function RecentProjects({ projects }: { projects: DashboardProjectSummary[] }) {
  const { t } = useI18n();

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-primary">
        {t("dashboard.recentProjectsTitle")}
      </h2>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t("dashboard.recentProjectsEmpty")}
          description={t("dashboard.recentProjectsEmptyDesc")}
          action={
            <Button href="/create" size="sm">
              {t("dashboard.createNew")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
