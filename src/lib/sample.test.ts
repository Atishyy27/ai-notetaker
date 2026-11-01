import { describe, it, expect } from "vitest";
import { analysisSchema } from "./schema";
import { SAMPLE_SUMMARY, SAMPLE_ACTION_ITEMS, SAMPLE_TRANSCRIPT } from "./sample";

// The sample session is seeded straight into the store, so it never passes
// through the AI schema at runtime. This test is the guard that keeps the
// fixture in lockstep with the real contract anyway.
describe("sample fixture", () => {
  it("conforms to the analysis schema", () => {
    const r = analysisSchema.safeParse({
      summary: SAMPLE_SUMMARY,
      actionItems: SAMPLE_ACTION_ITEMS,
    });
    expect(r.success).toBe(true);
  });

  it("has a non-trivial transcript and some action items", () => {
    expect(SAMPLE_TRANSCRIPT.length).toBeGreaterThan(100);
    expect(SAMPLE_ACTION_ITEMS.length).toBeGreaterThan(0);
  });
});
