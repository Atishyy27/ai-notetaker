import { auth } from "@clerk/nextjs/server";
import { listSessions } from "@/lib/db";

// History list: the signed-in user's sessions, newest first.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await listSessions(userId));
}
