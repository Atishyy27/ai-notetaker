import type { GraphStore } from "./types";
import { InMemoryGraphStore, NeonGraphStore } from "./store";

// Adapter selection by env flag. Every backend here is a MOCK today, labeled so;
// the real AuraDB/Neo4j store swaps in by adding one class and the first branch,
// with no change to the service or its callers:
//   - NEO4J_URI set    -> real Neo4j graph  (NOT IMPLEMENTED YET — add the class)
//   - DATABASE_URL set -> MOCK graph on Postgres (persistent across requests)
//   - neither          -> MOCK in-memory graph (dev / tests)
let _store: GraphStore | null = null;

export function getGraphStore(): GraphStore {
  if (_store) return _store;
  // if (process.env.NEO4J_URI) _store = new Neo4jGraphStore();  // real, later
  if (process.env.DATABASE_URL) _store = new NeonGraphStore();
  else _store = new InMemoryGraphStore();
  return _store;
}

export { recordMeetingPromises, listPromises } from "./service";
export type { PromiseView, MeetingPromises } from "./types";
