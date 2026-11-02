"use client";

import Link from "next/link";
import { useState } from "react";
import AudioUpload from "@/components/AudioUpload";
import Dashboard from "@/components/Dashboard";
import KeySettings from "@/components/KeySettings";
import ProcessingView from "@/components/ProcessingView";
import Recorder from "@/components/Recorder";
import StatusBadge from "@/components/StatusBadge";
import { analyzeTranscript, loadSample, transcribeAudio } from "@/lib/api";
import type { CaptureState, SessionDTO } from "@/lib/types";

type Mode = "record" | "upload";
type Source = { blob: Blob; durationSec: number | null };

const PROCESSING: CaptureState[] = ["uploading", "transcribing", "analyzing"];

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("record");
  const [state, setState] = useState<CaptureState>("idle");
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const processing = PROCESSING.includes(state);

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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <nav className="mb-10 flex items-center justify-between">
        {/* Wordmark. "baithak" is the provisional name; swap here once it's locked. */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-fg" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">
            baithak
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <StatusBadge state={state} />
          <Link
            href="/sessions"
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            History
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            Keys
          </button>
          {state !== "idle" && !processing && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              New session
            </button>
          )}
        </div>
      </nav>

      {state === "completed" && session ? (
        <Dashboard key={session.id} session={session} />
      ) : processing ? (
        <div className="mx-auto max-w-xl">
          <ProcessingView state={state} />
        </div>
      ) : state === "error" ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="text-sm font-semibold text-red-600">Processing failed</h2>
          <p role="alert" className="mt-1 text-sm text-muted">
            {error}
          </p>
          <div className="mt-4 flex gap-3">
            {source && (
              <button
                type="button"
                onClick={() => void process(source)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              Start over
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Turn any conversation into action
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
              Record or upload a meeting. Get a clean transcript, a topic-wise
              summary, and action items you can mail to each person.
            </p>
          </div>

          <div className="mb-4 flex gap-1 rounded-xl border border-line bg-surface p-1" role="tablist">
            {(["record", "upload"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                disabled={state === "recording" || state === "paused"}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors disabled:cursor-not-allowed ${
                  mode === m ? "bg-accent text-accent-fg" : "text-muted hover:text-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === "record" ? (
            <Recorder
              onStateChange={setState}
              onComplete={(blob, durationSec) => void process({ blob, durationSec })}
            />
          ) : (
            <AudioUpload onSelect={(file) => void process({ blob: file, durationSec: null })} />
          )}

          <p className="mt-4 text-center text-xs text-faint">
            Free tier: up to 25 MB per clip (~1–2 hrs recorded, ~25 min as MP3).
          </p>

          <div className="mt-8 border-t border-line pt-5 text-center">
            <button
              type="button"
              onClick={() => void openSample()}
              disabled={loadingSample || state === "recording" || state === "paused"}
              className="text-sm font-medium text-accent underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingSample ? "Loading sample…" : "Explore a sample session"}
            </button>
            <p className="mt-1 text-xs text-faint">
              Pre-filled example data. No API key needed.
            </p>
          </div>
        </div>
      )}

      <KeySettings
        key={settingsOpen ? "open" : "closed"}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
