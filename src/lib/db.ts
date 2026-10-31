import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  SessionDTO,
  ActionItemDTO,
  SessionListItem,
  SummaryTopic,
} from "./types";

// Minimal persistence: one JSON file under /data. Zero-setup and reliable for a
// single-user demo. The whole storage layer lives behind this module, so moving
// to Postgres later changes only this file, not the routes.

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "sessions.json");

type Store = { sessions: SessionDTO[] };

async function read(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
  } catch {
    return { sessions: [] };
  }
}

async function write(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export type NewActionItem = {
  task: string;
  assignee: string;
  dueDate: string | null;
  priority: string;
};

export async function createSession(input: {
  title: string;
  transcript: string;
  summary: SummaryTopic[];
  durationSec: number | null;
  actionItems: NewActionItem[];
}): Promise<SessionDTO> {
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
}

export async function listSessions(): Promise<SessionListItem[]> {
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
}

export async function getSession(id: string): Promise<SessionDTO | null> {
  const store = await read();
  return store.sessions.find((s) => s.id === id) ?? null;
}

export async function deleteSession(id: string): Promise<boolean> {
  const store = await read();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((s) => s.id !== id);
  if (store.sessions.length === before) return false;
  await write(store);
  return true;
}

export async function addActionItem(
  sessionId: string,
  item: NewActionItem,
): Promise<ActionItemDTO | null> {
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
}

export async function updateActionItem(
  id: string,
  patch: Partial<
    Pick<ActionItemDTO, "task" | "assignee" | "dueDate" | "priority" | "done">
  >,
): Promise<ActionItemDTO | null> {
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
}

export async function deleteActionItem(id: string): Promise<boolean> {
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
}
