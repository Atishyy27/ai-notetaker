import type { CaptureState } from "@/lib/types";

const STYLES: Record<CaptureState, { label: string; classes: string }> = {
  idle: { label: "Idle", classes: "bg-slate-100 text-slate-600" },
  recording: { label: "Recording", classes: "bg-red-100 text-red-700" },
  paused: { label: "Paused", classes: "bg-amber-100 text-amber-700" },
  uploading: { label: "Uploading", classes: "bg-blue-100 text-blue-700" },
  transcribing: { label: "Transcribing", classes: "bg-indigo-100 text-indigo-700" },
  analyzing: { label: "Analyzing", classes: "bg-violet-100 text-violet-700" },
  completed: { label: "Completed", classes: "bg-emerald-100 text-emerald-700" },
  error: { label: "Error", classes: "bg-red-100 text-red-700" },
};

export default function StatusBadge({ state }: { state: CaptureState }) {
  const { label, classes } = STYLES[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
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
