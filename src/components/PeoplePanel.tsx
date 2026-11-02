"use client";

import { useMemo, useState } from "react";
import { avatarColor, initials } from "@/lib/avatar";
import type { ActionItemDTO } from "@/lib/types";

// Remembered recipient emails, keyed by assignee name, so you don't retype them
// across sessions. localStorage is per-browser and best-effort (guarded for SSR
// and private windows); it's a convenience, never the source of truth.
const LS_KEY = "baithak.emails";

function loadEmails(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveEmails(map: Record<string, string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    /* ignore: private mode or storage disabled */
  }
}

function mailtoHref(
  name: string,
  email: string,
  items: ActionItemDTO[],
  sessionTitle: string,
): string {
  const lines = items
    .map((i) => `- ${i.task}${i.dueDate ? ` (due ${i.dueDate})` : ""}`)
    .join("\n");
  const subject = `Your action items from ${sessionTitle}`;
  const body = `Hi ${name},\n\nHere are your action items from "${sessionTitle}":\n\n${lines}\n\nThanks!`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export default function PeoplePanel({
  actionItems,
  sessionTitle,
}: {
  actionItems: ActionItemDTO[];
  sessionTitle: string;
}) {
  const [emails, setEmails] = useState<Record<string, string>>(() => loadEmails());

  // Group open items by assignee; drop completed ones and the unassigned.
  const people = useMemo(() => {
    const map = new Map<string, ActionItemDTO[]>();
    for (const item of actionItems) {
      const name = item.assignee?.trim();
      if (!name || name === "Unassigned" || item.done) continue;
      const list = map.get(name) ?? [];
      list.push(item);
      map.set(name, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [actionItems]);

  const setEmail = (name: string, value: string) =>
    setEmails((prev) => {
      const next = { ...prev, [name]: value };
      saveEmails(next);
      return next;
    });

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">People &amp; deliverables</h2>
        <span className="chip bg-surface-2 text-muted">{people.length}</span>
      </div>

      {people.length === 0 ? (
        <p className="px-5 py-5 text-sm text-faint">
          No open items assigned to anyone yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {people.map(([name, items]) => {
            const email = emails[name]?.trim() ?? "";
            const valid = /.+@.+\..+/.test(email);
            const color = avatarColor(name);
            return (
              <li key={name} className="p-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: color.bg, color: color.fg }}
                    aria-hidden="true"
                  >
                    {initials(name)}
                  </span>
                  <span className="text-sm font-semibold text-ink">{name}</span>
                  <span className="ml-auto text-xs text-faint">
                    {items.length} open {items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5 pl-9">
                  {items.map((it) => (
                    <li key={it.id} className="flex gap-2 text-sm text-muted">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-faint" aria-hidden="true" />
                      <span>
                        {it.task}
                        {it.dueDate && <span className="text-faint"> — due {it.dueDate}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-col gap-2 pl-9 sm:flex-row">
                  <input
                    type="email"
                    inputMode="email"
                    value={emails[name] ?? ""}
                    onChange={(e) => setEmail(name, e.target.value)}
                    placeholder={`${name}'s email`}
                    autoComplete="email"
                    spellCheck={false}
                    className="field flex-1"
                  />
                  <a
                    href={valid ? mailtoHref(name, email, items, sessionTitle) : undefined}
                    aria-disabled={!valid}
                    className={
                      valid
                        ? "btn btn-primary shrink-0 px-4 py-2"
                        : "btn shrink-0 cursor-not-allowed bg-surface-2 px-4 py-2 text-faint"
                    }
                  >
                    Email deliverables
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
