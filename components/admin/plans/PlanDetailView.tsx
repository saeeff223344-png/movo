"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/admin/ui/Toggle";
import { BilingualField } from "@/components/admin/ui/BilingualField";
import { FieldLabel, NumberInput, SelectField } from "@/components/admin/ui/FormField";
import { DetailTabs, type DetailTab } from "@/components/admin/ui/DetailTabs";
import { SettingsRow } from "@/components/admin/ui/SettingsSection";
import { ProfitSimulator } from "@/components/admin/plans/ProfitSimulator";
import { AuthError } from "@/components/auth/AuthError";
import { updatePlanAction } from "@/lib/admin/actions/billing-actions";
import type { SubscriptionPlan } from "@/lib/admin/types/billing";
import type { FinanceCostConfig } from "@/lib/admin/types/finance";

export function PlanDetailView({ plan, costConfig }: { plan: SubscriptionPlan; costConfig: FinanceCostConfig }) {
  const { t } = useI18n();
  const [form, setForm] = useState(plan);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof SubscriptionPlan>(key: K, value: SubscriptionPlan[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updatePlanAction(plan.id, form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  const detailsTab = (
    <div className="max-w-2xl space-y-5">
      <BilingualField
        label={t("admin.plans.name")}
        valueAr={form.nameAr}
        valueEn={form.nameEn}
        onChangeAr={(v) => update("nameAr", v)}
        onChangeEn={(v) => update("nameEn", v)}
      />
      <BilingualField
        label={t("admin.plans.description")}
        valueAr={form.descriptionAr}
        valueEn={form.descriptionEn}
        onChangeAr={(v) => update("descriptionAr", v)}
        onChangeEn={(v) => update("descriptionEn", v)}
        multiline
      />
      <div className="grid grid-cols-2 gap-4">
        <FieldLabel label={t("admin.plans.price")}>
          <NumberInput value={form.price} onChange={(v) => update("price", v)} suffix="IQD" />
        </FieldLabel>
        <FieldLabel label={t("admin.plans.durationDays")}>
          <NumberInput value={form.durationDays} onChange={(v) => update("durationDays", v)} suffix={t("admin.plans.days")} />
        </FieldLabel>
      </div>
      <SettingsRow label={t("admin.status.active")}>
        <Toggle checked={form.active} onChange={(v) => update("active", v)} />
      </SettingsRow>
      <SettingsRow label={t("admin.plans.featured")}>
        <Toggle checked={form.featured} onChange={(v) => update("featured", v)} />
      </SettingsRow>
      <FieldLabel label={t("admin.plans.displayOrder")}>
        <NumberInput value={form.displayOrder} onChange={(v) => update("displayOrder", v)} />
      </FieldLabel>

      <AuthError message={error} />
      <Button size="sm" onClick={handleSave} disabled={saving}>
        <Save className="size-4" />
        {saving ? t("common.loading") : saved ? t("admin.common.saved") : t("admin.common.saveChanges")}
      </Button>
    </div>
  );

  const limitsTab = (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      {(Object.keys(form.limits) as (keyof typeof form.limits)[])
        .filter((key) => key !== "maxResolution")
        .map((key) => (
          <FieldLabel key={key} label={t(`admin.limitField.${key}`)}>
            <NumberInput
              value={form.limits[key] as number}
              onChange={(v) => update("limits", { ...form.limits, [key]: v })}
            />
          </FieldLabel>
        ))}
      <FieldLabel label={t("admin.limitField.maxResolution")}>
        <SelectField
          value={form.limits.maxResolution}
          onChange={(v) => update("limits", { ...form.limits, maxResolution: v })}
          options={[
            { value: "1080p", label: "1080p" },
            { value: "2k", label: "2K" },
            { value: "4k", label: "4K" },
          ]}
        />
      </FieldLabel>
    </div>
  );

  const featuresTab = (
    <div className="max-w-md space-y-1">
      {(Object.keys(form.features) as (keyof typeof form.features)[]).map((key) => (
        <SettingsRow key={key} label={t(`admin.featureField.${key}`)}>
          <Toggle
            checked={form.features[key]}
            onChange={(v) => update("features", { ...form.features, [key]: v })}
          />
        </SettingsRow>
      ))}
    </div>
  );

  const tabs: DetailTab[] = [
    { id: "details", label: t("admin.tabs.details"), content: detailsTab },
    { id: "limits", label: t("admin.plans.limitsTab"), content: limitsTab },
    { id: "features", label: t("admin.plans.featuresTab"), content: featuresTab },
    { id: "simulator", label: t("admin.plans.simulatorTab"), content: <ProfitSimulator plan={form} costConfig={costConfig} /> },
  ];

  return (
    <div>
      <AdminPageHeader title={t("admin.nav.plans")} description={plan.nameAr} backHref="/admin/plans" />
      <DetailTabs tabs={tabs} />
    </div>
  );
}
