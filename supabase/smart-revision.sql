-- Smart Revision Engine for Gen-z AI.
-- Automatically schedules weak topics and tracks spaced-repetition reviews.

create table if not exists public.revision_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  due_date date not null,
  interval_days integer not null default 1 check (interval_days between 1 and 90),
  repetitions integer not null default 0 check (repetitions >= 0),
  last_result text check (last_result is null or last_result in ('hard','okay','easy')),
  last_score integer check (last_score is null or last_score between 0 and 100),
  last_reviewed_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subject, topic)
);

alter table public.revision_schedule enable row level security;

revoke all on table public.revision_schedule from anon;
grant select, insert, update, delete on table public.revision_schedule to authenticated;

drop policy if exists "revision_schedule_owner_all" on public.revision_schedule;
create policy "revision_schedule_owner_all"
on public.revision_schedule
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists revision_schedule_user_due_idx
  on public.revision_schedule(user_id, is_active, due_date asc);

create or replace function public.schedule_weak_topic_revision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if new.mastery_score < 65 or new.last_signal = 'needs_practice' then
    insert into public.revision_schedule (
      user_id, subject, topic, due_date, interval_days, repetitions, is_active, updated_at
    )
    values (
      new.user_id, new.subject, new.topic, v_today, 1, 0, true, now()
    )
    on conflict (user_id, subject, topic) do update
    set due_date = least(public.revision_schedule.due_date, v_today),
        is_active = true,
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_schedule_weak_topic_revision on public.topic_progress;
create trigger trg_schedule_weak_topic_revision
after insert or update of mastery_score, last_signal
on public.topic_progress
for each row
execute function public.schedule_weak_topic_revision();

-- Backfill current weak topics so existing students immediately get a Revise Today list.
insert into public.revision_schedule (
  user_id, subject, topic, due_date, interval_days, repetitions, is_active, updated_at
)
select
  user_id,
  subject,
  topic,
  (now() at time zone 'Asia/Kolkata')::date,
  1,
  0,
  true,
  now()
from public.topic_progress
where mastery_score < 65 or last_signal = 'needs_practice'
on conflict (user_id, subject, topic) do nothing;
