-- Antecedencia configuravel do lembrete do alerta

alter table public.household_alerts
  add column if not exists remind_offset_minutes integer not null default 5;

alter table public.household_alerts
  drop constraint if exists household_alerts_remind_offset_chk;

alter table public.household_alerts
  add constraint household_alerts_remind_offset_chk
  check (remind_offset_minutes in (0, 5, 15, 30, 60, 1440));

alter table public.alert_reminders
  add column if not exists remind_offset_minutes integer not null default 5;

alter table public.alert_reminders
  drop constraint if exists alert_reminders_remind_offset_chk;

alter table public.alert_reminders
  add constraint alert_reminders_remind_offset_chk
  check (remind_offset_minutes in (0, 5, 15, 30, 60, 1440));
