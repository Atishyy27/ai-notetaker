import type { CaptureState } from "@/lib/types";

const STYLES: Record<CaptureState, { label: string; classes: string }> = {
  idle: { label: "Idle", classes: "bg-ink/6 text-muted" },
  recording: { label: "Recording", classes: "bg-red-500/12 text-red-600" },
  paused: { label: "Paused", classes: "bg-amber-500/15 text-amber-600" },
  uploading: { label: "Uploading", classes: "bg-accent-soft text-accent" },
  transcribing: { label: "Transcribing", classes: "bg-accent-soft text-accent" },
  analyzing: { label: "Analyzing", classes: "bg-accent-soft text-accent" },
  completed: { label: "Completed", classes: "bg-emerald-500/12 text-emerald-600" },
  error: { label: "Error", classes: "bg-red-500/12 text-red-600" },
};

export default function StatusBadge({ state }: { state: CaptureState }) {
  if (state === "idle") return null;
  const { label, classes } = STYLES[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}
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
