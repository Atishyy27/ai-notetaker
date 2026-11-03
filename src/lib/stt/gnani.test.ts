import { describe, it, expect, vi, afterEach } from "vitest";
import { gnaniProvider } from "./gnani";

type Call = [string, RequestInit];

function stubFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("gnani STT provider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts a .wav file with the key header and returns the transcript", async () => {
    const fetchMock = stubFetch(200, { success: true, transcript: "bees log aayenge" });
    const r = await gnaniProvider.transcribe(new Uint8Array([1, 2]), { apiKey: "k1" });
    expect(r.text).toBe("bees log aayenge");

    const [url, init] = fetchMock.mock.calls[0] as unknown as Call;
    expect(url).toBe("https://api.vachana.ai/stt/v3");
    expect((init.headers as Record<string, string>)["X-API-Key-ID"]).toBe("k1");
    const form = init.body as FormData;
    expect((form.get("audio_file") as File).name).toBe("audio.wav");
    expect(form.get("language_code")).toBe("en-IN");
    expect(form.get("model")).toBeNull();
  });

  it("uses a Hindi-English hint on prisma-v3.0 and ignores a bare 'hi'", async () => {
    const fetchMock = stubFetch(200, { success: true, transcript: "x" });
    await gnaniProvider.transcribe(new Uint8Array([1]), {
      apiKey: "k",
      model: "prisma-v3.0",
      language: "hi",
    });
    const form = (fetchMock.mock.calls[0] as unknown as Call)[1].body as FormData;
    expect(form.get("language_code")).toBe("hi-IN,en-IN");
    expect(form.get("model")).toBe("prisma-v3.0");
  });

  it("surfaces the error type from the envelope", async () => {
    stubFetch(400, {
      success: false,
      error: { type: "MAX_AUDIO_DURATION_EXCEEDED", message: "too long" },
    });
    await expect(
      gnaniProvider.transcribe(new Uint8Array([1]), { apiKey: "k" }),
    ).rejects.toThrow(/400 MAX_AUDIO_DURATION_EXCEEDED/);
  });

  it("maps the auth/rate-limit shape so mapAiError can classify it", async () => {
    stubFetch(429, { detail: { error_code: "RATE_LIMITED", message: "wait" } });
    await expect(
      gnaniProvider.transcribe(new Uint8Array([1]), { apiKey: "k" }),
    ).rejects.toThrow(/429 RATE_LIMITED/);
  });

  it("fails before calling out when no key is configured", async () => {
    const fetchMock = stubFetch(200, {});
    const saved = process.env.GNANI_API_KEY;
    delete process.env.GNANI_API_KEY;
    await expect(gnaniProvider.transcribe(new Uint8Array([1]), {})).rejects.toThrow(/401/);
    expect(fetchMock).not.toHaveBeenCalled();
    if (saved !== undefined) process.env.GNANI_API_KEY = saved;
  });
});
