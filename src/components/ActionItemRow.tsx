"use client";

import { useState } from "react";
import { deleteAction, updateAction } from "@/lib/api";
import { avatarColor, initials } from "@/lib/avatar";
import type { ActionItemDTO } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  High: "bg-red-500/12 text-red-600",
  Medium: "bg-amber-500/15 text-amber-700",
  Low: "bg-surface-2 text-muted",
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

  const named = item.assignee && item.assignee !== "Unassigned";
  const color = named ? avatarColor(item.assignee) : null;

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
              className="field py-1.5"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(item.task);
                setEditing(true);
              }}
              className={`w-full text-left text-sm leading-snug transition-colors hover:text-accent ${
                item.done ? "text-faint line-through" : "text-ink"
              }`}
              title="Click to edit"
            >
              {item.task}
            </button>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`chip font-medium ${PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.Low}`}>
              {item.priority}
            </span>
            {named && color && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: color.bg, color: color.fg }}
                  aria-hidden="true"
                >
                  {initials(item.assignee)}
                </span>
                <span className="text-muted">{item.assignee}</span>
              </span>
            )}
            {item.dueDate && (
              <span className="inline-flex items-center gap-1 text-faint">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
                </svg>
                {item.dueDate}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Delete "${item.task}"`}
          className="rounded p-1 text-faint opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
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
