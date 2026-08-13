alter table public.logs
  drop constraint if exists logs_user_id_profiles_fkey;

alter table public.logs
  add constraint logs_user_id_profiles_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

notify pgrst, 'reload schema';
