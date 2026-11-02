import type { CaptureState } from "@/lib/types";

const STEPS: { state: CaptureState; label: string }[] = [
  { state: "uploading", label: "Uploading audio" },
  { state: "transcribing", label: "Transcribing" },
  { state: "analyzing", label: "Finding action items" },
];

export default function ProcessingView({ state }: { state: CaptureState }) {
  const activeIndex = STEPS.findIndex((s) => s.state === state);

  return (
    <div
      className="rounded-2xl border border-line bg-surface p-6"
      role="status"
      aria-live="polite"
    >
      <ol className="space-y-3.5">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li key={step.state} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-accent text-accent-fg"
                      : "bg-ink/6 text-faint"
                }`}
              >
                {done ? "✓" : active ? <Spinner /> : i + 1}
              </span>
              <span
                className={
                  active
                    ? "font-medium text-ink"
                    : done
                      ? "text-muted"
                      : "text-faint"
                }
              >
                {step.label}
                {active ? "…" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 space-y-2" aria-hidden="true">
        <div className="h-3 w-3/4 animate-pulse rounded bg-ink/6" />
        <div className="h-3 w-full animate-pulse rounded bg-ink/6" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-ink/6" />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
