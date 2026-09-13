import "server-only";
import type { NarrationLanguage } from "../types";
import type { CharacterAlignment } from "../continuous-narration";
import { resolveElevenLabsVoiceId } from "./elevenlabs-voice-config";
import { ELEVENLABS_MULTILINGUAL_V2_RATE, estimateTtsCostUsd } from "../tts-pricing";
import { withElevenLabsRetry, type ElevenLabsAttemptResult } from "./elevenlabs-retry";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
const ELEVENLABS_MAX_ATTEMPTS = 3;
const ELEVENLABS_RETRY_BASE_DELAY_MS = 400;

export type ContinuousSynthesizeResult =
  | { ok: true; audioUrl: string; alignment: CharacterAlignment; characters: number; estimatedUsd: number | null }
  | { ok: false; error: string };

type ElevenLabsTimestampsResponse = {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
};

/**
 * MOVO's continuous-narration synthesis call (Visual Quality Upgrade
 * phase): the same ElevenLabs voice/model as ./elevenlabs-tts-provider.ts,
 * but the "with timestamps" endpoint, over the WHOLE video's script in one
 * request — see ../continuous-narration.ts's docstring for why this exists.
 * Same bounded-retry policy as the per-scene provider (a single transient
 * rate-limit rejection gets a short chance to recover); any other failure
 * (missing key/voice, malformed response, exhausted retries) resolves to
 * `{ ok: false }` rather than throwing, so lib/audio/plan-narration.ts's
 * synthesizePlanNarrationContinuous can fall back to the proven per-scene
 * pipeline instead of losing the video's narration entirely.
 */
export async function synthesizeElevenLabsContinuous(fullText: string, language: NarrationLanguage): Promise<ContinuousSynthesizeResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { ok: false, error: "ELEVENLABS_API_KEY is not set." };

  let voiceId: string;
  try {
    voiceId = resolveElevenLabsVoiceId(language);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No ElevenLabs voice configured." };
  }

  try {
    const response = await withElevenLabsRetry<ElevenLabsTimestampsResponse>(
      async (): Promise<ElevenLabsAttemptResult<ElevenLabsTimestampsResponse>> => {
        const res = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}/with-timestamps`, {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            text: fullText,
            model_id: ELEVENLABS_MODEL_ID,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          return {
            ok: false,
            status: res.status,
            error: new Error(`ElevenLabs with-timestamps request failed (${res.status} ${res.statusText}): ${detail.slice(0, 300)}`),
          };
        }

        return { ok: true, value: (await res.json()) as ElevenLabsTimestampsResponse };
      },
      { maxAttempts: ELEVENLABS_MAX_ATTEMPTS, baseDelayMs: ELEVENLABS_RETRY_BASE_DELAY_MS },
    );

    if (!response.alignment?.characters?.length) {
      return { ok: false, error: "ElevenLabs with-timestamps response had no character alignment." };
    }

    return {
      ok: true,
      audioUrl: `data:audio/mpeg;base64,${response.audio_base64}`,
      alignment: {
        characters: response.alignment.characters,
        characterStartTimesSeconds: response.alignment.character_start_times_seconds,
        characterEndTimesSeconds: response.alignment.character_end_times_seconds,
      },
      characters: fullText.length,
      estimatedUsd: estimateTtsCostUsd(fullText.length, ELEVENLABS_MULTILINGUAL_V2_RATE),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "ElevenLabs continuous synthesis failed." };
  }
}
