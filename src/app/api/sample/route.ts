import { randomUUID } from "crypto";
import type { SessionDTO } from "@/lib/types";
import {
  SAMPLE_TITLE,
  SAMPLE_TRANSCRIPT,
  SAMPLE_SUMMARY,
  SAMPLE_ACTION_ITEMS,
  SAMPLE_DURATION_SEC,
} from "@/lib/sample";

// The sample is a public, no-login, read-only preview so anyone can see the
// dashboard without an account. It is built in memory and never persisted, so it
// has no owner and never appears in anyone's history. Editing is disabled on the
// client (preview mode) since there is no row to write to.
export async function POST() {
  const session: SessionDTO = {
    id: `sample-${randomUUID()}`,
    title: SAMPLE_TITLE,
    createdAt: new Date().toISOString(),
    transcript: SAMPLE_TRANSCRIPT,
    durationSec: SAMPLE_DURATION_SEC,
    summary: SAMPLE_SUMMARY,
    actionItems: SAMPLE_ACTION_ITEMS.map((a) => ({
      id: randomUUID(),
      task: a.task,
      assignee: a.assignee,
      dueDate: a.dueDate,
      priority: a.priority,
      done: false,
    })),
  };
  return Response.json(session, { status: 201 });
}
