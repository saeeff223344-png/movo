"use client";

import { Image as ImageIcon, Loader2, Mic, Sparkles, Video } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const PHASE_KEYS = {
  voice: { title: "create.genVoiceTitle", desc: "create.genVoiceDesc" },
  visuals: { title: "create.genVisualsTitle", desc: "create.genVisualsDesc" },
  motion: { title: "create.genMotionTitle", desc: "create.genMotionDesc" },
  preview: { title: "create.genPreviewTitle", desc: "create.genPreviewDesc" },
} as const;

const PHASE_ICON = { voice: Mic, visuals: ImageIcon, motion: Video, preview: Sparkles } as const;

/**
 * Purely presentational loading state for the steps that run after the AI
 * plan itself is ready (see CreateWorkspace.tsx): synthesizing real
 * narration audio via ElevenLabs/OpenAI TTS, generating automatic scene
 * visuals (Automatic Visual Assets phase), directing + generating real
 * scene motion via Runway (Dynamic AI Video Director phase, "motion"),
 * then assembling the Remotion preview data. Simpler than
 * GenerationProgress (one spinner, no step list) since each of these is a
 * single request/computation, not several.
 */
export function VoiceGenerationProgress({ phase }: { phase: "voice" | "visuals" | "motion" | "preview" }) {
  const { t } = useI18n();
  const { title, desc } = PHASE_KEYS[phase];
  const Icon = PHASE_ICON[phase];

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="flex size-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-600/30">
        <Icon className="size-7" />
      </span>
      <h2 className="mt-6 text-xl font-extrabold text-primary">{t(title)}</h2>
      <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        {t(desc)}
      </p>
    </div>
  );
}
