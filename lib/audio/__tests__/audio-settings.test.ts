import { describe, expect, it } from "vitest";
import { resolveAudioSettings } from "@/lib/audio/audio-settings";
import type { AudioSettings } from "@/lib/ai/video-plan-schema";
import type { AdStyle } from "@/remotion/compositions/ad-types";

function makePlan(overrides: { visualStyle: AdStyle; audio?: AudioSettings | null; durationSeconds?: number }) {
  return {
    visualStyle: overrides.visualStyle,
    audio: overrides.audio ?? null,
    business: "Acme Co",
    videoTitle: "Acme Ad",
    durationSeconds: overrides.durationSeconds ?? 20,
    scenes: [{ transition: "fade" as const }, { transition: "fade" as const }],
  };
}

describe("resolveAudioSettings", () => {
  it("backward compatibility: derives sensible defaults from visualStyle when audio is null", () => {
    const luxury = resolveAudioSettings(makePlan({ visualStyle: "luxury" }));
    expect(luxury.voiceStyle).toBe("luxury");
    expect(luxury.narrationPace).toBe("slow");

    const fast = resolveAudioSettings(makePlan({ visualStyle: "fast" }));
    expect(fast.voiceStyle).toBe("energetic");
    expect(fast.narrationPace).toBe("fast");
  });

  it("always resolves musicEnabled to true by default when audio is null", () => {
    expect(resolveAudioSettings(makePlan({ visualStyle: "minimal" })).musicEnabled).toBe(true);
  });

  it("prefers the AI's own audio decision over the visualStyle default", () => {
    const audio: AudioSettings = {
      voiceGender: "male",
      voiceStyle: "playful",
      narrationPace: "fast",
      musicEnabled: false,
      musicStyle: "calm",
    };
    const resolved = resolveAudioSettings(makePlan({ visualStyle: "luxury", audio }));
    expect(resolved).toEqual(audio);
  });

  it("never throws for a partially-specified legacy audio object (defensive backward compatibility)", () => {
    const partial = { voiceGender: "male" } as unknown as AudioSettings;
    expect(() => resolveAudioSettings(makePlan({ visualStyle: "tech", audio: partial }))).not.toThrow();
    expect(resolveAudioSettings(makePlan({ visualStyle: "tech", audio: partial })).voiceGender).toBe("male");
  });

  it("is deterministic for the same plan", () => {
    const plan = makePlan({ visualStyle: "fun" });
    expect(resolveAudioSettings(plan)).toEqual(resolveAudioSettings(plan));
  });
});
