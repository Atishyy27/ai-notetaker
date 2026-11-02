"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listSessions } from "@/lib/api";
import type { SessionListItem } from "@/lib/types";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSessions()
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load sessions.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <nav className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">History</h1>
        <Link
          href="/"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          New session
        </Link>
      </nav>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
          {error}
        </p>
      ) : sessions === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-ink/6" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
          No sessions yet.{" "}
          <Link href="/" className="font-medium text-accent hover:underline">
            Record your first one
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{s.title}</p>
                  <p className="text-xs text-muted">
                    {new Date(s.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="ml-4 shrink-0 rounded-full bg-ink/8 px-2.5 py-0.5 text-xs font-medium text-muted">
                  {s.actionItemCount} {s.actionItemCount === 1 ? "task" : "tasks"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
