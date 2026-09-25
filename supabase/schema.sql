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
  student_context text not null default 'General',
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


-- Persistent per-user daily AI quotas. Private tables are not exposed by the Data API.
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;

create table if not exists private.plan_limits (
  plan text primary key,
  chat_daily integer not null check (chat_daily >= 0),
  photo_daily integer not null check (photo_daily >= 0),
  pdf_daily integer not null check (pdf_daily >= 0)
);

insert into private.plan_limits (plan, chat_daily, photo_daily, pdf_daily)
values
  ('free', 20, 3, 2),
  ('student', 100, 15, 10),
  ('student_plus', 300, 40, 30)
on conflict (plan) do update
set chat_daily = excluded.chat_daily,
    photo_daily = excluded.photo_daily,
    pdf_daily = excluded.pdf_daily;

create table if not exists private.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' references private.plan_limits(plan),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  chat_used integer not null default 0 check (chat_used >= 0),
  photo_used integer not null default 0 check (photo_used >= 0),
  pdf_used integer not null default 0 check (pdf_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists user_plans_plan_idx
  on private.user_plans(plan);

revoke all on all tables in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant select on private.plan_limits to authenticated;
grant select, insert on private.user_plans to authenticated;
grant select, insert, update on private.daily_usage to authenticated;

create or replace function public.consume_daily_quota(p_feature text)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan text;
  v_limit integer;
  v_used integer;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_reset timestamptz := (((now() at time zone 'Asia/Kolkata')::date + 1)::timestamp at time zone 'Asia/Kolkata');
  v_allowed boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_feature not in ('chat', 'photo', 'pdf') then
    raise exception 'Invalid quota feature';
  end if;

  insert into private.user_plans (user_id, plan)
  values (v_user_id, 'free')
  on conflict (user_id) do nothing;

  select up.plan into v_plan
  from private.user_plans up
  where up.user_id = v_user_id;

  select case p_feature
           when 'chat' then pl.chat_daily
           when 'photo' then pl.photo_daily
           when 'pdf' then pl.pdf_daily
         end
    into v_limit
  from private.plan_limits pl
  where pl.plan = v_plan;

  insert into private.daily_usage (user_id, usage_date)
  values (v_user_id, v_today)
  on conflict (user_id, usage_date) do nothing;

  if p_feature = 'chat' then
    update private.daily_usage
       set chat_used = chat_used + 1, updated_at = now()
     where user_id = v_user_id
       and usage_date = v_today
       and chat_used < v_limit
     returning chat_used into v_used;
  elsif p_feature = 'photo' then
    update private.daily_usage
       set photo_used = photo_used + 1, updated_at = now()
     where user_id = v_user_id
       and usage_date = v_today
       and photo_used < v_limit
     returning photo_used into v_used;
  else
    update private.daily_usage
       set pdf_used = pdf_used + 1, updated_at = now()
     where user_id = v_user_id
       and usage_date = v_today
       and pdf_used < v_limit
     returning pdf_used into v_used;
  end if;

  if v_used is not null then
    v_allowed := true;
  else
    select case p_feature
             when 'chat' then du.chat_used
             when 'photo' then du.photo_used
             when 'pdf' then du.pdf_used
           end
      into v_used
    from private.daily_usage du
    where du.user_id = v_user_id
      and du.usage_date = v_today;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'plan', v_plan,
    'feature', p_feature,
    'used', coalesce(v_used, 0),
    'limit', v_limit,
    'remaining', greatest(v_limit - coalesce(v_used, 0), 0),
    'resets_at', v_reset
  );
end;
$$;

revoke all on function public.consume_daily_quota(text) from public;
revoke all on function public.consume_daily_quota(text) from anon;
grant execute on function public.consume_daily_quota(text) to authenticated;
grant execute on function public.consume_daily_quota(text) to service_role;
