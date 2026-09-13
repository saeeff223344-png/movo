import { describe, expect, it, vi } from "vitest";
import {
  buildVisualAssetPath,
  parseImageDataUrl,
  uploadVisualAsset,
  signVisualAssetPath,
  VISUAL_ASSET_BUCKET,
  VISUAL_ASSET_SIGNED_URL_EXPIRY_SECONDS,
  type VisualAssetStorageClient,
} from "@/lib/visuals/visual-asset-storage";

const SAMPLE_DATA_URL = `data:image/png;base64,${Buffer.from("fake png bytes").toString("base64")}`;

describe("parseImageDataUrl", () => {
  it("decodes a data: URL into its content type and raw bytes", () => {
    const parsed = parseImageDataUrl(SAMPLE_DATA_URL);
    expect(parsed).not.toBeNull();
    expect(parsed?.contentType).toBe("image/png");
    expect(parsed?.buffer.toString("utf-8")).toBe("fake png bytes");
  });

  it("returns null for a non-data: URL (e.g. an already-signed Storage URL)", () => {
    expect(parseImageDataUrl("https://storage.example/signed/abc")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parseImageDataUrl("data:image/png,not-base64-encoded")).toBeNull();
    expect(parseImageDataUrl("")).toBeNull();
  });
});

describe("buildVisualAssetPath", () => {
  it("(deterministic path) the same (userId, generationId, sceneId) always produces the same path", () => {
    const a = buildVisualAssetPath("user-1", "gen-1", "scene-1", "image/png");
    const b = buildVisualAssetPath("user-1", "gen-1", "scene-1", "image/png");
    expect(a).toBe(b);
    expect(a).toBe("user-1/gen-1/visuals/scene-1.png");
  });

  it("(collision-safe) different users, generations, or scenes never collide", () => {
    const base = buildVisualAssetPath("user-1", "gen-1", "scene-1", "image/png");
    expect(buildVisualAssetPath("user-2", "gen-1", "scene-1", "image/png")).not.toBe(base);
    expect(buildVisualAssetPath("user-1", "gen-2", "scene-1", "image/png")).not.toBe(base);
    expect(buildVisualAssetPath("user-1", "gen-1", "scene-2", "image/png")).not.toBe(base);
  });

  it("picks the file extension from the content type", () => {
    expect(buildVisualAssetPath("u", "g", "s", "image/png")).toMatch(/\.png$/);
    expect(buildVisualAssetPath("u", "g", "s", "image/jpeg")).toMatch(/\.jpg$/);
    expect(buildVisualAssetPath("u", "g", "s", "image/unknown-format")).toMatch(/\.bin$/);
  });

  it("(path cannot be forged) a hostile generationId or sceneId can never escape the userId's own folder", () => {
    const path = buildVisualAssetPath("user-1", "../../user-2", "../../../etc/passwd", "image/png");
    expect(path.startsWith("user-1/")).toBe(true);
    expect(path).not.toContain("..");
    expect(path).not.toContain("/etc/");
  });
});

function fakeStorage(
  overrides: { uploadError?: { message: string } | null; signError?: { message: string } | null; signedUrl?: string } = {},
): { client: VisualAssetStorageClient; upload: ReturnType<typeof vi.fn>; createSignedUrl: ReturnType<typeof vi.fn> } {
  const upload = vi.fn(async () => ({ error: overrides.uploadError ?? null }));
  const createSignedUrl = vi.fn(async () => ({
    data: overrides.signError ? null : { signedUrl: overrides.signedUrl ?? "https://storage.example/signed/fake" },
    error: overrides.signError ?? null,
  }));
  return { client: { from: () => ({ upload, createSignedUrl }) }, upload, createSignedUrl };
}

describe("uploadVisualAsset", () => {
  it("uploads to the project-assets bucket at the deterministic path and returns a signed URL", async () => {
    const { client, upload, createSignedUrl } = fakeStorage({ signedUrl: "https://storage.example/signed/scene1" });

    const result = await uploadVisualAsset({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: SAMPLE_DATA_URL });

    expect(result).toEqual({ ok: true, path: "user-1/gen-1/visuals/scene1.png", signedUrl: "https://storage.example/signed/scene1", contentType: "image/png" });
    expect(upload).toHaveBeenCalledWith("user-1/gen-1/visuals/scene1.png", expect.any(Buffer), { contentType: "image/png", upsert: true });
    expect(createSignedUrl).toHaveBeenCalledWith("user-1/gen-1/visuals/scene1.png", VISUAL_ASSET_SIGNED_URL_EXPIRY_SECONDS);
  });

  it("(retry/upsert) always passes upsert: true — a re-run overwrites in place, never a duplicate", async () => {
    const { client, upload } = fakeStorage();

    await uploadVisualAsset({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: SAMPLE_DATA_URL });
    await uploadVisualAsset({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: SAMPLE_DATA_URL });

    expect(upload).toHaveBeenCalledTimes(2);
    const [firstPath] = upload.mock.calls[0];
    const [secondPath, , secondOptions] = upload.mock.calls[1];
    expect(firstPath).toBe(secondPath);
    expect(secondOptions.upsert).toBe(true);
  });

  it("(storage failure preserves the caller) resolves to ok:false instead of throwing when the upload itself fails", async () => {
    const { client } = fakeStorage({ uploadError: { message: "bucket not found" } });
    const result = await uploadVisualAsset({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: SAMPLE_DATA_URL });
    expect(result).toEqual({ ok: false, error: "bucket not found" });
  });

  it("resolves to ok:false when signing fails, even though the upload itself succeeded", async () => {
    const { client } = fakeStorage({ signError: { message: "signing unavailable" } });
    const result = await uploadVisualAsset({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: SAMPLE_DATA_URL });
    expect(result).toEqual({ ok: false, error: "signing unavailable" });
  });

  it("resolves to ok:false for an unparseable data URL, without calling Storage at all", async () => {
    const { client, upload } = fakeStorage();
    const result = await uploadVisualAsset({ storage: client, userId: "user-1", generationId: "gen-1", sceneId: "scene1", dataUrl: "not-a-data-url" });
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uses the VISUAL_ASSET_BUCKET (project-assets) constant", async () => {
    const { client } = fakeStorage();
    const fromSpy = vi.spyOn(client, "from");
    await uploadVisualAsset({ storage: client, userId: "u", generationId: "g", sceneId: "s", dataUrl: SAMPLE_DATA_URL });
    expect(fromSpy).toHaveBeenCalledWith(VISUAL_ASSET_BUCKET);
    expect(VISUAL_ASSET_BUCKET).toBe("project-assets");
  });
});

describe("signVisualAssetPath", () => {
  it("reissues a fresh signed URL from an already-uploaded object's durable path", async () => {
    const { client, createSignedUrl } = fakeStorage({ signedUrl: "https://storage.example/signed/re-signed" });
    const result = await signVisualAssetPath(client, "user-1/gen-1/visuals/scene1.png");
    expect(result).toEqual({ ok: true, signedUrl: "https://storage.example/signed/re-signed" });
    expect(createSignedUrl).toHaveBeenCalledWith("user-1/gen-1/visuals/scene1.png", VISUAL_ASSET_SIGNED_URL_EXPIRY_SECONDS);
  });

  it("resolves to ok:false when signing fails", async () => {
    const { client } = fakeStorage({ signError: { message: "object not found" } });
    const result = await signVisualAssetPath(client, "user-1/gen-1/visuals/scene1.png");
    expect(result).toEqual({ ok: false, error: "object not found" });
  });
});
