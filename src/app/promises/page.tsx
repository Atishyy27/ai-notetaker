"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { avatarColor, initials } from "@/lib/avatar";

type PromiseView = {
  owner: string;
  text: string;
  status: "open" | "closed";
  madeIn: string;
  closedIn: string | null;
  appearances: number;
};

function PromiseRow({ p }: { p: PromiseView }) {
  const c = avatarColor(p.owner);
  const meta =
    p.closedIn
      ? `${p.owner} · made in ${p.madeIn} · kept in ${p.closedIn}`
      : p.appearances > 1
        ? `${p.owner} · made in ${p.madeIn} · raised across ${p.appearances} meetings`
        : `${p.owner} · made in ${p.madeIn}`;
  return (
    <li className="card flex items-start gap-3 p-4">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
        style={{ backgroundColor: c.bg, color: c.fg }}
        aria-hidden="true"
      >
        {initials(p.owner)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{p.text}</p>
        <p className="mt-1 font-mono text-xs text-faint">{meta}</p>
      </div>
      <span
        className={`chip shrink-0 font-mono ${
          p.status === "closed" ? "bg-accent-2-soft text-accent-2" : "bg-surface-2 text-muted"
        }`}
      >
        {p.status === "closed" ? "kept" : "open"}
      </span>
    </li>
  );
}

function Section({ title, items }: { title: string; items: PromiseView[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="label-mono text-faint">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((p, i) => (
          <PromiseRow key={i} p={p} />
        ))}
      </ul>
    </section>
  );
}

function PromisesList() {
  const [items, setItems] = useState<PromiseView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/promises")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load promises."))))
      .then((d: PromiseView[]) => {
        if (!cancelled) setItems(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load promises.");
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
  if (items === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-muted">
        No tracked commitments yet. Record a couple of meetings with owned action
        items and they show up here, open until the task is marked done.
      </div>
    );
  }
  const open = items.filter((i) => i.status === "open");
  const closed = items.filter((i) => i.status === "closed");
  return (
    <div className="space-y-8">
      <Section title={`Open · ${open.length}`} items={open} />
      <Section title={`Kept · ${closed.length}`} items={closed} />
    </div>
  );
}

export default function PromisesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <nav className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-semibold text-ink sm:text-3xl">Promises</h1>
          <p className="mt-1 text-sm text-muted">
            What was committed to, and whether it was kept, across your meetings.
          </p>
        </div>
        <Link href="/" className="btn btn-secondary px-4 py-2">New session</Link>
      </nav>
      <Show when="signed-in">
        <PromisesList />
      </Show>
      <Show when="signed-out">
        <div className="card p-10 text-center">
          <h2 className="text-base font-semibold text-ink">Sign in to see your promises</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Promise tracking is private to your account.
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
