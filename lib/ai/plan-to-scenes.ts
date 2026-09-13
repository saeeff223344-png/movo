import type { Asset, AssetKind, Scene, SceneType } from "@/lib/types/video";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import type { PlanCompositionProps } from "@/remotion/compositions/plan-types";
import { AD_FPS, ASPECT_RATIO_DIMENSIONS } from "@/remotion/constants";
import { secondsToFrames } from "@/lib/ai/scene-timing";
import { LOCALE_DIR } from "@/lib/i18n/config";
import { computeSceneVariants, resolveSceneTransitions } from "@/lib/ai/scene-variety";
import { adaptSceneDurationsForNarration, type NarrationTrimsBySceneId } from "@/lib/audio/scene-audio-sync";
import { buildPlanAudioProps } from "@/lib/audio/plan-audio";
import { resolvePlanPalette } from "@/remotion/compositions/palette-resolution";
import type { ResolvedSceneVisual } from "@/lib/visuals/types";
import type { ResolvedSceneVideo } from "@/lib/video-generation/types";

/**
 * Phase 2 adapter: turns a validated VideoPlan (lib/ai/video-plan-schema.ts,
 * Phase 1's output) into the existing Remotion-facing Scene[] shape
 * (lib/types/video.ts) plus the sizing PlanComposition/PlanPreviewPlayer
 * need. PlannedScene.purpose and .transition are already the same enums as
 * Scene.type/Scene.transition by design (see video-plan-schema.ts), so this
 * is a direct field carry, not a re-interpretation.
 */

/** Scene purposes a placeholder or uploaded image visually supports. */
const IMAGE_PURPOSES = new Set<SceneType>([
  "product-reveal",
  "product-card",
  "phone-mockup",
  "app-screenshot",
  "logo-reveal",
  "split-screen",
]);

/**
 * Picks an already-uploaded asset for a scene, never fabricating one.
 * Logo-reveal prefers a logo; every other image-shaped purpose prefers a
 * product photo; either falls back to whatever the user did upload rather
 * than showing nothing when only one kind is present. Returns undefined
 * (never an invented URL) when nothing suitable was uploaded, or the
 * scene's purpose has no visual use for an image.
 */
/** Exported so lib/actions/visual-actions.ts can check "does this scene already have a covering user asset" with the exact same logic used here — Requirement 3's asset priority must never drift between the two call sites. */
export function pickAssetForScene(purpose: SceneType, assets: Asset[]): Asset | undefined {
  if (!IMAGE_PURPOSES.has(purpose)) return undefined;
  const preferredKind: AssetKind = purpose === "logo-reveal" ? "logo" : "product";
  return assets.find((a) => a.kind === preferredKind) ?? assets.find((a) => a.kind === "product" || a.kind === "logo");
}

/**
 * Converts every PlannedScene into a Scene, preserving order and every
 * direction field. First runs the audio sync engine's duration adaptation
 * (lib/audio/scene-audio-sync.ts) so a scene the AI under-budgeted for its
 * own narration gets widened before anything else sees it — a no-op for
 * the common case where narration already comfortably fits. Then runs the
 * Motion & Variety Engine (lib/ai/scene-variety.ts) over the (possibly
 * widened) ordered list: transitions are validated/resolved and
 * de-duplicated against their neighbor, and each scene gets a
 * deterministic layout-variant index — both computed from plan data only
 * (scene id/purpose + the previous scene's own resolved pick), never
 * Math.random(), so the same plan always renders identically while
 * back-to-back scenes still look different.
 */
/**
 * Automatic Visual Assets phase, Requirement 3's asset priority chain: a
 * user-uploaded asset (product > logo > other, via pickAssetForScene above
 * — unchanged, already-correct logic) always wins when one exists for this
 * scene; an automatically generated/sourced visual (lib/visuals/*, already
 * resolved to a signed URL by the caller) only ever fills a scene NO user
 * asset covers. This function never calls a provider or Storage itself —
 * `autoVisuals` arrives fully resolved, exactly like `narrationAudioUrls`
 * below, so buildVideoPlanScenes stays a pure, synchronous function.
 *
 * Dynamic AI Video Director phase, Requirement 10's extra priority layer:
 * `aiVideos` (also already-resolved, by lib/actions/video-direction-actions.ts)
 * sits ABOVE the still-image chain entirely — a scene the director picked
 * for real motion shows its generated clip instead of the still image, but
 * `imageUrl` is still populated from the exact same still-image logic as
 * before so nothing regresses for a scene with no AI video (old projects
 * included, since `aiVideos` defaults to `{}`).
 */
export function buildVideoPlanScenes(
  plan: VideoPlan,
  assets: Asset[],
  fps: number,
  autoVisuals: Readonly<Record<string, ResolvedSceneVisual>> = {},
  aiVideos: Readonly<Record<string, ResolvedSceneVideo>> = {},
): Scene[] {
  const adaptedPlan = adaptSceneDurationsForNarration(plan);
  const resolvedTransitions = resolveSceneTransitions(adaptedPlan.scenes, adaptedPlan.visualStyle);
  const variants = computeSceneVariants(adaptedPlan.scenes.map((s) => ({ id: s.id, purpose: s.purpose })));

  return adaptedPlan.scenes.map((scene, i): Scene => {
    const asset = pickAssetForScene(scene.purpose, assets);
    const autoVisual = asset ? undefined : autoVisuals[scene.id];
    const aiVideo = aiVideos[scene.id];
    const onScreenText = scene.onScreenText ?? (scene.purpose === "cta-scene" ? plan.cta : "");

    return {
      id: scene.id,
      type: scene.purpose,
      durationInFrames: secondsToFrames(scene.duration, fps),
      transition: resolvedTransitions[i],
      assetIds: asset ? [asset.id] : undefined,
      content: {
        narration: scene.narration ?? "",
        onScreenText,
        visualDirection: scene.visualDirection,
        motionDirection: scene.motionDirection,
        textPosition: scene.textPosition ?? "center",
        textAlign: scene.textAlign ?? "center",
        imageUrl: asset?.previewUrl ?? autoVisual?.url ?? "",
        videoUrl: aiVideo?.url ?? "",
        videoDurationInFrames: aiVideo?.durationSeconds ? String(secondsToFrames(aiVideo.durationSeconds, fps)) : "",
        variant: String(variants[i]),
      },
    };
  });
}

export type VideoPlanRenderData = {
  compositionProps: PlanCompositionProps;
  /** Sum of every scene's own frame count — authoritative over plan.durationSeconds * fps, which can drift a frame from per-scene rounding. */
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
};

/**
 * Everything PlanPreviewPlayer needs to play a VideoPlan, in one call.
 * `narrationAudioUrls` is a sceneId -> already-synthesized-audio-URL map —
 * there is no live TTS pipeline wired in yet (see
 * lib/audio/tts-provider-factory.ts), so it defaults to `{}`, which
 * correctly produces silent-but-timed audio props (see
 * lib/audio/plan-audio.ts): scene durations already account for
 * narration length, music/ducking data is fully computed, but no <Audio>
 * element renders until a real URL is supplied here.
 */
export function buildVideoPlanRenderData(
  plan: VideoPlan,
  assets: Asset[] = [],
  fps: number = AD_FPS,
  narrationAudioUrls: Readonly<Record<string, string>> = {},
  narrationTrims: NarrationTrimsBySceneId = {},
  autoVisuals: Readonly<Record<string, ResolvedSceneVisual>> = {},
  aiVideos: Readonly<Record<string, ResolvedSceneVideo>> = {},
): VideoPlanRenderData {
  // narrationTrims is passed here too (not just into buildPlanAudioProps
  // below) so a scene's real, ElevenLabs-measured narration duration —
  // whenever it's already known — sizes the scene itself, not just its
  // voice track. Otherwise the scene's own (and thus its narration
  // Sequence's) duration would still come from the pre-synthesis estimate,
  // and a real clip longer than that estimate would still get cut off right
  // at the transition into the next scene.
  const adaptedPlan = adaptSceneDurationsForNarration(plan, narrationTrims);
  const scenes = buildVideoPlanScenes(adaptedPlan, assets, fps, autoVisuals, aiVideos);
  const durationInFrames = scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
  const { width, height } = ASPECT_RATIO_DIMENSIONS[plan.aspectRatio];
  const audio = buildPlanAudioProps(adaptedPlan, narrationAudioUrls, fps, narrationTrims);

  return {
    compositionProps: { scenes, visualStyle: plan.visualStyle, palette: resolvePlanPalette(plan), dir: LOCALE_DIR[plan.language], audio },
    durationInFrames,
    fps,
    width,
    height,
  };
}
