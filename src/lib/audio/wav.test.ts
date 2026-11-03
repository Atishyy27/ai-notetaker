import { describe, it, expect } from "vitest";
import { encodeWav, downmix } from "./wav";

describe("encodeWav", () => {
  it("writes a 16 kHz mono 16-bit PCM header", () => {
    const wav = encodeWav(new Float32Array(16000), 16000);
    const v = new DataView(wav.buffer);
    const tag = (o: number) => String.fromCharCode(...wav.slice(o, o + 4));
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(tag(36)).toBe("data");
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(32000);
    expect(wav.length).toBe(44 + 32000);
  });

  it("clips out-of-range samples instead of wrapping", () => {
    const wav = encodeWav(new Float32Array([2, -2, 0]), 16000);
    const v = new DataView(wav.buffer);
    expect(v.getInt16(44, true)).toBe(32767);
    expect(v.getInt16(46, true)).toBe(-32768);
    expect(v.getInt16(48, true)).toBe(0);
  });
});

describe("downmix", () => {
  it("averages stereo into mono", () => {
    const out = downmix([new Float32Array([1, 0]), new Float32Array([0, 0])]);
    expect(Array.from(out)).toEqual([0.5, 0]);
  });
});
