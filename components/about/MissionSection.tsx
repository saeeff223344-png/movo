"use client";

import { useI18n } from "@/lib/i18n/context";

export function MissionSection() {
  const { t } = useI18n();

  return (
    <section className="py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <h2 className="text-balance text-2xl font-extrabold text-primary sm:text-3xl">
            {t("about.missionTitle")}
          </h2>
          <p className="mt-4 text-balance leading-relaxed text-secondary">
            {t("about.missionDesc")}
          </p>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500">
          <div className="bg-grid absolute inset-0 opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-3 animate-glow rounded-full bg-white"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
