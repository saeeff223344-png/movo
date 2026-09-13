/**
 * Root cause this module fixes: ExportPanel.tsx's old "download" button was
 * a plain `<Link href={signedUrl}>` navigating straight to the raw,
 * private Supabase Storage MP4 URL. On iOS, Safari treats a top-level
 * navigation to a `video/mp4` URL as "open the built-in video player", not
 * "download the file" — the file never reaches Files/Photos, no matter what
 * the URL's own headers say. There is no reliable way to make a plain link
 * navigation download on iOS; the fix has to be a user-initiated JS flow
 * that either (a) hands the browser an already-in-memory File via the Web
 * Share API — which iOS renders as its native share sheet with real "Save
 * Video"/"Save to Files" actions — or (b) triggers a blob-backed anchor
 * download, which works everywhere Web Share doesn't (most desktop
 * browsers).
 *
 * Every browser-touching operation (fetch, Web Share, anchor click) is
 * injected rather than called directly, so this file needs no DOM/jsdom to
 * unit-test — same dependency-injection pattern as every other
 * external-effect boundary in this codebase (TtsProvider, RenderClient,
 * NarrationStorageClient, ...). The real browser wiring lives only in
 * components/create/DownloadVideoButton.tsx.
 */

/** Deterministic, sensible .mp4 filename — never trusts anything from the network response (content-type, server-suggested name, etc.), only data already known client-side. */
export function buildExportFilename(projectId: string | null): string {
  const safeId = projectId ? projectId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 8) : "";
  return `movo-video-${safeId || "export"}.mp4`;
}

export type FetchVideoBlobDeps = {
  /** A plain `fetch(url).then(r => r.blob())`-style call — throws/rejects on any non-2xx response or network failure. */
  fetchBlob: (url: string) => Promise<Blob>;
  /**
   * Re-signs the SAME already-exported MP4's existing Storage path and
   * returns a fresh signed URL, or null if that isn't possible right now
   * (e.g. the render job can no longer be found). Must never start a new
   * render — see lib/actions/export-actions.ts's checkExportProgressAction,
   * which is safe to call again on an already-"succeeded" job: it only
   * re-signs the existing object, no Remotion Lambda call happens.
   */
  refreshUrl: () => Promise<string | null>;
};

/**
 * No error string here on purpose: this module stays language-agnostic (the
 * app has a real, actively-used English locale alongside Arabic — see
 * lib/i18n/dictionaries/*.ts) and never surfaces raw fetch/JS error details
 * that might otherwise tempt a caller into logging or displaying them (which
 * could leak the signed URL itself via a caught exception's message). The
 * caller (components/create/DownloadVideoButton.tsx) maps `ok: false` to one
 * translated, user-facing message via `t("create.exportDownloadError")`.
 */
export type FetchVideoBlobResult = { ok: true; blob: Blob } | { ok: false };

/**
 * Fetches the exported video's bytes, transparently retrying once with a
 * freshly re-signed URL if the first attempt fails — the expected failure
 * mode once a signed URL's expiry window (see
 * lib/render/final-video-storage.ts's FINAL_VIDEO_SIGNED_URL_EXPIRY_SECONDS)
 * has passed.
 */
export async function fetchExportVideoBlob(url: string, deps: FetchVideoBlobDeps): Promise<FetchVideoBlobResult> {
  try {
    return { ok: true, blob: await deps.fetchBlob(url) };
  } catch {
    const fresh = await deps.refreshUrl();
    if (!fresh) return { ok: false };
    try {
      return { ok: true, blob: await deps.fetchBlob(fresh) };
    } catch {
      return { ok: false };
    }
  }
}

export type DeliverVideoDeps = {
  /** Feature-detection only — must check *file* sharing support specifically (`navigator.canShare?.({ files: [file] })`), not just whether `navigator.share` exists (most desktop browsers support sharing text/links but not files). */
  canShareFiles: (file: File) => boolean;
  /** `navigator.share({ files: [file], ... })` — rejects with an AbortError-named error when the user dismisses the native share sheet without choosing an action. */
  shareFiles: (file: File) => Promise<void>;
  /** A blob-URL-backed anchor click-and-revoke — the reliable cross-browser "just download this" fallback. */
  triggerBlobDownload: (blob: Blob, filename: string) => void;
};

export type DeliverVideoOutcome =
  | { ok: true; method: "share" }
  | { ok: true; method: "blob-download" }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false };

/**
 * Given an already-fetched video Blob, prefers the native Web Share API
 * with a real File — on iOS this opens the native share sheet with actual
 * "Save Video" / "Save to Files" actions, not just "open in player" — and
 * falls back to a plain blob-anchor download whenever file sharing isn't
 * supported, or fails for a real reason. A user simply dismissing the share
 * sheet (`AbortError`) is reported as `cancelled`, never as an error and
 * never followed by a redundant forced download — that would be surprising
 * after the user explicitly closed the sheet.
 */
export async function deliverExportVideo(blob: Blob, filename: string, deps: DeliverVideoDeps): Promise<DeliverVideoOutcome> {
  const file = new File([blob], filename, { type: "video/mp4" });

  if (deps.canShareFiles(file)) {
    try {
      await deps.shareFiles(file);
      return { ok: true, method: "share" };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, cancelled: true };
      }
      // Sharing failed for a real reason (permission denied, transient OS
      // error, etc.) — fall through to the direct download rather than
      // leaving the user with nothing.
    }
  }

  try {
    deps.triggerBlobDownload(blob, filename);
    return { ok: true, method: "blob-download" };
  } catch {
    return { ok: false, cancelled: false };
  }
}
