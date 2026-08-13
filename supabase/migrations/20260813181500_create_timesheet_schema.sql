create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('IN', 'OUT')),
  time text not null,
  date text not null,
  duration numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  time_in timestamptz not null default now(),
  time_out timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists one_open_session_per_user
  on public.active_sessions (user_id)
  where time_out is null;

alter table public.logs enable row level security;
alter table public.active_sessions enable row level security;

drop policy if exists "Users manage their own logs" on public.logs;
create policy "Users manage their own logs"
  on public.logs for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own active sessions" on public.active_sessions;
create policy "Users manage their own active sessions"
  on public.active_sessions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.logs to authenticated;
grant select, insert, update, delete on public.active_sessions to authenticated;
