import { auth } from "@clerk/nextjs/server";
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
  // Capturing requires an account — this runs the STT key, so it must not be
  // open to anonymous callers.
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await transcribeAudio(bytes, { language, keys });
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
