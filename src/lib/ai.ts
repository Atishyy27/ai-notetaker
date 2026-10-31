import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { transcribe, generateObject } from "ai";
import { analysisSchema, type Analysis } from "./schema";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "./prompts";

// The only module in the app that talks to a third-party AI provider.
// Everything else (routes, UI) goes through these two functions, which keeps
// the client / server / provider boundaries clean.

// Groq hosts Whisper; turbo is the fast variant and is on the free tier.
const TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
// Gemini 2.5 Flash: free tier, supports schema-enforced object generation.
const ANALYSIS_MODEL = "gemini-2.5-flash";

export type TranscriptionResult = {
  text: string;
  durationSec: number | null;
};

export async function transcribeAudio(
  audio: Uint8Array,
  opts?: { language?: string },
): Promise<TranscriptionResult> {
  const result = await transcribe({
    model: groq.transcription(TRANSCRIPTION_MODEL),
    audio,
    providerOptions: opts?.language
      ? { groq: { language: opts.language } }
      : undefined,
  });

  return {
    text: result.text,
    durationSec: result.durationInSeconds ?? null,
  };
}

/**
 * Transcript -> structured analysis. `generateObject` + the Zod schema means
 * the model is constrained to our shape; there is no free-text parsing. One
 * retry covers the rare case where the provider still rejects the schema
 * (e.g. a transient complexity error), which is the "malformed LLM output"
 * failure mode the brief grades on.
 */
export async function analyzeTranscript(transcript: string): Promise<Analysis> {
  async function run(): Promise<Analysis> {
    const { object } = await generateObject({
      model: google(ANALYSIS_MODEL),
      schema: analysisSchema,
      schemaName: "MeetingAnalysis",
      schemaDescription:
        "Executive summary grouped by topic, plus action items, extracted from a meeting transcript.",
      system: ANALYSIS_SYSTEM_PROMPT,
      prompt: buildAnalysisPrompt(transcript),
      temperature: 0.2,
    });
    return object;
  }

  try {
    return await run();
  } catch {
    // one retry before surfacing the error to the route
    return await run();
  }
}
