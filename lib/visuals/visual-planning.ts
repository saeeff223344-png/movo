import type { PlannedScene } from "@/lib/ai/video-plan-schema";
import { getMaxAutoVisualsPerVideo } from "@/lib/visuals/visual-config";
import { buildSceneVisualPrompt, pickImageSize, visualPromptDedupeKey } from "@/lib/visuals/visual-prompt-builder";
import type { ResolvedSceneVisual, VisualAssetUploader, VisualPlanningPlan, VisualProvider } from "@/lib/visuals/types";

/**
 * Automatic Visual Assets phase — the pure orchestration layer behind
 * lib/actions/visual-actions.ts, exactly like lib/audio/plan-narration.ts
 * is behind narration-actions.ts: every network call (image generation,
 * Storage upload) is injected, so this file is fully unit-testable with
 * fakes and never makes a real network/paid call itself.
 *
 * This module ONLY decides/generates the *automatic* (lowest-priority)
 * tier of Requirement 3's asset priority chain. The higher-priority tiers
 * (user product photo > user logo > other user asset) are resolved first
 * by the caller using the existing, already-correct pickAssetForScene in
 * lib/ai/plan-to-scenes.ts — this module is only ever asked to fill in the
 * scenes that step left uncovered (see `hasUserAssetForScene` below), so a
 * good user-supplied product photo can never be shadowed by a generic
 * generated image.
 */

/**
 * Whether a scene's visual plan calls for an image at all. A scene with no
 * `visual` opinion (every plan generated before this phase, or a model
 * output that left it null) is treated as eligible by default — rather
 * than silently opting old-shaped plans out of automatic visuals — its
 * final priority is just the same as an unspecified "secondary" scene, so
 * it competes normally against scenes that did get an explicit importance.
 */
function needsVisual(scene: PlannedScene): boolean {
  const visual = scene.visual;
  if (!visual) return true;
  if (visual.role === "none") return false;
  if (visual.usage === "none") return false;
  return true;
}

const IMPORTANCE_RANK: Record<"primary" | "secondary" | "minimal", number> = { primary: 3, secondary: 2, minimal: 1 };

/** Legacy/unspecified importance defaults to "secondary" rather than the extremes, so it neither jumps the queue ahead of a deliberate "primary" pick nor gets starved behind every "minimal" one. */
function importanceRank(scene: PlannedScene): number {
  const importance = scene.visual?.importance;
  return importance ? IMPORTANCE_RANK[importance] : IMPORTANCE_RANK.secondary;
}

type DedupeGroup = {
  dedupeKey: string;
  prompt: string;
  /** Scene ids sharing this exact (normalized) prompt, in plan order — Requirement 12's reuse/dedup: these all get the SAME generated image rather than one call each. */
  sceneIds: string[];
  rank: number;
  firstIndex: number;
};

/**
 * Groups every visual-needing, not-already-user-covered scene by its
 * normalized prompt (Requirement 12: reuse identical visual needs instead
 * of generating duplicates), then ranks the resulting unique groups by
 * their best member's importance (ties broken by earliest scene order) —
 * highest-ranked groups are the ones that actually get a real provider
 * call once the cost cap is applied.
 */
function groupScenesByVisualNeed(plan: VisualPlanningPlan, hasUserAssetForScene: (scene: PlannedScene) => boolean): DedupeGroup[] {
  const groups = new Map<string, DedupeGroup>();

  plan.scenes.forEach((scene, index) => {
    if (hasUserAssetForScene(scene) || !needsVisual(scene)) return;

    const prompt = buildSceneVisualPrompt(plan, scene);
    const dedupeKey = visualPromptDedupeKey(prompt);
    const rank = importanceRank(scene);

    const existing = groups.get(dedupeKey);
    if (existing) {
      existing.sceneIds.push(scene.id);
      existing.rank = Math.max(existing.rank, rank);
    } else {
      groups.set(dedupeKey, { dedupeKey, prompt, sceneIds: [scene.id], rank, firstIndex: index });
    }
  });

  return Array.from(groups.values()).sort((a, b) => b.rank - a.rank || a.firstIndex - b.firstIndex);
}

/**
 * Resolves every scene's automatic visual, subject to Requirement 12's cost
 * cap: at most `maxVisuals` real provider calls are made no matter how many
 * scenes want an image. Groups beyond the cap reuse the highest-ranked
 * *successfully generated* group's image rather than going without —
 * still one coherent campaign (Requirement 6), and better than a bare
 * gradient — falling back to genuinely empty only when every real
 * generation attempt failed (Requirement 11: a provider outage degrades to
 * the existing motion/layout engine, never fails the whole plan).
 *
 * Never throws: a single failed generateImage or uploadImage call is
 * logged-by-omission (that group is simply skipped) rather than
 * propagated, exactly like lib/audio/plan-narration.ts treats a single
 * scene's TTS/upload failure as "no audio for that scene", not a crash.
 */
export async function resolveAutoVisuals(
  plan: VisualPlanningPlan,
  hasUserAssetForScene: (scene: PlannedScene) => boolean,
  generateImage: VisualProvider["generateImage"],
  uploadImage: VisualAssetUploader,
  maxVisuals: number = getMaxAutoVisualsPerVideo(),
): Promise<Record<string, ResolvedSceneVisual>> {
  const groups = groupScenesByVisualNeed(plan, hasUserAssetForScene);
  if (groups.length === 0) return {};

  const size = pickImageSize(plan.aspectRatio);
  const [width, height] = size.split("x").map(Number);

  const result: Record<string, ResolvedSceneVisual> = {};
  const generatedGroups: { sceneIds: string[]; visual: ResolvedSceneVisual }[] = [];

  const toGenerate = groups.slice(0, Math.max(0, maxVisuals));
  for (const group of toGenerate) {
    const generated = await generateImage({ prompt: group.prompt, width, height });
    if (!generated.ok) continue;

    const upload = await uploadImage(group.sceneIds[0], generated.dataUrl);
    if (!upload.ok) continue;

    const visual: ResolvedSceneVisual = {
      sceneId: group.sceneIds[0],
      url: upload.signedUrl,
      source: "auto-generated",
      storagePath: upload.path,
      prompt: group.prompt,
      provider: generated.provider,
      estimatedUsd: generated.estimatedUsd,
    };
    for (const sceneId of group.sceneIds) result[sceneId] = { ...visual, sceneId };
    generatedGroups.push({ sceneIds: group.sceneIds, visual });
  }

  if (generatedGroups.length === 0) return {};

  // Reuse the single best (already generated) visual for every scene whose
  // own group didn't make the cost cap — keeps the campaign visual-first
  // even when there are more visual-needing scenes than the cap allows.
  const reuseVisual = generatedGroups[0].visual;
  for (const group of groups.slice(toGenerate.length)) {
    for (const sceneId of group.sceneIds) {
      if (!result[sceneId]) result[sceneId] = { ...reuseVisual, sceneId };
    }
  }

  return result;
}
