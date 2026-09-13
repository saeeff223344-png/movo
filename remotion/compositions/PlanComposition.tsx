import { Audio, Sequence } from "remotion";
import { AD_PALETTES } from "./ad-styles";
import { resolveScenePalette } from "./palette-resolution";
import type { PlanCompositionProps } from "./plan-types";
import { PlanScene } from "./scenes/PlanScene";
import { musicVolumeAtFrame } from "@/lib/audio/music-ducking";

/**
 * Renders a dynamic, AI-planned scene list (lib/ai/plan-to-scenes.ts) as a
 * sequence of Sequences — one per scene, back to back. Frame offsets are
 * computed here from each scene's own durationInFrames rather than trusted
 * from the AI's reported startTime, so scenes can never gap or overlap
 * regardless of any rounding drift in the plan.
 *
 * Phase 5 (Audio & Voice Sync Engine): `audio` (built by
 * lib/audio/plan-audio.ts) is optional, so a caller that never passes it
 * renders exactly as before — no <Audio> elements at all. The background
 * music <Audio> is never wrapped in its own <Sequence>, so it is
 * automatically bounded by the composition's own duration (Remotion simply
 * stops rendering past that point) — audio can never play outside the
 * video. Each voice track IS wrapped in a <Sequence> with an explicit,
 * pre-capped durationFrames (see plan-audio.ts), so a narration clip can
 * never spill past the composition's end either.
 */
export const PlanComposition: React.FC<PlanCompositionProps> = ({ scenes, visualStyle, palette: resolvedPalette, dir, audio }) => {
  const palette = resolvedPalette ?? AD_PALETTES[visualStyle];
  const music = audio?.music ?? null;
  const narrationIntervals = audio?.narrationIntervals ?? [];
  const voiceTracks = audio?.voiceTracks ?? [];

  let from = 0;
  return (
    <>
      {scenes.map((scene, i) => {
        const sequenceFrom = from;
        from += scene.durationInFrames;
        return (
          <Sequence key={scene.id} from={sequenceFrom} durationInFrames={scene.durationInFrames}>
            <PlanScene scene={scene} palette={resolveScenePalette(palette, scene.id)} dir={dir} visualStyle={visualStyle} isLast={i === scenes.length - 1} />
          </Sequence>
        );
      })}

      {music && (
        <Audio
          src={music.src}
          volume={(frame) => musicVolumeAtFrame(frame, narrationIntervals, music.baseVolume, music.duckedVolume, music.rampFrames)}
        />
      )}

      {voiceTracks.map((track, i) => (
        <Sequence key={`voice-${track.startFrame}-${i}`} from={track.startFrame} durationInFrames={track.durationFrames}>
          <Audio src={track.src} startFrom={track.trimStartFrames} endAt={track.trimEndFrames} />
        </Sequence>
      ))}
    </>
  );
};
