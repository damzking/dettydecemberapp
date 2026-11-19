# Detty December Guide

A guide for diaspora visitors to Lagos and Abuja in December.

## Current scope: stage 2 only

- Preserve the stage-one screen layouts, copy, colors, filters, quiz and device-only pass/plan behavior.
- Store ideas, tips, prices and problem reports in PostgreSQL, served by Express.
- No login, real payments, backend pass enforcement, admin UI, or live local support.
- Keep code simple and beginner-friendly, with short comments.
- Use standard, widely supported tools. Avoid Replit-only application services so the app can move hosts.
- Sample venue names, prices, dates and blurbs remain bracketed. The specified pass prices are $3, $6 and $10.
- Phone-first at 390px, with the existing desktop browser layout preserved.

## Run

Start **API Server** and **Detty December Guide**, then open Preview. The existing simulated purchase unlocks the app without charging money.

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
- Express data routes live under `/api/guide`. Future pass middleware can be added at that router boundary; none exists now.
- OpenAPI lives in `lib/api-spec/openapi.yaml`; run `pnpm --filter @workspace/api-spec run codegen` after contract edits.
- Seed-only sample content is in `lib/db/src/seed-data.ts`, not bundled frontend lists.
- The app reads through generated API hooks; its local pass, quiz and saved IDs stay in AsyncStorage.
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
