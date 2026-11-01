import { createSession } from "@/lib/db";
import {
  SAMPLE_TITLE,
  SAMPLE_TRANSCRIPT,
  SAMPLE_SUMMARY,
  SAMPLE_ACTION_ITEMS,
  SAMPLE_DURATION_SEC,
} from "@/lib/sample";

// Seeds one clearly-labelled sample session so the app is explorable without
// API keys. It only writes fixture data to the store; it does not call the AI.
export async function POST() {
  const session = await createSession({
    title: SAMPLE_TITLE,
    transcript: SAMPLE_TRANSCRIPT,
    summary: SAMPLE_SUMMARY,
    durationSec: SAMPLE_DURATION_SEC,
    actionItems: SAMPLE_ACTION_ITEMS,
  });
  return Response.json(session, { status: 201 });
}
