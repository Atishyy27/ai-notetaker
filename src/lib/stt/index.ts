import type { SttProvider } from "./types";
import { groqProvider } from "./groq";
import { customProvider } from "./openai-compatible";

// Registry of STT backends. A new engine (e.g. a future gnani.ts) is added by
// implementing SttProvider and listing it here — no change to ai.ts, the route,
// or the UI's wiring.
export const STT_PROVIDERS: SttProvider[] = [groqProvider, customProvider];

export function getSttProvider(id?: string | null): SttProvider {
  return STT_PROVIDERS.find((p) => p.id === id) ?? groqProvider;
}

export type { SttProvider, SttConfig, SttResult } from "./types";
