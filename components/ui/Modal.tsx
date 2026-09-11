"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
    >
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-elevated p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-base font-bold text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 text-sm leading-relaxed text-secondary">{children}</div>
      </div>
    </div>
  );
}
