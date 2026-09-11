import { formatDate, formatDateTime } from "@/lib/admin/utils/format";

export function DateDisplay({ value, withTime = false }: { value: string | null; withTime?: boolean }) {
  return <span className="tabular-nums text-secondary">{withTime ? formatDateTime(value) : formatDate(value)}</span>;
}
