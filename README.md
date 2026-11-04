# baithak · बैठक

A voice-AI meeting notetaker. Record your mic, capture a meeting tab, or upload
audio, and get a clean transcript, a topic-wise summary, and action items grouped
by the person who owns them. Its differentiator is **cross-meeting promise
tracking**: what was committed to, and whether it was kept, across meetings.

**Live:** https://baithak-teal.vercel.app — open and try it, no signup needed.

## What it does

- **Capture** three ways: microphone, a shared meeting tab's audio, or an uploaded file.
- **Transcribe** with Groq Whisper, then **summarise** by topic and extract
  **action items** with an owner, due date and priority.
- **Mail deliverables**: each person can be sent just their own tasks.
- **Accounts** (Clerk): sessions are private per user. The public demo runs on the
  server's keys with no account; signing in saves your history.
- **Bring your own key, or your own provider**: enter your Groq/Gemini keys, or
  point speech-to-text at your own OpenAI-compatible STT endpoint.
- **Cross-meeting promise tracking** (the USP): owned action items become promises
  tracked across meetings and shown open or kept. See
  [`docs/usp-promise-tracking.md`](docs/usp-promise-tracking.md).

## Architecture

```
client (browser)            server (Next API routes)         providers
------------------------    --------------------------       --------------------
Recorder / AudioUpload  ->  POST /api/transcribe        ->   STT adapter (Groq / custom)
                            POST /api/analyze           ->   Gemini  +  promise graph
Dashboard / Insights   <->  /api/sessions, /api/actions ->   Neon Postgres (lib/db.ts)
Promises page          <->  /api/promises               ->   graph store (lib/promises)
```

Provider work is isolated behind seams so a real service swaps in by env var with
no code change. These are **mocks today**, clearly labeled:

| Capability | Flag | Mock now | Real later |
|---|---|---|---|
| Promise graph | `NEO4J_URI` | Postgres flat tables | Neo4j / AuraDB |
| Diarization | `SARVAM_API_KEY` | positional | Sarvam Saaras |
| Audio storage | `S3_ENDPOINT` | no-op | R2 / B2 / S3 |

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Clerk, Neon Postgres,
Groq Whisper, Google Gemini, Vitest, deployed on Vercel.

## Local setup

```bash
npm install
# Provide env vars (see the table in DEPLOY.md): DATABASE_URL, Clerk keys,
# GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY. Keys are optional for the sample.
node --env-file=.env.local scripts/init-db.mjs   # create the schema
npm run dev
```

## Checks

```bash
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

Tests cover the API routes (validation, the demo cap, guest vs signed-in paths)
and the promise-tracking logic (a promise made in one meeting, kept in the next).

## Deploy

Vercel, from `main`. The production checklist, including the owner-only steps
(Clerk production keys), is in [`DEPLOY.md`](DEPLOY.md).

## Todo

- [ ] Rotate the Clerk test secret and move to production keys before a public launch, then update `CLERK_SECRET_KEY` in the deploy env.
- [ ] Swap the mock graph / diarization / audio adapters for the real services (add the keys above).
