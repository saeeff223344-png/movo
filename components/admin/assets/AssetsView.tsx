"use client";

import { useMemo, useState } from "react";
import { FileText, Image as ImageIcon, Video } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SearchBox } from "@/components/admin/ui/SearchBox";
import { DateDisplay } from "@/components/admin/ui/DateDisplay";
import type { AdminAsset } from "@/lib/admin/types/site";

const TYPE_ICON = { image: ImageIcon, video: Video, document: FileText };

export function AssetsView({ assets }: { assets: AdminAsset[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => assets.filter((a) => query.trim().length === 0 || a.filename.toLowerCase().includes(query.toLowerCase())),
    [assets, query],
  );

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.assets")} description={t("admin.assets.subtitle")} />

      <div className="mb-4">
        <SearchBox value={query} onChange={setQuery} placeholder={t("admin.common.search")} className="w-full sm:w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((asset) => {
          const Icon = TYPE_ICON[asset.type];
          return (
            <div key={asset.id} className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
              <div className={`flex aspect-video items-center justify-center bg-gradient-to-br ${asset.previewGradient}`}>
                <Icon className="size-6 text-white/80" />
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-semibold text-primary">{asset.filename}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {asset.sizeKb} KB {asset.width ? `· ${asset.width}×${asset.height}` : ""}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {asset.usageRef ?? t("admin.assets.unused")} · <DateDisplay value={asset.createdAt} />
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
