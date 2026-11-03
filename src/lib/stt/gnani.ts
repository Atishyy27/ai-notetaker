import type { SttProvider } from "./types";

// Gnani Prisma over REST (https://docs.gnani.ai/api/STT/speech-to-text.md).
// One synchronous call per clip of up to 30 s. The format is detected from the
// file-name extension, so the upload must be named *.wav; the caller converts
// browser webm to 16 kHz mono WAV first (see src/lib/audio/wav.ts).
const ENDPOINT = "https://api.vachana.ai/stt/v3";
const DEFAULT_LANGUAGE = "en-IN";
const LOCALE = /^[a-z]{2}-[A-Z]{2}$/;

function languageFor(model: string | undefined, language: string | undefined): string {
  if (language && language.split(",").every((l) => LOCALE.test(l.trim()))) return language;
  return model === "prisma-v3.0" ? "hi-IN,en-IN" : DEFAULT_LANGUAGE;
}

function errorMessage(status: number, body: unknown): string {
  const b = body as {
    error?: { type?: string; message?: string } | string;
    detail?: { error_code?: string; message?: string } | unknown[];
    message?: string;
  } | null;
  const type =
    (typeof b?.error === "object" && b.error?.type) ||
    (b?.detail && !Array.isArray(b.detail) && (b.detail as { error_code?: string }).error_code) ||
    "";
  const msg =
    (typeof b?.error === "object" && b.error?.message) ||
    (b?.detail && !Array.isArray(b.detail) && (b.detail as { message?: string }).message) ||
    b?.message ||
    "";
  return `Gnani STT failed (${status}${type ? ` ${type}` : ""})${msg ? `: ${msg}` : ""}`;
}

export const gnaniProvider: SttProvider = {
  id: "gnani",
  label: "Gnani Prisma",
  maxDurationSec: 30,
  acceptedFormats: ["audio/wav", "audio/x-wav"],
  async transcribe(audio, cfg) {
    const apiKey = cfg.apiKey || process.env.GNANI_API_KEY;
    if (!apiKey) throw new Error("Gnani API key missing (401).");

    const form = new FormData();
    form.append("audio_file", new Blob([audio as BlobPart], { type: "audio/wav" }), "audio.wav");
    form.append("language_code", languageFor(cfg.model, cfg.language));
    if (cfg.model) form.append("model", cfg.model);

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "X-API-Key-ID": apiKey },
      body: form,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.success === false) {
      throw new Error(errorMessage(res.status, body));
    }
    return { text: String(body?.transcript ?? ""), durationSec: null };
  },
};
