export function UsageBar({
  used,
  total,
  label,
}: {
  used: number;
  total: number;
  label?: string;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const tone = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-brand-500";

  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <span>{label}</span>
          <span className="tabular-nums">
            {used}/{total}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
