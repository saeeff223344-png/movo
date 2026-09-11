import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon,
  deltaLabel,
  deltaTone,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  deltaLabel?: string;
  deltaTone?: "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-muted">{label}</p>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
            <Icon className="size-4" strokeWidth={2} />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-extrabold tabular-nums text-primary">{value}</p>
      {deltaLabel && (
        <p
          className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${
            deltaTone === "down" ? "text-red-400" : "text-emerald-500"
          }`}
        >
          {deltaTone === "down" ? (
            <ArrowDownRight className="size-3.5" />
          ) : (
            <ArrowUpRight className="size-3.5" />
          )}
          {deltaLabel}
        </p>
      )}
    </div>
  );
}
