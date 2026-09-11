import type { AspectRatio, VideoStyle } from "@/lib/types/video";

export type AdminProjectStatus =
  | "draft"
  | "planning"
  | "generating"
  | "ready"
  | "rendering"
  | "failed";

export type AdminProject = {
  id: string;
  ownerId: string;
  ownerName: string;
  prompt: string;
  language: "ar" | "en";
  businessName: string;
  offer: string | null;
  style: VideoStyle;
  platform: string;
  aspectRatio: Exclude<AspectRatio, "auto">;
  duration: number;
  assetsCount: number;
  status: AdminProjectStatus;
  createdAt: string;
  updatedAt: string;
  videoId: string | null;
};

export type AdminVideoStatus = "processing" | "ready" | "failed";

export type AdminVideo = {
  id: string;
  projectId: string;
  ownerId: string;
  ownerName: string;
  durationSeconds: number;
  aspectRatio: Exclude<AspectRatio, "auto">;
  resolution: "1080p" | "2k" | "4k";
  format: "mp4";
  fileSizeMb: number;
  createdAt: string;
  status: AdminVideoStatus;
  renderJobId: string | null;
};

export type AIJobType =
  | "prompt_analysis"
  | "brief_generation"
  | "script_generation"
  | "scene_planning"
  | "revision"
  | "image_generation"
  | "video_generation"
  | "voice_generation";

export type AIJobStatus = "queued" | "processing" | "succeeded" | "failed";

export type AIJob = {
  id: string;
  type: AIJobType;
  provider: string;
  model: string;
  userId: string;
  userName: string;
  projectId: string | null;
  status: AIJobStatus;
  inputSummary: string;
  tokensUsed: number | null;
  generatedUnits: number | null;
  durationMs: number;
  estimatedCostUsd: number;
  estimatedCostIqd: number;
  errorMessage: string | null;
  createdAt: string;
};

export type RenderJobStatus = "queued" | "processing" | "succeeded" | "failed";

export type RenderJob = {
  id: string;
  projectId: string;
  videoId: string | null;
  userId: string;
  userName: string;
  resolution: "1080p" | "2k" | "4k";
  format: "mp4";
  durationSeconds: number;
  renderDurationMs: number | null;
  provider: string;
  server: string | null;
  costIqd: number;
  status: RenderJobStatus;
  errorMessage: string | null;
  createdAt: string;
};

export type UsageBreakdown = {
  videos: number;
  aiRequests: number;
  textTokens: number;
  imageGenerations: number;
  aiVideoSeconds: number;
  voiceSeconds: number;
  revisions: number;
  renderMinutes: number;
  storageMb: number;
  bandwidthMb: number;
};

export type UsageTopConsumer = {
  userId: string;
  userName: string;
  planName: string | null;
  videos: number;
  aiRequests: number;
  storageMb: number;
};

export type UsageSummary = {
  totals: UsageBreakdown;
  byDate: { date: string; videos: number; aiRequests: number; renderMinutes: number }[];
  topConsumers: UsageTopConsumer[];
};
