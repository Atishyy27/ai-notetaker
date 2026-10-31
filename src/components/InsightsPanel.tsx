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
      <section className="rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
          Summary
        </h2>
        <div className="space-y-4 p-4">
          {summary.length === 0 && (
            <p className="text-sm text-slate-400">No summary available.</p>
          )}
          {summary.map((topic) => (
            <div key={topic.topic}>
              <h3 className="text-sm font-semibold text-slate-900">{topic.topic}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {topic.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
          Action items
          <span className="ml-2 font-normal text-slate-400">{actionItems.length}</span>
        </h2>
        <div className="px-4">
          {actionItems.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">No action items yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
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
        <form onSubmit={handleAdd} className="border-t border-slate-200 p-4">
          <div className="flex gap-2">
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Add a task"
              disabled={adding}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={adding || !task.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
