// Client-side key store. Keys a user brings live only in their own browser
// (localStorage) and are sent per-request; they are never persisted on the
// server. Every access is guarded so private mode / blocked storage can't crash.

export type Provider = "groq" | "google";

const LS_KEY: Record<Provider, string> = {
  groq: "baithak.keys.groq",
  google: "baithak.keys.google",
};

export function getKeys(provider: Provider): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY[provider]);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is string => typeof k === "string" && k.trim() !== "");
  } catch {
    return [];
  }
}

export function setKeys(provider: Provider, keys: string[]): void {
  try {
    const clean = keys.map((k) => k.trim()).filter(Boolean);
    localStorage.setItem(LS_KEY[provider], JSON.stringify(clean));
  } catch {
    // storage unavailable; keys simply aren't remembered this session
  }
}

// The header value for a provider: comma-joined keys, or "" when none are set
// (the server then falls back to its env key).
export function keyHeader(provider: Provider): string {
  return getKeys(provider).join(",");
}
