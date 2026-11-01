import { groq, createGroq } from "@ai-sdk/groq";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { transcribe, generateObject } from "ai";
import { analysisSchema, type Analysis } from "./schema";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "./prompts";
import { withKeyFailover } from "./failover";

// The only module in the app that talks to a third-party AI provider.
// Everything else (routes, UI) goes through these two functions, which keeps
// the client / server / provider boundaries clean.
//
// Keys are bring-your-own: the caller can pass a user's keys and we fail over
// across them. With no keys we fall back to the server's env key.

// Groq hosts Whisper; turbo is the fast variant and is on the free tier.
const TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
// Gemini 2.5 Flash: free tier, supports schema-enforced object generation.
const ANALYSIS_MODEL = "gemini-2.5-flash";

// A per-key provider instance, or the env-backed default when no key is given.
function groqFor(apiKey?: string) {
  return apiKey ? createGroq({ apiKey }) : groq;
}
function googleFor(apiKey?: string) {
  return apiKey ? createGoogleGenerativeAI({ apiKey }) : google;
}

export type TranscriptionResult = {
  text: string;
  durationSec: number | null;
};

export async function transcribeAudio(
  audio: Uint8Array,
  opts?: { language?: string; keys?: string[] },
): Promise<TranscriptionResult> {
  const result = await withKeyFailover(opts?.keys ?? [], (key) =>
    transcribe({
      model: groqFor(key).transcription(TRANSCRIPTION_MODEL),
      audio,
      providerOptions: opts?.language
        ? { groq: { language: opts.language } }
        : undefined,
    }),
  );

  return {
    text: result.text,
    durationSec: result.durationInSeconds ?? null,
  };
}

/**
 * Transcript -> structured analysis. `generateObject` + the Zod schema means
 * the model is constrained to our shape; there is no free-text parsing.
 *
 * With user keys we fail over across them. With no keys (env path) we keep one
 * retry, which covers the rare transient schema rejection the brief grades on.
 */
export async function analyzeTranscript(
  transcript: string,
  opts?: { keys?: string[] },
): Promise<Analysis> {
  const run = async (key?: string): Promise<Analysis> => {
    const { object } = await generateObject({
      model: googleFor(key)(ANALYSIS_MODEL),
      schema: analysisSchema,
      schemaName: "MeetingAnalysis",
      schemaDescription:
        "Executive summary grouped by topic, plus action items, extracted from a meeting transcript.",
      system: ANALYSIS_SYSTEM_PROMPT,
      prompt: buildAnalysisPrompt(transcript),
      temperature: 0.2,
    });
    return object;
  };

  const keys = opts?.keys ?? [];
  if (keys.length > 0) return withKeyFailover(keys, run);

  try {
    return await run();
  } catch {
    // one retry on the env path before surfacing the error to the route
    return await run();
  }
}
