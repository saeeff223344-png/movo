"use client";

import { useI18n } from "@/lib/i18n/context";
import { ChipSelect } from "@/components/create/ChipSelect";
import { MUSIC_STYLES } from "@/lib/audio/types";
import type { AudioSettings } from "@/lib/ai/video-plan-schema";
import type { MusicStyle } from "@/lib/audio/types";

const MUSIC_STYLE_KEY: Record<MusicStyle, string> = {
  energetic: "create.audioMusicStyleEnergetic",
  cinematic: "create.audioMusicStyleCinematic",
  luxury: "create.audioMusicStyleLuxury",
  modern: "create.audioMusicStyleModern",
  minimal: "create.audioMusicStyleMinimal",
  upbeat: "create.audioMusicStyleUpbeat",
  technology: "create.audioMusicStyleTechnology",
  emotional: "create.audioMusicStyleEmotional",
  calm: "create.audioMusicStyleCalm",
};

/**
 * Phase 5's only user-facing audio surface: a handful of simple preferences
 * (voice gender, music on/off, music style), never a manual audio/timeline
 * editor — narration wording, pacing, pauses, and ducking are all decided
 * by MOVO (see lib/audio/audio-settings.ts, scene-audio-sync.ts,
 * music-ducking.ts). `audio` is always a fully-resolved AudioSettings
 * (ResultView passes resolveAudioSettings(plan)'s output, never the raw
 * possibly-null plan.audio), so this component never has to think about
 * legacy/missing data itself.
 */
export function AudioPreferencesPanel({ audio, onChange }: { audio: AudioSettings; onChange: (next: AudioSettings) => void }) {
  const { t } = useI18n();

  function update<K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) {
    onChange({ ...audio, [key]: value });
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <h3 className="text-sm font-bold text-primary">{t("create.audioSectionTitle")}</h3>
      <p className="mt-1 text-xs text-muted">{t("create.audioSectionHint")}</p>

      <div className="mt-4 space-y-4">
        <ChipSelect
          label={t("create.audioVoiceGenderLabel")}
          value={audio.voiceGender}
          onChange={(v) => update("voiceGender", v)}
          options={[
            { value: "female", label: t("create.audioVoiceGenderFemale") },
            { value: "male", label: t("create.audioVoiceGenderMale") },
          ]}
        />

        <ChipSelect
          label={t("create.audioMusicLabel")}
          value={audio.musicEnabled ? "on" : "off"}
          onChange={(v) => update("musicEnabled", v === "on")}
          options={[
            { value: "on", label: t("create.audioMusicOn") },
            { value: "off", label: t("create.audioMusicOff") },
          ]}
        />

        {audio.musicEnabled && (
          <ChipSelect
            label={t("create.audioMusicStyleLabel")}
            value={audio.musicStyle}
            onChange={(v) => update("musicStyle", v)}
            options={MUSIC_STYLES.map((style) => ({ value: style, label: t(MUSIC_STYLE_KEY[style]) }))}
          />
        )}
      </div>

      <p className="mt-4 text-xs text-muted">{t("create.audioProviderNotice")}</p>
    </div>
  );
}
