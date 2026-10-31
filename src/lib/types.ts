import type { SummaryTopic } from "./schema";

// Shared client/server types. No prisma or server imports here, so the client
// bundle can use these freely.

export type { SummaryTopic };

export type Priority = "High" | "Medium" | "Low";

export type ActionItemDTO = {
  id: string;
  task: string;
  assignee: string;
  dueDate: string | null;
  priority: string;
  done: boolean;
};

export type SessionDTO = {
  id: string;
  title: string;
  createdAt: string;
  transcript: string;
  durationSec: number | null;
  summary: SummaryTopic[];
  actionItems: ActionItemDTO[];
};

export type SessionListItem = {
  id: string;
  title: string;
  createdAt: string;
  durationSec: number | null;
  actionItemCount: number;
};

// The one state machine the capture + processing UI runs on.
export type CaptureState =
  | "idle"
  | "recording"
  | "paused"
  | "uploading"
  | "transcribing"
  | "analyzing"
  | "completed"
  | "error";
