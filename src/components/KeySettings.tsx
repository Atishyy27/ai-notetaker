"use client";

import { useState } from "react";
import { getKeys, setKeys, type Provider } from "@/lib/keys";
import {
  getSttConfig,
  setSttConfig,
  type SttClientConfig,
  type SttProviderId,
} from "@/lib/stt-config";

type Meta = { provider: Provider; label: string; hint: string; link: string };

// getKeys is SSR-safe (returns [] when localStorage is unavailable), so it can
// seed state in a lazy initializer. The parent remounts this on open (via key),
// so each open re-reads whatever is currently saved.
function initList(provider: Provider): string[] {
  const existing = getKeys(provider);
  return existing.length ? existing : [""];
}

const PROVIDERS: Meta[] = [
  {
    provider: "groq",
    label: "Groq",
    hint: "Transcription (Whisper). Free key starts with gsk_",
    link: "https://console.groq.com/keys",
  },
  {
    provider: "google",
    label: "Google Gemini",
    hint: "Analysis — summary + action items. Free tier.",
    link: "https://aistudio.google.com/apikey",
  },
];

export default function KeySettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [keys, setKeysState] = useState<Record<Provider, string[]>>(() => ({
    groq: initList("groq"),
    google: initList("google"),
  }));
  const [stt, setStt] = useState<SttClientConfig>(() => getSttConfig());

  if (!open) return null;

  const update = (p: Provider, i: number, value: string) =>
    setKeysState((s) => {
      const next = s[p].slice();
      next[i] = value;
      return { ...s, [p]: next };
    });

  const add = (p: Provider) =>
    setKeysState((s) => ({ ...s, [p]: [...s[p], ""] }));

  const remove = (p: Provider, i: number) =>
    setKeysState((s) => {
      const next = s[p].filter((_, j) => j !== i);
      return { ...s, [p]: next.length ? next : [""] };
    });

  const save = () => {
    (Object.keys(keys) as Provider[]).forEach((p) => setKeys(p, keys[p]));
    setSttConfig(stt);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="API key settings"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">API keys</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-faint hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-5 text-xs text-muted">
          Bring your own keys. They stay in this browser, are sent only with your
          own requests, and are never stored on the server. Add more than one to
          fail over when a key is rate-limited.
        </p>

        <div className="space-y-5">
          {PROVIDERS.map(({ provider, label, hint, link }) => (
            <div key={provider}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-medium text-ink">{label}</span>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted underline underline-offset-2 hover:text-ink"
                >
                  Get a free key
                </a>
              </div>
              <p className="mb-2 text-xs text-faint">{hint}</p>
              <div className="space-y-2">
                {keys[provider].map((val, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="password"
                      value={val}
                      onChange={(e) => update(provider, i, e.target.value)}
                      placeholder={`${label} key`}
                      autoComplete="off"
                      spellCheck={false}
                      className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => remove(provider, i)}
                      aria-label="Remove key"
                      className="rounded-lg border border-line px-3 text-faint hover:bg-surface-2 hover:text-ink"
                    >
                      −
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => add(provider)}
                className="mt-2 text-xs font-medium text-accent hover:opacity-80"
              >
                + Add another key
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <label htmlFor="stt-provider" className="text-sm font-medium text-ink">
            Speech-to-text provider
          </label>
          <p className="mb-2 text-xs text-faint">
            Use Groq Whisper, or plug in your own OpenAI-compatible STT endpoint.
          </p>
          <select
            id="stt-provider"
            value={stt.provider}
            onChange={(e) =>
              setStt((s) => ({ ...s, provider: e.target.value as SttProviderId }))
            }
            className="field"
          >
            <option value="groq">Groq Whisper (default)</option>
            <option value="custom">Custom (OpenAI-compatible)</option>
            <option value="gnani">Gnani Prisma (clips up to 25 s)</option>
          </select>
          {stt.provider === "custom" && (
            <div className="mt-3 space-y-2">
              <input
                className="field"
                placeholder="Base URL (e.g. https://api.openai.com/v1)"
                value={stt.baseUrl}
                onChange={(e) => setStt((s) => ({ ...s, baseUrl: e.target.value }))}
                autoComplete="off"
                spellCheck={false}
              />
              <input
                className="field"
                placeholder="Model (e.g. whisper-1)"
                value={stt.model}
                onChange={(e) => setStt((s) => ({ ...s, model: e.target.value }))}
                autoComplete="off"
                spellCheck={false}
              />
              <input
                className="field"
                type="password"
                placeholder="API key"
                value={stt.key}
                onChange={(e) => setStt((s) => ({ ...s, key: e.target.value }))}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-faint">
                Audio is sent to {"{base URL}"}/audio/transcriptions. It stays in
                this browser and is never stored on our servers.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary px-4 py-2">
            Cancel
          </button>
          <button type="button" onClick={save} className="btn btn-primary px-4 py-2">
            Save keys
          </button>
        </div>
      </div>
    </div>
  );
}
