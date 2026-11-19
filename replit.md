# Detty December Guide

A guide for diaspora visitors to Lagos and Abuja in December.

## Current scope: stage 3 only

- User-requested exception: the explicitly designated admin receives free guide access after sign-in, without a pass. Ordinary accounts remain paywalled. Assign only to an existing account via trusted database maintenance, never automatically from signup email.

- Preserve the existing guide layouts, filters, quiz and saved-plan behavior. Only add the requested authentication flow, Home sign-out and pass expiry text.
- Store ideas, tips, prices and problem reports in PostgreSQL, served by Express.
- Use email/password authentication, not email links: bcrypt hashes, unique lowercase email, repeated email on signup, minimum 10 characters, email_verified false by default.
- Enforce live cookie sessions and unexpired passes on every data route. Secure HttpOnly cookies last until the pass expires; no-pass sessions only allow pricing.
- No real payments, email service, email-link method, forgot-password endpoint, admin UI, or live local support. Demo grants need exact DEMO_PAYMENTS=true AND NODE_ENV=development; off by default.
- Keep the support number in SUPPORT_WHATSAPP_NUMBER only. Build the external WhatsApp password-help URL from that setting.
- Keep code simple and beginner-friendly, with short comments.
- Use standard, widely supported tools. Avoid Replit-only application services so the app can move hosts.
- Sample venue names, prices, dates and blurbs remain bracketed. The specified pass prices are $3, $6 and $10.
- Phone-first at 390px, with the existing desktop browser layout preserved.

## Run

Start **API Server** and **Detty December Guide**, then open Preview. Create an account and grant a test pass with `pnpm pass:grant <email> <day|week|month>`. Reset a password with `pnpm user:set-password <email>` (hidden terminal prompts; no password arguments).

For a fresh development database:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
pnpm db:seed
```

The seed checks each content table independently and inserts the original 24 ideas, 8 tips and 5 price items only into empty tables. It never overwrites or deletes existing rows, and never seeds or clears reports. Run `pnpm db:seed` by hand; never call it on app startup or redeployment. CSV imports stay separate and change the active ideas catalogue only.

See `README.md` for CSV replacement and instructions for other hosts.

## Implementation

- PostgreSQL through standard `pg` and Drizzle; database access uses `DATABASE_URL`.
- Express data routes live under `/api/guide`, after the session-and-pass middleware boundary. Auth lives separately in its own module.
- OpenAPI lives in `lib/api-spec/openapi.yaml`; run `pnpm --filter @workspace/api-spec run codegen` after contract edits.
- Seed-only sample content is in `lib/db/src/seed-data.ts`, not bundled frontend lists.
- The app reads through generated API hooks with cookies. Only per-account quiz/saved IDs stay in AsyncStorage; never trust legacy device-only passes.
- Failed sign-in limits persist in PostgreSQL by hashed email/IP, with increasing delays. Never log password bodies or SQL parameter details.
- CSV imports match city/category/name and update existing ideas in place, preserving their IDs. Removed ideas are archived, not deleted.
- Reports have a restrictive foreign key to ideas; importing cannot leave dangling report references.
- Checked dates are text so `[DATE]` sample values render unchanged.
- The report toast intentionally retains its exact stage-one wording, including `(demo)`, although its database write is real.

## Verification

```sh
pnpm run typecheck
pnpm --filter @workspace/scripts test
pnpm --filter @workspace/scripts test:db
```

Database tests use an outer rolled-back transaction; no test imports change live development content permanently.
