/**
 * Erros no terminal onde o Metro roda (`npx expo start`) e no Remote JS
 * (menu do Expo / Chrome DevTools no dispositivo ou emulador).
 */
export function logAppError(
  tag: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  const message =
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message
      : err instanceof Error
        ? err.message
        : String(err);

  if (extra && Object.keys(extra).length > 0) {
    console.error(`[LarEmDia:${tag}]`, message, extra);
  } else {
    console.error(`[LarEmDia:${tag}]`, message);
  }
}
