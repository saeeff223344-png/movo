"use client";

import { Instagram, Music2, ShoppingBag, Youtube } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useI18n } from "@/lib/i18n/context";

const VIDEO_TYPES = [
  {
    icon: Instagram,
    titleKey: "videoTypes.reels",
    descKey: "home.videoTypeReelsDesc",
    ratio: "9:16",
    ratioClass: "aspect-[9/16] w-16",
    color: "from-fuchsia-500 to-brand-500",
  },
  {
    icon: Music2,
    titleKey: "videoTypes.tiktok",
    descKey: "home.videoTypeTiktokDesc",
    ratio: "9:16",
    ratioClass: "aspect-[9/16] w-16",
    color: "from-brand-500 to-accent-500",
  },
  {
    icon: Youtube,
    titleKey: "videoTypes.youtube",
    descKey: "home.videoTypeYoutubeDesc",
    ratio: "16:9",
    ratioClass: "aspect-[16/9] w-24",
    color: "from-red-500 to-accent-500",
  },
  {
    icon: ShoppingBag,
    titleKey: "videoTypes.product",
    descKey: "home.videoTypeProductDesc",
    ratio: "1:1",
    ratioClass: "aspect-square w-16",
    color: "from-amber-400 to-accent-500",
  },
];

export function VideoTypes() {
  const { t } = useI18n();

  return (
    <section id="video-types" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("home.videoTypesEyebrow")}
          title={t("home.videoTypesTitle")}
          description={t("home.videoTypesDesc")}
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VIDEO_TYPES.map((type) => (
            <div
              key={type.titleKey}
              className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-surface p-6 transition-all hover:-translate-y-1 hover:border-border-strong"
            >
              <div className="flex items-start justify-between">
                <span
                  className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${type.color} text-white shadow-lg`}
                >
                  <type.icon className="size-5" strokeWidth={2.2} />
                </span>
                <div
                  className={`${type.ratioClass} rounded-md border border-border-strong bg-surface-hover`}
                />
              </div>

              <h3 className="mt-6 text-lg font-bold text-primary">{t(type.titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(type.descKey)}</p>
              <span className="mt-4 inline-block rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-muted">
                {type.ratio}
              </span>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-lg text-center text-sm text-muted">
          {t("home.videoTypesFootnote")}
        </p>
      </div>
    </section>
  );
}
