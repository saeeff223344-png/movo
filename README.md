# MOVO | موفو

منصة عربية وعالمية لإنشاء فيديوهات موشن جرافيك وإعلانات فيديو احترافية،
مبنية على Next.js (App Router) وتحتضن [Remotion](https://remotion.dev) كمحرك فيديو.

**الشعار:** حوّل فكرتك إلى فيديو — Turn your idea into video

> ملاحظة: اسم مجلد المشروع وحزمة npm ما زالا `motion-arabic` تاريخيًا (الاسم
> القديم للمشروع)، بينما الهوية التجارية الظاهرة للمستخدم أصبحت بالكامل MOVO.

## البنية

```
app/
  layout.tsx            تخطيط الجذر: الخطوط، Providers، لا فلاش عند التحميل
  (marketing)/           صفحات عامة (Navbar + Footer): الرئيسية، القوالب، عن MOVO، الدعم، المطورون
  (app)/                 صفحات ما بعد الدخول (AppHeader + Account menu): لوحة التحكم، الإنشاء، الإعدادات، الاشتراك
  login/ signup/ verify-email/   صفحات المصادقة (بدون Navbar/Footer)
  admin/                 لوحة إدارة MOVO الكاملة (AdminShell + Sidebar + Header) — انظر docs/admin-routes.md
components/
  ui/                    عناصر عامة (زر، شعار، مبدّل لغة/مظهر، حالة فارغة...)
  layout/                Navbar / Footer / AppHeader / AccountMenu
  home/ auth/ dashboard/ settings/ subscription/ support/ about/ developers/ templates/ create/
  remotion/              مكونات تدمج @remotion/player داخل الواجهة
  admin/                 مكونات لوحة الإدارة (ui/ عناصر عامة قابلة لإعادة الاستخدام، layout/ الهيكل، ثم مجلد لكل قسم إداري)
lib/
  i18n/                  نظام الترجمة (قاموس عربي/إنجليزي + Context) — يتضمن مساحة اسم admin.* لواجهة الإدارة
  theme/                 نظام الوضع الليلي/النهاري (Context)
  data/                  بيانات وهمية لواجهة المستخدم (قوالب، مشاريع، اشتراك، دعم، مستخدم، فريق)
  types/                 نماذج TypeScript لجانب المستخدم (VideoProject, VideoBrief, ScenePlan...)
  mock/                  خدمات Mock لتوليد الفيديو والتعديلات (جانب المستخدم)
  actions/                Server Actions حقيقية متصلة بـSupabase (مثل تفعيل رمز الاشتراك)
  supabase/               عملاء Supabase (browser/server/admin)، وسيط الجلسة، مساعدات المصادقة والصلاحيات — انظر docs/auth-flow.md وdocs/admin-auth.md
  admin/
    types/                نماذج TypeScript للوحة الإدارة — انظر docs/admin-data-model.md وdocs/database-schema.md
    mock/                 بيانات Mock المتبقية للوحة الإدارة (أقسام لم تُحوَّل بعد لـSupabase)
    services/              طبقة الخدمات (getUsers...) — بعضها الآن متصل فعليًا بـSupabase وبعضها ما زال Mock، انظر قسم "لوحة إدارة MOVO" أدناه
    actions/                Server Actions إدارية حقيقية (إنشاء حساب إداري، تعليق/تفعيل مستخدم، منح/تصفير تجربة)
    config/                إعدادات الصلاحيات (permissions.ts) وقائمة التنقل (navigation.ts)
    context/                حالة الشريط الجانبي (collapse/mobile)
    utils/                  تهيئة الأموال والتواريخ ومساعدات Mock
remotion/                مشروع Remotion (التركيبات، نقطة الدخول، الثوابت)
remotion.config.ts       إعدادات Remotion CLI
supabase/migrations/     مخطط قاعدة البيانات الكامل (SQL)، بالترتيب 001 → 007 — انظر docs/database-schema.md
proxy.ts                 وسيط Next.js 16 (تحديث الجلسة + حماية المسارات) — انظر docs/auth-flow.md
docs/                    توثيق إضافي (نموذج البيانات، الصلاحيات، المسارات، المحتوى الديناميكي، وتوثيق Supabase الكامل)
```

## اللغات والمظهر

- اللغة الافتراضية: العربية (RTL). يمكن التبديل للإنجليزية (LTR) من مبدّل
  اللغة في الشريط العلوي، ويُحفظ الاختيار في `localStorage`.
- الوضع الافتراضي: داكن. يمكن التبديل للوضع الفاتح من مبدّل المظهر، ويُحفظ
  الاختيار في `localStorage`. تعمل الألوان عبر متغيرات CSS دلالية
  (`bg-base`, `text-primary`, `text-secondary`...) معرّفة في `app/globals.css`.

## Supabase

الباك-إند الحقيقي (قاعدة بيانات PostgreSQL + مصادقة + تخزين + RLS) جاهز في
الكود بالكامل، لكن **لا يوجد مشروع Supabase متصل افتراضيًا** — لا قيم حقيقية
مخزَّنة في هذا المستودع. لتشغيله فعليًا:

1. أنشئ مشروع Supabase، وانسخ `.env.example` إلى `.env.local` وعبِّئ القيم
   الثلاث من **Project Settings → API**.
2. شغّل ملفات `supabase/migrations/001` إلى `010` بالترتيب (عبر
   `npx supabase db push` أو SQL Editor) — **`010_grants.sql` ضروري حتى لو
   كانت 001-007 مطبَّقة مسبقًا**، انظر `docs/rls-policies.md`.
3. أنشئ أول حساب `super_admin` يدويًا (خطوة واحدة، موثّقة بالكامل في
   `docs/admin-auth.md`).

التفاصيل الكاملة: `docs/supabase-setup.md`، `docs/database-schema.md`،
`docs/rls-policies.md`، `docs/auth-flow.md`، `docs/admin-auth.md`.

بدون هذه الخطوات، `npm run dev`/`npm run build` يعملان بشكل طبيعي (كل مسار
يحتاج جلسة مستخدم مصنَّف Dynamic تلقائيًا في Next.js ولا يُستدعى وقت البناء)،
لكن التسجيل/الدخول/لوحة الإدارة لن تعمل فعليًا حتى تُستكمل الخطوات أعلاه.

## التشغيل

**تثبيت الاعتماديات**

```console
npm install
```

**تشغيل موقع الويب (Next.js)**

```console
npm run dev
```

**تشغيل استوديو Remotion لتحرير الفيديوهات مباشرة**

```console
npm run studio
```

## لوحة إدارة MOVO

بعد تشغيل `npm run dev`، افتح **http://localhost:3000/admin**.

اللوحة محمية فعليًا الآن (Auth + RLS + صلاحيات على مستوى الخادم) — الدخول
يتطلب حساب Supabase حقيقي بدور `admin`/`super_admin` (انظر قسم Supabase
أعلاه وإجراء تجهيز أول `super_admin` في `docs/admin-auth.md`). **كل خدمات
اللوحة (`lib/admin/services/*.ts`) متصلة الآن فعليًا بقاعدة البيانات — لا
توجد بيانات Mock متبقية في لوحة الإدارة.** الجداول المرتبطة بالذكاء
الاصطناعي (`ai_jobs`, `render_jobs`, `usage_events`) فارغة بشكل صحيح حتى
تُربط مرحلة AI القادمة. **يجب تشغيل `supabase/migrations/010_grants.sql`
حتى على مشروع طبّق 001-007 سابقًا** — بدونه تفشل كل الاستعلامات المباشرة
برمز خطأ Postgres 42501 قبل أن يصل الأمر إلى RLS أصلًا (انظر
`docs/rls-policies.md`). راجع:

- `docs/admin-routes.md` — كل مسارات اللوحة (~35 قسمًا)
- `docs/admin-permissions.md` — الأدوار والصلاحيات ومصفوفتها
- `docs/admin-data-model.md` — المخطط المفاهيمي الأصلي (تاريخي)
- `docs/database-schema.md` — المخطط الفعلي المطبَّق في SQL
- `docs/rls-policies.md` — سياسات الأمان على مستوى الصفوف
- `docs/auth-flow.md` — تدفّق المصادقة الكامل لجانب المستخدم
- `docs/admin-auth.md` — صلاحيات الإدارة وإجراء تجهيز أول super_admin
- `docs/dynamic-content.md` — ما تديره الإدارة مقابل ما يبقى في الكود

**بناء موقع الويب للإنتاج**

```console
npm run build && npm start
```

**فحص الكود**

```console
npm run lint
npm run typecheck
```

## Docs

- [Next.js](https://nextjs.org/docs)
- [Remotion](https://www.remotion.dev/docs/the-fundamentals)
- [Tailwind CSS](https://tailwindcss.com/docs)
