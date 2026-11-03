import type {
  SessionDTO,
  SessionListItem,
  ActionItemDTO,
  Priority,
} from "./types";
import { keyHeader } from "./keys";
import { getSttConfig } from "./stt-config";

// Client-side fetch helpers. Each throws an Error carrying the server's message
// so the UI can show the specific failure (rate limit, bad audio, etc.).

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status}).`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error as string;
    } catch {
      // non-JSON error body; keep the status message
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function transcribeAudio(
  file: Blob,
  language?: string,
): Promise<{ text: string; durationSec: number | null }> {
  const form = new FormData();
  const name = file instanceof File ? file.name : "recording.webm";
  form.append("audio", file, name);
  if (language) form.append("language", language);

  const headers: Record<string, string> = { "x-groq-key": keyHeader("groq") };
  const stt = getSttConfig();
  if (stt.provider === "custom") {
    headers["x-stt-provider"] = "custom";
    if (stt.baseUrl) headers["x-stt-base-url"] = stt.baseUrl;
    if (stt.model) headers["x-stt-model"] = stt.model;
    if (stt.key) headers["x-stt-key"] = stt.key;
  }

  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: form,
    headers,
  });
  return jsonOrThrow(res);
}

export async function analyzeTranscript(input: {
  transcript: string;
  title?: string;
  durationSec?: number | null;
}): Promise<SessionDTO> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-google-key": keyHeader("google"),
    },
    body: JSON.stringify(input),
  });
  return jsonOrThrow(res);
}

export async function loadSample(): Promise<SessionDTO> {
  return jsonOrThrow(await fetch("/api/sample", { method: "POST" }));
}

export async function listSessions(): Promise<SessionListItem[]> {
  return jsonOrThrow(await fetch("/api/sessions"));
}

export async function getSession(id: string): Promise<SessionDTO> {
  return jsonOrThrow(await fetch(`/api/sessions/${id}`));
}

export async function updateAction(
  id: string,
  patch: Partial<{
    done: boolean;
    task: string;
    assignee: string;
    dueDate: string | null;
    priority: Priority;
  }>,
): Promise<ActionItemDTO> {
  const res = await fetch(`/api/actions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return jsonOrThrow(res);
}

export async function addAction(
  sessionId: string,
  item: {
    task: string;
    assignee?: string;
    dueDate?: string | null;
    priority?: Priority;
  },
): Promise<ActionItemDTO> {
  const res = await fetch(`/api/sessions/${sessionId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  return jsonOrThrow(res);
}

export async function deleteAction(id: string): Promise<void> {
  const res = await fetch(`/api/actions/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    throw new Error("Failed to delete the action item.");
  }
}
