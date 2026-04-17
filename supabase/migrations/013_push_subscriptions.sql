-- Registro de tokens por dispositivo para envio de push notifications

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null,
  installation_id text not null,
  expo_push_token text not null,
  platform text not null,
  permission_status text not null default 'granted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_platform_chk check (platform in ('ios', 'android', 'web')),
  constraint push_subscriptions_permission_chk check (permission_status in ('granted', 'denied', 'undetermined')),
  constraint push_subscriptions_unique_device unique (household_id, user_id, installation_id)
);

create index if not exists push_subscriptions_household_idx
  on public.push_subscriptions (household_id);

create index if not exists push_subscriptions_token_idx
  on public.push_subscriptions (expo_push_token);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete" on public.push_subscriptions;

create policy "push_subscriptions_select"
on public.push_subscriptions
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_member(household_id)
);

create policy "push_subscriptions_insert"
on public.push_subscriptions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_member(household_id)
);

create policy "push_subscriptions_update"
on public.push_subscriptions
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_member(household_id)
)
with check (
  user_id = auth.uid()
  and public.is_active_member(household_id)
);

create policy "push_subscriptions_delete"
on public.push_subscriptions
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_member(household_id)
);
