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

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("mic");
  const [state, setState] = useState<CaptureState>("idle");
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const processing = PROCESSING.includes(state);
  const recording = state === "recording" || state === "paused";

  async function openSample() {
    setError(null);
    setLoadingSample(true);
    try {
      const result = await loadSample();
      setSession(result);
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
          </div>
        </nav>

        {state === "completed" && session ? (
          <Dashboard key={session.id} session={session} />
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
          <div className="mx-auto max-w-xl">
            <div className="mb-8 text-center">
              <h1 className="display text-4xl font-semibold text-ink sm:text-[2.9rem] sm:leading-[1.05]">
                Turn any conversation
                <br className="hidden sm:block" /> into action
              </h1>
              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
                Record or upload a meeting and get a clean transcript, a topic-wise
                summary, and action items you can mail to each person.
              </p>
            </div>

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

            <div className="mt-12 grid gap-3 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="card card-lift p-4">
                  <span className="chip bg-accent-soft text-accent">{s.n}</span>
                  <h3 className="mt-2.5 text-sm font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 text-center">
        <p className="text-xs text-faint">
          baithak · bring-your-own-key · recordings saved only with your consent
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
