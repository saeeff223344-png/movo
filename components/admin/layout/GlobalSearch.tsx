"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { SearchIndexEntry } from "@/lib/admin/services/search";

type SearchResult = { id: string; title: string; subtitle: string; href: string; group: string };

export function GlobalSearch({ index: rawIndex }: { index: SearchIndexEntry[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const index: SearchResult[] = useMemo(
    () => rawIndex.map((e) => ({ id: e.id, title: e.title, subtitle: e.subtitle, href: e.href, group: t(`admin.nav.${e.groupKey}`) })),
    [rawIndex, t],
  );

  function closeSearch() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (v) setQuery("");
          return !v;
        });
      }
      if (e.key === "Escape") closeSearch();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const results =
    query.trim().length === 0
      ? []
      : index
          .filter(
            (r) =>
              r.title.toLowerCase().includes(query.toLowerCase()) ||
              r.subtitle.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 20);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:text-primary sm:flex"
      >
        <Search className="size-3.5" />
        {t("admin.search.placeholder")}
        <kbd className="ms-4 rounded border border-border-subtle bg-surface-hover px-1.5 py-0.5 text-[10px] font-bold">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-xl border border-border-subtle text-muted sm:hidden"
        aria-label={t("admin.search.placeholder")}
      >
        <Search className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-24">
          <button
            type="button"
            aria-label="close"
            onClick={closeSearch}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border-subtle bg-elevated shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
              <Search className="size-4 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("admin.search.placeholder")}
                className="flex-1 bg-transparent text-sm text-primary placeholder-muted outline-none"
              />
              <button
                type="button"
                onClick={closeSearch}
                className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-surface-hover"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {query.trim().length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted">{t("admin.search.hint")}</p>
              )}
              {query.trim().length > 0 && results.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted">{t("admin.search.noResults")}</p>
              )}
              {results.map((r) => (
                <button
                  key={`${r.group}-${r.id}`}
                  type="button"
                  onClick={() => {
                    router.push(r.href);
                    closeSearch();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-surface-hover"
                >
                  <span>
                    <span className="block text-sm font-semibold text-primary">{r.title}</span>
                    <span className="block text-xs text-muted">{r.subtitle}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-bold text-muted">
                    {r.group}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
