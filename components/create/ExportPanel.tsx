"use client";

import { useState } from "react";
import { Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/context";

export function ExportPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <h3 className="text-sm font-bold text-primary">{t("create.exportTitle")}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-400">
          1080p
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-muted">
          <Lock className="size-3" />
          2K · {t("common.comingSoon")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-muted">
          <Lock className="size-3" />
          4K · {t("common.comingSoon")}
        </span>
      </div>

      <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
        <Download className="size-4" />
        {t("create.exportButton")}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={t("create.exportModalTitle")}>
        {t("create.exportModalDesc")}
      </Modal>
    </div>
  );
}
