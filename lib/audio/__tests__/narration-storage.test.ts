import { describe, expect, it, vi } from "vitest";
import {
  buildNarrationAudioPath,
  parseAudioDataUrl,
  uploadNarrationAudio,
  NARRATION_AUDIO_BUCKET,
  NARRATION_SIGNED_URL_EXPIRY_SECONDS,
  type NarrationStorageClient,
} from "@/lib/audio/narration-storage";

const SAMPLE_DATA_URL = `data:audio/mpeg;base64,${Buffer.from("fake mp3 bytes").toString("base64")}`;

describe("parseAudioDataUrl", () => {
  it("decodes a data: URL into its content type and raw bytes", () => {
    const parsed = parseAudioDataUrl(SAMPLE_DATA_URL);
    expect(parsed).not.toBeNull();
    expect(parsed?.contentType).toBe("audio/mpeg");
    expect(parsed?.buffer.toString("utf-8")).toBe("fake mp3 bytes");
  });

  it("returns null for a non-data: URL (e.g. an already-signed Storage URL)", () => {
    expect(parseAudioDataUrl("https://storage.example/signed/abc")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parseAudioDataUrl("data:audio/mpeg,not-base64-encoded")).toBeNull();
    expect(parseAudioDataUrl("")).toBeNull();
  });
});

describe("buildNarrationAudioPath", () => {
  it("(deterministic path) the same (userId, generationId, sceneId) always produces the same path", () => {
    const a = buildNarrationAudioPath("user-1", "gen-1", "scene-1", "audio/mpeg");
    const b = buildNarrationAudioPath("user-1", "gen-1", "scene-1", "audio/mpeg");
    expect(a).toBe(b);
    expect(a).toBe("user-1/gen-1/scene-1.mp3");
  });

  it("(collision-safe) different users, generations, or scenes never collide", () => {
    const base = buildNarrationAudioPath("user-1", "gen-1", "scene-1", "audio/mpeg");
    expect(buildNarrationAudioPath("user-2", "gen-1", "scene-1", "audio/mpeg")).not.toBe(base);
    expect(buildNarrationAudioPath("user-1", "gen-2", "scene-1", "audio/mpeg")).not.toBe(base);
    expect(buildNarrationAudioPath("user-1", "gen-1", "scene-2", "audio/mpeg")).not.toBe(base);
  });

  it("picks the file extension from the content type", () => {
    expect(buildNarrationAudioPath("u", "g", "s", "audio/mpeg")).toMatch(/\.mp3$/);
    expect(buildNarrationAudioPath("u", "g", "s", "audio/wav")).toMatch(/\.wav$/);
    expect(buildNarrationAudioPath("u", "g", "s", "audio/unknown-format")).toMatch(/\.bin$/);
  });

  it("(path cannot be forged) a hostile generationId or sceneId can never escape the userId's own folder", () => {
    const path = buildNarrationAudioPath("user-1", "../../user-2", "../../../etc/passwd", "audio/mpeg");
    expect(path.startsWith("user-1/")).toBe(true);
    expect(path).not.toContain("..");
    expect(path).not.toContain("/etc/");
    // Only 3 path segments (user/generation/scene.ext) — traversal characters were stripped, not preserved as extra folders.
    expect(path.split("/")).toHaveLength(3);
  });

  it("sanitizes characters that could otherwise create unintended nested folders", () => {
    const path = buildNarrationAudioPath("user-1", "gen 1/../x", "scene#1", "audio/mpeg");
    expect(path).toBe("user-1/gen_1____x/scene_1.mp3");
  });
});

function fakeStorage(overrides: {
  uploadError?: { message: string } | null;
  signError?: { message: string } | null;
  signedUrl?: string;
} = {}): { client: NarrationStorageClient; upload: ReturnType<typeof vi.fn>; createSignedUrl: ReturnType<typeof vi.fn> } {
  const upload = vi.fn(async () => ({ error: overrides.uploadError ?? null }));
  const createSignedUrl = vi.fn(async () => ({
    data: overrides.signError ? null : { signedUrl: overrides.signedUrl ?? "https://storage.example/signed/fake" },
    error: overrides.signError ?? null,
  }));
  return {
    client: { from: () => ({ upload, createSignedUrl }) },
    upload,
    createSignedUrl,
  };
}

describe("uploadNarrationAudio", () => {
  it("uploads to the narration-audio bucket at the deterministic path and returns a signed URL", async () => {
    const { client, upload, createSignedUrl } = fakeStorage({ signedUrl: "https://storage.example/signed/scene1" });

    const result = await uploadNarrationAudio({
      storage: client,
      userId: "user-1",
      generationId: "gen-1",
      sceneId: "scene1",
      dataUrl: SAMPLE_DATA_URL,
    });

    expect(result).toEqual({ ok: true, path: "user-1/gen-1/scene1.mp3", signedUrl: "https://storage.example/signed/scene1", contentType: "audio/mpeg" });
    expect(upload).toHaveBeenCalledWith("user-1/gen-1/scene1.mp3", expect.any(Buffer), { contentType: "audio/mpeg", upsert: true });
    expect(createSignedUrl).toHaveBeenCalledWith("user-1/gen-1/scene1.mp3", NARRATION_SIGNED_URL_EXPIRY_SECONDS);
  });

  it("(retry/upsert) always passes upsert: true — a retry of the same scene overwrites in place, never a duplicate", async () => {
    const { client, upload } = fakeStorage();

    await uploadNarrationAudio({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: SAMPLE_DATA_URL });
    await uploadNarrationAudio({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: SAMPLE_DATA_URL });

    expect(upload).toHaveBeenCalledTimes(2);
    const [firstPath, , firstOptions] = upload.mock.calls[0];
    const [secondPath, , secondOptions] = upload.mock.calls[1];
    expect(firstPath).toBe(secondPath); // same deterministic path both times
    expect(firstOptions.upsert).toBe(true);
    expect(secondOptions.upsert).toBe(true);
  });

  it("(storage failure preserves the caller) resolves to ok:false instead of throwing when the upload itself fails", async () => {
    const { client } = fakeStorage({ uploadError: { message: "bucket not found" } });

    const result = await uploadNarrationAudio({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: SAMPLE_DATA_URL });

    expect(result).toEqual({ ok: false, error: "bucket not found" });
  });

  it("resolves to ok:false when signing fails, even though the upload itself succeeded", async () => {
    const { client } = fakeStorage({ signError: { message: "signing unavailable" } });

    const result = await uploadNarrationAudio({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: SAMPLE_DATA_URL });

    expect(result).toEqual({ ok: false, error: "signing unavailable" });
  });

  it("resolves to ok:false for an unparseable data URL, without calling Storage at all", async () => {
    const { client, upload } = fakeStorage();

    const result = await uploadNarrationAudio({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: "not-a-data-url" });

    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("(one user's path cannot be forged) the object path is always rooted at the passed userId, never at anything else in the input", async () => {
    const { client, upload } = fakeStorage();

    await uploadNarrationAudio({
      storage: client,
      userId: "real-authenticated-user-id",
      generationId: "attacker-controlled-value",
      sceneId: "attacker-controlled-value",
      dataUrl: SAMPLE_DATA_URL,
    });

    const [path] = upload.mock.calls[0];
    expect(path.startsWith("real-authenticated-user-id/")).toBe(true);
  });

  it("uses the NARRATION_AUDIO_BUCKET constant", async () => {
    const { client } = fakeStorage();
    const fromSpy = vi.spyOn(client, "from");

    await uploadNarrationAudio({ storage: client, userId: "u", generationId: "g", sceneId: "s", dataUrl: SAMPLE_DATA_URL });

    expect(fromSpy).toHaveBeenCalledWith(NARRATION_AUDIO_BUCKET);
  });
});
