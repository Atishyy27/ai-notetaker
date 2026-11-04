# USP: cross-meeting promise tracking

## What it is

Every notetaker gives you action items for one meeting. The thing none of them do
is follow a commitment **across** meetings: who promised what, and whether it was
actually kept the next time the team met. That is baithak's differentiator.

A **promise** is a commitment someone owns, pulled from a meeting's action items
(an item with a named assignee, not "Unassigned"). The same commitment reappears
across meetings; we chain those appearances and show each one as **open** (still
owed) or **kept** (marked done).

## The model

```
Meeting 1  --owns-->  "Sam: run the migration"        (open)
                              |
                         follows up (same owner, similar wording)
                              v
Meeting 2  --owns-->  "Sam: run the migration"  done  (keeps it)  => chain closed
```

- A **record** is one appearance of a commitment in one meeting.
- `follows_up` is the cross-meeting edge linking a later record to the earlier one.
- A **chain** (a commitment across meetings) is **closed** if any record in it is
  marked done, otherwise **open**.
- `source_action_id` ties a record to the action item it came from, so toggling
  that item done later closes the chain with no re-derivation.

## Entity resolution (the cross-meeting link)

Two records chain when they have the **same owner** and **similar wording**. The
mock scores wording with token-overlap (Jaccard over content words); a real graph
would use embeddings. The threshold and the matching live in
`src/lib/promises/service.ts` (`similarity`, `recordMeetingPromises`), so the rule
is one place, swappable.

## The adapter seam — everything is a MOCK today, swappable by env flag

Nothing here needs a signup to run; each adapter has a clearly labeled mock and a
real stand-in selected by an env var. When the keys exist, the real class slots in
and **no caller changes**.

| Capability | Flag | Mock (now) | Real (later) |
|---|---|---|---|
| Promise graph | `NEO4J_URI` | Postgres flat tables (`promises`), or in-memory in tests | Neo4j / AuraDB graph |
| Diarization (who said what) | `SARVAM_API_KEY` | alternate/prefix speakers | Sarvam Saaras |
| Audio storage (dataset) | `S3_ENDPOINT` | no-op, returns the key | R2 / B2 / S3 |

Selectors: `src/lib/promises/index.ts`, `src/lib/diarization/index.ts`,
`src/lib/audio-store/index.ts`.

## The flow

1. **Capture + analyze** (`/api/analyze`): on a signed-in session, owned action
   items are recorded into the graph as open promises
   (`recordMeetingPromises`).
2. **Mark done** (`/api/actions/[id]` PATCH): toggling a task done calls
   `graph.setDone(actionId, done)`, which closes the commitment it follows up.
3. **Read** (`/api/promises` -> `/promises` page): `listPromises` collapses each
   chain into one view and sorts open first (what still needs chasing).

## Files

- `src/lib/promises/types.ts` — records, views, the `GraphStore` interface.
- `src/lib/promises/service.ts` — similarity, chaining, status collapse (pure, tested).
- `src/lib/promises/store.ts` — `InMemoryGraphStore` (tests), `NeonGraphStore` (prod mock).
- `src/lib/promises/index.ts` — adapter selection.
- `src/lib/promises/service.test.ts` — the cross-meeting open→kept flow.
- `src/app/api/promises/route.ts`, `src/app/promises/page.tsx` — API + UI.

## Limits of the mock (honest)

- Matching is token-overlap, not embeddings, so a reworded commitment with no
  shared content words won't link. Good enough to demo; embeddings are the upgrade.
- The "graph" is flat tables with a `follows_up` column, not real graph traversal.
- Diarization is positional, not acoustic; it does not actually tell speakers apart.
- Audio is not stored (the mock is a no-op) until an S3 bucket is configured.
