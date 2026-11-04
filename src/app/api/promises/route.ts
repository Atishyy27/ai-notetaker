import { auth } from "@clerk/nextjs/server";
import { getGraphStore, listPromises } from "@/lib/promises";

// Cross-meeting promises for the signed-in user: what they and their team
// committed to, and whether it was kept, collapsed across every meeting.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await listPromises(getGraphStore(), userId));
}
