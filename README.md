# Baithak · बैठक

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
- **The store is concurrency-safe.** Every mutation runs inside a serialised critical section, so two in-flight requests can't clobber each other (no lost updates), and writes are atomic (temp file + rename), so a crash mid-write can never leave a corrupt file. See the concurrency tests in `src/lib/db.test.ts`.

## Stack and why

| Choice | Why |
|---|---|
| Next.js (App Router) + TypeScript | One repo, API routes as the backend, strict typing throughout. |
| Groq `whisper-large-v3-turbo` | Hosted Whisper, fast, free tier. |
| Google `gemini-2.5-flash` | Strong structured output, free tier. |
| Vercel AI SDK (`transcribe`, `generateObject`) | Provider-agnostic, and `generateObject` enforces the Zod schema. |
| JSON file store (`lib/db.ts`) | Zero-setup, zero-dependency persistence. Serialised writes + atomic rename, abstracted behind one module so Postgres is a drop-in later. |
| Vitest | Fast unit + route tests, no extra runtime config. |

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

## Tests

```bash
npm test          # vitest run
npm run typecheck # tsc --noEmit
npm run lint
```

- `schema.test.ts` — the model contract: valid shapes parse, bad priority / empty task / wrong types are rejected.
- `db.test.ts` — store CRUD plus two concurrency tests that would fail a naive read-modify-write: N parallel writes all land, and the file stays valid JSON under load.
- `http.test.ts` — each provider failure class maps to the right status.
- `api/transcribe/route.test.ts` — route validation (400 / 413 / 415 / 422) and the success / rate-limit paths, with the provider mocked.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test and build on every push and PR.

## Known limitations and what I would build next

- **No live streaming** — transcription happens after Stop. Next: WebSocket streaming for live captions.
- **No speaker diarization** — the transcript is not split by speaker. Groq returns segments; diarization would need a model that labels speakers.
- **Single user, no auth** — one local store, no accounts. Next: auth + per-user sessions, then shared team workspaces with real assignees.
- **Single-instance store** — the JSON store is correct for one running instance; horizontal scaling needs the Postgres swap the store module is built for.
- **Nice-to-haves** — export (PDF/markdown) of a session and calendar/Slack push for action items.
