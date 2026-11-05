-- Staff-only access
--
-- Only people with a staff role (a row in profiles with a role) can use the
-- team's data. Before this, any signed-in login, including one with no
-- profile, could read every staff member's name, email and phone, run the
-- counting and number-checking functions, add reminders to any customer, add
-- customers of its own, send feedback and upload files. The pool counts in
-- lead_set_summary could be read without signing in at all. Public sign-up was
-- open, so anyone could make such a login.
--
-- Accounts are now made by the create-user function
-- (supabase/functions/create-user) and public sign-up is switched off.
--
-- What staff can do is unchanged:
--
--   profiles                  staff read everyone, as before; anyone else at
--                             most their own row
--   locate_phones,
--   check_duplicate_phones    admins and managers (they import numbers)
--   get_agent_stats,
--   get_gm_agent_stats,
--   get_set_counts,
--   get_manager_unassigned_counts
--                             admins, managers and general managers
--   lead_set_summary          admins, managers and general managers; nobody
--                             signed out
--   customer_reminders        add one only to a customer you can see; change
--                             or remove only one you can see
--   customers                 adding one as your own needs a staff role
--   feedback                  sending it needs a staff role
--   storage, 'documents'      uploading needs a staff role
--
-- A function refused this way fails with "Not allowed for this account."
-- (code 42501, so the API answers 403).
--
-- To undo: run the statements under "Before" at the end of this file.


-- profiles ------------------------------------------------------------------

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    (select public.get_my_role()) is not null
    or lower(email) = lower((select public.get_my_email()))
  );


-- Functions -------------------------------------------------------------------

create or replace function public.check_duplicate_phones(phone_numbers text[])
returns table(phone_number text)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
begin
  if coalesce(public.get_my_role(), '') not in ('super_admin', 'manager') then
    raise exception 'Not allowed for this account.' using errcode = '42501';
  end if;
  return query
    select l.phone_number
    from public.leads l
    where l.phone_number = any(phone_numbers);
end;
$fn$;

create or replace function public.locate_phones(phone_numbers text[])
returns table(phone_number text, place text)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
declare
  me text := public.get_my_email();
begin
  if coalesce(public.get_my_role(), '') not in ('super_admin', 'manager') then
    raise exception 'Not allowed for this account.' using errcode = '42501';
  end if;
  return query
    select
      l.phone_number,
      case
        when coalesce(l.assigned_to, 'unassigned') <> 'unassigned' then 'agents'
        when l.pool_owner = me then 'yours'
        when p.role = 'super_admin' then 'admin'
        else 'others'
      end
    from public.leads l
    left join public.profiles p on p.email = l.pool_owner
    where l.phone_number = any(phone_numbers);
end;
$fn$;

create or replace function public.get_agent_stats(agent_emails text[])
returns table(assigned_to text, status text, count bigint)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
begin
  if coalesce(public.get_my_role(), '') not in ('super_admin', 'manager', 'general_manager') then
    raise exception 'Not allowed for this account.' using errcode = '42501';
  end if;
  return query
    select l.assigned_to, l.status, count(*)::bigint
    from public.leads l
    where l.assigned_to = any(agent_emails)
    group by l.assigned_to, l.status;
end;
$fn$;

create or replace function public.get_gm_agent_stats(manager_emails text[])
returns table(assigned_to text, status text, count bigint)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
begin
  if coalesce(public.get_my_role(), '') not in ('super_admin', 'manager', 'general_manager') then
    raise exception 'Not allowed for this account.' using errcode = '42501';
  end if;
  return query
    select l.assigned_to, l.status, count(*)::bigint
    from public.leads l
    join public.profiles p on p.email = l.assigned_to
    where p.manager_email = any(manager_emails)
    group by l.assigned_to, l.status;
end;
$fn$;

create or replace function public.get_set_counts(p_owner text)
returns table(lead_set text, set_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
begin
  if coalesce(public.get_my_role(), '') not in ('super_admin', 'manager', 'general_manager') then
    raise exception 'Not allowed for this account.' using errcode = '42501';
  end if;
  return query
    select s.lead_set, s.unassigned_count
    from public.lead_set_summary s
    where s.pool_owner = p_owner;
end;
$fn$;

create or replace function public.get_manager_unassigned_counts()
returns table(manager_email text, unassigned_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
begin
  if coalesce(public.get_my_role(), '') not in ('super_admin', 'manager', 'general_manager') then
    raise exception 'Not allowed for this account.' using errcode = '42501';
  end if;
  return query
    select s.pool_owner, sum(s.unassigned_count)::bigint
    from public.lead_set_summary s
    group by s.pool_owner;
end;
$fn$;

revoke execute on function public.check_duplicate_phones(text[]) from public, anon;
revoke execute on function public.locate_phones(text[]) from public, anon;
revoke execute on function public.get_agent_stats(text[]) from public, anon;
revoke execute on function public.get_gm_agent_stats(text[]) from public, anon;
revoke execute on function public.get_set_counts(text) from public, anon;
revoke execute on function public.get_manager_unassigned_counts() from public, anon;
grant execute on function public.check_duplicate_phones(text[]) to authenticated;
grant execute on function public.locate_phones(text[]) to authenticated;
grant execute on function public.get_agent_stats(text[]) to authenticated;
grant execute on function public.get_gm_agent_stats(text[]) to authenticated;
grant execute on function public.get_set_counts(text) to authenticated;
grant execute on function public.get_manager_unassigned_counts() to authenticated;


-- lead_set_summary ------------------------------------------------------------
-- The app reads it only through get_set_counts and
-- get_manager_unassigned_counts, which skip these rules.

drop policy if exists "Allow authenticated read on lead_set_summary" on public.lead_set_summary;
create policy lead_set_summary_read on public.lead_set_summary
  for select to authenticated
  using ((select public.get_my_role()) in ('super_admin', 'manager', 'general_manager'));


-- customer_reminders ------------------------------------------------------------
-- Reading is unchanged: your own, your agents' (managers), or all (admins).

drop policy if exists "Allow insert for authenticated users" on public.customer_reminders;
drop policy if exists "Allow update own reminders" on public.customer_reminders;
drop policy if exists "Allow delete for authenticated users" on public.customer_reminders;

-- The customers rules decide which customers you can see.
create policy customer_reminders_insert on public.customer_reminders
  for insert to authenticated
  with check (exists (select 1 from public.customers c where c.id = customer_reminders.customer_id));

create policy customer_reminders_update on public.customer_reminders
  for update to authenticated
  using (
    agent_email = (select auth.jwt() ->> 'email')
    or agent_email in (select p.email from public.profiles p where p.manager_email = (select auth.jwt() ->> 'email'))
    or exists (select 1 from public.profiles p where p.email = (select auth.jwt() ->> 'email') and p.role in ('admin', 'super_admin'))
  )
  with check (
    agent_email = (select auth.jwt() ->> 'email')
    or agent_email in (select p.email from public.profiles p where p.manager_email = (select auth.jwt() ->> 'email'))
    or exists (select 1 from public.profiles p where p.email = (select auth.jwt() ->> 'email') and p.role in ('admin', 'super_admin'))
  );

create policy customer_reminders_delete on public.customer_reminders
  for delete to authenticated
  using (
    agent_email = (select auth.jwt() ->> 'email')
    or agent_email in (select p.email from public.profiles p where p.manager_email = (select auth.jwt() ->> 'email'))
    or exists (select 1 from public.profiles p where p.email = (select auth.jwt() ->> 'email') and p.role in ('admin', 'super_admin'))
  );


-- customers -------------------------------------------------------------------

drop policy if exists customers_insert_combined on public.customers;
create policy customers_insert_combined on public.customers
  for insert to authenticated
  with check (
    (agent_email = (select auth.jwt() ->> 'email') and (select public.get_my_role()) is not null)
    or exists (
      select 1 from public.profiles
      where profiles.email = (select auth.jwt() ->> 'email')
        and profiles.role in ('super_admin', 'admin', 'manager')
    )
  );


-- feedback --------------------------------------------------------------------

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
  for insert to authenticated
  with check (user_email = (select public.get_my_email()) and (select public.get_my_role()) is not null);


-- storage: the 'documents' bucket (lead documents) -----------------------------

drop policy if exists documents_insert on storage.objects;
create policy documents_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (select public.get_my_role()) is not null);


-- Before ----------------------------------------------------------------------
-- The rules as they were, to put back if needed. The functions were the same
-- queries without the role check (check_duplicate_phones, locate_phones,
-- get_agent_stats, get_gm_agent_stats and get_manager_unassigned_counts in
-- `language sql`; get_set_counts in plpgsql).
--
-- create policy profiles_select on public.profiles for select to authenticated using (true);
-- create policy "Allow authenticated read on lead_set_summary" on public.lead_set_summary for select using (true);
-- create policy "Allow insert for authenticated users" on public.customer_reminders for insert to authenticated
--   with check ((select auth.uid()) is not null);
-- create policy "Allow update own reminders" on public.customer_reminders for update to authenticated
--   using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
-- create policy "Allow delete for authenticated users" on public.customer_reminders for delete to authenticated
--   using ((select auth.uid()) is not null);
-- create policy customers_insert_combined on public.customers for insert to authenticated
--   with check ((agent_email = (select auth.jwt() ->> 'email')) or exists (select 1 from public.profiles
--     where profiles.email = (select auth.jwt() ->> 'email') and profiles.role in ('super_admin', 'admin', 'manager')));
-- create policy feedback_insert on public.feedback for insert to authenticated with check (user_email = get_my_email());
-- create policy documents_insert on storage.objects for insert to authenticated with check (bucket_id = 'documents');
