-- Permite o primeiro membro da casa: o proprio dono, logo apos criar a household.
-- Sem isso, o trigger on_household_created falha em RLS e o INSERT em households reverte.

drop policy if exists "members_insert_self_owner_bootstrap" on public.household_members;

create policy "members_insert_self_owner_bootstrap"
on public.household_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and status = 'active'
  and exists (
    select 1
    from public.households h
    where h.id = household_members.household_id
      and h.owner_id = auth.uid()
  )
);
