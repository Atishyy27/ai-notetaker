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
// picks between them. Postgres gives us real cross-request + cross-instance
// persistence — the thing the in-memory fallback could never do on serverless.
//
// The client is created lazily, never at import time: Next.js runs top-level
// module code during `next build`, where DATABASE_URL may be absent, and neon()
// throws without it. A plain lazy `let` (not a Proxy) keeps that safe without
// confusing libraries that introspect the client.
let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

// The driver's query result is a union of shapes depending on options; for our
// default (rows) calls it is a list of records. One typed helper keeps every
// call site honest without scattering casts.
type Row = Record<string, unknown>;
async function rows(q: Promise<unknown>): Promise<Row[]> {
  return (await q) as Row[];
}

// Postgres jsonb round-trips as a parsed JS value, so summary needs no JSON.parse
// on the way out. On the way in we stringify and cast, which is the portable way
// to bind a jsonb parameter.
function toSummary(value: unknown): SummaryTopic[] {
  return Array.isArray(value) ? (value as SummaryTopic[]) : [];
}

export function createSession(input: {
  title: string;
  transcript: string;
  summary: SummaryTopic[];
  durationSec: number | null;
  actionItems: NewActionItem[];
}): Promise<SessionDTO> {
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

  // One transaction so a session never lands without its action items.
  const queries = [
    db`INSERT INTO sessions (id, title, created_at, transcript, duration_sec, summary)
       VALUES (${id}, ${input.title}, ${createdAt}, ${input.transcript},
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

export async function listSessions(): Promise<SessionListItem[]> {
  const db = sql();
  const list = await rows(db`
    SELECT s.id, s.title, s.created_at, s.duration_sec,
           COUNT(a.id)::int AS action_item_count
    FROM sessions s
    LEFT JOIN action_items a ON a.session_id = s.id
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

export async function getSession(id: string): Promise<SessionDTO | null> {
  const db = sql();
  const [s] = await rows(db`SELECT * FROM sessions WHERE id = ${id}`);
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

export async function deleteSession(id: string): Promise<boolean> {
  const db = sql();
  const deleted = await rows(db`DELETE FROM sessions WHERE id = ${id} RETURNING id`);
  return deleted.length > 0;
}

export async function addActionItem(
  sessionId: string,
  item: NewActionItem,
): Promise<ActionItemDTO | null> {
  const db = sql();
  const [s] = await rows(db`SELECT id FROM sessions WHERE id = ${sessionId}`);
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
): Promise<ActionItemDTO | null> {
  const db = sql();
  const [a] = await rows(db`SELECT * FROM action_items WHERE id = ${id}`);
  if (!a) return null;
  // Read-modify-write the whole row so we bind a fixed set of params; `undefined`
  // in the patch means "leave as is", and an explicit null (dueDate) is honoured.
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

export async function deleteActionItem(id: string): Promise<boolean> {
  const db = sql();
  const deleted = await rows(db`DELETE FROM action_items WHERE id = ${id} RETURNING id`);
  return deleted.length > 0;
}
