// The USP: cross-meeting promise tracking. A "promise" is a commitment someone
// made in a meeting (an owned action item). The point of the product is to follow
// that promise ACROSS meetings and show whether it was kept.
//
// These types are storage-agnostic. A mock graph store (flat Postgres tables, or
// in-memory for tests) backs them today; a real Neo4j graph swaps in behind an
// env flag with no change here — see ./index.ts.

// One stored record: a single appearance of a commitment in one meeting. The same
// commitment can appear across meetings, chained by `followsUp`.
export type PromiseRecord = {
  id: string;
  userId: string;
  meetingId: string;
  meetingTitle: string;
  owner: string;
  text: string;
  // Whether this specific appearance was marked done.
  done: boolean;
  createdAt: string;
  // The earlier record this one follows up, or null if it is the first mention.
  followsUp: string | null;
  // The action item this promise came from, so marking that item done later can
  // close the promise without re-deriving anything.
  sourceActionId: string;
};

// The input the service takes for one meeting.
export type MeetingPromises = {
  meetingId: string;
  meetingTitle: string;
  createdAt: string;
  userId: string;
  promises: { actionId: string; text: string; owner: string; done: boolean }[];
};

// A collapsed view of a commitment across all the meetings it appeared in.
export type PromiseView = {
  owner: string;
  text: string;
  status: "open" | "closed";
  madeIn: string; // title of the meeting it was first made in
  closedIn: string | null; // title of the meeting it was marked done in
  appearances: number; // how many meetings touched it
};

export interface GraphStore {
  insert(record: PromiseRecord): Promise<void>;
  allForUser(userId: string): Promise<PromiseRecord[]>;
  // Mark every promise that came from this action item done/undone, so toggling a
  // task in a later meeting closes the commitment it follows up.
  setDone(actionId: string, done: boolean): Promise<void>;
}
