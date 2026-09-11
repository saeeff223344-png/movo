export type BillingPeriod = "monthly" | "yearly";

export type PlanLimits = {
  videos: number;
  aiText: number;
  aiImages: number;
  aiVideoSeconds: number;
  voiceSeconds: number;
  revisions: number;
  renderMinutes: number;
  storageMb: number;
  uploadMb: number;
  assetsPerProject: number;
  projects: number;
  maxResolution: "1080p" | "2k" | "4k";
};

export type PlanFeatures = {
  export1080p: boolean;
  export2k: boolean;
  export4k: boolean;
  voice: boolean;
  aiImages: boolean;
  aiVideo: boolean;
  watermark: boolean;
  priorityRendering: boolean;
};

export type SubscriptionPlan = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  currency: "IQD";
  billingPeriod: BillingPeriod;
  durationDays: number;
  active: boolean;
  featured: boolean;
  displayOrder: number;
  limits: PlanLimits;
  features: PlanFeatures;
};

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "suspended";
export type ActivationSource = "activation_code" | "manual" | "promotion";

export type AdminSubscription = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  price: number;
  currency: "IQD";
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  activationSource: ActivationSource;
  activationCode: string | null;
  activatedBy: string;
  paymentId: string | null;
  createdAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  notes: string | null;
};

export type ActivationCodeStatus = "available" | "used" | "expired" | "disabled";

export type ActivationCode = {
  id: string;
  code: string;
  planId: string;
  planName: string;
  durationDays: number;
  status: ActivationCodeStatus;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
  usedBy: string | null;
  usedAt: string | null;
  notes: string | null;
};

export type TrialRecord = {
  id: string;
  userId: string;
  userName: string;
  used: boolean;
  usedAt: string | null;
  projectId: string | null;
  videoId: string | null;
  resetCount: number;
  lastResetBy: string | null;
  lastResetReason: string | null;
};

export type PaymentMethod =
  | "manual"
  | "bank_transfer"
  | "mastercard"
  | "zaincash"
  | "asiahawala"
  | "other";

export type PaymentStatus = "pending" | "verified" | "rejected" | "refunded";

export type PaymentRecord = {
  id: string;
  userId: string;
  userName: string;
  subscriptionId: string | null;
  planName: string;
  amount: number;
  currency: "IQD";
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  date: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string | null;
};
