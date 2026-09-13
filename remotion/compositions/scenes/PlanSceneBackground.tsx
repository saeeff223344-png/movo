import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";
import type { AdPalette } from "../ad-styles";
import type { SceneType } from "@/lib/types/video";
import { FullBleedSceneMedia, PatternLayer, type BackgroundLayerMotion } from "./plan-primitives";
import type { MotionProfile } from "./motion-profiles";

/** Ambient decoration (orbs/particles) is kept alive over a full-bleed photo too (True Motion Graphics Engine phase, Requirement 7: nothing should have LESS ambient motion than a plain-gradient scene) — but toned down so it reads as a soft accent, never competes with the photo itself. */
const DECORATION_OPACITY_OVER_IMAGE = 0.4;

/**
 * Fills the frame for every Phase 2 AI-plan scene. Two modes:
 *  - No `imageUrl` (or a purpose whose own layout already renders its
 *    image as a foreground card — see plan-scene-layouts.tsx's
 *    LAYOUTS_WITH_OWN_IMAGE): the original palette gradient + style-specific
 *    ambient pattern (grid/lines/bokeh/soft) + scene-purpose-appropriate
 *    glow arrangement — completely unchanged from before the Automatic
 *    Visual Assets phase.
 *  - `imageUrl` present for a purpose with no own image handling (hook,
 *    kinetic-headline, price-scene, discount-badge, feature-list,
 *    cta-scene): a full-bleed Ken-Burns photo (now with a real entrance +
 *    dampened participation in the scene's own transition — see
 *    FullBleedSceneImage) + readability scrim, with the SAME ambient
 *    pattern layer kept alive at reduced opacity on top, instead of
 *    replacing it outright — a photo scene keeps just as much continuous
 *    ambient motion as a gradient one. The palette's own gradient still
 *    paints first underneath, so a slow-loading image never flashes a
 *    blank frame.
 */
export function PlanSceneBackground({
  palette,
  scenePurpose,
  imageUrl,
  videoUrl,
  videoDurationInFrames,
  sceneId,
  durationInFrames,
  backgroundMotion,
  motionProfile,
  children,
}: {
  palette: AdPalette;
  scenePurpose?: SceneType;
  imageUrl?: string;
  /** Dynamic AI Video Director phase: the scene's resolved AI-generated clip (Requirement 11), if any — takes over the full-bleed slot entirely from `imageUrl` when present (see FullBleedSceneMedia). */
  videoUrl?: string;
  videoDurationInFrames?: number;
  sceneId?: string;
  durationInFrames?: number;
  backgroundMotion?: BackgroundLayerMotion;
  motionProfile?: MotionProfile;
  children: ReactNode;
}) {
  const hasMedia = Boolean((imageUrl || videoUrl) && sceneId && durationInFrames !== undefined);

  return (
    <AbsoluteFill style={{ background: palette.background, overflow: "hidden" }}>
      {hasMedia && (
        <FullBleedSceneMedia
          src={imageUrl ?? ""}
          videoSrc={videoUrl}
          videoDurationInFrames={videoDurationInFrames}
          sceneId={sceneId!}
          durationInFrames={durationInFrames!}
          backgroundMotion={backgroundMotion}
          intensity={motionProfile?.intensity}
          accentColor={palette.glow}
        />
      )}
      <div style={{ opacity: hasMedia ? DECORATION_OPACITY_OVER_IMAGE : 1 }}>
        <PatternLayer palette={palette} scenePurpose={scenePurpose} density={motionProfile?.decorationDensity} />
      </div>
      {children}
    </AbsoluteFill>
  );
}
