import type { PlanId, SubscriptionStatus } from "@/lib/types/account";

export type { PlanId, SubscriptionStatus };

// Mock only — no active subscription until a real activation flow exists.
export const mockSubscription: SubscriptionStatus = {
  active: false,
  plan: null,
  startDate: null,
  expiryDate: null,
};

export type ActivationResult =
  | { status: "valid"; plan: PlanId }
  | { status: "invalid" }
  | { status: "used" }
  | { status: "expired" };

/**
 * Client-side mock of activation-code validation, for UI demonstration only.
 * The real check will run against the backend once accounts/codes exist.
 */
export function checkActivationCode(rawCode: string): ActivationResult {
  const code = rawCode.trim().toUpperCase();

  if (code === "MOVO-MONTHLY-DEMO") return { status: "valid", plan: "monthly" };
  if (code === "MOVO-YEARLY-DEMO") return { status: "valid", plan: "yearly" };
  if (code === "MOVO-USED-DEMO") return { status: "used" };
  if (code === "MOVO-EXPIRED-DEMO") return { status: "expired" };

  return { status: "invalid" };
}
