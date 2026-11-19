# Detty December Guide — stage 4 test payments

The original guide screens read PostgreSQL data through Express. Stages two and three add database-backed guide content, email/password accounts, cookie sessions and server-enforced timed passes. Stage four adds a payment flow with a development-only mock provider and a separate Whop sandbox adapter. Checkout is disabled by default. **No Whop live products, plans or payments were created by this project.** Quiz answers and saved ideas remain on-device, scoped to each account.

## Stage four: test payments

The server chooses prices (day $3, week $6, month $10); the app sends only the plan. The backend records each checkout and one shared confirmation function verifies ownership, amount and currency before creating a pass. Repeated confirmation/webhook delivery cannot create duplicate passes. Passes last exactly 24 hours, 7 days or 30 days and queue after current passes. Payment references and statuses are stored; card data is not.

Checkout is explicitly disabled in the shared project configuration (`PAYMENT_PROVIDER=disabled`). It can run only in `NODE_ENV=development`, never production. Do **not** use the connected Whop production integration for testing. Its key cannot authenticate to Whop's sandbox.

### Mock checkout (local development only)

For local mock testing, configure the API **development** environment only:

| Setting | Value |
|---|---|
| `PAYMENT_PROVIDER` | `mock` |
| `MOCK_WEBHOOK_SECRET` | A private random string; store it as a development secret, never in source control |
| `PAYMENT_CURRENCY` | `USD` by default |

Restart the API after changing settings. The mock provider only works when `NODE_ENV=development`. Never copy these settings into production. To return to the safe default, unset `PAYMENT_PROVIDER` (or set `disabled`) and restart. The UI mock checkout offers success, decline and abandoned/closed checkout outcomes; the automated test also exercises invalid and repeated webhook deliveries.

### Whop sandbox (not configured yet)

The Whop adapter is off unless `PAYMENT_PROVIDER=whop` and `WHOP_ENVIRONMENT=sandbox`. It reads only sandbox settings; it never uses the connected Whop production credential. Required secrets/settings:

| Setting | Value |
|---|---|
| `PAYMENT_PROVIDER` | `whop` (development environment only) |
| `WHOP_ENVIRONMENT` | `sandbox` |
| `WHOP_SANDBOX_API_KEY` | API key created in the Whop sandbox developer dashboard; save as a secret |
| `WHOP_SANDBOX_COMPANY_ID` | Sandbox company ID (`biz_…`) |
| `WHOP_SANDBOX_DAY_PLAN_ID` | Existing one-time sandbox plan priced at $3 USD |
| `WHOP_SANDBOX_WEEK_PLAN_ID` | Existing one-time sandbox plan priced at $6 USD |
| `WHOP_SANDBOX_MONTH_PLAN_ID` | Existing one-time sandbox plan priced at $10 USD |
| `WHOP_SANDBOX_WEBHOOK_SECRET` | Signing secret for a sandbox webhook subscribed to `payment.succeeded`; save as a secret |
| `PAYMENT_CURRENCY` | Currency shared by all three configured plans; defaults to `USD` |
| `APP_ORIGIN` | HTTPS app origin used as the checkout return URL |

Create a separate Whop sandbox account and API key at [sandbox.whop.com/dashboard/developer](https://sandbox.whop.com/dashboard/developer). The official [Whop sandbox guide](https://docs.whop.com/developer/guides/sandbox) explains sandbox setup and lists test cards: `4242 4242 4242 4242` succeeds; `4000 0000 0000 0002` declines; `5385 3083 6013 5181` triggers 3-D Secure (enter `Checkout1!`). Use any future expiry, any 3-digit CVC, and any billing address. Those are Whop sandbox cards, not credentials.

The webhook paths are `/api/payments/webhooks/mock` (mock only) and `/api/payments/webhooks/whop` (Whop sandbox only). The Whop endpoint verifies Whop's Standard Webhooks signature against the raw request body and acknowledges before confirmation. Configure the exact public URL by adding the relevant path to the app's HTTPS origin.

### Payment commands and checks

```sh
pnpm pass:revoke person@example.com # expire active passes and sign out; does not issue a refund
pnpm payments:list                  # show up to 50 most recent records
pnpm --filter @workspace/api-server test:payments
```

The payment test creates only a temporary mock user and synthetic payments, then removes the test rows. It does not contact Whop. It covers success, decline, abandoned/closed tab, correct and incorrect webhook signatures, repeated webhook/confirmation, mismatched reference/amount/currency, queued durations, and production/disabled-provider refusal.

### Stage four status

The development-only mock payment flow and disabled Whop sandbox adapter are implemented. Whop sandbox credentials, three sandbox plans, webhook secret/endpoint registration, and a real sandbox checkout have **not** been configured or verified. The connected Whop production credential was used only for a read-only API availability check; no products, plans, or payments were created. Live checkout, refunds through the provider, subscription billing, receipts, and chargebacks are not implemented. The revoke command only revokes access; it does not refund a charge.

## Password accounts and passes

### Temporary free admin access

An explicitly designated existing account can have `users.is_admin` enabled by trusted database maintenance. Signed-in admins bypass the pass requirement and pricing screen; Home shows **Admin access · Free**. All other accounts still require a valid pass. New accounts default to non-admin, and signup/sign-in cannot assign the flag. Admin sessions last 30 days before another sign-in is required; this is a session limit, not a paid pass.

To revoke the exemption, set `is_admin=false` on that specific user; the server enforces it on the next data request. On an existing external database apply `database/admin-access.sql` before deploying this change. Do not automatically grant this flag based on a submitted email address, because email ownership is not verified.

- Create an account with email, "type your email again", and a password of at least 10 characters. Emails are trimmed, lowercased and database-unique. Passwords use **bcrypt at cost 12**; plaintext passwords are never stored or logged. To avoid bcrypt truncation, passwords over 72 UTF-8 bytes are rejected.
- Sign-in uses the same error for an unknown email and a wrong password. Failed/in-flight attempts are limited to **10 per email and 30 per IP per hour**, with increasing delays from 250ms to 4 seconds. Successful attempts release their reservation. Account creation is separately limited to 5/email and 20/IP per hour. Counters are in PostgreSQL, not process memory.
- Random session tokens live in **Secure, HttpOnly, SameSite=Lax cookies**, never localStorage/AsyncStorage. Only token hashes are stored in the database. Signing out deletes the session; resetting a password invalidates all sessions for that account. Browsers must use HTTPS.
- A signed-in visitor without a pass has a provisional one-day session for pricing only. A valid pass sets cookie expiry to that pass's expiry. Passes last exactly 24 hours, 7 days or 30 days from their start—not calendar months. Existing live sessions are extended on a manual grant; refresh the app to update the browser cookie.
- `/api/auth/*` handles authentication separately from guide data. `/api/auth/session` reveals only the current account and pass, demo availability, and the public support link. `/api/passes/demo` requires sign-in and explicit development enablement. Health checks remain public. **All guide routes and any future routes mounted after the access boundary require both a live session and an unexpired, already-started pass.** Direct API requests cannot bypass this.
- The password module is separate from sessions and access checks so email-link sign-in can be added later. `users.email_verified` defaults to false. No email-link/code delivery, password recovery email, or automatic verification is implemented.

### Manual account commands

First create the account through the app. From the project root:

```sh
pnpm pass:grant person@example.com day
pnpm pass:grant person@example.com week
pnpm pass:grant person@example.com month
pnpm user:set-password person@example.com
```

The reset command prompts twice in an interactive terminal with input hidden. **Never put a password in a command argument, environment variable, chat message or CSV.** The CLI rejects extra arguments and noninteractive input. Pass grants are ordinary privileged server-side maintenance commands; do not expose them as public endpoints.

### Settings

| Setting | Purpose |
|---|---|
| `DATABASE_URL` | Secret PostgreSQL connection, backend only. |
| `DEMO_PAYMENTS` | **Unset/off by default.** Only exact `true` **and** `NODE_ENV=development` enable Pay-button grants. `NODE_ENV=production` always refuses, even if this setting is `true`. |
| `SUPPORT_WHATSAPP_NUMBER` | The sole setting for the public support number, international digits without spaces. The server builds the WhatsApp link with the requested password-help message. |
| `APP_ORIGIN` | Public HTTPS browser origin on another host; used for allowed-origin validation. |
| `CORS_ORIGINS` | Optional comma-separated additional trusted origins; never use `*` with cookies. |
| `EXPO_PUBLIC_API_URL` | Optional API origin for native clients or a separately hosted browser app. Not a secret. |

To try demo Pay locally, explicitly set `DEMO_PAYMENTS=true` in the API's **development** environment and restart API Server. Remove it afterward and restart. It has not been enabled for normal use. Do not change `NODE_ENV` in production to bypass this protection.

For the browser, serve `/api` from the same HTTPS origin as the app (the preview already routes this way). This avoids third-party-cookie restrictions. For another host, configure a reverse proxy to Express; native clients use `EXPO_PUBLIC_API_URL`. Session cookies are not exposed to application JavaScript on any platform. The API trusts one nearest reverse proxy for client IPs: configure that ingress to replace/append trustworthy forwarding headers, or adjust the proxy topology before deployment.

The support note opens WhatsApp only; it does not reset passwords. Verify a caller's identity independently before running the maintenance reset command.

### Test stage three

1. **New account:** try mismatched emails and a short password, then register successfully. You should reach pricing with no pass. Reusing the same email with different capitalization cannot create a second account.
2. **Wrong password:** try both a wrong password and an unregistered email. Both show "Email or password is incorrect." Repeated failures slow down and eventually return 429 with `Retry-After`.
3. **Signed out:** open a guide URL in a fresh browser. It redirects to sign-in; direct GETs to `/api/guide/ideas`, `/tips`, `/prices`, and POST `/reports` return 401.
4. **Signed in, no pass:** pricing appears; all data routes return 403. With demo payments off, pressing Pay grants nothing and shows an explicit error.
5. **Valid pass:** run `pnpm pass:grant <email> day`, then refresh. Home appears with "Pass ends [date and time]"; content and reporting work. Reload to confirm cookie persistence. Sign out on Home and confirm access is refused again.
6. **Expired pass:** on a disposable development test account, make **all** its passes expire using the SQL below, then refresh. The API refuses all guide routes even if the browser still has an old screen or cookie. At natural cookie expiry, sign-in is required again.

```sql
-- Development test account only. Replace the placeholder email.
UPDATE passes SET starts_at = now() - interval '2 days', expires_at = now() - interval '1 day'
WHERE user_id = (SELECT id FROM users WHERE email = 'your-test-account@example.com');
```

7. **Reset:** run the hidden-prompt reset command; old sessions stop working, the old password fails and the new password succeeds. No "forgot password" endpoint or email is involved.

Automated backend checks (API Server must be running, demo payments off):
```sh
pnpm --filter @workspace/api-server test:auth
```
These create and clean up a unique disposable account and its passes/sessions. They verify secure cookie flags, lowercase uniqueness, wrong-credential parity, direct-route access, expired passes, session rotation/sign-out, per-email/IP limits, demo production refusal, and unchanged guide-data counts.

## Tools and portability

- **PostgreSQL:** widely supported relational database, movable between providers.
- **Node.js, Express and TypeScript:** a small, conventional HTTP backend.
- **pg and Drizzle:** standard PostgreSQL connections, parameterized queries and a readable table schema.
- **OpenAPI, generated React Query hooks:** a shared contract between the Expo app and the backend.
- **csv-parse:** handles quoted commas, multiline cells and UTF-8 BOM CSV files correctly.

The development database here is hosted by Replit, but application code uses only standard PostgreSQL via `DATABASE_URL`. It does not use a Replit database SDK. A different PostgreSQL provider can be used without changing the data routes.

## Run here

1. Start **API Server** and **Detty December Guide**.
2. Open Preview and create an account or sign in.
3. Grant a testing pass using the manual command above, then refresh. The app reads the original sample ideas, tips and price items from the database. Pay does not unlock anything by default.

For a fresh development database, run these commands once:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
pnpm db:seed
```

The seed keeps the original IDs, text, order, price placeholders and date placeholders. It checks ideas, tips and price_items independently and fills only empty tables; re-running it never overwrites or deletes existing rows. Reports are never seeded or cleared. The seed is not called during app startup, build or redeployment. Run `pnpm db:seed` by hand whenever an empty content table needs the sample data again.

CSV importing remains separate: `pnpm import:ideas ./path/to/ideas.csv` replaces the active ideas catalogue only, using stable-ID updates and archival to preserve reports. It never changes tips or prices.

## Run on another host or your computer

Use Node.js 24, pnpm 10.26.1, and any supported PostgreSQL server.

1. Provide `DATABASE_URL` securely in the backend environment. Never put real credentials in Git.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. On a **new external database**, create the four tables manually:

   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/stage3.sql
   pnpm db:seed
   ```

4. Start the backend:

   ```sh
   pnpm --filter @workspace/api-server run build
   PORT=5000 pnpm --filter @workspace/api-server run start
   ```

5. In a second terminal, point the app at that backend:

   ```sh
   pnpm --filter @workspace/detty-december run dev:local
   ```

For the browser, configure an HTTPS reverse proxy that serves the Expo app and `/api` on the same origin. For Expo Go on a phone, set `EXPO_PUBLIC_API_URL` to your backend's reachable HTTPS origin. `EXPO_PUBLIC_API_URL` is the **origin**, without `/api`; it is public configuration, not a secret, and must be set before bundling the app. Do not weaken Secure cookies for plain HTTP development.

On an existing external stage-two database, apply only `database/stage3.sql`; it adds authentication tables without replacing guide content.

On Replit, the managed app command supplies the API domain automatically. Replit Publish manages its own production schema; do not run the external setup SQL as a production startup hook. Seed data is a separate explicit content command and is not automatically copied by schema publishing.

## CSV replacement

From the project root, run:

```sh
pnpm import:ideas ./path/to/ideas.csv
```

The command uses the backend's `DATABASE_URL`. This is a command-line tool, **not an unprotected web import endpoint**.

Required header names (column order may vary):

```csv
City,Category,Name,Area,Price level,One line,Source or link,Date checked,Status,Checked by
```

- Imports only rows whose trimmed Status is exactly `Verified` (case-sensitive).
- Skips `Example`, blank, Draft and all other statuses. Every skipped data row is included in the skipped count.
- City must be `Lagos` or `Abuja`; Category must be Coffee, Parties, Sports or Events.
- Verified rows need Name, Area, Price level, One line and Date checked.
- Maps Name → title, One line → blurb, Source or link → source, Date checked → date_checked.
- Checked by is accepted but not stored because it is not a column in the requested schema.
- Event items retain seller `Tix`, keeping the existing ticket button.
- Prints, for example: `Imported: 18. Skipped: 6.`
- Fully validates the file before writes. Malformed CSV, missing headers, duplicate ideas, or invalid Verified rows stop the import without changing ideas.
- Updates matching ideas and inserts new ones in **one transaction**. A failure on any row rolls back every update, insert and archive operation. Tips, prices and reports are untouched.
- Matches ideas by normalized city, category and name. The matching is case-insensitive and ignores outer whitespace. New IDs are deterministic hashes of this identity; existing IDs (including stage-one IDs) are preserved.
- Editing area, price, source, checked date or blurb keeps the same idea ID. Changing city, category or name creates a new identity. Distinct branches in one city/category need distinct names. The CSV has no explicit ID column, so it cannot express a rename.
- Ideas absent from the new Verified list get `status = Archived`. They disappear from app lists but remain in the database with all their content, so reports still have real targets. Returning ideas are reactivated under the same IDs.
- **A header-only file, or a file with no Verified rows, intentionally archives every idea.** It does not delete any ideas or reports. Blank lines are ignored, not counted as data rows. Check your CSV before running the command.
- A real foreign key from reports.idea_id to ideas.id prevents deletion of a referenced idea. There is no cascading deletion.

## API and report behavior

```text
GET  /api/guide/ideas
GET  /api/guide/tips
GET  /api/guide/prices
POST /api/guide/reports
```

The report body is `{ "ideaId": "...", "note": "..." }`. Notes are 1–2000 characters; unknown ideas return 404. The existing one-tap button sends a short standard note, waits for the database write, then displays the **same original thank-you message**. No new form is added. Failure displays an error instead of pretending a report was saved.

All data routes share the server-side session-and-pass check. Missing/expired sessions return 401; signed-in users without a valid pass receive 403. POST requests also require the `X-Guide-Client: app` header and an accepted browser origin to prevent cross-site form submissions. The shared API client sends this header and cookies automatically. No report-reading/admin endpoint has been added.

## Checks

```sh
pnpm run typecheck
pnpm --filter @workspace/scripts test
pnpm --filter @workspace/scripts test:db
pnpm --filter @workspace/scripts test:accounts
```

The CSV unit tests do not need a database. The database test needs the schema and seeded development data; it checks stable IDs, in-place updates, archival, foreign-key protection, report preservation and a failure on the second row entirely inside an outer transaction that is rolled back.

## Exports and full recovery

An ideas spreadsheet is **not** a full database backup: it excludes reports, tips, prices and database constraints. GitHub stores code, not database rows.

For a production database on Replit, open **Database → Production → My Data** to download individual tables as CSV, JSON or XLSX. Content tables are `ideas`, `tips`, `price_items` and `reports`; stage three also adds `users`, `passes`, `sessions` and `auth_limits`. User exports contain private emails and password hashes: protect them as sensitive data, never commit them to Git or share them publicly. Exported ideas include archived historical rows. A one-time data export is useful for portability, but is separate from a tested full-database restore point.

For full production recovery, use **Database → Production → Settings → Advanced**:

- **Point-in-time recovery:** normally enabled at creation with a seven-day window; it can be disabled. Confirm the current setting instead of assuming protection exists.
- **Scheduled backups:** off by default. Enable daily backups and check the available restore points and retention. These are full database snapshots, including reports.

A restore replaces database state after the chosen time, so check the timestamp carefully before restoring. These settings are controlled in the database tool; the app does not run a scheduled dump or create backup tables. For the development database, checkpoints can include a best-effort database snapshot; confirm the checkpoint includes database data before relying on it.

If you move to an external PostgreSQL provider, configure that provider's full-database backups and recovery. Changing hosts is done by changing the backend's `DATABASE_URL` secret, not by editing source code. Do not expose the database URL in `EXPO_PUBLIC_*` variables.

Official instructions: [data exports](https://docs.replit.com/features/data-and-storage/work-with-your-data) and [data recovery](https://docs.replit.com/features/data-and-storage/data-recovery).

## Not included

Real payments, email delivery/verification, email-link sign-in, automated password recovery, real ticket checkout, real venues/prices, real local replies, an in-app support chat, admin UI and cross-device saved plans remain out of scope. WhatsApp is only an external password-help link. No hosting move or publication is performed by this stage.
