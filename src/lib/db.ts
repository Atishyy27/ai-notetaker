import * as fileStore from "./db-file";
import * as neonStore from "./db-neon";

export type { NewActionItem } from "./db-file";

// The storage layer has two interchangeable backends with the same surface:
//   - db-neon.ts  : Neon/Postgres, real cross-request + cross-instance persistence
//   - db-file.ts  : JSON file (local/dev) with an in-memory fallback
// Pick one, once. Neon when a DATABASE_URL is configured; otherwise the file
// store. Tests set AINOTE_DATA_FILE to force the file store regardless, so the
// suite stays hermetic and never reaches for the real database.
const useNeon =
  Boolean(process.env.DATABASE_URL) && !process.env.AINOTE_DATA_FILE;
const impl = useNeon ? neonStore : fileStore;

export const createSession = impl.createSession;
export const listSessions = impl.listSessions;
export const getSession = impl.getSession;
export const deleteSession = impl.deleteSession;
export const addActionItem = impl.addActionItem;
export const updateActionItem = impl.updateActionItem;
export const deleteActionItem = impl.deleteActionItem;
