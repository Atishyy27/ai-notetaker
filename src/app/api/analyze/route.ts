import { analyzeTranscript } from "@/lib/ai";
import { createSession } from "@/lib/db";
import { mapAiError } from "@/lib/http";
import { parseKeys } from "@/lib/failover";

export const maxDuration = 60;

function defaultTitle(): string {
  return `Session ${new Date().toLocaleString()}`;
}

export async function POST(req: Request) {
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

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : defaultTitle();
  const durationSec =
    typeof body.durationSec === "number" ? Math.round(body.durationSec) : null;

  const keys = parseKeys(req.headers.get("x-google-key"));

  let analysis;
  try {
    analysis = await analyzeTranscript(transcript, { keys });
  } catch (err) {
    return mapAiError(err);
  }

  const session = await createSession({
    title,
    transcript,
    summary: analysis.summary,
    durationSec,
    actionItems: analysis.actionItems.map((a) => ({
      task: a.task,
      assignee: a.assignee,
      dueDate: a.dueDate,
      priority: a.priority,
    })),
  });

  return Response.json(session, { status: 201 });
}
