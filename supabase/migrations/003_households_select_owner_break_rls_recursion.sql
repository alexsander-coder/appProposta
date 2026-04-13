-- Evita recursao infinita entre RLS de households e household_members.
-- Cenario: INSERT em household_members (trigger) avalia politica que faz EXISTS em households;
-- SELECT em households usava apenas is_active_member() -> le household_members -> loop.
--
-- Dono da linha em households pode ler a propria casa mesmo antes de existir membership.

drop policy if exists "households_select_owner" on public.households;

create policy "households_select_owner"
on public.households
for select
to authenticated
using (owner_id = auth.uid());
