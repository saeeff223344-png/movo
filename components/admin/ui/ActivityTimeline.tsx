export type TimelineEntry = {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
};

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="space-y-0">
      {entries.map((entry, i) => (
        <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < entries.length - 1 && (
            <span className="absolute top-3 bottom-0 start-[5px] w-px bg-border-subtle" />
          )}
          <span className="relative mt-1.5 flex size-3 shrink-0 items-center justify-center rounded-full bg-brand-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">{entry.title}</p>
            {entry.description && <p className="mt-0.5 text-xs text-muted">{entry.description}</p>}
            <p className="mt-1 text-[11px] text-muted">{entry.timestamp}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
