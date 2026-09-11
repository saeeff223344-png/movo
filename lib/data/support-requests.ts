export type SupportStatus = "new" | "in_progress" | "resolved";

export type SupportRequest = {
  id: string;
  title: string;
  type: string;
  status: SupportStatus;
  createdAt: string;
};

// Mock tickets for UI demonstration — replaced by real data once support has a backend.
export const mockSupportRequests: SupportRequest[] = [
  {
    id: "SUP-1042",
    title: "استفسار حول تفعيل الاشتراك السنوي",
    type: "subscription",
    status: "in_progress",
    createdAt: "2026-09-02",
  },
  {
    id: "SUP-1031",
    title: "الفيديو التجريبي لم يظهر في المعاينة",
    type: "video",
    status: "resolved",
    createdAt: "2026-08-27",
  },
  {
    id: "SUP-1055",
    title: "مشكلة تقنية عند رفع الشعار",
    type: "technical",
    status: "new",
    createdAt: "2026-09-09",
  },
];
