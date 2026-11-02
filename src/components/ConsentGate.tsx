"use client";

import { useSyncExternalStore } from "react";

// We persist recordings and transcripts (server-side) to run the product and to
// improve it. That is a real data practice, so the user has to see it and accept
// it before they can capture anything — not a buried line in a policy.
//
// Consent lives in localStorage and is read through useSyncExternalStore: that is
// the idiomatic way to subscribe to a browser store, renders a stable value
// during SSR (the server can't see localStorage, so it assumes "not accepted"),
// and lets accept() push an update to every gate on the page at once. Bump the
// key to re-prompt everyone if the terms change.
const CONSENT_KEY = "baithak.consent.v1";

const listeners = new Set<() => void>();

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "yes";
  } catch {
    // Private mode / blocked storage: treat as not accepted, ask every load.
    return false;
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function accept() {
  try {
    localStorage.setItem(CONSENT_KEY, "yes");
  } catch {
    // Can't persist (blocked storage); still let them through this session.
  }
  listeners.forEach((l) => l());
}

type Props = {
  children: React.ReactNode;
};

export default function ConsentGate({ children }: Props) {
  // Server snapshot is always false, so SSR renders the consent card and there is
  // no hydration mismatch; the client swaps to the real value after hydration.
  const accepted = useSyncExternalStore(subscribe, readConsent, () => false);

  if (!accepted) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-base font-semibold text-ink">Before you record</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>
            Your recording and its transcript are{" "}
            <span className="font-medium text-ink">saved on our servers</span> so
            your sessions persist and to improve the product.
          </li>
          <li>
            Only record conversations you have the{" "}
            <span className="font-medium text-ink">right and consent</span> to
            record. Other people may be on the audio.
          </li>
          <li>You can delete any session from its page at any time.</li>
        </ul>
        <button
          type="button"
          onClick={accept}
          className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          I understand and have consent to record
        </button>
      </div>
    );
  }

  return (
    <>
      {children}
      <p className="mt-4 text-center text-xs text-faint">
        Recordings and transcripts are saved on our servers to run and improve the
        product. Only record with everyone&rsquo;s consent.
      </p>
    </>
  );
}
