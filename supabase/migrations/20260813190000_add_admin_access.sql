create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name, email)
select id, raw_user_meta_data ->> 'full_name', email
from auth.users
on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email;

alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Users manage their own logs" on public.logs;

drop policy if exists "Users read their own logs" on public.logs;
create policy "Users read their own logs"
  on public.logs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Admins read all logs" on public.logs;
create policy "Admins read all logs"
  on public.logs for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Users insert their own logs" on public.logs;
create policy "Users insert their own logs"
  on public.logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own logs" on public.logs;
create policy "Users update their own logs"
  on public.logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own logs" on public.logs;
create policy "Users delete their own logs"
  on public.logs for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.profiles to authenticated;
