// Bring-your-own-key plumbing shared by the AI layer.
//
// A user can supply several API keys for a provider. We try them in order and
// fall back to the next on any failure, so one rate-limited or dead key doesn't
// sink the request. An empty list means "use the server's env key" (one call).

export function parseKeys(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export async function withKeyFailover<T>(
  keys: string[],
  run: (key?: string) => Promise<T>,
): Promise<T> {
  if (keys.length === 0) return run();
  let lastErr: unknown;
  for (const key of keys) {
    try {
      return await run(key);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}
