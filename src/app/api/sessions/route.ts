import { listSessions } from "@/lib/db";

// History list: newest first, with an action-item count per session.
export async function GET() {
  return Response.json(await listSessions());
}
