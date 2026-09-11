"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
}) {
  const { t } = useI18n();

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3">
        {danger && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <AlertTriangle className="size-4" />
          </span>
        )}
        <p>{description}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("admin.common.cancel")}
        </Button>
        <Button
          size="sm"
          variant={danger ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
