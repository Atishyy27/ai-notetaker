import { transcribeAudio } from "@/lib/ai";
import { mapAiError } from "@/lib/http";
import { parseKeys } from "@/lib/failover";

// Transcription can take a while for longer clips.
export const maxDuration = 60;

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
];
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

export async function POST(req: Request) {
  // Open to guests: the public demo runs on the server's keys so anyone can try
  // it without an account. A user's own BYOK keys are used when supplied.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File)) {
    return Response.json({ error: "No audio file provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "The audio file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Audio exceeds the 25MB limit." }, { status: 413 });
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return Response.json(
      { error: `Unsupported audio type: ${file.type}. Use mp3, wav, m4a, or webm.` },
      { status: 415 },
    );
  }

  const language = (form.get("language") as string | null) || undefined;
  const keys = parseKeys(req.headers.get("x-groq-key"));
  // STT provider selection (default groq). A custom provider carries its own
  // endpoint/model/key via these headers; they are never stored server-side.
  const provider = req.headers.get("x-stt-provider") || undefined;
  const baseUrl = req.headers.get("x-stt-base-url") || undefined;
  const model = req.headers.get("x-stt-model") || undefined;
  const apiKey = req.headers.get("x-stt-key") || undefined;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await transcribeAudio(bytes, {
      provider,
      language,
      keys,
      apiKey,
      baseUrl,
      model,
    });
    if (!result.text.trim()) {
      return Response.json(
        { error: "No speech was detected in the audio." },
        { status: 422 },
      );
    }
    return Response.json(result);
  } catch (err) {
    return mapAiError(err);
  }
}
