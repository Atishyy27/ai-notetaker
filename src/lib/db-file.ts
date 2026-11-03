import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  SessionDTO,
  ActionItemDTO,
  SessionListItem,
  SummaryTopic,
} from "./types";

// JSON-file store for local dev + tests (Neon is the deploy path). Same
// ownership rule as db-neon.ts: every session carries a userId and every read
// and write is filtered by it, so the two backends behave identically.
//
// Atomicity/concurrency properties (unchanged): a serialised lock prevents lost
// updates, and temp-file+rename prevents torn files.

function dataFile(): string {
  return (
    process.env.AINOTE_DATA_FILE ??
    path.join(process.cwd(), "data", "sessions.json")
  );
}

// Stored sessions carry the owner; the DTO handed back to callers does not.
type Stored = SessionDTO & { userId: string };
type Store = { sessions: Stored[] };

let memory: Store | null = null;

function isReadOnlyFsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  return code === "EROFS" || code === "EACCES" || code === "EPERM";
}

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
      memory = { sessions: store.sessions.slice() };
      return;
    }
    throw err;
  }
}

// Drop the internal userId before handing a session to a caller.
function toDTO(s: Stored): SessionDTO {
  const { userId: _userId, ...dto } = s;
  void _userId;
  return dto;
}

export type NewActionItem = {
  task: string;
  assignee: string;
  dueDate: string | null;
  priority: string;
};

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
  return withLock(async () => {
    const store = await read();
    const session: Stored = {
      id: randomUUID(),
      userId,
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
    return toDTO(session);
  });
}

export function listSessions(userId: string): Promise<SessionListItem[]> {
  return withLock(async () => {
    const store = await read();
    return store.sessions
      .filter((s) => s.userId === userId)
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

export function getSession(
  id: string,
  userId: string,
): Promise<SessionDTO | null> {
  return withLock(async () => {
    const store = await read();
    const s = store.sessions.find((s) => s.id === id && s.userId === userId);
    return s ? toDTO(s) : null;
  });
}

export function deleteSession(id: string, userId: string): Promise<boolean> {
  return withLock(async () => {
    const store = await read();
    const before = store.sessions.length;
    store.sessions = store.sessions.filter(
      (s) => !(s.id === id && s.userId === userId),
    );
    if (store.sessions.length === before) return false;
    await write(store);
    return true;
  });
}

export function addActionItem(
  sessionId: string,
  item: NewActionItem,
  userId: string,
): Promise<ActionItemDTO | null> {
  return withLock(async () => {
    const store = await read();
    const session = store.sessions.find(
      (s) => s.id === sessionId && s.userId === userId,
    );
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
  userId: string,
): Promise<ActionItemDTO | null> {
  return withLock(async () => {
    const store = await read();
    for (const s of store.sessions) {
      if (s.userId !== userId) continue;
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

export function deleteActionItem(id: string, userId: string): Promise<boolean> {
  return withLock(async () => {
    const store = await read();
    for (const s of store.sessions) {
      if (s.userId !== userId) continue;
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
