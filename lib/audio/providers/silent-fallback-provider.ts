import type { TtsProvider, TtsRequest, TtsResult } from "../types";
import { estimateNarrationSeconds } from "../narration-timing";

/**
 * The safe default when no real TTS provider is configured (see
 * ../tts-provider-factory.ts). Never fabricates audio — `audioUrl` is
 * always null, so the Remotion integration (lib/audio/plan-audio.ts) simply
 * renders that scene without a voice track (silent, visual-only) instead of
 * pretending a placeholder tone or beep is real AI-generated narration.
 * Its only real job is to supply the same deterministic duration estimate
 * every real provider is expected to land close to, so scene timing/sync
 * is fully testable and stable with zero network dependency.
 */
export class SilentFallbackTtsProvider implements TtsProvider {
  readonly id = "silent-fallback" as const;

  async synthesize(request: TtsRequest): Promise<TtsResult> {
    const durationSeconds = estimateNarrationSeconds(request.text, request.language, request.pace);
    return {
      audioUrl: null,
      durationSeconds,
      provider: "silent-fallback",
      cost: { characters: request.text.length, estimatedUsd: null },
    };
  }
}
