import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  SessionDTO,
  ActionItemDTO,
  SessionListItem,
  SummaryTopic,
} from "./types";

// Minimal persistence: one JSON file. Zero-setup and reliable for a single
// instance. The whole storage layer lives behind this module, so moving to
// Postgres later changes only this file, not the routes.
//
// Two correctness properties this file guarantees, because a plain
// read-modify-writeFile has neither:
//   1. No lost updates. Every operation runs inside a serialised critical
//      section (`withLock`), so two concurrent requests can never read the same
//      snapshot and clobber each other's change.
//   2. No torn/corrupt file. Writes go to a temp file and are atomically
//      renamed into place, so a crash mid-write leaves the previous good file
//      intact, never a half-written one. Lock-free readers see old-or-new, never
//      partial.

// Resolved per call so the data location can be overridden (tests, deploys)
// via env without reloading the module.
function dataFile(): string {
  return (
    process.env.AINOTE_DATA_FILE ??
    path.join(process.cwd(), "data", "sessions.json")
  );
}

type Store = { sessions: SessionDTO[] };

// Serverless filesystems (Vercel and friends) are read-only apart from /tmp and
// give no persistent disk. If a write ever hits a read-only FS we switch to an
// in-process store so the app keeps working for that instance's lifetime instead
// of returning a 500. This is per-instance and ephemeral: real cross-request
// persistence is the job of a database (the deploy path). Local dev and tests,
// which have a writable disk, keep using the JSON file untouched.
let memory: Store | null = null;

function isReadOnlyFsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  return code === "EROFS" || code === "EACCES" || code === "EPERM";
}

// Promise-chain mutex. Each op is appended to the chain and runs only after the
// previous one settles, regardless of whether it resolved or rejected.
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function read(): Promise<Store> {
  if (memory) return { sessions: memory.sessions.slice() };
  try {
    const raw = await fs.readFile(dataFile(), "utf8");
    const parsed = JSON.parse(raw) as Store;
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
  } catch {
    return { sessions: [] };
  }
}

async function write(store: Store): Promise<void> {
  if (memory) {
    memory = { sessions: store.sessions.slice() };
    return;
  }
  const file = dataFile();
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    if (isReadOnlyFsError(err)) {
      // First write on a read-only FS: adopt the in-process store from here on.
      memory = { sessions: store.sessions.slice() };
      return;
    }
    throw err;
  }
}

export type NewActionItem = {
  task: string;
  assignee: string;
  dueDate: string | null;
  priority: string;
};

export function createSession(input: {
  title: string;
  transcript: string;
  summary: SummaryTopic[];
  durationSec: number | null;
  actionItems: NewActionItem[];
}): Promise<SessionDTO> {
  return withLock(async () => {
    const store = await read();
    const session: SessionDTO = {
      id: randomUUID(),
      title: input.title,
      createdAt: new Date().toISOString(),
      transcript: input.transcript,
      durationSec: input.durationSec,
      summary: input.summary,
      actionItems: input.actionItems.map((a) => ({
        id: randomUUID(),
        task: a.task,
        assignee: a.assignee,
        dueDate: a.dueDate,
        priority: a.priority,
        done: false,
      })),
    };
    store.sessions.unshift(session);
    await write(store);
    return session;
  });
}

export function listSessions(): Promise<SessionListItem[]> {
  return withLock(async () => {
    const store = await read();
    return store.sessions
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        durationSec: s.durationSec,
        actionItemCount: s.actionItems.length,
      }));
  });
}

export function getSession(id: string): Promise<SessionDTO | null> {
  return withLock(async () => {
    const store = await read();
    return store.sessions.find((s) => s.id === id) ?? null;
  });
}

export function deleteSession(id: string): Promise<boolean> {
  return withLock(async () => {
    const store = await read();
    const before = store.sessions.length;
    store.sessions = store.sessions.filter((s) => s.id !== id);
    if (store.sessions.length === before) return false;
    await write(store);
    return true;
  });
}

export function addActionItem(
  sessionId: string,
  item: NewActionItem,
): Promise<ActionItemDTO | null> {
  return withLock(async () => {
    const store = await read();
    const session = store.sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    const created: ActionItemDTO = {
      id: randomUUID(),
      task: item.task,
      assignee: item.assignee,
      dueDate: item.dueDate,
      priority: item.priority,
      done: false,
    };
    session.actionItems.push(created);
    await write(store);
    return created;
  });
}

export function updateActionItem(
  id: string,
  patch: Partial<
    Pick<ActionItemDTO, "task" | "assignee" | "dueDate" | "priority" | "done">
  >,
): Promise<ActionItemDTO | null> {
  return withLock(async () => {
    const store = await read();
    for (const s of store.sessions) {
      const item = s.actionItems.find((a) => a.id === id);
      if (item) {
        if (patch.task !== undefined) item.task = patch.task;
        if (patch.assignee !== undefined) item.assignee = patch.assignee;
        if (patch.dueDate !== undefined) item.dueDate = patch.dueDate;
        if (patch.priority !== undefined) item.priority = patch.priority;
        if (patch.done !== undefined) item.done = patch.done;
        await write(store);
        return item;
      }
    }
    return null;
  });
}

export function deleteActionItem(id: string): Promise<boolean> {
  return withLock(async () => {
    const store = await read();
    for (const s of store.sessions) {
      const idx = s.actionItems.findIndex((a) => a.id === id);
      if (idx !== -1) {
        s.actionItems.splice(idx, 1);
        await write(store);
        return true;
      }
    }
    return false;
  });
}
