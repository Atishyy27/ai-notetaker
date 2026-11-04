import { describe, it, expect } from "vitest";
import { InMemoryGraphStore } from "./store";
import { recordMeetingPromises, listPromises, similarity } from "./service";

describe("cross-meeting promise tracking", () => {
  it("shows a promise open until a later meeting closes it", async () => {
    const store = new InMemoryGraphStore();

    // Meeting 1: Sam commits to run the migration, not yet done.
    await recordMeetingPromises(store, {
      meetingId: "m1",
      meetingTitle: "Launch sync",
      createdAt: "2026-11-01T10:00:00Z",
      userId: "u1",
      promises: [
        { actionId: "a1", text: "Run the database migration off-peak", owner: "Sam", done: false },
      ],
    });

    let views = await listPromises(store, "u1");
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      owner: "Sam",
      status: "open",
      madeIn: "Launch sync",
      closedIn: null,
    });

    // Meeting 2: the same commitment, now marked done.
    await recordMeetingPromises(store, {
      meetingId: "m2",
      meetingTitle: "Launch retro",
      createdAt: "2026-11-08T10:00:00Z",
      userId: "u1",
      promises: [{ actionId: "a2", text: "Run the migration", owner: "Sam", done: true }],
    });

    views = await listPromises(store, "u1");
    // Collapsed to one commitment, not two rows.
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      status: "closed",
      closedIn: "Launch retro",
      appearances: 2,
    });
  });

  it("does not link a similar task owned by a different person", async () => {
    const store = new InMemoryGraphStore();
    await recordMeetingPromises(store, {
      meetingId: "m1", meetingTitle: "M1", createdAt: "2026-11-01", userId: "u1",
      promises: [{ actionId: "b1", text: "Write the rollback doc", owner: "Sam", done: false }],
    });
    await recordMeetingPromises(store, {
      meetingId: "m2", meetingTitle: "M2", createdAt: "2026-11-02", userId: "u1",
      promises: [{ actionId: "b2", text: "Write the rollback doc", owner: "Alex", done: true }],
    });
    const views = await listPromises(store, "u1");
    expect(views).toHaveLength(2);
  });

  it("scopes promises to the user", async () => {
    const store = new InMemoryGraphStore();
    await recordMeetingPromises(store, {
      meetingId: "m1", meetingTitle: "M1", createdAt: "2026-11-01", userId: "u1",
      promises: [{ actionId: "c1", text: "ship it", owner: "Sam", done: false }],
    });
    expect(await listPromises(store, "u2")).toHaveLength(0);
  });

  it("closes a commitment when its source action is marked done later", async () => {
    const store = new InMemoryGraphStore();
    await recordMeetingPromises(store, {
      meetingId: "m1", meetingTitle: "M1", createdAt: "2026-11-01", userId: "u1",
      promises: [{ actionId: "d1", text: "Write the runbook", owner: "Sam", done: false }],
    });
    expect((await listPromises(store, "u1"))[0].status).toBe("open");
    await store.setDone("d1", true);
    expect((await listPromises(store, "u1"))[0].status).toBe("closed");
  });

  it("similarity matches reworded tasks and separates unrelated ones", () => {
    expect(similarity("Run the database migration", "Run the migration")).toBeGreaterThan(0.3);
    expect(similarity("Write the rollback doc", "Send the launch email")).toBeLessThan(0.3);
  });
});
