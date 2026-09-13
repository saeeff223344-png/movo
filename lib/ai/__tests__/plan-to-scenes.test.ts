import { describe, expect, it } from "vitest";
import { buildVideoPlanRenderData, buildVideoPlanScenes } from "@/lib/ai/plan-to-scenes";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import type { Asset } from "@/lib/types/video";
import type { ResolvedSceneVisual } from "@/lib/visuals/types";
import type { ResolvedSceneVideo } from "@/lib/video-generation/types";

function scene(overrides: Partial<VideoPlan["scenes"][number]> = {}): VideoPlan["scenes"][number] {
  return {
    id: "scene-1",
    startTime: 0,
    duration: 4,
    purpose: "hook",
    narration: "narration text",
    onScreenText: "on-screen text",
    visualDirection: "visual",
    motionDirection: "motion",
    transition: "cut",
    assetNeeds: [],
    textPosition: "center",
    textAlign: "center",
    visual: null,
    ...overrides,
  };
}

function plan(overrides: Partial<VideoPlan> = {}): VideoPlan {
  return {
    language: "ar",
    videoTitle: "Title",
    business: "Business",
    objective: "Objective",
    targetAudience: "Audience",
    platform: "reels",
    aspectRatio: "9:16",
    durationSeconds: 12,
    visualStyle: "tech",
    tone: "modern",
    brandColors: null,
    palette: null,
    visualTheme: null,
    cta: "Buy now",
    scenes: [
      scene({ id: "s1", startTime: 0, duration: 4, purpose: "hook" }),
      scene({ id: "s2", startTime: 4, duration: 4, purpose: "product-reveal" }),
      scene({ id: "s3", startTime: 8, duration: 4, purpose: "cta-scene", onScreenText: null }),
    ],
    audio: null,
    ...overrides,
  };
}

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    kind: "product",
    fileName: "photo.jpg",
    fileType: "image/jpeg",
    previewUrl: "blob:photo",
    ...overrides,
  };
}

describe("buildVideoPlanScenes", () => {
  it("converts seconds to frames using the given fps", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30);
    expect(scenes.map((s) => s.durationInFrames)).toEqual([120, 120, 120]);
  });

  it("preserves scene order", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30);
    expect(scenes.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("carries purpose and transition through unchanged", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30);
    expect(scenes[0].type).toBe("hook");
    expect(scenes[1].type).toBe("product-reveal");
    expect(scenes[0].transition).toBe("cut");
  });

  it("preserves narration, on-screen text, visual/motion direction, and text placement", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30);
    expect(scenes[0].content.narration).toBe("narration text");
    expect(scenes[0].content.onScreenText).toBe("on-screen text");
    expect(scenes[0].content.visualDirection).toBe("visual");
    expect(scenes[0].content.motionDirection).toBe("motion");
    expect(scenes[0].content.textPosition).toBe("center");
    expect(scenes[0].content.textAlign).toBe("center");
  });

  it("maps null narration/onScreenText to empty strings", () => {
    const scenes = buildVideoPlanScenes(plan({ scenes: [scene({ narration: null, onScreenText: null })] }), [], 30);
    expect(scenes[0].content.narration).toBe("");
    expect(scenes[0].content.onScreenText).toBe("");
  });

  it("falls back to the plan's top-level cta when a cta-scene has no onScreenText", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30);
    const ctaScene = scenes.find((s) => s.type === "cta-scene");
    expect(ctaScene?.content.onScreenText).toBe("Buy now");
  });

  it("assigns an uploaded product photo to an image-shaped scene", () => {
    const productAsset = asset({ id: "p1", kind: "product", previewUrl: "blob:product" });
    const scenes = buildVideoPlanScenes(plan(), [productAsset], 30);
    const reveal = scenes.find((s) => s.type === "product-reveal");
    expect(reveal?.content.imageUrl).toBe("blob:product");
    expect(reveal?.assetIds).toEqual(["p1"]);
  });

  it("never assigns an image when no assets were uploaded", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30);
    expect(scenes.every((s) => s.content.imageUrl === "")).toBe(true);
    expect(scenes.every((s) => s.assetIds === undefined)).toBe(true);
  });

  it("does not assign an image to a purpose that has no visual use for one", () => {
    const productAsset = asset({ kind: "product" });
    const scenes = buildVideoPlanScenes(plan(), [productAsset], 30);
    const hook = scenes.find((s) => s.type === "hook");
    expect(hook?.content.imageUrl).toBe("");
  });

  it("prefers a logo asset for a logo-reveal scene", () => {
    const logoAsset = asset({ id: "l1", kind: "logo", previewUrl: "blob:logo" });
    const productAsset = asset({ id: "p1", kind: "product", previewUrl: "blob:product" });
    const scenes = buildVideoPlanScenes(
      plan({ scenes: [scene({ purpose: "logo-reveal" })] }),
      [productAsset, logoAsset],
      30,
    );
    expect(scenes[0].content.imageUrl).toBe("blob:logo");
  });

  it("assigns an uploaded asset to a split-screen scene", () => {
    const productAsset = asset({ id: "p1", kind: "product", previewUrl: "blob:product" });
    const scenes = buildVideoPlanScenes(plan({ scenes: [scene({ purpose: "split-screen" })] }), [productAsset], 30);
    expect(scenes[0].content.imageUrl).toBe("blob:product");
  });

  function autoVisual(sceneId: string, url = `https://storage.example/signed/${sceneId}`): ResolvedSceneVisual {
    return { sceneId, url, source: "auto-generated", storagePath: `u/g/visuals/${sceneId}.png` };
  }

  it("(Requirement 3: asset priority) uses an auto-generated visual when no user asset covers the scene", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30, { s1: autoVisual("s1") });
    expect(scenes.find((s) => s.id === "s1")?.content.imageUrl).toBe("https://storage.example/signed/s1");
  });

  it("(Requirement 3: asset priority) a user-uploaded asset always wins over an auto-generated visual for the same scene", () => {
    const productAsset = asset({ id: "p1", kind: "product", previewUrl: "blob:product" });
    const scenes = buildVideoPlanScenes(plan({ scenes: [scene({ id: "s1", purpose: "product-reveal" })] }), [productAsset], 30, { s1: autoVisual("s1") });
    expect(scenes[0].content.imageUrl).toBe("blob:product");
    expect(scenes[0].assetIds).toEqual(["p1"]); // still credited as the real uploaded asset, not the auto visual
  });

  it("an auto-generated visual can appear on a purpose the legacy user-asset picker never supported (e.g. hook)", () => {
    const scenes = buildVideoPlanScenes(plan({ scenes: [scene({ id: "s1", purpose: "hook" })] }), [], 30, { s1: autoVisual("s1") });
    expect(scenes[0].content.imageUrl).toBe("https://storage.example/signed/s1");
  });

  it("defaults to no auto visuals when the parameter is omitted (backward compatible call sites)", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30);
    expect(scenes.every((s) => s.content.imageUrl === "")).toBe(true);
  });

  it("threads autoVisuals through buildVideoPlanRenderData", () => {
    const data = buildVideoPlanRenderData(plan(), [], 30, {}, {}, { s1: autoVisual("s1") });
    expect(data.compositionProps.scenes.find((s) => s.id === "s1")?.content.imageUrl).toBe("https://storage.example/signed/s1");
  });

  function aiVideo(sceneId: string, overrides: Partial<ResolvedSceneVideo> = {}): ResolvedSceneVideo {
    return { sceneId, url: `https://storage.example/signed/${sceneId}.mp4`, source: "ai-generated", ...overrides };
  }

  it("(Requirement 10: AI video priority) sets content.videoUrl when the scene has a resolved AI video", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30, {}, { s1: aiVideo("s1") });
    expect(scenes.find((s) => s.id === "s1")?.content.videoUrl).toBe("https://storage.example/signed/s1.mp4");
  });

  it("(Requirement 10: AI video priority) converts the video's own duration to frames using the given fps", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30, {}, { s1: aiVideo("s1", { durationSeconds: 5 }) });
    expect(scenes.find((s) => s.id === "s1")?.content.videoDurationInFrames).toBe("150");
  });

  it("(Requirement 10: AI video priority) leaves videoDurationInFrames empty when the video has no known duration", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30, {}, { s1: aiVideo("s1", { durationSeconds: undefined }) });
    expect(scenes.find((s) => s.id === "s1")?.content.videoDurationInFrames).toBe("");
  });

  it("(Requirement 10: AI video priority) still resolves the still-image chain even when a video is present, so a fallback exists", () => {
    const productAsset = asset({ id: "p1", kind: "product", previewUrl: "blob:product" });
    const scenes = buildVideoPlanScenes(plan({ scenes: [scene({ id: "s1", purpose: "product-reveal" })] }), [productAsset], 30, {}, { s1: aiVideo("s1") });
    expect(scenes[0].content.imageUrl).toBe("blob:product");
    expect(scenes[0].content.videoUrl).toBe("https://storage.example/signed/s1.mp4");
  });

  it("never assigns a video when no AI videos were resolved (old-project compatibility)", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30);
    expect(scenes.every((s) => s.content.videoUrl === "")).toBe(true);
  });

  it("threads aiVideos through buildVideoPlanRenderData", () => {
    const data = buildVideoPlanRenderData(plan(), [], 30, {}, {}, {}, { s1: aiVideo("s1") });
    expect(data.compositionProps.scenes.find((s) => s.id === "s1")?.content.videoUrl).toBe("https://storage.example/signed/s1.mp4");
  });

  it("widens a scene whose planned duration is too short for its own narration (Phase 5 audio sync)", () => {
    const longNarration = "word ".repeat(60).trim();
    const scenes = buildVideoPlanScenes(plan({ scenes: [scene({ id: "s1", duration: 1, narration: longNarration })] }), [], 30);
    expect(scenes[0].durationInFrames).toBeGreaterThan(30);
  });

  it("leaves scene duration unchanged when narration already comfortably fits (the common case)", () => {
    const scenes = buildVideoPlanScenes(plan(), [], 30);
    expect(scenes.map((s) => s.durationInFrames)).toEqual([120, 120, 120]);
  });
});

describe("buildVideoPlanRenderData", () => {
  it("sums per-scene frames for the total duration rather than trusting durationSeconds", () => {
    // 4+4+4 = 12s of scenes but durationSeconds deliberately says 11 to prove drift-resistance.
    const data = buildVideoPlanRenderData(plan({ durationSeconds: 11 }), [], 30);
    expect(data.durationInFrames).toBe(360);
  });

  it("maps aspect ratio to pixel dimensions", () => {
    expect(buildVideoPlanRenderData(plan({ aspectRatio: "9:16" })).width).toBe(1080);
    expect(buildVideoPlanRenderData(plan({ aspectRatio: "9:16" })).height).toBe(1920);
    expect(buildVideoPlanRenderData(plan({ aspectRatio: "16:9" })).width).toBe(1920);
    expect(buildVideoPlanRenderData(plan({ aspectRatio: "16:9" })).height).toBe(1080);
    expect(buildVideoPlanRenderData(plan({ aspectRatio: "1:1" })).width).toBe(1080);
    expect(buildVideoPlanRenderData(plan({ aspectRatio: "1:1" })).height).toBe(1080);
  });

  it("carries the plan's visual style into the composition props", () => {
    const data = buildVideoPlanRenderData(plan({ visualStyle: "luxury" }));
    expect(data.compositionProps.visualStyle).toBe("luxury");
  });

  it("resolves an Arabic plan to rtl and an English plan to ltr", () => {
    expect(buildVideoPlanRenderData(plan({ language: "ar" })).compositionProps.dir).toBe("rtl");
    expect(buildVideoPlanRenderData(plan({ language: "en" })).compositionProps.dir).toBe("ltr");
  });

  it("passes the plan's scenes through to the composition props in order", () => {
    const data = buildVideoPlanRenderData(plan());
    expect(data.compositionProps.scenes.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("defaults to the project fps when none is given", () => {
    const data = buildVideoPlanRenderData(plan());
    expect(data.fps).toBe(30);
  });

  it("attaches audio props (Phase 5) with no voice tracks and no music by default (no URLs supplied, no licensed music asset configured)", () => {
    const data = buildVideoPlanRenderData(plan());
    expect(data.compositionProps.audio?.voiceTracks).toEqual([]);
    expect(data.compositionProps.audio?.music).toBeNull();
  });

  it("wires a provided narration audio URL into a voice track at the right frame", () => {
    const data = buildVideoPlanRenderData(plan(), [], 30, { s1: "data:audio/mpeg;base64,AAA" });
    const track = data.compositionProps.audio?.voiceTracks[0];
    expect(track?.src).toBe("data:audio/mpeg;base64,AAA");
    expect(track?.startFrame).toBeGreaterThanOrEqual(0);
    expect(track!.startFrame + track!.durationFrames).toBeLessThanOrEqual(data.durationInFrames);
  });
});
