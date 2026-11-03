export type SttResult = { text: string; durationSec: number | null };

export type SttConfig = {
  // BYOK keys for providers that use the shared key-failover plumbing (groq).
  keys?: string[];
  // Single key for a user-configured provider (custom).
  apiKey?: string;
  language?: string;
  // Custom provider endpoint + model.
  baseUrl?: string;
  model?: string;
};

// A speech-to-text backend. Providers DECLARE their limits so the caller can
// adapt audio (convert or cap it) to fit any provider, instead of each provider
// reaching back into the route or recorder.
//
// A CONSTRAINED provider — for example one that caps a request at ~30s and
// rejects webm, accepting only wav/mp3/ogg/flac/aac/m4a — would rely on the
// caller to convert/cap first (the suggested path is WAV 16kHz mono via
// AudioContext in the browser). Those limits are declared via the optional
// fields below; the conversion itself is implemented only when such a provider
// is actually added, so a new engine is one adapter file plus the caller
// honouring these fields, with no change to this interface.
export interface SttProvider {
  id: string;
  label: string;
  /** Max audio length accepted per request; undefined = no stated cap. */
  maxDurationSec?: number;
  /** Accepted container/mime types; undefined = permissive. */
  acceptedFormats?: string[];
  transcribe(audio: Uint8Array, cfg: SttConfig): Promise<SttResult>;
}
