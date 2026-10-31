"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecState = "idle" | "recording" | "paused";

type Props = {
  onComplete: (blob: Blob, durationSec: number) => void;
  /** Reports recorder state so the parent can mirror it in a status badge. */
  onStateChange?: (state: RecState) => void;
  disabled?: boolean;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function describeMicError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Microphone access was denied. Allow it in your browser settings and try again.";
    }
    if (err.name === "NotFoundError") {
      return "No microphone was found. Connect one and try again.";
    }
  }
  return "Could not start recording. Check your microphone and try again.";
}

export default function Recorder({ onComplete, onStateChange, disabled = false }: Props) {
  const [state, setState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const changeState = useCallback(
    (next: RecState) => {
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange],
  );

  const releaseResources = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
  }, []);

  // Stop everything if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
      }
      releaseResources();
    };
  }, [releaseResources]);

  function startTimer() {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  }

  function drawVisualizer(analyser: AnalyserNode) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 48;
      const step = Math.floor(data.length / bars);
      const barWidth = canvas.width / bars;
      ctx.fillStyle = "#0f172a";
      for (let i = 0; i < bars; i++) {
        const value = data[i * step] / 255;
        const h = Math.max(2, value * canvas.height);
        ctx.fillRect(i * barWidth + 1, (canvas.height - h) / 2, barWidth - 2, h);
      }
    };
    render();
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser. Try uploading a file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = elapsedRef.current;
        releaseResources();
        changeState("idle");
        if (blob.size > 0) {
          onCompleteRef.current(blob, duration);
        } else {
          setError("No audio was captured. Please try again.");
        }
      };
      recorderRef.current = recorder;

      elapsedRef.current = 0;
      setElapsed(0);
      recorder.start();
      startTimer();
      drawVisualizer(analyser);
      changeState("recording");
    } catch (err) {
      releaseResources();
      setError(describeMicError(err));
      changeState("idle");
    }
  }

  function togglePause() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      changeState("paused");
    } else if (rec.state === "paused") {
      rec.resume();
      startTimer();
      changeState("recording");
    }
  }

  function stop() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  const active = state !== "idle";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="font-mono text-4xl tabular-nums text-slate-900">
          {formatTime(elapsed)}
        </div>
        <canvas
          ref={canvasRef}
          width={480}
          height={64}
          className={`h-16 w-full max-w-md rounded-lg bg-slate-50 ${active ? "" : "opacity-50"}`}
          aria-hidden="true"
        />
        <div className="flex gap-3">
          {!active ? (
            <button
              type="button"
              onClick={start}
              disabled={disabled}
              className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start recording
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={togglePause}
                className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {state === "paused" ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={stop}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Stop
              </button>
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
