import { describe, it, expect, vi, beforeEach } from "vitest";

// The provider layer is mocked: these tests cover the route's own validation and
// its error-to-status contract, not Groq. The validation branches (400/413/415)
// return before the provider is ever called.
vi.mock("@/lib/ai", () => ({
  transcribeAudio: vi.fn(),
}));

// Transcribe now requires a signed-in user; these tests exercise the signed-in
// path, so auth() is stubbed to return a user id.
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "test_user" })),
}));

import { POST } from "./route";
import { transcribeAudio } from "@/lib/ai";

const mocked = vi.mocked(transcribeAudio);

function reqWith(form: FormData) {
  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    body: form,
  });
}

beforeEach(() => {
  mocked.mockReset();
});

describe("POST /api/transcribe validation", () => {
  it("400 when no file is attached", async () => {
    const res = await POST(reqWith(new FormData()));
    expect(res.status).toBe(400);
  });

  it("400 for an empty file", async () => {
    const form = new FormData();
    form.set("audio", new File([], "clip.webm", { type: "audio/webm" }));
    const res = await POST(reqWith(form));
    expect(res.status).toBe(400);
  });

  it("415 for an unsupported type", async () => {
    const form = new FormData();
    form.set("audio", new File(["data"], "clip.txt", { type: "text/plain" }));
    const res = await POST(reqWith(form));
    expect(res.status).toBe(415);
    expect(mocked).not.toHaveBeenCalled();
  });
});

describe("POST /api/transcribe provider path", () => {
  it("422 when the transcript is blank", async () => {
    mocked.mockResolvedValue({ text: "   ", durationSec: 1 });
    const form = new FormData();
    form.set("audio", new File(["x"], "clip.webm", { type: "audio/webm" }));
    const res = await POST(reqWith(form));
    expect(res.status).toBe(422);
  });

  it("returns the transcript on success", async () => {
    mocked.mockResolvedValue({ text: "hello team", durationSec: 3 });
    const form = new FormData();
    form.set("audio", new File(["x"], "clip.webm", { type: "audio/webm" }));
    const res = await POST(reqWith(form));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { text: string };
    expect(json.text).toBe("hello team");
  });

  it("passes bring-your-own keys from the x-groq-key header", async () => {
    mocked.mockResolvedValue({ text: "hi", durationSec: 1 });
    const form = new FormData();
    form.set("audio", new File(["x"], "clip.webm", { type: "audio/webm" }));
    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: form,
      headers: { "x-groq-key": "k1, k2" },
    });
    await POST(req);
    expect(mocked).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({ keys: ["k1", "k2"] }),
    );
  });

  it("maps a provider rate-limit error to 429", async () => {
    mocked.mockRejectedValue(new Error("rate limit exceeded"));
    const form = new FormData();
    form.set("audio", new File(["x"], "clip.webm", { type: "audio/webm" }));
    const res = await POST(reqWith(form));
    expect(res.status).toBe(429);
  });
});
