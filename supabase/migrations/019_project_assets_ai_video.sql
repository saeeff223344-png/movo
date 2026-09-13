-- 019_project_assets_ai_video.sql
-- Dynamic AI Video Director + Runway Integration phase: AI-generated scene
-- VIDEOS (Runway Gen-4 Turbo image-to-video, lib/video-generation/*) are
-- persisted as public.project_assets rows exactly like auto-generated
-- still visuals already are (018_project_assets_auto_generated.sql) —
-- same table, same scene_id column, same storage_path convention, same
-- metadata jsonb column. Only the `kind` check constraint needs widening;
-- no new columns, no new bucket, no new RLS policy.

alter table public.project_assets drop constraint project_assets_kind_check;
alter table public.project_assets
  add constraint project_assets_kind_check check (kind in ('product', 'logo', 'reference', 'video', 'auto-generated', 'ai-video'));

comment on column public.project_assets.metadata is
  'Free-form per-kind detail. For kind = ''auto-generated'': { "prompt": string, "provider": string, "estimatedUsd": number | null }. For kind = ''ai-video'': { "provider": string, "model": string, "providerTaskId": string, "durationSeconds": number, "motionPrompt": string, "providerCost": number | null } — the exact provider/task/prompt/cost behind this generated video, kept for debugging/cost audit, never shown to the end user.';
