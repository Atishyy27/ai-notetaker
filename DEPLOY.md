# Production deploy checklist

Baithak is deployed on Vercel from `main`. This is the pass to run before calling
a deploy "production", not the day-to-day push. Items marked **(owner)** need the
account holder's hand (signups, keys, dashboard toggles) and cannot be scripted.

## 1. Environment variables (Vercel project settings)

| Var | Purpose | Notes |
|-----|---------|-------|
| `DATABASE_URL` | Neon Postgres | set by the Neon integration, all environments |
| `CLERK_SECRET_KEY` | Clerk server key | **(owner)** production key, see §3 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client key | **(owner)** production key |
| `GROQ_API_KEY` | server fallback STT | spent by the public demo; keep on a free tier |
| `GOOGLE_GENERATIVE_AI_API_KEY` | server fallback analysis | same |
| `NEXT_PUBLIC_SITE_URL` | OG / metadata base | the production URL |
| `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` | custom-STT audio (optional) | only if a custom provider is used |

## 2. Database

- [ ] Run the schema against the production DB: `node --env-file=.env.local scripts/init-db.mjs` (idempotent). Creates `sessions`, `action_items`, `request_counts`.

## 3. Clerk — production instance **(owner)**

- [ ] **Rotate the leaked test secret.** The `sk_test` key was exposed in a chat transcript and is burned. Roll it in the Clerk dashboard.
- [ ] Create / switch to a **production** Clerk instance and use its `pk_live` / `sk_live` keys.
- [ ] Add the production domain to Clerk's **allowed domains**, or sign-in fails on the live site.
- [ ] Update both Clerk vars in Vercel and redeploy.

## 4. Demo abuse protection

- [ ] Confirm the demo caps suit the launch: `HOURLY_LIMIT` / `DAILY_LIMIT` in `src/lib/rate-limit.ts` (per IP, server-key path only; bring-your-own-key callers are uncapped).
- [ ] `request_counts` table exists (§2).

## 5. Access

- [ ] Vercel **Deployment Protection** off if the site should be public. **(owner)** dashboard toggle.

## 6. Verify live (after deploy)

- [ ] Guest, no sign-in: record or use the sample, get a summary + action items (runs on server keys).
- [ ] Sign up, record, confirm the session appears in History.
- [ ] Second account (incognito): confirm it cannot see the first account's sessions. **(owner)** browser check — this is the auth scoping, the one thing to test by hand.
- [ ] Over the demo cap returns 429 asking to add a key.

## 7. Gate (every deploy)

- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test -- --run`, `npm run build` all green.
