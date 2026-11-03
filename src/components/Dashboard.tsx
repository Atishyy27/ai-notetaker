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
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Dashboard({
  session,
  preview = false,
}: {
  session: SessionDTO;
  // The public sample is a read-only preview: no server-backed edits.
  preview?: boolean;
}) {
  const [items, setItems] = useState<ActionItemDTO[]>(session.actionItems);
  const [tab, setTab] = useState<Tab>("insights");

  const duration = formatDuration(session.durationSec);
  const openCount = items.filter((i) => !i.done).length;

  const transcript = <TranscriptPanel transcript={session.transcript} />;
  const insights = (
    <InsightsPanel
      sessionId={session.id}
      summary={session.summary}
      actionItems={items}
      readOnly={preview}
      onItemChange={(updated) =>
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      }
      onItemDelete={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
      onItemAdd={(item) => setItems((prev) => [...prev, item])}
    />
  );
  const people = <PeoplePanel actionItems={items} sessionTitle={session.title} />;

  return (
    <div>
      <header className="mb-7">
        <h1 className="display text-3xl text-ink sm:text-[2.6rem]">
          {session.title}
        </h1>
        <div className="label-mono mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-muted">
          <span>{formatDate(session.createdAt)}</span>
          {duration && (
            <>
              <span className="text-faint">·</span>
              <span>{duration}</span>
            </>
          )}
          <span className="text-faint">·</span>
          <span className="text-accent">
            {openCount} open {openCount === 1 ? "task" : "tasks"}
          </span>
        </div>
      </header>

      {/* Mobile: segmented tabs */}
      <div className="lg:hidden">
        <div className="segment mb-5" role="tablist" aria-label="Session views">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className="segment-btn"
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "insights" && insights}
        {tab === "people" && people}
        {tab === "transcript" && transcript}
      </div>

      {/* Desktop: notes take the width; people + transcript sit in a quiet rail */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">{insights}</div>
        <aside className="space-y-6">
          {people}
          {transcript}
        </aside>
      </div>
    </div>
  );
}
