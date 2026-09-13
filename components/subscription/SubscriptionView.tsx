"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { PlanId, SubscriptionStatus } from "@/lib/types/account";
import { StatusCard } from "@/components/subscription/StatusCard";
import { PlanCards } from "@/components/subscription/PlanCards";
import { ActivationForm } from "@/components/subscription/ActivationForm";
import { HowToGetCode } from "@/components/subscription/HowToGetCode";
import type { PublicPlan } from "@/lib/supabase/plans";
import type { SubscriptionContact, PaymentContact, SubscriptionContactPerson } from "@/lib/supabase/contact";

export function SubscriptionView({
  initialSubscription,
  trialUsed,
  plans,
  contact,
  paymentContact,
  subscriptionContacts,
}: {
  initialSubscription: SubscriptionStatus;
  trialUsed: boolean;
  plans: PublicPlan[] | null;
  contact: SubscriptionContact | null;
  paymentContact: PaymentContact | null;
  subscriptionContacts: SubscriptionContactPerson[];
}) {
  const { t } = useI18n();
  const [subscription, setSubscription] = useState<SubscriptionStatus>(initialSubscription);

  function handleActivated(plan: PlanId, expiryDate: string) {
    setSubscription({
      active: true,
      plan,
      startDate: new Date().toISOString().slice(0, 10),
      expiryDate: expiryDate.slice(0, 10),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
          {t("subscription.title")}
        </h1>
        <p className="mt-1 text-sm text-secondary">{t("subscription.subtitle")}</p>
      </div>

      {!subscription.active && (
        <div className="flex items-start gap-3 rounded-2xl border border-brand-500/25 bg-brand-500/5 p-4 text-sm leading-relaxed text-secondary">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-400" />
          <p>
            {trialUsed ? t("subscription.noFreePlanTrialUsed") : t("subscription.noFreePlanNotice")}
          </p>
        </div>
      )}

      <StatusCard subscription={subscription} />
      <PlanCards activePlan={subscription.plan} plans={plans} />
      <ActivationForm onActivated={handleActivated} />
      <HowToGetCode contact={contact} paymentContact={paymentContact} subscriptionContacts={subscriptionContacts} />
    </div>
  );
}
