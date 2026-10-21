-- message_scripts: the messages people send to customers, kept with their
-- account instead of on one phone.
--
--   owner = a person's email   their own WhatsApp script, SMS script and
--                              birthday greeting
--   owner = 'company'          the standard ones everybody else sends, set by
--                              an admin on the Scripts page
--
-- Rules (enforced below, not just by the app):
--   * everyone signed in reads the company scripts
--   * a person reads and changes only their own
--   * an admin (super_admin) also reads everyone's, and is the only one who
--     changes the company's; an admin cannot change anyone else's own scripts
--
-- Run once in Supabase (SQL editor, or as a migration named message_scripts).
-- To undo:
--   drop table public.message_scripts;
--   drop function public.message_scripts_stamp();

create table if not exists public.message_scripts (
  owner text not null,
  kind text not null check (kind in ('wa', 'sms', 'birthday')),
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (owner, kind)
);

comment on table public.message_scripts is
  'WhatsApp and SMS scripts and birthday greetings: one row per person (owner = their email) and kind, plus the company standard ones (owner = ''company'').';

-- When and by whom, set by the database so the app can't misstate it.
create or replace function public.message_scripts_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := public.get_my_email();
  return new;
end;
$$;

drop trigger if exists message_scripts_stamp on public.message_scripts;
create trigger message_scripts_stamp
  before insert or update on public.message_scripts
  for each row execute function public.message_scripts_stamp();

alter table public.message_scripts enable row level security;

drop policy if exists message_scripts_read on public.message_scripts;
create policy message_scripts_read on public.message_scripts
  for select to authenticated
  using (owner = 'company' or owner = public.get_my_email() or public.get_my_role() = 'super_admin');

drop policy if exists message_scripts_insert on public.message_scripts;
create policy message_scripts_insert on public.message_scripts
  for insert to authenticated
  with check (owner = public.get_my_email() or (owner = 'company' and public.get_my_role() = 'super_admin'));

drop policy if exists message_scripts_update on public.message_scripts;
create policy message_scripts_update on public.message_scripts
  for update to authenticated
  using (owner = public.get_my_email() or (owner = 'company' and public.get_my_role() = 'super_admin'))
  with check (owner = public.get_my_email() or (owner = 'company' and public.get_my_role() = 'super_admin'));

drop policy if exists message_scripts_delete on public.message_scripts;
create policy message_scripts_delete on public.message_scripts
  for delete to authenticated
  using (owner = public.get_my_email() or (owner = 'company' and public.get_my_role() = 'super_admin'));
