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
    title text NOT NULL,
    created_at text NOT NULL,
    transcript text NOT NULL,
    duration_sec integer,
    summary jsonb NOT NULL DEFAULT '[]'::jsonb,
    audio_url text
  )`;

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

console.log("schema ready: sessions, action_items");
