import { describe, it, expect, vi, afterEach } from "vitest";
import { customProvider } from "./openai-compatible";

const cfg = {
  baseUrl: "https://stt.example.com/v1",
  model: "whisper-1",
  apiKey: "sk-test",
};

describe("custom OpenAI-compatible STT provider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns transcript text and duration on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ text: "hello team", duration: 3 }), {
            status: 200,
          }),
      ),
    );
    const r = await customProvider.transcribe(new Uint8Array([1, 2, 3]), cfg);
    expect(r.text).toBe("hello team");
    expect(r.durationSec).toBe(3);
  });

  it("throws a readable error on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: "bad model" } }), {
            status: 400,
          }),
      ),
    );
    await expect(
      customProvider.transcribe(new Uint8Array([1]), cfg),
    ).rejects.toThrow(/bad model/);
  });

  it("validates required config before calling out", async () => {
    await expect(
      customProvider.transcribe(new Uint8Array([1]), { model: "m", apiKey: "k" }),
    ).rejects.toThrow(/base URL/);
  });
});
