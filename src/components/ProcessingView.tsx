import type { CaptureState } from "@/lib/types";

const STEPS: { state: CaptureState; label: string; hint: string }[] = [
  { state: "uploading", label: "Uploading audio", hint: "Sending your clip securely." },
  { state: "transcribing", label: "Transcribing", hint: "Turning speech into text." },
  { state: "analyzing", label: "Finding action items", hint: "Summary, owners and tasks." },
];

export default function ProcessingView({ state }: { state: CaptureState }) {
  const activeIndex = STEPS.findIndex((s) => s.state === state);

  return (
    <div className="card p-6 sm:p-7" role="status" aria-live="polite">
      <h2 className="text-base font-semibold text-ink">Working on it…</h2>
      <p className="mt-1 text-sm text-muted">This usually takes a few seconds.</p>

      <ol className="mt-6 space-y-1">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          const last = i === STEPS.length - 1;
          return (
            <li key={step.state} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-accent text-accent-fg"
                        : "bg-surface-2 text-faint"
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                  ) : active ? (
                    <Spinner />
                  ) : (
                    i + 1
                  )}
                </span>
                {!last && (
                  <span className={`my-1 w-px flex-1 ${done ? "bg-emerald-500/40" : "bg-line"}`} />
                )}
              </div>
              <div className={`pb-5 ${last ? "pb-0" : ""}`}>
                <p className={active ? "text-sm font-medium text-ink" : done ? "text-sm text-muted" : "text-sm text-faint"}>
                  {step.label}
                  {active ? "…" : ""}
                </p>
                <p className="mt-0.5 text-xs text-faint">{step.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-2 border-t border-line pt-5" aria-hidden="true">
        <div className="h-3 w-3/4 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
