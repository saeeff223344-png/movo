"use client";

import { Player } from "@remotion/player";
import { PlanComposition } from "@/remotion/compositions/PlanComposition";
import type { VideoPlanRenderData } from "@/lib/ai/plan-to-scenes";
import { PLAN_PREVIEW_PLAYER_AUDIO_CONFIG } from "./plan-preview-player-config";

/**
 * Plays a real AI VideoPlan (see lib/ai/plan-to-scenes.ts) — mirrors
 * AdPreviewPlayer.tsx's setup, sized dynamically instead of fixed to the
 * 9:16 demo.
 *
 * Audio: see plan-preview-player-config.ts's docstring — starts muted on
 * purpose (never relies on the browser allowing unmuted autoplay, which
 * @remotion/player silently falls back to muted-with-no-app-visible-signal
 * when blocked) and always shows the volume control so the user has an
 * obvious, one-click way to turn the real ElevenLabs narration on.
 *
 * Sizing: pass ONLY `width` in `style`, never `height` too. @remotion/player
 * special-cases this (see calculatePlayerSize in
 * @remotion/player/dist/.../calculate-player-size.js): with just one
 * dimension given, it injects its own `aspectRatio: "W/H"` CSS onto its
 * outer element, so the browser computes the height natively from the
 * composition's real aspect ratio. Giving both width AND height (as the
 * previous version did) skips that branch entirely — Player then falls
 * back to raw compositionWidth/compositionHeight pixels internally while
 * the outer box is forced to 100%/100% of whatever the parent happens to
 * be at that moment, which frequently doesn't match the composition's
 * ratio. The result is exactly what showed up in testing: content
 * clipped at normal size, and *more* of it revealed on zoom/resize, since
 * the mismatch between the outer box and Player's internal scale
 * calculation changes with every reflow. The parent (ResultView.tsx)
 * only needs to bound the width — Player supplies the correct height via
 * native `aspect-ratio` CSS.
 */
export function PlanPreviewPlayer({ data, className = "" }: { data: VideoPlanRenderData; className?: string }) {
  return (
    // direction: "ltr" below is required on this Arabic (RTL) site: Player's internal
    // container centers its scaled canvas via an unset `left`/negative `margin-left`,
    // whose browser-resolved static position depends on inherited CSS `direction`. Under
    // the page's dir="rtl" that resolves the canvas entirely outside its own clipped
    // container, leaving only the wrapper's black background visible. Forcing `ltr` here
    // touches only Player's internal layout divs — every scene inside PlanComposition
    // sets its own explicit `dir` (plan-primitives.tsx's SafeArea), so Arabic on-screen
    // text is unaffected.
    <Player
      component={PlanComposition}
      inputProps={data.compositionProps}
      durationInFrames={data.durationInFrames}
      fps={data.fps}
      compositionWidth={data.width}
      compositionHeight={data.height}
      style={{ width: "100%", direction: "ltr" }}
      className={className}
      loop
      controls
      {...PLAN_PREVIEW_PLAYER_AUDIO_CONFIG}
    />
  );
}
