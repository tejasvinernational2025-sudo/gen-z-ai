-- Gen-z AI chapter/book grounding sources.
create table if not exists public.study_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  chapter text,
  source_type text not null default 'pdf' check (source_type in ('pdf','text')),
  extracted_text text not null,
  char_count integer not null default 0 check (char_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_sources enable row level security;

revoke all on table public.study_sources from anon;
grant select, insert, update, delete on table public.study_sources to authenticated;

drop policy if exists "study_sources_owner_all" on public.study_sources;
create policy "study_sources_owner_all"
on public.study_sources
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists study_sources_user_created_idx
  on public.study_sources(user_id, created_at desc);
