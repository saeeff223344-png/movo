import type { AdStyle } from "@/remotion/compositions/ad-types";

export type Platform = "auto" | "reels" | "tiktok" | "youtube" | "general";
export type AspectRatio = "auto" | "9:16" | "16:9" | "1:1";
export type VideoLanguage = "auto" | "ar" | "en";
export type VideoDuration = "auto" | 10 | 15 | 20 | 30;
export type VideoStyle = "auto" | AdStyle;

export type AssetKind = "product" | "logo" | "reference" | "video";

export type Asset = {
  id: string;
  kind: AssetKind;
  fileName: string;
  fileType: string;
  previewUrl: string;
};

/** User-facing optional controls — every field defaults to "auto" so a prompt alone is enough. */
export type GenerationSettings = {
  duration: VideoDuration;
  aspectRatio: AspectRatio;
  language: VideoLanguage;
  platform: Platform;
  style: VideoStyle;
};

/**
 * What the AI is expected to infer from the prompt (+ optional settings/assets)
 * before planning scenes. Mocked today; produced by an LLM call once the AI
 * backend is connected.
 */
export type VideoBrief = {
  prompt: string;
  detectedLanguage: "ar" | "en";
  platform: Exclude<Platform, "auto">;
  aspectRatio: Exclude<AspectRatio, "auto">;
  duration: number;
  style: AdStyle;
  brandName: string;
  offer?: string;
  price?: string;
};

export type SceneType =
  | "hook"
  | "kinetic-headline"
  | "product-reveal"
  | "product-card"
  | "phone-mockup"
  | "logo-reveal"
  | "price-scene"
  | "discount-badge"
  | "cta-scene"
  | "feature-list"
  | "app-screenshot"
  | "split-screen";

/**
 * Motion & Variety Engine (Phase 4): the original 5 plus a much richer,
 * purpose/pacing-aware vocabulary the AI planner can pick from. Every
 * value here needs a matching entry in
 * remotion/compositions/scenes/transition-motion.ts's TRANSITION_RECIPES,
 * enforced by a test — the renderer falls back to "fade" for anything
 * missing or invalid rather than failing to render.
 */
export type SceneTransition =
  | "cut"
  | "fade"
  | "slide"
  | "fast-cut"
  | "luxury-fade"
  | "zoom-in"
  | "zoom-out"
  | "push-left"
  | "push-right"
  | "push-up"
  | "push-down"
  | "whip-left"
  | "whip-right"
  | "blur"
  | "flash"
  | "wipe"
  | "scale-pop"
  | "card-swap"
  | "split-reveal"
  | "light-sweep"
  | "spin";

/** One beat of a generated video. */
export type Scene = {
  id: string;
  type: SceneType;
  durationInFrames: number;
  content: Record<string, string>;
  assetIds?: string[];
  transition?: SceneTransition;
};

/** Mirrors `public.projects.status`'s check constraint (004_projects_video_jobs.sql) exactly — used by ProjectCard/lib/dashboard/recent-activity.ts for the dashboard's real project/video cards. */
export type ProjectStatus =
  | "draft"
  | "planning"
  | "generating"
  | "ready"
  | "rendering"
  | "failed";

export type Revision = {
  id: string;
  message: string;
  createdAt: string;
  appliedChangeSummary: string;
};

export type RenderQuality = "1080p" | "2k" | "4k";

export type RenderJob = {
  id: string;
  projectId: string;
  quality: RenderQuality;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
};
