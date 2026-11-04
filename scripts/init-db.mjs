// Idempotent schema setup for the Neon/Postgres backend.
// Run: node --env-file=.env.local scripts/init-db.mjs
// Safe to run repeatedly (CREATE TABLE IF NOT EXISTS).
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/init-db.mjs");
  process.exit(1);
}
const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY,
    user_id text,
    title text NOT NULL,
    created_at text NOT NULL,
    transcript text NOT NULL,
    duration_sec integer,
    summary jsonb NOT NULL DEFAULT '[]'::jsonb,
    audio_url text
  )`;

// Migrate an existing table (added when accounts landed). Idempotent.
await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id text`;
await sql`CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`;

await sql`
  CREATE TABLE IF NOT EXISTS action_items (
    seq bigint GENERATED ALWAYS AS IDENTITY,
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    task text NOT NULL,
    assignee text NOT NULL,
    due_date text,
    priority text NOT NULL,
    done boolean NOT NULL DEFAULT false
  )`;

await sql`
  CREATE INDEX IF NOT EXISTS action_items_session_seq_idx
  ON action_items (session_id, seq)`;

// Per-IP demo rate limiting (fixed window). Only the server-key path writes here.
await sql`
  CREATE TABLE IF NOT EXISTS request_counts (
    ip text NOT NULL,
    window_start bigint NOT NULL,
    count integer NOT NULL DEFAULT 1,
    PRIMARY KEY (ip, window_start)
  )`;

// The promise graph (MOCK, flat-table stand-in for AuraDB). follows_up is the
// cross-meeting edge; source_action_id ties a promise to the action item it came
// from so toggling that item done later closes the promise.
await sql`
  CREATE TABLE IF NOT EXISTS promises (
    id uuid PRIMARY KEY,
    user_id text NOT NULL,
    meeting_id uuid NOT NULL,
    meeting_title text NOT NULL,
    owner text NOT NULL,
    text text NOT NULL,
    done boolean NOT NULL DEFAULT false,
    created_at text NOT NULL,
    follows_up uuid,
    source_action_id uuid NOT NULL
  )`;
await sql`CREATE INDEX IF NOT EXISTS promises_user_idx ON promises (user_id)`;
await sql`CREATE INDEX IF NOT EXISTS promises_action_idx ON promises (source_action_id)`;

console.log("schema ready: sessions, action_items, request_counts, promises");
