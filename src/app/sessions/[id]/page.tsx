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
      <nav className="mb-6 flex items-center justify-between">
        <Link href="/sessions" className="btn btn-ghost -ml-2 gap-1.5 px-2 py-1.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          History
        </Link>
        <Link href="/" className="btn btn-secondary px-3 py-1.5">New session</Link>
      </nav>
      <Dashboard session={session} />
    </main>
  );
}
