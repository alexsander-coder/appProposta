-- is_active_member() sem esta correcao causa recursao infinita em RLS:
-- SELECT em household_members -> politica chama is_active_member() ->
-- is_active_member SELECT em household_members -> mesma politica -> stack depth exceeded.
--
-- Leitura interna da funcao ignora RLS; auth.uid() continua sendo o usuario da sessao.

-- VOLATILE obrigatorio: SET LOCAL nao e permitido em funcoes STABLE/IMMUTABLE.
create or replace function public.is_active_member(target_household_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  result boolean;
begin
  set local row_security = off;
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  )
  into result;
  return coalesce(result, false);
end;
$$;

revoke all on function public.is_active_member(uuid) from public;
grant execute on function public.is_active_member(uuid) to authenticated;
grant execute on function public.is_active_member(uuid) to service_role;
