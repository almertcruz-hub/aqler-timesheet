create table if not exists public.email_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  sent_at timestamptz,
  error text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists email_reminders_due_idx
  on public.email_reminders (scheduled_at)
  where status = 'pending';

alter table public.email_reminders enable row level security;

create policy "Admins manage email reminders"
  on public.email_reminders for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select, insert, update, delete on public.email_reminders to authenticated;

