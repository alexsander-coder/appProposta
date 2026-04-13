-- Rode este arquivo se ja executou a 006 antes da correcao do gen_random_bytes.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.create_household_invite(target_household_id uuid)
returns table (token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
volatile
as $$
declare
  new_token text;
  exp timestamptz;
begin
  if not exists (
    select 1 from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
      and hm.role in ('owner', 'admin')
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  new_token := encode(extensions.gen_random_bytes(16), 'hex');
  exp := now() + interval '7 days';

  insert into public.household_invites (household_id, token, created_by, expires_at)
  values (target_household_id, new_token, auth.uid(), exp);

  return query select new_token, exp;
end;
$$;
