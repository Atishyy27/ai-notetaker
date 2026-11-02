import Link from "next/link";
import { notFound } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { getSession } from "@/lib/db";

// A per-session page reads user data at request time, so it is dynamic, not
// prerendered. The server reads the store directly and hands the session to the
// client Dashboard, so there is no extra client fetch here.
export const instant = false;

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <nav className="mb-6">
        <Link
          href="/sessions"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          ← History
        </Link>
      </nav>
      <Dashboard session={session} />
    </main>
  );
}
