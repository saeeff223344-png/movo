import { describe, expect, it, vi } from "vitest";
import { runRunwayGeneration } from "@/lib/video-generation/providers/runway-video-provider";
import type { RunwayPollResult, RunwaySubmitResult, SubmitTaskFn, PollTaskFn, DownloadVideoFn } from "@/lib/video-generation/providers/runway-video-provider";
import type { GenerateVideoInput } from "@/lib/video-generation/types";

const INPUT: GenerateVideoInput = {
  imageDataUrl: "data:image/png;base64,ZmFrZQ==",
  motionPrompt: "The espresso continuously pours and ripples; steam rises and curls.",
  aspectRatio: "9:16",
  durationSeconds: 5,
};

const NO_DELAY = { sleep: async () => {} };

function fakeSubmitSucceeds(id = "task-1", estimatedCredits: number | null = 25): SubmitTaskFn {
  return vi.fn(async (): Promise<RunwaySubmitResult> => ({ ok: true, id, estimatedCredits }));
}

function fakeSubmitFails(error = "invalid request"): SubmitTaskFn {
  return vi.fn(async (): Promise<RunwaySubmitResult> => ({ ok: false, error }));
}

function fakePollSequence(results: RunwayPollResult[]): PollTaskFn {
  let call = 0;
  return vi.fn(async (): Promise<RunwayPollResult> => {
    const result = results[Math.min(call, results.length - 1)];
    call += 1;
    return result;
  });
}

function fakeDownloadSucceeds(bytes = "fake mp4 bytes"): DownloadVideoFn {
  return vi.fn(async (): Promise<Buffer> => Buffer.from(bytes));
}

describe("runRunwayGeneration", () => {
  it("submits exactly once and returns a successful result once the task reaches SUCCEEDED", async () => {
    const submitTask = fakeSubmitSucceeds("task-abc", 25);
    const pollTask = fakePollSequence([{ status: "PENDING" }, { status: "SUCCEEDED", outputUrl: "https://cdn.example/video.mp4", credits: 25 }]);
    const downloadVideo = fakeDownloadSucceeds();

    const result = await runRunwayGeneration(INPUT, "api-key", { submitTask, pollTask, downloadVideo, ...NO_DELAY });

    expect(submitTask).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.provider).toBe("runway:gen4_turbo");
    expect(result.model).toBe("gen4_turbo");
    expect(result.providerTaskId).toBe("task-abc");
    expect(result.providerCost).toBe(25);
    expect(result.dataUrl.startsWith("data:video/mp4;base64,")).toBe(true);
  });

  it("passes the correctly-mapped Runway ratio and the motion prompt through to submitTask", async () => {
    const submitTask = fakeSubmitSucceeds();
    const pollTask = fakePollSequence([{ status: "SUCCEEDED", outputUrl: "https://cdn.example/v.mp4", credits: 25 }]);

    await runRunwayGeneration(INPUT, "api-key", { submitTask, pollTask, downloadVideo: fakeDownloadSucceeds(), ...NO_DELAY });

    const [call] = (submitTask as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call.ratio).toBe("720:1280"); // 9:16
    expect(call.motionPrompt).toBe(INPUT.motionPrompt);
    expect(call.durationSeconds).toBe(5);
    expect(call.apiKey).toBe("api-key");
  });

  it("(Requirement 8: no accidental paid retry) never calls submitTask more than once, even after a FAILED terminal status", async () => {
    const submitTask = fakeSubmitSucceeds();
    const pollTask = fakePollSequence([{ status: "FAILED", error: "content policy violation", credits: 0 }]);

    const result = await runRunwayGeneration(INPUT, "api-key", { submitTask, pollTask, downloadVideo: fakeDownloadSucceeds(), ...NO_DELAY });

    expect(submitTask).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: false, error: "content policy violation", providerTaskId: "task-1" });
  });

  it("resolves to ok:false without calling pollTask at all when submission itself fails", async () => {
    const submitTask = fakeSubmitFails("bad request");
    const pollTask = vi.fn();

    const result = await runRunwayGeneration(INPUT, "api-key", { submitTask, pollTask, downloadVideo: fakeDownloadSucceeds(), ...NO_DELAY });

    expect(result).toEqual({ ok: false, error: "bad request" });
    expect(pollTask).not.toHaveBeenCalled();
  });

  it("(polling timeout) resolves to a timeout error after maxPollAttempts, never hanging indefinitely", async () => {
    const submitTask = fakeSubmitSucceeds("task-xyz");
    const pollTask = vi.fn(async (): Promise<RunwayPollResult> => ({ status: "PENDING" }));

    const result = await runRunwayGeneration(INPUT, "api-key", { submitTask, pollTask, downloadVideo: fakeDownloadSucceeds(), maxPollAttempts: 3, ...NO_DELAY });

    expect(pollTask).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ ok: false, error: "Timed out waiting for the Runway task to complete.", providerTaskId: "task-xyz" });
  });

  it("(Requirement 8) a poll timeout never triggers a second submission", async () => {
    const submitTask = fakeSubmitSucceeds();
    const pollTask = vi.fn(async (): Promise<RunwayPollResult> => ({ status: "PENDING" }));

    await runRunwayGeneration(INPUT, "api-key", { submitTask, pollTask, downloadVideo: fakeDownloadSucceeds(), maxPollAttempts: 2, ...NO_DELAY });

    expect(submitTask).toHaveBeenCalledTimes(1);
  });

  it("resolves to ok:false (never throws) when the final download fails, after a real SUCCEEDED status", async () => {
    const submitTask = fakeSubmitSucceeds("task-dl-fail");
    const pollTask = fakePollSequence([{ status: "SUCCEEDED", outputUrl: "https://cdn.example/gone.mp4", credits: 25 }]);
    const downloadVideo: DownloadVideoFn = vi.fn(async () => {
      throw new Error("404 not found");
    });

    const result = await runRunwayGeneration(INPUT, "api-key", { submitTask, pollTask, downloadVideo, ...NO_DELAY });

    expect(result).toEqual({ ok: false, error: "404 not found", providerTaskId: "task-dl-fail" });
  });

  it("keeps polling through PENDING statuses before eventually succeeding", async () => {
    const submitTask = fakeSubmitSucceeds();
    const pollTask = fakePollSequence([
      { status: "PENDING" },
      { status: "PENDING" },
      { status: "PENDING" },
      { status: "SUCCEEDED", outputUrl: "https://cdn.example/v.mp4", credits: 25 },
    ]);

    const result = await runRunwayGeneration(INPUT, "api-key", { submitTask, pollTask, downloadVideo: fakeDownloadSucceeds(), ...NO_DELAY });

    expect(pollTask).toHaveBeenCalledTimes(4);
    expect(result.ok).toBe(true);
  });

  it("is deterministic given deterministic fakes (no Math.random anywhere in the orchestration)", async () => {
    const makeDeps = () => ({
      submitTask: fakeSubmitSucceeds("task-det", 10),
      pollTask: fakePollSequence([{ status: "SUCCEEDED", outputUrl: "https://cdn.example/v.mp4", credits: 10 }]),
      downloadVideo: fakeDownloadSucceeds("same bytes"),
      ...NO_DELAY,
    });
    const a = await runRunwayGeneration(INPUT, "api-key", makeDeps());
    const b = await runRunwayGeneration(INPUT, "api-key", makeDeps());
    expect(a).toEqual(b);
  });
});
