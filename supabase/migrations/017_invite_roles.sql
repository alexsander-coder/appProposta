-- Convites com papel (RBAC leve) e regras de quem pode convidar quem.

-- 1) Papel no convite
alter table public.household_invites
  add column if not exists role text not null default 'member';

alter table public.household_invites
  drop constraint if exists household_invites_role_check;

alter table public.household_invites
  add constraint household_invites_role_check
  check (role in ('admin', 'member', 'viewer'));

-- 2) Garantir que household_members aceite viewer (se ainda nao existir)
alter table public.household_members
  drop constraint if exists household_members_role_check;

alter table public.household_members
  add constraint household_members_role_check
  check (role in ('owner', 'admin', 'member', 'viewer'));

-- 3) create_household_invite: segundo parametro opcional = papel convidado
drop function if exists public.create_household_invite(uuid);
drop function if exists public.create_household_invite(uuid, text);

create or replace function public.create_household_invite(
  target_household_id uuid,
  invite_role text default 'member'
)
returns table (token text, expires_at timestamptz, role text)
language plpgsql
security definer
set search_path = public, extensions
volatile
as $$
declare
  new_token text;
  exp timestamptz;
  r text;
  inviter_role text;
begin
  if invite_role is null or length(trim(invite_role)) = 0 then
    r := 'member';
  else
    r := lower(trim(invite_role));
  end if;

  if r not in ('admin', 'member', 'viewer') then
    raise exception 'invalid role' using errcode = 'P0001';
  end if;

  select hm.role into inviter_role
  from public.household_members hm
  where hm.household_id = target_household_id
    and hm.user_id = auth.uid()
    and hm.status = 'active'
  limit 1;

  if inviter_role is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if inviter_role = 'admin' and r = 'admin' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if inviter_role = 'admin' and r = 'viewer' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if inviter_role not in ('owner', 'admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  new_token := encode(extensions.gen_random_bytes(16), 'hex');
  exp := now() + interval '7 days';

  insert into public.household_invites (household_id, token, created_by, expires_at, role)
  values (target_household_id, new_token, auth.uid(), exp, r);

  return query select new_token, exp, r;
end;
$$;

-- 4) accept_household_invite: aplica o papel do convite (sem promover a owner)
create or replace function public.accept_household_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  inv public.household_invites%rowtype;
  new_role text;
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

  new_role := coalesce(nullif(trim(inv.role), ''), 'member');
  if new_role not in ('admin', 'member', 'viewer') then
    new_role := 'member';
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
    new_role,
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

revoke all on function public.create_household_invite(uuid, text) from public;
grant execute on function public.create_household_invite(uuid, text) to authenticated;
