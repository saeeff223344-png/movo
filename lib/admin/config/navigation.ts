import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CreditCard,
  Ticket,
  Gift,
  Wallet,
  FolderKanban,
  Clapperboard,
  Bot,
  Cpu,
  Gauge,
  Banknote,
  LifeBuoy,
  Bell,
  Megaphone,
  Home,
  FileText,
  Sparkles,
  HelpCircle,
  Code2,
  BookOpen,
  Scale,
  Compass,
  PanelBottom,
  Share2,
  Search,
  Image,
  ShieldCheck,
  Languages,
  Flag,
  Activity,
  HeartPulse,
  Settings,
  Mail,
} from "lucide-react";
import type { PermissionResource } from "@/lib/admin/config/permissions";

export type AdminNavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  resource: PermissionResource;
};

export type AdminNavGroup = {
  id: string;
  labelKey: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "home",
    labelKey: "admin.navGroup.home",
    items: [{ href: "/admin", labelKey: "admin.nav.dashboard", icon: LayoutDashboard, resource: "dashboard" }],
  },
  {
    id: "customers",
    labelKey: "admin.navGroup.customers",
    items: [
      { href: "/admin/users", labelKey: "admin.nav.users", icon: Users, resource: "users" },
      { href: "/admin/subscribers", labelKey: "admin.nav.subscribers", icon: UserCog, resource: "subscriptions" },
      { href: "/admin/subscriptions", labelKey: "admin.nav.subscriptions", icon: CreditCard, resource: "subscriptions" },
      { href: "/admin/trials", labelKey: "admin.nav.trials", icon: Gift, resource: "trials" },
    ],
  },
  {
    id: "billing",
    labelKey: "admin.navGroup.billing",
    items: [
      { href: "/admin/plans", labelKey: "admin.nav.plans", icon: Wallet, resource: "plans" },
      { href: "/admin/activation-codes", labelKey: "admin.nav.codes", icon: Ticket, resource: "codes" },
      { href: "/admin/payments", labelKey: "admin.nav.payments", icon: Banknote, resource: "payments" },
    ],
  },
  {
    id: "production",
    labelKey: "admin.navGroup.production",
    items: [
      { href: "/admin/projects", labelKey: "admin.nav.projects", icon: FolderKanban, resource: "projects" },
      { href: "/admin/videos", labelKey: "admin.nav.videos", icon: Clapperboard, resource: "videos" },
      { href: "/admin/ai-jobs", labelKey: "admin.nav.aiJobs", icon: Bot, resource: "ai_jobs" },
      { href: "/admin/render-jobs", labelKey: "admin.nav.renderJobs", icon: Cpu, resource: "render_jobs" },
      { href: "/admin/usage", labelKey: "admin.nav.usage", icon: Gauge, resource: "usage" },
    ],
  },
  {
    id: "business",
    labelKey: "admin.navGroup.business",
    items: [
      { href: "/admin/finance", labelKey: "admin.nav.finance", icon: Banknote, resource: "finance" },
      { href: "/admin/support", labelKey: "admin.nav.support", icon: LifeBuoy, resource: "support" },
      { href: "/admin/notifications", labelKey: "admin.nav.notifications", icon: Bell, resource: "notifications" },
    ],
  },
  {
    id: "site",
    labelKey: "admin.navGroup.site",
    items: [
      { href: "/admin/homepage", labelKey: "admin.nav.homepage", icon: Home, resource: "homepage" },
      { href: "/admin/announcements", labelKey: "admin.nav.announcements", icon: Megaphone, resource: "announcements" },
      { href: "/admin/examples", labelKey: "admin.nav.examples", icon: Sparkles, resource: "examples" },
      { href: "/admin/faq", labelKey: "admin.nav.faq", icon: HelpCircle, resource: "faq" },
      { href: "/admin/pages", labelKey: "admin.nav.pages", icon: FileText, resource: "pages" },
      { href: "/admin/developers", labelKey: "admin.nav.developers", icon: Code2, resource: "developers" },
      { href: "/admin/content", labelKey: "admin.nav.content", icon: BookOpen, resource: "content" },
      { href: "/admin/legal", labelKey: "admin.nav.legal", icon: Scale, resource: "legal" },
    ],
  },
  {
    id: "appearance",
    labelKey: "admin.navGroup.appearance",
    items: [
      { href: "/admin/navigation", labelKey: "admin.nav.navigation", icon: Compass, resource: "navigation" },
      { href: "/admin/footer", labelKey: "admin.nav.footer", icon: PanelBottom, resource: "footer" },
      { href: "/admin/social", labelKey: "admin.nav.social", icon: Share2, resource: "social" },
      { href: "/admin/seo", labelKey: "admin.nav.seo", icon: Search, resource: "seo" },
      { href: "/admin/assets", labelKey: "admin.nav.assets", icon: Image, resource: "assets" },
    ],
  },
  {
    id: "system",
    labelKey: "admin.navGroup.system",
    items: [
      { href: "/admin/admins", labelKey: "admin.nav.admins", icon: ShieldCheck, resource: "admins" },
      { href: "/admin/localization", labelKey: "admin.nav.localization", icon: Languages, resource: "localization" },
      { href: "/admin/feature-flags", labelKey: "admin.nav.featureFlags", icon: Flag, resource: "feature_flags" },
      { href: "/admin/activity", labelKey: "admin.nav.activity", icon: Activity, resource: "audit" },
      { href: "/admin/system-health", labelKey: "admin.nav.systemHealth", icon: HeartPulse, resource: "system_health" },
      { href: "/admin/email", labelKey: "admin.nav.email", icon: Mail, resource: "settings" },
      { href: "/admin/settings", labelKey: "admin.nav.settings", icon: Settings, resource: "settings" },
    ],
  },
];
