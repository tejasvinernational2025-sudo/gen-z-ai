-- Gen-z AI home tutor learning system
-- Student learning profile, weak-topic memory, and daily study plans.

create table if not exists public.student_learning_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  board text,
  school_class text,
  medium text,
  goal text not null default 'Overall improvement',
  daily_minutes integer not null default 30 check (daily_minutes between 10 and 180),
  preferred_subjects text[] not null default array['Mathematics','Science','English']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  mastery_score integer not null default 50 check (mastery_score between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  strong_signals integer not null default 0 check (strong_signals >= 0),
  weak_signals integer not null default 0 check (weak_signals >= 0),
  last_signal text not null default 'practice' check (last_signal in ('strong','needs_practice','practice')),
  last_mode text,
  last_practiced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subject, topic)
);

create table if not exists public.daily_study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  items jsonb not null default '[]'::jsonb,
  completed_keys text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

alter table public.student_learning_profiles enable row level security;
alter table public.topic_progress enable row level security;
alter table public.daily_study_plans enable row level security;

revoke all on table public.student_learning_profiles from anon;
revoke all on table public.topic_progress from anon;
revoke all on table public.daily_study_plans from anon;

grant select, insert, update, delete on table public.student_learning_profiles to authenticated;
grant select, insert, update, delete on table public.topic_progress to authenticated;
grant select, insert, update, delete on table public.daily_study_plans to authenticated;

drop policy if exists "learning_profile_owner_all" on public.student_learning_profiles;
create policy "learning_profile_owner_all"
on public.student_learning_profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "topic_progress_owner_all" on public.topic_progress;
create policy "topic_progress_owner_all"
on public.topic_progress
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "daily_plan_owner_all" on public.daily_study_plans;
create policy "daily_plan_owner_all"
on public.daily_study_plans
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists topic_progress_user_mastery_idx
  on public.topic_progress(user_id, mastery_score asc, last_practiced_at desc);

create index if not exists daily_study_plans_user_date_idx
  on public.daily_study_plans(user_id, plan_date desc);

create or replace function public.record_learning_signal_for_user(
  p_user_id uuid,
  p_subject text,
  p_topic text,
  p_signal text,
  p_mode text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subject text := left(trim(coalesce(p_subject, '')), 80);
  v_topic text := left(trim(coalesce(p_topic, '')), 140);
  v_signal text := lower(trim(coalesce(p_signal, 'practice')));
  v_row public.topic_progress%rowtype;
begin
  if p_user_id is null then
    raise exception 'User required';
  end if;

  if v_subject = '' or v_topic = '' then
    raise exception 'Subject and topic required';
  end if;

  if v_signal not in ('strong', 'needs_practice', 'practice') then
    v_signal := 'practice';
  end if;

  insert into public.topic_progress (
    user_id, subject, topic, mastery_score, attempts,
    strong_signals, weak_signals, last_signal, last_mode,
    last_practiced_at, updated_at
  )
  values (
    p_user_id,
    v_subject,
    v_topic,
    case v_signal when 'strong' then 65 when 'needs_practice' then 35 else 50 end,
    1,
    case when v_signal = 'strong' then 1 else 0 end,
    case when v_signal = 'needs_practice' then 1 else 0 end,
    v_signal,
    left(coalesce(p_mode, ''), 40),
    now(),
    now()
  )
  on conflict (user_id, subject, topic) do update
  set mastery_score = greatest(0, least(100,
        public.topic_progress.mastery_score +
        case v_signal when 'strong' then 8 when 'needs_practice' then -8 else 1 end
      )),
      attempts = public.topic_progress.attempts + 1,
      strong_signals = public.topic_progress.strong_signals + case when v_signal = 'strong' then 1 else 0 end,
      weak_signals = public.topic_progress.weak_signals + case when v_signal = 'needs_practice' then 1 else 0 end,
      last_signal = v_signal,
      last_mode = left(coalesce(p_mode, ''), 40),
      last_practiced_at = now(),
      updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'subject', v_row.subject,
    'topic', v_row.topic,
    'mastery_score', v_row.mastery_score,
    'attempts', v_row.attempts,
    'last_signal', v_row.last_signal
  );
end;
$$;

revoke all on function public.record_learning_signal_for_user(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_learning_signal_for_user(uuid, text, text, text, text)
  to service_role;
