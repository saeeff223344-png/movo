"use client";

import { useEffect, useRef } from "react";
import { Image as ImageIcon, Plus, Tag, Video, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { Asset, AssetKind } from "@/lib/types/video";

const KIND_CONFIG: Record<
  AssetKind,
  { icon: LucideIcon; labelKey: string; accept: string }
> = {
  product: { icon: ImageIcon, labelKey: "create.assetProduct", accept: "image/png,image/jpeg,image/webp" },
  logo: { icon: Tag, labelKey: "create.assetLogo", accept: "image/png,image/jpeg,image/webp,image/svg+xml" },
  reference: { icon: ImageIcon, labelKey: "create.assetReference", accept: "image/png,image/jpeg,image/webp" },
  video: { icon: Video, labelKey: "create.assetVideo", accept: "video/mp4,video/quicktime" },
};

let assetIdCounter = 0;
function nextAssetId() {
  assetIdCounter += 1;
  return `asset_${Date.now()}_${assetIdCounter}`;
}

export function AssetUploader({
  kinds,
  assets,
  onChange,
}: {
  kinds: AssetKind[];
  assets: Asset[];
  onChange: (assets: Asset[]) => void;
}) {
  const { t } = useI18n();
  const inputRefs = useRef<Partial<Record<AssetKind, HTMLInputElement | null>>>({});

  useEffect(() => {
    return () => {
      assets.forEach((asset) => URL.revokeObjectURL(asset.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup all previews on final unmount only
  }, []);

  function handleFiles(kind: AssetKind, files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: Asset[] = Array.from(files).map((file) => ({
      id: nextAssetId(),
      kind,
      fileName: file.name,
      fileType: file.type,
      previewUrl: URL.createObjectURL(file),
    }));
    onChange([...assets, ...added]);
  }

  function removeAsset(id: string) {
    const target = assets.find((a) => a.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(assets.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {kinds.map((kind) => {
          const config = KIND_CONFIG[kind];
          return (
            <button
              key={kind}
              type="button"
              onClick={() => inputRefs.current[kind]?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3.5 py-2 text-xs font-semibold text-secondary transition-colors hover:border-brand-400/50 hover:text-primary"
            >
              <Plus className="size-3.5" />
              {t(config.labelKey)}
              <input
                ref={(el) => {
                  inputRefs.current[kind] = el;
                }}
                type="file"
                accept={config.accept}
                multiple={kind !== "logo"}
                className="hidden"
                onChange={(e) => {
                  handleFiles(kind, e.target.files);
                  e.target.value = "";
                }}
              />
            </button>
          );
        })}
      </div>

      {assets.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {assets.map((asset) => {
            const config = KIND_CONFIG[asset.kind];
            const isImage = asset.fileType.startsWith("image/");
            return (
              <div
                key={asset.id}
                className="group relative flex w-28 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface"
              >
                <div className="flex h-20 items-center justify-center bg-surface-hover">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.previewUrl}
                      alt={asset.fileName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <config.icon className="size-6 text-muted" />
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-[11px] font-semibold text-primary">
                    {asset.fileName}
                  </p>
                  <p className="text-[10px] text-muted">{t(config.labelKey)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAsset(asset.id)}
                  aria-label={t("common.remove")}
                  className="absolute end-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
