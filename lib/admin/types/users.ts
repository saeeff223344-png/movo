import type { Locale } from "@/lib/i18n/config";

export type UserStatus = "active" | "suspended";

export type UserAccount = {
  id: string;
  fullName: string;
  email: string;
  language: Locale;
  joinedAt: string;
  lastActiveAt: string | null;
  emailVerified: boolean;
  status: UserStatus;
  trialUsed: boolean;
  subscriptionActive: boolean;
  planName: string | null;
  videosUsed: number;
  videosRemaining: number | null;
  projectsCount: number;
};

export type AdminNote = {
  id: string;
  author: string;
  createdAt: string;
  note: string;
};
