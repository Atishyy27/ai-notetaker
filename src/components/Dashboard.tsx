"use client";

import { useState } from "react";
import type { ActionItemDTO, SessionDTO } from "@/lib/types";
import InsightsPanel from "./InsightsPanel";
import PeoplePanel from "./PeoplePanel";
import TranscriptPanel from "./TranscriptPanel";

type Tab = "insights" | "people" | "transcript";

const TABS: { key: Tab; label: string }[] = [
  { key: "insights", label: "Insights" },
  { key: "people", label: "People" },
  { key: "transcript", label: "Transcript" },
];

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
  const people = (
    <PeoplePanel actionItems={items} sessionTitle={session.title} />
  );

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {session.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {new Date(session.createdAt).toLocaleString()}
          {duration && ` · ${duration}`}
        </p>
      </header>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <div className="mb-4 flex gap-1 rounded-xl border border-line bg-surface p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-accent text-accent-fg" : "text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "insights" && insights}
        {tab === "people" && people}
        {tab === "transcript" && transcript}
      </div>

      {/* Desktop: transcript on the left, insights + people stacked on the right */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        {transcript}
        <div className="space-y-6">
          {insights}
          {people}
        </div>
      </div>
    </div>
  );
}
