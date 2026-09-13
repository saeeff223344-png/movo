"use client";

import { useState } from "react";
import { Download, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { checkExportProgressAction } from "@/lib/actions/export-actions";
import { buildExportFilename, deliverExportVideo, fetchExportVideoBlob } from "@/lib/download/video-download";

type DownloadStatus = "idle" | "preparing" | "error";

/**
 * Real download/share flow for a finished export.
 *
 * Root cause this replaces: the previous button was a plain
 * `<Button href={signedUrl}>` (a Next.js <Link>) navigating straight to the
 * raw, private Supabase Storage MP4 URL. Desktop browsers mostly muddle
 * through that, but iOS Safari treats a top-level navigation to a
 * `video/mp4` URL as "open the built-in video player" — never a download.
 * The file never reaches Files/Photos, no matter what headers the URL
 * carries, and there is no reliable way to make a plain link navigation
 * download on iOS.
 *
 * Fix: fetch the video into memory on click (a real user gesture, required
 * for both the Web Share API and for iOS to allow a JS-triggered save at
 * all), then hand the bytes to lib/download/video-download.ts's
 * deliverExportVideo, which prefers the Web Share API with a real File —
 * iOS renders that as its native share sheet with actual "Save Video" /
 * "Save to Files" actions — and falls back to a plain blob-anchor download
 * everywhere file sharing isn't supported (most desktop browsers). The
 * signed URL itself is never logged, and an expired one is transparently
 * re-signed via the existing, authorization-scoped
 * checkExportProgressAction (never a new render — see
 * lib/download/video-download.ts's FetchVideoBlobDeps docstring).
 */
export function DownloadVideoButton({
  downloadUrl,
  renderJobId,
  projectId,
}: {
  downloadUrl: string;
  renderJobId: string;
  projectId: string | null;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (status === "preparing") return; // Prevent duplicate clicks while a download/share is already in flight.
    setStatus("preparing");
    setError(null);

    const fetched = await fetchExportVideoBlob(downloadUrl, {
      fetchBlob: async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Video download failed with status ${response.status}.`);
        return response.blob();
      },
      refreshUrl: async () => {
        const result = await checkExportProgressAction(renderJobId);
        return result.ok && result.status === "succeeded" ? result.downloadUrl : null;
      },
    });

    if (!fetched.ok) {
      setStatus("error");
      setError(t("create.exportDownloadError"));
      return;
    }

    const filename = buildExportFilename(projectId);
    const outcome = await deliverExportVideo(fetched.blob, filename, {
      canShareFiles: (file) =>
        typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }),
      shareFiles: (file) => navigator.share({ files: [file], title: filename }),
      triggerBlobDownload: (blob, name) => {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = name;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        // A short delay before revoking gives the browser time to actually pick up the blob URL before it's invalidated.
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      },
    });

    if (!outcome.ok) {
      if (outcome.cancelled) {
        setStatus("idle"); // The user dismissed the native share sheet themselves — not an error.
        return;
      }
      setStatus("error");
      setError(t("create.exportDownloadError"));
      return;
    }

    setStatus("idle");
  }

  return (
    <div className="mt-4">
      <Button className="w-full" onClick={handleClick} disabled={status === "preparing"}>
        {status === "preparing" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {status === "preparing" ? t("create.exportDownloadPreparing") : t("create.exportDownloadButton")}
      </Button>
      <p className="mt-2 text-center text-xs text-muted">{t("create.exportDownloadHint")}</p>
      {status === "error" && error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
