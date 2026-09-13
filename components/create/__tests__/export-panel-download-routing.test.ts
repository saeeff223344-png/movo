import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guards the exported-video download flow's routing specifically — that
 * ExportPanel.tsx never regresses back to a raw `<Button href={downloadUrl}>`
 * (or any other direct navigation to a signed MP4 URL), which is the exact
 * bug that made iOS Safari open the built-in video player instead of
 * downloading (see components/create/DownloadVideoButton.tsx's docstring).
 *
 * A real render-and-click test isn't possible here: this project's vitest
 * config runs under a plain `node` environment with no jsdom/React Testing
 * Library (see components/remotion/plan-preview-player-config.ts's test for
 * the same constraint), so a `.tsx` component can't be mounted. Reading the
 * source is a narrow, deliberate substitute for this one specific
 * regression — not a general-purpose testing strategy.
 */
const SOURCE = fs.readFileSync(path.join(process.cwd(), "components/create/ExportPanel.tsx"), "utf8");

describe("ExportPanel download routing", () => {
  it("renders DownloadVideoButton for a completed export", () => {
    expect(SOURCE).toContain("import { DownloadVideoButton }");
    expect(SOURCE).toMatch(/<DownloadVideoButton\s/);
  });

  it("never links a raw <Button href=...> (or any href) to the signed downloadUrl", () => {
    expect(SOURCE).not.toMatch(/href=\{?\s*(state\.)?downloadUrl/);
  });

  it("never navigates the page directly to the signed downloadUrl", () => {
    expect(SOURCE).not.toMatch(/window\.location[^;]*downloadUrl/);
    expect(SOURCE).not.toMatch(/window\.open\([^)]*downloadUrl/);
  });
});
