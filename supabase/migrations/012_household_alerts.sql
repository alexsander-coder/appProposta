-- Alertas importantes da household (remédios, manutenção, o que não pode passar)

create table if not exists public.household_alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  notes text,
  priority text not null default 'normal',
  archived boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_alerts_priority_chk check (priority in ('normal', 'high'))
);

create index if not exists household_alerts_household_active_idx
  on public.household_alerts (household_id, archived asc, priority desc, created_at desc);

alter table public.household_alerts enable row level security;

drop policy if exists "household_alerts_select" on public.household_alerts;
drop policy if exists "household_alerts_insert" on public.household_alerts;
drop policy if exists "household_alerts_update" on public.household_alerts;
drop policy if exists "household_alerts_delete" on public.household_alerts;

create policy "household_alerts_select"
on public.household_alerts
for select
to authenticated
using (public.is_active_member(household_id));

create policy "household_alerts_insert"
on public.household_alerts
for insert
to authenticated
with check (
  public.is_active_member(household_id)
  and created_by = auth.uid()
);

create policy "household_alerts_update"
on public.household_alerts
for update
to authenticated
using (public.is_active_member(household_id))
with check (public.is_active_member(household_id));

create policy "household_alerts_delete"
on public.household_alerts
for delete
to authenticated
using (public.is_active_member(household_id));
