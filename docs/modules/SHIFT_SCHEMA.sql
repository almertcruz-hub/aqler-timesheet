create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  is_overnight boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_valid_weekday check (day_of_week between 0 and 6),
  constraint shifts_different_times check (start_time <> end_time),
  constraint shifts_one_per_employee_weekday unique (user_id, day_of_week)
);

create or replace function public.set_shifts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_shifts_updated_at
before update on public.shifts
for each row
execute function public.set_shifts_updated_at();

alter table public.shifts enable row level security;

revoke all on table public.shifts from anon;

grant select, insert, update, delete
on table public.shifts
to authenticated;

grant all
on table public.shifts
to service_role;

create policy "Employees can view their own weekly shifts"
on public.shifts
for select
to authenticated
using (
  user_id = (select auth.uid())
);

create policy "Administrators can manage all weekly shifts"
on public.shifts
for all
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create table public.shift_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shift_date date not null,
  start_time time without time zone,
  end_time time without time zone,
  is_overnight boolean not null default false,
  is_day_off boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_overrides_one_per_employee_date unique (user_id, shift_date),
  constraint shift_overrides_valid_schedule check (
    (
      is_day_off = true
      and start_time is null
      and end_time is null
      and is_overnight = false
    )
    or
    (
      is_day_off = false
      and start_time is not null
      and end_time is not null
      and start_time <> end_time
    )
  )
);

create index shift_overrides_date_idx
on public.shift_overrides (shift_date);

create or replace function public.set_shift_override_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_shift_override_updated_at
before update on public.shift_overrides
for each row
execute function public.set_shift_override_updated_at();

alter table public.shift_overrides enable row level security;

revoke all on table public.shift_overrides from anon;

grant select, insert, update, delete
on table public.shift_overrides
to authenticated;

grant all
on table public.shift_overrides
to service_role;

create policy "Employees can view their own shift overrides"
on public.shift_overrides
for select
to authenticated
using (
  user_id = (select auth.uid())
);

create policy "Administrators can manage all shift overrides"
on public.shift_overrides
for all
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
