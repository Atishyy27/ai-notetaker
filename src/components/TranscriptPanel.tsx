export default function TranscriptPanel({ transcript }: { transcript: string }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-line px-5 py-4 text-sm font-semibold text-ink">
        Transcript
      </h2>
      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
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
