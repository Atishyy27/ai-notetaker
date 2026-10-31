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
        <h1 className="text-2xl font-semibold text-slate-900">History</h1>
        <Link
          href="/"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          New session
        </Link>
      </nav>

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      ) : sessions === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          No sessions yet.{" "}
          <Link href="/" className="font-medium text-slate-900 underline">
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
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{s.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(s.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="ml-4 shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
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
