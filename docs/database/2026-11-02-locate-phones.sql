-- locate_phones: for each number given that is already in the leads table, says
-- broadly where it is, so an import can tell people more than "already in the
-- database":
--
--   agents   given to an agent
--   yours    unassigned, in the caller's own pool
--   admin    unassigned, in an admin's pool
--   others   unassigned, in anyone else's pool (or nobody's)
--
-- It runs with full read rights, because a manager can't see other pools, so it
-- gives back only that one word for each number. It never says whose pool or
-- which agent. Signed-in people only (since 2026-11-05-staff-only-access.sql,
-- admins and managers only).
--
-- check_duplicate_phones stays as it was: scripts/upload_backlog.js still uses it.
--
-- To undo: drop function public.locate_phones(text[]);

create or replace function public.locate_phones(phone_numbers text[])
returns table(phone_number text, place text)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.phone_number,
    case
      when coalesce(l.assigned_to, 'unassigned') <> 'unassigned' then 'agents'
      when l.pool_owner = (select public.get_my_email()) then 'yours'
      when p.role = 'super_admin' then 'admin'
      else 'others'
    end
  from public.leads l
  left join public.profiles p on p.email = l.pool_owner
  where l.phone_number = any(phone_numbers);
$$;

revoke execute on function public.locate_phones(text[]) from public, anon;
grant execute on function public.locate_phones(text[]) to authenticated;
