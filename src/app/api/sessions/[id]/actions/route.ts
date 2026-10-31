import { addActionItem } from "@/lib/db";
import { PRIORITIES } from "@/lib/schema";

type Ctx = { params: Promise<{ id: string }> };

// Manually add an action item to a session (the "add a new task" requirement).
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const task = typeof body.task === "string" ? body.task.trim() : "";
  if (!task) {
    return Response.json({ error: "task is required." }, { status: 400 });
  }

  const priority =
    typeof body.priority === "string" &&
    (PRIORITIES as readonly string[]).includes(body.priority)
      ? body.priority
      : "Medium";

  const item = await addActionItem(id, {
    task,
    assignee:
      typeof body.assignee === "string" && body.assignee.trim()
        ? body.assignee.trim()
        : "Unassigned",
    dueDate: typeof body.dueDate === "string" ? body.dueDate : null,
    priority,
  });

  if (!item) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }
  return Response.json(item, { status: 201 });
}
