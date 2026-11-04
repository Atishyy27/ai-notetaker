import { randomUUID } from "crypto";
import type { GraphStore, MeetingPromises, PromiseRecord, PromiseView } from "./types";

// Cross-meeting linking is entity resolution. The real graph (Neo4j) would do it
// with embeddings; the mock does it with token overlap, which is enough to prove
// the flow and is fully deterministic for tests. Same owner + similar wording =
// the same commitment, followed up.

const STOP = new Set([
  "the", "a", "an", "to", "and", "of", "for", "in", "on", "by", "with", "will",
  "is", "be", "it", "this", "that", "we", "i", "our", "get", "do",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  );
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter); // Jaccard
}

const MATCH_THRESHOLD = 0.3;

// Leaves of the follow-up forest whose chain is still open (no record marked done)
// are the live commitments a new promise can follow up.
function openTails(records: PromiseRecord[]): PromiseRecord[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const hasChild = new Set(records.map((r) => r.followsUp).filter(Boolean) as string[]);

  const chainDone = (leaf: PromiseRecord): boolean => {
    let cur: PromiseRecord | undefined = leaf;
    while (cur) {
      if (cur.done) return true;
      cur = cur.followsUp ? byId.get(cur.followsUp) : undefined;
    }
    return false;
  };

  return records.filter((r) => !hasChild.has(r.id) && !chainDone(r));
}

export async function recordMeetingPromises(
  store: GraphStore,
  meeting: MeetingPromises,
): Promise<void> {
  const existing = await store.allForUser(meeting.userId);
  // Snapshot tails once; a meeting's own promises don't chain to each other.
  const tails = openTails(existing);

  for (const p of meeting.promises) {
    const candidates = tails.filter((t) => t.owner === p.owner);
    let best: { rec: PromiseRecord; score: number } | null = null;
    for (const c of candidates) {
      const score = similarity(p.text, c.text);
      if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { rec: c, score };
      }
    }
    await store.insert({
      id: randomUUID(),
      userId: meeting.userId,
      meetingId: meeting.meetingId,
      meetingTitle: meeting.meetingTitle,
      owner: p.owner,
      text: p.text,
      done: p.done,
      createdAt: meeting.createdAt,
      followsUp: best ? best.rec.id : null,
      sourceActionId: p.actionId,
    });
  }
}

export async function listPromises(
  store: GraphStore,
  userId: string,
): Promise<PromiseView[]> {
  const records = await store.allForUser(userId);
  const byId = new Map(records.map((r) => [r.id, r]));
  const children = new Map<string, PromiseRecord[]>();
  for (const r of records) {
    if (r.followsUp) {
      const list = children.get(r.followsUp) ?? [];
      list.push(r);
      children.set(r.followsUp, list);
    }
  }

  const roots = records.filter((r) => !r.followsUp || !byId.has(r.followsUp));
  const views: PromiseView[] = [];

  for (const root of roots) {
    // Walk the whole follow-up subtree.
    const chain: PromiseRecord[] = [];
    const stack = [root];
    while (stack.length) {
      const cur = stack.pop()!;
      chain.push(cur);
      for (const ch of children.get(cur.id) ?? []) stack.push(ch);
    }
    const doneRec = chain.find((r) => r.done) ?? null;
    const meetings = new Set(chain.map((r) => r.meetingId));
    views.push({
      owner: root.owner,
      text: root.text,
      status: doneRec ? "closed" : "open",
      madeIn: root.meetingTitle,
      closedIn: doneRec ? doneRec.meetingTitle : null,
      appearances: meetings.size,
    });
  }

  // Open first (what still needs chasing), then by owner.
  return views.sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return a.owner.localeCompare(b.owner);
  });
}
