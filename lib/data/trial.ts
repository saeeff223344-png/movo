import type { TrialStatus } from "@/lib/types/account";

export type { TrialStatus };

// Mock only — real trial usage will be enforced by the backend once it exists.
export const mockTrial: TrialStatus = {
  used: false,
  usedAt: null,
};
