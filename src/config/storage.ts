/**
 * Nome do bucket no Supabase Storage (Storage > Create bucket).
 * Deve coincidir com as políticas SQL em `storage.objects`.
 */
export const DOCUMENTS_STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "documents";
