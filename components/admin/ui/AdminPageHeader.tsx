"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function AdminPageHeader({
  title,
  description,
  actions,
  backHref,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
}) {
  const { locale } = useI18n();
  const Chevron = locale === "ar" ? ChevronRight : ChevronLeft;

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-primary"
          >
            <Chevron className="size-3.5" />
            {locale === "ar" ? "رجوع" : "Back"}
          </Link>
        )}
        <h1 className="text-xl font-extrabold text-primary sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
