import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import type { PlanCompositionAudioProps } from "@/remotion/compositions/plan-types";
import { secondsToFrames } from "@/lib/ai/scene-timing";
import { computeSceneAudioTimings, type NarrationTrimsBySceneId } from "./scene-audio-sync";
import { resolveAudioSettings } from "./audio-settings";
import { getMusicTrack } from "./music-catalog";
import { DEFAULT_DUCKING_CONFIG } from "./music-ducking";

/**
 * Turns an (already narration-duration-adapted — see
 * scene-audio-sync.ts's adaptSceneDurationsForNarration, which
 * lib/ai/plan-to-scenes.ts always applies first) VideoPlan into the audio
 * data PlanComposition needs: absolute-frame narration intervals for the
 * music ducking envelope, one voice-track Sequence per scene that actually
 * has synthesized audio, and the background music track (or null — MOVO
 * never renders a placeholder tone standing in for real licensed music).
 *
 * `narrationAudioUrls` is a sceneId -> playable-URL map for narration that
 * has already been synthesized elsewhere — there is no live synthesis
 * pipeline wired into plan-to-scenes.ts yet (see
 * ./tts-provider-factory.ts's docstring), so pass `{}` to get correct,
 * audio-free timing/ducking data with zero network dependency, exactly
 * like today's default. Ducking only ever activates for a scene that
 * actually has a URL here — there is nothing to duck the music for
 * otherwise.
 *
 * `narrationTrims` is threaded into computeSceneAudioTimings below too, so
 * every timing this function derives (ducking intervals, lead-in, and the
 * voice track's own Sequence length further down) is based on the same
 * real, ElevenLabs-measured narration duration `plan` was already adapted
 * with (see scene-audio-sync.ts's adaptSceneDurationsForNarration) — never
 * a second, possibly-inconsistent recomputation of the estimate.
 */
export function buildPlanAudioProps(
  plan: VideoPlan,
  narrationAudioUrls: Readonly<Record<string, string>>,
  fps: number,
  narrationTrims: NarrationTrimsBySceneId = {},
): PlanCompositionAudioProps {
  const timings = computeSceneAudioTimings(plan, narrationTrims);
  const totalFrames = timings.length > 0 ? secondsToFrames(timings[timings.length - 1].end, fps) : 0;

  const narrationIntervals = timings
    .filter((t) => t.hasNarration && Boolean(narrationAudioUrls[t.sceneId]))
    .map((t) => ({
      startFrame: secondsToFrames(t.start + t.narrationStart, fps),
      endFrame: secondsToFrames(t.start + t.narrationEnd, fps),
    }));

  const voiceTracks = timings.flatMap((t) => {
    const src = narrationAudioUrls[t.sceneId];
    if (!t.hasNarration || !src) return [];
    const startFrame = secondsToFrames(t.start + t.narrationStart, fps);
    const trim = narrationTrims[t.sceneId];
    // The surrounding <Sequence> (PlanComposition.tsx) must stay mounted for
    // the FULL real trimmed slice, never just the pre-synthesis estimate —
    // otherwise Remotion unmounts the <Audio> element (and its endAt) before
    // the real, longer clip finishes, chopping the sentence off mid-word
    // right at the scene boundary. `t.narrationDuration` already reflects the
    // real duration when `trim` came from the same map passed into
    // computeSceneAudioTimings above, but computing it again directly from
    // the trim here keeps this guarantee explicit and independently correct.
    const sequenceDurationSeconds = trim ? Math.max(0, trim.trimEndSeconds - trim.trimStartSeconds) : t.narrationDuration;
    const durationFrames = Math.max(1, Math.min(secondsToFrames(sequenceDurationSeconds, fps), totalFrames - startFrame));
    if (!trim) return [{ src, startFrame, durationFrames }];
    return [
      {
        src,
        startFrame,
        durationFrames,
        // A trim offset of exactly 0 is a real, meaningful frame 0 — unlike
        // scene/clip durations (secondsToFrames's job), an offset must never
        // be floored up to 1, so this rounds directly rather than reusing it.
        trimStartFrames: Math.max(0, Math.round(trim.trimStartSeconds * fps)),
        trimEndFrames: Math.max(0, Math.round(trim.trimEndSeconds * fps)),
      },
    ];
  });

  const settings = resolveAudioSettings(plan);
  const track = settings.musicEnabled ? getMusicTrack(settings.musicStyle) : null;
  const music =
    track && track.assetUrl
      ? {
          src: track.assetUrl,
          baseVolume: track.baseVolume,
          duckedVolume: track.baseVolume * DEFAULT_DUCKING_CONFIG.duckFactor,
          rampFrames: Math.max(1, secondsToFrames(DEFAULT_DUCKING_CONFIG.rampSeconds, fps)),
        }
      : null;

  return { music, narrationIntervals, voiceTracks };
}
