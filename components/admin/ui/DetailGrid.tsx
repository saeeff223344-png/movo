import type { ReactNode } from "react";

export function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="mt-1 text-sm font-semibold text-primary">{value}</div>
    </div>
  );
}
