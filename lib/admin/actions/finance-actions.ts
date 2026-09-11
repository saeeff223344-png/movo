"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { FinanceCostConfig } from "@/lib/admin/types/finance";

export async function updateCostConfigurationAction(
  patch: FinanceCostConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission("finance", "manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("finance_cost_config")
    .update({
      exchange_rate_usd_to_iqd: patch.exchangeRateUsdToIqd,
      text_ai_cost_per_request_usd: patch.textAiCostPerRequestUsd,
      image_ai_cost_per_image_usd: patch.imageAiCostPerImageUsd,
      video_ai_cost_per_second_usd: patch.videoAiCostPerSecondUsd,
      voice_cost_per_second_usd: patch.voiceCostPerSecondUsd,
      render_cost_per_minute_usd: patch.renderCostPerMinuteUsd,
      storage_cost_per_gb_usd: patch.storageCostPerGbUsd,
      bandwidth_cost_per_gb_usd: patch.bandwidthCostPerGbUsd,
      other_cost_per_video_usd: patch.otherCostPerVideoUsd,
    })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/finance");
  revalidatePath("/admin/plans");
  return { ok: true };
}
