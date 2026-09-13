import { describe, expect, it } from "vitest";
import { VOICE_CATALOG, resolveVoiceProfile } from "@/lib/audio/voice-catalog";
import { VOICE_GENDERS, VOICE_STYLES } from "@/lib/audio/types";

describe("resolveVoiceProfile", () => {
  it("returns an exact (gender, style) match for every combination the catalog defines", () => {
    for (const gender of VOICE_GENDERS) {
      for (const style of VOICE_STYLES) {
        const profile = resolveVoiceProfile(gender, style);
        expect(profile.gender).toBe(gender);
        expect(profile.style).toBe(style);
      }
    }
  });

  it("is deterministic", () => {
    expect(resolveVoiceProfile("male", "warm")).toEqual(resolveVoiceProfile("male", "warm"));
  });

  it("every catalog entry maps to a non-empty OpenAI voice id", () => {
    for (const profile of VOICE_CATALOG) {
      expect(profile.providerVoiceIds.openai.length).toBeGreaterThan(0);
    }
  });

  it("has exactly one catalog entry per (gender, style) combination", () => {
    expect(VOICE_CATALOG).toHaveLength(VOICE_GENDERS.length * VOICE_STYLES.length);
  });
});
