import type { Asset, GenerationSettings, ProjectStatus, Scene, ScenePlan, VideoBrief } from "@/lib/types/video";
import type { AdCompositionProps, AdStyle } from "@/remotion/compositions/ad-types";
import { DEFAULT_AD_PROPS } from "@/remotion/compositions/ad-types";

/**
 * Mock AI planning/generation service.
 *
 * Every export here simulates a step the real AI/backend will eventually
 * perform (prompt understanding, scene planning, rendering). The function
 * signatures are the intended service boundary — swapping the body for a
 * real API call later should not require any UI changes.
 */

const STYLE_KEYWORDS: Record<AdStyle, string[]> = {
  luxury: ["فاخر", "راقي", "luxury", "premium", "elegant"],
  fun: ["مرح", "فرح", "fun", "playful", "ضحك"],
  tech: ["تقني", "تقنية", "تطبيق", "tech", "app", "software"],
  minimal: ["minimal", "بسيط", "نظيف", "clean"],
  energetic: ["طاقة", "حيوي", "energetic", "vibrant"],
  fast: ["سريع", "شبابي", "fast", "quick"],
};

const STYLE_ORDER: AdStyle[] = ["luxury", "fun", "tech", "minimal", "energetic", "fast"];

function detectLanguage(prompt: string): "ar" | "en" {
  const arabicChars = prompt.match(/[؀-ۿ]/g)?.length ?? 0;
  return arabicChars > prompt.length / 6 ? "ar" : "en";
}

function detectStyle(prompt: string): AdStyle {
  const lower = prompt.toLowerCase();
  for (const style of STYLE_ORDER) {
    if (STYLE_KEYWORDS[style].some((kw) => lower.includes(kw))) return style;
  }
  return "fast";
}

function detectDuration(prompt: string): number {
  const match = prompt.match(/(\d{1,2})\s*(ثانية|ثواني|sec|second)/i);
  return match ? Number(match[1]) : 15;
}

function detectPlatform(prompt: string): VideoBrief["platform"] {
  const lower = prompt.toLowerCase();
  if (lower.includes("tiktok") || lower.includes("تيك توك")) return "tiktok";
  if (lower.includes("youtube") || lower.includes("يوتيوب")) return "youtube";
  if (lower.includes("reels") || lower.includes("ريلز") || lower.includes("انستقرام")) return "reels";
  return "reels";
}

function detectPrice(prompt: string): string | undefined {
  const match = prompt.match(/[\d٠-٩][\d٠-٩,،.]*\s*(د\.ع|دينار|ريال|جنيه|\$|usd|sar|iqd)/i);
  return match?.[0].trim();
}

function detectOffer(prompt: string, language: "ar" | "en"): string {
  if (/عرض|خصم|offer|discount|deal/i.test(prompt)) {
    const match = prompt.match(/(عرض[^.،]{0,30}|offer[^.,]{0,30})/i);
    if (match) return match[0].trim();
  }
  return language === "ar" ? "عرض خاص" : "Special offer";
}

function extractBrandName(prompt: string): string {
  const match = prompt.match(/(?:اسمه|اسمها|called|named)\s+([\p{L}\p{N} ]{2,24})/u);
  return match?.[1]?.trim() || DEFAULT_AD_PROPS.brandName;
}

export function generateVideoBrief(
  prompt: string,
  settings: GenerationSettings,
  assets: Asset[],
): VideoBrief {
  const detectedLanguage = settings.language === "auto" ? detectLanguage(prompt) : settings.language;
  const style: AdStyle = settings.style === "auto" ? detectStyle(prompt) : settings.style;
  const platform = settings.platform === "auto" ? detectPlatform(prompt) : settings.platform;
  const aspectRatio = settings.aspectRatio === "auto" ? "9:16" : settings.aspectRatio;
  const duration = settings.duration === "auto" ? detectDuration(prompt) : settings.duration;
  const hasLogo = assets.some((a) => a.kind === "logo");

  return {
    prompt,
    detectedLanguage,
    platform,
    aspectRatio,
    duration,
    style,
    brandName: extractBrandName(prompt),
    offer: detectOffer(prompt, detectedLanguage),
    price: detectPrice(prompt) ?? (hasLogo ? undefined : DEFAULT_AD_PROPS.price),
  };
}

/** Turns a brief into an ordered scene beat sheet. Mock: a fixed 4-beat structure. */
export function generateScenePlan(brief: VideoBrief): ScenePlan {
  const framesPerSecond = 30;
  const totalFrames = brief.duration * framesPerSecond;

  const scenes: Scene[] = [
    {
      id: "hook",
      type: "hook",
      durationInFrames: Math.round(totalFrames * 0.2),
      content: { brandName: brief.brandName },
      transition: "fade",
    },
    {
      id: "offer",
      type: "product-reveal",
      durationInFrames: Math.round(totalFrames * (brief.price ? 0.35 : 0.55)),
      content: { offer: brief.offer ?? "" },
      transition: "cut",
    },
    ...(brief.price
      ? ([
          {
            id: "price",
            type: "price-scene",
            durationInFrames: Math.round(totalFrames * 0.2),
            content: { price: brief.price },
            transition: "fast-cut",
          } satisfies Scene,
        ] as Scene[])
      : []),
    {
      id: "cta",
      type: "cta-scene",
      durationInFrames:
        totalFrames -
        Math.round(totalFrames * 0.2) -
        Math.round(totalFrames * (brief.price ? 0.35 : 0.55)) -
        (brief.price ? Math.round(totalFrames * 0.2) : 0),
      content: { brandName: brief.brandName },
      transition: "fade",
    },
  ];

  return {
    id: `plan_${Date.now()}`,
    brief,
    scenes,
    createdAt: new Date().toISOString(),
  };
}

/** Maps a brief to the props the demo AdComposition understands. */
export function briefToAdProps(brief: VideoBrief): AdCompositionProps {
  return {
    brandName: brief.brandName,
    title: DEFAULT_AD_PROPS.title,
    subtitle: DEFAULT_AD_PROPS.subtitle,
    offer: brief.offer ?? DEFAULT_AD_PROPS.offer,
    price: brief.price ?? "",
    cta: DEFAULT_AD_PROPS.cta,
    style: brief.style,
  };
}

export const GENERATION_STEP_KEYS = [
  "understandingIdea",
  "writingCopy",
  "buildingScenes",
  "choosingMotion",
  "preparingPreview",
] as const;

export type GenerationStepKey = (typeof GENERATION_STEP_KEYS)[number];

export const MOCK_PROJECT_STATUS_AFTER_GENERATION: ProjectStatus = "ready";
