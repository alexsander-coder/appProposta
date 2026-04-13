-- Itens da lista de compras partilhada da household

create table if not exists public.household_shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  qty text,
  note text,
  purchased boolean not null default false,
  purchased_at timestamptz,
  purchased_by uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists household_shopping_items_household_idx
  on public.household_shopping_items (household_id, purchased asc, created_at asc);

alter table public.household_shopping_items enable row level security;

drop policy if exists "household_shopping_items_select" on public.household_shopping_items;
drop policy if exists "household_shopping_items_insert" on public.household_shopping_items;
drop policy if exists "household_shopping_items_update" on public.household_shopping_items;
drop policy if exists "household_shopping_items_delete" on public.household_shopping_items;

create policy "household_shopping_items_select"
on public.household_shopping_items
for select
to authenticated
using (public.is_active_member(household_id));

create policy "household_shopping_items_insert"
on public.household_shopping_items
for insert
to authenticated
with check (
  public.is_active_member(household_id)
  and created_by = auth.uid()
);

create policy "household_shopping_items_update"
on public.household_shopping_items
for update
to authenticated
using (public.is_active_member(household_id))
with check (public.is_active_member(household_id));

create policy "household_shopping_items_delete"
on public.household_shopping_items
for delete
to authenticated
using (public.is_active_member(household_id));
