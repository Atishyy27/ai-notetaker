export default function TranscriptPanel({ transcript }: { transcript: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 className="border-b border-line px-5 py-3.5 text-sm font-semibold text-ink">
        Transcript
      </h2>
      <div className="max-h-[70vh] overflow-y-auto p-5">
        {transcript.trim() ? (
          <p className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-muted">
            {transcript}
          </p>
        ) : (
          <p className="text-sm text-faint">No speech was detected.</p>
        )}
      </div>
    </section>
  );
}
