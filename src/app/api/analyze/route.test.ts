import { describe, it, expect, vi, beforeEach } from "vitest";

// API smoke test for the analyze step: validation, the demo cap, the guest
// (ephemeral) path and the signed-in (persisted) path, and provider-error
// mapping. The model and the DB are mocked, so this exercises the route's own
// branching end to end, not Gemini or Postgres.
vi.mock("@/lib/ai", () => ({ analyzeTranscript: vi.fn() }));
vi.mock("@/lib/db", () => ({ createSession: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(async () => ({ userId: null })) }));
vi.mock("@/lib/rate-limit", () => ({
  demoAllowed: vi.fn(async () => true),
  clientIp: () => "test-ip",
}));

import { POST } from "./route";
import { analyzeTranscript } from "@/lib/ai";
import { createSession } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { demoAllowed } from "@/lib/rate-limit";

const mAnalyze = vi.mocked(analyzeTranscript);
const mCreate = vi.mocked(createSession);
const mAuth = vi.mocked(auth);
const mLimit = vi.mocked(demoAllowed);

const ANALYSIS = {
  title: "Launch sync",
  summary: [{ topic: "Launch", points: ["API shipped", "Eval pending"] }],
  actionItems: [
    { task: "Run the migration", assignee: "Sam", dueDate: "Saturday", priority: "High" },
  ],
};

function req(body: unknown) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mAnalyze.mockReset();
  mCreate.mockReset();
  mAnalyze.mockResolvedValue(ANALYSIS as never);
  mLimit.mockResolvedValue(true);
  mAuth.mockResolvedValue({ userId: null } as never);
});

describe("POST /api/analyze", () => {
  it("400 when transcript is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(mAnalyze).not.toHaveBeenCalled();
  });

  it("429 and no model call when over the demo cap", async () => {
    mLimit.mockResolvedValueOnce(false);
    const res = await POST(req({ transcript: "hello team" }));
    expect(res.status).toBe(429);
    expect(mAnalyze).not.toHaveBeenCalled();
  });

  it("a guest gets the full result but it is not persisted", async () => {
    const res = await POST(req({ transcript: "hello team" }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      title: string;
      summary: unknown[];
      actionItems: unknown[];
    };
    expect(body.title).toBe("Launch sync");
    expect(body.summary).toHaveLength(1);
    expect(body.actionItems).toHaveLength(1);
    expect(body.id.startsWith("guest-")).toBe(true);
    expect(mCreate).not.toHaveBeenCalled();
  });

  it("a signed-in user's session is persisted with their id", async () => {
    mAuth.mockResolvedValueOnce({ userId: "user_1" } as never);
    mCreate.mockResolvedValueOnce({
      id: "s1",
      title: "Launch sync",
      createdAt: new Date().toISOString(),
      transcript: "hello team",
      durationSec: null,
      summary: ANALYSIS.summary,
      actionItems: [],
    } as never);
    const res = await POST(req({ transcript: "hello team" }));
    expect(res.status).toBe(201);
    expect(mCreate).toHaveBeenCalledTimes(1);
    expect(mCreate.mock.calls[0][1]).toBe("user_1");
  });

  it("maps a provider rate-limit error to 429", async () => {
    mAnalyze.mockRejectedValueOnce(new Error("rate limit exceeded"));
    const res = await POST(req({ transcript: "hello team" }));
    expect(res.status).toBe(429);
  });
});
