export type SupportCategory =
  | "account"
  | "subscription"
  | "payment"
  | "generation"
  | "video"
  | "ai"
  | "render"
  | "technical"
  | "other";

export type SupportPriority = "low" | "normal" | "high" | "urgent";
export type SupportStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

export type SupportMessage = {
  id: string;
  author: string;
  authorType: "user" | "admin";
  message: string;
  createdAt: string;
};

export type AdminSupportTicket = {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  assignedAdmin: string | null;
  createdAt: string;
  lastReplyAt: string;
  messages: SupportMessage[];
};

export type AdminNotificationType =
  | "new_user"
  | "subscription"
  | "payment"
  | "expiry"
  | "code_used"
  | "support"
  | "ai_failure"
  | "render_failure"
  | "system";

export type AdminNotification = {
  id: string;
  type: AdminNotificationType;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  read: boolean;
  createdAt: string;
};

export type BroadcastAudience =
  | "all"
  | "trial"
  | "active_subscribers"
  | "monthly"
  | "yearly"
  | "specific";

export type AnnouncementType = "info" | "success" | "warning" | "promotion" | "maintenance";
export type AnnouncementLocation = "homepage" | "dashboard" | "subscription" | "global";

export type Announcement = {
  id: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  type: AnnouncementType;
  location: AnnouncementLocation;
  startAt: string | null;
  endAt: string | null;
  dismissible: boolean;
  enabled: boolean;
  audience: BroadcastAudience;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};
