"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSttConfig } from "@/lib/stt-config";
import { GNANI_MAX_SECONDS } from "@/lib/audio/limits";

type RecState = "idle" | "recording" | "paused";
type Source = "mic" | "meeting";

type Props = {
  onComplete: (blob: Blob, durationSec: number) => void;
  /** Reports recorder state so the parent can mirror it in a status badge. */
  onStateChange?: (state: RecState) => void;
  /** "mic" records the microphone; "meeting" records a shared tab's audio
   *  (the call) mixed with the mic. */
  source?: Source;
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
      return "Permission was denied. Allow access in your browser and try again.";
    }
    if (err.name === "NotFoundError") {
      return "No microphone was found. Connect one and try again.";
    }
  }
  return "Could not start recording. Check your devices and try again.";
}

export default function Recorder({
  onComplete,
  onStateChange,
  source = "mic",
  disabled = false,
}: Props) {
  const [state, setState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const capRef = useRef<number | null>(null);
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
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
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
      if (capRef.current !== null && elapsedRef.current >= capRef.current) stop();
    }, 1000);
  }

  function drawVisualizer(analyser: AnalyserNode) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const accent =
      getComputedStyle(canvas).getPropertyValue("--accent").trim() || "#4f46e5";

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 48;
      const step = Math.floor(data.length / bars);
      const barWidth = canvas.width / bars;
      ctx.fillStyle = accent;
      for (let i = 0; i < bars; i++) {
        const value = data[i * step] / 255;
        const h = Math.max(2, value * canvas.height);
        ctx.fillRect(i * barWidth + 1, (canvas.height - h) / 2, barWidth - 2, h);
      }
    };
    render();
  }

  // Build the stream to record and an analyser for the visualizer. For "meeting"
  // we capture a tab's audio via getDisplayMedia (Chrome only shares audio when
  // a tab/screen is shared and "share tab audio" is ticked, and it requires a
  // video request), drop the video, and mix it with the mic through an
  // AudioContext destination. Throws a user-readable message on a bad setup.
  async function buildStream(): Promise<{ record: MediaStream; analyser: AnalyserNode }> {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    if (source === "meeting") {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Tab-audio capture isn't supported in this browser. Try uploading a file.");
      }
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streamsRef.current.push(display);
      display.getVideoTracks().forEach((t) => t.stop());
      if (display.getAudioTracks().length === 0) {
        throw new Error('No tab audio was shared. Pick a tab and tick "Also share tab audio", then try again.');
      }
      // Stop recording if the user ends the share from the browser bar.
      display.getAudioTracks()[0].addEventListener("ended", () => stop());

      const dest = ctx.createMediaStreamDestination();
      const tabNode = ctx.createMediaStreamSource(new MediaStream(display.getAudioTracks()));
      tabNode.connect(dest);
      tabNode.connect(analyser);

      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamsRef.current.push(mic);
        const micNode = ctx.createMediaStreamSource(mic);
        micNode.connect(dest);
        micNode.connect(analyser);
      } catch {
        // Mic is optional for a meeting; record the tab alone if denied.
      }
      return { record: dest.stream, analyser };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Recording isn't supported in this browser. Try uploading a file.");
    }
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamsRef.current.push(mic);
    ctx.createMediaStreamSource(mic).connect(analyser);
    return { record: mic, analyser };
  }

  async function start() {
    setError(null);
    if (typeof MediaRecorder === "undefined") {
      setError("Recording isn't supported in this browser. Try uploading a file instead.");
      return;
    }
    try {
      const { record, analyser } = await buildStream();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const recorder = new MediaRecorder(record, mimeType ? { mimeType } : undefined);
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
      capRef.current = getSttConfig().provider === "gnani" ? GNANI_MAX_SECONDS : null;
      recorder.start();
      startTimer();
      drawVisualizer(analyser);
      changeState("recording");
    } catch (err) {
      releaseResources();
      setError(err instanceof Error ? err.message : describeMicError(err));
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
  const startLabel = source === "meeting" ? "Share a tab & record" : "Start recording";

  return (
    <div className="py-2">
      <div className="flex flex-col items-center gap-4">
        <div className="font-mono text-5xl tabular-nums tracking-tight text-ink">
          {formatTime(elapsed)}
        </div>
        <canvas
          ref={canvasRef}
          width={480}
          height={64}
          className={`h-16 w-full max-w-md rounded-xl bg-surface-2 transition-opacity ${active ? "" : "opacity-40"}`}
          aria-hidden="true"
        />
        <div className="flex gap-3">
          {!active ? (
            <button
              type="button"
              onClick={start}
              disabled={disabled}
              className="btn rec-pulse inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden="true" />
              {startLabel}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={togglePause}
                className="btn btn-secondary px-5 py-2.5"
              >
                {state === "paused" ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={stop}
                className="btn btn-primary px-5 py-2.5"
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
