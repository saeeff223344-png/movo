"use client";

import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/lib/i18n/context";
import { mockProjects } from "@/lib/data/projects";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

export function RecentVideos() {
  const { t } = useI18n();
  const readyVideos = mockProjects.filter((project) => project.status === "ready");

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-primary">
        {t("dashboard.recentVideosTitle")}
      </h2>
      {readyVideos.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title={t("dashboard.recentVideosEmpty")}
          description={t("dashboard.recentVideosEmptyDesc")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {readyVideos.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
