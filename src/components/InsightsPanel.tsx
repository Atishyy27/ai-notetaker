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

  const done = actionItems.filter((i) => i.done).length;

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
      {/* Summary — reads like a written document, not boxed widgets. */}
      <section className="card p-6 sm:p-7">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="label-mono text-faint">Summary</h2>
          <div className="h-px flex-1 bg-line" />
        </div>
        {summary.length === 0 ? (
          <p className="text-sm text-faint">No summary available.</p>
        ) : (
          <div className="space-y-6">
            {summary.map((topic) => (
              <div key={topic.topic}>
                <h3 className="text-[15px] font-semibold text-ink">{topic.topic}</h3>
                <ul className="mt-2 space-y-1.5">
                  {topic.points.map((point, i) => (
                    <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-muted">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Action items — crisp checklist */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="label-mono text-faint">Action items</h2>
          <span className="chip bg-surface-2 font-mono text-muted">
            {done}/{actionItems.length} done
          </span>
        </div>
        <div className="px-5">
          {actionItems.length === 0 ? (
            <p className="py-5 text-sm text-faint">No action items yet.</p>
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
        <form onSubmit={handleAdd} className="border-t border-line p-4">
          <div className="flex gap-2">
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Add a task…"
              disabled={adding}
              className="field flex-1 disabled:opacity-60"
            />
            <button type="submit" disabled={adding || !task.trim()} className="btn btn-primary px-4 py-2">
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-faint">
            Press <kbd>↵</kbd> to add a task
          </p>
          {error && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {error}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
