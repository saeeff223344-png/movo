import type { AspectRatio } from "@/lib/types/video";

/**
 * Dynamic AI Video Director + Runway Integration phase — Runway Gen-4
 * Turbo's `image_to_video` endpoint only accepts a fixed enum of
 * `<width>:<height>` ratio strings (confirmed against Runway's own
 * OpenAPI spec, https://docs.dev.runwayml.com/openapi.json, the same
 * source the earlier standalone test verified against): "1280:720",
 * "720:1280", "1104:832", "832:1104", "960:960", "1584:672". MOVO's own
 * three project aspect ratios each map onto the closest (in this case,
 * exact) Runway ratio.
 */
const RUNWAY_RATIO_BY_ASPECT_RATIO: Record<Exclude<AspectRatio, "auto">, string> = {
  "9:16": "720:1280",
  "16:9": "1280:720",
  "1:1": "960:960",
};

export function toRunwayRatio(aspectRatio: Exclude<AspectRatio, "auto">): string {
  return RUNWAY_RATIO_BY_ASPECT_RATIO[aspectRatio];
}
