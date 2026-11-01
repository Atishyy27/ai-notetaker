"use client";

import Link from "next/link";
import { useState } from "react";
import AudioUpload from "@/components/AudioUpload";
import Dashboard from "@/components/Dashboard";
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
      // The upload and transcription happen in one request; flip to
      // "transcribing" right after the request is sent.
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <nav className="mb-8 flex items-center justify-between">
        <span className="text-lg font-semibold text-slate-900">AI Notetaker</span>
        <div className="flex items-center gap-4">
          <StatusBadge state={state} />
          <Link href="/sessions" className="text-sm text-slate-600 hover:text-slate-900">
            History
          </Link>
          {state !== "idle" && !processing && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
        <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-sm font-semibold text-red-800">Processing failed</h2>
          <p role="alert" className="mt-1 text-sm text-red-700">
            {error}
          </p>
          <div className="mt-4 flex gap-3">
            {source && (
              <button
                type="button"
                onClick={() => void process(source)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Start over
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-xl">
          <h1 className="mb-1 text-2xl font-semibold text-slate-900">New session</h1>
          <p className="mb-6 text-sm text-slate-500">
            Record a meeting or upload audio to get a transcript, summary and action items.
          </p>
          <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
            {(["record", "upload"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                disabled={state === "recording" || state === "paused"}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize disabled:cursor-not-allowed ${
                  mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
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

          <div className="mt-6 border-t border-slate-200 pt-4 text-center">
            <button
              type="button"
              onClick={() => void openSample()}
              disabled={loadingSample || state === "recording" || state === "paused"}
              className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingSample ? "Loading sample..." : "Or explore a sample session"}
            </button>
            <p className="mt-1 text-xs text-slate-400">
              Pre-filled example data. No API key needed.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
