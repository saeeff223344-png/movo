"use client";

import Link from "next/link";
import {
  Bot,
  Cpu,
  Gift,
  LifeBuoy,
  Megaphone,
  Plus,
  Search,
  Ticket,
  UserPlus,
  Users,
  Wallet,
  Home as HomeIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { MetricCard } from "@/components/admin/ui/MetricCard";
import { ChartCard, MiniBarChart } from "@/components/admin/ui/ChartCard";
import { MoneyDisplay } from "@/components/admin/ui/MoneyDisplay";
import type { AdminDashboardData } from "@/lib/admin/services/dashboard";
import { formatNumber } from "@/lib/admin/utils/format";

export function DashboardView({ data }: { data: AdminDashboardData }) {
  const { t } = useI18n();

  const quickActions = [
    { href: "/admin/admins", icon: UserPlus, label: t("admin.quick.createAdmin") },
    { href: "/admin/activation-codes", icon: Ticket, label: t("admin.quick.generateCode") },
    { href: "/admin/subscriptions", icon: Wallet, label: t("admin.quick.activateSubscription") },
    { href: "/admin/payments", icon: Plus, label: t("admin.quick.addPayment") },
    { href: "/admin/users", icon: Search, label: t("admin.quick.searchUser") },
    { href: "/admin/announcements", icon: Megaphone, label: t("admin.quick.addAnnouncement") },
    { href: "/admin/homepage", icon: HomeIcon, label: t("admin.quick.editHomepage") },
    { href: "/admin/support", icon: LifeBuoy, label: t("admin.quick.openSupport") },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader title={t("admin.nav.dashboard")} description={t("admin.dashboard.subtitle")} />

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">{t("admin.dashboard.usersSection")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard icon={Users} label={t("admin.metric.totalUsers")} value={formatNumber(data.users.total)} />
          <MetricCard label={t("admin.metric.newToday")} value={formatNumber(data.users.newToday)} />
          <MetricCard label={t("admin.metric.newThisWeek")} value={formatNumber(data.users.newThisWeek)} />
          <MetricCard label={t("admin.metric.newThisMonth")} value={formatNumber(data.users.newThisMonth)} />
          <MetricCard label={t("admin.metric.activeUsers")} value={formatNumber(data.users.active)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">{t("admin.dashboard.subscriptionsSection")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <MetricCard icon={Wallet} label={t("admin.metric.totalSubscribers")} value={formatNumber(data.subscriptions.totalSubscribers)} />
          <MetricCard label={t("admin.metric.active")} value={formatNumber(data.subscriptions.active)} />
          <MetricCard label={t("admin.metric.monthly")} value={formatNumber(data.subscriptions.monthly)} />
          <MetricCard label={t("admin.metric.annual")} value={formatNumber(data.subscriptions.annual)} />
          <MetricCard label={t("admin.metric.expiringSoon")} value={formatNumber(data.subscriptions.expiringSoon)} />
          <MetricCard label={t("admin.metric.cancelled")} value={formatNumber(data.subscriptions.cancelled)} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section>
          <h2 className="mb-3 text-sm font-bold text-muted">{t("admin.dashboard.trialsSection")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard icon={Gift} label={t("admin.metric.trialsAvailable")} value={formatNumber(data.trials.available)} />
            <MetricCard label={t("admin.metric.trialsUsed")} value={formatNumber(data.trials.used)} />
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-bold text-muted">{t("admin.dashboard.aiSection")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard icon={Bot} label={t("admin.metric.aiRequests")} value={formatNumber(data.ai.requests)} />
            <MetricCard label={t("admin.metric.aiCost")} value={`$${data.ai.estimatedCostUsd}`} />
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-bold text-muted">{t("admin.dashboard.rendersSection")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard icon={Cpu} label={t("admin.metric.rendering")} value={formatNumber(data.renders.rendering)} />
            <MetricCard label={t("admin.metric.renderFailed")} value={formatNumber(data.renders.failed)} />
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">{t("admin.dashboard.financeSection")}</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
          <MetricCard label={t("admin.metric.revenueMonth")} value={<MoneyDisplay amount={data.finance.revenueMonth} />} />
          <MetricCard
            label={t("admin.metric.netProfit")}
            value={<MoneyDisplay amount={data.finance.netProfitMonth} />}
            deltaLabel={`${data.finance.marginPercent}% ${t("admin.metric.margin")}`}
          />
          <ChartCard title={t("admin.dashboard.revenueTrend")}>
            <MiniBarChart data={data.finance.byMonth.map((m) => ({ label: m.month, value: m.revenue }))} />
          </ChartCard>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">{t("admin.dashboard.supportSection")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label={t("admin.metric.openTickets")} value={formatNumber(data.support.open)} />
          <MetricCard label={t("admin.metric.urgentTickets")} value={formatNumber(data.support.urgent)} />
          <MetricCard label={t("admin.metric.waitingTickets")} value={formatNumber(data.support.waiting)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">{t("admin.dashboard.quickActions")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-border-subtle bg-surface p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-500/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 transition-transform group-hover:scale-110">
                <action.icon className="size-5" strokeWidth={2} />
              </span>
              <span className="text-xs font-bold text-primary">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
