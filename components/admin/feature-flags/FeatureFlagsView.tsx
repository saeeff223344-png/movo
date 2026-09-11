"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { SettingsSection, SettingsRow } from "@/components/admin/ui/SettingsSection";
import { Toggle } from "@/components/admin/ui/Toggle";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import type { FeatureFlag, FeatureFlagId } from "@/lib/admin/types/system";
import type { KillSwitches } from "@/lib/admin/types/system";
import { updateFeatureFlagAction, updateKillSwitchAction } from "@/lib/admin/actions/system-actions";

const KILL_SWITCH_KEYS: (keyof KillSwitches)[] = [
  "registrationsPaused",
  "generationPaused",
  "renderingPaused",
  "subscriptionActivationPaused",
  "aiVideoPaused",
  "uploadsPaused",
];

export function FeatureFlagsView({
  flags: initialFlags,
  killSwitches: initialKillSwitches,
}: {
  flags: FeatureFlag[];
  killSwitches: KillSwitches;
}) {
  const { t } = useI18n();
  const [flags, setFlags] = useState(initialFlags);
  const [killSwitches, setKillSwitches] = useState(initialKillSwitches);
  const [pendingSwitch, setPendingSwitch] = useState<keyof KillSwitches | null>(null);

  function toggleFlag(id: FeatureFlagId, enabled: boolean) {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, enabled, updatedAt: new Date().toISOString() } : f)));
    void updateFeatureFlagAction(id, enabled);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader title={t("admin.nav.featureFlags")} description={t("admin.featureFlags.subtitle")} />

      <SettingsSection title={t("admin.featureFlags.title")}>
        {flags.map((flag) => (
          <SettingsRow key={flag.id} label={t(`admin.flagLabel.${flag.id}`)} description={flag.description}>
            <Toggle checked={flag.enabled} onChange={(v) => toggleFlag(flag.id, v)} />
          </SettingsRow>
        ))}
      </SettingsSection>

      <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-6">
        <div className="mb-4 flex items-center gap-2 text-red-400">
          <AlertTriangle className="size-4" />
          <h2 className="text-sm font-bold">{t("admin.killSwitches.title")}</h2>
        </div>
        <p className="mb-4 text-xs text-red-400/80">{t("admin.killSwitches.warning")}</p>
        <div className="space-y-1">
          {KILL_SWITCH_KEYS.map((key) => (
            <SettingsRow key={key} label={t(`admin.killSwitchLabel.${key}`)}>
              <Toggle checked={killSwitches[key]} onChange={() => setPendingSwitch(key)} />
            </SettingsRow>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={pendingSwitch !== null}
        onClose={() => setPendingSwitch(null)}
        onConfirm={() => {
          if (!pendingSwitch) return;
          const next = !killSwitches[pendingSwitch];
          setKillSwitches((prev) => ({ ...prev, [pendingSwitch]: next }));
          void updateKillSwitchAction(pendingSwitch, next);
        }}
        title={pendingSwitch ? t(`admin.killSwitchLabel.${pendingSwitch}`) : ""}
        description={t("admin.confirm.killSwitch")}
        confirmLabel={t("admin.common.confirm")}
        danger
      />
    </div>
  );
}
