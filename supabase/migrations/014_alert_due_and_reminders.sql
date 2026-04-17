-- Data/hora de vencimento do alerta e agenda de lembrete (push 5 minutos antes)

alter table public.household_alerts
  add column if not exists due_at timestamptz;

create index if not exists household_alerts_due_idx
  on public.household_alerts (household_id, due_at)
  where archived = false and due_at is not null;

create table if not exists public.alert_reminders (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null unique references public.household_alerts (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null,
  scheduled_for timestamptz not null,
  send_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alert_reminders_send_before_due_chk check (send_at <= scheduled_for)
);

create index if not exists alert_reminders_due_idx
  on public.alert_reminders (send_at asc)
  where sent_at is null;

alter table public.alert_reminders enable row level security;

drop policy if exists "alert_reminders_select" on public.alert_reminders;
drop policy if exists "alert_reminders_insert" on public.alert_reminders;
drop policy if exists "alert_reminders_update" on public.alert_reminders;
drop policy if exists "alert_reminders_delete" on public.alert_reminders;

create policy "alert_reminders_select"
on public.alert_reminders
for select
to authenticated
using (public.is_active_member(household_id));

create policy "alert_reminders_insert"
on public.alert_reminders
for insert
to authenticated
with check (
  public.is_active_member(household_id)
  and created_by = auth.uid()
);

create policy "alert_reminders_update"
on public.alert_reminders
for update
to authenticated
using (public.is_active_member(household_id))
with check (public.is_active_member(household_id));

create policy "alert_reminders_delete"
on public.alert_reminders
for delete
to authenticated
using (public.is_active_member(household_id));
