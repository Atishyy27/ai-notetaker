// Turns a provider/runtime error into a sensible HTTP response. Keeps the
// rate-limit, auth, and generic-failure cases distinct so the client can show
// the right message (resilience is graded, not optional).
export function mapAiError(err: unknown): Response {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("quota")) {
    return Response.json(
      { error: "The AI service is rate limited right now. Wait a moment and try again." },
      { status: 429 },
    );
  }
  if (
    lower.includes("api key") ||
    lower.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("permission")
  ) {
    return Response.json(
      { error: "The AI provider key is missing or invalid. Check your .env.local." },
      { status: 500 },
    );
  }
  return Response.json(
    { error: "AI processing failed. Please try again." },
    { status: 502 },
  );
}
