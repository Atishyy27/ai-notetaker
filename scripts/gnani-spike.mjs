// One Gnani Prisma REST call against a local WAV, to check the key, latency and
// output before wiring the app. Reads GNANI_API_KEY from .env.local; the key is
// never printed. Usage: node scripts/gnani-spike.mjs <file.wav> [prisma-v3.0]
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const [, , wavPath, model] = process.argv;
if (!wavPath) {
  console.error("usage: node scripts/gnani-spike.mjs <file.wav> [prisma-v3.0]");
  process.exit(2);
}

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^GNANI_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!key) {
  console.error("GNANI_API_KEY not found in .env.local");
  process.exit(2);
}

const audio = readFileSync(wavPath);
const form = new FormData();
form.append("audio_file", new Blob([audio], { type: "audio/wav" }), basename(wavPath));
form.append("language_code", model === "prisma-v3.0" ? "hi-IN,en-IN" : "en-IN");
if (model) form.append("model", model);

console.log(`file: ${basename(wavPath)}, ${audio.length} bytes, model: ${model ?? "prisma-v2.5 (default)"}`);
const t0 = performance.now();
const res = await fetch("https://api.vachana.ai/stt/v3", {
  method: "POST",
  headers: { "X-API-Key-ID": key },
  body: form,
});
const ms = Math.round(performance.now() - t0);
const text = await res.text();
console.log(`http: ${res.status}, round trip: ${ms} ms`);
console.log(text.split(key).join("<redacted>"));
process.exit(res.ok ? 0 : 1);
