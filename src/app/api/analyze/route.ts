import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { analyzeTranscript } from "@/lib/ai";
import { createSession } from "@/lib/db";
import { mapAiError } from "@/lib/http";
import { parseKeys } from "@/lib/failover";
import { clientIp, demoAllowed } from "@/lib/rate-limit";
import { getGraphStore, recordMeetingPromises } from "@/lib/promises";
import type { SessionDTO } from "@/lib/types";

export const maxDuration = 60;

function defaultTitle(): string {
  return `Session ${new Date().toLocaleString()}`;
}

export async function POST(req: Request) {
  // Guests are allowed: the demo runs on the server keys. A signed-in user owns
  // and persists their session; a guest gets the same result, just not saved.
  const { userId } = await auth();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) {
    return Response.json({ error: "transcript is required." }, { status: 400 });
  }

  // An explicit title from the caller wins; otherwise we use the model's title
  // (computed below, after analysis), falling back to a timestamp.
  const titleOverride =
    typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
  const durationSec =
    typeof body.durationSec === "number" ? Math.round(body.durationSec) : null;

  const keys = parseKeys(req.headers.get("x-google-key"));

  if (keys.length === 0) {
    const ok = await demoAllowed(clientIp(req));
    if (!ok) {
      return Response.json(
        { error: "Demo limit reached. Add your own free API key in Keys to keep going." },
        { status: 429 },
      );
    }
  }

  let analysis;
  try {
    analysis = await analyzeTranscript(transcript, { keys });
  } catch (err) {
    return mapAiError(err);
  }

  const title =
    titleOverride ??
    (typeof analysis.title === "string" && analysis.title.trim()
      ? analysis.title.trim()
      : defaultTitle());

  const actionItems = analysis.actionItems.map((a) => ({
    task: a.task,
    assignee: a.assignee,
    dueDate: a.dueDate,
    priority: a.priority,
  }));

  if (userId) {
    const session = await createSession(
      { title, transcript, summary: analysis.summary, durationSec, actionItems },
      userId,
    );
    // Record owned commitments into the promise graph (the USP). Best-effort: a
    // failure here must never break capture.
    try {
      await recordMeetingPromises(getGraphStore(), {
        meetingId: session.id,
        meetingTitle: session.title,
        createdAt: session.createdAt,
        userId,
        promises: session.actionItems
          .filter((a) => a.assignee && a.assignee !== "Unassigned")
          .map((a) => ({ actionId: a.id, text: a.task, owner: a.assignee, done: a.done })),
      });
    } catch {
      // promise tracking is additive; leave the session intact
    }
    return Response.json(session, { status: 201 });
  }

  // Guest: return the result without persisting (no account to own it). Shown
  // read-only on the client; signing in is what saves a session to history.
  const guest: SessionDTO = {
    id: `guest-${randomUUID()}`,
    title,
    createdAt: new Date().toISOString(),
    transcript,
    durationSec,
    summary: analysis.summary,
    actionItems: actionItems.map((a) => ({ ...a, id: randomUUID(), done: false })),
  };
  return Response.json(guest, { status: 201 });
}
