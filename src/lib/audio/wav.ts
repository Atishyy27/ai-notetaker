// Browser recordings come out as webm/opus, which some STT engines (Gnani's
// REST endpoint) reject. This turns any decodable recording into a 16 kHz mono
// 16-bit PCM WAV. Decoding and resampling use the Web Audio API; the WAV
// container is written by hand because it is a 44-byte header plus samples.

export const TARGET_SAMPLE_RATE = 16000;

export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buf);
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

export function downmix(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0].length);
  for (const ch of channels) {
    for (let i = 0; i < out.length; i++) out[i] += ch[i] / channels.length;
  }
  return out;
}

/**
 * Any recording the browser can decode -> 16 kHz mono WAV, trimmed to
 * `maxSeconds`. Resampling goes through an OfflineAudioContext created at the
 * target rate, because decodeAudioData returns audio at the device's rate
 * (often 44.1 or 48 kHz on phones), not at the rate we ask for.
 */
export async function toWav16kMono(blob: Blob, maxSeconds?: number): Promise<Blob> {
  const decodeCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void decodeCtx.close();
  }

  const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) =>
    decoded.getChannelData(i),
  );
  const mono = downmix(channels);
  const seconds = Math.min(decoded.duration, maxSeconds ?? Infinity);
  const frames = Math.max(1, Math.ceil(seconds * TARGET_SAMPLE_RATE));

  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const src = offline.createBuffer(1, mono.length, decoded.sampleRate);
  src.getChannelData(0).set(mono);
  const node = offline.createBufferSource();
  node.buffer = src;
  node.connect(offline.destination);
  node.start();
  const rendered = await offline.startRendering();

  const bytes = encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
  return new Blob([bytes as BlobPart], { type: "audio/wav" });
}
