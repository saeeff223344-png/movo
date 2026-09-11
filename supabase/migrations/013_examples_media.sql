-- 013_examples_media.sql
-- The public Examples cards (homepage + /templates) only ever showed a flat
-- CSS gradient — examples had thumbnail_gradient/video_url but no actual
-- image, and no aspect-ratio field to drive the ratio badge the cards
-- already render. Adds both as nullable columns (existing rows keep
-- rendering the gradient fallback); the site-assets storage bucket and its
-- RLS already exist (006_storage_rls.sql) and are reused as-is — no new
-- bucket. Additive only; 001-012 are untouched.

alter table public.examples
  add column thumbnail_url text,
  add column aspect_ratio text check (aspect_ratio in ('9:16', '16:9', '1:1'));

comment on column public.examples.thumbnail_url is
  'Public URL in the site-assets storage bucket, uploaded via /admin/examples. Null falls back to thumbnail_gradient.';
