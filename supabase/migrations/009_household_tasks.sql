-- Tarefas partilhadas da household (pendentes / concluídas, prazo opcional, atribuição opcional)

create table if not exists public.household_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz,
  assigned_to uuid,
  completed_at timestamptz,
  completed_by uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists household_tasks_household_open_idx
  on public.household_tasks (household_id, completed_at nulls first, due_at nulls last);

alter table public.household_tasks enable row level security;

drop policy if exists "household_tasks_select" on public.household_tasks;
drop policy if exists "household_tasks_insert" on public.household_tasks;
drop policy if exists "household_tasks_update" on public.household_tasks;
drop policy if exists "household_tasks_delete" on public.household_tasks;

create policy "household_tasks_select"
on public.household_tasks
for select
to authenticated
using (public.is_active_member(household_id));

create policy "household_tasks_insert"
on public.household_tasks
for insert
to authenticated
with check (
  public.is_active_member(household_id)
  and created_by = auth.uid()
);

create policy "household_tasks_update"
on public.household_tasks
for update
to authenticated
using (public.is_active_member(household_id))
with check (public.is_active_member(household_id));

create policy "household_tasks_delete"
on public.household_tasks
for delete
to authenticated
using (public.is_active_member(household_id));
