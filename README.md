# AI Notetaker

Record or upload a conversation, get back a reliable transcript, an executive summary grouped by topic, and a structured, editable list of action items. Sessions are saved and can be revisited.

## Architecture

Three clean boundaries, one per concern:

```
client (browser)            server (Next API routes)         third-party AI
--------------------        ------------------------         --------------------
Recorder / AudioUpload  ->  POST /api/transcribe        ->   Groq (Whisper)
                            POST /api/analyze           ->   Google (Gemini)
Dashboard / Insights   <->  /api/sessions, /api/actions ->   JSON store (lib/db.ts)
```

- **Only `src/lib/ai.ts` talks to an AI provider.** Routes call it; the UI never touches a provider.
- **The LLM output is schema-enforced.** `src/lib/schema.ts` is a Zod schema handed to the AI SDK's `generateObject`, so the model is constrained to our exact shape. There is no `JSON.parse` of a free-text reply anywhere, which is what prevents hallucinated formats and truncation.
- **Types are end-to-end.** Zod on the model boundary, a typed store in `src/lib/db.ts`, shared DTOs in `src/lib/types.ts`.

## Stack and why

| Choice | Why |
|---|---|
| Next.js (App Router) + TypeScript | One repo, API routes as the backend, strict typing throughout. |
| Groq `whisper-large-v3-turbo` | Hosted Whisper, fast, free tier. |
| Google `gemini-2.5-flash` | Strong structured output, free tier. |
| Vercel AI SDK (`transcribe`, `generateObject`) | Provider-agnostic, and `generateObject` enforces the Zod schema. |
| JSON file store (`lib/db.ts`) | Zero-setup, zero-dependency persistence for the demo. Abstracted behind one module so Postgres is a drop-in later. |

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the two keys (both free)
npm run dev
```

Sessions are saved to `data/sessions.json` (created on first use, git-ignored).

Keys (free tier):
- `GROQ_API_KEY` — https://console.groq.com/keys
- `GOOGLE_GENERATIVE_AI_API_KEY` — https://aistudio.google.com/apikey

Without keys the API routes return a clear error; everything else (UI, history) still runs.

## Key trade-off: REST vs streaming

Audio is recorded in the browser and the whole blob is sent on **Stop** over REST (`multipart/form-data`), not streamed over WebSockets.

- **Why:** far fewer failure modes. One request, one response; no chunk reassembly, no socket lifecycle, no partial-transcript merging. For meeting-length clips the latency difference is small, and the reliability and code clarity are worth more here.
- **When streaming wins:** live captions during a long call. That is the first thing listed under "what's next."

## Resilience

Each graded failure mode has a handled path:

- Mic permission denied / no device -> caught in `Recorder`, inline message, no crash.
- Oversized or wrong-type audio -> rejected client-side and again in `/api/transcribe` (413 / 415).
- Empty audio or no speech -> 400 / 422 with a message.
- Provider rate limit -> 429 with a wait-and-retry message (`src/lib/http.ts`).
- Malformed LLM output -> cannot occur (schema-enforced), plus one retry in `analyzeTranscript`.

## API

| Route | Does |
|---|---|
| `POST /api/transcribe` | audio file -> `{ text, durationSec }` |
| `POST /api/analyze` | `{ transcript }` -> runs analysis, saves the session, returns it |
| `GET /api/sessions` | history list |
| `GET /api/sessions/:id` | one session with its action items |
| `POST /api/sessions/:id/actions` | add an action item manually |
| `PATCH /api/actions/:id` | toggle done / edit / reassign / reprioritise |
| `DELETE /api/actions/:id` | remove an action item |

## Samples

Short test clips live in `/samples`. Use one with the Upload option to try the pipeline without a microphone.

## Known limitations and what I would build next

- **No live streaming** — transcription happens after Stop. Next: WebSocket streaming for live captions.
- **No speaker diarization** — the transcript is not split by speaker. Groq returns segments; diarization would need a model that labels speakers.
- **Single user, no auth** — one local database, no accounts. Next: auth + per-user sessions, then shared team workspaces with real assignees.
- **No automated tests yet** — next: unit tests on the schema/serialiser and a route-level test with a mocked provider.
- **Debug-quality polish** — export (PDF/markdown) of a session and calendar/Slack push for action items.
