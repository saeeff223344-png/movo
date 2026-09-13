import { describe, expect, it, vi } from "vitest";
import { buildExportFilename, deliverExportVideo, fetchExportVideoBlob } from "@/lib/download/video-download";

function abortError(): Error {
  const error = new Error("The user aborted a request.");
  error.name = "AbortError";
  return error;
}

describe("buildExportFilename", () => {
  it("ends in .mp4 and includes a short project id", () => {
    expect(buildExportFilename("c5eea6a3-73e2-4f2f-85ea-5478ac281d01")).toBe("movo-video-c5eea6a3.mp4");
  });

  it("strips characters outside [a-zA-Z0-9-] from the project id", () => {
    expect(buildExportFilename("../../etc/passwd")).toBe("movo-video-etcpassw.mp4");
    expect(buildExportFilename("../../etc/passwd")).toMatch(/^movo-video-[a-zA-Z0-9-]+\.mp4$/);
  });

  it("falls back to a generic name when there is no project id", () => {
    expect(buildExportFilename(null)).toBe("movo-video-export.mp4");
  });
});

describe("fetchExportVideoBlob", () => {
  it("returns the blob directly when the first fetch succeeds — never calls refreshUrl", async () => {
    const blob = new Blob(["video-bytes"]);
    const fetchBlob = vi.fn().mockResolvedValue(blob);
    const refreshUrl = vi.fn();

    const result = await fetchExportVideoBlob("https://example.com/signed", { fetchBlob, refreshUrl });

    expect(result).toEqual({ ok: true, blob });
    expect(refreshUrl).not.toHaveBeenCalled();
  });

  it("(expired signed URL) retries once with a freshly re-signed URL when the first fetch fails", async () => {
    const blob = new Blob(["video-bytes"]);
    const fetchBlob = vi.fn().mockRejectedValueOnce(new Error("403")).mockResolvedValueOnce(blob);
    const refreshUrl = vi.fn().mockResolvedValue("https://example.com/fresh-signed");

    const result = await fetchExportVideoBlob("https://example.com/expired", { fetchBlob, refreshUrl });

    expect(result).toEqual({ ok: true, blob });
    expect(fetchBlob).toHaveBeenNthCalledWith(1, "https://example.com/expired");
    expect(fetchBlob).toHaveBeenNthCalledWith(2, "https://example.com/fresh-signed");
  });

  it("(never exposes the signed URL) reports a bare ok:false — no URL, token, or raw error text — when refreshing isn't possible", async () => {
    const fetchBlob = vi.fn().mockRejectedValue(new Error("403"));
    const refreshUrl = vi.fn().mockResolvedValue(null);

    const result = await fetchExportVideoBlob("https://example.com/expired?token=secret", { fetchBlob, refreshUrl });

    expect(result).toEqual({ ok: false });
  });

  it("reports a bare ok:false when even the refreshed URL fails", async () => {
    const fetchBlob = vi.fn().mockRejectedValue(new Error("network down"));
    const refreshUrl = vi.fn().mockResolvedValue("https://example.com/fresh");

    const result = await fetchExportVideoBlob("https://example.com/expired", { fetchBlob, refreshUrl });

    expect(result.ok).toBe(false);
    expect(fetchBlob).toHaveBeenCalledTimes(2);
  });
});

describe("deliverExportVideo", () => {
  it("(iOS/native share path) shares a File when file-sharing is supported, and never touches the blob-download fallback", async () => {
    const blob = new Blob(["video-bytes"], { type: "video/mp4" });
    const shareFiles = vi.fn().mockResolvedValue(undefined);
    const triggerBlobDownload = vi.fn();

    const result = await deliverExportVideo(blob, "movo-video-abc.mp4", {
      canShareFiles: () => true,
      shareFiles,
      triggerBlobDownload,
    });

    expect(result).toEqual({ ok: true, method: "share" });
    expect(shareFiles).toHaveBeenCalledTimes(1);
    const sharedFile = shareFiles.mock.calls[0][0] as File;
    expect(sharedFile.name).toBe("movo-video-abc.mp4");
    expect(sharedFile.type).toBe("video/mp4");
    expect(triggerBlobDownload).not.toHaveBeenCalled();
  });

  it("(user cancels the native share sheet) reports cancelled, not an error, and does not force a fallback download", async () => {
    const blob = new Blob(["video-bytes"]);
    const triggerBlobDownload = vi.fn();

    const result = await deliverExportVideo(blob, "movo-video-abc.mp4", {
      canShareFiles: () => true,
      shareFiles: () => Promise.reject(abortError()),
      triggerBlobDownload,
    });

    expect(result).toEqual({ ok: false, cancelled: true });
    expect(triggerBlobDownload).not.toHaveBeenCalled();
  });

  it("falls back to a blob download when sharing fails for a real (non-cancel) reason", async () => {
    const blob = new Blob(["video-bytes"]);
    const triggerBlobDownload = vi.fn();

    const result = await deliverExportVideo(blob, "movo-video-abc.mp4", {
      canShareFiles: () => true,
      shareFiles: () => Promise.reject(new Error("NotAllowedError")),
      triggerBlobDownload,
    });

    expect(result).toEqual({ ok: true, method: "blob-download" });
    expect(triggerBlobDownload).toHaveBeenCalledWith(blob, "movo-video-abc.mp4");
  });

  it("(unsupported Web Share fallback / desktop browser) downloads directly as a real file when file-sharing isn't supported at all", async () => {
    const blob = new Blob(["video-bytes"]);
    const shareFiles = vi.fn();
    const triggerBlobDownload = vi.fn();

    const result = await deliverExportVideo(blob, "movo-video-abc.mp4", {
      canShareFiles: () => false,
      shareFiles,
      triggerBlobDownload,
    });

    expect(result).toEqual({ ok: true, method: "blob-download" });
    expect(shareFiles).not.toHaveBeenCalled();
    expect(triggerBlobDownload).toHaveBeenCalledWith(blob, "movo-video-abc.mp4");
  });

  it("reports ok:false (not cancelled) when even the blob-download fallback throws", async () => {
    const blob = new Blob(["video-bytes"]);

    const result = await deliverExportVideo(blob, "movo-video-abc.mp4", {
      canShareFiles: () => false,
      shareFiles: vi.fn(),
      triggerBlobDownload: () => {
        throw new Error("Download blocked by the browser.");
      },
    });

    expect(result).toEqual({ ok: false, cancelled: false });
  });
});
