-- 017_render_jobs_export.sql
-- Minimal schema for real 1080p MP4 export (lib/render/export-orchestration.ts).
-- Reuses the existing public.videos and public.render_jobs tables
-- (004_projects_video_jobs.sql) as-is — their status enums, resolution/
-- format/storage_path/error_message/timestamps already fit this flow
-- exactly. Two gaps only:
--   1. render_jobs had no progress column for the export UI to poll.
--   2. videos/render_jobs only let an ADMIN (via the `*.manage` permission)
--      insert/update rows — there was no "owner can create/update their own
--      job" policy, unlike projects. A regular user starting their own
--      export needs exactly that, scoped to their own rows, same pattern
--      "projects: owner can manage own" already uses.
-- The private "videos" Storage bucket (006_storage_rls.sql) has the same
-- gap for the same reason: it only allowed admin writes. This adds the
-- owner-scoped storage policies it was missing too, so the final MP4 can be
-- uploaded via the same authenticated (never service-role) client pattern
-- every other write in this codebase uses.

alter table public.render_jobs
  add column progress real not null default 0 check (progress >= 0 and progress <= 1);

comment on column public.render_jobs.progress is
  'Fractional render progress (0-1) as reported by the render backend, polled by ResultView''s Export MP4 UI. 0 while queued, 1 once succeeded.';

comment on column public.render_jobs.server is
  'Provider-specific render reference, packed as "<bucketName>:<renderId>" for the remotion-lambda provider (see lib/render/export-orchestration.ts) — distinct from `provider`, the render service/vendor name itself.';

comment on column public.videos.storage_path is
  'Durable path in the private "videos" Storage bucket — never a signed URL, which expires. lib/render/final-video-storage.ts reissues a fresh signed download URL from this on demand.';

-- ---------------------------------------------------------------------
-- Table RLS: owner can create/update their own render_jobs/videos rows
-- (previously only an admin with videos.manage/render_jobs.manage could
-- write at all — the existing "owner can read own" SELECT policies are
-- untouched).
-- ---------------------------------------------------------------------

create policy "videos: owner can create own"
  on public.videos for insert
  with check (auth.uid() = owner_id);

create policy "videos: owner can update own"
  on public.videos for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "render_jobs: owner can create own"
  on public.render_jobs for insert
  with check (auth.uid() = user_id);

create policy "render_jobs: owner can update own"
  on public.render_jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Storage RLS: owner can upload/update their own object in the "videos"
-- bucket, path-scoped exactly like narration-audio/project-assets
-- (<user_id>/... first segment checked via storage.foldername(name)). The
-- existing "videos: owner can view own" SELECT policy is untouched.
-- ---------------------------------------------------------------------

create policy "videos: owner can upload own"
  on storage.objects for insert
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos: owner can update own object"
  on storage.objects for update
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
