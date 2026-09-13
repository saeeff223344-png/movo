-- 018_project_assets_auto_generated.sql
-- Automatic Visual Assets phase: MOVO's own automatically-generated scene
-- visuals (lib/visuals/*) are persisted as public.project_assets rows,
-- exactly like a user-uploaded product/logo photo would be — this table
-- already existed (004_projects_video_jobs.sql) with the right shape
-- (owner_id, project_id, storage_path, mime_type, metadata jsonb) but was
-- never actually written to by any code path yet. Two gaps only:
--   1. `kind`'s check constraint didn't allow an 'auto-generated' value.
--   2. No direct scene association column — every other consumer of this
--      table only ever needs "all assets for this project", but visual
--      resolution needs "the asset for THIS scene" without parsing
--      `metadata` on every read.
-- Storage itself needs no migration: lib/visuals/visual-asset-storage.ts
-- reuses the existing private "project-assets" bucket and its existing
-- "project-assets: owner can manage own" RLS policy (006_storage_rls.sql)
-- as-is — the path convention it already documents
-- (`<user_id>/<project_id>/...`) already covers this.

alter table public.project_assets drop constraint project_assets_kind_check;
alter table public.project_assets
  add constraint project_assets_kind_check check (kind in ('product', 'logo', 'reference', 'video', 'auto-generated'));

alter table public.project_assets add column scene_id text;

comment on column public.project_assets.scene_id is
  'Scene this asset belongs to (VideoPlan scene id) — set for auto-generated visuals (lib/visuals/*) so project-persistence.ts can re-sign and re-attach the right asset to the right scene without parsing metadata. Null for a general (not scene-specific) user upload.';

comment on column public.project_assets.metadata is
  'Free-form per-kind detail. For kind = ''auto-generated'': { "prompt": string, "provider": string, "estimatedUsd": number | null } — the exact prompt/provider/cost behind this visual, kept for debugging/cost audit, never shown to the end user.';

create index project_assets_project_id_scene_id_idx on public.project_assets (project_id, scene_id);
