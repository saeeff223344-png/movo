"use server";

import { requireUser } from "@/lib/supabase/auth-helpers";
import { getEntitlementStatusForUser } from "@/lib/supabase/usage";
import { generateVideoPlan } from "@/lib/ai/video-planner";
import type { PlannerErrorCode } from "@/lib/ai/planner-errors";
import type { VideoPlan } from "@/lib/ai/video-plan-schema";
import type { GenerationSettings } from "@/lib/types/video";

export type GenerateVideoPlanActionResult =
  | { ok: true; plan: VideoPlan }
  | { ok: false; code: PlannerErrorCode }
  | { ok: false; code: "trial_required" };

/**
 * Phase 1 of the real generation engine: turns a user's free-text brief into
 * a validated VideoPlan (lib/ai/video-plan-schema.ts) via OpenAI Structured
 * Outputs.
 *
 * The entitlement check here is a read-only pre-check — purely to avoid
 * spending real OpenAI credits on a request that can't succeed anyway. It
 * is NOT the authoritative enforcement point and never consumes the trial:
 * that happens in lib/actions/project-actions.ts's saveGeneratedProjectAction
 * (via lib/actions/project-persistence.ts's saveGeneratedProject), which is
 * the real, final gate — including against a direct server-action bypass
 * that skips this action entirely.
 */
export async function generateVideoPlanAction(
  prompt: string,
  settings: GenerationSettings,
): Promise<GenerateVideoPlanActionResult> {
  const user = await requireUser();

  const entitlement = await getEntitlementStatusForUser(user.id);
  if (!entitlement.canGenerate) return { ok: false, code: "trial_required" };

  return generateVideoPlan(prompt, settings);
}
