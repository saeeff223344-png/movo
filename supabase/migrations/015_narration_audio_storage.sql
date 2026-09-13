-- 015_narration_audio_storage.sql
-- Persistent Storage for AI-generated narration audio (real ElevenLabs
-- Haytham / OpenAI TTS output), replacing the previous base64 data-URL
-- transport. Private bucket, owner-scoped path convention
-- <user_id>/<generation_id>/<scene_id>.<ext> — ownership is checked from
-- the path itself via storage.foldername(name), exactly like
-- project-assets/videos/payment-receipts already do (006_storage_rls.sql).
-- No new ownership table: the path IS the ownership record.
--
-- All access goes through lib/audio/narration-storage.ts's
-- uploadNarrationAudio (server-side upload with the authenticated user's
-- own Supabase client) and signed URLs it returns for playback — never the
-- service-role client, and never a public bucket. A single "owner can
-- manage own" policy is therefore the only one needed: it covers the
-- upload (insert), the upsert-on-retry (update), and createSignedUrl's own
-- read check (select). No broader client policy is added.

insert into storage.buckets (id, name, public)
values ('narration-audio', 'narration-audio', false)
on conflict (id) do nothing;

create policy "narration-audio: owner can manage own"
  on storage.objects for all
  using (bucket_id = 'narration-audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'narration-audio' and (storage.foldername(name))[1] = auth.uid()::text);
