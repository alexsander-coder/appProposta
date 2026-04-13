-- Permite quem criou o documento remover a linha (ex.: rollback se upload falhar).
drop policy if exists "documents_delete_creator" on public.documents;

create policy "documents_delete_creator"
on public.documents
for delete
to authenticated
using (
  created_by = auth.uid()
  and public.is_active_member(household_id)
);
