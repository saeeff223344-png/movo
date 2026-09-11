# Auth Flow

How MOVO's end-user authentication actually works against Supabase Auth.
No social login — email/password only, per the product spec.

## Clients

- **`lib/supabase/client.ts`** — browser client (`createBrowserClient`),
  used from `"use client"` components (`LoginView`, `SignupView`, etc.).
- **`lib/supabase/server.ts`** — async server client, reads/writes the
  session cookie via `next/headers`. Used in Server Components, Route
  Handlers, and Server Actions. The `setAll` cookie write is wrapped in
  try/catch because Server Components can't write cookies — only Route
  Handlers, Server Actions, and `proxy.ts` can; the try/catch makes the
  helper safe to call from all four contexts without branching.
- **`lib/supabase/admin.ts`** — service-role client, `server-only`,
  throws immediately if `SUPABASE_SERVICE_ROLE_KEY` is missing. Only used
  by `lib/admin/actions/create-admin.ts`.

## Sign up

`components/auth/SignupView.tsx` (client) calls:

```ts
supabase.auth.signUp({
  email, password,
  options: { data: { full_name }, emailRedirectTo: `${origin}/auth/callback?next=/dashboard` }
})
```

On success, redirects to `/verify-email?email=...`. The
`handle_new_user()` trigger (migration `001`) creates the matching
`profiles` row automatically the moment `auth.users` gets the new row —
the app never inserts into `profiles` directly on signup.

## Email verification

Supabase sends a confirmation email with a link to
`.../auth/callback?code=...&next=/dashboard`. `VerifyEmailView.tsx` offers
a resend button: `supabase.auth.resend({ type: "signup", email })`.

## The `/auth/callback` route

`app/auth/callback/route.ts` is a Route Handler (not a page — it needs to
set cookies, which pages/Server Components can't do) that both the
email-confirmation link and the password-reset link point to:

```ts
const { searchParams } = new URL(request.url);
const code = searchParams.get("code");
const next = searchParams.get("next") ?? "/dashboard";
if (code) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) return NextResponse.redirect(new URL(next, request.url));
}
return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
```

One handler serves both flows because both are just "exchange a code for a
session, then go to `next`" — email confirmation sends the user to
`/dashboard`, password reset sends them to `/reset-password` via the
`next` param.

## Login

`components/auth/LoginView.tsx` calls
`supabase.auth.signInWithPassword({ email, password })`. Reads a `next`
search param (via `useSearchParams`, so the page is wrapped in
`<Suspense>`) to return the user to whatever protected page they were
trying to reach before `proxy.ts` redirected them to `/login`.

## Forgot / reset password

- `components/auth/ForgotPasswordView.tsx` —
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: ".../auth/callback?next=/reset-password" })`.
- `components/auth/ResetPasswordView.tsx` — after the callback exchange
  puts the user in an authenticated (recovery) session, calls
  `supabase.auth.updateUser({ password })`. Client-side checks the two
  password fields match before submitting.

## Logout

`components/layout/AccountMenu.tsx` (user) and
`components/admin/layout/AdminAccountMenu.tsx` (admin) both call:

```ts
await supabase.auth.signOut();
router.push("/login");
router.refresh();
```

`router.refresh()` re-runs Server Components so the now-stale
`getCurrentProfile()`/`getCurrentAdminProfile()` data clears immediately.

## Session refresh & route protection (`proxy.ts` / `lib/supabase/middleware.ts`)

Every request (except static assets — see the matcher in `proxy.ts`) runs
`updateSession(request)`:

1. Calls `supabase.auth.getUser()` to refresh the session cookie if
   needed (this is the official `@supabase/ssr` pattern — it's what keeps
   users logged in past token expiry without a client-side refresh loop).
2. If the path starts with `/admin` and there's no user → redirect to
   `/login?next=<path>`.
3. If the path starts with `/admin` and the user isn't an admin (checked
   via `is_admin()` RPC) → redirect to `/`.
4. If the path matches `PROTECTED_USER_PREFIXES`
   (`/dashboard`, `/create`, `/settings`, `/subscription`) and there's no
   user → redirect to `/login?next=<path>`.

## Server-side re-verification (defense in depth)

`proxy.ts` redirects are a UX fast-path, not the security boundary — a
request that somehow reached a protected Server Component anyway still
hits `requireUser()`/`requireAdmin()` in `lib/supabase/auth-helpers.ts`
(which redirect again if unauthenticated/unauthorized), and every table
read/write is still gated by RLS regardless of what the route layer does.
See `admin-auth.md` for the admin-specific permission layer, and
`rls-policies.md` for the database layer.

## Error messages

`lib/supabase/error-messages.ts`'s `mapAuthErrorToKey()` maps raw Supabase
Auth error strings (e.g. `"Invalid login credentials"`,
`"User already registered"`) to i18n dictionary keys
(`auth.errorInvalidCredentials`, `auth.errorUserExists`, etc.) so the UI
never surfaces a raw driver error string to the user, and Arabic/English
copy stays consistent with the rest of the app.
