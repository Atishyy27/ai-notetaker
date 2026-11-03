// Client-side STT provider choice. Like the API keys, a custom provider's URL,
// model and key live only in the user's browser (localStorage) and are sent
// per-request as headers; they are never stored on the server.

export type SttProviderId = "groq" | "custom";

export type SttClientConfig = {
  provider: SttProviderId;
  baseUrl: string;
  model: string;
  key: string;
};

const LS_KEY = "baithak.stt.config";

const DEFAULT: SttClientConfig = {
  provider: "groq",
  baseUrl: "",
  model: "",
  key: "",
};

export function getSttConfig(): SttClientConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<SttClientConfig>) : null;
    if (p && (p.provider === "custom" || p.provider === "groq")) {
      return {
        provider: p.provider,
        baseUrl: typeof p.baseUrl === "string" ? p.baseUrl : "",
        model: typeof p.model === "string" ? p.model : "",
        key: typeof p.key === "string" ? p.key : "",
      };
    }
  } catch {
    // storage unavailable; fall back to the default (groq)
  }
  return { ...DEFAULT };
}

export function setSttConfig(cfg: SttClientConfig): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch {
    // storage unavailable; choice simply isn't remembered this session
  }
}
