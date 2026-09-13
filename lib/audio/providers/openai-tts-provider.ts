import "server-only";
import { createOpenAIClient } from "@/lib/ai/openai-client";
import type { TtsProvider, TtsRequest, TtsResult } from "../types";
import { resolveVoiceProfile } from "../voice-catalog";
import { estimateNarrationSeconds } from "../narration-timing";
import { OPENAI_TTS_RATE, estimateTtsCostUsd } from "../tts-pricing";

const OPENAI_TTS_MODEL = "gpt-4o-mini-tts";

/**
 * MOVO's fallback/alternative AI TTS provider (ElevenLabs is preferred —
 * see ../providers/elevenlabs-tts-provider.ts and
 * ../tts-provider-factory.ts's selection order), built on the same OpenAI
 * client + OPENAI_API_KEY the video planner already requires
 * (lib/ai/openai-client.ts) — no second vendor or API key to configure.
 * Included in the provider chain automatically whenever that key is set,
 * and used whenever ElevenLabs isn't configured or its call fails.
 *
 * Returns real synthesized speech as a base64 `data:` URL rather than a
 * storage URL: MOVO has no audio storage/CDN layer yet (out of scope for
 * this phase — see the Phase 5 report's limitations), and a data URL is a
 * genuinely playable src for both the Remotion Player preview and
 * server-side rendering without inventing one.
 *
 * `durationSeconds` is still the text-based estimate from
 * ../narration-timing.ts, not a probe of the real returned audio bytes.
 * Decoding exact MP3 duration server-side would need an audio-parsing
 * dependency (e.g. ffprobe) this repo doesn't have yet; every provider
 * (real or fallback) intentionally agrees on the same estimate so scene
 * timing/sync stays deterministic and provider-independent. A future pass
 * can reconcile against the real decoded duration once that dependency
 * exists.
 */
export class OpenAiTtsProvider implements TtsProvider {
  readonly id = "openai" as const;

  async synthesize(request: TtsRequest): Promise<TtsResult> {
    const client = createOpenAIClient();
    const voice = resolveVoiceProfile(request.gender, request.style);

    const response = await client.audio.speech.create({
      model: OPENAI_TTS_MODEL,
      voice: voice.providerVoiceIds.openai,
      input: request.text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const audioUrl = `data:audio/mpeg;base64,${buffer.toString("base64")}`;

    return {
      audioUrl,
      durationSeconds: estimateNarrationSeconds(request.text, request.language, request.pace),
      provider: "openai",
      cost: {
        characters: request.text.length,
        estimatedUsd: estimateTtsCostUsd(request.text.length, OPENAI_TTS_RATE),
      },
    };
  }
}
