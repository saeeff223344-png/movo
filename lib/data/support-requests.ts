export type SupportStatus = "new" | "in_progress" | "resolved";

export type SupportRequest = {
  id: string;
  title: string;
  type: string;
  status: SupportStatus;
  createdAt: string;
};
