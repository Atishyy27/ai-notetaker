"use client";

import { useState } from "react";
import type { ActionItemDTO, SessionDTO } from "@/lib/types";
import InsightsPanel from "./InsightsPanel";
import TranscriptPanel from "./TranscriptPanel";

type Tab = "insights" | "transcript";

function formatDuration(sec: number | null): string | null {
  if (sec === null) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

export default function Dashboard({ session }: { session: SessionDTO }) {
  const [items, setItems] = useState<ActionItemDTO[]>(session.actionItems);
  const [tab, setTab] = useState<Tab>("insights");

  const duration = formatDuration(session.durationSec);

  const transcript = <TranscriptPanel transcript={session.transcript} />;
  const insights = (
    <InsightsPanel
      sessionId={session.id}
      summary={session.summary}
      actionItems={items}
      onItemChange={(updated) =>
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      }
      onItemDelete={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
      onItemAdd={(item) => setItems((prev) => [...prev, item])}
    />
  );

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">{session.title}</h1>
        <p className="text-sm text-slate-500">
          {new Date(session.createdAt).toLocaleString()}
          {duration && ` · ${duration}`}
        </p>
      </header>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
          {(["insights", "transcript"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "insights" ? insights : transcript}
      </div>

      {/* Desktop: side by side */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        {transcript}
        {insights}
      </div>
    </div>
  );
}
