-- 006_storage_rls.sql
-- Storage buckets + their access policies. Private buckets use a
-- `<user_id>/...` path convention so ownership can be checked from the
-- path itself via storage.foldername(name).

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('project-assets', 'project-assets', false),
  ('videos', 'videos', false),
  ('developer-images', 'developer-images', true),
  ('site-assets', 'site-assets', true),
  ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- avatars — public read, owner-only write, path: <user_id>/<filename>
-- ---------------------------------------------------------------------

create policy "avatars: public can view"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner can upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner can update/delete own"
  on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: owner can delete own"
  on storage.objects for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- project-assets — private, path: <user_id>/<project_id>/<filename>
-- ---------------------------------------------------------------------

create policy "project-assets: owner can manage own"
  on storage.objects for all
  using (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "project-assets: projects.read can view all"
  on storage.objects for select
  using (bucket_id = 'project-assets' and public.has_permission('projects.read'));

-- ---------------------------------------------------------------------
-- videos — private, path: <user_id>/<project_id>/<filename>. A generated
-- ad video is the user's own output, not a public gallery item.
-- ---------------------------------------------------------------------

create policy "videos: owner can view own"
  on storage.objects for select
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos: videos.read can view all"
  on storage.objects for select
  using (bucket_id = 'videos' and public.has_permission('videos.read'));

create policy "videos: videos.manage can write"
  on storage.objects for all
  using (bucket_id = 'videos' and public.has_permission('videos.manage'))
  with check (bucket_id = 'videos' and public.has_permission('videos.manage'));

-- ---------------------------------------------------------------------
-- developer-images / site-assets — public marketing imagery, admin-managed.
-- ---------------------------------------------------------------------

create policy "developer-images: public can view"
  on storage.objects for select using (bucket_id = 'developer-images');
create policy "developer-images: developers.manage can write"
  on storage.objects for all
  using (bucket_id = 'developer-images' and public.has_permission('developers.manage'))
  with check (bucket_id = 'developer-images' and public.has_permission('developers.manage'));

create policy "site-assets: public can view"
  on storage.objects for select using (bucket_id = 'site-assets');
create policy "site-assets: assets.manage can write"
  on storage.objects for all
  using (bucket_id = 'site-assets' and public.has_permission('assets.manage'))
  with check (bucket_id = 'site-assets' and public.has_permission('assets.manage'));

-- ---------------------------------------------------------------------
-- payment-receipts — private and sensitive. Path: <user_id>/<payment_id>.
-- ---------------------------------------------------------------------

create policy "payment-receipts: owner can upload own"
  on storage.objects for insert
  with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "payment-receipts: owner can view own"
  on storage.objects for select
  using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "payment-receipts: payments.read can view all"
  on storage.objects for select
  using (bucket_id = 'payment-receipts' and public.has_permission('payments.read'));
