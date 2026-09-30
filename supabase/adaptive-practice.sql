-- Adaptive practice and mistake tracking for Gen-z AI.

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  source_type text not null default 'practice' check (source_type in ('photo','quiz','practice')),
  question text not null,
  student_answer text not null,
  expected_answer text,
  correct boolean not null,
  score integer not null check (score between 0 and 100),
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  feedback text,
  created_at timestamptz not null default now()
);

alter table public.practice_attempts enable row level security;

revoke all on table public.practice_attempts from anon;
grant select, insert, delete on table public.practice_attempts to authenticated;

drop policy if exists "practice_attempts_owner_all" on public.practice_attempts;
create policy "practice_attempts_owner_all"
on public.practice_attempts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists practice_attempts_user_created_idx
  on public.practice_attempts(user_id, created_at desc);

create index if not exists practice_attempts_user_topic_idx
  on public.practice_attempts(user_id, subject, topic, created_at desc);
