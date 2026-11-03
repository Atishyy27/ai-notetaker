import { auth } from "@clerk/nextjs/server";
import { getSession, deleteSession } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const session = await getSession(id, userId);
  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }
  return Response.json(session);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteSession(id, userId);
  if (!ok) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
