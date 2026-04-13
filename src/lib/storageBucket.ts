/**
 * Nome do bucket no Supabase Storage (Storage > Create bucket).
 * Deve bater com as politicas SQL (storage.objects) que usam bucket_id.
 */
export const DOCUMENTS_STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "documents";
