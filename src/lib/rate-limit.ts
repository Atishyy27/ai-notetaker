import { neon } from "@neondatabase/serverless";

// Fixed-window per-IP request counter in Postgres. It has to be in a shared store,
// not in process memory: serverless runs many instances, so an in-process counter
// would reset on every cold start and limit nothing. Only the server-key demo path
// is limited — a user on their own BYOK key is never counted.

let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns true if this IP is still under `limit` requests in the current
 * `windowSec` bucket (and records this one). Fails open: if there is no DB or the
 * query errors, it never blocks — a limiter must not take the app down.
 */
export async function underLimit(
  ip: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return true;
  const windowStart = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  try {
    const rows = (await sql()`
      INSERT INTO request_counts (ip, window_start, count)
      VALUES (${ip}, ${windowStart}, 1)
      ON CONFLICT (ip, window_start)
      DO UPDATE SET count = request_counts.count + 1
      RETURNING count
    `) as { count: number }[];
    return (rows[0]?.count ?? 1) <= limit;
  } catch {
    return true;
  }
}
