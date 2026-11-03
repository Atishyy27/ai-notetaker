"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { listSessions } from "@/lib/api";
import type { SessionListItem } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// The list fetches on mount, so it only lives inside <SignedIn> — a signed-out
// visitor never fires the request (which would 401 anyway).
function SessionsList() {
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

  if (error) {
    return (
      <p role="alert" className="card border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
        {error}
      </p>
    );
  }
  if (sessions === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div className="card flex flex-col items-center border-dashed p-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
        </span>
        <p className="mt-3 text-sm text-muted">No sessions yet.</p>
        <Link href="/" className="btn btn-primary mt-4 px-4 py-2">Record your first one</Link>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={`/sessions/${s.id}`}
            className="card card-lift flex items-center gap-4 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 6h9M8 12h9M8 18h5M4 6h.01M4 12h.01M4 18h.01" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">{s.title}</p>
              <p className="mt-0.5 font-mono text-xs text-muted">{formatDate(s.createdAt)}</p>
            </div>
            <span className="chip shrink-0 bg-surface-2 font-mono text-muted">
              {s.actionItemCount} {s.actionItemCount === 1 ? "task" : "tasks"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SessionsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <nav className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-semibold text-ink sm:text-3xl">History</h1>
          <p className="mt-1 text-sm text-muted">Every session you&rsquo;ve captured.</p>
        </div>
        <Link href="/" className="btn btn-primary px-4 py-2">New session</Link>
      </nav>

      <Show when="signed-in">
        <SessionsList />
      </Show>
      <Show when="signed-out">
        <div className="card flex flex-col items-center p-12 text-center">
          <h2 className="text-base font-semibold text-ink">Sign in to see your history</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Your sessions are private to your account. Sign in to view them.
          </p>
          <SignInButton mode="modal">
            <button type="button" className="btn btn-primary mt-5 px-5 py-2.5">
              Sign in / Sign up
            </button>
          </SignInButton>
        </div>
      </Show>
    </main>
  );
}
