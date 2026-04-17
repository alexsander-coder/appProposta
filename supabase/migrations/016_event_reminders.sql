-- Lembretes de eventos da agenda (push configuravel por antecedencia)

alter table public.household_events
  add column if not exists remind_offset_minutes integer not null default 30;

alter table public.household_events
  drop constraint if exists household_events_remind_offset_chk;

alter table public.household_events
  add constraint household_events_remind_offset_chk
  check (remind_offset_minutes in (0, 5, 15, 30, 60, 1440));

create table if not exists public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.household_events (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null,
  scheduled_for timestamptz not null,
  send_at timestamptz not null,
  remind_offset_minutes integer not null default 30,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_reminders_send_before_start_chk check (send_at <= scheduled_for),
  constraint event_reminders_remind_offset_chk
    check (remind_offset_minutes in (0, 5, 15, 30, 60, 1440))
);

create index if not exists event_reminders_due_idx
  on public.event_reminders (send_at asc)
  where sent_at is null;

alter table public.event_reminders enable row level security;

drop policy if exists "event_reminders_select" on public.event_reminders;
drop policy if exists "event_reminders_insert" on public.event_reminders;
drop policy if exists "event_reminders_update" on public.event_reminders;
drop policy if exists "event_reminders_delete" on public.event_reminders;

create policy "event_reminders_select"
on public.event_reminders
for select
to authenticated
using (public.is_active_member(household_id));

create policy "event_reminders_insert"
on public.event_reminders
for insert
to authenticated
with check (
  public.is_active_member(household_id)
  and created_by = auth.uid()
);

create policy "event_reminders_update"
on public.event_reminders
for update
to authenticated
using (public.is_active_member(household_id))
with check (public.is_active_member(household_id));

create policy "event_reminders_delete"
on public.event_reminders
for delete
to authenticated
using (public.is_active_member(household_id));
