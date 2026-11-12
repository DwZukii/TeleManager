-- Employer name on customers
--
-- customers.employer_name: who the customer works for (nama majikan).
-- Optional, up to 120 characters. Typed by whoever adds or edits the
-- customer. The form offers the names already used, so the team keeps one
-- spelling per employer, and the customer list can be filtered by it.
--
-- employer_names(): every employer name in use, one per name ignoring
-- capitals and extra spaces (the most used spelling), for the form's list. An
-- agent can only see their own customers, so it runs with full read rights
-- and gives back names only: no customers, counts or agents. Staff only, like
-- everything since 2026-11-05-staff-only-access.sql.
--
-- Adding a column with no default doesn't rewrite the table or change any row.
--
-- To undo:
--   drop function public.employer_names();
--   alter table public.customers drop column employer_name;

alter table public.customers
  add column if not exists employer_name text
  constraint customers_employer_name_length check (char_length(employer_name) <= 120);

create or replace function public.employer_names()
returns table(name text)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
begin
  if public.get_my_role() is null then
    raise exception 'Not allowed for this account.' using errcode = '42501';
  end if;
  return query
    select mode() within group (order by c.employer_name)
    from public.customers c
    where btrim(coalesce(c.employer_name, '')) <> ''
    group by lower(regexp_replace(btrim(c.employer_name), '\s+', ' ', 'g'))
    order by 1;
end;
$fn$;

revoke execute on function public.employer_names() from public, anon;
grant execute on function public.employer_names() to authenticated;
