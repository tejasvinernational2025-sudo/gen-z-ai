create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text default 'Hinglish',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  mode text not null default 'chat',
  language text not null default 'Hinglish',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- New Supabase projects do not necessarily auto-expose public tables.
-- Keep anonymous users out; signed-in users get Data API privileges, then RLS
-- restricts every row to its owner.
revoke all on table public.profiles from anon;
revoke all on table public.conversations from anon;
revoke all on table public.messages from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.conversations to authenticated;
grant select, insert, update, delete on table public.messages to authenticated;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all"
on public.profiles
for all
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "conversations_owner_all" on public.conversations;
create policy "conversations_owner_all"
on public.conversations
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "messages_owner_all" on public.messages;
create policy "messages_owner_all"
on public.messages
for all
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = (select auth.uid())
  )
);

create index if not exists conversations_user_id_created_at_idx
  on public.conversations(user_id, created_at desc);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages(conversation_id, created_at asc);


create index if not exists messages_user_id_idx
  on public.messages(user_id);
