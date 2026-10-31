import { describe, it, expect } from "vitest";
import { analysisSchema, actionItemSchema, priorityEnum } from "./schema";

// The schema is the contract between the model and the app. If these pass, a
// response that reaches the UI is guaranteed to be the right shape.

describe("actionItemSchema", () => {
  it("accepts a well-formed item", () => {
    const parsed = actionItemSchema.parse({
      task: "Send the deck",
      assignee: "Dario",
      dueDate: "by Friday",
      priority: "High",
    });
    expect(parsed.task).toBe("Send the deck");
  });

  it("allows a null due date", () => {
    const parsed = actionItemSchema.parse({
      task: "Follow up",
      assignee: "Unassigned",
      dueDate: null,
      priority: "Low",
    });
    expect(parsed.dueDate).toBeNull();
  });

  it("rejects an empty task", () => {
    const r = actionItemSchema.safeParse({
      task: "",
      assignee: "Unassigned",
      dueDate: null,
      priority: "Medium",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown priority", () => {
    const r = actionItemSchema.safeParse({
      task: "Do it",
      assignee: "Unassigned",
      dueDate: null,
      priority: "Urgent",
    });
    expect(r.success).toBe(false);
  });
});

describe("priorityEnum", () => {
  it("only allows the three known values", () => {
    expect(priorityEnum.safeParse("High").success).toBe(true);
    expect(priorityEnum.safeParse("medium").success).toBe(false);
  });
});

describe("analysisSchema", () => {
  it("parses a full analysis object", () => {
    const parsed = analysisSchema.parse({
      summary: [{ topic: "Launch", points: ["Ship Tuesday", "QA owns signoff"] }],
      actionItems: [
        { task: "File the ticket", assignee: "Sam", dueDate: null, priority: "Medium" },
      ],
    });
    expect(parsed.summary).toHaveLength(1);
    expect(parsed.actionItems[0].assignee).toBe("Sam");
  });

  it("rejects a summary topic that is not an object", () => {
    const r = analysisSchema.safeParse({
      summary: ["just a string"],
      actionItems: [],
    });
    expect(r.success).toBe(false);
  });
});
