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

function newSession(title = "Standup") {
  return createSession({
    title,
    transcript: "we talked about things",
    summary: [{ topic: "General", points: ["a", "b"] }],
    durationSec: 120,
    actionItems: [action("ship it")],
  });
}

describe("session CRUD", () => {
  it("creates and reads back a session", async () => {
    const s = await newSession();
    const got = await getSession(s.id);
    expect(got?.title).toBe("Standup");
    expect(got?.actionItems).toHaveLength(1);
    expect(got?.actionItems[0].done).toBe(false);
  });

  it("returns null for an unknown id", async () => {
    expect(await getSession("nope")).toBeNull();
  });

  it("lists sessions newest first", async () => {
    await createSession({
      title: "Older",
      transcript: "x",
      summary: [],
      durationSec: null,
      actionItems: [],
    });
    await new Promise((r) => setTimeout(r, 5));
    await createSession({
      title: "Newer",
      transcript: "y",
      summary: [],
      durationSec: null,
      actionItems: [],
    });
    const list = await listSessions();
    expect(list.map((s) => s.title)).toEqual(["Newer", "Older"]);
    expect(list[0].actionItemCount).toBe(0);
  });

  it("deletes a session", async () => {
    const s = await newSession();
    expect(await deleteSession(s.id)).toBe(true);
    expect(await getSession(s.id)).toBeNull();
    expect(await deleteSession(s.id)).toBe(false);
  });
});

describe("action items", () => {
  it("adds, updates and deletes an item", async () => {
    const s = await newSession();
    const added = await addActionItem(s.id, action("call the client"));
    expect(added).not.toBeNull();

    const updated = await updateActionItem(added!.id, {
      done: true,
      assignee: "Ravi",
    });
    expect(updated?.done).toBe(true);
    expect(updated?.assignee).toBe("Ravi");

    expect(await deleteActionItem(added!.id)).toBe(true);
    const after = await getSession(s.id);
    expect(after?.actionItems.find((a) => a.id === added!.id)).toBeUndefined();
  });

  it("returns null when adding to a missing session", async () => {
    expect(await addActionItem("missing", action("x"))).toBeNull();
  });
});

describe("concurrency", () => {
  // The regression test for the lost-update bug: a plain read-modify-writeFile
  // loses writes here because many reads see the same snapshot. The serialising
  // lock guarantees all N land.
  it("does not lose concurrent writes", async () => {
    const s = await newSession();
    const N = 25;
    await Promise.all(
      Array.from({ length: N }, (_, i) => addActionItem(s.id, action(`t${i}`))),
    );
    const got = await getSession(s.id);
    // 1 from creation + N added
    expect(got?.actionItems).toHaveLength(N + 1);
  });

  it("keeps the file valid JSON under concurrent writes", async () => {
    await Promise.all(Array.from({ length: 15 }, () => newSession()));
    const raw = await fs.readFile(file, "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(await listSessions()).toHaveLength(15);
  });
});
