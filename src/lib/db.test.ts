import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import {
  createSession,
  listSessions,
  getSession,
  deleteSession,
  addActionItem,
  updateActionItem,
  deleteActionItem,
  type NewActionItem,
} from "./db";

// Each test runs against its own throwaway JSON file via the env override, so
// the suite never touches the real ./data store and tests don't collide.
let file: string;

const U = "user_a"; // the owner used by most tests
const U2 = "user_b"; // a second user, for isolation tests

beforeEach(() => {
  file = path.join(os.tmpdir(), `ainote-test-${randomUUID()}.json`);
  process.env.AINOTE_DATA_FILE = file;
});

afterEach(async () => {
  delete process.env.AINOTE_DATA_FILE;
  await fs.rm(file, { force: true });
});

const action = (task: string): NewActionItem => ({
  task,
  assignee: "Unassigned",
  dueDate: null,
  priority: "Medium",
});

function newSession(title = "Standup", userId = U) {
  return createSession(
    {
      title,
      transcript: "we talked about things",
      summary: [{ topic: "General", points: ["a", "b"] }],
      durationSec: 120,
      actionItems: [action("ship it")],
    },
    userId,
  );
}

describe("session CRUD", () => {
  it("creates and reads back a session", async () => {
    const s = await newSession();
    const got = await getSession(s.id, U);
    expect(got?.title).toBe("Standup");
    expect(got?.actionItems).toHaveLength(1);
    expect(got?.actionItems[0].done).toBe(false);
  });

  it("returns null for an unknown id", async () => {
    expect(await getSession("nope", U)).toBeNull();
  });

  it("lists sessions newest first", async () => {
    await createSession(
      { title: "Older", transcript: "x", summary: [], durationSec: null, actionItems: [] },
      U,
    );
    await new Promise((r) => setTimeout(r, 5));
    await createSession(
      { title: "Newer", transcript: "y", summary: [], durationSec: null, actionItems: [] },
      U,
    );
    const list = await listSessions(U);
    expect(list.map((s) => s.title)).toEqual(["Newer", "Older"]);
    expect(list[0].actionItemCount).toBe(0);
  });

  it("deletes a session", async () => {
    const s = await newSession();
    expect(await deleteSession(s.id, U)).toBe(true);
    expect(await getSession(s.id, U)).toBeNull();
    expect(await deleteSession(s.id, U)).toBe(false);
  });
});

describe("ownership isolation", () => {
  it("hides one user's sessions from another", async () => {
    const s = await newSession("A's meeting", U);
    // U2 must not see it in a list, read it, or delete it.
    expect(await listSessions(U2)).toHaveLength(0);
    expect(await getSession(s.id, U2)).toBeNull();
    expect(await deleteSession(s.id, U2)).toBe(false);
    // The real owner still can.
    expect(await getSession(s.id, U)).not.toBeNull();
  });

  it("blocks cross-user action-item writes", async () => {
    const s = await newSession("A's meeting", U);
    const mine = await addActionItem(s.id, action("mine"), U);
    expect(mine).not.toBeNull();
    // U2 cannot add to, update, or delete items under U's session.
    expect(await addActionItem(s.id, action("theirs"), U2)).toBeNull();
    expect(await updateActionItem(mine!.id, { done: true }, U2)).toBeNull();
    expect(await deleteActionItem(mine!.id, U2)).toBe(false);
    // Owner can.
    expect((await updateActionItem(mine!.id, { done: true }, U))?.done).toBe(true);
  });
});

describe("action items", () => {
  it("adds, updates and deletes an item", async () => {
    const s = await newSession();
    const added = await addActionItem(s.id, action("call the client"), U);
    expect(added).not.toBeNull();

    const updated = await updateActionItem(
      added!.id,
      { done: true, assignee: "Ravi" },
      U,
    );
    expect(updated?.done).toBe(true);
    expect(updated?.assignee).toBe("Ravi");

    expect(await deleteActionItem(added!.id, U)).toBe(true);
    const after = await getSession(s.id, U);
    expect(after?.actionItems.find((a) => a.id === added!.id)).toBeUndefined();
  });

  it("returns null when adding to a missing session", async () => {
    expect(await addActionItem("missing", action("x"), U)).toBeNull();
  });
});

describe("concurrency", () => {
  it("does not lose concurrent writes", async () => {
    const s = await newSession();
    const N = 25;
    await Promise.all(
      Array.from({ length: N }, (_, i) => addActionItem(s.id, action(`t${i}`), U)),
    );
    const got = await getSession(s.id, U);
    expect(got?.actionItems).toHaveLength(N + 1);
  });

  it("keeps the file valid JSON under concurrent writes", async () => {
    await Promise.all(Array.from({ length: 15 }, () => newSession()));
    const raw = await fs.readFile(file, "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(await listSessions(U)).toHaveLength(15);
  });
});
