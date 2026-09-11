export type TrialStatus = {
  used: boolean;
  usedAt: string | null;
};

export type PlanId = "monthly" | "yearly";

export type SubscriptionStatus = {
  active: boolean;
  plan: PlanId | null;
  startDate: string | null;
  expiryDate: string | null;
};
