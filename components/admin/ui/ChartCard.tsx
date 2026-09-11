import type { ReactNode } from "react";

export function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Minimal dependency-free bar chart — good enough for admin trend cards. */
export function MiniBarChart({
  data,
  color = "var(--color-brand-500)",
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex h-32 items-end gap-1.5">
      {data.map((point, i) => (
        <div key={i} className="group relative flex-1">
          <div
            className="rounded-t-sm transition-opacity group-hover:opacity-80"
            style={{ height: `${Math.max(4, (point.value / max) * 100)}%`, backgroundColor: color }}
          />
          <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-inverse px-1.5 py-0.5 text-[10px] font-semibold text-on-inverse opacity-0 transition-opacity group-hover:opacity-100">
            {point.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Minimal dependency-free line/area chart via inline SVG. */
export function MiniLineChart({
  data,
  color = "var(--color-brand-500)",
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const width = 300;
  const height = 100;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((d, i) => `${i * step},${height - (d.value / max) * (height - 8) - 4}`);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full" preserveAspectRatio="none">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points={`0,${height} ${points.join(" ")} ${width},${height}`} fill={color} opacity={0.08} />
    </svg>
  );
}
