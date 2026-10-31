import { updateActionItem, deleteActionItem } from "@/lib/db";
import { PRIORITIES } from "@/lib/schema";

type Ctx = { params: Promise<{ id: string }> };

// Toggle done, edit task text, reassign, change due/priority.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Partial<{
    done: boolean;
    task: string;
    assignee: string;
    dueDate: string | null;
    priority: string;
  }> = {};

  if (typeof body.done === "boolean") patch.done = body.done;
  if (typeof body.task === "string" && body.task.trim()) patch.task = body.task.trim();
  if (typeof body.assignee === "string") patch.assignee = body.assignee;
  if (body.dueDate === null || typeof body.dueDate === "string") {
    patch.dueDate = body.dueDate as string | null;
  }
  if (
    typeof body.priority === "string" &&
    (PRIORITIES as readonly string[]).includes(body.priority)
  ) {
    patch.priority = body.priority;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const item = await updateActionItem(id, patch);
  if (!item) {
    return Response.json({ error: "Action item not found." }, { status: 404 });
  }
  return Response.json(item);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteActionItem(id);
  if (!ok) {
    return Response.json({ error: "Action item not found." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
