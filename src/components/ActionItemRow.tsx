"use client";

import { useState } from "react";
import { deleteAction, updateAction } from "@/lib/api";
import type { ActionItemDTO } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

type Props = {
  item: ActionItemDTO;
  onChange: (item: ActionItemDTO) => void;
  onDelete: (id: string) => void;
};

export default function ActionItemRow({ item, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.task);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleDone() {
    const previous = item;
    onChange({ ...item, done: !item.done });
    setError(null);
    try {
      onChange(await updateAction(item.id, { done: !previous.done }));
    } catch (err) {
      onChange(previous);
      setError(err instanceof Error ? err.message : "Could not update task.");
    }
  }

  async function saveTask() {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === item.task) {
      setDraft(item.task);
      return;
    }
    const previous = item;
    onChange({ ...item, task: next });
    setError(null);
    try {
      onChange(await updateAction(item.id, { task: next }));
    } catch (err) {
      onChange(previous);
      setDraft(previous.task);
      setError(err instanceof Error ? err.message : "Could not save task.");
    }
  }

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await deleteAction(item.id);
      onDelete(item.id);
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Could not delete task.");
    }
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.done}
          onChange={toggleDone}
          disabled={pending}
          aria-label={`Mark "${item.task}" as done`}
          className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300"
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveTask}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setDraft(item.task);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-900 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(item.task);
                setEditing(true);
              }}
              className={`w-full text-left text-sm hover:text-slate-600 ${
                item.done ? "text-slate-400 line-through" : "text-slate-900"
              }`}
              title="Click to edit"
            >
              {item.task}
            </button>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.Low
              }`}
            >
              {item.priority}
            </span>
            {item.assignee && <span>{item.assignee}</span>}
            {item.dueDate && <span>Due {item.dueDate}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Delete "${item.task}"`}
          className="rounded px-1.5 text-lg leading-none text-slate-400 hover:text-red-600 disabled:opacity-50"
        >
          ×
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 pl-7 text-xs text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}
