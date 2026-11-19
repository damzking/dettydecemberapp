# Detty December Guide — stage 2

The original mobile screens now read their content from PostgreSQL through a small Express API. No login or real payments have been added. The simulated pass, quiz and saved plan still live on the device.

## Tools and portability

- **PostgreSQL:** widely supported relational database, movable between providers.
- **Node.js, Express and TypeScript:** a small, conventional HTTP backend.
- **pg and Drizzle:** standard PostgreSQL connections, parameterized queries and a readable table schema.
- **OpenAPI, generated React Query hooks:** a shared contract between the Expo app and the backend.
- **csv-parse:** handles quoted commas, multiline cells and UTF-8 BOM CSV files correctly.

The development database here is hosted by Replit, but application code uses only standard PostgreSQL via `DATABASE_URL`. It does not use a Replit database SDK. A different PostgreSQL provider can be used without changing the data routes.

## Run here

1. Start **API Server** and **Detty December Guide**.
2. Open Preview. Select a pass and press the existing simulated payment button.
3. The app reads 24 original sample ideas, 8 tips and 5 price items from the database.

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
   pnpm db:seed
   ```

4. Start the backend:

   ```sh
   pnpm --filter @workspace/api-server run build
   PORT=5000 pnpm --filter @workspace/api-server run start
   ```

5. In a second terminal, point the app at that backend:

   ```sh
   EXPO_PUBLIC_API_URL=http://localhost:5000 pnpm --filter @workspace/detty-december run dev:local
   ```

For Expo Go on a phone, replace `localhost` with your computer's reachable LAN address. For a hosted backend use its HTTPS origin. `EXPO_PUBLIC_API_URL` is the **origin**, without `/api`; it is public configuration, not a secret, and must be set before bundling the app.

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

All data routes share one router boundary for adding a pass check later. **There is no server-side access restriction yet.** The existing pricing screen remains a frontend demo, not security. No report-reading/admin endpoint has been added.

## Checks

```sh
pnpm run typecheck
pnpm --filter @workspace/scripts test
pnpm --filter @workspace/scripts test:db
```

The CSV unit tests do not need a database. The database test needs the schema and seeded development data; it checks stable IDs, in-place updates, archival, foreign-key protection, report preservation and a failure on the second row entirely inside an outer transaction that is rolled back.

## Exports and full recovery

An ideas spreadsheet is **not** a full database backup: it excludes reports, tips, prices and database constraints. GitHub stores code, not database rows.

For a production database on Replit, open **Database → Production → My Data** to download individual tables as CSV, JSON or XLSX. Export `ideas`, `tips`, `price_items` and `reports` when you need all the data. Exported ideas include archived historical rows. A one-time data export is useful for portability, but is separate from a tested full-database restore point.

For full production recovery, use **Database → Production → Settings → Advanced**:

- **Point-in-time recovery:** normally enabled at creation with a seven-day window; it can be disabled. Confirm the current setting instead of assuming protection exists.
- **Scheduled backups:** off by default. Enable daily backups and check the available restore points and retention. These are full database snapshots, including reports.

A restore replaces database state after the chosen time, so check the timestamp carefully before restoring. These settings are controlled in the database tool; the app does not run a scheduled dump or create backup tables. For the development database, checkpoints can include a best-effort database snapshot; confirm the checkpoint includes database data before relying on it.

If you move to an external PostgreSQL provider, configure that provider's full-database backups and recovery. Changing hosts is done by changing the backend's `DATABASE_URL` secret, not by editing source code. Do not expose the database URL in `EXPO_PUBLIC_*` variables.

Official instructions: [data exports](https://docs.replit.com/features/data-and-storage/work-with-your-data) and [data recovery](https://docs.replit.com/features/data-and-storage/data-recovery).

## Not included

Login, payments, backend pass enforcement, real ticket checkout, real venues/prices, real local replies, WhatsApp/calls, admin tools and cross-device saved plans remain out of scope. No hosting move or publication is performed by this stage.
