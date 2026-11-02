"use client";

import { useState } from "react";
import { addAction } from "@/lib/api";
import type { ActionItemDTO, SummaryTopic } from "@/lib/types";
import ActionItemRow from "./ActionItemRow";

type Props = {
  sessionId: string;
  summary: SummaryTopic[];
  actionItems: ActionItemDTO[];
  onItemChange: (item: ActionItemDTO) => void;
  onItemDelete: (id: string) => void;
  onItemAdd: (item: ActionItemDTO) => void;
};

export default function InsightsPanel({
  sessionId,
  summary,
  actionItems,
  onItemChange,
  onItemDelete,
  onItemAdd,
}: Props) {
  const [task, setTask] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = task.trim();
    if (!text || adding) return;
    setAdding(true);
    setError(null);
    try {
      onItemAdd(await addAction(sessionId, { task: text }));
      setTask("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add task.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <h2 className="border-b border-line px-5 py-3.5 text-sm font-semibold text-ink">
          Summary
        </h2>
        <div className="space-y-4 p-5">
          {summary.length === 0 && (
            <p className="text-sm text-faint">No summary available.</p>
          )}
          {summary.map((topic) => (
            <div key={topic.topic}>
              <h3 className="text-sm font-semibold text-ink">{topic.topic}</h3>
              <ul className="mt-1.5 space-y-1 pl-4 text-sm text-muted">
                {topic.points.map((point, i) => (
                  <li key={i} className="list-disc">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <h2 className="border-b border-line px-5 py-3.5 text-sm font-semibold text-ink">
          Action items
          <span className="ml-2 font-normal text-faint">{actionItems.length}</span>
        </h2>
        <div className="px-5">
          {actionItems.length === 0 ? (
            <p className="py-4 text-sm text-faint">No action items yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {actionItems.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  onChange={onItemChange}
                  onDelete={onItemDelete}
                />
              ))}
            </ul>
          )}
        </div>
        <form onSubmit={handleAdd} className="border-t border-line p-5">
          <div className="flex gap-2">
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Add a task"
              disabled={adding}
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={adding || !task.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add task"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
