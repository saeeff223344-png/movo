import type { Revision } from "@/lib/types/video";
import type { AdCompositionProps } from "@/remotion/compositions/ad-types";

/**
 * Mock natural-language revision service.
 *
 * This is a light keyword demo, not a real parser — it exists so the UX of
 * "describe a change, see it applied" can be felt before an LLM is wired in.
 * `applyRevision` is the intended service boundary for that future call.
 */

export type RevisionOutcome = {
  props: AdCompositionProps;
  revision: Revision;
};

const PRICE_PATTERN = /[\d٠-٩][\d٠-٩,،.]*/;

export function applyRevision(
  currentProps: AdCompositionProps,
  message: string,
): RevisionOutcome {
  const lower = message.toLowerCase();
  const props = { ...currentProps };
  const appliedChanges: string[] = [];

  if (/أسود|luxury|فاخر|black/.test(lower)) {
    props.style = "luxury";
    appliedChanges.push("style → luxury");
  } else if (/أسرع|fast|سريع|quick/.test(lower)) {
    props.style = "energetic";
    appliedChanges.push("style → energetic");
  } else if (/مرح|fun|playful/.test(lower)) {
    props.style = "fun";
    appliedChanges.push("style → fun");
  } else if (/تقني|tech/.test(lower)) {
    props.style = "tech";
    appliedChanges.push("style → tech");
  } else if (/minimal|بسيط/.test(lower)) {
    props.style = "minimal";
    appliedChanges.push("style → minimal");
  }

  const priceMatch = message.match(PRICE_PATTERN);
  if (priceMatch && /سعر|price|دينار|ريال|د\.ع/.test(lower + " " + message)) {
    props.price = priceMatch[0];
    appliedChanges.push(`price → ${priceMatch[0]}`);
  }

  if (/شعار|logo/.test(lower)) {
    appliedChanges.push("logo placement noted");
  }

  const appliedChangeSummary =
    appliedChanges.length > 0
      ? appliedChanges.join(", ")
      : "queued for the next generation engine update";

  const revision: Revision = {
    id: `rev_${Date.now()}`,
    message,
    createdAt: new Date().toISOString(),
    appliedChangeSummary,
  };

  return { props, revision };
}

export const REVISION_SIMULATION_MS = 1400;
