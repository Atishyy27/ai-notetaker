import { getSession, deleteSession } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }
  return Response.json(session);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteSession(id);
  if (!ok) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
