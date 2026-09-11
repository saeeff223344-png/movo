-- 004_projects_video_jobs.sql
-- The video-generation pipeline: projects, their assets/revisions, the
-- resulting videos, and the AI/render job + usage-event ledger behind them.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null,
  language text check (language in ('ar', 'en')),
  business_name text,
  offer text,
  price text,
  style text,
  platform text,
  aspect_ratio text check (aspect_ratio in ('9:16', '16:9', '1:1')),
  duration_seconds integer,
  status text not null default 'draft' check (status in ('draft', 'planning', 'generating', 'ready', 'rendering', 'failed')),
  brief jsonb,
  scene_plan jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create table public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('product', 'logo', 'reference', 'video')),
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.project_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  instruction text not null,
  previous_state jsonb,
  resulting_state jsonb,
  created_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  duration_seconds integer,
  aspect_ratio text check (aspect_ratio in ('9:16', '16:9', '1:1')),
  resolution text not null default '1080p' check (resolution in ('1080p', '2k', '4k')),
  format text not null default 'mp4',
  storage_path text,
  file_size_mb numeric(10, 2),
  created_at timestamptz not null default now()
);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  operation text not null check (operation in (
    'prompt_analysis', 'brief_generation', 'script_generation', 'scene_planning',
    'revision', 'image_generation', 'video_generation', 'voice_generation'
  )),
  provider text,
  model text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed')),
  tokens_used integer,
  generated_units integer,
  cost_usd numeric(10, 4),
  cost_iqd integer,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  video_id uuid references public.videos (id) on delete set null,
  provider text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed')),
  resolution text check (resolution in ('1080p', '2k', '4k')),
  format text not null default 'mp4',
  render_seconds numeric(10, 2),
  estimated_cost_iqd integer,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Append-only ledger every billable/measurable action writes one row to.
-- usage/finance admin pages aggregate from this table rather than each
-- domain table separately.
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  event_type text not null check (event_type in (
    'video_generation', 'text_tokens_input', 'text_tokens_output', 'image_generation',
    'video_ai_seconds', 'voice_seconds', 'render_seconds', 'storage_bytes'
  )),
  quantity numeric not null,
  unit text,
  provider text,
  cost_usd numeric(10, 4),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.trial_usage
  add constraint trial_usage_project_id_fkey foreign key (project_id) references public.projects (id),
  add constraint trial_usage_video_id_fkey foreign key (video_id) references public.videos (id);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

create index projects_owner_id_idx on public.projects (owner_id);
create index projects_status_idx on public.projects (status);
create index project_assets_project_id_idx on public.project_assets (project_id);
create index project_revisions_project_id_idx on public.project_revisions (project_id);
create index videos_project_id_idx on public.videos (project_id);
create index videos_owner_id_idx on public.videos (owner_id);
create index ai_jobs_user_id_idx on public.ai_jobs (user_id);
create index ai_jobs_status_idx on public.ai_jobs (status);
create index render_jobs_status_idx on public.render_jobs (status);
create index render_jobs_user_id_idx on public.render_jobs (user_id);
create index usage_events_user_id_idx on public.usage_events (user_id);
create index usage_events_created_at_idx on public.usage_events (created_at);
create index usage_events_event_type_idx on public.usage_events (event_type);

-- ---------------------------------------------------------------------
-- RLS — owner-only for regular users, permission-gated for admins.
-- ---------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.project_assets enable row level security;
alter table public.project_revisions enable row level security;
alter table public.videos enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.render_jobs enable row level security;
alter table public.usage_events enable row level security;

create policy "projects: owner can manage own"
  on public.projects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "projects: projects.read can read all"
  on public.projects for select
  using (public.has_permission('projects.read'));

create policy "projects: projects.manage can write all"
  on public.projects for all
  using (public.has_permission('projects.manage'))
  with check (public.has_permission('projects.manage'));

create policy "project_assets: owner can manage own"
  on public.project_assets for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "project_assets: projects.read can read all"
  on public.project_assets for select
  using (public.has_permission('projects.read'));

create policy "project_revisions: owner can manage own project's revisions"
  on public.project_revisions for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (auth.uid() = user_id);

create policy "project_revisions: projects.read can read all"
  on public.project_revisions for select
  using (public.has_permission('projects.read'));

create policy "videos: owner can read own"
  on public.videos for select
  using (auth.uid() = owner_id);

create policy "videos: videos.read can read all"
  on public.videos for select
  using (public.has_permission('videos.read'));

create policy "videos: videos.manage can write"
  on public.videos for all
  using (public.has_permission('videos.manage'))
  with check (public.has_permission('videos.manage'));

create policy "ai_jobs: owner can read own"
  on public.ai_jobs for select
  using (auth.uid() = user_id);

create policy "ai_jobs: ai_jobs.read can read all"
  on public.ai_jobs for select
  using (public.has_permission('ai_jobs.read'));

create policy "ai_jobs: ai_jobs.manage can write"
  on public.ai_jobs for all
  using (public.has_permission('ai_jobs.manage'))
  with check (public.has_permission('ai_jobs.manage'));

create policy "render_jobs: owner can read own"
  on public.render_jobs for select
  using (auth.uid() = user_id);

create policy "render_jobs: render_jobs.read can read all"
  on public.render_jobs for select
  using (public.has_permission('render_jobs.read'));

create policy "render_jobs: render_jobs.manage can write"
  on public.render_jobs for all
  using (public.has_permission('render_jobs.manage'))
  with check (public.has_permission('render_jobs.manage'));

create policy "usage_events: owner can read own"
  on public.usage_events for select
  using (auth.uid() = user_id);

create policy "usage_events: usage.read can read all"
  on public.usage_events for select
  using (public.has_permission('usage.read'));
