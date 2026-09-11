"use client";

import { useI18n } from "@/lib/i18n/context";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";

export function PublishStatusBadge({ published }: { published: boolean }) {
  const { t } = useI18n();
  return (
    <StatusBadge
      label={published ? t("admin.common.published") : t("admin.common.draft")}
      tone={published ? "success" : "neutral"}
    />
  );
}
