-- Contas recorrentes da casa (vencimento por dia do mês, marcação "paga" por período YYYY-MM)

create table if not exists public.household_bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  provider text,
  amount text,
  due_day smallint not null,
  notes text,
  last_paid_period text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_bills_due_day_chk check (due_day >= 1 and due_day <= 31),
  constraint household_bills_period_chk check (
    last_paid_period is null
    or last_paid_period ~ '^\d{4}-(0[1-9]|1[0-2])$'
  )
);

create index if not exists household_bills_household_due_idx
  on public.household_bills (household_id, due_day asc);

alter table public.household_bills enable row level security;

drop policy if exists "household_bills_select" on public.household_bills;
drop policy if exists "household_bills_insert" on public.household_bills;
drop policy if exists "household_bills_update" on public.household_bills;
drop policy if exists "household_bills_delete" on public.household_bills;

create policy "household_bills_select"
on public.household_bills
for select
to authenticated
using (public.is_active_member(household_id));

create policy "household_bills_insert"
on public.household_bills
for insert
to authenticated
with check (
  public.is_active_member(household_id)
  and created_by = auth.uid()
);

create policy "household_bills_update"
on public.household_bills
for update
to authenticated
using (public.is_active_member(household_id))
with check (public.is_active_member(household_id));

create policy "household_bills_delete"
on public.household_bills
for delete
to authenticated
using (public.is_active_member(household_id));
