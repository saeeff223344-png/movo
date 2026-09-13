import { describe, expect, it } from "vitest";
import { TRANSITION_FAMILY } from "@/lib/ai/transition-families";
import { SCENE_TRANSITIONS } from "@/lib/ai/video-plan-schema";

describe("TRANSITION_FAMILY", () => {
  it("assigns a family to every transition the schema accepts", () => {
    for (const transition of SCENE_TRANSITIONS) {
      expect(TRANSITION_FAMILY[transition]).toBeDefined();
    }
  });

  it("groups same-direction variants into the same family", () => {
    expect(TRANSITION_FAMILY["push-left"]).toBe(TRANSITION_FAMILY["push-right"]);
    expect(TRANSITION_FAMILY["zoom-in"]).toBe(TRANSITION_FAMILY["zoom-out"]);
    expect(TRANSITION_FAMILY["whip-left"]).toBe(TRANSITION_FAMILY["whip-right"]);
  });

  it("keeps visually distinct transitions in different families", () => {
    expect(TRANSITION_FAMILY["zoom-in"]).not.toBe(TRANSITION_FAMILY["push-left"]);
    expect(TRANSITION_FAMILY.wipe).not.toBe(TRANSITION_FAMILY.spin);
  });
});
