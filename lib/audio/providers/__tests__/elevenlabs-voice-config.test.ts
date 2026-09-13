import { afterEach, describe, expect, it } from "vitest";
import {
  resolveElevenLabsVoiceId,
  resolveNarrationDialectPolicy,
  ElevenLabsVoiceNotConfiguredError,
  ELEVENLABS_VOICE_SLOTS,
  type ElevenLabsVoiceSlot,
} from "@/lib/audio/providers/elevenlabs-voice-config";

const ORIGINAL_ARABIC_VOICE_ID = process.env.ELEVENLABS_ARABIC_VOICE_ID;
const ORIGINAL_API_KEY = process.env.ELEVENLABS_API_KEY;
const ORIGINAL_TEST_SLOT_VOICE_ID = process.env.ELEVENLABS_TEST_SLOT_VOICE_ID;

afterEach(() => {
  if (ORIGINAL_ARABIC_VOICE_ID === undefined) delete process.env.ELEVENLABS_ARABIC_VOICE_ID;
  else process.env.ELEVENLABS_ARABIC_VOICE_ID = ORIGINAL_ARABIC_VOICE_ID;

  if (ORIGINAL_API_KEY === undefined) delete process.env.ELEVENLABS_API_KEY;
  else process.env.ELEVENLABS_API_KEY = ORIGINAL_API_KEY;

  if (ORIGINAL_TEST_SLOT_VOICE_ID === undefined) delete process.env.ELEVENLABS_TEST_SLOT_VOICE_ID;
  else process.env.ELEVENLABS_TEST_SLOT_VOICE_ID = ORIGINAL_TEST_SLOT_VOICE_ID;
});

describe("resolveElevenLabsVoiceId", () => {
  it("throws ElevenLabsVoiceNotConfiguredError for Arabic when the env var is unset", () => {
    delete process.env.ELEVENLABS_ARABIC_VOICE_ID;
    expect(() => resolveElevenLabsVoiceId("ar")).toThrow(ElevenLabsVoiceNotConfiguredError);
  });

  it("throws ElevenLabsVoiceNotConfiguredError for Arabic when the env var is only whitespace", () => {
    process.env.ELEVENLABS_ARABIC_VOICE_ID = "   ";
    expect(() => resolveElevenLabsVoiceId("ar")).toThrow(ElevenLabsVoiceNotConfiguredError);
  });

  it("never fabricates or guesses a voice id from the display name", () => {
    delete process.env.ELEVENLABS_ARABIC_VOICE_ID;
    try {
      resolveElevenLabsVoiceId("ar");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ElevenLabsVoiceNotConfiguredError);
      expect((error as Error).message).not.toContain("Haytham");
    }
  });

  it("returns the exact configured voice id once ELEVENLABS_ARABIC_VOICE_ID is set", () => {
    process.env.ELEVENLABS_ARABIC_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
    expect(resolveElevenLabsVoiceId("ar")).toBe("21m00Tcm4TlvDq8ikWAM");
  });

  it("trims surrounding whitespace from the configured voice id", () => {
    process.env.ELEVENLABS_ARABIC_VOICE_ID = "  21m00Tcm4TlvDq8ikWAM  ";
    expect(resolveElevenLabsVoiceId("ar")).toBe("21m00Tcm4TlvDq8ikWAM");
  });

  it("throws for English today — no slot is configured yet (architecture is ready to add one)", () => {
    expect(() => resolveElevenLabsVoiceId("en")).toThrow(ElevenLabsVoiceNotConfiguredError);
  });

  it("the error names the language it failed to resolve", () => {
    delete process.env.ELEVENLABS_ARABIC_VOICE_ID;
    try {
      resolveElevenLabsVoiceId("ar");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as ElevenLabsVoiceNotConfiguredError).language).toBe("ar");
    }
  });

  it("is deterministic: the same env state always resolves the same way", () => {
    process.env.ELEVENLABS_ARABIC_VOICE_ID = "voice-abc";
    expect(resolveElevenLabsVoiceId("ar")).toBe(resolveElevenLabsVoiceId("ar"));
  });

  it("exposes exactly one voice slot today, for Arabic", () => {
    expect(ELEVENLABS_VOICE_SLOTS).toHaveLength(1);
    expect(ELEVENLABS_VOICE_SLOTS[0].language).toBe("ar");
    expect(ELEVENLABS_VOICE_SLOTS[0].envVar).toBe("ELEVENLABS_ARABIC_VOICE_ID");
  });

  it("Haytham's slot is configured for Egyptian narration", () => {
    expect(ELEVENLABS_VOICE_SLOTS[0].narrationDialect).toBe("egyptian");
  });
});

describe("resolveNarrationDialectPolicy", () => {
  it("(a) resolves Egyptian for Arabic once Haytham (ELEVENLABS_API_KEY + ELEVENLABS_ARABIC_VOICE_ID) is configured", () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    process.env.ELEVENLABS_ARABIC_VOICE_ID = "haytham-voice-id";
    expect(resolveNarrationDialectPolicy("ar")).toBe("egyptian");
  });

  it("falls back to neutral when ELEVENLABS_API_KEY is not set, even if the voice id is", () => {
    delete process.env.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_ARABIC_VOICE_ID = "haytham-voice-id";
    expect(resolveNarrationDialectPolicy("ar")).toBe("neutral");
  });

  it("falls back to neutral when the language's voice id is not configured, even if the API key is", () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    delete process.env.ELEVENLABS_ARABIC_VOICE_ID;
    expect(resolveNarrationDialectPolicy("ar")).toBe("neutral");
  });

  it("falls back to neutral when the language's voice id is only whitespace", () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    process.env.ELEVENLABS_ARABIC_VOICE_ID = "   ";
    expect(resolveNarrationDialectPolicy("ar")).toBe("neutral");
  });

  it("(c) never resolves a dialect for English — no English slot exists today", () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    process.env.ELEVENLABS_ARABIC_VOICE_ID = "haytham-voice-id";
    expect(resolveNarrationDialectPolicy("en")).toBe("neutral");
  });

  it("(d) a future Arabic voice slot can declare its own, different dialect policy with no change to this function", () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    delete process.env.ELEVENLABS_ARABIC_VOICE_ID; // the real Haytham slot must play no part in this scenario
    process.env.ELEVENLABS_TEST_SLOT_VOICE_ID = "future-saudi-voice-id";

    const futureSaudiSlot: ElevenLabsVoiceSlot = {
      language: "ar",
      label: "Test-only future Saudi voice",
      envVar: "ELEVENLABS_TEST_SLOT_VOICE_ID",
      narrationDialect: "saudi",
    };

    expect(resolveNarrationDialectPolicy("ar", [futureSaudiSlot])).toBe("saudi");
    // The real, production slot list is untouched by this hypothetical scenario.
    expect(resolveNarrationDialectPolicy("ar")).toBe("neutral");
  });
});
