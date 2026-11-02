"use client";

import { useState } from "react";
import { deleteAction, updateAction } from "@/lib/api";
import type { ActionItemDTO } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  High: "bg-red-500/12 text-red-600",
  Medium: "bg-amber-500/15 text-amber-600",
  Low: "bg-ink/8 text-muted",
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
    <li className="group py-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.done}
          onChange={toggleDone}
          disabled={pending}
          aria-label={`Mark "${item.task}" as done`}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line accent-[var(--accent)]"
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
              className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(item.task);
                setEditing(true);
              }}
              className={`w-full text-left text-sm transition-colors hover:text-accent ${
                item.done ? "text-faint line-through" : "text-ink"
              }`}
              title="Click to edit"
            >
              {item.task}
            </button>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.Low
              }`}
            >
              {item.priority}
            </span>
            {item.assignee && <span className="text-muted">{item.assignee}</span>}
            {item.dueDate && <span className="text-faint">Due {item.dueDate}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Delete "${item.task}"`}
          className="rounded px-1.5 text-lg leading-none text-faint opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
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
