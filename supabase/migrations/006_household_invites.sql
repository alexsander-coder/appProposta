-- Convites para novos membros (token + aceitacao via RPC com SECURITY DEFINER).
-- pgcrypto no Supabase fica em schema "extensions"; gen_random_bytes exige isso.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_household_invites_household
  on public.household_invites(household_id);
create index if not exists idx_household_invites_token_open
  on public.household_invites(token) where accepted_at is null;

alter table public.household_invites enable row level security;

drop policy if exists "household_invites_select_member" on public.household_invites;
create policy "household_invites_select_member"
on public.household_invites for select
to authenticated
using (public.is_active_member(household_id));

-- Sem INSERT/UPDATE direto para anon/authenticated: apenas RPC security definer.

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

create or replace function public.accept_household_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  inv public.household_invites%rowtype;
begin
  if invite_token is null or length(trim(invite_token)) = 0 then
    raise exception 'invalid token' using errcode = 'P0001';
  end if;

  select * into inv from public.household_invites
  where token = trim(invite_token)
    and accepted_at is null
    and expires_at > now();

  if not found then
    raise exception 'invalid or expired invite' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.household_members hm
    where hm.household_id = inv.household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  ) then
    update public.household_invites
    set accepted_at = now(), accepted_by = auth.uid()
    where id = inv.id;
    return inv.household_id;
  end if;

  insert into public.household_members (
    household_id,
    user_id,
    role,
    status,
    invited_by,
    accepted_at
  ) values (
    inv.household_id,
    auth.uid(),
    'member',
    'active',
    inv.created_by,
    now()
  );

  update public.household_invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = inv.id;

  return inv.household_id;
end;
$$;

revoke all on function public.create_household_invite(uuid) from public;
revoke all on function public.accept_household_invite(text) from public;
grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;
