-- Eventos da agenda partilhada da household (consultas, escola, aniversários, etc.)

create table if not exists public.household_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists household_events_household_starts_idx
  on public.household_events (household_id, starts_at asc);

alter table public.household_events enable row level security;

drop policy if exists "household_events_select" on public.household_events;
drop policy if exists "household_events_insert" on public.household_events;
drop policy if exists "household_events_update" on public.household_events;
drop policy if exists "household_events_delete" on public.household_events;

create policy "household_events_select"
on public.household_events
for select
to authenticated
using (public.is_active_member(household_id));

create policy "household_events_insert"
on public.household_events
for insert
to authenticated
with check (
  public.is_active_member(household_id)
  and created_by = auth.uid()
);

create policy "household_events_update"
on public.household_events
for update
to authenticated
using (public.is_active_member(household_id))
with check (public.is_active_member(household_id));

create policy "household_events_delete"
on public.household_events
for delete
to authenticated
using (public.is_active_member(household_id));
