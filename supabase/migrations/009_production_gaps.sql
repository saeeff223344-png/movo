-- 009_production_gaps.sql
-- Two columns the admin AI/render job detail pages need that 004 didn't
-- include (both will start populating once AI generation is wired in the
-- next phase — see docs/database-schema.md "Known gaps"). Adds only;
-- 001-009... never edits an already-applied migration.

alter table public.ai_jobs
  add column input_summary text;

comment on column public.ai_jobs.input_summary is
  'Short human-readable summary of what was sent to the AI provider (e.g. a truncated prompt) — shown in the admin AI Jobs detail view.';

alter table public.render_jobs
  add column server text;

comment on column public.render_jobs.server is
  'Which render worker/server handled the job, if the render backend reports one — distinct from `provider` (the render service/vendor name).';
