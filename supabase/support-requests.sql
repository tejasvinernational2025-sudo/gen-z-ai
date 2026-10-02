create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  category text not null check (category in ('account','payment','refund','technical','feedback','other')),
  message text not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_requests enable row level security;

revoke all on table public.support_requests from anon, authenticated;

create index if not exists support_requests_created_idx
  on public.support_requests(created_at desc);

create index if not exists support_requests_status_idx
  on public.support_requests(status, created_at desc);
