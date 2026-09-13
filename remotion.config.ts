/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import path from "node:path";
import { Config } from "@remotion/cli/config";

// Rspack was previously enabled here, but is currently broken in this
// environment/dependency combination: bundling silently fails to produce
// bundle.js (ENOENT) for EVERY composition, including AdDemo (verified
// unchanged by this phase's work — the same failure reproduces before any
// PlanRender-related code exists). Falls back to Remotion's default
// webpack bundler, which was verified working end-to-end (a real local
// render of PlanRender produced a valid MP4 with correct resolution and
// narration audio). Revisit re-enabling Rspack once its bundling failure is
// diagnosed — this is unrelated to the "@" alias fix below.
Config.setRspack(false);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

/**
 * Remotion's own CLI/Lambda bundler uses an independent webpack config from
 * Next.js's — it has no idea about tsconfig.json's `"@/*"` path mapping,
 * which every composition file (e.g. remotion/compositions/PlanComposition.tsx
 * importing "@/lib/audio/music-ducking") relies on. Without this, `remotion
 * render`/`remotion lambda sites create` fail with "Module not found" for
 * every `@/...` import. Mirrors exactly what Next.js's own webpack config
 * already does for the same alias — required for both local rendering and
 * the real Remotion Lambda site bundle (see lib/render/remotion-lambda-client.ts).
 */
Config.overrideWebpackConfig((currentConfiguration) => ({
  ...currentConfiguration,
  resolve: {
    ...currentConfiguration.resolve,
    alias: {
      ...currentConfiguration.resolve?.alias,
      "@": path.resolve(process.cwd()),
    },
  },
}));
