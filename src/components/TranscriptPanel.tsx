export default function TranscriptPanel({ transcript }: { transcript: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
        Transcript
      </h2>
      <div className="max-h-[70vh] overflow-y-auto p-4">
        {transcript.trim() ? (
          <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700">
            {transcript}
          </p>
        ) : (
          <p className="text-sm text-slate-400">No speech was detected.</p>
        )}
      </div>
    </section>
  );
}
