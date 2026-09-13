import "server-only";
import type { TtsProvider, TtsRequest, TtsResult } from "../types";
import { estimateNarrationSeconds } from "../narration-timing";
import { resolveElevenLabsVoiceId } from "./elevenlabs-voice-config";
import { ELEVENLABS_MULTILINGUAL_V2_RATE, estimateTtsCostUsd } from "../tts-pricing";
import { withElevenLabsRetry, type ElevenLabsAttemptResult } from "./elevenlabs-retry";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
/** Multilingual model — covers MOVO's Arabic and English narration with a single model id. Its cost rate lives in ../tts-pricing.ts (ELEVENLABS_MULTILINGUAL_V2_RATE), never inline here. */
const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
/** 1 initial try + up to 2 retries, short exponential backoff (400ms, 800ms) — see ./elevenlabs-retry.ts for why and which failures qualify. Bounded deliberately: this must recover from a transient rate/concurrency rejection within a user's real generation wait, not turn into an open-ended retry loop. */
const ELEVENLABS_MAX_ATTEMPTS = 3;
const ELEVENLABS_RETRY_BASE_DELAY_MS = 400;

/**
 * MOVO's preferred production TTS provider (see ../tts-provider-factory.ts
 * for selection order). Calls the official ElevenLabs text-to-speech REST
 * API directly (no SDK dependency needed for one endpoint) using
 * ELEVENLABS_API_KEY, which is read only here, server-side, and never sent
 * to the browser.
 *
 * The voice id is resolved per-language via
 * ./elevenlabs-voice-config.ts's resolveElevenLabsVoiceId — never guessed
 * from `request.gender`/`request.style` — those fields are still carried
 * through on every TtsRequest (preserved for the other providers and for
 * future multi-voice-per-language support), but until MOVO configures more
 * than one ElevenLabs voice per language, every request in that language
 * uses the same configured voice regardless of gender/style.
 *
 * Like ../providers/openai-tts-provider.ts, returns real synthesized audio
 * as a base64 `data:` URL (MOVO has no audio storage/CDN layer yet) and
 * reports `durationSeconds` as the text-based estimate rather than a probe
 * of the returned audio bytes, so every provider agrees on the same number
 * scene sync is built around — see ../narration-timing.ts's docstring.
 */
export class ElevenLabsTtsProvider implements TtsProvider {
  readonly id = "elevenlabs" as const;

  async synthesize(request: TtsRequest): Promise<TtsResult> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");

    const voiceId = resolveElevenLabsVoiceId(request.language);

    const buffer = await withElevenLabsRetry<Buffer>(
      async (): Promise<ElevenLabsAttemptResult<Buffer>> => {
        const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: request.text,
            model_id: ELEVENLABS_MODEL_ID,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          return {
            ok: false,
            status: response.status,
            error: new Error(`ElevenLabs TTS request failed (${response.status} ${response.statusText}): ${detail.slice(0, 300)}`),
          };
        }

        return { ok: true, value: Buffer.from(await response.arrayBuffer()) };
      },
      { maxAttempts: ELEVENLABS_MAX_ATTEMPTS, baseDelayMs: ELEVENLABS_RETRY_BASE_DELAY_MS },
    );

    const audioUrl = `data:audio/mpeg;base64,${buffer.toString("base64")}`;

    return {
      audioUrl,
      durationSeconds: estimateNarrationSeconds(request.text, request.language, request.pace),
      provider: "elevenlabs",
      cost: {
        characters: request.text.length,
        estimatedUsd: estimateTtsCostUsd(request.text.length, ELEVENLABS_MULTILINGUAL_V2_RATE),
      },
    };
  }
}
