import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import type {
  SessionDTO,
  ActionItemDTO,
  SessionListItem,
  SummaryTopic,
} from "./types";
import type { NewActionItem } from "./db-file";

// Neon (serverless Postgres) backend. Same public surface as db-file.ts; db.ts
// picks between them. Postgres gives real cross-request + cross-instance
// persistence.
//
// OWNERSHIP: every row belongs to a user_id (the Clerk user). Every read and
// write is filtered by it, so one account can never see or touch another's
// sessions. This filtering is the whole security boundary — it must never be
// dropped from a query.
//
// The client is created lazily, never at import time: Next.js runs top-level
// module code during `next build`, where DATABASE_URL may be absent, and neon()
// throws without it.
let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

type Row = Record<string, unknown>;
async function rows(q: Promise<unknown>): Promise<Row[]> {
  return (await q) as Row[];
}

function toSummary(value: unknown): SummaryTopic[] {
  return Array.isArray(value) ? (value as SummaryTopic[]) : [];
}

export function createSession(
  input: {
    title: string;
    transcript: string;
    summary: SummaryTopic[];
    durationSec: number | null;
    actionItems: NewActionItem[];
  },
  userId: string,
): Promise<SessionDTO> {
  const db = sql();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const items: ActionItemDTO[] = input.actionItems.map((a) => ({
    id: randomUUID(),
    task: a.task,
    assignee: a.assignee,
    dueDate: a.dueDate,
    priority: a.priority,
    done: false,
  }));

  const queries = [
    db`INSERT INTO sessions (id, user_id, title, created_at, transcript, duration_sec, summary)
       VALUES (${id}, ${userId}, ${input.title}, ${createdAt}, ${input.transcript},
               ${input.durationSec}, ${JSON.stringify(input.summary)}::jsonb)`,
    ...items.map(
      (it) =>
        db`INSERT INTO action_items (id, session_id, task, assignee, due_date, priority, done)
           VALUES (${it.id}, ${id}, ${it.task}, ${it.assignee}, ${it.dueDate}, ${it.priority}, false)`,
    ),
  ];
  return db.transaction(queries).then(() => ({
    id,
    title: input.title,
    createdAt,
    transcript: input.transcript,
    durationSec: input.durationSec,
    summary: input.summary,
    actionItems: items,
  }));
}

export async function listSessions(userId: string): Promise<SessionListItem[]> {
  const db = sql();
  const list = await rows(db`
    SELECT s.id, s.title, s.created_at, s.duration_sec,
           COUNT(a.id)::int AS action_item_count
    FROM sessions s
    LEFT JOIN action_items a ON a.session_id = s.id
    WHERE s.user_id = ${userId}
    GROUP BY s.id
    ORDER BY s.created_at DESC`);
  return list.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    createdAt: r.created_at as string,
    durationSec: r.duration_sec as number | null,
    actionItemCount: r.action_item_count as number,
  }));
}

export async function getSession(
  id: string,
  userId: string,
): Promise<SessionDTO | null> {
  const db = sql();
  const [s] = await rows(
    db`SELECT * FROM sessions WHERE id = ${id} AND user_id = ${userId}`,
  );
  if (!s) return null;
  const items = await rows(
    db`SELECT * FROM action_items WHERE session_id = ${id} ORDER BY seq`,
  );
  return {
    id: s.id as string,
    title: s.title as string,
    createdAt: s.created_at as string,
    transcript: s.transcript as string,
    durationSec: s.duration_sec as number | null,
    summary: toSummary(s.summary),
    actionItems: items.map((a) => ({
      id: a.id as string,
      task: a.task as string,
      assignee: a.assignee as string,
      dueDate: a.due_date as string | null,
      priority: a.priority as string,
      done: a.done as boolean,
    })),
  };
}

export async function deleteSession(
  id: string,
  userId: string,
): Promise<boolean> {
  const db = sql();
  const deleted = await rows(
    db`DELETE FROM sessions WHERE id = ${id} AND user_id = ${userId} RETURNING id`,
  );
  return deleted.length > 0;
}

export async function addActionItem(
  sessionId: string,
  item: NewActionItem,
  userId: string,
): Promise<ActionItemDTO | null> {
  const db = sql();
  // Only add to a session the caller owns.
  const [s] = await rows(
    db`SELECT id FROM sessions WHERE id = ${sessionId} AND user_id = ${userId}`,
  );
  if (!s) return null;
  const created: ActionItemDTO = {
    id: randomUUID(),
    task: item.task,
    assignee: item.assignee,
    dueDate: item.dueDate,
    priority: item.priority,
    done: false,
  };
  await db`
    INSERT INTO action_items (id, session_id, task, assignee, due_date, priority, done)
    VALUES (${created.id}, ${sessionId}, ${created.task}, ${created.assignee},
            ${created.dueDate}, ${created.priority}, false)`;
  return created;
}

export async function updateActionItem(
  id: string,
  patch: Partial<
    Pick<ActionItemDTO, "task" | "assignee" | "dueDate" | "priority" | "done">
  >,
  userId: string,
): Promise<ActionItemDTO | null> {
  const db = sql();
  // Join to sessions so we only touch an item under a session the caller owns.
  const [a] = await rows(db`
    SELECT ai.* FROM action_items ai
    JOIN sessions s ON s.id = ai.session_id
    WHERE ai.id = ${id} AND s.user_id = ${userId}`);
  if (!a) return null;
  const next: ActionItemDTO = {
    id,
    task: patch.task ?? (a.task as string),
    assignee: patch.assignee ?? (a.assignee as string),
    dueDate:
      patch.dueDate !== undefined ? patch.dueDate : (a.due_date as string | null),
    priority: patch.priority ?? (a.priority as string),
    done: patch.done !== undefined ? patch.done : (a.done as boolean),
  };
  await db`
    UPDATE action_items
    SET task = ${next.task}, assignee = ${next.assignee}, due_date = ${next.dueDate},
        priority = ${next.priority}, done = ${next.done}
    WHERE id = ${id}`;
  return next;
}

export async function deleteActionItem(
  id: string,
  userId: string,
): Promise<boolean> {
  const db = sql();
  const deleted = await rows(db`
    DELETE FROM action_items
    WHERE id = ${id}
      AND session_id IN (SELECT id FROM sessions WHERE user_id = ${userId})
    RETURNING id`);
  return deleted.length > 0;
}
