"use client";

import { useMemo, useState } from "react";
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
      if (!name || item.done) continue;
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
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 className="border-b border-line px-5 py-3.5 text-sm font-semibold text-ink">
        People &amp; deliverables
        <span className="ml-2 font-normal text-faint">{people.length}</span>
      </h2>

      {people.length === 0 ? (
        <p className="px-5 py-4 text-sm text-faint">
          No open items assigned to anyone yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {people.map(([name, items]) => {
            const email = emails[name]?.trim() ?? "";
            const valid = /.+@.+\..+/.test(email);
            return (
              <li key={name} className="p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{name}</span>
                  <span className="text-xs text-faint">
                    {items.length} open {items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {items.map((it) => (
                    <li key={it.id} className="text-sm text-muted">
                      • {it.task}
                      {it.dueDate && (
                        <span className="text-faint"> — due {it.dueDate}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    inputMode="email"
                    value={emails[name] ?? ""}
                    onChange={(e) => setEmail(name, e.target.value)}
                    placeholder={`${name}'s email`}
                    autoComplete="email"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                  <a
                    href={valid ? mailtoHref(name, email, items, sessionTitle) : undefined}
                    aria-disabled={!valid}
                    className={`shrink-0 rounded-lg px-4 py-2 text-center text-sm font-medium transition-opacity ${
                      valid
                        ? "bg-accent text-accent-fg hover:opacity-90"
                        : "pointer-events-none bg-ink/8 text-faint"
                    }`}
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
