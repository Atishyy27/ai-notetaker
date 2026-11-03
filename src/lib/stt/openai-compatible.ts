import type { SttProvider } from "./types";

// Any OpenAI-compatible speech-to-text endpoint: OpenAI itself, a self-hosted
// Whisper, vLLM, LM Studio, and most engines expose POST {baseUrl}/audio/
// transcriptions (multipart: file + model, Bearer key, returns { text }). The
// user supplies base URL + model + key, so they can bring their own STT.
export const customProvider: SttProvider = {
  id: "custom",
  label: "Custom (OpenAI-compatible)",
  async transcribe(audio, cfg) {
    const baseUrl = cfg.baseUrl?.replace(/\/+$/, "");
    if (!baseUrl) throw new Error("Custom STT: a base URL is required.");
    if (!cfg.model) throw new Error("Custom STT: a model is required.");
    if (!cfg.apiKey) throw new Error("Custom STT: an API key is required.");

    const form = new FormData();
    const view = new Uint8Array(audio); // normalise to a plain view for Blob
    form.append("file", new Blob([view], { type: "audio/webm" }), "audio.webm");
    form.append("model", cfg.model);
    if (cfg.language) form.append("language", cfg.language);

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      let msg = `Custom STT request failed (${res.status}).`;
      try {
        const j = (await res.json()) as { error?: { message?: string } | string };
        if (j?.error && typeof j.error === "object" && j.error.message) {
          msg = j.error.message;
        } else if (typeof j?.error === "string") {
          msg = j.error;
        }
      } catch {
        // keep the status-based message
      }
      throw new Error(msg);
    }

    const data = (await res.json()) as { text?: string; duration?: number };
    return {
      text: data.text ?? "",
      durationSec: typeof data.duration === "number" ? data.duration : null,
    };
  },
};
