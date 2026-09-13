import { afterEach, describe, expect, it } from "vitest";
import { getMaxAiVideoScenes, getAiVideoDurationSeconds } from "@/lib/video-director/video-director-config";

const ORIGINAL_MAX = process.env.MOVO_MAX_AI_VIDEO_SCENES;
const ORIGINAL_DURATION = process.env.MOVO_AI_VIDEO_DURATION_SECONDS;

afterEach(() => {
  if (ORIGINAL_MAX === undefined) delete process.env.MOVO_MAX_AI_VIDEO_SCENES;
  else process.env.MOVO_MAX_AI_VIDEO_SCENES = ORIGINAL_MAX;
  if (ORIGINAL_DURATION === undefined) delete process.env.MOVO_AI_VIDEO_DURATION_SECONDS;
  else process.env.MOVO_AI_VIDEO_DURATION_SECONDS = ORIGINAL_DURATION;
});

describe("getMaxAiVideoScenes", () => {
  it("defaults to 2 when unset", () => {
    delete process.env.MOVO_MAX_AI_VIDEO_SCENES;
    expect(getMaxAiVideoScenes()).toBe(2);
  });

  it("honors a valid positive integer override", () => {
    process.env.MOVO_MAX_AI_VIDEO_SCENES = "4";
    expect(getMaxAiVideoScenes()).toBe(4);
  });

  it("falls back to the default for a non-numeric, zero, or negative value", () => {
    process.env.MOVO_MAX_AI_VIDEO_SCENES = "not-a-number";
    expect(getMaxAiVideoScenes()).toBe(2);
    process.env.MOVO_MAX_AI_VIDEO_SCENES = "0";
    expect(getMaxAiVideoScenes()).toBe(2);
    process.env.MOVO_MAX_AI_VIDEO_SCENES = "-1";
    expect(getMaxAiVideoScenes()).toBe(2);
  });
});

describe("getAiVideoDurationSeconds", () => {
  it("defaults to 5 when unset", () => {
    delete process.env.MOVO_AI_VIDEO_DURATION_SECONDS;
    expect(getAiVideoDurationSeconds()).toBe(5);
  });

  it("honors a valid override within Runway's 2-10 range", () => {
    process.env.MOVO_AI_VIDEO_DURATION_SECONDS = "8";
    expect(getAiVideoDurationSeconds()).toBe(8);
  });

  it("falls back to the default outside the valid range", () => {
    process.env.MOVO_AI_VIDEO_DURATION_SECONDS = "1";
    expect(getAiVideoDurationSeconds()).toBe(5);
    process.env.MOVO_AI_VIDEO_DURATION_SECONDS = "11";
    expect(getAiVideoDurationSeconds()).toBe(5);
  });

  it("falls back to the default for a non-integer value", () => {
    process.env.MOVO_AI_VIDEO_DURATION_SECONDS = "5.5";
    expect(getAiVideoDurationSeconds()).toBe(5);
  });
});
