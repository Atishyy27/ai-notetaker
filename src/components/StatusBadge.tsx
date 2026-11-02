import type { CaptureState } from "@/lib/types";

const STYLES: Record<CaptureState, { label: string; classes: string }> = {
  idle: { label: "Idle", classes: "bg-ink/6 text-muted" },
  recording: { label: "Recording", classes: "bg-red-500/15 text-red-400" },
  paused: { label: "Paused", classes: "bg-amber-500/15 text-amber-400" },
  uploading: { label: "Uploading", classes: "bg-accent-soft text-accent" },
  transcribing: { label: "Transcribing", classes: "bg-accent-soft text-accent" },
  analyzing: { label: "Analyzing", classes: "bg-accent-soft text-accent" },
  completed: { label: "Completed", classes: "bg-emerald-500/15 text-emerald-400" },
  error: { label: "Error", classes: "bg-red-500/15 text-red-400" },
};

export default function StatusBadge({ state }: { state: CaptureState }) {
  if (state === "idle") return null;
  const { label, classes } = STYLES[state];
  return (
    <span
      className={`label-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${classes}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${
          state === "recording" ? "animate-pulse" : ""
        }`}
      />
      {label}
    </span>
  );
}
