import { z } from "zod";
import type { AdStyle } from "@/remotion/compositions/ad-types";
import type { Platform, AspectRatio, SceneType, SceneTransition } from "@/lib/types/video";
import { VOICE_GENDERS, VOICE_STYLES, NARRATION_PACES, MUSIC_STYLES } from "@/lib/audio/types";

/**
 * The AI planner's output contract (Phase 1) — the validated bridge between
 * a user's free-text brief and Remotion. lib/types/video.ts's Scene/ScenePlan
 * are the next stage (built from a VideoPlan in a later phase); this schema
 * is intentionally seconds-based and creative-direction-shaped rather than
 * frames-and-props-shaped.
 *
 * Every "doesn't always apply" field below uses `.nullable()`, never
 * `.optional()`: OpenAI Structured Outputs strict mode requires every
 * property to appear in the JSON Schema's `required` array, so an
 * absent-when-unset field isn't representable — null means "not applicable"
 * instead. (lib/ai/video-planner.ts's zodTextFormat() call throws at request
 * time if this rule is violated, so this isn't just a style preference.)
 *
 * The literal tuples below reuse the enums lib/types/video.ts and
 * remotion/compositions/ad-types.ts already define for the (currently
 * mocked) creative pipeline. `satisfies` fails to compile if one of these
 * drifts out of sync with the type it mirrors.
 */

const AD_STYLES = [
  "fast",
  "luxury",
  "fun",
  "tech",
  "minimal",
  "energetic",
] as const satisfies readonly AdStyle[];

const PLATFORMS = [
  "reels",
  "tiktok",
  "youtube",
  "general",
] as const satisfies readonly Exclude<Platform, "auto">[];

const ASPECT_RATIOS = ["9:16", "16:9", "1:1"] as const satisfies readonly Exclude<AspectRatio, "auto">[];

const SCENE_PURPOSES = [
  "hook",
  "kinetic-headline",
  "product-reveal",
  "product-card",
  "phone-mockup",
  "logo-reveal",
  "price-scene",
  "discount-badge",
  "cta-scene",
  "feature-list",
  "app-screenshot",
  "split-screen",
] as const satisfies readonly SceneType[];

/** Exported so lib/ai/scene-variety.ts validates against this single canonical list rather than duplicating it. */
export const SCENE_TRANSITIONS = [
  "cut",
  "fade",
  "slide",
  "fast-cut",
  "luxury-fade",
  "zoom-in",
  "zoom-out",
  "push-left",
  "push-right",
  "push-up",
  "push-down",
  "whip-left",
  "whip-right",
  "blur",
  "flash",
  "wipe",
  "scale-pop",
  "card-swap",
  "split-reveal",
  "light-sweep",
  "spin",
] as const satisfies readonly SceneTransition[];

const TEXT_POSITIONS = ["top", "center", "bottom"] as const;
const TEXT_ALIGNMENTS = ["start", "center", "end"] as const;

/**
 * Automatic Visual Assets phase: how important a scene's visual is and
 * where it sits relative to the frame — consumed by lib/visuals/*
 * (deciding whether/how many auto visuals to generate) and by
 * remotion/compositions/scenes/plan-scene-layouts.tsx (deciding whether to
 * show a full-bleed image background at all). "none" means the scene is
 * deliberately visual-free (e.g. a pure typography beat) — distinct from
 * the whole `visual` object being null, which means the model gave no
 * opinion (every plan persisted before this field existed, or a model
 * output that omits it).
 */
export const VISUAL_ROLES = ["hero", "supporting", "background", "none"] as const;
export const VISUAL_USAGES = ["full_bleed_background", "foreground_subject", "split_left", "split_right", "collage", "none"] as const;
export const VISUAL_CROP_FOCUS = ["center", "top", "bottom", "left", "right", "subject"] as const;
export const VISUAL_IMPORTANCE = ["primary", "secondary", "minimal"] as const;

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const MIN_SCENES = 3;
export const MAX_SCENES = 8;
export const MIN_DURATION_SECONDS = 6;
export const MAX_DURATION_SECONDS = 90;

/**
 * Automatic Visual Assets phase: the AI's own opinion of what this scene's
 * visual should show and how it should be used, extending the older
 * free-text "assetNeeds" (kept as-is, still consumed by the legacy
 * pickAssetForScene in lib/ai/plan-to-scenes.ts) with something
 * lib/visuals/* can actually act on — a concrete subject to prompt an
 * image provider with, plus enough placement metadata for the renderer to
 * pick a full-bleed vs. foreground vs. split composition. Nullable (never
 * required) for the same OpenAI-strict-mode reason as `palette` above:
 * every plan persisted before this field existed omits it entirely.
 */
export const sceneVisualPlanSchema = z.object({
  /** A concrete, prompt-ready visual subject, e.g. "fresh espresso pouring into a ceramic cup" — null when role is "none". */
  subject: z.string().min(1).max(200).nullable(),
  role: z.enum(VISUAL_ROLES).nullable(),
  usage: z.enum(VISUAL_USAGES).nullable(),
  /** True when a user-uploaded product/logo photo should be strongly preferred over any automatically sourced visual for this scene. */
  preferUserAsset: z.boolean().nullable(),
  cropFocus: z.enum(VISUAL_CROP_FOCUS).nullable(),
  importance: z.enum(VISUAL_IMPORTANCE).nullable(),
});

export const plannedSceneSchema = z.object({
  id: z.string().min(1).max(40),
  startTime: z.number().min(0).max(MAX_DURATION_SECONDS),
  duration: z.number().min(0.5).max(MAX_DURATION_SECONDS),
  purpose: z.enum(SCENE_PURPOSES),
  narration: z.string().max(400).nullable(),
  onScreenText: z.string().max(200).nullable(),
  visualDirection: z.string().min(1).max(500),
  motionDirection: z.string().min(1).max(300),
  transition: z.enum(SCENE_TRANSITIONS),
  assetNeeds: z.array(z.string().min(1).max(120)).max(10),
  textPosition: z.enum(TEXT_POSITIONS).nullable(),
  textAlign: z.enum(TEXT_ALIGNMENTS).nullable(),
  visual: sceneVisualPlanSchema.nullable(),
});

/**
 * Phase 5 (Audio & Voice Sync Engine): the AI's own audio decisions for the
 * whole video — never a per-scene concern (a single voice/music identity
 * should carry the whole ad). Every sub-field is a plain required enum
 * rather than nullable: once the AI commits to specifying audio at all, it
 * must commit to a deliberate choice for every field, not a half-filled
 * object. The object itself is nullable on VideoPlan below so a plan built
 * without any audio opinion (including every VideoPlan that existed before
 * this field did) stays valid — see lib/audio/audio-settings.ts's
 * resolveAudioSettings, which is the only place downstream code should
 * read these fields from, since it derives sensible visualStyle-based
 * defaults for a null value instead of every call site needing to.
 */
export const audioSettingsSchema = z.object({
  voiceGender: z.enum(VOICE_GENDERS),
  voiceStyle: z.enum(VOICE_STYLES),
  narrationPace: z.enum(NARRATION_PACES),
  musicEnabled: z.boolean(),
  musicStyle: z.enum(MUSIC_STYLES),
});

/**
 * The AI's own deliberate color choice for this specific video — decouples
 * *color* from `visualStyle`, which otherwise only selects a fixed
 * springStiffness/pattern/badge personality from AD_PALETTES and used to
 * also fully dictate color (see remotion/compositions/palette-resolution.ts's
 * docstring for the full "why videos converged on indigo" story). Nullable
 * so a plan that predates this field (every persisted project before this
 * shipped) or a model output that omits it still resolves correctly — the
 * resolver falls back to AD_PALETTES[visualStyle]'s own colors exactly like
 * before. `background`/`backgroundEnd` are the two stops of a diagonal
 * gradient (matching every existing AD_PALETTES entry's own shape); a
 * single-color background is expressed as identical stops.
 */
export const planPaletteSchema = z.object({
  background: z.string().regex(HEX_COLOR_PATTERN),
  backgroundEnd: z.string().regex(HEX_COLOR_PATTERN),
  accent: z.string().regex(HEX_COLOR_PATTERN),
  secondaryAccent: z.string().regex(HEX_COLOR_PATTERN),
  text: z.string().regex(HEX_COLOR_PATTERN),
});

/**
 * One shared photographic identity for every auto-generated visual in the
 * video (Automatic Visual Assets phase, requirement 6: "images inside one
 * video should feel like one campaign") — lib/visuals/visual-prompt-builder.ts
 * folds these three descriptors into every scene's image prompt so a
 * 5-scene video doesn't look like 5 unrelated stock photos. Nullable for
 * the same backward-compatibility reason as `palette`/scene `visual`.
 */
export const visualThemeSchema = z.object({
  photographyStyle: z.string().min(1).max(120),
  lighting: z.string().min(1).max(120),
  colorTemperature: z.string().min(1).max(60),
});

export const videoPlanSchema = z.object({
  language: z.enum(["ar", "en"]),
  videoTitle: z.string().min(1).max(120),
  business: z.string().min(1).max(200),
  objective: z.string().min(1).max(300),
  targetAudience: z.string().min(1).max(300),
  platform: z.enum(PLATFORMS),
  aspectRatio: z.enum(ASPECT_RATIOS),
  durationSeconds: z.number().min(MIN_DURATION_SECONDS).max(MAX_DURATION_SECONDS),
  visualStyle: z.enum(AD_STYLES),
  tone: z.string().min(1).max(60),
  brandColors: z.array(z.string().regex(HEX_COLOR_PATTERN)).max(6).nullable(),
  palette: planPaletteSchema.nullable(),
  visualTheme: visualThemeSchema.nullable(),
  cta: z.string().min(1).max(80),
  scenes: z.array(plannedSceneSchema).min(MIN_SCENES).max(MAX_SCENES),
  audio: audioSettingsSchema.nullable(),
});

export type PlannedScene = z.infer<typeof plannedSceneSchema>;
export type VideoPlan = z.infer<typeof videoPlanSchema>;
export type AudioSettings = z.infer<typeof audioSettingsSchema>;
export type PlanPalette = z.infer<typeof planPaletteSchema>;
export type SceneVisualPlan = z.infer<typeof sceneVisualPlanSchema>;
export type VisualTheme = z.infer<typeof visualThemeSchema>;
export type VisualRole = (typeof VISUAL_ROLES)[number];
export type VisualUsage = (typeof VISUAL_USAGES)[number];
