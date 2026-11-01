import { describe, it, expect, vi } from "vitest";
import { parseKeys, withKeyFailover } from "./failover";

describe("parseKeys", () => {
  it("splits, trims and drops empties", () => {
    expect(parseKeys("a, b ,,c")).toEqual(["a", "b", "c"]);
  });
  it("returns [] for null/empty", () => {
    expect(parseKeys(null)).toEqual([]);
    expect(parseKeys("")).toEqual([]);
    expect(parseKeys("  ,  ")).toEqual([]);
  });
});

describe("withKeyFailover", () => {
  it("calls run once with no key when the list is empty", async () => {
    const run = vi.fn().mockResolvedValue("env");
    expect(await withKeyFailover([], run)).toBe("env");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith();
  });

  it("returns the first key that succeeds", async () => {
    const run = vi.fn(async (key?: string) => {
      if (key === "k1") throw new Error("rate limit");
      return `ok:${key}`;
    });
    expect(await withKeyFailover(["k1", "k2"], run)).toBe("ok:k2");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("throws the last error when every key fails", async () => {
    const run = vi.fn(async (key?: string) => {
      throw new Error(`dead:${key}`);
    });
    await expect(withKeyFailover(["k1", "k2"], run)).rejects.toThrow("dead:k2");
    expect(run).toHaveBeenCalledTimes(2);
  });
});
