"use client";

import Link from "next/link";
import { useState } from "react";
import AudioUpload from "@/components/AudioUpload";
import ConsentGate from "@/components/ConsentGate";
import Dashboard from "@/components/Dashboard";
import KeySettings from "@/components/KeySettings";
import ProcessingView from "@/components/ProcessingView";
import Recorder from "@/components/Recorder";
import StatusBadge from "@/components/StatusBadge";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { analyzeTranscript, loadSample, transcribeAudio } from "@/lib/api";
import type { CaptureState, SessionDTO } from "@/lib/types";

type Mode = "mic" | "meeting" | "upload";
type Source = { blob: Blob; durationSec: number | null };

const PROCESSING: CaptureState[] = ["uploading", "transcribing", "analyzing"];

const MODES: { key: Mode; label: string; icon: React.ReactNode }[] = [
  {
    key: "mic",
    label: "Mic",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    ),
  },
  {
    key: "meeting",
    label: "Meeting",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
  {
    key: "upload",
    label: "Upload",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 15V4m0 0L8 8m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
      </svg>
    ),
  },
];

const STEPS = [
  { n: "1", title: "Capture", body: "Record your mic, a meeting tab, or upload a file." },
  { n: "2", title: "Transcribe", body: "Clean transcript in seconds, Indic-friendly." },
  { n: "3", title: "Act", body: "Summary, owners and tasks you can mail out." },
];

const FEATURES = [
  {
    title: "Any source",
    body: "Record your mic, capture a meeting tab, or upload an existing file.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5" /></svg>
    ),
  },
  {
    title: "Topic-wise summary",
    body: "The discussion organised into clear topics, not one wall of text.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14M5 9h14M5 14h9M5 19h9" /></svg>
    ),
  },
  {
    title: "Owners & action items",
    body: "Every commitment pulled out with who owns it and when it is due.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
    ),
  },
  {
    title: "Mail each person",
    body: "Send everyone just their own tasks, straight from the session.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
    ),
  },
  {
    title: "Indic-friendly",
    body: "Hindi and code-mixed speech transcribe cleanly, not just English.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>
    ),
  },
  {
    title: "Bring your own key",
    body: "Your API keys stay in your browser. Nothing locked in, no bill from us.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="m10.5 12.5 7-7M16 6l2 2M19 3l2 2" /></svg>
    ),
  },
];

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("mic");
  const [state, setState] = useState<CaptureState>("idle");
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The sample is an ephemeral, read-only preview (no owner, not persisted).
  const [isSample, setIsSample] = useState(false);

  const processing = PROCESSING.includes(state);
  const recording = state === "recording" || state === "paused";

  async function openSample() {
    setError(null);
    setLoadingSample(true);
    try {
      const result = await loadSample();
      setSession(result);
      setIsSample(true);
      setState("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the sample.");
      setState("error");
    } finally {
      setLoadingSample(false);
    }
  }

  async function process(src: Source) {
    setSource(src);
    setIsSample(false);
    setError(null);
    setState("uploading");
    try {
      const pending = transcribeAudio(src.blob);
      setState("transcribing");
      const { text, durationSec } = await pending;
      if (!text.trim()) {
        throw new Error("No speech was detected in that audio.");
      }
      setState("analyzing");
      const result = await analyzeTranscript({
        transcript: text,
        durationSec: durationSec ?? src.durationSec,
      });
      setSession(result);
      setState("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  function reset() {
    setSession(null);
    setSource(null);
    setIsSample(false);
    setError(null);
    setState("idle");
  }

  const idle = !(state === "completed" && session) && !processing && state !== "error";

  return (
    <div className="relative flex-1">
      {idle && <div className="hero-aura" aria-hidden="true" />}
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-7">
        <nav className="mb-10 flex items-center justify-between">
          {/* Wordmark. "baithak" = a gathering/sitting: three figures on a mat. */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-[var(--shadow-sm)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="7.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
                <path d="M6 15h12" />
              </svg>
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-ink">baithak</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <StatusBadge state={state} />
            <Link href="/sessions" className="btn btn-ghost px-2 py-1.5">History</Link>
            <button type="button" onClick={() => setSettingsOpen(true)} className="btn btn-ghost px-2 py-1.5">
              Keys
            </button>
            {state !== "idle" && !processing && (
              <button type="button" onClick={reset} className="btn btn-secondary px-3 py-1.5">
                New session
              </button>
            )}
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button type="button" className="btn btn-secondary px-3 py-1.5">Sign in</button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </nav>

        {state === "completed" && session ? (
          <Dashboard key={session.id} session={session} preview={isSample} />
        ) : processing ? (
          <div className="mx-auto max-w-xl pt-4">
            <ProcessingView state={state} />
          </div>
        ) : state === "error" ? (
          <div className="mx-auto max-w-xl pt-4">
            <div className="card p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/12 text-red-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" /></svg>
                </span>
                <h2 className="text-sm font-semibold text-ink">Processing failed</h2>
              </div>
              <p role="alert" className="mt-2 text-sm text-muted">{error}</p>
              <div className="mt-5 flex gap-3">
                {source && (
                  <button type="button" onClick={() => void process(source)} className="btn btn-primary px-4 py-2">
                    Try again
                  </button>
                )}
                <button type="button" onClick={reset} className="btn btn-secondary px-4 py-2">
                  Start over
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
          <div className="mx-auto max-w-xl">
            <div className="mb-8 text-center">
              <div className="mb-5 flex justify-center">
                <span className="chip border border-line bg-surface-2 text-muted">
                  <span className="text-accent-2">✦</span> Free · bring your own key · no signup
                </span>
              </div>
              <h1 className="display text-[2.75rem] text-ink sm:text-6xl">
                Turn any conversation
                <br className="hidden sm:block" /> into <span className="text-gradient">action</span>
              </h1>
              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
                Record or upload a meeting and get a clean transcript, a topic-wise
                summary, and action items you can mail to each person.
              </p>
            </div>

            <Show when="signed-in">
            <ConsentGate>
              <div className="card p-4 sm:p-5">
                <div className="segment mb-4" role="tablist" aria-label="Capture source">
                  {MODES.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={mode === key}
                      disabled={recording}
                      onClick={() => setMode(key)}
                      className="segment-btn"
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>

                {mode === "upload" ? (
                  <AudioUpload onSelect={(file) => void process({ blob: file, durationSec: null })} />
                ) : (
                  <>
                    {mode === "meeting" && (
                      <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-center text-xs text-muted">
                        Pick the tab your meeting is in and tick &ldquo;Also share tab audio&rdquo;. Your mic is mixed in.
                      </p>
                    )}
                    <Recorder
                      source={mode}
                      onStateChange={setState}
                      onComplete={(blob, durationSec) => void process({ blob, durationSec })}
                    />
                  </>
                )}
              </div>

              <p className="mt-3 text-center text-xs text-faint">
                Free tier: up to 25 MB per clip (~1&ndash;2 hrs recorded, ~25 min as MP3).
              </p>
            </ConsentGate>
            </Show>

            <Show when="signed-out">
              <div className="card p-6 text-center">
                <h2 className="text-base font-semibold text-ink">Sign in to record</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                  Create a free account to record, transcribe and keep your sessions in one place. Or explore the sample below &mdash; no account needed.
                </p>
                <SignInButton mode="modal">
                  <button type="button" className="btn btn-primary mt-5 px-5 py-2.5">
                    Sign in / Sign up
                  </button>
                </SignInButton>
              </div>
            </Show>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => void openSample()}
                disabled={loadingSample || recording}
                className="btn btn-ghost mx-auto px-2 py-1.5 text-accent hover:text-accent-hover disabled:opacity-60"
              >
                {loadingSample ? "Loading sample…" : "Explore a sample session →"}
              </button>
              <p className="mt-0.5 text-xs text-faint">Pre-filled example. No API key needed.</p>
            </div>

          </div>

          <section className="mx-auto mt-20 max-w-5xl">
            <div className="text-center">
              <span className="label-mono text-accent">What you get</span>
              <h2 className="display mt-2 text-3xl text-ink sm:text-4xl">
                Everything after you stop recording
              </h2>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="card card-lift p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    {f.icon}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-5xl">
            <div className="text-center">
              <span className="label-mono text-accent">How it works</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="card card-lift p-5">
                  <span className="label-mono text-accent">Step {s.n}</span>
                  <h3 className="mt-2 text-sm font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-3xl">
            <div
              className="card p-8 text-center"
              style={{
                background:
                  "radial-gradient(70% 120% at 50% 0%, var(--accent-soft), transparent 70%), var(--surface-glass)",
              }}
            >
              <span className="label-mono text-accent-2">Your keys · your data</span>
              <h2 className="display mt-2 text-3xl text-ink sm:text-4xl">
                Private by default, free by design
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
                baithak runs on your own API keys, kept in your browser and never
                stored on our servers. No subscription and no per-minute bill from
                us &mdash; you stay on your provider&rsquo;s free tier.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => setSettingsOpen(true)} className="btn btn-primary px-5 py-2.5">
                  Add your keys
                </button>
                <button type="button" onClick={() => void openSample()} disabled={loadingSample} className="btn btn-secondary px-5 py-2.5">
                  See a sample
                </button>
              </div>
            </div>
          </section>

          <p className="mt-10 text-center label-mono text-faint">
            Runs on Groq Whisper · Google Gemini
          </p>
          </>
        )}
      </main>

      <footer className="relative z-10 mx-auto mt-10 w-full max-w-6xl border-t border-line px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">baithak</span>
            <span className="text-faint">· turn conversations into action</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-faint">
            <Link href="/sessions" className="transition-colors hover:text-ink">History</Link>
            <button type="button" onClick={() => setSettingsOpen(true)} className="transition-colors hover:text-ink">
              Keys
            </button>
            <span>bring-your-own-key</span>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-faint sm:text-left">
          Recordings saved only with your consent.
        </p>
      </footer>

      <KeySettings
        key={settingsOpen ? "open" : "closed"}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
