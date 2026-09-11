const TONE_CLASSES = {
  neutral: "bg-surface-hover text-muted",
  info: "bg-brand-500/15 text-brand-400",
  success: "bg-emerald-500/15 text-emerald-500",
  warning: "bg-amber-500/15 text-amber-500",
  danger: "bg-red-500/15 text-red-400",
} as const;

export type BadgeTone = keyof typeof TONE_CLASSES;

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}
