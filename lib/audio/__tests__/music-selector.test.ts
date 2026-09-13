import { describe, expect, it } from "vitest";
import { selectMusicStyle } from "@/lib/audio/music-selector";
import type { SceneTransition } from "@/lib/types/video";
import type { AdStyle } from "@/remotion/compositions/ad-types";

function makePlan(overrides: {
  visualStyle: AdStyle;
  durationSeconds?: number;
  business?: string;
  videoTitle?: string;
  transitions?: SceneTransition[];
}) {
  return {
    visualStyle: overrides.visualStyle,
    durationSeconds: overrides.durationSeconds ?? 20,
    business: overrides.business ?? "Acme Co",
    videoTitle: overrides.videoTitle ?? "Acme Ad",
    scenes: (overrides.transitions ?? ["fade", "fade", "fade"]).map((transition) => ({ transition })),
  };
}

describe("selectMusicStyle", () => {
  it("is deterministic for the same plan", () => {
    const plan = makePlan({ visualStyle: "luxury" });
    expect(selectMusicStyle(plan)).toBe(selectMusicStyle(plan));
  });

  it("only ever picks a style compatible with the plan's visualStyle", () => {
    expect(["luxury", "cinematic", "emotional"]).toContain(selectMusicStyle(makePlan({ visualStyle: "luxury", durationSeconds: 25 })));
    expect(["minimal", "calm"]).toContain(selectMusicStyle(makePlan({ visualStyle: "minimal", durationSeconds: 25 })));
    expect(["technology", "modern"]).toContain(selectMusicStyle(makePlan({ visualStyle: "tech", durationSeconds: 25 })));
  });

  it("biases toward the highest-energy candidate for a short (<=10s), urgent ad", () => {
    // "luxury" candidates are luxury(0.3), cinematic(0.6), emotional(0.35) — cinematic has the highest energy.
    expect(selectMusicStyle(makePlan({ visualStyle: "luxury", durationSeconds: 8 }))).toBe("cinematic");
  });

  it("biases toward the highest-energy candidate when most scenes use fast transitions", () => {
    const fastTransitions: SceneTransition[] = ["fast-cut", "whip-left", "flash", "scale-pop"];
    expect(selectMusicStyle(makePlan({ visualStyle: "luxury", durationSeconds: 25, transitions: fastTransitions }))).toBe("cinematic");
  });

  it("does not treat a calm, non-urgent ad as urgent", () => {
    const style = selectMusicStyle(makePlan({ visualStyle: "luxury", durationSeconds: 30, transitions: ["luxury-fade", "fade", "wipe"] }));
    expect(["luxury", "cinematic", "emotional"]).toContain(style);
  });

  it("uses the plan's own business/title to deterministically break ties between non-urgent candidates", () => {
    const first = selectMusicStyle(makePlan({ visualStyle: "luxury", durationSeconds: 30, business: "Business A", videoTitle: "Ad A" }));
    const second = selectMusicStyle(makePlan({ visualStyle: "luxury", durationSeconds: 30, business: "Business A", videoTitle: "Ad A" }));
    expect(first).toBe(second);
  });
});
