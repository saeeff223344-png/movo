import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { ProjectStatus } from "@/lib/types/video";
import type { DashboardProjectSummary } from "@/lib/dashboard/recent-activity";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft: "bg-surface-hover text-muted",
  planning: "bg-brand-500/15 text-brand-400",
  generating: "bg-brand-500/15 text-brand-400",
  rendering: "bg-amber-500/15 text-amber-500",
  ready: "bg-emerald-500/15 text-emerald-500",
  failed: "bg-red-500/15 text-red-400",
};

const STATUS_KEY: Record<ProjectStatus, string> = {
  draft: "dashboard.statusDraft",
  planning: "dashboard.statusPlanning",
  generating: "dashboard.statusGenerating",
  rendering: "dashboard.statusRendering",
  ready: "dashboard.statusReady",
  failed: "dashboard.statusFailed",
};

export function ProjectCard({ project }: { project: DashboardProjectSummary }) {
  const { t } = useI18n();

  return (
    <div className="group overflow-hidden rounded-2xl border border-border-subtle bg-surface transition-all hover:-translate-y-1 hover:border-border-strong">
      <div
        className={`relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br ${project.posterGradient}`}
      >
        <div className="bg-grid absolute inset-0 opacity-20" />
        <span className="flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
          <Play className="size-4 fill-white text-white" />
        </span>
        <span
          className={`absolute top-3 end-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[project.status]}`}
        >
          {t(STATUS_KEY[project.status])}
        </span>
      </div>
      <div className="p-4">
        <h3 className="truncate text-sm font-bold text-primary">{project.title}</h3>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
          <span>{project.aspectRatio}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {project.duration}s
          </span>
          <span>{project.createdAt}</span>
        </div>
        <Link
          href="/create"
          className="mt-3 inline-block text-xs font-bold text-brand-400 hover:text-brand-300"
        >
          {t("dashboard.openProject")}
        </Link>
      </div>
    </div>
  );
}
