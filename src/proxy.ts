import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 request interception (the former middleware.ts). clerkMiddleware
// attaches the auth context so route handlers and server components can call
// auth(). Routes enforce their own access (401 without a user) and the data
// layer scopes every query by user, so we don't blanket-protect here — the home
// page, the public sample, and sign-in stay reachable.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static files; run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
