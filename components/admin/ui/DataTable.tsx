"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Skeleton } from "@/components/ui/Skeleton";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

const PAGE_SIZE = 10;

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  loading = false,
  emptyTitle,
  emptyDescription,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(0);
  const ChevronNext = locale === "ar" ? ChevronLeft : ChevronRight;
  const ChevronPrev = locale === "ar" ? ChevronRight : ChevronLeft;

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageData = data.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-base/50 text-start">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 text-start text-xs font-bold text-muted ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              pageData.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-border-subtle last:border-0 ${
                    onRowClick ? "cursor-pointer transition-colors hover:bg-surface-hover" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`whitespace-nowrap px-4 py-3.5 ${col.className ?? ""}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-surface-hover text-muted">
            <Inbox className="size-5" strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-sm font-bold text-primary">
            {emptyTitle ?? t("admin.table.emptyTitle")}
          </p>
          {emptyDescription && <p className="mt-1 text-xs text-muted">{emptyDescription}</p>}
        </div>
      )}

      {!loading && data.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3 text-xs text-muted">
          <span>
            {t("admin.table.showing")} {currentPage * PAGE_SIZE + 1}–
            {Math.min(data.length, (currentPage + 1) * PAGE_SIZE)} {t("admin.table.of")} {data.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-border-subtle disabled:opacity-30"
            >
              <ChevronPrev className="size-3.5" />
            </button>
            <span className="tabular-nums">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-border-subtle disabled:opacity-30"
            >
              <ChevronNext className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
