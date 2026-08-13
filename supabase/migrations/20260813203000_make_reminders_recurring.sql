alter table public.email_reminders
  alter column scheduled_at drop not null,
  add column if not exists days_of_week smallint[] not null default array[1,2,3,4,5]::smallint[],
  add column if not exists reminder_time time not null default '17:00',
  add column if not exists timezone text not null default 'Asia/Manila',
  add column if not exists last_sent_on date;

alter table public.email_reminders
  drop constraint if exists email_reminders_status_check;

alter table public.email_reminders
  add constraint email_reminders_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'active', 'paused'));

alter table public.email_reminders
  add constraint email_reminders_days_check
  check (cardinality(days_of_week) > 0 and days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]);

drop index if exists public.email_reminders_due_idx;

create index if not exists email_reminders_active_idx
  on public.email_reminders (status)
  where status = 'active';
