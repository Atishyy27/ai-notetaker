import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { analysisSchema, type Analysis } from "./schema";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "./prompts";
import { withKeyFailover } from "./failover";
import { getSttProvider, type SttResult } from "./stt";

// The only module in the app that talks to a third-party AI provider.
// Everything else (routes, UI) goes through these two functions, which keeps
// the client / server / provider boundaries clean.
//
// Transcription is pluggable: a chosen STT provider (see ./stt) does the work,
// so a user can bring their own engine, not just their own key. Analysis stays
// on Gemini. Keys are bring-your-own with env fallback.

// Gemini 2.5 Flash: free tier, supports schema-enforced object generation.
const ANALYSIS_MODEL = "gemini-2.5-flash";

function googleFor(apiKey?: string) {
  return apiKey ? createGoogleGenerativeAI({ apiKey }) : google;
}

export type TranscriptionResult = SttResult;

export async function transcribeAudio(
  audio: Uint8Array,
  opts?: {
    provider?: string | null;
    language?: string;
    keys?: string[];
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  },
): Promise<TranscriptionResult> {
  const provider = getSttProvider(opts?.provider);
  return provider.transcribe(audio, {
    keys: opts?.keys,
    apiKey: opts?.apiKey,
    language: opts?.language,
    baseUrl: opts?.baseUrl,
    model: opts?.model,
  });
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
