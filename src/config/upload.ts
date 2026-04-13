const MB = 1024 * 1024;

const parsedMb = Number(process.env.EXPO_PUBLIC_MAX_UPLOAD_MB);

/** Limite por arquivo (padrão 20 MB). Ajuste via EXPO_PUBLIC_MAX_UPLOAD_MB no .env. */
export const MAX_UPLOAD_BYTES =
  Number.isFinite(parsedMb) && parsedMb > 0 ? Math.floor(parsedMb * MB) : 20 * MB;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < MB) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / MB).toFixed(1)} MB`;
}
