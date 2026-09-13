-- 016_projects_narration_audio.sql
-- Minimal persistence for the real generation pipeline (VideoPlan + Egyptian
-- Haytham narration audio, see lib/actions/project-actions.ts): reuses the
-- existing public.projects table (004_projects_video_jobs.sql) rather than
-- creating a new one — its owner_id/prompt/language/aspect_ratio/
-- duration_seconds/status/scene_plan/created_at/updated_at columns and its
-- existing owner-only RLS policy already cover everything this phase needs
-- except a place for narration audio metadata. Adds exactly one column.

alter table public.projects
  add column narration jsonb;

comment on column public.projects.scene_plan is
  'The AI planner''s validated VideoPlan (lib/ai/video-plan-schema.ts). Column name predates the real planner (it originally held an earlier mocked ScenePlan shape) — kept as-is to avoid an unnecessary rename; this is what /create''s real generation flow persists here today.';

comment on column public.projects.narration is
  'Per-scene narration audio metadata, keyed by sceneId: { storagePath, provider, contentType, durationSeconds, characters, estimatedUsd } for a scene with real synthesized audio, or null-ish fields for a scene with no narration or failed synthesis. NEVER a signed URL and NEVER raw base64 audio — playback URLs are always reissued fresh from storagePath on load (see lib/actions/project-actions.ts's loadProjectAction), never persisted.';

-- No RLS change needed: 004_projects_video_jobs.sql's existing
-- "projects: owner can manage own" policy (auth.uid() = owner_id) already
-- covers reads/writes of this new column exactly like every other one.
