import "server-only";
import { ElevenLabsTtsProvider } from "./providers/elevenlabs-tts-provider";
import { OpenAiTtsProvider } from "./providers/openai-tts-provider";
import { SilentFallbackTtsProvider } from "./providers/silent-fallback-provider";
import { synthesizeWithFallback } from "./tts-fallback";
import type { TtsProvider, TtsRequest, TtsResult } from "./types";

/**
 * Builds the real provider chain, in production-preference order:
 * ElevenLabs (MOVO's selected production TTS provider) first when
 * ELEVENLABS_API_KEY is configured, OpenAI next when OPENAI_API_KEY is
 * configured (kept as a fallback/alternative — never removed), and the
 * silent dev provider always last as the guaranteed final entry, so the
 * chain is never empty and synthesizeNarration below can never reject.
 *
 * Nothing else in the codebase should import a concrete provider class
 * directly — always go through this factory (or synthesizeNarration),
 * so adding/reordering/swapping a provider later is a one-file change.
 */
export function getTtsProviderChain(): TtsProvider[] {
  const chain: TtsProvider[] = [];
  if (process.env.ELEVENLABS_API_KEY) chain.push(new ElevenLabsTtsProvider());
  if (process.env.OPENAI_API_KEY) chain.push(new OpenAiTtsProvider());
  chain.push(new SilentFallbackTtsProvider());
  return chain;
}

/**
 * The single best-configured provider, for callers that only want one
 * (e.g. to report to the user which provider is currently active). Most
 * actual synthesis should prefer synthesizeNarration instead, which also
 * automatically falls back if this provider's call fails.
 */
export function getTtsProvider(): TtsProvider {
  return getTtsProviderChain()[0];
}

/**
 * The real, server-only entry point for turning one narration request into
 * audio: walks the production provider chain (ElevenLabs -> OpenAI ->
 * silent fallback) via ./tts-fallback.ts's synthesizeWithFallback, so a
 * failure in the preferred provider (e.g. Haytham's voice id isn't
 * configured yet for Arabic, or ElevenLabs is down) transparently degrades
 * to the next one rather than failing the whole request. There is no live
 * caller wired into the generate flow yet (see the Phase 5/6 reports'
 * limitations) — this exists so that pipeline, once built, has correct
 * provider selection and fallback behavior on day one.
 */
export function synthesizeNarration(request: TtsRequest): Promise<TtsResult> {
  return synthesizeWithFallback(request, getTtsProviderChain());
}
