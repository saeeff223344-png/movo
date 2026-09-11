-- 007_functions_indexes_seed.sql
-- Transaction-safe RPCs for the operations that must never race, plus the
-- seed data every admin screen and the public site need on first load.

-- ---------------------------------------------------------------------
-- redeem_activation_code — the single-use guarantee comes from `for update`
-- row-locking the code, so two concurrent redemptions of the same code
-- serialize: the second call always sees status = 'used'.
-- ---------------------------------------------------------------------

create or replace function public.redeem_activation_code(p_code text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code record;
  v_plan record;
  v_start timestamptz := now();
  v_expiry timestamptz;
  v_sub_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_code from public.activation_codes
    where code = upper(trim(p_code))
    for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_code.status = 'used' then
    return jsonb_build_object('status', 'used');
  end if;

  if v_code.status = 'disabled' then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_code.status = 'expired' or (v_code.expires_at is not null and v_code.expires_at < now()) then
    if v_code.status <> 'expired' then
      update public.activation_codes set status = 'expired' where id = v_code.id;
    end if;
    return jsonb_build_object('status', 'expired');
  end if;

  select * into v_plan from public.subscription_plans where id = v_code.plan_id;
  v_expiry := v_start + make_interval(days => v_code.duration_days);

  insert into public.subscriptions
    (user_id, plan_id, status, price_iqd, start_date, expiry_date, activation_source, activation_code_id, activated_by)
  values
    (v_uid, v_code.plan_id, 'active', v_plan.price_iqd, v_start, v_expiry, 'activation_code', v_code.id, v_uid)
  returning id into v_sub_id;

  update public.activation_codes
    set status = 'used', used_by = v_uid, used_at = v_start
    where id = v_code.id;

  insert into public.audit_logs (admin_id, action, entity, entity_id, target_user, new_value, metadata)
  values (v_uid, 'code.redeemed', 'activation_codes', v_code.id::text, v_uid, v_code.code,
    jsonb_build_object('subscription_id', v_sub_id));

  return jsonb_build_object(
    'status', 'valid',
    'plan_id', v_code.plan_id,
    'subscription_id', v_sub_id,
    'expiry_date', v_expiry
  );
end;
$$;

grant execute on function public.redeem_activation_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- verify_payment_and_activate_subscription
-- ---------------------------------------------------------------------

create or replace function public.verify_payment_and_activate_subscription(p_payment_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_payment record;
  v_plan record;
  v_start timestamptz := now();
  v_expiry timestamptz;
begin
  if not public.has_permission('payments.manage', v_admin) then
    raise exception 'PERMISSION_DENIED';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  if v_payment.status <> 'pending' then
    return jsonb_build_object('status', v_payment.status, 'message', 'already processed');
  end if;

  update public.payments
    set status = 'verified', verified_by = v_admin, verified_at = now()
    where id = p_payment_id;

  if v_payment.subscription_id is not null then
    select sp.* into v_plan
      from public.subscription_plans sp
      join public.subscriptions s on s.plan_id = sp.id
      where s.id = v_payment.subscription_id;

    v_expiry := v_start + make_interval(days => coalesce(v_plan.duration_days, 30));

    update public.subscriptions
      set status = 'active', start_date = v_start, expiry_date = v_expiry,
          payment_id = p_payment_id, activation_source = 'manual', activated_by = v_admin
      where id = v_payment.subscription_id;
  end if;

  insert into public.audit_logs (admin_id, action, entity, entity_id, target_user, old_value, new_value, metadata)
  values (v_admin, 'payment.verified', 'payments', p_payment_id::text, v_payment.user_id, 'pending', 'verified',
    jsonb_build_object('subscription_id', v_payment.subscription_id));

  return jsonb_build_object('status', 'verified', 'subscription_id', v_payment.subscription_id);
end;
$$;

grant execute on function public.verify_payment_and_activate_subscription(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Trial: consume (server-enforced, called when a generation actually
-- starts) + admin grant/reset. consume_trial is the only place `used`
-- ever flips to true, and it's row-locked to survive a double-click /
-- concurrent request race.
-- ---------------------------------------------------------------------

create or replace function public.consume_trial(p_project_id uuid default null, p_video_id uuid default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row record;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.trial_usage (user_id) values (v_uid)
    on conflict (user_id) do nothing;

  select * into v_row from public.trial_usage where user_id = v_uid for update;

  if v_row.used then
    return jsonb_build_object('status', 'already_used');
  end if;

  update public.trial_usage
    set used = true, used_at = now(), project_id = p_project_id, video_id = p_video_id
    where user_id = v_uid;

  return jsonb_build_object('status', 'consumed');
end;
$$;

grant execute on function public.consume_trial(uuid, uuid) to authenticated;

create or replace function public.grant_trial(p_user_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
begin
  if not public.has_permission('trials.manage', v_admin) then
    raise exception 'PERMISSION_DENIED';
  end if;

  insert into public.trial_usage (user_id, used) values (p_user_id, false)
    on conflict (user_id) do update set used = false, used_at = null;

  insert into public.audit_logs (admin_id, action, entity, entity_id, target_user)
  values (v_admin, 'trial.granted', 'trial_usage', p_user_id::text, p_user_id);

  return jsonb_build_object('status', 'ok');
end;
$$;

grant execute on function public.grant_trial(uuid) to authenticated;

create or replace function public.reset_trial(p_user_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
begin
  if not public.has_permission('trials.manage', v_admin) then
    raise exception 'PERMISSION_DENIED';
  end if;

  insert into public.trial_usage (user_id, used, reset_count, last_reset_by, last_reset_reason)
  values (p_user_id, false, 1, v_admin, p_reason)
  on conflict (user_id) do update
    set used = false, used_at = null,
        reset_count = public.trial_usage.reset_count + 1,
        last_reset_by = v_admin,
        last_reset_reason = p_reason;

  insert into public.audit_logs (admin_id, action, entity, entity_id, target_user, reason)
  values (v_admin, 'trial.reset', 'trial_usage', p_user_id::text, p_user_id, p_reason);

  return jsonb_build_object('status', 'ok');
end;
$$;

grant execute on function public.reset_trial(uuid, text) to authenticated;

-- can_generate: subscription active OR trial not yet used. Server-side
-- source of truth for gating /create — see lib/supabase/usage.ts.
create or replace function public.can_generate(check_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    exists (
      select 1 from public.subscriptions
      where user_id = check_uid and status = 'active' and expiry_date > now()
    )
    or not coalesce((select used from public.trial_usage where user_id = check_uid), false);
$$;

grant execute on function public.can_generate(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Seed data — idempotent (ON CONFLICT DO NOTHING / DO UPDATE), safe to
-- re-run. Mirrors the previous lib/admin/mock/* defaults so the app looks
-- identical on first connect.
-- ---------------------------------------------------------------------

insert into public.subscription_plans (slug, name_ar, name_en, description_ar, description_en, price_iqd, billing_period, duration_days, active, featured, display_order, limits, features)
values
  ('monthly', 'اشتراك شهري', 'Monthly plan', 'مرونة كاملة، فعّل شهريًا بحسب احتياجك', 'Full flexibility — activate monthly as you need',
    25000, 'monthly', 30, true, false, 1,
    '{"videos": null, "projects": 20, "maxResolution": "1080p"}'::jsonb,
    '{"export1080p": true, "export2k": false, "export4k": false, "voice": false, "aiImages": true, "aiVideo": false, "watermark": false, "priorityRendering": false}'::jsonb),
  ('yearly', 'اشتراك سنوي', 'Yearly plan', 'أفضل قيمة على المدى الطويل', 'Best value over the long run',
    250000, 'yearly', 365, true, true, 2,
    '{"videos": null, "projects": 260, "maxResolution": "1080p"}'::jsonb,
    '{"export1080p": true, "export2k": false, "export4k": false, "voice": false, "aiImages": true, "aiVideo": false, "watermark": false, "priorityRendering": true}'::jsonb)
on conflict (slug) do nothing;

insert into public.feature_flags (id, label_ar, label_en, description, enabled)
values
  ('registration_enabled', 'تسجيل حسابات جديدة', 'New registrations', 'Allow new sign-ups', true),
  ('login_enabled', 'تسجيل الدخول', 'Login', 'Allow logging in', true),
  ('generation_enabled', 'إنشاء الفيديوهات', 'Video generation', 'Allow starting new generations', true),
  ('rendering_enabled', 'الرندر', 'Rendering', 'Allow render jobs to run', true),
  ('subscriptions_enabled', 'الاشتراكات', 'Subscriptions', 'Allow subscription flows', true),
  ('trial_enabled', 'الفيديو التجريبي', 'Trial video', 'Grant trial videos to new users', true),
  ('activation_codes_enabled', 'أكواد التفعيل', 'Activation codes', 'Allow code redemption', true),
  ('support_enabled', 'الدعم الفني', 'Support', 'Allow new support tickets', true),
  ('voiceover_enabled', 'التعليق الصوتي', 'Voiceover', 'AI voice generation', false),
  ('ai_images_enabled', 'صور بالذكاء الاصطناعي', 'AI images', 'AI image generation', true),
  ('ai_video_enabled', 'فيديو بالذكاء الاصطناعي', 'AI video', 'AI video-clip generation', false),
  ('2k_enabled', 'تصدير 2K', '2K export', 'Enable 2K export tier', false),
  ('4k_enabled', 'تصدير 4K', '4K export', 'Enable 4K export tier', false),
  ('examples_enabled', 'صفحة الأمثلة', 'Examples page', 'Show public examples page', true),
  ('announcements_enabled', 'الإعلانات', 'Announcements', 'Show announcement banners', true),
  ('maintenance_enabled', 'وضع الصيانة', 'Maintenance mode', 'Site-wide maintenance mode', false)
on conflict (id) do nothing;

insert into public.system_settings (id, business, limits, ai_providers, rendering, storage, security, maintenance, kill_switches, support_contact, subscription_contact, payment_contact)
values (1,
  '{"displayName": "MOVO", "legalName": "MOVO Technologies", "country": "العراق", "currency": "IQD", "timezone": "Asia/Baghdad", "description": "منصة ذكاء اصطناعي لتحويل الأفكار إلى فيديوهات إعلانية جاهزة للنشر."}'::jsonb,
  '{"maxPromptLength": 600, "maxUploadMb": 10, "allowedUploadTypes": ["image/png", "image/jpeg", "image/webp", "video/mp4"], "maxAssetsPerProject": 10, "maxVideoDurationSeconds": 30, "maxProjectsPerUser": 50, "maxRevisionsPerProject": 20, "maxGenerationsPerDay": 5, "maxGenerationsPerMonth": 60, "maxConcurrentJobs": 3, "renderRetries": 2, "storageLimitMb": 5120}'::jsonb,
  '[{"id": "ai_text", "capability": "text", "provider": "openai", "model": "gpt-4.1-mini", "enabled": true, "priority": 1}, {"id": "ai_image", "capability": "image", "provider": "stability", "model": "sdxl-1.0", "enabled": true, "priority": 1}, {"id": "ai_video", "capability": "video", "provider": "runway", "model": "gen-3", "enabled": false, "priority": 1}, {"id": "ai_voice", "capability": "voice", "provider": "elevenlabs", "model": "multilingual-v2", "enabled": false, "priority": 1}]'::jsonb,
  '{"defaultResolution": "1080p", "resolution2kEnabled": false, "resolution4kEnabled": false, "fps": 30, "format": "mp4", "timeoutSeconds": 180, "retryLimit": 2}'::jsonb,
  '{"provider": "supabase-storage", "uploadLimitMb": 10, "allowedMimeTypes": ["image/png", "image/jpeg", "image/webp", "video/mp4"], "videoRetentionDays": 365, "assetRetentionDays": 180, "storageQuotaGb": 500}'::jsonb,
  '{"requireStrongPasswords": true, "adminSessionDurationMinutes": 480, "forcePasswordChangeOnFirstLogin": true, "twoFactorEnabled": false, "maxLoginAttempts": 5, "inactivityTimeoutMinutes": 30}'::jsonb,
  '{"enabled": false, "messageAr": "نعمل حاليًا على تحسين المنصة، نعود خلال وقت قصير.", "messageEn": "We are currently improving the platform — back shortly.", "estimatedCompletion": null, "allowAdminAccess": true}'::jsonb,
  '{"registrationsPaused": false, "generationPaused": false, "renderingPaused": false, "subscriptionActivationPaused": false, "aiVideoPaused": true, "uploadsPaused": false}'::jsonb,
  '{"phone": {"enabled": true, "value": "+964 770 000 0000"}, "whatsapp": {"enabled": true, "value": "+964 770 000 0000"}, "email": {"enabled": true, "value": "support@movo.app"}, "telegram": {"enabled": false, "value": ""}, "instagram": {"enabled": true, "value": "movo.app"}, "facebook": {"enabled": false, "value": ""}, "x": {"enabled": false, "value": ""}, "workingHours": "9 صباحًا - 9 مساءً، كل أيام الأسبوع", "primaryChannel": "whatsapp", "countryCode": "+964"}'::jsonb,
  '{"phone": {"enabled": true, "value": "+964 770 000 0000"}, "whatsapp": {"enabled": true, "value": "+964 770 000 0000"}, "email": {"enabled": true, "value": "billing@movo.app"}, "instructionsAr": "تواصل معنا عبر واتساب لمعرفة طرق الدفع المتاحة والحصول على كود التفعيل.", "instructionsEn": "Contact us on WhatsApp to learn about payment methods and get your activation code."}'::jsonb,
  '{"phone": {"enabled": true, "value": "+964 770 000 0000"}, "whatsapp": {"enabled": true, "value": "+964 770 000 0000"}, "instructionsAr": "الدفع حاليًا يدوي عبر ZainCash أو تحويل بنكي — تواصل معنا لإتمام العملية.", "instructionsEn": "Payment is currently manual via ZainCash or bank transfer — contact us to complete it."}'::jsonb
)
on conflict (id) do nothing;

insert into public.homepage_settings (id, hero)
values (1, '{"badgeAr": "منصة ذكاء اصطناعي لصناعة فيديوهات إعلانية", "badgeEn": "An AI platform for creating ad videos", "titleAr": "صف فكرتك... وMOVO تصنع الفيديو", "titleEn": "Describe your idea... and MOVO makes the video", "subtitleAr": "اكتب ما تريد، أرفق صورك أو شعارك إن وجدت، ودع MOVO تحوّل فكرتك إلى فيديو إعلاني احترافي جاهز للنشر.", "subtitleEn": "Write what you want, attach your photos or logo if you have them, and let MOVO turn your idea into a publish-ready ad video.", "promptPlaceholderAr": "مثال: أنشئ إعلانًا سريعًا لمطعم برغر، عرض وجبتين بـ15 ألف، مدة 15 ثانية، مناسب للريلز...", "promptPlaceholderEn": "e.g. Make a quick ad for a burger restaurant, two-meal deal for $15, 15 seconds...", "ctaTextAr": "إنشاء الفيديو", "ctaTextEn": "Generate video", "secondaryCtaAr": null, "secondaryCtaEn": null, "previewVisible": true}'::jsonb)
on conflict (id) do nothing;

insert into public.homepage_sections (id, enabled, title_ar, title_en, description_ar, description_en, display_order)
values
  ('value', true, 'من فكرة مكتوبة إلى فيديو جاهز للنشر', 'From a written idea to a publish-ready video', '', '', 1),
  ('examples', true, 'شاهد ما تستطيع MOVO صنعه', 'See what MOVO can make', 'أمثلة من فيديوهات MOVO', 'Examples from MOVO', 2),
  ('howItWorks', true, 'كيف تعمل MOVO', 'How MOVO works', 'ثلاث خطوات فقط', 'Just three steps', 3),
  ('outputs', true, 'مصممة لكل نوع إعلان', 'Designed for every kind of ad', '', '', 4),
  ('features', true, 'لماذا MOVO', 'Why MOVO', '', '', 5),
  ('quality', true, 'تصدير بجودة استوديو', 'Studio-grade export', '', '', 6),
  ('trial', true, 'فيديو تجريبي واحد مجانًا', 'One free trial video', '', '', 7),
  ('pricing', true, 'خطة شهرية أو سنوية', 'Monthly or yearly plans', '', '', 8),
  ('finalCta', true, 'جاهز تحوّل فكرتك إلى فيديو؟', 'Ready to turn your idea into a video?', '', '', 9)
on conflict (id) do nothing;

insert into public.navigation_items (group_key, label_ar, label_en, href, enabled, display_order, open_new_tab, visibility)
values
  ('desktop', 'الرئيسية', 'Home', '/', true, 1, false, 'public'),
  ('desktop', 'كيف تعمل', 'How it works', '/#how-it-works', true, 2, false, 'public'),
  ('desktop', 'أمثلة', 'Examples', '/templates', true, 3, false, 'public'),
  ('desktop', 'عن MOVO', 'About MOVO', '/about', true, 4, false, 'public'),
  ('desktop', 'الدعم', 'Support', '/support', true, 5, false, 'public'),
  ('footer', 'أمثلة', 'Examples', '/templates', true, 1, false, 'public'),
  ('footer', 'كيف تعمل', 'How it works', '/#how-it-works', true, 2, false, 'public')
on conflict do nothing;

insert into public.footer_settings (id, short_description_ar, short_description_en, copyright_ar, copyright_en, support_phone, support_email, developer_credit_ar, developer_credit_en, visible)
values (1,
  'صف فكرتك، وMOVO تصنع لك فيديو إعلاني احترافي جاهز للنشر — بالعربية والإنجليزية.',
  'Describe your idea, and MOVO makes you a publish-ready ad video — in Arabic and English.',
  'جميع الحقوق محفوظة', 'All rights reserved',
  '+964 770 000 0000', 'support@movo.app',
  'صُمم وطُوّر بواسطة فريق MOVO', 'Designed & built by the MOVO team',
  true)
on conflict (id) do nothing;

insert into public.social_links (platform, url, enabled, label)
values
  ('instagram', 'https://instagram.com/movo.app', true, null),
  ('tiktok', 'https://tiktok.com/@movo.app', true, null),
  ('youtube', '', false, null),
  ('x', 'https://x.com/movo_app', true, null),
  ('whatsapp', 'https://wa.me/9647700000000', true, 'تواصل واتساب'),
  ('facebook', '', false, null),
  ('linkedin', '', false, null),
  ('telegram', '', false, null)
on conflict do nothing;

insert into public.seo_settings (id, site_title, title_template, description_ar, description_en, keywords, og_title, og_description, robots_index, robots_follow)
values (1, 'MOVO', '%s — MOVO',
  'منصة عربية وعالمية لإنشاء فيديوهات موشن جرافيك وإعلانات فيديو احترافية بدقائق.',
  'An Arabic-first, global platform for creating professional motion graphics videos in minutes.',
  array['فيديو إعلاني', 'موشن جرافيك', 'AI video', 'ad video generator', 'MOVO'],
  'MOVO — حوّل فكرتك إلى فيديو', 'صف فكرتك، وMOVO تصنع لك فيديو إعلاني احترافي جاهز للنشر.',
  true, true)
on conflict (id) do nothing;

insert into public.developer_page_settings (id, page_title_ar, page_title_en, intro_ar, intro_en, description_ar, description_en, cta_text_ar, cta_text_en, section_visible)
values (1,
  'الأشخاص خلف MOVO', 'The people behind MOVO',
  'الفريق', 'The team',
  'فريق صغير شغوف بصناعة أدوات فيديو ذكية تخدم صناع المحتوى العرب والعالميين.',
  'A small team passionate about building smart video tools for Arab and global creators.',
  'تواصل معنا', 'Get in touch',
  true)
on conflict (id) do nothing;

insert into public.email_settings (id, sender_name, reply_to, support_email)
values (1, 'MOVO', 'support@movo.app', 'support@movo.app')
on conflict (id) do nothing;

insert into public.email_templates (id, subject_ar, subject_en, body_ar, body_en)
values
  ('welcome', 'أهلًا بك في MOVO', 'Welcome to MOVO', 'مرحبًا، حسابك في MOVO جاهز — ابدأ بإنشاء أول فيديو لك بالذكاء الاصطناعي.', 'Hi, your MOVO account is ready — start creating your first AI video.'),
  ('email_verification', 'تأكيد بريدك الإلكتروني', 'Confirm your email', 'اضغط الرابط أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك.', 'Click the link below to confirm your email and activate your account.'),
  ('password_reset', 'إعادة تعيين كلمة المرور', 'Reset your password', 'اضغط الرابط أدناه لإعادة تعيين كلمة المرور الخاصة بك.', 'Click the link below to reset your password.'),
  ('subscription_activated', 'تم تفعيل اشتراكك', 'Your subscription is active', 'تم تفعيل اشتراكك في MOVO بنجاح. استمتع بإنشاء فيديوهات غير محدودة ضمن باقتك.', 'Your MOVO subscription is now active. Enjoy creating videos within your plan.'),
  ('subscription_expiring', 'اشتراكك على وشك الانتهاء', 'Your subscription is expiring soon', 'سينتهي اشتراكك قريبًا — جدّده لتستمر في إنشاء الفيديوهات بدون انقطاع.', 'Your subscription is expiring soon — renew to keep creating videos without interruption.'),
  ('payment_verified', 'تم التحقق من دفعتك', 'Your payment was verified', 'تم التحقق من دفعتك بنجاح وتفعيل اشتراكك.', 'Your payment has been verified and your subscription activated.')
on conflict (id) do nothing;

-- Legal documents are seeded as clear drafts — published = false — until
-- MOVO's real legal text is written and an admin explicitly publishes them.
insert into public.legal_documents (type, title_ar, title_en, content_ar, content_en, published)
values
  ('privacy_policy', 'سياسة الخصوصية', 'Privacy Policy', 'مسودة — بانتظار المحتوى القانوني النهائي.', 'Draft — pending final legal content.', false),
  ('terms_of_use', 'الشروط والأحكام', 'Terms & Conditions', 'مسودة — بانتظار المحتوى القانوني النهائي.', 'Draft — pending final legal content.', false),
  ('subscription_terms', 'شروط الاشتراك', 'Subscription Terms', 'مسودة — بانتظار المحتوى القانوني النهائي.', 'Draft — pending final legal content.', false),
  ('refund_policy', 'سياسة الاسترجاع', 'Refund Policy', 'مسودة — بانتظار المحتوى القانوني النهائي.', 'Draft — pending final legal content.', false)
on conflict (type) do nothing;
