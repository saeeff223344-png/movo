import { describe, expect, it } from "vitest";
import { PLAN_PREVIEW_PLAYER_AUDIO_CONFIG } from "@/components/remotion/plan-preview-player-config";

describe("PLAN_PREVIEW_PLAYER_AUDIO_CONFIG", () => {
  it("starts muted so autoplay can never be silently blocked by the browser", () => {
    expect(PLAN_PREVIEW_PLAYER_AUDIO_CONFIG.autoPlay).toBe(true);
    expect(PLAN_PREVIEW_PLAYER_AUDIO_CONFIG.initiallyMuted).toBe(true);
  });

  it("always shows the volume control so the user has a visible way to enable narration", () => {
    expect(PLAN_PREVIEW_PLAYER_AUDIO_CONFIG.showVolumeControls).toBe(true);
  });
});
