import { groq, createGroq } from "@ai-sdk/groq";
import { transcribe } from "ai";
import { withKeyFailover } from "../failover";
import type { SttProvider } from "./types";

// Groq-hosted Whisper (turbo, free tier) — the default provider. Uses the shared
// key-failover plumbing: caller's keys in order, else the server env key.
const MODEL = "whisper-large-v3-turbo";

function groqFor(apiKey?: string) {
  return apiKey ? createGroq({ apiKey }) : groq;
}

export const groqProvider: SttProvider = {
  id: "groq",
  label: "Groq Whisper (default)",
  acceptedFormats: [
    "audio/webm",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
  ],
  async transcribe(audio, cfg) {
    const result = await withKeyFailover(cfg.keys ?? [], (key) =>
      transcribe({
        model: groqFor(key).transcription(MODEL),
        audio,
        providerOptions: cfg.language
          ? { groq: { language: cfg.language } }
          : undefined,
      }),
    );
    return { text: result.text, durationSec: result.durationInSeconds ?? null };
  },
};
