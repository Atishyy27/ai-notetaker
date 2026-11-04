import { neon } from "@neondatabase/serverless";
import type { GraphStore, PromiseRecord } from "./types";

// MOCK (in-memory): holds promise records in process. Used in tests and as the
// fallback when no database is set. Not shared across instances.
export class InMemoryGraphStore implements GraphStore {
  private records: PromiseRecord[] = [];
  async insert(r: PromiseRecord): Promise<void> {
    this.records.push(r);
  }
  async allForUser(userId: string): Promise<PromiseRecord[]> {
    return this.records.filter((r) => r.userId === userId);
  }
  async setDone(actionId: string, done: boolean): Promise<void> {
    for (const r of this.records) if (r.sourceActionId === actionId) r.done = done;
  }
}

// MOCK (Postgres): the promise graph stored as a flat table, with the follow-up
// edge as a `follows_up` column rather than a real graph relationship. The service
// never sees the difference, so a real Neo4j store (behind NEO4J_URI) is a new
// class here and nothing else changes.
let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

export class NeonGraphStore implements GraphStore {
  async insert(r: PromiseRecord): Promise<void> {
    await sql()`
      INSERT INTO promises
        (id, user_id, meeting_id, meeting_title, owner, text, done, created_at,
         follows_up, source_action_id)
      VALUES
        (${r.id}, ${r.userId}, ${r.meetingId}, ${r.meetingTitle}, ${r.owner},
         ${r.text}, ${r.done}, ${r.createdAt}, ${r.followsUp}, ${r.sourceActionId})`;
  }
  async allForUser(userId: string): Promise<PromiseRecord[]> {
    const rows = (await sql()`
      SELECT * FROM promises WHERE user_id = ${userId} ORDER BY created_at
    `) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      meetingId: row.meeting_id as string,
      meetingTitle: row.meeting_title as string,
      owner: row.owner as string,
      text: row.text as string,
      done: row.done as boolean,
      createdAt: row.created_at as string,
      followsUp: (row.follows_up as string | null) ?? null,
      sourceActionId: row.source_action_id as string,
    }));
  }
  async setDone(actionId: string, done: boolean): Promise<void> {
    await sql()`UPDATE promises SET done = ${done} WHERE source_action_id = ${actionId}`;
  }
}
